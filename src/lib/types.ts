import type { ContextId, PeriodId, TimelineMode } from "./chronology";
import type { BuildingEvidence, buildingDate } from "./buildings";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Polygon,
  MultiPolygon,
} from "geojson";
export type Mode = "explore" | "analyse" | "compare";
export type Theme = "footprint" | "use" | "height" | "era" | "access";
export type HeritageLens = "all" | "mughal" | "sacred" | "civic" | "water";
export type SizeFilter = "all" | "small" | "medium" | "large";
export type Layers = {
  buildings: boolean;
  heritage: boolean;
  transit: boolean;
  landscape: boolean;
  streets: boolean;
};
export interface Properties {
  id: string;
  kind: string;
  name: string;
  use: string;
  road_type: string;
  rail_type: string;
  height_m: number | null;
  height_method: string;
  levels: string | null;
  start_date: string | null;
  source: string;
  source_url: string;
  snapshot: string;
  area_m2?: number;
  selected_area_m2?: number;
  center?: [number, number];
  tags?: Record<string, string>;
  surface_status?: "hard" | "soft" | "unknown";
  area_role?: string;
  name_source?: string;
  min_height_m?: number;
  timeline_date?: ReturnType<typeof buildingDate>;
  reviewed_building_evidence?: BuildingEvidence | null;
}
export type CityFeature = Feature<Geometry, Properties>;
export type CityData = FeatureCollection<Geometry, Properties>;
export type StudyArea = Feature<Polygon | MultiPolygon>;
export interface Manifest {
  id: string;
  snapshot: string;
  archive: boolean;
  bounds: [number, number, number, number];
  source_url: string;
  source_sha256: string;
  counts: Record<string, number>;
  notes: string[];
  attribution: string;
  licence: string;
  licence_url: string;
  building_attributes?: Record<string, number>;
}
export interface Heritage {
  id: string;
  name: string;
  hindi: string;
  coords: [number, number];
  year: number;
  period: string;
  type: string;
  story: string;
  source: string;
  sourceName: string;
  dateLabel: string;
  datePrecision?: "documented" | "approximate" | "milestone";
  lenses?: HeritageLens[];
  facts?: { label: string; value: string; source: number }[];
  reading?: string;
  sources?: { title: string; url: string; checked: string }[];
  photo?: {
    path: string;
    author: string;
    licence: string;
    licenceUrl: string;
    page: string;
  };
  wikidata?: string;
}
export interface Analysis {
  count: number;
  areaM2: number;
  footprintM2: number;
  coverage: number;
  knownHeightCount: number;
  estimatedHeightCount: number;
  heightMean: number | null;
  unknownHeightCount: number;
  bins: number[];
  features: CityFeature[];
  clipped: CityData;
  error?: string;
}
export interface SavedView {
  version: 1;
  dataset: string;
  theme: Theme;
  size: SizeFilter;
  layers: Layers;
  lens?: HeritageLens;
  year: number;
  timelineMode?: TimelineMode;
  context?: ContextId;
  period?: PeriodId | null;
  showUnknown?: boolean;
  research?: import("./urban").ResearchFilters;
  mode: Mode;
  area: StudyArea | null;
  areaName: string;
  comparison?: [string, string];
  camera?: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  };
}
export interface Overview {
  dataset: string;
  excluded?: string[];
  areaM2: number;
  edgeClips: Record<string, { geometry: Geometry; area: number }>;
  filters: Record<
    SizeFilter,
    Omit<Analysis, "areaM2" | "features" | "clipped">
  >;
}
