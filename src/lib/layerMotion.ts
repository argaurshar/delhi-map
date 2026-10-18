import type {
  ExpressionSpecification,
  Map as LibreMap,
  LayerSpecification,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { Layers } from "./types";

export const DROP_DURATION = 1000;
export const STAGGER = 0.24;
export type MovingLayer = Exclude<keyof Layers, "heritage">;
export function dropPhase(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++)
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1024) / 1023;
}
export function dropProgress(progress: number, phase: number): number {
  return Math.max(0, Math.min(1, (progress - phase * STAGGER) / (1 - STAGGER)));
}
export function dropOffset(
  progress: number,
  phase: number,
  distance: number,
): number {
  return distance * Math.pow(1 - dropProgress(progress, phase), 2);
}

export const COHORTS = 8;
// Fixed roof and base expressions. Uniform screen-space translation moves the
// entire 3D mass without per-vertex edits or height changes.
export function massingPaint(parts = false) {
  return {
    base: (parts
      ? ["coalesce", ["get", "min_height_m"], 0]
      : ["literal", 0]) as ExpressionSpecification,
    height: [
      "*",
      ["coalesce", ["get", "height_m"], 8],
      ["coalesce", ["feature-state", "appearance"], 1],
    ] as ExpressionSpecification,
  };
}
const groups: Record<MovingLayer, string[]> = {
  buildings: ["buildings", "buildings-flat", "building-parts"],
  landscape: ["green", "water", "trees"],
  transit: ["rail", "station"],
  streets: ["roads", "road-casing"],
};
const keys = Object.keys(groups) as MovingLayer[];
const alpha = (id: string) =>
  ["buildings", "building-parts"].includes(id)
    ? 0.96
    : ["green", "water", "buildings-flat"].includes(id)
      ? 0.85
      : id === "trees"
        ? 0.65
        : 1;
const prefix = (id: string) =>
  ["buildings", "building-parts"].includes(id)
    ? "fill-extrusion"
    : ["buildings-flat", "green", "water"].includes(id)
      ? "fill"
      : ["trees", "station"].includes(id)
        ? "circle"
        : "line";
