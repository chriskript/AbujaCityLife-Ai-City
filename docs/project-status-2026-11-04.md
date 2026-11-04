# Abuja City Life: AI Town — project status

**As of 4 November 2026 (Africa/Lagos).** Implementation reference: local commit `5779271`, which unifies persistent local Muse operation. Live results below come from separately identified November 3 evaluations. This document consolidates repository evidence; it does not report a new live run or certify the current operating session.

## Where we are

Abuja City Life: AI Town is a working miniature society set in **Unity Gardens**, a fictional neighbourhood in Abuja, Nigeria. Sixteen residents have homes, livelihoods, resources, needs and different starting connections. They can travel, work, earn, buy food, rest, communicate and enter validated commitments. A Three.js interface lets a person observe the town, inspect residents and places, and intervene through controlled interactions.

**We create the world, its rules, and its possibilities. The residents create their own stories.** The project is an Indie Developer / Push the Frontier entry for the Meta Global AI Developer Hackathon 2026, building on the broader Abuja City Life work.

The main achievement is a connected system: Muse can make resident choices that lead to authoritative movement, messages, payments and persistent consequences. Recorded live evaluations show independent replies, introductions, voluntary phone-number sharing, an accepted public meeting and a workplace visit prompted by a delivered invitation. Long-term friendship, consistently good personal priorities and a self-sustaining economy remain open work.

### Capability and evidence snapshot

**Implemented** means the mechanic exists in source with repository verification. **Observed live** means a dated evaluation records actual Muse choices and consequences. **Unproven** means the stronger outcome has not been established, even where supporting mechanics exist.

| Capability or outcome | Status | Evidence and qualification |
| --- | --- | --- |
| Navigable town, homes, workplaces and inspection interface | **Implemented** | [Redesign](unity-gardens-redesign.md), [integrated acceptance](nov3-integrated-acceptance.md); mobile checks used resized desktop Chromium. |
| Sixteen residents with scoped knowledge, needs and backgrounds | **Implemented** | [Resident context](unity-gardens.md); other residents' biographies are not supplied automatically. |
| Independent choices across all sixteen residents | **Observed live** | [200-response evaluation](nov3-sustained-muse-live-evaluation.md); bounded duration, with mixed personal outcomes. |
| Work, food, replenishment and economic consequences | **Observed live** | [Society validation](nov3-autonomous-society-validation.md); finite inputs and funding remain constraints. |
| Introductions, replies and voluntary directed contact sharing | **Observed live** | [Sustained evaluation](nov3-sustained-muse-live-evaluation.md); sharing a number creates no reciprocal number grant or friendship. |
| Independently accepted public meeting and mutual attendance | **Observed live** | [Grace–Maryam evaluation](milestone-7g-informed-autonomy-live-evaluation.md); both were already at the venue, and shared time did not finish. |
| Invitation-informed travel and arrival | **Observed live** | [Sadiq–Tunde sequence](nov3-sustained-muse-live-evaluation.md); the visit created no job or wage. |
| Consent-aware shared activities and social-exchange counters | **Implemented** | [Meeting execution checks](submission-readiness-2026-11-03.md); synthetic completion is separate from live evidence. |
| Extended Muse hangout conversation and lasting friendship | **Unproven** | Live attendance and short exchanges do not establish either outcome. |
| Live HTTP/browser continuity and persistent consequences | **Observed live** | [64-response reliability evaluation](nov3-http-browser-reliability.md); bounded local evidence from before the latest operating changes. |
| Reusable authorization and persistent local Muse launcher | **Implemented** | [November 4 operation guide](local-live.md); this consolidation adds no fresh paid evaluation of that launcher. |
| Uniformly good need management and long-term economic endurance | **Unproven** | [Live/baseline comparison](nov3-sustained-muse-live-evaluation.md) records hunger, fatigue and unequal food access. |

## The town and its residents

### Unity Gardens today

The redesigned town retains **16 residents, 20 dwellings (including four vacant flats), 16 registered buildings and eight business sites**. Acacia Lane and Centre Gardens form residential courts; Market Square, workshops and the supply forecourt support trade; civic, care and learning facilities sit alongside the green, Hill Garden and lakeside destinations. The map has **68 nodes and 75 edges**, comprising 29 roads, 20 outdoor access paths and 26 indoor connections. These are simulation connections, not a traffic-physics system.

The [redesign](unity-gardens-redesign.md) connects building entrances and public spaces, provides a supply-to-market detour and preserves existing identities and saved history through a layout migration. The subsequent [visual refinement](unity-gardens-visual-refinement.md) adds more distinctive roofs, porches, signage, planting and an Abuja City Gate tribute. The gate is selectable scenery rather than a new simulation destination. The town taxi remains; the earlier standalone Taxi Lab experience has been retired.

