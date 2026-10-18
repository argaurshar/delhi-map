# Amsterdam reference audit

Captured 18 October 2026 from [LAYRS: Amsterdam](https://stop-token.com/lab/amsterdam/). This audit separates the running interface, shipped source, and features that were not verified. It is an audit of the current website, not a claim that the earlier uploaded video was inspected frame by frame or that the website still exactly matches that video.

## REA installation and scope

The tool used is the user's corrected repository, [morluto/rea](https://github.com/morluto/rea), not the earlier GitHub topic page. Its skill checkout is `/workspace/tools/rea/.agents/skills/reverse-engineer-anything`. The working published CLI is **REA 6.5.0**:

```sh
/workspace/tools/rea-runtime/node_modules/.bin/rea --version
# 6.5.0
```

The installed matching skill is at `/workspace/tools/rea-runtime/node_modules/rea-agents/skills/reverse-engineer-anything/SKILL.md`. The CLI and bundled skill are installed locally; this does not register a new MCP server in the active session. Reproduce the scoped installation with Node 24 and npm:

```sh
npm install --prefix /workspace/tools/rea-runtime --cache /workspace/tools/npm-cache --ignore-scripts --omit=optional --no-audit --no-fund rea-agents@6.5.0
```

The repository checkout's package declares 6.6.0, which was unpublished at installation time. That version must not be reported as the installed CLI. REA inspected the downloaded application as inert text; it did not execute the application. Browser inspection was a separate activity.

Evidence record:

| Item                            | Value                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Operation                       | `analyze_javascript_application`                                                                  |
| Evidence authority / confidence | `shipped-artifact` / `derived`                                                                    |
| Selected source                 | `app.js` only                                                                                     |
| Inventoried container           | `/workspace/research/amsterdam/shipped` — `app.js`, `index.html`, `amsterdam.json`, `layers.json` |
| Source analysis                 | 1 JavaScript file, 134,442 text bytes, 23,054 AST nodes, 0 parse failures                         |
| Evidence ID                     | `ev_9f630f5d2c1a20870b0fea7a801da9ac7639f4da447d9f324e9ffb5095e6921b`                             |
| Container SHA-256               | `1a69997d767a99c6a0d67a89d67cf2f3d07a64e85fdbb92bd292c8e71c96b73e`                                |
| `app.js` SHA-256                | `d06275781a0951af18643ebc5457f2ac66d6e3d30f90ad753eaefb3ac90977ec`                                |
| Evidence JSON SHA-256           | `3d28e96a6d23b65539239e4df7a033010ab4346763920d7dead4a2cb178c54f5`                                |

The evidence JSON is retained at `/workspace/research/amsterdam/rea-evidence.json`. REA explicitly reports three inventoried files outside the selected analysis scope. References to config and layer contents below come from separate direct reads, not REA analysis of those files. Static imports and endpoints do not establish successful runtime execution. Dynamic relationships, unselected sources, geometry packs, address shards, article/photo data, the separate graph page and backend pipelines were not fully reconstructed. No claim of complete application coverage follows from this record.

## Observed running interface

The browser captures at `/workspace/scratch/amsterdam-inspection/01-periods.png`, `02-layers.png`, and `interface.txt` show:

- A dense, tilted 3D city model with individual building masses, waterways and street context. The displayed total is **191,999 buildings**.
- A **Period** view with a **Built in** panel, ten dated colour bands, counts, and the instruction “Click a period to see it alone. Paler buildings have an approximate year.” The visible label is “Built in,” not “Built here.”
- A bottom construction-year histogram, a play control, and a large “Today” indicator.
- A **Layers** view that changes the city to a pale model and lists thematic layers with counts and date ranges. Storeys and Energy label appear alongside historical subjects.
- Visible **Graph**, **Walk**, **Quests**, search, About and EN/NL controls. Their presence is observed; successful completion of every workflow is not.
- The navigation instruction “Drag to turn. Right-drag or Shift-drag to move. Scroll to zoom.”

The directly read `layers.json` contains **30 context layers**, including gables, architects, protected heritage, residents, street art, housing, planning, war, religion, merchants and cultural figures. Layer records include source links and, where applicable, caveats, category groups and building-specific notes. Some layers have no individual notes; a layer-wide source should not be described as a unique researched story for every footprint.

The config reports 191,999 buildings and years 1192–2025. It distinguishes dating flags and storey sources: 84,945 buildings use the 3D BAG model and 107,054 use a height-derived estimate. The interface lists 92,350 energy-labelled buildings. These are Amsterdam dataset properties, not evidence of equivalent Delhi coverage.

## Animation and interaction recovered from source

Line references below refer to the captured `app.js` hash above. They describe implemented code paths, not independently measured frame timings.

| Mechanism                      | Source evidence                                       | Behaviour                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tile arrival and film entrance | `VERT`, lines 417–432                                 | A stable seed from the building ID chooses a direction and delay. The whole vertex position receives sideways and upward offsets that decay cubically. The source specifies approximately 180–340 m lateral displacement and 260–500 m altitude in decimetre geometry units.                              |
| Arrival stagger                | Lines 421–425                                         | `clamp((uNow-uBorn)/0.9 - seed*0.35, 0, 1)` gives a 0.9-second per-building transition and up to roughly 0.315 seconds of delay. It is a staggered flight, not a measured gravity simulation.                                                                                                             |
| Historical film                | Lines 2046–2071, 2279–2286                            | Play/pause; a default 30-second film, overridable by `?film=`; 35% of playback time before 1850. The entrance window is adjusted toward about 0.8 seconds of screen time.                                                                                                                                 |
| Opening a context layer        | Lines 444–448, 1930–1936                              | Matching buildings scale vertically out of the ground with an overshooting ease and seeded wave: 0.55 seconds plus up to 0.33 seconds of stagger. This is a different effect from the sky arrival.                                                                                                        |
| Date and period filtering      | Lines 1796–1807, 2029–2043                            | A period click isolates that period; clicking the isolated period again restores all. Two histogram handles select an upper date and lower emphasis boundary. Older buildings are muted by the lower boundary. Source comments explicitly distinguish immediate filter/scrub updates from film entrances. |
| Camera movement                | Lines 206–216, 908–922                                | Three.js `MapControls` with damping, turn/tilt/pan/zoom; a 1.4-second eased flight to a story or result. `fitToLayer` frames the active layer with room for the panel.                                                                                                                                    |
| Highlighting                   | Shader lines 453–469; search around 2178              | Hover/selection darken the building; searched buildings retain colour while other buildings fade. Walks can focus up to 160 buildings.                                                                                                                                                                    |
| Street and water labels        | Lines 257–330                                         | Labels follow mapped street geometry, appear with zoom and use collision rejection. A rejected label is hidden, not moved onto another building.                                                                                                                                                          |
| Building information           | `building`, `cardHeadHtml`, `cardHtml`, lines 593–824 | Hover cards, pinned stories, sources, dates and dating caveats, height/storey provenance, optional energy, architects, styles, residents, addresses and photo sequences. Cards load additional data lazily.                                                                                               |

The source's sky entrance and layer-opening rise are separate mechanisms. Delhi's requested **toggle-on fall from above and toggle-off lift** is an intentional adaptation; it should not be described as an exact copy of every reference layer transition.

The reference names buildings through the associated article label and address record (`cardHeadHtml`, lines 685–700). It avoids repeating an address as a name and can omit the name heading when no label exists. It does not justify inventing a name for each anonymous footprint.

Walk and quest implementation is visible in `app.js`: interest/start/distance selection, route ribbons and numbered stops, KML and Google Maps links; building/location/year quizzes, scores, hints and browser-local progress. The walking implementation states that its own lines are approximate and Google Maps supplies walking directions. The **Graph** control links to a separate `graph.html` page; that page was not part of the selected source analysis.

## Delhi adaptations and evidence gaps

Delhi's retained source is the existing, verified OSM/Geofabrik snapshot dated **2026-10-15**, for the bounded pilot area. The enrichment does not replace it with a speculative city-wide dataset.

| Request                                          | Delhi adaptation and boundary                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bright building-use colours                      | Classify recorded building/amenity/shop/office use with a clear legend. Keep “use not recorded” distinct; colour cannot supply a missing use. A visually brighter unknown category must not imply residential use.                                                                                                                                                                                                                 |
| Built-in filtration                              | Use recorded construction dates and reviewed exact-footprint facts. The source has only **16 raw `start_date` tags** among **63,676 buildings**; raw tags are not automatically 16 valid construction years. Keep undated buildings explicit. Amsterdam's near-complete dates cannot be transferred to Delhi.                                                                                                                      |
| Exact names and building details                 | Preserve `name`, multilingual names, official names, address and detail tags from the **same source record**. Named building coverage rises from **1,238 to 1,239**, including the exact Hindi name नीला गुम्बद. Show a missing-name state and source ID for others. “Everyday building” is a category description, not an individual building name. Nearby POI names must not be assigned to footprints without a verified match. |
| Public/private spaces                            | Distinguish **access** from **ownership**. Only **29 building records** have an access tag; none have `ownership`, and one has `owner`. Public access is not public ownership, and missing access does not mean private. Retain unknown states and expose recorded tags.                                                                                                                                                           |
| Brighter open spaces, road areas and hard paving | Keep the existing green/water/road geometries. Add **299 explicit area polygons**: 253 parking, 27 pedestrian areas, 18 road areas and 1 square. Of these, **47 have explicitly hard surfaces**, 3 soft surfaces and 249 unrecorded/unclassified surfaces. Parking alone is not evidence of hard paving.                                                                                                                           |
| Better researched landmark cards                 | Use sourced records attached to verified feature IDs. Keep separately located heritage/story points distinct from exact footprint matches. For ordinary buildings, show available raw facts and links instead of invented stories.                                                                                                                                                                                                 |
| Reference-level detail                           | Amsterdam's BAG, RVO and municipal archive coverage explains much of its richer detail. Delhi needs equivalent licensed, matchable datasets before promising every building's name, age, owner, interior use or history.                                                                                                                                                                                                           |

The data enrichment preserves all **114,401 pre-existing features** exactly in geometry, IDs, kinds, heights, dates, levels, uses and centers; it retains **995 building parts** and leaves the existing overview statistics unchanged. The 299 supplemental area features use separate `:area` display IDs with canonical OSM source links. Source fields retained include access, ownership, surface, multilingual/official names and address details. Three focused extraction tests, unique-ID checks, valid-area checks and an exact gzip/GeoJSON comparison passed.

No public/private ownership filter was observed in the captured Amsterdam panels or the four-mode definition and 30-layer catalogue reviewed here. It is a useful Delhi-specific request, but not a verified reference feature. Energy labels, a full relationship graph, photo histories, generated walking routes, quests, and comprehensive per-building names remain separate capabilities or data dependencies; this audit does not claim they have all been reproduced in Delhi.
