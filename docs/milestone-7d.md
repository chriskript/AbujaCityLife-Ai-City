# Milestone 7D: autonomous calls and delayed messaging

Implemented offline on October 31, 2026. Contact-based remote communication is integrated into the existing sixteen-resident town, authoritative actions, scheduler, observations, memories, transport tasks, recovery and browser. No external telephone/SMS service, audio, live Meta request, commit, push, deployment or repository rename was used.

## Capabilities and rules

Knowing a resident does not give their number. Starting phone contacts are a small, explicit set of authored prior exchanges, filtered against each resident's established acquaintance knowledge. Future residents can supply their own `knowledge.contacts`; otherwise they start without contacts unless explicitly seeded. `offer-contact` shares only the speaker's own contact with a nearby known person. Introductions can lead residents to choose this action, and the recipient can independently reciprocate later. No friendship, trust increase or reciprocal access is imposed. `sharedContacts` retains the resident's own disclosure history, preventing repeat offers after old events leave recent history.

Four new strict actions are available in the normal town:

| Action | Meaning |
| --- | --- |
| `offer-contact` | Share my own contact locally; obtain no other phonebook entries |
| `communicate` | Send a text or ring a contact, with a chat/help purpose, a message and an optional reference to my own memory |
| `respond-communication` | Independently accept discussion, decline, defer, clarify or ignore a delivered invitation |
| `end-call` | Either participant ends a connected call |

Texts and replies take **five simulated seconds** to arrive. Receiving a text does not interrupt paid work, travel or rest. The recipient can respond when eligible, make another choice or let it expire after 300 seconds. Calls ring immediately, can be answered/declined/deferred/ignored, and have a 60-second total lifetime. Work can legitimately lead to a missed call. Connected calls can end explicitly or at their bound.

The initial implementation uses bounded invitation/response exchanges, followed by existing consequential actions where appropriate. It does not implement voice audio, unrestricted multi-turn dialogue, automatic callbacks, group chats, contact directories, arbitrary price negotiation or phone service outages. Deferral does not schedule a forced later reply. Another exchange can be chosen after cooldown.

Each pair has a **180-second bidirectional cooldown**, with at most **four pending/connected exchanges per resident** and **128 retained exchanges per world**. Messages are limited to 160 characters. Capacity, pending conversations and caller-owned cooldowns are authoritative constraints, exposed through scoped observations. A busy phone can reject another call; texts remain a separate delayed channel. Capacity exhaustion preserves history and prevents new exchanges rather than evicting deduplication evidence. Residents can continue existing physical routines.

## Knowledge and independent decisions

NPC observations contain only their own contacts, disclosure history, relevant open exchanges and six recent completed exchanges. Remote contacts expose known identity and previously disclosed transport capability, not location, private needs, work bookings, wallets, inbox contents or another phonebook. A caller cannot see a queued reply, the recipient's private ignore decision or a read receipt. Silence resolves as missed/expired without revealing why.

An NPC can explicitly attach one of their own memories. The selected content is copied at sending and delivered as an attributed, uncertain **report**. It does not overwrite roads, resources, personal knowledge caches or authoritative world facts. No other resident's private state is injected into a conversation. The browser has a separate, labelled operator history; this broader view is never used as NPC inference context.

Routine delivery, deadlines, ringing, cooldowns and notifications are deterministic. Offline policy decisions consider the recipient's own hunger, fatigue, accepted commitments, skills and carrying capacity. Help discussions can be accepted while the subsequent specific job is refused. Optional social texts and contact sharing are chosen alongside existing work, meals, rest and encounters. Dialogue in offline mode remains labelled policy fixture text, not evidence of live natural-language reasoning.

## Communication is not completion

An accepted help discussion permits one separately validated `propose-transport` action through that exchange, including at a distance. It does not reserve supplies, accept work or pay anyone. The task is linked to its originating exchange. Its offer arrives after five seconds; the recipient cannot respond before acquiring it. They then independently accept, decline or request clarification through the existing transport actions.

Acceptance still validates stock, payment, ownership, capacity and conflicting commitments. It reserves existing goods/payment as before. The acknowledgement and any clarification arrive remotely after a delay; acceptance is not a delivery receipt. Physical collection and graph movement remain necessary. Validated completion transfers goods, pays held credits once and produces existing economic/relationship consequences. Recovering an in-flight offer, reply, clarification or accepted task cannot redeliver it or duplicate payment. A used exchange cannot create a second remote task; legitimate later face-to-face business remains possible under the existing rules.

## Integration and recovery

