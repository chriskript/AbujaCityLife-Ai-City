import { mkdir } from 'node:fs/promises';
import { runNeighbourhoodDemo } from '../shared/neighbourhood/scenario.js';
import { saveNeighbourhood } from '../server/persistence/neighbourhood-store.js';

const world = await runNeighbourhoodDemo();
const state = world.snapshot;
console.log('MOCK NEIGHBOURHOOD — scripted fixture decisions; no Meta requests or inference charges.');
for (const event of state.events.filter(event => ['intention-selected', 'action-proposed', 'action-validated', 'transport-proposed', 'transport-accepted', 'transport-collected', 'transport-delivered', 'buy', 'delivery-observed'].includes(event.type))) {
  console.log(JSON.stringify({ time: event.time, actor: event.actor, type: event.type, subject: event.subject, detail: event.detail, ...event.data }));
}
console.log(JSON.stringify({ resources: state.resources, inhabitants: Object.values(state.npcs).map(npc => ({ name: npc.name, goal: npc.intention?.goalId, goods: npc.inventory.goods, rewards: npc.inventory.rewards, memories: npc.memories.length })), tasks: Object.values(state.tasks).map(task => ({ id: task.id, status: task.status, quantity: task.quantity })) }, null, 2));
if (process.argv.includes('--checkpoint')) {
  await mkdir('runtime', { recursive: true });
  const path = `runtime/neighbourhood-demo-${Date.now()}.json`;
  await saveNeighbourhood(path, world); console.log(`Local checkpoint: ${path}`);
}
