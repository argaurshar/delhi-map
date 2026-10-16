import area from "@turf/area";
import intersect from "@turf/intersect";
import union from "@turf/union";
import booleanIntersects from "@turf/boolean-intersects";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { matchesSize, PILOT } from "./data";
import type {
  Analysis,
  CityData,
  CityFeature,
  Properties,
  SizeFilter,
  StudyArea,
} from "./types";
export function analyse(
  data: CityData,
  selectedArea: StudyArea,
  size: SizeFilter = "all",
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
      !matchesSize(feature.properties, size)
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
  const merged =
    polygons.length > 1 ? union(featureCollection(polygons)) : polygons[0];
  const footprintM2 = merged ? area(merged) : 0;
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
export function escapeCsv(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(
  result: Analysis,
  dataset: string,
  studyName: string,
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
  ];
  const rows = result.features.map((f) => [
    f.properties.id,
    f.properties.name,
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
    [
      "addr:housenumber",
      "addr:street",
      "addr:suburb",
      "addr:city",
      "addr:postcode",
    ]
      .map((k) => f.properties.tags?.[k])
      .filter(Boolean)
      .join(", "),
    f.properties.tags?.["building:material"],
    f.properties.tags?.["roof:shape"],
    f.properties.tags?.wikidata,
    f.properties.tags?.wikipedia,
  ]);
  return [keys, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}
