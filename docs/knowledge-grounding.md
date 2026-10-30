# Milestone 6B: grounding and conditional autonomy readiness

Implemented offline on October 30, 2026. No paid inference, runtime world migration, ledger replacement or UI redesign is part of this milestone. Mock remains the default. Milestone 6A's result remains a historical record, not evidence that the revised schemas have passed live evaluation.

## Defects and corrections

Previously `places` gave identity and coordinates without services/products. `resources` carried last-known numeric caches without freshness. A valid place or memory ID did not establish that a service recommendation followed from it. Speech stored as an observed event could also be mistaken for verified speech contents.

`shared/neighbourhood/knowledge.ts` now defines separate world service/product metadata, scoped established NPC knowledge, and a presentation of availability with source, observation time, evidence ID and freshness. Market Square provides food retail / food portions. The Community Centre desk provides stock collection / stall supplies, **not retail meals**. This describes the existing simulated roles; it does not introduce a shop, product economy or new gameplay.

Each NPC only receives known places and its own known service/product facts. Initial knowledge is explicitly authored per NPC. A known place name alone grants no service knowledge. `complete:false` means incomplete knowledge; unlisted services remain unknown, not disproved. Legacy checkpoints without `knowledge.placeFacts` stay readable and explicitly return unknown service facts; they are not silently populated from the world catalogue. A future approved reset or an explicitly designed learning interaction can establish new knowledge. Runtime checkpoints were not modified by this implementation.

Availability is reconstructed only from personally observed, retained event evidence and cached values. Reports cannot overwrite it. Missing/pruned evidence means unknown. A retained observation from an earlier simulation instant is historical even if it might still be true; this is deliberately conservative. Stock and whether sales were open are distinct observations. Older stock events without opening data cannot establish current sales availability. The raw numeric resource fields remain for compatibility with existing deterministic mock policies and are identified as last-known caches in the model instructions.

`memoryEvidence` distinguishes established facts, observed world events, unverified reports, uncertain beliefs, commitments, verified outcomes and observed **speech only**. Conflicting reports remain attributed in original structured memories. Neither reports nor a previous NPC statement become authoritative service or inventory facts.

## Dialogue contract and semantic checks

Natural prose and character personality remain model-generated. There is no keyword question/answer lookup. Instructions distinguish identity, services, products, source reliability and availability, prohibit the supply-desk/food association, and require uncertainty about missing or historical knowledge.

Live dialogue now requires a bounded `claims` array alongside the existing reply/evidence/uncertainty/proposed-decision fields. Every positive service/product recommendation should declare:

```json
{"placeId":"market","service":"food-retail","product":"food-portion","availability":"unknown","quantity":null}
```

The validator checks known place/service/product membership, place-fact evidence, exact stock evidence and quantity, and whether current/historical/unknown availability is warranted. Current food availability additionally requires positive current stock and observed open sales. Unknown/historical availability requires uncertainty. Unsupported claims fail; no model retry or mock substitution follows. Four-field legacy test fixtures remain readable by the general validator; the live provider explicitly requires `claims`.

**Remaining limits:** this is not full natural-language entailment. A model may omit a claim, contradict its structured claims in prose, fabricate directions, or make unsupported social assertions. The validator does not parse all such sentences, and an empty `claims` array is not proof of grounded prose. Offline tests explicitly preserve this known gap. Live review and future targeted checks remain necessary. Conservative freshness can also reject a claim that happens to remain true.

## Autonomy preparation and scheduler review

The shared `DecisionScheduler` remains unchanged for local mock regressions. The authoritative session already serializes model dispatch, limits requests, persists allowance consumption, discards stale responses, and uses the original action validator. Its `decide(actor, true)` option now consumes an existing event trigger without inventing a player-interaction trigger. No new HTTP inference route was added.

The original recipient contract only supported accept/decline. It now additionally supports `respond-transport` with `accept:"clarify"` and a bounded `question`, using the existing capability. The offer remains proposed; a clarification event/memory is recorded for both participants, no stock is reserved or transferred, and no reward is paid. Acceptance creates a commitment; collection and delivery remain separate validated execution outcomes.

`server/evaluation/autonomy-probe.ts` prepares an explicitly labelled deterministic fixture using validated movement: Amina visits the supply desk, returns to the market, and Musa joins her there. Setup transfers no goods and forces no restocking choice. The fixture retains low stall stock, Amina's stock need, known supplies, current resources and relevant relationship state (initially none). Co-location allows either an immediate request or a valid alternative within the two-call ceiling.

