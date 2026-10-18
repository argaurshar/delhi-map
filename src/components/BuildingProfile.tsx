import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import {
  centerOf,
  distanceMeters,
  footprintPerimeter,
  linkedLandmark,
  safeExternalUrl,
  buildingEvidence,
  buildingDate,
} from "../lib/buildings";
import { HERITAGE, formatNumber as fmt } from "../lib/data";
import {
  accessDefinition,
  featureAddress,
  featureName,
  useDefinition,
} from "../lib/urban";
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
  const evidence = buildingEvidence(feature);
  const date = buildingDate(feature);
  const related = evidence?.landmarkId
    ? HERITAGE.find((site) => site.id === evidence.landmarkId)
    : linkedLandmark(feature, HERITAGE);
  const nearby = useMemo(
    () =>
      HERITAGE.map((h) => ({ h, distance: distanceMeters(coords, h.coords) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3),
    [feature],
  );
  const address = featureAddress(feature);
  const name = featureName(feature);
  const isBuilding = ["building", "buildingpart", "building_part"].includes(
    p.kind,
  );
  const access = accessDefinition(feature);
  const use = useDefinition(feature);
  const useTags = [
    "building:use",
    "amenity",
    "shop",
    "office",
    "tourism",
    "building",
  ]
    .filter((key) => tags[key])
    .map((key) => `${key}=${tags[key]}`)
    .join(" · ");
  const present = (value?: string | null) => value?.trim() || "Not recorded";
  const details = [
    ["Recorded name", name ?? "Name not recorded"],
    ["Mapped address", address || "Not recorded"],
    ...(isBuilding
      ? [
          ["Use category", use.label],
          [
            "Recorded use tags",
            useTags || present(p.use === "yes" ? null : p.use),
          ],
          ["OSM start date", present(p.start_date)],
          ["Timeline date basis", date?.basis ?? "No usable date"],
          ["Storeys", present(p.levels)],
          ["Building material", present(tags["building:material"])],
          ["Roof form", present(tags["roof:shape"])],
          ["Architect", present(tags.architect ?? tags["building:architect"])],
        ]
      : [
          ["Mapped feature", p.kind.replaceAll("_", " ")],
          ["Land use", present(tags.landuse)],
          ["Leisure use", present(tags.leisure)],
          ["Natural cover", present(tags.natural)],
          ["Road classification", present(tags.highway ?? p.road_type)],
        ]),
    ["Access category", access.label],
    ["Recorded access", present(tags.access)],
    ["Conditional access", present(tags["access:conditional"])],
    ["Ownership type", present(tags.ownership)],
    ["Recorded owner", present(tags.owner)],
    ["Operator", present(tags.operator)],
    ["Opening hours", present(tags.opening_hours)],
    ["Surface", present(tags.surface)],
    ["Wheelchair access", present(tags.wheelchair)],
    [
      "Heritage designation",
      tags.heritage
        ? `${tags.heritage} · ${tags["heritage:operator"] ?? "OSM tag, verify designation"}`
        : "Not recorded",
    ],
    ["Source record", p.id],
    ["Map snapshot", present(p.snapshot)],
  ];
  const website = safeExternalUrl(tags.website ?? tags["contact:website"]);
  const mapSource = safeExternalUrl(p.source_url);
  return (
    <section className="building-profile">
      {evidence && (
        <section className="reviewed-evidence">
          <h3>Reviewed building history</h3>
          <p>{evidence.summary}</p>
          {evidence.date && <strong>{evidence.date.label}</strong>}
          <p className="micro-note">
            Matched to this named map record and location. Original map tags are
            retained below. Dates do not describe every later alteration.
          </p>
          {evidence.sources.map((source) => (
            <div key={source.url}>
              <a
                className="source-link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title} <ExternalLink size={13} />
              </a>
              <p className="micro-note">Source checked {source.checked}</p>
            </div>
          ))}
        </section>
      )}
      <LinkedReference article={tags.wikipedia} />
      {related && (
        <button
          className="linked-profile"
          onClick={() => onHeritage(related.id)}
        >
          Read the {related.name} profile <ArrowRight size={14} />
          <small>
            {evidence
              ? evidence.relationship === "part of site"
                ? "Part of this wider site · reviewed association"
                : "Same building or memorial · reviewed association"
              : "Matched by the same Wikidata identifier"}
          </small>
        </button>
      )}
      <h3>{isBuilding ? "Building dossier" : "Ground & space dossier"}</h3>
      {!name && (
        <p className="micro-note">
          This map feature has no recorded name. Its map ID identifies the exact
          outline; nearby landmarks and an operator are not used as its name.
        </p>
      )}
      {tags["name:hi"] && tags["name:hi"] !== name && (
        <p lang="hi">{tags["name:hi"]}</p>
      )}
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
      <p className="micro-note">
        Access describes the recorded permission to enter, not ownership. Public
        or government use alone does not establish public access. Map tags can
        be incomplete or out of date; check access and operating hours locally.
      </p>
      {mapSource && (
        <a
          className="source-link"
          href={mapSource}
          target="_blank"
          rel="noreferrer"
        >
          Inspect this map record <ExternalLink size={13} />
        </a>
      )}
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
        identities or dates assigned to this feature.
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
