import { Neighbourhood } from './world.js';
import { DecisionScheduler, type DecisionLimits } from './scheduler.js';
import { NeighbourhoodMockProvider, type MockChoices } from './mock-provider.js';

// Controlled offline progression over the SAME world and scheduler used by the browser.
// No timers, observers, credentials, live provider, automatic retries or endless loop.
export class HeadlessTownRunner {
  private paused = false;
  private running = false;
  readonly scheduler: DecisionScheduler;
  constructor(readonly world = new Neighbourhood(), choices?: MockChoices, limits?: DecisionLimits) {
    this.scheduler = new DecisionScheduler(world, new NeighbourhoodMockProvider(choices), limits);
  }
  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }
  async advance(seconds: number): Promise<{ advanced: number; decisions: number }> {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) throw new Error('Bounded runner accepts 0–3600 seconds per advance');
    if (this.running) throw new Error('Runner already advancing');
    this.running = true;
    const before = this.world.snapshot.time;
    try {
      for (let remaining = seconds; remaining > 0.000001 && !this.paused;) {
        await this.scheduler.pump();
        if (this.paused) break;
        const step = Math.min(0.25,remaining); this.world.advance(step); remaining -= step;
      }
      return { advanced: this.world.snapshot.time - before, decisions: this.scheduler.decisionCount };
    } finally { this.running = false; }
  }
}
