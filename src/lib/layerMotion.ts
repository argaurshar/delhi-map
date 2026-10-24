import type {
  ExpressionSpecification,
  Map as LibreMap,
  LayerSpecification,
} from "maplibre-gl";
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
  return fallOffset(dropProgress(progress, phase), distance);
}

// Constant acceleration until impact, then one small ballistic rebound.
// The mass never passes below its real footprint or changes its thickness.
export const IMPACT = 0.78;
export function fallOffset(progress: number, distance: number): number {
  const t = Math.max(0, Math.min(1, progress));
  if (t <= IMPACT) return distance * (1 - (t / IMPACT) ** 2);
  const bounce = (t - IMPACT) / (1 - IMPACT);
  return distance * 0.025 * 4 * bounce * (1 - bounce);
}

// Four stagger groups retain every feature while halving animated draw buckets.
export const COHORTS = 4;
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
  landscape: ["green", "water", "paved", "trees"],
  transit: ["rail", "station"],
  streets: ["roads", "road-casing"],
};
const keys = Object.keys(groups) as MovingLayer[];
const alpha = (id: string) =>
  ["buildings", "building-parts"].includes(id)
    ? 0.96
    : ["green", "water", "paved", "buildings-flat"].includes(id)
      ? 0.85
      : id === "trees"
        ? 0.65
        : 1;
const prefix = (id: string) =>
  ["buildings", "building-parts"].includes(id)
    ? "fill-extrusion"
    : ["buildings-flat", "green", "water", "paved"].includes(id)
      ? "fill"
      : ["trees", "station"].includes(id)
        ? "circle"
        : "line";
