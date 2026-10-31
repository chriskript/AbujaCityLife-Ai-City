import type { PlaceFacts, PlaceKnowledge } from './knowledge.js';
import type { MapId } from '../world/town-layout.js';
export const legacyNpcIds = ['musa', 'amina', 'zainab'] as const;
// Legacy fixture IDs are retained for compatibility; runtime membership is world-owned.
export type NpcId = string;
export const actionTypes = ['travel', 'wait', 'work', 'propose-transport', 'respond-transport', 'fulfil-transport', 'collect-self', 'stock-stall', 'buy', 'set-sales', 'share', 'encounter', 'respond-encounter', 'take-work', 'rest', 'eat', 'offer-contact', 'communicate', 'respond-communication', 'end-call'] as const;
export type MemoryKind = 'fact' | 'observed' | 'reported' | 'belief' | 'commitment' | 'outcome';
export interface Memory {
  id: string; kind: MemoryKind; eventId: string; source: NpcId | 'world' | 'player';
  subject: string; detail: string; time: number; certainty: 'certain' | 'uncertain';
}
export interface Path { nodeIds: string[]; edgeIds: string[]; distance: number }
export type Activity =
  | { kind: 'idle' }
  | { kind: 'wait' | 'work'; until: number; resting?: number; job?: WorkBooking }
  | { kind: 'travel'; path: Path; step: number; progress: number; taskId: string | null; leg: 'pickup' | 'delivery' | null };
export interface Inhabitant {
  id: NpcId; name: string; occupation: string; personality: string[];
  home?: string; circumstances?: string; mobility?: 'walk' | 'taxi';
  skills?: string[]; routine?: { workplace: string; leisure: string; sociability: number };
  node: string; revision: number; goals: { id: string; description: string }[];
  intention: { goalId: string; reason: string } | null;
  needs: { food: number; stock: number; income: number; rest?: number };
  priorities: string[]; capabilities: Action['type'][];
  activity: Activity; inventory: { goods: number; rewards: number; coins?: number; food?: number };
  knowledge: {
    places: string[]; people: NpcId[]; blockedEdges: string[];
    transporters?: NpcId[];
    contacts?: NpcId[];
    sharedContacts?: NpcId[];
    businesses?: Record<string, { available: boolean | null; observedAt: number | null; siteNode?:string }>;
    placeFacts?: Record<string, PlaceFacts>;
    tasks: Record<string, TaskStatus>;
    resources: { supplierGoods: number | null; marketGoods: number | null; salesOpen: boolean | null };
  };
  relationships: Partial<Record<NpcId, { successfulJobs: number }>>;
  memories: Memory[];
}
export type TaskStatus = 'proposed' | 'accepted' | 'declined' | 'collected' | 'delivered' | 'expired';
export interface TransportTask {
  id: string; revision: number; requester: NpcId; recipient: NpcId;
  quantity: number; pickup: 'centre'; destination: 'market'; status: TaskStatus;
  expiresAt: number; reserved: number; rewardPaid: boolean;
  payment?: number; escrow?: number;
  communicationId?: string; availableAt?: number; responseAt?: number; responseNotified?: boolean;
  clarification?: {message:string;availableAt:number;notified:boolean};
}
export interface WorldEvent {
  id: string; revision: number; time: number; type: string;
  actor: NpcId | null; audience: NpcId[]; subject: string; detail: string;
  data: Record<string, string | number | boolean | null>;
}
export interface WorldState {
  version: 4; mapId:MapId; mapUpgradedAt?:number; id: string; revision: number; time: number;
  // The original residents remain required for the preserved supply scenario.
  npcs: Record<NpcId, Inhabitant> & { musa: Inhabitant; amina: Inhabitant; zainab: Inhabitant };
  initialGoods: number;
  town?: TownEconomy;
  communication?: { nextId: number; threads: Record<string, Communication>; cooldowns: Record<string, number> };
  social: { nextInteraction: number; interactions: Record<string, Encounter>; noticed: Record<string, number>; cooldowns: Record<string, number> };
  resources: { supplierGoods: number; marketGoods: number; salesOpen: boolean; revision: number };
  roads: { blockedEdges: string[]; revision: number };
  tasks: Record<string, TransportTask>; events: WorldEvent[];
  triggers: Partial<Record<NpcId, string[]>>;
  nextEvent: number; nextTask: number; nextRequest: number;
}
export type Action =
  | { type: 'offer-contact'; recipient: NpcId }
  | { type: 'communicate'; recipient: NpcId; channel: 'text' | 'call'; purpose: 'chat' | 'request-help'; message: string; memoryId: string | null }
  | { type: 'respond-communication'; communicationId: string; response: 'accept' | 'decline' | 'defer' | 'clarify' | 'ignore'; message: string; memoryId: string | null }
  | { type: 'end-call'; communicationId: string }
  | { type: 'take-work'; businessId: string }
  | { type: 'rest'; seconds: number }
  | { type: 'eat'; quantity: number }
  | { type: 'encounter'; recipient: NpcId; purpose: 'introduce' | 'ask' | 'request-help'; message: string }
  | { type: 'respond-encounter'; interactionId: string; response: 'accept' | 'decline' | 'defer' | 'clarify'; message: string }
  | { type: 'travel'; destination: string }
  | { type: 'wait' | 'work'; seconds: number }
  | { type: 'propose-transport'; recipient: NpcId; quantity: number }
  | { type: 'respond-transport'; taskId: string; accept: boolean }
  | { type: 'respond-transport'; taskId: string; accept: 'clarify'; question: string }
  | { type: 'fulfil-transport'; taskId: string }
  | { type: 'collect-self' | 'stock-stall' | 'buy'; quantity: number }
  | { type: 'set-sales'; open: boolean }
  | { type: 'share'; recipient: NpcId; memoryId: string; asBelief: boolean };
