# Economic continuity and resilient decisions

Prepared on November 2, 2026 (Lagos). No live Meta calls are authorised by this preparation. The previous Phase D run and its evidence remain unchanged.

## What happened to Zainab

The recorded run `7g-d-society-20261101T175236Z`, request `society-7g-initial:decision-19`, supplies the evidence. At simulation time 93, Zainab was at the market with six credits, no personal food and food need 0.88. She knew that the market sold food, had an observation of **zero stock at time 30.25**, and had no subsequent positive stock evidence. The observation labelled both that stock and open sales historical. Seller attendance was true; it did not imply stock. Her proposal was:

```json
{"action":{"quantity":1,"type":"buy"},"goalId":"food","reason":"Hungry at Market Square with coins available, trying to buy food to eat."}
```

Ngozi had bought the last unit at time 30.25. Actual market stock was still zero at execution, and validation event `event-212` rejected the action as `insufficient-stock`. No purchase, debit or inventory transfer occurred. There was **no observation-to-execution stock race**. This was a model proposal inconsistent with its last known stock, combined with unnecessarily historical labelling of unchanged stock that remained physically visible. The brief public explanation does not establish why the model chose it; no private reasoning is inferred.

The same-input offline counterfactual was `wait` for 20 seconds: “Wait for observed stock or an available vendor before reconsidering food.” The [portable regression fixture](../tests/fixtures/phase-d-purchase.json) retains the relevant original facts and exact decisions, without the entire private world. Full original evidence remains in the isolated run directory; the [Phase D report](milestone-7g-phase-d-live-evaluation.md) remains the historical account.

## Observation and recovery changes

Physically present, stationary residents now receive current market/supplier stock and current market opening information when observing those public counters. These read-time evidence IDs belong to the scoped observation; they do not fabricate historical events or become shareable memory IDs. Before dispatch, normal perception updates changed locally visible quantities in the resident's retained knowledge. Remote observations still use legitimately acquired historical evidence, or unknown values. Nothing queries another resident's private inventory.

`town.purchase` explicitly distinguishes a locally checked one-unit purchase opportunity from unknown remote availability. Open sales, seller attendance, capability and quantity bounds remain distinct from purchase feasibility. Validation still rechecks the real requested quantity, stock, location, seller and affordability. Purchases competing for the same unit cannot both debit or receive it. Conversation grounding accepts only stock/open evidence IDs actually supplied in the resident's observation.

An explicit allowlist classifies ordinary world rejections, including shortages, affordability, unavailable work, changed actor state, ordinary location/skill mistakes, expired offers, occupied communication channels and unavailable social partners. Unknown reasons fail closed. Malformed proposals, unknown goals/identities, private venue/access violations, provider errors, invalid accounting and persistence failures retain safe-stop handling.

For an ordinary rejection:

1. The original proposal is recorded and rejected; no invalid transactional effects or new intention are applied.
2. A world-authored `action-rejected` outcome memory is delivered **only to the actor**, with the actual reason. A small versioned recovery record retains the last attempt even if bounded memories later rotate.
3. The actor receives an `action-rejected` trigger. A later request obtains a fresh observation and a new monotonically increasing identity, subject to existing time/throttle/reservation limits. It is a new reasoning opportunity, not a resubmission, correction or clamped proposal.
4. The Phase D coordinator continues for allowlisted world rejections, preserving every rejected proposal and its cost in evidence. It stops for other validation rejections. Earlier evaluation profiles retain their stop-on-rejection contract.
5. Three identical action/reason failures within 120 simulated seconds impose a 120-second inference cooldown on that resident. Fingerprints sort action keys, so JSON key order cannot bypass this guard. The guard persists through restore. Other residents and world mechanics continue. A valid new choice clears the active guard; retained outcome memories remain.

The guard applies to inference scheduling, never to automatic transaction execution. A resident can reconsider after the cooldown; the run's independent generation/spending/time ceilings still bound total activity. No action is automatically retried, and no expected Muse decision falls through to an offline policy. Provider interruptions continue to retain the pending decision for review rather than silently resuming inference.

## Economy assessment

The existing town begins with nine goods, 96 raw-input units and 555 total credits. Production reserves two raw inputs and a two-credit wage at a qualified, funded supply job, then deposits two goods and pays the held wage on completion. Supplier storage and work slots constrain production. Collection, physical transport and stall stocking transfer existing goods; stocking creates no goods. Purchases convert stall stock into personal food, with two credits per unit split between the owner and business. The market owner pays no retail charge for their own stock. Eating permanently consumes goods. Rest and ordinary work timers create neither currency nor goods.

