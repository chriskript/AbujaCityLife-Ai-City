import type { WorldState } from './types.js';

// Authored context is NOT simulation evidence. Pin content to this revision forever;
// future revisions require an explicit migration rather than changing old saves' past.
export const neighbourhoodHistory = {
  origins: 'Unity Gardens is a fictional residential community in Abuja, Nigeria. It began as a modest development on the outskirts; homes were occupied gradually and small businesses grew around everyday needs.',
  character: 'At the start of the simulation, apartment blocks and standalone homes share a neighbourhood with market trading, transport, repairs, supply work, care, teaching and tailoring. Residents have different means and priorities; ordinary trade and services are functioning.',
  spaces: 'The existing roads, utilities, central green, Hill Garden, Lake Overlook and community facilities developed alongside housing and commerce. This history grants no new access, routes or service availability.',
  concerns: 'Ordinary unresolved questions at the start include how to care for shared spaces, keep access roads maintained and make everyday services dependable and affordable. These are background concerns, not reports of failures or urgent tasks.',
  leadership: 'At the start there is no elected community leader or formally established residents association. Residents may hold different views about future development; no organisation, candidate or election is predetermined.',
} as const;
export type HistoryFactId = keyof typeof neighbourhoodHistory;
export interface ResidentHistory { public: string; private: string }
export const residentHistories: Readonly<Record<string, ResidentHistory>> = {
  musa: { public: 'Built familiarity with local routes through taxi work as the neighbourhood grew.', private: 'Experience with variable transport demand taught him to weigh a job against time and capacity; reliable earnings matter more than accepting every request.' },
  amina: { public: 'Developed a market livelihood serving everyday customers as local commerce took shape.', private: 'Experience managing stall stock taught her to compare collecting supplies herself with seeking help. Past acquaintance does not settle whom she should ask today.' },
  zainab: { public: 'Became familiar with the market and community centre through ordinary local errands.', private: 'Everyday visits gave her an interest in how neighbours find useful information. Curiosity does not oblige her to interrupt her own errands.' },
  chris: { public: 'A recent arrival combining repair apprenticeship with supply courier work.', private: 'Moved into rented lodging near Hill Garden while finding local work. A taxi ride introduced him to Musa; he arrived without having met the market trader. Repair errands and paid work both compete for his time.' },
  fatima: { public: 'Brought nursing experience to a local care desk as neighbourhood services developed.', private: 'Care work taught her the value of dependability and the cost of neglecting rest. She wants a sustainable working day rather than an unlimited obligation to help.' },
  tunde: { public: 'Built a small repair workshop serving the neighbourhood transport and repair trade.', private: 'Workshop experience made repeat custom important to him. He weighs helping others against the time and resources needed to keep repair work dependable.' },
  halima: { public: 'Helped organise practical supply work around the community centre cooperative.', private: 'Coordinating finite inputs taught her to consider budgets as well as demand. Keeping supplies useful need not mean agreeing to every proposed arrangement.' },
  ibrahim: { public: 'Combined growing experience with practical supply work around Hill Garden and the centre.', private: 'Hands-on work taught him to value productive inputs and paid opportunities. Growing and supply work gave him practical ways to seek regular meals and a steadier independent livelihood.' },
  yusuf: { public: 'Developed tutoring work around the local learning desk.', private: 'Balancing teaching with personal study made time a scarce resource. Local connections may help his work, but accepting more sessions can compete with learning.' },
  ngozi: { public: 'Gained cooking and market experience helping with Amina\'s stall and supply errands.', private: 'Market work sparked an interest in learning to run a stall. Experience with errands gives her options, not a guaranteed job or claim on another person\'s help.' },
  emeka: { public: 'Established electrical repair work alongside the stand-side workshop trade.', private: 'Repair experience taught him that finishing accepted work matters. He prefers to consider capacity before taking on another request.' },
  grace: { public: 'Came to shared lodging near Hill Garden while studying and taking occasional work.', private: 'Balancing study with everyday expenses taught her to look for manageable paid work. She began knowing Yusuf, without a personal acquaintance with the market trader.' },
  ladi: { public: 'Developed walking courier work around market and centre errands.', private: 'Carrying supplies on foot taught him to consider distance and suitable loads. He has met Amina, but wants to build reliability through work actually completed.' },
  sadiq: { public: 'Started learning repair work through apprenticeship with Tunde.', private: 'Apprenticeship gave him a practical starting point for earning more independently. Learning and immediate income can pull his attention in different directions.' },
  maryam: { public: 'Brought bookkeeping experience to local work, including an existing connection with Halima.', private: 'Keeping accounts taught her to weigh useful work against savings and personal time. She has preferred weighing each new responsibility against her time and personal priorities.' },
  bisi: { public: 'Built a small tailoring livelihood near the market stalls.', private: 'Tailoring experience taught her the value of steady custom and time to finish work. She knows Ngozi from the stalls and may choose how much time to give neighbours.' },
};

