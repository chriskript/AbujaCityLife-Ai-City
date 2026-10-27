import { destinations, edges, nodes } from '../world/neighbourhood.js';

export interface Route {
  id: string;
  destinationId: string;
  nodeIds: string[];
  edgeIds: string[];
  distance: number;
}

// Dijkstra with stable tie-breaking. Small graph: a sorted queue is sufficient.
function shortestPath(start: string, end: string, blocked: ReadonlySet<string>): Omit<Route, 'id' | 'destinationId'> | null {
  const queue = [{ nodeIds: [start], edgeIds: [] as string[], distance: 0 }];
  const visited = new Set<string>();
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance || a.edgeIds.join('/').localeCompare(b.edgeIds.join('/')));
    const current = queue.shift()!;
    const nodeId = current.nodeIds.at(-1)!;
    if (visited.has(nodeId)) continue;
    if (nodeId === end) return current;
    visited.add(nodeId);
    for (const edge of edges) {
      if (blocked.has(edge.id)) continue;
      const next = edge.from === nodeId ? edge.to : edge.to === nodeId ? edge.from : null;
      if (!next || visited.has(next)) continue;
      queue.push({ nodeIds: [...current.nodeIds, next], edgeIds: [...current.edgeIds, edge.id], distance: current.distance + edge.distance });
    }
  }
  return null;
}

export function routeCandidates(start: string, blocked: ReadonlySet<string>): Route[] {
  if (!nodes.some(node => node.id === start)) throw new Error('Unknown start node');
  const routes: Route[] = [];
  for (const destination of destinations) {
    const first = shortestPath(start, destination.nodeId, blocked);
    if (!first) continue;
    const alternatives = [first];
    // Offer one shortest detour by excluding each edge of the primary route.
    for (const edgeId of first.edgeIds) {
      const alternative = shortestPath(start, destination.nodeId, new Set([...blocked, edgeId]));
      if (alternative && !alternatives.some(route => route.edgeIds.join('/') === alternative.edgeIds.join('/'))) alternatives.push(alternative);
    }
    alternatives.sort((a, b) => a.distance - b.distance || a.edgeIds.join('/').localeCompare(b.edgeIds.join('/')));
    for (const path of alternatives.slice(0, 2)) {
      routes.push({ ...path, destinationId: destination.id, id: `${destination.id}:${path.edgeIds.join('/') || 'here'}` });
    }
  }
  return routes;
}
