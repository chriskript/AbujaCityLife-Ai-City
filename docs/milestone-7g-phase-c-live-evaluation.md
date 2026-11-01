# Milestone 7G Phase C: approved live Muse evaluation

Evaluated **November 1, 2026**, after explicit approval of the 36-generation/$0.60 plan and temporary $5 cumulative allowance.

**Nine genuine Muse generations across seven residents produced nine validated actions, including a model-originated request and an independently generated recipient reply. The run stopped on attempt ten because its token preflight returned 6,045 against the unchanged 6,000-token ceiling. No tenth generation, transport offer or delivery was manufactured. No retry or resumption occurred.**

This demonstrates a bounded model-mediated social exchange with persistent communication and economic consequences. It does not demonstrate completed negotiated cooperation, sustained social autonomy, superior performance to the offline policy, or a causal benefit from the authored history.

## Configuration, access and spending checks

Run ID: **`7g-c-unity-20261101T085502Z`**. Model: `muse-spark-1.3` Standard, low reasoning effort, strict structured output, no tools, `store:false`. The normal sixteen-resident `town-v1` seed retained Unity Gardens' scoped history, biographies, map, businesses, homes, economy and communication rules. Both branches began from identical serialized state in isolated files; operating town saves were not reset or modified.

Hard limits remained **36 generations, $0.60 incremental, 600 simulated seconds and 20 wall minutes**. Per invocation: maximum 6,000 preflight input tokens, 2,048 output tokens, 24,000 input JSON characters and the existing shared 20-second provider deadline. The run retained one pending inference, wall-time throttles, cooldowns, authoritative action validation, exclusive plan claims and fail-closed accounting. No limits were relaxed after a failure.

