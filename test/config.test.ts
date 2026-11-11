import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../src/config/validation.js';
import { KEY_POWER_ON } from '../src/sofabaton/protocol.js';

describe('normalizeConfig', () => {
  it('normalizes a minimal X1S configuration', () => {
    const config = normalizeConfig({
      platform: 'SofaBatonX1S',
      name: 'Living Room X1S',
      hubIp: '192.168.1.50',
      manualActivities: [{ id: 101, name: 'Watch TV' }],
    });

    expect(config.name).toBe('Living Room X1S');
    expect(config.exposureMode).toBe('switches');
    expect(config.manualActivities).toEqual([{ id: 101, name: 'Watch TV', keyCode: KEY_POWER_ON }]);
  });

  it('treats manual keyCode 0 as the X1S POWER_ON command', () => {
    const config = normalizeConfig({
      platform: 'SofaBatonX1S',
      name: 'Living Room X1S',
      hubIp: '192.168.1.50',
      manualActivities: [{ id: 101, name: 'Watch TV', keyCode: 0 }],
    });

    expect(config.manualActivities).toEqual([{ id: 101, name: 'Watch TV', keyCode: KEY_POWER_ON }]);
  });

  it('allows an incomplete Homebridge UI configuration to start without accessories', () => {
    const config = normalizeConfig({
      platform: 'SofaBatonX1S',
      name: 'Living Room X1S',
    });

    expect(config.hubIp).toBeUndefined();
    expect(config.manualActivities).toEqual([]);
  });

  it('allows discovery-only configuration with an empty manual activity row', () => {
    const config = normalizeConfig({
      platform: 'SofaBatonX1S',
      name: 'Living Room X1S',
      hubIp: '192.168.1.50',
      discovery: true,
      manualActivities: [{}],
    });

    expect(config.discovery).toBe(true);
    expect(config.manualActivities).toEqual([]);
  });

  it('ignores Homebridge UI blank manual activity rows with default values', () => {
    const config = normalizeConfig({
      platform: 'SofaBatonX1S',
      name: 'Living Room X1S',
      hubIp: '192.168.1.50',
      discovery: true,
      manualActivities: [
        { id: null, name: '', keyCode: 0 },
        { keyCode: KEY_POWER_ON },
      ],
    });

    expect(config.manualActivities).toEqual([]);
  });

  it('ignores invalid hub IP addresses before network startup', () => {
    const config = normalizeConfig({
      platform: 'SofaBatonX1S',
      name: 'X1S',
      hubIp: 'test-value',
    });

    expect(config.hubIp).toBeUndefined();
    expect(config.manualActivities).toEqual([]);
  });

  it('rejects duplicate activity ids', () => {
    expect(() => normalizeConfig({
      platform: 'SofaBatonX1S',
      name: 'X1S',
      hubIp: '192.168.1.50',
      manualActivities: [
        { id: 101, name: 'Watch TV' },
        { id: 101, name: 'Movie' },
      ],
    })).toThrow(/duplicate activity id/);
  });
});

describe('app compatibility configuration', () => {
  it('defaults to disabled and can be enabled from UI configuration', () => {
    expect(normalizeConfig({ platform: 'SofaBatonX1S' }).appCompatibility).toBe(false);
    expect(normalizeConfig({ platform: 'SofaBatonX1S', hubIp: '192.168.1.50', appCompatibility: true }).appCompatibility).toBe(true);
  });
  it('requires a private hub and validates the optional interface address', () => {
    for (const hubIp of [undefined, '8.8.8.8', 'invalid']) {
      expect(() => normalizeConfig({ platform: 'SofaBatonX1S', appCompatibility: true, hubIp })).toThrow(/hubIp/);
    }
    expect(() => normalizeConfig({ platform: 'SofaBatonX1S', appCompatibility: 'true' })).toThrow(/Boolean/);
    expect(() => normalizeConfig({ platform: 'SofaBatonX1S', appCompatibilityAddress: '0.0.0.0' })).toThrow(/private LAN/);
    expect(normalizeConfig({ platform: 'SofaBatonX1S', appCompatibilityAddress: '' }).appCompatibilityAddress).toBeUndefined();
  });
});
