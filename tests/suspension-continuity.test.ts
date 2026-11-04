import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultLocalPolicy, durableJson, LocalMusePolicy } from '../server/controls/local-policy.js';
import { startLocalApplication } from '../server/local-application.js';
import type { NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { assertSnapshot } from '../shared/neighbourhood/snapshot.js';
import { CONTINUITY_ACTION_TYPES, continuityDecision, isStrandedResident } from '../shared/neighbourhood/continuity-policy.js';
import { MAX_CONSECUTIVE_SUPPRESSIONS, routineContinuationOnly } from '../server/inference/selective-provider.js';
import type { NpcDecisionRequest, NpcObservation, WorldState } from '../shared/neighbourhood/types.js';

const dirs: string[] = [], closers: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of closers.splice(0)) await close(); vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

interface UsageReservation { at: number; run: string; microUsd: number; tokens: number }
async function fixture(policyOverrides: Partial<typeof defaultLocalPolicy> = {}, reservations: UsageReservation[] = []) {
  const dir = await mkdtemp(join(tmpdir(), 'suspension-continuity-')); dirs.push(dir);
  const policy = new LocalMusePolicy(join(dir, 'policy.json'), join(dir, 'usage.json'));
  await durableJson(policy.path, { ...defaultLocalPolicy, enabled: true, authorizedAt: new Date().toISOString(), ...policyOverrides }, true);
  await durableJson(policy.usagePath, { version: 1, reservations }, true);
  const decide = vi.fn<NeighbourhoodProvider['decide']>(async r => ({ mode: 'meta', model: 'synthetic-offline', decision: { goalId: r.observation.actor.goals[0]!.id, reason: 'Synthetic offline contract response', action: { type: 'wait', seconds: 10 } } }));
  const provider: NeighbourhoodProvider = { mode: 'live-meta', metrics: null, decide, converse: vi.fn(async () => ({ reply: 'Synthetic offline reply', uncertain: true, evidenceIds: [], claims: [], proposedDecision: null })) };
  const options = { checkpoint: join(dir, 'session.json'), policy, provider, accessToken: 'synthetic-browser-access-token-long-enough', port: 0, tick: false };
  return { dir, policy, provider, decide, options };
}
async function start(f: Awaited<ReturnType<typeof fixture>>) { const run = await startLocalApplication(f.options); closers.push(run.close); return run; }
const spent = (at = Date.now()): UsageReservation => ({ at, run: 'prior-process', microUsd: 18704, tokens: 10048 });

