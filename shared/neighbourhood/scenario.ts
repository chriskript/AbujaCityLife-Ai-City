import { Neighbourhood } from './world.js';
import { DecisionScheduler } from './scheduler.js';
import { NeighbourhoodMockProvider, type MockChoices } from './mock-provider.js';

export async function runNeighbourhoodDemo(choices: MockChoices = { trader: 'cooperate', driver: 'accept' }): Promise<Neighbourhood> {
  const world = new Neighbourhood('neighbourhood-demo');
  const scheduler = new DecisionScheduler(world, new NeighbourhoodMockProvider(choices));
  for (let step = 0; step < 960; step++) {
    await scheduler.pump(); world.advance(0.25);
    const state = world.snapshot;
    if (Object.values(state.tasks).some(task => task.status === 'delivered') && state.npcs.amina.knowledge.tasks['task-1'] === 'delivered' && state.npcs.zainab.inventory.goods === 1) return world;
    if (choices.driver === 'decline' && Object.values(state.tasks).some(task => task.status === 'declined')) return world;
    if (choices.trader === 'self-collect' && state.events.some(event => event.type === 'stock-stall')) return world;
    if (choices.trader === 'reduce-sales' && !state.resources.salesOpen) return world;
    if (choices.trader === 'wait' && state.npcs.amina.activity.kind === 'wait') return world;
  }
  throw new Error('Mock neighbourhood scenario exceeded its bounded duration');
}
