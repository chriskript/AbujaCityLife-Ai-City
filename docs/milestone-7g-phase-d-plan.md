# Proposed longer Muse evaluation: context management and sustained consequences

**Status: prepared for review; not approved or executed.** No live API calls are authorised by this document. Phase C's nine validated generations and Amina–Musa independent discussion remain the live evidence; no completed Muse-mediated delivery or advantage over offline policy is claimed.

## Question and bounds

Can independently reasoning residents sustain a legitimately initiated exchange through recipient choice, an actual commitment where chosen, execution under ordinary mechanics, and subsequent decisions affected by the consequences?

Proposed profile `7g-d-context`:

| Bound | Proposed maximum |
| --- | ---: |
| Muse generations / attempted opportunities | 48 |
| Incremental spending | $0.90 |
| Simulated time | 1,200 seconds (20 minutes) |
| Wall time | 1,800 seconds (30 minutes) |
| Input preflight | 8,000 tokens |
| Output | 2,048 tokens |
| Per-invocation timeout | 20 seconds, no retries |
| Full reservation | $0.018704 per invocation; $0.897792 for 48 |

These are stopping bounds, not targets. The existing 48-request session lifetime and six-request-per-minute controls remain. The run stops before its wall deadline by an invocation-timeout margin. It may reach a call limit before twenty simulated minutes; no further calls or routine continuation will be appended to manufacture completion. Ordinary work and transport can take tens of seconds; the longer window offers room for completion and follow-up without promising that residents will choose it.

## Town, opportunities and independence

Start a fresh isolated clone of the normal sixteen-resident Unity Gardens initial town, alongside a matched offline baseline. Do not modify either operating save or resume Phase C's evaluation. Preserve the layout, economy, histories, existing acquaintances, phone contacts, needs and offline policies. All sixteen residents are eligible: Musa, Amina, Zainab, Chris, Fatima, Tunde, Halima, Ibrahim, Yusuf, Ngozi, Emeka, Grace, Ladi, Sadiq, Maryam and Bisi.

Use the existing selective opportunity policy, with priority for **actually delivered** invitations and pending recipient choices. No seeded invitations, special contacts, fabricated disruptions, prearranged pairings or forced successful deliveries. Initiation can concern legitimate economic or social opportunities. Each recipient can accept discussion, ask for clarification, negotiate within existing actions, defer, refuse, ignore or pursue something else. Shared history does not oblige anyone to cooperate.

Routine navigation, eating, purchases, work timers, inventory operations and continuation of already accepted tasks stay under existing offline mechanics. Muse receives meaningful decisions, not every movement tick. No new governance or economy features are introduced. A discussion acceptance is not a transport commitment; a work booking is not wages earned; an accepted task is not a completed delivery.

## Input, execution and stop conditions

Use the [bounded context policy](model-context-management.md). Preserve the actor's own background and relevant legitimately granted history, current constraints, job grounding, resources, contacts, delivered exchanges and mandatory evidence. Record selection manifests, exact compact inputs/instructions/schema and the raw scoped request. No global resident biography catalogue enters the request.

Before a future approved execution:

1. Recheck official model pricing, context support, the configured model and key eligibility without printing credentials. Current authentication/provider access is unverified in this offline preparation. After approval, the first bounded preflight/generation must validate access; failure stops the run rather than triggering separate probes or retries.
2. Run `npm run society:phase-d:check`; require full-run reservation headroom, no lock, valid ledger, effective allowances and an unexpired new plan. Current [offline readiness](7g-phase-d-readiness.json) fits the full reservation. Check again at execution because allowances and concurrent spending can change.
3. Only after explicit approval, create a unique dated `runtime/approved-7g-phase-d-plan.json` using the [unapproved example](7g-phase-d-plan.example.json), with current `notBefore`/`expiresAt`. Existing C approval cannot authorise this profile or the larger token ceiling. No such D approval file was created during preparation.
4. Capture fingerprints of `.env` and the operating saves; preserve the ledger and prior evaluation artifacts. Claim a unique one-shot run ID and refuse existing evidence directories. There is no automatic resumption.
5. Invoke `npm run society:phase-d:evaluate` once. Each request reserves worst-case cost before provider access; exact provider preflight must pass the 8,000 ceiling. Use the same prepared content for generation. Execute proposals exclusively through current authoritative schema, knowledge, freshness, capability, quantity, employment, consent and funds validation.
6. Stop immediately on validation rejection, malformed output, context overflow, provider/accounting failure, exhausted limits or timeout. Preserve failed proposals, raw responses, reservations and checkpoints. Never replay a consequential action automatically or clear locks/accounting to continue.

