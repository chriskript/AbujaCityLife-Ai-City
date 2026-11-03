# Unity Gardens integrated acceptance — 3 November 2026

**Verdict: conditional acceptance.** The production rendering, persistent layout migration, desktop/mobile viewport interactions and focused integration checks pass. No confirmed product regression required a code change. Fresh live Muse behavior is **not accepted by this review**: no valid existing authorization was available. The attempted full automated suite was stopped after repeated timeouts and is not a green full-suite result.

Reviewed local commit `811b736` (Unity Gardens redesign and Taxi Lab retirement). No reset, new experimental slice, new authorization, paid provider call, commit, push or deployment was performed.

## Existing persistent society and backend

There was no listener on port 8787. The empty checkpoint lock dated 31 October was archived, the original checkpoint was backed up, and the backend was started from the current production build on loopback port 8787 in its configured mock mode. This was not a conversion or resumption of an approved live society checkpoint. The production frontend authenticated through the ordinary token form; credentials were not put in URLs or public evidence.

- Same world: `server-372fba14-3524-4fe3-bf9e-1c14a19a46c1`.
- Same session: `33bf3d1a-581d-4413-a808-e26e2f155ab8`.
- Same simulated time: **1,374.25 seconds**; layout revision **1 → 2**.
- All **16** residents retained their inventories, balances, memories, relationships and node locations. Resources, business state, social exchanges, phone history, events, roads and task outcomes compare equal before/after startup.
- Eight transport tasks retained: six delivered and two declined. Historical deliveries were not executed or paid again.
- Ladi's active route retained its edge/node IDs, step **5** and current-leg progress **80**. Total distance changed **260.1370849898476 → 268.1370849898476**, exactly the civic connector's eight-metre correction. Other activity changes match the existing restore migrations.
- The older save also received the existing social-context/economic-continuity initialization and owner funding/import capabilities. These are existing restore behavior; no money, stock or history was rewritten to manufacture activity.
- Inference request count, live-plan consumption and progression consumption remained unchanged. Original receipts/history/metrics were preserved. Browser controls added session sequence updates and a rejected-resume receipt; they did not advance the world.

The operating save had already consumed **1,800/1,800** background progression seconds. Resume was explicitly tested and returned HTTP **429**, “Controlled advancement or decision allowance exhausted; reset and restart do not replenish it”. Refresh retained the world/time and paused state. The backend is left available and paused. The allowance was not replenished or bypassed. Consequently this review does not claim fresh autonomous movement or economic outcomes in the operating save.

Private before/after checkpoints and the initial exact-comparison result are under ignored `output/playwright/integrated-acceptance/`. The migration comparison was made before browser control commands; rerunning that comparison against the later checkpoint must allow the added command receipt and sequence changes.

## Actual rendered neighbourhood

The reviewer inspected newly captured production-backend images, including an overview and a close view of the market, supply depot, workshops, green and lake. This was not solely an assertion over map coordinates.

- Buildings occupy distinct plots with visible approaches; the market, depot and workshops sit clear of the street surfaces and pedestrian approaches.
- The road hierarchy, connected junctions, crossing markings and pale pedestrian routes are legible. The market green has intersecting paths and benches; the lake has a defined bank and shelter. Planting frames the streets and public spaces without visibly obstructing the reviewed entrances.
- The existing taxi and outdoor residents render in the restored society. Indoor occupants are represented in place inspection rather than appearing as outdoor avatars.
- No visible building/road intersection, blocked entrance, tree through a reviewed path, or isolated public-space approach was found in the inspected views. The shared spatial/reachability tests also pass.

Screenshots: [desktop overview](../output/playwright/integrated-acceptance/desktop-overview.png), [market and public-space close view](../output/playwright/integrated-acceptance/market-close.png), [market inspector](../output/playwright/integrated-acceptance/desktop-market.png), [activity](../output/playwright/integrated-acceptance/desktop-activity.png), [phone](../output/playwright/integrated-acceptance/desktop-phone.png), [acquired phone control](../output/playwright/integrated-acceptance/desktop-control.png).

The overview intentionally leaves generous surrounding space, especially on tall mobile screens. Detailed inspection uses focus/zoom. Crossings remain visual wayfinding: traffic yielding, collision physics and persistent parked vehicles are outside the current implementation. This review is sampled visual inspection, not exhaustive occlusion checking from every camera angle.

## Taxi Lab removal and retained mechanics

