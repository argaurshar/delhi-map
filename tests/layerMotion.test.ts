import { afterEach, describe, expect, it, vi } from "vitest";
import { createExpression } from "@maplibre/maplibre-gl-style-spec";
import type { Map as LibreMap } from "maplibre-gl";
import {
  DROP_DURATION,
  fallOffset,
  IMPACT,
  LayerMotion,
  dropOffset,
  dropPhase,
  dropProgress,
  massingPaint,
} from "../src/lib/layerMotion";
import { DEFAULT_LAYERS } from "../src/lib/data";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("Staggered layer drop", () => {
  it("starts every cohort within 240ms and lands within a second with downward acceleration and a small rebound", () => {
    expect(DROP_DURATION).toBe(1000);
    const phases = Array.from({ length: 100 }, (_, i) => dropPhase(`way/${i}`));
    expect(new Set(phases).size).toBeGreaterThan(10);
    for (const phase of phases) {
      expect(dropOffset(0, phase, 200)).toBe(200);
      expect(dropOffset(1, phase, 200)).toBe(0);
      expect(dropProgress(0.25, phase)).toBeGreaterThan(0);

      for (let t = 0; t <= 100; t++) {
        const offset = dropOffset(t / 100, phase, 200);
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(200);
      }
    }
    const first = fallOffset(0, 1000) - fallOffset(0.2, 1000);
    const next = fallOffset(0.2, 1000) - fallOffset(0.4, 1000);
    expect(next).toBeGreaterThan(first * 2);
    expect(fallOffset(IMPACT, 1000)).toBeCloseTo(0);
    expect(fallOffset((IMPACT + 1) / 2, 1000)).toBeCloseTo(25);
    expect(fallOffset(1, 1000)).toBe(0);
    expect(dropOffset(0.5, 0, 200)).not.toBe(dropOffset(0.5, 1, 200));
  });
  it("retains recorded roof/base heights while whole masses translate", () => {
    for (const parts of [false, true]) {
      const paint = massingPaint(parts),
        base = createExpression(paint.base),
        roof = createExpression(paint.height);
      if (base.result !== "success" || roof.result !== "success")
        throw Error("Invalid MapLibre paint");
      const feature = {
        type: 3 as const,
        properties: { height_m: 30, min_height_m: 10 },
      };
      const bottom = base.value.evaluate({ zoom: 16 }, feature, {
          appearance: 1,
        }),
        top = roof.value.evaluate({ zoom: 16 }, feature, { appearance: 1 });
      expect(top).toBe(30);
      expect(bottom).toBe(parts ? 10 : 0);
      expect(top - bottom).toBe(parts ? 20 : 30);
    }
  });
  it("reverses continuously, disables resting sky layers and avoids per-feature updates or height rebuilds", () => {
    let now = 0,
      id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.set(++id, cb);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (frame: number) =>
      frames.delete(frame),
    );
    const frame = (time: number) => {
      now = time;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((cb) => cb(now));
    };
    const tick = (time: number) => {
      while (now < time) frame(Math.min(time, now + 16));
    };
    const paint = vi.fn(),
      state = vi.fn(),
      visibility = vi.fn();
    const map = {
      getCanvas: () => ({ clientHeight: 900 }),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      setFilter: vi.fn(),
      getFilter: () => null,
      getPaintProperty: () => "#bfc4be",
      getStyle: () => ({
        layers: [
          "buildings",
          "buildings-flat",
          "building-parts",
          "green",
          "water",
          "trees",
          "rail",
          "station",
          "roads",
          "road-casing",
        ].map((id) => ({ id, type: "fill", source: "city", paint: {} })),
      }),
      setPaintProperty: paint,
      setLayoutProperty: visibility,
      setFeatureState: state,
    } as unknown as LibreMap;
    let instant = false;
    const motion = new LayerMotion(
      map,
      DEFAULT_LAYERS,
      { type: "FeatureCollection", features: [] },
      () => instant,
      () => {},
    );
    paint.mockClear();
    motion.setLayers({ ...DEFAULT_LAYERS, buildings: false });
    tick(350);
    const translation = () =>
      paint.mock.calls
        .filter(
          ([layer, name]) =>
            layer === "sky-0-buildings" && name === "fill-extrusion-translate",
        )
        .at(-1)![2][1];
    const raised = translation();
    expect(raised).toBeLessThan(0);
    motion.setLayers(DEFAULT_LAYERS);
    expect(translation()).toBe(raised);
    tick(700);
    expect(translation()).toBeCloseTo(0);
    expect(state).not.toHaveBeenCalled();
    expect(
      paint.mock.calls.some(([, name]) =>
        ["fill-extrusion-base", "fill-extrusion-height"].includes(name),
      ),
    ).toBe(false);
    motion.setLayers({ ...DEFAULT_LAYERS, buildings: false });
    instant = true;
    motion.finish();
    for (const layer of ["buildings", "sky-0-buildings"])
      expect(
        paint.mock.calls
          .filter(
            ([id, name]) => id === layer && name === "fill-extrusion-opacity",
          )
          .at(-1)![2],
      ).toBe(0);
    expect(
      visibility.mock.calls.filter(([id]) => id === "sky-0-buildings").at(-1),
    ).toEqual(["sky-0-buildings", "visibility", "none"]);
    expect(frames.size).toBe(0);
    instant = false;
    motion.setLayers(DEFAULT_LAYERS);
    expect(translation()).toBeLessThan(-900);
    frame(5000);
    expect(translation()).toBeLessThan(-900);
    tick(5300);
    expect(translation()).toBeGreaterThan(-900);
    expect(translation()).toBeLessThan(0);
    motion.finish();
    expect(translation()).toBeCloseTo(0);
    expect(frames.size).toBe(0);
    motion.destroy();
  });
});
