import type { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';
import { ActivitySwitchAccessory } from './accessories/activity-switch.js';
import { X1STelevisionAccessory } from './accessories/x1s-television.js';
import { ConfigValidationError, normalizeConfig } from './config/validation.js';
import type { NormalizedActivityConfig, NormalizedPlatformConfig } from './config/types.js';
import { SofaBatonX1SClient } from './sofabaton/client.js';
import { KEY_POWER_OFF, KEY_POWER_ON } from './sofabaton/protocol.js';
import type { SofaBatonActivity } from './sofabaton/protocol.js';
import { ACCESSORY_UUID_NAMESPACE, PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { PluginLogger } from './utils/logger.js';
import { sanitizeHomeKitName } from './utils/security.js';

export class SofaBatonX1SPlatform implements DynamicPlatformPlugin {
  public readonly accessories = new Map<string, PlatformAccessory>();
  public readonly logger: PluginLogger;
  public readonly configData: NormalizedPlatformConfig;
  private readonly client?: SofaBatonX1SClient;
  private readonly activitySwitches = new Map<number, ActivitySwitchAccessory>();
  private activitiesById = new Map<number, NormalizedActivityConfig>();
  private televisionAccessory?: X1STelevisionAccessory;
  private awaitingDiscovery = false;
  public activeActivityId: number | undefined;

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
      } else {
        log.error('Invalid SofaBaton X1S configuration: %s', error instanceof Error ? error.message : String(error));
      }
      this.configData = disabledConfig(config);
    }

    this.logger = new PluginLogger(log, this.configData.debugProtocol);
    if (hasIgnoredHubIp(config, this.configData)) {
      this.logger.warn('Ignoring invalid SofaBaton X1S hubIp. Configure a valid IPv4 address before enabling discovery or sending commands.');
    }
    if (this.configData.hubIp) {
      this.client = new SofaBatonX1SClient({
        hubIp: this.configData.hubIp,
        appCompatibility: this.configData.appCompatibility,
        appCompatibilityAddress: this.configData.appCompatibilityAddress,
        log: (message) => this.logger.info(message),
        listenPort: this.configData.localListenPort,
        timeoutMs: this.configData.commandTimeoutSeconds * 1000,
        reconnectBaseMs: this.configData.retryIntervalSeconds * 1000,
        debug: (message) => this.logger.debug(message),
        onActivities: (activities, source) => {
          if (this.awaitingDiscovery && activities.length > 0) {
            this.awaitingDiscovery = false;
            const recovered = this.mergeActivities(activities);
            this.activitiesById = new Map(recovered.map((activity) => [activity.id, activity]));
            this.registerAccessories(recovered);
            this.logger.info('X1S activity discovery recovered; cached accessories reconciled.');
          }
          if (this.activitiesById.size > 0) {
            this.syncActiveActivityFromActivities(activities, source);
          }
        },
        onConnectionChange: (connected) => {
          if (connected) {
            this.logger.debug('SofaBaton X1S hub TCP connection established.');
          } else {
            this.logger.debug('SofaBaton X1S hub TCP connection closed.');
          }
        },
      });
    }

    this.api.on('didFinishLaunching', () => {
      void this.discoverAndRegisterAccessories().catch((error: unknown) => {
        this.logger.warn('SofaBaton X1S startup failed: %s', error instanceof Error ? error.message : String(error));
      });
    });

    this.api.on('shutdown', () => {
      this.client?.stop();
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    this.logger.info('Loading accessory from cache: %s', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  public registerActivitySwitch(activityId: number, accessory: ActivitySwitchAccessory): void {
    this.activitySwitches.set(activityId, accessory);
    accessory.updateState(this.activeActivityId);
  }

  public registerTelevisionAccessory(accessory: X1STelevisionAccessory): void {
    this.televisionAccessory = accessory;
    accessory.updateState(this.activeActivityId);
  }

  public isActivityActive(activityId: number): boolean {
    return this.activeActivityId === activityId;
  }

  public async activateActivity(activity: NormalizedActivityConfig): Promise<void> {
    this.assertDiscoveryReady();
    if (!this.client) {
      this.logger.warn('[%s] Cannot send activity command because hubIp is not configured.', activity.name);
      return;
    }
    this.logger.info('[%s] Starting SofaBaton X1S activity id %s', activity.name, activity.id);
    try {
      await this.client.activateActivity(activity.id, activity.keyCode);
      this.setActiveActivityId(activity.id, 'HomeKit command');
      this.logger.info('[%s] SofaBaton X1S command sent', activity.name);
    } catch (error) {
      this.logger.warn('[%s] SofaBaton X1S command failed: %s', activity.name, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public async deactivateActivity(activity: NormalizedActivityConfig): Promise<void> {
    this.assertDiscoveryReady();
    if (!this.client) {
      this.logger.warn('[%s] Cannot send activity off command because hubIp is not configured.', activity.name);
      return;
    }
    this.logger.info('[%s] Stopping SofaBaton X1S activity id %s', activity.name, activity.id);
    try {
      await this.client.activateActivity(activity.id, KEY_POWER_OFF);
      if (this.activeActivityId === activity.id) {
        this.setActiveActivityId(undefined, 'HomeKit off command');
      }
      this.logger.info('[%s] SofaBaton X1S off command sent', activity.name);
    } catch (error) {
      this.logger.warn('[%s] SofaBaton X1S off command failed: %s', activity.name, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public async activateAllOff(): Promise<void> {
    const id = this.configData.allOffActivityId;
    if (!this.configData.enableAllOff || id === undefined) {
      return;
    }
    await this.deactivateActivity({ id, name: 'All Off', keyCode: KEY_POWER_OFF });
    this.setActiveActivityId(undefined, 'HomeKit all-off command');
  }

  private async discoverAndRegisterAccessories(): Promise<void> {
    const activities = await this.activitiesForRegistration();
    this.activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
    this.registerAccessories(activities);
    this.syncActiveActivityFromActivities(activities, 'startup discovery');
    this.startEventConnection();
  }

  private async activitiesForRegistration(): Promise<readonly NormalizedActivityConfig[]> {
    const manualActivities = this.configData.manualActivities;
    if (!this.configData.discovery || !this.client) {
      return manualActivities;
    }

    try {
      const discoveredActivities = await this.client.start();
      if (discoveredActivities.length === 0) {
        this.logger.warn('X1S activity discovery returned no activities; preserving cached accessories until discovery succeeds.');
        return this.discoveryFallback();
      }

      this.logger.info('Discovered %s SofaBaton X1S activities.', discoveredActivities.length);
      return this.mergeActivities(discoveredActivities);
    } catch (error) {
      this.logger.warn('SofaBaton X1S activity discovery failed: %s', error instanceof Error ? error.message : String(error));
      return this.discoveryFallback();
    }
  }

  private assertDiscoveryReady(): void {
    if (this.awaitingDiscovery) {
      throw new Error('X1S activity discovery is unavailable; cached accessories are preserved, but commands are not queued.');
    }
  }

  private mergeActivities(discovered: readonly SofaBatonActivity[]): readonly NormalizedActivityConfig[] {
    const activities = new Map<number, NormalizedActivityConfig>(discovered.map((activity) => [activity.id, activity]));
    for (const activity of this.configData.manualActivities) {
      activities.set(activity.id, { ...activity, active: activities.get(activity.id)?.active });
    }
    return [...activities.values()].sort((left, right) => left.id - right.id);
  }

  private discoveryFallback(): readonly NormalizedActivityConfig[] {
    this.awaitingDiscovery = true;
    const cached: NormalizedActivityConfig[] = [];
    for (const accessory of this.accessories.values()) {
      const id: unknown = accessory.context.activityId;
      if (accessory.context.kind === 'activity-switch' && typeof id === 'number'
        && Number.isInteger(id) && id >= 1 && id <= 255
        && accessory.UUID === this.uuidFor(`activity-switch:${id}`)) {
        cached.push({ id, name: accessory.displayName, keyCode: KEY_POWER_ON });
      }
    }
    this.logger.warn('Preserving cached X1S accessories after incomplete discovery. Commands remain unavailable until synchronization recovers.');
    return this.mergeActivities(cached);
  }

  private registerAccessories(activities: readonly NormalizedActivityConfig[]): void {
    const expectedUUIDs = new Set<string>();

    if (activities.length === 0) {
      if (this.awaitingDiscovery) { return; }
      this.logger.warn('No SofaBaton X1S activities available. Configure hubIp for discovery or add manualActivities. No accessories will be published until the plugin is configured.');
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

    for (const activity of activities) {
      const uuid = this.uuidFor(`activity-switch:${activity.id}`);
      expectedUUIDs.add(uuid);
      this.registerOrRestoreSwitch(uuid, activity);
    }

    if (this.awaitingDiscovery) { return; }
    for (const [uuid, accessory] of this.accessories) {
      if (!expectedUUIDs.has(uuid)) {
        this.logger.info('Removing stale accessory from cache: %s', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
      }
    }
  }

  private startEventConnection(): void {
    if (!this.client) {
      return;
    }

    void this.client.start()
      .then((activities) => {
        this.syncActiveActivityFromActivities(activities, 'event connection startup');
      })
      .catch((error: unknown) => {
        this.logger.warn('SofaBaton X1S event connection failed: %s', error instanceof Error ? error.message : String(error));
      });
  }

  private syncActiveActivityFromActivities(activities: readonly SofaBatonActivity[], source: string): void {
    const knownStates = activities.filter((activity) => activity.active !== undefined);
    if (knownStates.length === 0) {
      this.logger.debug('X1S %s did not include active activity state.', source);
      return;
    }

    const activeActivity = knownStates.find((activity) => activity.active === true);
    if (!activeActivity) {
      this.setActiveActivityId(undefined, source);
      return;
    }

    if (!this.activitiesById.has(activeActivity.id)) {
      this.logger.warn('X1S %s reports active activity id %s, but it is not registered in HomeKit.', source, activeActivity.id);
      this.setActiveActivityId(undefined, source);
      return;
    }

    this.setActiveActivityId(activeActivity.id, source);
  }

  private setActiveActivityId(activityId: number | undefined, source: string): void {
    if (this.activeActivityId === activityId) {
      return;
    }

    this.activeActivityId = activityId;
    this.updateActivityStates();
    const activityName = activityId === undefined ? 'Powered off' : this.activitiesById.get(activityId)?.name ?? `Activity ${activityId}`;
    this.logger.info('SofaBaton X1S active activity updated from %s: %s', source, activityName);
  }

  private updateActivityStates(): void {
    for (const accessory of this.activitySwitches.values()) {
      accessory.updateState(this.activeActivityId);
    }
    this.televisionAccessory?.updateState(this.activeActivityId);
  }

  private registerOrRestoreTelevision(uuid: string, activities: readonly NormalizedActivityConfig[]): void {
    const existing = this.accessories.get(uuid);
    if (existing) {
      existing.updateDisplayName(this.configData.name);
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
      existing.updateDisplayName(displayName);
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

function hasIgnoredHubIp(config: PlatformConfig, normalizedConfig: NormalizedPlatformConfig): boolean {
  return typeof config.hubIp === 'string' && config.hubIp.trim().length > 0 && normalizedConfig.hubIp === undefined;
}

function disabledConfig(config: PlatformConfig): NormalizedPlatformConfig {
  const name = typeof config.name === 'string' && config.name.trim().length > 0 ? config.name.trim() : 'SofaBaton X1S';
  return {
    name,
    hubId: 'sofabaton-x1s-disabled',
    discovery: false,
    appCompatibility: false,
    localListenPort: 8200,
    exposureMode: 'switches',
    enableAllOff: false,
    commandTimeoutSeconds: 8,
    retryIntervalSeconds: 30,
    debugProtocol: false,
    assumeX1S: false,
    manualActivities: [],
  };
}
