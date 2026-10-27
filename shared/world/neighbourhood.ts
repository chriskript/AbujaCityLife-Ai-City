export interface RoadNode { id: string; x: number; z: number }
export interface RoadEdge { id: string; from: string; to: string; distance: number }
export interface Destination {
  id: string;
  name: string;
  nodeId: string;
  publicAccess: boolean;
  tags: readonly string[];
}

// Original fictional geometry authored for this hackathon. Distances are metres.
export const nodes: readonly RoadNode[] = [
  { id: 'stand', x: 0, z: 0 },
  { id: 'west', x: 0, z: 40 },
  { id: 'market', x: 40, z: 40 },
  { id: 'centre', x: 40, z: 0 },
  { id: 'junction', x: 80, z: 0 },
  { id: 'bridge', x: 80, z: 40 },
  { id: 'overlook', x: 100, z: 40 },
  { id: 'hill', x: 160, z: 80 },
];

const connections = [
  ['stand-centre', 'stand', 'centre'],
  ['stand-west', 'stand', 'west'],
  ['west-market', 'west', 'market'],
  ['centre-market', 'centre', 'market'],
  ['centre-junction', 'centre', 'junction'],
  ['junction-bridge', 'junction', 'bridge'],
  ['market-bridge', 'market', 'bridge'],
  ['bridge-overlook', 'bridge', 'overlook'],
  ['junction-hill', 'junction', 'hill'],
  ['hill-overlook', 'hill', 'overlook'],
] as const;

export const edges: readonly RoadEdge[] = connections.map(([id, from, to]) => {
  const a = nodes.find(node => node.id === from)!;
  const b = nodes.find(node => node.id === to)!;
  return { id, from, to, distance: Math.hypot(b.x - a.x, b.z - a.z) };
});

export const destinations: readonly Destination[] = [
  { id: 'lake-overlook', name: 'Lake Overlook', nodeId: 'overlook', publicAccess: true, tags: ['lake-view', 'scenic'] },
  { id: 'hill-garden', name: 'Hill Garden', nodeId: 'hill', publicAccess: true, tags: ['lake-view', 'scenic', 'garden'] },
  { id: 'market-square', name: 'Market Square', nodeId: 'market', publicAccess: true, tags: ['market', 'shopping'] },
  { id: 'community-centre', name: 'Community Centre', nodeId: 'centre', publicAccess: true, tags: ['community', 'services'] },
];
