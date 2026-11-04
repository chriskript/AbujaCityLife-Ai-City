# ABUJA CITY LIFE: AI TOWN
## Project Development Handover to Muse Code

**Project:** Abuja City Life: AI Town  
**Simulation:** Unity Gardens  
**Repository:** https://github.com/chriskript/AbujaCityLife-Ai-City  
**Primary development environment:** Windows, VS Code, Git Bash and PowerShell  
**Technology:** TypeScript, Node.js, Vite, Three.js, Meta Muse Spark 1.3  
**Handover date:** November 4, 2026  
**Previous development assistant:** OpenAI Codex  
**Incoming development assistant:** Muse Code

---

## 1. Purpose of this handover

You are taking over development of Abuja City Life: AI Town.

This document provides the product vision, engineering context, architectural decisions, completed work, current limitations and development priorities.

You have access to the repository and should inspect the actual implementation before making changes.

Treat this document as project-owner context, not as a substitute for source-code verification.

Where this handover conflicts with the current repository, identify the discrepancy rather than silently assuming either is correct.

The objective is to continue development of the existing application, not restart the project, create another prototype or build disconnected experimental implementations.

## 2. Project vision

Abuja City Life: AI Town is a browser-based 3D simulation of an evolving Nigerian society.

Its current setting is Unity Gardens, a fictional neighbourhood inspired by Abuja, Nigeria.

The central idea is that **the residents are independent inhabitants of the world, not merely NPCs waiting for a human player to interact with them**.

The human user should be able to observe the society, explore the environment, inspect residents, interact with them and eventually influence their lives.

However, the residents must have agency independent of the human observer.

### Long-term vision

Residents should progressively develop the ability to:

- Make independent decisions based on personality, knowledge, needs, experiences and ambitions.
- Develop personal goals and change those goals over time.
- Form friendships, rivalries, romantic relationships and other meaningful social connections.
- Communicate naturally through face-to-face conversations, calls and messages.
- Seek employment, change occupations, learn skills and establish businesses.
- Earn, spend, save, negotiate and manage resources.
- Collaborate, compete, disagree, refuse requests and reconcile.
- Make mistakes, experience consequences and learn from them.
- Develop commitments and remember their consequences.
- Influence their surroundings and participate in the evolution of their community.
- Eventually participate in a society that changes across years and generations.

These are product objectives, not claims that every capability currently exists.

**The long-term goal is an emergent society whose history is created through the independent actions and interactions of its inhabitants.**

The environment should support meaningful freedom within understandable physical, economic and social rules.

## 3. Core development philosophy

Several principles have guided development and should remain intact.

### 3.1 Residents are the main characters

The world should not depend on a player being present.

Residents must continue their permitted activities and decisions when no browser observer is connected, subject to operational limits.

### 3.2 Genuine agency over scripted appearances

Avoid creating the illusion of autonomy by scripting every possible conversation or activity.

Give residents meaningful choices, persistent consequences and opportunities to initiate behaviour.

Existing deterministic mechanics are necessary, but should not dictate every resident's intentions.

### 3.3 Muse proposes, the world validates and executes

This is a foundational architectural rule.

Meta Muse may propose decisions, dialogue, goals and actions.

The authoritative simulation must validate proposals against capabilities, location, knowledge, consent, resources and world rules before execution.

Muse must never directly mutate authoritative inventory, balances, positions, contracts or other world state.

### 3.4 Persistent consequences

Resident decisions should matter beyond the current interaction.

Memories, economic transactions, commitments, social histories and world changes must survive browser refreshes and backend restarts.

### 3.5 One integrated application

The project should operate as one coherent system.

Avoid unnecessary parallel launchers, repeated prototypes, isolated feature slices or disconnected implementations.

Experimental evaluations may remain separate for reproducibility, but accepted features should be integrated into normal operation.

### 3.6 Browser-first experience

The application targets desktop and mobile browsers.

