# Informed autonomy: evidence review and follow-up proposal

Prepared November 2, 2026 (Lagos). This investigation and implementation are offline only. They do not authorise another execution or a retry of the interrupted request.

Sources: the accepted [164-decision live report](milestone-7g-economic-recovery-live-evaluation.md), its [exact decisions](7g-economic-live-decisions.json), and the original `model-started` records containing the actual projected observations, instructions and action schemas. The new [offline comparison](decision-grounding-offline-comparison.json) is reproducible with `npx tsx scripts/investigate-decision-inputs.ts`. It audits the historical inputs and reprojects them under the revised grounding; it does not call Muse or execute actions against a saved town.

## 1. Needs, work and competing priorities

Of 73 live work choices, **13** had supplied food need at least 0.9, **four** had supplied fatigue at least 0.9, and **two** had both. These are descriptive audit thresholds, not new simulation rules. In invocation 161 Emeka received food need 1, rest need 1 and income need 0, yet selected electrical work to keep service dependable. Yusuf, Sadiq and Bisi also selected available work with food need 1. Conversely, Fatima and Maryam did choose personal care, and Zainab bought, ate and later sought income. There is no evidence that every resident uniformly misunderstood every need.

What Muse actually had:

- The actor's current numeric `needs`, wallet, personal goods/food, activity, goals, priorities, occupation, circumstances and scoped biography.
- Known jobs with explicit eligibility, required skills, location, wage, duration and funding status. Eligible work had especially concrete, immediately actionable IDs.
- Known market service facts, scoped stock freshness/evidence, price and any personally current purchase feasibility. Remote market stock could legitimately be unknown; a worker did not receive a magical town-wide inventory query.
- The actor's own home and legitimately known scenic places, plus the `rest` action. Rest destinations and the need effects of work, rest and food were not collected into a concise decision summary.
- No explicit numeric endpoint explanation in the recorded scoped instructions: `needs.food:1` was not labelled “maximum unmet hunger, not full stomach,” and `needs.rest:1` was not labelled exhausted rather than rested. The interface also did not spell out all mechanical need consequences.

The actual rules matter: hunger rises by 0.08 per 60 simulated seconds; fatigue rises by 0.08 during travel/work or 0.04 otherwise. Eating reduces hunger by 0.8 per unit. Rest relieves fatigue by 0.01 per chosen second on completion. Completed funded work reduces income need by 0.3 and pays its held wage, but does not feed or rest the resident. Scores are capped at one. High hunger/fatigue alone currently cause no simulated injury, work prohibition or forced survival action. This investigation does not invent such penalties.

The public explanations repeatedly emphasised available occupational work and livelihood. They do not reveal private model reasoning or prove a single internal cause. Plausible contributors are unclear scalar semantics, occupational/first-goal salience, concrete job affordances and uncertain remote food availability. Some choices also reflect real competing interests. A causal claim about why the model prioritised work would require a separately approved live comparison; the evidence only establishes what was supplied and chosen.

### Implemented grounding

`decisionContext.personal` now supplies:

- Explicit scale direction and current hunger, fatigue and income need.
- Mechanical need rules shared with the executor through `personal-rules.ts`, avoiding an independently maintained description of the rates.
- Own held food, immediate meal feasibility and relief, retail affordability, and stock value/freshness/evidence derived only from the authorised observation. Detailed opening and purchase checks remain in the existing place/town fields rather than being duplicated.
- Known rest destinations, whether the actor can rest here, and the nominal maximum relief for 60 seconds. Concurrent need growth still applies; it is not a guaranteed future score.
- The actor's legitimately known accepted/collected task commitments. The actor's ongoing activity and full goals remain in the existing observation.

Instructions clarify that occupation, biography, the first goal and a funded vacancy are not standing orders to work. They invite a brief explanation of the chosen tradeoff without requiring any particular action. Work remains available even at high need levels; a resident may knowingly defer food/rest, choose solitude, pursue income or make a poor choice. No offline personal-care selector was added to the Muse branch.

## 2. Amina's repeated stocking failures

At all five failed invocations—72, 92, 119, 143 and 154—the supplied carried inventory had **two total goods, of which both were personal food**. The stall's retail stock was a separate public inventory. The two carried food units were not two additional business supplies.

