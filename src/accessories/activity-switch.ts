import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { SofaBatonX1SPlatform } from '../platform.js';
import type { NormalizedActivityConfig } from '../config/types.js';

export class ActivitySwitchAccessory {
  private readonly service: Service;

  public constructor(
    private readonly platform: SofaBatonX1SPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly activity: NormalizedActivityConfig,
  ) {
    const { Service, Characteristic } = this.platform.api.hap;
    this.service = this.accessory.getService(Service.Switch) ?? this.accessory.addService(Service.Switch);
    this.service
      .setCharacteristic(Characteristic.Name, activity.name)
      .setCharacteristic(Characteristic.ConfiguredName, activity.name);
    this.service.getCharacteristic(Characteristic.On)
      .onSet(this.handleSet.bind(this))
      .updateValue(this.platform.isActivityActive(activity.id));
    this.platform.registerActivitySwitch(activity.id, this);
  }

  public updateState(activeActivityId: number | undefined): void {
    this.service.updateCharacteristic(this.platform.api.hap.Characteristic.On, activeActivityId === this.activity.id);
  }

  private async handleSet(value: CharacteristicValue): Promise<void> {
    if (value === true) {
      await this.platform.activateActivity(this.activity);
      return;
    }

    if (this.platform.isActivityActive(this.activity.id)) {
      await this.platform.deactivateActivity(this.activity);
    }
  }
}
