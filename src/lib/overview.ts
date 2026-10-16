import { matchesSize } from "./data";
import type { Analysis, CityData, Overview, SizeFilter } from "./types";
export function overviewResult(
  data: CityData,
  overview: Overview,
  size: SizeFilter,
): Analysis {
  const excluded = new Set(overview.excluded ?? []);
  const features = data.features
    .filter(
      (f) =>
        f.properties.kind === "building" &&
        !excluded.has(f.properties.id) &&
        matchesSize(f.properties, size),
    )
    .map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        selected_area_m2:
          Math.round(
            (overview.edgeClips[f.properties.id]?.area ??
              f.properties.area_m2 ??
              0) * 100,
          ) / 100,
      },
    }));
  if (features.length !== overview.filters[size].count)
    throw new Error(
      "Overview does not match the building snapshot. Refresh the dataset.",
    );
  return {
    ...overview.filters[size],
    areaM2: overview.areaM2,
    features,
    clipped: {
      type: "FeatureCollection",
      features: features.map((f) => ({
        ...f,
        geometry: overview.edgeClips[f.properties.id]?.geometry ?? f.geometry,
      })),
    },
  };
}
