import { Accessory, Characteristic, Service, uuid } from '@homebridge/hap-nodejs';
import type { PlatformAccessory } from 'homebridge';
import { describe, expect, it, vi } from 'vitest';
import { ActivitySwitchAccessory } from '../src/accessories/activity-switch.js';
import { X1STelevisionAccessory } from '../src/accessories/x1s-television.js';
import type { SofaBatonX1SPlatform } from '../src/platform.js';

const movies = { id: 1, name: 'Movies', keyCode: 198 };
const music = { id: 2, name: 'Music', keyCode: 199 };

function makePlatform(enableAllOff = true) {
  return {
    api: { hap: { Characteristic, Service } },
    configData: { name: 'SofaBaton X1S', enableAllOff },
    logger: { warn: vi.fn() },
    activeActivityId: undefined,
    isActivityActive: vi.fn<(id: number) => boolean>().mockReturnValue(false),
    registerActivitySwitch: vi.fn(),
    registerTelevisionAccessory: vi.fn(),
    activateActivity: vi.fn().mockResolvedValue(undefined),
    deactivateActivity: vi.fn().mockResolvedValue(undefined),
    activateAllOff: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ActivitySwitchAccessory', () => {
  it('only deactivates its own active activity when switched off', async () => {
    const platform = makePlatform();
    const accessory = new Accessory(movies.name, uuid.generate('movies'));
    const activitySwitch = new ActivitySwitchAccessory(
      platform as unknown as SofaBatonX1SPlatform, accessory as unknown as PlatformAccessory, movies,
    );
    const on = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);

    activitySwitch.updateState(music.id);
    expect(on.value).toBe(false);
    await on.handleSetRequest(false);
    expect(platform.deactivateActivity).not.toHaveBeenCalled();

    await on.handleSetRequest(true);
    expect(platform.activateActivity).toHaveBeenCalledExactlyOnceWith(movies);
    platform.isActivityActive.mockImplementation((id) => id === movies.id);
    activitySwitch.updateState(movies.id);
    expect(on.value).toBe(true);
    await on.handleSetRequest(false);
    expect(platform.deactivateActivity).toHaveBeenCalledExactlyOnceWith(movies);
  });
});

describe('X1STelevisionAccessory', () => {
  it('activates the activity selected by its input identifier', async () => {
    const platform = makePlatform();
    const accessory = new Accessory('TV', uuid.generate('tv'));
    new X1STelevisionAccessory(
      platform as unknown as SofaBatonX1SPlatform, accessory as unknown as PlatformAccessory, [movies, music],
    );
    const television = accessory.getService(Service.Television)!;
    const input = accessory.getServiceById(Service.InputSource, `activity-${music.id}`)!;
    const identifier = input.getCharacteristic(Characteristic.Identifier).value!;
    expect(identifier).toBe(music.id);

    await television.getCharacteristic(Characteristic.ActiveIdentifier).handleSetRequest(identifier);

    expect(platform.activateActivity).toHaveBeenCalledExactlyOnceWith(music);
    expect(television.getCharacteristic(Characteristic.Active).value).toBe(Characteristic.Active.ACTIVE);
  });

  it.each([true, false])('uses All Off for a TV power-off only if enabled (%s)', async (enableAllOff) => {
    const platform = makePlatform(enableAllOff);
    const accessory = new Accessory('TV', uuid.generate('tv'));
    const television = new X1STelevisionAccessory(
      platform as unknown as SofaBatonX1SPlatform, accessory as unknown as PlatformAccessory, [movies, music],
    );
    television.updateState(music.id);
    const active = accessory.getService(Service.Television)!.getCharacteristic(Characteristic.Active);
    expect(active.value).toBe(Characteristic.Active.ACTIVE);
    expect(platform.activateAllOff).not.toHaveBeenCalled();

    await active.handleSetRequest(Characteristic.Active.INACTIVE);

    expect(platform.activateAllOff).toHaveBeenCalledTimes(enableAllOff ? 1 : 0);
  });
});