describe('suspension on terminal Muse unavailability', () => {
  it('suspends and pauses on exhaustion, blocks resume, and resumes live after re-authorization', async () => {
    const f = await fixture({ maximumRequests: 1 }, [spent()]);
    const run = await start(f);
    expect(run.session.paused).toBe(false);
    await run.session.decide();
    expect(f.decide).not.toHaveBeenCalled();
    expect(run.session.paused).toBe(true);
    expect(run.session.frame.suspendedReason).toBe('Application allowance exhausted');
    expect(run.session.frame.continuityActive).toBe(false);
    expect((await f.policy.refresh()).requests).toBe(1);
    const saved = JSON.parse(await readFile(f.options.checkpoint, 'utf8'));
    expect(saved.suspendedReason).toBe('Application allowance exhausted');
    await expect(run.session.command({ id: 'resume-blocked', worldId: run.session.frame.snapshot.worldId, type: 'pause', paused: false })).rejects.toThrow('Muse suspended');
    await run.close();
    const next = await start({ ...f, options: { ...f.options, policy: new LocalMusePolicy(f.policy.path, f.policy.usagePath) } });
    expect(next.session.paused).toBe(true);
    expect(next.session.frame.suspendedReason).toBe('Application allowance exhausted');
    await durableJson(f.policy.path, { ...await f.policy.read(), maximumRequests: 5, enabled: true, authorizedAt: new Date().toISOString() });
    await next.session.command({ id: 'resume', worldId: next.session.frame.snapshot.worldId, type: 'pause', paused: false });
    expect(next.session.paused).toBe(false);
    expect(next.session.frame.suspendedReason).toBeNull();
    for (let i = 0; i < 10 && f.decide.mock.calls.length === 0; i++) { await next.session.tick(21); await next.session.decide(); }
    expect(f.decide.mock.calls.length).toBeGreaterThan(0);
    expect(next.session.frame.muse?.requests).toBe(f.decide.mock.calls.length + 1);
  }, 20000);

  it('does not suspend on transient rate waits and recovers without residue', async () => {
    const realNow = Date.now();
    const f = await fixture({ requestsPerMinute: 1, maximumRequests: 48 }, [spent(realNow)]);
    const run = await start(f);
    let now = realNow; vi.spyOn(Date, 'now').mockImplementation(() => now);
    expect((await f.policy.refresh()).status).toBe('Rate limit; waiting');
    await run.session.decide();
    expect(f.decide).not.toHaveBeenCalled();
    expect(run.session.paused).toBe(false);
    expect(run.session.frame.suspendedReason).toBeNull();
    now += 66000;
    for (let i = 0; i < 10 && f.decide.mock.calls.length === 0; i++) { await run.session.tick(21); await run.session.decide(); }
    expect(f.decide.mock.calls.length).toBeGreaterThan(0);
    expect(run.session.paused).toBe(false);
    expect(run.session.frame.suspendedReason).toBeNull();
  }, 20000);

  it('runs labelled continuity while exhausted and returns to live after re-authorization', async () => {
    const f = await fixture({ maximumRequests: 1, onExhausted: 'continuity' }, [spent()]);
    const run = await start(f);
    await run.session.decide();
    expect(f.decide).not.toHaveBeenCalled();
    expect(run.session.paused).toBe(false);
    expect(run.session.frame.suspendedReason).toBe('Application allowance exhausted');
    expect(run.session.frame.continuityActive).toBe(true);
    for (let i = 0; i < 6; i++) { await run.session.tick(21); await run.session.decide(); }
    expect(f.decide).not.toHaveBeenCalled();
    expect((await f.policy.refresh()).requests).toBe(1);
    expect(run.session.frame.snapshot.time).toBeGreaterThan(100);
    const saved = JSON.parse(await readFile(f.options.checkpoint, 'utf8'));
    const proposals = JSON.parse(saved.world).events.filter((e: { type: string }) => e.type === 'action-proposed');
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) expect(p.data.mode).toBe('continuity');
    expect(proposals[0].data.model).toBe('town-continuity-v1');
    await durableJson(f.policy.path, { ...await f.policy.read(), maximumRequests: 10, enabled: true, authorizedAt: new Date().toISOString() });
    for (let i = 0; i < 10 && f.decide.mock.calls.length === 0; i++) { await run.session.tick(21); await run.session.decide(); }
    expect(f.decide.mock.calls.length).toBeGreaterThan(0);
    expect(run.session.frame.continuityActive).toBe(false);
    expect(run.session.frame.suspendedReason).toBeNull();
  }, 20000);

  it('opens checkpoints written before suspension fields existed', async () => {
    const f = await fixture({ maximumRequests: 48, maximumTokens: 500000 });
    const run = await start(f);
    await run.session.tick(1); await run.session.decide();
    await run.close();
    const saved = JSON.parse(await readFile(f.options.checkpoint, 'utf8'));
    delete saved.suspendedReason; delete saved.continuityActive; delete saved.suppression;
    await writeFile(f.options.checkpoint, JSON.stringify(saved));
    const next = await start({ ...f, options: { ...f.options, policy: new LocalMusePolicy(f.policy.path, f.policy.usagePath) } });
    expect(next.session.frame.suspendedReason).toBeNull();
    expect(next.session.frame.continuityActive).toBe(false);
    await next.session.tick(1); await next.session.decide();
  }, 20000);
});

