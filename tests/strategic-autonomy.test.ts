import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultLocalPolicy, durableJson, LocalMusePolicy } from '../server/controls/local-policy.js';
import { startLocalApplication } from '../server/local-application.js';
import type { NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { initialState } from '../shared/neighbourhood/initial-state.js';
import { assertSnapshot, migrateSnapshot } from '../shared/neighbourhood/snapshot.js';
import { projectNeighbourhood } from '../shared/neighbourhood/presentation.js';
import { prepareModelInput } from '../server/inference/model-context.js';
import { scopedInstructions } from '../server/inference/context-policy.js';
import { hasDueIntention, reasoningOpportunity, routineContinuationOnly, SelectiveNeighbourhoodProvider } from '../server/inference/selective-provider.js';
import { continuityDecision } from '../shared/neighbourhood/continuity-policy.js';
import { townDecision } from '../shared/neighbourhood/town-policy.js';
import { goalBounds, intentionBounds } from '../shared/neighbourhood/action-limits.js';
import { isNpcDecision } from '../shared/neighbourhood/decision-schema.js';
import type { Action, DecisionOutcome, NpcObservation, WorldState } from '../shared/neighbourhood/types.js';

const dirs: string[] = [], closers: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of closers.splice(0)) await close(); vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

function town(name: string): Neighbourhood {
  const world = createTown(name);
  world.enableSocialVisits();
  return world;
}
function act(world: Neighbourhood, id: string, action: Action, goalId?: string): DecisionOutcome {
  const r = world.requestInteractionDecision(id);
  expect(r, `expected a decision request for ${id}`).not.toBeNull();
  const active = goalId ?? r!.observation.actor.goals.find(g => g.status === 'active')!.id;
  return world.applyDecision(r!.id, { goalId: active, reason: 'Strategic autonomy fixture decision', action }, { mode: 'mock', model: 'strategic-fixture' });
}
function conserved(s: WorldState) {
  const jobs = Object.values(s.npcs).flatMap(npc => npc.activity.kind === 'work' && npc.activity.job ? [npc.activity.job] : []);
  expect(Object.values(s.npcs).reduce((sum, npc) => sum + npc.inventory.coins!, 0) + Object.values(s.town!.businesses).reduce((sum, b) => sum + b.coins, 0) + jobs.reduce((sum, j) => sum + j.wage, 0) + Object.values(s.tasks).reduce((sum, t) => sum + (t.escrow ?? 0), 0)).toBe(s.town!.initialMoney);
  expect(s.resources.supplierGoods + s.resources.marketGoods + Object.values(s.npcs).reduce((sum, npc) => sum + npc.inventory.goods, 0) + s.town!.consumed).toBe(s.initialGoods + s.town!.produced);
  expect(s.town!.rawInputs + s.town!.produced + jobs.reduce((sum, j) => sum + j.inputs, 0)).toBe(s.town!.initialInputs);
}
async function fixture(policyOverrides: Partial<typeof defaultLocalPolicy> = {}, decideImpl?: NeighbourhoodProvider['decide']) {
  const dir = await mkdtemp(join(tmpdir(), 'strategic-autonomy-')); dirs.push(dir);
  const policy = new LocalMusePolicy(join(dir, 'policy.json'), join(dir, 'usage.json'));
  await durableJson(policy.path, { ...defaultLocalPolicy, enabled: true, authorizedAt: new Date().toISOString(), ...policyOverrides }, true);
  await durableJson(policy.usagePath, { version: 1, reservations: [] }, true);
  const decide = vi.fn<NeighbourhoodProvider['decide']>(decideImpl ?? (async r => ({ mode: 'meta', model: 'synthetic-offline', decision: { goalId: r.observation.actor.goals.find(g => g.status === 'active')!.id, reason: 'Synthetic offline contract response', action: { type: 'wait', seconds: 10 } } })));
  const provider: NeighbourhoodProvider = { mode: 'live-meta', metrics: null, decide, converse: vi.fn(async () => ({ reply: 'Synthetic offline reply', uncertain: true, evidenceIds: [], claims: [], proposedDecision: null })) };
  const options = { checkpoint: join(dir, 'session.json'), policy, provider, accessToken: 'synthetic-browser-access-token-long-enough', port: 0, tick: false };
  return { dir, policy, provider, decide, options };
}
async function start(f: Awaited<ReturnType<typeof fixture>>) { const run = await startLocalApplication(f.options); closers.push(run.close); return run; }
function clone(o: NpcObservation): NpcObservation { return structuredClone(o); }

