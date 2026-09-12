import { describe, expect, it } from 'vitest';
import { buildActivateFrame, buildCallMeFrame, checksum } from '../src/sofabaton/protocol.js';

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
});
