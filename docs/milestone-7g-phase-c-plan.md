# Milestone 7G Phase C: employment grounding and proposed town evaluation

Prepared October 31, 2026. **Follow-up: the user approved execution and the temporary $5 cumulative allowance on November 1. The [Phase C live report](milestone-7g-phase-c-live-evaluation.md) records nine validated generations and an independent request/reply before the tenth token preflight stopped the run.** The sections below preserve the original offline preparation record; no live API calls or new live approvals were made during that preparation. This document contains technical readiness details kept out of the public README.

## Employment grounding

Phase B stopped when Chris proposed supply-desk work despite lacking the supply skill. The world correctly rejected the action. His previous model-facing work list omitted unqualified jobs, even though his legitimate local knowledge included the supply desk; that made the distinction between knowing a job and being eligible less explicit.

The new scoped `town.work` view includes **all and only jobs the actor legitimately knows**, with:

| Field | Meaning |
| --- | --- |
| `id`, `name`, `node` | Known posting and workplace, distinct from a district or service name. |
| `skill`, `matchesSkill` | Required skill and whether the resident actually possesses it. A biography adds no skill. |
| `wage`, `seconds` | Posted work terms, not a guarantee of current availability or payment. |
| `atWorkplace` | Physical presence at the job site, excluding travel. |
| `available` | Current opening when personally at the site; otherwise the resident's last observation or unknown. |
| `funded` | Whether the posted wage is backed, observed locally or retained from the actor's own observation; never a business account balance. |
| `observedAt`, `freshness` | Current, historical or unknown status. Old-site evidence is invalidated after relocation. |
| `canTakeNow`, `ineligibleReason` | Current action eligibility under the unchanged authoritative world validator. |

`town.eligibleWorkIds` lists only jobs that pass those current checks. Chris now sees the supply desk as known, physically local, funded and open, **but `matchesSkill:false`, `canTakeNow:false`, `ineligibleReason:missing-skill`**. His legitimate repair and errands postings remain available to consider; remote availability/funding is unknown or historical. No supply skill, job, money or contact was added to his state.

Funding and availability are separate. A business can fund a wage while having no free slot, insufficient production inputs or no output capacity. An unavailable posting therefore does not imply an unfunded business. Changing remote business finances cannot change an absent resident's observation without legitimate new evidence. Unknown jobs and other residents' private work or finances are not exposed.

The live decision and conversation proposal schemas restrict `take-work.businessId` to `eligibleWorkIds`. When that list is empty, the live schema omits the `take-work` branch; travel, waiting, social choices and other existing alternatives remain. New instructions explain qualifications, location, funding, freshness and unknown status explicitly. Each recorded invocation retains its exact dynamic decision schema as well as its scoped request and system instructions.

This schema restriction is an additional grounding aid. The original global action guard and authoritative validator still execute independently and reject unknown work, wrong location, missing skills, busy actors and unavailable jobs. No validation was weakened. A proposal may still become invalid if conditions change; no automatic retry is permitted.

The offline policy retains its skill filter, so displaying an unqualified known job cannot make the deterministic resident accept it. Generic `work` timers still create no wage; `take-work` creates a real booking only after validation, and completion pays its held wage.

## Knowledge and save compatibility

The optional `knowledge.businesses[id].funded` field records a locally observed boolean alongside the existing site and observation time. Existing saves remain readable without it. Older remote knowledge reports `funded:null`; no migration invents funding evidence or resets the town. Future physical perception records a real `work-observed` event if funding information changes or becomes newly known. Existing histories, inventories, relationships, contacts, locations and commitments remain intact.

Job information remains scoped by the resident's existing business knowledge. Public workplace metadata does not grant knowledge of an unknown posting. Availability and funding are current only at the physical site; remote evidence remains historical even if an old timestamp happens to equal the current instant. The schema and observations reveal no exact business budget or another resident's private state.

Regression coverage replays the exact Chris proposal from Phase B and confirms `missing-skill`, no job or payment, and unchanged skills/resources. Additional checks cover known-but-unqualified postings, eligible schema IDs, funding without availability, remote privacy, legacy unknown funding, stale sites and both real provider adapters with fake transport only.

## Proposed execution scope

