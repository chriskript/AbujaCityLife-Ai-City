# Abuja City Life: AI Town — foundation assessment and implementation path

Implementation follow-up: [Milestone 7A](milestone-7a.md) now provides extensible residents, Chris, autonomous face-to-face encounters and bounded offline headless progression. The assessment below records the pre-7A findings and accepted direction; its capability statuses describe that earlier point.

Assessed October 30, 2026, against the current source, tests, documentation and milestone history. Submission deadline: November 4, 2026. AI Town extends the existing project; this assessment does not rename the repository or replace the engine.

**We create the world, its rules, and its possibilities. The residents create their own stories.**

Only the bounded Milestone 6C contract correction is implemented in this change. Everything under the proposed implementation sequence remains future work. No live Meta requests, runtime checkpoint migrations, spending-ledger changes, commits, pushes or deployments are part of this work.

## Existing milestones and evidence

| Stage | Evidence and actual result |
| --- | --- |
| Validated taxi foundation | `shared/agent`, `shared/navigation`, `shared/scenarios`; deterministic goal/route validation and closure/replanning fixtures, retained in Taxi lab |
| Three.js browser | `client/src/rendering`, `tests/browser-simulation.test.ts`; procedural world, graph movement, follow camera, cleanup and responsive presentation |
| Shared neighbourhood | `shared/neighbourhood/world.ts`, scheduler, scenario and tests; three independent actors, scoped observations, stock, transport, memories and checkpoints |
| Visible inhabitants | `presentation.ts`, local session and presentation tests; browser/headless parity, alternative fixture policies and state-derived rendering |
| Milestone 5 | `server/session.ts`, `server/http.ts`, provider and backend tests; authenticated local authority, durable frames, HTTP/SSE, scoped conversation, spending safeguards |
| Milestone 6A | [Live conversation evaluation](live-conversation-evaluation.md); one real Zainab reply, partially grounded; unsupported supply-desk food recommendation |
| Milestone 6B | [Knowledge grounding](knowledge-grounding.md) and tests; explicit services/products, evidence freshness, claims validation and conditional autonomy probe; prose entailment remains limited |
| Milestone 6C live evaluation | [Historical evaluation](live-autonomy-evaluation.md); Amina chose transport quantity eight; rejected before execution; no Musa call or delivery; 153 tests at that point |
| Milestone 6C offline correction | Shared quantity rules, bounded schemas, scoped capacity observations and regression coverage described below; revised API schema has not been live-tested |

Older architecture, neighbourhood and visual-milestone documents describe earlier stages and sometimes say no backend/provider is connected. The current source and backend/6A–6C reports supersede those status statements. No live cooperation success can be inferred from mock demonstrations.

## Capability inventory