describe('resident-authored goals', () => {
  it('lets all sixteen residents adopt a personal goal with provenance', () => {
    const world = town('goals-adopt-all');
    expect(world.residentIds).toHaveLength(16);
    for (const id of world.residentIds) {
      const outcome = act(world, id, { type: 'adopt-goal', description: `Open a small side trade in ${id}`, motivation: 'Independence beyond daily errands' });
      expect(outcome.reason).toBe('accepted');
      const npc = world.snapshot.npcs[id]!;
      const goal = npc.goals.find(g => g.origin === 'resident')!;
      expect(goal).toMatchObject({ description: `Open a small side trade in ${id}`, motivation: 'Independence beyond daily errands', status: 'active', origin: 'resident' });
      expect(goal.id).toMatch(/^goal-\d+$/);
      expect(goal.createdAt).toBe(world.snapshot.time);
      expect(new Set(npc.goals.filter(g => g.status === 'active').map(g => g.priority)).size).toBe(npc.goals.filter(g => g.status === 'active').length);
      expect(world.decisionTriggers(id)).toContain('goal-changed');
      const event = world.snapshot.events.find(e => e.type === 'goal-adopted' && e.actor === id)!;
      expect(event).toBeDefined();
      expect(npc.memories.some(m => m.eventId === event.id && m.kind === 'observed')).toBe(true);
    }
    assertSnapshot(world.snapshot);
  });

  it('rejects duplicates, over-capacity adoption, and malformed shapes', () => {
    const world = town('goals-adopt-limits');
    expect(act(world, 'amina', { type: 'adopt-goal', description: 'Learn advanced tailoring', motivation: 'A marketable skill' }).reason).toBe('accepted');
    expect(act(world, 'amina', { type: 'adopt-goal', description: 'learn ADVANCED tailoring', motivation: 'Restated ambition' }).reason).toBe('duplicate-goal');
    for (let i = 0; i < 9; i++) expect(act(world, 'amina', { type: 'adopt-goal', description: `Side project ${i}`, motivation: 'Keeping busy' }).reason).toBe('accepted');
    expect(world.snapshot.npcs.amina.goals).toHaveLength(goalBounds.records);
    expect(act(world, 'amina', { type: 'adopt-goal', description: 'One ambition too many', motivation: 'Overflow' }).reason).toBe('goal-capacity');
    const shape = (action: unknown) => isNpcDecision({ goalId: 'restock', reason: 'Shape probe', action });
    expect(shape({ type: 'adopt-goal', description: 'x'.repeat(241), motivation: 'ok' })).toBe(false);
    expect(shape({ type: 'adopt-goal', description: 'ok', motivation: '' })).toBe(false);
    expect(shape({ type: 'adopt-goal', description: 'ok', motivation: 'ok', extra: 1 })).toBe(false);
    expect(shape({ type: 'reprioritize-goal', goalId: 'restock', priority: 0 })).toBe(false);
    expect(shape({ type: 'reprioritize-goal', goalId: 'restock', priority: 13 })).toBe(false);
    expect(shape({ type: 'schedule-reconsideration', note: 'later', inSeconds: 119 })).toBe(false);
    expect(shape({ type: 'schedule-reconsideration', note: 'later', inSeconds: 604801 })).toBe(false);
    assertSnapshot(world.snapshot);
  });

  it('revises resident goals while seed descriptions stay immutable', () => {
    const world = town('goals-revise');
    expect(act(world, 'grace', { type: 'adopt-goal', description: 'Grow a herb garden', motivation: 'Fresh food at home' }).reason).toBe('accepted');
    const adopted = world.snapshot.npcs.grace!.goals.find(g => g.origin === 'resident')!;
    expect(act(world, 'grace', { type: 'revise-goal', goalId: adopted.id, description: 'Grow herbs and peppers', motivation: null }).reason).toBe('accepted');
    expect(act(world, 'grace', { type: 'revise-goal', goalId: adopted.id, description: null, motivation: 'Fresh food and small sales' }).reason).toBe('accepted');
    const revised = world.snapshot.npcs.grace!.goals.find(g => g.id === adopted.id)!;
    expect(revised).toMatchObject({ description: 'Grow herbs and peppers', motivation: 'Fresh food and small sales' });
    expect(act(world, 'grace', { type: 'revise-goal', goalId: adopted.id, description: null, motivation: null }).reason).toBe('empty-revision');
    expect(act(world, 'grace', { type: 'revise-goal', goalId: 'livelihood', description: 'Rewritten seed', motivation: null }).reason).toBe('seed-goal-immutable');
    expect(act(world, 'grace', { type: 'revise-goal', goalId: 'livelihood', description: null, motivation: 'Personal take on the starting ambition' }).reason).toBe('accepted');
    expect(act(world, 'grace', { type: 'revise-goal', goalId: 'no-such-goal', description: 'x', motivation: null }).reason).toBe('unknown-goal-record');
    expect(act(world, 'grace', { type: 'set-goal-status', goalId: adopted.id, status: 'abandoned' }).reason).toBe('accepted');
    expect(act(world, 'grace', { type: 'revise-goal', goalId: adopted.id, description: 'After the end', motivation: null }).reason).toBe('terminal-goal');
    assertSnapshot(world.snapshot);
  });

  it('reprioritizes with unique ranks and swaps occupied positions', () => {
    const world = town('goals-priority');
    const before = world.snapshot.npcs.musa.goals.filter(g => g.status === 'active');
    expect(act(world, 'musa', { type: 'reprioritize-goal', goalId: before[0]!.id, priority: before[0]!.priority }).reason).toBe('redundant-transition');
    expect(act(world, 'musa', { type: 'reprioritize-goal', goalId: before[0]!.id, priority: before[1]!.priority }).reason).toBe('accepted');
    const swapped = world.snapshot.npcs.musa.goals;
    expect(swapped.find(g => g.id === before[0]!.id)!.priority).toBe(before[1]!.priority);
    expect(swapped.find(g => g.id === before[1]!.id)!.priority).toBe(before[0]!.priority);
    expect(new Set(swapped.filter(g => g.status === 'active').map(g => g.priority)).size).toBe(swapped.filter(g => g.status === 'active').length);
    expect(world.snapshot.events.find(e => e.type === 'goal-reprioritized')!.data).toMatchObject({ swappedWith: before[1]!.id });
    expect(act(world, 'musa', { type: 'reprioritize-goal', goalId: before[0]!.id, priority: 5 }).reason).toBe('accepted');
    expect(world.snapshot.npcs.musa.goals.find(g => g.id === before[0]!.id)!.priority).toBe(5);
    expect(act(world, 'musa', { type: 'set-goal-status', goalId: before[1]!.id, status: 'suspended' }).reason).toBe('accepted');
    expect(act(world, 'musa', { type: 'reprioritize-goal', goalId: before[1]!.id, priority: 6 }).reason).toBe('goal-not-active');
    expect(act(world, 'musa', { type: 'set-goal-status', goalId: before[1]!.id, status: 'abandoned' }).reason).toBe('accepted');
    expect(act(world, 'musa', { type: 'reprioritize-goal', goalId: before[1]!.id, priority: 6 }).reason).toBe('terminal-goal');
    for (let i = 0; i < 10; i++) expect(act(world, 'amina', { type: 'adopt-goal', description: `Full roster ${i}`, motivation: 'No free rank' }).reason).toBe('accepted');
    const full = world.snapshot.npcs.amina.goals.filter(g => g.status === 'active');
    expect(full).toHaveLength(12);
    expect(new Set(full.map(g => g.priority)).size).toBe(12);
    expect(act(world, 'amina', { type: 'reprioritize-goal', goalId: full[0]!.id, priority: full[11]!.priority }).reason).toBe('accepted');
    const reswapped = world.snapshot.npcs.amina.goals;
    expect(reswapped.find(g => g.id === full[0]!.id)!.priority).toBe(full[11]!.priority);
    expect(reswapped.find(g => g.id === full[11]!.id)!.priority).toBe(full[0]!.priority);
    assertSnapshot(world.snapshot);
  });

  it('evicts oldest terminal resident history at goal capacity while seeds stay put', () => {
    const world = town('goals-evict');
    for (let i = 0; i < 10; i++) expect(act(world, 'amina', { type: 'adopt-goal', description: `Side project ${i}`, motivation: 'Keeping busy' }).reason).toBe('accepted');
    expect(world.snapshot.npcs.amina.goals).toHaveLength(goalBounds.records);
    expect(act(world, 'amina', { type: 'set-goal-status', goalId: world.snapshot.npcs.amina.goals.find(g => g.description === 'Side project 0')!.id, status: 'abandoned' }).reason).toBe('accepted');
    world.advance(60);
    expect(act(world, 'amina', { type: 'set-goal-status', goalId: world.snapshot.npcs.amina.goals.find(g => g.description === 'Side project 1')!.id, status: 'achieved' }).reason).toBe('accepted');
    expect(act(world, 'amina', { type: 'adopt-goal', description: 'Fresh start', motivation: 'Room from history' }).reason).toBe('accepted');
    const after = world.snapshot.npcs.amina.goals;
    expect(after).toHaveLength(goalBounds.records);
    expect(after.some(g => g.description === 'Side project 0')).toBe(false);
    expect(after.some(g => g.description === 'Side project 1')).toBe(true);
    expect(after.some(g => g.description === 'Fresh start')).toBe(true);
    expect(after.filter(g => g.origin === 'seed')).toHaveLength(2);
    const seed = after.find(g => g.origin === 'seed')!;
    expect(act(world, 'amina', { type: 'set-goal-status', goalId: seed.id, status: 'abandoned' }).reason).toBe('accepted');
    for (const g of world.snapshot.npcs.amina.goals.filter(g => g.origin === 'resident' && g.status !== 'active')) expect(act(world, 'amina', { type: 'adopt-goal', description: `Drain ${g.id}`, motivation: 'Evicting resident history' }).reason).toBe('accepted');
    const drained = world.snapshot.npcs.amina.goals;
    expect(drained.some(g => g.id === seed.id && g.status === 'abandoned')).toBe(true);
    expect(drained.filter(g => g.origin === 'resident' && g.status !== 'active')).toHaveLength(0);
    expect(act(world, 'amina', { type: 'adopt-goal', description: 'One past the seeds', motivation: 'Overflow' }).reason).toBe('goal-capacity');
    assertSnapshot(world.snapshot);
  });

  it('transitions statuses lawfully and always keeps one active goal', () => {
    const world = town('goals-status');
    const ids = world.snapshot.npcs.zainab.goals.map(g => g.id);
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[0]!, status: 'suspended' }).reason).toBe('accepted');
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[0]!, status: 'suspended' }).reason).toBe('redundant-transition');
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[0]!, status: 'active' }).reason).toBe('accepted');
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[0]!, status: 'achieved' }).reason).toBe('accepted');
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[0]!, status: 'active' }).reason).toBe('invalid-goal-transition');
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[1]!, status: 'abandoned' }).reason).toBe('last-active-goal');
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[1]!, status: 'suspended' }).reason).toBe('last-active-goal');
    expect(act(world, 'zainab', { type: 'adopt-goal', description: 'A fresh direction', motivation: 'Room to finish the old one' }).reason).toBe('accepted');
    expect(act(world, 'zainab', { type: 'set-goal-status', goalId: ids[1]!, status: 'achieved' }).reason).toBe('accepted');
    const npc = world.snapshot.npcs.zainab;
    expect(npc.goals.filter(g => g.status === 'active')).toHaveLength(1);
    expect(npc.goals).toHaveLength(3);
    assertSnapshot(world.snapshot);
  });

  it('clears intentions that cite retired goals and rejects inactive citations', () => {
    const world = town('goals-intention');
    expect(act(world, 'fatima', { type: 'wait', seconds: 10 }, 'livelihood').reason).toBe('accepted');
    expect(world.snapshot.npcs.fatima!.intention?.goalId).toBe('livelihood');
    expect(act(world, 'fatima', { type: 'set-goal-status', goalId: 'livelihood', status: 'abandoned' }, 'livelihood').reason).toBe('accepted');
    expect(world.snapshot.npcs.fatima!.intention).toBeNull();
    assertSnapshot(world.snapshot);
    expect(act(world, 'fatima', { type: 'adopt-goal', description: 'Fresh start', motivation: 'Room to retire the old one' }, 'personal').reason).toBe('accepted');
    expect(act(world, 'fatima', { type: 'set-goal-status', goalId: 'personal', status: 'abandoned' }, 'personal').reason).toBe('accepted');
    expect(world.snapshot.npcs.fatima!.intention).toBeNull();
    assertSnapshot(world.snapshot);
    expect(act(world, 'fatima', { type: 'wait', seconds: 10 }, 'livelihood').reason).toBe('inactive-goal');
    expect(act(world, 'fatima', { type: 'wait', seconds: 10 }, 'no-such-goal').reason).toBe('unknown-goal');
  });

  it('keeps deterministic providers citing active goals', () => {
    const world = town('goals-providers');
    expect(act(world, 'sadiq', { type: 'set-goal-status', goalId: world.snapshot.npcs.sadiq!.goals[0]!.id, status: 'abandoned' }).reason).toBe('accepted');
    const abandoned = world.snapshot.npcs.sadiq!.goals[0]!.id;
    for (const decide of [
      (r: Parameters<typeof townDecision>[0]) => townDecision(r, { trader: 'cooperate', driver: 'accept' }),
      (r: Parameters<typeof townDecision>[0]) => continuityDecision(r),
    ]) {
      const r = world.requestInteractionDecision('sadiq')!;
      const d = decide(r);
      expect(d.goalId).not.toBe(abandoned);
      expect(world.snapshot.npcs.sadiq!.goals.find(g => g.id === d.goalId)!.status).toBe('active');
      expect(world.applyDecision(r.id, { goalId: d.goalId, reason: 'Provider citation probe', action: { type: 'wait', seconds: 5 } }, { mode: 'mock', model: 'probe' }).reason).toBe('accepted');
      world.advance(6);
    }
  });

  it('routes accepted deliveries under an active goal', async () => {
    const world = town('goals-selective');
    expect(act(world, 'musa', { type: 'set-goal-status', goalId: world.snapshot.npcs.musa.goals[0]!.id, status: 'suspended' }).reason).toBe('accepted');
    const o = clone(world.observe('musa'));
    o.tasks.push({ id: 'task-1', requester: 'amina', recipient: 'musa', quantity: 1, pickup: 'centre', destination: 'market', status: 'accepted', expiresAt: 99999 });
    const muse = { mode: 'live-meta', metrics: null, decide: vi.fn(), converse: vi.fn() } as unknown as NeighbourhoodProvider;
    const provider = new SelectiveNeighbourhoodProvider(world.residentIds, muse);
    const result = await provider.decide({ id: 'req-1', worldId: world.snapshot.id, actorId: 'musa', actorRevision: 0, worldRevision: 0, observation: o, triggers: ['activity-completed'] });
    expect(result.mode).toBe('mock');
    const decision = result.decision as { goalId: string };
    expect(world.snapshot.npcs.musa.goals.find(g => g.id === decision.goalId)!.status).toBe('active');
  });
});

