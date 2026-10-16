import landmarks from "./landmarks.json";
import type {
  Heritage,
  StudyArea,
  Layers,
  Properties,
  SizeFilter,
} from "./types";
export const DEFAULT_LAYERS: Layers = {
  buildings: true,
  heritage: true,
  transit: false,
  landscape: true,
  streets: true,
};
export const BOUNDS: [number, number, number, number] = [
  77.17, 28.515, 77.285, 28.68,
];
export const rectangle = (b: number[]): StudyArea => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [b[0], b[1]],
        [b[2], b[1]],
        [b[2], b[3]],
        [b[0], b[3]],
        [b[0], b[1]],
      ],
    ],
  },
});
export const PILOT = rectangle(BOUNDS);
export const AREAS = [
  {
    id: "pilot",
    name: "Whole pilot",
    subtitle: "Central Delhi",
    coords: [77.2268, 28.648] as [number, number],
    zoom: 13.7,
    area: PILOT,
  },
  {
    id: "old-delhi",
    name: "Shahjahanabad",
    subtitle: "Old Delhi study window",
    coords: [77.2318, 28.6524] as [number, number],
    zoom: 15.0,
    area: rectangle([77.216, 28.645, 77.246, 28.6615]),
  },
  {
    id: "connaught",
    name: "Connaught Place",
    subtitle: "Central Delhi study window",
    coords: [77.2185, 28.6328] as [number, number],
    zoom: 15.5,
    area: rectangle([77.209, 28.625, 77.23, 28.64]),
  },
];
export const HERITAGE: Heritage[] = landmarks as Heritage[];
export const matchesSize = (p: Properties, size: SizeFilter) =>
  size === "all" ||
  (size === "small"
    ? (p.area_m2 ?? 0) < 100
    : size === "medium"
      ? (p.area_m2 ?? 0) >= 100 && (p.area_m2 ?? 0) < 500
      : (p.area_m2 ?? 0) >= 500);
export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(n);