Visual quality, usability, performance and accessibility matter, but backend simulation correctness must not be sacrificed for visual presentation.

## 4. Current application: Unity Gardens

The current simulated community contains sixteen residents in a neighbourhood approximately 390 × 320 metres.

Residents have identities, occupations, capabilities, predefined goals, needs, memories and a limited representation of social connections.

The town contains homes, workplaces, Market Square, a supply cooperative, community facilities, pedestrian routes and other locations.

The existing browser uses a stylized isometric 3D visual presentation built with Three.js.

### Resident registry

The sixteen residents are:

1. Musa
2. Amina
3. Zainab
4. Chris
5. Fatima
6. Tunde
7. Halima
8. Ibrahim
9. Yusuf
10. Ngozi
11. Emeka
12. Grace
13. Ladi
14. Sadiq
15. Maryam
16. Bisi

Preserve their existing identities, personal histories, knowledge, economic state and relationships.

Do not randomly regenerate residents or overwrite the operating society.

## 5. Existing system capabilities

The following systems have been implemented or demonstrated.

### Authoritative simulation

- Deterministic world advancement.
- Resident activities, movement and navigation.
- Route planning and road-closure handling.
- Needs and activity progression.
- Action eligibility and semantic validation.
- Versioned world checkpoints and recovery.
- Pause and resume controls.
- Observer-independent simulation progression.

### AI reasoning

- Meta Muse Spark 1.3 integration through the Responses API.
- Resident-scoped observations.
- Structured decision schemas.
- Selective inference routing.
- Token preflight and spending reservations.
- Rejection and bounded recovery mechanisms.
- Live Muse decisions validated by the authoritative world.
- Explicit separation between mock behaviour and live inference.

### Social interactions

- Face-to-face encounters.
- Introductions and information requests.
- Contacts and acquaintances.
- Phone calls and delayed text messages.
- Invitations and social visits.
- Some multi-step social coordination.

### Economy

- Money and inventory conservation.
- Work opportunities and payments.
- Stock collection and replenishment.
- Transport cooperation.
- Escrow-based commitments.
- Finite supply mechanisms.
- Economic validation and affordability checks.

### Memory and knowledge

- Individual resident memories.
- Personally observed information.
- Reported information distinguished from confirmed facts.
- Recorded commitments and outcomes.
- Knowledge-constrained inference context.
- Limited memory storage and context management.

### Browser interface

- Three.js neighbourhood rendering.
- Resident and location inspection.
- Activity/event feeds.
- Resident phone interfaces.
- Searchable resident presentation.
- Simulation speed and pause controls.
- Live Muse/Mock indication.
- Inference and spending status.
- Operator controls for managing inference.

These features vary in maturity. Presence in the code does not automatically mean all behaviours have been thoroughly validated in live operation.

## 6. Major architectural components

Inspect these modules to establish the current source of truth.

| Component | Relevant implementation |
|---|---|
| Authoritative world | `shared/neighbourhood/world.ts` |
| Resident decisions | `shared/neighbourhood/town-policy.ts` |
| Action schema | `shared/neighbourhood/decision-schema.ts` |
| Resident state/types | `shared/neighbourhood/types.ts` |
| World snapshots | `shared/neighbourhood/snapshot.ts` |
| Simulation session | `server/session.ts` |
| HTTP interface | `server/http.ts` |
| Autonomous progression | `server/progression.ts` |
| Selective reasoning | `server/inference/selective-provider.ts` |
| Muse integration | `server/inference/neighbourhood-provider.ts` |
| Model context | `server/inference/model-context.ts` |
| Local live application | `server/local-application.ts` |
| Local operating policy | `server/controls/local-policy.ts` |
| Spending controls | `server/controls/probe-budget.ts` |
| Local launcher | `scripts/dev-live.ts` |
| Policy commands | `scripts/muse-policy.ts` |
| Browser UI | `client/src/neighbourhood.ts` |
| Remote session adapter | `client/src/simulation/remote-neighbourhood-session.ts` |

