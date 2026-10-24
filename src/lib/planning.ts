import type { CityFeature } from "./types";
import { accessCategory, featureName, featureAddress } from "./urban";

export interface PlanningSource {
  id: string;
  title: string;
  authority: string;
  url: string;
  status:
    | "Authority portal"
    | "Acts & rules"
    | "Listed in Parliament directory"
    | "Draft directory";
  availability: "verified" | "unavailable";
  checked: string;
  scope: string;
  note: string;
}
const checked = "2026-10-24";
const nma = "https://www.nma.gov.in/";
export const PLANNING_SOURCES: PlanningSource[] = [
  {
    id: "dda-plans",
    title: "Delhi master & zonal development plans",
    authority: "Delhi Development Authority",
    url: "https://dda.gov.in/",
    status: "Authority portal",
    availability: "unavailable",
    checked,
    scope: "Delhi planning documents",
    note: "DDA returned HTTP 503 when checked. Confirm the currently notified master plan, amendments and applicable zonal plan on the authority portal. MPD 2041 adoption was not verified.",
  },
  {
    id: "asi-monuments",
    title: "Protected monuments: scope of the AMASR Act",
    authority: "Archaeological Survey of India",
    url: "https://asi.nic.in/pages/Monuments",
    status: "Acts & rules",
    availability: "verified",
    checked,
    scope: "Centrally protected monuments and sites",
    note: "ASI explains the general 100 m prohibited and further 200 m regulated areas. Use the notified protected boundary and applicable rules; a point marker or building centroid is not that boundary.",
  },
  {
    id: "nma-rules",
    title: "AMASR Act, authority rules and amendments",
    authority: "National Monuments Authority",
    url: nma + "show_content.php?lang=1&level=1&ls_id=51&lid=2&nma_type=0",
    status: "Acts & rules",
    availability: "verified",
    checked,
    scope: "Heritage-related construction permissions",
    note: "Official directory of the Act, NMA rules, competent-authority rules and notifications. Review the relevant instrument and amendments for the site.",
  },
  {
    id: "nma-laid",
    title: "Heritage bye-laws laid in Parliament",
    authority: "National Monuments Authority",
    url: nma + "show_content.php?lang=1&level=1&ls_id=62&lid=54&nma_type=0",
    status: "Listed in Parliament directory",
    availability: "verified",
    checked,
    scope: "Monument-specific heritage documents",
    note: "The directory includes Delhi monuments such as Purana Qila, Nizamuddin Basti, Jahaz Mahal and Chor Minar. Listing here does not assign a legal designation to any Delhi Atlas footprint.",
  },
  {
    id: "purana-qila-bylaws",
    title: "Purana Qila: heritage bye-laws",
    authority: "National Monuments Authority",
    url: nma + "showfile.php?lang=1&level=2&ls_id=78&lid=65&nma_type=0",
    status: "Listed in Parliament directory",
    availability: "verified",
    checked,
    scope: "Purana Qila and the area defined in its document",
    note: "Linked from the NMA Parliament directory, which shows a portal update of 22 August 2023. Consult the document's boundary maps and provisions; no parcel overlay is supplied here.",
  },
  {
    id: "humayun-bylaws",
    title: "Humayun’s Tomb, Sunder Nursery & Batashewala: bye-laws",
    authority: "National Monuments Authority",
    url: nma + "showfile.php?lang=1&level=2&ls_id=76&lid=67&nma_type=0",
    status: "Listed in Parliament directory",
    availability: "verified",
    checked,
    scope: "The monument group and the area defined in its document",
    note: "Linked from the NMA Parliament directory, which shows a portal update of 22 August 2023. The monument group covers multiple structures and must not be treated as one building.",
  },
  {
    id: "nma-drafts",
    title: "Draft heritage bye-laws",
    authority: "National Monuments Authority",
    url: nma + "show_content.php?lang=1&level=1&ls_id=1016&lid=18&nma_type=0",
    status: "Draft directory",
    availability: "verified",
    checked,
    scope: "Drafts published for consultation",
    note: "Drafts are displayed separately from the Parliament directory. A consultation document must not be presented as an adopted control.",
  },
];

