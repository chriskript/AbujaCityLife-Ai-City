import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';

const directories: string[] = [];
const script = resolve('scripts/check-meta.ts');
const tsx = resolve('node_modules/tsx/dist/loader.mjs');
const dummySecret = 'offline-test-secret-must-not-be-printed';

async function fixture(ignoreEnv = true): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ai-city-meta-check-'));
  directories.push(directory);
  const initialized = spawnSync('git', ['init', '--quiet'], { cwd: directory, windowsHide: true });
  if (initialized.status !== 0) throw new Error('Test Git initialization failed');
  await writeFile(join(directory, '.gitignore'), ignoreEnv ? '.env\n' : 'node_modules/\n');
  await writeFile(join(directory, '.env'), `MODEL_API_KEY=${dummySecret}\nMETA_PROBE_ENABLED=true\n`);
  // Fail if this supposedly offline check ever starts to use fetch.
  await writeFile(join(directory, 'block-network.mjs'), "globalThis.fetch = () => { throw new Error('Unexpected network request'); };\n");
  return directory;
}

function check(directory: string, overrides: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env };
  for (const key of ['MODEL_API_KEY', 'META_MODEL', 'META_PROBE_ENABLED', 'META_PROBE_DAILY_USD', 'META_PROBE_TOTAL_USD']) delete env[key];
  return spawnSync(process.execPath, ['--import', pathToFileURL(join(directory, 'block-network.mjs')).href, '--import', pathToFileURL(tsx).href, script], {
    cwd: directory, env: { ...env, ...overrides }, encoding: 'utf8', windowsHide: true,
  });
}

afterEach(async () => {
  // All paths come directly from mkdtemp in the OS temp directory.
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

it('loads ignored local credentials without displaying them or making calls even when the probe is enabled', async () => {
  const result = check(await fixture());
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('MODEL_API_KEY is configured');
  expect(result.stdout).toContain('no Meta requests');
  expect(result.stdout + result.stderr).not.toContain(dummySecret);
});

it('refuses to load an unignored credential file', async () => {
  const result = check(await fixture(false));
  expect(result.status).toBe(1);
  expect(result.stdout).not.toContain('MODEL_API_KEY is configured');
  expect(result.stdout + result.stderr).not.toContain(dummySecret);
});

it('refuses to load a tracked credential file even when its name matches an ignore rule', async () => {
  const directory = await fixture();
  const added = spawnSync('git', ['add', '--force', '--', '.env'], { cwd: directory, windowsHide: true });
  expect(added.status).toBe(0);
  const result = check(directory);
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).not.toContain(dummySecret);
});

it('honours existing environment settings and redacts invalid configuration', async () => {
  const result = check(await fixture(), { META_MODEL: dummySecret });
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).not.toContain(dummySecret);
});
