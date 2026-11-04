import { access, mkdir, open, readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { validateLivePlan, type LivePlan } from '../server/session.js';
import { MetaNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { startHttpBrowserProbe } from '../server/evaluation/http-browser-probe.js';
import { inspectPhaseB } from './inspect-phase-b.js';

// A separate, bounded HTTP society. Never opens the operating checkpoint or
// its lock, resumes an old evaluation, creates approval, or changes allowances.
try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--check')) throw new Error('Use backend:society with optional --check');
  const plan: LivePlan & { maximumWallMs: number; maximumSimulationSeconds: number; outputTokenLimit: number } =
    JSON.parse(await readFile('runtime/approved-live-plan.json', 'utf8'));
  const readiness = await inspectPhaseB(plan.maxGenerations, 8000);
  if (args[0] === '--check') console.log(JSON.stringify({ ...readiness, approval: plan.approved === true ? 'owner-approved-plan-loaded; validation-follows' : 'pending-owner-approval', approvalId: plan.id, approved: plan.approved, url: 'http://127.0.0.1:8792/' }, null, 2));
  if (plan.approved !== true) {
    console.error('Owner approval is pending; the prepared draft cannot enable inference.');
  }
  validateLivePlan(plan);
  if (plan.phase !== '7g-d-society' || plan.inputTokenLimit !== 8000 || plan.inferenceTimeoutMs !== 30000 ||
      plan.maxGenerations > 64 || plan.maxEstimatedUsd > 1.25 || plan.maximumWallMs !== 900000 ||
      plan.maximumSimulationSeconds !== 1800 || plan.outputTokenLimit !== 2048) throw new Error('Expected the bounded 64-generation/$1.25/15-minute society approval');
  if (Date.parse(plan.expiresAt) - Date.now() < plan.maximumWallMs) throw new Error('Approval needs at least fifteen minutes remaining');
  if (!readiness.keyConfigured || readiness.ledgerLockPresent || !readiness.budget.fullRunFits) throw new Error('Credential, spending lock or full-session budget preflight failed');
  try {
    await access('runtime/meta-probe-budget.json.pending');
    throw new Error('Unresolved spending transaction; preserve it for review');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await access('dist/index.html');
  try {
    await access(join('runtime', `local-live-society-${plan.id}.claim`));
    throw new Error('This session ID has already been claimed; preserve it and obtain fresh approval');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const credentials = JSON.parse(await readFile('runtime/demo-access.json', 'utf8'));
  if (credentials.version !== 1 || typeof credentials.token !== 'string' || credentials.token.length < 32) throw new Error('Existing local access configuration is invalid');
  if (args[0] === '--check') {
    console.log('PASS: live startup preflight only; no provider calls, claims or checkpoint writes.');
  } else {
    const env = { ...parseEnv(await readFile('.env', 'utf8')), ...process.env };
    const provider = new MetaNeighbourhoodProvider({ apiKey: env.MODEL_API_KEY!, ledgerPath: 'runtime/meta-probe-budget.json',
      dailyUsd: readiness.configuredDailyUsd, totalUsd: readiness.configuredTotalUsd, inputTokenLimit: 8000, inferenceTimeoutMs: 30000,
      ...(env.META_PROBE_DAILY_USD_UNTIL ? { dailyUsdUntil: env.META_PROBE_DAILY_USD_UNTIL } : {}),
      ...(env.META_PROBE_TOTAL_USD_UNTIL ? { totalUsdUntil: env.META_PROBE_TOTAL_USD_UNTIL } : {}) });
    const directory = join('output', 'local-live-society', plan.id);
    await mkdir('runtime', { recursive: true });
    // Keep the claim permanently, even on startup failure. Reuse needs review.
    const claim = await open(join('runtime', `local-live-society-${plan.id}.claim`), 'wx', 0o600);
    try {
      await claim.writeFile(JSON.stringify({ id: plan.id, createdAt: new Date().toISOString(), directory }));
      await claim.sync();
    } finally { await claim.close(); }
    const run = await startHttpBrowserProbe({ directory, plan, provider, accessToken: credentials.token,
      kind: 'live-meta', port: 8792, dist: 'dist', maximumWallMs: plan.maximumWallMs,
      attempt: () => provider.attempt, forbiddenPublicStrings: [env.MODEL_API_KEY!, credentials.token] });
    process.once('SIGINT', () => { void run.stop('operator-stop'); });
    process.once('SIGTERM', () => { void run.stop('operator-stop'); });
    console.log('Live Muse society: http://127.0.0.1:8792/ (paused; sign in with existing local token, then Resume).');
    console.log(`All sixteen residents eligible; autonomous without observers; ${plan.maxGenerations} generations/$${plan.maxEstimatedUsd}/15 minutes maximum.`);
    const report = await run.done;
    console.log(JSON.stringify({ stopReason: report.stopReason, returned: report.returned, reservedUsd: report.maximumReservedUsd, directory }));
  }
} catch (error) {
  // Do not print provider/configuration exceptions that could contain secrets.
  const code = (error as NodeJS.ErrnoException).code;
  console.error(`Live society startup/check refused${code ? ` (${code})` : ''}. Check explicit approval, its window/profile, budget, pending transaction, build and unused session ID. No offline fallback or automatic retry.`);
  process.exitCode = 1;
}
