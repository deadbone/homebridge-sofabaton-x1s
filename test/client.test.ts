import dgram from 'node:dgram';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { SofaBatonX1SClient } from '../src/sofabaton/client.js';
import {
  OP_ACK_READY,
  OP_REQ_ACTIVATE,
  OP_REQ_ACTIVITIES,
  OP_AUTH_REQUEST,
  checksum,
  splitFrames,
} from '../src/sofabaton/protocol.js';

describe('SofaBatonX1SClient persistent connection', () => {
  let hub: FakeHub | undefined;
  let client: SofaBatonX1SClient | undefined;

  afterEach(async () => {
    client?.stop();
    client = undefined;
    await hub?.stop();
    hub = undefined;
  });

  it('connects once and performs the initial activity synchronization', async () => {
    hub = await FakeHub.start([
      { id: 101, name: 'Films' },
      { id: 102, name: 'Musique' },
    ], 101);
    const activityEvents: readonly { id: number; active?: boolean }[][] = [];
    const connectionEvents: boolean[] = [];
    client = makeClient(hub, {
      onActivities: (activities) => {
        activityEvents.push(activities.map((activity) => ({ id: activity.id, active: activity.active })));
      },
      onConnectionChange: (connected) => {
        connectionEvents.push(connected);
      },
    });

    const activities = await client.start();

    expect(connectionEvents).toEqual([true]);
    expect(hub.authRequests).toBe(1);
    expect(hub.activityRequests).toBe(1);
    expect(activities).toEqual([
      { id: 101, name: 'Films', keyCode: 198, active: true },
      { id: 102, name: 'Musique', keyCode: 198, active: false },
    ]);
    expect(activityEvents).toEqual([[{ id: 101, active: true }, { id: 102, active: false }]]);
  });

  it('refreshes activity state once when the hub emits ACK_READY', async () => {
    hub = await FakeHub.start([
      { id: 101, name: 'Films' },
      { id: 102, name: 'Musique' },
    ], 101);
    const activeEvents: Array<number | undefined> = [];
    client = makeClient(hub, {
      onActivities: (activities) => {
        activeEvents.push(activities.find((activity) => activity.active)?.id);
      },
    });
    await client.start();

    hub.activeActivityId = 102;
    hub.sendAckReady();
    await waitFor(() => hub?.activityRequests === 2);

    expect(activeEvents).toEqual([101, 102]);
    expect(hub.activityRequests).toBe(2);
  });

  it('tracks physical remote transitions and power off through ACK_READY reconciliation', async () => {
    hub = await FakeHub.start([
      { id: 101, name: 'Films' },
      { id: 102, name: 'Musique' },
    ], 101);
    const activeEvents: Array<number | undefined> = [];
    client = makeClient(hub, {
      onActivities: (activities) => {
        activeEvents.push(activities.find((activity) => activity.active)?.id);
      },
    });
    await client.start();

    hub.activeActivityId = 102;
    hub.sendAckReady();
    await waitFor(() => activeEvents.length === 2);
    hub.activeActivityId = undefined;
    hub.sendAckReady();
    await waitFor(() => activeEvents.length === 3);

    expect(activeEvents).toEqual([101, 102, undefined]);
  });

  it('sends HomeKit activation commands over the persistent socket without opening a new session', async () => {
    hub = await FakeHub.start([{ id: 101, name: 'Films' }], 101);
    client = makeClient(hub);
    await client.start();

    await client.activateActivity(101, 198);
    await waitFor(() => hub?.activations.length === 1);

    expect(hub.connections).toBe(1);
    expect(hub.activations).toEqual([{ id: 101, keyCode: 198 }]);
  });

  it('reconnects with a backoff and resynchronizes after the TCP connection drops', async () => {
    hub = await FakeHub.start([{ id: 101, name: 'Films' }], 101);
    const activeEvents: Array<number | undefined> = [];
    const connectionEvents: boolean[] = [];
    client = makeClient(hub, {
      reconnectBaseMs: 100,
      onActivities: (activities) => {
        activeEvents.push(activities.find((activity) => activity.active)?.id);
      },
      onConnectionChange: (connected) => {
        connectionEvents.push(connected);
      },
    });
    await client.start();

    hub.activeActivityId = undefined;
    hub.dropConnection();
    await waitFor(() => hub?.connections === 2, 1000);
    await waitFor(() => activeEvents.length === 2);

    expect(connectionEvents).toEqual([true, false, true]);
    expect(activeEvents).toEqual([101, undefined]);
    expect(hub.activityRequests).toBe(2);
  });

  it('does not poll or reconnect while the persistent connection is idle', async () => {
    hub = await FakeHub.start([{ id: 101, name: 'Films' }], 101);
    client = makeClient(hub);
    await client.start();

    await delay(300);

    expect(hub.connections).toBe(1);
    expect(hub.activityRequests).toBe(1);
    expect(hub.authRequests).toBe(1);
  });

  it('shuts down cleanly without scheduling reconnects', async () => {
    hub = await FakeHub.start([{ id: 101, name: 'Films' }], 101);
    const connectionEvents: boolean[] = [];
    client = makeClient(hub, {
      reconnectBaseMs: 100,
      onConnectionChange: (connected) => {
        connectionEvents.push(connected);
      },
    });
    await client.start();

    client.stop();
    await delay(250);

    expect(connectionEvents).toEqual([true, false]);
    expect(hub.connections).toBe(1);
  });
});

