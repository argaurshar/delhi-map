# Delhi Atlas

An interactive urban research pilot for Central Delhi. Explore a real OpenStreetMap building dataset in 2D/3D, inspect heritage stories, draw a study area, compare study windows and export your results.

**This is an archival-data pilot, not a current citywide survey.** The bundled OpenStreetMap extract is dated **15 August 2017**. It contains **5,185 building footprints**, of which only **four** have usable storey-based height estimates. Unknown heights use a uniform **8 m display extrusion**, never a measured value. Mapping is incomplete, particularly in the old-city fabric.

## Run

Use Node.js 24 (tested with 24.19.0) and npm. No API key, database or runtime map service is required.

```bash
cd /workspace/delhi-map
npm ci
npm run dev
```

Vite listens on port 5173 on all interfaces. If working outside this cloud workspace, use your checkout's directory. All map geometry, fonts and editorial data are served locally. External source links are opened only when selected by a user.

```bash
npm test          # geometry, filtering, import validation and CSV tests
npm run build    # TypeScript check and production bundle
npm run preview  # serve the production build, port 4173 by default
```

## GitHub Pages

The deployment workflow in `.github/workflows/pages.yml` tests and builds the app on pushes to `main`, then deploys it to GitHub Pages. Repository Settings → Pages must use **GitHub Actions** as the source.

Site URL after a successful deployment: https://argaurshar.github.io/delhi-map/

The workflow builds with `npm run build -- --base=/delhi-map/`. Bundled scripts, fonts, workers, map data and downloads use this base path. For a host-root deployment, use the normal `npm run build` and upload `dist/`. Shared views use URL fragments, so no server-side routing or account is required.

## What works

- Pan, zoom, rotate, tilt, reset north and switch between 2D and 3D.
- Toggle buildings, curated heritage, transit, landscape/water and streets.
- Colour footprints by area, recorded use or available height; filter footprint sizes.
- Search bundled named buildings, station records and seven curated heritage sites.
- Inspect OSM properties and source links, or read independently curated heritage summaries.
- Play or scrub a timeline of the **seven heritage completion milestones**. This does not reconstruct historical Delhi or filter all buildings by age.
- Analyse the whole pilot, a predefined study window, a drawn polygon, an uploaded GeoJSON boundary or a circular buffer.
- Compare two study windows using identical definitions and data.
- Inspect a searchable, paginated building table.
- Export PNG, CSV, clipped GeoJSON and a Markdown research brief.
- Share camera, layers, filters, timeline, comparison windows and study boundary through the URL.

The app uses a bounded Central Delhi extract, not the entire NCT. The two named study windows are illustrative rectangles, not administrative neighbourhood boundaries. Direct users to **Data & sources** for provenance and limitations.

## How analysis works

The full bundled dataset is available to a Web Worker. Analysis does not depend on which features the renderer happens to display. It applies the footprint-size filter, clips buildings to the study boundary and pilot extent, and unions overlapping polygons before measuring coverage. Polygon holes are preserved. Area calculations use Turf's spherical model; they are useful for exploratory summaries, not cadastral measurement.

Coverage divides recorded footprint area by the selected extent **including water**. It is not FAR. Unknown heights are excluded from height summaries. Circular buffers are straight-line distances, not pedestrian network catchments. CSV contains whole-footprint area and area inside the study; GeoJSON exports contain clipped geometries. The research brief includes the exact study boundary and method.

Inputs are limited to one Polygon or MultiPolygon, at most 1,000 vertices and a 2 MB file. Self-intersections, malformed rings, non-finite/out-of-range coordinates and areas outside the pilot are rejected. Geometry properties from uploads are discarded. Spreadsheet formula prefixes are escaped in CSV exports.

## Data provenance and refresh

See [DATA_SOURCES.md](DATA_SOURCES.md), [the machine-readable manifest](public/data/manifest.json) and [the product roadmap](docs/PRODUCT_PLAN.md).

The browser does not need Python. Rebuilding the data assets does:

```bash
python -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/fetch_osm.py --archive  # pinned 2017 source, SHA-256 verified
.venv/bin/python scripts/fetch_osm.py            # current Overpass snapshot
```

The current-data operation requires network access to `overpass-api.de`. After environment publication, the latest refresh attempts returned upstream HTTP 502 errors/timeouts; an alternative service returned HTTP 500. The bundled archival dataset remains unchanged. The archival source can be reproduced from `raw.githubusercontent.com`.

The conversion script assembles supported multipolygon relations, preserves holes, repairs invalid geometry where possible, deduplicates exact geometry and drops incomplete/unsupported records. It strips contributor user metadata. A generated manifest records source URL, SHA-256, source timestamp, counts and processing limitations. Review changes and rerun data/browser checks after a refresh. The smoke test intentionally asserts this initial snapshot's counts; update those expectations after reviewing a new release, not merely to make it pass.

## Browser checks

The included smoke test uses Python Playwright and Chromium, both available in this cloud image:

```bash
npm run dev
# In another terminal:
python scripts/browser_smoke.py
```

On another machine, install Playwright and provide a Chromium executable. Set `CHROMIUM_PATH` if it differs from `/usr/bin/chromium`. Set `ATLAS_TEST_URL` to test a different server and `ATLAS_TEST_OUTPUT` to change the screenshot/download output directory (default `/workspace/scratch/delhi-browser`). Tests cover navigation, filters, heritage selection, geometric selection, all four exports, record inspection, comparison, timeline, saved-view restoration and a mobile viewport. They also assert that the app makes no remote runtime requests.

## Project structure

- `src/App.tsx`: workspace state and research panels.
- `src/components/MapView.tsx`: local MapLibre rendering and navigation.
- `src/lib/analysis.ts`: clipping, union, coverage and CSV export.
- `src/lib/analysis.worker.ts`: off-main-thread analysis.
- `src/lib/state.ts`: imported boundary and shared-view validation.
- `src/lib/data.ts`: pilot study windows and editorial heritage layer.
- `public/data/`: generated GeoJSON and source manifest.
- `scripts/`: repeatable OSM acquisition/conversion and browser validation.

## Next milestones

Refresh and audit current building coverage; validate height sources; review heritage summaries with a domain expert; acquire licensed planning/environmental layers; then move citywide geometry to vector tiles. The current 3.8 MB GeoJSON is intentionally limited to the pilot. No citywide building-age registry, legal planning determination, walking-time routing, shade simulation or PDF/CAD export is claimed.

Cloud tasks are already isolated: use the existing checkout. Do not create a Git worktree unless the user explicitly asks for one.
