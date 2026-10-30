import { edges } from '../world/neighbourhood.js';
import { pathToNode } from '../navigation/routes.js';
import { initialState, places } from './initial-state.js';
import { isNpcDecision } from './decision-schema.js';
import { npcIds, type Action, type DecisionOutcome, type MemoryKind, type NpcDecisionRequest, type NpcId, type NpcObservation, type TransportTask, type WorldEvent, type WorldState } from './types.js';
import { assertSnapshot } from './snapshot.js';

let worldSequence = 0;
const copy = <T>(value: T): T => structuredClone(value);

export class Neighbourhood {
  private state: WorldState;
  private readonly pending = new Map<string, NpcDecisionRequest>();
  private readonly processed = new Map<string, DecisionOutcome>();

  constructor(id = `local-neighbourhood-${++worldSequence}`) {
    if (!/^[a-zA-Z0-9:_-]{1,120}$/.test(id)) throw new Error('Invalid neighbourhood identifier');
    this.state = initialState(id);
    for (const actor of npcIds) {
      this.record('identity-established', actor, [actor], actor, `${this.state.npcs[actor].name}: ${this.state.npcs[actor].occupation}`, {}, 'fact');
      this.perceive(actor); this.trigger(actor, 'activation');
    }
  }

  get snapshot(): WorldState { return copy(this.state); }
  serialize(): string { return JSON.stringify(this.state); }
  static restore(serialized: string): Neighbourhood {
    const state: unknown = JSON.parse(serialized); assertSnapshot(state);
    const world = new Neighbourhood(state.id); world.state = copy(state);
    // No in-flight response survives restoration; new request IDs continue monotonically.
    for (const id of npcIds) if (['idle', 'wait'].includes(world.state.npcs[id].activity.kind)) world.trigger(id, 'restored');
    return world;
  }

  private trigger(actor: NpcId, reason: string): void {
    const triggers = this.state.triggers[actor] ?? [];
    if (!triggers.includes(reason)) triggers.push(reason);
    this.state.triggers[actor] = triggers.slice(-8);
  }

  private atNode(actor: NpcId): boolean { return this.state.npcs[actor].activity.kind !== 'travel'; }
  private nearby(a: NpcId, b: NpcId): boolean {
    return a !== b && this.atNode(a) && this.atNode(b) && this.state.npcs[a].node === this.state.npcs[b].node;
  }
  private witnesses(actor: NpcId): NpcId[] { return npcIds.filter(id => id === actor || this.nearby(id, actor)); }

  private record(type: string, actor: NpcId | null, audience: NpcId[], subject: string, detail: string,
    data: WorldEvent['data'] = {}, kind?: MemoryKind, source: NpcId | 'world' | 'player' = 'world', uncertain = false): WorldEvent {
    const event: WorldEvent = {
      id: `event-${this.state.nextEvent++}`, revision: ++this.state.revision, time: this.state.time,
      type, actor, audience: [...new Set(audience)], subject, detail, data,
    };
    this.state.events.push(event);
    if (kind) for (const id of event.audience) {
      const npc = this.state.npcs[id];
      npc.memories.push({ id: `${event.id}:${id}`, eventId: event.id, kind, source, subject, detail, time: event.time, certainty: uncertain ? 'uncertain' : 'certain' });
      // Commitments remain available separately through known task state.
      npc.memories = npc.memories.slice(-24); npc.revision++;
    }
    // Retain bounded recent history plus evidence for currently retained memories.
    if (this.state.events.length > 1024) {
      const evidence = new Set(npcIds.flatMap(id => this.state.npcs[id].memories.map(memory => memory.eventId)));
      const recent = new Set(this.state.events.slice(-768).map(item => item.id));
      this.state.events = this.state.events.filter(item => evidence.has(item.id) || recent.has(item.id));
    }
    return event;
  }

