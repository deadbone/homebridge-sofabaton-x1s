import type { Logging } from 'homebridge';

export class PluginLogger {
  public constructor(
    private readonly log: Logging,
    private readonly debugEnabled: boolean,
  ) {}

  public info(message: string, ...parameters: unknown[]): void {
    this.log.info(message, ...parameters);
  }

  public warn(message: string, ...parameters: unknown[]): void {
    this.log.warn(message, ...parameters);
  }

  public error(message: string, ...parameters: unknown[]): void {
    this.log.error(message, ...parameters);
  }

  public debug(message: string, ...parameters: unknown[]): void {
    if (this.debugEnabled) {
      this.log.debug(message, ...parameters);
    }
  }
}