describe('scheduled reconsideration', () => {
  it('schedules, delivers, and addresses a future intention for every resident', () => {
    const world = town('intentions-all');
    for (const id of world.residentIds) {
      expect(act(world, id, { type: 'schedule-reconsideration', note: `Revisit plans for ${id}`, inSeconds: 120 }).reason).toBe('accepted');
      const npc = world.snapshot.npcs[id]!;
      expect(npc.intentions).toHaveLength(1);
      expect(npc.intentions[0]).toMatchObject({ note: `Revisit plans for ${id}`, status: 'pending' });
      expect(npc.intentions[0]!.id).toMatch(/^intent-\d+$/);
    }
    world.advance(60); world.advance(60);
    for (const id of world.residentIds) {
      expect(world.decisionTriggers(id)).toContain('scheduled-intention-due');
      const r = world.requestDecision(id)!;
      expect(r.observation.actor.intentions.some(i => i.status === 'delivered')).toBe(true);
      expect(world.snapshot.npcs[id]!.intentions[0]!.status).toBe('delivered');
      expect(world.applyDecision(r.id, { goalId: r.observation.actor.goals.find(g => g.status === 'active')!.id, reason: 'Answering the scheduled reminder', action: { type: 'wait', seconds: 5 } }, { mode: 'meta', model: 'synthetic' }).reason).toBe('accepted');
      expect(world.snapshot.npcs[id]!.intentions[0]!.status).toBe('addressed');
    }
    assertSnapshot(world.snapshot);
  });

  it('caps, deduplicates, and cancels scheduled intentions', () => {
    const world = town('intentions-limits');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Check the stall', inSeconds: 300 }).reason).toBe('accepted');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'check THE STALL', inSeconds: 400 }).reason).toBe('duplicate-intention');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Second reminder', inSeconds: 300 }).reason).toBe('accepted');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Third reminder', inSeconds: 300 }).reason).toBe('accepted');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Fourth reminder', inSeconds: 300 }).reason).toBe('intention-capacity');
    const first = world.snapshot.npcs.amina.intentions[0]!.id;
    expect(act(world, 'amina', { type: 'cancel-reconsideration', intentionId: first }).reason).toBe('accepted');
    expect(world.snapshot.npcs.amina.intentions.find(i => i.id === first)!.status).toBe('cancelled');
    expect(act(world, 'amina', { type: 'cancel-reconsideration', intentionId: first }).reason).toBe('intention-not-pending');
    expect(act(world, 'amina', { type: 'cancel-reconsideration', intentionId: 'intent-999999' }).reason).toBe('unknown-intention');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Fourth reminder', inSeconds: 300 }).reason).toBe('accepted');
    assertSnapshot(world.snapshot);
  });

  it('expires overdue intentions with a memory and evicts oldest terminal records', () => {
    const world = town('intentions-expiry');
    expect(act(world, 'zainab', { type: 'schedule-reconsideration', note: 'Overdue reminder', inSeconds: 120 }).reason).toBe('accepted');
    for (let t = 0; t < intentionBounds.expirySeconds + 180; t += 60) world.advance(60);
    const npc = world.snapshot.npcs.zainab;
    expect(npc.intentions[0]!.status).toBe('expired');
    expect(npc.memories.some(m => m.kind === 'observed' && m.detail === 'Overdue reminder')).toBe(true);
    expect(act(world, 'zainab', { type: 'wait', seconds: 5 }).reason).toBe('accepted');
    world.advance(6);
    expect(world.decisionTriggers('zainab')).not.toContain('scheduled-intention-due');
    for (let i = 0; i < 7; i++) {
      expect(act(world, 'zainab', { type: 'schedule-reconsideration', note: `Cycle ${i}`, inSeconds: 5000 }).reason).toBe('accepted');
      const latest = world.snapshot.npcs.zainab.intentions.find(i => i.status === 'pending')!;
      expect(act(world, 'zainab', { type: 'cancel-reconsideration', intentionId: latest.id }).reason).toBe('accepted');
    }
    expect(world.snapshot.npcs.zainab.intentions).toHaveLength(intentionBounds.records);
    expect(act(world, 'zainab', { type: 'schedule-reconsideration', note: 'Overflow probe', inSeconds: 5000 }).reason).toBe('accepted');
    const records = world.snapshot.npcs.zainab.intentions;
    expect(records).toHaveLength(intentionBounds.records);
    expect(records.some(i => i.note === 'Overdue reminder')).toBe(false);
    expect(records.some(i => i.note === 'Overflow probe' && i.status === 'pending')).toBe(true);
    assertSnapshot(world.snapshot);
  }, 180000);

  it('fires decisions on due intentions, holds them for continuity, and reverts on abandon', () => {
    const world = town('intentions-delivery');
    expect(act(world, 'grace', { type: 'schedule-reconsideration', note: 'Due probe', inSeconds: 120 }).reason).toBe('accepted');
    world.advance(60); world.advance(60);
    const first = world.requestDecision('grace')!;
    expect(world.snapshot.npcs.grace!.intentions[0]!.status).toBe('delivered');
    world.abandonDecision(first.id);
    expect(world.snapshot.npcs.grace!.intentions[0]!.status).toBe('pending');
    const held = world.requestDecision('grace', { holdIntentions: true })!;
    expect(world.snapshot.npcs.grace!.intentions[0]!.status).toBe('pending');
    expect(world.applyDecision(held.id, { goalId: held.observation.actor.goals.find(g => g.status === 'active')!.id, reason: 'Held continuity decision', action: { type: 'wait', seconds: 5 } }, { mode: 'continuity', model: 'town-continuity-v1' }).reason).toBe('accepted');
    expect(world.snapshot.npcs.grace!.intentions[0]!.status).toBe('pending');
    world.advance(6);
    const live = world.requestDecision('grace')!;
    expect(world.snapshot.npcs.grace!.intentions[0]!.status).toBe('delivered');
    expect(world.applyDecision(live.id, { goalId: live.observation.actor.goals.find(g => g.status === 'active')!.id, reason: 'Live answer', action: { type: 'wait', seconds: 5 } }, { mode: 'meta', model: 'synthetic' }).reason).toBe('accepted');
    expect(world.snapshot.npcs.grace!.intentions[0]!.status).toBe('addressed');
    assertSnapshot(world.snapshot);
  });

  it('defers due intentions while the resident is unavailable and bounds scheduling loops', () => {
    const world = town('intentions-defer');
    expect(act(world, 'sadiq', { type: 'schedule-reconsideration', note: 'Deferred probe', inSeconds: 300 }).reason).toBe('accepted');
    world.advance(60); world.advance(60); world.advance(60); world.advance(20);
    for (let i = 0; i < 4; i++) expect(act(world, 'sadiq', { type: 'adopt-goal', description: 'Same duplicate ambition', motivation: 'Recovery probe' }).reason).toBe(i === 0 ? 'accepted' : 'duplicate-goal');
    world.advance(60); world.advance(40);
    expect(world.snapshot.time).toBe(300);
    expect(world.requestDecision('sadiq')).toBeNull();
    expect(world.snapshot.npcs.sadiq!.intentions[0]!.status).toBe('pending');
    world.advance(25);
    const r = world.requestDecision('sadiq')!;
    expect(world.snapshot.npcs.sadiq!.intentions[0]!.status).toBe('delivered');
    expect(world.applyDecision(r.id, { goalId: r.observation.actor.goals.find(g => g.status === 'active')!.id, reason: 'Answering after recovery', action: { type: 'wait', seconds: 5 } }, { mode: 'meta', model: 'synthetic' }).reason).toBe('accepted');
    const deliveredAt = world.snapshot.npcs.sadiq!.intentions[0]!.deliveredAt!;
    const createdAt = world.snapshot.npcs.sadiq!.intentions[0]!.createdAt;
    expect(deliveredAt - createdAt).toBeGreaterThanOrEqual(intentionBounds.leadMinimumSeconds);
    assertSnapshot(world.snapshot);
  });

  it('schedules up to seven simulated days ahead and enforces the new bound', () => {
    const world = town('intent-week');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Revisit the tailoring plan next week', inSeconds: 604800 }).reason).toBe('accepted');
    const intention = world.snapshot.npcs.amina.intentions.find(i => i.status === 'pending')!;
    expect(intention.dueAt - intention.createdAt).toBe(604800);
    const restored = Neighbourhood.restore(world.serialize());
    expect(restored.snapshot.npcs.amina.intentions.find(i => i.id === intention.id)).toMatchObject({ status: 'pending', dueAt: intention.dueAt });
    expect(isNpcDecision({ goalId: 'restock', reason: 'Bound probe', action: { type: 'schedule-reconsideration', note: 'Too far ahead', inSeconds: 604801 } })).toBe(false);
    assertSnapshot(restored.snapshot);
  });
});

