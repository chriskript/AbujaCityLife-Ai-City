import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createTown } from '../shared/neighbourhood/town.js';
import type { NpcDecisionRequest } from '../shared/neighbourhood/types.js';

// Six bounded input comparisons. No provider construction, credentials or HTTP.
export function compareSocialContext() {
  const world = createTown('unity-offline-comparison');
  const invitation = world.requestInteractionDecision('amina')!;
  const result = world.applyDecision(invitation.id, {
    goalId: invitation.observation.actor.goals[0]!.id, reason: 'Offline comparison: deliver a real request',
    action: { type: 'communicate', recipient: 'musa', channel: 'text', purpose: 'request-help', message: 'Could we discuss a delivery when you have time?', memoryId: null },
  }, { mode: 'mock', model: 'offline-comparison' });
  if (!result.accepted) throw new Error('Comparison request rejected');
  world.advance(5);
  const dimensions = [
    ['choosing-whom-to-approach', 'chris', 'Recent arrival and taxi acquaintance give personal context without revealing other biographies.'],
    ['interpreting-relationships', 'tunde', 'Known Chris remains an acquaintance without an automatic phone number or earned trust.'],
    ['responding-to-requests', 'musa', 'A delivered request can be considered alongside transport experience; acceptance remains optional.'],
    ['assessing-competing-priorities', 'fatima', 'Care experience adds a reason to weigh dependability against the existing need for rest.'],
    ['discovering-cooperation', 'halima', 'Supply experience adds context for considering work and budgets, without creating partners or jobs.'],
    ['reacting-to-neighbourhood-concerns', 'maryam', 'Shared concerns become available background; bookkeeping creates no duty to organise neighbours.'],
  ] as const;
  return {
    mode: 'offline-input-comparison', generations: 0, liveEvidence: false,
    conclusion: 'Additional scoped information is present. Whether Muse uses it well requires the separately approved twelve-generation live evaluation.',
    cases: dimensions.map(([dimension, actorId, possibleRelevance]) => {
      const withContext: NpcDecisionRequest = world.requestInteractionDecision(actorId)!;
      if (!withContext) throw new Error('Missing comparison decision');
      const withoutContext = structuredClone(withContext);
      delete withoutContext.observation.socialContext;
      const baseline = JSON.stringify(withoutContext), enriched = JSON.stringify(withContext);
      world.abandonDecision(withContext.id);
      return { dimension, actorId, possibleRelevance,
        withoutContextCharacters: baseline.length, withContextCharacters: enriched.length,
        addedCharacters: enriched.length - baseline.length,
        baselineSha256: createHash('sha256').update(baseline).digest('hex'),
        // Exact added input; all other decision fields are identical by construction.
        addedContext: withContext.observation.socialContext,
        existingPriorities: withContext.observation.actor.priorities,
        existingNeeds: withContext.observation.actor.needs,
        deliveredRequests: withContext.observation.communication?.threads,
      };
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = compareSocialContext();
  await writeFile(new URL('../docs/unity-gardens-comparison.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ mode: result.mode, generations: result.generations, cases: result.cases.map(({dimension, actorId, addedCharacters, withContextCharacters}) => ({dimension, actorId, addedCharacters, withContextCharacters})) }, null, 2));
}
