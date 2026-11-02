# Milestone 7G Phase D: live Muse society evaluation

**Nineteen genuine Muse generations across all sixteen residents produced eighteen accepted actions and one rejected purchase. The run stopped at 93 simulated seconds because Zainab attempted to buy food from an empty stall. There were no conversations, invitations, independent social responses or completed social visits before the stop. The evaluation did not establish sustained multi-step social autonomy.**

Run ID: **7g-d-society-20261101T175236Z**. Executed November 1, 2026, **18:53:01–18:56:08 Africa/Lagos**, after explicit user approval of the prepared profile. Coordinator wall time: **186.892 seconds**. No retry, resumption, additional authentication probe, forced interaction, code change, commit, push or deployment occurred during execution.

The existing Phase C Amina–Musa independent exchange remains valid earlier evidence. Phase D began from a fresh isolated normal town and did not copy that exchange into residents' memories or manufacture its continuation.

## Approved configuration and checks

Bounds were 200 generations, $5 incremental spending, 8,000 input/2,048 output tokens, 1,800 simulated seconds and 90 wall minutes. Model: Muse Spark 1.3 Standard, low reasoning effort, strict structured output, store:false, no hosted tools, one pending inference and the existing six-generations-per-minute throttle.

Official [pricing/rate limits](https://dev.meta.ai/docs/pricing-rate-limits) and [model support](https://dev.meta.ai/docs/models) were rechecked immediately before execution. Standard input remained $1.25/million and output $4.25/million; the model context window supports the local token ceiling. Full reservation was $0.018704 per attempt, or $3.740800 for all 200, below the $5 ceiling.

Read-only configuration checks verified the configured ignored key and model, temporary $50 daily/$100 cumulative allowances through November 4 Lagos time, full reservation headroom, a valid ledger and no spending lock or pending ledger file. Both operating checkpoints validated in memory, and the operating session was paused. A pre-existing operating-session lock was preserved; the evaluation used its own files and claim.

A fresh approval window ran from 18:52:35 to 20:32:36 Lagos time. The exclusive one-shot claim prevented attaching to an existing evaluation. Authentication/model access was established by the first bounded preflight/generation and confirmed by nineteen completed model responses, without a separate live probe. There were nineteen token preflights and nineteen response requests, with no retries.

The normal town retained its sixteen residents, layout, homes, businesses, histories, initial relationships and contacts. The social extension created no invitations or fabricated past events at initialization. All sixteen residents were eligible and each actually received Muse reasoning. Personal, economic and social choices used Muse; deterministic movement, timers and transfers remained authoritative mechanics.

## What every resident actually chose

Times below are elapsed simulation seconds. The exact structured decisions, public explanations, validations, counterfactuals, token usage and latency are preserved in [the portable decision record](7g-phase-d-decisions.json). Public explanations are the returned brief reasons, not hidden chain of thought.

| Resident | Invocation(s), time | Chosen action | Validated consequence at the stop |
| --- | --- | --- | --- |
| Musa | 1 at 0.25; 17 at 65.75 | Wait 60 seconds twice to remain available at the stand | First wait completed; second remains active. No customer request, delivery or social approach occurred. Coins stayed 10. |
| Amina | 2 at 0.5; 18 at 67 | Travel to centre; collect two supplies herself | Arrived at 10.5; holds two stall-supply goods, not food. Did not return or restock the market. Coins rose 24→25 through Ngozi's purchase. |
| Zainab | 3 at 0.75; 19 at 93 | Travel to market; attempt to buy one portion | Arrived at 10.75. Purchase rejected for insufficient-stock; coins stayed 6, food remained zero and hunger reached 0.88. |
| Chris | 4 at 1 | Travel to repair workshop for suitable work | Arrived at 25.75. No paid work was booked by him before the stop. Coins stayed 4. |
| Fatima | 5 at 1.25 | Rest at home for 90 seconds | Rest completed at 91.25; fatigue fell to zero. Coins stayed 14. |
| Tunde | 6 at 1.5 | Take funded repair work | Completed at 61.5, receiving two held wage credits; personal coins 22→24. |
| Halima | 7 at 27.75 | Take funded supply work | Completed at 72.75, receiving two credits and producing two supplies; coins 12→14. |
| Ibrahim | 8 at 29 | Travel to centre seeking supply work | Still travelling at the stop; no booking or wage. Coins stayed 3. |
| Yusuf | 9 at 29.25 | Take funded teaching work | Accepted booking remains active until 119.25; two credits are held, not yet paid. |
| Ngozi | 10 at 30.25 | Buy one food portion | Paid two credits; coins 5→3 and personal food 0→1. She had not eaten it. Her purchase exhausted the stall's one remaining portion. |
| Emeka | 11 at 33.5 | Take funded electrical work | Booking remains active until 108.5; two credits held, not yet paid. |
| Grace | 12 at 35.25 | Travel to Community Offices, prioritising income | Still travelling; no work booked. Coins stayed 2 and hunger reached 0.78. |
| Ladi | 13 at 59 | Travel to Community Offices to inspect general work | Still travelling; no booking or delivery commitment. Coins stayed 4. |
| Sadiq | 14 at 60.25 | Travel to repair workshop | Arrived at 85. No work booked before the stop. Coins stayed 1. |
| Maryam | 15 at 60.5 | Rest at home for 60 seconds | Rest remains active until 120.5. Its completion benefit had not occurred. Coins stayed 18. |
| Bisi | 16 at 61.25 | Take funded tailoring work | Booking remains active until 136.25; two credits held, not yet paid. |

All 19 proposals carry mode meta and model muse-spark-1.3 in authoritative action-proposed events. The Muse branch recorded **zero routine/offline policy decisions**. Its continuing movement, work completion and money/goods transfers were deterministic consequences of the model's already accepted choices.

## Social interaction and multi-step reasoning

There were **zero** calls, texts, structured social invitations, counterproposals, social acceptance/refusal/postponement actions, conversation turns, completed social visits or new transport tasks in the Muse branch. No resident independently maintained a multi-step social exchange. Physical co-location and encounter-noticed events occurred, but no introduction or conversation action followed; those notices are not social interaction evidence.

The clearest repeated personal/economic sequence was Amina's independently chosen journey to the supplier followed by self-collection. It produced persistent inventory but stopped short of returning, restocking, or reasoning about a completed business outcome. Musa independently chose another wait after his first wait ended. These are repeated model choices, not sustained interpersonal reasoning.

Tunde and Halima completed model-selected work; Fatima completed model-selected rest. These establish choice→validated booking→deterministic completion. None received a subsequent Muse decision after that completion before the global stop. The run therefore does not show model reconsideration of those completed outcomes.

## Why the run stopped

The exact nineteenth decision was:

```json
{
  "action": { "quantity": 1, "type": "buy" },
  "goalId": "food",
  "reason": "Hungry at Market Square with coins available, trying to buy food to eat."
}
```

Zainab's actual model input included:

```json
{
  "resources": { "supplierGoods": 8, "marketGoods": 0, "salesOpen": true },
  "marketStock": {
    "value": 0,
    "source": "observed",
    "observedAt": 30.25,
    "evidenceId": "event-140:zainab",
    "freshness": "historical"
  },
  "marketServing": true,
  "personalCoins": 6,
  "personalFood": 0,
  "foodNeed": 0.88,
  "buyQuantityBounds": { "minimum": 1, "maximum": 6 }
}
```

This is a labelled excerpt, not the full wire schema. The observation established food-retail services and an attending market operator, but **did not establish positive stock**. Its last observed zero was historical, not a fresh positive availability observation. The public explanation mentioned hunger and money but did not explain its treatment of the stock evidence. We cannot infer hidden reasoning or assert that the model deliberately ignored it.

Actual authoritative stock was zero, so validation event **event-212**, request **society-7g-initial:decision-19**, rejected the action with **insufficient-stock**. No purchase, payment, inventory decrement, relationship change or other gameplay consequence was executed for this proposal; its committed gameplay delta was empty. Only proposal/validation evidence was recorded. The coordinator immediately paused both branches. There was no provider failure, pending inference interruption, fallback, retry or deterministic completion drain after this validation rejection.

The input ceiling did not cause this stop: the largest preflight was **4,638**, comfortably below 8,000 and also below the old 6,000 ceiling. Spending and time limits were likewise unexhausted. The immediate bottleneck is purchase feasibility under the existing strict stop-on-rejection rule.

A source inspection after execution found that stock-observed is recorded when the cached quantity/open state changes; unchanged stock does not refresh its evidence timestamp. Thus Zainab's physically local zero remained labelled historical at 93 seconds. Separately, permittedActions reflects capabilities and activity, not guaranteed transaction feasibility. These facts merit offline investigation; they do not excuse assuming food exists, prove a particular model reasoning failure, or justify weakening validation during the run.

## Persistent consequences and resident influence

The validated effects remain in the isolated checkpoint, even though the operating town was untouched:

- **Five paid-work bookings**, of which two completed and three remained active with **six total wage credits held**. Held wages are not completed earnings.
- **Two produced supplies** from Halima's completed work, consuming two raw inputs. Supplier stock finished at eight because Amina had already collected two from the initial eight before production added two back.
- **One completed purchase**, with Ngozi retaining one food portion. Her two-credit payment split into one owner credit for Amina and one market-business credit. No meal was consumed.
- **Four completed journeys**: Amina, Zainab, Chris and Sadiq. Ibrahim, Grace and Ladi remained en route. These were resource/work journeys; the explanations did not establish visits to friends.
- **One completed rest**, Fatima's, and one unfinished rest, Maryam's.
- **83 newly retained memory IDs across fourteen residents**, covering validated activities and legitimately observed events. Existing bounded memory behaviour remained in force. No model decision changed a resident's authored biography or formal goals.
- **No contacts, relationship counters, friendship/trust states or social commitments changed** in the Muse branch. No new organisation, governance or other outcome was introduced.

There was economic interdependence without conversation: Ngozi's choice funded Amina and depleted the food later sought by Zainab; Halima's work replenished the supplier. Those are genuine validated cross-resident consequences. They are not independent social responses, negotiated partnerships or evidence that the model explicitly reasoned about the downstream effect on another person.

Money reconciles throughout: initial 155 resident credits + 400 business credits = **555**. At the stop, 158 resident credits + 391 business credits + six held wages = **555**. No escrow or unpaid transport reward existed. Goods also reconcile: initial nine goods + two produced = eight supplier + zero market + three resident goods; consumption was zero.

## Muse versus offline

Two comparisons were retained:

1. **Per-decision counterfactuals** used the same selected records before compact wire encoding. Thirteen actions matched exactly; six differed. Reasons and goal IDs were not used to inflate action differences.
2. **A separate offline town** advanced to the same 93 simulated seconds from the identical initial snapshot. It used fifty deterministic policy decisions, compared with nineteen model decisions in the Muse branch. Time was matched; decision frequency and inference cost were not.

| Invocation | Muse choice | Same-input offline choice |
| --- | --- | --- |
| 2, Amina | Travel to supplier herself | Send Musa a delivery-discussion request |
| 5, Fatima | Rest at home for 90 seconds | Travel to overlook |
| 12, Grace | Travel to Community Offices | Travel to market for food |
| 15, Maryam | Rest at home for 60 seconds | Travel to Community Offices |
| 18, Amina | Collect two supplies | Request delivery discussion with Musa |
| 19, Zainab | Buy one portion; rejected | Wait 20 seconds |

The full offline branch completed **eight paid jobs**, produced four supplies, consumed one meal and completed one Amina–Musa delivery of four goods with a two-credit payment. It ended with three goods at the market and recorded the corresponding successful-job relationship counters. Those outcomes were generated by existing scripted policies; they are not Muse results or evidence of independent model cooperation.

The Muse branch's Fatima ended with lower fatigue than its baseline counterpart (zero versus 0.73). Amina instead held supplies herself, and Grace chose a different priority. These are concrete differences. They do not establish general superiority or inferiority: scheduling/decision cadence, divergent state, short duration and this single sample confound such a conclusion. In this run the model did not exceed the offline branch's demonstrated social or delivery outcomes.

## Historical context and privacy

Every invocation included the resident's own biography and relevant granted neighbourhood facts through the bounded projection. Captured-input audits confirmed own-biography IDs, participant-only social records, legitimately known places, private dwellings limited to the actor's own, preserved constraints/jobs, and no undelivered recipient threads or unnotified replies.

No public explanation referred specifically to Unity Gardens' origins, unresolved concerns or social history as a reason for a new interaction. Fatima's explanation about being tired after a shift is consistent with her biography, but the same information was also present in her existing circumstances and current needs. **That is operator interpretation, not a demonstrated causal effect of the new history.** No live with/without-history ablation was performed.

This run adds no evidence about private invitation delivery, consent negotiation or multi-turn social conversations under live Muse, because none were chosen. Their offline contract tests remain implementation evidence only.

## Tokens, latency and accounting

| Measure | Observed |
| --- | ---: |
| Genuine generations | 19 |
| Accepted / rejected proposals | 18 / 1 |
| Participating residents | 16 |
| Reported input tokens | 74,469 |
| Reported output tokens | 7,158 |
| Unknown-usage invocations | 0 |
| Preflight range | 3,647–4,638 |
| Largest reported input / output | 4,495 / 706 |
| Provider-pipeline latency, minimum / median / maximum | 2.561 / 3.894 / 7.545 seconds |
| Mean provider-pipeline latency | 4.262 seconds |
| Sum provider-pipeline latency | 80.978 seconds |
| Estimated uncached-rate token cost | **$0.12350775** |
| Retained worst-case reservations for this run | **$0.355376** |
| Global cumulative reservations after run | **$0.689334** |

The cost estimate is 74,469 × $1.25/M + 7,158 × $4.25/M. It is not a provider invoice or verified credit-balance change; any cache discount is not assumed. Output usage is counted once, including provider-reported reasoning output. Reservations remain in full and are not refunded to the application allowance.

All 21 historical reservations remained byte-for-byte equivalent as ledger entries. Nineteen new reservations of 18,704 microdollars were appended, leaving forty entries total. November 1 reservations total $0.517416, leaving $49.482584 of daily application headroom and $99.310666 cumulative headroom under the approved temporary limits. Available headroom did not trigger more calls after the stop.

## Integrity and evidence

The post-run audit verifies unchanged .env, both operating saves, previous B/C approval files and original Phase C evidence; unchanged hashes for the 88 TypeScript source/test files and package manifests; preserved prior accounting; correctly matched session/plan counters; and both evaluation branches paused. No operating checkpoint, credential, repository name, source code or provider restriction was changed for execution.

Portable records:

- [All exact structured decisions and usage](7g-phase-d-decisions.json).
- [Live summary and integrity/accounting audit](7g-phase-d-live-summary.json).
- [Approved execution plan and preparation validation](milestone-7g-phase-d-plan.md).

Full local evidence is retained under output/society-7g/7g-d-society-20261101T175236Z: evidence.ndjson, report.json/report.md, analysis.json, integrity-audit.json, initial-world.json, both session checkpoints, readiness-before.json and protected-file fingerprints. The dated preflight audit, approval and exclusive claim remain in runtime. The claim and existing evidence prevent automatic rerunning or resumption.

## Assessment and next step

This run demonstrates actual Muse control of personal/economic choices across all sixteen residents, legitimate alternatives to scripted policy, authoritative rejection of an invalid transaction, and persistent completed work/rest/inventory consequences. It **does not demonstrate independently sustained multi-step social interaction, negotiated commitments, changed social relationships, improved Muse performance, or a causal benefit from historical context**.

Before requesting another live run, investigate purchase feasibility and local observation freshness offline, retaining the exact nineteenth input as a regression case. Distinguish an attending seller from positive stock, and capability-level permissions from actions known to be executable. Preserve uncertainty for remote/historical information, the model's freedom to choose alternatives, and strict authoritative validation. Do not enlarge budgets, force an invitation, weaken the rejection guard or add generations to obtain a preferred outcome. No repair or further live execution was performed in this task.