| Area | Status | Existing implementation and limits |
| --- | --- | --- |
| Headless authority | Implemented | `Neighbourhood` owns gameplay state; detached observations/snapshots; validation precedes execution; no rendering dependency |
| Scheduling | Implemented for bounded episodes | Coalesced triggers, fair selection, cooldowns, one request in flight; `advance()` performs deterministic mechanics without inference. Time advancement uses bounded substeps, rather than a general next-event time queue |
| NPC reasoning | Partial | Goals, priorities, needs, capabilities, intentions and provider interface exist; Meta adapter exists. Normal mock choices are explicitly authored by character ID. Executable live autonomy is unproven |
| Personal lives | Partial | Distinct original identities, travel/work/wait and food/stock/income needs exist. No homes, daily calendar, fatigue, recurring need growth, mutable ambitions, occupation changes or general personal commitments |
| Knowledge and memory | Implemented foundation | Private observations, personal resource caches, evidence/provenance, reports/beliefs/commitments/outcomes, 24 retained memories. No long-term consolidation or complete town archive |
| Relationships | Partial | Verified deliveries update `successfulJobs` once. No general friendship, trust, disagreement, repair or relationship-driven reasoning mechanics |
| Economy | Partial | Physical stock, reservations, cargo, delivery, self-collection, stocking and purchases conserve nine goods. Driver receives a symbolic job reward. No currency transfers, prices, wages, wages for `work`, recurring suppliers, production or consumption loop; purchased goods remain inventory |
| NPC communication | Partial | Nearby known residents can share an existing memory and propose/answer transport, including refusal or clarification. Transport offers expire. No autonomous natural dialogue, conversations between arbitrary NPCs, phone/text channels, contacts or introductions |
| Player conversation | Implemented boundary | Scoped player-to-NPC turns and event-derived memories; proposed actions require confirmation. This player confirmation flow must not gate future NPC-to-NPC actions |
| Population | Three-character fixture | IDs are a fixed TypeScript tuple. Initialization, snapshot validation, server histories, round-robin modulo three, presentation, renderer and UI assume the original roster |
| Interventions | Partial, strong reusable foundation | Validated road closure through server command; occupied roads protected; adjacent observers learn it, others discover blockage before edge entry. Cargo and task survive interruption, detour can succeed; memories and closure persist. No neighbourhood browser control or complete persistent social/economic aftermath demonstration |
| History / replay | Partial | Bounded events, event evidence retention, ordered public frames, versioned checkpoint restoration and duplicate protection. No complete append-only history, recorded-decision playback or arbitrary historical world reconstruction |
| Observer experience | Implemented for three | Scene, cards, inventory props, event feed, follow/overview, pause and reset; public projection avoids shipping memories. Roster, names, models and offsets need data-driven expansion |
| Player possession | Missing | Selecting/following/chatting is not taking control. No authority lease or player/manual action ownership preventing simultaneous autonomous control |
| Background town | Missing | HTTP timer runs only with an authenticated SSE observer. No observer means no time advancement or new autonomous decisions; browser-independent core alone does not establish unattended operation |
| Governance/community | Missing | No proposals, nominations, elections, shared projects or collective decisions; keep these post-hackathon unless essentials are stable |
| Meta controls | Implemented for evaluation | Persistent conservative reservations, plan expiry/ceilings, wall-clock throttles, deduplication, timeout, token ceiling and no retry/fallback; not a continuous production inference policy |

## Milestone 6C quantity correction

The model saw eight historical supplier goods while the JSON Schema allowed an unbounded integer and local validation permitted only 1–6. The fix preserves that local rejection rule and supplies the missing constraints.

- `action-limits.ts` defines the public 1–6 quantity bounds, six-unit transport capacity and two-unit self-collection capacity.
- The decision schema applies integer minimum/maximum to `propose-transport`, `collect-self`, `stock-stall` and `buy`. Conversation proposals embed the same schema. Runtime guard, transport validation, self-carry validation and checkpoint task bounds reuse the rules.
- `NpcObservation.actionConstraints` includes only supported actions and the actor's own applicable carrying/remaining capacity. Amina sees transport proposal bounds and her own self-carry limit; Musa sees his own cargo capacity. No new access to another actor's private goals, cargo, contacts or memories is added.
- Schema quantity bounds and remaining capacity are separate: a self-collection proposal of six has a valid quantity shape but fails Amina's two-unit carrying limit. Bounds never promise stock, a free reservation, proximity, cooperation or an available recipient.
- Model instructions identify the new field. Observations remain detached and read-only; historical resource evidence remains historical. No fixture, initial stock, goals or existing decision outcomes were changed to encourage cooperation.
- Invalid proposals remain rejected, without clamping, automatic repair or retry. Domain state is untouched; request consumption, validation audit events, revisions and inference accounting may change. Provider-side rejection still appears as `inference-unavailable`, an existing observability limitation to improve separately.

Offline coverage includes all four quantity actions at negative/zero/fractional/1/6/7/8/nonfinite/non-number boundaries; strict schemas; rejected-action state equality and deduplication; transport quantities one and six through delivery/restoration; dynamic self-carry limits; authoritative supply reservations; and fake Meta request/response transport through the provider and durable session. The fake responses never reach Meta and use temporary ledgers.

Existing version-one world snapshots remain compatible because constraints are derived observations, not persisted world fields. No runtime file is rewritten. Rolling back the source correction requires no world migration; do not restore the old unbounded schema for a live evaluation.

Validation: all **170 tests pass across nine files**, including the existing 153 and 17 new contract/regression cases. TypeScript and the production build pass; Vite retains its existing large shared-chunk warning. No browser interaction or new device-performance verification was needed for this headless contract change; the renderer remains unchanged.

## Minimum architectural extensions

Extend the current contracts and executor rather than introduce another world engine, agent framework or parallel economy.

