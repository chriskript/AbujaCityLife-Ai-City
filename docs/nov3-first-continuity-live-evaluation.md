# November 3: first continuity live evaluation

Run **7g-continuity-20261103T084357Z**, fresh normal sixteen-resident Unity Gardens, separately approved after the 393-test baseline and focused regressions passed. [Exact decisions](7g-continuity-live-decisions.json), [summary](7g-continuity-live-summary.json), [continuity/recovery audit](7g-continuity-live-audit.json).

## Result and failure boundary

**56 attempts; 55 returned Muse decisions, all 55 accepted.** All sixteen residents participated. No ordinary action rejection occurred. The run stopped on a provider timeout at attempt 56 for **Halima**, request **society-7g-initial:decision-56**, with the pending request retained. It was not retried or resumed. No new decision or policy substitution occurred during the existing **60-second deterministic drain**, which advanced from 183s to **243s**. Both live and baseline branches ended paused. Wall duration: **596,310ms**.

The failed attempt lasted **30,035ms** with timeoutMs 30,000 and phase reserved. Neither preflightTokens, preflightLatencyMs nor generationStartedAfterMs was recorded. The count response had not returned, and there is no recorded generation dispatch. This establishes a client preflight timeout; it does not identify a provider root cause. No returned response or authoritative action exists for attempt 56. Its reservation remains; usage is conservatively reported as one unknown invocation. A fresh independent run is not a retry of this consequential request.

The approved ceilings remained **200 generations, $5 incremental, 8,000 input / 2,048 output, 30-second shared preflight/generation deadline, 1,800 simulated seconds, 90 wall minutes, six generations/minute and one pending inference**. The new execution window was 08:43:56.825–10:18:57.825 UTC on November 3 (09:43:56.825–11:18:57.825 Lagos). Full-run reservation **$3.7408** fit unchanged $50 daily/$100 cumulative allowances with the existing November 5 reversion. Current model/pricing documentation was checked before launch; key configuration was present and real access was established by the 55 returned invocations. No separate paid authentication probe was made.

## Actual autonomous behaviour

Every meaningful choice below was a returned live Muse decision. Movement, time, payments, production, consumption and delivery were deterministic execution of validated choices. No synthetic social interaction was inserted into the live branch.

- **Fatima and Maryam rested** for 60 and 45 seconds; both completed.
- **Zainab bought, ate, then bought a buffer meal.** Her explanation explicitly distinguished high hunger with carried food from low hunger with affordable available stock.
- **Amina placed two paid orders of two food units**, collected two local units, travelled back and stocked them. The second external delivery completed at 242s during deterministic drain, after inference stopped; it was an already paid order, not automatic refill or a new offline decision.
- **Zainab introduced herself to Tunde** at 134s. Tunde independently accepted and replied at 134.25s: “Nice to meet you Zainab! I'm Tunde, I run the repair workshop.”
- **Grace initiated an introduction to Amina** at 159.25s. Amina chose stocking instead of answering at 159.5s.
- **Zainab greeted Fatima** at 166.75s. Fatima explicitly chose purchasing ahead of the pending hello at 168.25s: hunger 0.51, no carried food and current available stock. This is an observed prioritisation, not an explicit refusal or an accepted conversation.
- **Tunde bought the last available unit** at 171s, explaining hunger and limited stock. Amina independently ordered again at 182s.

There were **three encounter invitations and one independent accepted reply**. Two invitations remained pending at the stop. No structured social invitations, joins, socialise turns, completed meetings, phone exchanges, transport commitments or relationship-counter changes occurred. The new run did not reproduce the earlier Grace–Maryam meeting. That is a valid autonomous outcome, not a failed script.

Work remained common: **25 paid jobs completed and paid 42 coins** by the end, including jobs finishing during drain. Grace ended at hunger 1, Ngozi 0.92 and Ibrahim 0.87. Five food purchases led to one consumption and four carried meals. Improved grounding did not guarantee adequate nutrition, and completion of meal-purchase goals must not be confused with actual eating. Amina did not repeat personal-food stocking mistakes, but the run ended before comparable later opportunities. No actual ordinary rejection occurred, so live post-rejection adaptation remains untested here.

## Conservation and baseline

