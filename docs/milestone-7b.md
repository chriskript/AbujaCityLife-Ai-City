# Milestone 7B: sixteen residents, personal routines and a connected resource economy

Implemented offline on October 30, 2026, following the accepted AI Town direction. Eight residents were validated before enabling the sixteen-resident default. This extends the existing registry, authoritative executor, activities, scheduler, observations, memories, transport and Three.js presentation. No live Meta generation, commit, push, deployment or repository rename was performed.

## What is integrated

The normal server, local browser adapter, headless runner and CLI now create the same sixteen-resident town. The original three-person supply demonstration, controlled autonomy fixture and four-person 7A regression fixtures remain explicit compatibility configurations. They share the engine and validation rather than a separate experimental implementation.

| Area | Extension |
| --- | --- |
| Population | Sixteen distinct seed profiles, with homes, current circumstances, ambitions, knowledge, contacts, starting credits, needs, skills and social preferences. Registry safety ceiling remains 32; behavior does not branch on resident IDs |
| Personal routines | Food, fatigue and income pressure change on sixty-second simulated boundaries. Residents choose work, food, rest, travel, waiting and optional encounters according to their own situation. Existing travel/work execution remains deterministic |
| Paid work | Eight business/work definitions with ownership, staff, skills, locations, posted wages, durations, funded balances and limited simultaneous openings. Acceptance reserves the wage and any inputs; physical completion pays once |
| Supply production | Qualified workers at the cooperative convert finite inputs into supplier goods. Production shares the existing supplier inventory and has a capacity bound. It does not silently regenerate stock |
| Trade and meals | Purchases debit the buyer, credit the owner and fund stall work. Buying creates carried food; eating is a separate validated action that removes goods and reduces hunger. Supplier supplies and delivery cargo are not edible personal food |
| Transport | Existing offers, acceptance, reservations and physical delivery remain. New jobs reserve two demo credits from the requester on acceptance and pay the carrier on completed delivery. Old tasks retain their previous terms |
| Ownership | Business owners/staff are explicit data. Unrelated residents cannot change market sales simply by possessing a capability. Any appropriately skilled resident can seek a posted funded opening |
| Social interaction | Existing optional invitations and independent responses continue alongside livelihood decisions. Work commitments, hunger and fatigue can lead to deferral; a resident can accept transport to help restore a food source they personally observed empty |
| Recovery | Version-three snapshots validate credits, wage/payment escrows, food tags, production inputs, business references, bookings and goods conservation. Existing worlds upgrade with rollback copies; expansion preserves existing work, money, needs, inventory, relationships and history |
| Presentation | Dynamic roster supports all sixteen residents. Cards show demo-credit balances and carried food; activity labels identify actual paid work and rest. Purchases, wages, production, meals and delivery payments appear in history. Existing geometry and inventory props are reused |

## Starting population

These are starting conditions, not required outcomes or permanent behavioral sequences. Original names, occupations and goals remain intact. Locations are anchors in the existing small graph, representing homes/work areas nearby rather than modeled interiors.

| Resident | Starting role | Personal credits | Home / principal work area |
| --- | --- | --- | --- |
| Musa | Taxi driver | 10 | Stand / transport opportunities |
| Amina | Market trader | 24 | Market / stall |
| Zainab | Local resident | 6 | Centre / local errands |
| Chris | Repair apprentice and supply courier | 4 | Hill / stand workshop |
| Fatima | Community nurse | 14 | Centre / care desk |
| Tunde | Mechanic and workshop owner | 22 | Stand / workshop |
| Halima | Supply cooperative organiser | 12 | Centre / cooperative |
| Ibrahim | Grower and supply worker | 3 | Hill / cooperative |
| Yusuf | Tutor | 9 | Centre / learning desk |
| Ngozi | Market assistant and cook | 5 | Market / stall work and restocking |
| Emeka | Electrical repair worker | 13 | Stand / electrical repair desk |
| Grace | Student and occasional helper | 2 | Hill / general errands |
| Ladi | Walking courier | 4 | Market / transport and errands |
| Sadiq | Repair apprentice | 1 | Stand / workshop |
| Maryam | Bookkeeper | 18 | Centre / general community work |
| Bisi | Tailor | 8 | Market / tailoring desk |

