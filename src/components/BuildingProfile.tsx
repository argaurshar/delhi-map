import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import {
  centerOf,
  distanceMeters,
  footprintPerimeter,
  linkedLandmark,
  safeExternalUrl,
} from "../lib/buildings";
import { HERITAGE, formatNumber as fmt } from "../lib/data";
import type { CityFeature } from "../lib/types";

interface Reference {
  title: string;
  text: string;
  url: string;
  attribution: string;
  licence: string;
  licenceUrl: string;
  retrieved: string;
}
let references: Promise<Record<string, Reference>> | null = null;
function LinkedReference({ article }: { article?: string }) {
  const [entry, setEntry] = useState<Reference | null>(null);
  useEffect(() => {
    setEntry(null);
    if (!article?.startsWith("en:")) return;
    let active = true;
    references ??= fetch(
      `${import.meta.env.BASE_URL}data/building-context.json`,
    ).then((r) => {
      if (!r.ok) throw new Error("Reference unavailable");
      return r.json();
    });
    references
      .then((data) => {
        if (active)
          setEntry(
            data[article.slice(3).split("#")[0].replaceAll("_", " ")] ?? null,
          );
      })
      .catch(() => {
        references = null;
      });
    return () => {
      active = false;
    };
  }, [article]);
  if (!entry) return null;
  return (
    <section className="linked-reference">
      <h3>Linked reference</h3>
      <strong>{entry.title}</strong>
      <p className="micro-note">
        Linked by the OpenStreetMap contributor. The article can describe a
        wider institution, site or person; verify its relationship to this
        feature.
      </p>
      <details>
        <summary>Read the source overview</summary>
        <p className="reference-text">{entry.text}</p>
      </details>
      <a
        className="source-link"
        href={entry.url}
        target="_blank"
        rel="noreferrer"
      >
        {entry.attribution} <ExternalLink size={13} />
      </a>
      <p className="micro-note">
        Excerpt ·{" "}
        <a href={entry.licenceUrl} target="_blank" rel="noreferrer">
          {entry.licence}
        </a>{" "}
        · retrieved {entry.retrieved}. See the article history for contributors.
      </p>
    </section>
  );
}

export function BuildingProfile({
  feature,
  onHeritage,
}: {
  feature: CityFeature;
  onHeritage: (id: string) => void;
}) {
  const p = feature.properties;
  const tags = p.tags ?? {};
  const coords = centerOf(feature);
  const related = linkedLandmark(feature, HERITAGE);
  const nearby = useMemo(
    () =>
      HERITAGE.map((h) => ({ h, distance: distanceMeters(coords, h.coords) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3),
    [feature],
  );
  const address = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"],
  ]
    .filter(Boolean)
    .join(", ");
  const details = [
    ["Mapped address", address || "Not recorded"],
    ["Storeys", p.levels ?? "Not recorded"],
    ["Building material", tags["building:material"] ?? "Not recorded"],
    ["Roof form", tags["roof:shape"] ?? "Not recorded"],
    [
      "Architect",
      tags.architect ?? tags["building:architect"] ?? "Not recorded",
    ],
    [
      "Heritage designation",
      tags.heritage
        ? `${tags.heritage} · ${tags["heritage:operator"] ?? "OSM tag, verify designation"}`
        : "Not recorded",
    ],
    ["Wheelchair access", tags.wheelchair ?? "Not recorded"],
  ];
  const website = safeExternalUrl(tags.website);
  return (
    <section className="building-profile">
      <LinkedReference article={tags.wikipedia} />
      {related && (
        <button
          className="linked-profile"
          onClick={() => onHeritage(related.id)}
        >
          Read the {related.name} profile <ArrowRight size={14} />
          <small>Matched by the same Wikidata identifier</small>
        </button>
      )}
      <h3>Building dossier</h3>
      {tags["name:hi"] && <p lang="hi">{tags["name:hi"]}</p>}
      <dl className="facts">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {p.kind === "building" && (
          <div>
            <dt>Footprint perimeter</dt>
            <dd>{fmt(footprintPerimeter(feature))} m · calculated</dd>
          </div>
        )}
        <div>
          <dt>Map position</dt>
          <dd>
            {coords[1].toFixed(5)}° N<br />
            {coords[0].toFixed(5)}° E
          </dd>
        </div>
      </dl>
      <p className="micro-note">
        Dimensions are calculated from the mapped outline. Missing attributes
        require a survey or documentary source; no owner, structural condition
        or legal status is inferred.
      </p>
      {website && (
        <a
          className="source-link"
          href={website}
          target="_blank"
          rel="noreferrer"
        >
          Recorded website <ExternalLink size={13} />
        </a>
      )}
      {Object.keys(tags).length > 0 && (
        <details className="tag-details">
          <summary>All public map tags ({Object.keys(tags).length})</summary>
          <dl className="facts">
            {Object.entries(tags).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <h3>Nearby context</h3>
      <p className="micro-note">
        Straight-line distances to curated sites. These are nearby places, not
        identities or dates assigned to this building.
      </p>
      <div className="nearby-list">
        {nearby.map(({ h, distance }) => (
          <button key={h.id} onClick={() => onHeritage(h.id)}>
            <MapPin size={13} />
            <span>
              {h.name}
              <small>
                {distance < 1000
                  ? `${fmt(distance)} m`
                  : `${fmt(distance / 1000, 1)} km`}{" "}
                away
              </small>
            </span>
            <ArrowRight size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}
