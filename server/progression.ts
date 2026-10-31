import type { NeighbourhoodServerSession } from './session.js';

// Fixed steps: no wall-time catch-up and no overlapping clock/inference cycles.
// The session persists the allowance and pause state alongside each world update.
export class ServerProgression {
  private pending: Promise<void> | null = null;
  private stopped = false;
  constructor(private readonly session: NeighbourhoodServerSession) {}
  pulse(): Promise<void> {
    if (this.stopped || this.session.paused) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = (async () => {
      await this.session.tick(.25);
      await this.session.decide();
    })().catch(error => { this.stopped = true; throw error; }).finally(() => { this.pending = null; });
    return this.pending;
  }
  async stop(): Promise<void> { this.stopped = true; await this.pending; }
}