Profiles also differ in initial hunger/fatigue/income pressure, known people, personal ambitions and willingness to engage socially. For example, Fatima starts tired, Sadiq lacks the two credits needed for a meal, and Grace has just enough for one. Maryam has savings and no authored leadership role. Existing personal memories remain; new circumstances and work-rule knowledge have event evidence. Introductions still do not create friendship or instant trust.

## Consistent world rules

Demo credits are an abstract simulation ledger. The sixteen-resident seed has **555 credits** across residents and funded businesses. Food costs two credits; one goes to the owner and one funds stall work. An owner taking their own food transfers no credits. Posted work pays one or two credits over 45–90 simulated seconds. Ordinary `work` timers generate no wages.

The cooperative starts with **96 finite input units**. A production booking reserves two inputs and two credits, then deposits two supply units and pays its worker on completion. Supplier capacity is 24 including reserved production output. These rules preserve:

```
current goods + consumed food = original goods + completed production
resident credits + business credits + held wages + delivery escrow = initial credits
remaining inputs + inputs in active work + completed production = original inputs
```

Individual activities, not occupations alone, determine effects. A repair/care/teaching job models funded, skilled time at a place; it does not implement vehicle damage, clinical treatment or a curriculum. Work budgets represent finite funded orders. There is no hidden demand generator or automatic treasury refill.

Residents see their own balances, skills, needs and commitments. Work postings are limited to their established knowledge and local discovery. Remote availability is unknown or timestamped history. Current vacancies and vendor availability are visible locally; another resident's wallet, private needs and business balance are not included in NPC observations. Business receipts and a resident's own account movements are authoritative personal economic evidence. Browser operator projections are separate from NPC inference contexts.

Goods remain physically transferred through existing collection, stocking and delivery actions. `inventory.food` tags the purchased subset of carried goods; it is not a second stock pool. A courier cannot eat held cargo. Market staff can independently restock using the same two-unit self-carry limit or request transport, capped at six units. Request size can reflect locally observed demand and last-observed supply without becoming a promise of current availability.

Bounded rest cannot be restarted by incidental encounter notices or minute-based need triggers. A resting vendor cannot serve another buyer. Rest benefits scale with validated duration. Paid work remains non-preemptive so a new proposal cannot destroy a reserved wage/input booking. Unanswered encounters, refusals and shortages remain legitimate outcomes.

## Validation gates and observed consequences

| Gate | Observed result |
| --- | --- |
| Original foundations | The previous 199 regression tests pass with explicit original fixture configurations |
| Eight residents, twenty simulated minutes | All eight acted; 22 supply units produced, 17 meals consumed and four paid deliveries completed. No rejected proposals; recovery and conservation checked throughout |
| Sixteen residents, twenty simulated minutes | All sixteen acted and ate; fourteen completed paid work, four deliveries completed and 22 encounter discussions were accepted. 40 units produced, 35 meals consumed, 641 offline decisions and no rejected proposals in this configured run |
| Financial consequences | Residents ended with different balances; the owner received sales income, workers earned held wages, couriers received delivery payments and buyers spent credits on actual food |
| CLI expansion/recovery | An isolated CLI checkpoint advanced eight residents to 120 seconds, then expanded to sixteen and continued to 240 seconds. The old task remained delivered; work/input/credit state was retained and a rollback copy saved |
| Full suite | **232 tests pass across eleven files**, including 33 new population/economy cases |
| Static/build | Both TypeScript configurations and production build pass; existing large shared-chunk warning remains |

The tests cover reservations and completion after recovery, duplicate payment protection, food/supply separation, blocked cargo, unaffordable/unfunded/unskilled/remote work, sales ownership, private observation scoping, invalid-action state equality, corrupted snapshots, population growth, normal session accounting, pause/restart and local/headless parity. Full ledger invariants are checked at intervals during the longer runs. These are deterministic offline policy results, not live-model reasoning evidence.

## Browser verification

Installed Chrome exercised the **production build and normal sixteen-resident backend** with an isolated mock checkpoint. All sixteen residents and markers appeared, every roster entry selected the correct card, and balances and actual work labels were visible. The browser independently produced supplies, consumed meals and completed paid deliveries. At the first captured pause (638 simulated seconds), it had produced 26 units, consumed 19 meals and completed three deliveries. Its clock ordering differs from the headless driver, so exact trajectories are not asserted equal across different tick schedules.

