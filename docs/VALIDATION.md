# Release validation — 16 October 2026

Validated with Node 24.19.0, Python 3.12, Shapely 2.1.2, PyOsmium 4.3.1 and headless Chromium with software WebGL.

- 14 unit tests pass: study clipping/union, holes, height evidence, filters, CSV safety, imported boundaries, saved-view rejection, conservative date parsing, exact Wikidata linking, safe external URLs, perimeter calculations and profile source/licence integrity.
- TypeScript and the production GitHub Pages build pass. The MapLibre bundle still produces a size advisory.
- The full production browser workflow passes: map rendering, 2D/3D, layers, search, sources, radius/polygon/imported study areas, filters, all four exports, records, comparison, timeline, saved views and mobile selection.
- The filtered Connaught Place test selection now contains 99 records; CSV and clipped GeoJSON both contain exactly 99 records and carry the 2026-10-15 snapshot.
- Cinematic/profile checks pass: automatic tour advance, play/pause, next stop, orbit movement, interruption on drag, loaded licensed images, source facts, OSM-linked encyclopedia text and attribution, geometry details, date colouring, history lenses, replay and reduced-motion/mobile behavior.
- No uncaught browser errors or external runtime requests occurred in the standard browser workflow. Fonts, map data, profile text and images are bundled locally.
- 114,401 geometries are valid, nonempty and have unique source IDs. Counts match the manifest. Three edge-touching / sub-0.01 m² building overlaps are excluded from whole-extent analysis.
- Geofabrik's provider checksum was verified. The complete cached refresh pipeline succeeded again; compressed GeoJSON expands byte-for-byte to the source file, and full-extent filter counts reconcile.
- Whole-extent analysis uses a precomputed geometric union with the same spherical area formula as Turf. Custom selections retain browser-worker clipping and union. This avoids the long initial union calculation for 63,676 footprints.
- Profile photographs were visually reviewed, with author, source page and licence retained. Government prose was summarised in original wording. Linked Wikipedia introductions are separately attributed under CC BY-SA 4.0.

These checks validate the software and data-processing workflow, not complete OSM coverage, the independent accuracy of every contributor tag, construction condition, legal planning status or a measured architectural model. Unknown ages and heights remain unknown. The 24-site timeline presents the explicitly labelled construction, approximate-period or institutional milestone for each site.
