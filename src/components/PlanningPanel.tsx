import { useMemo, useState } from "react";
import { ExternalLink, ArrowDownToLine, MapPin } from "lucide-react";
import { ACCESS_CATEGORIES, featureName, accessDefinition } from "../lib/urban";
import { download } from "../lib/state";
import {
  PLANNING_SOURCES,
  SPACE_ROLES,
  DEFAULT_SPACE_FILTERS,
  matchesSpace,
  spaceCoverage,
  spaceRoleLabel,
  spacesCsv,
  type SpaceFilters,
} from "../lib/planning";
import type { CityData, CityFeature } from "../lib/types";
import "./PlanningPanel.css";

export function PlanningPanel({
  data,
  onFeature,
}: {
  data: CityData | null;
  onFeature: (feature: CityFeature) => void;
}) {
  const [filters, setFilters] = useState<SpaceFilters>(DEFAULT_SPACE_FILTERS);
  const [page, setPage] = useState(0);
  const coverage = useMemo(() => spaceCoverage(data?.features ?? []), [data]);
  const matches = useMemo(
    () =>
      (data?.features ?? [])
        .filter((f) => matchesSpace(f, filters))
        .sort(
          (a, b) =>
            (featureName(a) ?? "\uffff").localeCompare(
              featureName(b) ?? "\uffff",
            ) || a.properties.id.localeCompare(b.properties.id),
        ),
    [data, filters],
  );
  const update = (next: Partial<SpaceFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setPage(0);
  };
  return (
    <section
      className="planning-panel"
      aria-label="Planning and mapped-space research"
    >
      <details>
        <summary>
          Planning sources <span>Official documents</span>
        </summary>
        <p className="planning-note">
          Read the applicable authority documents alongside the map. No
          statutory zoning or monument-boundary overlay is included.
        </p>
        <ol className="planning-reading">
          <li>Locate the site in the notified plan and its boundary map.</li>
          <li>
            Check document status, amendments and the competent authority.
          </li>
          <li>
            Compare those records with the mapped footprint and a site survey.
          </li>
        </ol>
        <div className="planning-source-list">
          {PLANNING_SOURCES.map((source) => (
            <article key={source.id}>
              <span
                className={`planning-status ${source.status === "Draft directory" ? "draft" : ""}`}
              >
                {source.status}
              </span>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
                <ExternalLink size={12} />
              </a>
              <small>
                {source.authority} · Checked {source.checked}
              </small>
              <p>{source.scope}</p>
              <details>
                <summary>
                  {source.availability === "unavailable"
                    ? "Portal unavailable when checked"
                    : "Scope & source notes"}
                </summary>
                <p>{source.note}</p>
              </details>
            </article>
          ))}
        </div>
      </details>
      <details>
        <summary>
          Mapped spaces <span>{coverage.total.toLocaleString()} records</span>
        </summary>
        <p className="planning-note">
          Whole-pilot directory. Select a record to locate its exact outline.
          These directory filters are separate from building-analysis filters.
        </p>
        <div className="space-coverage">
          <span>{coverage.named.toLocaleString()} named</span>
          <span>{coverage.accessKnown.toLocaleString()} with access</span>
          <span>
            {coverage.surfaceKnown.toLocaleString()} with surface evidence
          </span>
        </div>
        <label>
          Find a mapped space
          <input
            aria-label="Find a mapped space"
            type="search"
            placeholder="Name, address or source ID"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </label>
        <label>
          Space type
          <select
            aria-label="Space type"
            value={filters.role}
            onChange={(e) => update({ role: e.target.value })}
          >
            {SPACE_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recorded surface
          <select
            aria-label="Recorded surface"
            value={filters.surface}
            onChange={(e) => update({ surface: e.target.value })}
          >
            <option value="all">All surface records</option>
            <option value="hard">Confirmed hard surface</option>
            <option value="soft">Recorded unpaved / soft surface</option>
            <option value="unknown">Surface not recorded / unclassified</option>
          </select>
        </label>
        <label>
          Recorded space access
          <select
            aria-label="Recorded space access"
            value={filters.access}
            onChange={(e) => update({ access: e.target.value })}
          >
            <option value="all">All access records</option>
            {ACCESS_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <p className="planning-note">
          Access describes entry permission, not ownership. A park or parking
          area does not establish public access or hard paving.
        </p>
        <div className="space-actions">
          <strong role="status">
            {matches.length.toLocaleString()} matching records
          </strong>
          <button onClick={() => update(DEFAULT_SPACE_FILTERS)}>
            Reset directory
          </button>
        </div>
        <button
          className="space-export"
          disabled={!matches.length}
          onClick={() =>
            download(
              new Blob(["\ufeff" + spacesCsv(matches)], {
                type: "text/csv;charset=utf-8",
              }),
              "delhi-mapped-spaces.csv",
            )
          }
        >
          <ArrowDownToLine size={14} />
          Export matching spaces
        </button>
        <div className="space-results">
          {matches.slice(page * 8, page * 8 + 8).map((f) => (
            <button key={f.properties.id} onClick={() => onFeature(f)}>
              <MapPin size={13} />
              <span>
                <strong>{featureName(f) ?? "Name not recorded"}</strong>
                <small>
                  {spaceRoleLabel(f)} · {accessDefinition(f).label}
                </small>
                <small>{f.properties.id}</small>
              </span>
            </button>
          ))}
        </div>
        {!matches.length && (
          <p className="planning-note">
            No source records match these directory filters.
          </p>
        )}
        {matches.length > 8 && (
          <nav
            className="space-pagination"
            aria-label="Mapped-space directory pages"
          >
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              {page + 1} / {Math.ceil(matches.length / 8)}
            </span>
            <button
              disabled={(page + 1) * 8 >= matches.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </details>
    </section>
  );
}