Previously there was no input import, food import, external income, supplier sales income or automatic business funding. Wage budgets redistribute finite initial money; production consumes finite inputs. The unchanged offline policy can become stuck waiting for meals even while funded production remains possible. Empty local stocks, unavailable workers, exhausted input/budget and lack of customer cash are distinct failure modes.

## Minimal additional economic choices

Only two economic actions were added:

| Action | Authorisation and effect |
| --- | --- |
| `order-external` | An eligible business owner, physically at its desk, pays from their personal wallet for a finite external wholesale order. Market orders deliver food into stall stock; supply-desk orders deliver production inputs into raw-input stock. |
| `fund-business` | Any existing business owner optionally transfers 1–6 of their own credits into their own business account. This creates no money and does not book work or require anyone to accept it. |

Wholesale terms are explicit: **1 credit/unit, 1–6 units/order, 60-second delivery, one pending order per business, 120 seconds between orders for the same business, and 240 units of total external supply shared by the two products**. New orders require available funds and source stock. Food orders check space against 24 units at ordering; input orders check the 96-unit input-storage threshold. These checks do not reserve or cap unrelated legacy local transfers. Ordered goods are reserved outside the town and only enter local inventory when the paid delivery completes. No new building or simulated supplier resident was added.

Owner observations include their authorised business account, contract terms and pending orders. Current source quotes and input quantities are supplied only at the corresponding desk; remote values are null. Non-owners receive no offers, orders or account balances. Model action schemas restrict business IDs to the actor's own offered businesses. A business with no wholesale product can be funded but cannot order imports. Terms describe possibilities, not an instruction to reorder. Existing local supply collection, paid transport, communication and social visits remain available independently.

The existing player-control action endpoint accepts these economic actions with the same ownership, capability, location, affordability and transaction checks; there is no unlimited inventory or special player funding. No operator refill control or new UI was introduced.

Accounting checks enforce:

```text
local goods + consumed = initial goods + locally produced + delivered imported food
raw inputs + used inputs + inputs held for work = initial inputs + delivered imported inputs
personal + business + held wages + transport escrow + external payments = initial local money
external units remaining + paid units reserved or delivered = 240
```

Pending orders retain their paid cost, quantity, owner, destination business, order ID and delivery deadline. Payment, delivery and subsequent consumption are separate events. Supply exhaustion or insufficient money rejects a new order; it never replenishes the source. There is no external revenue stream, so imports ultimately reduce local purchasing power. Owner funding recirculates existing money; it is not indefinite financing. This is a bounded viable replenishment path, **not an indefinitely self-sustaining economy or unlimited abundance**.

## Compatibility and evidence

The world retains version 4 with optional, separately versioned `trade.version:1` and per-resident `decisionRecovery.version:1` extensions. New towns and restored town checkpoints receive an empty trade ledger and owner capabilities idempotently. Migration adds no local goods, money, orders, historical transactions, acquaintances or memories. Existing inventories, balances, work bookings, commitments, homes, biographies and communications remain intact. Existing trade/recovery records are validated before use and retained; corrupt goods, money, inputs or order accounting fail closed. Repeated restoration never reserves or delivers the same order twice. The original persistent town files are not opened for writing by tests or rehearsals.

The evaluation report now includes trade and recovery deltas, explicit ordinary-rejection records, and final trade/recovery state alongside exact scoped inputs, decisions, validation events, tokens, costs and the offline baseline. Only accepted transport actions count toward model-proposed/accepted completed deliveries.

## Offline endurance

The reproducible command is `npx tsx scripts/economic-endurance.ts`. It uses two isolated sixteen-resident towns for **3,600 simulated seconds each**, a bounded 4,096-decision test allowance, and the existing 20-second per-resident/48-per-minute offline scheduler. Neither branch reached that test allowance. Samples every five minutes include assets, inputs, hunger and funding; authoritative snapshot/conservation checks run throughout. A final restore verifies pending/delivered trade state continuity. No ledger, credentials or live provider adapter is imported.

See [machine-readable endurance results](economic-endurance-results.json). One branch uses the unchanged offline town policy. The other is explicitly labelled `explicit-procurement-stress-fixture`: it exercises optional paid food imports using locally available owner knowledge. It is not a production fallback, a prescribed Muse policy or evidence of model intelligence. Shortages are counted rather than repaired for the test.

The final runs, reproduced with the completed implementation, found:

