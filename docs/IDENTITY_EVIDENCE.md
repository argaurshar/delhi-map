# Identity and evidence update — 24 October 2026

Each selected feature now separates **identity association**, **field availability**, and **evidence type**. These are different questions; the app does not manufacture a numerical confidence score.

- A reviewed association passes the existing exact source ID, exact recorded name, feature kind and location checks. A named but unreviewed feature remains a contributor-recorded identity. An anonymous feature keeps its source ID; an address, operator or nearby landmark is not substituted for its name.
- The association scope distinguishes an individual structure within a wider site from a named building or memorial footprint. Linked articles, nearby context and the original map record remain separate.
- The coverage panel counts available name, address, use, height, storeys, usable building year, architect, roof, access and ownership-type fields. Ground features use a shorter, relevant list. It lists missing fields and labels storey-derived heights as estimates. Availability is not independent verification.
- A height tag is described as contributor-recorded, never automatically as surveyed. A storey estimate retains its calculation basis. The 8 m visual fallback remains unknown height and is excluded from height statistics.
- Government, UNESCO and secondary-source links receive descriptive provenance labels. A source's non-date status, such as an unavailable portal or a legacy reference not rechecked, remains visible and is not converted to a check date.

## Additional reviewed record

The history of **National Archives of India** now attaches to `relation/5507689`, with its existing name and centre `[77.2176077, 28.6152861]`. The source record already carries the official `nationalarchives.nic.in` website and a Janpath, New Delhi 110001 address. The official headquarters page independently identifies that institution and address. This is a reviewed association to the named headquarters outline, not a nearest-neighbour join or a new surveyed boundary.

Sources checked on 24 October 2026:

1. [National Archives of India — History](https://nationalarchives.nic.in/index.php/en/about-NAI/history): describes the Imperial Records Department's creation in Calcutta on 11 March 1891 and its move to the present New Delhi building in 1926.
2. [National Archives of India — Headquarters](https://nationalarchives.nic.in/index.php/en/about-NAI/how-reach/headquarters): gives the headquarters as National Archives of India, Janpath, New Delhi 110001, at the Rajpath/Janpath intersection. The portal uses that historical street name; the app does not infer a changed address from it.

The 1891 founding and 1926 occupancy milestones are not assigned as the current outline's construction year. Reviewed histories increase from **17 to 18**; the exact-year building chronology remains **19**. No building geometry, recorded name, source tag or height has been changed.

National Museum's Ministry of Tourism page was accessible during this check but did not establish a new exact construction date. The museum's own history endpoint and the Gandhi Smriti government endpoint returned HTTP 503; two proposed tourism paths returned 404. Those failed requests supplied no new factual evidence and did not result in new histories or checked-source claims.

Validation includes exact-ID/name/location rejection, height-source distinctions, field-count semantics, non-inference of ownership, site-event/date separation, source-status preservation and the archives record's retained unknown construction year.
