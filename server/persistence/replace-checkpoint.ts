import { rename } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { channel } from 'node:diagnostics_channel';

// Optional process-local acceptance diagnostics: paths/status only, no payload.
const replacements = channel('citylab.checkpoint.replace');

// Windows readers/scanners can briefly deny replacement. Retry only the atomic rename
// of an already closed, flushed file, never writing again or removing the old target.
// Permanent failures still reach the caller's fail-closed persistence boundary.
export async function replaceCheckpoint(source: string, target: string, platform = process.platform): Promise<void> {
  const started=performance.now();
  // A scanner can hold the closed target longer than one 250ms world step.
  // Bound replacement-only contention to 1.585s; permanent errors still stop.
  const delays = [10, 25, 50, 100, 200, 400, 800];
  for (let attempt = 0;; attempt++) {
    try {
      await rename(source, target);
      if(replacements.hasSubscribers)replacements.publish({source,target,outcome:'replaced',attempt:attempt+1,elapsedMs:performance.now()-started});
      return;
    }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retry=platform==='win32'&&['EPERM','EACCES','EBUSY'].includes(code??'')&&attempt<delays.length;
      if(replacements.hasSubscribers)replacements.publish({source,target,outcome:retry?'contention':'failed',code:code??'unknown',attempt:attempt+1,elapsedMs:performance.now()-started});
      if(!retry)throw error;
      await setTimeout(delays[attempt]!);
    }
  }
}
