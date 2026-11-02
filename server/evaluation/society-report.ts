import type { NpcDecisionRequest, WorldState } from '../../shared/neighbourhood/types.js';
import type { GenerationMetrics } from '../../shared/neighbourhood/conversation.js';

const equal = (a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function societyStateChanges(before: WorldState, after: WorldState) {
  const residents=Object.keys(after.npcs).flatMap(id=>{
    const a=before.npcs[id]!,b=after.npcs[id]!;
    const changes=Object.fromEntries((['node','activity','inventory','relationships','memories','knowledge','intention','needs'] as const)
      .filter(key=>!equal(a[key],b[key])).map(key=>[key,{before:a[key],after:b[key]}]));
    return Object.keys(changes).length?[{id,changes}]:[];
  });
  return {residents,trade:equal(before.trade,after.trade)?null:{before:before.trade,after:after.trade},decisionRecovery:equal(before.decisionRecovery,after.decisionRecovery)?null:{before:before.decisionRecovery,after:after.decisionRecovery},tasks:equal(before.tasks,after.tasks)?null:{before:before.tasks,after:after.tasks},
    socialVisits:equal(before.socialVisits,after.socialVisits)?null:{before:before.socialVisits,after:after.socialVisits},
    communication:equal(before.communication,after.communication)?null:{before:before.communication,after:after.communication},
    economy:equal(before.town,after.town)?null:{before:before.town,after:after.town},
    resources:equal(before.resources,after.resources)?null:{before:before.resources,after:after.resources}};
}
export interface SocietyDecisionEvidence {
  number:number;actorId:string;opportunity:string|null;request:NpcDecisionRequest;
  decision:unknown;offlineCounterfactual:unknown;metrics:GenerationMetrics|null;
  invocationEvidence:object|null;
  validation:unknown;changes:ReturnType<typeof societyStateChanges>;
  contextAssessment:{publicExplanation:string|null;suppliedHistoryIds:string[];operatorInterpretation:null;influence:'requires-human-review';causalImprovement:'not-established'};
}
export function societyReportMarkdown(report:{kind:string;stopReason:string;calls:number;maximumReservedUsd:number;decisions:SocietyDecisionEvidence[];selectedResidents:string[];actualUsage:{knownEstimatedUsd:number;unknownInvocations:number}}):string {
  const intro=`# Unity Gardens: multi-resident evaluation\n\nKind: **${report.kind}**. Stop: ${report.stopReason}. Selected: ${report.selectedResidents.join(', ')}. Invocations: ${report.calls}. Worst-case invocation reservations: $${report.maximumReservedUsd.toFixed(6)}. Known token cost: $${report.actualUsage.knownEstimatedUsd.toFixed(8)}; invocations with unknown usage: ${report.actualUsage.unknownInvocations}. Reservations are not billing.\n\nSynthetic rehearsals establish safeguards only. No automated claim of improved reasoning is made. Review public explanations separately from operator interpretation; private model reasoning is neither requested nor recorded. Accepted discussion, accepted task and completed execution are separate evidence levels. Full scoped requests, deltas, baseline, metrics and persisted worlds are in report.json and evidence.ndjson.\n`;
  return intro+report.decisions.map(d=>`\n## Invocation ${d.number}: ${d.actorId}\n\nOpportunity: ${d.opportunity}.\n\nExact structured decision:\n\n\x60\x60\x60json\n${JSON.stringify(d.decision,null,2)}\n\x60\x60\x60\n\nValidation:\n\n\x60\x60\x60json\n${JSON.stringify(d.validation,null,2)}\n\x60\x60\x60\n\nPublic explanation: ${JSON.stringify(d.contextAssessment.publicExplanation)}\n\nSupplied history IDs: ${d.contextAssessment.suppliedHistoryIds.join(', ')}.\n\nContext influence: requires human review of the exact explanation against the supplied facts and current evidence. Operator interpretation: not yet recorded. Causal improvement: not established.\n\nMetrics: ${JSON.stringify(d.metrics)}\n`).join('');
}
