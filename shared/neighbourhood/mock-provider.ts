import type { NpcDecisionProvider, NpcDecisionRequest, NpcInferenceResult, Action } from './types.js';

export interface MockChoices {
  trader: 'cooperate' | 'self-collect' | 'wait' | 'reduce-sales'; driver: 'accept' | 'decline';
  social?: 'engage' | 'ignore'; encounterResponse?: 'accept' | 'decline' | 'defer' | 'clarify' | 'ignore';
}

// Deterministic policies for repeatable tests, not language understanding or AI reasoning.
export class NeighbourhoodMockProvider implements NpcDecisionProvider {
  constructor(private readonly choices: MockChoices = { trader: 'cooperate', driver: 'accept' }) {}
  async decide(request: NpcDecisionRequest): Promise<NpcInferenceResult> {
    const { actor, tasks, resources, nearbyPeople, encounters, encounterOpportunities } = request.observation;
    let action: Action = { type: 'wait', seconds: 120 };
    let goalId = actor.goals[0]!.id;
    const incoming = encounters.find(item => item.recipient === actor.id && item.status === 'pending');
    const committed = tasks.some(task => task.recipient === actor.id && ['accepted','collected'].includes(task.status));
    if (incoming && this.choices.encounterResponse !== 'ignore') {
      const response = this.choices.encounterResponse ?? (committed || actor.needs.food > 0.5 ? 'defer' : this.choices.driver === 'decline' && actor.capabilities.includes('fulfil-transport') ? 'decline' : 'accept');
      action = { type: 'respond-encounter', interactionId: incoming.id, response,
        message: response === 'accept' ? 'I can discuss this opportunity.' : response === 'defer' ? 'I have another priority to address first.' : response === 'clarify' ? 'What help are you looking for?' : 'I am not available to discuss this.' };
    } else if (encounters.some(item => item.initiator === actor.id && item.status === 'pending')) {
      action = { type: 'wait', seconds: 20 };
    } else if (actor.capabilities.includes('fulfil-transport')) {
      const proposed = tasks.find(task => task.status === 'proposed');
      const active = tasks.find(task => task.status === 'accepted' || task.status === 'collected');
      if (proposed) action = { type: 'respond-transport', taskId: proposed.id, accept: this.choices.driver === 'accept' && !committed && actor.needs.food <= 0.5 && actor.needs.income > 0.2 };
      else if (active) action = { type: 'fulfil-transport', taskId: active.id };
      else if (actor.mobility !== 'taxi') {
        const person = nearbyPeople.find(person => encounterOpportunities.includes(person.id) && !person.known);
        if (person && actor.node === 'market' && this.choices.social !== 'ignore' && actor.needs.income > 0.5) action = { type: 'encounter', recipient: person.id, purpose: 'ask', message: 'I am looking for local transport work. Are there opportunities here?' };
        else action = actor.node !== 'market' && actor.knowledge.places.includes('market') ? { type: 'travel', destination: 'market' } : { type: 'work', seconds: 120 };
      }
      if (this.choices.driver === 'decline' && actor.goals.some(goal => goal.id === 'rest')) goalId = 'rest';
    } else if (actor.capabilities.includes('propose-transport')) {
      const active = tasks.find(task => ['proposed', 'accepted', 'collected'].includes(task.status));
      const closed = tasks.find(task => task.status === 'declined' || task.status === 'expired');
      if (actor.intention === null) action = { type: 'work', seconds: 12 };
      else if (active) action = active.status === 'proposed' ? { type: 'wait', seconds: 20 } : actor.node !== 'market' ? { type: 'travel', destination: 'market' } : { type: 'work', seconds: 120 };
      else if ((resources.marketGoods ?? 0) >= 2 || tasks.some(task => task.status === 'delivered')) { if (actor.goals.some(goal => goal.id === 'serve')) goalId = 'serve'; action = { type: 'work', seconds: 120 }; }
      else if (this.choices.trader === 'wait' || closed) action = { type: 'wait', seconds: 120 };
      else if (this.choices.trader === 'reduce-sales') action = actor.node === 'market' ? { type: 'set-sales', open: false } : { type: 'travel', destination: 'market' };
      else if (this.choices.trader === 'self-collect') {
        if (actor.inventory.goods > 0) action = actor.node === 'market' ? { type: 'stock-stall', quantity: actor.inventory.goods } : { type: 'travel', destination: 'market' };
        else action = actor.node === 'centre' ? { type: 'collect-self', quantity: 2 } : { type: 'travel', destination: 'centre' };
      } else {
        const helper = nearbyPeople.filter(person => person.known && person.canTransport)
          .sort((a,b) => (actor.relationships[b.id]?.successfulJobs ?? 0) - (actor.relationships[a.id]?.successfulJobs ?? 0))[0];
        const stranger = nearbyPeople.find(person => !person.known && encounterOpportunities.includes(person.id));
        if (helper) action = { type: 'propose-transport', recipient: helper.id, quantity: 2 };
        else if (stranger && this.choices.social !== 'ignore' && actor.needs.stock > 0.5) action = { type: 'encounter', recipient: stranger.id, purpose: 'request-help', message: 'I need help bringing supplies to the market. Would you discuss a transport job?' };
        else action = { type: 'travel', destination: 'stand' };
      }
    } else if (actor.needs.food > 0.5) {
      action = actor.node !== 'market' ? { type: 'travel', destination: 'market' } :
        nearbyPeople.some(person => person.known && person.occupation === 'Market trader') && (resources.marketGoods ?? 0) > 0 && resources.salesOpen ? { type: 'buy', quantity: 1 } : { type: 'wait', seconds: 15 };
    } else { if (actor.goals.some(goal => goal.id === 'errands')) goalId = 'errands'; action = { type: 'work', seconds: 120 }; }
    return { mode: 'mock', model: 'neighbourhood-fixture-v1', decision: { goalId, reason: 'MOCK: deterministic fixture choice from personal goals and scoped observations.', action } };
  }
}
