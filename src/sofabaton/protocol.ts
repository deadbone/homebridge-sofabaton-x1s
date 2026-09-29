export const SYNC_0 = 0xA5;
export const SYNC_1 = 0x5A;
export const OP_CALL_ME = 0x0CC3;
export const OP_AUTH_REQUEST = 0x0001;
export const OP_REQ_ACTIVITIES = 0x003A;
export const OP_REQ_ACTIVATE = 0x023F;
export const OP_ACK_READY = 0x0160;
export const OP_RES_ACTIVITY = 0xD53B;
export const KEY_POWER_ON = 0xC6;
export const KEY_POWER_OFF = 0xC7;

export interface SofaBatonActivity {
  readonly id: number;
  readonly name: string;
  readonly keyCode: number;
  readonly active?: boolean;
}

export interface SofaBatonFrame {
  readonly opcode: number;
  readonly payload: Buffer;
  readonly raw: Buffer;
  readonly end: number;
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

  for (const { raw } of splitFrames(data)) {
    const activity = parseActivityCatalogFrame(raw);
    if (activity) {
      activities.push(activity);
    }
  }

  return activities;
}

export function parseActivityCatalogFrame(frame: Buffer): SofaBatonActivity | undefined {
  if (frame.length < 36 || frame[0] !== SYNC_0 || frame[1] !== SYNC_1) {
    return undefined;
  }

  const opcode = frame.readUInt16BE(2);
  if (opcode !== OP_RES_ACTIVITY) {
    return undefined;
  }

  const payload = frame.subarray(4, frame.length - 1);
  const id = payload.length >= 8 ? payload.readUInt16BE(6) : frame[11];
  if (id === undefined || id < 1 || id > 255) {
    return undefined;
  }

  const name = decodeX1SActivityName(frame.subarray(36, 96)) ?? findUtf16Name(frame.subarray(12, frame.length - 1));
  if (!name) {
    return undefined;
  }

  const active = frame.length > 35 ? frame[35] === 0x01 : undefined;
  return active === undefined ? { id, name, keyCode: KEY_POWER_ON } : { id, name, keyCode: KEY_POWER_ON, active };
}

export function splitFrames(data: Buffer): readonly SofaBatonFrame[] {
  const frames: SofaBatonFrame[] = [];
  let cursor = 0;

  while (cursor < data.length - 1) {
    if (data[cursor] !== SYNC_0 || data[cursor + 1] !== SYNC_1) {
      cursor += 1;
      continue;
    }

    if (cursor + 5 > data.length) {
      break;
    }

    const frameLength = 5 + data[cursor + 2];
    if (cursor + frameLength > data.length) {
      break;
    }

    const raw = data.subarray(cursor, cursor + frameLength);
    if (raw[raw.length - 1] === checksum(raw.subarray(0, raw.length - 1))) {
      frames.push({
        opcode: raw.readUInt16BE(2),
        payload: raw.subarray(4, raw.length - 1),
        raw,
        end: cursor + frameLength,
      });
      cursor += frameLength;
      continue;
    }

    cursor += 1;
  }

  return frames;
}

function decodeX1SActivityName(slot: Buffer): string | undefined {
  if (slot.length < 2) {
    return undefined;
  }

  const text = slot.subarray(0, slot.length & ~1).toString('utf16le');
  const swapped = Buffer.alloc(slot.length & ~1);
  for (let index = 0; index < swapped.length; index += 2) {
    swapped[index] = slot[index + 1] ?? 0;
    swapped[index + 1] = slot[index] ?? 0;
  }
  const bigEndianText = swapped.toString('utf16le');
  const candidates = [bigEndianText, text]
    .map((candidate) => candidate.split('\u0000', 1)[0]?.trim())
    .filter((candidate): candidate is string => Boolean(candidate && /[\p{L}\p{N}]/u.test(candidate)));

  return candidates.sort((left, right) => right.length - left.length)[0];
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
