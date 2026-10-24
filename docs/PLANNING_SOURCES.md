# Planning documents and mapped spaces

Checked on **24 October 2026**. This release adds a source directory and a source-backed spaces browser. It does not contain statutory zoning polygons, parcel-level controls, protected monument boundaries, or automated permission determinations.

## Government source checks

- **Delhi Development Authority:** `https://dda.gov.in/` and the www host returned HTTP 503. Master-plan and zonal-page candidates also returned 503. The app links the authority portal and explicitly leaves the currently notified master plan and MPD 2041 adoption status unverified. No draft was promoted to adopted status.
- **Archaeological Survey of India:** `https://asi.nic.in/pages/Monuments` returned HTTP 200. The page identifies the AMASR framework and describes the general 100 m prohibited area and further 200 m regulated area. These are not circles from an arbitrary map marker. Their application requires the protected boundary and applicable instruments.
- **National Monuments Authority:** the Acts & Rules directory, “Monuments whose bye laws have been Laid in Parliament” directory and separate draft-heritage-bye-laws directory returned HTTP 200. They were read as separate sources with separate statuses.
- The Parliament directory supplied exact official document links for **Purana Qila** and **Humayun’s Tomb–Sunder Nursery–Batashewala**. Its “22 August 2023” field is treated as a portal-update date, not an inferred gazette or commencement date. The app links the documents and does not attach their legal provisions to individual OSM footprints.
- The same directory includes Nizamuddin Basti, Jahaz Mahal and Chor Minar. Mentioning a monument in this directory is not an identity match for every nearby building.

The selected directory URLs are stored in `src/lib/planning.ts`. Local capture HTML is in `/workspace/scratch/planning-sources/` for this investigation; it is not an application dependency. Links are followed only on user action. No third-party code, government map imagery or document content is embedded in the application.

No authoritative, licensed machine-readable statutory boundaries were verified in this investigation. A true zoning overlay remains dependent on obtaining those records with usable boundary coordinates, scale, version and reproduction terms. The app's geographic coverage remains the existing Central Delhi pilot.

## Mapped spaces browser

The browser contains **2,657 polygon records** from the existing 2026-10-15 OSM snapshot: 2,148 green-space polygons, 210 water polygons and 299 supplemental area polygons. These are record counts, not unique parcels or a geometric-union measure of public land. Nested/overlapping mapped areas are retained as separate source records.

The directory filters by mapped role, recorded surface, recorded access and exact name/address/source-ID text. Filters apply to this directory and its CSV, independently of building-analysis filters. Selecting a row opens the same source ID on the map. Eight rows are paginated at a time.

- Green-space or parking tags do not establish public access, public ownership or a surface material.
- Of 299 supplemental area records, 47 have explicit hard-surface tags, three have unpaved/soft tags and 249 have unrecorded/unclassified surfaces.
- Access categories reuse the app's explicit OSM access interpretation. Ownership and access are retained as separate CSV fields.
- The CSV exports exactly the current directory selection, including source links, snapshot date, raw access/surface/ownership fields and their display categories. Potential spreadsheet formulas are escaped.

The included tests reconcile directory counts with the real dataset, reject inferred public access/surface from a park's name or government ownership, preserve official document status, and verify filtered CSV output.