  private perceive(id: NpcId): void {
    const npc = this.state.npcs[id];
    if (!this.atNode(id)) return;
    const visible = npc.knowledge.resources;
    if (npc.node === 'market' && (visible.marketGoods !== this.state.resources.marketGoods || visible.salesOpen !== this.state.resources.salesOpen)) {
      visible.marketGoods = this.state.resources.marketGoods; visible.salesOpen = this.state.resources.salesOpen;
      this.record('stock-observed', id, [id], 'market', `Observed ${visible.marketGoods} goods at the stall`, { quantity: visible.marketGoods }, 'observed');
      if (id === 'amina') {
        const before = npc.needs.stock; npc.needs.stock = visible.marketGoods < 2 ? 0.8 : 0.1;
        if (before < 0.5 && npc.needs.stock >= 0.5) this.trigger(id, 'stock-low');
      }
    }
    if (npc.node === 'centre' && visible.supplierGoods !== this.state.resources.supplierGoods) {
      visible.supplierGoods = this.state.resources.supplierGoods;
      this.record('supplies-observed', id, [id], 'centre', `Observed ${visible.supplierGoods} supplies at the desk`, { quantity: visible.supplierGoods }, 'observed');
    }
    for (const edge of edges) if (edge.from === npc.node || edge.to === npc.node) {
      const blocked = this.state.roads.blockedEdges.includes(edge.id);
      const known = npc.knowledge.blockedEdges.includes(edge.id);
      if (blocked === known) continue;
      npc.knowledge.blockedEdges = blocked ? [...npc.knowledge.blockedEdges, edge.id] : npc.knowledge.blockedEdges.filter(item => item !== edge.id);
      this.record('road-observed', id, [id], edge.id, blocked ? 'Observed blocked road' : 'Observed reopened road', { blocked }, 'observed');
      this.trigger(id, 'road-change');
    }
    for (const task of Object.values(this.state.tasks)) {
      if (task.requester !== id || task.status !== 'delivered' || npc.node !== task.destination || npc.knowledge.tasks[task.id] === 'delivered') continue;
      npc.knowledge.tasks[task.id] = 'delivered';
      npc.relationships[task.recipient] = { successfulJobs: (npc.relationships[task.recipient]?.successfulJobs ?? 0) + 1 };
      npc.memories = npc.memories.filter(memory => !(memory.kind === 'commitment' && memory.subject === task.id));
      this.record('delivery-observed', id, [id], task.id, 'Verified delivered goods and the delivery receipt at the stall', { quantity: task.quantity }, 'outcome');
      this.trigger(id, 'delivery-observed');
    }
  }

  observe(id: NpcId): NpcObservation {
    const npc = this.state.npcs[id];
    return copy({
      actor: npc, time: this.state.time,
      places: places.filter(place => npc.knowledge.places.includes(place.id)),
      nearbyPeople: npcIds.filter(other => npc.knowledge.people.includes(other) && this.nearby(id, other)).map(other => ({
        id: other, name: this.state.npcs[other].name, occupation: this.state.npcs[other].occupation, activity: this.state.npcs[other].activity.kind,
      })),
      resources: npc.knowledge.resources,
      tasks: Object.entries(npc.knowledge.tasks).flatMap(([taskId, status]) => {
        const task = this.state.tasks[taskId];
        return task ? [{ id: task.id, requester: task.requester, recipient: task.recipient, quantity: task.quantity, pickup: task.pickup, destination: task.destination, status, expiresAt: task.expiresAt }] : [];
      }),
      knownBlockedEdges: npc.knowledge.blockedEdges,
      permittedActions: npc.activity.kind === 'travel' || npc.activity.kind === 'work' ? [] : npc.capabilities,
    });
  }

  recordConversation(id: NpcId, speaker: 'player' | 'npc', text: string): void {
    if (!text.trim() || text.length > 1000) throw new Error('Invalid utterance');
    this.record('conversation', id, [id], speaker, text, {}, speaker === 'player' ? 'reported' : 'observed', speaker === 'player' ? 'player' : id, speaker === 'player');
  }

  requestInteractionDecision(id: NpcId): NpcDecisionRequest | null {
    this.trigger(id, 'player-interaction');
    return this.requestDecision(id);
  }

  requestDecision(id: NpcId): NpcDecisionRequest | null {
    if (!this.state.triggers[id]?.length || [...this.pending.values()].some(request => request.actorId === id)) return null;
    const observation = this.observe(id);
    if (!observation.permittedActions.length) return null;
    const request: NpcDecisionRequest = {
      id: `${this.state.id}:decision-${this.state.nextRequest++}`, worldId: this.state.id,
      actorId: id, actorRevision: observation.actor.revision, worldRevision: this.state.revision,
      observation, triggers: [...this.state.triggers[id]!],
    };
    delete this.state.triggers[id]; this.pending.set(request.id, copy(request));
    return copy(request);
  }

