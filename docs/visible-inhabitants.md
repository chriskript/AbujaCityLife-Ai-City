# Visible autonomous inhabitants

This document records the Milestone 4 local adapter. **Current default:** the [controlled backend](backend.md) now owns the world and provides labelled mock conversation fixtures; use `/?authority=local` to run the original offline adapter described below. Current run commands, persistence, request limits and live-mode restrictions are in the backend guide. The historical 24-decision local limit below does not apply to the server session.

The default browser view presents Musa, Amina, and Zainab using the existing shared neighbourhood core. Characters, cargo, stock, requests, and outcomes are driven by authoritative state and recorded events. All current decisions use labelled scripted mock policies. Conversation controls are disabled and explicitly marked as not connected.

## Local experience

Run `npm run dev` and open `http://127.0.0.1:5173/`. The world starts without an instruction. Click or tap a character, a scene name marker, or a roster button to select and focus them. The character card shows occupation, current activity, selected intention, visible possessions, and recent events. Camera controls can return to the whole neighbourhood even while simulation is paused.

The default clock runs at 2× speed; 1× and 4× are available for observation. Pause freezes simulation time, decisions, and state-derived character animation. A hidden tab or lost WebGL context suspends local advancement without fast-forwarding on return. Reset starts a fresh isolated world and clears its story, not inference accounting.

The cooperation policy normally displays a proposal, independent acceptance, goods collection, taxi delivery, and a purchase. **Neighbourhood experiments** also offers driver refusal, trader waiting, self-collection, and paused sales. The selected policy takes effect only on reset. Presets configure the existing mock provider; there is no separate animation script that guarantees an outcome.

The scheduler retains its bounded 24-decision mock episode. Activities already selected can finish after that limit; the interface then identifies the limit and offers reset rather than implying unlimited reasoning.

The original taxi experience, including its typed fixtures, three scenarios, road closure, pause/reset and camera controls, remains at `/?experience=taxi`. Only the selected experience is instantiated.

## Session and backend boundary

`shared/neighbourhood/presentation.ts` defines versioned observer snapshots, events, and control receipts. This is not the persistence format or an NPC reasoning observation.

A frame carries:

- Session ID, monotonically increasing sequence, mode, pause state, speed, and mock decision-limit metadata.
- World ID/epoch, revision, simulation time, public actor poses and activities, visible resources, task statuses, and road availability.
- Bounded recent events and an event cursor. Gaps between IDs are allowed because private observation events are omitted.

Full character memories, knowledge, needs, priorities, triggers, and credentials are absent. Public selected intentions and action/validation telemetry are available for optional inspection. Normal activity feeds hide that telemetry. Observer snapshots must never be reused as a character's knowledge-filtered model input.

`LocalNeighbourhoodSession` owns exactly one existing `Neighbourhood` and `DecisionScheduler`. It executes the same `pump()` then `advance(0.25)` ordering used by headless fixtures. It implements the `NeighbourhoodSession` interface: subscription, bounded operator commands, visibility, local updates, and disposal. The UI sends pause, speed, and reset commands; it never mutates inventory, tasks, positions, or NPC decisions directly.

The `PresentationStore` ignores duplicate, out-of-order, and wrong-session frames. Reset changes the world ID while session sequence numbers continue increasing. Pending old-world work cannot publish into the new world. Receipts deduplicate repeated commands; stale-world commands are rejected.

A future authenticated server-session adapter can implement the same interface using HTTP commands and a state/event stream. Its `update()` does not advance authoritative simulation: the server owns the clock. It must validate commands, authorize session ownership, enforce wall-clock inference limits and persistent spending reservations, and establish a new presentation store when changing authenticated sessions. No remote adapter, public world, endpoint, or hosting is implemented here.

## Rendering

The public pose is calculated from the core's last completed node and recorded progress along its current graph edge. Rendering only smooths toward confirmed poses; it does not call `advance()`, choose routes, or infer arrival. Small standing and pavement offsets separate character models at shared nodes without changing simulation proximity or road topology.

Each original procedural character uses a distinct silhouette and colour palette, a selectable marker, a highlight ring, simple limb motion, and a carried parcel when inventory warrants it. Musa is represented by the taxi while driving and stands nearby at rest. Cargo crates, supply desk crates, and stall inventory crates use actual quantities, not timer-driven completion animations.

