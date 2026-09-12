import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import { buildActivateFrame, buildCallMeFrame } from './protocol.js';

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