  abandonDecision(requestId: string): void {
    const request = this.pending.get(requestId); if (!request) return;
    this.pending.delete(requestId);
    this.record('inference-unavailable', request.actorId, [request.actorId], requestId, 'No inference result; no action executed');
    // No automatic retry loop. A subsequent meaningful event can trigger a new decision.
  }

  applyDecision(requestId: string, proposal: unknown, provenance: { mode: 'mock' | 'meta'; model: string }): DecisionOutcome {
    const previous = this.processed.get(requestId);
    if (previous) return { ...previous, duplicate: true };
    const request = this.pending.get(requestId);
    if (!request) return { accepted: false, reason: 'unknown-request', duplicate: false };
    this.pending.delete(requestId);
    const actor = this.state.npcs[request.actorId];
    const reason = actor.revision !== request.actorRevision ? 'stale-actor' :
      !isNpcDecision(proposal) ? 'invalid-schema' :
      !actor.goals.some(goal => goal.id === proposal.goalId) ? 'unknown-goal' : this.validate(request.actorId, proposal.action);
    const proposalData: WorldEvent['data'] = { mode: provenance.mode, model: provenance.model };
    if (isNpcDecision(proposal)) {
      const { type, ...arguments_ } = proposal.action;
      Object.assign(proposalData, arguments_, { actionType: type });
    }
    this.record('action-proposed', actor.id, [actor.id], requestId, isNpcDecision(proposal) ? proposal.action.type : 'Malformed proposal', proposalData);
    this.record('action-validated', actor.id, [actor.id], requestId, reason || 'accepted', { accepted: !reason });
    const outcome = { accepted: !reason, reason: reason || 'accepted', duplicate: false };
    this.processed.set(requestId, outcome);
    if (this.processed.size > 512) this.processed.delete(this.processed.keys().next().value!);
    if (reason) {
      if (reason === 'stale-actor') this.trigger(actor.id, 'state-changed');
      return outcome;
    }
    if (!isNpcDecision(proposal)) throw new Error('Unreachable invalid decision');
    actor.intention = { goalId: proposal.goalId, reason: proposal.reason }; actor.revision++;
    this.record('intention-selected', actor.id, [actor.id], proposal.goalId, proposal.reason);
    this.execute(actor.id, proposal.action);
    return outcome;
  }

  private availableSupplies(): number {
    return this.state.resources.supplierGoods - Object.values(this.state.tasks).reduce((sum, task) => sum + task.reserved, 0);
  }

