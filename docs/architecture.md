# Simulation architecture

The current implementation is a headless taxi-agent testbed. Rendering, a public HTTP backend, and live gameplay are later milestones.

## Decision and execution loop

1. A goal and bounded world observation are passed to an inference provider.
2. The provider proposes `travel`, `clarify`, or `unable`.
3. The validator checks the decision against the offered capabilities and current world.
4. The executor performs valid road transitions deterministically.
5. Outcomes and relevant changes become feedback for the next decision.

The provider cannot manipulate arbitrary engine state. The scripted mock and the standalone Meta contract probe share the decision contract, but only the mock is currently connected to the scenario runner. The probe validates a returned decision without executing it.

## World and navigation

The original fictional neighbourhood has eight road nodes, ten bidirectional edges, and four destinations. Dijkstra computes a primary route and at most one alternative per reachable destination. The provider selects from offered routes rather than generating coordinates.

The validator checks schema, destination identifiers, public access, offered routes, continuity, route distance, closures, and observation freshness. The executor checks the next road before every node transition. A later renderer can interpolate travel locally without inference per frame.

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

## Next implementation stage

Add the compact Three.js neighbourhood, local taxi interpolation, controls, and a visible event timeline around the simulation core. Before public paid inference, implement the backend endpoint, application-wide budgets, rate limiting, deduplication, and caching. Keep live, mock, and replay states distinguishable.
