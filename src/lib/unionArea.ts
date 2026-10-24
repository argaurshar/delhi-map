import area from "@turf/area";
import bbox from "@turf/bbox";
import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon } from "geojson";

type Outline = Feature<Polygon | MultiPolygon>;
/** Exact coverage without sending an entire city's disconnected rings to one
 * polygon-clipping sweep. Disjoint bounding-box components cannot share area,
 * so their exact unions can be summed. Holes and overlaps remain intact. */
export function unionArea(polygons: Outline[]): number {
  if (!polygons.length) return 0;
  const boxes = polygons
    .map((p, id) => ({ id, bounds: bbox(p, { recompute: true }) }))
    .sort((a, b) => a.bounds[0] - b.bounds[0]);
  const parents = polygons.map((_, i) => i);
  const root = (id: number): number => {
    while (parents[id] !== id) {
      parents[id] = parents[parents[id]];
      id = parents[id];
    }
    return id;
  };
  let active: typeof boxes = [];
  for (const current of boxes) {
    active = active.filter((p) => p.bounds[2] >= current.bounds[0]);
    for (const other of active) {
      if (
        other.bounds[1] <= current.bounds[3] &&
        other.bounds[3] >= current.bounds[1]
      ) {
        const a = root(current.id),
          b = root(other.id);
        if (a !== b) parents[a] = b;
      }
    }
    active.push(current);
  }
  const components = new Map<number, Outline[]>();
  polygons.forEach((polygon, i) => {
    const id = root(i),
      group = components.get(id);
    if (group) group.push(polygon);
    else components.set(id, [polygon]);
  });
  let total = 0;
  for (const group of components.values()) {
    const merged =
      group.length === 1 ? group[0] : union(featureCollection(group));
    if (merged) total += area(merged);
  }
  return total;
}
