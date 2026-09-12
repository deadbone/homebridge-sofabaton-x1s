import type { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';
import { ActivitySwitchAccessory } from './accessories/activity-switch.js';
import { X1STelevisionAccessory } from './accessories/x1s-television.js';
import { ConfigValidationError, normalizeConfig } from './config/validation.js';
import type { NormalizedActivityConfig, NormalizedPlatformConfig } from './config/types.js';
import { SofaBatonX1SClient } from './sofabaton/client.js';
import { KEY_POWER_OFF } from './sofabaton/protocol.js';
import { ACCESSORY_UUID_NAMESPACE, PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { PluginLogger } from './utils/logger.js';
import { sanitizeHomeKitName } from './utils/security.js';

export class SofaBatonX1SPlatform implements DynamicPlatformPlugin {
  public readonly accessories = new Map<string, PlatformAccessory>();
  public readonly logger: PluginLogger;
  public readonly configData: NormalizedPlatformConfig;
  private readonly client?: SofaBatonX1SClient;

  public constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    try {
      this.configData = normalizeConfig(config);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        log.error(error.message);
      }
      throw error;
    }

    this.logger = new PluginLogger(log, this.configData.debugProtocol);
    if (this.configData.hubIp) {
      this.client = new SofaBatonX1SClient({
        hubIp: this.configData.hubIp,
        listenPort: this.configData.localListenPort,
        timeoutMs: this.configData.commandTimeoutSeconds * 1000,
        debug: (message) => this.logger.debug(message),
      });
    }

    this.api.on('didFinishLaunching', () => {
      void this.discoverAndRegisterAccessories();
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    this.logger.info('Loading accessory from cache: %s', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  public async activateActivity(activity: NormalizedActivityConfig): Promise<void> {
    if (!this.client) {
      this.logger.warn('[%s] Cannot send activity command because hubIp is not configured.', activity.name);
      return;
    }
    this.logger.info('[%s] Starting SofaBaton X1S activity id %s', activity.name, activity.id);
    try {
      await this.client.activateActivity(activity.id, activity.keyCode);
      this.logger.info('[%s] SofaBaton X1S command sent', activity.name);
    } catch (error) {
      this.logger.warn('[%s] SofaBaton X1S command failed: %s', activity.name, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public async activateAllOff(): Promise<void> {
    const id = this.configData.allOffActivityId;
    if (!this.configData.enableAllOff || id === undefined) {
      return;
    }
    await this.activateActivity({ id, name: 'All Off', keyCode: KEY_POWER_OFF });
  }

  private async discoverAndRegisterAccessories(): Promise<void> {
    const activities = await this.activitiesForRegistration();
    this.registerAccessories(activities);
  }

  private async activitiesForRegistration(): Promise<readonly NormalizedActivityConfig[]> {
    const manualActivities = this.configData.manualActivities;
    if (!this.configData.discovery || !this.client) {
      return manualActivities;
    }

    try {
      const discoveredActivities = await this.client.discoverActivities();
      if (discoveredActivities.length === 0) {
        this.logger.warn('X1S activity discovery returned no activities. Falling back to manualActivities.');
        return manualActivities;
      }

      const activities = new Map<number, NormalizedActivityConfig>();
      for (const activity of discoveredActivities) {
        activities.set(activity.id, activity);
      }
      for (const activity of manualActivities) {
        activities.set(activity.id, activity);
      }

      this.logger.info('Discovered %s SofaBaton X1S activities.', discoveredActivities.length);
      return [...activities.values()].sort((left, right) => left.id - right.id);
    } catch (error) {
      this.logger.warn('SofaBaton X1S activity discovery failed: %s', error instanceof Error ? error.message : String(error));
      return manualActivities;
    }
  }

  private registerAccessories(activities: readonly NormalizedActivityConfig[]): void {
    const expectedUUIDs = new Set<string>();

    if (activities.length === 0) {
      this.logger.warn('No SofaBaton X1S activities available. Enable discovery with hubIp or add manualActivities.');
      for (const [uuid, accessory] of this.accessories) {
        this.logger.info('Removing stale accessory from cache: %s', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
      }
      return;
    }

    if (this.configData.exposureMode === 'tv' || this.configData.exposureMode === 'both') {
      const uuid = this.uuidFor('tv');
      expectedUUIDs.add(uuid);
      this.registerOrRestoreTelevision(uuid, activities);
    }

    if (this.configData.exposureMode === 'switches' || this.configData.exposureMode === 'both') {
      for (const activity of activities) {
        const uuid = this.uuidFor(`activity-switch:${activity.id}`);
        expectedUUIDs.add(uuid);
        this.registerOrRestoreSwitch(uuid, activity);
      }
    }

    for (const [uuid, accessory] of this.accessories) {
      if (!expectedUUIDs.has(uuid)) {
        this.logger.info('Removing stale accessory from cache: %s', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
      }
    }
  }

  private registerOrRestoreTelevision(uuid: string, activities: readonly NormalizedActivityConfig[]): void {
    const existing = this.accessories.get(uuid);
    if (existing) {
      existing.displayName = this.configData.name;
      existing.context.kind = 'television';
      this.api.updatePlatformAccessories([existing]);
      new X1STelevisionAccessory(this, existing, activities);
      return;
    }

    const accessory = new this.api.platformAccessory(this.configData.name, uuid);
    accessory.context.kind = 'television';
    new X1STelevisionAccessory(this, accessory, activities);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.accessories.set(uuid, accessory);
  }

  private registerOrRestoreSwitch(uuid: string, activity: NormalizedActivityConfig): void {
    const displayName = sanitizeHomeKitName(activity.name);
    const existing = this.accessories.get(uuid);
    if (existing) {
      existing.displayName = displayName;
      existing.context.kind = 'activity-switch';
      existing.context.activityId = activity.id;
      this.api.updatePlatformAccessories([existing]);
      new ActivitySwitchAccessory(this, existing, activity);
      return;
    }

    const accessory = new this.api.platformAccessory(displayName, uuid);
    accessory.context.kind = 'activity-switch';
    accessory.context.activityId = activity.id;
    new ActivitySwitchAccessory(this, accessory, activity);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.accessories.set(uuid, accessory);
  }

  private uuidFor(kind: string): string {
    return this.api.hap.uuid.generate(`${ACCESSORY_UUID_NAMESPACE}:${this.configData.hubId}:${kind}`);
  }
}
