import { describe, it, expect } from "vitest";
import { area } from "@turf/area";
import { featureCollection } from "@turf/helpers";
import { analyse, escapeCsv, toCsv } from "../src/lib/analysis";
import { rectangle } from "../src/lib/data";
import { parseSavedView, validateArea } from "../src/lib/state";
import type { CityFeature, CityData, Properties } from "../src/lib/types";
const props = (id: string, height: number | null = null): Properties => ({
  id,
  kind: "building",
  name: "",
  use: "yes",
  road_type: "",
  rail_type: "",
  height_m: height,
  height_method: height === null ? "unknown" : "Estimated: OSM storeys × 3 m",
  levels: null,
  start_date: null,
  source: "OpenStreetMap",
  source_url: "https://www.openstreetmap.org/" + id,
  snapshot: "2017-08-15",
});
const building = (
  id: string,
  b: number[],
  height: number | null = null,
): CityFeature => {
  const f = rectangle(b);
  return { ...f, properties: { ...props(id, height), area_m2: area(f) } };
};
const study = rectangle([77.21, 28.63, 77.212, 28.632]);
describe("Site analysis", () => {
  it("clips footprints crossing the study edge and unions overlapping geometry", () => {
    const a = building("way/1", [77.209, 28.63, 77.211, 28.632]);
    const b = building("way/2", [77.2105, 28.63, 77.2115, 28.632]);
    const r = analyse(featureCollection([a, b]) as CityData, study);
    const expected = area(rectangle([77.21, 28.63, 77.2115, 28.632]));
    expect(r.count).toBe(2);
    expect(r.footprintM2).toBeCloseTo(expected, 1);
    expect(r.coverage).toBeCloseTo(75, 1);
    expect(r.features[0].properties.selected_area_m2).toBeLessThan(
      a.properties.area_m2!,
    );
    expect(
      r.features.reduce((n, f) => n + f.properties.selected_area_m2!, 0),
    ).toBeGreaterThan(r.footprintM2);
  });
  it("does not convert display extrusion heights into evidence", () => {
    const r = analyse(
      featureCollection([
        building("way/1", [77.21, 28.63, 77.2105, 28.6305]),
        building("way/2", [77.211, 28.631, 77.2115, 28.6315], 12),
      ]) as CityData,
      study,
    );
    expect(r.knownHeightCount).toBe(1);
    expect(r.estimatedHeightCount).toBe(1);
    expect(r.unknownHeightCount).toBe(1);
    expect(r.heightMean).toBe(12);
  });
  it("retains polygon holes in area calculations", () => {
    const ring = rectangle([77.2101, 28.6301, 77.2119, 28.6319]);
    if (ring.geometry.type !== "Polygon") throw Error();
    const hole = rectangle([77.2105, 28.6305, 77.2115, 28.6315]);
    if (hole.geometry.type !== "Polygon") throw Error();
    ring.geometry.coordinates.push(
      hole.geometry.coordinates[0].slice().reverse(),
    );
    const f = { ...ring, properties: props("way/1") };
    const r = analyse(featureCollection([f]) as CityData, study);
    expect(r.footprintM2).toBeCloseTo(area(ring), 1);
  });
  it("uses the same footprint filter for selected records and export", () => {
    const data = featureCollection([
      building("way/1", [77.2101, 28.6301, 77.21015, 28.63015]),
      building("way/2", [77.211, 28.631, 77.2115, 28.6315]),
    ]) as CityData;
    const r = analyse(data, study, "small");
    expect(r.count).toBe(1);
    expect(r.features[0].properties.id).toBe("way/1");
    const csv = toCsv(r, "test-release", "test-study");
    expect(csv).toContain("way/1");
    expect(csv).not.toContain("way/2");
    expect(r.clipped.features).toHaveLength(r.count);
  });
  it("handles selections outside the pilot with an empty result", () => {
    const r = analyse(
      featureCollection([]) as CityData,
      rectangle([0, 0, 1, 1]),
    );
    expect(r.count).toBe(0);
    expect(r.coverage).toBe(0);
  });
});
describe("Untrusted boundaries and exports", () => {
  it("rejects self-intersecting, unclosed, out-of-pilot and oversized boundaries", () => {
    const crossed = {
      type: "Polygon",
      coordinates: [
        [
          [77.21, 28.63],
          [77.22, 28.64],
          [77.22, 28.63],
          [77.21, 28.64],
          [77.21, 28.63],
        ],
      ],
    };
    expect(() => validateArea(crossed)).toThrow(/self-intersections/);
    expect(() =>
      validateArea({
        type: "Polygon",
        coordinates: [
          [
            [77.21, 28.63],
            [77.22, 28.64],
            [77.22, 28.63],
          ],
        ],
      }),
    ).toThrow();
    expect(() => validateArea(rectangle([0, 0, 1, 1]))).toThrow(/inside/);
    expect(() =>
      validateArea({
        type: "Polygon",
        coordinates: [Array(1001).fill([77.21, 28.63])],
      }),
    ).toThrow(/1,000/);
  });
  it("strips imported properties and accepts a one-feature boundary file", () => {
    const input = { ...study, properties: { html: "<script>bad</script>" } };
    const r = validateArea(featureCollection([input]));
    expect(r.properties).toEqual({});
    expect(r.geometry).toEqual(study.geometry);
  });
  it("rejects malformed or unsupported saved views without crashing", () => {
    expect(parseSavedView("#view=%7Bbad")).toBeNull();
    expect(
      parseSavedView(
        "#view=" + encodeURIComponent(JSON.stringify({ version: 999 })),
      ),
    ).toBeNull();
  });
  it("escapes embedded quotes and prevents spreadsheet formula evaluation", () => {
    expect(escapeCsv('"one",two')).toBe('"""one"",two"');
    expect(escapeCsv("=1+1")).toBe('"\'=1+1"');
    expect(escapeCsv(" @SUM(A1)")).toBe('"\' @SUM(A1)"');
  });
});