The $20 daily/$5 cumulative temporary allowances expire after November 4, Lagos time. Preserve that expiry and all historical reservations; available credits are not a spending goal. Existing provider restrictions, ledger locking, duplicate prevention and manual recovery remain unchanged.

## Evidence to collect

For every attempted opportunity retain actor, trigger, selected context and omitted IDs; provider preflight; exact structured decision and brief public explanation; usage, latency, estimated standard-price cost and full reservation; validation acceptance/rejection; and committed world changes. Do not request hidden chain of thought.

Trace each genuine interaction chronologically:

- Initiator's independent choice and the actual invitation delivery.
- Recipient's separately scoped decision, including refusal or alternatives.
- Clarification or negotiation, if chosen; explicit proposal and independent acceptance where applicable.
- Actual task progression/completion and any held/paid funds, goods, inventory or work output.
- Later reasoning that can observe the consequences.

Report participating actors rather than assuming all eligible actors generated. Compare tasks, commitments, contacts, balances, inventory, memories, relationships and employment bookings against both initial state and the time-matched offline town. Separate discussion agreements, formal task commitments and completed outcomes. Record null/unknown usage for failures, not a guessed generation cost or stale metrics from a prior request.

Compare each proposal with the offline counterfactual using the same selected information before compact wire encoding; distinguish this from the parallel baseline, whose state may diverge. State whether actions differ, but do not equate difference with quality. Attribute history/social-context influence only when the model's public explanation or structured choice supports it; label operator interpretation explicitly. More supplied context and more generations cannot establish improved autonomy by themselves.

## Offline readiness

The implementation includes exact captured-request regressions, privacy/uncertainty/mandatory-context tests, a twenty-minute sixteen-resident offline projection soak, new-plan approval and reservation tests, a complete 48-decision synthetic coordinator rehearsal, deadline and duplicate-directory checks. Authentication, live schema acceptance after compaction, exact new token totals, sustained Muse cooperation and improved outcomes remain unproven until an approved execution.

The saved synthetic rehearsal reached 267.5 simulated seconds with 11 reasoning actors and two completed offline deliveries before reaching its 48-call cap. This confirms that the bounded coordinator can retain execution consequences, not that Muse will reproduce those outcomes or that all sixteen eligible actors must participate.

Final validation on November 1, 2026:

- `npm test -- --maxWorkers=1 --testTimeout=20000`: **343 tests passed across 22 files**, 188.03 seconds. The twenty-second setting affects ordinary test execution only; explicit integration-test timeouts and all runtime/provider/evaluation deadlines remain unchanged.
- Two preceding full-suite attempts each hit a timing timeout in a different existing soak/integration test. Both tests passed separately with their original assertions and timeouts; one run coincided with a prolonged host stall. The final serial suite passed in full. No test assertions were weakened.
- `npm run build`: TypeScript server/shared and client checks passed; production build passed. The existing 603.53 kB route chunk still produces Vite's size warning; unrelated bundling changes were not introduced.
- `npm run context:profile`: ten captured requests profiled offline, no new exact token counts claimed.
- `npm run society:phase-d:check`: full $0.897792 reservation fits effective allowances, no ledger lock, key configured; current authentication/access remains unverified.
- The 48-decision synthetic rehearsal, twenty-minute projection soak and privacy/constraint/budget regressions pass. They establish offline readiness, not live social autonomy.
- [Integrity audit](model-context-integrity.json): operating saves, `.env`, ledger and original Phase C evidence unchanged; 21 ledger reservations totaling $0.333958; no D approval file and no live requests in this task.

Ready for review of the proposed plan. Execute only after separate approval and renewed pricing, configuration, expiry, budget and provider checks.
