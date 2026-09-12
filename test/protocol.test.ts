import { describe, expect, it } from 'vitest';
import {
  buildActivateFrame,
  buildActivityCatalogRequestFrame,
  buildAuthRequestFrame,
  buildCallMeFrame,
  checksum,
  parseActivityCatalogFrame,
} from '../src/sofabaton/protocol.js';

describe('SofaBaton protocol frames', () => {
  it('calculates the low-byte checksum', () => {
    expect(checksum(Uint8Array.from([0xA5, 0x5A, 0x02, 0x3F, 0x65, 0x00]))).toBe(0xA5);
  });

  it('builds an activity activation frame', () => {
    expect(buildActivateFrame(0x65, 0x00).toString('hex')).toBe('a55a023f6500a5');
  });

  it('builds a CALL_ME frame with callback address and port', () => {
    expect(buildCallMeFrame('192.168.1.25', 8200).toString('hex')).toBe('a55a0cc3000000000000c0a80119200878');
  });

  it('builds catalog discovery frames', () => {
    expect(buildAuthRequestFrame().toString('hex')).toBe('a55a000100');
    expect(buildActivityCatalogRequestFrame().toString('hex')).toBe('a55a003a39');
  });

  it('parses an activity catalog response frame', () => {
    const frame = Buffer.from(
      'a55ad53b01000104000100650d010000000000000000000000000000000000000000000100460069006c006d0073000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000460069006c006d00730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fc0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb37',
      'hex',
    );

    expect(parseActivityCatalogFrame(frame)).toEqual({ id: 101, name: 'Films', keyCode: 0 });
  });
});
