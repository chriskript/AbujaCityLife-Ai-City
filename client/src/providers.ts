import type { DecisionRequest, InferenceProvider, InferenceResult } from '../../shared/agent/contracts.js';
import { MockProvider } from '../../shared/agent/mock-provider.js';

export type InferenceMode = 'mock' | 'live-meta';

// This is the integration seam for a future same-origin backend provider.
// No browser implementation may import the server adapter or hold credentials.
export function createBrowserProvider(mode: InferenceMode): InferenceProvider {
  if (mode !== 'mock') throw new Error('Live Meta gameplay is not enabled in this build.');
  const fixture = new MockProvider();
  return {
    async decide(request: DecisionRequest): Promise<InferenceResult> {
      await new Promise(resolve => setTimeout(resolve, 650));
      return fixture.decide(request);
    },
  };
}
