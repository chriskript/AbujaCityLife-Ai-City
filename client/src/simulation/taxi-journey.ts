import { TaxiAgent } from '../../../shared/agent/taxi-agent.js';
import type { InferenceProvider } from '../../../shared/agent/contracts.js';
import { nodes, edges } from '../../../shared/world/neighbourhood.js';

export interface TaxiPose { x: number; z: number; heading: number }
interface Segment { edgeId: string; from: { x: number; z: number }; to: { x: number; z: number }; distance: number; progress: number }

export class TaxiJourney {
  readonly agent: TaxiAgent;
  readonly pose: TaxiPose = { x: 0, z: 0, heading: Math.PI / 2 };
  paused = false;
  autoClosure = false;
  readonly blockedEdges = new Set<string>();
  private segment: Segment | null = null;
  private interruptionWait = 0;
  private disposed = false;
  constructor(provider: InferenceProvider, private readonly speed = 14) { this.agent = new TaxiAgent(provider); }

  async start(goal: string, scenarioId: string, autoClosure = false): Promise<void> {
    if (this.disposed) return;
    this.reset(); this.autoClosure = autoClosure;
    await this.agent.start(goal, scenarioId);
  }

  reset(): void {
    this.segment = null; this.blockedEdges.clear(); this.paused = false;
    this.autoClosure = false; this.interruptionWait = 0;
    Object.assign(this.pose, { x: 0, z: 0, heading: Math.PI / 2 });
    this.agent.reset();
  }

  get occupyingShortcut(): boolean { return this.segment?.edgeId === 'bridge-overlook'; }
  closeShortcut(): boolean {
    if (this.disposed || this.occupyingShortcut || this.blockedEdges.has('bridge-overlook')) return false;
    this.blockedEdges.add('bridge-overlook'); this.agent.closeRoad('bridge-overlook');
    return true;
  }

  tick(seconds: number): void {
    if (this.disposed || this.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    const dt = Math.min(seconds, 0.05); // No teleport after a hidden/background tab.
    if (this.agent.status === 'interrupted') {
      this.interruptionWait += dt;
      if (this.interruptionWait >= 0.85) { this.interruptionWait = 0; void this.agent.replan(); }
      return;
    }
    if (this.agent.status !== 'executing') return;
    const edgeId = this.agent.nextEdge();
    if (!edgeId) return;
    if (!this.segment) {
      if (this.autoClosure && edgeId === 'bridge-overlook') this.closeShortcut();
      if (this.blockedEdges.has(edgeId)) { this.agent.advance(); return; }
      const edge = edges.find(item => item.id === edgeId)!;
      const from = nodes.find(item => item.id === this.agent.node)!;
      const to = nodes.find(item => item.id === (edge.from === from.id ? edge.to : edge.from))!;
      this.segment = { edgeId, from, to, distance: edge.distance, progress: 0 };
    }
    const segment = this.segment;
    segment.progress = Math.min(1, segment.progress + this.speed * dt / segment.distance);
    this.pose.x = segment.from.x + (segment.to.x - segment.from.x) * segment.progress;
    this.pose.z = segment.from.z + (segment.to.z - segment.from.z) * segment.progress;
    const heading = Math.atan2(segment.to.x - segment.from.x, segment.to.z - segment.from.z);
    const difference = Math.atan2(Math.sin(heading - this.pose.heading), Math.cos(heading - this.pose.heading));
    this.pose.heading += difference * (1 - Math.exp(-dt * 9));
    if (segment.progress === 1) { this.agent.advance(); this.segment = null; }
  }

  dispose(): void { this.reset(); this.disposed = true; }
}
