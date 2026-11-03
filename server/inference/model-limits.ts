import { inferenceCost } from './meta-probe.js';

export type InputTokenLimit = 6000 | 8000;
export const defaultInputTokenLimit:InputTokenLimit=6000;
export function generationReservation(input:InputTokenLimit=defaultInputTokenLimit):number {
  if(input!==6000&&input!==8000)throw new Error('Unsupported reviewed input ceiling');
  return inferenceCost('muse-spark-1.3',input,2048);
}

export type InferenceDeadlineMs=20000|30000;
export function reviewedInferenceDeadline(value:unknown=20000):InferenceDeadlineMs {
  if(value!==20000&&value!==30000)throw new Error('Unsupported reviewed inference deadline');
  return value;
}