  private validate(id: NpcId, action: Action): string | null {
    const npc = this.state.npcs[id];
    if (!npc.capabilities.includes(action.type)) return 'missing-capability';
    if (npc.activity.kind !== 'idle' && npc.activity.kind !== 'wait') return 'actor-busy';
    if (action.type === 'travel') {
      if (!npc.knowledge.places.includes(action.destination)) return 'unknown-place';
      if (!pathToNode(npc.node, action.destination, new Set(npc.knowledge.blockedEdges))) return 'no-known-route';
    } else if (action.type === 'propose-transport') {
      if (Object.keys(this.state.tasks).length >= 64) return 'task-capacity';
      if (!npc.knowledge.people.includes(action.recipient) || !this.nearby(id, action.recipient)) return 'recipient-not-nearby';
      if (!this.state.npcs[action.recipient].capabilities.includes('fulfil-transport')) return 'recipient-cannot-transport';
      if (Object.values(this.state.tasks).some(task => task.requester === id && ['proposed', 'accepted', 'collected'].includes(task.status))) return 'existing-commitment';
      if (action.quantity > 6 || this.availableSupplies() < action.quantity) return 'insufficient-supplies';
    } else if (action.type === 'respond-transport' || action.type === 'fulfil-transport') {
      const task = this.state.tasks[action.taskId];
      if (!task || task.recipient !== id) return 'wrong-task-recipient';
      if (action.type === 'respond-transport') {
        if (task.status !== 'proposed' || this.state.time >= task.expiresAt) return 'offer-not-open';
        if (!this.nearby(id, task.requester)) return 'requester-not-nearby';
        if (action.accept && Object.values(this.state.tasks).some(other => other.recipient === id && ['accepted', 'collected'].includes(other.status))) return 'existing-commitment';
        if (action.accept && this.availableSupplies() < task.quantity) return 'insufficient-supplies';
      } else {
        if (!['accepted', 'collected'].includes(task.status)) return 'task-not-active';
        if (task.status === 'collected' && npc.inventory.goods < task.quantity) return 'missing-cargo';
        if (!pathToNode(npc.node, task.status === 'accepted' ? task.pickup : task.destination, new Set(npc.knowledge.blockedEdges))) return 'no-known-route';
      }
    } else if (action.type === 'collect-self') {
      if (npc.node !== 'centre') return 'not-at-supplier';
      if (npc.inventory.goods + action.quantity > 2) return 'carrying-capacity';
      if (this.availableSupplies() < action.quantity) return 'insufficient-supplies';
    } else if (action.type === 'stock-stall') {
      if (npc.node !== 'market') return 'not-at-market';
      if (npc.inventory.goods < action.quantity) return 'missing-goods';
    } else if (action.type === 'buy') {
      if (npc.node !== 'market' || !this.nearby(id, 'amina')) return 'trader-not-nearby';
      if (!this.state.resources.salesOpen) return 'sales-paused';
      if (this.state.resources.marketGoods < action.quantity) return 'insufficient-stock';
    } else if (action.type === 'set-sales') {
      if (npc.node !== 'market') return 'not-at-market';
    } else if (action.type === 'share') {
      if (!npc.knowledge.people.includes(action.recipient) || !this.nearby(id, action.recipient)) return 'recipient-not-nearby';
      if (!npc.memories.some(memory => memory.id === action.memoryId)) return 'unknown-memory';
    }
    return null;
  }

  private execute(id: NpcId, action: Action): void {
    const npc = this.state.npcs[id]; npc.activity = { kind: 'idle' };
    if (action.type === 'travel') this.travel(id, action.destination, null, null);
    else if (action.type === 'wait' || action.type === 'work') {
      npc.activity = { kind: action.type, until: this.state.time + action.seconds };
      this.record('activity-started', id, [id], action.type, `${action.type} for ${action.seconds} simulation seconds`, {}, 'observed');
    } else if (action.type === 'propose-transport') {
      const task: TransportTask = {
        id: `task-${this.state.nextTask++}`, revision: 0, requester: id, recipient: action.recipient,
        quantity: action.quantity, pickup: 'centre', destination: 'market', status: 'proposed',
        expiresAt: this.state.time + 90, reserved: 0, rewardPaid: false,
      };
      this.state.tasks[task.id] = task;
      for (const participant of [id, task.recipient]) this.state.npcs[participant].knowledge.tasks[task.id] = 'proposed';
      this.record('transport-proposed', id, [id, task.recipient], task.id, 'Requested help transporting supplies', { quantity: task.quantity }, 'observed');
      this.trigger(task.recipient, 'transport-request'); this.trigger(id, 'offer-proposed');
    } else if (action.type === 'respond-transport') {
      const task = this.state.tasks[action.taskId]!;
      task.status = action.accept ? 'accepted' : 'declined'; task.revision++;
      task.reserved = action.accept ? task.quantity : 0;
      for (const participant of [id, task.requester]) this.state.npcs[participant].knowledge.tasks[task.id] = task.status;
      this.record(`transport-${task.status}`, id, [id, task.requester], task.id, action.accept ? 'Accepted the transport commitment' : 'Declined the transport request', {}, action.accept ? 'commitment' : 'outcome');
      this.trigger(id, 'offer-resolved'); this.trigger(task.requester, 'offer-resolved');
    } else if (action.type === 'fulfil-transport') {
      const task = this.state.tasks[action.taskId]!;
      this.travel(id, task.status === 'accepted' ? task.pickup : task.destination, task.id, task.status === 'accepted' ? 'pickup' : 'delivery');
    } else if (action.type === 'collect-self' || action.type === 'stock-stall' || action.type === 'buy') {
      const quantity = action.quantity;
      if (action.type === 'collect-self') { this.state.resources.supplierGoods -= quantity; npc.inventory.goods += quantity; }
      if (action.type === 'stock-stall') { npc.inventory.goods -= quantity; this.state.resources.marketGoods += quantity; }
      if (action.type === 'buy') { this.state.resources.marketGoods -= quantity; npc.inventory.goods += quantity; npc.needs.food = Math.max(0, npc.needs.food - 0.8 * quantity); }
      this.state.resources.revision++;
      this.record(action.type, id, this.witnesses(id), action.type, 'Goods transferred after validation', { quantity }, 'outcome');
      for (const witness of this.witnesses(id)) this.perceive(witness);
      this.trigger(id, 'action-completed');
    } else if (action.type === 'set-sales') {
      this.state.resources.salesOpen = action.open; this.state.resources.revision++;
      this.record('sales-changed', id, this.witnesses(id), 'market', action.open ? 'Sales resumed' : 'Sales reduced: stall temporarily closed', { open: action.open }, 'outcome');
      for (const witness of this.witnesses(id)) this.perceive(witness);
      this.trigger(id, 'action-completed');
    } else if (action.type === 'share') {
      const memory = npc.memories.find(item => item.id === action.memoryId)!;
      const uncertain = action.asBelief || memory.certainty === 'uncertain' || memory.kind === 'belief';
      this.record('information-shared', id, [action.recipient], memory.subject, memory.detail,
        { sourceEventId: memory.eventId }, uncertain ? 'belief' : 'reported', id, uncertain);
      // Reports remain reports: no authoritative road, resource, or knowledge-fact mutation.
      this.trigger(action.recipient, 'information-received'); this.trigger(id, 'action-completed');
    }
  }