- `communication.ts` implements bounded communication mechanics and scoped projections; `communication-validation.ts` checks recovery invariants. Both operate within the existing world executor, not a separate simulation service.
- World snapshots retain optional communication state and personal contact/disclosure lists within version three. Old snapshots remain readable. Raw three/four-person compatibility fixtures preserve their existing behavior; configured towns enable communications.
- The normal server upgrades old town checkpoints with an exclusive `.pre-7d-backup` before adding contacts/capabilities. Existing memories, inventory, relationships, tasks, balances, inference counters and progression usage remain. No rollback copy is overwritten.
- The CLI performs the same upgrade on its separate checkpoint, with a rollback copy and existing exclusive lock. Its summary includes text/call/remote-task counts. The local browser and default headless town also include communication.
- The existing browser adds a compact **Calls & messages** disclosure per resident, showing contacts, recent exchanges and linked task status. Events distinguish sent, delivered, replied, missed, ended and task notifications. Rendering, resident selection, road controls and taxi lab are retained.

For rollback, stop the owning process and restore its reviewed pre-7D backup before running earlier code. Earlier builds do not recognize the new capabilities. Never run separate processes against the same checkpoint. Verification used only isolated/temporary files; the operating checkpoint, access credentials, approved plans and Meta ledger were not changed.

## Validation and observed outcomes

**267 tests pass across thirteen files**, including 24 new communication cases. Tests cover contacts versus acquaintances, one-way disclosure, introductions, delayed messages/replies, private ignore choices, missed/ended calls, independent acceptance/refusal/deferral/clarification, busy recipients, report attribution, invalid-action state preservation, schema bounds, queue/history limits, duplicate prevention, corruption rejection, in-flight recovery, migration backups and real paid delivery. The existing sixteen-resident twenty-minute test still confirms that every resident acts and eats, with varied economic outcomes and no rejected proposals. The 7C timing comparison explicitly preserves its older communication-disabled policy fixture; remote trajectories are tested separately.

In a normal default-policy **1,200-second offline run**:

- 669 decisions produced **17 texts and three calls**.
- Six tasks originated in remote discussions: five completed and one was declined. **Six deliveries completed overall**, including one local offer.
- 36 supplies were produced and 36 meals consumed.
- There were **zero rejected proposals**. Goods and credits remained conserved, including held wages, cargo and delivery escrow.
- Call discussions included Amina–Musa and Amina–Chris. A discussion could be accepted yet its specific task declined. These are observed outcomes, not required story sequences.

Installed Chrome verified the production build with isolated offline servers. In the directly running browser town, Amina's text discussion led to completed deliveries; other residents independently sent social messages or deferred replies. All sixteen markers and roster entries remained available. Its tick schedule generated a different history from the standalone driver. For call presentation, a separate paused checkpoint replayed the **default** headless run above, without a forced dialogue or call outcome. The same browser/server displayed its three calls, linked outcomes and acquired contacts. Paused refresh preserved time and communication history.

Desktop 1280×720 and mobile 390×844 screenshots were inspected. Mobile has no horizontal overflow. Long histories use the existing scrollable resident panel on desktop and normal page scrolling on mobile. No application page errors were observed; the existing initial unauthenticated 401 and password-field form notice remain. Ignored artifacts are under `output/playwright/milestone7d-{messages,calls}-{desktop,mobile}.png`.

An isolated CLI checkpoint containing eight residents and existing activity advanced from second 120 to 180 after upgrade, produced three texts, saved `.pre-7d-backup` and released its lock. No operating CLI/server checkpoint was used.

Both TypeScript configurations and production build pass. The neighbourhood chunk is approximately **115 kB minified / 32 kB gzip**, up from about 92 / 27 kB in 7C. The existing shared renderer is approximately 565 / 144 kB and retains its chunk warning. No dependency, external asset or audio stream was added. Physical-phone performance remains unmeasured; existing crowded labels remain a limitation.

## Costs and remaining scope

There are no live costs from this milestone's testing. Communication actions consume existing offline decision allowances; delivery/deadline mechanics do not request inference. Live Meta can choose the same actions only within the existing separately approved mode, observer gate, plan, input/output/token limits and spending ledger. The expanded schema/instructions have offline coverage only. Input preflight still fails closed above the existing token ceiling; the ceiling and spending allowances were not raised.

The 1,800 simulated-second server allowance, 2,048 routine decisions, finite production inputs, work funding, bounded memories/events and population safety ceiling of 32 remain. Communication is registry-driven; explicit starting contacts are seed data rather than behavior branches around sixteen IDs. Thirty-day operation, archival beyond retained history and longer unattended budgets are not established. The next priority is submission rehearsal and recovery/performance polish around the integrated town, rather than adding governance or more population systems. Any live evaluation still needs separate approval.

## Integrated follow-up

[Milestone 7E](milestone-7e.md) integrates communication into addressed districts and a scoped, operable resident handset. Its snapshot v4 and presentation v2 supersede the versions reported above; this report remains the historical 7D record.
