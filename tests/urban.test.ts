import { toCsv } from "../src/lib/analysis";
import { describe, expect, it } from "vitest";
import {
  ACCESS_CATEGORIES,
  DEFAULT_RESEARCH_FILTERS,
  USE_CATEGORIES,
  accessCategory,
  accessDefinition,
  featureAddress,
  featureName,
  featureTitle,
  matchesResearch,
  useCategory,
  useDefinition,
} from "../src/lib/urban";
import type { Analysis, CityFeature, Properties } from "../src/lib/types";

function feature(properties: Partial<Properties> = {}): CityFeature {
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
      height_method: "",
      levels: null,
      start_date: null,
      source: "OpenStreetMap",
      source_url: "",
      snapshot: "test",
      ...properties,
    },
  };
}

describe("Evidence-based urban categories", () => {
  it("exports categories alongside original access and ownership evidence", () => {
    const f = feature({
      name: "Exact source name",
      use: "school",
      name_source: "name:en",
      tags: { access: "private", ownership: "government", surface: "concrete" },
    });
    const [header, row] = toCsv(
      { features: [f] } as Analysis,
      "snapshot",
      "study",
    )
      .split("\r\n")
      .map((line) => line.split(",").map((cell) => JSON.parse(cell)));
    const record = Object.fromEntries(header.map((key, i) => [key, row[i]]));
    expect(record.use_category).toBe("education");
    expect(record.access_category).toBe("private");
    expect(record.recorded_access).toBe("private");
    expect(record.ownership).toBe("government");
    expect(record.name).toBe("Exact source name");
    expect(record.name_source).toBe("name:en");
  });
  it("uses explicit occupancy before a generic building type without guessing from a name", () => {
    expect(
      useCategory(
        feature({
          use: "house",
          tags: { "building:use": "office", amenity: "school" },
        }),
      ),
    ).toBe("office");
    expect(
      useCategory(feature({ use: "yes", tags: { amenity: "school" } })),
    ).toBe("education");
    expect(
      useCategory(feature({ use: "commercial", tags: { shop: "clothes" } })),
    ).toBe("retail");
    expect(useCategory(feature({ tags: { office: "lawyer" } }))).toBe("office");
    expect(useCategory(feature({ tags: { tourism: "hotel" } }))).toBe(
      "hospitality",
    );
    expect(
      useCategory(feature({ use: "yes", name: "A hospital beside a school" })),
    ).toBe("unknown");
    expect(
      useCategory(feature({ tags: { building: "apartments", shop: "no" } })),
    ).toBe("residential");
  });

  it("retains mixed or insufficiently specific use instead of selecting an arbitrary occupant", () => {
    expect(
      useCategory(feature({ tags: { "building:use": "residential;office" } })),
    ).toBe("other");
    expect(
      useCategory(feature({ tags: { "building:use": "school;university" } })),
    ).toBe("education");
    expect(useCategory(feature({ use: "commercial" }))).toBe("other");
    expect(useCategory(feature({ use: "roof" }))).toBe("other");
    expect(useCategory(feature({ use: "unknown" }))).toBe("unknown");
    expect(useDefinition(feature()).label).toBe("Use not recorded");
    expect(new Set(USE_CATEGORIES.map((entry) => entry.color)).size).toBe(
      USE_CATEGORIES.length,
    );
  });

  it("shows only this feature's recorded name and keeps addresses out of its identity", () => {
    expect(
      featureName(
        feature({ name: "Jama Masjid", tags: { "name:en": "Alternate name" } }),
      ),
    ).toBe("Jama Masjid");
    expect(
      featureName(
        feature({
          tags: { "name:en": "National Museum", name: "राष्ट्रीय संग्रहालय" },
        }),
      ),
    ).toBe("National Museum");
    expect(
      featureName(
        feature({ name: "no", tags: { "name:hi": "दिल्ली पुस्तकालय" } }),
      ),
    ).toBe("दिल्ली पुस्तकालय");
    expect(
      featureName(
        feature({ tags: { official_name: "Recorded official name" } }),
      ),
    ).toBe("Recorded official name");
    const anonymous = feature({
      tags: {
        "addr:housenumber": "12",
        "addr:street": "Janpath",
        operator: "Example school",
      },
    });
    expect(featureName(anonymous)).toBeNull();
    expect(featureTitle(anonymous)).toBe("Name not recorded");
    expect(featureAddress(anonymous)).toBe("12 Janpath");
    expect(featureTitle(feature({ name: "Everyday building" }))).toBe(
      "Name not recorded",
    );
    expect(
      featureAddress(
        feature({
          tags: {
            "addr:full": "12 Janpath, Delhi",
            "addr:street": "Other street",
          },
        }),
      ),
    ).toBe("12 Janpath, Delhi");
  });

  it("distinguishes access from ownership or civic use and leaves incomplete access unknown", () => {
    expect(
      accessCategory(
        feature({
          use: "public",
          tags: { ownership: "public", operator: "Government of India" },
        }),
      ),
    ).toBe("unknown");
    expect(
      accessCategory(
        feature({ use: "government", tags: { access: "private" } }),
      ),
    ).toBe("private");
    for (const access of ["yes", "public", "permissive"])
      expect(accessCategory(feature({ tags: { access } }))).toBe("public");
    for (const access of [
      "restricted",
      "customers",
      "destination",
      "permit",
      "members",
      "no",
    ])
      expect(accessCategory(feature({ tags: { access } }))).toBe("restricted");
    expect(
      accessCategory(
        feature({ tags: { "access:conditional": "yes @ (09:00-17:00)" } }),
      ),
    ).toBe("unknown");
    expect(accessCategory(feature({ tags: { access: "yes;private" } }))).toBe(
      "unknown",
    );
    expect(accessDefinition(feature())).toEqual(
      ACCESS_CATEGORIES.find((entry) => entry.id === "unknown"),
    );
  });

  it("filters known building dates and uses while retaining unknown years and nonbuilding context", () => {
    const filters = {
      ...DEFAULT_RESEARCH_FILTERS,
      use: "residential",
      yearFrom: 1980,
    };
    expect(
      matchesResearch(feature({ use: "house", start_date: "1979" }), filters),
    ).toBe(false);
    expect(
      matchesResearch(feature({ use: "house", start_date: "1980" }), filters),
    ).toBe(true);
    expect(
      matchesResearch(feature({ use: "house", start_date: null }), filters),
    ).toBe(true);
    expect(
      matchesResearch(
        feature({ use: "house", start_date: "circa 1970" }),
        filters,
      ),
    ).toBe(true);
    expect(matchesResearch(feature({ use: "hospital" }), filters)).toBe(false);
    expect(matchesResearch(feature({ kind: "road" }), filters)).toBe(true);
    expect(
      matchesResearch(feature({ kind: "road", tags: { access: "private" } }), {
        ...filters,
        access: "public",
      }),
    ).toBe(false);
    expect(
      matchesResearch(feature({ use: "house", tags: { access: "public" } }), {
        ...filters,
        access: "public",
      }),
    ).toBe(true);
  });
});
