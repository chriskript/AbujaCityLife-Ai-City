# Development provenance

- Development of this repository began October 27, 2026, during the stated October 26–November 4 hackathon period.
- All custom source in this repository was newly authored for this entry.
- The fictional eight-node neighbourhood and ten road edges were defined from original numeric coordinates. No OpenStreetMap data, game assets, or original Abuja City Life source was used.
- No external visual assets have been added.
- The development assistant is OpenAI Codex. The intended runtime intelligence provider is Meta Model API; these responsibilities are separate.
- Current scenario reasoning is a clearly labelled mock fixture. The live API probe must be explicitly enabled and verified before claiming live Meta functionality.
- No implementation commits existed at project start. Keep incremental commits during the event; do not fabricate or backdate history.

## Direct development dependencies

| Dependency | Purpose | Upstream licence |
| --- | --- | --- |
| TypeScript | Static checking | Apache-2.0 |
| Vitest | Automated tests | MIT |
| tsx | Run TypeScript scripts | MIT |
| @types/node | Node.js type definitions | MIT |

`package-lock.json` records the installed dependency tree and licence metadata. Preserve applicable upstream notices in any distributed dependency bundles. No third-party runtime package is required by this milestone.

## Contest requirements

Follow the project brief: independent implementation, no secrets in Git, public repository, buildable tests, genuine Meta-powered runtime decisions before submission, and a demonstration video no longer than three minutes. Recheck the accepted participant rules and submission portal before release.
