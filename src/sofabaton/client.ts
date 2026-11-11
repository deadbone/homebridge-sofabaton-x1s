import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import { SofaBatonAppProxy } from './app-proxy.js';
import { discoveryFromBanner } from './app-protocol.js';
import { selectAppNetwork } from './local-network.js';
import type { LocalNetwork } from './local-network.js';
import { SessionManager } from './session.js';
import type { SessionState } from './session.js';
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
  readonly appCompatibility?: boolean;
  readonly appCompatibilityAddress?: string;
  readonly log?: (message: string) => void;
  readonly onSessionState?: (state: SessionState) => void;
  /** Local socket simulation only. */
  readonly proxyNetwork?: LocalNetwork;
  readonly proxyUdpPort?: number;
  readonly proxyReplyPort?: number;
  readonly proxyBroadcast?: string;
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
  private proxy?: SofaBatonAppProxy;
  private network?: LocalNetwork;
  private identity?: Buffer;
  private bannerIdentity?: Buffer;
  private readonly session: SessionManager;
  private fragmentTimer?: NodeJS.Timeout;
  private commandCount = 0;
  private epoch = 0;
  private cancelConnection?: () => void;
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

  public constructor(private readonly options: SofaBatonClientOptions) {
    this.session = new SessionManager(options.onSessionState);
  }

  public get sessionState(): SessionState { return this.session.state; }
  public get proxyPort(): number | undefined { return this.proxy?.port; }

  private async startProxy(): Promise<void> {
    if (!this.options.appCompatibility || this.proxy) { return; }
    this.network = this.options.proxyNetwork ?? selectAppNetwork(this.options.hubIp, this.options.appCompatibilityAddress);
    const proxy = new SofaBatonAppProxy({
      network: this.network,
      timeoutMs: this.options.timeoutMs,
      identity: () => this.identity,
      bannerIdentity: () => this.bannerIdentity,
      available: () => this.session.state === 'HOMEBRIDGE_ACTIVE',
      acquire: () => {
        if (this.session.state !== 'HOMEBRIDGE_ACTIVE' || this.pendingActivityRequest || this.commandCount
          || this.receiveBuffer.length || !this.socket || this.socket.destroyed) { return undefined; }
        this.session.transition('IOS_APP_ACTIVE');
        return this.socket;
      },
      release: (socket) => {
        if (this.stopped || this.socket !== socket) { return; }
        this.session.transition('RECONNECTING');
        if (socket.destroyed) { return; }
        const epoch = this.epoch;
        void writeSocket(socket, buildAuthRequestFrame()).then(async () => {
          await delay(250);
          if (this.stopped || this.epoch !== epoch || this.socket !== socket || socket.destroyed) {
            throw new Error('X1S restoration cancelled.');
          }
          return await this.requestActivities('iOS session ended');
        }).then(() => {
          if (!this.stopped && this.socket === socket && !socket.destroyed) {
            this.session.transition('HOMEBRIDGE_ACTIVE');
            this.options.log?.('Homebridge restored; activity synchronization completed.');
          }
        }).catch(() => { socket.destroy(); });
      },
      log: (message) => this.options.log?.(message),
      debug: this.options.debug,
      udpPort: this.options.proxyUdpPort,
      replyPort: this.options.proxyReplyPort,
      broadcast: this.options.proxyBroadcast,
    });
    this.proxy = proxy;
    try { await proxy.start(); } catch (error) {
      if (this.proxy === proxy) { this.proxy = undefined; }
      throw error;
    }
  }

  public async start(): Promise<readonly SofaBatonActivity[]> {
    if (this.starting) {
      return await this.starting;
    }
    if (!this.stopped && this.socket && !this.socket.destroyed) {
      return this.latestActivities;
    }

    this.stopped = false;
    const epoch = ++this.epoch;
    if (this.options.appCompatibility) {
      this.session.transition(this.session.state === 'DISCONNECTED' || this.session.state === 'ERROR' ? 'CONNECTING' : 'RECONNECTING');
    }
    this.starting = this.startProxy().then(() => {
      if (this.stopped || this.epoch !== epoch) { throw new Error('X1S startup cancelled.'); }
      return this.connectAndSynchronize('initial synchronization');
    }).catch((error: unknown) => {
      if (this.options.appCompatibility && !this.stopped && this.epoch === epoch) {
        this.session.transition('ERROR');
        this.scheduleReconnect();
      }
      throw error;
    }).finally(() => {
      if (this.epoch === epoch) { this.starting = undefined; }
    });
    return await this.starting;
  }

  public stop(): void {
    this.stopped = true;
    this.epoch++;
    this.starting = undefined;
    this.cancelConnection?.();
    this.cancelConnection = undefined;
    this.proxy?.stop();
    this.proxy = undefined;
    this.identity = undefined;
    this.bannerIdentity = undefined;
    clearTimeout(this.fragmentTimer);
    this.fragmentTimer = undefined;
    if (this.options.appCompatibility) { this.session.transition('DISCONNECTED'); }
    this.clearReconnectTimer();
    this.rejectPendingActivityRequest(new Error('SofaBaton X1S client stopped.'));
    this.socket?.destroy();
    this.socket = undefined;
    this.closeServer();
    this.setConnected(false);
  }

  public async activateActivity(activityId: number, keyCode = 0): Promise<void> {
    if (this.options.appCompatibility) { this.session.assertHomebridge(); }
    await this.ensureStarted();
    await this.enqueueCommand(async () => {
      if (this.options.appCompatibility) { this.session.assertHomebridge(); }
      const socket = this.socket;
      if (!socket || socket.destroyed) {
        throw new Error('SofaBaton X1S hub is not connected.');
      }
      await writeSocket(socket, buildActivateFrame(activityId, keyCode));
    });
  }

  public async synchronizeActivities(source = 'manual synchronization'): Promise<readonly SofaBatonActivity[]> {
    if (this.options.appCompatibility) { this.session.assertHomebridge(); }
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
    const epoch = this.epoch;
    await this.startProxy();
    if (this.stopped || epoch !== this.epoch) { throw new Error('X1S connection cancelled.'); }
    const socket = await this.openPersistentSession();
    if (this.stopped || epoch !== this.epoch) {
      socket.destroy();
      return [];
    }

    this.installSocket(socket);
    await writeSocket(socket, buildAuthRequestFrame());
    await delay(250);
    if (this.stopped || epoch !== this.epoch || this.socket !== socket || socket.destroyed) {
      throw new Error('X1S synchronization cancelled.');
    }
    const activities = await this.requestActivities(source);
    if (this.options.appCompatibility && !this.stopped && this.socket === socket && !socket.destroyed) {
      this.session.transition('HOMEBRIDGE_ACTIVE');
      this.options.log?.('Homebridge connected; activity synchronization completed.');
      if (!this.identity) { this.options.log?.('iOS discovery unavailable: no valid X1S identity banner received.'); }
    }
    this.reconnectAttempt = 0;
    return activities;
  }

  private async openPersistentSession(): Promise<net.Socket> {
    this.closeServer();
    const localIp = this.network?.address ?? getLocalIpFor(this.options.hubIp);
    const epoch = this.epoch;
    const server = net.createServer();
    this.server = server;
    server.on('error', (error) => this.options.debug?.(`X1S TCP listener error: ${error.message}`));

    await new Promise<void>((resolve, reject) => {
      const closed = () => reject(new Error('X1S listener closed during startup.'));
      server.once('close', closed);
      server.once('error', reject);
      server.listen(this.options.listenPort, this.network?.address ?? '0.0.0.0', () => {
        server.off('error', reject);
        server.off('close', closed);
        resolve();
      });
    });

    if (this.stopped || epoch !== this.epoch) {
      server.close();
      throw new Error('X1S listener startup cancelled.');
    }
    const address = server.address();
    const listenPort = typeof address === 'object' && address ? address.port : this.options.listenPort;
    const controller = new AbortController();
    this.cancelConnection = () => controller.abort();
    const socketPromise = waitForConnection(server, this.options.timeoutMs, controller.signal,
      this.options.appCompatibility ? this.options.hubIp : undefined);
    void socketPromise.catch(() => undefined);
    try {
      await sendCallMe(
        this.options.hubIp,
        this.options.hubUdpPort ?? 8102,
        buildCallMeFrame(localIp, listenPort),
        this.options.timeoutMs,
      );

      const socket = await socketPromise;
      this.options.debug?.(`X1S persistent hub connection from ${socket.remoteAddress ?? 'unknown address'}`);
      if (this.server === server) { this.cancelConnection = undefined; }
      return socket;
    } catch (error) {
      controller.abort();
      if (this.server === server) {
        this.cancelConnection = undefined;
        this.closeServer();
      }
      throw error;
    }
  }

  private installSocket(socket: net.Socket): void {
    this.socket?.destroy();
    this.socket = socket;
    this.receiveBuffer = Buffer.alloc(0);
    this.identity = undefined;
    this.bannerIdentity = undefined;
    clearTimeout(this.fragmentTimer);
    this.fragmentTimer = undefined;
    socket.setNoDelay(true);
    socket.setKeepAlive(true);
    socket.on('data', (data) => {
      if (this.socket === socket) { this.handleData(data); }
    });
    socket.once('close', () => {
      if (this.socket === socket) { this.handleDisconnect('closed'); }
    });
    socket.once('error', (error) => {
      this.options.debug?.(`X1S TCP socket error: ${error.message}`);
    });
    this.setConnected(true);
  }

  private handleData(data: Buffer): void {
    if (this.options.appCompatibility && this.session.state === 'IOS_APP_ACTIVE') { return; }
    if (this.options.appCompatibility && this.receiveBuffer.length + data.length > 256 * 1024) {
      this.options.log?.('X1S protocol receive limit exceeded; reconnecting.');
      this.socket?.destroy();
      return;
    }
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
    const frames = splitFrames(this.receiveBuffer);
    if (frames.length === 0) {
      this.boundFragmentWait();
      return;
    }

    this.receiveBuffer = this.receiveBuffer.subarray(frames[frames.length - 1]?.end ?? 0);
    clearTimeout(this.fragmentTimer);
    this.fragmentTimer = undefined;
    this.boundFragmentWait();

    for (const frame of frames) {
      if (this.options.appCompatibility && (frame.opcode & 0xFF) === 2) {
        this.identity = discoveryFromBanner(frame.raw);
        this.bannerIdentity = this.identity ? Buffer.from(frame.payload.subarray(0, 6)) : undefined;
      }
      if (frame.opcode === OP_ACK_READY) {
        if (this.options.appCompatibility && this.session.state !== 'HOMEBRIDGE_ACTIVE') { continue; }
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

  private boundFragmentWait(): void {
    if (!this.options.appCompatibility) { return; }
    if (this.receiveBuffer.length === 0) {
      clearTimeout(this.fragmentTimer);
      this.fragmentTimer = undefined;
    } else if (!this.fragmentTimer) {
      const socket = this.socket;
      this.fragmentTimer = setTimeout(() => {
        this.fragmentTimer = undefined;
        if (socket === this.socket) { socket?.destroy(); }
      }, this.options.timeoutMs);
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
    if (!socket || socket.destroyed || (this.options.appCompatibility && this.session.state === 'IOS_APP_ACTIVE')) {
      throw new Error('SofaBaton X1S hub is not available to Homebridge.');
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
        if (this.options.appCompatibility) { socket.destroy(); }
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
    if (this.options.appCompatibility && (pending.activities.size === 0
      || (pending.expectedRows !== undefined && pending.activities.size < pending.expectedRows))) {
      pending.reject(new Error('Incomplete X1S activity synchronization; HomeKit state was not restored.'));
      this.socket?.destroy();
      return;
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
    clearTimeout(this.fragmentTimer);
    this.fragmentTimer = undefined;
    if (this.options.appCompatibility && !this.stopped) { this.session.transition('RECONNECTING'); }
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
      if (this.options.appCompatibility) { this.session.transition('RECONNECTING'); }
      const epoch = this.epoch;
      const attempt = this.connectAndSynchronize('reconnect synchronization').catch((error: unknown) => {
        this.options.debug?.(`X1S reconnect failed: ${error instanceof Error ? error.message : String(error)}`);
        if (!this.stopped && this.epoch === epoch) {
          if (this.options.appCompatibility) { this.session.transition('ERROR'); }
          this.scheduleReconnect();
        }
        return [];
      }).finally(() => {
        if (this.starting === attempt) { this.starting = undefined; }
      });
      this.starting = attempt;
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
    this.commandCount++;
    const previous = this.commandQueue;
    let release!: () => void;
    this.commandQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      await command();
    } finally {
      this.commandCount--;
      release();
    }
  }
}

function waitForConnection(server: net.Server, timeoutMs: number, signal: AbortSignal, hubIp?: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    let accepted = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      server.off('error', fail);
    };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const abort = () => fail(new Error('X1S callback cancelled.'));
    const timer = setTimeout(() => fail(new Error('Timed out waiting for SofaBaton X1S hub callback connection.')), timeoutMs);
    signal.addEventListener('abort', abort, { once: true });
    server.on('connection', (socket) => {
      if (signal.aborted || accepted || (hubIp && socket.remoteAddress !== hubIp)) {
        socket.destroy();
        return;
      }
      accepted = true;
      cleanup();
      resolve(socket);
    });
    server.once('error', fail);
  });
}

function sendCallMe(hubIp: string, hubUdpPort: number, frame: Buffer, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let settled = false;
    const finish = (error?: Error | null) => {
      if (settled) { return; }
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* Socket failed before binding. */ }
      if (error) { reject(error); } else { resolve(); }
    };
    const timer = setTimeout(() => finish(new Error('Timed out sending SofaBaton X1S discovery frame.')), timeoutMs);
    socket.once('error', finish);

    socket.send(frame, hubUdpPort, hubIp, finish);
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
