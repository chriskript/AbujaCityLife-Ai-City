# Milestone 7G Phase D: Muse society evaluation plan

**Approved and executed once on November 1, 2026.** After reviewing this preparation, the user explicitly approved the live run. It stopped on a validation rejection after 19 genuine generations; see the [Phase D live report](milestone-7g-phase-d-live-evaluation.md). No automatic retry or resumption is authorised. The bounds below superseded the earlier unexecuted 48-generation/$0.90 context plan. Existing B/C plans retain their original limits.

## Purpose and limits

Evaluate whether Muse-powered residents independently choose personal, economic and social activities, influence one another through legitimately delivered communication, carry out commitments and make subsequent decisions informed by actual consequences. Successful cooperation is one possible outcome; refusals, solitude, changed plans, unanswered invitations and failed proposals are valid evidence.

| Limit | Revised proposal |
| --- | ---: |
| Muse generations / attempted opportunities | Up to 200 |
| Incremental spending ceiling | $5.00 |
| Elapsed simulation | Up to 1,800 seconds (30 minutes) |
| Wall time | Up to 5,400 seconds (90 minutes) |
| Input preflight | 8,000 tokens |
| Output | 2,048 tokens |
| Per-invocation deadline | 20 seconds shared by preflight/generation |
| Application throttle | Six generations per wall minute; one pending inference |
| Full per-attempt reservation | $0.018704 |
| All 200 reservations | $3.740800 |

Use profile **7g-d-society** with a fresh unique run ID. An old context or C approval cannot authorise this profile. The session persists this profile and token ceiling and refuses an offline/profile downgrade on restart. Generation, spending, simulated-time and wall-time bounds are independent stopping limits, not targets or promises that all will be reached. Do not extend a run to obtain a desired story.

Six generations per minute alone requires roughly 34 wall minutes for 200 attempts. The larger wall window accommodates that unchanged throttle, provider latency and deterministic advancement. The existing 1,800-second progression limit and 2,048 routine-execution allowance are preserved. A timeout margin prevents starting a provider call too close to the wall deadline.

## Town and meaningful decisions

Start the normal sixteen-resident Unity Gardens town in **isolated evaluation state**, with a time-matched offline branch from the identical initial snapshot. Retain all homes, workplaces, streets, resources, histories, initial relationships and contacts. The operating checkpoints are not reset or modified.

All sixteen residents are eligible: Musa, Amina, Zainab, Chris, Fatima, Tunde, Halima, Ibrahim, Yusuf, Ngozi, Emeka, Grace, Ladi, Sadiq, Maryam and Bisi. No resident or pair must participate. Priority goes to actually delivered invitations and independent recipient responses; priority schedules attention and never chooses an answer.

In this profile, every ready decision opportunity involving personal needs, employment, finances, travel destinations, calls, messages, encounters or social plans goes to Muse. The old sociability/poverty thresholds no longer restrict which ready residents can reason. Muse can choose work, rest, food, solitude, an ordinary social call or text, a visit or something else allowed by the scoped action contract. Low funds or fatigue inform a choice; they do not silently switch the actor to the offline reasoning policy.

Movement along a chosen route, time, inventory changes, job completion, held/paid funds and delivery execution remain deterministic. The only offline decision in the Muse branch is the mechanical continuation of an **already accepted delivery**. That continuation directly proposes fulfil-transport; it cannot select a new job, purchase, friendship or invitation. Pending social/communication/transport responses can still require independent Muse attention.

## Minimum additional social actions

The opt-in versioned social-visits extension adds five bounded actions, reusing the current map, texts, nearby encounters, event/memory system, timers and relationship records:

| Action | Meaning |
| --- | --- |
| invite-social | Propose a known public rendezvous to a known resident, by existing text contact or nearby speech |
| respond-social | Independently accept, decline, postpone or counterpropose another known venue |
| join-social | Independently choose one's own journey after acceptance |
| socialise | Speak a bounded attributed turn when both consented participants are present and available |
| leave-social | Withdraw or end participation, including while an unseen reply is in flight |

An alternative requires a separate acceptance by the other resident. Acceptance never moves either participant. A host can offer their own doorstep/shared entrance; this discloses that **public rendezvous**, not a private unit. No invitation grants private-home access, a phone number, trust or friendship. Existing private dwelling/path validation remains strict. Public workplaces and public spaces use existing travel. Residents learn other home rendezvous only through delivered invitations; canonical home data is not added to their observations.

