# Development provenance

- Development of this repository began October 27, 2026, during the stated October 26–November 4 hackathon period.
- All custom source in this repository was newly authored for this entry.
- The fictional eight-node neighbourhood and ten road edges were defined from original numeric coordinates. No OpenStreetMap data, game assets, or original Abuja City Life source was used.
- No external visual assets have been added. The 3D neighbourhood, taxi, lake, buildings, trees, market stalls, and road details use original procedural geometry and reusable materials. Typography uses system fonts.
- Musa, Amina, and Zainab use newly authored procedural character models, basic limb motion, and resource crates. No external character assets, rigs, or animation libraries are used.
- The development assistant is OpenAI Codex. The intended runtime intelligence provider is Meta Model API; these responsibilities are separate.
- Browser and headless scenario reasoning use clearly labelled mock fixtures. One approved live Meta API contract test passed; live browser gameplay is not yet implemented.
- No implementation commits existed at project start. Keep incremental commits during the event; do not fabricate or backdate history.

## Direct development dependencies

| Dependency | Purpose | Upstream licence |
| --- | --- | --- |
| TypeScript | Static checking | Apache-2.0 |
| Vitest | Automated tests | MIT |
| tsx | Run TypeScript scripts | MIT |
| @types/node | Node.js type definitions | MIT |
| Vite | Browser development and production bundling | MIT |
| @types/three | Three.js type definitions | MIT |

## Runtime dependency

| Dependency | Purpose | Upstream licence |
| --- | --- | --- |
| Three.js | WebGL rendering and static geometry batching | MIT |

`package-lock.json` records the installed dependency tree and licence metadata. The full Three.js MIT notice is preserved in [THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt) and emitted alongside the production build. Preserve this notice when distributing the application.

## Contest requirements

Follow the project brief: independent implementation, no secrets in Git, public repository, buildable tests, genuine Meta-powered runtime decisions before submission, and a demonstration video no longer than three minutes. Recheck the accepted participant rules and submission portal before release.
