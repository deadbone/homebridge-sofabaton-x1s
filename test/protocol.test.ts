import { describe, expect, it } from 'vitest';
import {
  buildActivateFrame,
  buildActivityCatalogRequestFrame,
  buildAuthRequestFrame,
  KEY_POWER_ON,
  buildCallMeFrame,
  checksum,
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

    expect(parseActivityCatalogFrame(frame)).toEqual({ id: 101, name: 'Films', keyCode: KEY_POWER_ON });
  });

  it('parses multiple activity catalog frames from one TCP packet', () => {
    const packet = Buffer.concat([
      catalogFrame(101, 'Films'),
      catalogFrame(102, 'Musique'),
      catalogFrame(103, 'Xbox'),
      catalogFrame(104, 'switch 2'),
    ]);

    expect(parseActivityCatalogFrames(packet)).toEqual([
      { id: 101, name: 'Films', keyCode: KEY_POWER_ON },
      { id: 102, name: 'Musique', keyCode: KEY_POWER_ON },
      { id: 103, name: 'Xbox', keyCode: KEY_POWER_ON },
      { id: 104, name: 'switch 2', keyCode: KEY_POWER_ON },
    ]);
  });
});

function catalogFrame(id: number, name: string): Buffer {
  const header = Buffer.alloc(12);
  header[0] = 0xA5;
  header[1] = 0x5A;
  header.writeUInt16BE(0xD53B, 2);
  header[11] = id;

  const nameBytes = Buffer.from([...name].flatMap((char) => {
    const code = char.charCodeAt(0);
    return [code >> 8, code & 0xFF];
  }));
  return Buffer.concat([header, nameBytes, Buffer.from([0x00, 0x00, 0x00])]);
}