[Official pricing](https://dev.meta.ai/docs/pricing-rate-limits) and [model availability](https://dev.meta.ai/docs/models) were rechecked before dispatch. Spark Standard remained $1.25/million uncached input tokens and $4.25/million output tokens. The conservative reservation remained **$0.016204 per attempt**, or **$0.583344 for all 36**, below the $0.60 run ceiling.

Read-only checks confirmed a configured key, the reviewed model, a valid unchanged ledger and no spending lock. Provider access was checked by the first authorised token preflight before generation; nine completed responses then verified configured-key/model access during this run. No extra authentication probes, billing changes or credit-balance assumptions were used.

## Approved cumulative allowance

The internal cumulative setting changed from **$1 to $5 through November 4 inclusive**, using `META_PROBE_TOTAL_USD_UNTIL=2026-11-04`. The shared reservation gate restores an effective cap of at most **$1 on November 5, 00:00 Africa/Lagos**. Existing reservations remain in the ledger; if retained reservations exceed the restored cap, further calls fail closed pending review. No accounting reset or refund is implied by expiry.

The already approved **$20/day** setting and its November 4 expiry remain unchanged. Its effective cap reverts to at most $0.25/day at the same Lagos midnight. The provider, backend, society CLI, contract probe and offline checks all honour the cumulative expiry. Credential and unrelated configuration equality was checked without exposing the key. Provider restrictions and per-run ceilings were not changed.

Before this run, the ledger held **$0.171918** overall and **$0** on November 1, leaving $4.828082 cumulative and $20 daily headroom. This supported the complete 36-attempt reservation envelope. The allowance was not treated as a target to spend.

## Participating residents and scoped information

All sixteen residents were eligible for meaningful Muse opportunities. **Amina, Chris, Halima, Yusuf, Ngozi, Ladi and Musa** received completed generations. Amina also reached the blocked tenth preflight. All sixteen took normal validated actions across the combined live/offline simulation; the other nine residents' decisions remained offline.

Each invocation received only its actor's own goals, needs, resources, skills, commitments, legitimately known postings/places, timestamped evidence, retained memories, delivered communication and scoped social context. Shared history supplied at most three granted starting facts, plus only that resident's own biography and bounded connection evidence. Other residents' biographies, private needs and inboxes were not included.

The revised work view made skill, presence, current versus historical availability, funding and `eligibleWorkIds` explicit. The live `take-work` schema admitted only currently eligible IDs. The world validator independently rechecked each proposal. No skill was given to Chris to repair the earlier failed proposal.

Priority scheduling made delivered invitations and concrete recipient choices eligible ahead of optional initiations. It did not require acceptance or conversation. Several residents chose income or personal needs rather than the optional social opportunity that caused dispatch.

## Decisions and authoritative validation

| Attempt | Resident / time | Opportunity | Actual proposal | World result |
| --- | --- | --- | --- | --- |
| 1 | Amina, 0.5 s | Known stock shortage | Text Musa requesting discussion of supply transport | Accepted; real delayed message created |
| 2 | Chris, 1 s | Optional encounter | Travel to the repair workshop to inspect work | Accepted; physical travel began |
| 3 | Halima, 1.75 s | Optional encounter | Take supply-desk work | Accepted; wage/inputs held in a real booking |
| 4 | Yusuf, 2.25 s | Optional remote social choice | Take learning-desk work | Accepted; wage held in a real booking |
| 5 | Ngozi, 2.5 s | Known stock shortage | Buy one food portion for personal hunger | Accepted; payment and stock changed |
| 6 | Ladi, 3.25 s | Optional encounter | Travel to Community Offices to inspect matching work | Accepted; physical travel began |
| 7 | Musa, 20.25 s | Delivered incoming communication | Accept discussion and ask for pickup, destination and quantity | Accepted; independent reply sent |
| 8 | Chris, 25.75 s | Local employment choice | Take funded repair work | Accepted; wage held in a real booking |
| 9 | Ladi, 40 s | Local employment choice | Take funded community errands work | Accepted; wage held in a real booking |
| 10 | Amina, 40.5 s | Follow-up offer opportunity | **No model output**: preflight 6,045 > 6,000 | No world proposal; experiment stopped |

All nine generated actions passed schema and authoritative world validation. There were no rejected world actions in this run. Attempt ten was a provider-preflight failure, not an invalid generated offer.

Movement frames, food consumption, work continuation and economic arithmetic were executed by the existing deterministic simulation. Ngozi's buy was a routine-like action chosen by Muse at a shortage opportunity; this is a limitation of paid-opportunity routing, not an additional social reasoning achievement. Nine valid outputs must not be described as nine social interactions.

The exact structured outputs and public explanations are reproduced in the transcript below and retained in the original flushed evidence.

## Independent social exchange: what actually happened

At second **0.5**, Amina independently generated:

> Hello Musa, my stall stock is low. Can you help carry stall-supplies from Centre? Let me know.

The text arrived at second **5.5** through the normal delay. Musa's separate invocation at **20.25** received his own observation and the delivered invitation, not Amina's private needs or an operator instruction to cooperate. He independently selected structured `response:accept` and generated:

> Hello Amina, I can help carry supplies. Please share pickup, drop-off and quantity.

His reply reached Amina at **25.25**. The thread persisted as `accepted`, with `responseNotified:true` and `taskId:null`. The scheduler's cooldowns and wall-time limits continued to apply; prioritisation did not bypass them.

This is a genuine independently generated request/recipient response through validated communication. However, **accepting the discussion is not accepting a transport task**. Asking for details in the reply text is not the structured `clarify` action. No quantity, escrow or physical delivery commitment was created. No model refusal, disagreement, formal clarification turn or negotiated transport outcome was observed.

Amina reached a legitimate follow-up opportunity at 40.5 seconds, but the input guard stopped it before generation. The offline counterfactual proposed four units; **Muse did not produce that offer**, and it must not be attributed to the live branch.

## Persistent social and economic consequences

Both isolated branches stopped and persisted paused at **40.5 simulated seconds**. Coordinator wall time was **124,698 ms**. The live checkpoint records **10 paid attempts and 15 routine offline decisions**. It was not advanced further to complete work or produce a preferred ending.

### Communications, knowledge, contacts and relationships

- One model-originated discussion thread and one independently model-generated recipient response persisted.
- Amina and Musa gained legitimate event-backed memories of sending and receiving the exchange. Received speech remained attributed and uncertain; it did not become authoritative knowledge of the sender's stock or intentions.
- The work bookings created commitment memories for their actual workers. Normal proximity, movement, work and purchase observations also updated personal memory.
- **No phone contacts, known identities or successful-job relationships changed.** There was no new friendship or earned delivery trust. The existing acquaintance/contact network was not expanded to create interaction.
- The authored neighbourhood/resident past was not rewritten; only actual runtime events and scoped observations changed.

### Work commitments, money and inventory

Four Muse-originated work bookings were still active at the stop:

| Worker | Job | Held wage | Due time | Completion at stop |
| --- | --- | ---: | ---: | --- |
| Halima | Supply desk | 2 demo credits | 46.75 s | Not completed; two raw inputs held |
| Yusuf | Learning desk | 2 | 92.25 s | Not completed |
| Chris | Repair workshop | 2 | 85.75 s | Not completed |
| Ladi | Community errands | 1 | 85 s | Not completed |

These are real accepted employment commitments, not completed work or paid income. Routine offline Tunde, Emeka and Bisi bookings added six more held credits, for **13 held wages** across seven active bookings. No job had completed before the stop, and no supply output was produced.

Ngozi's purchase paid **two credits**: her wallet changed **5 -> 3**, Amina's **24 -> 25**, and the market's funded work budget **0 -> 1**. Market food stock changed **1 -> 0**. Ngozi later consumed her own portion through offline mechanics at second **22.5**, reducing hunger; her final carried food/goods were zero. No one else's personal wallet changed.

Supplier stock remained **8**. Raw production inputs changed **96 -> 94** because two inputs were held in Halima's booking; produced stock remained **0**, food consumed **1**. There were **no transport tasks, transport escrow or deliveries**. The empty transport-task list must not obscure the separate real employment commitments.

Money conservation passed: **154 resident credits + 388 business credits + 13 held wages + 0 transport escrow = the initial 555 credits**. Nothing was minted to make the run work. No wage was paid before completion.

## Tokens, latency and cost

| Attempt | Actor | Preflight tokens | Generation input | Output | Provider latency | Estimated generation token cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Amina | 5,174 | 5,031 | 800 | 8,474 ms | $0.00968875 |
| 2 | Chris | 5,481 | 5,338 | 707 | 8,970 ms | $0.00967725 |
| 3 | Halima | 5,171 | 5,028 | 348 | 5,850 ms | $0.00776400 |
| 4 | Yusuf | 5,040 | 4,897 | 314 | 4,147 ms | $0.00745575 |
| 5 | Ngozi | 5,143 | 5,000 | 492 | 8,044 ms | $0.00834100 |
| 6 | Ladi | 5,202 | 5,059 | 750 | 9,540 ms | $0.00951125 |
| 7 | Musa | 4,961 | 4,818 | 536 | 7,585 ms | $0.00830050 |
| 8 | Chris | 5,644 | 5,501 | 387 | 6,194 ms | $0.00852100 |
| 9 | Ladi | 5,332 | 5,189 | 226 | 12,550 ms | $0.00744675 |
| 10 | Amina | **6,045** | Not requested | Not generated | 1,521 ms preflight attempt | No generation usage record |

Nine generation responses report **45,861 input tokens and 4,560 output tokens**, with **71,354 ms** summed provider latency. Calculated cost at the conservative uncached rates is **$0.07670625**. These are measured usage and a rate-based estimate, not independently reconciled provider billing or a refreshed account-credit balance.

Attempt ten sent only its token preflight. There was **no tenth `POST /responses`**, generated decision or reported generation usage. The automatic report's `unknownInvocations:1` conservatively reflects that missing usage record; it must not be read as an unrecorded completed generation. Its token-preflight billing, if any, is not independently reconciled.

There were **10 token preflights and 9 generation requests**, all without automatic retry. The shared ledger added exactly **ten nonrefundable $0.016204 reservations = $0.162040**, including the stopped attempt. Prior reservations were retained byte-for-byte. Total reservations are now **$0.333958**; remaining headroom is **$4.666042 cumulative** and **$19.837960 for November 1**, absent later spending. Actual usage, conservative reservations and provider credit balance remain distinct.

## Matched offline comparison

The all-offline branch used identical initial state and clock/decision pulses, and stopped at the same 40.5 seconds. It had the same personal wallet balances, business balances, seven active work bookings, one food purchase/consumption and resource totals. Its Amina-Musa discussion was also accepted under the deterministic policy.

At the stopping pulse the baseline additionally proposed **four units** of transport from Amina to Musa. That task remained **proposed**, with delivery to Musa's communication view not due until **45.5** seconds. It had no recipient acceptance, reserved cargo, escrow or delivery. The live branch had no corresponding task because the token guard blocked its model follow-up.

On identical live inputs, **seven of the nine generated action payloads exactly matched the offline action** after ignoring JSON key order. The other two were the messages: channel, recipient, purpose/response matched, while wording and the initial report attachment differed. Thus **all nine core action choices matched the corresponding offline policy**. Muse supplied original public text and explanations, but this sample does not establish better choices or outcomes than that policy. The ungenerated tenth request's offline choice is a counterfactual, not a live model decision.

## History, employment grounding and autonomy assessment

The operator review is stored separately in `context-review.json`; it does not alter raw outputs or world history.

- Musa explicitly referred to Amina's delivered request and asked for terms. That is direct public evidence of responding to another resident's communication. It is not evidence of a transport commitment.
- Halima, Yusuf, Chris and Ladi referred to relevant work, skills or funding. Ladi explicitly avoided market work requiring a skill he lacked. Four work proposals were valid under the new scoped eligibility schema and the independent world validator. The earlier Chris supply-skill error did not recur in this sample.
- No public explanation explicitly attributed its decision to neighbourhood origins or a past personal event. Amina's preference for dependable help is also present in her existing personality/priorities, so it does not isolate biography influence. History was available but causal use or benefit remains unproven.
- Schema restrictions are part of the grounding improvement. The sample does not isolate improved internal model understanding from constrained output, changed routing or normal model variation. No live ablation or private chain-of-thought inspection occurred.
- Residents taking work instead of optional social contact is a valid alternative, not a failure to enact a story. No cooperation was forced. Nevertheless, only one model-mediated discussion was observed, without refusal or a sustained sequence of reciprocal decisions.

**Demonstrated:** authenticated multi-resident model decisions, an independently generated initiation and recipient response, valid scoped employment choices, persistent work commitments, and a real cross-resident purchase consequence under authoritative rules.

**Unproven:** completed model-negotiated cooperation, transport commitment/payment/delivery, new friendship or trust, response to refusal/conflict, sustained ten-minute social autonomy, all-sixteen model participation, reasoning superiority to the offline baseline, and a causal benefit from history.

## Stop diagnosis and next preparation

The blocked request was only **13,855 JSON characters**, below the 24,000-character guard, but the complete input/schema/instructions exceeded the separate token ceiling. Its actor contained **16 retained memories**; memory text occupied 3,105 JSON characters, place knowledge 2,562, scoped history 1,688 and communication 828. Character counts are not token counts, and the memory buffer was not even full.

The token guard worked as approved. The run was not retried for being only 45 tokens over, limits were not raised, memories were not deleted, and no proposal was supplied on the model's behalf. No further live evaluation is authorised by this report or by the unused 26 attempts.

Before another separately approved run, prepare a bounded offline model-input projection that removes redundant representations while preserving relevant current evidence, pending communication, commitments, skill/funding checks and scoped historical context. Test it against this exact stopped request and preserve authoritative state and memories. Also inspect routine-purchase routing so a shortage opportunity does not unnecessarily spend reasoning on a routine-like buy. These are recommendations, not changes applied during this run. Keep the 6,000-token guard and verify exact provider preflight only after a new approval.

## Evidence, integrity and validation

Ignored evidence: `output/society-7g/7g-c-unity-20261101T085502Z/`. Primary artifacts include `evidence.ndjson`, `initial-world.json`, `session.json`, `offline-session.json`, `report.json`, `report.md`, `decision-transcript.md`, `context-review.json`, `integrity-audit.json`, `readiness-before.json` and protected-file fingerprints. Exact system instructions and per-invocation schemas/requests are retained, with raw structured output, public explanations, provider phases, authoritative events, accounting and state changes. No API credential or private model reasoning is recorded.

The expiring approval, consumed one-shot claim, before-run ledger/hashes and cumulative-change audit remain under ignored `runtime/`. Both isolated branches are paused. Operating backend/headless saves, the updated `.env` and prior Phase B approval matched their before-run hashes; the earlier allowance-change audit separately verified unchanged credentials and unrelated settings. Historical ledger entries matched exactly. No ledger lock or pending checkpoint file remains.

Before dispatch, **24 focused offline tests**, both TypeScript projects and production build passed. The cumulative expiry regression verifies November 5 Lagos midnight and blocks new calls above the reverted $1 cap without deleting history. The subsequent full serial suite passed **329 tests in 20 files**. No commit, push or deployment occurred.

## Exact structured output transcript

The following transcript is generated directly from the retained report; formatting does not change the model's fields or public explanations.

### Attempt 1: amina at 0.5 seconds

```json
{
  "action": {
    "channel": "text",
    "memoryId": null,
    "message": "Hello Musa, my stall stock is low. Can you help carry stall-supplies from Centre? Let me know.",
    "purpose": "request-help",
    "recipient": "musa",
    "type": "communicate"
  },
  "goalId": "restock",
  "reason": "Stock is low and I value dependable help, so I am asking Musa for transport support."
}
```

### Attempt 2: chris at 1 seconds

```json
{
  "action": {
    "destination": "repair-shop-work",
    "type": "travel"
  },
  "goalId": "errands",
  "reason": "Heading to Tunde's Workshop to check repair work I can do for income."
}
```

### Attempt 3: halima at 1.75 seconds

```json
{
  "action": {
    "businessId": "supply-desk",
    "type": "take-work"
  },
  "goalId": "livelihood",
  "reason": "At the desk with a funded opening that matches my skill, taking work keeps supplies moving."
}
```

### Attempt 4: yusuf at 2.25 seconds

```json
{
  "action": {
    "businessId": "learning-desk",
    "type": "take-work"
  },
  "goalId": "livelihood",
  "reason": "At the Learning Centre with a current funded teaching opening that matches my skill."
}
```

### Attempt 5: ngozi at 2.5 seconds

```json
{
  "action": {
    "quantity": 1,
    "type": "buy"
  },
  "goalId": "personal",
  "reason": "Buy one food portion at the market to manage hunger with available coins"
}
```

### Attempt 6: ladi at 3.25 seconds

```json
{
  "action": {
    "destination": "community-office-work",
    "type": "travel"
  },
  "goalId": "livelihood",
  "reason": "Market stall needs food skill I lack; going to Community Offices to inspect matching errands work for income."
}
```

### Attempt 7: musa at 20.25 seconds

```json
{
  "action": {
    "communicationId": "communication-1",
    "memoryId": null,
    "message": "Hello Amina, I can help carry supplies. Please share pickup, drop-off and quantity.",
    "response": "accept",
    "type": "respond-communication"
  },
  "goalId": "earn",
  "reason": "Amina requested transport help; accepting discussion to get job details."
}
```

### Attempt 8: chris at 25.75 seconds

```json
{
  "action": {
    "businessId": "repair-workshop",
    "type": "take-work"
  },
  "goalId": "errands",
  "reason": "At Tunde's Workshop with a funded repair opening I can do, taking it for income."
}
```

### Attempt 9: ladi at 40 seconds

```json
{
  "action": {
    "businessId": "community-errands",
    "type": "take-work"
  },
  "goalId": "livelihood",
  "reason": "At Community Offices with a matching funded errands opening; taking work for income."
}
```

### Attempt 10: amina at 40.5 seconds

No generated decision. Preflight: 6,045 tokens. Stop: Input token limit exceeded.
