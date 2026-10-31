import { open, readFile } from 'node:fs/promises';
import { replaceCheckpoint } from './replace-checkpoint.js';
import { randomUUID } from 'node:crypto';
import { Neighbourhood } from '../../shared/neighbourhood/world.js';

// Local checkpoint persistence only. No server, shared public world, or inference.
export async function saveNeighbourhood(path: string, world: Neighbourhood): Promise<void> {
  const temporary = `${path}.${randomUUID()}.pending`;
  const file = await open(temporary, 'wx', 0o600);
  try { await file.writeFile(world.serialize()); await file.sync(); }
  finally { await file.close(); }
  await replaceCheckpoint(temporary, path);
}
export async function loadNeighbourhood(path: string): Promise<Neighbourhood> {
  return Neighbourhood.restore(await readFile(path, 'utf8'));
}
