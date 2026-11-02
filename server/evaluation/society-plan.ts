import { validateLivePlan, type LivePlan } from '../session.js';
import { usdToMicroUsd } from '../controls/probe-budget.js';
import { townResidents } from '../../shared/neighbourhood/population.js';
import { generationReservation, type InputTokenLimit } from '../inference/model-limits.js';

export const firstSocietyLimits = {maximumGenerations:6, maximumIncrementalUsd:.10, maximumSimulationSeconds:180, maximumWallMs:300000} as const;
export const phaseBSocietyLimits = {maximumGenerations:12, maximumIncrementalUsd:.25, maximumSimulationSeconds:180, maximumWallMs:300000} as const;
export const phaseCSocietyLimits = {maximumGenerations:36, maximumIncrementalUsd:.60, maximumSimulationSeconds:600, maximumWallMs:1200000} as const;
export const contextSocietyLimits = {maximumGenerations:48, maximumIncrementalUsd:.90, maximumSimulationSeconds:1200, maximumWallMs:1800000} as const;
export const phaseDSocietyLimits = {maximumGenerations:200, maximumIncrementalUsd:5, maximumSimulationSeconds:1800, maximumWallMs:5400000} as const;
export type SocietyLimits = typeof firstSocietyLimits | typeof phaseBSocietyLimits | typeof phaseCSocietyLimits | typeof contextSocietyLimits | typeof phaseDSocietyLimits;
export const phaseBResidents = ['amina','musa','chris','halima'] as const;
export const phaseCResidents = townResidents(16).map(n=>n.id);
export function validatePhaseDApproval(value:unknown):asserts value is LivePlan {
  validateLivePlan(value);
  if((value as LivePlan).phase!=='7g-d-society')throw new Error('Not the separately approved Muse society evaluation plan');
}
export function validateContextApproval(value:unknown):asserts value is LivePlan {
  validateLivePlan(value);
  if((value as LivePlan).phase!=='7g-d-context')throw new Error('Not the separately approved context-managed evaluation plan');
}

export function validatePhaseCApproval(value:unknown): asserts value is LivePlan {
  validateLivePlan(value);
  if((value as LivePlan).phase!=='7g-c-unity')throw new Error('Not the separately approved 36-generation Unity Gardens plan');
}

export function validatePhaseBApproval(value: unknown): asserts value is LivePlan & {phase:'7g-b-unity';residents:string[];notBefore:string} {
  validateLivePlan(value);
  const p = value as LivePlan & {phase?:unknown;residents?:unknown;notBefore?:unknown};
  if (p.phase !== '7g-b-unity' || p.maxGenerations !== 12 || p.maxEstimatedUsd !== .25 || !p.allowAutonomy || JSON.stringify(p.residents) !== JSON.stringify(phaseBResidents) || typeof p.notBefore!=='string' || !Number.isFinite(Date.parse(p.notBefore)) || Date.parse(p.notBefore)>Date.now()) throw new Error('Not the reviewed Unity Gardens Phase B plan, or its start date has not arrived');
}

// Pure, read-only headroom inspection. The locked per-invocation ledger remains
// authoritative; another process spending after this check can only stop the run.
export function inspectSocietyBudget(ledger: unknown, dailyUsd: number, totalUsd: number, day: string, generations = 12,inputTokenLimit:InputTokenLimit=6000) {
  const data = ledger as {version:number;reservations:{day:string;microUsd:number}[]};
  if (!data || data.version!==1 || !Array.isArray(data.reservations) || data.reservations.some(r=>!r || !/^\d{4}-\d{2}-\d{2}$/.test(r.day) || !Number.isSafeInteger(r.microUsd) || r.microUsd<=0)) throw new Error('Invalid budget ledger');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isSafeInteger(generations) || generations<1 || generations>200 || !Number.isFinite(dailyUsd) || dailyUsd<=0 || dailyUsd>50 || !Number.isFinite(totalUsd) || totalUsd<=0 || totalUsd>100) throw new Error('Invalid evaluation budget settings');
  const perCall = usdToMicroUsd(generationReservation(inputTokenLimit)), required = generations*perCall;
  const dailyReserved = data.reservations.filter(r=>r.day===day).reduce((sum,r)=>sum+r.microUsd,0);
  const totalReserved = data.reservations.reduce((sum,r)=>sum+r.microUsd,0);
  const dailyRemaining = Math.max(0,usdToMicroUsd(dailyUsd)-dailyReserved), totalRemaining = Math.max(0,usdToMicroUsd(totalUsd)-totalReserved);
  return {day,perCallMicroUsd:perCall,requiredMicroUsd:required,dailyReservedMicroUsd:dailyReserved,totalReservedMicroUsd:totalReserved,
    dailyRemainingMicroUsd:dailyRemaining,totalRemainingMicroUsd:totalRemaining,
    affordableGenerations:Math.min(generations,Math.floor(Math.min(dailyRemaining,totalRemaining)/perCall)),
    fullRunFits:required<=dailyRemaining && required<=totalRemaining};
}
