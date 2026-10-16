# Delhi Atlas — product and implementation plan

Status: proposal, not an implemented or validated application. Working name only.

## 1. Product decision

Build a browser application for architects, urban designers and planners to explore Delhi in 2D/3D, select a study area, compare evidence layers, and export a reproducible site-analysis package. Use the Amsterdam reference's visual clarity, animated time control and contextual building stories, with an original identity and Delhi-specific research tools.

Start with the National Capital Territory of Delhi, explicitly excluding the wider NCR from the initial boundary. Offer citywide context where licensed data permits, and deeper validation in a pilot covering Shahjahanabad and Connaught Place. Add Mehrauli, Nizamuddin/Lodhi and other contrasting urban fabrics after the pilot workflow works.

The first milestone is a working vertical slice: load real building geometry, rotate the map, apply a layer, select a building or study area, inspect sources, and export the result.

## 2. What the supplied video demonstrates

The attachment is 15.267 seconds long, 960 × 720, with 458 frames at 30 fps. All frames were extracted and reviewed in sequential contact sheets; selected frames were also inspected at full resolution.

| Approximate time | Visible behaviour | Delhi interpretation |
| --- | --- | --- |
| 0–1.5 s | Coloured building extrusions, period legend, city overview and camera movement | A readable built-form overview with category counts and a restrained basemap |
| 1.5–5.0 s | Year advances; buildings appear in chronological order; bottom histogram | Play/pause and scrub supported building dates, with unknown dates separately identified |
| 5.0–7.1 s | Switch to Context layers; buildings become neutral; thematic catalogue opens | Searchable layer catalogue grouped around actual research questions |
| 7.1–9.8 s | Gables theme highlights architectural types; camera approaches the selected area | Highlight havelis, courtyard forms or other documented typologies without obscuring surrounding context |
| 9.8–11.6 s | Building panel includes photograph, year, narrative, people, related layers and source links | An evidence card with geometry attributes, histories, confidence and linked sources |
| 11.6–15.27 s | Return to catalogue and select wartime damage; another set of buildings is highlighted | Switch among independent themes without losing the user's study area |

Floors and Energy tabs are visible, but their functionality is not demonstrated. Exports, site analysis and comparative studies are proposed additions; the clip does not establish that they exist in the reference.

Crucial temporal distinction: the reference describes buildings standing today. Revealing those buildings by construction date does not reconstruct all buildings that existed in a historical year. Delhi must distinguish a present-day stock timeline from historical reconstruction, which requires dated historical geometry and demolition evidence.

## 3. Interface and navigation

- Centre: map with pan, zoom, rotate, tilt, reset north, reset view and 2D/3D switch. Provide visible controls as well as mouse/touch gestures.
- Top: location search, Explore / Analyse / Compare modes, saved views and export.
- Left: layer catalogue, filters, legend, opacity, coverage information and clear-all.
- Right: selected building or study-area inspector, including facts, charts, stories and sources.
- Bottom: time slider and histogram only for layers with meaningful temporal data. State whether time represents construction, observation or an event.
- Persistent: scale, north indicator, attribution and a concise indicator of missing/estimated data.

Use one primary colour encoding at a time. Show supporting layers as outlines, lines, translucent rasters or symbols. If multiple quantitative colour themes are needed, use linked comparison panes. Keep unknown values visually distinct from zero, and use colours that remain distinguishable for colour-blind users.

Every filter updates the map, counts, charts and export together. URLs preserve the camera, active layers, date filters and study area when practical. Use keyboard-accessible controls, a table alternative for selected features, English initially and a structure ready for Hindi labels.

## 4. Layer roadmap

P0 is the first functioning product. P1 follows a validated pilot. P2 requires additional evidence or modelling.

| Layer | Contents and useful filters | Research question / output | Priority |
| --- | --- | --- | --- |
| Base geography | NCT and dated administrative boundaries, neighbourhood labels, roads, railway, Yamuna, water and parks | Where is the site, and what surrounds it? Context map | P0 |
| Built form | Footprints, known height/storeys, measured/estimated/unknown flag, footprint size | How dense and tall is the recorded built fabric? Figure-ground, coverage and height distribution | P0 |
| Heritage and city history | Documented sites, era, architect where known, architectural type, source-backed stories | What historic fabric informs a proposal? Heritage inventory and evidence cards | P0 curated pilot |
| Mobility | Metro stations and lines, mapped walking network, roads and crossings | How accessible is the study area? Distance buffers first; validated walking catchments later | P0 buffers; P1 routing |
| Landscape and water | Parks, Ridge context, water bodies, visible land cover, dated canopy estimates | Where are open-space gaps and landscape connections? Coverage maps and proximity summaries | P0 basic; P1 canopy |
| Construction periods and growth | Verified dates/ranges; settlement development history kept separately; dated satellite built-up extents | How has the city changed? Present-day stock timeline and separate urban expansion maps | P1, data-dependent |
| Land use and planning | Observed uses separately from adopted/proposed plans; document date and legal status | How does existing use relate to planning intent? Overlay and document references | P1 |
| Heat and environmental context | Dated land-surface-temperature imagery, vegetation indices, air-quality monitoring points | Where do exposed surfaces coincide with limited vegetation? Comparative screening maps | P1 |
| Flood and drainage context | Dated observed inundation, official hazard layers where available, drainage and elevation | Which areas overlap mapped water-related concerns? Exposure screening | P1, data-dependent |
| Public amenities | Mapped schools, health facilities, parks and public facilities; source and coverage date | Which areas have fewer mapped amenities nearby? Counts and accessibility summaries | P1 |
| Architectural culture | Documented havelis, courtyards, baolis, modernist works, public art, markets and oral histories | What gives a place its character? Curated thematic walks and research collections | P1 |
| Sun, shade and design scenarios | Date/time, building heights and user-supplied massing | How might massing affect shade? Explicitly approximate scenario comparison | P2 |