The instructions already stated that `stock-stall` excludes personal food and accepted cargo. Later rejected inputs also retained prior world-authored failure memories. For example, invocation 92 included the failure of 72, invocation 119 included the failure of 92, and invocation 154 included failures 119 and 143. Yet the brief public reasons repeatedly treated “I hold 2 goods” as sufficient to stock the stall.

This establishes a repeated category/arithmetic grounding error in the actual proposals. It does not prove whether the model misunderstood the subset representation, overlooked the rule or assigned insufficient weight to it. Missing failure information is not an adequate explanation: earlier rejection memories were present. However, those memories only named `missing-stall-supplies`; they did not explain that all carried goods were personal food or compute an eligible quantity.

The model did choose valid alternatives after some rejections: wholesale orders after 72 and 119, and answering Zainab after 92. It later repeated the mistake. Those alternatives demonstrate new independent choices and continuation, not durable learning.

### Implemented grounding and feedback

`decisionContext.inventory` explicitly separates **total carried goods**, **personal-food subset**, **committed delivery cargo** and **restockable quantity**:

```text
restockable = max(0, total carried goods − personal food − committed cargo)
```

It states that this inventory excludes stall shelves and outside orders. For stocking-capable residents the subset rule and current `canStockHere` are explicit. Amina's recorded failure inputs now project `total:2`, `personalFood:2`, `restockable:0`, `canStockHere:false`. Food is neither double-counted nor silently reclassified.

New actual `missing-stall-supplies` events explain the actor's own quantities at failure: total goods, included personal food, committed cargo and the eligible remainder. This explanation is delivered only to the affected actor's outcome memory. The active recovery record is supplemented with the rule explanation and current inventory timestamp in the model projection. Historical events are not rewritten or backfilled.

Valid alternatives remain visible through existing scoped information: personal food may be eaten; local collection requires travelling to a known supplier, capacity and available supplies; owned wholesale offers retain their actual funding, timing and availability constraints; permitted communication and social choices remain independent options. None is automatically selected.

The global action schema still permits a schema-valid but unbacked stocking proposal. Authoritative validation still rejects it, applies no invalid effects and generates the next fresh decision opportunity. There is no quantity clamp, automatic correction or replay of the rejected request. Existing repetition cooldowns and inference/spending limits remain unchanged.

The review also closed a related authority gap: town stocking validation now explicitly subtracts committed delivery cargo, matching the existing model instructions. A synthetic combined-capability regression proves that a courier cannot divert committed cargo into stall stock. This tightens validation; it does not add a new action or change the normal sixteen residents' capabilities.

## 3. Social opportunities and relationship accounting

Absence of visits was not absence of an invitation mechanism. In the historical completed inputs:

| Audited affordance | Decision contexts |
| --- | ---: |
| `invite-social` present in the actual schema | 164 / 164 |
| At least one invitation accepted by an isolated authoritative feasibility check | 160 / 164 |
| Nearby legitimate opportunity to share the actor's own number | 22 |
| Nearby unknown person eligible for an introduction | 71 |

The feasibility audit uses cloned pre-decision worlds and a bounded hypothetical invitation to an already-known venue/recipient. It never changes a saved town or feeds private validator results back to residents. Positive results prove that opportunities existed, not that the model should have selected them. The audit is conservative: it tries one suitable candidate and venue per context, not every possible combination.

The live Zainab–Amina question, independent answer and later delivery text remain genuine social reasoning evidence. The text was unanswered at pause. No structured rendezvous invitation or `socialise` turn occurred. `socialExchanges` counters change only after validated conversation turns at consented rendezvous; ordinary encounters/texts do not increment them. No resident delivery completed either, so successful-job relationship counters also remained unchanged. An encounter can leave real memories without automatically creating friendship or trust.

A separate regression exposed an existing persistence defect: delivery completion and the requester observing its receipt replaced relationship objects with only `successfulJobs`, erasing prior `socialExchanges`/`lastSocialAt`. Both updates now preserve the other existing fields while incrementing successful work. A consented conversation followed by paid delivery and restore is covered by a regression. This did not cause the historical zero counters, since that run had no `socialise` turns, but protects the next evaluation?s lasting relationship evidence.

