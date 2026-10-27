import { TaxiAgent } from '../agent/taxi-agent.js';
import type { InferenceProvider } from '../agent/contracts.js';

export const scenarios = [
  { id: 'A', goal: 'Take me to the nearest public place with a good view of the lake.', closure: false },
  { id: 'B', goal: 'Take me to the market square.', closure: false },
  { id: 'C', goal: 'Take me to the nearest public place with a good view of the lake.', closure: true },
] as const;

export async function runScenario(id: string, provider: InferenceProvider): Promise<TaxiAgent> {
  const scenario = scenarios.find(item => item.id === id);
  if (!scenario) throw new Error('Unknown scenario');
  const agent = new TaxiAgent(provider);
  await agent.start(scenario.goal, scenario.id);
  let closureTriggered = false;
  for (let step = 0; step < 40; step++) {
    if (agent.status === 'executing') {
      if (scenario.closure && !closureTriggered && agent.nextEdge() === 'bridge-overlook') {
        agent.closeRoad('bridge-overlook'); closureTriggered = true;
      }
      agent.advance();
    } else if (agent.status === 'interrupted') await agent.replan();
    else return agent;
  }
  throw new Error('Scenario exceeded deterministic step limit');
}
