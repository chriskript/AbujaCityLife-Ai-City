import { writeFile } from 'node:fs/promises';
import { inspectPhaseB } from './inspect-phase-b.js';
const readiness=await inspectPhaseB(200,8000);
const result={...readiness,proposedEvaluation:{phase:'7g-d-society',maximumGenerations:200,maximumIncrementalUsd:5,simulationSeconds:1800,wallMs:5400000,inputTokenLimit:8000},approvalRequired:true};
await writeFile('docs/7g-phase-d-readiness.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
