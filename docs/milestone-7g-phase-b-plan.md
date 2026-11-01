# Milestone 7G Phase B: Unity Gardens multi-resident live evaluation

Prepared October 31, 2026. **Follow-up: the user approved same-day execution after a temporary daily-allowance increase. The [live evaluation](milestone-7g-phase-b-live-evaluation.md) stopped at its second invocation on a rejected employment proposal and was not retried.** The sections below retain the original preparation record, including the then-applicable budget and proposed start date. No Meta API calls were made during preparation. The prior six-generation evaluation remains a separate historical result.

## Proposed execution

Run one isolated evaluation of the normal sixteen-resident `town-v1` seed, with Unity Gardens' versioned history, individual biographies, economy, map and communications intact. The operating town checkpoints are neither reset nor used as output files. The evaluation and all-offline baseline receive identical initial serialized state; each persists its own state in a new, exclusively created directory.

Earliest proposed date: **November 1, 2026, 00:00 Africa/Lagos**, after explicit approval and a fresh read-only headroom check. This is not a scheduled task or permission to run unattended. Approval would authorise one immediate, supervised execution at an eligible time, with a newly created short-lived approval file. If approval arrives earlier, preparation must remain idle; it must not wait and then launch automatically.

| Selected resident | Legitimate opportunities | Relevant personal/social context |
| --- | --- | --- |
| Amina | A personally observed stock shortage; considering assistance or self-collection; follow-up to delivered responses. | Experience with stall stock, existing transport knowledge, contact possession, current money, inventory and commitments. |
| Musa | Independently assess any delivered invitation or concrete transport offer; choose clarification, refusal, deferral or acceptance. | Transport experience, capacity, needs, existing acquaintance and completed-job evidence; no view into the requester's private state. |
| Chris | Optional nearby introductions, suitable local work, and delivered requests if they occur. | Recent arrival, repair/courier background, initially knowing Musa but not Amina, modest resources and personally known work. |
| Halima | Optional local or remote social opportunities, incoming requests and economic choices as actual circumstances permit. | Cooperative supply experience, finite-budget outlook, existing acquaintances/contacts and current resources. |

These four cover retail, transport, a newer repair/courier worker and supply coordination. Selection grants eligibility, not a quota or a scripted role. Any selected resident may receive no Muse invocation if no qualifying opportunity arises. No invitation, phone exchange, job, response, conflict, promise or outcome is injected. Unselected residents continue using clearly labelled offline policies. An offline response does not count as independent Muse reasoning.

## Scope of each invocation

The model receives the exact deciding resident's observation: own needs, priorities, capabilities, inventory, legitimately known places/resources/jobs, retained memories, relevant commitments, nearby identities, delivered encounters and permitted communication views. Social context supplies only explicitly granted starting facts (at most three), that resident's own public/private biography and at most six connections derived from existing legitimate evidence.

Shared history is dated to simulation start. It is not a report of current conditions or an action instruction. Knowing identity, seeing someone, meeting, possessing a number, recording a relationship, completing work and being willing to commit remain distinct. Canonical biographies of other residents are not included. Current observations and validated events take precedence over the authored past.

Routine movement, existing delivery execution, return/stock continuation, inventory arithmetic, eating, food-seeking and rest use the existing offline policies. Actual social invitations and concrete commitment choices remain independent reasoning opportunities even when the recipient has competing needs; the recipient can choose to defer or refuse. An optional social opportunity does not require a social action: choosing paid work or another alternative is legitimate evidence.

There are no per-resident action prescriptions or success-based retries. Existing round-robin scheduling and cooldowns remain. Existing mechanics support bounded text/call discussions, introductions, refusal, deferral, clarification and separately validated transport proposals. They do not implement arbitrary wage negotiation, new business partnerships or cancellation of accepted work; prose cannot manufacture those mechanics.

## Verified model and limits

