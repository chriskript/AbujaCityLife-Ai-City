import { isDecision, type Decision, type Observation } from './contracts.js';
import { destinations, edges } from '../world/neighbourhood.js';
import type { Route } from '../navigation/routes.js';

export interface CurrentWorld { revision: number; agentNode: string; blockedEdges: ReadonlySet<string> }
export type Validation = { accepted: false; reason: string } | { accepted: true; decision: Decision; route: Route | null };

export function validateDecision(value: unknown, observation: Observation, world: CurrentWorld): Validation {
  const reject = (reason: string): Validation => ({ accepted: false, reason });
  if (!isDecision(value)) return reject('invalid-schema');
  if (observation.worldRevision !== world.revision || observation.agentNode !== world.agentNode) return reject('stale-observation');
  if (value.action !== 'travel') {
    if (value.destinationId !== null || value.routeId !== null) return reject('unexpected-travel-arguments');
    return { accepted: true, decision: value, route: null };
  }
  const destination = destinations.find(item => item.id === value.destinationId);
  if (!destination || !destination.publicAccess) return reject('unavailable-destination');
  const route = observation.routeCandidates.find(item => item.id === value.routeId && item.destinationId === destination.id);
  if (!route || route.nodeIds[0] !== world.agentNode || route.nodeIds.at(-1) !== destination.nodeId) return reject('unoffered-route');
  if (route.nodeIds.length !== route.edgeIds.length + 1 || new Set(route.nodeIds).size !== route.nodeIds.length) return reject('invalid-route-shape');
  let distance = 0;
  for (let index = 0; index < route.edgeIds.length; index++) {
    const edge = edges.find(item => item.id === route.edgeIds[index]);
    const from = route.nodeIds[index];
    const to = route.nodeIds[index + 1];
    if (!edge || !((edge.from === from && edge.to === to) || (edge.to === from && edge.from === to))) return reject('disconnected-route');
    if (world.blockedEdges.has(edge.id)) return reject('blocked-route');
    distance += edge.distance;
  }
  if (!Number.isFinite(route.distance) || Math.abs(distance - route.distance) > 0.001) return reject('invalid-route-distance');
  return { accepted: true, decision: value, route: structuredClone(route) };
}
