import { buildingDate, distanceMeters } from "./buildings";
import {
  featureAddress,
  featureName,
  featureTitle,
  USE_CATEGORIES,
  useCategory,
  useDefinition,
} from "./urban";
import { escapeCsv } from "./analysis";
import type { Analysis, CityFeature } from "./types";

export const HEIGHT_BANDS = [
  { label: "Under 10 m", min: 0, max: 10 },
  { label: "10–20 m", min: 10, max: 20 },
  { label: "20–40 m", min: 20, max: 40 },
  { label: "40 m and above", min: 40, max: Infinity },
] as const;

export function recordedHeight(feature: CityFeature): number | null {
  const height = feature.properties.height_m;
  return typeof height === "number" && Number.isFinite(height) && height > 0
    ? height
    : null;
}

export function heightBasis(feature: CityFeature): string {
  if (recordedHeight(feature) === null) return "Not recorded";
  return feature.properties.height_method.startsWith("Estimated:")
    ? "Storey estimate"
    : "Recorded height tag";
}

export function researchMetrics(result: Analysis) {
  const heights = result.features
    .map(recordedHeight)
    .filter((h): h is number => h !== null);
  const estimated = result.features.filter(
    (f) => recordedHeight(f) !== null && heightBasis(f) === "Storey estimate",
  ).length;
  const useCounts = new Map<string, number>();
  for (const f of result.features) {
    const id = useCategory(f);
    useCounts.set(id, (useCounts.get(id) ?? 0) + 1);
  }
  return {
    count: result.count,
    hectares: result.areaM2 / 10000,
    buildingsPerHectare:
      result.areaM2 > 0 ? (result.count * 10000) / result.areaM2 : null,
    mappedFootprintM2: result.footprintM2,
    heightMean: heights.length
      ? heights.reduce((a, b) => a + b, 0) / heights.length
      : null,
    heightBands: HEIGHT_BANDS.map((b) => ({
      ...b,
      count: heights.filter((h) => h >= b.min && h < b.max).length,
    })),
    heightTagged: heights.length - estimated,
    heightEstimated: estimated,
    heightUnknown: result.features.length - heights.length,
    named: result.features.filter((f) => featureName(f) !== null).length,
    dated: result.features.filter((f) => buildingDate(f) !== null).length,
    useMix: USE_CATEGORIES.map((c) => ({
      ...c,
      count: useCounts.get(c.id) ?? 0,
    })),
  };
}

function mappedCenter(feature: CityFeature): [number, number] | null {
  const center = feature.properties.center;
  return center?.length === 2 && center.every(Number.isFinite) ? center : null;
}

export function shortlistDistances(features: CityFeature[]) {
  const pairs: { a: CityFeature; b: CityFeature; meters: number }[] = [];
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const a = mappedCenter(features[i]),
        b = mappedCenter(features[j]);
      if (a && b)
        pairs.push({
          a: features[i],
          b: features[j],
          meters: distanceMeters(a, b),
        });
    }
  }
  return pairs;
}

export interface ResearchNotebook {
  studyName: string;
  filterDescription: string;
  dataset: string;
  features: CityFeature[];
  notes: Record<string, string>;
  note: string;
  metrics: ReturnType<typeof researchMetrics> | null;
}

const md = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
const number = (value: number | null, digits = 1) =>
  value === null ? "Not recorded" : value.toFixed(digits);

export function notebookMarkdown(book: ResearchNotebook): string {
  const lines = [
    "# Delhi Atlas · Research notebook",
    "",
    `Study: ${md(book.studyName)}`,
    `Dataset: ${md(book.dataset)}`,
    `Analysis selection: ${md(book.filterDescription)}`,
    "",
    "Shortlisted buildings are selected manually and can be outside the current study/filter. Study metrics below describe the analysis selection only.",
    "",
  ];
  if (book.metrics) {
    const m = book.metrics;
    lines.push(
      "## Study metrics",
      "",
      `- Buildings: ${m.count}`,
      `- Study extent: ${number(m.hectares, 2)} ha`,
      `- Buildings per hectare of study extent: ${number(m.buildingsPerHectare, 2)}`,
      `- Union of mapped footprints within study: ${number(m.mappedFootprintM2, 0)} m²`,
      `- Mean available height: ${m.heightMean === null ? "Not recorded" : number(m.heightMean) + " m"}`,
      `- Height evidence: ${m.heightTagged} recorded tags; ${m.heightEstimated} storey estimates; ${m.heightUnknown} unknown`,
      "",
      "Recorded height tags are contributor records, not verified surveys. Missing heights are excluded from the mean; visual 8 m defaults are never observations. These metrics are not FAR or floor area.",
      "",
    );
  }
  lines.push(
    "## Study notes",
    "",
    md(book.note) || "No notes added.",
    "",
    "## Building shortlist",
    "",
  );
  for (const f of book.features) {
    const p = f.properties,
      date = buildingDate(f);
    lines.push(
      `### ${md(featureTitle(f))}`,
      "",
      `- Source ID: ${md(p.id)}`,
      `- Address: ${md(featureAddress(f)) || "Not recorded"}`,
      `- Recorded-use category: ${useDefinition(f).label}`,
      `- Full mapped footprint: ${p.area_m2 == null ? "Not recorded" : number(p.area_m2, 0) + " m²"}`,
      `- Height: ${recordedHeight(f) === null ? "Not recorded" : number(recordedHeight(f)) + " m"} · ${heightBasis(f)}`,
      `- Date: ${date ? md(date.label) + " · " + date.basis : "Not recorded"}`,
      `- Snapshot: ${md(p.snapshot)}`,
      `- Source: ${p.source_url}`,
      ...(date ? [`- Date source: ${date.sourceUrl}`] : []),
      `- Researcher note: ${md(book.notes[p.id] ?? "") || "No note added."}`,
      "",
    );
  }
  const distances = shortlistDistances(book.features);
  if (distances.length) {
    lines.push(
      "## Straight-line distances",
      "",
      "Approximate distances between recorded map centres. These are not walking routes, building-edge gaps or surveyed setbacks.",
      "",
    );
    distances.forEach(({ a, b, meters }) =>
      lines.push(
        `- ${md(featureTitle(a))} (${a.properties.id}) → ${md(featureTitle(b))} (${b.properties.id}): ${Math.round(meters)} m`,
      ),
    );
    lines.push("");
  }
  lines.push(
    "Source geometry and contributor records: © OpenStreetMap contributors · ODbL 1.0. https://www.openstreetmap.org/copyright",
    "Researcher notes are user-authored observations, separate from source facts.",
    "",
  );
  return lines.join("\n");
}

export function notebookCsv(book: ResearchNotebook): string {
  const rows: unknown[][] = [
    [
      "id",
      "recorded_name",
      "address",
      "use_category",
      "full_footprint_m2",
      "height_m",
      "height_basis",
      "timeline_date",
      "date_basis",
      "date_source",
      "snapshot",
      "source_url",
      "dataset",
      "study",
      "analysis_selection",
      "shortlist_scope",
      "researcher_building_note",
      "researcher_study_note",
    ],
  ];
  for (const f of book.features) {
    const p = f.properties,
      date = buildingDate(f);
    rows.push([
      p.id,
      featureName(f),
      featureAddress(f),
      useCategory(f),
      p.area_m2,
      recordedHeight(f),
      heightBasis(f),
      date?.label,
      date?.basis,
      date?.sourceUrl,
      p.snapshot,
      p.source_url,
      book.dataset,
      book.studyName,
      book.filterDescription,
      "Manual shortlist; may be outside analysis selection",
      book.notes[p.id],
      book.note,
    ]);
  }
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}
