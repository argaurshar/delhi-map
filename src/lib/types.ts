import type {
  Feature,
  FeatureCollection,
  Geometry,
  Polygon,
  MultiPolygon,
} from "geojson";
export type Mode = "explore" | "analyse" | "compare";
export type Theme = "footprint" | "use" | "height";
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
  year: number;
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
