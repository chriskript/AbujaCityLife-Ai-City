import type { Inhabitant, WorldEvent } from './types.js';
import { townMap } from '../world/town-layout.js';

export type ServiceId = 'food-retail' | 'stock-collection' | 'taxi-pickup' | 'scenic-view';
export type ProductId = 'food-portion' | 'stall-supplies';
export interface PlaceFacts { services: ServiceId[]; products: ProductId[]; source: 'established'; complete: boolean }
// World definitions, never a substitute for what a particular inhabitant knows.
export const placeCatalogue: Record<string, PlaceFacts> = {
  ...Object.fromEntries(townMap.places.map(place=>[place.id,{services:place.id==='town-green'?['scenic-view'] as ServiceId[]:[],products:[],source:'established' as const,complete:true}])),
  market: { services: ['food-retail'], products: ['food-portion'], source: 'established', complete: true },
  centre: { services: ['stock-collection'], products: ['stall-supplies'], source: 'established', complete: true },
  stand: { services: ['taxi-pickup'], products: [], source: 'established', complete: true },
  overlook: { services: ['scenic-view'], products: [], source: 'established', complete: true },
  hill: { services: ['scenic-view'], products: [], source: 'established', complete: true },
};
export function initialPlaceFacts(ids: readonly string[]): Record<string, PlaceFacts> {
  return Object.fromEntries(ids.map(id => [id, structuredClone(placeCatalogue[id]!)]));
}
export interface KnownAvailability<T> {
  value: T | null; source: 'observed' | 'unknown'; observedAt: number | null;
  evidenceId: string | null; freshness: 'current' | 'historical' | 'unknown';
}
export interface PlaceKnowledge {
  placeId: string; facts: PlaceFacts | null; factEvidenceId: string | null;
  stock: KnownAvailability<number>; salesOpen: KnownAvailability<boolean>;
}
export function projectPlaceKnowledge(npc: Inhabitant, events: WorldEvent[], time: number): PlaceKnowledge[] {
  function availability<T>(place: string, eventType: string, key: string, value: T | null): KnownAvailability<T> {
    const memories = npc.memories.filter(memory => memory.kind === 'observed' && memory.source === 'world' && memory.subject === place);
    const memory = [...memories].reverse().find(item => {
      const event = events.find(event => event.id === item.eventId);
      return event?.type === eventType && event.data[key] === value;
    });
    if (!memory || value === null) return { value: null, source: 'unknown', observedAt: null, evidenceId: null, freshness: 'unknown' };
    // Conservative: only evidence from this exact simulation instant is current.
    return { value, source: 'observed', observedAt: memory.time, evidenceId: memory.id, freshness: memory.time === time ? 'current' : 'historical' };
  }
  return npc.knowledge.places.map(placeId => {
    const facts = npc.knowledge.placeFacts?.[placeId] ?? null;
    return { placeId, facts, factEvidenceId: facts ? `place-facts:${placeId}` : null,
      stock: placeId === 'market' ? availability(placeId, 'stock-observed', 'quantity', npc.knowledge.resources.marketGoods) : placeId === 'centre' ? availability(placeId, 'supplies-observed', 'quantity', npc.knowledge.resources.supplierGoods) : { value: null, source: 'unknown', observedAt: null, evidenceId: null, freshness: 'unknown' },
      salesOpen: placeId === 'market' ? availability(placeId, 'stock-observed', 'salesOpen', npc.knowledge.resources.salesOpen) : { value: null, source: 'unknown', observedAt: null, evidenceId: null, freshness: 'unknown' } };
  });
}