1. **Resident registry and versioned state.** Replace the compile-time roster assumption with validated resident IDs from each world's registry, stable ordering and configurable seed data. Keep the original three IDs and identities. Generate schema recipient enums from the applicable registry; validate recipients against current authority. Iterate actual residents in both schedulers, persistence, projections and rendering. Keep a configurable population ceiling for resource safety, independent of the prototype target of approximately 16.
2. **Separate starting profiles from evolving state.** Current snapshot validation compares goals, occupation, personality, priorities and capabilities exactly with initial profiles. Preserve immutable ID/provenance, but explicitly validate allowed changes to ambitions, work and capabilities as state transitions. Add a reviewed version-two migration that preserves original state/history and retains the version-one reader. Validate cross-resident references, per-resident commitments, conserved resources and general cargo ownership rather than globally allowing one Amina–Musa task.
3. **Communication as authoritative events and activities.** Add bounded conversation/session IDs, participant IDs, channel, delivery times, expiry, turn limits and status. Face-to-face requires an actual encounter; calls require known contact details and an offered call; texts are delivered via scheduled events. Initiating, answering, declining, ignoring and postponing are actor proposals. A delivered message can produce a trigger, never an automatic answer or acceptance. Account for travel/work and limited attention before accepting a call.
4. **Contacts and encounter knowledge.** Distinguish recognizing a person, knowing a location and possessing a phone contact. Introductions reveal only information deliberately shared in a witnessed interaction. Seeing an unknown resident can expose an observable identity/appearance and an introduction opportunity, without disclosing their profile. Contact exchange is validated and remembered; no roster-wide address book appears in every observation.
5. **Reuse scoped inference and action validation.** Build each speaker's context from their own observation and only conversation turns delivered to them. Treat incoming claims as reports. Each recipient assesses their own activity, needs, stock knowledge and commitments. Dialogue may suggest an existing economic action, but only validated transitions reserve stock, move goods, pay money or create obligations. Add channel eligibility to transport negotiation when that channel is implemented; do not remove proximity checks globally to simulate phone support.
6. **Persistent commitments and social outcomes.** Generalize the existing task/evidence link to commitments with actor, counterparty, scope, due time, fulfilment/cancellation/failure evidence. Dialogue alone does not create an accepted promise. Relationship updates follow witnessed outcomes, are bounded and idempotent, and may differ between residents. Reports of a broken promise and verified failure remain distinguishable.
7. **Independent scheduling and durable history.** Move simulation ownership/lifecycle out of SSE observer counting, retaining a single authoritative owner and pause controls. Persist scheduled deliveries and due activities, fairness/cooldown information and decision records. Separate rolling recovery snapshots, retained NPC memory and a bounded/rotated durable history archive. Store accepted/rejected inputs, relevant configuration/provider version, execution events and any random seed so offline replay can use recorded decisions without inference. Do not call checkpoint restoration full replay.

Communication uses the same executor, revisions, deduplication and persistence boundary as transport. Any failed semantic check must leave domain state unchanged. A failed persistence write must still stop publication; preserve the current fail-closed session behavior while extending recovery tests. Independent NPC decisions execute through authority without player confirmation; player-requested consequential conversation proposals retain the existing confirmation boundary.

## Proposed integrated implementation sequence

Dates are suggested development windows, not automatic authorization or a guarantee. Integrate each passing increment into the normal mock town; keep deterministic fixtures as tests, not separate permanent product modes.

