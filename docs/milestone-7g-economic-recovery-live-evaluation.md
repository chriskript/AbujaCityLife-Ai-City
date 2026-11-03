# Milestone 7G: live economic recovery evaluation

Run: **`7g-d-economy-20261102T143947Z`**, November 2, 2026. Profile: `7g-d-society` with the accepted economic continuity and ordinary-rejection recovery implementation.

**164 Muse decisions returned. Attempt 165 hit the existing 20-second client deadline after successful token preflight.** No retry or resumption occurred. The run continued through five ordinary world rejections, completed voluntary paid replenishment, and produced a short independent Zainab–Amina exchange with a later text follow-up. It did not demonstrate reliable avoidance of repeated mistakes, leisure socialising, social visits or relationship development.

## Execution and safeguards

The user explicitly approved this new run. Its approval is `runtime/approved-7g-economic-recovery-plan.json`; its exclusive claim is `runtime/society-7g-7g-d-economy-20261102T143947Z.claim`. A runtime copy of the existing execution entry point changes only the approval-file location and the corresponding relative inspector import. It uses the existing provider, coordinator, profile and execution rules. Neither the original Phase D approval nor its output directory was replaced or resumed.

| Bound | Approved / verified |
| --- | --- |
| Generations | Up to 200; 165 attempts, 164 returned decisions |
| Incremental ceiling | $5; retained reservations $3.086160 |
| Input / output | 8,000 / 2,048 tokens per invocation |
| Simulation / wall time | Up to 1,800 seconds / 90 minutes |
| Throttle | Six generations per wall minute; one pending inference |
| Residents | All sixteen eligible in the normal isolated town |
| Model | `muse-spark-1.3`, Standard, low reasoning, structured JSON, `store:false` |
| Retries / resumption | Zero / none |

