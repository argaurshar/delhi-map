import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  advanceYear,
  buildingDateRecords,
  contextCategory,
  histogram,
  inPeriod,
} from "../src/lib/chronology";
import { parseSavedView } from "../src/lib/state";
import { DEFAULT_LAYERS } from "../src/lib/data";
import type { CityData, CityFeature } from "../src/lib/types";
const data = JSON.parse(
  readFileSync("public/data/delhi.geojson", "utf8"),
) as CityData;
const buildings = data.features.filter((f) => f.properties.kind === "building");
describe("Chronology and context evidence", () => {
  it("only reveals dated building footprints, not centuries, nearby landmarks or building parts", () => {
    const records = buildingDateRecords(data.features, "all", "none", null);
    expect(records).toHaveLength(19);
    expect(records.some((r) => r.name === "Kushak Mahal")).toBe(false);
    expect(
      records.some((r) => r.name === "Lotus Temple" && r.year === 1986),
    ).toBe(true);
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
    expect(
      records
        .filter((r) => r.year <= 1600)
        .map((r) => r.year)
        .sort(),
    ).toEqual([1444, 1494, 1541, 1570]);
  });
  it("reconciles histogram counts and context filters with the source footprints", () => {
    for (const context of [
      "none",
      "homes",
      "work",
      "civic",
      "sacred",
      "heritage",
      "roofs",
    ] as const) {
      const records = buildingDateRecords(buildings, "all", context, null);
      expect(histogram(records).reduce((n, b) => n + b.count, 0)).toBe(
        records.length,
      );
      for (const r of records)
        expect(
          contextCategory(
            buildings.find((f) => f.properties.id === r.id)!,
            context,
          ),
        ).toBeTruthy();
    }
  });
  it("isolates periods without assigning an age to missing records", () => {
    expect(inPeriod(null, "early")).toBe(false);
    expect(inPeriod(1699, "early")).toBe(true);
    expect(inPeriod(1700, "early")).toBe(false);
    expect(inPeriod(1947, "modern")).toBe(true);
    const all = buildingDateRecords(buildings, "all", "none", null);
    const grouped = ["early", "capital", "modern", "recent"].flatMap((p) =>
      buildingDateRecords(buildings, "all", "none", p as "early"),
    );
    expect(grouped.map((r) => r.id).sort()).toEqual(
      all.map((r) => r.id).sort(),
    );
  });
  it("does not turn unnamed buildings into houses or untagged roofs into flat roofs", () => {
    const f = {
      properties: { kind: "building", use: "yes", tags: {} },
    } as CityFeature;
    expect(contextCategory(f, "homes")).toBeNull();
    expect(contextCategory(f, "roofs")).toBeNull();
    expect(contextCategory(f, "heritage")).toBeNull();
    f.properties.tags = { "roof:shape": "dome", heritage: "no" };
    expect(contextCategory(f, "roofs")).toBe("dome");
    expect(contextCategory(f, "heritage")).toBeNull();
  });
  it("stops playback at Today at every supported speed", () => {
    for (const speed of [1, 2, 4]) {
      let y = 1190,
        steps = 0;
      while (y < 2026 && steps++ < 1000) y = advanceYear(y, speed);
      expect(y).toBe(2026);
      expect(steps).toBeLessThan(200);
      expect(advanceYear(y, speed)).toBe(2026);
    }
  });
  it("restores chronology and context settings and rejects invalid values", () => {
    const state = {
      version: 1,
      dataset: "test",
      areaName: "Whole pilot",
      area: null,
      theme: "era",
      size: "all",
      mode: "explore",
      year: 1930,
      layers: DEFAULT_LAYERS,
      timelineMode: "buildings",
      context: "roofs",
      period: "capital",
      showUnknown: false,
    };
    const parse = (v: unknown) =>
      parseSavedView("#" + new URLSearchParams({ view: JSON.stringify(v) }));
    const research = { use: "education", access: "private", yearFrom: 1800 };
    expect(parse({ ...state, theme: "access", research })?.research).toEqual(
      research,
    );
    for (const bad of [
      { ...research, yearFrom: 2000 },
      { ...research, yearFrom: null },
      { ...research, use: "invented" },
      { ...research, access: "government-owned" },
    ])
      expect(parse({ ...state, research: bad })).toBeNull();
    expect(parse({ ...state, analyseFiltered: true })?.analyseFiltered).toBe(
      true,
    );
    expect(parse({ ...state, analyseFiltered: "yes" })).toBeNull();
    expect(parse(state)?.context).toBe("roofs");
    expect(parse(state)?.showUnknown).toBe(false);
    for (const invalid of [
      { context: "invented" },
      { period: "imaginary" },
      { timelineMode: "fake" },
      { showUnknown: "false" },
    ])
      expect(parse({ ...state, ...invalid })).toBeNull();
  });
});
