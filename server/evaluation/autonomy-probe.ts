import { Neighbourhood } from '../../shared/neighbourhood/world.js';
import type { Action, NpcId } from '../../shared/neighbourhood/types.js';
import type { NeighbourhoodFrame } from '../../shared/neighbourhood/presentation.js';
import { NeighbourhoodServerSession } from '../session.js';
import { maximumGenerationUsd } from '../inference/neighbourhood-provider.js';
import { open } from 'node:fs/promises';

export const autonomyProbeMaximumUsd = Math.ceil(2 * maximumGenerationUsd * 1e6) / 1e6;
// Deterministic SETUP, not model reasoning: learn supplies via a visit; co-locate at market.
// All movement uses the existing validator/executor. Stock, needs and relationships are not patched.
export function prepareAutonomyFixture(): Neighbourhood {
  const world = new Neighbourhood('autonomy-probe-fixture-v1');
  const move = (id: NpcId, destination: string, seconds: number) => {
    const request = world.requestInteractionDecision(id)!;
    const action: Action = { type: 'travel', destination };
    const outcome = world.applyDecision(request.id, { goalId: world.snapshot.npcs[id].goals[0]!.id, reason: 'MOCK fixture setup only: validated relocation and observation.', action }, { mode: 'mock', model: 'fixture-setup' });
    if (!outcome.accepted) throw new Error('Fixture relocation failed'); world.advance(seconds);
  };
  move('amina', 'centre', 10); move('amina', 'market', 10); move('musa', 'market', 6);
  return world;
}
export interface ProbeStep { actorId: 'amina' | 'musa'; before: NeighbourhoodFrame; after: NeighbourhoodFrame }
export type ProbeStage = 'amina-started' | 'amina-complete' | 'musa-started' | 'complete';
// Internal evaluation coordinator, never an HTTP endpoint. A durable stage claim must
// succeed BEFORE dispatch. A crashed/started stage must not be replayed automatically.
export class ConditionalAutonomyProbe {
  private used = false;
  constructor(private readonly session: NeighbourhoodServerSession,
    private readonly persistStage: (stage: ProbeStage, steps: ProbeStep[]) => Promise<void>) {}
  async run(): Promise<{ steps: ProbeStep[]; musaInvoked: boolean; maximumCostUsd: number }> {
    if (this.used) throw new Error('Probe already started; no retry allowed'); this.used = true;
    if (this.session.frame.paused) throw new Error('Evaluation clock must be stationary but session unpaused');
    const steps: ProbeStep[] = [];
    const first = this.session.frame;
    await this.persistStage('amina-started', steps);
    await this.session.decide('amina', true);
    steps.push({ actorId: 'amina', before: first, after: this.session.frame });
    await this.persistStage('amina-complete', steps);
    const proposalEvent = this.session.frame.events.find(event => !first.events.some(old => old.id === event.id) && event.type === 'transport-proposed' && event.actor === 'amina');
    const task = proposalEvent ? this.session.frame.snapshot.tasks.find(task => task.id === proposalEvent.subject && task.requester === 'amina' && task.recipient === 'musa' && task.status === 'proposed') : null;
    if (task) {
      const before = this.session.frame;
      await this.persistStage('musa-started', steps);
      await this.session.decide('musa', true);
      steps.push({ actorId: 'musa', before, after: this.session.frame });
    }
    await this.persistStage('complete', steps);
    return { steps, musaInvoked: !!task, maximumCostUsd: autonomyProbeMaximumUsd };
  }
}

export async function runRecordedAutonomyProbe(session: NeighbourhoodServerSession, path: string) {
  // Exclusive creation is the durable one-shot guard. Never automatically delete or resume it.
  const file = await open(path, 'wx', 0o600);
  try {
    const probe = new ConditionalAutonomyProbe(session, async (stage, steps) => {
      await file.writeFile(JSON.stringify({ version: 1, worldId: session.frame.snapshot.worldId, stage, steps }) + '\n');
      await file.sync();
    });
    return await probe.run();
  } finally { await file.close(); }
}
