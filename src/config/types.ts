export type ExposureMode = 'tv' | 'switches' | 'both';

export interface ManualActivityConfig {
  readonly id: number;
  readonly name: string;
  readonly keyCode: number;
}

export interface NormalizedActivityConfig {
  readonly id: number;
  readonly name: string;
  readonly keyCode: number;
}

export interface NormalizedPlatformConfig {
  readonly name: string;
  readonly hubIp?: string;
  readonly hubId: string;
  readonly discovery: boolean;
  readonly localListenPort: number;
  readonly exposureMode: ExposureMode;
  readonly enableAllOff: boolean;
  readonly allOffActivityId?: number;
  readonly pollIntervalSeconds: number;
  readonly commandTimeoutSeconds: number;
  readonly retryIntervalSeconds: number;
  readonly debugProtocol: boolean;
  readonly assumeX1S: boolean;
  readonly manualActivities: readonly NormalizedActivityConfig[];
}