See `docs/architecture.md`, `docs/backend.md`, `docs/local-live.md`, `docs/unity-gardens.md` and the relevant milestone reports.

## 7. Previous live Muse verification

The project has undergone multiple live Muse evaluations.

Reported results include:

- Real Muse responses across all sixteen residents.
- Validated autonomous decisions.
- Observer-independent reasoning.
- Economic cooperation and recovery.
- Phone and social interactions.
- Browser pause, refresh and reconnection tests.
- Persistent checkpoints and recovery.
- Budgeted API usage.

One November 3 HTTP/browser evaluation reported 64 real generations, including 63 accepted actions and one safely discarded pause-boundary result.

These evaluations established that real Muse reasoning can operate within the authoritative simulation.

They did not establish that every intended form of autonomous behaviour exists.

Review the original evidence and validation reports before citing precise performance or reliability claims.

## 8. Recent major change: Unified local Muse operation

On November 4, 2026, the previous assistant implemented a unified local live application.

The principal command is:

`npm run dev:live`

The unified implementation reuses the existing simulation, HTTP interface, scheduler, selective Muse provider and checkpoint system.

It introduces:

- Persistent local live operation.
- Reusable owner-authorized inference policy.
- Durable request, token and spending reservations.
- Persistent world recovery across restarts.
- Inference suspension and runtime status.
- Browser inference controls.
- Separation of ordinary live operation from bounded evaluation launchers.

Normal local operation no longer requires generating a fresh approved evaluation plan on every startup.

### Local operating commands

```bash
npm run muse:policy -- status
npm run muse:policy -- authorize
npm run muse:policy -- disable
npm run dev:live
```

The current local operating policy was configured with:

- Daily application ceiling: $0.25.
- Cumulative application ceiling: $1.
- Maximum requests: 12.
- Maximum reserved tokens: 100,000.
- Concurrent inference requests: 1.
- Maximum rate: 6 requests per minute.
- Input token ceiling: 8,000.
- Output token ceiling: 2,048.

These are additional local operating limits, not Meta account credit.

The original upstream spending ledger remains independently enforced, including its existing temporary allowance expiry.

Policy authorization may persist across restarts, and paid inference must never be triggered during development without checking current authorization and applicable limits.

The full operating guide is `docs/local-live.md`.

## 9. Checkpoint recovery and migration

The first unified live startup encountered an abandoned pending checkpoint and stale backend lock.

These were investigated and safely archived.

The existing canonical checkpoint was validated, and the legacy accounting was migrated using the application's existing authorization and recovery paths.

The operating world was preserved.

At recovery completion:

- Sixteen residents were retained.
- The original world identity remained unchanged.
- Simulation time was 1,374.25 simulated seconds.
- The society was paused.
- Legacy spending and request accounting were preserved.
- A verified rollback backup was retained.
- `npm run dev:live -- --check` passed.

See:

`runtime/recovery-archive/2026-11-04-checkpoint-recovery/RECOVERY-NOTES.txt`

Never delete checkpoints, pending transactions, locks, spending ledgers or recovery archives to force startup.

Verify process ownership and persistence integrity before recovery operations.

## 10. Current local operating status

The owner successfully launched the unified application at:

`http://127.0.0.1:8787/`

Local authentication succeeded using the existing access token.

The browser displayed Unity Gardens, all sixteen registered residents and a Live Muse/backend indicator.

The society was resumed, and its simulation clock advanced.

The latest screenshots showed simulated time advancing from approximately 23:02 to 23:49.

The activity feed displayed introductions, invitations, activity completions, arrivals and encounters.

This confirms local browser access and visible simulation progression.

However, these screenshots alone do not establish how many fresh billable Muse responses were accepted during that observation.

Review current inference status and recorded decision provenance before making that claim.

## 11. Immediate issue: Residents standing idle in unnatural locations