| Setting | Proposed bound |
| --- | --- |
| Phase | `7g-c-unity`, separately approved |
| Population | The normal sixteen-resident Unity Gardens seed, all sixteen eligible for meaningful Muse choices |
| Generations | Maximum **36**; no requirement to use every call or invoke every resident |
| Incremental run ceiling | **$0.60** |
| Conservative reservation | 36 × $0.016204 = **$0.583344** at the pinned Spark rates |
| Simulated duration | Maximum **600 seconds / 2,400 quarter-second pulses**, speed 1 |
| Wall duration | Maximum **20 minutes**; do not dispatch in the final 20-second provider deadline margin |
| Provider | Existing Muse Spark 1.3 Standard, low effort, strict JSON, `store:false`, no tools |
| Per-call limits | Unchanged 6,000 preflight input tokens, 2,048 output tokens, 24,000 input JSON characters and 20-second deadline |
| Routine allowance | Existing persisted 2,048 decisions, cooldowns, one in-flight decision and six paid requests per wall minute |
| Storage | A fresh isolated evaluation directory and a matched all-offline baseline; operating saves remain untouched |

The run does not manufacture a crisis, new relationships, guaranteed conversations or successful cooperation. Residents may pursue work, decline, defer, clarify, ignore requests or choose self-reliance. No fixed pairing, dialogue schedule, recipient quota, friendship or political outcome is imposed.

## Genuine social priority

Only this new profile enables response priority. The scheduler considers each resident's own scoped observation and eligible triggers, with:

1. Actually delivered pending communication, face-to-face invitations and concrete task commitment choices.
2. Legitimate follow-up offers and reconsideration after a response.
3. Other meaningful initiation and economic opportunities, with stable round-robin ordering for equal priorities.

Priority changes **who gets a decision opportunity**, not what they must decide. An independent deferral/refusal is useful evidence. Undelivered messages cannot gain recipient priority. Busy or otherwise ineligible residents are not forced to answer; expiry and availability rules remain. A selected resident learns nothing about another person's inbox because the operator schedules them.

Ordinary movement, eating, purchases, rest, stock continuation, inventory arithmetic and accepted delivery execution remain offline. Actual incoming requests can still require a choice about competing needs. The ordinary offline town and previous six-/twelve-generation profiles retain their existing scheduling behaviour.

## Budget inspection and cumulative recommendation

The [read-only readiness artifact](7g-phase-c-readiness.json) confirms current internal settings:

- **Daily:** $20 through November 4 inclusive, with the already implemented Lagos-midnight reversion to at most $0.25/day on November 5.
- **Cumulative:** **$1**, unchanged. Existing nonrefundable reservations total **$0.171918**, leaving **$0.828082**.
- **Proposed run:** **$0.583344** in worst-case reservations fits both current allowances. After a fully reserved 36-call run, the current cumulative allowance would retain **$0.244738**. No cumulative change is needed to fit this one run.
- No shared ledger lock was present. No reservation was made, refunded, rewritten or deleted during preparation. Read-only configuration inspection does not authenticate the key or verify current provider entitlement/credit expiry.

**Recommendation, not applied:** raise the cumulative internal allowance to **$5 through November 4**, inclusive of all earlier ledger reservations, while preserving separate approval and the ceiling for every run. At current reservations that would leave **$4.828082**, enough for up to eight fully reserved 36-call sessions at the pinned rate, if each is separately justified and approved. Eight is a headroom illustration, not a planned number of runs or spending target. Current actual usage suggests useful evaluation does not need the available credit balance to be exhausted.

If that cumulative increase is approved later, give it the same explicit expiry and restore the $1 cap on November 5. Preserve the complete ledger; if retained reservations exceed the reverted cap, further live calls must fail closed pending review. Do not reset accounting to make room. This work neither changes `.env` nor implements an unapproved cumulative increase. Provider credit balances and expected expiry remain separate from these application controls.

## Approval, execution and recovery gates

The [unapproved plan example](7g-phase-c-plan.example.json) contains the exact roster and 36/$0.60 scope, with `approved:false` and invalid dates. It cannot run. No `runtime/approved-7g-phase-c-plan.json` was created.

