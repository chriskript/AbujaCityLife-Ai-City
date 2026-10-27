import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
import { modelRates } from '../server/inference/meta-probe.js';
import { usdToMicroUsd } from '../server/controls/probe-budget.js';

// Offline only. Never import or invoke the live probe CLI from this check.
function git(...args: string[]): number | null {
  return spawnSync('git', args, { stdio: 'ignore', windowsHide: true }).status;
}

try {
  if (git('check-ignore', '--quiet', '--', '.env') !== 0
    || git('ls-files', '--error-unmatch', '--', '.env') !== 1) {
    throw new Error('Unsafe or unverifiable Git exclusion');
  }
  console.log('PASS: root .env is ignored and untracked.');
  if (existsSync('.env')) loadEnvFile('.env');
  const credentialConfigured = Boolean(process.env.MODEL_API_KEY?.trim());
  const model = process.env.META_MODEL ?? 'muse-spark-1.3';
  if (!Object.hasOwn(modelRates, model)) throw new Error('Unsupported model');
  usdToMicroUsd(Number(process.env.META_PROBE_DAILY_USD ?? '0.25'));
  usdToMicroUsd(Number(process.env.META_PROBE_TOTAL_USD ?? '1'));
  console.log('PASS: model and probe budget configuration are supported.');
  console.log(credentialConfigured ? 'PASS: MODEL_API_KEY is configured (value withheld).' : 'NOT READY: MODEL_API_KEY is not configured.');
  console.log('Offline check only: no Meta requests or paid inference. Authentication and model access are unverified.');
  if (!credentialConfigured) process.exitCode = 1;
} catch {
  console.error('Offline check failed. Check Git exclusion, .env readability, supported model, and numeric budget limits. Configuration values are withheld.');
  process.exitCode = 1;
}
