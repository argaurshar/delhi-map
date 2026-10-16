import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  recordedYear,
  safeExternalUrl,
  linkedLandmark,
  footprintPerimeter,
  buildingDate,
  buildingEvidence,
  withBuildingEvidence,
} from "../src/lib/buildings";
import { HERITAGE, rectangle } from "../src/lib/data";
import type { Analysis, CityData, CityFeature } from "../src/lib/types";
import { toCsv } from "../src/lib/analysis";

const city = JSON.parse(
  readFileSync("public/data/delhi.geojson", "utf8"),
) as CityData;
const named = (name: string) =>
  city.features.find(
    (f) => f.properties.kind === "building" && f.properties.name === name,
  )!;

describe("Building evidence", () => {
  it("links reviewed dates to explicit footprints and retains the original map record", () => {
    const jama = named("Jama Masjid");
    expect(jama.properties.start_date).toBeNull();
    expect(buildingDate(jama)?.year).toBe(1656);
    expect(buildingDate(jama)?.sourceUrl).toContain("incredibleindia.gov.in");
    expect(city.features.filter((f) => buildingEvidence(f))).toHaveLength(17);
    for (const patch of [
      { id: "way/nearby" },
      { name: "A neighbouring shop" },
      { kind: "building_part" },
      { center: [77.2, 28.6] },
      { center: undefined },
    ]) {
      const changed = {
        ...jama,
        properties: { ...jama.properties, ...patch },
      } as CityFeature;
      expect(buildingEvidence(changed)).toBeNull();
      expect(buildingDate(changed)).toBeNull();
    }
  });
  it("keeps ranges, construction starts and institutional events out of added exact dates", () => {
    for (const name of [
      "National Museum",
      "Jaipur House",
      "Qutb Minar",
      "Gurdwara Bangla Sahib",
      "Tomb of Sikandar Lodhi",
      "Agrasen ki Baoli",
      "Raj Ghat",
    ]) {
      expect(buildingEvidence(named(name))?.date?.label).toBeTruthy();
      expect(buildingDate(named(name))).toBeNull();
    }
    // Retain an existing contributor date while identifying its approximate source history.
    expect(buildingDate(named("Humayun's Tomb"))?.basis).toBe(
      "OSM contributor record",
    );
    expect(buildingEvidence(named("Humayun's Tomb"))?.date?.year).toBeNull();
  });
  it("exports reviewed provenance separately from original OSM dates and links", () => {
    const jama = named("Jama Masjid");
    const exported = withBuildingEvidence(jama);
    expect(exported.properties.start_date).toBeNull();
    expect(exported.properties.source_url).toContain("openstreetmap.org");
    expect(exported.properties.timeline_date?.year).toBe(1656);
    expect(
      exported.properties.reviewed_building_evidence?.sources[0].url,
    ).toContain("incredibleindia.gov.in");
    const csv = toCsv(
      { features: [jama] } as Analysis,
      "test",
      "Jama Masjid study",
    );
    expect(csv).toContain(
      '"timeline_year","timeline_date_label","timeline_date_basis","timeline_date_source"',
    );
    expect(csv).toContain('"1656","Completed 1656","Reviewed source"');
    expect(csv).toContain('"construction_date"');
  });
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