After separate explicit approval only, create a new short-lived runtime plan with unique ID, valid start/expiry and phase `7g-c-unity`. Then the command is `npm run society:phase-c:evaluate`. Recheck official pricing, configured-key eligibility, effective allowance expiry, headroom for all 36 reservations and absence of locks immediately before execution. The first authorised preflight/generation must stop on access failure; no extra authentication probes or replacement calls are implicitly authorised.

The old generic/twelve-call approval ceiling remains 12/$0.25. Only the exact new phase with all sixteen canonical IDs, 36 generations and $0.60 is admitted by the expanded session guard. Increasing fields in an old plan or reusing the consumed Phase B approval cannot authorise this run. Recovery validates persisted counters against the approved scope; reset or restart never replenishes them. The existing 48-request session ceiling remains above this run's 36 maximum.

The CLI exclusively claims the plan ID before dispatch and creates a new evidence directory. Existing checkpoints/evidence are refused rather than resumed. The same locked ledger reserves each worst-case invocation before any API request, with no refund for uncertain outcomes. Every pulse validates the world and reconciles persisted paid accounting. Stop immediately for a rejected proposal, provider/preflight/usage failure, missing validation, snapshot/accounting/persistence failure, exhausted limits, pause, simulation bound or wall deadline. No automatic retry, mock replacement or automatic recovery is introduced.

Both branches are paused on completion. Failure evidence and the consumed claim remain. Protected-file fingerprints cover credentials/configuration and operating checkpoints. Current shared ledger history, provider restrictions and the daily expiry remain unchanged.

## Evidence and assessment

Retain exact system instructions, per-invocation schemas, scoped inputs, public structured decisions, provider attempt information, token usage/latency, reservations, authoritative validation and resulting state. Keep the identical-input offline decision and separate same-start/same-time all-offline branch. The recorder retains tasks, contacts, money, inventory, memories, relationships, communications and commitments.

Evaluate valid-action rate; independent initiators and recipients; refusal/deferral/clarification; adaptation to delivered information; accepted versus physically completed commitments; economic consequences; and supported references to personal/shared history. Quote the public explanation separately from operator inference. No private chain of thought is requested. Context being supplied, richer text or more model calls do not establish improved reasoning. This sample is not a causal history ablation or an endurance benchmark.

## Offline preparation evidence

Commands requiring no Meta requests:

```bash
npm run society:phase-c:check
npm run society:phase-c:dry-run
npm test -- --maxWorkers=1
npm run build
```

The CLI rehearsal at `output/society-7g/offline-016704cd-1feb-40d9-bda4-d544b0d1a153/` made **36 synthetic invocations**, stopped at the cap at **201.75 simulated seconds**, and retained a matched-time offline baseline. All sixteen were eligible; eleven actually received synthetic decisions. Its opportunity trace included incoming communications, an encounter response, task commitment choices and follow-ups; one synthetic proposed/accepted delivery completed. The largest exact decision request was **17,127 JSON characters**, below the existing 24,000 guard. These are policy delegates testing integration, not Muse outcomes.

The new tests verify the exact approval scope, unchanged older caps, real delivered-response priority, independent deferral, no undelivered inbox leak, all-sixteen eligibility, 36-call accounting, deadline stop, matched baseline and rejection of an unapproved live CLI before claims/credentials/network. Actual provider input token counts, including instructions and schema, remain unknown until an approved preflight; the fixed 6,000-token ceiling can still stop a later memory-heavy request. No live claim of improved employment choices is made.

The public README was rewritten around Unity Gardens, current player experiences, a candid offline/live Muse distinction, local setup, technology and the society vision. Detailed milestone history, accounting and recovery internals remain in linked documentation.

Final verification: **328 tests passed in 20 files** with serial workers and unchanged timeouts. Both TypeScript projects and the production build passed; the existing shared-renderer large-chunk warning remains. The adapter regression tests now expect the scoped job schema and explicitly retain the original transport quantity schema. All local README links resolve. The [verification artifact](7g-phase-c-verification.json) confirms unchanged `.env`, shared ledger, both operating town saves and prior approval file, and absence of a new live approval.

**Readiness:** the implementation and offline safeguards are ready for separate review and live approval. The 36-call run fits the currently configured allowances; the optional $5 cumulative recommendation has not been applied. Actual model behaviour and token preflight remain live checks, not offline claims.