The coordinator invokes Amina once. It invokes Musa once **only** if a new, validated Amina-to-Musa transport-proposed event and open task actually exist. Waiting, working, pausing sales, or travelling to collect supplies ends the probe without Musa. Failure/invalid action also stops that branch. Musa receives his own goals, capabilities, commitments, knowledge and request; Amina's private needs/goals are not copied into his observation. He can accept, decline or ask for clarification. These are legitimate alternatives, not pass/fail expectations for a scripted story.

Durable stage records are flushed before dispatch. `runRecordedAutonomyProbe` exclusively creates its record file and refuses to reuse it; crashes/failed stages are not automatically resumed. No timer, automatic scheduler pump or third generation is invoked. Proposed actions, validator results, selected intentions and actual task/resource events remain separately inspectable through before/after frames. This evaluates goal selection and a conditional social response, **not completion of delivery**: accepting a job alone does not move cargo.

Mock rehearsal:

```sh
npm run autonomy:dry-run
npm test
npm run build
```

The rehearsal uses temporary checkpoints and a scripted mock provider, prints a labelled trace, and has no credentials, Meta adapter dispatch or real ledger initialization. Temporary evidence is retained in the OS temporary directory. Tests exercise alternative Amina choices, independent recipient branches, persistence failures, duplicate probe claims, stale decisions and duplicate inventory/task execution.

## Exact proposed live procedure — separate approval required

1. Run `npm run meta:check`, tests and build. Recheck Spark prices, current schemas, model access and actual existing ledger totals. Inspect locks and abort on corrupt/missing files. Do not recreate the ledger or alter the prior 6A session plan.
2. After explicit approval, create one isolated evaluation checkpoint from `prepareAutonomyFixture()`, with the existing authoritative session and Meta provider. Use the **same `runtime/meta-probe-budget.json`**, existing daily/total limits, a new one-shot stage-record path, and an approved plan limited to **two generations / $0.04 / background autonomy disabled**. Keep the HTTP clock/timers disabled and the session unpaused so individually validated actions can execute. No anonymous/public endpoint or viewer can trigger the probe. Do not reuse the production demo checkpoint or reset its accounting.
3. Call `runRecordedAutonomyProbe` once. Amina receives only her own observation and existing event trigger, without a player request directing her strategy. Save schema validation, action proposal, semantic outcome, actual effects, model identity, usage, cost and latency. On timeout/refusal/invalid output: stop without retry or mock substitution.
4. Only after an actual validated transport request, give Musa his own observation and existing `transport-request` trigger. Record accept/decline/clarification and resulting task/memory changes. Otherwise stop after Amina. Do not force a cooperation branch, advance into collection/delivery or solicit another decision under this approval.
5. Close the evaluation service. Retain checkpoint, stage evidence, usage and all spending reservations. Assess each intention separately from its actual consequences. The existing provider records usage by request; prose/reason review must not expose private reasoning traces or credentials.

At the [Spark Standard prices](https://dev.meta.ai/docs/pricing-rate-limits) checked October 30 ($1.25 input / $4.25 output per million tokens), the existing 6,000-input / 2,048-output reservation is **$0.016204 per call; $0.032408 maximum for two**, below the proposed **$0.04 hard allowance**. The full ceiling is reserved before the token-counting request; generation is aborted if the count exceeds 6,000. Hosted tools are absent, retries are zero, and reasoning is included in the output cap. Historical ledger reservations are preserved and count against configured total/daily limits. This is a proposed evaluation, not authorization or a billing guarantee independent of current prices and provider bounds. No approved live plan was created here.

Next: separately approve this bounded probe, inspect genuine choices and social outcomes, then budget additional fulfilment/adaptation decisions only after results are reviewed. Full live gameplay still needs renewed conversation-grounding evaluation and complete cooperation/failure branches.

## Offline verification

All **153 tests** pass, including the original 129 cases and 24 new grounding/probe cases. Two existing fixture assertions were updated for the required live `claims` array and the added clarification variant; their original behavioural assertions remain. TypeScript, production build, mock autonomy rehearsal and offline Meta preflight pass. The built client contains neither the actual local Meta credential, its configuration identifier, nor the Meta endpoint. The existing Three.js chunk-size warning remains; no renderer changes were made.

Historical spending remains two reservations, 9,878 and 16,204 microUSD, totalling **$0.026082**. The prior 6A checkpoint remains paused with its one-request plan consumed. The rehearsal neither migrated that checkpoint nor created an approved live plan. No commit, push or deployment was performed.
