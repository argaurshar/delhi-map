import { describe, expect, it } from "vitest";
import {
  recordedYear,
  safeExternalUrl,
  linkedLandmark,
  footprintPerimeter,
} from "../src/lib/buildings";
import { HERITAGE, rectangle } from "../src/lib/data";
import type { CityFeature } from "../src/lib/types";

describe("Building evidence", () => {
  it("does not convert unknown, approximate or ranged dates into exact years", () => {
    expect(recordedYear("1986")).toBe(1986);
    expect(recordedYear("1931-02-12")).toBe(1931);
    for (const v of [
      null,
      "",
      "circa 1650",
      "C17",
      "1900..1920",
      "2040",
      "1850?",
    ])
      expect(recordedYear(v)).toBeNull();
  });
  it("does not identify a footprint merely because a landmark is nearby", () => {
    const site = HERITAGE.find((h) => h.id === "lotus")!;
    const f = {
      ...rectangle([77.25, 28.55, 77.26, 28.56]),
      properties: { id: "way/test", center: site.coords, tags: {} },
    } as CityFeature;
    expect(linkedLandmark(f, HERITAGE)).toBeUndefined();
    f.properties.tags = { wikidata: site.wikidata! };
    expect(linkedLandmark(f, HERITAGE)?.id).toBe("lotus");
    f.properties.center = [77.23, 28.65];
    expect(linkedLandmark(f, HERITAGE)).toBeUndefined();
  });
  it("rejects active protocols in imported website tags", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,bad")).toBeNull();
    expect(safeExternalUrl("https://asi.nic.in/")).toBe("https://asi.nic.in/");
  });
  it("includes courtyard boundaries in calculated outline length", () => {
    const f = rectangle([77.21, 28.63, 77.211, 28.631]) as CityFeature;
    const outside = footprintPerimeter(f);
    if (f.geometry.type !== "Polygon") throw Error();
    f.geometry.coordinates.push([
      [77.2102, 28.6302],
      [77.2108, 28.6302],
      [77.2108, 28.6308],
      [77.2102, 28.6308],
      [77.2102, 28.6302],
    ]);
    expect(footprintPerimeter(f)).toBeGreaterThan(outside * 1.5);
  });
  it("keeps source pointers and image licences with every landmark", () => {
    expect(HERITAGE).toHaveLength(24);
    for (const h of HERITAGE) {
      expect(h.photo?.licence).toBeTruthy();
      expect(h.photo?.page).toMatch(/^https:\/\/commons.wikimedia.org\//);
      expect(h.sources?.length).toBeGreaterThan(0);
      for (const fact of h.facts ?? [])
        expect(h.sources?.[fact.source]?.url).toMatch(/^https:\/\//);
    }
  });
});
