import dgram from 'node:dgram';
import net from 'node:net';
import { AppFrameDecoder, NOTIFY_ME, appCallbackPort } from './app-protocol.js';
import { broadcastAddress, privateIp, sameSubnet } from './local-network.js';
import type { LocalNetwork } from './local-network.js';

export interface AppProxyOptions {
  readonly network: LocalNetwork;
  readonly timeoutMs: number;
  readonly identity: () => Buffer | undefined;
  readonly bannerIdentity?: () => Buffer | undefined;
  readonly acquire: () => net.Socket | undefined;
  readonly release: (hub: net.Socket) => void;
  readonly available: () => boolean;
  readonly log: (message: string) => void;
  readonly debug?: (message: string) => void;
  // Internal injection points for local socket tests, not Homebridge options.
  readonly udpPort?: number;
  readonly replyPort?: number;
  readonly broadcast?: string;
}

/** iOS UDP discovery + TCP connect-back, entirely within the Homebridge process. */
export class SofaBatonAppProxy {
  private udp?: dgram.Socket;
  private sender?: dgram.Socket;
  private app?: net.Socket;
  private cancelSession?: () => void;
  private stopped = true;
  private lastReply = 0;
  private lastCall = 0;
  private generation = 0;

  public constructor(private readonly options: AppProxyOptions) {}