  private travel(id: NpcId, destination: string, taskId: string | null, leg: 'pickup' | 'delivery' | null): void {
    const npc = this.state.npcs[id];
    const path = pathToNode(npc.node, destination, new Set(npc.knowledge.blockedEdges));
    if (!path) { this.fail(id, 'No route in current knowledge'); return; }
    npc.activity = { kind: 'travel', path, step: 0, progress: 0, taskId, leg };
    this.record('travel-started', id, [id], destination, 'Started validated graph travel', { taskId });
    if (!path.edgeIds.length) this.arrive(id);
  }

  private fail(id: NpcId, detail: string): void {
    this.state.npcs[id].activity = { kind: 'idle' };
    this.record('action-failed', id, [id], id, detail, {}, 'observed'); this.trigger(id, 'action-failed');
  }

  private arrive(id: NpcId): void {
    const npc = this.state.npcs[id]; const activity = npc.activity;
    if (activity.kind !== 'travel') return;
    npc.activity = { kind: 'idle' };
    this.record('arrived', id, this.witnesses(id), npc.node, 'Reached a waypoint destination', {}, 'observed');
    this.perceive(id);
    for (const other of npcIds) if (this.nearby(id, other)) this.trigger(other, 'person-arrived');
    if (activity.taskId) this.finishLeg(id, activity.taskId, activity.leg);
    else this.trigger(id, 'activity-completed');
  }

