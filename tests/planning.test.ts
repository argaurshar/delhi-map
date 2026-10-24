import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_SPACE_FILTERS,
  PLANNING_SOURCES,
  matchesSpace,
  spaceCoverage,
  spaceSurface,
  spacesCsv,
} from "../src/lib/planning";
import type { CityData, CityFeature } from "../src/lib/types";
const data = JSON.parse(
  readFileSync("public/data/delhi.geojson", "utf8"),
) as CityData;
const spaces = data.features.filter((f) =>
  matchesSpace(f, DEFAULT_SPACE_FILTERS),
);
describe("Planning documents and source-backed spaces", () => {
  it("keeps statutory document status separate from footprint designation", () => {
    expect(
      PLANNING_SOURCES.find((s) => s.id === "dda-plans")?.availability,
    ).toBe("unavailable");
    expect(PLANNING_SOURCES.find((s) => s.id === "nma-drafts")?.status).toBe(
      "Draft directory",
    );
    for (const source of PLANNING_SOURCES) {
      const u = new URL(source.url);
      expect(u.protocol).toBe("https:");
      expect(["dda.gov.in", "www.nma.gov.in", "asi.nic.in"]).toContain(
        u.hostname,
      );
      expect(source.checked).toBe("2026-10-24");
    }
  });
  it("never infers a park surface or public access from its name, role or owner", () => {
    const park = {
      ...spaces.find((f) => f.properties.kind === "green")!,
      properties: {
        ...spaces[0].properties,
        kind: "green",
        name: "Public Park",
        tags: { ownership: "government" },
        surface_status: undefined,
      },
    } as CityFeature;
    expect(spaceSurface(park)).toBe("unknown");
    expect(
      matchesSpace(park, { ...DEFAULT_SPACE_FILTERS, access: "public" }),
    ).toBe(false);
    expect(
      matchesSpace(park, { ...DEFAULT_SPACE_FILTERS, access: "unknown" }),
    ).toBe(true);
    park.properties.tags = { surface: "grass", access: "private" };
    expect(spaceSurface(park)).toBe("soft");
    expect(
      matchesSpace(park, {
        ...DEFAULT_SPACE_FILTERS,
        access: "private",
        surface: "soft",
      }),
    ).toBe(true);
  });
  it("reconciles actual polygon records and explicit paving evidence", () => {
    expect(spaces).toHaveLength(2657);
    expect(new Set(spaces.map((f) => f.properties.id)).size).toBe(
      spaces.length,
    );
    expect(spaceCoverage(data.features).total).toBe(spaces.length);
    const areas = spaces.filter((f) => f.properties.kind === "paved");
    expect(areas).toHaveLength(299);
    expect(areas.filter((f) => spaceSurface(f) === "hard")).toHaveLength(47);
    expect(areas.filter((f) => spaceSurface(f) === "soft")).toHaveLength(3);
    expect(areas.filter((f) => spaceSurface(f) === "unknown")).toHaveLength(
      249,
    );
    expect(
      matchesSpace(
        data.features.find((f) => f.properties.kind === "building")!,
        DEFAULT_SPACE_FILTERS,
      ),
    ).toBe(false);
  });
  it("retains exact source IDs and evidence in the directory CSV selection", () => {
    const selected = spaces.filter((f) =>
      matchesSpace(f, {
        ...DEFAULT_SPACE_FILTERS,
        role: "parking",
        surface: "hard",
      }),
    );
    expect(selected.length).toBeGreaterThan(0);
    const csv = spacesCsv(selected);
    expect(csv.split("\r\n")).toHaveLength(selected.length + 1);
    expect(csv).toContain("recorded_ownership");
    expect(csv).toContain("source_url");
    for (const f of selected) {
      expect(csv).toContain(`"${f.properties.id}"`);
      expect(csv).toContain(f.properties.source_url);
    }
    expect(
      matchesSpace(selected[0], {
        ...DEFAULT_SPACE_FILTERS,
        query: selected[0].properties.id,
      }),
    ).toBe(true);
    const tricky = {
      ...selected[0],
      properties: { ...selected[0].properties, name: "=1+1" },
    };
    expect(spacesCsv([tricky])).toContain('"\'=1+1"');
  });
});
