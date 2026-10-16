import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import maplibregl, {
  type Map as LibreMap,
  type GeoJSONSource,
  type ExpressionSpecification,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { Compass, Home, Minus, Plus, Box, Map as MapIcon } from "lucide-react";
import type {
  CityData,
  CityFeature,
  Layers,
  SavedView,
  StudyArea,
  Theme,
  SizeFilter,
  HeritageLens,
} from "../lib/types";
import {
  CONTEXTS,
  PERIODS,
  contextCategory,
  inPeriod,
  type ContextId,
  type PeriodId,
  type TimelineMode,
} from "../lib/chronology";
import { buildingYear } from "../lib/buildings";
import { HERITAGE, PILOT } from "../lib/data";

export interface MapHandle {
  overview: () => void;
  cinematic: (center: [number, number], zoom?: number) => void;
  startOrbit: () => void;
  stopOrbit: () => void;
  stopMotion: () => void;
  reveal: () => void;
  flyTo: (center: [number, number], zoom?: number) => void;
  camera: () => SavedView["camera"];
  canvas: () => HTMLCanvasElement | undefined;
  project: (coords: [number, number]) => { x: number; y: number } | undefined;
}
interface Props {
  data: CityData;
  lens: HeritageLens;
  timelineMode: TimelineMode;
  context: ContextId;
  period: PeriodId | null;
  showUnknown: boolean;
  onMotionInterrupted: () => void;
  layers: Layers;
  theme: Theme;
  size: SizeFilter;
  area: StudyArea | null;
  year: number;
  selectedId: string | null;
  drawMode: "polygon" | "radius" | null;
  drawPoints: [number, number][];
  onFeature: (f: CityFeature) => void;
  onHeritage: (id: string) => void;
  onDrawPoint: (point: [number, number]) => void;
  onReady: () => void;
  initialCamera?: SavedView["camera"];
}
const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
const era: ExpressionSpecification = [
  "case",
  ["==", ["get", "recorded_year"], null],
  "#bfc4be",
  [
    "step",
    ["get", "recorded_year"],
    "#9d5d55",
    1700,
    "#c28b53",
    1947,
    "#6e9989",
    2000,
    "#6b8caf",
  ],
];
const footprint: ExpressionSpecification = [
  "step",
  ["get", "area_m2"],
  "#d6b895",
  100,
  "#bd7d62",
  500,
  "#7b9585",
  2000,
  "#607d89",
];
const usage: ExpressionSpecification = [
  "match",
  ["get", "use"],
  [
    "commercial",
    "retail",
    "market",
    "marketplace",
    "hotel",
    "supermarket",
    "mall",
  ],
  "#c89854",
  ["house", "residential", "apartments"],
  "#7b9585",
  ["mosque", "church", "temple", "gurudwara", "place_of_worship"],
  "#bd7d62",
  [
    "school",
    "college",
    "university",
    "hospital",
    "civic",
    "public",
    "train_station",
    "railway_station",
    "transportation",
  ],
  "#607d89",
  "#c9c7b9",
];
const height: ExpressionSpecification = [
  "case",
  ["==", ["get", "height_m"], null],
  "#c9c7b9",
  [
    "step",
    ["get", "height_m"],
    "#d6b895",
    10,
    "#bd7d62",
    20,
    "#7b9585",
    40,
    "#607d89",
  ],
];
export const MapView = forwardRef<MapHandle, Props>(
  function MapView(props, ref) {
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LibreMap | null>(null);
    const latest = useRef(props);
    latest.current = props;
    const [ready, setReady] = useState(false);
    const [is3d, set3d] = useState((props.initialCamera?.pitch ?? 48) > 0);
    const [error, setError] = useState("");
    const hoverId = useRef<string | null>(null);
    const previousSelection = useRef<string | null>(null);
    const colourFrame = useRef(0),
      dateFrame = useRef(0);
    const colourTarget = useRef<ExpressionSpecification>(era);
    const dated = useRef<{ id: string; year: number }[]>([]);
    const shownDates = useRef(new Set<string>());
    const temporalKey = useRef("");
    const updateLabels = useRef<() => void>(() => {});
    const orbitFrame = useRef(0),
      revealFrame = useRef(0);
    const reduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stopMotion = () => {
      cancelAnimationFrame(orbitFrame.current);
      orbitFrame.current = 0;
      mapRef.current?.stop();
    };
    const reveal = () => {
      const m = mapRef.current;
      if (!m?.getLayer("buildings")) return;
      cancelAnimationFrame(revealFrame.current);
      if (reduced()) return;
      const start = performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - start) / 1800);
        const eased = 1 - Math.pow(1 - progress, 3);
        for (const id of ["buildings", "building-parts"]) {
          m.setPaintProperty(id, "fill-extrusion-height", [
            "*",
            ["coalesce", ["get", "height_m"], 8],
            ["coalesce", ["feature-state", "appearance"], 1],
            eased,
          ]);
          if (id === "building-parts")
            m.setPaintProperty(id, "fill-extrusion-base", [
              "*",
              ["coalesce", ["get", "min_height_m"], 0],
              eased,
            ]);
        }
        if (progress < 1) revealFrame.current = requestAnimationFrame(tick);
      };
      revealFrame.current = requestAnimationFrame(tick);
    };
    const markers = useRef<{ id: string; marker: maplibregl.Marker }[]>([]);
    useImperativeHandle(ref, () => ({
      overview() {
        stopMotion();
        mapRef.current?.flyTo({
          center: [77.2275, 28.6],
          zoom: 12.4,
          pitch: 45,
          bearing: -17,
          duration: reduced() ? 0 : 1800,
          essential: false,
          padding: { left: 0, right: 0, top: 0, bottom: 80 },
        });
      },
      stopOrbit() {
        cancelAnimationFrame(orbitFrame.current);
        orbitFrame.current = 0;
      },
      stopMotion,
      reveal,
      cinematic(center, zoom = 16.5) {
        mapRef.current?.flyTo({
          center,
          zoom,
          pitch: 58,
          bearing: -28,
          duration: reduced() ? 0 : 3200,
          essential: false,
          padding:
            window.innerWidth < 900
              ? { left: 0, right: 0, top: 0, bottom: 130 }
              : { left: 290, right: 350, top: 60, bottom: 60 },
        });
      },
      startOrbit() {
        cancelAnimationFrame(orbitFrame.current);
        if (reduced()) return;
        let previous = performance.now();
        const tick = (now: number) => {
          const m = mapRef.current;
          if (!m) return;
          const dt = Math.min(now - previous, 80);
          previous = now;
          if (!m.isMoving())
            m.jumpTo({ bearing: (m.getBearing() + dt * 0.0035) % 360 });
          orbitFrame.current = requestAnimationFrame(tick);
        };
        orbitFrame.current = requestAnimationFrame(tick);
      },
      flyTo(center, zoom = 15.5) {
        mapRef.current?.flyTo({
          center,
          zoom,
          duration: reduced() ? 0 : 1200,
          essential: false,
          padding:
            window.innerWidth < 900
              ? { left: 0, right: 0, top: 0, bottom: 130 }
              : { left: 290, right: 350, top: 0, bottom: 0 },
        });
      },
      camera() {
        const m = mapRef.current;
        if (!m) return;
        return {
          center: m.getCenter().toArray() as [number, number],
          zoom: m.getZoom(),
          pitch: m.getPitch(),
          bearing: m.getBearing(),
        };
      },
      canvas() {
        return mapRef.current?.getCanvas();
      },
      project(coords) {
        return mapRef.current?.project(coords);
      },
    }));
    useEffect(() => {
      if (!container.current) return;
      const camera = latest.current.initialCamera;
      let m: LibreMap;
      try {
        m = new maplibregl.Map({
          container: container.current,
          center: camera?.center ?? [77.229, 28.644],
          zoom: camera?.zoom ?? 14.1,
          pitch: camera?.pitch ?? 48,
          bearing: camera?.bearing ?? -17,
          minZoom: 10.8,
          maxZoom: 19,
          maxBounds: [
            [77.14, 28.49],
            [77.31, 28.71],
          ],
          canvasContextAttributes: {
            antialias: true,
            preserveDrawingBuffer: true,
          },
          attributionControl: false,
          style: {
            version: 8,
            transition: { duration: 0, delay: 0 },
            sources: {},
            layers: [
              {
                id: "background",
                type: "background",
                paint: { "background-color": "#e9e6dd" },
              },
            ],
            light: {
              anchor: "viewport",
              position: [1.5, 200, 35],
              color: "#fff8e8",
              intensity: 0.4,
            },
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "WebGL is unavailable");
        return;
      }
      mapRef.current = m;
      m.on("movestart", () => {
        if (container.current) container.current.dataset.settled = "false";
      });
      m.on("idle", () => {
        if (container.current) {
          container.current.dataset.settled = "true";
          const rendered = m.getLayer("buildings")
            ? m.queryRenderedFeatures({ layers: ["buildings"] })
            : [];
          container.current.dataset.visibleBuildings = String(rendered.length);
          container.current.dataset.visibleDatedIds = JSON.stringify([
            ...new Set(
              rendered
                .filter(
                  (f) =>
                    f.properties.recorded_year !== null &&
                    f.properties.recorded_year !== undefined,
                )
                .map((f) => f.properties.id),
            ),
          ]);
        }
      });
      m.on("error", (e) => {
        console.error("Map error:", e.error.message);
        setError(e.error.message);
      });
      m.on("load", () => {
        const data = latest.current.data;
        dated.current = data.features.flatMap((f) => {
          const year = buildingYear(f);
          return f.properties.kind === "building" && year !== null
            ? [{ id: f.properties.id, year }]
            : [];
        });
        shownDates.current = new Set(dated.current.map((f) => f.id));
        const renderData: FeatureCollection = {
          type: "FeatureCollection",
          features: data.features.map((f) => ({
            type: "Feature",
            geometry: f.geometry,
            properties: {
              id: f.properties.id,
              kind: f.properties.kind,
              name: f.properties.name,
              use: f.properties.use,
              area_m2: f.properties.area_m2,
              height_m: f.properties.height_m,
              min_height_m: f.properties.min_height_m,
              road_type: f.properties.road_type,
              rail_type: f.properties.rail_type,
              recorded_year: buildingYear(f),
              ...Object.fromEntries(
                CONTEXTS.filter((c) => c.id !== "none").map((c) => [
                  `context_${c.id}`,
                  contextCategory(f, c.id),
                ]),
              ),
            },
          })),
        };
        m.addSource("city", {
          type: "geojson",
          data: renderData,
          promoteId: "id",
          tolerance: 0.3,
          maxzoom: 17,
        });
        m.addSource("pilot", { type: "geojson", data: PILOT });
        m.addSource("study", { type: "geojson", data: empty });
        m.addSource("draft", { type: "geojson", data: empty });
        m.addLayer({
          id: "pilot-fill",
          type: "fill",
          source: "pilot",
          paint: { "fill-color": "#f3f0e7" },
        });
        m.addLayer({
          id: "water",
          type: "fill",
          source: "city",
          filter: ["==", "kind", "water"],
          paint: { "fill-color": "#b7d1d0", "fill-opacity": 0.85 },
        });
        m.addLayer({
          id: "green",
          type: "fill",
          source: "city",
          filter: ["==", "kind", "green"],
          paint: {
            "fill-color": "#c6d4b5",
            "fill-opacity": 0.85,
            "fill-outline-color": "#b7c8a6",
          },
        });
        m.addLayer({
          id: "road-casing",
          type: "line",
          source: "city",
          filter: ["==", "kind", "road"],
          paint: {
            "line-color": "#d7d3c7",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              1.5,
              17,
              12,
            ],
          },
        });
        m.addLayer({
          id: "roads",
          type: "line",
          source: "city",
          filter: ["==", "kind", "road"],
          paint: {
            "line-color": "#fffdf7",
            "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.7, 17, 9],
          },
        });
        m.addLayer({
          id: "rail",
          type: "line",
          source: "city",
          filter: ["==", "kind", "rail"],
          layout: { visibility: "none" },
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "rail_type"], "subway"],
              "#b8a240",
              "#aaa59c",
            ],
            "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 16, 3],
            "line-dasharray": [2, 1],
          },
        });
        m.addLayer({
          id: "buildings-flat",
          type: "fill",
          source: "city",
          filter: ["==", "kind", "building"],
          paint: {
            "fill-color": footprint,
            "fill-opacity": 0.85,
            "fill-outline-color": "#e8e1d2",
          },
        });
        m.addLayer({
          id: "buildings",
          type: "fill-extrusion",
          source: "city",
          filter: ["==", "kind", "building"],
          paint: {
            "fill-extrusion-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#e5a83e",
              footprint,
            ],
            "fill-extrusion-height": [
              "*",
              ["coalesce", ["get", "height_m"], 8],
              ["coalesce", ["feature-state", "appearance"], 1],
            ],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.96,
            "fill-extrusion-vertical-gradient": true,
          },
        });
        m.addLayer({
          id: "building-parts",
          type: "fill-extrusion",
          source: "city",
          filter: [
            "all",
            ["==", ["get", "kind"], "buildingpart"],
            [">", ["coalesce", ["get", "height_m"], 0], 0],
          ],
          paint: {
            "fill-extrusion-color": "#b39476",
            "fill-extrusion-height": [
              "*",
              ["coalesce", ["get", "height_m"], 8],
              ["coalesce", ["feature-state", "appearance"], 1],
            ],
            "fill-extrusion-base": ["coalesce", ["get", "min_height_m"], 0],
            "fill-extrusion-opacity": 0.96,
          },
        });
        m.addLayer({
          id: "trees",
          type: "circle",
          source: "city",
          filter: ["==", "kind", "tree"],
          minzoom: 15,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              2,
              18,
              6,
            ],
            "circle-color": "#6d9479",
            "circle-opacity": 0.65,
          },
        });
        m.addLayer({
          id: "places",
          type: "circle",
          source: "city",
          filter: ["==", "kind", "place"],
          minzoom: 16,
          paint: {
            "circle-radius": 3,
            "circle-color": "#7f7770",
            "circle-stroke-color": "#fffdf7",
            "circle-stroke-width": 1,
          },
        });
        m.addLayer({
          id: "station",
          type: "circle",
          source: "city",
          filter: ["==", "kind", "station"],
          layout: { visibility: "none" },
          paint: {
            "circle-color": "#fffdf6",
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              3,
              16,
              6,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#a79131",
          },
        });
        m.addLayer({
          id: "pilot-line",
          type: "line",
          source: "pilot",
          paint: {
            "line-color": "#b1b6a7",
            "line-width": 1,
            "line-dasharray": [4, 4],
          },
        });
        m.addLayer({
          id: "study-fill",
          type: "fill",
          source: "study",
          paint: { "fill-color": "#315f52", "fill-opacity": 0.08 },
        });
        m.addLayer({
          id: "study-line",
          type: "line",
          source: "study",
          paint: {
            "line-color": "#315f52",
            "line-width": 2.5,
            "line-dasharray": [3, 2],
          },
        });
        m.addLayer({
          id: "draft-line",
          type: "line",
          source: "draft",
          paint: {
            "line-color": "#bd6d47",
            "line-width": 2,
            "line-dasharray": [3, 2],
          },
        });
        m.addLayer({
          id: "draft-points",
          type: "circle",
          source: "draft",
          filter: ["==", "$type", "Point"],
          paint: {
            "circle-color": "#bd6d47",
            "circle-radius": 5,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });
        for (const h of HERITAGE) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "heritage-marker";
          el.setAttribute("aria-label", `Explore ${h.name}`);
          el.innerHTML =
            '<span class="marker-dot"></span><span class="marker-name"></span>';
          el.querySelector(".marker-name")!.textContent = h.name;
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!latest.current.drawMode) latest.current.onHeritage(h.id);
          });
          const marker = new maplibregl.Marker({
            element: el,
            anchor: "left",
            offset: [-5, 0],
          })
            .setLngLat(h.coords)
            .addTo(m);
          markers.current.push({ id: h.id, marker });
        }
        for (const [text, coords] of [
          ["SHAHJAHANABAD", [77.227, 28.652]],
          ["CONNAUGHT PLACE", [77.219, 28.6347]],
          ["DARYAGANJ", [77.244, 28.644]],
          ["PAHARGANJ", [77.211, 28.644]],
          ["YAMUNA", [77.252, 28.665]],
        ] as [string, [number, number]][]) {
          const el = document.createElement("span");
          el.className = "place-label";
          el.textContent = text;
          new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(m);
        }
        m.addControl(
          new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }),
          "bottom-left",
        );
        const contextLabels: maplibregl.Marker[] = [];
        let labelTime = 0;
        const labels = (force = false) => {
          if (!force && performance.now() - labelTime < 1200) return;
          labelTime = performance.now();
          contextLabels.forEach((label) => label.remove());
          contextLabels.length = 0;
          if (m.getZoom() < 15.5) return;
          const names = new Set<string>();
          for (const feature of data.features) {
            const p = feature.properties;
            if (
              !p.name ||
              !p.center ||
              names.has(p.name) ||
              !["road", "place", "building"].includes(p.kind) ||
              !m.getBounds().contains(p.center)
            )
              continue;
            if (p.kind === "road" && !latest.current.layers.streets) continue;
            if (p.kind === "building") {
              const view = latest.current,
                y = buildingYear(feature);
              if (!view.layers.buildings || !inPeriod(y, view.period)) continue;
              if (
                view.timelineMode === "buildings" &&
                ((y !== null && y > view.year) ||
                  (y === null && !view.showUnknown))
              )
                continue;
            }
            names.add(p.name);
            const el = document.createElement("span");
            el.className = "context-map-label";
            el.textContent = p.name;
            contextLabels.push(
              new maplibregl.Marker({ element: el })
                .setLngLat(p.center)
                .addTo(m),
            );
            if (contextLabels.length >= 24) break;
          }
        };
        updateLabels.current = () => labels(true);
        m.on("moveend", () => labels());
        labels();
        setReady(true);
        m.once("idle", () => {
          latest.current.onReady();
          reveal();
        });
      });
      m.on("click", (e) => {
        if (latest.current.drawMode) {
          latest.current.onDrawPoint([e.lngLat.lng, e.lngLat.lat]);
          return;
        }
        if (!m.getLayer("buildings")) return;
        const features = m.queryRenderedFeatures(e.point, {
          layers: ["buildings", "buildings-flat", "station", "places"],
        });
        const id = features[0]?.properties?.id;
        const feature = latest.current.data.features.find(
          (f) => f.properties.id === id,
        );
        if (feature) latest.current.onFeature(feature);
      });
      m.on("mousemove", (e) => {
        if (latest.current.drawMode) {
          m.getCanvas().style.cursor = "crosshair";
          return;
        }
        if (!m.getLayer("buildings")) return;
        const feature = m.queryRenderedFeatures(e.point, {
          layers: ["buildings", "buildings-flat", "station", "places"],
        })[0];
        const id = feature?.properties?.id ?? null;
        if (hoverId.current !== id) {
          if (hoverId.current)
            m.setFeatureState(
              { source: "city", id: hoverId.current },
              { hover: false },
            );
          if (id) m.setFeatureState({ source: "city", id }, { hover: true });
          hoverId.current = id;
          if (container.current) container.current.dataset.hoveredId = id ?? "";
        }
        m.getCanvas().style.cursor = id ? "pointer" : "";
      });
      const clearHover = () => {
        if (hoverId.current)
          m.setFeatureState(
            { source: "city", id: hoverId.current },
            { hover: false },
          );
        hoverId.current = null;
      };
      m.getCanvas().addEventListener("mouseleave", clearHover);
      const interrupt = () => {
        stopMotion();
        latest.current.onMotionInterrupted();
      };
      m.on("mousedown", interrupt);
      m.on("touchstart", interrupt);
      m.on("wheel", interrupt);
      m.on("pitchend", () => set3d(m.getPitch() > 0));
      const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
      const finishMotion = () => {
        if (
          (!preference.matches && !document.hidden) ||
          !m.getLayer("buildings")
        )
          return;
        stopMotion();
        cancelAnimationFrame(revealFrame.current);
        cancelAnimationFrame(dateFrame.current);
        cancelAnimationFrame(colourFrame.current);
        dated.current.forEach((f) =>
          m.setFeatureState({ source: "city", id: f.id }, { appearance: 1 }),
        );
        for (const id of ["buildings", "building-parts"])
          m.setPaintProperty(id, "fill-extrusion-height", [
            "*",
            ["coalesce", ["get", "height_m"], 8],
            ["coalesce", ["feature-state", "appearance"], 1],
          ]);
        m.setPaintProperty("building-parts", "fill-extrusion-base", [
          "coalesce",
          ["get", "min_height_m"],
          0,
        ]);
        const color: ExpressionSpecification = [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#e5a83e",
          ["boolean", ["feature-state", "hover"], false],
          "#394e48",
          colourTarget.current,
        ];
        m.setPaintProperty("buildings", "fill-extrusion-color", color);
        m.setPaintProperty("buildings-flat", "fill-color", color);
      };
      preference.addEventListener("change", finishMotion);
      document.addEventListener("visibilitychange", finishMotion);
      return () => {
        preference.removeEventListener("change", finishMotion);
        document.removeEventListener("visibilitychange", finishMotion);
        cancelAnimationFrame(orbitFrame.current);
        cancelAnimationFrame(revealFrame.current);
        cancelAnimationFrame(colourFrame.current);
        cancelAnimationFrame(dateFrame.current);
        markers.current = [];
        m.remove();
        mapRef.current = null;
      };
    }, []);
    // Colour transitions run independently from date filtering and camera movement.
    useEffect(() => {
      const m = mapRef.current;
      if (!ready || !m) return;
      let base: ExpressionSpecification =
        props.theme === "era"
          ? era
          : props.theme === "footprint"
            ? footprint
            : props.theme === "use"
              ? usage
              : height;
      if (props.context !== "none") {
        const c = CONTEXTS.find((c) => c.id === props.context)!;
        base = [
          "match",
          ["coalesce", ["get", `context_${props.context}`], ""],
          ...c.categories.flatMap(([id, , color]) => [id, color]),
          "#e0dfd7",
        ] as unknown as ExpressionSpecification;
      }
      const from = colourTarget.current;
      colourTarget.current = base;
      cancelAnimationFrame(colourFrame.current);
      const paint = (color: ExpressionSpecification) => {
        const selected: ExpressionSpecification = [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#e5a83e",
          ["boolean", ["feature-state", "hover"], false],
          "#394e48",
          color,
        ];
        m.setPaintProperty("buildings", "fill-extrusion-color", selected);
        m.setPaintProperty("buildings-flat", "fill-color", selected);
        m.setPaintProperty(
          "building-parts",
          "fill-extrusion-color",
          props.context !== "none" || props.theme === "era"
            ? "#deddd5"
            : "#b39476",
        );
      };
      const start = performance.now();
      let previous = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 550);
        if (now - previous > 32 || t === 1) {
          paint(
            t === 1 ? base : ["interpolate", ["linear"], t, 0, from, 1, base],
          );
          previous = now;
        }
        if (t < 1) colourFrame.current = requestAnimationFrame(tick);
      };
      if (reduced()) paint(base);
      else colourFrame.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(colourFrame.current);
    }, [ready, props.theme, props.context]);
    useEffect(() => {
      const m = mapRef.current;
      if (!ready || !m) return;
      const visibility = (ids: string[], show: boolean) =>
        ids.forEach((id) =>
          m.setLayoutProperty(id, "visibility", show ? "visible" : "none"),
        );
      visibility(["buildings", "buildings-flat"], props.layers.buildings);
      // Parts have no reliable parent/date association, so exclude them from isolated chronological views.
      visibility(
        ["building-parts"],
        props.layers.buildings &&
          props.context === "none" &&
          props.period === null &&
          (props.timelineMode !== "buildings" ||
            (props.year === 2026 && props.showUnknown)),
      );
      visibility(["water", "green", "trees"], props.layers.landscape);
      visibility(["rail", "station"], props.layers.transit);
      visibility(["roads", "road-casing"], props.layers.streets);
    }, [
      ready,
      props.layers,
      props.context,
      props.period,
      props.timelineMode,
      props.year === 2026,
      props.showUnknown,
    ]);
    useEffect(() => {
      const m = mapRef.current;
      if (!ready || !m) return;
      const cutoff = props.timelineMode === "buildings" ? props.year : 2026;
      const eligible = dated.current.filter(
        (f) => f.year <= cutoff && inPeriod(f.year, props.period),
      );
      const key = JSON.stringify([
        eligible.map((f) => f.id),
        props.size,
        props.period,
        props.showUnknown,
        props.timelineMode,
      ]);
      if (container.current) {
        container.current.dataset.chronologyYear = String(props.year);
        container.current.dataset.context = props.context;
      }
      if (key === temporalKey.current) return;
      temporalKey.current = key;
      if (container.current) container.current.dataset.settled = "false";
      const conditions: ["all", ...ExpressionSpecification[]] = [
        "all",
        ["==", ["get", "kind"], "building"],
      ];
      if (props.size === "small")
        conditions.push(["<", ["get", "area_m2"], 100]);
      if (props.size === "medium")
        conditions.push(
          [">=", ["get", "area_m2"], 100],
          ["<", ["get", "area_m2"], 500],
        );
      if (props.size === "large")
        conditions.push([">=", ["get", "area_m2"], 500]);
      if (props.timelineMode === "buildings") {
        const dates: ["any", ...ExpressionSpecification[]] = [
          "any",
          [
            "all",
            ["!=", ["get", "recorded_year"], null],
            ["<=", ["get", "recorded_year"], cutoff],
          ],
        ];
        if (props.showUnknown && !props.period)
          dates.push(["==", ["get", "recorded_year"], null]);
        conditions.push(dates);
      }
      if (props.period) {
        const period = PERIODS.find((p) => p.id === props.period)!;
        conditions.push(
          ["!=", ["get", "recorded_year"], null],
          [">=", ["get", "recorded_year"], period.start],
          ["<=", ["get", "recorded_year"], period.end],
        );
      }
      const newly = eligible.filter((f) => !shownDates.current.has(f.id));
      cancelAnimationFrame(dateFrame.current);
      // Finish interrupted reveals before beginning another cohort.
      dated.current.forEach((f) =>
        m.setFeatureState({ source: "city", id: f.id }, { appearance: 1 }),
      );
      if (!reduced())
        newly.forEach((f) =>
          m.setFeatureState({ source: "city", id: f.id }, { appearance: 0 }),
        );
      m.setFilter("buildings", conditions);
      m.setFilter("buildings-flat", conditions);
      updateLabels.current();
      shownDates.current = new Set(eligible.map((f) => f.id));
      if (newly.length && !reduced()) {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 650),
            appearance = 1 - Math.pow(1 - t, 3);
          newly.forEach((f) =>
            m.setFeatureState({ source: "city", id: f.id }, { appearance }),
          );
          if (t < 1) dateFrame.current = requestAnimationFrame(tick);
        };
        dateFrame.current = requestAnimationFrame(tick);
      }
    }, [
      ready,
      props.year,
      props.timelineMode,
      props.period,
      props.showUnknown,
      props.size,
      props.context,
    ]);
    useEffect(() => {
      const m = mapRef.current;
      if (!ready || !m) return;
      if (previousSelection.current)
        m.setFeatureState(
          { source: "city", id: previousSelection.current },
          { selected: false },
        );
      if (props.selectedId)
        m.setFeatureState(
          { source: "city", id: props.selectedId },
          { selected: true },
        );
      previousSelection.current = props.selectedId;
    }, [ready, props.selectedId]);
    useEffect(() => {
      const m = mapRef.current;
      if (!ready || !m) return;
      (m.getSource("study") as GeoJSONSource).setData(props.area ?? empty);
    }, [ready, props.area]);
    useEffect(() => {
      const m = mapRef.current;
      if (!ready || !m) return;
      const draft: FeatureCollection = {
        type: "FeatureCollection",
        features: props.drawPoints.map((p) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: p },
        })),
      };
      if (props.drawPoints.length > 1)
        draft.features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: props.drawPoints },
        });
      (m.getSource("draft") as GeoJSONSource).setData(draft);
      m.getCanvas().style.cursor = props.drawMode ? "crosshair" : "";
    }, [ready, props.drawMode, props.drawPoints]);
    useEffect(() => {
      markers.current.forEach(({ id, marker }) => {
        const h = HERITAGE.find((h) => h.id === id)!;
        const visible =
          props.layers.heritage &&
          (props.timelineMode !== "heritage" || h.year <= props.year) &&
          (props.lens === "all" || h.lenses?.includes(props.lens));
        const el = marker.getElement();
        el.classList.toggle("marker-hidden", !visible);
        el.setAttribute("aria-hidden", String(!visible));
        el.tabIndex = visible ? 0 : -1;
        el.classList.toggle("active", props.selectedId === id);
        el.style.setProperty(
          "--era-color",
          h.year < 1700
            ? "#9d5d55"
            : h.year < 1947
              ? "#c28b53"
              : h.year < 2000
                ? "#6e9989"
                : "#6b8caf",
        );
        el.style.pointerEvents = !visible || props.drawMode ? "none" : "";
      });
    }, [
      ready,
      props.layers.heritage,
      props.timelineMode,
      props.year,
      props.lens,
      props.selectedId,
      props.drawMode,
    ]);
    return (
      <>
        <div
          className={`map-canvas ${props.drawMode ? "drawing" : ""}`}
          ref={container}
          data-testid="map"
        />
        {error && (
          <div className="map-error" role="alert">
            <strong>Map rendering is unavailable</strong>
            <p>{error}</p>
            <p>
              Use a browser with WebGL enabled. The building table and exports
              remain available.
            </p>
          </div>
        )}
        <div
          className="map-controls"
          aria-label="Map navigation"
          onClickCapture={() => {
            stopMotion();
            latest.current.onMotionInterrupted();
          }}
        >
          <button
            title="Reset view"
            aria-label="Reset view"
            onClick={() =>
              mapRef.current?.flyTo({
                center: [77.229, 28.644],
                zoom: 14.1,
                pitch: 48,
                bearing: -17,
                duration: reduced() ? 0 : 1200,
              })
            }
          >
            <Home size={17} />
          </button>
          <button
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() =>
              mapRef.current?.zoomIn({ duration: reduced() ? 0 : 400 })
            }
          >
            <Plus size={18} />
          </button>
          <button
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() =>
              mapRef.current?.zoomOut({ duration: reduced() ? 0 : 400 })
            }
          >
            <Minus size={18} />
          </button>
          <button
            title="Reset north"
            aria-label="Reset north"
            onClick={() =>
              mapRef.current?.rotateTo(0, { duration: reduced() ? 0 : 500 })
            }
          >
            <Compass size={18} />
          </button>
          <button
            className={is3d ? "control-active" : ""}
            title={is3d ? "Switch to 2D" : "Switch to 3D"}
            aria-label={is3d ? "Switch to 2D" : "Switch to 3D"}
            onClick={() =>
              mapRef.current?.easeTo({
                pitch: is3d ? 0 : 55,
                duration: reduced() ? 0 : 500,
              })
            }
          >
            {is3d ? <Box size={18} /> : <MapIcon size={18} />}
            <small>{is3d ? "3D" : "2D"}</small>
          </button>
        </div>
      </>
    );
  },
);
