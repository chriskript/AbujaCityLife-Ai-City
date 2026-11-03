import { edges, nodes } from '../world/neighbourhood.js';
import type { TownMap } from '../world/town-layout.js';

export interface NodePath {
  nodeIds: string[];
  edgeIds: string[];
  distance: number;
}

// Dijkstra with stable tie-breaking. Small graph: a sorted queue is sufficient.
function shortestPath(start: string, end: string, blocked: ReadonlySet<string>, graphEdges=edges): NodePath | null {
  const queue = [{ nodeIds: [start], edgeIds: [] as string[], distance: 0 }];
  const visited = new Set<string>();
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance || a.edgeIds.join('/').localeCompare(b.edgeIds.join('/')));
    const current = queue.shift()!;
    const nodeId = current.nodeIds.at(-1)!;
    if (visited.has(nodeId)) continue;
    if (nodeId === end) return current;
    visited.add(nodeId);
    for (const edge of graphEdges) {
      if (blocked.has(edge.id)) continue;
      const next = edge.from === nodeId ? edge.to : edge.to === nodeId ? edge.from : null;
      if (!next || visited.has(next)) continue;
      queue.push({ nodeIds: [...current.nodeIds, next], edgeIds: [...current.edgeIds, edge.id], distance: current.distance + edge.distance });
    }
  }
  return null;
}

// Node routing for inhabitants across current and legacy maps.
export function pathToNode(start: string, end: string, blocked: ReadonlySet<string>,map?:TownMap): NodePath | null {
  if (![start, end].every(id => (map?.nodes ?? nodes).some(node => node.id === id))) return null;
  return shortestPath(start, end, blocked,map?.edges ?? edges);
}