Possible history themes include Delhi's historic settlements, Shahjahanabad, colonial New Delhi, Partition-era settlement change, post-independence housing, urban villages, Metro-era growth, water heritage and contemporary public art. A neighbourhood's founding date must never be assigned to every current building in that neighbourhood.

## 5. Data feasibility comes first

The following are candidate sources to investigate, not confirmed downloads or licensed integrations. This planning exercise has not verified their current coverage, access terms or redistribution rights.

| Need | Candidate source families | Gate before use |
| --- | --- | --- |
| Buildings and streets | OpenStreetMap; Overture building releases; Google Open Buildings where coverage and licence permit | Inspect Delhi coverage, licence and attribution; compare a stratified pilot sample; deduplicate overlapping footprints |
| Heights | Documented height/storey tags, permitted local surveys or institutional records | Preserve units and measurement method; mark storey-based estimates explicitly; avoid decorative heights presented as measurements |
| Heritage | ASI, INTACH Delhi, municipal/state heritage records, archives and cited scholarship | Verify location, designation and source; check image and text reuse rights |
| Planning and boundaries | DDA, relevant Delhi agencies, municipal/administrative releases, permitted geospatial portals | Verify publication date, adopted versus draft status, boundary version, accuracy and permitted reuse |
| Transit | DMRC and Delhi transport publications or feeds where available; OSM | Verify route/station status and data licence; validate walkable network connectivity |
| Land cover and change | Landsat, Sentinel and other documented open satellite products | Record acquisition date, cloud treatment, resolution and uncertainty; validate derived classification |
| Flood and environmental observations | Relevant water/disaster agencies, NRSC products where accessible, CPCB/DPCC observations | Confirm event/date, spatial resolution and permitted reuse; keep observations separate from modelled risk |
| Historic urban change | Archives, licensed historical maps, publications and surveys | Georeference carefully; record positional error, temporal extent and interpretation |

Avoid depending on a complete citywide construction-year registry until one is verified. Unknown construction years remain unknown. If dates are sparse, make built form the opening mode and offer the timeline only for documented records. Historic city growth can still be shown through independently sourced settlement extents and satellite observations.

If heights are absent, offer footprint-only 2D or a clearly labelled uniform extrusion for visual context. Uniform extrusion must be excluded from height statistics and shade calculations.

Each attribute needs its own provenance: source identifier/URL, licence, source date, retrieval date, spatial resolution, method, uncertainty and review status. Record an independently versioned dataset release. Stable internal IDs connect footprints, stories and multiple sources without assuming their identifiers are interchangeable.

## 6. Research workflows and outputs

### Site brief

1. Search for a place or import a GeoJSON study boundary.
2. Draw a polygon or choose a radius around the site.
3. Select built form, heritage, transit and landscape layers.
4. Inspect coverage and missing data before interpreting the charts.
5. Export an analysis sheet and underlying permitted data.

The first release should export a PNG map, CSV summary, GeoJSON selection and shareable view. Add a PDF brief once layout and metrics are stable. Every export includes the selected extent, filters, units, sources, data release and caveats. A 3D perspective has no single uniform scale: use a 2D map for a measured analysis sheet.

### Compare neighbourhoods

Select two boundaries and compare footprint coverage, recorded height distributions, mapped open space and amenity counts with matching dates and definitions. Show sample coverage and normalize metrics by area where appropriate. Do not imply a whole neighbourhood is represented by sparse mapped features.

### Heritage exploration

Filter documented period/type, fade unrelated features, inspect stories and collect references. Community submissions require sources and review before joining the published layer. AI can assist extraction and drafting, with a reviewer responsible for published historical claims.

### Metric definitions

