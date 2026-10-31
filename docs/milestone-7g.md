# Milestone 7G: Muse society reasoning — Phase A

Integration readiness prepared October 31, 2026. **Follow-up: the [first approved Phase B live evaluation](milestone-7g-first-live-evaluation.md) made six valid Amina decisions with persistent consequences, but did not meet the independent two-resident Muse criterion.** The sections below retain the Phase A readiness record. Its offline contract rehearsal is synthetic and establishes plumbing, not Muse reasoning quality or live cooperation success. Further live runs require a separately reviewed approval.

## Inspection and gaps

The existing `MetaNeighbourhoodProvider` already uses `muse-spark-1.3` Standard, Responses API structured output, low reasoning effort, `store:false`, a 6,000-input-token ceiling, 2,048-output-token cap and shared 20-second deadline. Exact input preflight follows a full worst-case reservation in the original locked ledger. It has no provider retries, hosted tools or automatic mock substitution. The normal server validates proposals through the existing world executor, records action provenance and preserves spending counters across reset/recovery.

Milestone 6C made one genuine live generation. Amina proposed quantity eight; local validation correctly rejected it and Musa was never invoked. The subsequent quantity-contract correction was offline. No later offline success can retroactively turn 6C into a completed live interaction.

The town observation already supplies the resident's own identity, goals, needs, inventory, home, skills, relationships, commitments, memories, legitimately known businesses/stock/roads, scoped encounters and delivered communication. Contacts and acquaintance knowledge are separate. It contains no unrestricted world state or another resident's private inbox, goals, needs or home assignment. Uncertain reports retain provenance. Task acceptance, conversation acceptance and physical completion are separate authoritative actions.

The main gap was routing: existing live server mode treated every decision as paid inference, while the offline town used deterministic policies for everything. Communication is capable of independently selected responses, but its offline prose remains policy fixtures. Existing negotiation supports clarification, refusal and new proposals under the current rules; it does not support arbitrary negotiated prices, cancellation of accepted work, new business contracts or unrestricted multi-turn conversation. Those outcomes must not be invented in prose.

## Phase A changes

`SelectiveNeighbourhoodProvider` routes selected registry residents to Muse for scoped opportunities: incoming communication, recipient commitment choices, accepted-discussion follow-ups, changed responses, locally discovered road changes, observed stock shortage, optional introductions and local employment choices. Busy activities, mere restoration/control triggers, waiting for an existing reply/commitment, and fulfilment mechanics do not automatically request Muse. The selector identifies a reasoning opportunity, not the action or desired response. It contains no resident-ID behaviour branches.

The existing server performs dispatch and authoritative execution. Deterministic decisions retain their separate persisted routine allowance; only paid selections consume live-plan/request accounting. Both still share single-decision concurrency, resident cooldowns, revisions, phone control protection and persistent state. A failed or invalid Muse proposal is never silently replaced by the offline policy. If the paid allowance is exhausted, selected meaningful choices cannot bypass it through a fallback; routine town activity can continue within its bounds. Fully offline operation remains unchanged.

Selective sessions retain the persisted 1,800-second/2,048-routine limits and live observer gate when served over HTTP. The first evaluation uses a bounded internal coordinator instead of an uncontrolled HTTP clock. The normal backend command has not been switched to selective live mode or started with a new approval plan. No new public endpoint or UI was needed.

The model schema also now bounds `wait` and `work` to 1–120 seconds, and bounds goal/reason string lengths to the existing local guard. Existing rest, quantity, capability, contact, stock, money, location and commitment validation remain strict.

## Budget inspection

Read-only local inspection found a configured key (value withheld), `muse-spark-1.3`, **$0.25/day and $1 total** application limits, three existing reservations totalling **$0.042286**, and no existing `runtime/approved-live-plan.json`. These settings and the original ledger were preserved. `npm run meta:check` passes offline and explicitly does not establish authentication, current model access or account eligibility.

The existing signed-in Meta billing tab displayed **$149.75 free credits in use** for its current team. Its notice says content may be used for product improvement while using free credits. The separate $100 allocation, both credit expiries and mapping of the configured key to that billing team remain unverified. A displayed payment-card expiry is not a credit-expiry date. No billing settings, project/team selection, credentials or free-credit settings were changed. The balances are not treated as a combined $249.75 pool.