This is the newest owner-observed issue and an important development priority.

During local live testing, several residents appeared to remain stationary for extended simulated periods.

Some congregated around Market Square, while others stood near roads or intersections.

In one observation, Sadiq was visibly moving while most other residents appeared stationary.

The world clock continued advancing, so the behaviour was not necessarily a global simulation pause.

### Expected behaviour

Residents should live naturally within their environment.

When not occupied, they should be capable of:

- Returning home.
- Visiting workplaces.
- Resting in appropriate locations.
- Spending time in public spaces.
- Visiting acquaintances or friends.
- Running errands.
- Pursuing personal needs or intentions.
- Remaining stationary when doing so has an understandable purpose.

Do not create random walking solely to make the world look active.

A person resting at home is believable. Someone standing indefinitely in the centre of a road after finishing an unrelated activity is not.

### Investigation required

Determine whether the problem originates from:

- Insufficient decision triggers.
- Inference scheduler starvation.
- Missing or inappropriate destinations.
- Repeated `wait` decisions.
- Activity completion transitions.
- Resident navigation and positioning.
- Inadequate time-of-day context.
- Limited world knowledge.
- Budget or inference suspension.
- Rendering/interpolation behaviour.
- Or a combination of these.

Check authoritative state against what the browser renders.

Do not assume the problem is caused by Muse without evidence.

The immediate task should be a read-only investigation followed by a focused implementation proposal.

## 12. Previous Muse Code architectural assessment

Muse Code previously inspected the repository and identified several limitations affecting genuine autonomy.

### Tactical versus strategic autonomy

The current system offers tactical freedom within a predefined catalogue of permitted actions.

Residents can select actions, refuse, communicate, cooperate and react to events.

However, their broader life direction remains highly constrained.

### Static personal goals

Resident goals and priorities are initialized from fixed profiles and cannot currently evolve freely.

Residents cannot independently create, abandon or substantially reorder their long-term ambitions.

### Trigger-dependent reasoning

Residents generally require predefined simulation triggers before a reasoning opportunity is created.

There is no fully developed resident-controlled scheduling mechanism for future reflection or self-initiated decisions.

### Limited relationships

Relationship state is largely represented through activity and interaction counters.

Rich persistent trust, friendship, disagreement, resentment, reconciliation and relationship development are not yet established.

### Conversation throughput

The system uses a restrictive global inference scheduler.

One in-flight request and bounded request rates can limit sustained multi-turn conversations across sixteen residents.

### Limited long-term memory

Memories are capped and context must fit within model token limits.

Long-term consolidation, archival and retrieval remain incomplete.

### Restricted economy

Residents cannot yet freely found businesses, change careers, learn new skills, negotiate a broad range of contracts or alter the town's underlying economic institutions.

### Closed action catalogue

Emergent behaviour currently arises through combinations of predefined validated actions.

The system does not permit unrestricted creation of new action mechanics.

These limitations should inform the long-term roadmap, but they should not all be addressed simultaneously.

## 13. Next development priorities

### Priority 1: Believable daily resident behaviour

Investigate and correct prolonged idle behaviour and unnatural standing locations.

Ensure existing residents can occupy homes, workplaces and public spaces naturally.

Preserve their agency and existing economic/social responsibilities.

### Priority 2: Self-directed intentions and evolving goals

Introduce carefully validated mechanisms for residents to reconsider priorities, adopt new goals and schedule future decisions.

Preserve deterministic validation and checkpoint compatibility.

### Priority 3: Meaningful relationships

Develop persistent social state that reflects witnessed interactions and affects future decisions.

Include friendship, trust, disagreement and relationship repair without hardcoding every social outcome.

### Priority 4: Sustained natural conversation

Improve dialogue continuity, turn-taking, scheduling fairness and social interaction incentives.

Avoid consuming unnecessary inference merely to produce background chatter.

### Priority 5: Memory continuity

