import { rename } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

// Windows readers/scanners can briefly deny replacement. Retry only the atomic rename
// of an already closed, flushed file, never writing again or removing the old target.
// Permanent failures still reach the caller's fail-closed persistence boundary.
export async function replaceCheckpoint(source: string, target: string, platform = process.platform): Promise<void> {
  const delays = [10, 25, 50, 100];
  for (let attempt = 0;; attempt++) {
    try { await rename(source, target); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '') || attempt >= delays.length) throw error;
      await setTimeout(delays[attempt]!);
    }
  }
}