export class LayerMotion {
  private frame = 0;
  private partsVisible = true;
  private state: Record<
    MovingLayer,
    { value: number; from: number; target: number; start: number }
  >;
  constructor(
    private map: LibreMap,
    layers: Layers,
    data: FeatureCollection,
    private instant: () => boolean,
    private report: (
      values: Record<MovingLayer, number>,
      moving: boolean,
    ) => void,
  ) {
    map.addSource("sky-city", {
      type: "geojson",
      data,
      promoteId: "id",
      tolerance: 0.3,
      maxzoom: 17,
    });
    const style = map.getStyle();
    for (const key of keys)
      for (const id of groups[key]) {
        if (id === "buildings-flat") continue;
        const original = style.layers.find((layer) => layer.id === id)!;
        for (let c = 0; c < COHORTS; c++) {
          const sky = {
            ...original,
            id: `sky-${c}-${id}`,
            source: "sky-city",
            layout: { ...original.layout, visibility: "none" },
            paint: { ...original.paint },
            filter: [
              "all",
              [
                "==",
                ["get", "kind"],
                id === "buildings"
                  ? "building"
                  : id === "building-parts"
                    ? "buildingpart"
                    : ["roads", "road-casing"].includes(id)
                      ? "road"
                      : id === "trees"
                        ? "tree"
                        : id,
              ],
              ...(id === "building-parts"
                ? [[">", ["coalesce", ["get", "height_m"], 0], 0]]
                : []),
              ["==", ["get", "motion_cohort"], c],
            ],
          } as unknown as LayerSpecification;
          if (key === "buildings") {
            const mass = massingPaint(id === "building-parts");
            Object.assign(sky.paint!, {
              "fill-extrusion-base": mass.base,
              "fill-extrusion-height": mass.height,
            });
          }
          map.addLayer(sky, id);
          for (const property of ["opacity", "translate"])
            map.setPaintProperty(
              sky.id,
              `${prefix(id)}-${property}-transition`,
              { duration: 0 },
            );
          if (prefix(id) === "circle")
            map.setPaintProperty(sky.id, "circle-stroke-opacity-transition", {
              duration: 0,
            });
          map.setPaintProperty(sky.id, `${prefix(id)}-opacity`, 0);
          map.setPaintProperty(
            sky.id,
            `${prefix(id)}-translate-anchor`,
            "viewport",
          );
          if (prefix(id) === "circle")
            map.setPaintProperty(sky.id, "circle-stroke-opacity", 0);
        }
        // The regular map remains the resting/interactive view. Sky layers only draw in flight.
        map.setPaintProperty(id, `${prefix(id)}-opacity-transition`, {
          duration: 0,
        });
        map.setLayoutProperty(id, "visibility", "visible");
      }
    this.state = Object.fromEntries(
      keys.map((key) => {
        const value = layers[key] ? 1 : 0;
        return [key, { value, from: value, target: value, start: 0 }];
      }),
    ) as typeof this.state;
    keys.forEach((key) => this.paint(key));
  }
  syncColours() {
    for (const id of ["buildings", "building-parts"])
      for (let c = 0; c < COHORTS; c++)
        this.map.setPaintProperty(
          `sky-${c}-${id}`,
          "fill-extrusion-color",
          this.map.getPaintProperty(id, "fill-extrusion-color"),
        );
  }
  syncFilter(id: string) {
    for (let c = 0; c < COHORTS; c++)
      this.map.setFilter(`sky-${c}-${id}`, [
        "all",
        (this.map.getFilter(id) ?? [
          "literal",
          true,
        ]) as ExpressionSpecification,
        ["==", ["get", "motion_cohort"], c],
      ]);
  }
  setLayers(layers: Layers) {
    const now = performance.now();
    keys.forEach((key) => {
      const s = this.state[key],
        target = layers[key] ? 1 : 0;
      if (s.target === target) return;
      if (key === "buildings") this.syncFilter("buildings");
      s.from = s.value;
      s.target = target;
      s.start = now;
    });
    this.run();
  }
  setPartsVisible(show: boolean) {
    this.partsVisible = show;
    this.paint("buildings");
  }
  replay() {
    if (!this.state.buildings.target || this.instant()) return;
    this.state.buildings.value = 0;
    this.state.buildings.target = 0;
    this.setLayers(
      Object.fromEntries(
        keys.map((key) => [
          key,
          key === "buildings" || !!this.state[key].target,
        ]),
      ) as Layers,
    );
  }
  finish() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    keys.forEach((key) => {
      this.state[key].value = this.state[key].target;
      this.paint(key);
    });
    this.notify();
  }
  destroy() {
    cancelAnimationFrame(this.frame);
  }
  private notify() {
    this.report(
      Object.fromEntries(keys.map((k) => [k, this.state[k].value])) as Record<
        MovingLayer,
        number
      >,
      keys.some((k) => this.state[k].value !== this.state[k].target),
    );
  }
  private run() {
    cancelAnimationFrame(this.frame);
    if (this.instant()) {
      this.finish();
      return;
    }
    let last = -Infinity;
    const tick = (now: number) => {
      if (now - last >= 30) {
        keys.forEach((key) => {
          const s = this.state[key];
          if (s.value === s.target) return;
          const t = Math.max(
            0,
            Math.min(
              1,
              (now - s.start) / (DROP_DURATION * Math.abs(s.target - s.from)),
            ),
          );
          s.value = t === 1 ? s.target : s.from + (s.target - s.from) * t;
          this.paint(key);
        });
        last = now;
        this.notify();
      }
      this.frame = keys.some(
        (k) => this.state[k].value !== this.state[k].target,
      )
        ? requestAnimationFrame(tick)
        : 0;
    };
    keys.forEach((key) => this.paint(key));
    this.notify();
    this.frame = requestAnimationFrame(tick);
  }
  private paint(key: MovingLayer) {
    const s = this.state[key],
      p = s.value,
      moving = p !== s.target;
    for (const id of groups[key]) {
      const allowed = id !== "building-parts" || this.partsVisible,
        type = prefix(id);
      this.map.setPaintProperty(
        id,
        `${type}-opacity`,
        !moving && p === 1 && allowed ? alpha(id) : 0,
      );
      if (type === "circle")
        this.map.setPaintProperty(
          id,
          "circle-stroke-opacity",
          !moving && p === 1 ? 1 : 0,
        );
      if (id === "buildings-flat") continue;
      for (let c = 0; c < COHORTS; c++) {
        const progress = dropProgress(p, c / (COHORTS - 1));
        this.map.setLayoutProperty(
          `sky-${c}-${id}`,
          "visibility",
          moving && allowed ? "visible" : "none",
        );
        this.map.setPaintProperty(
          `sky-${c}-${id}`,
          `${type}-opacity`,
          moving && allowed ? alpha(id) * Math.min(1, progress / 0.1) : 0,
        );
        if (type === "circle")
          this.map.setPaintProperty(
            `sky-${c}-${id}`,
            "circle-stroke-opacity",
            moving ? Math.min(1, progress / 0.1) : 0,
          );
        this.map.setPaintProperty(`sky-${c}-${id}`, `${type}-translate`, [
          0,
          -dropOffset(p, c / (COHORTS - 1), 200),
        ]);
      }
    }
  }
}