export interface SocialContextState {
  version: 1;
  canon: 'unity-gardens-v1';
  // Explicit knowledge grants. Public in the catalogue does not mean known by all.
  residents: Record<string, { publicFacts: HistoryFactId[]; ownHistory: boolean }>;
}
export interface SocialObservation {
  neighbourhood: 'Unity Gardens';
  historySource: 'authored-pre-simulation';
  historyAsOf: 'simulation-start';
  publicFacts: { id: string; detail: string }[];
  background: { id: string; public: string; private: string } | null;
  connections: { id: string; identityKnown: boolean; seenInSimulation: boolean; metInSimulation: boolean; hasPhoneNumber: boolean; relationshipRecorded: boolean; successfulJobs: number; trust: 'not-established-by-history' }[];
}

// Only fill missing grants; never touch inhabitants, memories, events or economy.
// Existing contexts are validated, never silently repaired or upgraded.
export function ensureSocialContext(state: WorldState, admitted: string[] = []): void {
  if (!state.town) return;
  const ids = state.socialContext ? admitted : Object.keys(state.npcs);
  state.socialContext ??= { version: 1, canon: 'unity-gardens-v1', residents: {} };
  for (const id of ids) {
    state.socialContext.residents[id] ??= { publicFacts: Object.keys(neighbourhoodHistory) as HistoryFactId[], ownHistory: Object.hasOwn(residentHistories, id) };
  }
}

export function projectSocialContext(state: WorldState, id: string, topic = ''): SocialObservation | undefined {
  const grant = state.socialContext?.residents[id];
  if (!grant) return undefined;
  const npc = state.npcs[id]!;
  const biography = grant.ownHistory ? residentHistories[id] : undefined;
  // Retrieval selects context, never actions. Always honour the saved knowledge
  // grants, even when the player explicitly asks about an ungranted fact.
  const interests = npc.goals.map(goal => goal.description).join(' ');
  const relevant: HistoryFactId[] = [
    ...(/leader|association|election|govern/i.test(topic) ? ['leadership' as const] : []),
    ...(/concern|road|maintain|afford|community|neighbourhood/i.test(topic || interests) || npc.node === 'town-green' ? ['concerns' as const] : []),
    ...(/garden|green|space|infrastructure/i.test(topic) || ['hill','overlook','town-green'].includes(npc.node) ? ['spaces' as const] : []),
    'character', 'origins',
  ];
  const selected = [...new Set(['origins' as const, ...relevant])].filter(key => grant.publicFacts.includes(key)).slice(0, 3);
  // Only actor-visible evidence; never inspect the other resident's private state.
  const encounters = Object.values(state.social.interactions).filter(item => item.initiator === id || item.recipient === id);
  const seen = (other: string) => Object.hasOwn(state.social.noticed, [id, other].sort().join(':'));
  const connections = [...new Set([...npc.knowledge.people, ...encounters.flatMap(item => [item.initiator, item.recipient])])]
    .filter(other => other !== id)
    .sort((a, b) => Number(seen(b)) - Number(seen(a)) || a.localeCompare(b)).slice(0, 6);
  return {
    neighbourhood: 'Unity Gardens', historySource: 'authored-pre-simulation', historyAsOf: 'simulation-start',
    publicFacts: selected.map(key => ({ id: `history:unity-v1:${key}`, detail: neighbourhoodHistory[key] })),
    background: biography ? { id: `history:unity-v1:self:${id}`, ...biography } : null,
    connections: connections.map(other => ({ id: other, identityKnown: npc.knowledge.people.includes(other), seenInSimulation: seen(other),
      metInSimulation: encounters.some(item => [item.initiator, item.recipient].includes(other)),
      hasPhoneNumber: npc.knowledge.contacts?.includes(other) ?? false,
      relationshipRecorded: Object.hasOwn(npc.relationships, other), successfulJobs: npc.relationships[other]?.successfulJobs ?? 0,
      trust: 'not-established-by-history',
    })),
  };
}

export const socialContextInstructions = ' socialContext is scoped authored pre-simulation background, dated to simulation-start, not a current observation or simulated event. Use only its granted facts and your own background. Background can inform options but never overrides current needs, goals, evidence or choice. Other biographies in canonical data are unavailable to you. Identity, sight recognition, meeting, phone possession, relationship records, successful work and willingness to commit are distinct. False seen/met fields mean no retained simulation evidence, not proof you never met before. History establishes no trust or obligation. Concerns need not be discussed or resolved; no leadership, partnership, friendship, election or other outcome is scheduled. Later validated events take precedence over starting circumstances. History IDs can support conversation evidence but cannot be used as memoryId for sharing or communication.';
