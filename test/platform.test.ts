import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { API, Logging, PlatformAccessory } from 'homebridge';
import type { SofaBatonActivity } from '../src/sofabaton/protocol.js';
import { SofaBatonX1SPlatform } from '../src/platform.js';

const hub = vi.hoisted(() => ({
  start: vi.fn(), activateActivity: vi.fn(), stop: vi.fn(),
  options: {} as { onActivities: (activities: SofaBatonActivity[], source: string) => void },
}));
vi.mock('../src/sofabaton/client.js', () => ({
  SofaBatonX1SClient: class {
    constructor(options: typeof hub.options) { hub.options = options; }
    start = hub.start;
    activateActivity = hub.activateActivity;
    stop = hub.stop;
  },
}));
vi.mock('../src/accessories/activity-switch.js', () => ({ ActivitySwitchAccessory: class {} }));
vi.mock('../src/accessories/x1s-television.js', () => ({ X1STelevisionAccessory: class {} }));

class Accessory {
  context: Record<string, unknown> = {};
  constructor(public displayName: string, public UUID: string) {}
  updateDisplayName(name: string) { this.displayName = name; }
}
const activity = { id: 1, name: 'Films', keyCode: 198, active: true };
function setup(extra = {}) {
  const callbacks = new Map<string, () => void>();
  const api = {
    on: (event: string, cb: () => void) => callbacks.set(event, cb),
    hap: { uuid: { generate: (value: string) => value } },
    platformAccessory: Accessory,
    registerPlatformAccessories: vi.fn(), unregisterPlatformAccessories: vi.fn(), updatePlatformAccessories: vi.fn(),
  };
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const platform = new SofaBatonX1SPlatform(log as unknown as Logging, {
    platform: 'SofaBatonX1S', hubIp: '192.168.1.154', hubId: 'test', ...extra,
  }, api as unknown as API);
  const cache = (id: number | 'tv') => {
    const accessory = new Accessory(`Activity ${id}`, `homebridge-sofabaton-x1s:test:${id === 'tv' ? 'tv' : `activity-switch:${id}`}`);
    accessory.context = id === 'tv' ? { kind: 'television' } : { kind: 'activity-switch', activityId: id };
    platform.configureAccessory(accessory as unknown as PlatformAccessory);
    return accessory;
  };
  const launch = async () => { callbacks.get('didFinishLaunching')!(); await new Promise(setImmediate); };
  return { platform, api, cache, launch, callbacks };
}
beforeEach(() => { vi.resetAllMocks(); hub.start.mockRejectedValue(new Error('callback timeout')); });
describe('accessory preservation during incomplete discovery', () => {
  it('preserves cached switches and TV after a timeout, even with a partial manual list', async () => {
    const { platform, api, cache, launch } = setup({ manualActivities: [activity] });
    const existing = [cache(1), cache(2), cache('tv')];
    await launch();
    expect(api.unregisterPlatformAccessories).not.toHaveBeenCalled();
    for (const accessory of existing) expect(platform.accessories.get(accessory.UUID)).toBe(accessory);
    await expect(platform.activateActivity(activity)).rejects.toThrow('discovery is unavailable');
    await expect(platform.deactivateActivity(activity)).rejects.toThrow('discovery is unavailable');
    expect(hub.activateActivity).not.toHaveBeenCalled();
  });
  it('preserves cache for an empty discovery result', async () => {
    hub.start.mockResolvedValue([]);
    const { api, cache, launch } = setup();
    cache(1);
    await launch();
    expect(api.unregisterPlatformAccessories).not.toHaveBeenCalled();
  });
  it('reconciles only on successful recovery, reuses UUIDs and synchronizes state without replay', async () => {
    const { platform, api, cache, launch } = setup();
    const retained = cache(1);
    const obsolete = cache(2);
    await launch();
    hub.options.onActivities([], 'reconnect');
    expect(api.unregisterPlatformAccessories).not.toHaveBeenCalled();
    hub.options.onActivities([activity], 'reconnect');
    expect(platform.accessories.get(retained.UUID)).toBe(retained);
    expect(api.unregisterPlatformAccessories).toHaveBeenCalledWith(expect.any(String), expect.any(String), [obsolete]);
    expect(platform.activeActivityId).toBe(1);
    expect(hub.activateActivity).not.toHaveBeenCalled();
    await platform.activateActivity(activity);
    expect(hub.activateActivity).toHaveBeenCalledWith(1, 198);
  });
  it('recovers a first installation without cached accessories', async () => {
    const { platform, api, launch, callbacks } = setup();
    await launch();
    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    hub.options.onActivities([activity], 'reconnect');
    expect(api.registerPlatformAccessories).toHaveBeenCalledTimes(1);
    expect(platform.activeActivityId).toBe(1);
    callbacks.get('shutdown')!();
    expect(hub.stop).toHaveBeenCalledTimes(1);
  });
  it('still prunes obsolete accessories after successful startup discovery', async () => {
    hub.start.mockResolvedValue([activity]);
    const { api, cache, launch } = setup();
    cache(1); const obsolete = cache(2);
    await launch();
    expect(api.unregisterPlatformAccessories).toHaveBeenCalledWith(expect.any(String), expect.any(String), [obsolete]);
  });
  it('keeps intentional manual-only removal behavior', async () => {
    const { api, cache, launch } = setup({ discovery: false, manualActivities: [activity] });
    cache(1); const obsolete = cache(2);
    await launch();
    expect(api.unregisterPlatformAccessories).toHaveBeenCalledWith(expect.any(String), expect.any(String), [obsolete]);
  });
});
