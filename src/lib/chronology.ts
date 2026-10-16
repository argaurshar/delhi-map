import type { CityFeature, Heritage, SizeFilter } from "./types";
import { matchesSize } from "./data";
import { buildingYear } from "./buildings";

export type TimelineMode = "buildings" | "heritage";
export type ContextId =
  | "none"
  | "homes"
  | "work"
  | "civic"
  | "sacred"
  | "heritage"
  | "roofs";
export const FIRST_YEAR = 1190;
export const LAST_YEAR = 2026;
export const PERIODS = [
  {
    id: "early",
    label: "Before 1700",
    start: FIRST_YEAR,
    end: 1699,
    color: "#9d5d55",
  },
  {
    id: "capital",
    label: "1700–1946",
    start: 1700,
    end: 1946,
    color: "#c28b53",
  },
  {
    id: "modern",
    label: "1947–1999",
    start: 1947,
    end: 1999,
    color: "#6e9989",
  },
  {
    id: "recent",
    label: "2000 onward",
    start: 2000,
    end: LAST_YEAR,
    color: "#6b8caf",
  },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];
export const CONTEXTS: {
  id: ContextId;
  name: string;
  description: string;
  categories: [string, string, string][];
}[] = [
  {
    id: "none",
    name: "All buildings",
    description: "Return to the complete building view.",
    categories: [],
  },
  {
    id: "homes",
    name: "Homes & neighbourhoods",
    description:
      "Residential building types recorded in OpenStreetMap. Tags describe mapped use, not occupancy or tenure.",
    categories: [
      ["house", "Houses", "#bd7d62"],
      ["apartments", "Apartments", "#607d89"],
      ["residential", "Other residential", "#7b9585"],
    ],
  },
  {
    id: "work",
    name: "Work & commerce",
    description:
      "Recorded commercial, retail and industrial building uses. Unclassified buildings remain neutral.",
    categories: [
      ["retail", "Shops & markets", "#c89854"],
      ["commercial", "Offices & commerce", "#607d89"],
      ["industrial", "Industry & storage", "#9d5d55"],
    ],
  },
  {
    id: "civic",
    name: "Public life",
    description:
      "Recorded educational, healthcare, civic and transport buildings. This is not a public ownership register.",
    categories: [
      ["education", "Education", "#7b9585"],
      ["health", "Healthcare", "#bd7d62"],
      ["civic", "Civic & transport", "#607d89"],
    ],
  },
  {
    id: "sacred",
    name: "Places of worship",
    description:
      "Buildings tagged as places of worship, grouped by recorded religion. Missing religions remain unclassified.",
    categories: [
      ["hindu", "Hindu", "#c89854"],
      ["muslim", "Muslim", "#6e9989"],
      ["sikh", "Sikh", "#6b8caf"],
      ["christian", "Christian", "#9d5d55"],
      ["other", "Other / unrecorded religion", "#9b84ac"],
    ],
  },
  {
    id: "heritage",
    name: "Historic building tags",
    description:
      "Buildings with historic or heritage tags in OpenStreetMap. A tag is not proof of legal protection; check the linked record and official registers.",
    categories: [
      ["heritage", "Heritage tag", "#9d5d55"],
      ["historic", "Historic tag", "#c28b53"],
    ],
  },
  {
    id: "roofs",
    name: "Roof forms",
    description:
      "Recorded roof shapes. Colours classify the tags; the map uses schematic building geometry, not reconstructed roof models.",
    categories: [
      ["flat", "Flat", "#6e9989"],
      ["gabled", "Gabled / pitched", "#6b8caf"],
      ["dome", "Domes", "#c28b53"],
      ["other", "Other recorded shapes", "#9d5d55"],
    ],
  },
];
export function contextCategory(f: CityFeature, id: ContextId): string | null {
  const p = f.properties,
    t = p.tags ?? {};
  const uses = [
    p.use,
    t["building:use"],
    t.amenity,
    t.office ? "office" : "",
    t.shop ? "retail" : "",
  ].filter(Boolean);
  const has = (values: string[]) => uses.some((v) => values.includes(v));
  if (id === "none") return "all";
  if (id === "homes")
    return has([
      "house",
      "detached",
      "semidetached_house",
      "terrace",
      "bungalow",
    ])
      ? "house"
      : has(["apartments"])
        ? "apartments"
        : has(["residential", "dormitory"])
          ? "residential"
          : null;
  if (id === "work")
    return has([
      "retail",
      "market",
      "marketplace",
      "supermarket",
      "mall",
      "shop",
    ])
      ? "retail"
      : has(["commercial", "office", "hotel"])
        ? "commercial"
        : has(["industrial", "warehouse", "factory"])
          ? "industrial"
          : null;
  if (id === "civic")
    return has(["school", "college", "university", "kindergarten"])
      ? "education"
      : has(["hospital", "clinic", "doctors"])
        ? "health"
        : has([
              "civic",
              "public",
              "government",
              "townhall",
              "library",
              "museum",
              "train_station",
              "railway_station",
              "transportation",
              "police",
              "fire_station",
            ])
          ? "civic"
          : null;
  if (id === "sacred") {
    if (
      !has([
        "mosque",
        "church",
        "temple",
        "gurudwara",
        "synagogue",
        "shrine",
        "cathedral",
        "place_of_worship",
      ])
    )
      return null;
    return ["hindu", "muslim", "sikh", "christian"].includes(t.religion)
      ? t.religion
      : "other";
  }
  if (id === "heritage")
    return t.heritage && t.heritage !== "no"
      ? "heritage"
      : t.historic && t.historic !== "no"
        ? "historic"
        : null;
  const roof = t["roof:shape"];
  return !roof
    ? null
    : roof === "flat"
      ? "flat"
      : ["gabled", "hipped", "half-hipped", "skillion"].includes(roof)
        ? "gabled"
        : ["dome", "onion"].includes(roof)
          ? "dome"
          : "other";
}
export function inPeriod(year: number | null, period: PeriodId | null) {
  if (!period) return true;
  const p = PERIODS.find((p) => p.id === period)!;
  return year !== null && year >= p.start && year <= p.end;
}
export function yearColor(year: number) {
  return PERIODS.find((p) => year <= p.end)?.color ?? PERIODS[3].color;
}
export interface DateRecord {
  id: string;
  year: number;
  color: string;
  name: string;
}
export function buildingDateRecords(
  features: CityFeature[],
  size: SizeFilter,
  context: ContextId,
  period: PeriodId | null,
): DateRecord[] {
  return features.flatMap((f) => {
    const y = buildingYear(f);
    if (
      f.properties.kind !== "building" ||
      !matchesSize(f.properties, size) ||
      !contextCategory(f, context) ||
      y === null ||
      !inPeriod(y, period)
    )
      return [];
    const cat = contextCategory(f, context);
    const color =
      CONTEXTS.find((c) => c.id === context)?.categories.find(
        (c) => c[0] === cat,
      )?.[2] ?? yearColor(y);
    return [
      {
        id: f.properties.id,
        year: y,
        color,
        name: f.properties.name || f.properties.id,
      },
    ];
  });
}
export function milestoneRecords(sites: Heritage[]): DateRecord[] {
  return sites.map((h) => ({
    id: h.id,
    year: h.year,
    color: yearColor(h.year),
    name: h.name,
  }));
}
// Aggregate by exact recorded year. Equal dates share a stacked bar; no invented dates or interpolation.
export function histogram(records: DateRecord[]) {
  const years = new Map<
    number,
    {
      year: number;
      count: number;
      segments: { color: string; count: number }[];
    }
  >();
  for (const r of records) {
    const bin = years.get(r.year) ?? { year: r.year, count: 0, segments: [] };
    bin.count++;
    const segment = bin.segments.find((s) => s.color === r.color);
    if (segment) segment.count++;
    else bin.segments.push({ color: r.color, count: 1 });
    years.set(r.year, bin);
  }
  return [...years.values()].sort((a, b) => a.year - b.year);
}
// Spend more of the playback on recent construction, while retaining a linear, scrubbable year axis.
export function advanceYear(year: number, speed: number) {
  return Math.min(
    LAST_YEAR,
    year + (year < 1800 ? 12 : year < 1947 ? 4 : 2) * speed,
  );
}
