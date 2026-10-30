import { readFile, mkdir, open, unlink } from 'node:fs/promises';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';
import { saveNeighbourhood } from '../server/persistence/neighbourhood-store.js';

// An isolated recovery file, never the running backend checkpoint or Meta ledger.
const checkpoint = 'runtime/town-headless.json';
const seconds = Number(process.argv.find(arg => arg.startsWith('--seconds='))?.slice(10) ?? 240);
if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) throw new Error('Use --seconds=1..3600');
let world: Neighbourhood;
await mkdir('runtime',{recursive:true});
const lock = await open(checkpoint+'.lock','wx',0o600);
try {
  try { world = Neighbourhood.restore(await readFile(checkpoint,'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; world = new Neighbourhood('headless-town'); }
  const runner = new HeadlessTownRunner(world);
  const result = await runner.advance(seconds);
  await saveNeighbourhood(checkpoint,world);
  const state = world.snapshot;
  console.log(JSON.stringify({ mode: 'offline-mock', ...result, time: state.time, residents: world.residentIds,
    interactions: Object.values(state.social.interactions), tasks: Object.values(state.tasks), resources: state.resources, checkpoint }, null, 2));
} finally { await lock.close(); await unlink(checkpoint+'.lock'); }
