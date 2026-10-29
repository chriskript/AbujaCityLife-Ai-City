# Simulation architecture

The current implementation combines the headless taxi-agent testbed with a browser-based Three.js neighbourhood. A public inference backend and live gameplay remain later milestones.

The [shared neighbourhood foundation](neighbourhood-foundation.md) owns three NPCs, scoped observations, autonomous scheduling, validated cooperation, inventory, and checkpointed memories. The default browser experience now presents this core through the [observer session contract](visible-inhabitants.md). The original taxi demonstration remains available at `/?experience=taxi`; neither browser experience uses live inference.

## Decision and execution loop

1. A goal and bounded world observation are passed to an inference provider.
2. The provider proposes `travel`, `clarify`, or `unable`.
3. The validator checks the decision against the offered capabilities and current world.
4. The executor performs valid road transitions deterministically.
5. Outcomes and relevant changes become feedback for the next decision.

The provider cannot manipulate arbitrary engine state. The scripted mock and the standalone Meta contract probe share the decision contract, but only the mock is connected to the headless scenario runner and browser. The probe validates a returned decision without executing it. One controlled live Spark 1.3 destination-selection request has passed schema and semantic validation.

## World and navigation

The original fictional neighbourhood has eight road nodes, ten bidirectional edges, and four destinations. Dijkstra computes a primary route and at most one alternative per reachable destination. The provider selects from offered routes rather than generating coordinates.

The validator checks schema, destination identifiers, public access, offered routes, continuity, route distance, closures, and observation freshness. The executor checks the next road before every node transition.

## Browser execution

`TaxiJourney` interpolates along the agent's next validated edge and calls the existing `advance()` only after reaching its endpoint. The agent's current node remains the last completed waypoint during movement. No model calls occur per frame. Frame deltas are capped at 50 ms, and simulation pauses while the tab is hidden or WebGL is unavailable. The taxi rotates toward the road direction; the camera eases between overview and follow views.

The shortcut closure is introduced before edge entry. If the taxi already occupies the shortcut, manual closure is disabled until it leaves. This avoids introducing undefined mid-edge road removal. Scenario C uses the same fixed closure trigger as the headless scenario. A short stationary wait makes interruption visible before the existing `replan()` is called.

Static geometry is batched by material; repeated primitives and materials are reused. Reset preserves the scene and clears journey state, closures, and route overlays. Teardown stops the animation loop, disconnects the resize observer, removes listeners and labels, and disposes geometries, materials, shadows, and the renderer. WebGL context loss suspends movement until restoration.

## Browser/server boundary

The shared mock policy lives in `shared/agent/mock-provider.ts`; the original server import re-exports it for compatibility. `client/src/providers.ts` is the seam for a future same-origin backend provider. Selecting `live-meta` currently throws rather than silently using fixtures. No live adapter or credential code is imported into the client.

Vite uses `client/` as its root with environment-file loading disabled. Development filesystem access is limited to client, shared modules, and dependencies; server code, runtime records, Git metadata, and environment files are explicitly denied. No public directory is served. The dev server binds to localhost.

## State and feedback

Resets and world changes during inference invalidate pending decisions. A road closure during travel is checked before edge entry; a blocked route interrupts execution and preserves the selected destination for replanning. Replanning is limited to two attempts per goal. Event retention is bounded to 200 entries. Provider failures leave the taxi stationary and suppress raw exceptions in the trace.

## Reproducible demonstrations

| Scenario | Goal | Expected mock outcome |
| --- | --- | --- |
| A | Nearest public lake view | Select Lake Overlook and arrive |
| B | Market Square | Execute an offered road route and arrive |
| C | Lake view, then shortcut closure | Stop before closure, preserve destination, choose a detour, arrive |

World setup and closure timing are fixed, so no random seed is needed. Tests repeat each scenario 20 times, check identical traces across independent runs, and cover disconnected destinations, stale observations, malformed decisions, and inference failures. These fixture results do not establish live-model accuracy or determinism.

## Core modules

| Location | Responsibility |
| --- | --- |
| `shared/world/` | Original road graph and destination facts |
| `shared/navigation/` | Route candidates and reachability |
| `shared/agent/` | Observation/decision contracts, validator, taxi state machine |
| `shared/scenarios/` | Fixed scenario setup and closure trigger |
| `server/inference/` | Mock provider and standalone Meta contract probe |
| `server/controls/` | Persistent probe spending reservations |
| `scripts/` | Local demo and API verification commands |
| `tests/` | Scenario, validation, accounting, and fake-transport tests |
| `client/src/simulation/` | Timed interpolation over validated agent edges |
| `client/src/rendering/` | Original scenery, taxi, cameras, labels, and graphics cleanup |
| `client/src/main.ts` | Browser controls, status, action timeline, and lifecycle |
| `client/src/providers.ts` | Mock default and future backend integration seam |

## Next implementation stage

Before public paid inference, implement the backend endpoint, application-wide budgets, rate limiting, deduplication, and caching. Then evaluate live task completion and replanning through the browser. Keep live, mock, and replay states distinguishable. No additional live inference was authorized for the 3D milestone.
