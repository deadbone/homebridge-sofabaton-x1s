export const SYNC_0 = 0xA5;
export const SYNC_1 = 0x5A;
export const OP_CALL_ME = 0x0CC3;
export const OP_AUTH_REQUEST = 0x0001;
export const OP_REQ_ACTIVITIES = 0x003A;
export const OP_REQ_ACTIVATE = 0x023F;

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

function validateByte(value: number, path: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`${path} must be an integer between 0 and 255.`);
  }
}
