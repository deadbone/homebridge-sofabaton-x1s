import { isIP } from 'node:net';
import type { PlatformConfig } from 'homebridge';
import type { ExposureMode, ManualActivityConfig, NormalizedPlatformConfig } from './types.js';
import { DEFAULT_PLATFORM_NAME } from '../settings.js';
import { KEY_POWER_ON } from '../sofabaton/protocol.js';

const EXPOSURE_MODES = new Set<ExposureMode>(['tv', 'switches', 'both']);

export class ConfigValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export function normalizeConfig(config: PlatformConfig): NormalizedPlatformConfig {
  const name = nonEmptyString(config.name, 'name') ?? DEFAULT_PLATFORM_NAME;
  const hubIp = optionalHubIp(config.hubIp);
  const hubId = nonEmptyString(config.hubId, 'hubId') ?? sanitizeId(hubIp ?? name);
  const exposureMode = exposure(config.exposureMode);
  const manualActivities = normalizeActivities(config.manualActivities);

  return {
    name,
    hubIp,
    hubId,
    discovery: optionalBoolean(config.discovery, true),
    localListenPort: boundedInteger(config.localListenPort, 8200, 1, 65535, 'localListenPort'),
    exposureMode,
    enableAllOff: optionalBoolean(config.enableAllOff, false),
    allOffActivityId: optionalInteger(config.allOffActivityId, 1, 255, 'allOffActivityId'),
    pollIntervalSeconds: boundedInteger(config.pollIntervalSeconds, 60, 10, 3600, 'pollIntervalSeconds'),
    commandTimeoutSeconds: boundedInteger(config.commandTimeoutSeconds, 8, 1, 120, 'commandTimeoutSeconds'),
    retryIntervalSeconds: boundedInteger(config.retryIntervalSeconds, 30, 5, 3600, 'retryIntervalSeconds'),
    debugProtocol: optionalBoolean(config.debugProtocol, false),
    assumeX1S: optionalBoolean(config.assumeX1S, false),
    manualActivities,
  };
}

function normalizeActivities(value: unknown): readonly ManualActivityConfig[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ConfigValidationError('manualActivities must be an array.');
  }

  const ids = new Set<number>();
  const activities: ManualActivityConfig[] = [];

  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      throw new ConfigValidationError(`manualActivities[${index}] must be an object.`);
    }
    if (isEmptyActivity(raw)) {
      continue;
    }

    const id = requiredInteger(raw.id, 1, 255, `manualActivities[${index}].id`);
    if (ids.has(id)) {
      throw new ConfigValidationError(`manualActivities contains duplicate activity id ${id}.`);
    }
    ids.add(id);
    activities.push({
      id,
      name: requiredString(raw.name, `manualActivities[${index}].name`),
      keyCode: normalizeActivityKeyCode(raw.keyCode, `manualActivities[${index}].keyCode`),
    });
  }

  return activities;
}

function normalizeActivityKeyCode(value: unknown, path: string): number {
  const keyCode = optionalInteger(value, 0, 255, path);
  return keyCode === undefined || keyCode === 0 ? KEY_POWER_ON : keyCode;
}

function exposure(value: unknown): ExposureMode {
  if (value === undefined) {
    return 'switches';
  }
  if (typeof value !== 'string' || !EXPOSURE_MODES.has(value as ExposureMode)) {
    throw new ConfigValidationError('exposureMode must be one of tv, switches, or both.');
  }
  return value as ExposureMode;
}

function nonEmptyString(value: unknown, path: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredString(value, path);
}

function optionalHubIp(value: unknown): string | undefined {
  const hubIp = optionalString(value, 'hubIp');
  if (hubIp === undefined) {
    return undefined;
  }
  return isIP(hubIp) === 4 ? hubIp : undefined;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  return requiredString(value, path);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ConfigValidationError(`${path} must be a non-empty string.`);
  }
  return value.trim();
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'boolean') {
    throw new ConfigValidationError('Boolean configuration fields must be true or false.');
  }
  return value;
}

function optionalInteger(value: unknown, min: number, max: number, path: string): number | undefined {
  if (isBlank(value)) {
    return undefined;
  }
  return requiredInteger(value, min, max, path);
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number, path: string): number {
  if (value === undefined) {
    return fallback;
  }
  return requiredInteger(value, min, max, path);
}

function requiredInteger(value: unknown, min: number, max: number, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ConfigValidationError(`${path} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function isEmptyActivity(value: Record<string, unknown>): boolean {
  return isBlank(value.id) && isBlank(value.name) && (isBlank(value.keyCode) || value.keyCode === 0);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'sofabaton-x1s';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
