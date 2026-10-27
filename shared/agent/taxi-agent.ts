import { destinations, edges } from '../world/neighbourhood.js';
import { routeCandidates, type Route } from '../navigation/routes.js';
import type { DecisionRequest, InferenceProvider, Observation } from './contracts.js';
import { validateDecision } from './validator.js';

export type AgentStatus = 'idle' | 'awaiting-decision' | 'executing' | 'completed' | 'interrupted' | 'clarification' | 'unable' | 'rejected' | 'failed';
export interface AgentEvent { sequence: number; type: string; data: unknown }

export class TaxiAgent {
  status: AgentStatus = 'idle';
  node = 'stand';
  revision = 0;
  readonly events: AgentEvent[] = [];
  private blocked = new Set<string>();
  private activeRoute: Route | null = null;
  private routeStep = 0;
  private goal = '';
  private scenarioId = '';
  private selectedDestinationId: string | null = null;
  private previousOutcome: string | null = null;
  private generation = 0;
  private requestSequence = 0;
  private replanCount = 0;

  constructor(private readonly provider: InferenceProvider) {}

  private record(type: string, data: unknown): void {
    this.events.push({ sequence: (this.events.at(-1)?.sequence ?? 0) + 1, type, data: structuredClone(data) });
    if (this.events.length > 200) this.events.shift();
  }

  observe(): Observation {
    return {
      worldRevision: this.revision, agentNode: this.node,
      destinations: structuredClone(destinations),
      routeCandidates: routeCandidates(this.node, this.blocked),
      blockedEdges: [...this.blocked].sort(), previousOutcome: this.previousOutcome,
      selectedDestinationId: this.selectedDestinationId,
    };
  }

  reset(): void {
    this.generation++;
    this.status = 'idle'; this.node = 'stand'; this.revision = 0;
    this.blocked.clear(); this.activeRoute = null; this.routeStep = 0;
    this.goal = ''; this.scenarioId = ''; this.selectedDestinationId = null;
    this.previousOutcome = null; this.replanCount = 0; this.events.length = 0;
    this.record('reset', { node: this.node });
  }

  async start(goal: string, scenarioId: string): Promise<void> {
    if (!goal.trim() || goal.length > 500) throw new Error('Goal must contain 1–500 characters');
    this.reset(); this.goal = goal; this.scenarioId = scenarioId;
    this.record('instruction', { goal, scenarioId });
    await this.requestDecision();
  }

  async replan(): Promise<void> {
    if (this.status !== 'interrupted') return;
    if (this.replanCount >= 2) {
      this.status = 'failed'; this.record('outcome', { reason: 'replan-limit' }); return;
    }
    this.replanCount++;
    await this.requestDecision();
  }

  private async requestDecision(): Promise<void> {
    const generation = ++this.generation;
    this.status = 'awaiting-decision';
    const request: DecisionRequest = {
      requestId: `decision-${++this.requestSequence}`, scenarioId: this.scenarioId,
      goal: this.goal, observation: this.observe(),
    };
    this.record('observation', request);
    try {
      const result = await this.provider.decide(structuredClone(request));
      if (generation !== this.generation) return;
      this.record('decision', result);
      const validation = validateDecision(result.decision, request.observation, { revision: this.revision, agentNode: this.node, blockedEdges: this.blocked });
      this.record('validation', validation);
      if (!validation.accepted) { this.status = 'rejected'; return; }
      if (validation.decision.action !== 'travel') {
        this.status = validation.decision.action === 'clarify' ? 'clarification' : 'unable';
        this.record('outcome', { status: this.status, message: validation.decision.playerMessage }); return;
      }
      this.selectedDestinationId = validation.decision.destinationId;
      this.activeRoute = validation.route; this.routeStep = 0; this.status = 'executing';
      this.record('execution-started', { route: this.activeRoute });
      if (this.activeRoute?.edgeIds.length === 0) this.arrive();
    } catch {
      if (generation !== this.generation) return;
      this.activeRoute = null; this.status = 'failed';
      // Never log arbitrary provider exceptions, which may contain credentials.
      this.record('outcome', { reason: 'inference-failed', message: 'Decision unavailable. No action executed.' });
    }
  }

  closeRoad(edgeId: string): void {
    if (!edges.some(edge => edge.id === edgeId)) throw new Error('Unknown road');
    if (this.blocked.has(edgeId)) return;
    this.blocked.add(edgeId); this.revision++;
    this.record('world-change', { blockedEdge: edgeId, revision: this.revision });
    if (this.status === 'awaiting-decision') {
      this.generation++; this.interrupt('world-changed-during-inference');
    }
  }

  private interrupt(reason: string): void {
    this.activeRoute = null; this.status = 'interrupted'; this.previousOutcome = reason;
    this.record('execution-interrupted', { reason, node: this.node });
  }

  nextEdge(): string | null { return this.activeRoute?.edgeIds[this.routeStep] ?? null; }

  // One deterministic edge transition. A later renderer can interpolate it locally.
  advance(): void {
    if (this.status !== 'executing' || !this.activeRoute) return;
    const edgeId = this.activeRoute.edgeIds[this.routeStep];
    if (!edgeId) { this.arrive(); return; }
    if (this.blocked.has(edgeId)) { this.interrupt(`blocked-edge:${edgeId}`); return; }
    const edge = edges.find(item => item.id === edgeId);
    const next = this.activeRoute.nodeIds[this.routeStep + 1];
    if (!edge || !next || !((edge.from === this.node && edge.to === next) || (edge.to === this.node && edge.from === next))) {
      this.interrupt('invalid-execution-edge'); return;
    }
    const from = this.node; this.node = next; this.routeStep++;
    this.record('edge-executed', { edgeId, from, to: next });
    if (this.routeStep === this.activeRoute.edgeIds.length) this.arrive();
  }

  private arrive(): void {
    this.status = 'completed'; this.activeRoute = null; this.previousOutcome = 'arrived';
    this.record('outcome', { status: 'completed', destinationId: this.selectedDestinationId, node: this.node });
  }
}
