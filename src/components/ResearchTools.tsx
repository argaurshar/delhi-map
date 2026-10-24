import { useMemo, useState } from "react";
import { buildingDate } from "../lib/buildings";
import { featureAddress, featureTitle, useDefinition } from "../lib/urban";
import { formatNumber as fmt } from "../lib/data";
import { download } from "../lib/state";
import {
  heightBasis,
  recordedHeight,
  researchMetrics,
  shortlistDistances,
  notebookCsv,
  notebookMarkdown,
  type ResearchNotebook,
} from "../lib/researchMetrics";
import type { Analysis, CityFeature } from "../lib/types";
import "./ResearchTools.css";

interface Props {
  result: Analysis | null;
  selected: CityFeature | null;
  onSelect: (feature: CityFeature) => void;
  onFrame?: (features: CityFeature[]) => void;
  studyName: string;
  filterDescription: string;
  dataset: string;
  busy?: boolean;
}

export function ResearchTools({
  result,
  selected,
  onSelect,
  onFrame,
  studyName,
  filterDescription,
  dataset,
  busy = false,
}: Props) {
  const [shortlist, setShortlist] = useState<CityFeature[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const metrics = useMemo(
    () => (result ? researchMetrics(result) : null),
    [result],
  );
  const distances = useMemo(() => shortlistDistances(shortlist), [shortlist]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q.length < 2
      ? []
      : (result?.features ?? [])
          .filter((f) =>
            [f.properties.id, featureTitle(f), featureAddress(f)].some((v) =>
              v.toLowerCase().includes(q),
            ),
          )
          .slice(0, 6);
  }, [query, result]);
  const selectedBuilding =
    selected?.properties.kind === "building" ? selected : null;
  const selectedAdded = shortlist.some(
    (f) => f.properties.id === selectedBuilding?.properties.id,
  );
  const add = (feature: CityFeature) => {
    setShortlist((items) =>
      items.length >= 4 ||
      items.some((f) => f.properties.id === feature.properties.id)
        ? items
        : [...items, feature],
    );
    setQuery("");
  };
  const exportNotebook = (format: "md" | "csv") => {
    const book: ResearchNotebook = {
      studyName,
      filterDescription,
      dataset,
      features: shortlist,
      notes,
      note,
      metrics,
    };
    download(
      new Blob([format === "md" ? notebookMarkdown(book) : notebookCsv(book)], {
        type:
          format === "md"
            ? "text/markdown;charset=utf-8"
            : "text/csv;charset=utf-8",
      }),
      `delhi-research-notebook.${format}`,
    );
  };
  return (
    <details className="research-workbench" data-testid="research-tools">
      <summary>
        Research workbench <small>Metrics · compare · notes</small>
      </summary>
      <div className="research-workbench-body">
        <p className="micro-note">
          {studyName} · {filterDescription}
        </p>
        {busy ? (
          <p role="status">Updating study metrics…</p>
        ) : metrics ? (
          <>
            <div className="research-readouts">
              <div>
                <strong>
                  {metrics.buildingsPerHectare === null
                    ? "—"
                    : fmt(metrics.buildingsPerHectare, 2)}
                </strong>
                <span>buildings / ha of study extent</span>
              </div>
              <div>
                <strong>{fmt(metrics.mappedFootprintM2, 0)} m²</strong>
                <span>union of mapped footprints</span>
              </div>
              <div>
                <strong>
                  {metrics.heightMean === null
                    ? "—"
                    : `${fmt(metrics.heightMean, 1)} m`}
                </strong>
                <span>mean available height</span>
              </div>
              <div>
                <strong>
                  {fmt(metrics.named)} / {fmt(metrics.count)}
                </strong>
                <span>records with names</span>
              </div>
            </div>
            <p className="micro-note">
              The denominator is the whole study extent, including water.
              Missing mapping is not empty land. Height tags are contributor
              records; estimates and unknowns are shown separately. Footprints
              are not floor area or FAR.
            </p>
            <details>
              <summary>Height evidence & distribution</summary>
              <p className="micro-note">
                {fmt(metrics.heightTagged)} recorded tags ·{" "}
                {fmt(metrics.heightEstimated)} storey estimates ·{" "}
                {fmt(metrics.heightUnknown)} unknown
              </p>
              <ul className="research-counts">
                {metrics.heightBands.map((b) => (
                  <li key={b.label}>
                    <span>{b.label}</span>
                    <strong>{fmt(b.count)}</strong>
                  </li>
                ))}
                <li>
                  <span>Height not recorded</span>
                  <strong>{fmt(metrics.heightUnknown)}</strong>
                </li>
              </ul>
              <p className="micro-note">
                Unknown heights are excluded from the mean and height bands. The
                map's illustrative 8 m default is never counted as a
                measurement.
              </p>
            </details>
            <details>
              <summary>Recorded-use mix</summary>
              <ul className="research-counts">
                {metrics.useMix
                  .filter((c) => c.count > 0)
                  .map((c) => (
                    <li key={c.id}>
                      <span>
                        <i style={{ background: c.color }} />
                        {c.label}
                      </span>
                      <strong>{fmt(c.count)}</strong>
                    </li>
                  ))}
              </ul>
              {!metrics.count && (
                <p className="micro-note">
                  No buildings in this analysis selection.
                </p>
              )}
            </details>
          </>
        ) : (
          <p className="micro-note">
            Study metrics appear when analysis is available.
          </p>
        )}
        <div className="research-shortlist-heading">
          <h3>Building shortlist</h3>
          <span>{shortlist.length} / 4</span>
        </div>
        <p className="micro-note">
          Compare up to four exact map records. This manual shortlist can
          include buildings outside the current study or filters.
        </p>
        <button
          className="research-action"
          disabled={!selectedBuilding || selectedAdded || shortlist.length >= 4}
          onClick={() => selectedBuilding && add(selectedBuilding)}
        >
          {selectedAdded
            ? "Selected building is shortlisted"
            : "Add selected building"}
        </button>
        <label className="field-label" htmlFor="shortlist-search">
          Find a building in this analysis
        </label>
        <input
          id="shortlist-search"
          className="research-search"
          placeholder="Name, address or source ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!result || busy || shortlist.length >= 4}
        />
        {results.length > 0 && (
          <ul className="research-results">
            {results.map((f) => (
              <li key={f.properties.id}>
                <button
                  onClick={() => add(f)}
                  disabled={shortlist.some(
                    (x) => x.properties.id === f.properties.id,
                  )}
                >
                  <strong>{featureTitle(f)}</strong>
                  <small>{f.properties.id}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim().length >= 2 && !results.length && (
          <p className="micro-note">
            No matching building in this analysis selection.
          </p>
        )}
        <div className="research-shortlist">
          {shortlist.map((f, index) => {
            const p = f.properties,
              height = recordedHeight(f);
            return (
              <article key={p.id}>
                <div className="research-shortlist-heading">
                  <h4>
                    {index + 1}. {featureTitle(f)}
                  </h4>
                  <button
                    aria-label={`Remove ${p.id} from shortlist`}
                    onClick={() =>
                      setShortlist((items) =>
                        items.filter((x) => x.properties.id !== p.id),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
                <small>{p.id}</small>
                <dl>
                  <div>
                    <dt>Use</dt>
                    <dd>{useDefinition(f).label}</dd>
                  </div>
                  <div>
                    <dt>Full footprint</dt>
                    <dd>
                      {p.area_m2 == null
                        ? "Not recorded"
                        : `${fmt(p.area_m2, 0)} m²`}
                    </dd>
                  </div>
                  <div>
                    <dt>Height</dt>
                    <dd>
                      {height === null
                        ? "Not recorded"
                        : `${fmt(height, 1)} m · ${heightBasis(f)}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Date</dt>
                    <dd>{buildingDate(f)?.label ?? "Not recorded"}</dd>
                  </div>
                </dl>
                <button
                  className="research-text-action"
                  onClick={() => onSelect(f)}
                >
                  Locate this record
                </button>
                <label className="field-label" htmlFor={`note-${p.id}`}>
                  Your note for building {index + 1}
                </label>
                <textarea
                  id={`note-${p.id}`}
                  value={notes[p.id] ?? ""}
                  maxLength={2000}
                  rows={2}
                  onChange={(e) =>
                    setNotes((v) => ({ ...v, [p.id]: e.target.value }))
                  }
                  placeholder="Observation or question to verify"
                />
              </article>
            );
          })}
        </div>
        {distances.length > 0 && (
          <details>
            <summary>Straight-line distances</summary>
            <ul className="research-counts">
              {distances.map(({ a, b, meters }) => (
                <li
                  key={`${a.properties.id}-${b.properties.id}`}
                  title={`${featureTitle(a)} → ${featureTitle(b)}`}
                >
                  <span>
                    Building {shortlist.indexOf(a) + 1} →{" "}
                    {shortlist.indexOf(b) + 1}
                  </span>
                  <strong>{fmt(meters, 0)} m</strong>
                </li>
              ))}
            </ul>
            <p className="micro-note">
              Approximate distances between mapped centres, not walking routes,
              building-edge gaps or surveyed setbacks.
            </p>
          </details>
        )}
        {onFrame && shortlist.length > 0 && (
          <button
            className="research-action"
            onClick={() => onFrame(shortlist)}
          >
            Frame shortlisted buildings
          </button>
        )}
        <label className="field-label" htmlFor="study-research-note">
          Your study notes
        </label>
        <textarea
          id="study-research-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder="Design observations, questions and sources to follow up"
        />
        <p className="micro-note">
          Notes stay in this page until it is reloaded. Download the notebook to
          keep them. User notes are separate from source facts.
        </p>
        <div className="research-actions">
          <button
            className="research-action"
            onClick={() => exportNotebook("md")}
          >
            Download notebook
          </button>
          <button
            className="research-action"
            onClick={() => exportNotebook("csv")}
            disabled={!shortlist.length}
          >
            Shortlist CSV
          </button>
          <button
            className="research-text-action"
            onClick={() => {
              setShortlist([]);
              setNotes({});
              setNote("");
              setQuery("");
            }}
          >
            Clear notebook
          </button>
        </div>
      </div>
    </details>
  );
}
