import { buildingYear } from "./buildings";
import type { CityFeature } from "./types";

export const USE_CATEGORIES = [
  { id: "residential", label: "Homes", color: "#ffb84d" },
  { id: "retail", label: "Shops & food", color: "#ff638d" },
  { id: "office", label: "Offices", color: "#579bff" },
  { id: "industry", label: "Industry & storage", color: "#bb77ff" },
  { id: "education", label: "Education", color: "#ffe35e" },
  { id: "health", label: "Health", color: "#ff7566" },
  { id: "civic", label: "Civic & culture", color: "#36d4d0" },
  { id: "worship", label: "Worship", color: "#f6a4ff" },
  { id: "hospitality", label: "Hotels & stays", color: "#8ce979" },
  { id: "other", label: "Other / mixed use", color: "#b7c966" },
  { id: "unknown", label: "Use not recorded", color: "#c9a7ed" },
] as const;

type UseCategory = (typeof USE_CATEGORIES)[number]["id"];

const useGroups: Record<Exclude<UseCategory, "other" | "unknown">, string[]> = {
  residential: [
    "residential",
    "apartments",
    "house",
    "detached",
    "semidetached_house",
    "terrace",
    "bungalow",
    "dormitory",
    "static_caravan",
    "cabin",
    "hut",
  ],
  retail: [
    "retail",
    "shop",
    "supermarket",
    "kiosk",
    "mall",
    "marketplace",
    "restaurant",
    "fast_food",
    "cafe",
    "food_court",
    "bar",
    "pub",
    "bank",
  ],
  office: ["office", "offices"],
  industry: [
    "industrial",
    "industry",
    "factory",
    "warehouse",
    "storage",
    "depot",
    "workshop",
  ],
  education: [
    "education",
    "school",
    "college",
    "university",
    "kindergarten",
    "research_institute",
    "training",
  ],
  health: [
    "hospital",
    "clinic",
    "healthcare",
    "doctors",
    "dentist",
    "pharmacy",
    "nursing_home",
  ],
  civic: [
    "government",
    "public",
    "public_building",
    "civic",
    "townhall",
    "courthouse",
    "police",
    "fire_station",
    "library",
    "community_centre",
    "social_centre",
    "arts_centre",
    "museum",
    "gallery",
    "theatre",
    "cinema",
    "post_office",
    "diplomatic",
  ],
  worship: [
    "place_of_worship",
    "religious",
    "temple",
    "mosque",
    "church",
    "cathedral",
    "chapel",
    "synagogue",
    "shrine",
    "gurudwara",
    "gurdwara",
    "monastery",
  ],
  hospitality: [
    "hotel",
    "hostel",
    "guest_house",
    "motel",
    "resort",
    "aparthotel",
  ],
};
const uses = new Map<string, UseCategory>(
  Object.entries(useGroups).flatMap(([category, values]) =>
    values.map((value) => [value, category as UseCategory]),
  ),
);
const missing = new Set([
  "",
  "yes",
  "no",
  "unknown",
  "unclassified",
  "unspecified",
]);

// A building type is a fallback, not evidence that a current occupant has that use.
// No classification is inferred from names, nearby landmarks or neighbourhoods.
function classify(raw: string | undefined, field?: string): UseCategory | null {
  if (!raw?.trim()) return null;
  const values = raw
    .toLowerCase()
    .split(";")
    .map((v) => v.trim());
  const categories = values
    .map((value): UseCategory | null => {
      if (value === "no" || !value) return null;
      if (field === "shop") return "retail";
      if (field === "office")
        return value === "government" ? "civic" : "office";
      if (missing.has(value)) return null;
      return uses.get(value) ?? "other";
    })
    .filter((v): v is UseCategory => v !== null);
  if (!categories.length) return null;
  return new Set(categories).size === 1 ? categories[0] : "other";
}

export function useCategory(f: CityFeature): UseCategory {
  const p = f.properties;
  const tags = p.tags ?? {};
  return (
    classify(tags["building:use"]) ??
    classify(tags.amenity) ??
    classify(tags.shop, "shop") ??
    classify(tags.office, "office") ??
    classify(tags.tourism) ??
    classify(p.use) ??
    classify(tags.building) ??
    "unknown"
  );
}

export function useDefinition(f: CityFeature) {
  const id = useCategory(f);
  return USE_CATEGORIES.find((entry) => entry.id === id)!;
}

function recordedText(value?: string): string | null {
  const text = value?.trim();
  if (
    !text ||
    missing.has(text.toLowerCase()) ||
    /^(unnamed|everyday building)$/i.test(text)
  )
    return null;
  return text;
}

export function featureName(f: CityFeature): string | null {
  const p = f.properties;
  for (const value of [
    p.name,
    p.tags?.["name:en"],
    p.tags?.name,
    p.tags?.official_name,
    p.tags?.["name:hi"],
  ]) {
    const name = recordedText(value);
    if (name) return name;
  }
  return null;
}

export function featureTitle(f: CityFeature): string {
  return featureName(f) ?? "Name not recorded";
}

export function featureAddress(f: CityFeature): string {
  const tags = f.properties.tags ?? {};
  const full = recordedText(tags["addr:full"]);
  if (full) return full;
  const street = [
    tags["addr:housenumber"],
    tags["addr:street"] ?? tags["addr:place"],
  ]
    .map((value) => recordedText(value))
    .filter(Boolean)
    .join(" ");
  return [
    ...new Set(
      [
        street,
        tags["addr:suburb"],
        tags["addr:city"],
        tags["addr:state"],
        tags["addr:postcode"],
        tags["addr:country"],
      ]
        .map((value) => recordedText(value))
        .filter(Boolean),
    ),
  ].join(", ");
}

export const ACCESS_CATEGORIES = [
  { id: "public", label: "Public access", color: "#4fe6b0" },
  { id: "private", label: "Private access", color: "#ff8fc7" },
  { id: "restricted", label: "Restricted access", color: "#ffc15d" },
  { id: "unknown", label: "Access not recorded", color: "#bca7f4" },
] as const;
type AccessCategory = (typeof ACCESS_CATEGORIES)[number]["id"];

export function accessCategory(f: CityFeature): AccessCategory {
  const access = f.properties.tags?.access?.trim().toLowerCase();
  if (["yes", "public", "permissive"].includes(access ?? "")) return "public";
  if (access === "private") return "private";
  if (
    [
      "restricted",
      "customers",
      "destination",
      "permit",
      "members",
      "no",
    ].includes(access ?? "")
  )
    return "restricted";
  return "unknown";
}

export function accessDefinition(f: CityFeature) {
  const id = accessCategory(f);
  return ACCESS_CATEGORIES.find((entry) => entry.id === id)!;
}

export interface ResearchFilters {
  use: string;
  access: string;
  yearFrom: number;
}

export const DEFAULT_RESEARCH_FILTERS: ResearchFilters = {
  use: "all",
  access: "all",
  yearFrom: 1190,
};

export function matchesResearch(
  f: CityFeature,
  filters: ResearchFilters,
): boolean {
  if (filters.access !== "all" && accessCategory(f) !== filters.access)
    return false;
  if (
    !["building", "buildingpart", "building_part"].includes(f.properties.kind)
  )
    return true;
  if (filters.use !== "all" && useCategory(f) !== filters.use) return false;
  const year = buildingYear(f);
  return year === null || year >= filters.yearFrom;
}