Existing privacy and action rules already support home hosting: a host can invite someone to their **public doorstep/entrance**. Delivery of that invitation teaches its public meeting point only to the recipient. It grants neither the private unit address nor entry. A recipient independently accepts, declines, postpones or proposes an alternative; each accepted participant separately chooses `join-social`. Arrival does not prove the other attended. Existing tests exercise meeting, conversation, leaving, alternatives and refusal.

### Implemented social visibility

`decisionContext.social` collects, without adding knowledge:

- Known people physically nearby and current discussion opportunities; unknown nearby introduction candidates keep null identity.
- Existing permitted text/call recipients, one-way own-number sharing candidates, delivered pending messages and current rendezvous states.
- Existing known public venues, workplaces and the actor's own public doorstep.
- Clear distinctions among asking someone to host, visiting a known public workplace to look for someone, an invitation, independent acceptance, independent travel and an actual conversation.

It explicitly allows non-economic chat, social invitations, maintaining a connection, choosing solitude, leaving and refusing. It never infers another home/work address, location, presence, private need or willingness to meet. An unknown address can be requested through existing legitimate communication; it is not disclosed from canonical world data. No new contacts, friends, relationships or meetings are seeded.

The evidence does not establish whether work salience, resource needs, risk avoidance, menu presentation or another factor caused the scarcity of social choices. This implementation improves opportunity visibility; it does not rank social contact above work or force a minimum visit frequency. There is no contact rota, friendship script or new social scheduler.

## 4. Attempt 165 and a measured deadline proposal

Observed facts: the first 164 requests returned responses; known provider pipeline latency had median 4,590.5 ms, mean 4,908.1 ms and maximum 10,049 ms. Attempt 165 completed token count at 4,465 tokens, then hit the shared 20-second client deadline at approximately 20,033 ms while awaiting generation. No response, HTTP status or usage record was received for that attempt. It was not a context ceiling, exhausted allowance or authoritative execution failure. The available evidence cannot distinguish provider latency, transport delay or another remote cause, and cannot establish whether it would have completed within 30 seconds.

Recommendation: **review a 30-second shared count-plus-generation deadline for the next new run**. It is a bounded 10-second increase, not an unlimited wait or a retry. It is not proven to resolve the observed outlier. Existing plans/providers retain the 20-second default.

An opt-in `inferenceTimeoutMs:30000` is now supported only in a reviewed `7g-d-society` plan. Supported values are 20,000 and 30,000; other values fail validation. The provider exposes its configured deadline, the coordinator checks it matches the plan, and the generation loop reserves that duration before the wall-time limit. The approved deadline is persisted in a new isolated session; changing it on an existing checkpoint is refused. Old checkpoints without the field retain 20-second semantics.

One abort signal covers both token count and generation. A timeout still stops inference, retains the unknown request/reservation, prevents offline substitution and allows only the existing bounded deterministic drain where safe. Output/token caps, world validation, one-pending-inference restriction and six-per-minute throttle do not change. Additional phase telemetry records the configured deadline, preflight latency and elapsed time when generation is dispatched, without credentials or automatic follow-up calls.

The original interrupted request and checkpoint remain untouched. A new run is a new isolated experiment, never a retry or resumption of attempt 165.

## 5. Offline validation and compatibility

All 165 recorded request observations, including the interrupted one, were reprojected without network calls. The largest revised input JSON is **16,412 characters**, below the existing 24,000 hard cap; the 16,000 soft target may be exceeded by required information. No critical constraint, failure, commitment or report is dropped to meet that target. The existing Phase C 6,045-token regression still satisfies its original character-reduction bound. Exact new token counts are **unverified**: no provider token-count request was made, and character counts are not token measurements.

Regression coverage checks numeric need direction and work effects, continued availability of work and solitude, personal-food subset arithmetic, specific failure memories and new request IDs, valid separately supplied alternatives, committed cargo, remote uncertainty, invitation visibility, private doorstep disclosure, independent refusal, shared deadline signals, no timeout retry/refund, provider/plan deadline matching, wall headroom and persisted deadline compatibility. Synthetic decisions in these tests are contract evidence, not new Muse results.