Residents can be searched and followed; buildings and destinations have inspectors. Outdoor residents appear in the scene, while indoor occupancy is represented through place inspection. Activity filters and recorded-event inspection expose consequences. Phones show chats, calls and contacts, with explicit control acquisition for player actions. Calls are simulated and contain no voice audio. Crossings are visual wayfinding; traffic yielding, collision physics and persistent parked vehicles are not implemented.

### The sixteen starting residents

This table summarises public starting backgrounds from the [canonical resident record](unity-gardens.md). It is a project reference, not knowledge automatically available to every resident. Personal private biographies are omitted.

| Resident | Starting background and livelihood |
| --- | --- |
| Musa | Taxi driver familiar with local routes. |
| Amina | Market trader whose livelihood developed with neighbourhood commerce. |
| Zainab | Runs errands around the market and community centre. |
| Chris | Recent arrival combining repair apprenticeship and supply courier work. |
| Fatima | Nurse bringing care experience to the local care desk. |
| Tunde | Runs a repair workshop serving local trade. |
| Halima | Helps organise practical supply work at the cooperative. |
| Ibrahim | Combines growing experience with supply work. |
| Yusuf | Tutor working around the learning desk. |
| Ngozi | Has cooking, market and supply-errand experience. |
| Emeka | Electrical repair worker associated with the stand-side trade. |
| Grace | Student in shared lodging near Hill Garden, taking occasional work. |
| Ladi | Walking courier handling market and centre errands. |
| Sadiq | Repair apprentice with Tunde. |
| Maryam | Bookkeeper with an existing connection to Halima. |
| Bisi | Tailor working near the market. |

Residents carry their own goals, priorities, capabilities, inventory, money and need state. Food, income, stock and rest affect available choices; need scales run from satisfied toward increasingly unmet. An occupation or biography gives context, but does not guarantee an available job, force a decision or oblige another resident to cooperate.

**Authored history and lived experience are separate.** The pinned `unity-gardens-v1` history describes the neighbourhood before simulation starts. Each resident receives authorised shared facts and their own background. Later observations, delivered messages, commitments and outcomes create event-backed knowledge and memories. Information can become stale; a message about food does not guarantee stock remains available when someone arrives. Memory distinguishes observations, reports, beliefs, commitments and outcomes rather than making every statement a verified fact.

## Relationships, communication and cooperation

The project models several distinct kinds of connection:

- **Identity knowledge and acquaintance:** a resident can know or meet someone without possessing their phone number. Starting connections can be asymmetric.
- **Phone access:** contact possession is directed. Musa sharing his number with Grace lets Grace contact Musa; it does not automatically give Musa Grace's number.
- **Experienced work and social exchanges:** relationship records track `successfulJobs`, optional `socialExchanges` and `lastSocialAt`. These are experience counters, not a general friendship or emotional-trust score.
- **Consent and commitments:** an introduction, accepted discussion, text invitation, social rendezvous and transport contract have different effects. Speech about possible work does not create employment, payment or private-home access.

Face-to-face encounters support introductions, questions and capability-specific assistance discussion. Remote communication supports texts and simulated calls, including acceptance, refusal, deferral, clarification or ignoring. Structured social invitations support responses, attendance, conversation and leaving; private-home access and consent remain guarded. Available choices do not guarantee Muse will select them.

The strongest live examples are Grace and Maryam independently introducing themselves and joining an agreed public meeting; Musa voluntarily sharing his number after introductions; and Sadiq following Tunde's delivered workplace invitation. Sustained hangout dialogue, completed shared time and lasting friendship changes were not observed in those runs. An offline copy of the recorded meeting demonstrated that two synthetic turns and shared-time completion were executable; that establishes the mechanic, not what Muse actually chose. See the [meeting check](submission-readiness-2026-11-03.md) and [live interaction record](nov3-sustained-muse-live-evaluation.md).

## Economy and everyday life

The economy connects paid work, business funds, held wages, production inputs, stock, personal food and transport. Residents can take eligible work, earn on completion, buy and eat, collect supplies, stock the market or negotiate deliveries. Owners can place paid external orders from a finite source and fund businesses within validated rules. Movement, delivery timing, inventory transfer and payment execute through deterministic mechanics after an accepted choice.

In the sustained 200-response run, **64 completed jobs paid 103 coins**; eight unfinished jobs held 13 coins. Four orders delivered **20 external food units**. Thirteen purchase actions covered 16 portions; 13 were eaten and three remained carried. Money reconciled to the initial **555 coins** across resident balances, business balances, held wages and external payments. Supplier goods, market food, raw inputs and the finite external source also reconciled. Pending work and future output were not counted as finished. [Detailed economic audit](nov3-sustained-muse-live-evaluation.md).

