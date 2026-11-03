# Submission materials — review draft, November 3

## Public-facing copy

**Title:** Abuja City Life: AI Town

**Tagline:** Sixteen lives. One neighbourhood. A future nobody has written yet.

**Description:** Unity Gardens is a fictional neighbourhood in Abuja where sixteen residents share homes, businesses, finite resources and social possibilities. Watch people seek work, earn wages, buy food, replenish businesses and choose whether to approach one another. Phones expose contacts, messages and simulated calls; knowing someone does not automatically grant their number, trust or consent.

Meta Muse Spark 1.3 reasons at meaningful personal, economic and social decision opportunities. Each invocation receives the deciding resident's scoped knowledge, background and present circumstances. The simulation validates proposals and executes movement, payments, inventory and timers deterministically. Offline policies power the local default; actual Muse runs are separately approved and clearly labelled.

Live evidence includes a 200-response evaluation across all sixteen residents, voluntary contact sharing, paid economic consequences and independent responses. A separate Grace–Maryam interaction progressed through introduction, invitation, acceptance and mutual attendance. Following an initial persistence interruption, the latest fresh 64-response HTTP/browser run completed normally, verifying real decisions, refresh/reconnection, observer-free reasoning and 1,107 checkpoint replacements. Real Windows contention recovered safely. Completed extended hangout conversations and lasting friendship changes remain unproven.

**Technology:** TypeScript, Three.js, Vite, Node.js, Meta Model API, Vitest.

**Repository:** https://github.com/chriskript/AbujaCityLife-Ai-City

**Evidence:** [Society validation](nov3-autonomous-society-validation.md), [200-generation run](nov3-sustained-muse-live-evaluation.md), [accepted browser reliability](nov3-http-browser-reliability.md), [provenance](provenance.md).

## Recording assets and honest presentation

- **`output/playwright/unity-gardens-final-demo.mp4`**: clean **2:59**, 1280×720 H.264 / 25fps, approximately 5.35MB, with burned-in explanatory captions and no audio. Actual footage from the accepted reliability run; no synthetic gameplay, credentials or provider prompts on screen.
- `output/playwright/unity-gardens-final-demo.vtt`: the same explanatory text as a sidecar. Do not display it on top of the burned-in captions. This is not a speech transcript.
- `output/playwright/unity-gardens-reliability-raw.webm` and `unity-gardens-reliability-remux.webm`: original/working live source capture, retained. Source seconds 50–229 are used at 1× speed; no repeated frames or time stretching.
- `output/playwright/final-demo-project/`: reproducible Python render and verification code, cue schedule, manifest and source/output hashes. Eight representative encoded frames were visually reviewed; all 4,475 frames decoded correctly, and Chrome playback/seeking/advancement passed.
- [Final walkthrough and caption route](submission-walkthrough.md) identify what the video shows and what is separately verified. Earlier interrupted footage remains archived and is not the final recording.

The final recording uses a verified local Python installation with isolated PyAV/Pillow editing libraries in ignored runtime storage; no project dependency or production configuration changed. No generated narrator, external visual asset, paid video API or additional Muse call was used for editing. Silence is intentional; the captions carry the explanation. The final video and sources remain local until publication is approved. Optional owner narration can be added in a later approved edit without claiming the residents speak with voice audio.

## Public access requirements

The current loopback operator backend has server-side secrets, a shared local token and privileged controls. **Do not tunnel or expose port 8791/8787 as a public demo.** Its HttpOnly/SameSite cookie is designed for trusted local HTTP operation, not public multi-user authorisation.

For submission without a public inference service, publish an approved video and public source repository with the default offline local instructions. Clearly label the video as recorded real Muse evidence and the local default as offline. On November 3, the existing repository was verified public through the GitHub connector and an anonymous HTTP 200 API read. Local changes were not pushed. Before release, verify the approved submitted revision builds from `npm ci`, third-party notices are present, and no ignored runtime/output artifacts or credentials enter Git. Publication still needs the owner's approval.

If a public interactive demo is required, deployment needs separate approval plus HTTPS, secure cookies, explicit viewer/operator permissions, protected write/phone endpoints, private server-only keys and persistent central budget/accounting state. A read-only viewer must not trigger inference or gain operator powers. Per-run limits, throttle, one pending inference, safe-stop and ledger retention must survive hosting/restarts. This is a requirement list, not a new hosting implementation.

## Submission gates

1. Review the [accepted bounded live reliability result](nov3-http-browser-reliability.md). The former interruption is preserved; Windows contention still exists but recovered in the new run. No general public-hosting or unlimited-duration guarantee is claimed.
2. Review the clean 179-second captioned MP4. Technical decoding, representative-frame visual review and actual browser playback pass. It is intentionally silent, not a narrated cut. Upload/publication is not yet performed.
3. Approve the exact release revision and any commit/push, video upload/visibility or deployment. Local tests are **409 passing across 32 files**; TypeScript and production build pass. A clean-room `npm ci` of the final published revision remains a release check, not something performed by this run.
4. Confirm the actual submission portal deadline/timezone, required fields, track/theme eligibility, video visibility and public-access requirements against the accepted participant rules. No portal session or official rules were provided here; these requirements have not been independently checked.
5. Owner approves any commit, push, deployment, video publication and final submission. None has been performed by this task.
