import {
  useCategory,
  accessCategory,
  featureAddress,
  featureName,
} from "./urban";
import area from "@turf/area";
import intersect from "@turf/intersect";
import { unionArea } from "./unionArea";
import {
  matchesSelection,
  selectionDescription,
  type FilterSelection,
} from "./selection";
import { overviewResult } from "./overview";
import booleanIntersects from "@turf/boolean-intersects";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { matchesSize, PILOT } from "./data";
import { buildingDate, buildingEvidence } from "./buildings";
import type {
  Analysis,
  CityData,
  CityFeature,
  Properties,
  SizeFilter,
  StudyArea,
  Overview,
} from "./types";
export function analyse(
  data: CityData,
  selectedArea: StudyArea,
  size: SizeFilter = "all",
  selection: FilterSelection | null = null,
): Analysis {
  const clippedArea = intersect(featureCollection([selectedArea, PILOT]));
  const empty: Analysis = {
    count: 0,
    areaM2: 0,
    footprintM2: 0,
    coverage: 0,
    knownHeightCount: 0,
    estimatedHeightCount: 0,
    heightMean: null,
    unknownHeightCount: 0,
    bins: [0, 0, 0, 0],
    features: [],
    clipped: { type: "FeatureCollection", features: [] },
  };
  if (!clippedArea) return empty;
  const extent = bbox(clippedArea);
  const features: CityFeature[] = [];
  const polygons: Feature<Polygon | MultiPolygon, Properties>[] = [];
  const bins = [0, 0, 0, 0];
  const heights: number[] = [];
  let estimatedHeightCount = 0;
  for (const feature of data.features) {
    if (
      feature.properties.kind !== "building" ||
      !matchesSize(feature.properties, size) ||
      (selection !== null && !matchesSelection(feature, selection))
    )
      continue;
    const polygon = feature as Feature<Polygon | MultiPolygon, Properties>;
    const bounds = feature.bbox ?? bbox(feature);
    if (
      bounds[0] > extent[2] ||
      bounds[2] < extent[0] ||
      bounds[1] > extent[3] ||
      bounds[3] < extent[1]
    )
      continue;
    if (!booleanIntersects(polygon, clippedArea)) continue;
    const clipped = intersect(featureCollection([polygon, clippedArea]));
    if (!clipped) continue;
    const a = area(clipped);
    if (a < 0.01) continue;
    const p = {
      ...feature.properties,
      selected_area_m2: Math.round(a * 100) / 100,
    };
    features.push({ ...feature, properties: p });
    polygons.push({ ...clipped, properties: p });
    const fullArea = feature.properties.area_m2 ?? area(feature);
    bins[fullArea < 100 ? 0 : fullArea < 500 ? 1 : fullArea < 2000 ? 2 : 3]++;
    if (p.height_m !== null) {
      heights.push(p.height_m);
      if (p.height_method.startsWith("Estimated:")) estimatedHeightCount++;
    }
  }
  const footprintM2 = unionArea(polygons);
  const areaM2 = area(clippedArea);
  return {
    count: features.length,
    areaM2,
    footprintM2,
    coverage: areaM2 ? (100 * footprintM2) / areaM2 : 0,
    knownHeightCount: heights.length,
    estimatedHeightCount,
    heightMean: heights.length
      ? heights.reduce((a, b) => a + b, 0) / heights.length
      : null,
    unknownHeightCount: features.length - heights.length,
    bins,
    features,
    clipped: { type: "FeatureCollection", features: polygons },
  };
}
/** Reuse verified clipping, but recompute all statistics for changed eligibility. */
export function analyseOverviewSelection(
  data: CityData,
  overview: Overview,
  size: SizeFilter,
  selection: FilterSelection,
): Analysis {
  const full = overviewResult(data, overview, size);
  const features = full.features.filter((f) => matchesSelection(f, selection));
  // Exact equality of selected IDs permits use of the existing exact union.
  if (features.length === full.features.length) return full;
  const selected = new Set(features.map((f) => f.properties.id));
  const polygons = full.clipped.features.filter((f) =>
    selected.has(f.properties.id),
  ) as Feature<Polygon | MultiPolygon, Properties>[];
  const footprintM2 = unionArea(polygons);
  const heights = features.filter((f) => f.properties.height_m !== null);
  const bins = [0, 0, 0, 0];
  for (const f of features) {
    const a = f.properties.area_m2 ?? area(f);
    bins[a < 100 ? 0 : a < 500 ? 1 : a < 2000 ? 2 : 3]++;
  }
  return {
    ...full,
    count: features.length,
    footprintM2,
    coverage: full.areaM2 ? (footprintM2 / full.areaM2) * 100 : 0,
    knownHeightCount: heights.length,
    estimatedHeightCount: heights.filter((f) =>
      f.properties.height_method.startsWith("Estimated:"),
    ).length,
    unknownHeightCount: features.length - heights.length,
    heightMean: heights.length
      ? heights.reduce((sum, f) => sum + f.properties.height_m!, 0) /
        heights.length
      : null,
    bins,
    features,
    clipped: { type: "FeatureCollection", features: polygons },
  };
}
export function escapeCsv(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(
  result: Analysis,
  dataset: string,
  studyName: string,
  selection: FilterSelection | null = null,
): string {
  const keys = [
    "id",
    "name",
    "full_footprint_m2",
    "area_inside_study_m2",
    "height_m",
    "height_method",
    "construction_date",
    "snapshot",
    "source_url",
    "dataset",
    "study_area",
    "recorded_use",
    "storeys",
    "address",
    "building_material",
    "roof_shape",
    "wikidata",
    "wikipedia",
    "timeline_year",
    "timeline_date_label",
    "timeline_date_basis",
    "timeline_date_source",
    "reviewed_building_history",
    "reviewed_history_sources",
    "use_category",
    "access_category",
    "recorded_access",
    "access_conditions",
    "ownership",
    "owner",
    "surface",
    "name_source",
    "analysis_scope",
    "analysis_filters",
    "analysis_description",
  ];
  const rows = result.features.map((f) => [
    f.properties.id,
    featureName(f),
    Math.round(f.properties.area_m2 ?? 0),
    f.properties.selected_area_m2,
    f.properties.height_m,
    f.properties.height_method,
    f.properties.start_date,
    f.properties.snapshot,
    f.properties.source_url,
    dataset,
    studyName,
    f.properties.use,
    f.properties.levels,
    featureAddress(f),
    f.properties.tags?.["building:material"],
    f.properties.tags?.["roof:shape"],
    f.properties.tags?.wikidata,
    f.properties.tags?.wikipedia,
    buildingDate(f)?.year,
    buildingDate(f)?.label,
    buildingDate(f)?.basis,
    buildingDate(f)?.sourceUrl,
    buildingEvidence(f)?.summary,
    buildingEvidence(f)
      ?.sources.map((s) => s.url)
      .join(" | "),
    useCategory(f),
    accessCategory(f),
    f.properties.tags?.access,
    f.properties.tags?.["access:conditional"],
    f.properties.tags?.ownership,
    f.properties.tags?.owner,
    f.properties.tags?.surface,
    f.properties.name_source,
    selection ? "filtered" : "study",
    selection ? JSON.stringify(selection) : "",
    selection
      ? selectionDescription(selection)
      : "Study boundary and footprint size; map use/access/date filters are not applied",
  ]);
  return [keys, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}
