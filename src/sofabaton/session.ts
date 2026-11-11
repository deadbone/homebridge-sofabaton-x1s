export type SessionState = 'DISCONNECTED' | 'CONNECTING' | 'HOMEBRIDGE_ACTIVE' | 'IOS_APP_ACTIVE' | 'RECONNECTING' | 'ERROR';

const transitions: Record<SessionState, readonly SessionState[]> = {
  DISCONNECTED: ['CONNECTING'],
  CONNECTING: ['HOMEBRIDGE_ACTIVE', 'ERROR', 'DISCONNECTED', 'RECONNECTING'],
  HOMEBRIDGE_ACTIVE: ['IOS_APP_ACTIVE', 'RECONNECTING', 'ERROR', 'DISCONNECTED'],
  IOS_APP_ACTIVE: ['RECONNECTING', 'ERROR', 'DISCONNECTED'],
  RECONNECTING: ['HOMEBRIDGE_ACTIVE', 'ERROR', 'DISCONNECTED'],
  ERROR: ['RECONNECTING', 'CONNECTING', 'DISCONNECTED'],
};

export class SessionManager {
  public state: SessionState = 'DISCONNECTED';
  public constructor(private readonly changed?: (state: SessionState) => void) {}
  public transition(next: SessionState): void {
    if (next === this.state) { return; }
    if (!transitions[this.state].includes(next)) {
      throw new Error(`Invalid X1S session transition: ${this.state} -> ${next}`);
    }
    this.state = next;
    this.changed?.(next);
  }
  public assertHomebridge(): void {
    if (this.state !== 'HOMEBRIDGE_ACTIVE') {
      throw new Error(`SofaBaton is unavailable to HomeKit (${this.state}); command not queued.`);
    }
  }
}
