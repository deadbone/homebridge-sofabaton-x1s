import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SofaBatonX1SClient } from '../src/sofabaton/client.js';
import { AppFrameDecoder, NOTIFY_ME, appCallbackPort, discoveryFromBanner } from '../src/sofabaton/app-protocol.js';
import { buildFrame, buildCallMeFrame, checksum, splitFrames } from '../src/sofabaton/protocol.js';
import { SessionManager } from '../src/sofabaton/session.js';
import { broadcastAddress, privateIp, sameSubnet, selectAppNetwork } from '../src/sofabaton/local-network.js';

const identityPayload = Buffer.from('e26a44861b4500022022112005010058315320485542', 'hex');
const banner = buildFrame((identityPayload.length << 8) | 2, identityPayload);
const local = { address: '127.0.0.1', netmask: '255.0.0.0' };
const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.reverse()) { await close(); }
  cleanup.length = 0;
  vi.restoreAllMocks();
});

async function eventually(predicate: () => boolean, timeout = 2500): Promise<void> {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) { throw new Error('Condition timed out'); }
    await delay(10);
  }
}
async function udp(address: string, port = 0): Promise<dgram.Socket> {
  const s = dgram.createSocket('udp4');
  await new Promise<void>((resolve, reject) => {
    s.once('error', reject);
    s.bind(port, address, resolve);
  });
  cleanup.push(() => new Promise<void>((resolve) => s.close(() => resolve())));
  return s;
}
async function setup(options: Partial<ConstructorParameters<typeof SofaBatonX1SClient>[0]> = {}) {
  const hubUdp = await udp('127.0.0.1');
  const appUdp = await udp('127.0.0.1');
  const hubSockets = new Set<net.Socket>();
  let hubSocket: net.Socket | undefined;
  let connections = 0;
  let activities = 0;
  let active = true;
  let answerCatalog = true;
  let answerBanner = true;
  const received: Buffer[] = [];
  const events: Array<number | undefined> = [];
  hubUdp.on('message', (message) => {
    if (message.length !== 17) { return; }
    const s = net.createConnection({ host: '127.0.0.1', port: message.readUInt16BE(14), localAddress: '127.0.0.1' });
    hubSockets.add(s);
    const decoder = new AppFrameDecoder();
    s.on('error', () => undefined);
    s.on('connect', () => { hubSocket = s; connections++; });
    s.on('close', () => hubSockets.delete(s));
    s.on('data', (data) => {
      for (const frame of decoder.feed(data)) {
        received.push(frame);
        if (frame.readUInt16BE(2) === 1 && answerBanner) { s.write(banner); }
        if (frame.readUInt16BE(2) === 0x003A) {
          activities++;
          if (!answerCatalog) { continue; }
          const payload = Buffer.alloc(0xD5);
          payload[0] = 1;
          payload[3] = 1;
          payload.writeUInt16BE(101, 6);
          payload[31] = active ? 1 : 0;
          Buffer.from('00460069006c006d0073', 'hex').copy(payload, 32);
          s.write(buildFrame(0xD53B, payload));
        }
      }
    });
  });
  const client = new SofaBatonX1SClient({
    hubIp: '127.0.0.1', listenPort: 0, hubUdpPort: hubUdp.address().port,
    timeoutMs: 500, reconnectBaseMs: 100,
    appCompatibility: true, proxyNetwork: local, proxyUdpPort: 0,
    proxyReplyPort: appUdp.address().port, proxyBroadcast: '127.0.0.1',
    onActivities: (rows) => events.push(rows.find((row) => row.active)?.id),
    ...options,
  });
  cleanup.push(() => { client.stop(); for (const s of hubSockets) { s.destroy(); } });
  const call = (port: number, hint = identityPayload.subarray(0, 6)) => {
    const frame = buildCallMeFrame('203.0.113.99', port); // must never dial the embedded target
    hint.copy(frame, 4);
    frame[16] = checksum(frame.subarray(0, 16));
    appUdp.send(frame, client.proxyPort!, '127.0.0.1');
  };
  return {
    client, appUdp, call, received, events,
    get hub() { return hubSocket!; },
    get connections() { return connections; },
    get activities() { return activities; },
    set active(value: boolean) { active = value; },
    set answerCatalog(value: boolean) { answerCatalog = value; },
    set answerBanner(value: boolean) { answerBanner = value; },
  };
}
async function phone() {
  const sockets: net.Socket[] = [];
  const received: Buffer[] = [];
  const server = net.createServer((s) => {
    sockets.push(s);
    s.on('error', () => undefined);
    s.on('data', (b) => received.push(b));
  });
  let port = 8100;
  for (; port <= 8110; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const error = (cause: Error) => { server.off('listening', ready); reject(cause); };
        const ready = () => { server.off('error', error); resolve(); };
        server.once('error', error);
        server.once('listening', ready);
        server.listen(port, '127.0.0.1');
      });
      break;
    } catch { /* Try the next app callback port. */ }
  }
  if (port > 8110) { throw new Error('No local simulated app port available'); }
  cleanup.push(async () => {
    for (const s of sockets) { s.destroy(); }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  return { port, sockets, received, get socket() { return sockets[0]; } };
}

describe('X1S app protocol evidence', () => {
  it('preserves identity, firmware and encoded name, changing only discovery family and marker', () => {
    const reply = discoveryFromBanner(banner)!;
    expect(reply[3]).toBe(0xC2);
    expect(reply[10]).toBe(0x64);
    expect(reply.subarray(4, 10)).toEqual(identityPayload.subarray(0, 6));
    expect(reply.subarray(11, -1)).toEqual(banner.subarray(11, -1));
    expect(splitFrames(reply)).toHaveLength(1);
    for (const model of [1, 3, 4]) {
      const payload = Buffer.from(identityPayload);
      payload[7] = model;
      expect(discoveryFromBanner(buildFrame((payload.length << 8) | 2, payload))).toBeUndefined();
    }
  });
  it('derives the X1S discovery suffix from a real MAC without changing the TCP banner', () => {
    const payload = Buffer.from(identityPayload);
    payload[5] = 0x99;
    const actual = buildFrame((payload.length << 8) | 2, payload);
    const discovery = discoveryFromBanner(actual)!;
    expect(discovery.subarray(4, 9)).toEqual(actual.subarray(4, 9));
    expect(discovery[9]).toBe(0x45);
    expect(actual[9]).toBe(0x99);
    const call = buildCallMeFrame('127.0.0.1', 8100);
    payload.subarray(0, 6).copy(call, 4);
    call[16] = checksum(call.subarray(0, 16));
    expect(appCallbackPort(call, discovery, payload.subarray(0, 6))).toBe(8100);
    payload[9] = 0xFF;
    expect(discoveryFromBanner(buildFrame((payload.length << 8) | 2, payload))).toBeUndefined();
  });
  it('rejects corrupt datagrams, foreign identity hints and out-of-range callback ports', () => {
    const reply = discoveryFromBanner(banner)!;
    expect(appCallbackPort(buildCallMeFrame('127.0.0.1', 8100), reply)).toBe(8100);
    expect(appCallbackPort(buildCallMeFrame('127.0.0.1', 22), reply)).toBeUndefined();
    const raw = buildCallMeFrame('127.0.0.1', 8100);
    raw[4] = 1;
    raw[16] = checksum(raw.subarray(0, -1));
    expect(appCallbackPort(raw, reply)).toBeUndefined();
    raw[16] ^= 1;
    expect(appCallbackPort(raw, reply)).toBeUndefined();
  });
  it('decodes fragmented and coalesced frames without changing their bytes', () => {
    const decoder = new AppFrameDecoder();
    const a = buildFrame(0x023F, Buffer.from([101, 198]));
    expect(decoder.feed(a.subarray(0, 1))).toEqual([]);
    expect(decoder.feed(Buffer.concat([a.subarray(1), banner, a]))).toEqual([a, banner, a]);
    expect(decoder.incomplete).toBe(false);
    expect(() => decoder.feed(Buffer.from('a55a000101', 'hex'))).toThrow(/checksum/);
  });
  it('uses actual netmasks rather than assuming /24 and excludes public addresses', () => {
    const lan = { address: '192.168.2.5', netmask: '255.255.254.0' };
    expect(broadcastAddress(lan)).toBe('192.168.3.255');
    expect(sameSubnet('192.168.3.90', lan)).toBe(true);
    expect(sameSubnet('192.168.4.90', lan)).toBe(false);
    expect(privateIp('8.8.8.8')).toBe(false);
    expect(privateIp('172.20.0.5')).toBe(true);
  });
  it('fails ambiguous or container-only interface selection instead of inventing a reachable address', () => {
    const address = (ip: string) => ({ address: ip, netmask: '255.255.255.0', family: 'IPv4' as const,
      mac: '00:00:00:00:00:01', internal: false, cidr: `${ip}/24` });
    const interfaces = vi.spyOn(os, 'networkInterfaces');
    interfaces.mockReturnValue({ eth0: [address('172.17.0.2')] });
    expect(() => selectAppNetwork('192.168.1.50')).toThrow(/interface/);
    interfaces.mockReturnValue({ eth0: [address('192.168.1.2')], wlan0: [address('192.168.1.3')] });
    expect(() => selectAppNetwork('192.168.1.50')).toThrow(/interface/);
    expect(selectAppNetwork('192.168.1.50', '192.168.1.3')).toEqual({ address: '192.168.1.3', netmask: '255.255.255.0' });
    expect(() => selectAppNetwork('192.168.1.50', '192.168.1.4')).toThrow(/interface/);
    expect(() => selectAppNetwork('8.8.8.8')).toThrow(/private/);
  });
  it('enforces explicit session transitions and blocks HomeKit outside the active state', () => {
    const session = new SessionManager();
    expect(() => session.transition('IOS_APP_ACTIVE')).toThrow();
    session.transition('CONNECTING');
    session.transition('HOMEBRIDGE_ACTIVE');
    expect(() => session.assertHomebridge()).not.toThrow();
    session.transition('IOS_APP_ACTIVE');
    expect(() => session.assertHomebridge()).toThrow(/not queued/);
    session.transition('RECONNECTING');
    session.transition('ERROR');
    session.transition('RECONNECTING');
    session.transition('HOMEBRIDGE_ACTIVE');
    session.transition('DISCONNECTED');
  });
});

describe('integrated proxy with simulated sockets (not real iOS/X1S validation)', () => {
  it('does not start proxy listeners when disabled', async () => {
    const h = await setup({ appCompatibility: false });
    await h.client.start();
    expect(h.client.proxyPort).toBeUndefined();
    await h.client.activateActivity(101, 198);
    await eventually(() => h.received.some((b) => b.readUInt16BE(2) === 0x023F));
  });
  it('answers discovery only after synchronization, with the actual hub identity', async () => {
    const h = await setup();
    const replies: Buffer[] = [];
    h.appUdp.on('message', (b) => replies.push(b));
    await h.client.start();
    h.appUdp.send(NOTIFY_ME, h.client.proxyPort!, '127.0.0.1');
    await eventually(() => replies.length === 1);
    expect(replies[0]).toEqual(discoveryFromBanner(banner));
  });
  it('relays both directions, suspends HomeKit and ACK_READY refreshes, then resynchronizes', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    expect(h.client.sessionState).toBe('IOS_APP_ACTIVE');
    await expect(h.client.activateActivity(101, 198)).rejects.toThrow(/not queued/);
    await expect(h.client.synchronizeActivities()).rejects.toThrow(/not queued/);
    const a = buildFrame(0x023F, Buffer.from([101, 198]));
    app.socket.write(a.subarray(0, 3));
    await delay(30);
    app.socket.write(Buffer.concat([a.subarray(3), a]));
    await eventually(() => h.received.filter((f) => f.equals(a)).length === 2);
    const reply = buildFrame(0x0160, Buffer.from([0]));
    h.hub.write(reply.subarray(0, 2));
    h.hub.write(reply.subarray(2));
    await eventually(() => Buffer.concat(app.received).equals(reply));
    expect(h.activities).toBe(1);
    h.active = false;
    app.socket.end();
    await eventually(() => h.client.sessionState === 'HOMEBRIDGE_ACTIVE');
    expect(h.events).toEqual([101, undefined]);
    expect(h.connections).toBe(1);
    expect(h.activities).toBe(2);
  });
  it('retains an idle live session beyond the command timeout and ignores competing CALL_ME', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    await delay(1100);
    h.call(app.port);
    await delay(50);
    expect(app.sockets).toHaveLength(1);
    expect(h.client.sessionState).toBe('IOS_APP_ACTIVE');
    expect(h.activities).toBe(1);
  });
  it('restores automatically after a failed callback without issuing a second hub CALL_ME', async () => {
    const h = await setup();
    const app = await phone();
    const unused = app.port === 8110 ? 8109 : 8110;
    await h.client.start();
    h.call(unused);
    await eventually(() => h.activities === 2);
    await eventually(() => h.client.sessionState === 'HOMEBRIDGE_ACTIVE');
    expect(h.connections).toBe(1);
  });
  it('closes the app and reconnects with a fresh state after hub loss', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    h.active = false;
    h.hub.destroy();
    await eventually(() => h.client.sessionState === 'HOMEBRIDGE_ACTIVE' && h.connections === 2);
    expect(app.socket.destroyed).toBe(true);
    expect(h.events.at(-1)).toBeUndefined();
  });
  it('bounds incomplete frames and reconnects without relaying their partial bytes', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    const before = h.received.length;
    app.socket.write(Buffer.from('a55a023f65', 'hex'));
    await delay(100);
    expect(h.received).toHaveLength(before);
    await eventually(() => h.connections === 2 && h.client.sessionState === 'HOMEBRIDGE_ACTIVE');
    expect(app.socket.destroyed).toBe(true);
    expect(h.received.some((f) => f.readUInt16BE(2) === 0x023F)).toBe(false);
  });
  it('refuses malformed app frames and restores the hub connection', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    app.socket.write(Buffer.from('a55a000101', 'hex'));
    await eventually(() => h.connections === 2 && h.client.sessionState === 'HOMEBRIDGE_ACTIVE');
    expect(app.socket.destroyed).toBe(true);
  });
  it('does not announce restored state when the catalog does not respond', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    h.answerCatalog = false;
    app.socket.end();
    await delay(650);
    expect(h.client.sessionState).not.toBe('HOMEBRIDGE_ACTIVE');
    expect(h.events).toEqual([101]);
  });
  it('releases ports and cancels sessions on stop, then starts again', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    const port = h.client.proxyPort!;
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    h.client.stop();
    await delay(50);
    expect(h.client.sessionState).toBe('DISCONNECTED');
    expect(app.socket.destroyed).toBe(true);
    const probe = await udp('0.0.0.0', port);
    expect(probe.address().port).toBe(port);
    await h.client.start();
    expect(h.client.sessionState).toBe('HOMEBRIDGE_ACTIVE');
    expect(h.connections).toBe(2);
  });
  it('keeps discovery silent when the real identity is unknown', async () => {
    const h = await setup();
    h.answerBanner = false;
    const replies: Buffer[] = [];
    h.appUdp.on('message', (data) => replies.push(data));
    await h.client.start();
    h.appUdp.send(NOTIFY_ME, h.client.proxyPort!, '127.0.0.1');
    await delay(100);
    expect(replies).toEqual([]);
  });
  it('ignores a foreign hub hint over UDP without claiming the session', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port, Buffer.from('010203040545', 'hex'));
    await delay(100);
    expect(app.sockets).toHaveLength(0);
    expect(h.client.sessionState).toBe('HOMEBRIDGE_ACTIVE');
  });
  it('cancels an initial synchronization and can immediately restart', async () => {
    const h = await setup();
    const initial = h.client.start();
    const rejection = expect(initial).rejects.toThrow(/cancelled|stopped/);
    await eventually(() => h.connections === 1);
    h.client.stop();
    const restarted = h.client.start();
    await rejection;
    await restarted;
    expect(h.client.sessionState).toBe('HOMEBRIDGE_ACTIVE');
    expect(h.connections).toBe(2);
  });
  it('cancels startup before listener setup and does not revive it after stop', async () => {
    const h = await setup();
    const initial = h.client.start();
    const rejection = expect(initial).rejects.toThrow(/cancelled|closed/);
    h.client.stop();
    await rejection;
    await delay(100);
    expect(h.client.sessionState).toBe('DISCONNECTED');
    expect(h.connections).toBe(0);
    await h.client.start();
    expect(h.client.sessionState).toBe('HOMEBRIDGE_ACTIVE');
  });
  it('bounds malformed hub input while Homebridge owns the session', async () => {
    const h = await setup();
    await h.client.start();
    h.hub.write(Buffer.from('a55ad53b01', 'hex'));
    await eventually(() => h.connections === 2 && h.client.sessionState === 'HOMEBRIDGE_ACTIVE');
  });
  it('bounds the app queue and never replays rejected HomeKit commands', async () => {
    const h = await setup();
    const app = await phone();
    await h.client.start();
    h.call(app.port);
    await eventually(() => app.sockets.length === 1);
    await expect(h.client.activateActivity(101, 199)).rejects.toThrow(/not queued/);
    app.socket.write(Buffer.concat(Array.from({ length: 60_000 }, () => buildFrame(0x0032))));
    await eventually(() => h.connections === 2 && h.client.sessionState === 'HOMEBRIDGE_ACTIVE');
    expect(app.socket.destroyed).toBe(true);
    expect(h.received.some((f) => f.readUInt16BE(2) === 0x023F)).toBe(false);
  });
  it('reports a port conflict and can stop without a reconnect loop', async () => {
    const occupied = await udp('0.0.0.0');
    const h = await setup({ proxyUdpPort: occupied.address().port });
    await expect(h.client.start()).rejects.toThrow();
    expect(h.client.sessionState).toBe('ERROR');
    h.client.stop();
    await delay(200);
    expect(h.connections).toBe(0);
  });
});
