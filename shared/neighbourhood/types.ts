export const npcIds = ['musa', 'amina', 'zainab'] as const;
export type NpcId = typeof npcIds[number];
export type MemoryKind = 'fact' | 'observed' | 'reported' | 'belief' | 'commitment' | 'outcome';
export interface Memory {
  id: string; kind: MemoryKind; eventId: string; source: NpcId | 'world';
  subject: string; detail: string; time: number; certainty: 'certain' | 'uncertain';
}
export interface Path { nodeIds: string[]; edgeIds: string[]; distance: number }
export type Activity =
  | { kind: 'idle' }
  | { kind: 'wait' | 'work'; until: number }
  | { kind: 'travel'; path: Path; step: number; progress: number; taskId: string | null; leg: 'pickup' | 'delivery' | null };
export interface Inhabitant {
  id: NpcId; name: string; occupation: string; personality: string[];
  node: string; revision: number; goals: { id: string; description: string }[];
  intention: { goalId: string; reason: string } | null;
  needs: { food: number; stock: number; income: number };
  priorities: string[]; capabilities: Action['type'][];
  activity: Activity; inventory: { goods: number; rewards: number };
  knowledge: {
    places: string[]; people: NpcId[]; blockedEdges: string[];
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
}
export interface WorldEvent {
  id: string; revision: number; time: number; type: string;
  actor: NpcId | null; audience: NpcId[]; subject: string; detail: string;
  data: Record<string, string | number | boolean | null>;
}
export interface WorldState {
  version: 1; id: string; revision: number; time: number;
  npcs: Record<NpcId, Inhabitant>;
  resources: { supplierGoods: number; marketGoods: number; salesOpen: boolean; revision: number };
  roads: { blockedEdges: string[]; revision: number };
  tasks: Record<string, TransportTask>; events: WorldEvent[];
  triggers: Partial<Record<NpcId, string[]>>;
  nextEvent: number; nextTask: number; nextRequest: number;
}
export type Action =
  | { type: 'travel'; destination: string }
  | { type: 'wait' | 'work'; seconds: number }
  | { type: 'propose-transport'; recipient: NpcId; quantity: number }
  | { type: 'respond-transport'; taskId: string; accept: boolean }
  | { type: 'fulfil-transport'; taskId: string }
  | { type: 'collect-self' | 'stock-stall' | 'buy'; quantity: number }
  | { type: 'set-sales'; open: boolean }
  | { type: 'share'; recipient: NpcId; memoryId: string; asBelief: boolean };
export interface NpcDecision { goalId: string; reason: string; action: Action }
export interface NpcObservation {
  actor: Inhabitant; time: number;
  places: { id: string; node: string; name: string }[];
  nearbyPeople: { id: NpcId; name: string; occupation: string; activity: Activity['kind'] }[];
  resources: { supplierGoods: number | null; marketGoods: number | null; salesOpen: boolean | null };
  tasks: Pick<TransportTask, 'id' | 'requester' | 'recipient' | 'quantity' | 'pickup' | 'destination' | 'status' | 'expiresAt'>[]; knownBlockedEdges: string[];
  permittedActions: Action['type'][];
}
export interface NpcDecisionRequest {
  id: string; worldId: string; actorId: NpcId; actorRevision: number;
  worldRevision: number; observation: NpcObservation; triggers: string[];
}
export interface NpcInferenceResult { mode: 'mock' | 'meta'; model: string; decision: unknown }
export interface NpcDecisionProvider { decide(request: NpcDecisionRequest): Promise<NpcInferenceResult> }
export interface DecisionOutcome { accepted: boolean; reason: string; duplicate: boolean }
