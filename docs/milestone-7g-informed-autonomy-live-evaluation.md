# Milestone 7G: informed-autonomy live evaluation

Run **7g-informed-20261103T054118Z**, November 3, 2026 (Lagos). Fresh isolated normal sixteen-resident Unity Gardens; no seeded interactions, operating-save changes, automatic retries, resumption, or offline substitution for expected Muse decisions. This is a new execution approval and claim, not a continuation of the interrupted November 2 request.

## Result

**94 Muse responses: 93 validated actions and one rejected proposal.** All sixteen residents participated. The run stopped safely after **246.25 simulated seconds** and **17m 1.887s wall time**, before the approved ceilings. There were no provider failures, unknown-usage generations, ordinary recoverable rejections, or post-stop deterministic drain. Both branches are paused.

Residents made personal-need choices, completed paid work and food transactions, independently exchanged information, introduced themselves, and accepted and joined one public-place social meeting. The meeting had not completed, and no structured social conversation turn or relationship-counter change occurred before the stop. These are observed choices and consequences, not a claim of improved general reasoning.

## Approval, preflight and spending

The approved profile retained 200 generations, $5 incremental ceiling, 8,000 input / 2,048 output tokens, 30-second shared count-and-generation deadline, 1,800 simulated seconds, 90 wall minutes, six generations/minute and one pending inference. All sixteen residents were eligible. No limits were silently changed.

