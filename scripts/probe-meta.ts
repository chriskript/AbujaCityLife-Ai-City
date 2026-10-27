import { resolve } from 'node:path';
import { initializeProbeBudget, withProbeBudget } from '../server/controls/probe-budget.js';
import { modelRates, probeMeta, type ProbeModel } from '../server/inference/meta-probe.js';
import { TaxiAgent } from '../shared/agent/taxi-agent.js';
import { MockProvider } from '../server/inference/mock-provider.js';
import { validateDecision } from '../shared/agent/validator.js';

// Environment values must be supplied to this server-side CLI explicitly.
const ledgerPath = resolve('runtime/meta-probe-budget.json');
try {
  if (process.argv.includes('--init-budget')) {
    await initializeProbeBudget(ledgerPath);
    console.log('Initialized probe ledger. No API calls made. Keep this file across runs.');
  } else if (process.env.META_PROBE_ENABLED !== 'true') {
    console.log('Meta probe disabled. No API calls made. See docs/meta-api.md for approved live verification.');
  } else {
    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) throw new Error('MODEL_API_KEY missing');
    const model = process.env.META_MODEL ?? 'muse-spark-1.3';
    if (!Object.hasOwn(modelRates, model)) throw new Error('Unsupported probe model');
    const agent = new TaxiAgent(new MockProvider());
    const observation = agent.observe();
    const result = await withProbeBudget(ledgerPath, {
      dailyUsd: Number(process.env.META_PROBE_DAILY_USD ?? '0.25'),
      totalUsd: Number(process.env.META_PROBE_TOTAL_USD ?? '1'),
    }, reserve => probeMeta({
      requestId: 'manual-contract-probe', scenarioId: 'A',
      goal: 'Take me to the nearest public place with a good view of the lake.', observation,
    }, { apiKey, model: model as ProbeModel, reserve }));
    const validation = validateDecision(result.decision, observation, { revision: 0, agentNode: 'stand', blockedEdges: new Set() });
    console.log(JSON.stringify({ ...result, validation }, null, 2));
    if (!validation.accepted) process.exitCode = 1;
  }
} catch {
  console.error('Meta probe stopped. Check opt-in, credentials, model access, budget ledger/lock, limits, and API compatibility. Reservation is retained if inference was attempted. Raw errors are suppressed to protect credentials.');
  process.exitCode = 1;
}