Develop auditable long-term memory consolidation and retrieval so residents can retain significant experiences over extended simulation periods.

### Priority 6: Economic and societal expansion

Gradually support broader jobs, skills, enterprises, negotiations, ownership and community development.

This will require deeper simulation and persistence changes.

### Priority 7: Public deployment

Prepare a secure public URL for hackathon judges and future visitors.

The preferred initial deployment model is one hosted, persistent society accessible to multiple read-only observers.

Public visitors should not receive unrestricted operator access or directly control paid inference.

The current local HTTP authentication is designed for a trusted local operator, not public multi-user access.

Cloud deployment, durable storage, visitor authentication/authorization, public traffic limits and API cost protection require separate engineering work.

## 14. Development expectations

The project owner prefers deliberate, integrated engineering work rather than repeated prototypes.

Follow these principles:

1. Inspect existing code before proposing a new implementation.
2. Reuse working modules instead of duplicating them.
3. Address underlying causes rather than adding superficial workarounds.
4. Avoid unrelated feature development during focused tasks.
5. Prefer coherent project-wide integration over indefinitely isolated experimental slices.
6. Preserve resident identities and authoritative world continuity.
7. Maintain action validation, economic conservation and privacy constraints.
8. Use offline tests and mocked inference before spending API credits.
9. Clearly distinguish tested behaviour from assumptions and unfinished features.
10. Report failures and limitations explicitly.
11. Do not silently switch live inference to mock reasoning.
12. Do not reset spending history, checkpoint state or resident data.
13. Do not commit or push unless instructed.
14. Keep explanations technically precise but understandable.
15. Treat the project owner's vision as the primary product direction.

Avoid creating a new launcher or alternative simulation merely to demonstrate a feature that should be integrated into the normal application.

## 15. Files and evidence worth reviewing

Prioritize the following documents and supporting source files:

- `README.md`
- `docs/architecture.md`
- `docs/ai-town-assessment.md`
- `docs/backend.md`
- `docs/local-live.md`
- `docs/unity-gardens.md`
- `docs/unity-gardens-redesign.md`
- `docs/nov3-autonomous-society-validation.md`
- `docs/nov3-sustained-muse-live-evaluation.md`
- `docs/nov3-integrated-acceptance.md`
- `docs/submission-readiness-2026-11-03.md`
- `docs/model-context-management.md`
- `docs/economic-sustainability-and-recovery.md`

Examine the current source and tests to verify that these documents reflect the latest implementation.

Historical evaluation artifacts should remain available as evidence, not become substitutes for the canonical persistent world.

## 16. Immediate handover instructions

Before making modifications:

1. Review this handover and inspect the current repository architecture.
2. Establish the current Git working-tree state without modifying it.
3. Identify the authoritative live runtime and checkpoint paths.
4. Review existing Muse policy and inference controls without exposing credentials.
5. Inspect the resident decision lifecycle and idle activity transitions.
6. Compare backend resident state with the current browser presentation.
7. Identify which existing systems already support meaningful home/work/public-place behaviour.
8. Report confirmed findings and recommend a coherent solution.

Do not run billable Muse API evaluations or modify the operating checkpoint without explicit authorization.

Do not implement the proposed autonomy expansion until the immediate issue has been assessed.

## 17. Definition of project success

The ultimate success of Abuja City Life: AI Town is not simply that sixteen residents can move around a 3D map or generate AI dialogue.

Success means that residents gradually develop distinguishable lives.

Their decisions should be influenced by their own knowledge, experiences, circumstances, relationships and evolving ambitions.

Their actions should have consequences that persist.

They should cooperate, disagree, build relationships, pursue opportunities, make mistakes and change direction.

The community should accumulate a history that was not manually scripted in advance.

The human observer should be able to return later and discover that meaningful things happened while they were away.

**We are not building a town full of characters waiting for commands. We are building a society whose inhabitants have lives of their own.**

---

**End of handover.**