Collection, delivery, purchase, acceptance, and refusal appear only after the corresponding core transition. A character's intention or a proposed action is not treated as a completed effect. No fake conversations are generated.

All models are created once per scene and reused across resets. Cleanup stops the animation loop, releases the session subscription, aborts DOM and picking listeners, removes markers and canvas, and disposes scene resources. Public development telemetry is read-only and omitted from production builds.

## Verification

Automated tests compare 500 session steps against direct headless execution, including exact snapshots and public event arrays. They cover correct initial positions, path progress, all alternative mock policies, inventory consequences, pause/visibility, reset epochs, stale commands, frame ordering, subscriber cleanup, and three distinct procedural models. The existing 91-test baseline remains part of the full suite.

Browser screenshots and local verification artifacts are stored under ignored `output/playwright/`. Browser evidence and measured performance are reported with the milestone; viewport emulation is not a physical mobile-device benchmark.

### Local verification results

Verified October 28, 2026:

| Check | Evidence |
| --- | --- |
| Regression suite | 104 tests pass, including the original 91 and 13 new presentation/session tests |
| Static checks and build | Both TypeScript configurations and production build pass |
| Visible cooperation | Browser records accepted → collected → delivered, then purchase; supplier 6, market 2, resident 1, driver reward 1 |
| Pause during collection | Simulation time remains unchanged during a 400 ms pause |
| Refusal | Driver declines; supplier stays at 8; no delivery or reward occurs |
| Waiting | Trader waits with no transport task created |
| Selection and conversation boundary | Scene-name selection and roster controls work; conversation input remains disabled and labelled not connected |
| Reset stability | Five browser resets retain 58 renderer geometries before/after |
| Teardown | Canvas, inhabitant buttons, and landmark labels all removed |
| Responsive layout | 1440×1000 desktop, 1280×720 laptop with expanded card, 390×844 mobile viewport; no measured horizontal overflow or laptop control overlap |
| Original taxi lab | A, B, and C all complete through the browser controls |
| Production | Cooperation and purchase complete; no external requests during the run; no development telemetry; clean browser console |
| Credential isolation | Actual local credential, server key identifier, and Meta endpoint absent from production JavaScript; credential and checkpoint paths remain ignored |

The local browser reported roughly 59–60 FPS on desktop and 58–60 FPS at mobile viewport size. A desktop sample used 277 draw calls and 18,560 triangles; a mobile sample used 125 draw calls with shadows disabled. These measurements describe the development machine, not physical phone hardware.

The shared Three.js/rendering chunk is approximately 559 kB minified / 141 kB gzip, and the neighbourhood chunk adds approximately 44 kB / 14 kB gzip. Vite retains its large-chunk warning. No new packages or external assets were introduced.

Screenshots: `inhabitants-desktop.png`, `inhabitants-focus.png`, `inhabitants-collection.png`, `inhabitants-delivery.png`, `inhabitants-refusal.png`, and `inhabitants-mobile.png` in `output/playwright/`.

### Implementation files

- `shared/neighbourhood/presentation.ts`: public observer snapshot/event/control contract and frame ordering.
- `client/src/simulation/local-neighbourhood-session.ts`: isolated local owner of the existing core and scheduler.
- `client/src/rendering/inhabitants.ts`: three original models and inventory props.
- `client/src/rendering/scene.ts`: selection, character focus, state-derived pose/quantity updates, cleanup.
- `client/src/neighbourhood.ts` and `neighbourhood.css`: character cards, activity feed, unavailable conversation preparation, experiments, clock controls.
- `client/src/main.ts`, `taxi-demo.ts`, and `style.css`: experience selection and preserved taxi lab.
- `tests/neighbourhood-presentation.test.ts`: parity, ordering, alternatives, timing, reset and resource tests.
- `vitest.config.ts`: serial test-file execution to avoid CPU contention in the existing memory stress test; assertions are unchanged.
- README, architecture/foundation guides, and provenance: accurate product status and original character attribution.

## Limitations

- Natural conversation and live Meta inference are not connected.
- Local world state resets on page navigation; headless checkpoint save/load remains available independently. No browser-local persistence is treated as authoritative backend state.
- Character motion is symbolic graph travel with visual offsets, not pedestrian collision physics or a rigged animation system.
- Current mock scheduling limits use simulation time. A future live service must enforce costs and request rates using wall-clock time regardless of the browser speed control.
- Three characters and one small neighbourhood are the complete population and environment scope.