| Order / window | Scope | Exit evidence |
| --- | --- | --- |
| 6C, October 30 | Complete quantity correction only | Offline regression, typecheck and build; no live calls |
| **7A, October 30–31** | Configurable registry, preserved three residents plus a fourth resident, autonomous nearby introduction/information exchange, independent response choice, event memories and existing-task opportunity | Normal session/browser shows four independently scheduled residents; recipient may help, refuse, clarify or defer based on its own state; no private-state leakage; migration/duplicate/stale-result tests; original supply fixture remains valid |
| 7B, October 31–November 1 | Grow to eight, then approximately 16 using the same registry; distinct homes/resources/needs and modest recurring routines; generalized stock ownership and a minimal money/payment or clearly labelled symbolic-reward loop | Several concurrent, independent activities; food/rest/income tradeoffs affect choices; resources remain accounted for; no resident needs a bespoke ID branch to function |
| 7C, November 1–2 | Persisted contacts, phone offers and bounded asynchronous texts/delayed replies; connect communication to transport, trade and personal commitments | Amina can choose to call Musa from elsewhere; Musa's own state determines response. Unknown contact rejected, offline/busy response can defer, duplicate text cannot duplicate commitments, restart preserves pending delivery |
| 7D, November 2 | Single road-closure intervention through existing authority and browser, plus downstream consequences | An affected journey discovers blockage, preserves cargo, changes plan or delays a commitment; another uninformed resident continues normally. Delivery timing/stock/relationship evidence persists after reopening and restart; detour, waiting and cancellation are legitimate branches |
| 7E, November 2–3 | Unattended ownership, bounded deterministic routines, persistent decision/history records, replay and performance work | Disconnect browser and continue; restore mid-activity; replay recorded outcomes offline; accelerated 30-day deterministic soak, resource/cost ceilings, archive retention and restart checks |
| Stabilize, November 3–4 | Clear roster, selected-person knowledge/memory view, event causality, accessible desktop/mobile controls, demo recovery | Build/test/browser regression, real-device checks if available, measured draw calls/frame time/checkpoint sizes, no hidden paid inference; separately approved bounded live evaluation only if requested |

7A deliberately integrates population flexibility and a real social interaction before adding thirteen residents. Keep calls/texts after the encounter/response lifecycle works; keep money after resource ownership is general enough to validate it. If time is tight, reduce channel/visual variety before weakening authoritative execution, scoped knowledge or the intervention's consequences. Do not label dormant display-only characters as functioning residents.

## Resident starting conditions

Use seed records rather than character-specific policy branches. Each seed should include a stable ID/name and visual profile; home and starting location; occupation and available skills/tools; cash/debt/inventory/business ownership or explicitly labelled symbolic resources; current needs and availability; ambitions and priorities; known places/services; relationships, introductions and separately known phone contacts; and a small set of provenance-backed starting memories. Initial memory evidence must be validated rather than supplied as arbitrary facts about other residents.

Keep Amina, Musa and Zainab intact. The additional resident slots can span supply work, repair, food preparation, retail, education, healthcare support, delivery, tailoring, utilities, crafts, study, job seeking and retirement. These suggest different initial opportunities and constraints, not new systems that must all be implemented or permanent behavioral roles. Pair affluent and cash-constrained circumstances, competing time demands, different knowledge, existing acquaintances and strangers. A seed-data review should verify distinctions across all fields before each population increment.

Residents can revise ambitions and choose alternative feasible activities. Neither work labels nor authored acquaintances imply friendship, guaranteed trade or fixed alliances. Community problems may become shared topics through ordinary communication; there is no scheduled election or designated future leader.

## Dependencies, risks and controls

| Risk / dependency | Consequence and minimum control |
| --- | --- |
| Hardcoded assumptions extend beyond IDs | `snapshot.ts` requires three exact profiles, Amina→Musa tasks, one active task, Musa-only cargo/rewards and nine conserved goods. Generalize these invariants together with ownership and migration tests; merely adding names will break restoration |
| Scenario scripts mistaken for autonomy | Current mock provider branches by Amina/Musa/other and demonstrates policy alternatives. Add reusable capability/need-based offline policies and alternate response fixtures; report these as deterministic behavior, never evidence of live-model reasoning |
| Communication loops and token growth | Bound encounters, turns, inboxes, contexts, delivery/response triggers and cooldowns. Apply social fairness and per-pair backoff; meaningful changes can awaken actors without repeated small talk |
| Slow/stale inference | One in-flight request protects costs but can delay responses for 16 actors. Keep routine mechanics deterministic, use fair priority for expiring commitments, recheck actor revision/channel/stock, and let other actors continue while one reasons |
| Static economy runs out of opportunity | Nine goods, no replenishment and no recurring needs cannot sustain 30 days. Add explicit production, consumption and restock sources/sinks with conservation/accounting tests; do not silently regenerate stock to force a story |
| Invalid proposals hidden as provider failures | Keep strict rejection; later expose sanitized schema/semantic failure classification in the event feed without secrets or reasoning traces. Do not retry until a meaningful new event or explicit new approval |
| Model prose exceeds evidence | Keep claims/evidence checks and explicit uncertainty; social promises and speech must not become verified world facts. Offline checks cannot prove live prose quality |
| Recovery and history growth | Current events prune, memories cap at 24, tasks cap at 64, session receipts at 512 and generations at 48. Design retirement/archive policies and persistent idempotency before long runs; never clear spending limits as a workaround |
| Player possession races | Defer full movement possession until core stability, or implement a minimal actor authority lease with revisions, validated commands, release trigger and continued scheduling for everyone else. Selection alone must remain labelled observation |

