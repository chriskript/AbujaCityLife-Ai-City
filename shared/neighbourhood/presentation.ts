import { edges, nodes } from '../world/neighbourhood.js';
import { type NpcId, type WorldState, type WorldEvent, type TaskStatus, type Encounter } from './types.js';
import { places } from './initial-state.js';

export interface ActorView {
  id: NpcId; name: string; occupation: string; node: string;
  pose: { x: number; z: number; heading: number };
  moving: boolean; activity: string; intention: string | null; goods: number; rewards: number;
  mobility: 'walk' | 'taxi';
  coins?: number; food?: number;
}
export interface PublicTask { id: string; requester: NpcId; recipient: NpcId; quantity: number; status: TaskStatus }
export type ObservableEvent = Pick<WorldEvent, 'id' | 'time' | 'type' | 'actor' | 'subject' | 'detail' | 'data'>;
export interface NeighbourhoodView {
  worldId: string; revision: number; time: number; actors: ActorView[];
  resources: { supplierGoods: number; marketGoods: number; salesOpen: boolean };
  tasks: PublicTask[]; blockedEdges: string[];
  encounters: Pick<Encounter,'id' | 'initiator' | 'recipient' | 'purpose' | 'status' | 'createdAt'>[];
  economy?: { population: number; produced: number; consumed: number; rawInputs: number; activeJobs: number; initialMoney: number };
}
// Observer transport contract, deliberately distinct from persistence and NPC observations.
export interface NeighbourhoodFrame {
  version: 1; sessionId: string; sequence: number; mode: 'mock' | 'live-meta';
  paused: boolean; speed: 1 | 2 | 4; conversationAvailable: boolean;
  decisionBudget: { used: number; limit: number };
  progression?: { used: number; limit: number; stopped: boolean };
  snapshot: NeighbourhoodView; events: ObservableEvent[]; eventCursor: string | null;
}
export type Experiment = 'cooperate' | 'decline' | 'wait' | 'self-collect' | 'reduce-sales';
export type SessionCommand = { id: string; worldId: string } & (
  | { type: 'pause'; paused: boolean }
  | { type: 'speed'; speed: 1 | 2 | 4 }
  | { type: 'reset'; experiment: Experiment }
  | { type: 'road'; edgeId: string; blocked: boolean }
);
export interface CommandReceipt { accepted: boolean; reason: string }
export interface NeighbourhoodSession {
  subscribe(listener: (frame: NeighbourhoodFrame) => void): () => void;
  send(command: SessionCommand): Promise<CommandReceipt>;
  // Local mock clock driver; a remote adapter receives authoritative frames instead.
  update(realSeconds: number): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

const observableTypes = new Set([
  'activity-started', 'activity-completed', 'arrived', 'transport-proposed', 'transport-accepted',
  'transport-declined', 'transport-collected', 'transport-delivered', 'delivery-observed', 'buy', 'transport-clarification-requested',
  'collect-self', 'stock-stall', 'sales-changed', 'action-failed', 'offer-expired', 'road-changed', 'road-observed', 'action-validated', 'action-proposed', 'intention-selected', 'inference-unavailable',
  'encounter-noticed', 'encounter-invited', 'encounter-accepted', 'encounter-declined', 'encounter-deferred', 'encounter-clarified', 'encounter-expired', 'resident-introduced', 'information-shared',
  'paid-work-started','paid-work-completed','purchase-paid','food-consumed','rest-started','rest-completed','transport-paid',
]);

export function projectNeighbourhood(state: WorldState): { snapshot: NeighbourhoodView; events: ObservableEvent[]; eventCursor: string | null } {
  const actors = Object.keys(state.npcs).map(id => {
    const npc = state.npcs[id]!; const node = nodes.find(item => item.id === npc.node)!;
    const pose = { x: node.x, z: node.z, heading: Math.PI / 2 };
    const motion = npc.activity;
    let activity = motion.kind === 'idle' ? 'Between activities' : motion.kind === 'wait' ? 'Waiting' : motion.kind === 'work' ? npc.capabilities.includes('set-sales') ? 'Working at the stall' : npc.mobility === 'taxi' ? 'Taking care of the taxi' : 'Continuing local errands' : 'Travelling';
    if ((motion.kind==='wait' || motion.kind==='work') && motion.resting) activity='Resting';
    if (motion.kind==='work' && motion.job) activity=`Working at ${state.town!.businesses[motion.job.businessId]!.name} · ${motion.job.wage} demo credits on completion`;
    if (motion.kind === 'travel') {
      const next = nodes.find(item => item.id === motion.path.nodeIds[motion.step + 1])!;
      const edge = edges.find(item => item.id === motion.path.edgeIds[motion.step])!;
      const fraction = Math.min(1, motion.progress / edge.distance);
      pose.x += (next.x - node.x) * fraction; pose.z += (next.z - node.z) * fraction;
      pose.heading = Math.atan2(next.x - node.x, next.z - node.z);
      activity = motion.leg === 'pickup' ? 'Travelling to collect supplies' : motion.leg === 'delivery' ? 'Transporting goods to the market' : npc.mobility === 'taxi' ? 'Driving through the neighbourhood' : `Walking to ${places.find(place=>place.id===motion.path.nodeIds.at(-1))?.name ?? motion.path.nodeIds.at(-1)}`;
    }
    return { id, name: npc.name, occupation: npc.occupation, node: npc.node, pose, mobility: npc.mobility ?? 'walk',
      moving: motion.kind === 'travel', activity,
      intention: npc.goals.find(goal => goal.id === npc.intention?.goalId)?.description ?? null,
      goods: npc.inventory.goods, rewards: npc.inventory.rewards,
      ...(state.town ? {coins:npc.inventory.coins!,food:npc.inventory.food!} : {}),
    };
  });
  return {
    snapshot: { worldId: state.id, revision: state.revision, time: state.time, actors,
      resources: { supplierGoods: state.resources.supplierGoods, marketGoods: state.resources.marketGoods, salesOpen: state.resources.salesOpen },
      tasks: Object.values(state.tasks).map(({ id, requester, recipient, quantity, status }) => ({ id, requester, recipient, quantity, status })),
      encounters: Object.values(state.social.interactions).slice(-16).map(({id,initiator,recipient,purpose,status,createdAt}) => ({id,initiator,recipient,purpose,status,createdAt})),
      blockedEdges: [...state.roads.blockedEdges],
      ...(state.town ? {economy:{population:actors.length,produced:state.town.produced,consumed:state.town.consumed,rawInputs:state.town.rawInputs,initialMoney:state.town.initialMoney,
        activeJobs:Object.values(state.npcs).filter(npc=>npc.activity.kind==='work' && npc.activity.job).length}} : {}),
    },
    events: state.events.filter(event => observableTypes.has(event.type)).slice(-64).map(({ id, time, type, actor, subject, detail, data }) => ({ id, time, type, actor, subject, detail, data: { ...data } })),
    eventCursor: state.events.at(-1)?.id ?? null,
  };
}

// Repeated or out-of-order network frames cannot rewind the visible world.
export class PresentationStore {
  private current: NeighbourhoodFrame | null = null;
  accept(frame: NeighbourhoodFrame): boolean {
    if (frame.version !== 1 || !Number.isSafeInteger(frame.sequence) || frame.sequence < 1) return false;
    if (this.current && (frame.sessionId !== this.current.sessionId || frame.sequence <= this.current.sequence)) return false;
    if (this.current?.snapshot.worldId === frame.snapshot.worldId && (frame.snapshot.revision < this.current.snapshot.revision || frame.snapshot.time < this.current.snapshot.time)) return false;
    this.current = structuredClone(frame); return true;
  }
  get frame(): NeighbourhoodFrame | null { return this.current ? structuredClone(this.current) : null; }
}