This is a functioning bounded economy with unequal outcomes. In the same run, Sadiq obtained neither work nor food, and six residents ended with hunger at least 0.8, versus zero in the equivalent offline baseline. Aggregate production or income therefore does not establish personal wellbeing. Business funding, raw inputs and external supply remain finite; long-term replenishment and economic sustainability are unresolved. The [economic continuity design](economic-sustainability-and-recovery.md) provides further context.

## What Meta Muse has achieved

### Model and execution boundary

The resident provider uses **Muse Spark 1.3**, identifier **`muse-spark-1.3`**, through Meta Model API. Source also contains a `muse-wonder-1.0` pricing entry; that entry is not evidence of Wonder-powered residents or a completed Wonder evaluation. The live achievements cited here are Spark evidence. See the [provider](../server/inference/neighbourhood-provider.ts) and [local pricing catalogue](../server/inference/model-pricing.ts).

The execution loop is:

1. The scheduler identifies a resident decision opportunity.
2. The backend builds that resident's scoped observations, relevant context and permitted action schema.
3. Muse returns a structured proposed action and public explanation.
4. The authoritative validator checks the proposal against current capabilities, knowledge, location, consent, resources and commitments.
5. Deterministic mechanics execute accepted actions; relevant outcomes and rejection feedback inform later opportunities.

Muse chooses meaningful actions; it cannot directly rewrite world state. Rejected proposals do not receive their intended effects. Ordinary recoverable mistakes can lead to a new independent choice with private feedback, while serious failures stop inference. A public reason string is a model-authored explanation, not access to hidden reasoning or proof of causation. Scoped context and a matching offline comparison support careful evaluation, but do not prove general superiority over the offline policy. [Context management](model-context-management.md), [knowledge grounding](knowledge-grounding.md).

### Separate live evaluations on 3 November

These runs used fresh isolated states. Their conversations, timelines and totals must not be combined into one continuous society.

| Evaluation | Recorded outcome | What it establishes and where it stopped |
| --- | --- | --- |
| [Informed autonomy](milestone-7g-informed-autonomy-live-evaluation.md), `7g-informed-20261103T054118Z` | 94 responses; 93 accepted, one rejected; 246.25 simulated seconds | All 16 participated. Grace introduced herself to Maryam, invited her for 60 seconds at the Community Offices, and both independently joined. Both were already there. No socialise turn or completed meeting occurred before a capability-purpose rejection stopped the run. |
| [First continuity](nov3-first-continuity-live-evaluation.md), `7g-continuity-20261103T084357Z` | 55 responses from 56 attempts; all 55 accepted | Stopped on a 30-second token-preflight timeout. The pending request was preserved; the run was not automatically retried or resumed. |
| [Sustained society](nov3-sustained-muse-live-evaluation.md), `7g-continuity-followup-20261103T090800Z` | 200 responses; 198 accepted, two ordinary rejections; 513.25 simulated seconds | All 16 participated; zero provider failures. Independent replies, two directed contact grants, Sadiq's invitation-informed workplace visit and economic activity. Stopped at the generation ceiling, with no structured hangout or relationship-counter change. |
| [HTTP/browser reliability](nov3-http-browser-reliability.md), `7g-http-reliability-20261103T123036Z` | 64 responses; 63 accepted, one discarded at operator pause; 243.25 simulated seconds | All 16 participated; zero offline decision requests. Recorded 1,107 successful authoritative checkpoint replacements, refresh/reconnection and observer-free progression. Completed the bounded run; no relationship-counter changes. |

In the sustained run, Sadiq asked Tunde about repair work by text. Tunde independently invited him to the workshop. After receiving the reply, Sadiq chose travel explicitly “as invited,” arrived at 487.25 seconds and sent an arrival message at 489.5 seconds. No job was available, so the visit did not invent a work agreement or wage. Musa separately shared his own number with Sadiq and Grace; both contact grants survived offline restore verification.

The sustained run's reported usage gives an estimated **$1.823308** cost. The later browser run's estimate was **$0.550113**, including the discarded response. These are historical usage estimates recorded in the reports, not invoices, current price quotations or authorization for further calls. Worst-case retained spending reservations are separate from measured usage.

## Current local operation

The November 4 implementation makes **`npm run dev:live`** the persistent local Muse entry point. It builds and serves the existing interface with the authoritative backend, restoring the canonical operating society. Owner setup, configuration and explicit authorization use **`npm run muse:policy -- ...`**. Authorization is reusable until disabled, reconfigured or expired. Initialization and migration alone do not authorize inference.

