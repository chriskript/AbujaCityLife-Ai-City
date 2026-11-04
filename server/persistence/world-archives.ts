import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { Neighbourhood } from '../../shared/neighbourhood/world.js';

// Stopped-backend-only world management. The backend lock, pending transactions
// and spending ledgers are never touched here: their presence refuses the work.
export interface WorldArchiveFile { name: string; bytes: number; sha256: string }
export interface WorldArchiveManifest {
  version: 1; archiveId: string; archivedAt: string; checkpointName: string;
  sessionId: string | null; worldId: string | null; residents: number;
  simulationSeconds: number | null; interruptions: number; files: WorldArchiveFile[];
}

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

async function checkpointCompanions(runtimeDir: string, checkpointName: string): Promise<string[]> {
  const files = await readdir(runtimeDir);
  return files.filter(name => name === checkpointName || name.startsWith(checkpointName + '.') && name !== checkpointName + '.lock').sort();
}

async function refuseIfBusy(runtimeDir: string, checkpointName: string): Promise<void> {
  const files = await readdir(runtimeDir);
  // The backend lock replaces the .json suffix: runtime/neighbourhood-session.lock.
  const ownershipLock = checkpointName.replace(/\.json$/, '') + '.lock';
  const busy = files.filter(name =>
    name === ownershipLock ||
    name.startsWith(checkpointName + '.') && name.endsWith('.pending') ||
    ['muse-policy.json.lock', 'muse-usage.json.lock', 'muse-usage.json.pending', 'meta-probe-budget.json.lock', 'meta-probe-budget.json.pending'].includes(name));
  if (busy.length) throw new Error(`Refusing world change while ${busy.sort().join(', ')} exists; stop the backend and resolve pending transactions first`);
}

interface CheckpointSummary { sessionId: string | null; worldId: string | null; residents: number; simulationSeconds: number | null; interruptions: number }

async function summarizeCheckpoint(path: string): Promise<CheckpointSummary> {
  const text = await readFile(path, 'utf8'), saved = JSON.parse(text);
  if (saved.version !== 1 || typeof saved.sessionId !== 'string') throw new Error('Unrecognized checkpoint envelope; refusing world change');
  const world = Neighbourhood.restore(saved.world);
  return { sessionId: saved.sessionId, worldId: world.id, residents: world.residentIds.length, simulationSeconds: world.time, interruptions: Object.keys(saved.interruptedDecisions ?? {}).length };
}