## Performance and Meta costs

Sixteen residents are a modest target, but existing performance evidence covers three residents on one desktop. Earlier mobile-viewport measurements are not phone benchmarks. The current build retains the existing approximately 559 kB Three.js/shared chunk warning.

Keep headless advancement separate from visible interpolation, no model calls per frame, reusable meshes/materials, limited shadows, bounded labels/event DOM, and offscreen visual updates at reduced frequency. Replace repeated full-world clones in scheduling with narrow read-only queries when measurements justify it. Nearby checks can use node membership buckets if needed; sixteen actors alone do not justify a spatial framework rewrite.

The backend currently commits a flushed full checkpoint and publishes a full frame on each quarter-second tick with an observer. At normal time, 30 simulated days would entail roughly 10.4 million such ticks. Profile disk writes, checkpoint size, SSE payload and simulation CPU before accelerating. Coalesce publication and use journaled durable event batches plus periodic snapshots if needed, with a documented recovery window and the existing publish-after-durability guarantee. Keep the existing bounded movement substeps first; add next-deadline advancement for long idle periods only when deterministic parity tests support it.

Cost figures below use **the repository's configured estimate**, not a newly verified Meta price quote. `maximumGenerationUsd` reserves $0.016204 for 6,000 input plus 2,048 output tokens, including reasoning output. Official pricing and schema compatibility must be checked before any separately approved live evaluation.

- Six requests per minute is a ceiling, not a target. At that rate, 30 days of normal-time continuous decisions could reach 259,200 generations, reserving approximately **$4,200.08**.
- Even one model decision per resident per simulated hour across 16 residents for 30 days is 11,520 generations, reserving approximately **$186.67**.
- The existing 48-request lifetime session allowance provides only three requests per resident at a population of 16; the standalone scheduler's default 24 decisions is also an episode bound. Neither supports indefinite reasoning. Preserve these safeguards until an explicit durable operating budget is designed and approved.
- At six requests/minute, serving one request each for 16 ready residents takes at least about 160 seconds, potentially longer with serial inference latency. Do not assume immediate replies; asynchronous communication should reflect real delays.

Routine movement, sleep/work completion, need changes, message delivery and established routine continuation should use deterministic rules. Reserve Muse for meaningful choices, unfamiliar opportunities, negotiation, changed commitments and social interpretation. Use persisted per-resident/global quotas, wall-clock spend/rate limits and a separately approved plan; simulated speed must never multiply allowed spending. At budget exhaustion, continue already validated deterministic activities and expose that new model decisions are suspended. Never silently substitute mock decisions for live behavior. Thirty-day validation should initially use offline policies or recorded decisions, not a paid live soak.

## Hackathon boundary and next milestone

Essentials: the fixed contract; an extensible population approaching 16 with distinct starting conditions and independent activity; autonomous encounter/communication connected to real decisions; persistent commitments/memory; one consequential road closure; clear browser history; and tested authority, recovery and inference limits. A minimal observe/control distinction can be added after these foundations; full player-avatar movement is not required to validate autonomous society behavior.

Post-hackathon: governance, leadership nominations and elections; advanced families and generations; unrestricted job/skill progression; extensive emergency types; detailed service economies; larger geography; public multiplayer hosting; and production-scale long-term archives. Preserve extension seams now without implementing these systems or encoding their outcomes.

**Recommended next concrete development milestone: 7A — extensible residents and autonomous face-to-face encounters in the normal simulation.** Begin with a registry-backed fourth resident, validated introduction and independent response, and connect at least one exchange to an existing resource/task choice. Acceptance, refusal, clarification, deferral and no engagement must remain valid. Require deterministic privacy/authority/restart tests and browser evidence before growing the roster. This establishes a reusable social loop before multiplying its participants; it does not require a live call or a new agent architecture.