Before dispatch, the read-only checks validated configuration, ledger headroom, absence of spending locks/pending accounting files, paused operating checkpoints, in-memory checkpoint compatibility, sixteen-resident fresh town construction, token ceilings, pricing and full-run reservations. Official [pricing](https://dev.meta.ai/docs/pricing-rate-limits) and [model availability/context documentation](https://dev.meta.ai/docs/models) were checked publicly: Standard Spark input $1.25/million, output $4.25/million; local limits fit its published context window. Worst-case reservation remained $0.018704/attempt and $3.740800 for all 200 attempts. No cache discount was assumed. Actual configured-key/model access was verified by the first bounded successful invocation, with no separate paid authentication probe.

The approved $50 daily/$100 cumulative temporary application allowances through November 4 remain unchanged. The existing November 5 Lagos-time reversion and provider restrictions remain in force. These ceilings were not spending targets.

Actual execution ran approximately **15:40:07–16:07:56 Lagos time**, with coordinator elapsed time **27 minutes 48.799 seconds**. Inference stopped at **676 simulated seconds**. The existing permitted deterministic drain advanced both branches another 60 simulated seconds, ending at **736 seconds**. It made no new policy decisions or model calls. Eight already booked jobs and one already chosen rest period completed during that drain; these are included in final totals below. Both checkpoints are paused.

## Residents and actual choices

Counts below are returned Muse decisions, including rejected proposals. Musa had one additional attempted invocation with no returned decision. Credits are simulated economic credits, separate from API spending. Final food is a subset of personal goods; no resident acquired transport rewards in this branch.

| Resident | Returned decisions | Observed choices | Credits, initial → final | Final personal food |
| --- | ---: | --- | ---: | ---: |
| Musa | 13 | Thirteen waits at the taxi stand; no transport commitment. His next inference timed out. | 10 → 10 | 0 |
| Amina | 15 | Four wholesale orders, two waits, two personal food purchases, five rejected stocking attempts, an encounter reply and a text follow-up. | 24 → 23 | 2 |
| Zainab | 14 | Travel, purchases, eating, a food-availability question, waiting for its answer, then paid errands work. | 6 → 4 | 0 |
| Chris | 9 | Travel to qualified repair work and eight work bookings. | 4 → 20 | 0 |
| Fatima | 9 | Three rest periods, travel to the market, waiting, purchases and meals; no care-work booking. | 14 → 8 | 1 |
| Tunde | 8 | Five repair bookings, travel toward the market and two waits. | 22 → 32 | 0 |
| Halima | 13 | Five production bookings, then market travel, waits, a purchase and a meal. | 12 → 20 | 0 |
| Ibrahim | 12 | Travel among known work/market locations, four work bookings and waits. | 3 → 10 | 0 |
| Yusuf | 6 | Six teaching-work bookings. | 9 → 21 | 0 |
| Ngozi | 9 | A purchase and meal, followed by seven funded market-work bookings. | 5 → 10 | 0 |
| Emeka | 8 | Eight electrical-work bookings. | 13 → 29 | 0 |
| Grace | 11 | Travel, a purchase, a meal and six errands-work bookings. | 2 → 6 | 0 |
| Ladi | 11 | Five errands-work bookings, travel including returning to their own home, rest and waiting. | 4 → 9 | 0 |
| Sadiq | 10 | Travel between known workplaces/market and six qualified work bookings. | 1 → 11 | 0 |
| Maryam | 9 | Travel, two errands bookings, a purchase and meal, and two rest periods at her own home. | 18 → 16 | 1 |
| Bisi | 7 | Seven tailoring-work bookings. | 8 → 22 | 0 |

All 164 exact structured decisions, public explanations, validations, token/latency metrics, preflight counts and same-input offline counterfactuals are in [the decision evidence](7g-economic-live-decisions.json). The failed attempt is represented with a null decision and its recorded timeout, not a fabricated choice.

## Voluntary replenishment and completed economic effects

Amina independently chose every import. No shortage-triggered system refill or player intervention ran.

| Muse invocation | Order time | Quantity / personal credits paid | Delivery time | Outcome |
| ---: | ---: | ---: | ---: | --- |
| 2 | 0.5 | 2 / 2 | 60.5 | Delivered |
| 30 | 121 | 6 / 6 | 181 | Delivered |
| 85 | 356.25 | 2 / 2 | 416.25 | Delivered |
| 132 | 528.75 | 2 / 2 | 588.75 | Delivered |

The exact first proposal was:

```json
{"action":{"businessId":"market","quantity":2,"type":"order-external"},"goalId":"restock","reason":"Stock is low at 1 with sales open, so ordering 2 to restock the stall."}
```

The decision file is authoritative for exact wording; the later examples below are also copied from recorded decisions. Twelve finite external food units entered stall stock after payment and delivery. Source availability fell from 240 to 228; no production inputs were imported. There were no pending wholesale orders at pause and no `fund-business` actions.

Across the branch:

- 73 funded work bookings completed and paid **119 credits** from existing business funds. Sixty-five completed before the provider interruption and eight during the deterministic drain.
- Eight production bookings converted 16 raw-input units into 16 supplies. Supplier stock rose from eight to its capacity of 24. No resident collected or transported that stock to the stall; there were no resident-to-resident transport proposals or commitments.
- Ten purchase actions transferred 13 food units from the market into personal inventories. Eleven units were paid retail purchases; Amina acquired two units from her own stall without a retail charge, under the existing ownership rule.
- Paying buyers transferred **22 credits**, split into 11 owner credits and 11 business credits. Funded market work subsequently used seven business credits.
- Eight eating actions permanently consumed nine food units. Four personal food units remained: Amina two, Fatima one and Maryam one. The market ended empty.
- Six rest periods completed, one during the drain. Returning to one's own home and travelling to paid work are not counted as social visits.

Conservation at final pause:

```text
Goods: 24 supplier + 0 market + 4 personal + 9 consumed
     = 9 initial + 16 produced + 12 delivered imports = 37
Inputs: 80 remaining + 16 used + 0 held = 96 initial
Money: 251 personal + 292 business + 0 held wages/escrow + 12 external payments
     = 555 initial credits
External source: 228 remaining + 12 ordered/delivered = 240
```

Imports maintained real opportunities to purchase but did not establish sustained food security. Ten residents ended with food need at least 0.9. Supply storage was full while retail stock was empty. Raw inputs, external supply and business budgets had not been exhausted: the bottleneck was resident choices and the flow from available resources to meals, rather than a global resource-creation failure.

## Ordinary rejection and subsequent independent reasoning

All five rejected proposals came from Amina. Each requested `stock-stall` quantity two while her own observation showed `inventory.goods:2` and `inventory.food:2`. The two units were personal food, so there were zero eligible stall supplies. Validation returned `missing-stall-supplies` every time. The proposals were not clamped, corrected or retried.

The audit verifies that every rejection changed only the appropriate learning/recovery state and evidence: money, inventories, resources, trade orders and tasks received no invalid effect. Amina's next request had a distinct identity and included her scoped failure record. Other residents continued making decisions.

| Rejected invocation / time | Next Amina invocation | Actual next choice |
| --- | ---: | --- |
| 72 / 297.5 | 85 | Paid wholesale order for two; accepted and later delivered |
| 92 / 378 | 99 | Independently answered Zainab's face-to-face question; accepted |
| 119 / 471 | 132 | Paid wholesale order for two; accepted and later delivered |
| 143 / 576 | 154 | Repeated the same invalid stocking action; rejected |
| 154 / 627.25 | None before interruption | Recovery record retained; no invented subsequent outcome |

Invocation 85's exact new decision was:

```json
{"action":{"businessId":"market","quantity":2,"type":"order-external"},"goalId":"restock","reason":"At market stall with zero current stock and sales open, ordering external supply restocks to serve customers."}
```

This establishes genuine new model decisions after failed actions and real consequences from accepted alternatives. It does **not** establish durable learning. The explanation above does not explicitly attribute the new choice to the rejection. More strongly, the later repeated invalid proposals were supplied earlier `Attempt failed: missing-stall-supplies` memories, as well as the unchanged two-goods/two-food inventory. Failed-attempt information was present; the repeated mistake cannot simply be attributed to its omission.

The resident-level repetition guard remained enabled and persisted. Its highest live streak was two; it never reached the three-failure cooldown threshold before the provider interruption. Valid intervening choices reset the active streak, and some identical failures were spread across wider time intervals. The live run therefore confirms continued rejection handling, but the three-failure cooldown itself remains demonstrated by offline regression tests rather than this live sample.

## Independent interaction: a question, an answer and a follow-up

The final audit found a meaningful exchange that the rolling progress summaries initially missed. Those interim statements about there being no conversation were incomplete; this section records the full evidence.

1. **Invocation 86, Zainab, time 356.5:** she independently initiated a nearby encounter with a legitimately known trader:

   ```json
   {"action":{"message":"Hello Amina, do you know when more food might arrive at the market?","purpose":"ask","recipient":"amina","type":"encounter"},"goalId":"food","reason":"Market stock is currently zero so asking familiar trader Amina for information."}
   ```

2. **Invocation 95, Zainab, time 380.25:** she chose to wait for 30 seconds. Her public explanation explicitly referenced the social situation: **“Market stock is zero and my question to Amina is pending, so waiting briefly for information.”** This is direct evidence that an actual prior interaction informed a subsequent model choice.

3. **Invocation 99, Amina, time 398.25:** Amina independently accepted the discussion and answered using her own paid pending order:

   ```json
   {"action":{"interactionId":"encounter-1","message":"Hello Zainab, I have 2 portions ordered and due to arrive soon. Please wait a little. Thank you.","response":"accept","type":"respond-encounter"},"goalId":"serve","reason":"Answering Zainab's waiting question about incoming food while wholesale order is pending delivery."}
   ```

4. The paid order delivered at **416.25**. **Invocation 109, Amina, time 438.75:** she independently texted Zainab through an existing legitimate contact:

   ```json
   {"action":{"channel":"text","memoryId":null,"message":"Hello Zainab, the 2 portions have now arrived at my stall. Please come to buy. Thank you.","purpose":"chat","recipient":"zainab","type":"communicate"},"goalId":"serve","reason":"Wholesale delivery arrived and stall shows 2 goods, so updating waiting Zainab nearby."}
   ```

5. **Invocation 110, Zainab, time 441.5:** she could see two portions but had zero coins. She chose to travel to the community office to earn money. This occurred **before** the text delivered at 443.75. Her later requests contained the delivered text, but she chose paid errands work and never sent a structured phone response before pause.

This is a short, independently initiated reciprocal information exchange followed by a voluntary cross-channel update. It connects a real shortage, an existing acquaintance, private owner knowledge voluntarily reported through speech, a validated delivery and later financial priorities. It was not seeded by a fixture or operator instruction. It did not reserve a meal, create a transport agreement or guarantee that Zainab would purchase the newly arrived portions.

The text remained unanswered and pending at time 736; its existing deadline was 738.75. Do not describe it as expired or as a refusal. No structured social invitations, accepted rendezvous, social visits, `socialise` actions, leisure calls or explicit refusals occurred. No new contact numbers or relationship counters were acquired. A conversation did not automatically grant trust or friendship.

## Muse decisions versus deterministic mechanics and offline baseline

There were **zero routine-policy decisions in the Muse branch**. Meaningful travel destinations, job bookings, purchases, meals, rest, wholesale orders, the encounter and its reply, and the text were proposed by actual Muse responses. Navigation, timers, posted-job execution, payments, production, delivery and consumption followed deterministic authoritative mechanics. The post-interruption drain ran no `decide()` calls. Synthetic regression/procurement fixtures were not used in this branch.

The coordinator also ran the existing offline policy from the same fresh world for the same simulated time. It made **306 offline policy decisions**, with no policy decisions in either branch during the final drain. It is time-matched, not decision-count- or inference-budget-matched.

| Final outcome, time 736 | Muse branch | Offline baseline |
| --- | ---: | ---: |
| Locally produced supplies | 16 | 24 |
| Raw inputs remaining | 80 | 72 |
| Imported food | 12 | 0 |
| Food consumed | 9 | 19 |
| Supplier stock | 24 | 14 |
| Market stock | 0 | 0 |
| Personal credits | 251 | 209 |
| Business credits | 292 | 346 |
| External payments | 12 | 0 |
| Completed resident transport tasks | 0 | 3 |
| Declined transport tasks | 0 | 1 |
| Residents with food need ≥0.9 | 10 | 0 |

The normal offline policy does not implement discretionary wholesale ordering, so the import difference shows actual model use of a newly available option, not a controlled proof of superior reasoning. Offline transport cooperation remains scripted-policy evidence, not independent Muse reasoning. On identical selected decision inputs, **49 returned Muse actions matched the offline action exactly; 115 differed**. For interrupted attempt 165 only an offline counterfactual exists; there is no Muse choice to compare.

The food and fatigue outcomes are material limitations. For example, invocation 161 supplied Emeka food need 1, rest need 1 and income need 0. He still selected funded electrical work, publicly explaining that it kept service dependable. Several others similarly continued work with high supplied needs. These were valid autonomous choices, but the run does not show dependable balancing of personal care, income and social life. Different decision cadence and lack of a controlled ablation prevent a general causal performance ranking from aggregate results alone.

## Tokens, latency and cost

| Measurement | Recorded result |
| --- | ---: |
| Successful/returned responses | 164 |
| Additional interrupted generation request | 1 |
| Token preflight requests / generation HTTP attempts | 165 / 165 |
| Reported input tokens, known responses | 768,349 |
| Reported output tokens, known responses | 66,789 |
| Known uncached-price estimate | **$1.24428950** |
| Unknown-usage attempts | **1** |
| New retained reservations | **$3.086160**, 165 × $0.018704 |
| Full reservation retained for failed attempt | $0.018704 |
| Total ledger reservations after run | 205 entries, **$3.775494** including prior history |
| Preflight token range | 3,901–5,807, below 8,000 |
| Largest reported input / output | 5,664 / 1,367 |
| Known provider pipeline latency, min / median / mean / max | 2,789 / 4,590.5 / 4,908.1 / 10,049 ms |
| Sum of known provider pipeline latency | 804,928 ms |
| Failed attempt latency | 20,033 ms |

The known cost is a token-based estimate, not an invoice or a checked credit balance. No cache discount is assumed. The failed request may have produced output at the provider even though the client received none; its usage and bill are unknown. It was not retried or refunded. Adding its full retained per-attempt reservation to the known uncached estimate gives a conservative exposure estimate of **$1.26299350**, while the application continues to retain the larger $3.086160 reservation total. Do not report $1.24428950 as a fully reconciled total bill.

The failure was **not** an 8,000-token ceiling breach. Attempt 165 had already counted 4,465 input tokens and was awaiting generation when the shared 20-second deadline aborted the operation. No HTTP error status or provider-side cause was established. Musa's exact request `society-7g-initial:decision-165` remains in `interruptedDecisions` for review, without a fabricated decision or offline replacement. Neither the 200-generation, $5, 1,800-second nor 90-minute maximum was exhausted.

## Persistence, privacy and integrity audit

The [portable summary](7g-economic-live-summary.json), isolated `analysis.json` and `integrity-audit.json` record the checks. All passed:

- Operating and headless checkpoints, credential configuration, original Phase D approval/report/evidence, and earlier protected evidence retain their preflight hashes.
- All 93 tracked TypeScript source/test/script files and both package manifests retain their preflight hashes. No implementation was changed during the live run.
- The original 40 ledger entries are unchanged; exactly 165 correctly sized reservations were appended. Session request count, plan usage and internal reservation totals agree.
- Both isolated branches are paused. The new exclusive claim remains in place. No retry, restart or resumption took place.
- Every invocation's request identity is unique. All five rejected actions were financially/inventory atomic.
- Scoped-input audits preserve own biographies, legitimately known places, own private dwelling, delivered communications, participant-only invitations, own business offers/orders, local-only external stock quotes, own failure records, job grounding and action constraints.
- Social histories, residents, layouts and existing contacts were preserved. This run created real memories/events; it did not manufacture pre-simulation history.

Complete exact wire inputs, per-invocation instructions and schemas, raw outputs, validation events, before/after worlds and accounting remain under `output/society-7g/7g-d-economy-20261102T143947Z/`. The new preflight is `runtime/7g-d-economy-20261102T143947Z-preflight.json`.

## What is demonstrated and what remains open

Demonstrated: real Muse decisions can initiate paid finite replenishment; completed imports can enable purchases and consumption; ordinary mistakes can be rejected without invalid transfers or global termination; fresh model decisions can follow failures; and a resident can independently ask another resident a relevant question, wait for the answer, receive an independently generated answer and later be sent an update after a validated economic event.

Not demonstrated: durable learning from repeated rejection, a completed reciprocal response to the follow-up text, resident-to-resident delivery commitments, friendship or relationship growth, consented social visits, non-economic socialisation, consistently balanced personal needs, or indefinite economic sustainability. The supplied Unity Gardens context was available, but no live ablation establishes that authored neighbourhood history improved reasoning. The strongest explicit context links here are current stock, existing familiarity, a pending question, an owner's actual order and the recipient's finances.

The next useful step is **offline investigation**, rather than more generations or higher spending: clarify derived restockable quantity and the specific reason personal food cannot stock the stall; inspect repeated-failure feedback and need-urgency grounding; and examine why voluntary social and personal-care alternatives were rarely selected. Preserve valid refusals, solitude and occupational choices rather than forcing sociability or care outcomes. The timeout may merit a separately reviewed reliability investigation, but this run provides no basis to silently extend deadlines, retry the unknown request or resume its checkpoint.

No commit, push or deployment occurred.