export const SPACE_ROLES = [
  { id: "all", label: "All mapped spaces" },
  { id: "green", label: "Parks & green spaces" },
  { id: "water", label: "Water bodies" },
  { id: "parking", label: "Parking areas" },
  { id: "pedestrian_area", label: "Pedestrian areas" },
  { id: "road_area", label: "Mapped road areas" },
  { id: "square", label: "Squares" },
] as const;
export interface SpaceFilters {
  role: string;
  surface: string;
  access: string;
  query: string;
}
export const DEFAULT_SPACE_FILTERS: SpaceFilters = {
  role: "all",
  surface: "all",
  access: "all",
  query: "",
};
export function isMappedSpace(f: CityFeature): boolean {
  return (
    ["green", "water", "paved"].includes(f.properties.kind) &&
    ["Polygon", "MultiPolygon"].includes(f.geometry.type)
  );
}
export function spaceRole(f: CityFeature): string {
  return f.properties.kind === "paved"
    ? (f.properties.area_role ?? "paved")
    : f.properties.kind;
}
export function spaceRoleLabel(f: CityFeature): string {
  return SPACE_ROLES.find((r) => r.id === spaceRole(f))?.label ?? "Mapped area";
}
const hard = new Set([
  "paved",
  "asphalt",
  "concrete",
  "concrete:plates",
  "concrete:lanes",
  "paving_stones",
  "sett",
  "unhewn_cobblestone",
  "cobblestone",
  "metal",
  "wood",
  "tiles",
  "bricks",
]);
const soft = new Set([
  "unpaved",
  "gravel",
  "fine_gravel",
  "compacted",
  "pebblestone",
  "ground",
  "dirt",
  "earth",
  "grass",
  "grass_paver",
  "sand",
  "mud",
  "clay",
  "woodchips",
]);
export function spaceSurface(f: CityFeature): "hard" | "soft" | "unknown" {
  const raw = f.properties.tags?.surface?.trim().toLowerCase();
  // A park, square or parking tag alone says nothing about its paving.
  return raw && hard.has(raw)
    ? "hard"
    : raw && soft.has(raw)
      ? "soft"
      : "unknown";
}
export function matchesSpace(f: CityFeature, filters: SpaceFilters): boolean {
  if (!isMappedSpace(f)) return false;
  if (filters.role !== "all" && spaceRole(f) !== filters.role) return false;
  if (filters.surface !== "all" && spaceSurface(f) !== filters.surface)
    return false;
  if (filters.access !== "all" && accessCategory(f) !== filters.access)
    return false;
  const query = filters.query.trim().toLocaleLowerCase();
  return (
    !query ||
    [featureName(f), featureAddress(f), f.properties.id].some((v) =>
      v?.toLocaleLowerCase().includes(query),
    )
  );
}
export function spaceCoverage(features: CityFeature[]) {
  const spaces = features.filter(isMappedSpace);
  return {
    total: spaces.length,
    named: spaces.filter(featureName).length,
    accessKnown: spaces.filter((f) => accessCategory(f) !== "unknown").length,
    surfaceKnown: spaces.filter((f) => spaceSurface(f) !== "unknown").length,
  };
}
export function spacesCsv(features: CityFeature[]): string {
  const quote = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows = features
    .filter(isMappedSpace)
    .map((f) => [
      f.properties.id,
      featureName(f),
      spaceRole(f),
      f.properties.tags?.surface,
      spaceSurface(f),
      f.properties.tags?.access,
      accessCategory(f),
      f.properties.tags?.["access:conditional"],
      f.properties.tags?.ownership,
      f.properties.tags?.owner,
      f.properties.tags?.opening_hours,
      featureAddress(f),
      f.properties.snapshot,
      f.properties.source_url,
    ]);
  return [
    [
      "id",
      "recorded_name",
      "mapped_role",
      "recorded_surface",
      "surface_class",
      "recorded_access",
      "access_class",
      "access_conditions",
      "recorded_ownership",
      "recorded_owner",
      "opening_hours",
      "address",
      "snapshot",
      "source_url",
    ],
    ...rows,
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
