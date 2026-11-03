# Unity Gardens visual refinement

The existing Unity Gardens map, simulation and camera interaction remain the foundation. This change affects presentation only; it requires no save migration. No resident records, place IDs, navigation edges, backend authority, phone actions or Muse integration were changed.

## Environment

- Houses have terracotta hip roofs, shaded porches, retained compound walls, water tanks and domestic planters. Flats retain their balconies, with planting, curtain accents and utility details.
- Market Square has a green hip roof, striped supported stall shelters and a shaded produce arcade visible from the normal observer angle. Workshops and the cooperative have service shutters and physical signs. Civic buildings have public entrance treatments, a community colonnade and a care emblem.
- Avenue rows, plot corners and small destination groves replace the previous map-wide tree grid. Planting uses full crown clearance, excludes existing stock/stalls/benches, and leaves the green's cross paths and waterfront shelter open. Two additional waterfront benches are outside all access corridors.
- The Abuja City Gate tribute sits at (-65, -23), beside the western approach between Acacia Lane and Stand Road. Its 23 × 9 metre garden envelope is wholly off the road/path network. Swept cream pylons, a suspended green-and-white Nigeria silhouette and welcome beam provide a recognisable reference at the scale of the existing flats. It is selectable scenery, not a new simulation destination. Visual reference: [Abuja photograph from the Office of the Auditor-General](https://www.oaugf.ng/6thawam2016/images/eventx/Abuja/Abuja-City-Gate.jpg).

## Labels and phone

Wide views prioritise the market, civic centre and gate; overlapping candidates are suppressed, so the current overview shows two place labels. Homes and smaller businesses appear closer in. Selected/followed buildings receive priority, and indoor counts remain in accessible names. Resident and building labels share screen-space exclusion checks, including contextual panels and fixed interface elements. Every existing destination remains available through Places; buildings and the gate can also be selected directly in the scene.

The desktop phone is 354 × 720 pixels at a 1440 × 1000 viewport, with a lighter backdrop and the existing paper/forest palette. At 390 × 844 it fits within an eight-pixel inset. Phone logic and all camera control settings are unchanged.

## Verification

- Production build and both TypeScript checks pass. Vite retains its warning about the main bundle exceeding 500 kB.
- 66 tests passed across town planning, town residents/persistence, phone/map and neighbourhood presentation suites. The updated scenery clearance test also passed after the final planting and bench changes.
- Clearance tests cover the whole gate envelope, mature planting crowns, water reserve, every outdoor navigation corridor, building footprint, public paving and retained furnishing reserves. Existing tests verify routes to every map node and building entrance.
- Browser verification opened all 22 place inspectors and confirmed all 16 residents. Phone chats/calls/contacts tabs, acquire/release control and Escape close passed in local mode. The mobile phone bounds were asserted inside the viewport.
- Desktop and mobile-emulated browser snapshots reported 60 FPS locally. Static geometry remains batched by material; generated sign textures and source geometries are disposed. These observations are not a hardware performance benchmark.
- No browser runtime errors were observed during the final interaction check. The pre-existing password-field/form diagnostic remains.

## Review artifacts and limits

Before and after screenshots and a comparison index are in `output/playwright/review.md` (local, ignored artifacts). They include matched overview and market views, gate placement, civic/housing variety, lakeside landscaping and desktop/mobile phones.

Verification used `?authority=local` so it did not alter persistent live resident data or make model requests. Live Muse operation and a production deployment were not exercised. The gate is a stylised tribute rather than an exact architectural reconstruction. Labels use conservative screen-space bounds rather than full 3D occlusion testing. Mobile was checked through browser viewport emulation, not a physical phone.
