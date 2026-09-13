import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import {
  buildActivateFrame,
  buildActivityCatalogRequestFrame,
  buildAuthRequestFrame,
  buildCallMeFrame,
  parseActivityCatalogFrames,
} from './protocol.js';
import type { SofaBatonActivity } from './protocol.js';

export interface SofaBatonClientOptions {
  readonly hubIp: string;
  readonly listenPort: number;
  readonly timeoutMs: number;
  readonly debug?: (message: string) => void;
}

export class SofaBatonX1SClient {
  public constructor(private readonly options: SofaBatonClientOptions) {}

  public async activateActivity(activityId: number, keyCode = 0): Promise<void> {
    const socket = await this.openSession();
    try {
      await writeSocket(socket, buildActivateFrame(activityId, keyCode));
    } finally {
      socket.destroy();
    }
  }

  public async discoverActivities(): Promise<readonly SofaBatonActivity[]> {
    const socket = await this.openSession();
    try {
      return await collectActivities(socket, this.options.timeoutMs, this.options.debug);
    } finally {
      socket.destroy();
    }
  }

  private async openSession(): Promise<net.Socket> {
    const localIp = getLocalIpFor(this.options.hubIp);
    const server = net.createServer();
    const socketPromise = waitForConnection(server, this.options.timeoutMs);

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(this.options.listenPort, '0.0.0.0', () => {
        server.off('error', reject);
        resolve();
      });
    });

    try {
      await sendCallMe(this.options.hubIp, buildCallMeFrame(localIp, this.options.listenPort), this.options.timeoutMs);
      const socket = await socketPromise;
      this.options.debug?.(`X1S hub connected from ${socket.remoteAddress ?? 'unknown address'}`);
      return socket;
    } finally {
      server.close();
    }
  }
}

async function collectActivities(
  socket: net.Socket,
  timeoutMs: number,
  debug?: (message: string) => void,
): Promise<readonly SofaBatonActivity[]> {
  const activities = new Map<number, SofaBatonActivity>();

  await writeSocket(socket, buildAuthRequestFrame());
  await delay(250);

  return await new Promise((resolve, reject) => {
    let settled = false;
    let quietTimer: NodeJS.Timeout | undefined;
    const totalTimer = setTimeout(() => finish(), timeoutMs);

    const resetQuietTimer = (): void => {
      if (quietTimer) {
        clearTimeout(quietTimer);
      }
      quietTimer = setTimeout(() => finish(), Math.min(1500, timeoutMs));
    };

    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(totalTimer);
      if (quietTimer) {
        clearTimeout(quietTimer);
      }
      socket.off('data', onData);
      socket.off('error', onError);
      resolve([...activities.values()].sort((left, right) => left.id - right.id));
    };

    const onError = (error: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(totalTimer);
      if (quietTimer) {
        clearTimeout(quietTimer);
      }
      reject(error);
    };

    const onData = (data: Buffer): void => {
      const parsedActivities = parseActivityCatalogFrames(data);
      if (parsedActivities.length === 0) {
        debug?.(`Ignoring X1S catalog response frame: ${data.toString('hex')}`);
        return;
      }
      for (const activity of parsedActivities) {
        activities.set(activity.id, activity);
        debug?.(`Discovered X1S activity ${activity.id}: ${activity.name}`);
      }
      resetQuietTimer();
    };

    socket.on('data', onData);
    socket.once('error', onError);
    writeSocket(socket, buildActivityCatalogRequestFrame()).catch(onError);
  });
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

function sendCallMe(hubIp: string, frame: Buffer, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Timed out sending SofaBaton X1S discovery frame.'));
    }, timeoutMs);

    socket.send(frame, 8102, hubIp, (error) => {
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