  private finishLeg(id: NpcId, taskId: string, leg: 'pickup' | 'delivery' | null): void {
    const task = this.state.tasks[taskId]; const npc = this.state.npcs[id];
    if (!task || task.recipient !== id) { this.fail(id, 'Task is unavailable'); return; }
    if (leg === 'pickup') {
      if (task.status !== 'accepted' || npc.node !== task.pickup || task.reserved !== task.quantity || this.state.resources.supplierGoods < task.quantity) { this.fail(id, 'Collection prerequisites changed'); return; }
      this.state.resources.supplierGoods -= task.quantity; npc.inventory.goods += task.quantity;
      task.reserved = 0; task.status = 'collected'; task.revision++; this.state.resources.revision++;
      npc.knowledge.tasks[task.id] = 'collected';
      this.record('transport-collected', id, [id], task.id, 'Collected reserved supplies at the supply desk', { quantity: task.quantity }, 'outcome');
      for (const witness of this.witnesses(id)) this.perceive(witness);
      this.travel(id, task.destination, task.id, 'delivery');
    } else if (leg === 'delivery') {
      if (task.status !== 'collected' || npc.node !== task.destination || npc.inventory.goods < task.quantity || task.rewardPaid) { this.fail(id, 'Delivery prerequisites changed'); return; }
      npc.inventory.goods -= task.quantity; this.state.resources.marketGoods += task.quantity;
      task.status = 'delivered'; task.revision++; task.rewardPaid = true; npc.inventory.rewards++;
      npc.needs.income = Math.max(0, npc.needs.income - 0.3); this.state.resources.revision++;
      npc.knowledge.tasks[task.id] = 'delivered';
      npc.memories = npc.memories.filter(memory => !(memory.kind === 'commitment' && memory.subject === task.id));
      npc.relationships[task.requester] = { successfulJobs: (npc.relationships[task.requester]?.successfulJobs ?? 0) + 1 };
      this.record('transport-delivered', id, [id], task.id, 'Delivered goods into the stall receiving inventory; reward applied once', { quantity: task.quantity }, 'outcome');
      for (const witness of this.witnesses(id)) this.perceive(witness);
      this.trigger(id, 'job-completed');
    }
  }

  setRoadBlocked(edgeId: string, blocked: boolean): boolean {
    if (typeof blocked !== 'boolean') return false;
    if (!edges.some(edge => edge.id === edgeId)) return false;
    if (npcIds.some(id => { const activity = this.state.npcs[id].activity; return activity.kind === 'travel' && activity.path.edgeIds[activity.step] === edgeId && activity.progress > 0; })) return false;
    if (this.state.roads.blockedEdges.includes(edgeId) === blocked) return false;
    this.state.roads.blockedEdges = blocked ? [...this.state.roads.blockedEdges, edgeId] : this.state.roads.blockedEdges.filter(id => id !== edgeId);
    this.state.roads.revision++;
    this.record('road-changed', null, [], edgeId, blocked ? 'Road blocked' : 'Road reopened', { blocked });
    for (const id of npcIds) this.perceive(id);
    return true;
  }

  advance(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) throw new Error('Advance must be between 0 and 60 simulation seconds');
    this.state.revision++;
    let remaining = seconds;
    while (remaining > 0.000001) {
      const dt = Math.min(0.25, remaining); remaining -= dt; this.state.time += dt;
      for (const task of Object.values(this.state.tasks)) if (task.status === 'proposed' && this.state.time >= task.expiresAt) {
        task.status = 'expired'; task.revision++;
        this.record('offer-expired', null, [task.requester, task.recipient], task.id, 'Unaccepted offer reached its known deadline', {}, 'outcome');
        for (const id of [task.requester, task.recipient]) {
          this.state.npcs[id].knowledge.tasks[task.id] = 'expired'; this.state.npcs[id].revision++; this.trigger(id, 'offer-expired');
        }
      }
      for (const id of npcIds) {
        const npc = this.state.npcs[id]; const activity = npc.activity;
        if ((activity.kind === 'wait' || activity.kind === 'work') && this.state.time >= activity.until) {
          npc.activity = { kind: 'idle' }; npc.revision++;
          this.record('activity-completed', id, [id], activity.kind, 'Selected activity finished', {}, 'observed'); this.trigger(id, 'activity-completed');
        } else if (activity.kind === 'travel') {
          let distance = (id === 'musa' ? 14 : 4) * dt;
          while (distance > 0 && npc.activity === activity) {
            const edge = edges.find(item => item.id === activity.path.edgeIds[activity.step]);
            if (!edge) { this.arrive(id); break; }
            if (this.state.roads.blockedEdges.includes(edge.id)) {
              this.fail(id, `Encountered blocked edge ${edge.id}`); this.perceive(id); break;
            }
            const travel = Math.min(distance, edge.distance - activity.progress);
            activity.progress += travel; distance -= travel;
            if (activity.progress >= edge.distance - 0.000001) {
              npc.node = activity.path.nodeIds[activity.step + 1]!; npc.revision++;
              activity.step++; activity.progress = 0;
              this.record('edge-executed', id, [id], edge.id, 'Completed deterministic road movement', { node: npc.node });
              if (activity.step === activity.path.edgeIds.length) this.arrive(id);
            }
          }
        }
      }
    }
  }
}
