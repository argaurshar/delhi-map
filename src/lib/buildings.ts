import type { CityFeature, Heritage } from "./types";
import evidenceRecords from "./building-evidence.json";

export interface BuildingEvidence {
  id: string;
  expectedName: string;
  center: number[];
  landmarkId?: string;
  relationship: string;
  summary: string;
  date?: { year: number | null; label: string; source: number };
  sources: { title: string; url: string; checked: string }[];
}
const evidenceIndex = new Map<string, BuildingEvidence>(
  evidenceRecords.map((record) => [record.id, record]),
);

// Explicitly reviewed identities only. A changed dataset must not silently
// transfer a date to a different building, a nearby building or a building part.
export function buildingEvidence(f: CityFeature): BuildingEvidence | null {
  const record = evidenceIndex.get(f.properties.id);
  return record &&
    f.properties.kind === "building" &&
    f.properties.name === record.expectedName &&
    f.properties.center &&
    distanceMeters(f.properties.center, record.center) < 50
    ? record
    : null;
}

export function buildingDate(f: CityFeature) {
  if (f.properties.kind !== "building") return null;
  const evidence = buildingEvidence(f);
  if (evidence?.date?.year != null) {
    const source = evidence.sources[evidence.date.source];
    return {
      year: evidence.date.year,
      label: evidence.date.label,
      basis: "Reviewed source",
      sourceTitle: source.title,
      sourceUrl: source.url,
    };
  }
  const year = recordedYear(f.properties.start_date);
  return year === null
    ? null
    : {
        year,
        label: `${f.properties.start_date} · recorded start date`,
        basis: "OSM contributor record",
        sourceTitle: "OpenStreetMap",
        sourceUrl: f.properties.source_url,
      };
}

export const buildingYear = (f: CityFeature): number | null =>
  buildingDate(f)?.year ?? null;

export function withBuildingEvidence(f: CityFeature): CityFeature {
  return {
    ...f,
    properties: {
      ...f.properties,
      timeline_date: buildingDate(f),
      reviewed_building_evidence: buildingEvidence(f),
    },
  };
}

export function centerOf(f: CityFeature): [number, number] {
  if (f.properties.center) return f.properties.center;
  const g = f.geometry;
  if (g.type === "Point") return g.coordinates as [number, number];
  if (g.type === "Polygon") return g.coordinates[0][0] as [number, number];
  if (g.type === "MultiPolygon")
    return g.coordinates[0][0][0] as [number, number];
  return [0, 0];
}
export function distanceMeters(a: number[], b: number[]) {
  const r = Math.PI / 180;
  const x = (b[0] - a[0]) * r * Math.cos(((a[1] + b[1]) / 2) * r);
  const y = (b[1] - a[1]) * r;
  return Math.hypot(x, y) * 6371008.8;
}
export function footprintPerimeter(f: CityFeature) {
  const g = f.geometry;
  const rings =
    g.type === "Polygon"
      ? g.coordinates
      : g.type === "MultiPolygon"
        ? g.coordinates.flat()
        : [];
  return rings.reduce(
    (sum, ring) =>
      sum +
      ring.slice(1).reduce((n, pt, i) => n + distanceMeters(ring[i], pt), 0),
    0,
  );
}
// Never turn a nearby landmark date into the age of an ordinary building.
export function recordedYear(raw?: string | null): number | null {
  if (!raw || !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(raw)) return null;
  const y = Number(raw.slice(0, 4));
  return y >= 1000 && y <= 2026 ? y : null;
}
export function linkedLandmark(f: CityFeature, sites: Heritage[]) {
  const q = f.properties.tags?.wikidata;
  return q
    ? sites.find(
        (s) => s.wikidata === q && distanceMeters(centerOf(f), s.coords) < 1000,
      )
    : undefined;
}
export function safeExternalUrl(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
