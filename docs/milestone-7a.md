# Milestone 7A: extensible residents and autonomous face-to-face encounters

Implemented and verified offline on October 30, 2026. This extends the existing world, validation/execution, scheduling, persistence and Three.js architecture. No live Meta inference, commit, push, deployment or repository rename was performed. Phone calls, messaging, governance and families remain outside this milestone.

## Implementation

| System | Changes |
| --- | --- |
| Resident creation/registry | Runtime membership comes from the world's validated `npcs` map. Constructor seeds and atomic `addResident()` support new IDs. A separate safety ceiling of 32 residents accommodates the approximately sixteen-person target. Reserved/prototype IDs and duplicate admission fail before mutation |
| Original residents | Musa, Amina and Zainab remain required compatibility identities, with their original profiles and policies. Explicit legacy seeds preserve the three-resident supply demonstration and controlled autonomy setup. The normal town has four residents |
| Chris | A repair apprentice/courier seeking income, renting near Hill Garden, starting an errand at the supply desk. Chris knows Musa from a taxi ride, has not met Amina, has distinct goals/priorities and an initial relationship record. Circumstances and initial identity have personal event-derived memories |
| Scheduling | Both schedulers iterate actual registry IDs. Capability/need-based mock policies replace character-ID branching. Round-robin fairness, triggers, cooldowns and one request in flight remain |
| Task ownership | Different validated requesters/recipients can own simultaneous transport jobs. Per-resident commitment limits replace global single-job assumptions. Stock reservations, carrying capacity, ownership and goods/rewards accounting remain authoritative |
| Movement | Mobility is explicit rather than inferred from an ID. Walking couriers and the existing taxi reuse the same graph/executor |
| Knowledge | Unknown nearby residents expose an opaque ID, activity and null identity. Introductions disclose the speaker's public name/occupation and offered transport service. Knowing a name alone does not reveal private capabilities. Private goals, needs, home, inventory and memories are not shared automatically |
| Social state | Noticed encounters, optional invitations, independent recipient responses, expiry and pair cooldowns persist in world state. Reports and memory sharing retain their provenance; conversation acceptance creates neither a transport commitment nor friendship |
| Snapshots/recovery | Version-two worlds retain the existing state model. Version-one migration preserves original activity, inventory, memories, relationships, task ownership, intentions and accounting IDs. Normal server recovery creates an exclusive `.v1-backup` before adding Chris to a legacy operator world. Ledger/session spending history is retained |
| Browser | Roster, models, markers, names, selection and task labels follow the public frame. Original silhouettes/taxi remain; new IDs receive procedural models. Geometry, including selection rings, is shared. A resident card shows its latest encounter outcome, and event inspection includes retained encounters and history |
| Headless runner | `HeadlessTownRunner` advances the same default world, policy and scheduler with pause/resume, concurrency protection and positive bounded advancement up to 3,600 seconds. No timers, live provider or credential loading are available through this runner |

No existing operator runtime checkpoint or Meta ledger was modified during verification. Browser checks used an isolated ignored checkpoint and mock-only local server.

## Encounter and authority contract

Actual co-location and available activities can produce a noticed event and a decision opportunity. Noticing does not start a conversation or establish identity. Initiators choose whether to introduce themselves, ask a question or request a discussion about assistance. Travel and non-preemptive work prevent initiation. Changed proximity/activity is rechecked before a response.

The recipient receives its own trigger and scoped observation and independently chooses acceptance, refusal, deferral, clarification or no response. The mock policy uses food/income needs, accepted commitments, known services and verified relationship history; explicit fixture options exercise alternative outcomes. Goals, priorities, memories and environmental observations also remain available to the existing Meta decision interface.

Invitations expire after 90 simulated seconds. Symmetric pair cooldowns last 300 seconds; a resident can have only one pending encounter. Continuous co-location does not repeatedly generate notices. Invalid/stale/duplicate actions may consume a request and create audit events, but cannot change gameplay state. Interaction records cap at 128; an NPC sees its latest eight, and the browser sees sixteen summaries.

Accepted discussion establishes willingness to talk. A requester must still propose a transport job, the recipient must separately accept it, stock must be reserved, and physical collection/delivery must execute. No conversation statement transfers goods or completes a task. Successful delivery updates the existing verified-job relationship count once; conversation does not invent trust or friendship. Existing `share` actions exchange only the speaker's retained memory, as an attributed report or belief.

Offline speech uses clearly labelled short templates, with decisions based on separate observations. This proves independent decision/execution mechanics and counterfactual outcomes, not natural-language understanding or successful live-model reasoning. The executor contains no required character pairing or story sequence. Ignoring social opportunities retains the original Musa supply outcome; hungry or committed recipients can defer.

## Complete autonomous consequence

With no player commands or world-state patch, the normal four-person headless town produces this default offline trace:

| Time | Validated event | Consequence |
| --- | --- | --- |
| 0.75 s | Chris chooses travel to the market | Graph movement |
| 20.25 s | Amina invites unfamiliar Chris to discuss supply work | Chris hears Amina's introduction; invitation pending |
| 60 s | Chris independently accepts discussion | Amina learns Chris's identity/disclosed transport service; no job exists |
| 60.25 s | Amina proposes two-unit transport | Proposed task; no physical stock movement |
| 80 s | Chris independently accepts the job | Two units reserved; commitment recorded |
| 100 s | Chris chooses fulfilment | Travel to supplier |
| 110 s | Chris collects | Supplier eight → six; cargo two |
| 120 s | Chris delivers | Goods enter market; one reward and verified relationship evidence |
| Subsequent observation | Amina checks receipt | Personal task knowledge and relationship outcome update once |