function makeClient(
  hub: FakeHub,
  overrides: Partial<ConstructorParameters<typeof SofaBatonX1SClient>[0]> = {},
): SofaBatonX1SClient {
  return new SofaBatonX1SClient({
    hubIp: '127.0.0.1',
    listenPort: 0,
    timeoutMs: 1000,
    reconnectBaseMs: 5000,
    hubUdpPort: hub.udpPort,
    ...overrides,
  });
}

class FakeHub {
  public activityRequests = 0;
  public authRequests = 0;
  public connections = 0;
  public readonly activations: Array<{ id: number; keyCode: number }> = [];
  public activeActivityId: number | undefined;
  private readonly udp = dgram.createSocket('udp4');
  private tcp?: net.Socket;

  private constructor(
    public readonly udpPort: number,
    private readonly activities: readonly { id: number; name: string }[],
    activeActivityId: number | undefined,
  ) {
    this.activeActivityId = activeActivityId;
  }

  public static async start(
    activities: readonly { id: number; name: string }[],
    activeActivityId: number | undefined,
  ): Promise<FakeHub> {
    const udp = dgram.createSocket('udp4');
    await new Promise<void>((resolve) => {
      udp.bind(0, '127.0.0.1', resolve);
    });
    const address = udp.address();
    if (typeof address !== 'object') {
      throw new Error('Fake hub failed to bind UDP socket.');
    }
    udp.close();

    const hub = new FakeHub(address.port, activities, activeActivityId);
    await hub.listen();
    return hub;
  }

  public sendAckReady(): void {
    this.tcp?.write(frame(OP_ACK_READY, Buffer.from([0x00])));
  }

  public dropConnection(): void {
    this.tcp?.destroy();
    this.tcp = undefined;
  }

  public async stop(): Promise<void> {
    this.dropConnection();
    await new Promise<void>((resolve) => {
      this.udp.close(() => {
        resolve();
      });
    });
  }

  private async listen(): Promise<void> {
    this.udp.on('message', (message) => {
      const listenPort = message.readUInt16BE(14);
      const socket = net.createConnection({ host: '127.0.0.1', port: listenPort });
      socket.on('connect', () => {
        this.connections += 1;
        this.tcp = socket;
      });
      socket.on('data', (data) => {
        this.handleTcpData(socket, data);
      });
    });
    await new Promise<void>((resolve) => {
      this.udp.bind(this.udpPort, '127.0.0.1', resolve);
    });
  }

  private handleTcpData(socket: net.Socket, data: Buffer): void {
    for (const request of splitFrames(data)) {
      if (request.opcode === OP_AUTH_REQUEST) {
        this.authRequests += 1;
      }
      if (request.opcode === OP_REQ_ACTIVITIES) {
        this.activityRequests += 1;
        socket.write(Buffer.concat(this.activities.map((activity, index) => activityFrame(
          activity.id,
          activity.name,
          activity.id === this.activeActivityId,
          index + 1,
          this.activities.length,
        ))));
      }
      if (request.opcode === OP_REQ_ACTIVATE && request.payload.length === 2) {
        this.activations.push({ id: request.payload[0] ?? 0, keyCode: request.payload[1] ?? 0 });
      }
    }
  }
}

function activityFrame(id: number, name: string, active: boolean, row: number, total: number): Buffer {
  const payload = Buffer.alloc(0xD5);
  payload[0] = row;
  payload[3] = total;
  payload.writeUInt16BE(id, 6);
  payload[31] = active ? 0x01 : 0x00;
  Buffer.from([...name].flatMap((char) => {
    const code = char.charCodeAt(0);
    return [code >> 8, code & 0xFF];
  })).copy(payload, 32);
  return frame(0xD53B, payload);
}

function frame(opcode: number, payload: Buffer): Buffer {
  const output = Buffer.alloc(2 + 2 + payload.length + 1);
  output[0] = 0xA5;
  output[1] = 0x5A;
  output.writeUInt16BE(opcode, 2);
  payload.copy(output, 4);
  output[output.length - 1] = checksum(output.subarray(0, output.length - 1));
  return output;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await delay(20);
  }
  throw new Error('Timed out waiting for condition.');
}