async function writeArchive(runtimeDir: string, checkpointName: string, companions: string[], summary: CheckpointSummary | null): Promise<WorldArchiveManifest> {
  const archivedAt = new Date().toISOString();
  const archiveId = `${archivedAt.replace(/[:.]/g, '-')}-${summary?.sessionId ?? 'no-checkpoint'}-${randomBytes(3).toString('hex')}`;
  const dir = join(runtimeDir, 'recovery-archive', archiveId);
  await mkdir(join(runtimeDir, 'recovery-archive'), { recursive: true, mode: 0o700 });
  await mkdir(dir, { mode: 0o700 });
  const files: WorldArchiveFile[] = [];
  for (const name of companions) {
    const bytes = await readFile(join(runtimeDir, name));
    await writeFile(join(dir, name), bytes, { flag: 'wx', mode: 0o600 });
    const readback = await readFile(join(dir, name));
    if (!readback.equals(bytes)) throw new Error(`Archive readback mismatch for ${name}; live files unchanged`);
    files.push({ name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const manifest: WorldArchiveManifest = { version: 1, archiveId, archivedAt, checkpointName, sessionId: summary?.sessionId ?? null, worldId: summary?.worldId ?? null, residents: summary?.residents ?? 0, simulationSeconds: summary?.simulationSeconds ?? null, interruptions: summary?.interruptions ?? 0, files };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  return manifest;
}

export async function listArchives(runtimeDir: string): Promise<WorldArchiveManifest[]> {
  let entries: string[];
  try { entries = await readdir(join(runtimeDir, 'recovery-archive')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const manifests: WorldArchiveManifest[] = [];
  for (const entry of entries.sort()) {
    let raw: string;
    try { raw = await readFile(join(runtimeDir, 'recovery-archive', entry, 'manifest.json'), 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; // Manual recovery material, not a world archive.
      throw error;
    }
    const manifest = JSON.parse(raw) as WorldArchiveManifest;
    if (manifest.version !== 1 || manifest.archiveId !== entry || !Array.isArray(manifest.files)) throw new Error(`Invalid world archive manifest: ${entry}`);
    manifests.push(manifest);
  }
  return manifests;
}

// Copy the live checkpoint and its sidecar backups into a new archive. Live files stay.
export async function archiveWorld(runtimeDir: string, checkpointName: string): Promise<WorldArchiveManifest> {
  await refuseIfBusy(runtimeDir, checkpointName);
  const companions = await checkpointCompanions(runtimeDir, checkpointName);
  if (!companions.length) throw new Error('No saved society found; nothing to archive');
  const summary = companions.includes(checkpointName) ? await summarizeCheckpoint(join(runtimeDir, checkpointName)) : null;
  return writeArchive(runtimeDir, checkpointName, companions, summary);
}

// Preserve the current world, then remove it so the next backend start creates
// a fresh society. Confirmation must type the live session id, or 'fresh-start'
// when no checkpoint exists.
export async function startNewWorld(runtimeDir: string, checkpointName: string, confirm: string): Promise<WorldArchiveManifest> {
  await refuseIfBusy(runtimeDir, checkpointName);
  const companions = await checkpointCompanions(runtimeDir, checkpointName);
  if (!companions.length) throw new Error('No saved society found; nothing to preserve. The next backend start already creates a fresh world.');
  const summary = companions.includes(checkpointName) ? await summarizeCheckpoint(join(runtimeDir, checkpointName)) : null;
  const expected = summary?.sessionId ?? 'fresh-start';
  if (confirm !== expected) throw new Error(`Confirmation mismatch: type --confirm=${expected}`);
  const manifest = await writeArchive(runtimeDir, checkpointName, companions, summary);
  for (const name of companions) await rm(join(runtimeDir, name));
  return manifest;
}

// Verify an archive, preserve whatever is live now, then restore the archived
// world byte-for-byte. Confirmation must type the archive id.
export async function restoreWorld(runtimeDir: string, checkpointName: string, archiveId: string, confirm: string): Promise<{ restored: WorldArchiveManifest; preserved: WorldArchiveManifest | null }> {
  if (!/^[\w.-]+$/.test(archiveId)) throw new Error('Invalid archive id');
  if (confirm !== archiveId) throw new Error(`Confirmation mismatch: type --confirm=${archiveId}`);
  await refuseIfBusy(runtimeDir, checkpointName);
  const dir = join(runtimeDir, 'recovery-archive', archiveId);
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')) as WorldArchiveManifest;
  if (manifest.version !== 1 || manifest.archiveId !== archiveId || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error(`Invalid world archive manifest: ${archiveId}`);
  for (const file of manifest.files) {
    const bytes = await readFile(join(dir, file.name));
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) throw new Error(`Archived world failed verification: ${file.name}`);
  }
  const companions = await checkpointCompanions(runtimeDir, checkpointName);
  const preserved = companions.length ? await writeArchive(runtimeDir, checkpointName, companions, companions.includes(checkpointName) ? await summarizeCheckpoint(join(runtimeDir, checkpointName)) : null) : null;
  for (const file of manifest.files) {
    await copyFile(join(dir, file.name), join(runtimeDir, file.name));
    const restored = await readFile(join(runtimeDir, file.name));
    if (restored.length !== file.bytes || sha256(restored) !== file.sha256) throw new Error(`Restored world failed verification: ${file.name}`);
  }
  if (manifest.files.some(file => file.name === checkpointName)) await summarizeCheckpoint(join(runtimeDir, checkpointName));
  return { restored: manifest, preserved };
}

export async function archiveDirSize(runtimeDir: string, archiveId: string): Promise<number> {
  const dir = join(runtimeDir, 'recovery-archive', archiveId);
  let total = 0;
  for (const name of await readdir(dir)) total += (await stat(join(dir, name))).size;
  return total;
}