The authoritatively executed need rates are unchanged; constants were extracted to share the rule source with observations. No world-state schema migration, resources, money, resident identities, goals, contacts or social history were reset. Existing event/memory schemas accommodate the more informative future failure text. A new optional session plan field preserves the old default when absent. Production credentials and spending controls were not modified.

The final full suite passed **388/388 tests across 28 files**. TypeScript and the production build passed, with the existing 603.59 kB routes-chunk advisory. `git diff --check` passed. Results are in [the validation summary](informed-autonomy-validation.json); [the protected-file/headroom audit](informed-autonomy-preparation-integrity.json) confirms unchanged credentials, operating checkpoints, prior approvals/evidence and all 205 historical reservations. No runtime execution approval was created. The original live evidence remains at SHA-256 `2001a9a02f5e34888e2d757cb2b6aae85b2d99f7983e9df174fd839ad503f72a`.

## 6. Follow-up evaluation for review

The [review-only plan template](7g-informed-autonomy-plan.example.json) retains the existing envelope:

| Setting | Proposed |
| --- | --- |
| Profile | `7g-d-society` |
| Eligible residents | All sixteen, fresh normal Unity Gardens branch |
| Generations / incremental ceiling | Up to 200 / $5 |
| Input / output ceiling | 8,000 / 2,048 tokens |
| Simulation / wall | 1,800 seconds / 90 minutes |
| Per-invocation shared deadline | **30 seconds, subject to explicit review** |
| Throttle / pending | Existing six per minute / one |
| Retries and automatic resumption | None |

Using the currently configured rates, the reservation remains $0.018704 per attempt and $3.740800 for all 200. A longer deadline does not increase the token/output ceiling or refund any reservation. The generation and wall ceilings are independent: 200 responses are not promised within 90 minutes if latency is high; the coordinator stops at its wall margin rather than extending the run. Preserve the approved $50 daily/$100 cumulative allowances through November 4 and the existing Lagos-time November 5 reversion. Recheck current public pricing, configured access, exact token counts, ledger headroom and the execution window immediately before an approved run; do not silently change incompatible limits. No credit balance is treated as a target.

Use a new approval, exclusive claim and evidence directory. Do not overwrite the previous approvals or resume either completed evaluation. Choose the execution window to finish before the allowance reversion. Fresh state preserves the standard sixteen residents, resources and existing social graph; introduce no seeded failure, invitation, friendship or guaranteed restocking outcome.

Measure:

1. **Informed need choices:** actual supplied hunger/fatigue/income, own food, known stock/uncertainty, rest opportunities and commitments at each decision; the public tradeoff explanation and subsequent completed effects. A high-need work choice is not automatically invalid or scored as disobedience.
2. **Failure adaptation:** original proposal, exact rejection and scoped feedback, next distinct request, changed or repeated action, changed factual preconditions, cooldown state, and eventual completed outcome. A different action alone is not proof of learning. If no ordinary rejection occurs, report that rather than manufacture one.
3. **Use of acquired information:** choices explicitly referring to delivered replies, observed stock changes, deliveries and actual past outcomes. Distinguish explicit public explanation from operator interpretation; no private reasoning is requested.
4. **Social autonomy:** initiation opportunities available versus selected, actual delivered messages/invitations, independent replies/refusals/alternatives, each participant's consent and travel, co-presence, conversation turns, withdrawal and separately measured contact/relationship changes. Absence or refusal remains valid evidence.
5. **Economic continuity:** local production and inputs, imported goods/payments/source limits, available and carried stock, consumption, wages, commitments, shortages, unmet needs and persistent consequences. Preserve conservation and report failures rather than refill stocks.
6. **Reliability and comparison:** per-phase latency, token counts, known/unknown usage and retained reservations. Keep the same-selected-information counterfactual and time-matched normal offline branch, with decision-count differences disclosed. Do not claim a causal improvement merely because more context was supplied.

Stop under existing provider, malformed-response, privacy, accounting, persistence or unclassified-validation safeguards, exhausted bounds or the reviewed deadline. Ordinary rejected world actions continue only through the existing scoped recovery path. Exact wire inputs, instructions, schemas, structured choices, validation and state deltas remain persistent evidence. No mandatory behavioural outcomes are introduced.
