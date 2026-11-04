import type { NpcDecision, NpcDecisionRequest, NpcObservation } from './types.js';
import { pathToNode } from '../navigation/routes.js';
import { mapFor } from '../world/town-layout.js';

// Deterministic continuity for Muse-unavailable operation. This policy may
// only honour previously authorised commitments and bounded self-maintenance.
// It never initiates ambitions, relationships, purchases, employment,
// negotiations, or social interaction. Every decision is labelled CONTINUITY
// and recorded with continuity provenance, never as live AI reasoning.
export const CONTINUITY_ACTION_TYPES = ['fulfil-transport', 'eat', 'rest', 'travel', 'wait'] as const;

// Triggers that carry no new social, economic, or commitment information.
// Anything else means Muse (when available) should see the decision.
const QUIESCENT_TRIGGERS = new Set(['activity-completed', 'action-completed', 'meal-completed', 'action-failed', 'personal-needs-changed']);

const openThread = (status: string): boolean => ['queued', 'pending', 'connected', 'ignored'].includes(status);
const openTask = (status: string): boolean => ['proposed', 'accepted', 'collected'].includes(status);

// Stranded means idle with no live commitment, conversation, encounter, or
// meeting, standing somewhere that is none of home, workplace, or leisure.
// Pending journeys, work timers, and travel complete deterministically and
// are never interrupted: only idle residents qualify.
export function isStrandedResident(o: NpcObservation, triggers: string[]): boolean {
  const a = o.actor, id = a.id;
  if (!a.home || a.activity.kind !== 'idle' || o.decisionRecovery) return false;
  if (!triggers.every(t => QUIESCENT_TRIGGERS.has(t))) return false;
  if (o.tasks.some(t => (t.requester === id || t.recipient === id) && openTask(t.status))) return false;
  if ((o.communication?.threads ?? []).some(t => (t.initiator === id || t.recipient === id) && openThread(t.status))) return false;
  if (o.encounters.some(e => (e.initiator === id || e.recipient === id) && e.status === 'pending')) return false;
  if ((o.socialVisits?.invitations ?? []).some(i => i.expiresAt > o.time && (i.update.status === 'pending' || i.update.status === 'accepted'))) return false;
  if ([a.home, a.routine?.workplace, a.routine?.leisure].includes(a.node)) return false;
  if (!o.permittedActions.includes('travel') || !a.knowledge.places.includes(a.home)) return false;
  return Boolean(pathToNode(a.node, a.home, new Set(o.knownBlockedEdges), mapFor(o.mapId)));
}

export function continuityDecision(request: NpcDecisionRequest): NpcDecision {
  const o = request.observation, a = o.actor;
  const goalId = a.goals[0]!.id;
  const audit = ` [${request.triggers.join(', ')}]`;
  const choose = (action: NpcDecision['action'], reason: string): NpcDecision => ({ goalId, reason: ('CONTINUITY: ' + reason + audit).slice(0, 400), action });
  const permitted = (type: NpcDecision['action']['type']): boolean => o.permittedActions.includes(type);
  // Previously authorised commitment: a delivery this resident accepted.
  const accepted = o.tasks.find(t => t.recipient === a.id && ['accepted', 'collected'].includes(t.status));
  if (accepted && permitted('fulfil-transport')) return choose({ type: 'fulfil-transport', taskId: accepted.id }, 'Honour the previously accepted delivery commitment.');
  // Bounded maintenance: eat food already owned, never purchase.
  if (a.needs.food >= 0.6 && (a.inventory.food ?? 0) >= 1 && permitted('eat')) return choose({ type: 'eat', quantity: 1 }, 'Eat owned food to meet hunger.');
  // Stranded residents return to their own home; nothing else moves them.
  if (isStrandedResident(o, request.triggers)) return choose({ type: 'travel', destination: a.home! }, `No pending commitments at ${a.node}; return to my own home.`);
  // Bounded maintenance: rest where rest is valid, never elsewhere.
  const restful = a.node === a.home || a.knowledge.placeFacts?.[a.node]?.services.includes('scenic-view') === true;
  if ((a.needs.rest ?? 0) >= 0.7 && restful && permitted('rest')) return choose({ type: 'rest', seconds: 60 }, 'Rest while Muse reasoning is unavailable.');
  return choose({ type: 'wait', seconds: 45 }, 'Hold position; no authorised commitment or maintenance applies.');
}