| One-hour result | Existing offline policy | Procurement mechanics fixture |
| --- | ---: | ---: |
| Decisions | 1,858 | 1,618 |
| Market-empty seconds | 2,543.75 | 409 |
| Food consumed | 83 | 103 |
| Locally produced goods | 74 | 54 |
| Imported food / external spend | 0 / 0 credits | 60 / 60 credits |
| Ending market / supplier stock | 0 / 0 | 5 / 12 |
| Ending raw inputs | 22 | 42 |
| Residents with food need ≥0.9 | 10 | 0 |

This demonstrates finite-resource mechanical capacity over the measured hour and a concrete policy bottleneck. It does not prove indefinite sustainability, equitable access, Muse adaptation or successful social negotiation. Raw-input import, source exhaustion, pending-delivery recovery, unaffordable orders and optional business funding are separately covered by regression tests. All 240 external units can be exhausted through real paid orders; restoration does not reset the source.

## Validation results

The final full suite passed **376/376 tests across 26 files**, including communication, social visits, employment grounding, persistence, provider/accounting failure safeguards and the new economic recovery regressions. TypeScript checks and the production build passed. Vite retains the existing advisory for the 603.59 kB routes chunk. `git diff --check` passed. See the [validation summary](economic-validation-results.json).

The synthetic 36-generation coordinator test continued after an unavailable-stock rejection, supplied the affected actor a new request with its own failure memory, and accepted a separately generated wholesale choice. It made zero network calls and used zero routine-policy decisions in the Muse branch. This proves the recovery contract and authoritative consequences; its responses are explicitly synthetic, so actual Muse adaptation remains unproven.

The [read-only integrity and headroom audit](economic-preparation-integrity.json) confirms unchanged operating/headless checkpoints, credential configuration, Phase C/D evidence and all **40 reservations totalling $0.689334**. The current $50/$100 temporary allowances are unchanged and the full next-run reservation fits. Its legacy `matchesPriorSuccessfulConfiguration:false` field compares the whole environment file with the older Phase B configuration; the separately checked Phase D configuration hash is unchanged. Live authentication/model access were deliberately not probed. No live call, commit, push or deployment occurred.

## Recommended next live evaluation — approval required

Retain the existing `7g-d-society` envelope: **up to 200 generations, $5 incremental, 8,000 input/2,048 output tokens, 1,800 simulated seconds, 90 wall minutes, six generations/minute and one pending inference**. All sixteen residents remain eligible. Use a new unique approval/claim and evidence directory; do not resume the completed November 1 run or alter the operating saves. The [review-only plan template](economic-recovery-plan.example.json) is not an execution approval.

At the [official Standard Muse Spark rates](https://dev.meta.ai/docs/pricing-rate-limits), rechecked publicly on November 2, input is $1.25/million and output $4.25/million. Worst case remains $0.018704 per attempt and **$3.740800 for 200 attempts**, below the $5 run ceiling. No cache discount is assumed. The [model context window](https://dev.meta.ai/docs/models) supports the retained local limits. No provider API request was used to check pricing. Keep the approved $50 daily/$100 cumulative temporary internal allowances through November 4; existing Lagos-time November 5 reversion, historical reservations, provider restrictions and recovery controls remain unchanged.

Immediately before execution, recheck official pricing, model availability, configured-key eligibility, exact token ceilings, full reservations and actual ledger headroom; hash operating checkpoints, prior evidence and credential configuration; verify the exclusive claim, isolated output directory and finite execution window. Stop on incompatible settings. No standalone paid authentication probe or hidden retry is necessary. The first bounded provider response must validate model/access/usage as before. Token preflight remains authoritative; character size is not a verified token count.

Choose the reviewed execution window so it ends before the November 5 Lagos-time allowance reversion. If approval or execution occurs later, reassess headroom under the then-effective ceilings rather than silently retaining the temporary limits.

Record each failed attempt, its audience and cost, the next fresh decision ID, the information added, and any independent change of plan. Look for shortage recognition, voluntary wholesale orders/local restocking, genuine delivered requests and independent replies, consented visits, conversations beyond invitations, completed commitments, subsequent decisions and lasting economic/relationship consequences. Compare exact same-input offline choices and a separate time-matched normal offline branch. Different decision cadence prevents causal performance claims from aggregate counts alone. Explicit public reasons and operator interpretation must remain separate.

An ordinary rejected action is evidence to continue from, not a success or a failure of execution integrity. A provider, malformed-output, privacy, accounting, persistence or unclassified validation failure still stops inference. No additional calls, automatic resumption, budget extension or scripted cooperation are authorised by this document.
