# Reference animation mapping

The supplied LAYRS Amsterdam clip contains 458 frames at 30 fps (15.27 seconds). All frames were inspected in order, with key interface states reopened at native resolution. This release adapts its demonstrated interactions to Delhi's available data.

| Reference interaction | Delhi implementation |
| --- | --- |
| City overview and continuous camera navigation | Smooth overview flights, city-to-building selection flights, existing orbit and guided tours; ordinary pan/zoom/rotation remains available. |
| Buildings appear as construction dates advance | Building dates playback filters actual footprints by reviewed building dates or parseable OSM `start_date`; newly revealed dated footprints grow into view. |
| Year, count, histogram and playhead advance together | A linked exact-year histogram, animated future-bar emphasis, year counter and revealed-record count share the same cutoff and record set. |
| Play and return to Today | Play/pause/resume, replay, speed selection and automatic stop at Today. Scrubbing is additionally supported. |
| Construction-period isolation | Click a Date legend row to isolate that period; click again to clear it. Unknown dates do not enter a dated period. |
| Context layer recolouring with neutral surroundings | Six OSM building contexts: homes, commerce, public life, worship, historic tags and roof forms. A 550 ms colour interpolation transitions between palettes. Unmatched buildings remain neutral. |
| Category counts, explanation and source | Every context includes category counts, a scope explanation and OSM attribution. Counts follow the footprint-size filter across the dataset, rather than the study boundary. |
| Context-specific histogram | The building chronology uses matching dated records and the active category palette. Contexts without usable dates display an explicit empty state. |
| Hover and building selection | Map feature-state shading on hover, persistent gold selection, a detailed card entrance and dismissal. |
| Story card and photograph | Existing sourced building/landmark profiles remain available; image space is reserved by the existing photo styling. The reference's photo-loading layout shift is not reproduced. |
| Returning to the layer catalogue | All building contexts clears the active context, resets chronology to Today and restores the normal map palette. |
| Marker appearance | The separate landmark timeline drops markers in and lifts them out and updates its own milestone histogram. |

## Evidence limits

- The 63,676-footprint snapshot contains 16 start-date tags, but only 15 parse as specific years. `C14` remains unknown. The reviewed overlay adds four new dates and corroborates four of the existing dates. Playback now contains 19 dated footprints; each dossier identifies the source basis. Other OSM dates remain contributor records.
- The 24 curated landmark milestones are a separate timeline. Some describe approximate phases, construction starts or institutional openings; they never supply ages to surrounding footprints.
- Undated context can be retained or hidden. It is not assigned a historical age. Building parts lack dependable parent/date associations and are omitted from isolated chronological views.
- Roof colours classify recorded tags; this update does not reconstruct roof meshes. Historic/heritage tags do not establish legal protection.
- The animation does not reconstruct demolished buildings, historical streets or land cover.
- Research analysis, CSV, GeoJSON and briefs retain the study-area and footprint-size filter. The map's chronology/context presentation is separate. PNG exports include the current map palette and date/context caption.

## Motion and verification

Manual camera interaction interrupts playback and tours. Hidden tabs stop playback. Reduced-motion users retain static sliders and scene changes; automated chronology, orbit and reveal controls are disabled. A runtime preference change finishes outstanding map transitions. Saved links restore timeline subject, cutoff, context, period and undated visibility.

`scripts/animation_smoke.py` checks actual rendered geometry at the Lotus Temple's recorded 1986 boundary, hover pixel changes, selected-card motion, count/histogram consistency, replay/pause/resume/end, isolated periods, context and saved-view restoration, empty coverage, milestone markers, reduced motion and mobile controls. Existing analysis/export and tour/profile suites remain separate regression checks.


## Requested sky-drop interaction — 18 October 2026

The five top-level left-bar layer switches now enter from above and lift away when disabled. This is an additional user-requested interaction, not a claim about the reference clip.

- Buildings and their parts translate rigidly: their complete rendered mass moves vertically in the viewport while original roof and base heights stay fixed. A stable eight-cohort stagger spreads starts over 240 ms; every cohort lands within the one-second sequence. The replay button uses this motion too. The map initially loads at rest.
- Heritage markers use independent one-second vertical motions without overwriting MapLibre's geographic positioning transform. Exiting markers immediately leave keyboard navigation and hit testing, and become hidden after the exit finishes.
- Parks, water, road/rail lines and station/tree symbols use the same staggered screen-space lift and opacity. These remain schematic map overlays.
- Eight filtered rendering cohorts use a cached display copy of the map source. Date playback updates the inspection source; the animation copy synchronizes at pause/end so it does not rebuild during every timeline step. The extra layers are disabled outside the transition so city-wide exploration does not pay their drawing cost. During flight, the animation changes only uniform translate/opacity values. It does not edit individual vertices or issue per-building state updates. Height expressions remain fixed and per-frame tile rebuilding is avoided. Original layers remain cached at zero opacity while switched off and are excluded from hit testing. No source geometry, recorded height, analysis result or exported data is modified.
- Repeated toggles reverse the building motion from its current position. Layer switches pause chronology and guided tours. Hidden tabs and runtime reduced-motion changes finish transitions immediately; reduced-motion users still have functional switches. A flat 2D view uses screen-space lift.

`tests/layerMotion.test.ts` evaluates the actual MapLibre paint expressions to check unchanged roof-to-base thickness, stagger endpoints, reversal continuity and absence of per-frame paint-expression rebuilds. `scripts/layer_motion_smoke.py` covers five switches, visible intermediate states, rapid flips, independent marker offsets, replay, tour interruption, 2D/3D, runtime reduced motion and mobile layout. Visual captures show both airborne and landed buildings.
