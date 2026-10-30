import { readFile, open, unlink } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { NeighbourhoodServerSession, validateLivePlan } from '../server/session.js';
import { MetaNeighbourhoodProvider, MockNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { createNeighbourhoodHttp } from '../server/http.js';

// No secrets in argv, URLs, HTTP output, browser configuration or logs.
try {
  const mode = process.argv.includes('--mode=live-meta') ? 'live-meta' : 'mock';
  const access = JSON.parse(await readFile('runtime/demo-access.json', 'utf8'));
  if (access.version !== 1 || typeof access.token !== 'string') throw new Error('Invalid access file');
  let provider = new MockNeighbourhoodProvider() as MockNeighbourhoodProvider | MetaNeighbourhoodProvider;
  let plan;
  if (mode === 'live-meta') {
    plan = JSON.parse(await readFile('runtime/approved-live-plan.json', 'utf8')); validateLivePlan(plan);
    const env = { ...parseEnv(await readFile('.env', 'utf8')), ...process.env };
    if (!env.MODEL_API_KEY) throw new Error('Missing key');
    const dailyUsd = Number(env.META_PROBE_DAILY_USD ?? '.25'); const totalUsd = Number(env.META_PROBE_TOTAL_USD ?? '1');
    if (![dailyUsd,totalUsd].every(value => Number.isFinite(value) && value > 0 && value <= 150)) throw new Error('Invalid budget');
    provider = new MetaNeighbourhoodProvider({ apiKey: env.MODEL_API_KEY, ledgerPath: 'runtime/meta-probe-budget.json', dailyUsd, totalUsd });
  }
  // One process owns the checkpoint. A crash leaves the lock for explicit operator review.
  const lock = await open('runtime/neighbourhood-session.lock', 'wx', 0o600);
  const session = await NeighbourhoodServerSession.open({ checkpoint: 'runtime/neighbourhood-session.json', provider, ...(plan ? { plan } : {}) });
  const http = createNeighbourhoodHttp(session, access.token, { dist: 'dist' });
  http.server.listen(8787, '127.0.0.1', () => console.log(`Neighbourhood backend: http://127.0.0.1:8787 (${mode}; controlled local session)`));
  let closing = false;
  const close = async () => { if (closing) return; closing = true; await http.close(); await lock.close(); await unlink('runtime/neighbourhood-session.lock'); process.exit(0); };
  process.on('SIGINT', () => { void close(); }); process.on('SIGTERM', () => { void close(); });
} catch { console.error('Backend startup refused. Check local access setup, checkpoint lock, and approved live plan/budget configuration. No inference was automatically retried.'); process.exitCode = 1; }