The production entry point exposes Unity Gardens alone. Source search found Taxi Lab references only in historical documentation, which is marked as historical. The retained town taxi, shared navigation and spending ledger are not removed with the old standalone experience. Type checking and the production build resolve the shared dependencies successfully.

Planning checks cover all destinations reachable on foot, building access to the road network, a detour when the supply-market edge is closed, graph junctions, and driver walking speed/pose on pedestrian access. Backend, communication, population-economy and town-phone checks exercise validated offers, acceptance/refusal, delayed messages, contacts, paid delivery completion, food, wages, privacy, control leases and persistence. These tests are offline contracts, not fresh Muse decisions.

The isolated 20-minute simulated town soak passed in **14.59 seconds**: all 16 residents acted and ate; at least five workplaces operated; communication and paid delivery occurred; conservation and repeated restore checks passed. This is a fresh deterministic test world, not the capped operating save and not a substitute live evaluation.

## Browser interactions

Production Chromium at **1440×1000**, with the authenticated backend:

- Selected all 16 residents; searched/selecting Musa reduced the resident list to one.
- Opened phones, switched Chats/Calls/Contacts, inspected existing history and contacts, acquired/released phone control, and closed with Escape. Focus returned to Open phone.
- Inspected Market Square, used zoom and town overview, and exercised all four activity filters.
- Refreshed/reconnected to the same persistent world/time. Resume respected the exhausted allowance.
- No JavaScript page error was observed during the recorded final interaction sequence. Console HTTP errors were the expected pre-login 401 and rejected-resume 429, not renderer failures.

**Simulated mobile viewport testing only:** Chromium resized to **390×844** and **320×640**, resident search/selection, phone tabs, Escape, overview and panel layout. Document width/height equaled viewport width/height; no page overflow. Phone bounds were `(8,8,374.4,828)` and `(8,8,304,624)` respectively. No physical phone, native mobile browser, real touch/pinch, mobile GPU or device-performance claim is made.

Screenshots: [390 overview](../output/playwright/integrated-acceptance/mobile-390-overview.png), [390 resident](../output/playwright/integrated-acceptance/mobile-390-resident.png), [390 phone](../output/playwright/integrated-acceptance/mobile-390-phone.png), [320 overview](../output/playwright/integrated-acceptance/mobile-320-overview.png), [320 phone](../output/playwright/integrated-acceptance/mobile-320-phone.png).

## Muse authorization and test results

All **ten** stored approval plans were expired at review time (3 November, approximately 17:13–17:30 Lagos). The latest HTTP reliability window ended at **13:50:36 Lagos**. No new plan, claim, budget allowance or ledger was created; no old live run was resumed. **Zero live provider calls.** Current Muse autonomy, language quality and sustained social/economic choices therefore remain unverified after the redesign. Earlier live evidence remains historical evidence only.

- `npm.cmd run build`: **pass**, including both TypeScript projects. Vite reports a **789.07 kB** minified JavaScript chunk (**206.41 kB gzip**); no performance guarantee is inferred.
- Focused integration run: **129 passed, zero failed**, across eight files: backend, browser simulation, communication, HTTP autonomy continuity, neighbourhood presentation, population economy, server progression and town planning. [Machine-readable results](../output/playwright/integrated-acceptance/targeted-tests.json).
- Isolated distributed town soak: **1 passed**, 14 skipped by the name filter; original 25-second timeout retained.
- Map/phone and neighbourhood rerun: **53 passed, zero failed**, including the original soak and memory-bound tests with their unchanged timeouts. [Results](../output/playwright/integrated-acceptance/map-memory-tests.json).
- Isolated entire 200-attempt society rehearsal: **1 passed**, 10 skipped by the name filter. This uses synthetic offline provider responses and checks all 16 residents, scopes, reservations, persistence and the generation stop; it is not a real Muse evaluation. [Results](../output/playwright/integrated-acceptance/society-isolated.json).
- Broad full-suite attempt: stopped after timeouts in the 200-decision society rehearsal, HTTP 503 drain, phase C/D rehearsals and economic recovery. A concurrent focused attempt also timed out in the town soak and memory-bound test (**81 passed, 2 timeout failures**). These runs are **not green** and are not counted as successful full-suite acceptance. The 200-attempt rehearsal, soak and memory-bound test subsequently passed in the isolated reruns above. The other broad-run timeouts were not individually rerun; their timing reliability remains unresolved.

Remaining acceptance limits: no newly authorized live Muse run, no fresh progression in the capped operating society, no physical mobile device, no completed green full-suite run, and no prolonged GPU/performance soak. No confirmed integration regression was concealed by changing test thresholds or application limits.