[Official pricing](https://dev.meta.ai/docs/pricing-rate-limits), checked during readiness, lists Spark Standard uncached input at $1.25/million and output at $4.25/million tokens. These agree with the existing application rates. The [Responses API documentation](https://dev.meta.ai/docs/protocols/responses) supports scoped stateless requests and input-token preflight; [structured output](https://dev.meta.ai/docs/structured-output) establishes format, not semantic permission or action success.

The user's **$10 maximum incremental budget is an outer ceiling, not an instruction to raise the stricter local limits or spend $10**. The first run is deliberately smaller: six maximum generations × $0.016204 reservation = **$0.097224**, below a **$0.10 run ceiling**. It fits the existing daily/total settings. Reservations are not refunded on failure. Reported usage costs remain distinct from reserved ceilings and provider billing/credit balances.

## Concrete Phase B proposal — awaiting approval

Start the normal sixteen-person `town-v1` seed in an isolated evaluation directory. Select **Amina and Musa** for meaningful Muse decisions; the other residents and routine mechanics use the existing offline policy. Amina's known stock shortage is the initial opportunity. Muse may contact Musa, choose another available action, wait, or collect supplies herself. No contact, response, task or outcome is injected.

If a request reaches Musa, his separate Muse call receives only his own current observation and legitimately delivered content. Amina can subsequently reconsider his reply. Any transport offer and its acceptance require separate validated actions. After a commitment, deterministic physical travel/collection/delivery performs the job. One failed/refused interaction remains evidence of that result, not completed cooperation.

Expected successful discussion/offer/acceptance path: **four generations**. Maximum: **six generations**, each with one preflight, hence at most **twelve Meta HTTP requests**. Hard bounds are 180 simulated seconds, 720 quarter-second pulses, five wall minutes, the six-generation plan, $0.10 run ceiling and the stricter shared ledger limits. It stops earlier on a provider failure, rejected action, or completion of a delivered task that both originated in a selected model proposal and was accepted by a selected model recipient. Any successful early stop does not spend unused generations. No regeneration is used to obtain a preferred outcome.

The coordinator advances the wider town while awaiting successive opportunities. It awaits each provider operation before the next clock pulse; simulation time therefore slows during network latency. It is not an asynchronous-throughput benchmark. More browser/session integration belongs in Phase D after this first evidence is reviewed.

After explicit approval only, create the reviewed, expiring `runtime/approved-7g-plan.json` from [the unapproved example](7g-first-live-plan.example.json), then run `npm run society:evaluate`. The example is intentionally invalid for execution. The CLI claims `runtime/society-7g-<plan-id>.claim` exclusively before reading credentials. A claimed run or existing evidence directory is never resumed/repeated automatically, including after a crash. A failed startup may consume the one-shot claim conservatively; review it rather than deleting it to retry. No approved file or live claim was created during Phase A.

## Evidence and offline comparison

`evidence.ndjson` is exclusively created and flushed before dispatch. Each paid opportunity records the exact scoped request, selected opportunity, an offline decision on the identical request, and the durable before-state. It then records the exact public structured proposal/output, available token usage, latency, zero retries, provider phase/error, authoritative validation events and committed resulting world/accounting. It records no credential or private model chain of thought. Unknown usage on a timeout remains unknown; worst-case reservation is not presented as actual billed usage.

A separate all-offline session starts from identical serialized world conditions, uses the same speed and clock/decision pulse count, and stops at the same simulation time. The final report retains tasks, resources, money, knowledge, memories, relationships, communication and accounting for both branches. These comparisons distinguish identical-input choices from whole-town divergence. The reviewer must assess contextual relevance, adaptation and supported clarification using the actual traces; more elaborate text is not a quality score.

Evidence levels remain separate: generated text, schema-valid proposal, authoritative acceptance, observable persistent effect, and independently influenced residents. A completed-delivery stop requires a model-proposed and model-accepted task to have physically delivered; other offline deliveries do not satisfy that condition.

`npm run society:dry-run` uses **synthetic offline fixtures**, a synthetic plan and temporary evaluation saves, without loading credentials or any Meta ledger or accessing the network. Its `kind` and model label explicitly identify this. The same coordinator and selective accounting are exercised, but its output is never live evidence. The complete offline test suite also substitutes Meta HTTP responses to verify scoped payloads, retained invalid-output evidence, reservation/preflight boundaries and no retry.

## Next phases and limits

Phase A validation: **296 tests pass across sixteen files**, including nine new selective-routing/evidence/provider-contract cases. Both TypeScript projects, production build and the offline Meta configuration check pass. The existing large shared-renderer chunk warning remains. No new UI was added or browser acceptance claimed for a live session; the existing 7E/7F browser results remain the latest visual verification.

The final synthetic CLI rehearsal used `output/society-7g/offline-6fdeeef9-5dad-406d-9570-e43799ad72c5/`. Four fixture invocations and 43 routine decisions produced an accepted, physically completed and paid delivery by second 86.25, then stopped early. The all-offline baseline also completed a delivery by that same simulation time. This verifies recorder/dispatch/authority integration and demonstrates no added reasoning value: the synthetic delegate deliberately uses the offline policy. It spent zero credits. The operating ledger remained at three reservations totalling $0.042286. Actual live comparison is still pending.

After Phase B approval and results: inspect failures before any retry; report actual usage and outcomes; then propose a separately bounded Phase C with diverse selected residents. Employment pressure, inconvenient requests, unknown-person encounters and discovered road changes already have scoped routing opportunities. Wage negotiation, new contracts and cancellation of accepted work remain unsupported rather than fabricated. Keep an aggregate incremental ceiling at or below $10 without treating separate credit allocations as interchangeable.

Phase D can expose a separately approved selective session through the existing browser/event history. No UI redesign is needed, but recorded/live/offline labels must remain truthful. Continuous inference, unattended paid restarts, governance, elections, new emergencies, families and generations are outside Phase A/B. This preparation does not claim live society success, superior Muse decisions, thirty-day endurance or physical-mobile performance.
