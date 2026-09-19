export const SYNC_0 = 0xA5;
export const SYNC_1 = 0x5A;
export const OP_CALL_ME = 0x0CC3;
export const OP_AUTH_REQUEST = 0x0001;
export const OP_REQ_ACTIVITIES = 0x003A;
export const OP_REQ_ACTIVATE = 0x023F;
export const OP_RES_ACTIVITY = 0xD53B;
export const KEY_POWER_ON = 0xC6;
export const KEY_POWER_OFF = 0xC7;

export interface SofaBatonActivity {
  readonly id: number;
  readonly name: string;
  readonly keyCode: number;
  readonly active?: boolean;
}

export function checksum(bytes: Uint8Array): number {
  let total = 0;
  for (const byte of bytes) {
    total = (total + byte) & 0xFF;
  }
  return total;
}

export function buildFrame(opcode: number, payload: Uint8Array = new Uint8Array()): Buffer {
  const frame = Buffer.alloc(2 + 2 + payload.length + 1);
  frame[0] = SYNC_0;
  frame[1] = SYNC_1;
  frame.writeUInt16BE(opcode & 0xFFFF, 2);
  Buffer.from(payload).copy(frame, 4);
  frame[frame.length - 1] = checksum(frame.subarray(0, frame.length - 1));
  return frame;
}

export function buildCallMeFrame(clientIp: string, listenPort: number): Buffer {
  const octets = clientIp.split('.').map((item) => Number.parseInt(item, 10));
  if (octets.length !== 4 || octets.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    throw new Error(`Invalid client IP address: ${clientIp}`);
  }
  const payload = Buffer.alloc(12);
  payload.fill(0, 0, 6);
  Buffer.from(octets).copy(payload, 6);
  payload.writeUInt16BE(listenPort, 10);
  return buildFrame(OP_CALL_ME, payload);
}

export function buildActivateFrame(activityId: number, keyCode = 0): Buffer {
  validateByte(activityId, 'activityId');
  validateByte(keyCode, 'keyCode');
  return buildFrame(OP_REQ_ACTIVATE, Uint8Array.from([activityId, keyCode]));
}

export function buildActivityCatalogRequestFrame(): Buffer {
  return buildFrame(OP_REQ_ACTIVITIES);
}

export function buildAuthRequestFrame(): Buffer {
  return buildFrame(OP_AUTH_REQUEST);
}

export function parseActivityCatalogFrames(data: Buffer): readonly SofaBatonActivity[] {
  const activities: SofaBatonActivity[] = [];
  const starts = frameStarts(data);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = starts[index + 1] ?? data.length;
    const activity = parseActivityCatalogFrame(data.subarray(start, end));
    if (activity) {
      activities.push(activity);
    }
  }

  return activities;
}

export function parseActivityCatalogFrame(frame: Buffer): SofaBatonActivity | undefined {
  if (frame.length < 13 || frame[0] !== SYNC_0 || frame[1] !== SYNC_1) {
    return undefined;
  }

  const opcode = frame.readUInt16BE(2);
  if (opcode !== OP_RES_ACTIVITY) {
    return undefined;
  }

  const id = frame[11];
  if (id === undefined || id < 1) {
    return undefined;
  }

  const name = findUtf16Name(frame.subarray(12, frame.length - 1));
  if (!name) {
    return undefined;
  }

  const active = frame.length > 35 ? frame[35] === 0x01 : undefined;
  return active === undefined ? { id, name, keyCode: KEY_POWER_ON } : { id, name, keyCode: KEY_POWER_ON, active };
}

function frameStarts(data: Buffer): readonly number[] {
  const starts: number[] = [];
  for (let index = 0; index < data.length - 1; index += 1) {
    if (data[index] === SYNC_0 && data[index + 1] === SYNC_1) {
      starts.push(index);
    }
  }
  return starts;
}

function findUtf16Name(payload: Buffer): string | undefined {
  const names = new Set<string>();
  for (let offset = 0; offset < payload.length - 3; offset++) {
    const chars: string[] = [];
    for (let cursor = offset; cursor < payload.length - 1; cursor += 2) {
      const code = payload.readUInt16BE(cursor);
      if (code === 0) {
        break;
      }
      if (!isPrintableUtf16CodeUnit(code)) {
        chars.length = 0;
        break;
      }
      chars.push(String.fromCharCode(code));
    }
    const name = chars.join('').trim();
    if (name.length >= 2 && /[\p{L}\p{N}]/u.test(name)) {
      names.add(name);
    }
  }

  return [...names].sort((left, right) => right.length - left.length)[0];
}

function isPrintableUtf16CodeUnit(code: number): boolean {
  return code >= 32 && code <= 0x024F;
}

function validateByte(value: number, path: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`${path} must be an integer between 0 and 255.`);
  }
}
