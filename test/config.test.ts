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
    expect(config.exposureMode).toBe('tv');
    expect(config.manualActivities).toEqual([{ id: 101, name: 'Watch TV', keyCode: KEY_POWER_ON }]);
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
      manualActivities: [{ id: null, name: '', keyCode: 0 }],
    });

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
