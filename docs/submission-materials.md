# Submission materials — review draft, November 3

## Public-facing copy

**Title:** Abuja City Life: AI Town

**Tagline:** Sixteen lives. One neighbourhood. A future nobody has written yet.

**Description:** Unity Gardens is a fictional neighbourhood in Abuja where sixteen residents share homes, businesses, finite resources and social possibilities. Watch people seek work, earn wages, buy food, replenish businesses and choose whether to approach one another. Phones expose contacts, messages and simulated calls; knowing someone does not automatically grant their number, trust or consent.

Meta Muse Spark 1.3 reasons at meaningful personal, economic and social decision opportunities. Each invocation receives the deciding resident's scoped knowledge, background and present circumstances. The simulation validates proposals and executes movement, payments, inventory and timers deterministically. Offline policies power the local default; actual Muse runs are separately approved and clearly labelled.

Live evidence includes a 200-response evaluation across all sixteen residents, voluntary contact sharing, paid economic consequences and independent responses. A separate Grace–Maryam interaction progressed through introduction, invitation, acceptance and mutual attendance. The latest real HTTP/browser test verified model decisions in the event feed and reasoning without observers; it stopped safely after a Windows checkpoint replacement failure. Completed extended hangout conversations and lasting friendship changes remain unproven.

**Technology:** TypeScript, Three.js, Vite, Node.js, Meta Model API, Vitest.

**Repository:** https://github.com/chriskript/AbujaCityLife-Ai-City

**Evidence:** [Society validation](nov3-autonomous-society-validation.md), [200-generation run](nov3-sustained-muse-live-evaluation.md), [real browser acceptance](nov3-live-http-browser-acceptance.md), [provenance](provenance.md).

## Recording assets and honest presentation

- `output/playwright/unity-gardens-live-http-raw.webm`: original real-provider browser capture, retained unchanged.
- `output/playwright/unity-gardens-http-review-128s.webm`: playable remuxed review draft, approximately **2:08**, 1280×720 / 25fps, silent. It includes the persistence interruption. It is **not** a finished three-minute narrated submission video.
- `output/playwright/http-live-desktop.png`, `http-live-mobile.png`, `http-live-phone.png`: actual accepted browser views. No credentials or model inputs are on screen.
- [Three-minute narration and route](submission-walkthrough.md): prepared separately. Do not stretch footage, disguise the stop, or call a recorded clip current gameplay. Prior runs must remain labelled as separate evidence.

The original stream lacked a final duration/index and FFmpeg reported a premature end. A stream-copy remux preserved its decodable frames without retiming; representative phone and terminal-state frames were inspected. Python is unavailable in this workspace, so the installed Playwright FFmpeg binary performed this minimal remux. No generated narrator, external assets, paid video API or new Muse call was used. The recording is silent and still needs narration and final export review. The raw and remuxed files remain private local artifacts until publication is approved.

## Public access requirements

The current loopback operator backend has server-side secrets, a shared local token and privileged controls. **Do not tunnel or expose port 8791/8787 as a public demo.** Its HttpOnly/SameSite cookie is designed for trusted local HTTP operation, not public multi-user authorisation.

For submission without a public inference service, publish an approved video and public source repository with the default offline local instructions. Clearly label the video as recorded real Muse evidence and the local default as offline. Verify the repository is publicly accessible without sign-in, the exact submitted revision builds from `npm ci`, third-party notices are present, and no ignored runtime/output artifacts or credentials enter Git. Publication still needs the owner's approval.

If a public interactive demo is required, deployment needs separate approval plus HTTPS, secure cookies, explicit viewer/operator permissions, protected write/phone endpoints, private server-only keys and persistent central budget/accounting state. A read-only viewer must not trigger inference or gain operator powers. Per-run limits, throttle, one pending inference, safe-stop and ledger retention must survive hosting/restarts. This is a requirement list, not a new hosting implementation.

## Submission gates

1. Review the interrupted acceptance and offline persistence repair; obtain separate approval for any fresh live reliability check. Never resume this run.
2. Resolve or explicitly disclose the remaining Windows live-demo blocker. A clean final recording is not certified by synthetic failure tests.
3. Record narration, review the complete video for truthful run labels, legibility, silence/audio issues and duration no longer than three minutes. Upload/publication is not yet performed.
4. Confirm the actual submission portal deadline/timezone, required fields, track/theme eligibility, video visibility and public-access requirements against the accepted participant rules. No portal session or official rules were provided here; these requirements have not been independently checked.
5. Owner approves any commit, push, deployment, video publication and final submission. None has been performed by this task.
