# Final demonstration walkthrough — November 3

The clean recording is **`output/playwright/unity-gardens-final-demo.mp4`**, **2:59**, 1280×720 H.264 / 25fps, approximately 5.35MB. It is silent with burned-in explanatory captions. It uses actual browser footage from the [accepted 64-generation reliability evaluation](nov3-http-browser-reliability.md), at normal speed. It is a recording, not a replay that resumes the world.

## What the final video shows

| Time | Image and explanatory text |
| --- | --- |
| 0:00–0:12 | Unity Gardens with the visible Live Meta badge; project title and recorded-live label. |
| 0:12–0:33 | Town and resident panel: sixteen residents, shared resources and independent choices. |
| 0:33–0:55 | Amina's actual activity and event feed; Muse receives each deciding resident's scoped knowledge, needs and commitments. |
| 0:55–1:17 | Live activities and economic events; the world validates proposals and executes movement/payment deterministically. |
| 1:17–1:33 | Knowing someone, having their number, trust and consent are distinct. |
| 1:33–2:00 | Amina's real phone opens in read-only inspection; her autonomy continues. |
| 2:00–2:20 | Legitimately existing Contacts view; no player message is sent or resident control acquired. |
| 2:20–2:38 | Return to the town. Text explicitly labels observer-free reasoning, refresh and reconnection as additional checks from this run, not footage of the disconnection itself. |
| 2:38–2:51 | Recorded run result: 64 Muse responses, estimated $0.550113; actual Windows contention recovered safely. |
| 2:51–2:59 | Whole-neighbourhood view and the guiding principle: we create the possibilities; residents create their own stories. |

The final clip contains no spoken narration. Its text is editorial explanation, not a transcript or fabricated NPC speech. Calls in the game have no voice audio. The VTT sidecar duplicates the burned-in captions and should not be displayed twice.

## Evidence behind the explanation

The session completed 64 responses, 63 accepted actions and one safely discarded pause-boundary response, with no action rejection or offline substitution. All sixteen residents reasoned. It recorded an independent Amina–Zainab exchange and subsequent food purchases, further introductions/responses, paid replenishment and completed work. No new contact, relationship-counter change or structured social meeting occurred in this run. Earlier 200-generation and Grace–Maryam evidence remain separate; they are not spliced into this recording.

The reliability report documents 1,107 successful authoritative checkpoint replacements, a 10m 18.6s continuously unpaused interval and 177 writes beyond 8½ minutes. One session-file EPERM recovered in 38.3ms. This supports the bounded local demonstration without claiming Windows contention is eliminated or that the longer retry tail caused recovery.

## Verified recording checks

- All 4,475 frames decoded without error; exact duration 179 seconds and continuous 25fps timing.
- Eight encoded samples visually reviewed for legibility, caption placement, mode visibility and phone controls. No credentials or raw model inputs appear.
- Chrome playback, seeking to the phone scene and subsequent frame advancement passed.
- Original raw capture and working remux retained; source-in 50s / source-out 229s, no retiming or repeated footage.
- Python render/verification project and manifests: `output/playwright/final-demo-project/`. Editing uses isolated local PyAV/Pillow libraries, not the model provider.

The [submission materials](submission-materials.md) contain final public-facing copy, repository/access checks and release gates. Publication, commit, push, deployment and final submission require owner approval. Do not expose the loopback operator service as a public demo.
