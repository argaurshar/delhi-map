# Reference animation mapping

The supplied LAYRS Amsterdam clip contains 458 frames at 30 fps (15.27 seconds). All frames were inspected in order, with key interface states reopened at native resolution. This release adapts its demonstrated interactions to Delhi's available data.

| Reference interaction | Delhi implementation |
| --- | --- |
| City overview and continuous camera navigation | Smooth overview flights, city-to-building selection flights, existing orbit and guided tours; ordinary pan/zoom/rotation remains available. |
| Buildings appear as construction dates advance | Building dates playback filters actual footprints by parseable OSM `start_date`; newly revealed dated footprints grow into view. |
| Year, count, histogram and playhead advance together | A linked exact-year histogram, animated future-bar emphasis, year counter and revealed-record count share the same cutoff and record set. |
| Play and return to Today | Play/pause/resume, replay, speed selection and automatic stop at Today. Scrubbing is additionally supported. |
| Construction-period isolation | Click a Date legend row to isolate that period; click again to clear it. Unknown dates do not enter a dated period. |
| Context layer recolouring with neutral surroundings | Six OSM building contexts: homes, commerce, public life, worship, historic tags and roof forms. A 550 ms colour interpolation transitions between palettes. Unmatched buildings remain neutral. |
| Category counts, explanation and source | Every context includes category counts, a scope explanation and OSM attribution. Counts follow the footprint-size filter across the dataset, rather than the study boundary. |
| Context-specific histogram | The building chronology uses matching dated records and the active category palette. Contexts without usable dates display an explicit empty state. |
| Hover and building selection | Map feature-state shading on hover, persistent gold selection, a detailed card entrance and dismissal. |
| Story card and photograph | Existing sourced building/landmark profiles remain available; image space is reserved by the existing photo styling. The reference's photo-loading layout shift is not reproduced. |
| Returning to the layer catalogue | All building contexts clears the active context, resets chronology to Today and restores the normal map palette. |
| Marker appearance | The separate landmark timeline fades markers in and out and updates its own milestone histogram. |

## Evidence limits

- The 63,676-footprint snapshot contains 16 start-date tags, but only 15 parse as specific years. `C14` remains unknown. Dates are contributor records, not independently checked completion years.
- The 24 curated landmark milestones are a separate timeline. Some describe approximate phases, construction starts or institutional openings; they never supply ages to surrounding footprints.
- Undated context can be retained or hidden. It is not assigned a historical age. Building parts lack dependable parent/date associations and are omitted from isolated chronological views.
- Roof colours classify recorded tags; this update does not reconstruct roof meshes. Historic/heritage tags do not establish legal protection.
- The animation does not reconstruct demolished buildings, historical streets or land cover.
- Research analysis, CSV, GeoJSON and briefs retain the study-area and footprint-size filter. The map's chronology/context presentation is separate. PNG exports include the current map palette and date/context caption.

## Motion and verification

Manual camera interaction interrupts playback and tours. Hidden tabs stop playback. Reduced-motion users retain static sliders and scene changes; automated chronology, orbit and reveal controls are disabled. A runtime preference change finishes outstanding map transitions. Saved links restore timeline subject, cutoff, context, period and undated visibility.

`scripts/animation_smoke.py` checks actual rendered geometry at the Lotus Temple's recorded 1986 boundary, hover pixel changes, selected-card motion, count/histogram consistency, replay/pause/resume/end, isolated periods, context and saved-view restoration, empty coverage, milestone markers, reduced motion and mobile controls. Existing analysis/export and tour/profile suites remain separate regression checks.