Paused refresh preserved time and economic state. At 1280×720, the card did not overlap the status bar. At 390×844, document width remained 390; the long roster scrolls within its own container. No JavaScript page errors were observed. The expected initial unauthenticated `/api/session` 401 remains in the console. Original taxi journeys A, B and C all completed at their expected destinations, including closure/detour.

Short desktop frame samples were approximately **45–48 FPS** on this machine while other verification was running. Large-body/cargo shadows were retained while small-part shadow draws were removed. A sustained improvement is not claimed from those short samples. Physical-phone performance and dense marker layouts still need further measurement. Static geometry/material reuse remains, and simulation advancement never occurs in the render loop for the remote session.

Production chunks are approximately 565 kB minified / 144 kB gzip for shared renderer/routes and 91 kB / 26 kB gzip for the neighbourhood. No dependency or external asset was added. Screenshots are ignored artifacts under `output/playwright/`: `milestone7b-desktop.png`, `milestone7b-mobile.png` and `milestone7b-taxi-detour.png`.

## Operation, migration and budget safeguards

```sh
npm run town:headless -- --seconds=1200
npm run town:headless -- --population=8 --seconds=240
```

The default is sixteen residents. `--population` selects an initial/growth target; requesting eight does not remove existing residents from a larger saved world. The CLI creates/resumes `runtime/town-headless.json`, holds an exclusive lock, advances at most 3,600 seconds per invocation, saves atomically and exits. It uses the same configured world and offline policy as the browser. The normal browser uses its existing authoritative server checkpoint; these files are deliberately not concurrently owned by separate processes.

Opening an older normal server world or growing an eight-person town creates a `.pre-7b-backup` before applying the upgrade. Existing credit/input/work state is preserved; only new residents and new funded businesses add declared starting assets. The eight-to-sixteen increase adds 180 initial credits and does not refill the original businesses or raw inputs. Corrupt checkpoints fail closed. In-flight inference tokens do not survive recovery. Original three/four-person fixtures remain available through explicit seed/options configuration.

Offline town routines have a **separate persisted 2,048-decision session allowance**, with at most 48 decisions per simulated minute and twenty-second resident cooldowns. Reset preserves that allowance consumption. A headless runner instance also has a bounded episode allowance; a new offline process starts a new episode while keeping world assets and history. Primitive time/ID reads avoid repeatedly cloning the whole world during scheduling.

All conversations and live generation retain the original wall-clock limits, 48-request accounting ceiling, one generation in flight, plan validation, persistent spending reservations, token caps, failure handling and no automatic retry/fallback. Increasing the free routine allowance cannot increase a live inference allowance. The new action schemas/instructions have only offline coverage; any Meta evaluation still requires separate approval. No operating checkpoint, access credential, approval plan or Meta ledger was changed during development verification; CLI checks used an isolated working directory.

## Remaining limits and next step

This is a functioning bounded prototype, not a thirty-day stability result. The HTTP clock still depends on an authenticated observer; the controlled headless path advances independently. Continuous shared-server progression, durable scheduler cursor/history archival and long-run operating policies remain unfinished. Existing event, encounter, task and receipt retention limits remain. Finite work budgets and inputs can run out; they are not reset to manufacture activity.

The town still uses the existing small graph, one abstract supplier/market goods chain and one rendered taxi. Homes and business desks share those anchors. There are eight owned funded work definitions, rather than a complete multi-product economy. Original compatibility profile checks remain; NPC-generated long-term ambitions, mutable careers, player possession, phones/texts, elections, families and generations are future work. Population membership is registry-driven with a separate safety ceiling of 32; authoring additional seed data or work definitions does not require another scheduler/renderer rewrite.

**Recommended next milestone: bounded unattended progression in the authoritative server, paired with one clear road-closure demonstration and persistent economic consequences.** Reuse the existing road validation and show affected commuters, delayed deliveries/escrow, stock availability and memories while other residents continue. Keep live inference separately gated. This will strengthen the observe/leave/return experience before adding more communication channels or long-horizon systems.
