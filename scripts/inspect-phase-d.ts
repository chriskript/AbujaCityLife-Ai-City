import { writeFile } from 'node:fs/promises';
import { inspectPhaseB } from './inspect-phase-b.js';
const readiness=await inspectPhaseB(48,8000);
const result={...readiness,proposedEvaluation:{phase:'7g-d-context',maximumGenerations:48,maximumIncrementalUsd:.90,simulationSeconds:1200,wallMs:1800000,inputTokenLimit:8000},approvalRequired:true};
await writeFile('docs/7g-phase-d-readiness.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