describe('strategic routing', () => {
  it('treats due intentions as live reasoning opportunities with priority', () => {
    const world = town('router-due');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Routing probe', inSeconds: 120 }).reason).toBe('accepted');
    world.advance(60); world.advance(60);
    const fresh = world.observe('amina');
    expect(hasDueIntention(fresh)).toBe(true);
    expect(reasoningOpportunity(fresh, world.decisionTriggers('amina'))).toBe('scheduled-intention');
    const muse = { mode: 'live-meta', metrics: null, decide: vi.fn(), converse: vi.fn() } as unknown as NeighbourhoodProvider;
    const provider = new SelectiveNeighbourhoodProvider(world.residentIds, muse, undefined, true);
    expect(provider.sourceFor!(fresh, world.decisionTriggers('amina'))).toBe('live-meta');
    expect(provider.priorityFor!(fresh, world.decisionTriggers('amina'))).toBe(1);
    const frozen = world.requestDecision('amina')!.observation;
    expect(hasDueIntention(frozen)).toBe(true);
    expect(reasoningOpportunity(frozen, ['activity-completed'])).toBe('scheduled-intention');
    expect(provider.sourceFor!(frozen, ['activity-completed'])).toBe('live-meta');
    expect(routineContinuationOnly(fresh, ['activity-completed'])).toBe(false);
    expect(routineContinuationOnly(fresh, ['activity-completed', 'scheduled-intention-due'])).toBe(false);
  });

  it('keeps scheduled routing consistent beside accepted deliveries', () => {
    const world = town('router-consistent');
    expect(act(world, 'musa', { type: 'schedule-reconsideration', note: 'Consistency probe', inSeconds: 120 }).reason).toBe('accepted');
    world.advance(60); world.advance(60);
    const o = clone(world.observe('musa'));
    o.tasks.push({ id: 'task-1', requester: 'amina', recipient: 'musa', quantity: 1, pickup: 'centre', destination: 'market', status: 'accepted', expiresAt: 99999 });
    expect(reasoningOpportunity(o, ['activity-completed', 'scheduled-intention-due'])).toBe('scheduled-intention');
    const delivered = clone(o);
    delivered.actor.intentions[0]!.status = 'delivered';
    delivered.actor.intentions[0]!.deliveredAt = delivered.time;
    expect(reasoningOpportunity(delivered, ['activity-completed'])).toBe('scheduled-intention');
  });
});