  public async start(): Promise<void> {
    if (!this.stopped) { return; }
    this.stopped = false;
    const generation = ++this.generation;
    const udp = dgram.createSocket('udp4');
    const sender = dgram.createSocket('udp4');
    this.udp = udp;
    this.sender = sender;
    const onError = () => {
      if (this.stopped) { return; }
      this.options.log('iOS proxy network error; proxy stopped. Check UDP 8102 and restart Homebridge.');
      this.stop();
    };
    udp.on('error', onError);
    sender.on('error', onError);
    try {
      await bind(udp, this.options.udpPort ?? 8102, '0.0.0.0');
      if (this.stopped || generation !== this.generation) { throw new Error('Proxy startup cancelled.'); }
      await bind(sender, 0, this.options.network.address);
      if (this.stopped || generation !== this.generation) { throw new Error('Proxy startup cancelled.'); }
      sender.setBroadcast(true);
      udp.on('message', (data, peer) => this.receive(data, peer.address));
      this.options.log('iOS proxy started (UDP discovery 8102; experimental X1S compatibility).');
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  public stop(): void {
    this.stopped = true;
    this.generation++;
    this.cancelSession?.();
    this.app?.destroy();
    this.app = undefined;
    for (const socket of [this.udp, this.sender]) {
      try { socket?.close(); } catch { /* Not bound yet. */ }
    }
    this.udp = undefined;
    this.sender = undefined;
  }

  public get port(): number | undefined { return this.udp?.address().port; }

  private receive(data: Buffer, peer: string): void {
    if (this.stopped || this.app
      || (!privateIp(peer) && !(peer === '127.0.0.1' && this.options.network.address === peer))
      || !sameSubnet(peer, this.options.network) || peer === broadcastAddress(this.options.network)) { return; }
    const identity = this.options.identity();
    if (!identity || !this.options.available()) { return; }
    if (data.equals(NOTIFY_ME)) {
      if (Date.now() - this.lastReply < 1000) { return; }
      this.lastReply = Date.now();
      this.sender?.send(identity, this.options.replyPort ?? 8100,
        this.options.broadcast ?? broadcastAddress(this.options.network), (error) => {
          if (error) { this.options.log('iOS discovery reply failed. Check LAN broadcast routing.'); }
        });
      return;
    }
    const port = appCallbackPort(data, identity, this.options.bannerIdentity?.());
    if (port === undefined || Date.now() - this.lastCall < 1000) { return; }
    this.lastCall = Date.now();
    const hub = this.options.acquire();
    if (!hub) { return; }
    // Use the UDP peer, never an arbitrary target embedded in an unauthenticated packet.
    this.connectApp(hub, peer, port);
  }

  private connectApp(hub: net.Socket, host: string, port: number): void {
    this.options.log('iOS application detected; Homebridge commands suspended.');
    const app = new net.Socket({ allowHalfOpen: true });
    this.app = app;
    const decoder = new AppFrameDecoder();
    let frames: Buffer[] = [];
    let queuedBytes = 0;
    let sending = false;
    let ended = false;
    let finished = false;
    let connected = false;
    let pacing: NodeJS.Timeout | undefined;
    let partial: NodeJS.Timeout | undefined;
    let blocked: NodeJS.Timeout | undefined;
    let writing: NodeJS.Timeout | undefined;
    const clearTimers = () => {
      clearTimeout(connectTimer);
      clearTimeout(pacing);
      clearTimeout(partial);
      clearTimeout(blocked);
      clearTimeout(writing);
    };
    const finish = (broken = false) => {
      if (finished) { return; }
      finished = true;
      clearTimers();
      hub.off('data', fromHub);
      hub.off('close', hubClosed);
      hub.off('drain', hubDrain);
      hub.resume();
      if (broken || sending || queuedBytes || decoder.incomplete) { hub.destroy(); }
      frames = [];
      app.destroy();
      if (this.app === app) { this.app = undefined; }
      this.cancelSession = undefined;
      this.options.log('iOS session ended; restoring Homebridge connection and activity state.');
      this.options.release(hub);
    };
    const connectTimer = setTimeout(() => finish(), this.options.timeoutMs);
    const hubClosed = () => finish(true);
    const hubDrain = () => { if (!finished) { app.resume(); } };
    const fromHub = (data: Buffer) => {
      if (!connected || finished) { return; }
      if (app.writableLength + data.length > 256 * 1024) { finish(true); return; }
      if (!app.write(data)) {
        hub.pause();
        if (!blocked) { blocked = setTimeout(() => finish(true), this.options.timeoutMs); }
      }
    };
    const pump = () => {
      pacing = undefined;
      if (finished || sending) { return; }
      const frame = frames.shift();
      if (!frame) {
        if (ended) { finish(); }
        return;
      }
      queuedBytes -= frame.length;
      sending = true;
      writing = setTimeout(() => finish(true), this.options.timeoutMs);
      hub.write(frame, (error) => {
        clearTimeout(writing);
        writing = undefined;
        sending = false;
        if (finished) { return; }
        if (error) { finish(true); return; }
        pacing = setTimeout(pump, 200);
      });
    };
    this.cancelSession = () => finish(true);
    hub.on('data', fromHub);
    hub.once('close', hubClosed);
    hub.on('drain', hubDrain);
    app.setNoDelay(true);
    app.setKeepAlive(true, 30_000);
    app.on('drain', () => {
      clearTimeout(blocked);
      blocked = undefined;
      hub.resume();
    });
    app.once('connect', () => {
      connected = true;
      clearTimeout(connectTimer);
      this.options.log('iOS session established; exclusive relay to the X1S hub.');
    });
    app.on('data', (chunk) => {
      try {
        const decoded = decoder.feed(chunk);
        if (decoded.length > 0) {
          clearTimeout(partial);
          partial = undefined;
        }
        for (const frame of decoded) {
          queuedBytes += frame.length;
          frames.push(frame);
        }
        if (queuedBytes > 256 * 1024) { throw new Error('App frame queue limit exceeded.'); }
        if (decoder.incomplete && !partial) {
          partial = setTimeout(() => finish(true), this.options.timeoutMs);
        } else if (!decoder.incomplete) {
          clearTimeout(partial);
          partial = undefined;
        }
        if (hub.writableNeedDrain) { app.pause(); }
        if (!pacing) { pump(); }
      } catch {
        this.options.log('iOS protocol error; closing the session without replaying commands.');
        finish(true);
      }
    });
    app.once('end', () => { ended = true; if (!sending && frames.length === 0) { finish(decoder.incomplete); } });
    app.once('close', () => finish());
    app.once('error', () => finish());
    app.connect({ host, port, localAddress: this.options.network.address });
  }
}

function bind(socket: dgram.Socket, port: number, address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const error = (cause: Error) => { cleanup(); reject(cause); };
    const closed = () => error(new Error('UDP socket closed during startup.'));
    const cleanup = () => { socket.off('error', error); socket.off('close', closed); };
    socket.once('error', error);
    socket.once('close', closed);
    socket.bind(port, address, () => { cleanup(); resolve(); });
  });
}