[Official pricing](https://dev.meta.ai/docs/pricing-rate-limits) was rechecked on October 31: `muse-spark-1.3` Standard is $1.25/million uncached input tokens and $4.25/million output tokens. These match application rates. [Official model documentation](https://dev.meta.ai/docs/models) lists Spark 1.3 on Model API; the much larger platform context window does not increase this experiment's application ceiling. The [Responses API](https://dev.meta.ai/docs/protocols/responses) supplies the existing structured request flow and token preflight.

| Bound | Proposed value |
| --- | --- |
| Model | `muse-spark-1.3`, Standard; low reasoning effort; no tools; `store:false` |
| Maximum invocations / generations | 12; failures consume their attempt, without retry |
| Input | 24,000 JSON characters; exact provider preflight must be at most 6,000 input tokens |
| Output | At most 2,048 tokens, including reasoning usage under existing provider accounting |
| Worst-case reservation per invocation | `(6000 × 1.25 + 2048 × 4.25) / 1,000,000 = $0.016204` |
| Worst-case twelve-invocation reservation | **$0.194448**, below the **$0.25 incremental ceiling** |
| HTTP calls | At most 12 token preflights plus 12 generation requests; no separate authentication probes |
| Concurrency / retries | One pending decision; zero automatic retries, regenerations or mock substitution after a Muse failure |
| Per-invocation deadline | Existing shared 20-second deadline across preflight and generation |
| Experiment deadline | Existing five wall minutes; no new pulse begins in the final 20-second dispatch margin |
| Simulated time / pulses | At most 180 seconds / 720 quarter-second pulses, speed 1 |
| Routine allowance | Existing persisted 2,048 decision ceiling, per-minute limits and cooldowns |

The clock pauses while awaiting inference. This is not an asynchronous-throughput comparison. A hard stop can leave a valid accepted task incomplete; this must be reported as an accepted commitment, not a completed result. The experiment does not continue routine delivery after exhausting its generation or reservation allowance just to obtain a successful ending.

History and growing memory buffers can make later inputs exceed the 6,000-token ceiling even when the initial inputs fit the character guard. Exact token counts remain unknown until the approved preflight. Such a failure stops the run; it does not authorise increasing token limits, discarding established memories or making a replacement call.

## Local key eligibility and budget readiness

The [read-only readiness artifact](7g-phase-b-readiness.json) records:

- The ignored, untracked `.env` has a configured key and selects the reviewed model. The key value is never displayed.
- Its whole-file fingerprint matches the configuration used in the previous successful six-generation run. No process-environment key override was present during inspection.
- That is historical evidence of access, **not current authentication, current model entitlement, credit balance, team mapping or credit-expiry verification**. Those remain unverified without authenticated requests. Preparation does not call an API to resolve them. The first approved token preflight and generation must fail closed if access is no longer valid.
- The shared ledger is valid and has no lock. Existing limits remain **$0.25/day and $1 total**; no setting was raised.
- On October 31, daily reservations are **$0.097224**, leaving **$0.152776**, enough for **nine** more worst-case invocations. Total reservations are **$0.139510**, leaving **$0.860490**.
- A full twelve-call run today would require **$0.291672** in same-day reservations, exceeding the daily limit. The Phase B CLI therefore refuses startup today, rather than quietly reducing the run or relaxing the limit.
- On the next Lagos day, absent intervening spending, $0.194448 fits the unchanged daily and total limits. The ledger must be read again immediately before execution. Concurrent spending can still cause a later locked reservation to refuse; that stops the experiment and is not retried.

No displayed credit allocation is treated as a substitute for the stricter application ledger. No key, billing setting, free-credit setting or credential file was changed.

Immediately before an approved execution, re-open official pricing and compare it with the pinned application rates. Changed pricing or model availability requires stopping and revising the reservation calculation; this preparation does not authorise silent rate or limit changes.

## Execution and failure safeguards

The unapproved [plan example](7g-phase-b-plan.example.json) uses phase `7g-b-unity`, the exact reviewed roster and twelve/$0.25 ceilings. Its `approved:false` and invalid expiry deliberately prevent execution. It is not the runtime approval file.

After explicit approval only, create a new, short-lived `runtime/approved-7g-phase-b-plan.json` with a unique plan ID, `approved:true`, eligible `notBefore` and valid expiry. The previous six-generation approval cannot authorise this phase. The live command is `npm run society:phase-b:evaluate`; it has not been run during preparation.

Before any dispatch, the CLI validates approval/expiry/start time, exact roster/model, configured key, absence of a ledger lock and headroom for all twelve worst-case reservations. It fingerprints `.env`, `runtime/neighbourhood-session.json` and `runtime/town-headless.json`. It then exclusively claims the plan ID and creates a new output directory. A claim is never deleted to retry. Existing checkpoint/evidence artifacts are refused rather than resumed. The original locked budget ledger reserves each invocation before any Meta HTTP request and never refunds uncertain failures.

Evidence is flushed before dispatch. Every pulse validates the authoritative snapshot and reconciles persisted request/plan accounting with the coordinator's invocation count. Successful proposals must have a matching authoritative validation event. The runner stops on rejected proposals, provider/preflight/usage failure, missing validation, snapshot or accounting failure, exhausted generation/reservation allowance, paused session, simulation bound or deadline. On coordinator failure it attempts to persist a paused state only while checkpoint persistence remains operational; a persistence failure is not retried.

Both evaluation checkpoints are paused at normal completion. Provider failures are recorded with phase, available raw structured output, public explanation, usage/latency if known, and zero retries. Partial evidence is retained after coordinator failure. Process crashes do not cause automatic continuation; the exclusive claim and artifacts prevent relaunch. Before/after protected-file fingerprints are recorded even when the coordinator throws, where the process remains alive to finish auditing.

The recorder now checks every intermediate checkpoint. Rehearsal exposed an existing zero-length building connector that could be persisted as a travel step with zero edge length. The movement loop now completes such connectors immediately, without changing geometry or speed. The regression test verifies every quarter-second checkpoint along that route; no snapshot validation rule was weakened.

## Evidence and report contract

Each run retains `initial-world.json`, `evidence.ndjson`, `session.json`, `offline-session.json`, `report.json` and `report.md` under its new `output/society-7g/<unique-plan-id>/` directory. Live runs also retain read-only startup readiness and protected-file fingerprints. No credential or private model chain of thought is recorded.

The detailed report contains:

1. Selected and actually invoked residents, selection rationale from this plan and each actual opportunity classification.
2. Exact system instructions, exact scoped requests and historical fact/biography IDs supplied per invocation.
3. Exact structured model outputs, provider attempt evidence, public `reason` text, authoritative validation and execution events.
4. Per-invocation changes in tasks, communication/commitments, contacts/knowledge, inventories/money, memories, relationships, needs and activities; full initial/final states remain inspectable.
5. Independent responses and their provenance. Text, discussion acceptance, task acceptance, escrow, physical collection, delivery, payment and successful-job updates are separate evidence levels.
6. Actual known input/output tokens, per-call latency and token-price estimates; unknown usage stays unknown. The worst-case reservation ceiling is reported separately from usage and billing.
7. The offline policy's decision on each identical Muse input, plus a separate all-offline town with identical starting state and matched simulation pulses/end time. Divergent outcomes are descriptive, not proof of superiority.

For historical-context influence, review the model's **public explanation**, not hidden reasoning:

| Classification | Required evidence |
| --- | --- |
| Explicit reference | Quote the exact public explanation and identify the supplied biography/history fact it references. A generic remark about capacity or money may instead refer to current observation. |
| Operator interpretation | Describe a plausible link separately and label it inference; do not present it as the model's stated reason. |
| Context present only | Record that history was supplied but no explicit connection appears in the output. |
| Ambiguous / unsupported | Mark uncertainty, invented facts or conflicting evidence; do not infer influence merely from a plausible action. |

Generated report entries initially say `requires-human-review`, leave operator interpretation empty and mark causal improvement `not-established`. After execution, complete the narrative review using exact public reasons and event evidence. Supplying history alone proves neither use nor benefit. Neither the twelve-call sample nor the offline baseline isolates the causal effect of history; no extra paid ablation is authorised.

Success requires genuine separate model choices with observable validated consequences. If no model-originated discussion receives an independent Muse response, or if tasks remain incomplete, report that limitation directly. Cooperation is one possible result; refusal, deferral, clarification, independent work or no interaction are legitimate outcomes.

## Offline preparation results

`npm run meta:check` passed without network access. `npm run society:phase-b:check` performed read-only local inspection and correctly reports insufficient same-day headroom. Neither command authenticates the key.

The corrected synthetic CLI rehearsal is retained at `output/society-7g/offline-520cc500-6452-4e1e-b539-aa3ed23286f7/`. It reached **12 synthetic invocations across all four selected residents**, stopped at the generation cap at **136.75 simulated seconds**, and retained a matched-time baseline. Its mock delegates produced one model-labelled synthetic proposed/accepted/completed delivery. This verifies dispatch, authority, evidence and stop conditions only; it is **not live Muse evidence**. The earlier failed rehearsal is retained separately and was not resumed.

The new offline tests cover exact approval scope, start-date restrictions, twelve-call budget arithmetic, unchanged ledger inspection, routine care routing, all-four-resident scoped inputs, generation/reservation/deadline stops, rejection without retry, accounting failure, refusal to recover existing artifacts and the zero-length navigation regression.

Final verification: the full regression run passed **314 tests in 18 files**. After the final report/audit refinements and addition of the CLI approval-boundary test, the complete Phase B file passed **10/10 tests**. The final production build passed both TypeScript projects and Vite; the existing shared-renderer large-chunk warning remains. `git diff --check` passed. The CLI approval test runs in a temporary workspace with network blocked and proves an unapproved plan fails before credential access or claim creation.

Before/after preparation fingerprints match for `.env`, both operating checkpoints, the shared spending ledger and the prior six-generation approval file. No new live approval or live claim was created. No commit, push or deployment was performed.
