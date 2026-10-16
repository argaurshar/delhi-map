import kinks from "@turf/kinks";
import booleanValid from "@turf/boolean-valid";
import booleanIntersects from "@turf/boolean-intersects";
import { PILOT } from "./data";
import type { SavedView, StudyArea } from "./types";
export function validateArea(input: unknown): StudyArea {
  if (!input || typeof input !== "object")
    throw new Error("Choose a GeoJSON Polygon or MultiPolygon.");
  const item = input as {
    type?: string;
    geometry?: { type: string; coordinates: unknown };
    features?: unknown[];
  };
  if (item.type === "FeatureCollection") {
    if (item.features?.length !== 1)
      throw new Error("The file must contain exactly one study boundary.");
    return validateArea(item.features[0]);
  }
  const geometry = item.type === "Feature" ? item.geometry : item;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type ?? ""))
    throw new Error("The boundary must be a Polygon or MultiPolygon.");
  const result = { type: "Feature", properties: {}, geometry } as StudyArea;
  let points = 0;
  const check = (v: unknown): void => {
    if (!Array.isArray(v) || !v.length)
      throw new Error("Empty or invalid coordinates.");
    if (typeof v[0] === "number") {
      if (
        v.length !== 2 ||
        !v.every((n) => typeof n === "number" && Number.isFinite(n)) ||
        Math.abs(v[0]) > 180 ||
        Math.abs(v[1]) > 90
      )
        throw new Error("Use longitude/latitude coordinates in WGS 84.");
      points++;
      return;
    }
    v.forEach(check);
  };
  check(result.geometry.coordinates);
  if (points > 1000)
    throw new Error("Simplify the boundary to 1,000 vertices or fewer.");
  if (!booleanValid(result) || kinks(result).features.length)
    throw new Error(
      "The boundary must have closed rings and no self-intersections.",
    );
  if (!booleanIntersects(result, PILOT))
    throw new Error("Choose a study area inside the Central Delhi pilot.");
  return result;
}
export function parseSavedView(hash: string): SavedView | null {
  try {
    const raw = new URLSearchParams(hash.replace(/^#/, "")).get("view");
    if (!raw || raw.length > 50000) return null;
    const s = JSON.parse(raw) as SavedView;
    if (
      s.version !== 1 ||
      typeof s.dataset !== "string" ||
      typeof s.areaName !== "string" ||
      s.areaName.length > 120
    )
      return null;
    if (
      !["footprint", "use", "height"].includes(s.theme) ||
      !["all", "small", "medium", "large"].includes(s.size) ||
      !["explore", "analyse", "compare"].includes(s.mode)
    )
      return null;
    if (
      !s.layers ||
      !["buildings", "heritage", "transit", "landscape", "streets"].every(
        (k) => typeof s.layers[k as keyof typeof s.layers] === "boolean",
      )
    )
      return null;
    if (!Number.isFinite(s.year) || s.year < 1600 || s.year > 1950) return null;
    if (s.area) s.area = validateArea(s.area);
    if (
      s.comparison &&
      (!Array.isArray(s.comparison) ||
        s.comparison.length !== 2 ||
        !s.comparison.every((id) =>
          ["pilot", "old-delhi", "connaught"].includes(id),
        ))
    )
      return null;
    if (s.camera) {
      const c = s.camera;
      if (
        !Array.isArray(c.center) ||
        c.center.length !== 2 ||
        ![...c.center, c.zoom, c.pitch, c.bearing].every(Number.isFinite) ||
        c.center[0] < 77.18 ||
        c.center[0] > 77.28 ||
        c.center[1] < 28.595 ||
        c.center[1] > 28.7 ||
        c.zoom < 12.5 ||
        c.zoom > 19 ||
        c.pitch < 0 ||
        c.pitch > 60 ||
        Math.abs(c.bearing) > 360
      )
        return null;
    }
    return s;
  } catch {
    return null;
  }
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
