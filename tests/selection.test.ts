import { describe, it, expect } from "vitest";
import area from "@turf/area";
import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import { featureFilter } from "@maplibre/maplibre-gl-style-spec";
import { analyse, analyseOverviewSelection, toCsv } from "../src/lib/analysis";
import { buildingYear } from "../src/lib/buildings";
import { rectangle, PILOT } from "../src/lib/data";
import { accessCategory, useCategory } from "../src/lib/urban";
import {
  matchesSelection,
  selectionExpression,
  isUnfilteredSelection,
  type FilterSelection,
} from "../src/lib/selection";
import { unionArea } from "../src/lib/unionArea";
import type {
  CityFeature,
  CityData,
  Overview,
  Properties,
} from "../src/lib/types";
const baseline: FilterSelection = {
  research: { use: "all", access: "all", yearFrom: 1190 },
  size: "all",
  year: 2026,
  timelineMode: "buildings",
  period: null,
  showUnknown: true,
};
function building(
  id: string,
  bounds: number[],
  props: Partial<Properties> = {},
): CityFeature {
  const shape = rectangle(bounds);
  return {
    ...shape,
    properties: {
      id,
      kind: "building",
      name: "",
      use: "yes",
      road_type: "",
      rail_type: "",
      height_m: null,
      height_method: "unknown",
      levels: null,
      start_date: null,
      source: "OSM",
      source_url: `https://www.openstreetmap.org/${id}`,
      snapshot: "test",
      area_m2: area(shape),
      ...props,
    },
  };
}
const inside = [77.21, 28.63, 77.2101, 28.6301];

