import { legacyNpcIds, type WorldState, type Inhabitant, type NpcId } from './types.js';
import { initialPlaceFacts } from './knowledge.js';

export const places = [
  { id: 'stand', node: 'stand', name: 'Taxi Stand' },
  { id: 'market', node: 'market', name: 'Market Square' },
  { id: 'centre', node: 'centre', name: 'Community Centre supply desk' },
  { id: 'overlook', node: 'overlook', name: 'Lake Overlook' },
  { id: 'hill', node: 'hill', name: 'Hill Garden' },
] as const;

function inhabitant(id: NpcId): Inhabitant {
  const common = {
    id, revision: 0, intention: null, activity: { kind: 'idle' } as const,
    inventory: { goods: 0, rewards: 0 }, relationships: {}, memories: [],
  };
  if (id === 'musa') return {
    ...common, name: 'Musa', occupation: 'Taxi driver', node: 'stand',
    personality: ['practical', 'values reliable work', 'willing to decline unsuitable jobs'],
    goals: [{ id: 'earn', description: 'Earn through useful transport work' }, { id: 'rest', description: 'Rest when work is unsuitable' }],
    needs: { food: 0, stock: 0, income: 0.8 }, priorities: ['honour accepted jobs', 'earn income', 'avoid overload'],
    capabilities: ['travel', 'wait', 'work', 'respond-transport', 'fulfil-transport', 'share'],
    knowledge: { places: places.map(place => place.id), placeFacts: initialPlaceFacts(places.map(place => place.id)), people: ['amina'], blockedEdges: [], tasks: {}, resources: { supplierGoods: null, marketGoods: null, salesOpen: null } },
  };
  if (id === 'amina') return {
    ...common, name: 'Amina', occupation: 'Market trader', node: 'market',
    personality: ['careful with stock', 'resourceful', 'values dependable assistance'],
    goals: [{ id: 'restock', description: 'Maintain enough stock to serve customers' }, { id: 'serve', description: 'Serve customers at the stall' }],
    needs: { food: 0, stock: 0.8, income: 0.4 }, priorities: ['avoid empty stock', 'serve customers', 'use available help'],
    capabilities: ['travel', 'wait', 'work', 'propose-transport', 'collect-self', 'stock-stall', 'set-sales', 'share'],
    knowledge: { places: ['stand', 'market', 'centre'], placeFacts: initialPlaceFacts(['stand','market','centre']), people: ['musa', 'zainab'], blockedEdges: [], tasks: {}, resources: { supplierGoods: null, marketGoods: null, salesOpen: null } },
  };
  return {
    ...common, name: 'Zainab', occupation: 'Local resident', node: 'centre',
    personality: ['sociable', 'curious', 'admits uncertainty'],
    goals: [{ id: 'food', description: 'Find something to eat' }, { id: 'errands', description: 'Continue local errands' }],
    needs: { food: 0.8, stock: 0, income: 0 }, priorities: ['find food', 'continue errands'],
    capabilities: ['travel', 'wait', 'work', 'buy', 'share'],
    knowledge: { places: ['market', 'centre'], placeFacts: initialPlaceFacts(['market','centre']), people: ['amina'], blockedEdges: [], tasks: {}, resources: { supplierGoods: null, marketGoods: null, salesOpen: null } },
  };
}

export const maximumResidents = 32;
export function legacyResidents(): Inhabitant[] {
  return legacyNpcIds.map(id => {
    const resident = inhabitant(id);
    return { ...resident, mobility: id === 'musa' ? 'taxi' : 'walk',
      knowledge: { ...resident.knowledge, transporters: resident.knowledge.people.includes('musa') ? ['musa'] : [] },
      capabilities: [...resident.capabilities, 'encounter', 'respond-encounter'] };
  });
}
export function chrisResident(): Inhabitant {
  return {
    id: 'chris', name: 'Chris', occupation: 'Repair apprentice and supply courier',
    personality: ['new to the neighbourhood', 'curious about local work', 'protects time for paid jobs'],
    node: 'centre', home: 'hill', mobility: 'walk', circumstances: 'Renting a room near Hill Garden; knows Musa from a taxi ride, but has not met the market trader. Visiting the supply desk and seeking useful paid work before returning to repairs.',
    revision: 0, intention: null, activity: { kind: 'idle' }, inventory: { goods: 0, rewards: 0 },
    goals: [{ id: 'earn', description: 'Find useful local transport work' }, { id: 'errands', description: 'Meet neighbours and continue repair errands' }],
    needs: { food: 0, stock: 0, income: 0.7 }, priorities: ['honour accepted work', 'find work', 'meet local people'],
    capabilities: ['travel', 'wait', 'work', 'respond-transport', 'fulfil-transport', 'share', 'encounter', 'respond-encounter'],
    knowledge: { places: ['hill', 'centre', 'market', 'stand'], placeFacts: initialPlaceFacts(['hill','centre','market','stand']), people: ['musa'], transporters: ['musa'], blockedEdges: [], tasks: {}, resources: { supplierGoods: null, marketGoods: null, salesOpen: null } },
    relationships: { musa: { successfulJobs: 0 } }, memories: [],
  };
}
export function defaultResidents(): Inhabitant[] { return [...legacyResidents(), chrisResident()]; }

export function initialState(id: string, residents = defaultResidents()): WorldState {
  return {
    version: 2, id, revision: 0, time: 0, initialGoods: 9 + residents.reduce((sum, npc) => sum + npc.inventory.goods, 0),
    social: { nextInteraction: 1, interactions: {}, noticed: {}, cooldowns: {} },
    npcs: Object.fromEntries(residents.map(npc => [npc.id, structuredClone(npc)])) as WorldState['npcs'],
    resources: { supplierGoods: 8, marketGoods: 1, salesOpen: true, revision: 0 },
    roads: { blockedEdges: [], revision: 0 }, tasks: {}, events: [], triggers: {},
    nextEvent: 1, nextTask: 1, nextRequest: 1,
  };
}
