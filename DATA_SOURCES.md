# Data sources and reuse

## OpenStreetMap geometry

- Original database: **© OpenStreetMap contributors**.
- Licence: [Open Database Licence 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See [OpenStreetMap attribution guidance](https://www.openstreetmap.org/copyright).
- Snapshot recorded in the source XML: **2017-08-15T12:24:01Z**.
- Public archive: [hassan23/OpenStreetMap-Project-New-Delhi](https://github.com/hassan23/OpenStreetMap-Project-New-Delhi), pinned commit `0d85639cbe08c65433b5cba697c7b2ac66b51169`, `NewDelhi.osm`.
- Original extract SHA-256: `e821747e8c588bc2a14ff3a8681d020d7b6a5a032210a2a2d0c10aeffdc6626f`.
- The XML identifies the data as OpenStreetMap data made available under ODbL. The archive's original README identifies an Overpass extraction.
- Derived files: `public/data/delhi.geojson` and `public/data/manifest.json`.
- Study extent: west 77.2025°, south 28.618°, east 77.255°, north 28.677°.

The generated geometry database remains subject to ODbL. Keep attribution and applicable share-alike obligations when distributing or modifying it. The CSV/GeoJSON exports retain source links. PNG exports contain attribution. No third-party map tile service is used.

Processing includes assembling supported multipolygon relations, geometry repair, clipping contextual layers and deduplicating exact geometries. Buildings intersecting the pilot edge may be retained in full to preserve their original footprint; analysis clips them to the effective study boundary. Incomplete ways and unsupported geometries are skipped. The manifest's skipped count refers to processing the original input, including records outside the final pilot, and is not a count of missing buildings inside the pilot.

All `height_m` values in the initial release are estimates from `building:levels × 3 m`, not measurements. Four building records have these estimates. Other footprints have a null height. Uniform 8 m map extrusions are rendering values only and are absent from the factual data properties. Construction dates are not fabricated from the age of a neighbourhood.

Station records may include separate representations of an interchange or different modes. A point count is not a count of unique Metro stations. Railway geometry reflects the historical snapshot, not current service status.

## Heritage editorial layer

The seven place summaries are original short descriptions with linked reference pages. Coordinates are approximate editorial markers, separate from the footprint database. They must not be interpreted as a verified footprint match or a complete inventory of protected sites. An architectural motif in the inspector is an original SVG illustration, not a documentary photograph.

| Place | Date shown | Reference |
| --- | --- | --- |
| Red Fort | Completed 1648 | [UNESCO World Heritage Centre](https://whc.unesco.org/en/list/231/) |
| Jama Masjid | Completed 1656 | [Wikipedia](https://en.wikipedia.org/wiki/Jama_Masjid,_Delhi) |
| Fatehpuri Masjid | Built 1650 | [Wikipedia](https://en.wikipedia.org/wiki/Fatehpuri_Mosque) |
| Delhi Town Hall | Completed 1863 | [Wikipedia](https://en.wikipedia.org/wiki/Delhi_Town_Hall) |
| Connaught Place | Completed 1933 | [Wikipedia](https://en.wikipedia.org/wiki/Connaught_Place,_New_Delhi) |
| Jantar Mantar | Built 1724 | [Wikipedia](https://en.wikipedia.org/wiki/Jantar_Mantar,_New_Delhi) |
| Sacred Heart Cathedral | Completed 1935 | [Wikipedia](https://en.wikipedia.org/wiki/Sacred_Heart_Cathedral,_New_Delhi) |

These references identify sources for subsequent review; live page content and historical claims were not independently audited in this implementation. Expert review is a milestone before professional publication. The heritage timeline reveals these seven named sites by their documented milestone; it is not a historical reconstruction of the city.

## Software assets

Inter and Instrument Serif fonts are bundled through Fontsource packages, retaining their package licence files. Icons are from Lucide. Consult installed packages for their respective licences. Dataset licensing is distinct from licensing of the application source.
