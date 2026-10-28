import type { Decision, DecisionRequest, InferenceProvider, InferenceResult } from './contracts.js';

// Scripted fixture policy, deliberately labelled mock. This is not AI reasoning.
export class MockProvider implements InferenceProvider {
  async decide(request: DecisionRequest): Promise<InferenceResult> {
    const { observation, goal } = request;
    let target = observation.selectedDestinationId;
    if (!target) {
      if (/market/i.test(goal)) target = 'market-square';
      else if (/lake/i.test(goal)) {
        target = observation.routeCandidates
          .filter(route => observation.destinations.some(item => item.id === route.destinationId && item.publicAccess && item.tags.includes('lake-view')))
          .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0]?.destinationId ?? null;
      }
    }
    const route = observation.routeCandidates.filter(item => item.destinationId === target).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0];
    const decision: Decision = route
      ? { action: 'travel', destinationId: route.destinationId, routeId: route.id, explanation: 'MOCK fixture: select the shortest available route to the fixture destination.', playerMessage: 'MOCK: I can take you there.' }
      : { action: target ? 'unable' : 'clarify', destinationId: null, routeId: null, explanation: 'MOCK fixture: no matching available route.', playerMessage: target ? 'MOCK: No route is available.' : 'MOCK: Would you like the market or a lake view?' };
    return { provider: 'mock', model: 'scripted-fixture-v1', decision, latencyMs: 0, usage: null, estimatedCostUsd: 0 };
  }
}