- Building coverage = unioned building-footprint area within the selected boundary / selected land area, using a documented treatment of water. This is recorded footprint coverage, not floor-area ratio.
- Floor-area ratio requires defensible floor area and plot/site boundaries; do not calculate authoritative FAR from footprints and guessed storeys.
- Compute distances and areas using a suitable local projected CRS; WGS 84 / UTM zone 43N is a candidate for Delhi. Export GeoJSON in longitude/latitude with metric results as labelled attributes.
- Straight-line buffers are not walking catchments. Routing must respect mapped paths, barriers and entrances.
- Surface temperature is not air temperature or pedestrian thermal comfort. Monitoring stations are not building-level air-quality measurements.
- Proposed regulatory buffers are screening aids, not legal determinations; display the cited applicable rule and authoritative boundary source.

## 7. Architecture

Start with React, TypeScript, Vite and MapLibre GL JS. Use building extrusion layers for the core 3D experience. Add deck.gl only when custom analytical rendering is justified. Use vector tiles/PMTiles for large static geometry and raster tiles for imagery; do not load all Delhi buildings as one GeoJSON file.

A reproducible Python pipeline using GDAL/GeoPandas validates geometry, normalizes schemas, deduplicates records and produces versioned tiles plus provenance manifests. Keep compact narrative attributes outside geometry tiles, loaded on selection. Use object storage/CDN hosting with HTTP range support for static tile archives.

The pilot can use static datasets and client-side calculations for bounded selections. Introduce PostGIS and a small API when citywide spatial queries, persistent projects, routing or multi-user contributions require them. Analyses must use complete source geometry for the study area rather than only features loaded in the current viewport.

Performance strategy: load by extent/zoom, simplify at low zoom, cap expensive overlays, put heavier calculations in workers, cancel stale requests and provide a reduced-detail 2D mode. Save view state independently of data release so older shared views can state when their datasets have changed.

Security and operations: limit uploaded file size and geometry complexity, treat story content as untrusted text, validate API inputs, keep privileged service keys server-side, and retain data attribution in exports.

## 8. Delivery sequence and completion gates

### Phase 1 — Data and design spike

Confirm the NCT boundary, inspect source licences, acquire a small pilot extract, audit building coverage and height/date completeness, and agree metric definitions. Produce a layer inventory and an interface wireframe. If age coverage is insufficient, commit to the built-form-first fallback.

### Phase 2 — Functional vertical slice

Implement the pilot map, rotate/tilt/zoom, search, basic layer toggles, building picking, evidence cards, study-area drawing and PNG/CSV/GeoJSON export. Use real geometry with visibly distinguished sample content if any is necessary during development.

Completion gate: a user can select a site, apply a filter, inspect a sourced feature and download a matching result without developer intervention.

### Phase 3 — Research pilot

Add comparison, audited metrics, the curated heritage collection, mobility buffers, coverage reporting, saved views and accessibility improvements. Validate with a small group of architects/planners using real site-study tasks; measure whether outputs answer their research questions.

### Phase 4 — Citywide expansion

Tile approved citywide data, add deeper neighbourhood coverage, introduce the API when needed and implement refresh/versioning. Add temporal animation only for datasets whose time semantics are established. Expand environmental layers after checking resolution and interpretability.

### Phase 5 — Advanced tools

Consider validated network catchments, approximate shade scenarios, CAD/Rhino-compatible exports, richer historical reconstructions and reviewed community contributions. Do not make these prerequisites for a useful first release.

A schedule should be estimated after the data spike; data access and cleaning are major unknowns. Track software effort separately from source acquisition and expert validation.

## 9. Acceptance checks

- Map navigation, selection and filters work together in a browser test; no placeholder interaction is counted as complete.
- Counts, charts and exported rows agree for a fixed study boundary and data release, including geometries clipped at its edge.
- No duplicate footprints or unexplained invalid polygons in the released pilot dataset.
- Missing values are handled explicitly; estimated heights and approximate dates are recognizable in cards, filters and exports.
- Every published story links to evidence; every layer has a source, date, licence and coverage statement.
- The timeline accurately states whether it filters surviving stock, dated observations or historical reconstruction.
- A shared view restores the intended state; unavailable or updated datasets produce a clear message.
- Test responsive controls and keyboard access; measure performance on a declared ordinary laptop and a lower-powered device.
- Provisional performance targets: first usable pilot view within 5 seconds on a specified connection, smooth interaction near 30 fps on the baseline laptop, and standard pilot selections summarized within 2 seconds. Benchmark before committing these as service guarantees.
- A planner completes a site brief and neighbourhood comparison, and can trace each exported metric to its source and definition.

## 10. Recommended first build

A real 3D map of the Shahjahanabad–Connaught Place pilot, with building footprints, explicitly qualified heights, a curated heritage layer, Metro context, parks/water, study-area selection, source cards and downloadable results. Retain Delhi-wide navigation with clear pilot coverage boundaries.

This delivers the reference's central interaction and a useful research outcome while the larger historical and environmental datasets are assessed.
