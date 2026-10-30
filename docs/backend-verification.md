# Milestone 5 verification

Verified locally on October 29, 2026. **Mock mode only; no Meta HTTP requests or paid inference.** All Meta contract tests inject an HTTP fixture and use temporary ledgers, separate from the existing application spending history.

| Check | Evidence |
| --- | --- |
| Existing regression baseline | All 104 previous tests retained |
| Backend integration tests | 25 new tests: committed frames, full cooperation and purchase, inventory conservation, checkpoint recovery, road observations, conversation memories, deduplication, throttles, stale/pending generations, confirmation, auth and HTTP restrictions, mocked Responses contract and budget exhaustion |
| Browser authentication | Correct local token connects; initial unauthenticated state requests sign-in; token never printed or placed in URL/storage |
| Conversation | Amina receives a freely typed food question and returns a visibly labelled mock fixture; no claim of natural understanding |
| Refresh | Same world ID and simulation time after refresh while paused; pause state and transcript retained |
| Character selection/mobile | Zainab selectable; 390×844 viewport has document width 390, no horizontal overflow |
| Production browser | Built application served from its own backend on loopback port 8787; no page exceptions |
| Frame performance | 92 sampled frames over about 1.5 seconds, mean 16.48 ms (~61 FPS) on the local desktop; not a mobile-device benchmark |
| Credential isolation | Actual local Meta key, `MODEL_API_KEY` identifier and Meta endpoint absent from built JS; Three.js license notice present |
| Offline preflight | `npm run meta:check` passes; key value withheld, no network request |

Screenshots are ignored local artifacts in `output/playwright/milestone5-backend-desktop.png` and `output/playwright/milestone5-backend-mobile.png`. Desktop captures the conversation and authoritative mock mode; mobile captures character selection and current resource/activity status. The browser fixture paused a recoverable world, verified refresh, then resumed it. The full collection/delivery/purchase progression is independently verified through the server session tests, rather than inferred from the screenshot.

The browser CLI was used to inspect the unauthenticated screen. An ignored local Playwright script then read the demo access token directly into memory to verify sign-in without copying credentials into tool commands or output. Installed Chrome was used; no new project dependency or browser download was required. Port 5173 was occupied, so verification used port 8787; the Vite proxy configuration was checked statically, not exercised against a separate development server.

Remaining limits: real-device mobile performance, extended sessions/disk endurance, new live Meta schema acceptance, grounded prose quality, and real autonomous multi-character behaviour still require evaluation. This service is a loopback demonstration, not public hosting infrastructure. No 3D geometry or gameplay expansion was part of this milestone.
