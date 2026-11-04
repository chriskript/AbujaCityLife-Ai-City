import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { townResidents } from '../shared/neighbourhood/population.js';

it.each(['pending', 'valid', 'claimed', 'spending-pending'] as const)('preflights %s approval without inference or altering state', async state => {
  const directory = await mkdtemp(join(tmpdir(), 'society-cli-'));
  try {
    await mkdir(join(directory, 'runtime')); await mkdir(join(directory, 'dist'));
    await writeFile(join(directory, 'dist/index.html'), 'synthetic build');
    await writeFile(join(directory, '.env'), 'MODEL_API_KEY=synthetic-key\nMETA_PROBE_DAILY_USD=50\nMETA_PROBE_TOTAL_USD=100\n');
    await writeFile(join(directory, 'runtime/demo-access.json'), JSON.stringify({ version: 1, token: 'synthetic-local-token-for-cli-contract-only' }));
    const ledger = JSON.stringify({ version: 1, reservations: [{ day: '2026-11-01', microUsd: 18704 }] });
    await writeFile(join(directory, 'runtime/meta-probe-budget.json'), ledger);
    const plan = { id: 'synthetic-cli', approved: state !== 'pending', phase: '7g-d-society', residents: townResidents(16).map(n => n.id),
      notBefore: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 1200000).toISOString(),
      maxGenerations: 64, maxEstimatedUsd: 1.25, allowAutonomy: true, inputTokenLimit: 8000, inferenceTimeoutMs: 30000,
      outputTokenLimit: 2048, maximumSimulationSeconds: 1800, maximumWallMs: 900000 };
    await writeFile(join(directory, 'runtime/approved-live-plan.json'), JSON.stringify(plan));
    if (state === 'claimed') await writeFile(join(directory, 'runtime/local-live-society-synthetic-cli.claim'), 'retained claim');
    if (state === 'spending-pending') await writeFile(join(directory, 'runtime/meta-probe-budget.json.pending'), 'retained transaction');
    const before = await readdir(join(directory, 'runtime'));
    const blocker = join(directory, 'block-network.mjs');
    await writeFile(blocker, "globalThis.fetch=()=>{throw new Error('UNEXPECTED_NETWORK');};\n");
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(blocker).href, resolve('node_modules/tsx/dist/cli.mjs'), resolve('scripts/backend-society.ts'), '--check'],
      { cwd: directory, encoding: 'utf8', windowsHide: true, timeout: 15000,
        env: { ...process.env, MODEL_API_KEY: 'synthetic-key', META_MODEL: 'muse-spark-1.3', META_PROBE_DAILY_USD: '50', META_PROBE_TOTAL_USD: '100', META_PROBE_DAILY_USD_UNTIL: undefined, META_PROBE_TOTAL_USD_UNTIL: undefined } });
    expect(result.status, result.stderr).toBe(state === 'valid' ? 0 : 1);
    expect(result.stdout).toContain('"approvalId": "synthetic-cli"');
    expect(result.stderr).not.toContain('UNEXPECTED_NETWORK');
    expect(await readFile(join(directory, 'runtime/meta-probe-budget.json'), 'utf8')).toBe(ledger);
    expect(await readdir(join(directory, 'runtime'))).toEqual(before);
    expect(await readdir(directory)).not.toContain('output');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
