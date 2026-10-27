import { describe, expect, it } from 'vitest';
import { MockProvider } from '../server/inference/mock-provider.js';
import { TaxiAgent } from '../shared/agent/taxi-agent.js';
import type { Decision, InferenceProvider, InferenceResult } from '../shared/agent/contracts.js';
import { validateDecision } from '../shared/agent/validator.js';
import { runScenario } from '../shared/scenarios/scenarios.js';
import { routeCandidates } from '../shared/navigation/routes.js';

const mock = new MockProvider();
const result = (decision: unknown): InferenceResult => ({ provider: 'mock', model: 'test-fixture', decision, latencyMs: 0, usage: null, estimatedCostUsd: 0 });
function proposal(agent: TaxiAgent): Decision {
  const route = agent.observe().routeCandidates.find(item => item.destinationId === 'lake-overlook')!;
  return { action: 'travel', destinationId: route.destinationId, routeId: route.id, explanation: 'A public lake view.', playerMessage: 'Heading there.' };
}

describe('reproducible taxi scenarios', () => {
  it.each(['A', 'B', 'C'])('completes scenario %s on 20 independent resets', async id => {
    for (let iteration = 0; iteration < 20; iteration++) {
      const agent = await runScenario(id, mock);
      expect(agent.status).toBe('completed');
      expect(agent.node).toBe(id === 'B' ? 'market' : 'overlook');
      const decisions = agent.events.filter(event => event.type === 'decision');
      expect(decisions.length).toBe(id === 'C' ? 2 : 1);
      expect(decisions.every(event => (event.data as InferenceResult).provider === 'mock')).toBe(true);
      if (id === 'C') {
        expect(agent.events.some(event => event.type === 'execution-interrupted')).toBe(true);
        const executed = agent.events.filter(event => event.type === 'edge-executed').map(event => (event.data as { edgeId: string }).edgeId);
        expect(executed).not.toContain('bridge-overlook');
        expect(executed).toContain('hill-overlook');
      }
    }
  });

  it('keeps identical mock scenario traces reproducible', async () => {
    expect((await runScenario('C', mock)).events).toEqual((await runScenario('C', mock)).events);
  });

  it('stops and reports inability when the chosen destination is disconnected', async () => {
    const agent = new TaxiAgent(mock);
    await agent.start('Take me to a lake view.', 'disconnect');
    agent.closeRoad('bridge-overlook'); agent.closeRoad('hill-overlook');
    while (agent.status === 'executing') agent.advance();
    await agent.replan();
    expect(agent.status).toBe('unable');
    expect(agent.node).not.toBe('overlook');
  });

  it('asks for clarification for an unsupported mock goal', async () => {
    const agent = new TaxiAgent(mock);
    await agent.start('Somewhere nice.', 'ambiguous');
    expect(agent.status).toBe('clarification');
    expect(agent.node).toBe('stand');
  });
});

