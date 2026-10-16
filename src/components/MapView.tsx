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
  type FilterSpecification,
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
import { recordedYear } from "../lib/buildings";
import { HERITAGE, PILOT } from "../lib/data";

export interface MapHandle {
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
        m.setPaintProperty("buildings", "fill-extrusion-height", [
          "*",
          ["coalesce", ["get", "height_m"], 8],
          eased,
        ]);
        if (progress < 1) revealFrame.current = requestAnimationFrame(tick);
      };
      revealFrame.current = requestAnimationFrame(tick);
    };
    const markers = useRef<{ id: string; marker: maplibregl.Marker }[]>([]);
    useImperativeHandle(ref, () => ({
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
          container.current.dataset.visibleBuildings = String(
            m.getLayer("buildings")
              ? m.queryRenderedFeatures({ layers: ["buildings"] }).length
              : 0,
          );
        }
      });
      m.on("error", (e) => {
        console.error("Map error:", e.error.message);
        setError(e.error.message);
      });
      m.on("load", () => {
        const data = latest.current.data;
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
              recorded_year: recordedYear(f.properties.start_date),
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
            "fill-extrusion-height": ["coalesce", ["get", "height_m"], 8],
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
            "fill-extrusion-height": ["coalesce", ["get", "height_m"], 8],
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
        const labels = () => {
          if (performance.now() - labelTime < 1200) return;
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
            if (p.kind === "building" && !latest.current.layers.buildings)
              continue;
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
        m.on("moveend", labels);
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
        m.getCanvas().style.cursor = m.queryRenderedFeatures(e.point, {
          layers: ["buildings", "buildings-flat", "station", "places"],
        }).length
          ? "pointer"
          : "";
      });
      const interrupt = () => {
        stopMotion();
        latest.current.onMotionInterrupted();
      };
      m.on("mousedown", interrupt);
      m.on("touchstart", interrupt);
      m.on("wheel", interrupt);
      m.on("pitchend", () => set3d(m.getPitch() > 0));
      return () => {
        cancelAnimationFrame(orbitFrame.current);
        cancelAnimationFrame(revealFrame.current);
        markers.current = [];
        m.remove();
        mapRef.current = null;
      };
    }, []);
    useEffect(() => {
      const m = mapRef.current;
      if (!ready || !m) return;
      const {
        layers,
        theme,
        size,
        area,
        year,
        selectedId,
        drawMode,
        drawPoints,
      } = props;
      const visibility = (ids: string[], show: boolean) =>
        ids.forEach((id) =>
          m.setLayoutProperty(id, "visibility", show ? "visible" : "none"),
        );
      visibility(
        ["buildings", "buildings-flat", "building-parts"],
        layers.buildings,
      );
      visibility(["water", "green", "trees"], layers.landscape);
      visibility(["rail", "station"], layers.transit);
      visibility(["roads", "road-casing"], layers.streets);
      const colour =
        theme === "era"
          ? era
          : theme === "footprint"
            ? footprint
            : theme === "use"
              ? usage
              : height;
      m.setPaintProperty("buildings", "fill-extrusion-color", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#e5a83e",
        colour,
      ]);
      m.setPaintProperty("buildings-flat", "fill-color", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#e5a83e",
        colour,
      ]);
      const conditions: FilterSpecification = [
        "all",
        ["==", "kind", "building"],
      ];
      if (size === "small") conditions.push(["<", "area_m2", 100]);
      if (size === "medium")
        conditions.push([">=", "area_m2", 100], ["<", "area_m2", 500]);
      if (size === "large") conditions.push([">=", "area_m2", 500]);
      m.setFilter("buildings", conditions);
      m.setFilter("buildings-flat", conditions);
      m.removeFeatureState({ source: "city" });
      if (selectedId)
        m.setFeatureState(
          { source: "city", id: selectedId },
          { selected: true },
        );
      (m.getSource("study") as GeoJSONSource).setData(area ?? empty);
      const draft: FeatureCollection = {
        type: "FeatureCollection",
        features: drawPoints.map((p) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: p },
        })),
      };
      if (drawPoints.length > 1)
        draft.features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: drawPoints },
        });
      (m.getSource("draft") as GeoJSONSource).setData(draft);
      m.getCanvas().style.cursor = drawMode ? "crosshair" : "";
      markers.current.forEach(({ id, marker }) => {
        const h = HERITAGE.find((h) => h.id === id)!;
        marker.getElement().style.display =
          layers.heritage &&
          h.year <= year &&
          (props.lens === "all" || h.lenses?.includes(props.lens))
            ? ""
            : "none";
        marker.getElement().classList.toggle("active", selectedId === id);
        marker
          .getElement()
          .style.setProperty(
            "--era-color",
            h.year < 1700
              ? "#9d5d55"
              : h.year < 1947
                ? "#c28b53"
                : h.year < 2000
                  ? "#6e9989"
                  : "#6b8caf",
          );
        marker.getElement().style.pointerEvents = drawMode ? "none" : "";
      });
    }, [ready, props]);
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
        <div className="map-controls" aria-label="Map navigation">
          <button
            title="Reset view"
            aria-label="Reset view"
            onClick={() =>
              mapRef.current?.flyTo({
                center: [77.229, 28.644],
                zoom: 14.1,
                pitch: 48,
                bearing: -17,
              })
            }
          >
            <Home size={17} />
          </button>
          <button
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn()}
          >
            <Plus size={18} />
          </button>
          <button
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut()}
          >
            <Minus size={18} />
          </button>
          <button
            title="Reset north"
            aria-label="Reset north"
            onClick={() => mapRef.current?.rotateTo(0)}
          >
            <Compass size={18} />
          </button>
          <button
            className={is3d ? "control-active" : ""}
            title={is3d ? "Switch to 2D" : "Switch to 3D"}
            aria-label={is3d ? "Switch to 2D" : "Switch to 3D"}
            onClick={() =>
              mapRef.current?.easeTo({ pitch: is3d ? 0 : 55, duration: 500 })
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