export interface NpcDecision { goalId: string; reason: string; action: Action }
export interface Encounter {
  id: string; initiator: NpcId; recipient: NpcId; purpose: 'introduce' | 'ask' | 'request-help';
  message: string; response: string | null; status: 'pending' | 'accepted' | 'declined' | 'deferred' | 'clarified' | 'expired';
  createdAt: number; expiresAt: number;
}
export interface NpcObservation {
  mapId:MapId;
  actor: Inhabitant; time: number;
  places: { id: string; node: string; name: string }[];
  placeKnowledge: PlaceKnowledge[];
  memoryEvidence: { id: string; interpretation: 'established-fact' | 'observed-world-event' | 'speech-only' | 'unverified-report' | 'uncertain-belief' | 'commitment' | 'verified-outcome' }[];
  nearbyPeople: { id: NpcId; name: string | null; occupation: string | null; activity: Activity['kind']; known: boolean; canTransport: boolean }[];
  encounters: Encounter[];
  encounterOpportunities: NpcId[];
  communication?: { contacts: { id: NpcId; name: string; canTransport: boolean }[]; threads: Communication[]; canContact: NpcId[]; canCall: NpcId[]; contactOffers: NpcId[]; rules: {textDelay:number;callLifetime:number;textLifetime:number;cooldown:number;maximumThreads:number;maximumPending:number} };
  town?: {
    marketPrice: number; ownsMarket: boolean; transportPayment: number; marketServing: boolean | null;
    work: { id: string; name: string; node: string; skill: string; wage: number; seconds: number; available: boolean | null; observedAt: number | null }[];
  };
  resources: { supplierGoods: number | null; marketGoods: number | null; salesOpen: boolean | null };
  tasks: Pick<TransportTask, 'id' | 'requester' | 'recipient' | 'quantity' | 'pickup' | 'destination' | 'status' | 'expiresAt' | 'communicationId'>[]; knownBlockedEdges: string[];
  permittedActions: Action['type'][];
  // Public action rules and the actor's own capacity, never another NPC's private state.
  // Bounds describe valid proposals; current stock, location and task checks still apply.
  actionConstraints: Partial<Record<Action['type'], {
    quantity?: { minimum: number; maximum: number };
    carryingCapacity?: number; remainingCarryingCapacity?: number;
  }>>;
}
export interface Communication {
  id: string; initiator: NpcId; recipient: NpcId; channel: 'text' | 'call'; purpose: 'chat' | 'request-help';
  message: string; report: { subject: string; detail: string } | null;
  response: 'accept' | 'decline' | 'defer' | 'clarify' | 'ignore' | null; reply: string | null;
  replyReport: { subject: string; detail: string } | null;
  status: 'queued' | 'pending' | 'connected' | 'accepted' | 'declined' | 'deferred' | 'clarified' | 'ignored' | 'missed' | 'expired' | 'ended';
  createdAt: number; availableAt: number; expiresAt: number; delivered: boolean;
  responseAt: number | null; responseNotified: boolean;
  taskId: string | null;
}
export interface NpcDecisionRequest {
  id: string; worldId: string; actorId: NpcId; actorRevision: number;
  worldRevision: number; observation: NpcObservation; triggers: string[];
}
export interface NpcInferenceResult { mode: 'mock' | 'meta'; model: string; decision: unknown }
export interface NpcDecisionProvider { decide(request: NpcDecisionRequest): Promise<NpcInferenceResult> }
export interface DecisionOutcome { accepted: boolean; reason: string; duplicate: boolean }
export interface WorkBooking { businessId: string; wage: number; inputs: number; output: number; siteNode?:string }
export interface Business {
  id: string; name: string; node: string; owner: NpcId; staff: NpcId[]; coins: number;
  skill: string; wage: number; seconds: number; slots: number; output: number;
}
export interface TownEconomy {
  businesses: Record<string, Business>; initialMoney: number; initialInputs: number; rawInputs: number;
  produced: number; consumed: number; nextNeedsAt: number;
  marketPrice: number; transportPayment: number; supplierCapacity: number;
}