Conversation turns alternate if residents choose to continue. Neither a reply nor continued attendance is forced. A resident can wait, change priorities, leave or decline to speak. Shared duration begins only when both physically arrive and ends at its bound; residents can leave earlier. An absent person's participation/position remains private. Nearby speech is delivered only when actually audible, never replayed later as a manufactured conversation. Deadline expiry is a system outcome, not an invented resident utterance.

Experienced utterances increment optional socialExchanges/lastSocialAt fields in the participants' existing relationship records. These record contact history, **not reciprocity, friendship, trust or relationship quality**. Completed jobs retain their separate existing counter. Text/call requests and replies remain real attributed communication records, without automatically becoming a meeting or financial commitment.

## Scoped context and compatibility

Use the accepted [bounded context policy](model-context-management.md), extended to include only the actor's delivered social invitations and legitimate venues. Preserve current needs, goals, resources, commitments, jobs and constraints, own biography, relevant granted history and required uncertain evidence. Narrow social action IDs and destination choices to the scoped observations. Actual validation remains authoritative even if conditions change after observation.

Own sent texts/replies are marked speech-only; observing one's own message does not verify its contents. Social utterances remain attributed uncertain reports. Other people's biographies, undelivered replies, remote presence and private needs never enter the projection.

Social visits are optional version-1 state within the existing snapshot format. Enabling the extension preserves inventories, balances, locations, tasks, relationships and memories, adds capabilities and knowledge of one's own public entrance, and creates **no invitations or events**. Older saves without the extension still load unchanged. The evaluation explicitly enables the extension in its new town; it does not migrate operating saves or add unrelated UI flows.

No time-of-day or weather system is introduced. Future conditions can be supplied through authorised observation fields and event triggers; no outcomes are scheduled or hardcoded around those future conditions.

## Allowances, pricing and pre-execution checks

The approved temporary internal settings are now **$50 daily / $100 cumulative through November 4, 2026, Africa/Lagos**. At November 5 midnight Lagos (November 4, 23:00 UTC), effective allowances revert to **$0.25 daily / $1 cumulative**. Historical reservations remain; if past reservations exceed the restored cap, further calls are blocked. These ceilings are not spending targets and do not change provider restrictions or per-run ceilings.

