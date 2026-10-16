# Delhi Atlas

An interactive urban research map with animated exploration, sourced place profiles and building analysis.

**Live site:** https://argaurshar.github.io/delhi-map/

## What is included

- **63,676 building footprints** in an approximately 206 km² urban-core extent from Mehrauli to Old Delhi, from the **15 October 2026** OpenStreetMap snapshot. Mapping remains incomplete; this is not a citywide cadastral survey.
- **24 landmark profiles** with credited local photographs, dated milestones, architectural facts, government/heritage citations and editorial spatial readings.
- **208 linked reference summaries** associated through existing OSM Wikipedia tags. Article identity is shown separately from footprint facts.
- Guided fly-throughs for Delhi through time, Mughal landscapes and civic institutions; pause, previous/next, speed, orbit and a replayable 3D reveal. Dragging pauses camera animation. Reduced-motion preferences are respected.
- Construction-date playback with synchronized year, count, histogram, growing dated footprints, pause/resume/replay, 1×/2×/4× speed, scrubbing, clickable period isolation and an undated-context toggle. Only **15 parseable building dates** participate; no ages are inferred for the remaining buildings.
- A separate **24-site Heritage milestones** timeline includes approximate dates, construction starts and institutional openings. History lenses cover Mughal, sacred, civic and water/garden sites.
- Six building context lenses: homes, commerce, public life, worship, historic tags and roof forms. Animated category colours, neutral surroundings, counts, descriptions and OSM attribution stay linked to the current context. An empty date chart is explicitly labelled.
- Hover shading, persistent selection, animated detail-card entrances, smooth city-to-building camera flights, and animated marker visibility. Camera interaction pauses playback; reduced-motion settings retain static controls. Saved links preserve chronology, context, period isolation and undated visibility.
- Footprint, use, height and recorded-date colour modes. Unknown dates stay grey; landmark dates are not applied to neighbouring buildings.
- Building dossiers with available address, storeys, material, roof, access and other public OSM tags; calculated perimeter and coordinates; nearby context and source links.
- Mapped building parts, streets, places, trees, landscape, water and transit. These are schematic extrusions, not detailed architectural meshes.
- Draw/import a study polygon or create a radius, compare neighbourhood windows, inspect records, share a view and export PNG, CSV, GeoJSON or a Markdown research brief. Study calculations and data exports retain the study boundary and footprint-size filter; visual chronology/context filters are separate. PNG exports reflect the displayed map and its current palette.

Only **3,562** building records have a height or storey tag and **16** have a construction-date tag, of which **15** can be parsed as a specific year (the remaining value is a century). Dates remain contributor records, not independently verified completion years. An unknown height uses a uniform **8 m visual extrusion** and is excluded from height statistics. Storey-derived heights use 3 m per storey. Names, heights and dates are not invented to fill gaps.

## Run and validate

Use Node 24 (`.node-version`). No API key or database is required to run the map.

```bash
npm ci
npm run dev
npm test
npm run build
```

Cloud tasks are isolated: use the existing checkout at `/workspace/delhi-map`, without creating a separate worktree unless explicitly requested.

For GitHub Pages:

```bash
npm run build -- --base=/delhi-map/
npm run preview -- --base=/delhi-map/ --port 4175
```

The `.github/workflows/pages.yml` workflow tests, builds and deploys pushes to `main`. GitHub Pages uses **GitHub Actions** as its source. All fonts, images, geometry and reference text are bundled; source links open only when a user follows them.

Browser checks require Python Playwright and Chromium:

```bash
ATLAS_TEST_URL=http://127.0.0.1:4175/delhi-map/ python scripts/browser_smoke.py
ATLAS_TEST_URL=http://127.0.0.1:4175/delhi-map/ python scripts/experience_smoke.py
ATLAS_TEST_URL=http://127.0.0.1:4175/delhi-map/ python scripts/animation_smoke.py
```

Set `CHROMIUM_PATH` and `ATLAS_TEST_OUTPUT` if necessary. The checks cover source loading, map interactions, study geometry, exports, reference profiles, tour behavior, actual orbit movement, reduced motion and mobile layouts. The animation check verifies that an actual rendered Lotus Temple footprint disappears before its recorded year and reappears at that year; it also checks hover pixels, period filters and chart reconciliation.

## Refresh data

The browser does not need Python. Data preparation does:

```bash
python -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
npm run data:refresh
python scripts/enrich_references.py
```

The default refresh downloads the Geofabrik Northern Zone PBF (about 224 MB in this release), verifies the provider checksum, extracts the bounded area, generates GeoJSON plus a compressed download, and computes full-extent statistics. It caps unexpected downloads at 400 MiB for review. Public tags are retained; contributor identities are not copied.

The full map download is approximately 7.4 MB compressed. Whole-extent statistics are precomputed with geometric union and the same spherical area formula as Turf. Custom areas still calculate in a Web Worker, with bounding-box rejection before geometric clipping. Full and clipped geometries are preserved for exports. Three records that merely touch the extent or have under 0.01 m² inside it are omitted from study counts, so the full-extent analysis contains **63,673** buildings.

`--overpass` is an alternative service; `--archive` reproduces the historical source within the current extent. A data refresh changes expected counts: review the manifest, geometry validity, source dates and meaningful browser checks before publishing.

## Evidence and limits

See [DATA_SOURCES.md](DATA_SOURCES.md) for every profile and image credit, the derived database licence and the reference-text licence. Each source is also linked in the app. See [docs/VALIDATION.md](docs/VALIDATION.md) for release checks and [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) for the original roadmap.

The app does not claim complete building ages, owner identities, legal planning status, surveyed heights, FAR, pedestrian travel-time catchments, solar analysis or photorealistic landmark geometry. Verify professional decisions against current primary records and site surveys.
