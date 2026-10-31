import { mapFor, initialHomes, initialLocations, workSites, type MapId } from '../world/town-layout.js';
import { pathToNode } from '../navigation/routes.js';
import { initialState, defaultResidents } from './initial-state.js';
import { isNpcDecision, isResidentId } from './decision-schema.js';
import { type Inhabitant, type Action, type DecisionOutcome, type MemoryKind, type NpcDecisionRequest, type NpcId, type NpcObservation, type TransportTask, type WorldEvent, type WorldState } from './types.js';
import { assertSnapshot, migrateSnapshot } from './snapshot.js';
import { projectPlaceKnowledge } from './knowledge.js';
import { quantityBounds, transportCapacity, selfCollectionCapacity } from './action-limits.js';
import { residentPlan, townBusinesses } from './population.js';
import { initialPlaceFacts } from './knowledge.js';
import { enableCommunication, communicationObservation, validateCommunication, executeCommunication, advanceCommunications, remoteExchange, communicationRules } from './communication.js';

let worldSequence = 0;
const copy = <T>(value: T): T => structuredClone(value);

export class Neighbourhood {
  private state: WorldState;
  private readonly pending = new Map<string, NpcDecisionRequest>();
  private readonly processed = new Map<string, DecisionOutcome>();

  constructor(id = `local-neighbourhood-${++worldSequence}`, residents: Inhabitant[] = defaultResidents()) {
    if (!/^[a-zA-Z0-9:_-]{1,120}$/.test(id)) throw new Error('Invalid neighbourhood identifier');
    this.state = initialState(id, residents);
    if (Object.keys(this.state.npcs).length !== residents.length) throw new Error('Duplicate resident ID');
    assertSnapshot(this.state);
    for (const actor of this.residentIds) {
      this.record('identity-established', actor, [actor], actor, `${this.state.npcs[actor]!.name}: ${this.state.npcs[actor]!.occupation}`, {}, 'fact');
      if (this.state.npcs[actor]!.circumstances) this.record('circumstances-established', actor, [actor], actor, this.state.npcs[actor]!.circumstances!, {}, 'fact');
      this.perceive(actor); this.trigger(actor, 'activation');
    }
  }

  get snapshot(): WorldState { return copy(this.state); }
  get time(): number { return this.state.time; }
  get id(): string { return this.state.id; }
  get residentIds(): NpcId[] { return Object.keys(this.state.npcs); }
  hasResident(id: string): boolean { return Object.hasOwn(this.state.npcs, id); }
  serialize(): string { return JSON.stringify(this.state); }
  get hasTownEconomy(): boolean { return this.state.town !== undefined; }
  get mapId():MapId{return this.state.mapId;}
  private get map(){return mapFor(this.state.mapId);}
  upgradeTownMap(options:{fresh?:boolean}={}):boolean {
    if(!this.state.town)return false;
    const candidate=copy(this.state),map=mapFor('town-v1');let changed=candidate.mapId!=='town-v1';
    candidate.mapId='town-v1';if(changed && !options.fresh)candidate.mapUpgradedAt ??= candidate.time;
    const occupied=new Set(Object.values(candidate.npcs).map(npc=>npc.home).filter((home):home is string=>!!home && map.nodes.some(n=>n.id===home && n.kind==='home')));
    for(const npc of Object.values(candidate.npcs)) {
      if(!npc.home || !occupied.has(npc.home)) {
        const proposed=initialHomes[npc.id],home=proposed && !occupied.has(proposed)?proposed:map.nodes.find(n=>n.kind==='home' && !occupied.has(n.id))?.id;
        if(!home)throw new Error('No vacant dwelling in this map');npc.home=home;occupied.add(home);changed=true;
      }
      npc.knowledge.places=[...new Set([...npc.knowledge.places,npc.home,'town-green'])];npc.knowledge.placeFacts={...npc.knowledge.placeFacts,...initialPlaceFacts([npc.home,'town-green'])};
    }
    for(const business of Object.values(candidate.town!.businesses)) {
      const target=workSites[business.id];if(!target || business.node===target)continue;
      for(const npc of Object.values(candidate.npcs)) {
        if(npc.activity.kind==='work' && npc.activity.job?.businessId===business.id)npc.activity.job.siteNode ??= business.node;
        const known=npc.knowledge.businesses?.[business.id];if(known)known.siteNode ??= business.node;
      }
      business.node=target;changed=true;
    }
    for(const npc of Object.values(candidate.npcs)) {
      const oldWork=npc.routine!.workplace;
      const primary=Object.values(candidate.town!.businesses).find(b=>b.staff.includes(npc.id) && b.skill!=='general');
      const workplace=primary?.node ?? (npc.mobility==='taxi'?'stand':oldWork==='centre'?workSites['community-errands']!:oldWork);
      npc.routine!.workplace=workplace;
      const knownSites=Object.keys(npc.knowledge.businesses ?? {}).map(id=>candidate.town!.businesses[id]!.node);
      npc.knowledge.places=[...new Set([...npc.knowledge.places,workplace,...knownSites])];
      npc.knowledge.placeFacts={...npc.knowledge.placeFacts,...initialPlaceFacts([workplace,...knownSites])};
    }
    if(!changed)return false;
    if(options.fresh){if(candidate.time!==0 || Object.keys(candidate.tasks).length || Object.values(candidate.npcs).some(npc=>npc.activity.kind!=='idle'))throw new Error('Starting locations are only valid for a fresh world');for(const npc of Object.values(candidate.npcs)){const location=initialLocations[npc.id];if(location)npc.node=location==='home'?npc.home!:location;}}
    assertSnapshot(candidate);this.state=candidate;this.pending.clear();
    // Setup refines addresses without evicting existing personal memories.
    this.record('town-addresses-established',null,[],this.state.id,'Established distinct homes and workplace addresses');
    if(options.fresh)for(const id of this.residentIds)this.perceive(id);
    for(const id of this.residentIds)this.trigger(id,'addresses-established');return true;
  }
  invalidateActorDecisions(id:NpcId):void {
    for(const request of [...this.pending.values()])if(request.actorId===id)this.abandonDecision(request.id);
    this.trigger(id,'control-changed');
  }
  applyPhoneAction(id:NpcId,action:unknown):DecisionOutcome {
    const actor=this.state.npcs[id];if(!actor)return {accepted:false,reason:'unknown-resident',duplicate:false};
    const proposal={goalId:actor.goals[0]!.id,reason:'Player operating this resident’s phone',action};
    if(!isNpcDecision(proposal) || !['communicate','respond-communication','end-call','offer-contact','propose-transport','respond-transport'].includes(proposal.action.type))return {accepted:false,reason:'invalid-phone-action',duplicate:false};
    if(proposal.action.type==='propose-transport' && !remoteExchange(this.state,id,proposal.action.recipient))return {accepted:false,reason:'accepted-discussion-required',duplicate:false};
    if(proposal.action.type==='respond-transport' && (!this.state.tasks[proposal.action.taskId]?.communicationId || actor.knowledge.tasks[proposal.action.taskId]!=='proposed'))return {accepted:false,reason:'delivered-phone-offer-required',duplicate:false};
    const reason=this.validate(id,proposal.action);if(reason)return {accepted:false,reason,duplicate:false};
    const request=this.requestInteractionDecision(id);if(!request)return {accepted:false,reason:'actor-busy',duplicate:false};
    return this.applyDecision(request.id,proposal,{mode:'player',model:'player-phone'});
  }
  enableCommunications(): void {
    const candidate=copy(this.state);if(!enableCommunication(candidate))return;
    assertSnapshot(candidate);this.state=candidate;
    this.record('communication-enabled',null,[],this.state.id,'Contact-based phone and text communication enabled');
    for(const id of this.residentIds)this.trigger(id,'communication-available');
  }
  private communicationHost() { return {state:this.state,record:this.record.bind(this),trigger:this.trigger.bind(this)}; }
  static restore(serialized: string): Neighbourhood {
    const state: unknown = migrateSnapshot(JSON.parse(serialized)); assertSnapshot(state);
    const world = new Neighbourhood(state.id); world.state = copy(state);
    // No in-flight response survives restoration; new request IDs continue monotonically.
    for (const id of world.residentIds) if (['idle', 'wait'].includes(world.state.npcs[id]!.activity.kind)) world.trigger(id, 'restored');
    return world;
  }

