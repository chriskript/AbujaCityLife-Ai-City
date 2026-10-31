import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NeighbourhoodServerSession } from '../server/session.js';
import { ServerProgression } from '../server/progression.js';
import { assertSnapshot } from '../shared/neighbourhood/snapshot.js';
import type { WorldState } from '../shared/neighbourhood/types.js';

// Fresh, bounded, offline rehearsal. Never opens operating saves, credentials or a provider ledger.
// The same quarter-second server driver runs without an HTTP observer, accelerated in wall time.
const directory = join('output', 'rehearsal', randomUUID());
await mkdir(directory, { recursive: true });
const checkpoint = join(directory, 'session.json');
let session = await NeighbourhoodServerSession.open({ checkpoint });
let clock = new ServerProgression(session);
const seen = new Set<string>(), eventCounts: Record<string, number> = {};
const actors = new Set<string>(), eaters = new Set<string>(), workers = new Set<string>();
let rejected = 0, reads = 0, readFailure: unknown, reading: Promise<void> | null = null;
const samples: number[] = [], recoveries: object[] = [];
const started = performance.now();
const record = () => {
  for (const event of session.frame.events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id); eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
    if (event.type === 'action-validated') {
      if (event.data.accepted && event.actor) actors.add(event.actor);
      else rejected++;
    }
    if (event.type === 'food-consumed' && event.actor) eaters.add(event.actor);
    if (event.type === 'paid-work-completed' && event.actor) workers.add(event.actor);
  }
};
async function durable() {
  const saved = JSON.parse(await readFile(checkpoint, 'utf8'));
  const state: WorldState = JSON.parse(saved.world); assertSnapshot(state);
  return { saved, state };
}
function gameplay(state: WorldState) {
  const { triggers: _restoreTriggers, ...retained } = state; return retained;
}
async function restart() {
  await clock.stop();
  const worldId = session.frame.snapshot.worldId;
  await session.command({ id: `pause-${session.frame.snapshot.time}`, worldId, type: 'pause', paused: true });
  const lease = await session.controlPhone({ worldId, actorId: 'amina', operation: 'acquire' });
  assert(lease);
  const before = await durable();
  await session.close();
  session = await NeighbourhoodServerSession.open({ checkpoint }); clock = new ServerProgression(session);
  const after = await durable();
  assert.deepEqual(gameplay(after.state), gameplay(before.state));
  for (const key of ['sessionId', 'requests', 'routineRequests', 'progression', 'receipts', 'history', 'metrics', 'plan']) {
    assert.deepEqual(after.saved[key], before.saved[key], `Recovery changed ${key}`);
  }
  assert.equal(session.phone('amina').control, null);
  await assert.rejects(session.controlPhone({ worldId, actorId: 'amina', operation: 'renew', leaseId: lease.leaseId }), /expired/);
  const time = session.frame.snapshot.time; await clock.pulse(); assert.equal(session.frame.snapshot.time, time);
  recoveries.push({ time, activeTravel: Object.values(after.state.npcs).filter(n => n.activity.kind === 'travel').length,
    activeWork: Object.values(after.state.npcs).filter(n => n.activity.kind === 'work').length,
    deliveries: Object.values(after.state.tasks).filter(t => t.status === 'delivered').length,
    routineRequests: after.saved.routineRequests, leaseCleared: true, gameplayPreserved: true });
  await session.command({ id: `resume-${time}`, worldId, type: 'pause', paused: false });
}
// Normal observers read committed frames, not the private checkpoint. Reading the checkpoint
// continuously can hold a Windows replacement lock; that stress case must fail closed.
const reader = setInterval(() => {
  if (reading || readFailure) return;
  reading = Promise.resolve().then(() => {
    const value = session.frame; assert.equal(value.version, 2);
    assert.equal(value.snapshot.mapId, 'town-v1'); reads++;
  }).catch(error => { readFailure = error; }).finally(() => { reading = null; });
}, 20);
let nextReport = 60, nextRestart = 600;
console.log(`Offline server rehearsal: ${directory}`);
try {
  for (let pulse = 0; !session.paused && pulse < 3601; pulse++) {
    if (readFailure) throw readFailure;
    const start = performance.now(); await clock.pulse(); samples.push(performance.now() - start); record();
    const time = session.frame.snapshot.time;
    if (time >= nextReport) {
      await durable(); console.log(JSON.stringify({ time, decisions: session.frame.decisionBudget.used, checkpointBytes: (await stat(checkpoint)).size }));
      nextReport += 60;
    }
    if (time >= nextRestart && nextRestart < 1800) { await restart(); nextRestart += 600; }
  }
  const final = await durable(), worldId = final.state.id;
  assert.equal(final.state.time, 1800); assert.equal(final.saved.progression.used, 1800); assert.equal(session.paused, true);
  assert.equal(final.saved.requests, 0); assert.equal(final.saved.metrics.length, 0);
  assert.equal(actors.size, 16); assert.equal(eaters.size, 16); assert.equal(rejected, 0);
  assert((eventCounts['transport-paid'] ?? 0) > 0); assert((eventCounts['communication-sent'] ?? 0) > 0);
  const sequence = session.frame.sequence; await clock.pulse(); assert.equal(session.frame.sequence, sequence);
  await clock.stop(); await session.close();
  session = await NeighbourhoodServerSession.open({ checkpoint }); clock = new ServerProgression(session);
  assert.equal(session.frame.progression!.used, 1800); assert.equal(session.paused, true);
  await assert.rejects(session.command({ id: 'exhausted-resume', worldId, type: 'pause', paused: false }), /allowance exhausted/);
  // Verify reset keeps spent limits, then retain a separate ended-town artifact for inspection.
  await writeFile(join(directory, 'completed-world.json'), JSON.stringify(final.state));
  await session.command({ id: 'exhausted-reset', worldId, type: 'reset', experiment: 'cooperate' });
  assert.equal(session.frame.progression!.used, 1800); assert.equal(session.paused, true);
  assert.equal(session.frame.decisionBudget.used, final.saved.routineRequests);
  clearInterval(reader); if (reading) await reading; if (readFailure) throw readFailure;
  assert.equal((await readdir(directory)).filter(name => name.endsWith('.pending')).length, 0);
  samples.sort((a, b) => a - b);
  const report = { status: 'passed', mode: 'offline-mock', directory, simulatedSeconds: final.state.time,
    wallMs: Math.round(performance.now() - started), pulses: samples.length, concurrentReads: reads, recoveries,
    actors: actors.size, eaters: eaters.size, workers: workers.size, rejected,
    decisions: final.saved.routineRequests, events: eventCounts,
    suppliesProduced: final.state.town!.produced, mealsConsumed: final.state.town!.consumed,
    completedCheckpointBytes: Buffer.byteLength(JSON.stringify(final.saved)),
    pulseMeanMs: Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2)),
    pulseP95Ms: Number(samples[Math.floor(samples.length * .95)]!.toFixed(2)),
    exhaustionPreservedOnRestartAndReset: true, pendingFiles: 0 };
  await writeFile(join(directory, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  clearInterval(reader); if (reading) await reading;
  await clock.stop().catch(() => {}); await session.close();
}
