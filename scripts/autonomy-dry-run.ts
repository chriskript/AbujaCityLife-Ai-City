import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NeighbourhoodServerSession } from '../server/session.js';
import { MockNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import { runRecordedAutonomyProbe, prepareAutonomyFixture } from '../server/evaluation/autonomy-probe.js';

// Mock-only rehearsal. No credentials, Meta provider, ledger initialization or network.
const path = await mkdtemp(join(tmpdir(), 'city-autonomy-rehearsal-'));
const fixture = prepareAutonomyFixture();
const policy = new MockNeighbourhoodProvider(new NeighbourhoodMockProvider());
// This policy is explicitly mock. Other valid strategies are covered by offline tests.
const session = await NeighbourhoodServerSession.open({ checkpoint: join(path,'session.json'), initialWorld: fixture.serialize(), provider: policy });
try {
  const result = await runRecordedAutonomyProbe(session,join(path,'probe-stage.ndjson'));
  console.log(JSON.stringify({ mode: 'mock', maximumLiveReservationUsd: result.maximumCostUsd, musaInvoked: result.musaInvoked,
    steps: result.steps.map(step => ({ actor: step.actorId, events: step.after.events.filter(event => !step.before.events.some(old => old.id === event.id)) })) },null,2));
} finally { await session.close(); }
