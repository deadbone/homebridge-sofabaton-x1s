import { describe, expect, it } from 'vitest';
import {
  buildActivateFrame,
  buildActivityCatalogRequestFrame,
  buildAuthRequestFrame,
  OP_ACK_READY,
  KEY_POWER_ON,
  buildCallMeFrame,
  checksum,
  splitFrames,
  parseActivityCatalogFrame,
  parseActivityCatalogFrames,
} from '../src/sofabaton/protocol.js';

describe('SofaBaton protocol frames', () => {
  it('calculates the low-byte checksum', () => {
    expect(checksum(Uint8Array.from([0xA5, 0x5A, 0x02, 0x3F, 0x65, 0x00]))).toBe(0xA5);
  });

  it('builds an activity activation frame', () => {
    expect(buildActivateFrame(0x65, KEY_POWER_ON).toString('hex')).toBe('a55a023f65c66b');
  });

  it('builds a CALL_ME frame with callback address and port', () => {
    expect(buildCallMeFrame('192.168.1.25', 8200).toString('hex')).toBe('a55a0cc3000000000000c0a80119200878');
  });

  it('builds catalog discovery frames', () => {
    expect(buildAuthRequestFrame().toString('hex')).toBe('a55a000100');
    expect(buildActivityCatalogRequestFrame().toString('hex')).toBe('a55a003a39');
  });

  it('parses an activity catalog response frame', () => {
    const frame = catalogFrame(101, 'Films');

    expect(parseActivityCatalogFrame(frame)).toEqual({ id: 101, name: 'Films', keyCode: KEY_POWER_ON, active: false });
  });

  it('parses the active activity flag from X1S catalog rows', () => {
    expect(parseActivityCatalogFrame(x1sCatalogFrame(101, 'Films', true))).toEqual({
      id: 101,
      name: 'Films',
      keyCode: KEY_POWER_ON,
      active: true,
    });
    expect(parseActivityCatalogFrame(x1sCatalogFrame(102, 'Musique', false))).toEqual({
      id: 102,
      name: 'Musique',
      keyCode: KEY_POWER_ON,
      active: false,
    });
  });

  it('parses multiple activity catalog frames from one TCP packet', () => {
    const packet = Buffer.concat([
      catalogFrame(101, 'Films'),
      catalogFrame(102, 'Musique'),
      catalogFrame(103, 'Xbox'),
      catalogFrame(104, 'switch 2'),
    ]);

    expect(parseActivityCatalogFrames(packet)).toEqual([
      { id: 101, name: 'Films', keyCode: KEY_POWER_ON, active: false },
      { id: 102, name: 'Musique', keyCode: KEY_POWER_ON, active: false },
      { id: 103, name: 'Xbox', keyCode: KEY_POWER_ON, active: false },
      { id: 104, name: 'switch 2', keyCode: KEY_POWER_ON, active: false },
    ]);
  });

  it('splits complete frames using the opcode high-byte length invariant', () => {
    const packet = Buffer.concat([
      frame(0x0001),
      frame(OP_ACK_READY, Buffer.from([0x00])),
      x1sCatalogFrame(101, 'Films', true, 1, 1),
    ]);

    expect(splitFrames(packet).map((item) => item.opcode)).toEqual([0x0001, OP_ACK_READY, 0xD53B]);
  });
});

function catalogFrame(id: number, name: string): Buffer {
  return x1sCatalogFrame(id, name, false);
}

function x1sCatalogFrame(id: number, name: string, active: boolean, row = 1, total = 1): Buffer {
  const payload = Buffer.alloc(0xD5);
  payload[0] = row;
  payload[3] = total;
  payload.writeUInt16BE(id, 6);
  payload[31] = active ? 0x01 : 0x00;
  const nameBytes = Buffer.from([...name].flatMap((char) => {
    const code = char.charCodeAt(0);
    return [code >> 8, code & 0xFF];
  }));
  nameBytes.copy(payload, 32, 0, Math.min(nameBytes.length, 60));
  return frame(0xD53B, payload);
}

function frame(opcode: number, payload = Buffer.alloc(opcode >> 8)): Buffer {
  const output = Buffer.alloc(2 + 2 + payload.length + 1);
  output[0] = 0xA5;
  output[1] = 0x5A;
  output.writeUInt16BE(opcode, 2);
  payload.copy(output, 4);
  output[output.length - 1] = checksum(output.subarray(0, output.length - 1));
  return output;
}