The [local operation guide](local-live.md) is the setup authority. Its controls include persistent request, token and spending accounting; additional upstream ledger limits; one pending inference; a maximum six generations per minute; and explicit stop and pause controls. Existing deterministic movement and timers can continue after inference is disabled until the society is paused. Provider failures and serious validation failures stop inference and pause the society without automatic retries or silent mock substitution.

Refresh reconnects to the authoritative world. Backend restart restores residents, memories, communications, work, inventory, economic state, history and pause state. Persistent mode disallows Reset. Legacy operating saves receive guarded migration and rollback copies; dedicated evaluation worlds are not adopted as the operating town. Restart or policy changes do not erase lifetime spending history.

**`npm run backend`** remains explicit offline Mock development, using its own checkpoint. Offline policies can exercise navigation, work, food, communication and delivery without provider calls. Bounded `society:evaluate`, `backend:society` and legacy live evaluation paths retain their separate approvals. The November 3 browser evidence validates that earlier bounded live configuration; it does not constitute a fresh live evaluation of the November 4 launcher. No claim is made here about whether the current local policy is enabled, the backend is running or provider credits remain available.

## Verification, limitations and next priorities

### Dated verification record

| Checkpoint | Reported checks | Interpretation |
| --- | --- | --- |
| [November 3 society validation](nov3-autonomous-society-validation.md) | 402/402 offline tests across 30 files; typechecks and build passed; offline 1,800-second rehearsal | Green at that earlier source revision; synthetic/offline outcomes are separate from Muse evidence. |
| [November 3 HTTP reliability](nov3-http-browser-reliability.md) | 409 tests across 32 files; typechecks and build passed; completed real 64-response browser run | Bounded local persistence and live integration evidence, including recovery from genuine Windows file contention. |
| [Later November 3 integrated acceptance](nov3-integrated-acceptance.md) | Build passed; 129 focused integration tests and a 53-test map/phone/neighbourhood rerun passed; isolated soak and society rehearsal passed | Conditional acceptance. Broad full-suite attempts had unresolved timeouts and were not green. No new live Muse run; the operating save's progression allowance was exhausted. |
| [November 3 visual refinement](unity-gardens-visual-refinement.md) | Build/typechecks and 66 focused tests passed; final planting check passed; 22 place inspectors and all 16 residents checked | Presentation evidence from local mode; mobile checks were viewport emulation. |
| [November 4 persistent operation](local-live.md) | Source and integration fixtures cover authorization, persistence, migration, limits, authentication and stop controls | New operating implementation with synthetic-provider tests. The guide gives verification commands but no dated full-suite pass total; none is inferred here. |

The large production JavaScript bundle remains a build advisory. Physical mobile devices, low-end GPUs, prolonged GPU stress and public hosting have not been established by these checks. A successful bounded run does not eliminate provider timeout risk or Windows checkpoint contention. Historical architecture documents may describe retired Taxi Lab stages; current source and the local operation guide take precedence for present behavior.

### Priorities from here

1. **Validate the current persistent operating path.** Preserve the society and accounting, run appropriate offline checks, and use a separately authorized bounded live session to assess restart continuity and independent choices under the November 4 launcher.
2. **Observe deeper social consequences.** Measure voluntary conversation after attendance, completed shared time, departures and later interactions. Retain refusal, privacy and consent; do not force a target friendship or rewrite silence as conversation.
3. **Improve everyday endurance.** Investigate work/food/rest tradeoffs, unequal access, replenishment and finite business funding. Compare completed outcomes at matching simulated times rather than assuming more distinct model actions mean better results.
4. **Strengthen reliability evidence.** Resolve broad-suite timing failures, continue provider and checkpoint failure verification, and expand device/performance checks before making broader operating claims.
5. **Finish publication and submission checks.** The [accepted local demo](nov3-http-browser-reliability.md) is a verified 2:59 silent video of actual bounded live-browser footage. Video upload/visibility, current portal requirements and final submission remain separate verification tasks. No public live backend or completed submission is established by that report.

Governance, community organisation, generations and richer long-term relationships remain future ambitions. Starting history creates no elected leader, residents' association, election or compulsory social outcome. Weather and time-of-day systems are not claimed as completed features.

### How to maintain this reference

Keep this dated snapshot intact; create a new dated status for later milestones. Attach new claims to a source revision and a dated evaluation, distinguishing implemented mechanics, observed live choices and proposed work. This document update makes no API, schema or runtime changes and performs no live inference, operating-state changes, deployment or publication.
