import { readFile, mkdir, open, unlink } from 'node:fs/promises';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';
import { saveNeighbourhood } from '../server/persistence/neighbourhood-store.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { prototypePopulation, townResidents } from '../shared/neighbourhood/population.js';

// An isolated recovery file, never the running backend checkpoint or Meta ledger.
const checkpoint = 'runtime/town-headless.json';
const seconds = Number(process.argv.find(arg => arg.startsWith('--seconds='))?.slice(10) ?? 240);
const population=Number(process.argv.find(arg=>arg.startsWith('--population='))?.slice(13) ?? prototypePopulation);
if (population!==8 && population!==16) throw new Error('Use --population=8 or --population=16');
if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) throw new Error('Use --seconds=1..3600');
let world: Neighbourhood;
await mkdir('runtime',{recursive:true});
const lock = await open(checkpoint+'.lock','wx',0o600);
try {
  try {
    const saved=await readFile(checkpoint,'utf8'); world=Neighbourhood.restore(saved);
    if (!world.hasTownEconomy || townResidents(population).some(npc=>!world.hasResident(npc.id))) {
      try { const backup=await open(checkpoint+'.pre-7b-backup','wx',0o600);try { await backup.writeFile(saved);await backup.sync(); }finally {await backup.close();} }
      catch(error) {if((error as NodeJS.ErrnoException).code!=='EEXIST') throw error;}
      world.enableTown(townResidents(population));
    }
  }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; world = createTown('headless-town',population); }
  const runner = new HeadlessTownRunner(world);
  const result = await runner.advance(seconds);
  await saveNeighbourhood(checkpoint,world);
  const state = world.snapshot;
  console.log(JSON.stringify({ mode: 'offline-mock', ...result, time: state.time, residents: world.residentIds,
    interactions: Object.values(state.social.interactions), tasks: Object.values(state.tasks), resources: state.resources,
    economy:state.town && {produced:state.town.produced,consumed:state.town.consumed,remainingInputs:state.town.rawInputs,initialMoney:state.town.initialMoney},checkpoint }, null, 2));
} finally { await lock.close(); await unlink(checkpoint+'.lock'); }
