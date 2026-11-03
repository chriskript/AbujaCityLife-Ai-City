# Unity Gardens neighbourhood redesign

Implemented locally on 3 November 2026. Baseline: `1dc22cf`. The redesign is the normal `town-v1` experience, with no feature flag or alternate town required.

## Spatial plan

Unity Gardens retains all 16 residents, 20 dwellings (four vacant flats), 16 registered buildings and eight business sites. Acacia Lane and Centre Gardens form the residential courts; Market Square and the workshops form the commercial area; the community, care and learning buildings form the civic area. The supply forecourt and taxi waiting court support transport. The green, Hill Garden and lakeside remain connected public destinations.

The shared map now contains 68 nodes and 75 edges: 29 roads, 20 outdoor access paths and 26 indoor connections. Acacia has a second road exit. Primary streets have eight-metre carriageways; residential streets have six-metre carriageways, with 2.5-metre sidewalks. Crossing markings stop before junctions. Three-metre building setbacks reserve space for approaches and landscaping.

The market hall, supply depot, electrical workshop and community centre were repositioned to clear roads and sidewalks. The civic entrance's zero-length connector is now an eight-metre approach. Market and supply gates connect public receiving points to their buildings. Doorstep paths follow registered entrances; house fences leave the entrance side open.

`shared/world/town-planning.ts` owns water bounds, clearances, road widths and the positions of stalls, benches and visible stock. Deterministic planting excludes buildings, access corridors and water. The renderer reuses those definitions and batches static geometry by material. Roof solar panels, planted plots, a lake bank, waterfront shelter and taxi shelter add environmental detail. Town daylight exposure is moderated for clearer materials, and the sun shadow camera covers the expanded neighbourhood.

Drivers travel at vehicle speed on roads and at walking speed on pedestrian and indoor legs. Walking residents receive a sidewalk offset only on road segments. A driver walking an access leg is shown carrying their parcel. The existing taxi remains the sole simulated vehicle; there is no new traffic fleet.

## Interface

The town opens as a full overview. Residents, Places and Activity open independent, dismissible panels. Residents can be searched by name; selecting a building or public destination opens a contextual inspector. Activity filters cover the selected resident, work/deliveries and social/phone events. Town overview, follow, pause and speed controls remain accessible without opening a panel.

The town phone uses the existing scoped inbox, contacts, calls, explicit player-control lease and validated action APIs. Its presentation now shares the brand's paper and forest palette, supports contact/conversation search, separates optional attachments, explains inspection/busy states and preserves thread scroll position during updates. Escape closes the phone and returns focus without dismissing the resident panel behind it.

Layouts were exercised at 1440 × 1000, 390 × 844 and 320 × 640. Panels scroll internally. At the narrowest width, the supply summary is hidden to keep the clock and speed control inside the viewport. The Places inspector still provides access to the supply destination. Debug experiments, raw event JSON, reset and FPS are hidden in the normal game; add `debug=1` to the URL to inspect them.

## Persistence and authority

Snapshot version 4 and map ID `town-v1` remain unchanged. A separate `layoutRevision: 2` identifies the spatial update. All existing resident, home, building, business, road and task IDs are retained. Existing inventories, balances, relationships, memories, communication history, jobs and evidence are retained.

The explicit revision-1 migration adjusts an active route's total distance only when it includes the known civic connector that changed from zero to eight metres. Current-leg progress is retained; unrelated or corrupt route distances are rejected. Indoor occupants move with their relocated building because their persistent location is a node ID. The migration is idempotent. Downgrading a revised save to the old application is not supported, particularly after travel uses newly added edges.

Observer snapshots also advertise the layout revision. A new client rejects an older backend's town frame and requests a backend restart, rather than displaying mismatched poses or issuing phone actions against that layout. Restart the backend and reload the client together when adopting this change. Restoration applies the save migration.

The provider, Muse decision selection, model budgets, knowledge boundaries, authoritative action validation and persistence transaction machinery were not replaced. Remote sessions never switch to local mock decisions. Browser checks used the explicit `?authority=local` test mode. No paid Meta requests were made and no existing live checkpoint was edited for testing.

## Verification evidence

- Shared spatial audit: zero building/road, sidewalk, outdoor-path, building/plot or water conflicts. Zero stall, bench or visible-stock conflicts with roads, paths or building footprints.
- All 68 nodes are reachable on foot. Every registered building entrance connects to the road network. The supply-market closure retains a road detour. Non-parallel road intersections share graph junctions.
- Added planning/migration/driver-access/backend-version tests: **6 passed**.
- Town map, scoped phones, presentation and browser-simulation regression run: **46 passed**.
- HTTP browser probe, autonomy continuity and server progression regression run: **24 passed**.
- The full-suite run at that point completed **412 tests successfully**, with one 180-second timeout in the 200-decision offline Muse society rehearsal. The same rehearsal subsequently **passed in isolation in 115.28 seconds**; an unchanged baseline checkout passed it in 140.52 seconds. The full-suite command was not a completely green run. Two additional planning checks were added and passed after that run.
- The 20-minute town soak in the map/phone suite passed: all 16 residents acted and ate, several businesses operated, communication occurred, deliveries completed, and repeated save/restore retained conservation checks.
- Production build and TypeScript checks passed. Vite still reports the large shared Three.js/navigation chunk (approximately 609 kB minified, 156 kB gzip).
- Playwright exercised desktop and mobile resident search, selection, phone tabs, control acquisition/release, Escape/focus return, place inspection, activity filters, pause/resume and viewport bounds. Mobile overflow discovered during development was repaired and retested.
- Sampled Chromium rendering was 58–60 FPS on this machine, with approximately 204–232 draw calls and 33–50k rendered triangles depending on viewport and camera. These are observations, not a device-independent performance guarantee.

## Captures and remaining limits

Open [the local before/after comparison](../output/playwright/unity-gardens-before-after.html). It includes original and redesigned desktop/mobile overviews, the phone, a resident panel and the market inspector. The desktop original was captured before source edits; the mobile original was captured from the unchanged baseline checkout. Simulation times differ between captures, so they demonstrate layout and presentation, not economic outcomes.

Fresh live Muse behaviour was not evaluated in this change. Existing provider and validation regression tests ran offline. Crossings are visual wayfinding; the simulation does not implement traffic signals, yielding or vehicle collision physics. The driver vehicle is hidden during on-foot access rather than remaining as a persistent parked vehicle. Rendering and interactions were checked in Chromium with resized viewports; physical touch devices, low-end mobile GPUs and prolonged GPU stress were not tested. These limits remain explicit rather than being represented as completed features.
