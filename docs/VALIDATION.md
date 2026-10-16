# Pilot validation

Validated in the current cloud instance with Node 24.19.0, Python 3.12 and headless Chromium using software WebGL.

- Repeated `scripts/setup.sh`: frozen npm installation, Python data prerequisites, tests and production build passed.
- TypeScript and Vite production build passed. Vite reports a bundle-size advisory for the map renderer; citywide tiling and further loading optimizations remain roadmap work.
- All 9 unit tests passed: clipping, overlap union, polygon holes, unknown-height handling, filter/export consistency, empty selection, boundary validation, shared-view rejection and CSV escaping.
- Full browser smoke workflow passed against both the Vite development server and the production preview.
- Browser checks exercised rendering, 2D/3D, layers, search, source cards, radius/polygon/imported study areas, CSV/GeoJSON/PNG/Markdown downloads, the record table, comparison, timeline, shared-view restoration, dialog dismissal and a 390 × 844 mobile viewport.
- No uncaught JavaScript errors or external runtime requests during browser checks.
- The filtered Connaught Place test selection contained 53 building records; CSV and clipped GeoJSON exports both contained exactly 53 records.
- All 7,280 generated features have valid nonempty geometry and unique source IDs. Breakdown: 5,185 buildings, 1,695 street ways, 296 rail ways, 63 landscape features, 12 water features and 29 station records.
- The archive SHA-256 was verified; rerunning its conversion reproduced the GeoJSON and manifest byte-for-byte.
- `npm run format:check` passed.
- GitHub Pages build (`--base=/delhi-map/`) passed all 9 unit tests and the full browser smoke workflow at the `/delhi-map/` path, including map loading, exports, shared views and mobile layout. No uncaught JavaScript errors or external runtime requests occurred.

Current processes were started for development and production validation. They must restart after environment restoration. Installation and startup instructions were saved to the cloud environment draft; environment publication has completed. Public deployment is tracked in the repository’s GitHub Pages workflow.

This validates the software workflow, not historical accuracy, citywide completeness, current conditions, legal planning status, cadastral measurements or a performance target on ordinary end-user hardware. The 2017 snapshot and approximate editorial heritage markers retain their stated limitations. Live Overpass refresh attempts after publication failed with upstream HTTP errors/timeouts, so the archival dataset remains in use.
