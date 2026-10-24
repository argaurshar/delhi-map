import { describe, expect, it } from "vitest";
import {
  heightEvidence,
  identityEvidence,
  recordEvidence,
  sourceEvidence,
} from "../src/lib/identity";
import type { CityFeature } from "../src/lib/types";

function feature(
  overrides: Partial<CityFeature["properties"]> = {},
): CityFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [77.2, 28.6] },
    properties: {
      id: "way/test",
      kind: "building",
      name: "",
      use: "yes",
      road_type: "",
      rail_type: "",
      height_m: null,
      height_method: "Unknown",
      levels: null,
      start_date: null,
      source: "OpenStreetMap",
      source_url: "https://www.openstreetmap.org/way/1",
      snapshot: "2026-10-15",
      ...overrides,
    },
  };
}
describe("Identity and field evidence", () => {
  it("requires the reviewed ID, exact name and location rather than a nearby or similar name", () => {
    const f = feature({
      id: "relation/3926057",
      name: "Jama Masjid",
      center: [77.232961, 28.6506822],
    });
    expect(identityEvidence(f).level).toBe("reviewed");
    expect(
      identityEvidence(feature({ ...f.properties, name: "Jama Masjid shop" }))
        .level,
    ).toBe("named");
    expect(
      identityEvidence(feature({ ...f.properties, center: [77.21, 28.63] }))
        .level,
    ).toBe("named");
    expect(
      identityEvidence(
        feature({
          tags: { operator: "Jama Masjid", "addr:street": "Jama Masjid Road" },
        }),
      ).level,
    ).toBe("anonymous");
  });
  it("keeps display heights, storey estimates and source height tags distinct from surveyed measurements", () => {
    expect(heightEvidence(feature()).state).toBe("missing");
    expect(
      heightEvidence(
        feature({ height_m: 12, height_method: "Estimated: 4 storeys × 3 m" }),
      ).state,
    ).toBe("estimated");
    const recorded = heightEvidence(
      feature({ height_m: 12, height_method: "OSM height tag" }),
    );
    expect(recorded.state).toBe("recorded");
    expect(recorded.explanation).toContain("No independent survey");
    expect(heightEvidence(feature({ height_m: NaN })).state).toBe("missing");
  });
  it("counts available information without borrowing a name or inferring ownership from access", () => {
    const r = recordEvidence(
      feature({
        tags: {
          access: "yes",
          owner: "Municipality",
          "addr:full": "Example address",
        },
      }),
    );
    expect(r.available).toBe(2);
    expect(r.total).toBe(10);
    expect(r.fields.find((f) => f.id === "name")?.state).toBe("missing");
    expect(r.fields.find((f) => f.id === "ownership")?.state).toBe("missing");
    expect(r.fields.find((f) => f.id === "access")?.value).toBe("yes");
  });
  it("does not turn historical milestones or approximate dates into usable construction years", () => {
    const f = feature({
      id: "way/111695183",
      name: "Gurdwara Bangla Sahib",
      center: [77.2090851, 28.6263078],
    });
    const r = recordEvidence(f);
    expect(r.identity.level).toBe("reviewed");
    expect(r.fields.find((f) => f.id === "date")?.state).toBe("missing");
    const site = identityEvidence(
      feature({
        id: "way/370569205",
        name: "Qila-i-Khuna Mosque",
        center: [77.2448161, 28.6097447],
      }),
    );
    expect(site.scope).toBe("Individual structure within a wider site");
  });
  it("offers ground-relevant coverage and preserves unavailable source checks", () => {
    const r = recordEvidence(
      feature({
        kind: "paved",
        tags: { surface: "concrete", access: "private" },
      }),
    );
    expect(r.available).toBe(2);
    expect(r.total).toBe(6);
    expect(r.fields.some((f) => f.id === "height")).toBe(false);
    expect(
      sourceEvidence({
        url: "https://www.incredibleindia.gov.in/en/delhi",
        checked: "2026-10-24",
      }),
    ).toMatchObject({ type: "Government portal", checked: true });
    expect(
      sourceEvidence({
        url: "https://whc.unesco.org/en/list/232/",
        checked: "Further reading; portal unavailable",
      }),
    ).toMatchObject({
      type: "UNESCO heritage record",
      checked: false,
      status: "Further reading; portal unavailable",
    });
    expect(
      sourceEvidence({ url: "https://gov.in.example.com/fake", checked: "" })
        .type,
    ).toBe("Public reference");
    expect(
      sourceEvidence({ url: "javascript:alert(1)", checked: "" }).type,
    ).toBe("Unusable link");
  });
});