describe('deterministic safety boundary', () => {
  it.each([null, [], {}, { action: 'teleport' }, { ...proposal(new TaxiAgent(mock)), arbitraryEngineCode: 'execute()' }])('rejects malformed decisions: %j', decision => {
    const agent = new TaxiAgent(mock);
    expect(validateDecision(decision, agent.observe(), { revision: 0, agentNode: 'stand', blockedEdges: new Set() }).accepted).toBe(false);
  });

  it('rejects unknown destinations and unoffered routes', () => {
    const agent = new TaxiAgent(mock);
    for (const patch of [{ destinationId: 'invented' }, { routeId: 'invented' }]) {
      expect(validateDecision({ ...proposal(agent), ...patch }, agent.observe(), { revision: 0, agentNode: 'stand', blockedEdges: new Set() }).accepted).toBe(false);
    }
  });

  it('rejects a route blocked since observation even if a caller misses the revision update', () => {
    const agent = new TaxiAgent(mock);
    expect(validateDecision(proposal(agent), agent.observe(), { revision: 0, agentNode: 'stand', blockedEdges: new Set(['bridge-overlook']) })).toEqual({ accepted: false, reason: 'blocked-route' });
  });

  it('rejects forged route connectivity', () => {
    const agent = new TaxiAgent(mock);
    const observation = agent.observe();
    const decision = proposal(agent);
    observation.routeCandidates.find(item => item.id === decision.routeId)!.nodeIds[1] = 'hill';
    expect(validateDecision(decision, observation, { revision: 0, agentNode: 'stand', blockedEdges: new Set() }).accepted).toBe(false);
  });

  it('rejects stale observations', () => {
    const agent = new TaxiAgent(mock);
    expect(validateDecision(proposal(agent), agent.observe(), { revision: 1, agentNode: 'stand', blockedEdges: new Set() })).toEqual({ accepted: false, reason: 'stale-observation' });
  });

  it('never executes an invalid provider proposal', async () => {
    const agent = new TaxiAgent({ decide: async () => result({ ...proposal(new TaxiAgent(mock)), routeId: 'invented-road' }) });
    await agent.start('Lake view.', 'invalid-provider');
    agent.advance();
    expect(agent.status).toBe('rejected');
    expect(agent.node).toBe('stand');
    expect(agent.events.some(event => event.type === 'edge-executed')).toBe(false);
  });

  it('bounds repeated adaptation attempts', async () => {
    const agent = new TaxiAgent(mock);
    await agent.start('Lake view.', 'replan-limit');
    for (let attempt = 0; attempt < 3; attempt++) {
      const next = agent.nextEdge();
      expect(next).not.toBeNull();
      agent.closeRoad(next!); agent.advance(); await agent.replan();
      if (agent.status === 'unable') break;
    }
    expect(['failed', 'unable']).toContain(agent.status);
    expect(agent.events.filter(event => event.type === 'decision').length).toBeLessThanOrEqual(3);
  });

  it('offers longer reachable routes after the shortcut closes', () => {
    const first = routeCandidates('stand', new Set()).find(route => route.destinationId === 'lake-overlook')!;
    const detour = routeCandidates('stand', new Set(['bridge-overlook'])).find(route => route.destinationId === 'lake-overlook')!;
    expect(detour.distance).toBeGreaterThan(first.distance);
    expect(detour.edgeIds).not.toContain('bridge-overlook');
  });

  it('discards responses that arrive after reset', async () => {
    let finish!: (value: InferenceResult) => void;
    const provider: InferenceProvider = { decide: () => new Promise(resolve => { finish = resolve; }) };
    const agent = new TaxiAgent(provider);
    const decision = proposal(agent);
    const pending = agent.start('Lake view.', 'late-response');
    agent.reset(); finish(result(decision)); await pending;
    expect(agent.status).toBe('idle'); expect(agent.node).toBe('stand');
    expect(agent.events.map(event => event.type)).toEqual(['reset']);
  });

  it('invalidates an in-flight response after a closure', async () => {
    let finish!: (value: InferenceResult) => void;
    const agent = new TaxiAgent({ decide: () => new Promise(resolve => { finish = resolve; }) });
    const decision = proposal(agent);
    const pending = agent.start('Lake view.', 'closure-during-inference');
    agent.closeRoad('bridge-overlook'); finish(result(decision)); await pending;
    expect(agent.status).toBe('interrupted'); expect(agent.node).toBe('stand');
    expect(agent.events.some(event => event.type === 'execution-started')).toBe(false);
  });

  it('keeps the taxi stationary and suppresses raw provider errors on failure', async () => {
    const agent = new TaxiAgent({ decide: async () => { throw new Error('secret-value'); } });
    await agent.start('Lake view.', 'timeout'); agent.advance();
    expect(agent.status).toBe('failed'); expect(agent.node).toBe('stand');
    expect(JSON.stringify(agent.events)).not.toContain('secret-value');
  });
});