Official [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits) and [model documentation](https://dev.meta.ai/docs/models) were reviewed before execution: Muse Spark 1.3 standard input $1.25/million and output $4.25/million. No cached-input discount was assumed. The published context capacity supports the local token bounds. Full-run worst-case reservation was **200 × $0.018704 = $3.7408**, below $5. Provider access configuration was checked without a separate paid generation; all 94 real invocations succeeded at the provider.

The $50 daily / $100 cumulative temporary internal allowances through November 4 and existing November 5 Lagos reversion remain unchanged, along with provider limits. Prior ledger reservations were $3.775494 across 205 entries. This run retained **$1.758176** across 94 new entries; final ledger is **299 entries / $5.533670 reserved**. Reservations are conservative retained liabilities, distinct from measured usage estimates. Historical records were preserved.

Fresh approval window: November 3, **05:41:17.240–07:16:18.240 UTC** (06:41:17.240–08:16:18.240 Lagos). The execution completed within it. The exclusive one-shot claim remains in place. Operating checkpoints were paused, hash-checked and restored in memory before execution, with no operating save mutation.

## Why execution stopped

At decision 94 Sadiq had hunger 0.82, income need 1, one coin, no food and no eligible work at the Community Offices. He attempted to ask nearby Grace for food/work advice using encounter purpose **request-help**. He knew only Tunde; Grace was visible nearby but not an already acquired identity/contact. The action target ID does not imply prior acquaintance.

The authoritative encounter guard reserves request-help for an initiator with **propose-transport** capability. Sadiq lacks it, so validation rejected **missing-assistance-capability**, event-871 / request society-7g-initial:decision-94. Generic advice could use the existing **ask** purpose; introduction could use **introduce**. This exposes an action-purpose grounding mismatch, not evidence of provider failure or corrupted state.

This guard is outside the ordinary-rejection allowlist. The existing fail-closed coordinator therefore stopped. The proposal applied **no inventory, financial, task, communication, social, recovery or resident effects** and was never delivered to Grace. There was no fresh recovery decision, automatic correction, capability grant, retry or resumption. Ordinary rejection recovery was not exercised in this run.

Before another run, review encounter-purpose descriptions and capability grounding offline, particularly generic advice versus transport assistance. Preserve the guard; do not reinterpret this rejected proposal as accepted help. No such code change was made during this evaluation.

## Personal needs and changing plans

The actual supplied decisionContext included need direction and values, executor consequences, food held versus sale inventory, relevant observed stock and freshness, affordability, rest options, current work eligibility/funding, commitments and optional social actions. Context was scoped to each resident; it did not direct fixed survival or social choices.

Fatima independently rested for 65 seconds at home (decision 5); Maryam rested for 45 seconds (15). Both rests completed. Ngozi, Grace and Fatima each ate once, and Zainab ate twice: **five completed food consumptions**. Their recorded reasons explicitly distinguished carried food from unavailable market stock. Zainab later travelled toward office work after eating, explaining that waiting at an empty market no longer helped.

Work still dominated many choices: **39 take-work decisions**, of which 30 completed by the stop and nine remained active. Ibrahim's decision 90 explicitly chose funded supply work before buying food despite hunger; Halima's decision 93 likewise chose a shift before food/rest. This preserves their freedom to make risky priorities. At the stop Ibrahim's hunger was 0.87, Sadiq's 0.82 and Bisi's 0.77. Accurate context did not guarantee prudent choices or adequate nutrition.

Amina correctly collected two local supply units, returned and stocked them, then collected two more. There were **no rejected personal-food stocking proposals**. However she had not acquired personal food in this shorter run, and the prior run's first such mistake occurred later than this run's stop. This does not prove learning or elimination of the previous failure pattern. No post-rejection strategy adaptation can be claimed here.

| Resident | Generations | Final hunger | Final fatigue | Coins | Final activity |
|---|---:|---:|---:|---|---|
| musa | 6 | 0.32 | 0.42 | 10 → 14 | work |
| amina | 11 | 0.32 | 0.26 | 24 → 27 | idle |
| zainab | 10 | 0.08 | 0.3 | 6 → 2 | travel |
| chris | 5 | 0.32 | 0.42 | 4 → 10 | work |
| fatima | 7 | 0.08 | 0.24 | 14 → 12 | travel |
| tunde | 4 | 0.52 | 0.47 | 22 → 30 | idle |
| halima | 6 | 0.72 | 0.52 | 12 → 22 | work |
| ibrahim | 5 | 0.87 | 0.57 | 3 → 9 | work |
| yusuf | 3 | 0.62 | 0.57 | 9 → 13 | work |
| ngozi | 5 | 0.32 | 0.43 | 5 → 5 | work |
| emeka | 3 | 0.72 | 0.67 | 13 → 17 | work |
| grace | 8 | 0.24 | 0.45 | 2 → 0 | idle |
| ladi | 5 | 0.57 | 0.62 | 4 → 7 | work |
| sadiq | 6 | 0.82 | 0.44 | 1 → 1 | idle |
| maryam | 7 | 0.52 | 0.2 | 18 → 18 | idle |
| bisi | 3 | 0.77 | 0.52 | 8 → 12 | work |

Need scale is 0 satisfied to 1 maximum unmet need. All identities, capabilities and starting circumstances came from the normal town. Idle residents can have accepted intentions or social commitments; the activity column alone is not a measure of inactivity.

## Independent interactions and consent

1. **Zainab → Amina:** food availability question at 49.5s; Amina independently replied at 60.25s that a wholesale delivery was due. It arrived at 60.5s. Zainab subsequently bought food, but the model's causal reliance on the reply is not independently established.
2. **Amina → Zainab:** a text sent at 80.75s announced food was available; it arrived at 85.75s after Grace bought the last unit at 83.75s. Zainab independently replied at 118.75s that the stall was empty and she would check back. The reply became available at 123.75s. Amina's collection at 120.75s preceded that reply, so it cannot be credited to receiving it. This demonstrates realistic stale information and a response, not remote stock omniscience.
3. **Zainab → Fatima:** introduction at 139.5s; Fatima independently accepted and replied at 156.75s. Their messages referred to waiting at the market. Mutual identity knowledge must not be conflated with new phone access or trust.
4. **Grace → Maryam:** introduction at 184.5s; Maryam independently replied at 194.75s. Grace then invited her to spend 60 seconds together at the public Community Offices at 208.75s. Maryam independently accepted at 214.75s. Grace joined at 228.75s and Maryam at 235.75s; both were already there. The accepted rendezvous records both joined and present, metAt 235.75, lastSpeaker null.

The last sequence is a model-driven multi-step social initiation, recipient response and mutual participation. It is an **on-site public meeting**, not a home visit or completed journey. Its selected shared time would end at 295.75s, after the stop. No socialise turn, completed hangout, withdrawal, refusal, alternative meeting, home access, new phone number or relationship-counter change was recorded. Introductions created scoped acquaintance knowledge without granting phone numbers or trust. Sadiq's final rejected message was not a fourth delivered encounter.

These short message exchanges and accepted rendezvous are genuine live interactions. They do not yet demonstrate sustained conversation, durable friendship or completed multi-stage personal commitments.

## Economic consequences and conservation

Amina ordered **two external food units for two coins** at 0.5s, delivered at 60.5s. The finite external source fell from 240 to 238. Five purchases sold five food units for ten coins: the original market unit, two imported units, and two locally collected/stored units. Five food consumptions completed. No stock reset, hidden import or player intervention occurred.

Halima/Ibrahim's completed work produced **16 local units**. Supplier inventory ended at 20: **8 initial + 16 produced − 4 self-collected = 20**. Of the four self-collected units, two were stocked and sold; Amina retained two at the market when stopped, with stocking still a future choice. Market stock was zero. Local supply existed, but availability at the point of sale remained intermittent.

Raw inputs: **96 initial = 76 available + 16 consumed by completed production + 4 held by two active production jobs**. Do not treat held inputs as already consumed or future output as completed. Thirty completed jobs paid **51 coins**; nine active jobs held **15 coins** in wages. No transport commitments were created or completed in this branch.

Money reconciles: **199 resident balances + 339 business balances + 15 held wages + 2 paid externally = 555 initial**. No external-money creation occurred. This short run demonstrates bounded replenishment and payment execution, not long-term sustainability. Wage-funded businesses remain finite; the imported source and production inputs remain exhaustible. Grace ended with zero coins and Sadiq with one, illustrating unequal access despite aggregate income growth.

## Offline comparison and limits on attribution

The independent deterministic baseline began from the same initial town and stopped at **246.25s**, matching live simulated time. It made no Meta calls. Baseline totals: **12 produced**, **8 consumed**, supplier **8**, market **5**, no external orders, resident balances **179**, business balances **366**, held wages **10**, and **two delivered transport tasks**. Its ledger also reconciles to 555. Muse produced more local output and external restocking, but had fewer consumptions and an empty market. This is behavioural divergence, not uniformly better economic performance.

At actual live decision points, **32 actions matched** the equivalent offline proposal and **61 differed**; **one social-invitation response had no equivalent offline policy**. That unsupported response is not evidence of superior reasoning. Counterfactual proposals are not executed parallel histories. The independently evolved baseline is the actual outcome comparison.

All meaningful live decisions were Muse responses; deterministic policies executed accepted movement, timers, consumption, payment, production and delivery. Synthetic offline fixtures are not counted as live evidence. Social opportunities arose from actual presence and delivery, not manufactured meetings.

Compared with the prior 164-response run, this execution contains explicit rest choices and an independently accepted/joined social rendezvous. However it ended much earlier (246.25s versus the prior longer branch), has no live context ablation and uses stochastic decisions. The result does not establish that added context caused the differences, solved repeated stocking mistakes or improved general Muse performance. Resident reason strings are model-authored justifications, not access to hidden reasoning. They explicitly reference needs, eligible jobs and current stock; no strong claim of historical-biography influence is supported.

## Tokens, latency and cost

All 94 responses have known reported usage: **507,184 input tokens + 38,756 output tokens**. At the verified uncached rates, estimated incremental cost is **$0.798693**; it is not a provider invoice. No timed-out or unknown-cost invocation occurred. There were 94 count requests and 94 generations, with no extra live probes or retries.

Generation latency: min **4,045ms**, median **6,508ms**, mean **7,154.70ms**, max **14,727ms**; summed measured generation latency **672,542ms**. Maximum observed combined preflight-dispatch elapsed plus generation latency was **16,556ms**. Every invocation used the reviewed 30-second shared deadline, but none needed more than 20 seconds; this run therefore does not demonstrate that the extension rescued a slow invocation.

Maximum preflight count was **6,519**; maximum reported input **6,376**, output **1,398**. All stayed within 8,000/2,048. The full envelope was sufficient; validation, rather than tokens, funds, throttle or deadline, stopped this run.

## Integrity and evidence

Post-run audit verified all **14 protected file hashes** (operating checkpoints, .env, prior approvals and evaluation artifacts), source/manifest/execution-wrapper hashes, prior ledger prefix and the 94 new reservations. Both branches paused. Own biography, delivered communication, legitimate places, private homes, constraints, work grounding, owner supply offers/orders and resident-only recovery scope checks passed for all 94 inputs. These focused audits do not constitute proof against every possible privacy defect.

Evidence SHA-256: **8d5f35b17563895f5f6c1eaf1d3bce319444c3ed48aaacca6a24545a4dd8a613**. No source changes were made during execution or reporting; the previously accepted offline checks were not rerun for this report-only task. No commit, push, deployment or credential modification occurred.

- [All 94 exact structured decisions, supplied derived context, validation, metrics and offline proposals](7g-informed-live-decisions.json)
- [Portable summary and integrity results](7g-informed-live-summary.json)
- Local evidence: output/society-7g/7g-informed-20261103T054118Z/evidence.ndjson
- Local complete checkpoints: session.json and offline-session.json in that directory; initial-world.json, report.json, analysis.json and integrity-audit.json accompany them.
- Runtime preflight and separate exclusive approval/claim remain under runtime/; previous interrupted evidence is unchanged.

## Readiness

Do not resume this run or retry decision 94. The next preparation step is a narrow offline audit of encounter-purpose grounding and regression coverage for Sadiq's food/work advice proposal, retaining capability validation and bounded ordinary recovery. Then review a fresh execution plan. The existing 200 / $5 / 1,800s / 90min envelope has headroom; this evidence gives no reason to raise spending or generation limits.

Further live evidence is still needed for recovery after actual ordinary rejection, avoiding repeated personal-food stocking errors in comparable circumstances, completed social conversation and shared time, visits requiring travel or home consent, relationship changes, and subsequent decisions informed by completed interactions. No additional API calls are authorised by this report.

## Selected exact structured Muse decisions

The following objects are generated directly from recorded responses; the linked JSON contains all 94 with inputs and results.

### Decision 2: amina, 0.5s

```json
{
  "action": {
    "businessId": "market",
    "quantity": 2,
    "type": "order-external"
  },
  "goalId": "restock",
  "reason": "Stock need is highest and I am at the market desk with coins, so ordering wholesale to restock best serves my serve-customers priority."
}
```

Validation: accepted.

### Decision 5: fatima, 1.25s

```json
{
  "action": {
    "seconds": 65,
    "type": "rest"
  },
  "goalId": "personal",
  "reason": "Fatigue is my highest need at home after a care shift, so resting now keeps work sustainable before seeking food."
}
```

Validation: accepted.

### Decision 15: maryam, 37.5s

```json
{
  "action": {
    "seconds": 45,
    "type": "rest"
  },
  "goalId": "personal",
  "reason": "At home with moderate fatigue and low hunger, resting now keeps rest manageable before seeking work or food."
}
```

Validation: accepted.

### Decision 20: zainab, 49.5s

```json
{
  "action": {
    "message": "Hi Amina, I'm hungry with no food here - do you know if any food will be available soon?",
    "purpose": "ask",
    "recipient": "amina",
    "type": "encounter"
  },
  "goalId": "food",
  "reason": "Market stock is currently zero so asking nearby trader about food options."
}
```

Validation: accepted.

### Decision 23: amina, 60.25s

```json
{
  "action": {
    "interactionId": "encounter-1",
    "message": "Hi Zainab, no food at stall right now. I have supplies due very soon - please check back shortly.",
    "response": "accept",
    "type": "respond-encounter"
  },
  "goalId": "serve",
  "reason": "Answering Zainab's ask about food while waiting for pending wholesale delivery to restock."
}
```

Validation: accepted.

### Decision 45: amina, 120.75s

```json
{
  "action": {
    "quantity": 2,
    "type": "collect-self"
  },
  "goalId": "restock",
  "reason": "At supply desk with 12 units available and empty stall; collecting 2 fills carrying capacity to restock."
}
```

Validation: accepted.

### Decision 55: zainab, 139.5s

```json
{
  "action": {
    "message": "Hi, I'm Zainab! Waiting at the market too?",
    "purpose": "introduce",
    "recipient": "fatima",
    "type": "encounter"
  },
  "goalId": "errands",
  "reason": "Market stock is empty and hunger is low, so greeting nearby Fatima briefly while continuing errands."
}
```

Validation: accepted.

### Decision 58: fatima, 156.75s

```json
{
  "action": {
    "interactionId": "encounter-2",
    "message": "Hi Zainab! Yes, waiting here hoping for a restock. Nice to meet you!",
    "response": "accept",
    "type": "respond-encounter"
  },
  "goalId": "personal",
  "reason": "Zainab greeted me at the market while I wait; accepting a brief friendly chat fits rest and neighbours."
}
```

Validation: accepted.

### Decision 61: amina, 160.75s

```json
{
  "action": {
    "quantity": 2,
    "type": "stock-stall"
  },
  "goalId": "restock",
  "reason": "At market with 2 supplies carried and stall empty; stocking to serve customers."
}
```

Validation: accepted.

### Decision 71: grace, 184.5s

```json
{
  "action": {
    "message": "Hi, I'm Grace, studying nearby and doing odd jobs. Nice to meet you!",
    "purpose": "introduce",
    "recipient": "maryam",
    "type": "encounter"
  },
  "goalId": "personal",
  "reason": "No eligible work is open now and I have no coins or food, so stay at Community Offices to catch next opening but use the wait to meet nearby Maryam."
}
```

Validation: accepted.

### Decision 75: maryam, 194.75s

```json
{
  "action": {
    "interactionId": "encounter-3",
    "message": "Nice to meet you Grace! I'm Maryam, bookkeeper around here. Hope your studies go well.",
    "response": "accept",
    "type": "respond-encounter"
  },
  "goalId": "personal",
  "reason": "Politely answering Grace's introduction while waiting at offices for work; keeps social time balanced."
}
```

Validation: accepted.

### Decision 80: grace, 208.75s

```json
{
  "action": {
    "channel": "nearby",
    "destination": "community-office-work",
    "message": "Nice meeting you here! Want to hang out here a bit and chat?",
    "recipient": "maryam",
    "seconds": 60,
    "type": "invite-social"
  },
  "goalId": "personal",
  "reason": "No eligible work is open and I have no coins or food, so I stay at the offices to catch the next opening and use the wait for a social connection with nearby Maryam."
}
```

Validation: accepted.

### Decision 84: maryam, 214.75s

```json
{
  "action": {
    "destination": null,
    "invitationId": "social-1",
    "message": "Nice meeting you too Grace! Happy to hang out here a bit and chat.",
    "response": "accept",
    "type": "respond-social"
  },
  "goalId": "personal",
  "reason": "Waiting at offices with no work available now; brief chat balances social time without blocking needs."
}
```

Validation: accepted.

### Decision 87: grace, 228.75s

```json
{
  "action": {
    "invitationId": "social-1",
    "type": "join-social"
  },
  "goalId": "personal",
  "reason": "No eligible work is open and I have no coins or food, so I stay here and join the accepted hangout with Maryam."
}
```

Validation: accepted.

### Decision 90: ibrahim, 229.5s

```json
{
  "action": {
    "businessId": "supply-desk",
    "type": "take-work"
  },
  "goalId": "livelihood",
  "reason": "At centre with funded supply work eligible now. Taking the wage job first, then will buy food at market."
}
```

Validation: accepted.

### Decision 92: maryam, 235.75s

```json
{
  "action": {
    "invitationId": "social-1",
    "type": "join-social"
  },
  "goalId": "personal",
  "reason": "Work is unavailable now, needs are manageable, so joining accepted chat with Grace here."
}
```

Validation: accepted.

### Decision 93: halima, 246s

```json
{
  "action": {
    "businessId": "supply-desk",
    "type": "take-work"
  },
  "goalId": "livelihood",
  "reason": "At centre with matching funded supply work open; taking one shift keeps supplies moving before going to market for food and rest."
}
```

Validation: accepted.

### Decision 94: sadiq, 246.25s

```json
{
  "action": {
    "message": "Hello, I'm Sadiq, repair apprentice. I'm short on food and work—any advice?",
    "purpose": "request-help",
    "recipient": "grace",
    "type": "encounter"
  },
  "goalId": "personal",
  "reason": "Hunger 0.82 and income need 1 with 1 coin and no work available here, so I will seek help from nearby Grace before waiting or traveling."
}
```

Validation: missing-assistance-capability.
