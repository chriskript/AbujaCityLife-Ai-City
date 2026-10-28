import type { NpcDecisionProvider, NpcDecisionRequest, NpcInferenceResult, Action } from './types.js';

export interface MockChoices { trader: 'cooperate' | 'self-collect' | 'wait' | 'reduce-sales'; driver: 'accept' | 'decline' }

// Deterministic policies for repeatable tests, not language understanding or AI reasoning.
export class NeighbourhoodMockProvider implements NpcDecisionProvider {
  constructor(private readonly choices: MockChoices = { trader: 'cooperate', driver: 'accept' }) {}
  async decide(request: NpcDecisionRequest): Promise<NpcInferenceResult> {
    const { actor, tasks, resources, nearbyPeople } = request.observation;
    let action: Action = { type: 'wait', seconds: 120 };
    let goalId = actor.goals[0]!.id;
    if (actor.id === 'musa') {
      const proposed = tasks.find(task => task.status === 'proposed');
      const active = tasks.find(task => task.status === 'accepted' || task.status === 'collected');
      if (proposed) action = { type: 'respond-transport', taskId: proposed.id, accept: this.choices.driver === 'accept' };
      else if (active) action = { type: 'fulfil-transport', taskId: active.id };
      if (this.choices.driver === 'decline') goalId = 'rest';
    } else if (actor.id === 'amina') {
      const active = tasks.find(task => ['proposed', 'accepted', 'collected'].includes(task.status));
      const closed = tasks.find(task => task.status === 'declined' || task.status === 'expired');
      if (actor.intention === null) action = { type: 'work', seconds: 12 };
      else if (active) action = active.status === 'proposed' ? { type: 'wait', seconds: 20 } : actor.node !== 'market' ? { type: 'travel', destination: 'market' } : { type: 'work', seconds: 120 };
      else if ((resources.marketGoods ?? 0) >= 2 || tasks.some(task => task.status === 'delivered')) { goalId = 'serve'; action = { type: 'work', seconds: 120 }; }
      else if (this.choices.trader === 'wait' || closed) action = { type: 'wait', seconds: 120 };
      else if (this.choices.trader === 'reduce-sales') action = actor.node === 'market' ? { type: 'set-sales', open: false } : { type: 'travel', destination: 'market' };
      else if (this.choices.trader === 'self-collect') {
        if (actor.inventory.goods > 0) action = actor.node === 'market' ? { type: 'stock-stall', quantity: actor.inventory.goods } : { type: 'travel', destination: 'market' };
        else action = actor.node === 'centre' ? { type: 'collect-self', quantity: 2 } : { type: 'travel', destination: 'centre' };
      } else if (nearbyPeople.some(person => person.id === 'musa')) action = { type: 'propose-transport', recipient: 'musa', quantity: 2 };
      else action = { type: 'travel', destination: 'stand' };
    } else if (actor.needs.food > 0.5) {
      action = actor.node !== 'market' ? { type: 'travel', destination: 'market' } :
        nearbyPeople.some(person => person.id === 'amina') && (resources.marketGoods ?? 0) > 0 && resources.salesOpen ? { type: 'buy', quantity: 1 } : { type: 'wait', seconds: 15 };
    } else { goalId = 'errands'; action = { type: 'work', seconds: 120 }; }
    return { mode: 'mock', model: 'neighbourhood-fixture-v1', decision: { goalId, reason: 'MOCK: deterministic fixture choice from personal goals and scoped observations.', action } };
  }
}
