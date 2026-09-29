import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import {
  OP_ACK_READY,
  OP_RES_ACTIVITY,
  buildActivateFrame,
  buildActivityCatalogRequestFrame,
  buildAuthRequestFrame,
  buildCallMeFrame,
  parseActivityCatalogFrame,
  splitFrames,
} from './protocol.js';
import type { SofaBatonActivity } from './protocol.js';

export interface SofaBatonClientOptions {
  readonly hubIp: string;
  readonly listenPort: number;
  readonly timeoutMs: number;
  readonly reconnectBaseMs: number;
  readonly hubUdpPort?: number;
  readonly debug?: (message: string) => void;
  readonly onActivities?: (activities: readonly SofaBatonActivity[], source: string) => void;
  readonly onConnectionChange?: (connected: boolean) => void;
}

interface PendingActivityRequest {
  readonly resolve: (activities: readonly SofaBatonActivity[]) => void;
  readonly reject: (error: Error) => void;
  readonly activities: Map<number, SofaBatonActivity>;
  readonly source: string;
  quietTimer?: NodeJS.Timeout;
  timeoutTimer?: NodeJS.Timeout;
  expectedRows?: number;
}

export class SofaBatonX1SClient {
  private server?: net.Server;
  private socket?: net.Socket;
  private starting?: Promise<readonly SofaBatonActivity[]>;
  private stopped = true;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempt = 0;
  private commandQueue: Promise<void> = Promise.resolve();
  private receiveBuffer = Buffer.alloc(0);
  private pendingActivityRequest?: PendingActivityRequest;
  private latestActivities: readonly SofaBatonActivity[] = [];

  public constructor(private readonly options: SofaBatonClientOptions) {}

  public async start(): Promise<readonly SofaBatonActivity[]> {
    if (this.starting) {
      return await this.starting;
    }
    if (!this.stopped && this.socket && !this.socket.destroyed) {
      return this.latestActivities;
    }

    this.stopped = false;
    this.starting = this.connectAndSynchronize('initial synchronization').finally(() => {
      this.starting = undefined;
    });
    return await this.starting;
  }

  public stop(): void {
    this.stopped = true;
    this.clearReconnectTimer();
    this.rejectPendingActivityRequest(new Error('SofaBaton X1S client stopped.'));
    this.socket?.destroy();
    this.socket = undefined;
    this.closeServer();
    this.setConnected(false);
  }

  public async activateActivity(activityId: number, keyCode = 0): Promise<void> {
    await this.ensureStarted();
    await this.enqueueCommand(async () => {
      const socket = this.socket;
      if (!socket || socket.destroyed) {
        throw new Error('SofaBaton X1S hub is not connected.');
      }
      await writeSocket(socket, buildActivateFrame(activityId, keyCode));
    });
  }

  public async synchronizeActivities(source = 'manual synchronization'): Promise<readonly SofaBatonActivity[]> {
    await this.ensureStarted();
    return await this.requestActivities(source);
  }

  private async ensureStarted(): Promise<void> {
    if (this.stopped) {
      await this.start();
      return;
    }
    if (this.starting) {
      await this.starting;
    }
  }

  private async connectAndSynchronize(source: string): Promise<readonly SofaBatonActivity[]> {
    this.clearReconnectTimer();
    const socket = await this.openPersistentSession();
    if (this.stopped) {
      socket.destroy();
      return [];
    }

    this.installSocket(socket);
    await writeSocket(socket, buildAuthRequestFrame());
    await delay(250);
    const activities = await this.requestActivities(source);
    this.reconnectAttempt = 0;
    return activities;
  }