Final supplier goods **16 = 8 initial + 10 produced − 2 collected**. Final market stock **2 = 1 initial + 4 imported + 2 stocked − 5 purchased**. Raw inputs **86 = 96 − 10 completed production**; no jobs or wages remained held after drain. Food purchases reconcile to **one consumed + four personally held**. External supply decreased **240 → 236**, with **four coins spent** on four delivered units. There was no resource reset, intervention, hidden import or currency creation.

Money: **188 resident balances + 363 business balances + 4 external payments = 555 initial**. Wages, purchases and owner revenue follow the existing rules; aggregate business funding remains finite. This is short-run execution evidence, not long-term sustainability.

The matching baseline ended at **243s**, including the same post-failure drain boundary. It produced **10**, consumed **5**, held supplier stock **12** and market stock **2**, completed **one transport delivery**, and retained another accepted commitment with **two coins escrowed**. It made no external orders. Its **177 resident + 376 business + 2 escrow = 555** reconciles. At the actual live decision points **24 returned actions matched** the equivalent offline proposal and **31 differed**. These counterfactual proposals are not executed histories, and the paused baseline's unfinished delivery is not a completed consequence. Neither comparison demonstrates general Muse superiority.

## Scoped event continuity and persistence

The audit checked **624 event IDs** and **17,572 repeated snapshot appearances**. Repeated event payloads matched, times and revisions were ordered, and all 56 request IDs were unique within this isolated run. Run ID plus local request ID distinguishes branches that share the normal initial-world namespace.

All 56 supplied inputs passed focused own-biography, legitimate-place, private-home, work-constraint, owner-offer/order, delivered-communication and resident-recovery scope audits. Received encounter turns were available to their participants. Subsequent choices could legitimately prioritise other goals; supplied information is not proof of causal influence. Explicit reason strings support the priorities described above, not hidden model reasoning.

A separate **paused offline copy** of the completed checkpoint restored gameplay, finances, inventories, social/communication state, memories, transcript, receipts, usage/reservation counts and Halima's interrupted request. No provider was called or live run resumed. Replaying an already completed request against a restored world returned unknown-request and applied no effects. The original checkpoint and ledger stayed unchanged. At run end all **19 protected files**, source files and prior reservations matched preflight; both branches were paused. The subsequent presentation-only fix occurred after this audit boundary and is not retroactively attributed to the run.