Official [pricing/rate limits](https://dev.meta.ai/docs/pricing-rate-limits) and [model support](https://dev.meta.ai/docs/models) were rechecked during preparation. Muse Spark 1.3 Standard remains $1.25/million input and $4.25/million output tokens, with a 1,048,576-token context window. Keep the same model, Standard mode, low reasoning effort, store:false, strict structured output, no hosted tools and no retries. The 8,000 local input ceiling is well inside the model context window.

Reservation arithmetic is uncached worst case: 8,000 × $1.25/M + 2,048 × $4.25/M = **$0.018704**. All 200 attempts reserve **$3.740800**, leaving **$1.259200** below the $5 ceiling. Do not spend that difference by enlarging token limits or adding generations. Reservations precede any provider HTTP request, survive success/failure and are accounted for separately from measured usage costs.

The [read-only readiness artifact](7g-phase-d-readiness.json) records $0.333958 cumulative prior reservations and full-run headroom under the temporary allowances. It establishes configuration, not current authentication, actual remaining provider credits or key-specific eligibility. Provider access and exact new token counts remain unverified because preparation makes no live calls.

The approved execution followed these checks and steps:

1. Recheck official pricing/model/token support and rerun npm run society:phase-d:check. Require a configured key, valid unlocked ledger, correct expiry and full-run headroom. Report incompatible limits; do not silently adjust them.
2. Create a unique dated runtime/approved-7g-phase-d-plan.json from the [unapproved example](7g-phase-d-plan.example.json), with an execution window covering the reviewed run. An approval expiring during the run will stop further inference.
3. Fingerprint the operating saves and current configuration; preserve prior evidence and ledger entries. Acquire the exclusive plan claim and refuse existing evaluation artifacts. No automatic resumption.
4. Run npm run society:phase-d:evaluate once. The first approved preflight/generation verifies actual provider access within the run's reservations; no separate authentication probes or retries are added.
5. Stop inference immediately on validation rejection, malformed output, provider/accounting failure, exhausted limits or deadlines. Preserve the exact proposal, context, accounting and checkpoint. Never retry a consequential action automatically.

## Interrupted decisions and safe deterministic completion

If expected Muse inference fails, retain the original request and scoped observation in the durable session checkpoint, record inference-interrupted and block that actor from further automatic decisions. Restoring the checkpoint does not retry or substitute an offline decision. Changing profiles, opening it as an offline session, or resetting away the pending decision is refused.

The session can safely advance unrelated, already chosen movement/work timers. The evaluation coordinator makes **no more inference or policy decisions**, and allows at most 60 simulated seconds of such deterministic completion after a provider/context interruption, within remaining time bounds. It records this drain separately, then pauses both branches. No new bookings, purchases, invitations or recipient choices are produced by that drain. Accounting failures receive **no drain**. Checkpoint-write failure stops the session immediately. Manual review is required for any later action.

## Evidence and comparison

For each attempt retain actor/trigger, raw scoped request, actual projected input, exact instructions/schema, selection audit, provider preflight, exact structured output and public explanation, validation and execution outcome, tokens, latency, estimated cost and full reservation. Record interruptions with unknown usage honestly; do not reuse earlier metrics or guess that a generation occurred.

Report model-chosen visits and travel destinations; invitations and independent recipient responses; accepted alternatives; actual arrivals and meetings; attributed conversation turns; departure/solitude choices; subsequent decisions; changes in relationships/memories/contacts; and tasks, commitments, work, money, goods and inventory. Distinguish discussion, acceptance, independent travel, actual conversation, formal economic commitment and completed execution. A personal-care choice by Muse is model-driven reasoning even when its inventory operation is deterministic.

Use both the time-matched offline town and per-decision offline counterfactuals supplied the same selected records before compact wire encoding. The existing offline policy has **no structured social-invitation response policy**: those counterfactuals are explicitly marked unsupported, not fabricated as invalid generic replies or replaced with a scripted cooperation policy. New actions absent from the baseline are not by themselves evidence of superior reasoning. Attribute historical-context influence only to explicit public explanations or clearly supported choices, with operator interpretation identified separately.

No live improvement, sustained friendship, negotiated cooperation or completed Muse-mediated social visit is claimed in preparation. A run with no cooperation or no invitations must be reported as observed, without adding calls to obtain a desired outcome.

## Offline validation

Verified November 1, 2026:

- npm test -- --maxWorkers=1 --testTimeout=20000: **364 tests passed across 24 files**, 238.36 seconds. Coverage includes all sixteen residents; existing economy/navigation/communication/persistence; the original context-overflow fixture; consent, alternatives, withdrawal, private-home refusal, nearby speech, relationship counters and source attribution; pending inference across restart; rejection of offline substitution/downgrade; allowance expiry at Lagos midnight; usage/corrupt-ledger failures; and the complete 200-attempt profile. Literal old schema-count and allowance-limit expectations were updated for the five new actions and newly approved limit; no validation assertions were removed.
- A final defensive unknown-invitation-key check was covered by rerunning all **10 social-visit regressions**. The latest production build and both TypeScript checks then passed. Vite retains the existing large route-chunk warning (603.60 kB); no unrelated bundling work was introduced.
- npm run society:phase-d:dry-run: **200 synthetic decisions across all sixteen actors**, all authoritatively validated, reaching **432.25 simulated seconds** before the generation cap, with two completed offline deliveries. The session paused and persisted the correct society/8,000-token reservation profile. See the [portable rehearsal summary](phase-d-offline-rehearsal.json); full exact inputs, decisions and worlds remain in its ignored source evidence directory.
- The 200-attempt rehearsal uses the existing offline policy behind a clearly labelled fake model, so it generated **no structured social invitations**. New structured invitation/alternative/journey/conversation/withdrawal paths are covered by separate contract fixtures. Neither is evidence of live Muse cooperation or better reasoning.
- Largest projected JSON in that rehearsal: **13,632 characters**; largest combined visible input/instructions/schema: **23,706 characters**. These are measured characters, not exact provider tokens. Real invitations can produce different inputs; the hard bounds still stop rather than discard critical evidence.
- npm run society:phase-d:check and npm run meta:check passed offline: the key is configured and ignored by Git, model/budgets supported, no spending lock, full worst-case headroom. Current authentication, provider credit balance and exact new token counts remain unverified without an approved request.
- [Preparation integrity audit](phase-d-preparation-integrity.json): at preparation, the configuration change matched **only the approved allowance fields**; credentials and both operating saves were unchanged; all **21 prior reservations totaling $0.333958** and original Phase C evidence were unchanged. Preparation created no live requests or D approval file. The subsequent approved run is separately accounted for in the live report.

The subsequent [approved Phase D execution](milestone-7g-phase-d-live-evaluation.md) completed its bounded run and stopped as required. Its evidence and accounting are distinct from these offline fixtures and from the earlier [Phase C report](milestone-7g-phase-c-live-evaluation.md). A further live run requires new review and approval; unused generation or spending headroom is not automatic permission to resume.