function town(name: string): Neighbourhood {
  const world = createTown(name);
  world.enableSocialVisits();
  return world;
}
function clone(o: NpcObservation): NpcObservation { return structuredClone(o); }
function decisionRequest(o: NpcObservation, triggers: string[]): NpcDecisionRequest {
  return { id: 'test-request', worldId: 'test-world', actorId: o.actor.id, actorRevision: o.actor.revision, worldRevision: 1, observation: o, triggers };
}

describe('continuity policy restrictions', () => {
  const forbidden = ['encounter', 'communicate', 'respond-communication', 'end-call', 'offer-contact', 'propose-transport', 'respond-transport', 'take-work', 'buy', 'order-external', 'fund-business', 'set-sales', 'collect-self', 'stock-stall', 'share', 'work', 'invite-social', 'respond-social', 'join-social', 'socialise', 'leave-social'];

  it('emits only allowlisted maintenance and commitment actions, labelled and accepted', () => {
    const world = town('continuity-allowlist');
    const seen = new Set<string>();
    for (const id of world.residentIds) {
      const r = world.requestDecision(id); if (!r) continue;
      const d = continuityDecision(r);
      expect(CONTINUITY_ACTION_TYPES).toContain(d.action.type);
      expect(forbidden).not.toContain(d.action.type);
      expect(d.reason.startsWith('CONTINUITY:')).toBe(true);
      expect(r.observation.actor.goals.some(g => g.id === d.goalId)).toBe(true);
      expect(world.applyDecision(r.id, d, { mode: 'continuity', model: 'town-continuity-v1' }).reason).toBe('accepted');
      seen.add(d.action.type);
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('classifies stranded residents narrowly', () => {
    const world = town('stranded-classify');
    const id = world.residentIds.find(i => { const n = world.snapshot.npcs[i]!; return ![n.home, n.routine?.workplace, n.routine?.leisure].includes('market'); })!;
    const base = clone(world.observe(id)); base.actor.node = 'market';
    expect(isStrandedResident(base, ['activity-completed'])).toBe(true);
    expect(isStrandedResident(base, ['activity-completed', 'personal-needs-changed'])).toBe(true);
    expect(isStrandedResident(base, ['activity-completed', 'encounter-noticed'])).toBe(false);
    const busy = clone(base);
    busy.tasks = [{ id: 'task-1', requester: 'amina', recipient: id, quantity: 1, pickup: 'centre', destination: 'market', status: 'proposed', expiresAt: 99999 }];
    expect(isStrandedResident(busy, ['activity-completed'])).toBe(false);
    const home = clone(base); home.actor.node = home.actor.home!;
    expect(isStrandedResident(home, ['activity-completed'])).toBe(false);
    const waiting = clone(base); waiting.actor.activity = { kind: 'wait', until: 999 };
    expect(isStrandedResident(waiting, ['activity-completed'])).toBe(false);
    const failed = clone(base); failed.decisionRecovery = { version: 1, action: '{}', reason: 'actor-busy', requestId: 'r', at: 0, repetitions: 1, blockedUntil: 0 };
    expect(isStrandedResident(failed, ['activity-completed'])).toBe(false);
  });

  it('honours accepted deliveries before maintenance', () => {
    const world = town('continuity-commitment');
    const o = clone(world.observe('musa'));
    o.tasks.push({ id: 'task-9', requester: 'amina', recipient: 'musa', quantity: 2, pickup: 'centre', destination: 'market', status: 'accepted', expiresAt: 99999 });
    if (!o.permittedActions.includes('fulfil-transport')) o.permittedActions.push('fulfil-transport');
    expect(continuityDecision(decisionRequest(o, ['activity-completed'])).action).toEqual({ type: 'fulfil-transport', taskId: 'task-9' });
  });

  it('rests the tired at valid places and feeds the hungry from owned food', () => {
    const world = town('continuity-maintenance');
    const tired = clone(world.observe('fatima'));
    tired.actor.needs.rest = 0.9; tired.actor.node = tired.actor.home!;
    expect(continuityDecision(decisionRequest(tired, ['activity-completed'])).action).toEqual({ type: 'rest', seconds: 60 });
    const exposed = clone(world.observe('fatima'));
    exposed.actor.needs.rest = 0.9; exposed.actor.node = 'market';
    expect(continuityDecision(decisionRequest(exposed, ['activity-completed', 'encounter-noticed'])).action.type).not.toBe('rest');
    const hungry = clone(world.observe('grace'));
    hungry.actor.needs.food = 0.9; hungry.actor.inventory.food = 2;
    expect(continuityDecision(decisionRequest(hungry, ['activity-completed'])).action).toEqual({ type: 'eat', quantity: 1 });
    const starving = clone(world.observe('grace'));
    starving.actor.needs.food = 0.9; starving.actor.inventory.food = 0;
    expect(continuityDecision(decisionRequest(starving, ['activity-completed'])).action.type).not.toBe('eat');
  });

  it('never initiates social, economic, or employment actions from pending states', () => {
    const world = town('continuity-restraint');
    for (const id of world.residentIds) {
      for (const triggers of [['activity-completed'], ['personal-needs-changed'], ['meal-completed'], ['activity-completed', 'personal-needs-changed']]) {
        expect(CONTINUITY_ACTION_TYPES).toContain(continuityDecision(decisionRequest(clone(world.observe(id)), triggers)).action.type);
      }
    }
    const busy = clone(world.observe('amina'));
    busy.communication!.threads = [{ initiator: 'musa', recipient: 'amina', status: 'pending' }] as unknown as NonNullable<NpcObservation['communication']>['threads'];
    busy.encounters = [{ initiator: 'musa', recipient: 'amina', status: 'pending' }] as unknown as NpcObservation['encounters'];
    busy.tasks = [{ id: 'task-1', requester: 'musa', recipient: 'amina', quantity: 1, pickup: 'centre', destination: 'market', status: 'proposed', expiresAt: 99999 }];
    busy.socialVisits!.invitations = [{ expiresAt: 99999, update: { status: 'pending' } }] as unknown as NonNullable<NpcObservation['socialVisits']>['invitations'];
    busy.nearbyPeople = [{ id: 'sadiq' }] as unknown as NpcObservation['nearbyPeople'];
    busy.encounterOpportunities = ['sadiq'];
    busy.resources.marketGoods = 0; busy.actor.needs.stock = 0.8;
    const action = continuityDecision(decisionRequest(busy, ['communication-received'])).action.type;
    expect(CONTINUITY_ACTION_TYPES).toContain(action);
    expect(forbidden).not.toContain(action);
  });
});

describe('conservative trigger suppression', () => {
  it('suppresses only quiescent routine completions', () => {
    const world = town('suppression-quiescent');
    const calm = clone(world.observe('amina'));
    calm.actor.needs = { food: 0.1, stock: 0.1, income: 0.1, rest: 0.1 };
    expect(routineContinuationOnly(calm, ['activity-completed'])).toBe(true);
    expect(routineContinuationOnly(calm, ['meal-completed'])).toBe(true);
    expect(routineContinuationOnly(calm, ['personal-needs-changed'])).toBe(true);
    expect(routineContinuationOnly(calm, [])).toBe(false);
    expect(routineContinuationOnly(calm, ['activity-completed', 'personal-needs-changed'])).toBe(true);
    expect(routineContinuationOnly(calm, ['activity-completed', 'encounter-noticed'])).toBe(false);
    expect(routineContinuationOnly(calm, ['activation'])).toBe(false);
    const thread = clone(calm);
    thread.communication!.threads = [{ initiator: 'amina', recipient: 'musa', status: 'queued' }] as unknown as NonNullable<NpcObservation['communication']>['threads'];
    expect(routineContinuationOnly(thread, ['activity-completed'])).toBe(false);
    const encounter = clone(calm);
    encounter.encounters = [{ initiator: 'musa', recipient: 'amina', status: 'pending' }] as unknown as NpcObservation['encounters'];
    expect(routineContinuationOnly(encounter, ['activity-completed'])).toBe(false);
    const task = clone(calm);
    task.tasks = [{ id: 'task-1', requester: 'amina', recipient: 'musa', quantity: 1, pickup: 'centre', destination: 'market', status: 'proposed', expiresAt: 99999 }];
    expect(routineContinuationOnly(task, ['activity-completed'])).toBe(false);
    const invitation = clone(calm);
    invitation.socialVisits!.invitations = [{ expiresAt: 99999, update: { status: 'accepted' } }] as unknown as NonNullable<NpcObservation['socialVisits']>['invitations'];
    expect(routineContinuationOnly(invitation, ['activity-completed'])).toBe(false);
    for (const needs of [{ food: 0.9 }, { rest: 0.9 }, { income: 0.9 }, { stock: 0.5 }]) {
      const urgent = clone(calm); urgent.actor.needs = { ...urgent.actor.needs, ...needs };
      expect(routineContinuationOnly(urgent, ['activity-completed'])).toBe(false);
    }
    const failed = clone(calm);
    failed.decisionRecovery = { version: 1, action: '{}', reason: 'actor-busy', requestId: 'r', at: 0, repetitions: 1, blockedUntil: 0 };
    expect(routineContinuationOnly(failed, ['activity-completed'])).toBe(false);
  });

  it('caps consecutive suppressions and keeps live decisions flowing', () => {
    expect(MAX_CONSECUTIVE_SUPPRESSIONS).toBe(2);
  });

  it('counts suppressions, preserves live decisions, and never suppresses meaningful triggers', async () => {
    const f = await fixture({ maximumRequests: 200, maximumTokens: 3000000, dailyUsd: 5, totalUsd: 10 });
    const run = await start(f);
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    for (let i = 0; i < 60; i++) { now += 11000; await run.session.tick(21); await run.session.decide(); }
    expect(f.decide.mock.calls.length).toBeGreaterThan(0);
    const suppressed = run.session.frame.muse?.suppressedDecisions ?? 0;
    expect(suppressed).toBeGreaterThan(0);
    const saved = JSON.parse(await readFile(f.options.checkpoint, 'utf8'));
    let total = 0;
    for (const counts of Object.values(saved.suppression ?? {}) as { total: number; consecutive: number }[]) {
      expect(counts.consecutive).toBeLessThanOrEqual(2);
      total += counts.total;
    }
    expect(total).toBe(suppressed);
    const routine = new Set(['activity-completed', 'action-completed', 'meal-completed', 'personal-needs-changed']);
    for (const e of JSON.parse(saved.world).events.filter((e: { type: string; detail: string }) => e.type === 'intention-selected' && e.detail.startsWith('CONTINUITY:'))) {
      const match = /\[(.*)\]/.exec(e.detail);
      expect(match).not.toBeNull();
      for (const t of match![1]!.split(',').map((s: string) => s.trim()).filter(Boolean)) expect(routine.has(t)).toBe(true);
    }
  }, 60000);
});

describe('continuity soak', () => {
  function conserved(s: WorldState) {
    const jobs = Object.values(s.npcs).flatMap(npc => npc.activity.kind === 'work' && npc.activity.job ? [npc.activity.job] : []);
    expect(Object.values(s.npcs).reduce((sum, npc) => sum + npc.inventory.coins!, 0) + Object.values(s.town!.businesses).reduce((sum, b) => sum + b.coins, 0) + jobs.reduce((sum, j) => sum + j.wage, 0) + Object.values(s.tasks).reduce((sum, t) => sum + (t.escrow ?? 0), 0)).toBe(s.town!.initialMoney);
    expect(s.resources.supplierGoods + s.resources.marketGoods + Object.values(s.npcs).reduce((sum, npc) => sum + npc.inventory.goods, 0) + s.town!.consumed).toBe(s.initialGoods + s.town!.produced);
    expect(s.town!.rawInputs + s.town!.produced + jobs.reduce((sum, j) => sum + j.inputs, 0)).toBe(s.town!.initialInputs);
  }
  function drive(id: string) {
    const world = town(id);
    const dwellers = (n: WorldState['npcs'][string]) => [n.home, n.routine?.workplace, n.routine?.leisure];
    const displaced = world.residentIds.filter(i => !dwellers(world.snapshot.npcs[i]!).includes('market')).slice(0, 2);
    expect(displaced.length).toBe(2);
    for (const rid of displaced) {
      for (let i = 0; i < 120 && world.snapshot.npcs[rid]!.node !== 'market'; i++) {
        if (world.snapshot.npcs[rid]!.activity.kind === 'idle') {
          const r = world.requestInteractionDecision(rid)!;
          const outcome = world.applyDecision(r.id, { goalId: r.observation.actor.goals[0]!.id, reason: 'Offline displacement fixture', action: { type: 'travel', destination: 'market' } }, { mode: 'mock', model: 'soak-fixture' });
          expect(outcome.reason).toBe('accepted');
        }
        world.advance(5);
      }
      expect(world.snapshot.npcs[rid]!.node).toBe('market');
    }
    const decided = new Set<string>(), travels: { actor: string; destination: string }[] = [];
    const streak: Record<string, number> = Object.fromEntries(world.residentIds.map(i => [i, 0]));
    let maxStreak = 0;
    for (let t = 0; t < 1800; t += 5) {
      world.advance(5);
      for (const rid of world.residentIds) {
        const r = world.requestDecision(rid); if (!r) continue;
        const d = continuityDecision(r);
        expect(CONTINUITY_ACTION_TYPES).toContain(d.action.type);
        if (d.action.type === 'travel') travels.push({ actor: rid, destination: d.action.destination });
        expect(world.applyDecision(r.id, d, { mode: 'continuity', model: 'town-continuity-v1' }).reason).toBe('accepted');
        decided.add(rid);
      }
      const s = world.snapshot;
      expect(Object.keys(s.tasks)).toHaveLength(0);
      expect(Object.keys(s.communication?.threads ?? {})).toHaveLength(0);
      expect(Object.keys(s.social.interactions)).toHaveLength(0);
      expect(Object.keys(s.socialVisits?.invitations ?? {})).toHaveLength(0);
      for (const rid of world.residentIds) {
        const npc = s.npcs[rid]!;
        if (npc.activity.kind === 'idle' && !dwellers(npc).includes(npc.node)) { streak[rid]!++; maxStreak = Math.max(maxStreak, streak[rid]!); }
        else streak[rid] = 0;
      }
      conserved(s);
    }
    return { world, decided, travels, displaced, maxStreak };
  }
  it('runs 1800 simulated seconds with conservation, settlement, and zero rejections', () => {
    const first = drive('continuity-soak');
    expect(first.decided).toEqual(new Set(first.world.residentIds));
    for (const rid of first.displaced) expect(first.travels.some(t => t.actor === rid)).toBe(true);
    const homes = Object.fromEntries(first.world.residentIds.map(id => [id, first.world.snapshot.npcs[id]!.home]));
    for (const t of first.travels) expect(t.destination).toBe(homes[t.actor]);
    expect(first.maxStreak * 5).toBeLessThan(300);
    const end = first.world.snapshot;
    for (const npc of Object.values(end.npcs)) expect(npc.memories.some(m => m.kind === 'commitment')).toBe(false);
    assertSnapshot(end);
    const revived = Neighbourhood.restore(first.world.serialize()).snapshot;
    expect({ npcs: revived.npcs, time: revived.time, resources: revived.resources, town: revived.town, tasks: revived.tasks, communication: revived.communication }).toEqual({ npcs: end.npcs, time: end.time, resources: end.resources, town: end.town, tasks: end.tasks, communication: end.communication });
    assertSnapshot(revived);
    expect(drive('continuity-soak').world.serialize()).toBe(first.world.serialize());
  }, 120000);
});