describe('goal and intention persistence', () => {
  function toV4(state: WorldState): unknown {
    const v4 = structuredClone(state) as unknown as { version: number; npcs: Record<string, { goals: { id: string; description: string }[]; intentions?: unknown; capabilities: string[] }> };
    v4.version = 4;
    for (const npc of Object.values(v4.npcs)) {
      npc.goals = npc.goals.map(g => ({ id: g.id, description: g.description }));
      delete npc.intentions;
      npc.capabilities = npc.capabilities.filter(c => !['adopt-goal', 'revise-goal', 'reprioritize-goal', 'set-goal-status', 'schedule-reconsideration', 'cancel-reconsideration'].includes(c));
    }
    return v4;
  }

  it('migrates v4 town worlds to v5 with backfilled goals and capabilities', () => {
    const migrated = migrateSnapshot(toV4(town('mig-town').snapshot)) as WorldState;
    assertSnapshot(migrated);
    expect(migrated.version).toBe(5);
    for (const id of Object.keys(migrated.npcs)) {
      const npc = migrated.npcs[id]!;
      expect(npc.intentions).toEqual([]);
      for (const [index, goal] of npc.goals.entries()) {
        expect(goal).toMatchObject({ status: 'active', origin: 'seed', priority: index + 1, createdAt: 0, updatedAt: 0, motivation: 'Established starting ambition' });
      }
      for (const cap of ['adopt-goal', 'revise-goal', 'reprioritize-goal', 'set-goal-status', 'schedule-reconsideration', 'cancel-reconsideration']) expect(npc.capabilities).toContain(cap);
    }
  });

  it('migrates legacy worlds without granting town-only capabilities', () => {
    const migrated = migrateSnapshot(toV4(JSON.parse(JSON.stringify(initialState('mig-legacy'))) as WorldState)) as WorldState;
    assertSnapshot(migrated);
    expect(migrated.version).toBe(5);
    for (const npc of Object.values(migrated.npcs)) {
      expect(npc.intentions).toEqual([]);
      expect(npc.goals.every(g => g.status === 'active' && g.origin === 'seed')).toBe(true);
      expect(npc.capabilities).not.toContain('adopt-goal');
    }
  });

  it('retains adopted goals and scheduled intentions across restarts', async () => {
    let calls = 0;
    const f = await fixture({ maximumRequests: 50, maximumTokens: 1000000 }, async r => {
      calls++;
      const goalId = r.observation.actor.goals.find(g => g.status === 'active')!.id;
      if (calls === 1) return { mode: 'meta', model: 'synthetic', decision: { goalId, reason: 'Adopting a personal direction', action: { type: 'adopt-goal', description: 'Learn advanced tailoring', motivation: 'A marketable skill' } } };
      if (calls === 2) return { mode: 'meta', model: 'synthetic', decision: { goalId, reason: 'Setting a reminder', action: { type: 'schedule-reconsideration', note: 'Revisit the tailoring plan', inSeconds: 600 } } };
      return { mode: 'meta', model: 'synthetic', decision: { goalId, reason: 'Synthetic hold', action: { type: 'wait', seconds: 10 } } };
    });
    const run = await start(f);
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    for (let i = 0; i < 60 && calls < 2; i++) { now += 11000; await run.session.tick(21); await run.session.decide(); }
    expect(calls).toBeGreaterThanOrEqual(2);
    const before: WorldState = JSON.parse(JSON.parse(await readFile(f.options.checkpoint, 'utf8')).world);
    expect(Object.values(before.npcs).some(n => n.goals.some(g => g.origin === 'resident'))).toBe(true);
    expect(Object.values(before.npcs).some(n => n.intentions.length > 0)).toBe(true);
    await run.close();
    const next = await start({ ...f, options: { ...f.options, policy: new LocalMusePolicy(f.policy.path, f.policy.usagePath) } });
    const after: WorldState = JSON.parse(JSON.parse(await readFile(f.options.checkpoint, 'utf8')).world);
    expect(Object.values(after.npcs).some(n => n.goals.some(g => g.origin === 'resident' && g.description === 'Learn advanced tailoring'))).toBe(true);
    expect(Object.values(after.npcs).some(n => n.intentions.some(i => i.note === 'Revisit the tailoring plan' && i.status === 'pending'))).toBe(true);
  }, 120000);

  it('upgrades session checkpoints with a rollback copy', async () => {
    const f = await fixture({ maximumRequests: 50, maximumTokens: 1000000 });
    const run = await start(f);
    await run.session.tick(1); await run.session.decide();
    await run.close();
    const downgraded = JSON.parse(await readFile(f.options.checkpoint, 'utf8'));
    downgraded.world = JSON.stringify(toV4(JSON.parse(downgraded.world)));
    const { writeFile, access } = await import('node:fs/promises');
    await writeFile(f.options.checkpoint, JSON.stringify(downgraded));
    const next = await start({ ...f, options: { ...f.options, policy: new LocalMusePolicy(f.policy.path, f.policy.usagePath) } });
    await expect(access(f.options.checkpoint + '.pre-v5-backup')).resolves.toBeUndefined();
    const after: WorldState = JSON.parse(JSON.parse(await readFile(f.options.checkpoint, 'utf8')).world);
    expect(after.version).toBe(5);
    expect(Object.values(after.npcs).every(n => n.intentions !== undefined && n.goals.every(g => g.status !== undefined))).toBe(true);
    await next.session.tick(1); await next.session.decide();
  }, 120000);

  it('holds scheduled intentions across pause and suspension until Muse returns', async () => {
    let calls = 0;
    const notes = ['Reminder A', 'Reminder B'];
    const f = await fixture({ maximumRequests: 50, maximumTokens: 1000000, onExhausted: 'continuity' }, async r => {
      calls++;
      const goalId = r.observation.actor.goals.find(g => g.status === 'active')!.id;
      if (calls <= 2) return { mode: 'meta', model: 'synthetic', decision: { goalId, reason: 'Setting a reminder', action: { type: 'schedule-reconsideration', note: notes[calls - 1]!, inSeconds: calls === 1 ? 300 : 3600 } } };
      return { mode: 'meta', model: 'synthetic', decision: { goalId, reason: 'Synthetic hold', action: { type: 'wait', seconds: 10 } } };
    });
    const run = await start(f);
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    const readWorld = async (): Promise<WorldState> => JSON.parse(JSON.parse(await readFile(f.options.checkpoint, 'utf8')).world);
    for (let i = 0; i < 80; i++) {
      const scheduled = (await readWorld()).events.filter(e => e.type === 'intention-scheduled').length;
      if (scheduled >= 2) break;
      now += 11000; await run.session.tick(21); await run.session.decide();
    }
    const setup = await readWorld();
    expect(setup.events.filter(e => e.type === 'intention-scheduled')).toHaveLength(2);
    const dueB = setup.events.find(e => e.type === 'intention-scheduled' && e.detail === 'Reminder B')!.data.dueAt as number;
    await durableJson(f.policy.path, { ...await f.policy.read(), maximumRequests: calls });
    const liveBefore = f.decide.mock.calls.length;
    for (let i = 0; i < 90; i++) {
      now += 11000; await run.session.tick(60); await run.session.decide();
      if ((await readWorld()).time > dueB + 120) break;
    }
    expect(run.session.frame.continuityActive).toBe(true);
    expect(f.decide.mock.calls.length).toBe(liveBefore);
    const held = await readWorld();
    const intentionB = Object.values(held.npcs).flatMap(n => n.intentions).find(i => i.note === 'Reminder B')!;
    expect(intentionB.status).toBe('pending');
    await durableJson(f.policy.path, { ...await f.policy.read(), maximumRequests: 50, enabled: true, authorizedAt: new Date().toISOString() });
    for (let i = 0; i < 30 && f.decide.mock.calls.length === liveBefore; i++) { now += 11000; await run.session.tick(21); await run.session.decide(); }
    expect(f.decide.mock.calls.length).toBeGreaterThan(liveBefore);
    const resumed = await readWorld();
    expect(Object.values(resumed.npcs).flatMap(n => n.intentions).find(i => i.note === 'Reminder B')!.status).toBe('addressed');
    expect(run.session.frame.continuityActive).toBe(false);
  }, 180000);

  it('re-arms delivered intentions as pending across restart without replay', () => {
    const world = town('intent-restart');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Inflight restart probe', inSeconds: 120 }).reason).toBe('accepted');
    for (let i = 0; i < 3; i++) world.advance(60);
    const inflight = world.requestInteractionDecision('amina')!;
    const id = world.snapshot.npcs.amina.intentions.find(i => i.status === 'delivered')!.id;
    expect(inflight.observation.actor.intentions.find(i => i.id === id)!.status).toBe('delivered');
    const restored = Neighbourhood.restore(world.serialize());
    const rearmed = restored.snapshot.npcs.amina.intentions.find(i => i.id === id)!;
    expect(rearmed.status).toBe('pending');
    expect(rearmed.deliveredAt).toBeUndefined();
    const retry = restored.requestDecision('amina')!;
    expect(retry.id).not.toBe(inflight.id);
    const goalId = retry.observation.actor.goals.find(g => g.status === 'active')!.id;
    expect(restored.applyDecision(retry.id, { goalId, reason: 'Rearmed delivery', action: { type: 'wait', seconds: 10 } }, { mode: 'mock', model: 'strategic-fixture' }).accepted).toBe(true);
    expect(restored.snapshot.npcs.amina.intentions.find(i => i.id === id)!.status).toBe('addressed');
    expect(restored.applyDecision(retry.id, { goalId, reason: 'Replay attempt', action: { type: 'wait', seconds: 10 } }, { mode: 'mock', model: 'strategic-fixture' })).toMatchObject({ duplicate: true });
    expect(restored.snapshot.events.filter(e => e.type === 'intention-selected' && e.detail === 'Rearmed delivery')).toHaveLength(1);
    assertSnapshot(restored.snapshot);
  });

  it('freezes expiry while inference is unavailable and preserves validity across restarts', () => {
    const world = town('freeze-expiry');
    expect(act(world, 'amina', { type: 'schedule-reconsideration', note: 'Frozen probe', inSeconds: 300 }).reason).toBe('accepted');
    const dueAt = world.snapshot.npcs.amina.intentions.find(i => i.status === 'pending')!.dueAt;
    for (let i = 0; i < 6; i++) world.advance(60);
    for (let i = 0; i < 120; i++) world.advance(60, { freezeIntentionExpiry: true });
    const frozen = world.snapshot.npcs.amina.intentions.find(i => i.note === 'Frozen probe')!;
    expect(frozen.status).toBe('pending');
    expect(frozen.frozenSeconds).toBe(7200);
    expect(world.decisionTriggers('amina')).toContain('scheduled-intention-due');
    const t0 = world.snapshot.time;
    const restored = Neighbourhood.restore(world.serialize());
    expect(restored.snapshot.npcs.amina.intentions.find(i => i.note === 'Frozen probe')!.frozenSeconds).toBe(7200);
    for (let i = 0; i < 240; i++) restored.advance(60);
    expect(restored.snapshot.npcs.amina.intentions.find(i => i.note === 'Frozen probe')!.status).toBe('pending');
    for (let i = 0; i < 121; i++) restored.advance(60);
    expect(restored.snapshot.npcs.amina.intentions.find(i => i.note === 'Frozen probe')!.status).toBe('expired');
    expect(restored.snapshot.time).toBeGreaterThan(dueAt + 21600);
    expect(restored.snapshot.time - t0).toBe(60 * 361);
    assertSnapshot(restored.snapshot);
  }, 120000);

  it('freezes intention expiry on session ticks during continuity', async () => {
    let calls = 0;
    const f = await fixture({ maximumRequests: 50, maximumTokens: 1000000, onExhausted: 'continuity' }, async r => {
      calls++;
      const goalId = r.observation.actor.goals.find(g => g.status === 'active')!.id;
      if (calls === 1) return { mode: 'meta', model: 'synthetic', decision: { goalId, reason: 'Setting a reminder', action: { type: 'schedule-reconsideration', note: 'Continuity freeze probe', inSeconds: 120 } } };
      return { mode: 'meta', model: 'synthetic', decision: { goalId, reason: 'Synthetic hold', action: { type: 'wait', seconds: 10 } } };
    });
    const run = await start(f);
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    const readWorld = async (): Promise<WorldState> => JSON.parse(JSON.parse(await readFile(f.options.checkpoint, 'utf8')).world);
    for (let i = 0; i < 30; i++) {
      now += 11000; await run.session.tick(21); await run.session.decide();
      if ((await readWorld()).events.some(e => e.type === 'intention-scheduled')) break;
    }
    expect((await readWorld()).events.some(e => e.type === 'intention-scheduled')).toBe(true);
    await durableJson(f.policy.path, { ...await f.policy.read(), maximumRequests: calls });
    const liveBefore = f.decide.mock.calls.length;
    for (let i = 0; i < 4; i++) { now += 11000; await run.session.tick(60); await run.session.decide(); }
    expect(run.session.frame.continuityActive).toBe(true);
    expect(f.decide.mock.calls.length).toBe(liveBefore);
    const mark = await readWorld();
    const f0 = Object.values(mark.npcs).flatMap(n => n.intentions).find(i => i.note === 'Continuity freeze probe')!.frozenSeconds ?? 0;
    const t0 = mark.time;
    for (let i = 0; i < 2; i++) { now += 11000; await run.session.tick(60); await run.session.decide(); }
    expect(f.decide.mock.calls.length).toBe(liveBefore);
    const held = await readWorld();
    const intention = Object.values(held.npcs).flatMap(n => n.intentions).find(i => i.note === 'Continuity freeze probe')!;
    expect(intention.status).toBe('pending');
    expect(intention.frozenSeconds).toBe(f0 + 120);
    expect(held.time - t0).toBe(120);
  }, 120000);

  it('keeps the exact pre-migration bytes for the v5 rollback', async () => {
    const f = await fixture({ maximumRequests: 50, maximumTokens: 1000000 });
    const run = await start(f);
    await run.session.tick(1); await run.session.decide();
    await run.close();
    const downgraded = JSON.parse(await readFile(f.options.checkpoint, 'utf8'));
    downgraded.world = JSON.stringify(toV4(JSON.parse(downgraded.world)));
    const raw = JSON.stringify(downgraded) + '\n';
    await writeFile(f.options.checkpoint, raw);
    const next = await start({ ...f, options: { ...f.options, policy: new LocalMusePolicy(f.policy.path, f.policy.usagePath) } });
    expect(await readFile(f.options.checkpoint + '.pre-v5-backup', 'utf8')).toBe(raw);
    const after: WorldState = JSON.parse(JSON.parse(await readFile(f.options.checkpoint, 'utf8')).world);
    expect(after.version).toBe(5);
  }, 120000);

  it('leaves the economy untouched by inner-life transitions', () => {
    const world = town('goals-economy');
    const before = world.snapshot;
    for (const id of ['amina', 'musa', 'grace', 'sadiq']) {
      expect(act(world, id, { type: 'adopt-goal', description: `Economic neutrality probe for ${id}`, motivation: 'No resources involved' }).reason).toBe('accepted');
      const adopted = world.snapshot.npcs[id]!.goals.find(g => g.origin === 'resident')!;
      expect(act(world, id, { type: 'revise-goal', goalId: adopted.id, description: null, motivation: 'Still no resources involved' }).reason).toBe('accepted');
      expect(act(world, id, { type: 'reprioritize-goal', goalId: adopted.id, priority: 7 }).reason).toBe('accepted');
      expect(act(world, id, { type: 'set-goal-status', goalId: adopted.id, status: 'suspended' }).reason).toBe('accepted');
      expect(act(world, id, { type: 'set-goal-status', goalId: adopted.id, status: 'active' }).reason).toBe('accepted');
      expect(act(world, id, { type: 'schedule-reconsideration', note: `Neutral reminder for ${id}`, inSeconds: 600 }).reason).toBe('accepted');
      const intention = world.snapshot.npcs[id]!.intentions.find(i => i.status === 'pending')!;
      expect(act(world, id, { type: 'cancel-reconsideration', intentionId: intention.id }).reason).toBe('accepted');
    }
    const after = world.snapshot;
    expect(Object.keys(after.tasks)).toHaveLength(0);
    expect(after.town!.initialMoney).toBe(before.town!.initialMoney);
    expect(after.town!.initialInputs).toBe(before.town!.initialInputs);
    conserved(after);
    for (const id of world.residentIds) expect(after.npcs[id]!.inventory).toEqual(before.npcs[id]!.inventory);
    assertSnapshot(after);
  });
});