  private async openPersistentSession(): Promise<net.Socket> {
    this.closeServer();
    const localIp = getLocalIpFor(this.options.hubIp);
    const server = net.createServer();
    this.server = server;

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(this.options.listenPort, '0.0.0.0', () => {
        server.off('error', reject);
        resolve();
      });
    });

    const address = server.address();
    const listenPort = typeof address === 'object' && address ? address.port : this.options.listenPort;
    const socketPromise = waitForConnection(server, this.options.timeoutMs);
    try {
      await sendCallMe(
        this.options.hubIp,
        this.options.hubUdpPort ?? 8102,
        buildCallMeFrame(localIp, listenPort),
        this.options.timeoutMs,
      );

      const socket = await socketPromise;
      this.options.debug?.(`X1S persistent hub connection from ${socket.remoteAddress ?? 'unknown address'}`);
      return socket;
    } catch (error) {
      void socketPromise.catch(() => undefined);
      this.closeServer();
      throw error;
    }
  }

  private installSocket(socket: net.Socket): void {
    this.socket?.destroy();
    this.socket = socket;
    this.receiveBuffer = Buffer.alloc(0);
    socket.setNoDelay(true);
    socket.setKeepAlive(true);
    socket.on('data', (data) => {
      this.handleData(data);
    });
    socket.once('close', () => {
      this.handleDisconnect('closed');
    });
    socket.once('error', (error) => {
      this.options.debug?.(`X1S TCP socket error: ${error.message}`);
    });
    this.setConnected(true);
  }

  private handleData(data: Buffer): void {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
    const frames = splitFrames(this.receiveBuffer);
    if (frames.length === 0) {
      return;
    }

    this.receiveBuffer = this.receiveBuffer.subarray(frames[frames.length - 1]?.end ?? 0);

    for (const frame of frames) {
      if (frame.opcode === OP_ACK_READY) {
        this.options.debug?.('X1S ACK_READY received; refreshing activity state once.');
        void this.requestActivities('X1S ACK_READY event').catch((error: unknown) => {
          this.options.debug?.(`X1S ACK_READY activity refresh failed: ${error instanceof Error ? error.message : String(error)}`);
        });
        continue;
      }

      if (frame.opcode === OP_RES_ACTIVITY) {
        this.handleActivityFrame(frame.raw, frame.payload);
      }
    }
  }

  private handleActivityFrame(raw: Buffer, payload: Buffer): void {
    const pending = this.pendingActivityRequest;
    if (!pending) {
      this.options.debug?.(`Ignoring unsolicited X1S activity row: ${raw.toString('hex')}`);
      return;
    }

    const activity = parseActivityCatalogFrame(raw);
    if (!activity) {
      this.options.debug?.(`Ignoring unparsable X1S activity row: ${raw.toString('hex')}`);
      return;
    }

    pending.activities.set(activity.id, activity);
    if (payload.length >= 4 && payload[3] > 0) {
      pending.expectedRows = payload[3];
    }
    this.options.debug?.(`X1S activity row ${activity.id}: ${activity.name}${activity.active === undefined ? '' : activity.active ? ' (active)' : ' (inactive)'}`);

    if (pending.expectedRows !== undefined && pending.activities.size >= pending.expectedRows) {
      this.finishPendingActivityRequest();
      return;
    }

    this.resetPendingQuietTimer();
  }

  private async requestActivities(source: string): Promise<readonly SofaBatonActivity[]> {
    const socket = this.socket;
    if (!socket || socket.destroyed) {
      throw new Error('SofaBaton X1S hub is not connected.');
    }

    if (this.pendingActivityRequest) {
      this.options.debug?.(`Joining in-flight X1S activity synchronization from ${this.pendingActivityRequest.source}.`);
      return await new Promise((resolve, reject) => {
        const previousResolve = this.pendingActivityRequest?.resolve;
        const previousReject = this.pendingActivityRequest?.reject;
        if (!this.pendingActivityRequest || !previousResolve || !previousReject) {
          reject(new Error('SofaBaton X1S activity synchronization disappeared.'));
          return;
        }
        this.pendingActivityRequest = {
          ...this.pendingActivityRequest,
          resolve: (activities) => {
            previousResolve(activities);
            resolve(activities);
          },
          reject: (error) => {
            previousReject(error);
            reject(error);
          },
        };
      });
    }

    return await new Promise((resolve, reject) => {
      this.pendingActivityRequest = {
        resolve,
        reject,
        activities: new Map(),
        source,
      };
      this.pendingActivityRequest.timeoutTimer = setTimeout(() => {
        this.rejectPendingActivityRequest(new Error('Timed out waiting for SofaBaton X1S activity rows.'));
      }, this.options.timeoutMs);
      this.resetPendingQuietTimer();
      this.options.debug?.(`Requesting X1S activities: ${source}`);
      writeSocket(socket, buildActivityCatalogRequestFrame()).catch((error: unknown) => {
        this.rejectPendingActivityRequest(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  private resetPendingQuietTimer(): void {
    const pending = this.pendingActivityRequest;
    if (!pending) {
      return;
    }
    if (pending.quietTimer) {
      clearTimeout(pending.quietTimer);
    }
    pending.quietTimer = setTimeout(() => {
      this.finishPendingActivityRequest();
    }, Math.min(1500, this.options.timeoutMs));
  }

  private finishPendingActivityRequest(): void {
    const pending = this.pendingActivityRequest;
    if (!pending) {
      return;
    }

    this.pendingActivityRequest = undefined;
    if (pending.quietTimer) {
      clearTimeout(pending.quietTimer);
    }
    if (pending.timeoutTimer) {
      clearTimeout(pending.timeoutTimer);
    }
    const activities = [...pending.activities.values()].sort((left, right) => left.id - right.id);
    this.latestActivities = activities;
    this.options.onActivities?.(activities, pending.source);
    pending.resolve(activities);
  }

  private rejectPendingActivityRequest(error: Error): void {
    const pending = this.pendingActivityRequest;
    if (!pending) {
      return;
    }

    this.pendingActivityRequest = undefined;
    if (pending.quietTimer) {
      clearTimeout(pending.quietTimer);
    }
    if (pending.timeoutTimer) {
      clearTimeout(pending.timeoutTimer);
    }
    pending.reject(error);
  }

  private handleDisconnect(reason: string): void {
    this.socket = undefined;
    this.rejectPendingActivityRequest(new Error(`SofaBaton X1S TCP connection ${reason}.`));
    this.setConnected(false);
    if (!this.stopped) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const base = Math.max(this.options.reconnectBaseMs, 100);
    const delay = Math.min(base * 2 ** this.reconnectAttempt, 5 * 60 * 1000);
    this.reconnectAttempt += 1;
    this.options.debug?.(`Scheduling X1S reconnect in ${Math.round(delay / 1000)}s.`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.options.debug?.('Attempting X1S reconnect.');
      this.connectAndSynchronize('reconnect synchronization').catch((error: unknown) => {
        this.options.debug?.(`X1S reconnect failed: ${error instanceof Error ? error.message : String(error)}`);
        if (!this.stopped) {
          this.scheduleReconnect();
        }
      });
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private closeServer(): void {
    if (!this.server) {
      return;
    }
    this.server.close();
    this.server = undefined;
  }

  private setConnected(value: boolean): void {
    if (this.connected === value) {
      return;
    }
    this.connected = value;
    this.options.onConnectionChange?.(value);
  }

  private async enqueueCommand(command: () => Promise<void>): Promise<void> {
    const previous = this.commandQueue;
    let release!: () => void;
    this.commandQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      await command();
    } finally {
      release();
    }
  }
}

function waitForConnection(server: net.Server, timeoutMs: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out waiting for SofaBaton X1S hub callback connection.'));
    }, timeoutMs);

    server.once('connection', (socket) => {
      clearTimeout(timer);
      resolve(socket);
    });
    server.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function sendCallMe(hubIp: string, hubUdpPort: number, frame: Buffer, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Timed out sending SofaBaton X1S discovery frame.'));
    }, timeoutMs);

    socket.send(frame, hubUdpPort, hubIp, (error) => {
      clearTimeout(timer);
      socket.close();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function writeSocket(socket: net.Socket, frame: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(frame, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getLocalIpFor(remoteIp: string): string {
  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal && samePrivateNetwork(address.address, remoteIp)) {
        return address.address;
      }
    }
  }
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return '127.0.0.1';
}

function samePrivateNetwork(left: string, right: string): boolean {
  const a = left.split('.');
  const b = right.split('.');
  return a.length === 4 && b.length === 4 && a[0] === b[0] && a[1] === b[1];
}