/** Individual translate leaves MapLibre's positioning transform untouched. */
export class MarkerDrop {
  private items = new Map<
    HTMLElement,
    { visible: boolean; animation?: Animation }
  >();
  constructor(private instant: () => boolean) {}
  set(el: HTMLElement, visible: boolean, id: string) {
    const previous = this.items.get(el);
    if (previous?.visible === visible) return;
    const computed = getComputedStyle(el);
    const from = {
      translate: computed.translate === "none" ? "0px 0px" : computed.translate,
      opacity: computed.opacity,
    };
    previous?.animation?.cancel();
    const item: { visible: boolean; animation?: Animation } = { visible };
    this.items.set(el, item);
    el.style.transition = "none";
    el.classList.toggle("marker-hidden", !visible);
    const finish = () => {
      el.style.translate = visible ? "0px 0px" : "0px -180px";
      el.style.opacity = visible ? "1" : "0";
      el.style.visibility = visible ? "visible" : "hidden";
      el.dataset.motion = "idle";
      item.animation?.cancel();
      item.animation = undefined;
    };
    if (!previous || this.instant()) {
      finish();
      return;
    }
    el.style.visibility = "visible";
    el.dataset.motion = visible ? "falling" : "rising";
    item.animation = el.animate(
      [
        from,
        {
          translate: visible ? "0px 0px" : "0px -180px",
          opacity: visible ? "1" : "0",
        },
      ],
      {
        duration: DROP_DURATION * (1 - STAGGER),
        delay: dropPhase(id) * DROP_DURATION * STAGGER,
        easing: visible
          ? "cubic-bezier(.2,.65,.3,1)"
          : "cubic-bezier(.65,0,.9,.4)",
        fill: "both",
      },
    );
    item.animation.onfinish = finish;
  }
  finish() {
    for (const [el, item] of this.items) {
      item.animation?.cancel();
      item.animation = undefined;
      el.style.translate = item.visible ? "0px 0px" : "0px -180px";
      el.style.opacity = item.visible ? "1" : "0";
      el.style.visibility = item.visible ? "visible" : "hidden";
      el.dataset.motion = "idle";
    }
  }
  destroy() {
    this.finish();
    this.items.clear();
  }
}
