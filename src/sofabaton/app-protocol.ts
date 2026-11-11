import { buildFrame, checksum } from './protocol.js';

export const NOTIFY_ME = Buffer.from('a55a00c1c0', 'hex');

/** Derive the documented X1S discovery id from the real banner MAC; preserve metadata. */
export function discoveryFromBanner(raw: Buffer): Buffer | undefined {
  if (!validFrame(raw) || raw[3] !== 0x02 || raw.length < 20 || raw.length > 50) {
    return undefined;
  }
  const payload = Buffer.from(raw.subarray(4, -1));
  const date = payload.subarray(8, 12);
  const validDate = date.every((byte) => (byte >> 4) <= 9 && (byte & 15) <= 9)
    && date[0] === 0x20 && date[2] >= 1 && date[2] <= 0x12 && date[3] >= 1 && date[3] <= 0x31;
  if (payload[7] !== 2 || !validDate || !payload.subarray(0, 5).some(Boolean)) {
    return undefined;
  }
  payload[5] = 0x45; // X1S NOTIFY/CALL_ME suffix, not a fabricated MAC.
  payload[6] = 0x64;
  return buildFrame((payload.length << 8) | 0xC2, payload);
}

export function validFrame(raw: Buffer): boolean {
  return raw.length >= 5 && raw[0] === 0xA5 && raw[1] === 0x5A
    && raw.length === raw[2] + 5 && raw[raw.length - 1] === checksum(raw.subarray(0, -1));
}

export function appCallbackPort(raw: Buffer, identity: Buffer, bannerIdentity?: Buffer): number | undefined {
  if (!validFrame(raw) || raw.length !== 17 || raw.readUInt16BE(2) !== 0x0CC3) {
    return undefined;
  }
  const hint = raw.subarray(4, 10);
  if (hint.some(Boolean) && !hint.equals(identity.subarray(4, 10)) && !(bannerIdentity && hint.equals(bannerIdentity))) {
    return undefined;
  }
  const port = raw.readUInt16BE(14);
  return port >= 8100 && port <= 8110 ? port : undefined;
}

/** Strict app-side decoder; retain at most one incomplete wire frame. */
export class AppFrameDecoder {
  private pending = Buffer.alloc(0);
  public get incomplete(): boolean { return this.pending.length > 0; }

  public feed(chunk: Buffer): Buffer[] {
    const data = Buffer.concat([this.pending, chunk]);
    const frames: Buffer[] = [];
    let offset = 0;
    while (data.length - offset >= 5) {
      const length = data[offset + 2] + 5;
      if (data[offset] !== 0xA5 || data[offset + 1] !== 0x5A) {
        throw new Error('Invalid app frame header.');
      }
      if (data.length - offset < length) { break; }
      const raw = data.subarray(offset, offset + length);
      if (!validFrame(raw)) { throw new Error('Invalid app frame checksum.'); }
      frames.push(raw);
      offset += length;
    }
    this.pending = Buffer.from(data.subarray(offset));
    return frames;
  }
}
