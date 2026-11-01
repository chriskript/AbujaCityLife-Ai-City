import { writeFile } from 'node:fs/promises';
import { inspectPhaseB } from './inspect-phase-b.js';

// Read-only settings and ledger inspection. Never creates an approval or provider.
const readiness=await inspectPhaseB(36);
const result={...readiness,proposedEvaluation:{phase:'7g-c-unity',maximumGenerations:36,maximumIncrementalUsd:.60,simulationSeconds:600,wallMs:1200000},
  recommendedCumulativeUsd:5,cumulativeChangeApplied:false};
await writeFile(new URL('../docs/7g-phase-c-readiness.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
