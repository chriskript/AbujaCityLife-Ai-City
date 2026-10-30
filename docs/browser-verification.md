# Browser milestone verification

For the current authoritative backend, see [Milestone 5 verification](backend-verification.md). The checks below document the earlier taxi rendering milestone.

Verified locally on October 27, 2026. All browser journeys used **scripted mock decisions**; this milestone made no Meta API requests or paid inference calls.

## Checks and evidence

| Check | Result |
| --- | --- |
| Automated regression and browser-simulation tests | 53 tests pass, including the existing headless and API fixture suites |
| TypeScript and production build | Pass; both server/shared and browser configurations checked |
| Graph-to-scene mapping | Every existing edge has a road mesh with matching endpoints, length, and orientation |
| A: typed lake-view instruction | Validated journey reaches `overlook` |
| B: market scenario | Reaches `market` via `stand-centre` and `centre-market` |
| C: automatic road closure | Stops before `bridge-overlook`, makes two mock decisions, reaches `overlook` via the hill detour |
| Pause/resume and camera switch | Taxi stays stationary while paused; overview/follow transitions remain responsive |
| Reset during pending decision | Returns to taxi stand; late mock result does not restart movement |
| Repeated route creation/reset | Renderer geometry count remains 54 before and after ten cycles |
| Teardown | Page lifecycle cleanup removes the canvas and all landmark labels; simulation disposal prevents further movement |
| Responsive layouts | Checked at 1440×1000, 1280×720, and 390×844; no mobile horizontal overflow or laptop control overlap |
| Credential isolation | Local credential, server key identifier, and Meta endpoint absent from production JavaScript |
| Development filesystem isolation | Direct requests for root `.env`, runtime records, and server adapter return HTTP 403 |

Local screenshots are saved under ignored `output/playwright/` so they can be reviewed without adding generated artifacts to the public source tree.

## Performance observations

The local Chromium session reported approximately 60 FPS during desktop travel and the narrow viewport test. Desktop scenery used roughly 12,500–12,600 rendered triangles and 158–171 draw calls including shadows. The narrow layout disabled shadows and used about 80 draw calls. Static scenery is batched by material; render resources are reused across resets.

These are observations on one development machine. A narrow desktop browser viewport is not a physical mobile-device performance test. Safari, Firefox, lower-powered GPUs, long-duration memory stability, and touch-device behaviour still need broader coverage.

The production JavaScript bundle is approximately 566 kB minified / 144 kB gzip. Vite reports its standard 500 kB chunk warning. This is mostly the initial Three.js renderer; further splitting or loading improvements can follow measured need. No external textures, fonts, or model assets are loaded.

## Remaining boundaries

- The browser mock recognises market/lake fixture requests; it does not provide general language understanding.
- Live Meta gameplay is disabled. The previous successful API test establishes one validated model decision, not live browser task completion.
- Manual shortcut closure is disabled while the taxi occupies that road; closures are introduced before edge entry.
- Movement is kinematic graph travel, without vehicle physics or a walkable player avatar.
- Public live inference still needs a secure backend endpoint, application-wide rate limits and budgets, deduplication, failure handling, and end-to-end evaluation.

## Files added or changed

| Files | Purpose |
| --- | --- |
| `client/index.html`, `client/tsconfig.json` | Browser entry and separate browser type checking |
| `client/src/main.ts`, `client/src/style.css` | Responsive interface, event timeline, controls, and lifecycle |
| `client/src/providers.ts` | Async mock provider and disabled live integration seam |
| `client/src/simulation/taxi-journey.ts` | Smooth movement over existing validated edges |
| `client/src/rendering/world.ts`, `client/src/rendering/scene.ts` | Procedural environment, taxi, road mapping, cameras, batching, and cleanup |
| `shared/agent/mock-provider.ts`, `server/inference/mock-provider.ts` | Share the existing fixture policy while preserving the server import |
| `tests/browser-simulation.test.ts`, `vitest.config.ts` | New geometry/execution tests and independent test configuration |
| `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore` | Tooling, dependencies, client isolation, and generated-file exclusions |
| `README.md`, `docs/architecture.md`, `docs/meta-api.md`, `docs/provenance.md`, this document | Product status, implementation boundaries, attribution, and evidence |
| `THIRD_PARTY_NOTICES.txt` | Three.js MIT notice, also emitted into the build |

The validated graph, existing taxi agent, Meta adapter, persistent budget controls, and previous tests were preserved. Local screenshot and verification helpers live only in ignored output/runtime storage.