Evidence SHA-256: **7ff3587348fea6039145d1131c25a9ce029e3416e32a38027d9527be0443d1be**. Raw evidence/checkpoints remain in **output/society-7g/7g-continuity-20261103T084357Z/**; offline paused recovery copy is separate under output/recovery-audit-7g-continuity-20261103T084357Z/.

## Usage and limitations

Known usage: **291,180 input / 21,557 output tokens**, **$0.45559225 estimated**, plus **one unmeasured interrupted attempt**. At the verified standard [Meta rates](https://dev.meta.ai/docs/pricing-rate-limits), estimates assume $1.25/million input and $4.25/million output, without cache discounts. Known generation latency: min **2830ms**, median **5417ms**, mean **5773.49ms**, max **14683ms**. Maximum successful preflight/input/output: **6485/6342/1234**.

**56 retained reservations = $1.047424**. Ledger entries **299 → 355**, total retained reservations **$5.533670 → $6.581094**. This conservative ledger includes historical liabilities; it is not an invoice or measured spend. No generation-limit, budget, schema, action-validation or accounting failure stopped this run.

The timeout prevented meaningful sustained social progression. There is no basis to claim recovered failed decisions, completed Muse conversations, visits, friendship changes or long-run economic resilience from this run. Further evaluation needs a separate approval and fresh initial state, never resumption of Halima's interrupted request.

## Selected exact returned decisions

### 2: amina, 0.5s

```json
{
  "action": {
    "businessId": "market",
    "quantity": 2,
    "type": "order-external"
  },
  "goalId": "restock",
  "reason": "Stock need is high and I am at my market desk with coins, so ordering affordable supply now prioritizes avoiding empty stock over waiting."
}
```

### 5: fatima, 1.25s

```json
{
  "action": {
    "seconds": 60,
    "type": "rest"
  },
  "goalId": "personal",
  "reason": "At home and tired after a care shift, so resting now to recover before food or work."
}
```

### 12: maryam, 21.75s

```json
{
  "action": {
    "seconds": 45,
    "type": "rest"
  },
  "goalId": "personal",
  "reason": "At home with low hunger but moderate fatigue, so resting now keeps rest manageable before work or social time."
}
```

### 16: zainab, 43s

```json
{
  "action": {
    "quantity": 1,
    "type": "buy"
  },
  "goalId": "food",
  "reason": "Hunger is 0.8 with no food carried and market shows 1 unit available, so buying 1 now is the priority."
}
```

### 25: zainab, 79.75s

```json
{
  "action": {
    "quantity": 1,
    "type": "eat"
  },
  "goalId": "food",
  "reason": "Hunger is high at 0.88 and I already carry 1 food, so eating now is the priority."
}
```

### 31: amina, 103.75s

```json
{
  "action": {
    "quantity": 2,
    "type": "collect-self"
  },
  "goalId": "restock",
  "reason": "At supply desk with 10 units available and empty hands; collecting 2 keeps stall stocked over income rest for now."
}
```

### 32: zainab, 107.25s

```json
{
  "action": {
    "quantity": 1,
    "type": "buy"
  },
  "goalId": "food",
  "reason": "At market with 2 stock and coins for 2 units, carrying 0 food. Buying 1 builds buffer while hunger is low."
}
```

### 37: maryam, 128.25s

```json
{
  "action": {
    "quantity": 1,
    "type": "buy"
  },
  "goalId": "personal",
  "reason": "Hunger is rising while rest is low, so buying one available portion at market preserves savings for later work needs."
}
```

### 39: zainab, 134s

```json
{
  "action": {
    "message": "Hello! I'm Zainab, nice to meet you here at the market.",
    "purpose": "introduce",
    "recipient": "tunde",
    "type": "encounter"
  },
  "goalId": "errands",
  "reason": "Market stock is empty and hunger is low, so a brief hello fits errands and sociability."
}
```

### 40: tunde, 134.25s

```json
{
  "action": {
    "interactionId": "encounter-1",
    "message": "Nice to meet you Zainab! I'm Tunde, I run the repair workshop.",
    "response": "accept",
    "type": "respond-encounter"
  },
  "goalId": "personal",
  "reason": "Zainab introduced herself at the market; I will politely accept while food is unavailable and I wait."
}
```

### 46: grace, 159.25s

```json
{
  "action": {
    "message": "Hello, I'm Grace, a student living near Hill Garden. Nice to meet you!",
    "purpose": "introduce",
    "recipient": "amina",
    "type": "encounter"
  },
  "goalId": "personal",
  "reason": "Market stock is empty so I cannot buy food yet, so I will use the time for a brief neighbourly hello."
}
```

### 47: amina, 159.5s

```json
{
  "action": {
    "quantity": 2,
    "type": "stock-stall"
  },
  "goalId": "restock",
  "reason": "At market carrying 2 goods with stall empty and sales open; stocking now to serve customers."
}
```

### 50: zainab, 166.75s

```json
{
  "action": {
    "message": "Hello! I'm Zainab, nice to meet you here at the market.",
    "purpose": "introduce",
    "recipient": "fatima",
    "type": "encounter"
  },
  "goalId": "errands",
  "reason": "Hunger and fatigue low with food in hand, so a brief friendly hello fits errands and sociability."
}
```

### 51: fatima, 168.25s

```json
{
  "action": {
    "quantity": 1,
    "type": "buy"
  },
  "goalId": "personal",
  "reason": "Hunger is 0.51 with no food carried. Market has current stock and sales open, so buying one meal now takes priority over the pending hello."
}
```

### 52: tunde, 171s

```json
{
  "action": {
    "quantity": 1,
    "type": "buy"
  },
  "goalId": "personal",
  "reason": "Hunger is my highest need and market shows 1 food available; buying one now secures a meal before stock runs out."
}
```

### 55: amina, 182s

```json
{
  "action": {
    "businessId": "market",
    "quantity": 2,
    "type": "order-external"
  },
  "goalId": "restock",
  "reason": "Stall is empty with sales open at market; ordering 2 units now with coins on hand to restock."
}
```
