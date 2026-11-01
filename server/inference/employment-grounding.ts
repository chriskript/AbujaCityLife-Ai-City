import { npcDecisionSchema } from '../../shared/neighbourhood/decision-schema.js';
import type { NpcObservation } from '../../shared/neighbourhood/types.js';

export const employmentInstructions = ' Employment: town.work lists only jobs you legitimately know, including jobs you lack the skill for. skill is required, matchesSkill describes your own qualification, node is the workplace and atWorkplace means physical presence. available and funded are separate: a funded business can have no opening. Null is unknown; historical values are not current. funded does not reveal an account balance. take-work is allowed ONLY for an ID in town.eligibleWorkIds, whose current eligibility has been checked. An empty list means no job can be taken now; you can still travel to a known workplace to inspect it, ask a permitted question, wait, or choose another action. A location name, biography, courier experience or another business funding establishes no vacancy or skill. Never invent a businessId. Eligibility can change before execution, so authoritative validation still applies.';

// Tighten only the live proposal format, using the actual scoped observation.
// Global schema and world validation remain independent and strict.
export function employmentDecisionSchema(observation:NpcObservation) {
  const schema=structuredClone(npcDecisionSchema);
  const eligible=observation.town?.eligibleWorkIds ?? [];
  schema.properties.action.anyOf=schema.properties.action.anyOf.filter(branch=>{
    if(branch.properties.type.enum[0]!=='take-work')return true;
    if(!eligible.length)return false;
    (branch.properties as Record<string,unknown>).businessId={type:'string',enum:[...eligible]};
    return true;
  });
  return schema;
}
