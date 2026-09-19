import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { SofaBatonX1SPlatform } from '../platform.js';
import type { NormalizedActivityConfig } from '../config/types.js';

export class X1STelevisionAccessory {
  private readonly televisionService: Service;

  public constructor(
    private readonly platform: SofaBatonX1SPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly activities: readonly NormalizedActivityConfig[],
  ) {
    const { Service, Characteristic } = this.platform.api.hap;
    this.televisionService = this.accessory.getService(Service.Television) ?? this.accessory.addService(Service.Television);
    const initialActivity = this.activities[0];
    this.televisionService
      .setCharacteristic(Characteristic.Name, this.platform.configData.name)
      .setCharacteristic(Characteristic.ConfiguredName, this.platform.configData.name)
      .setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE)
      .setCharacteristic(Characteristic.Active, Characteristic.Active.INACTIVE);

    if (initialActivity) {
      this.televisionService.setCharacteristic(Characteristic.ActiveIdentifier, initialActivity.id);
    }

    this.televisionService.getCharacteristic(Characteristic.ActiveIdentifier)
      .onSet(this.handleActiveIdentifier.bind(this));

    this.televisionService.getCharacteristic(Characteristic.Active)
      .onSet(this.handleActive.bind(this));

    this.televisionService.getCharacteristic(Characteristic.RemoteKey)
      .onSet(() => {
        this.platform.logger.debug('Ignoring SofaBaton X1S TV remote key event.');
      });

    for (const activity of this.activities) {
      const input = this.inputService(activity);
      this.televisionService.addLinkedService(input);
    }

    this.platform.registerTelevisionAccessory(this);
    this.updateState(this.platform.activeActivityId);
  }

  public updateState(activeActivityId: number | undefined): void {
    const { Characteristic } = this.platform.api.hap;
    this.televisionService.updateCharacteristic(
      Characteristic.Active,
      activeActivityId === undefined ? Characteristic.Active.INACTIVE : Characteristic.Active.ACTIVE,
    );
    if (activeActivityId !== undefined) {
      this.televisionService.updateCharacteristic(Characteristic.ActiveIdentifier, activeActivityId);
    }
  }

  private async handleActiveIdentifier(value: CharacteristicValue): Promise<void> {
    const id = Number(value);
    const activity = this.activities.find((item) => item.id === id);
    if (!activity) {
      this.platform.logger.warn('Ignoring unknown SofaBaton activity id %s from HomeKit', id);
      return;
    }
    await this.platform.activateActivity(activity);
    this.televisionService.updateCharacteristic(this.platform.api.hap.Characteristic.Active, this.platform.api.hap.Characteristic.Active.ACTIVE);
  }

  private async handleActive(value: CharacteristicValue): Promise<void> {
    if (value === this.platform.api.hap.Characteristic.Active.INACTIVE && this.platform.configData.enableAllOff) {
      await this.platform.activateAllOff();
    }
  }

  private inputService(activity: NormalizedActivityConfig): Service {
    const { Service, Characteristic } = this.platform.api.hap;
    const subtype = `activity-${activity.id}`;
    const existing = this.accessory.getServiceById(Service.InputSource, subtype);
    const service = existing ?? this.accessory.addService(Service.InputSource, activity.name, subtype);
    service
      .setCharacteristic(Characteristic.Identifier, activity.id)
      .setCharacteristic(Characteristic.ConfiguredName, activity.name)
      .setCharacteristic(Characteristic.Name, activity.name)
      .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION)
      .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN);
    return service;
  }
}
