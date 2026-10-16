# Sources and licences

Data refresh: 16 October 2026. The map is an exploratory urban atlas, not a cadastral or measured building survey.

## OpenStreetMap geometry

- Source: [Geofabrik Northern Zone](https://download.geofabrik.de/asia/india/northern-zone.html).
- Snapshot: **2026-10-15T20:21:00Z**.
- Download verified against the provider’s MD5 checksum; the manifest also records the SHA-256 of the PBF and extracted XML.
- Extent: `[77.17, 28.515, 77.285, 28.68]` — approximately 206 km² from Mehrauli to Old Delhi. It does not cover the whole NCT.
- 63,676 footprint records; 63,673 intersect the study extent with at least 0.01 m² of area. Three edge-touching records are omitted from study statistics.
- 995 building-part records, 36,882 street ways, 1,093 rail ways, 94 station records, 2,148 green areas, 210 water areas, 2,078 mapped trees and 7,225 named place nodes.
- 1,238 buildings have names, 3,562 have height/storey information, and only 16 have a `start_date` tag. A tag is not independent survey verification.
- Height tags remain unverified OSM values; storey estimates use 3 m per storey. Unknown heights use a uniform 8 m display extrusion and are excluded from height statistics.
- Building parts provide additional mapped massing when height is recorded; they are excluded from footprint counts and coverage to avoid double counting.
- [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The derived geometry database remains under ODbL.

## Landmark profiles

24 original editorial profiles cite public documents. Government portals are preferred, with ASI and secondary sources used where helpful. Public availability is not treated as a blanket copyright licence: source prose is summarised in original wording. Conflicting or approximate dates are labelled. Architectural readings are interpretation, not source quotations or planning advice.

| Place | Sources |
| --- | --- |
| Red Fort | [ASI · Red Fort](https://asi.nic.in/pages/WorldHeritageRedFort) |
| Jama Masjid | [Ministry of Tourism · Jama Masjid](https://www.incredibleindia.gov.in/en/delhi/delhi/jama-masjid) |
| Fatehpuri Masjid | [Wikipedia · Fatehpuri Mosque](https://en.wikipedia.org/wiki/Fatehpuri_Mosque) |
| Delhi Town Hall | [Wikipedia · Delhi Town Hall](https://en.wikipedia.org/wiki/Delhi_Town_Hall) |
| Connaught Place | [Wikipedia · Connaught Place](https://en.wikipedia.org/wiki/Connaught_Place,_New_Delhi); [Wikipedia · Connaught Place, New Delhi](https://en.wikipedia.org/wiki/Connaught_Place%2C_New_Delhi) |
| Jantar Mantar | [Delhi Tourism · Jantar Mantar](https://delhitourism.gov.in/tourist_place/jantar_mantar.html) |
| Sacred Heart Cathedral | [Delhi Tourism · Sacred Heart Cathedral](https://delhitourism.gov.in/tourist_place/spritual_delhi.html); [Wikipedia · Sacred Heart Cathedral](https://en.wikipedia.org/wiki/Sacred_Heart_Cathedral,_New_Delhi); [Wikipedia · Sacred Heart Cathedral, New Delhi](https://en.wikipedia.org/wiki/Sacred_Heart_Cathedral%2C_New_Delhi) |
| India Gate | [Ministry of Tourism · India Gate](https://www.incredibleindia.gov.in/en/delhi/delhi/india-gate) |
| Humayun’s Tomb | [Ministry of Tourism · Humayun’s Tomb](https://www.incredibleindia.gov.in/en/delhi/delhi/humayuns-tomb); [UNESCO · Humayun’s Tomb](https://whc.unesco.org/en/list/232/); [ASI · Humayun’s Tomb](https://asi.nic.in/pages/WorldHeritageHumayunTomb); [Wikipedia · Humayun's Tomb](https://en.wikipedia.org/wiki/Humayun%27s_Tomb) |
| Qutb Minar | [Ministry of Tourism · Qutb Minar](https://www.incredibleindia.gov.in/en/delhi/delhi/qutub-minar); [ASI · Qutb Minar](https://asi.nic.in/pages/WorldHeritageQutbMinar) |
| Lotus Temple | [Ministry of Tourism · Lotus Temple](https://www.incredibleindia.gov.in/en/delhi/delhi/lotus-temple) |
| Swaminarayan Akshardham | [Ministry of Tourism · Swaminarayan Akshardham](https://www.incredibleindia.gov.in/en/delhi/delhi/akshardham-temple) |
| Purana Qila | [Ministry of Tourism · Purana Qila](https://www.incredibleindia.gov.in/en/delhi/delhi/purana-quila) |
| Agrasen ki Baoli | [Ministry of Tourism · Agrasen ki Baoli](https://www.incredibleindia.gov.in/en/delhi/delhi/agrasen-ki-baoli) |
| Gurudwara Bangla Sahib | [Ministry of Tourism · Gurudwara Bangla Sahib](https://www.incredibleindia.gov.in/en/delhi/delhi/gurudwara-bangla-sahib); [Delhi Tourism · Gurudwara Bangla Sahib](https://delhitourism.gov.in/tourist_place/spritual_delhi.html) |
| Lodhi Garden | [Ministry of Tourism · Lodhi Garden](https://www.incredibleindia.gov.in/en/delhi/delhi/lodhi-garden) |
| Raj Ghat | [Ministry of Tourism · Raj Ghat](https://www.incredibleindia.gov.in/en/delhi/delhi/raj-ghat) |
| National Museum | [Ministry of Tourism · National Museum](https://www.incredibleindia.gov.in/en/delhi/delhi/national-museum); [Wikipedia · National Museum, New Delhi](https://en.wikipedia.org/wiki/National_Museum,_New_Delhi) |
| National Gallery of Modern Art | [Ministry of Tourism · National Gallery of Modern Art](https://www.incredibleindia.gov.in/en/delhi/delhi/national-gallery-of-modern-art) |
| National War Memorial | [Ministry of Tourism · National War Memorial](https://www.incredibleindia.gov.in/en/delhi/delhi/national-war-memorial); [Wikipedia · National War Memorial (India)](https://en.wikipedia.org/wiki/National_War_Memorial_%28India%29) |
| Safdarjung’s Tomb | [Delhi Tourism · Safdarjung’s Tomb](https://delhitourism.gov.in/tourist_place/safdarjang_tomb.html) |
| Rashtrapati Bhavan | [Delhi Tourism · Rashtrapati Bhavan](https://delhitourism.gov.in/aboutus/rashtrapathi_bhavan.html) |
| Samvidhan Sadan (Old Parliament House) | [Delhi Tourism · Historic Parliament House (legacy description)](https://delhitourism.gov.in/tourist_place/parliment_house.html); [Wikipedia · Old Parliament House, New Delhi](https://en.wikipedia.org/wiki/Old_Parliament_House%2C_New_Delhi) |
| Hauz Khas Complex | [Delhi Tourism · Hauz Khas Complex](https://delhitourism.gov.in/dt/explore_the_city/hauz_khas_fort.html); [Wikipedia · Hauz Khas Complex](https://en.wikipedia.org/wiki/Hauz_Khas_Complex) |

## Photographs

Images are stored locally so cards work without runtime third-party requests. They show the named sites, not current conditions. Source files were visually reviewed; each image retains author, file-page link and licence in the app. Historical images may differ from today’s surroundings.

| Place | Credit | Licence | File source |
| --- | --- | --- | --- |
| Red Fort | PerSona77 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Delhi_fort.jpg) |
| Jama Masjid | Bikashrd | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Jama_Masjid_-_In_the_Noon.jpg) |
| Fatehpuri Masjid | Indrajit Das | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Fatehpuri_Masjid_in_Delhi_19.jpg) |
| Delhi Town Hall | Varun Shiv Kapur from New Delhi, India | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Delhi_Town_Hall.jpg) |
| Connaught Place | Kabi1990 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Skyline_at_Rajiv_Chowk.JPG) |
| Jantar Mantar | AKS.9955 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Jantar_Mantar,_New_Delhi_(Misra_Yantra).jpg) |
| Sacred Heart Cathedral | Maria Krüger | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sacred_Heart_Cathedral_(New_Delhi).jpg) |
| India Gate | AKS.9955 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:India_Gate_front.jpg) |
| Humayun’s Tomb | Sourabh.biswas003 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:PXL_20231129_052234620_Humayun%E2%80%99s_Tomb_New_Delhi,_Delhi_110013_03.jpg) |
| Qutb Minar | Wasir kasab | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Qutb_Minar_2022.jpg) |
| Lotus Temple | Vandelizer | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:LotusDelhi.jpg) |
| Swaminarayan Akshardham | Swaminarayan Sanstha | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:New_Delhi_Temple.jpg) |
| Purana Qila | Airknight at English Wikipedia | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Purana_Qila_01.jpg) |
| Agrasen ki Baoli | Slyronit | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Agrasen_ki_Baoli,_New_Delhi.jpg) |
| Gurudwara Bangla Sahib | Ken Wieland from Philadelphia, USA | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Front_view_of_Gurudwara_Bangla_Sahib,_Delhi.jpg) |
| Lodhi Garden | Amaninder | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lodhi_Gardens_on_a_sunny_day.jpg) |
| Raj Ghat | Humayunn Niaz Ahmed Peerzaada from Mumbai, India | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Gandhi_Memorial.jpg) |
| National Museum | Miya.m | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:India_national_museum_01.jpg) |
| National Gallery of Modern Art | Pardeep | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Jaipur_House_Delhi.jpg) |
| National War Memorial | KCVelaga | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:National_War_Memorial_(India)_illuminated.jpg) |
| Safdarjung’s Tomb | Chitranshi | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Safdar_Jang%E2%80%99s_Tomb,_Delhi_.jpg) |
| Rashtrapati Bhavan | Tamjeed Ahmed | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Rashrapati_Bhavan_in_September_2024.jpg) |
| Samvidhan Sadan (Old Parliament House) | Bill Strong from Melbourne, Australia | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:SansadBhavan.jpg) |
| Hauz Khas Complex | Nvvchar (talk) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Feroze_Shah%27s_Tomb.JPG) |

## Linked encyclopedia references

`public/data/building-context.json` contains 208 retrieved introductions from 217 unique English article titles linked by OSM tags. Missing/non-extractable articles are omitted. The reference may concern a wider site, institution or person, so it is displayed as a linked reference, not silently assigned to the footprint.

Text attribution: Wikipedia contributors, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Each record carries its source article, retrieval date and licence; article histories identify contributors. The API introductions are excerpts/truncated extracts, not generated building descriptions. No identities are inferred from proximity.

## Reproducibility and limitations

- `npm run data:refresh` downloads and verifies the regional extract, rebuilds geometry and compressed download, and precomputes whole-extent analysis. Python requirements are pinned in `scripts/requirements.txt`.
- `python scripts/enrich_references.py` refreshes the linked text database with attribution. It stops rather than bypassing provider rate limits.
- Whole-extent statistics use Shapely union and the same spherical area formula as Turf. Custom study areas use Turf in a worker. Footprints are clipped to the extent; overlaps and polygon holes are respected.
- Dates in the timeline are site milestones, including construction starts, institutional openings and approximate periods. They do not date every surrounding building. The Date theme uses parseable OSM dates and leaves the rest grey.
- OSM coverage is uneven. Owner identity, legal status, construction condition, FAR, pedestrian travel time, solar performance and detailed architectural meshes are not supplied. Verify professional decisions against current primary records and site surveys.