Zainab independently buys one portion. At 240 simulated seconds: supplier six, market two, Zainab one carried good, Chris one reward, total goods nine. The accepted encounter, delivered task, memories and relationship consequences survive save/load.

The normal browser clock has slightly different tick ordering: its verified invitation occurred at 21 seconds and discussion acceptance at 61. These are actual execution times, not a scripted animation or a claim that different clock drivers have identical schedules.

## Bounded headless operation and cost limits

```sh
npm run town:headless -- --seconds=240
```

This creates/resumes `runtime/town-headless.json`, advances a finite amount, saves atomically and exits. An exclusive companion lock prevents concurrent CLI ownership; crashes leave a lock for operator review. It never opens the normal backend checkpoint, loads `.env`, accesses the Meta ledger or sends provider HTTP requests. The verified CLI run advanced 240 seconds with sixteen offline decisions and the delivery above.

The runner retains a 24-decision episode allowance and six decisions per simulated minute; repeated advances on that runner do not reset its count. A new process gets a new **offline** episode allowance, not billing authorization. The world persists, but standalone scheduler cursor/cooldowns are not yet a durable unattended operating policy.

The existing HTTP clock **still stops without an authenticated SSE observer**. This milestone supplies the smallest compatible controlled headless driver, without making the service run indefinitely after disconnect. Service lifecycle ownership, durable scheduling, history rotation and an approved continuous live budget remain future work. There is no thirty-day stability claim.

Live Meta requests and all conversations retain wall-clock throttles, the 48-request session ceiling, one generation in flight, plan/allowance validation, persistent reservations, token limits and no retry/fallback. Encounter schemas have not been live-tested. Autonomous deterministic **mock** routines use six-per-simulated-minute scheduling and twenty-second resident cooldowns instead of the paid-generation wall-clock throttle, preventing premature invitation expiry at accelerated browser speeds. They still consume the bounded session allowance. This path is gated by mock mode and cannot authorize a live request. Routine counters persist; reset retains request/spending history and wall cooldowns, while simulation cooldowns are scoped to the world.

## Verification

| Check | Result |
| --- | --- |
| Offline regression | **199 tests pass in ten files**: previous 170 plus 29 town cases |
| Original functionality | Three-resident supply cooperation/refusal/self-collection/waiting and original taxi fixtures remain covered |
| Extensibility | Arbitrary fifth ID schedules, projects, renders and restores; synthetic sixteen-resident registry schedules fairly and restores; two concurrent requesters/transport owners execute jobs |
| Independent choices | Both initiation directions, acquaintances/strangers, acceptance/refusal/deferral/clarification, need/commitment-driven deferral, ignored invitation expiry and no-interaction policy |
| Authority/privacy | Invalid IDs/extra fields/wrong responders/busy or distant recipients, duplicate responses/jobs, scoped service knowledge, rejected-action gameplay equality and conserved resources |
| Recovery | Unanswered encounter and completed social/economic outcomes, expanded server histories/accounting, legacy backup/migration and corrupt checkpoint rejection |
| Static/build | Both TypeScript configurations and production build pass. Existing chunk warning remains: shared renderer/routes about 565 kB minified / 143 kB gzip; neighbourhood about 61 kB / 18 kB gzip |
| Built normal browser | Four roster entries and four markers; Chris selectable; accepted Amina→Chris encounter, delivered two-unit job, Chris reward and Zainab purchase verified |
| Browser durability | Paused world/time/outcome survive refresh and actual verification-server restart |
| Responsive checks | 1280×720 resident card does not overlap status bar; 390×844 document width is 390; one canvas; no JavaScript page errors |
| Browser taxi lab | A completes at overlook, B at market, C completes closure/detour at overlook |
| Network | Mock only; no Meta calls. Expected initial unauthorized `/api/session` 401 is logged; no application exception observed |

Ignored screenshots: `output/playwright/milestone7a-desktop.png`, `milestone7a-mobile.png`, `milestone7a-taxi-detour.png`. Installed Chrome was exercised through Playwright. Viewport emulation is not a physical phone or long-duration benchmark. Disk-heavy durable-session tests use bounded early exit after the required outcome and fifteen-second timeouts; assertions are retained.

## Remaining scaling assumptions and recommendation

- Original three compatibility identities/profile checks remain mandatory. Resident removal and mutable legacy profiles are not implemented. Population size, runtime recipient IDs, scheduling, task ownership and presentation are extensible.
- One shared market/supply desk, a small graph, generic goods, symbolic rewards and one rendered taxi remain. Walking couriers and multiple task owners work. Separate businesses, wages, recurring consumption/production and need growth are later economy work.
- Safety bounds remain: 32 residents, 64 tasks, 128 encounters, 24 memories per resident, bounded events and finite decision/receipt allowances. Limits fail closed; no history/spending is silently cleared. There is no full history archive or arbitrary replay.
- Introductions exchange identity/disclosed transport service, not phone contacts. Prose is attributed speech and not fully checked for semantic truth. Rich negotiation and new communication channels remain future work.
- Four authored residents are visually verified. Synthetic larger registries establish structural support, not sixteen distinct product residents or a sixteen-moving-resident performance benchmark. Real-device, long-run and disk-endurance work remains.

**Recommend Milestone 7B focus on broader functioning population, first eight and then approximately sixteen, with additional personal/resource opportunities and routines.** Use these registry/encounter contracts unchanged. Add distinct starting circumstances and generalize business/resource ownership before competing livelihoods; avoid display-only residents. Keep operation bounded/offline while scaling. A small explicit backend/headless lifecycle integration can accompany that work, while continuous unattended inference needs its own persistent scheduling/history/cost policy. Phone/text communication can follow the larger resident/resource loop; autonomous social consequences already work without them.