describe("A shared map and research selection", () => {
  it("agrees with the actual MapLibre filter engine across unknown dates, access, periods and size boundaries", () => {
    const features = [
      building("way/a", inside, {
        use: "school",
        start_date: "1930",
        tags: { access: "yes" },
        area_m2: 100,
      }),
      building("way/b", inside, {
        use: "school",
        start_date: "2001",
        tags: { access: "private" },
        area_m2: 500,
      }),
      building("way/c", inside, { use: "house", area_m2: 99 }),
      building("way/d", inside, {
        use: "school",
        start_date: "1700",
        area_m2: 499,
      }),
      building("way/e", inside, {
        kind: "buildingpart",
        use: "school",
        start_date: "1930",
        area_m2: 100,
      }),
    ];
    const selections: FilterSelection[] = [
      baseline,
      { ...baseline, research: { ...baseline.research, use: "education" } },
      { ...baseline, research: { ...baseline.research, access: "public" } },
      { ...baseline, research: { ...baseline.research, yearFrom: 1947 } },
      { ...baseline, year: 1946, showUnknown: false },
      { ...baseline, period: "capital" },
      { ...baseline, year: 1600, timelineMode: "heritage", showUnknown: false },
      ...(["small", "medium", "large"] as const).map((size) => ({
        ...baseline,
        size,
      })),
    ];
    for (const selection of selections) {
      const filter = featureFilter(selectionExpression(selection));
      for (const f of features) {
        const rendered = {
          type: "Polygon" as const,
          properties: {
            ...f.properties,
            use_class: useCategory(f),
            access_class: accessCategory(f),
            recorded_year: buildingYear(f),
          },
        };
        expect(
          filter.filter({ zoom: 16 }, rendered),
          `${f.properties.id} ${JSON.stringify(selection)}`,
        ).toBe(matchesSelection(f, selection));
      }
    }
    expect(
      matchesSelection(features[2], { ...baseline, showUnknown: false }),
    ).toBe(false);
    expect(
      matchesSelection(features[2], { ...baseline, period: "capital" }),
    ).toBe(false);
    expect(
      matchesSelection(features[1], {
        ...baseline,
        timelineMode: "heritage",
        year: 1600,
      }),
    ).toBe(true);
    expect(
      isUnfilteredSelection({
        ...baseline,
        research: { ...baseline.research, access: "public" },
      }),
    ).toBe(false);
  });
  it("clips and unions only the selected records and exports their filter provenance", () => {
    const a = building("way/school", [77.21, 28.63, 77.211, 28.631], {
      use: "school",
      start_date: "1930",
      height_m: 15,
      height_method: "OSM height tag",
      tags: { access: "yes" },
    });
    const b = building("way/house", [77.2105, 28.63, 77.2115, 28.631], {
      use: "house",
      start_date: "1930",
      height_m: 30,
      tags: { access: "yes" },
    });
    const unknown = building("way/unknown", [77.21, 28.6305, 77.211, 28.6315], {
      use: "school",
      tags: { access: "yes" },
    });
    const selection = {
      ...baseline,
      showUnknown: false,
      research: { use: "education", access: "public", yearFrom: 1900 },
    };
    const result = analyse(
      featureCollection([a, b, unknown]) as CityData,
      rectangle([77.2105, 28.63, 77.212, 28.632]),
      "all",
      selection,
    );
    expect(result.count).toBe(1);
    expect(result.heightMean).toBe(15);
    expect(result.footprintM2).toBeCloseTo(
      area(rectangle([77.2105, 28.63, 77.211, 28.631])),
      4,
    );
    expect(result.clipped.features.map((f) => f.properties.id)).toEqual([
      "way/school",
    ]);
    const csv = toCsv(result, "test", "study", selection);
    expect(csv).toContain(
      '"analysis_scope","analysis_filters","analysis_description"',
    );
    expect(csv).toContain('"filtered"');
    // Parse standard quoted CSV cells, including JSON's doubled quotes.
    const cells = (line: string) =>
      [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map((m) =>
        m[1].replaceAll('""', '"'),
      );
    const [headers, row] = csv.split("\r\n").map(cells);
    const fields = Object.fromEntries(headers.map((key, i) => [key, row[i]]));
    expect(fields.analysis_scope).toBe("filtered");
    expect(JSON.parse(fields.analysis_filters)).toEqual(selection);
    expect(fields.analysis_description).toContain("Education; Public access");
    expect(csv).toContain("Education; Public access");
    expect(csv).not.toContain("way/house");
    expect(csv).not.toContain("way/unknown");
  });
  it("recomputes filtered overview coverage while preserving exact clipped outlines", () => {
    const a = building("way/a", [77.169, 28.63, 77.171, 28.631], {
      use: "school",
    });
    const b = building("way/b", [77.1705, 28.63, 77.1715, 28.631], {
      use: "house",
    });
    const data = featureCollection([a, b]) as CityData;
    const full = analyse(data, PILOT);
    const overview = {
      dataset: "test",
      areaM2: full.areaM2,
      edgeClips: {
        "way/a": {
          geometry: full.clipped.features[0].geometry,
          area: area(full.clipped.features[0]),
        },
      },
      filters: { all: full, small: full, medium: full, large: full },
    } as Overview;
    const filtered = analyseOverviewSelection(data, overview, "all", {
      ...baseline,
      research: { ...baseline.research, use: "education" },
    });
    expect(filtered.count).toBe(1);
    expect(filtered.footprintM2).toBeCloseTo(
      area(rectangle([77.17, 28.63, 77.171, 28.631])),
      4,
    );
    expect(filtered.footprintM2).toBeLessThan(area(a));
    expect(filtered.footprintM2).toBeLessThan(full.footprintM2);
    expect(filtered.features.map((f) => f.properties.id)).toEqual(
      filtered.clipped.features.map((f) => f.properties.id),
    );
    expect(
      analyseOverviewSelection(data, overview, "all", baseline).coverage,
    ).toBe(full.coverage);
  });
});

describe("Partitioned exact polygon coverage", () => {
  it("matches one global union for disjoint, touching, overlapping and holed polygons", () => {
    const hole = rectangle([77.21, 28.63, 77.213, 28.633]);
    const inset = rectangle([77.211, 28.631, 77.212, 28.632]);
    if (hole.geometry.type !== "Polygon" || inset.geometry.type !== "Polygon")
      throw Error();
    hole.geometry.coordinates.push(
      inset.geometry.coordinates[0].slice().reverse(),
    );
    const polygons = [
      hole,
      rectangle([77.2125, 28.6325, 77.214, 28.634]),
      rectangle([77.214, 28.6325, 77.215, 28.634]),
      rectangle([77.22, 28.64, 77.221, 28.641]),
      inset,
    ];
    const reference = union(featureCollection(polygons))!;
    expect(unionArea(polygons)).toBeCloseTo(area(reference), 3);
    expect(unionArea([])).toBe(0);
  });
});