export class LayerMotion {
  private frame = 0;
  private partsVisible = true;
  private fullResolution: number | null = null;
  private restoreResolution() {
    if (this.fullResolution === null) return;
    this.map.setPixelRatio(this.fullResolution);
    this.fullResolution = null;
  }
  private adaptResolution(elapsed: number) {
    if (elapsed < 140 || this.fullResolution !== null) return;
    // The CSS viewport and geometry stay unchanged. Only a slow moving
    // canvas uses fewer pixels; the settled map and exports regain full detail.
    this.fullResolution = this.map.getPixelRatio();
    this.map.setPixelRatio(Math.min(1, this.fullResolution * 0.7));
  }
  private painted = new Map<string, unknown>();
  private visibility = new Map<string, string>();
  private paintProperty(id: string, property: string, value: unknown) {
    const key = `${id}:${property}`;
    const previous = this.painted.get(key);
    if (
      previous === value ||
      (Array.isArray(previous) &&
        Array.isArray(value) &&
        previous.length === value.length &&
        previous.every((v, i) => v === value[i]))
    )
      return;
    this.painted.set(key, value);
    this.map.setPaintProperty(id, property, value);
  }
  private show(id: string, visible: boolean) {
    const value = visible ? "visible" : "none";
    if (this.visibility.get(id) === value) return;
    this.visibility.set(id, value);
    this.map.setLayoutProperty(id, "visibility", value);
  }
  private state: Record<
    MovingLayer,
    {
      value: number;
      from: number;
      target: number;
      start: number;
      distance: number;
      offsets: number[];
      origins: number[];
      stagger: boolean;
    }
  >;
  constructor(
    private map: LibreMap,
    layers: Layers,
    private instant: () => boolean,
    private report: (
      values: Record<MovingLayer, number>,
      moving: boolean,
    ) => void,
  ) {
    // Resting and moving layers share geometry and feature state. A second
    // complete city source doubled JSON transfer, indexing and tile storage.
    const style = map.getStyle();
    for (const key of keys)
      for (const id of groups[key]) {
        if (id === "buildings-flat") continue;
        const original = style.layers.find((layer) => layer.id === id)!;
        for (let c = 0; c < COHORTS; c++) {
          const sky = {
            ...original,
            id: `sky-${c}-${id}`,
            source: "city",
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
        const distance = this.skyDistance();
        const offsets = Array(COHORTS).fill(value ? 0 : distance) as number[];
        return [
          key,
          {
            value,
            from: value,
            target: value,
            start: 0,
            distance,
            offsets,
            origins: [...offsets],
            stagger: true,
          },
        ];
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
      s.stagger = s.value === s.target;
      if (s.stagger) {
        s.distance = this.skyDistance();
        s.offsets.fill(s.value ? 0 : s.distance);
      }
      s.origins = [...s.offsets];
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
    this.restoreResolution();
  }
  private notify() {
    if (!keys.some((k) => this.state[k].value !== this.state[k].target))
      this.restoreResolution();
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
          // Keep a slow render from swallowing the entire fall. Normal frame
          // cadence still completes in one second; stalled devices retain motion.
          this.adaptResolution(now - s.start);
          const step = Math.max(0, Math.min(64, now - s.start)) / DROP_DURATION;
          s.start = now;
          s.value =
            s.target > s.value
              ? Math.min(s.target, s.value + step)
              : Math.max(s.target, s.value - step);
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
  private skyDistance() {
    return Math.max(
      480,
      Math.min(1400, this.map.getCanvas().clientHeight + 120),
    );
  }
  private paint(key: MovingLayer) {
    const s = this.state[key],
      p = s.value,
      moving = p !== s.target;
    const elapsed = moving ? Math.abs((p - s.from) / (s.target - s.from)) : 1;
    for (let c = 0; c < COHORTS; c++) {
      const local = s.stagger
        ? dropProgress(elapsed, c / (COHORTS - 1))
        : elapsed;
      s.offsets[c] = !moving
        ? s.target
          ? 0
          : s.distance
        : s.target
          ? fallOffset(local, s.origins[c])
          : s.origins[c] + (s.distance - s.origins[c]) * local ** 2;
    }
    for (const id of groups[key]) {
      const allowed = id !== "building-parts" || this.partsVisible,
        type = prefix(id);
      this.paintProperty(
        id,
        `${type}-opacity`,
        !moving && p === 1 && allowed ? alpha(id) : 0,
      );
      if (type === "circle")
        this.paintProperty(
          id,
          "circle-stroke-opacity",
          !moving && p === 1 ? 1 : 0,
        );
      if (id === "buildings-flat") continue;
      for (let c = 0; c < COHORTS; c++) {
        // Do not spend a draw pass on cohorts still above the visible canvas.
        const inView = s.offsets[c] < this.map.getCanvas().clientHeight;
        this.show(`sky-${c}-${id}`, moving && allowed);
        this.paintProperty(
          `sky-${c}-${id}`,
          `${type}-opacity`,
          moving && allowed && inView ? alpha(id) : 0,
        );
        if (type === "circle")
          this.paintProperty(
            `sky-${c}-${id}`,
            "circle-stroke-opacity",
            moving && inView ? 1 : 0,
          );
        this.paintProperty(`sky-${c}-${id}`, `${type}-translate`, [
          0,
          -s.offsets[c],
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
    const interrupted = !!previous?.animation;
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
    const distance = Math.max(480, Math.min(1400, innerHeight + 120));
    const fromY = interrupted
      ? Number.parseFloat(from.translate.split(" ")[1] || "0")
      : visible
        ? -distance
        : 0;
    const frames = Array.from({ length: 61 }, (_, i) => {
      const t = i / 60;
      const y = visible
        ? -fallOffset(t, -fromY)
        : fromY + (-distance - fromY) * t ** 2;
      return { offset: t, translate: `0px ${y}px`, opacity: "1" };
    });
    item.animation = el.animate(frames, {
      duration: DROP_DURATION * (1 - STAGGER),
      delay: interrupted ? 0 : dropPhase(id) * DROP_DURATION * STAGGER,
      easing: "linear",
      fill: "both",
    });
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
