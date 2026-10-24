# Research workflow — 24 October 2026

1. Choose a study window or draw/import a boundary in **Analyse**.
2. Set building use, access, built-year range, unknown-date inclusion and footprint size in the left panel. Enable **Analyse this filtered selection** to apply those criteria to statistics, comparisons, record tables and data exports. The scope is saved in shared links. The camera viewport, context colour palette and layer visibility do not exclude research records.
3. Export CSV, GeoJSON or a research brief. CSV carries machine-readable filter JSON and a readable description; GeoJSON records the same filter selection. Coverage uses an exact union of clipped footprints, including overlaps and holes. A map image can still show context outside the study boundary.
4. Select an exact map record and inspect **Record evidence**. Reviewed identity associations, contributor names, estimates and missing fields are distinct. The date of an institution's founding is not automatically its building's construction year.
5. Expand **Research workbench** in the right inspector. Add up to four buildings, compare recorded facts, write notes and download a notebook or shortlist CSV. The shortlist is manually chosen and may include records outside the current study. Notes survive selection changes but remain on this page only; download them before reloading. Straight-line distances use recorded centres, not routing or surveyed edges.
6. Expand **Planning sources** for authority documents and **Mapped spaces** for the whole-pilot directory. Space filters and CSV exports are independent of building-analysis filters. A mapped green area does not establish public ownership or public access.

## Release boundaries

This release implements the approved priorities within the existing Delhi pilot: clearer identity/evidence, consistent filtered research, lighter animation rendering, public-space/document research, and practical metrics/presentation exports. It retains all original mapped geometry and source tags.

It does not establish complete names, construction dates, measured heights or ownership for every building. Nor does it add a cadastral/statutory zoning overlay, citywide Delhi NCT geometry, surveyed landmark meshes, solar/shadow modelling or walking-network analysis. Those require suitable verified inputs and further implementation. DDA source pages were unavailable during this check; ASI/NMA documents are linked with their actual status. No approval, planning entitlement or legal boundary is inferred from a point marker or a document title.

See [validation](VALIDATION.md), [identity evidence](IDENTITY_EVIDENCE.md) and [planning sources](PLANNING_SOURCES.md) for checks, sources and limitations.
