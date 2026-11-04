import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { archiveWorld, listArchives, restoreWorld, startNewWorld } from '../server/persistence/world-archives.js';

const CHECKPOINT = 'neighbourhood-session.json';
const dirs: string[] = [];
afterEach(async () => { while (dirs.length) await rm(dirs.pop()!, { recursive: true, force: true }); });

async function seedRuntime(withCheckpoint = true, withSidecar = true): Promise<{ dir: string; bytes: Buffer }> {
  const dir = await mkdtemp(join(tmpdir(), 'world-archives-')); dirs.push(dir);
  const world = createTown('test-world', 16, { map: 'town-v1' });
  const bytes = Buffer.from(JSON.stringify({ version: 1, sessionId: 'test-session', sequence: 3, world: world.serialize(), paused: false }));
  if (withCheckpoint) await writeFile(join(dir, CHECKPOINT), bytes);
  if (withSidecar) await writeFile(join(dir, CHECKPOINT + '.pre-v5-backup'), bytes);
  return { dir, bytes };
}
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

describe('stopped-backend society archives', () => {
  it('lists no archives for a fresh runtime directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'world-archives-')); dirs.push(dir);
    expect(await listArchives(dir)).toEqual([]);
  });
  it('skips manual recovery material without a manifest', async () => {
    const { dir } = await seedRuntime();
    await mkdir(join(dir, 'recovery-archive', 'manual-notes'), { recursive: true });
    await writeFile(join(dir, 'recovery-archive', 'manual-notes', 'RECOVERY-NOTES.md'), 'earlier manual work');
    await archiveWorld(dir, CHECKPOINT);
    expect(await listArchives(dir)).toHaveLength(1);
  });
  it('archives the checkpoint and sidecars with verified hashes and leaves live files', async () => {
    const { dir, bytes } = await seedRuntime();
    const manifest = await archiveWorld(dir, CHECKPOINT);
    expect(manifest.sessionId).toBe('test-session');
    expect(manifest.residents).toBe(16);
    expect(manifest.files.map(f => f.name).sort()).toEqual([CHECKPOINT, CHECKPOINT + '.pre-v5-backup']);
    for (const file of manifest.files) expect(file.sha256).toBe(sha256(bytes));
    expect((await readFile(join(dir, CHECKPOINT))).equals(bytes)).toBe(true);
    expect(await listArchives(dir)).toHaveLength(1);
  });
  it('refuses every operation while locks or pending transactions exist', async () => {
    for (const blocker of ['neighbourhood-session.lock', CHECKPOINT + '.abc.pending', 'muse-policy.json.lock', 'meta-probe-budget.json.pending']) {
      const { dir } = await seedRuntime();
      await writeFile(join(dir, blocker), '{}');
      await expect(archiveWorld(dir, CHECKPOINT)).rejects.toThrow('Refusing world change');
      await expect(startNewWorld(dir, CHECKPOINT, 'test-session')).rejects.toThrow('Refusing world change');
      expect(await readdir(dir)).toContain(CHECKPOINT);
    }
  });
  it('requires the typed live session id before starting a new society', async () => {
    const { dir } = await seedRuntime();
    await expect(startNewWorld(dir, CHECKPOINT, 'wrong-id')).rejects.toThrow('Confirmation mismatch');
    expect(await readdir(dir)).toContain(CHECKPOINT);
    const manifest = await startNewWorld(dir, CHECKPOINT, 'test-session');
    expect(manifest.sessionId).toBe('test-session');
    expect(await readdir(dir)).not.toContain(CHECKPOINT);
    expect(await readdir(dir)).not.toContain(CHECKPOINT + '.pre-v5-backup');
  });
  it('restores an archived world byte-for-byte after preserving whatever is live', async () => {
    const { dir, bytes } = await seedRuntime();
    const first = await archiveWorld(dir, CHECKPOINT);
    await startNewWorld(dir, CHECKPOINT, 'test-session');
    const { restored, preserved } = await restoreWorld(dir, CHECKPOINT, first.archiveId, first.archiveId);
    expect(restored.archiveId).toBe(first.archiveId);
    expect(preserved).toBeNull();
    const live = await readFile(join(dir, CHECKPOINT));
    expect(sha256(live)).toBe(sha256(bytes));
    const world = Neighbourhood.restore(JSON.parse(live.toString('utf8')).world);
    expect(world.residentIds).toHaveLength(16);
    const second = await archiveWorld(dir, CHECKPOINT);
    const again = await restoreWorld(dir, CHECKPOINT, first.archiveId, first.archiveId);
    expect(again.preserved?.archiveId).not.toBe(second.archiveId);
    expect(await listArchives(dir)).toHaveLength(4);
  });
  it('rejects restore when the confirmation or the archived bytes do not match', async () => {
    const { dir } = await seedRuntime();
    const manifest = await archiveWorld(dir, CHECKPOINT);
    await expect(restoreWorld(dir, CHECKPOINT, manifest.archiveId, 'wrong-id')).rejects.toThrow('Confirmation mismatch');
    await writeFile(join(dir, 'recovery-archive', manifest.archiveId, CHECKPOINT), '{"tampered":true}');
    await expect(restoreWorld(dir, CHECKPOINT, manifest.archiveId, manifest.archiveId)).rejects.toThrow('failed verification');
    expect(await readdir(dir)).toContain(CHECKPOINT);
  });
  it('clears orphaned sidecars for a fresh start only with explicit fresh-start confirmation', async () => {
    const { dir } = await seedRuntime(false, true);
    await expect(startNewWorld(dir, CHECKPOINT, 'test-session')).rejects.toThrow('Confirmation mismatch');
    const manifest = await startNewWorld(dir, CHECKPOINT, 'fresh-start');
    expect(manifest.sessionId).toBeNull();
    expect(manifest.files.map(f => f.name)).toEqual([CHECKPOINT + '.pre-v5-backup']);
    expect(await readdir(dir)).not.toContain(CHECKPOINT + '.pre-v5-backup');
  });
});