describe('strategic context and observability', () => {
  it('fits maximum goals and intentions within the model-input ceiling with bounded history', () => {
    const world = town('goals-context');
    for (let i = 0; i < 10; i++) expect(act(world, 'amina', { type: 'adopt-goal', description: `D${i}`.padEnd(goalBounds.description, '-x'), motivation: `M${i}`.padEnd(goalBounds.motivation, '-y') }).reason).toBe('accepted');
    const adopted = world.snapshot.npcs.amina.goals.filter(g => g.origin === 'resident');
    for (const goal of adopted.slice(0, 8)) expect(act(world, 'amina', { type: 'set-goal-status', goalId: goal.id, status: 'abandoned' }).reason).toBe('accepted');
    for (let i = 0; i < 3; i++) expect(act(world, 'amina', { type: 'schedule-reconsideration', note: `N${i}`.padEnd(intentionBounds.note, '-z'), inSeconds: 5000 }).reason).toBe('accepted');
    for (const item of world.snapshot.npcs.amina.intentions.filter(i => i.status === 'pending')) expect(act(world, 'amina', { type: 'cancel-reconsideration', intentionId: item.id }).reason).toBe('accepted');
    for (let i = 3; i < 6; i++) expect(act(world, 'amina', { type: 'schedule-reconsideration', note: `N${i}`.padEnd(intentionBounds.note, '-z'), inSeconds: 5000 }).reason).toBe('accepted');
    for (const note of ['N6', 'N7']) {
      const oldest = world.snapshot.npcs.amina.intentions.find(i => i.status === 'pending')!;
      expect(act(world, 'amina', { type: 'cancel-reconsideration', intentionId: oldest.id }).reason).toBe('accepted');
      expect(act(world, 'amina', { type: 'schedule-reconsideration', note: note.padEnd(intentionBounds.note, '-z'), inSeconds: 5000 }).reason).toBe('accepted');
    }
    const npc = world.snapshot.npcs.amina;
    expect(npc.goals.filter(g => g.status === 'active')).toHaveLength(4);
    expect(npc.goals.filter(g => g.status !== 'active')).toHaveLength(8);
    expect(npc.intentions.filter(i => i.status === 'pending')).toHaveLength(3);
    expect(npc.intentions.filter(i => i.status !== 'pending' && i.status !== 'delivered')).toHaveLength(5);
    const r = world.requestInteractionDecision('amina')!;
    const prepared = prepareModelInput(r, 'decision');
    expect(JSON.stringify(prepared.input).length).toBeLessThanOrEqual(24000);
    const actor = prepared.input.observation.actor as unknown as { goals: unknown[]; goalsOmitted: number; intentions: unknown[]; intentionsOmitted: number };
    expect(actor.goals).toHaveLength(8);
    expect(actor.goalsOmitted).toBe(4);
    expect(actor.intentions).toHaveLength(5);
    expect(actor.intentionsOmitted).toBe(3);
    expect(prepared.instructions).toContain('reconsideration');
  });

  it('projects goals and intentions for the Residents interface', () => {
    const world = town('goals-visible');
    expect(act(world, 'grace', { type: 'adopt-goal', description: 'Visible ambition', motivation: 'Interface probe' }).reason).toBe('accepted');
    expect(act(world, 'grace', { type: 'schedule-reconsideration', note: 'Visible reminder', inSeconds: 600 }).reason).toBe('accepted');
    const frame = projectNeighbourhood(world.snapshot);
    const actor = frame.snapshot.actors.find(a => a.id === 'grace')!;
    expect(actor.goals.some(g => g.description === 'Visible ambition' && g.status === 'active')).toBe(true);
    expect(actor.intentions).toHaveLength(1);
    expect(actor.intentions[0]).toMatchObject({ note: 'Visible reminder', status: 'pending' });
    const types = frame.events.map(e => e.type);
    expect(types).toContain('goal-adopted');
    expect(types).toContain('intention-scheduled');
  });

  it('guides Muse toward few durable ambitions over new adoption', () => {
    const world = town('goals-guidance');
    const r = world.requestInteractionDecision('amina')!;
    const text = scopedInstructions(r.observation, 'decision');
    expect(text).toContain('durable ambitions');
    expect(text).toContain('rather than adopting a new one for a passing want');
    expect(text).toContain('only active goals can be cited');
  });
});
