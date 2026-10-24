import { describe, expect, it } from "vitest";
import type { Analysis, CityFeature, Properties } from "../src/lib/types";
import {
  researchMetrics,
  recordedHeight,
  shortlistDistances,
  notebookMarkdown,
  notebookCsv,
  type ResearchNotebook,
} from "../src/lib/researchMetrics";

function feature(id: string, fields: Partial<Properties> = {}): CityFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [77.2, 28.6] },
    properties: {
      id,
      kind: "building",
      name: "",
      use: "yes",
      road_type: "",
      rail_type: "",
      height_m: null,
      height_method: "",
      levels: null,
      start_date: null,
      source: "OpenStreetMap",
      source_url: `https://www.openstreetmap.org/${id}`,
      snapshot: "2026-10-15",
      area_m2: 100,
      ...fields,
    },
  };
}
function analysis(features: CityFeature[], areaM2 = 20000): Analysis {
  return {
    count: features.length,
    areaM2,
    footprintM2: 500,
    coverage: 2.5,
    knownHeightCount: 0,
    estimatedHeightCount: 0,
    heightMean: null,
    unknownHeightCount: 0,
    bins: [],
    features,
    clipped: { type: "FeatureCollection", features },
  };
}

describe("Grounded research metrics and notebook", () => {
  it("uses the whole study extent as density denominator and keeps unknown height out of means", () => {
    const records = [
      feature("way/1", {
        height_m: 9,
        height_method: "OSM height tag",
        name: "Exact school",
        tags: { amenity: "school" },
      }),
      feature("way/2", {
        height_m: 12,
        height_method: "Estimated: 4 storeys × 3 m",
        use: "house",
      }),
      feature("way/3"),
      feature("way/4", { height_m: Number.NaN }),
    ];
    const m = researchMetrics(analysis(records));
    expect(m.buildingsPerHectare).toBe(2);
    expect(m.mappedFootprintM2).toBe(500);
    expect(m.heightMean).toBe(10.5);
    expect(m.heightTagged).toBe(1);
    expect(m.heightEstimated).toBe(1);
    expect(m.heightUnknown).toBe(2);
    expect(m.heightBands.map((b) => b.count)).toEqual([1, 1, 0, 0]);
    expect(m.useMix.reduce((sum, c) => sum + c.count, 0)).toBe(4);
    expect(m.useMix.find((c) => c.id === "education")?.count).toBe(1);
    expect(m.useMix.find((c) => c.id === "unknown")?.count).toBe(2);
    expect(m.named).toBe(1);
  });
  it("handles empty extents and does not substitute the map's visual height", () => {
    const m = researchMetrics(analysis([feature("way/1")], 0));
    expect(m.buildingsPerHectare).toBeNull();
    expect(m.heightMean).toBeNull();
    expect(recordedHeight(feature("way/1", { height_m: 0 }))).toBeNull();
    expect(recordedHeight(feature("way/1", { height_m: -1 }))).toBeNull();
  });
  it("uses non-overlapping height bands at exact boundaries", () => {
    const m = researchMetrics(
      analysis(
        [10, 20, 40].map((h, i) => feature(`way/${i}`, { height_m: h })),
      ),
    );
    expect(m.heightBands.map((b) => b.count)).toEqual([0, 1, 1, 1]);
    expect(m.heightUnknown).toBe(0);
  });
  it("only measures between recorded centres without silently using polygon vertices", () => {
    const a = feature("way/1", { center: [77.2, 28.6] });
    const b = feature("way/2", { center: [77.201, 28.6] });
    const c = feature("way/3");
    const pairs = shortlistDistances([a, b, c]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].meters).toBeGreaterThan(95);
    expect(pairs[0].meters).toBeLessThan(100);
  });
  it("keeps user notes and manual shortlist scope distinct from source facts in exports", () => {
    const f = feature("way/1", {
      name: "=Source name",
      height_m: null,
      start_date: "1984",
      center: [77.2, 28.6],
    });
    const book: ResearchNotebook = {
      studyName: "Study A",
      filterDescription: "Use: education",
      dataset: "delhi-test",
      features: [f],
      notes: { "way/1": "=1+2" },
      note: "<script>note</script>",
      metrics: researchMetrics(analysis([f])),
    };
    const markdown = notebookMarkdown(book),
      csv = notebookCsv(book);
    expect(markdown).toContain("outside the current study/filter");
    expect(markdown).toContain("https://www.openstreetmap.org/way/1");
    expect(markdown).toContain("OSM contributor record");
    expect(markdown).toContain("&lt;script&gt;note&lt;/script&gt;");
    expect(markdown).toContain("Researcher notes are user-authored");
    expect(csv).toContain('"\'=1+2"');
    expect(csv).toContain('"\'=Source name"');
    expect(csv).toContain(
      "Manual shortlist; may be outside analysis selection",
    );
  });
});