  private trigger(actor: NpcId, reason: string): void {
    const triggers = this.state.triggers[actor] ?? [];
    if (!triggers.includes(reason)) triggers.push(reason);
    this.state.triggers[actor] = triggers.slice(-8);
  }

  private atNode(actor: NpcId): boolean { return this.state.npcs[actor]!.activity.kind !== 'travel'; }
  private nearby(a: NpcId, b: NpcId): boolean {
    return a !== b && this.hasResident(a) && this.hasResident(b) && this.atNode(a) && this.atNode(b) && this.state.npcs[a]!.node === this.state.npcs[b]!.node;
  }
  private witnesses(actor: NpcId): NpcId[] { return this.residentIds.filter(id => id === actor || this.nearby(id, actor)); }

  private pair(a: NpcId, b: NpcId): string { return [a,b].sort().join(':'); }
  private available(id: NpcId): boolean {
    const activity=this.state.npcs[id]!.activity;
    return activity.kind==='idle' || activity.kind==='wait' && !activity.resting;
  }
  private canEncounter(a: NpcId, b: NpcId): boolean {
    return Object.keys(this.state.social.interactions).length<128 && this.nearby(a,b) && this.available(a) && this.available(b) &&
      this.state.npcs[a]!.capabilities.includes('encounter') && this.state.npcs[b]!.capabilities.includes('respond-encounter') &&
      (this.state.social.cooldowns[this.pair(a,b)] ?? 0) <= this.state.time &&
      !Object.values(this.state.social.interactions).some(item => item.status === 'pending' &&
        [item.initiator,item.recipient].some(id => id === a || id === b));
  }
  private detectEncounters(): void {
    const ids = this.residentIds;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!, b = ids[j]!, key = this.pair(a,b);
      if (!this.nearby(a,b)) { delete this.state.social.noticed[key]; continue; }
      if (!this.canEncounter(a,b) || Object.hasOwn(this.state.social.noticed,key)) continue;
      this.state.social.noticed[key] = this.state.time;
      this.record('encounter-noticed', null, [a,b], key, 'Noticed another available resident nearby; engagement remains optional', { first: a, second: b }, 'observed');
      this.trigger(a,'encounter-noticed'); this.trigger(b,'encounter-noticed');
    }
    for (const item of Object.values(this.state.social.interactions)) if (item.status === 'pending' && this.state.time >= item.expiresAt) {
      item.status = 'expired';
      this.record('encounter-expired', null, [item.initiator,item.recipient], item.id, 'No response before the encounter invitation expired', {}, 'outcome');
      this.trigger(item.initiator,'encounter-resolved'); this.trigger(item.recipient,'encounter-resolved');
    }
  }
  private introduce(source: NpcId, observer: NpcId): void {
    const npc = this.state.npcs[observer]!, person = this.state.npcs[source]!;
    if (npc.knowledge.people.includes(source)) return;
    npc.knowledge.people.push(source);
    const offersTransport = person.capabilities.includes('fulfil-transport');
    if (offersTransport) npc.knowledge.transporters = [...npc.knowledge.transporters ?? [],source];
    this.record('resident-introduced', source, [observer], source, `${person.name} introduced themself as ${person.occupation}${offersTransport ? ' and disclosed that they can transport supplies' : ''}`, { offersTransport }, 'reported', source);
  }
  private startEncounter(id: NpcId, action: Extract<Action,{type:'encounter'}>): void {
    const item = { id: `encounter-${this.state.social.nextInteraction++}`, initiator: id, recipient: action.recipient,
      purpose: action.purpose, message: action.message, response: null, status: 'pending' as const,
      createdAt: this.state.time, expiresAt: this.state.time + 90 };
    this.state.social.interactions[item.id] = item;
    this.state.social.cooldowns[this.pair(id, action.recipient)] = this.state.time + 300;
    this.introduce(id, action.recipient);
    this.record('encounter-invited', id, [id,action.recipient], item.id, action.message, { recipient: action.recipient, purpose: action.purpose }, 'reported', id, true);
    this.trigger(action.recipient,'encounter-invitation'); this.trigger(id,'encounter-pending');
  }
  private respondEncounter(id: NpcId, action: Extract<Action,{type:'respond-encounter'}>): void {
    const item = this.state.social.interactions[action.interactionId]!;
    item.status = ({ accept: 'accepted', decline: 'declined', defer: 'deferred', clarify: 'clarified' } as const)[action.response];
    item.response = action.message;
    if (action.response === 'accept') this.introduce(id,item.initiator);
    this.record(`encounter-${item.status}`, id, [id,item.initiator], item.id, action.message,
      { initiator: item.initiator, response: action.response, purpose: item.purpose }, 'reported', id, true);
    // This records willingness to converse, never a transport commitment or friendship.
    this.trigger(item.initiator,'encounter-resolved'); this.trigger(id,'encounter-resolved');
  }

  addResident(resident: Inhabitant): void {
    if (this.state.town) throw new Error('Expand a town through the validated town upgrade');
    if (!isResidentId(resident.id) || this.hasResident(resident.id) || resident.memories.length || resident.inventory.goods || resident.inventory.rewards) throw new Error('Invalid new resident');
    const candidate = copy(this.state);
    candidate.npcs[resident.id] = copy(resident);
    assertSnapshot(candidate); // Validate the entire registry and references before mutation.
    this.state = candidate;
    this.record('identity-established', resident.id, [resident.id], resident.id, `${resident.name}: ${resident.occupation}`, {}, 'fact');
    if (resident.circumstances) this.record('circumstances-established', resident.id, [resident.id], resident.id, resident.circumstances, {}, 'fact');
    this.perceive(resident.id); this.trigger(resident.id,'activation');
  }

  enableTown(residents: Inhabitant[]): void {
    if (new Set(residents.map(npc=>npc.id)).size!==residents.length) throw new Error('Duplicate resident ID');
    // Build admission, credits and new businesses in an isolated candidate before publishing.
    const candidate = Neighbourhood.restore(this.serialize()), state = candidate.state;
    const priorTown = state.town, admitted: string[] = [];
    for (const resident of residents) if (!candidate.hasResident(resident.id)) {
      if (!isResidentId(resident.id) || resident.memories.length || resident.inventory.goods || resident.inventory.rewards) throw new Error('Invalid new resident');
      state.npcs[resident.id] = copy(resident); admitted.push(resident.id);
    }
    const configured = priorTown ? admitted : candidate.residentIds;
    if (!configured.length) return;
    const definitions=townBusinesses(candidate.residentIds);
    const businesses=priorTown?.businesses ?? {};
    let addedMoney=0;
    for (const [id,business] of Object.entries(definitions)) {
      if (!Object.hasOwn(businesses,id)) { businesses[id]=business; addedMoney+=business.coins; }
      else businesses[id]!.staff=[...new Set([...businesses[id]!.staff,...business.staff])];
    }
    for (const id of configured) {
      const npc=state.npcs[id]!, plan=residentPlan(id), previousPlaces=new Set(npc.knowledge.places);
      npc.inventory.coins ??= plan.coins; addedMoney+=npc.inventory.coins; npc.home ??= plan.home;
      const cargo=Object.values(state.tasks).filter(task=>task.recipient===id && task.status==='collected').reduce((sum,task)=>sum+task.quantity,0);
      const purchases=state.events.filter(event=>event.actor===id && event.type==='buy').reduce((sum,event)=>sum+Number(event.data.quantity ?? 0),0);
      npc.inventory.food ??= Math.min(npc.inventory.goods-cargo,purchases);
      npc.skills ??= [...new Set(['general',plan.skill,...(npc.capabilities.includes('fulfil-transport') ? ['transport'] : [])])];
      npc.routine ??= {workplace:plan.workplace,leisure:plan.leisure,sociability:plan.sociability};
      npc.needs.rest ??= 'rest' in plan && typeof plan.rest==='number' ? plan.rest : .1;
      npc.capabilities=[...new Set([...npc.capabilities,'buy','take-work','eat','rest'] as const)];
      npc.knowledge.places=[...new Set([...npc.knowledge.places,npc.home,npc.routine.workplace,npc.routine.leisure,'market'])];
      for (const place of npc.knowledge.places) if (!previousPlaces.has(place)) npc.knowledge.placeFacts={...npc.knowledge.placeFacts,...initialPlaceFacts([place])};
      npc.knowledge.businesses ??= Object.fromEntries(Object.values(businesses).filter(b=>npc.skills!.includes(b.skill)).map(b=>[b.id,{available:null,observedAt:null}]));
      candidate.trigger(id,'town-opportunities');
    }
    state.town=priorTown ? {...priorTown,businesses,initialMoney:priorTown.initialMoney+addedMoney} : {
      businesses,initialMoney:addedMoney,initialInputs:96,rawInputs:96,produced:0,consumed:0,nextNeedsAt:state.time+60,
      marketPrice:2,transportPayment:2,supplierCapacity:24,
    };
    for (const id of admitted) {
      const npc=state.npcs[id]!;
      candidate.record('identity-established',id,[id],id,npc.name+': '+npc.occupation,{},'fact');
      if (npc.circumstances) candidate.record('circumstances-established',id,[id],id,npc.circumstances,{},'fact');
    }
    for (const id of configured) {
      // Existing residents keep their entire retained memory buffer during migration.
      // Later real observations resume normal retention; setup must not evict old evidence.
      const newlyAdmitted=admitted.includes(id);
      candidate.record('routine-established',id,[id],id,'Learned personal work opportunities and the town credit/food rules',{},newlyAdmitted ? 'fact' : undefined);
      if (newlyAdmitted) candidate.perceive(id);
    }
    if(state.communication)enableCommunication(state);
    if(state.mapId==='town-v1'){candidate.upgradeTownMap();Object.assign(state,candidate.state);}
    assertSnapshot(state);
    this.state=copy(state); this.pending.clear();
  }

  private workAvailable(businessId: string): boolean {
    const town = this.state.town, business = town?.businesses[businessId]; if (!town || !business) return false;
    const bookings = Object.values(this.state.npcs).flatMap(npc => npc.activity.kind === 'work' && npc.activity.job ? [npc.activity.job] : []);
    return bookings.filter(job=>job.businessId===businessId).length < business.slots && business.coins >= business.wage &&
      town.rawInputs >= business.output && this.state.resources.supplierGoods + bookings.reduce((sum,job)=>sum+job.output,0) + business.output <= town.supplierCapacity;
  }

  private townNeeds(): void {
    const town = this.state.town; if (!town || this.state.time < town.nextNeedsAt) return;
    town.nextNeedsAt += 60;
    for (const npc of Object.values(this.state.npcs)) {
      npc.needs.food = Math.min(1,Number((npc.needs.food + .08).toFixed(6)));
      npc.needs.rest = Math.min(1,Number(((npc.needs.rest ?? 0) + (['travel','work'].includes(npc.activity.kind) ? .08 : .04)).toFixed(6)));
      npc.needs.income = Math.min(1,Number((npc.needs.income + .03).toFixed(6))); npc.revision++;
      this.trigger(npc.id,'personal-needs-changed'); this.perceive(npc.id);
    }
  }
  private marketServing(buyer: string): boolean {
    return this.state.town!.businesses.market!.staff.some(id=>{
      const npc=this.state.npcs[id]!;
      return npc.node==='market' && this.atNode(id) && (id===buyer || !(npc.activity.kind==='wait' && npc.activity.resting));
    });
  }

  private record(type: string, actor: NpcId | null, audience: NpcId[], subject: string, detail: string,
    data: WorldEvent['data'] = {}, kind?: MemoryKind, source: NpcId | 'world' | 'player' = 'world', uncertain = false): WorldEvent {
    const event: WorldEvent = {
      id: `event-${this.state.nextEvent++}`, revision: ++this.state.revision, time: this.state.time,
      type, actor, audience: [...new Set(audience)], subject, detail, data,
    };
    this.state.events.push(event);
    if (kind) for (const id of event.audience) {
      const npc = this.state.npcs[id]!;
      npc.memories.push({ id: `${event.id}:${id}`, eventId: event.id, kind, source, subject, detail, time: event.time, certainty: uncertain ? 'uncertain' : 'certain' });
      // Commitments remain available separately through known task state.
      npc.memories = npc.memories.slice(-24); npc.revision++;
    }
    // Retain bounded recent history plus evidence for currently retained memories.
    if (this.state.events.length > 1024) {
      const evidence = new Set(this.residentIds.flatMap(id => this.state.npcs[id]!.memories.map(memory => memory.eventId)));
      const recent = new Set(this.state.events.slice(-768).map(item => item.id));
      this.state.events = this.state.events.filter(item => evidence.has(item.id) || recent.has(item.id));
    }
    return event;
  }

  private perceive(id: NpcId): void {
    const npc = this.state.npcs[id]!;
    if (!this.atNode(id)) return;
    if (this.state.town) for (const business of Object.values(this.state.town.businesses)) if (business.node === npc.node) {
      const available = this.workAvailable(business.id), previous = npc.knowledge.businesses?.[business.id];
      npc.knowledge.businesses ??= {};
      if (!previous || previous.available !== available || previous.siteNode && previous.siteNode!==business.node) {
        npc.knowledge.businesses[business.id] = {available,observedAt:this.state.time,siteNode:business.node};
        this.record('work-observed',id,[id],business.id,available ? 'Observed a funded work opening' : 'Observed no current work opening',{available},'observed');
        this.trigger(id,'work-availability-changed');
      }
    }
    const visible = npc.knowledge.resources;
    if (npc.node === 'market' && (visible.marketGoods !== this.state.resources.marketGoods || visible.salesOpen !== this.state.resources.salesOpen)) {
      visible.marketGoods = this.state.resources.marketGoods; visible.salesOpen = this.state.resources.salesOpen;
      this.record('stock-observed', id, [id], 'market', `Observed ${visible.marketGoods} goods at the stall`, { quantity: visible.marketGoods, salesOpen: visible.salesOpen }, 'observed');
      if (npc.capabilities.includes('stock-stall')) {
        const before = npc.needs.stock; npc.needs.stock = visible.marketGoods < 2 ? 0.8 : 0.1;
        if (before < 0.5 && npc.needs.stock >= 0.5) this.trigger(id, 'stock-low');
      }
    }
    if (npc.node === 'centre' && visible.supplierGoods !== this.state.resources.supplierGoods) {
      visible.supplierGoods = this.state.resources.supplierGoods;
      this.record('supplies-observed', id, [id], 'centre', `Observed ${visible.supplierGoods} supplies at the desk`, { quantity: visible.supplierGoods }, 'observed');
    }
    for (const edge of this.map.edges) if (edge.from === npc.node || edge.to === npc.node) {
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
    if (!this.hasResident(id)) throw new Error('Unknown resident');
    const npc = this.state.npcs[id]!;
    const actionConstraints: NpcObservation['actionConstraints'] = {};
    for (const type of ['propose-transport', 'collect-self', 'stock-stall', 'buy', 'eat'] as const) {
      if (npc.capabilities.includes(type)) actionConstraints[type] = { quantity: { ...quantityBounds } };
    }
    if (npc.capabilities.includes('collect-self')) Object.assign(actionConstraints['collect-self']!, {
      carryingCapacity: selfCollectionCapacity,
      remainingCarryingCapacity: Math.max(0, selfCollectionCapacity - npc.inventory.goods),
    });
    if (npc.capabilities.includes('fulfil-transport')) actionConstraints['fulfil-transport'] = {
      carryingCapacity: transportCapacity,
      remainingCarryingCapacity: Math.max(0, transportCapacity - npc.inventory.goods),
    };
    return copy({
      actor: npc, time: this.state.time,mapId:this.state.mapId,
      places: this.map.places.filter(place => npc.knowledge.places.includes(place.id)),
      placeKnowledge: projectPlaceKnowledge(npc, this.state.events, this.state.time),
      memoryEvidence: npc.memories.map(memory => ({ id: memory.id, interpretation:
        this.state.events.find(event => event.id === memory.eventId)?.type === 'conversation' && memory.source === id ? 'speech-only' :
        memory.kind === 'fact' ? 'established-fact' : memory.kind === 'reported' ? 'unverified-report' : memory.kind === 'belief' ? 'uncertain-belief' : memory.kind === 'commitment' ? 'commitment' : memory.kind === 'outcome' ? 'verified-outcome' : 'observed-world-event' })),
      nearbyPeople: this.residentIds.filter(other => this.nearby(id, other)).map(other => ({
        id: other, name: npc.knowledge.people.includes(other) ? this.state.npcs[other]!.name : null,
        occupation: npc.knowledge.people.includes(other) ? this.state.npcs[other]!.occupation : null,
        activity: this.state.npcs[other]!.activity.kind, known: npc.knowledge.people.includes(other),
        canTransport: npc.knowledge.transporters?.includes(other) ?? false,
      })),
      encounters: Object.values(this.state.social.interactions).filter(item => item.initiator === id || item.recipient === id).slice(-8),
      encounterOpportunities: this.residentIds.filter(other => this.canEncounter(id, other)),
      ...(this.state.communication ? {communication:communicationObservation(this.state,id)!} : {}),
      ...(this.state.town ? { town: {
        marketPrice:this.state.town.marketPrice,ownsMarket:this.state.town.businesses.market?.owner===id,transportPayment:this.state.town.transportPayment,
        marketServing:npc.node==='market' && this.atNode(id) ? this.marketServing(id) : null,
        work:Object.entries(npc.knowledge.businesses ?? {}).flatMap(([key,knowledge])=>{
          const business=this.state.town!.businesses[key];
          return business && npc.skills?.includes(business.skill) ? [{id:business.id,name:business.name,node:business.node,skill:business.skill,wage:business.wage,seconds:business.seconds,
            available:npc.node===business.node && this.atNode(id) ? this.workAvailable(key) : knowledge.siteNode && knowledge.siteNode!==business.node?null:knowledge.available,observedAt:npc.node===business.node && this.atNode(id) ? this.state.time : knowledge.siteNode && knowledge.siteNode!==business.node?null:knowledge.observedAt}] : [];
        }),
      }} : {}),
      resources: npc.knowledge.resources,
      tasks: Object.entries(npc.knowledge.tasks).flatMap(([taskId, status]) => {
        const task = this.state.tasks[taskId];
        return task ? [{ id: task.id, requester: task.requester, recipient: task.recipient, quantity: task.quantity, pickup: task.pickup, destination: task.destination, status, expiresAt: task.expiresAt,...(task.communicationId?{communicationId:task.communicationId}:{}) }] : [];
      }),
      knownBlockedEdges: npc.knowledge.blockedEdges,
      permittedActions: npc.activity.kind === 'travel' || npc.activity.kind === 'work' || npc.activity.kind==='wait' && npc.activity.resting ? [] : npc.capabilities,
      actionConstraints,
    });
  }

  recordConversation(id: NpcId, speaker: 'player' | 'npc', text: string): void {
    if (!this.hasResident(id)) throw new Error('Unknown resident');
    if (!text.trim() || text.length > 1000) throw new Error('Invalid utterance');
    this.record('conversation', id, [id], speaker, text, {}, speaker === 'player' ? 'reported' : 'observed', speaker === 'player' ? 'player' : id, speaker === 'player');
  }

  requestInteractionDecision(id: NpcId): NpcDecisionRequest | null {
    if (!this.hasResident(id)) return null;
    this.trigger(id, 'player-interaction');
    return this.requestDecision(id);
  }

  requestDecision(id: NpcId): NpcDecisionRequest | null {
    if (!this.hasResident(id)) return null;
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

  applyDecision(requestId: string, proposal: unknown, provenance: { mode: 'mock' | 'meta' | 'player'; model: string }): DecisionOutcome {
    const previous = this.processed.get(requestId);
    if (previous) return { ...previous, duplicate: true };
    const request = this.pending.get(requestId);
    if (!request) return { accepted: false, reason: 'unknown-request', duplicate: false };
    this.pending.delete(requestId);
    const actor = this.state.npcs[request.actorId]!;
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
    const npc = this.state.npcs[id]!;
    if (!npc.capabilities.includes(action.type)) return 'missing-capability';
    if (!this.available(id)) return 'actor-busy';
    const communicationError=validateCommunication(this.state,id,action);if(communicationError)return communicationError;
    const town = this.state.town;
    if (action.type === 'take-work') {
      const business = town?.businesses[action.businessId];
      if (!business || !Object.hasOwn(npc.knowledge.businesses ?? {},action.businessId)) return 'unknown-work';
      if (npc.node !== business.node) return 'not-at-workplace';
      if (!npc.skills?.includes(business.skill)) return 'missing-skill';
      if (!this.workAvailable(business.id)) return 'work-unavailable';
    } else if (action.type === 'rest') {
      if (!town || (npc.node !== npc.home && !npc.knowledge.placeFacts?.[npc.node]?.services.includes('scenic-view'))) return 'not-at-rest-place';
    } else if (action.type === 'eat') {
      if (!town) return 'town-economy-unavailable';
      const cargo = Object.values(this.state.tasks).filter(task=>task.recipient===id && task.status==='collected').reduce((sum,task)=>sum+task.quantity,0);
      if ((npc.inventory.food ?? 0) < action.quantity || npc.inventory.goods - cargo < action.quantity) return 'missing-personal-food';
    }
    if ('recipient' in action && !this.hasResident(action.recipient)) return 'unknown-recipient';
    if (action.type === 'encounter') {
      if (!this.canEncounter(id, action.recipient)) return 'encounter-unavailable';
      if (Object.keys(this.state.social.interactions).length >= 128) return 'interaction-capacity';
      if (action.purpose === 'request-help' && !npc.capabilities.includes('propose-transport')) return 'missing-assistance-capability';
    } else if (action.type === 'respond-encounter') {
      const encounter = this.state.social.interactions[action.interactionId];
      if (!encounter || encounter.recipient !== id) return 'wrong-encounter-recipient';
      if (encounter.status !== 'pending' || this.state.time >= encounter.expiresAt) return 'encounter-not-open';
      if (!this.nearby(id, encounter.initiator)) return 'initiator-not-nearby';
      if (!this.available(encounter.initiator)) return 'initiator-busy';
    }
    if (action.type === 'travel') {
      if (!npc.knowledge.places.includes(action.destination)) return 'unknown-place';
      if(this.map.nodes.find(node=>node.id===action.destination)?.kind==='home' && action.destination!==npc.home)return 'private-dwelling';
      if (!pathToNode(npc.node, action.destination, new Set(npc.knowledge.blockedEdges),this.map)) return 'no-known-route';
    } else if (action.type === 'propose-transport') {
      if (Object.keys(this.state.tasks).length >= 64) return 'task-capacity';
      if (!npc.knowledge.people.includes(action.recipient) || !this.nearby(id, action.recipient) && !remoteExchange(this.state,id,action.recipient)) return 'recipient-not-nearby';
      if (!this.state.npcs[action.recipient]!.capabilities.includes('fulfil-transport') || !this.state.npcs[action.recipient]!.capabilities.includes('respond-transport')) return 'recipient-cannot-transport';
      if (Object.values(this.state.tasks).some(task => task.requester === id && ['proposed', 'accepted', 'collected'].includes(task.status))) return 'existing-commitment';
      if (action.quantity > transportCapacity || this.availableSupplies() < action.quantity) return 'insufficient-supplies';
      if (town && (npc.inventory.coins ?? 0) < town.transportPayment) return 'insufficient-funds';
    } else if (action.type === 'respond-transport' || action.type === 'fulfil-transport') {
      const task = this.state.tasks[action.taskId];
      if (!task || task.recipient !== id) return 'wrong-task-recipient';
      if (action.type === 'respond-transport') {
        if (task.status !== 'proposed' || this.state.time >= task.expiresAt) return 'offer-not-open';
        if (!this.nearby(id, task.requester) && !(task.communicationId && npc.knowledge.tasks[task.id]==='proposed' && this.state.time>=task.availableAt!)) return 'requester-not-nearby';
        if (action.accept === true && Object.values(this.state.tasks).some(other => other.recipient === id && ['accepted', 'collected'].includes(other.status))) return 'existing-commitment';
        if (action.accept === true && npc.inventory.goods + task.quantity > transportCapacity) return 'carrying-capacity';
        if (action.accept === true && this.availableSupplies() < task.quantity) return 'insufficient-supplies';
        if (action.accept === true && (this.state.npcs[task.requester]!.inventory.coins ?? 0) < (task.payment ?? 0)) return 'insufficient-payer-funds';
      } else {
        if (!['accepted', 'collected'].includes(task.status)) return 'task-not-active';
        if (task.status === 'collected' && npc.inventory.goods < task.quantity) return 'missing-cargo';
        if (!pathToNode(npc.node, task.status === 'accepted' ? task.pickup : task.destination, new Set(npc.knowledge.blockedEdges),this.map)) return 'no-known-route';
      }
    } else if (action.type === 'collect-self') {
      if (npc.node !== 'centre') return 'not-at-supplier';
      if (npc.inventory.goods + action.quantity > selfCollectionCapacity) return 'carrying-capacity';
      if (this.availableSupplies() < action.quantity) return 'insufficient-supplies';
    } else if (action.type === 'stock-stall') {
      if (npc.node !== 'market') return 'not-at-market';
      if (npc.inventory.goods < action.quantity) return 'missing-goods';
      if (town && npc.inventory.goods-(npc.inventory.food ?? 0)<action.quantity) return 'missing-stall-supplies';
    } else if (action.type === 'buy') {
      const present = town ? this.marketServing(id) : this.residentIds.some(other => this.nearby(id, other) && this.state.npcs[other]!.capabilities.includes('set-sales'));
      if (npc.node !== 'market' || !present) return 'trader-not-nearby';
      if (!this.state.resources.salesOpen) return 'sales-paused';
      if (this.state.resources.marketGoods < action.quantity) return 'insufficient-stock';
      if (town && (npc.inventory.coins ?? 0) < (town.businesses.market!.owner===id ? 0 : town.marketPrice * action.quantity)) return 'insufficient-funds';
    } else if (action.type === 'set-sales') {
      if (npc.node !== 'market') return 'not-at-market';
      if (town && town.businesses.market!.owner!==id && !town.businesses.market!.staff.includes(id)) return 'not-market-operator';
    } else if (action.type === 'share') {
      if (!npc.knowledge.people.includes(action.recipient) || !this.nearby(id, action.recipient)) return 'recipient-not-nearby';
      if (!npc.memories.some(memory => memory.id === action.memoryId)) return 'unknown-memory';
    }
    return null;
  }

  private execute(id: NpcId, action: Action): void {
    const npc = this.state.npcs[id]!; npc.activity = { kind: 'idle' };
    if(executeCommunication(this.communicationHost(),id,action))return;
    if (action.type === 'encounter') { this.startEncounter(id, action); return; }
    if (action.type === 'respond-encounter') { this.respondEncounter(id, action); return; }
    if (action.type === 'take-work') {
      const town=this.state.town!, business=town.businesses[action.businessId]!;
      business.coins -= business.wage; town.rawInputs -= business.output;
      npc.activity={kind:'work',until:this.state.time+business.seconds,job:{businessId:business.id,wage:business.wage,inputs:business.output,output:business.output}};
      this.record('paid-work-started',id,[id],business.id,'Accepted funded work; wage and inputs held until completion',{wage:business.wage,output:business.output},'commitment');
      for (const witness of this.witnesses(id)) this.perceive(witness);
      return;
    }
    if (action.type === 'rest') {
      npc.activity={kind:'wait',until:this.state.time+action.seconds,resting:action.seconds};
      this.record('rest-started',id,[id],npc.node,'Chose time for rest',{seconds:action.seconds},'observed'); return;
    }
    if (action.type === 'eat') {
      npc.inventory.goods-=action.quantity; npc.inventory.food!-=action.quantity; this.state.town!.consumed+=action.quantity;
      npc.needs.food=Math.max(0,npc.needs.food-.8*action.quantity);
      this.record('food-consumed',id,this.witnesses(id),id,'Consumed personal food; goods leave inventory',{quantity:action.quantity},'outcome'); this.trigger(id,'meal-completed'); return;
    }
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
      if (this.state.town) { task.payment=this.state.town.transportPayment; task.escrow=0; }
      const remote=remoteExchange(this.state,id,action.recipient);
      if(remote){task.communicationId=remote.id;task.availableAt=this.state.time+communicationRules.textDelay;remote.taskId=task.id;}
      this.state.tasks[task.id] = task;
      for (const participant of remote?[id]:[id,task.recipient]) this.state.npcs[participant]!.knowledge.tasks[task.id] = 'proposed';
      this.record('transport-proposed', id, remote?[id]:[id, task.recipient], task.id, 'Requested help transporting supplies', { quantity: task.quantity }, 'observed');
      if(!remote)this.trigger(task.recipient, 'transport-request'); this.trigger(id, 'offer-proposed');
    } else if (action.type === 'respond-transport') {
      const task = this.state.tasks[action.taskId]!;
      if (action.accept === 'clarify') {
        task.revision++;
        this.record('transport-clarification-requested', id, task.communicationId?[id]:[id, task.requester], task.id, action.question, {}, 'reported', id, true);
        if(task.communicationId)task.clarification={message:action.question,availableAt:this.state.time+communicationRules.textDelay,notified:false};
        else this.trigger(task.requester, 'clarification-requested'); return;
      }
      task.status = action.accept ? 'accepted' : 'declined'; task.revision++;
      task.reserved = action.accept ? task.quantity : 0;
      if (action.accept === true && task.payment) { this.state.npcs[task.requester]!.inventory.coins!-=task.payment; task.escrow=task.payment; }
      for (const participant of task.communicationId?[id]:[id,task.requester]) this.state.npcs[participant]!.knowledge.tasks[task.id] = task.status;
      if(task.communicationId){task.responseAt=this.state.time+communicationRules.textDelay;task.responseNotified=false;}
      this.record(`transport-${task.status}`, id, task.communicationId?[id]:[id, task.requester], task.id, action.accept ? 'Accepted the transport commitment' : 'Declined the transport request', {}, action.accept ? 'commitment' : 'outcome');
      this.trigger(id, 'offer-resolved'); if(!task.communicationId)this.trigger(task.requester, 'offer-resolved');
    } else if (action.type === 'fulfil-transport') {
      const task = this.state.tasks[action.taskId]!;
      this.travel(id, task.status === 'accepted' ? task.pickup : task.destination, task.id, task.status === 'accepted' ? 'pickup' : 'delivery');
    } else if (action.type === 'collect-self' || action.type === 'stock-stall' || action.type === 'buy') {
      const quantity = action.quantity;
      if (action.type === 'collect-self') { this.state.resources.supplierGoods -= quantity; npc.inventory.goods += quantity; }
      if (action.type === 'stock-stall') { npc.inventory.goods -= quantity; this.state.resources.marketGoods += quantity; }
      if (action.type === 'buy') {
        this.state.resources.marketGoods -= quantity; npc.inventory.goods += quantity;
        if (this.state.town) {
          npc.inventory.food!+=quantity;
          const market=this.state.town.businesses.market!, owner=this.state.npcs[market.owner]!;
          const payment=market.owner===id ? 0 : this.state.town.marketPrice*quantity;
          npc.inventory.coins!-=payment; market.coins+=payment/2; owner.inventory.coins!+=payment/2;
          if (payment>0) owner.needs.income=Math.max(0,owner.needs.income-.1*quantity);
          this.record('purchase-paid',id,[id,market.owner],market.id,'Paid for food; proceeds split between the owner and funded stall work',{coins:payment,quantity},'outcome');
        } else npc.needs.food = Math.max(0, npc.needs.food - 0.8 * quantity);
      }
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
    const npc = this.state.npcs[id]!;
    const path = pathToNode(npc.node, destination, new Set(npc.knowledge.blockedEdges),this.map);
    if (!path) { this.fail(id, 'No route in current knowledge'); return; }
    npc.activity = { kind: 'travel', path, step: 0, progress: 0, taskId, leg };
    this.record('travel-started', id, [id], destination, 'Started validated graph travel', { taskId });
    if (!path.edgeIds.length) this.arrive(id);
  }

  private fail(id: NpcId, detail: string): void {
    this.state.npcs[id]!.activity = { kind: 'idle' };
    this.record('action-failed', id, [id], id, detail, {}, 'observed'); this.trigger(id, 'action-failed');
  }

  private arrive(id: NpcId): void {
    const npc = this.state.npcs[id]!; const activity = npc.activity;
    if (activity.kind !== 'travel') return;
    npc.activity = { kind: 'idle' };
    this.record('arrived', id, this.witnesses(id), npc.node, 'Reached a waypoint destination', {}, 'observed');
    this.perceive(id);
    for (const other of this.residentIds) if (this.nearby(id, other)) this.trigger(other, 'person-arrived');
    if (activity.taskId) this.finishLeg(id, activity.taskId, activity.leg);
    else this.trigger(id, 'activity-completed');
  }

  private finishLeg(id: NpcId, taskId: string, leg: 'pickup' | 'delivery' | null): void {
    const task = this.state.tasks[taskId]; const npc = this.state.npcs[id]!;
    if (!task || task.recipient !== id) { this.fail(id, 'Task is unavailable'); return; }
    if (leg === 'pickup') {
      if (task.status !== 'accepted' || npc.node !== task.pickup || task.reserved !== task.quantity || this.state.resources.supplierGoods < task.quantity || npc.inventory.goods + task.quantity > transportCapacity) { this.fail(id, 'Collection prerequisites changed'); return; }
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
      if (task.escrow) {
        const payment=task.escrow; npc.inventory.coins!+=payment; task.escrow=0;
        this.record('transport-paid',id,[id,task.requester],task.id,'Received the previously reserved delivery payment',{coins:payment},'outcome');
      }
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
    if (!this.map.edges.some(edge => edge.id === edgeId)) return false;
    if (this.residentIds.some(id => { const activity = this.state.npcs[id]!.activity; return activity.kind === 'travel' && activity.path.edgeIds[activity.step] === edgeId && activity.progress > 0; })) return false;
    if (this.state.roads.blockedEdges.includes(edgeId) === blocked) return false;
    this.state.roads.blockedEdges = blocked ? [...this.state.roads.blockedEdges, edgeId] : this.state.roads.blockedEdges.filter(id => id !== edgeId);
    this.state.roads.revision++;
    this.record('road-changed', null, [], edgeId, blocked ? 'Road blocked' : 'Road reopened', { blocked });
    for (const id of this.residentIds) this.perceive(id);
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
          this.state.npcs[id]!.knowledge.tasks[task.id] = 'expired'; this.state.npcs[id]!.revision++; this.trigger(id, 'offer-expired');
        }
      }
      for (const id of this.residentIds) {
        const npc = this.state.npcs[id]!; const activity = npc.activity;
        if ((activity.kind === 'wait' || activity.kind === 'work') && this.state.time >= activity.until) {
          if (activity.job) {
            const job=activity.job;
            npc.memories=npc.memories.filter(memory=>!(memory.kind==='commitment' && memory.subject===job.businessId));
            npc.inventory.coins!+=job.wage; npc.needs.income=Math.max(0,npc.needs.income-.3);
            this.state.town!.produced+=job.output; this.state.resources.supplierGoods+=job.output;
            if (job.output) this.state.resources.revision++;
            this.record('paid-work-completed',id,[id],job.businessId,'Completed physical work; received held wage and deposited any produced supplies',{wage:job.wage,quantity:job.output},'outcome');
          }
          if (activity.resting) {
            npc.needs.rest=Math.max(0,(npc.needs.rest ?? 0)-activity.resting*.01);
            this.record('rest-completed',id,[id],npc.node,'Rest reduced personal fatigue',{},'outcome');
          }
          npc.activity = { kind: 'idle' }; npc.revision++;
          this.record('activity-completed', id, [id], activity.kind, 'Selected activity finished', {}, 'observed'); this.trigger(id, 'activity-completed');
          if (this.state.town) for (const witness of this.witnesses(id)) this.perceive(witness);
        } else if (activity.kind === 'travel') {
          let distance = (npc.mobility === 'taxi' ? 14 : 4) * dt;
          while (distance > 0 && npc.activity === activity) {
            const edge = this.map.edges.find(item => item.id === activity.path.edgeIds[activity.step]);
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
      this.detectEncounters();
      if(this.state.communication)advanceCommunications(this.communicationHost());
      this.townNeeds();
    }
  }
}
