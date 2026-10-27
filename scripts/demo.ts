import { MockProvider } from '../server/inference/mock-provider.js';
import { runScenario, scenarios } from '../shared/scenarios/scenarios.js';

console.log('MOCK DEMONSTRATION — scripted fixtures, no Meta calls, no inference charges.');
for (const scenario of scenarios) {
  const agent = await runScenario(scenario.id, new MockProvider());
  console.log(JSON.stringify({ scenario: scenario.id, status: agent.status, node: agent.node, events: agent.events }, null, 2));
  if (agent.status !== 'completed') process.exitCode = 1;
}
