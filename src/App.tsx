import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileJson,
  Focus,
  Landmark,
  Layers3,
  Leaf,
  LoaderCircle,
  MapPin,
  MousePointer2,
  MoveUpRight,
  Ruler,
  Search,
  Share2,
  SlidersHorizontal,
  SquareDashedMousePointer,
  Table2,
  TrainFront,
  Upload,
  X,
  Route,
  Undo2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import turfArea from "@turf/area";
import bbox from "@turf/bbox";
import circle from "@turf/circle";
import { MapView, type MapHandle } from "./components/MapView";
import { Chronology } from "./components/Chronology";
import { ContextPanel } from "./components/ContextPanel";
import {
  CONTEXTS,
  advanceYear,
  buildingDateRecords,
  contextCategory,
  milestoneRecords,
  PERIODS,
  FIRST_YEAR,
  LAST_YEAR,
  type ContextId,
  type PeriodId,
  type TimelineMode,
} from "./lib/chronology";
import {
  buildingDate,
  buildingYear,
  withBuildingEvidence,
} from "./lib/buildings";
import { CinematicControls } from "./components/CinematicControls";
import { HeritagePhoto, HeritageDetails } from "./components/HeritageProfile";
import { BuildingProfile } from "./components/BuildingProfile";
import { loadCity } from "./lib/loadData";
import { centerOf } from "./lib/buildings";
import { Modal } from "./components/Modal";
import {
  AREAS,
  DEFAULT_LAYERS,
  HERITAGE,
  PILOT,
  formatNumber as fmt,
  matchesSize,
} from "./lib/data";
import { useAnalysis } from "./lib/useAnalysis";
import { toCsv } from "./lib/analysis";
import { download, parseSavedView, validateArea } from "./lib/state";
import type {
  Analysis,
  CityData,
  CityFeature,
  Heritage,
  HeritageLens,
  Overview,
  Layers,
  Manifest,
  Mode,
  SavedView,
  SizeFilter,
  StudyArea,
  Theme,
} from "./lib/types";
const initial = parseSavedView(window.location.hash);
const colours = ["#d6b895", "#bd7d62", "#7b9585", "#607d89"];
const labels = ["Under 100 m²", "100–500 m²", "500–2,000 m²", "Over 2,000 m²"];
function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}
function Summary({
  result,
  busy,
  error,
}: {
  result: Analysis | null;
  busy: boolean;
  error: string;
}) {
  if (busy)
    return (
      <div className="calculating">
        <LoaderCircle size={17} className="spin" /> Calculating from the full
        dataset…
      </div>
    );
  if (error)
    return (
      <p role="alert" className="error-text">
        {error}
      </p>
    );
  if (!result) return null;
  return (
    <>
      <div className="metrics">
        <Metric label="Mapped buildings" value={fmt(result.count)} />
        <Metric
          label="Footprint coverage"
          value={fmt(result.coverage, 1)}
          unit="%"
        />
        <Metric
          label="Study extent"
          value={fmt(result.areaM2 / 1e6, 2)}
          unit="km²"
        />
        <Metric
          label="Recorded / estimated height"
          value={fmt(result.knownHeightCount)}
        />
      </div>
      <p className="micro-note">
        Coverage uses the union of recorded footprints clipped to this study
        extent, including water. Incomplete mapping is not empty land.
      </p>
    </>
  );
}
export default function App() {
  const [data, setData] = useState<CityData | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "explore");
  const [layers, setLayers] = useState<Layers>(
    initial?.layers ?? DEFAULT_LAYERS,
  );
  const [theme, setTheme] = useState<Theme>(initial?.theme ?? "era");
  const [size, setSize] = useState<SizeFilter>(initial?.size ?? "all");
  const [area, setArea] = useState<StudyArea | null>(initial?.area ?? null);
  const [areaName, setAreaName] = useState(initial?.areaName ?? "Whole pilot");
  const [selected, setSelected] = useState<CityFeature | Heritage | null>(null);
  const [year, setYear] = useState(initial?.year ?? 2026);
  const [lens, setLens] = useState<HeritageLens>(initial?.lens ?? "all");
  const [motionInterrupt, setMotionInterrupt] = useState(0);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(
    initial?.timelineMode ?? "buildings",
  );
  const [context, setContext] = useState<ContextId>(initial?.context ?? "none");
  const [period, setPeriod] = useState<PeriodId | null>(
    initial?.period ?? null,
  );
  const [showUnknown, setShowUnknown] = useState(initial?.showUnknown ?? true);
  const [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const sizeFeatures = useMemo(
    () =>
      data?.features.filter(
        (f) =>
          f.properties.kind === "building" && matchesSize(f.properties, size),
      ) ?? [],
    [data, size],
  );
  const datedRecords = useMemo(
    () => buildingDateRecords(sizeFeatures, "all", context, period),
    [sizeFeatures, context, period],
  );
  const siteRecords = useMemo(
    () =>
      milestoneRecords(
        HERITAGE.filter((h) => lens === "all" || h.lenses?.includes(lens)),
      ),
    [lens],
  );
  const dateCoverage = useMemo(() => {
    const matched = sizeFeatures.filter((f) => contextCategory(f, context));
    return {
      total: matched.length,
      unknown: matched.filter((f) => buildingYear(f) === null).length,
    };
  }, [sizeFeatures, context]);
  const periodCounts = useMemo(
    () =>
      PERIODS.map(
        (p) => buildingDateRecords(sizeFeatures, "all", "none", p.id).length,
      ),
    [sizeFeatures],
  );
  const [modal, setModal] = useState<
    "sources" | "export" | "table" | "share" | null
  >(null);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [drawMode, setDrawMode] = useState<"polygon" | "radius" | null>(null);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [radius, setRadius] = useState(500);
  const [mapReady, setMapReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(window.innerWidth >= 900);
  const [exportBusy, setExportBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const [tablePage, setTablePage] = useState(0);
  const [compareIds, setCompareIds] = useState<[string, string]>(
    initial?.comparison ?? ["old-delhi", "connaught"],
  );
  const map = useRef<MapHandle>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const searchBox = useRef<HTMLDivElement>(null);
  const closeModal = useCallback(() => setModal(null), []);
  const study = area ?? PILOT;
  const analysis = useAnalysis(
    data,
    study,
    size,
    !!data && !!overview,
    area === null ? overview : null,
  );
  const comparisonA = AREAS.find((a) => a.id === compareIds[0])!;
  const comparisonB = AREAS.find((a) => a.id === compareIds[1])!;
  const compareA = useAnalysis(
    data,
    comparisonA.area,
    size,
    mode === "compare",
  );
  const compareB = useAnalysis(
    data,
    comparisonB.area,
    size,
    mode === "compare",
  );
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      loadCity(controller.signal),
      fetch(`${import.meta.env.BASE_URL}data/overview.json`, {
        signal: controller.signal,
      }).then((r) => {
        if (!r.ok) throw new Error("The analysis overview is unavailable.");
        return r.json();
      }),
      fetch(`${import.meta.env.BASE_URL}data/manifest.json`, {
        signal: controller.signal,
      }).then((r) => {
        if (!r.ok) throw new Error("The dataset manifest is unavailable.");
        return r.json();
      }),
    ])
      .then(([city, summary, meta]: [CityData, Overview, Manifest]) => {
        if (summary.dataset !== meta.id)
          throw new Error(
            "Dataset versions differ. Refresh to load the latest map.",
          );
        setOverview(summary);
        city.features.forEach((f) => {
          if (f.properties.kind === "building") {
            f.properties.area_m2 = turfArea(f);
            f.bbox = bbox(f);
          }
        });
        setData(city);
        setManifest(meta);
        if (initial && initial.dataset !== meta.id)
          notify(
            "This saved view used a different dataset. Results now use the available snapshot.",
          );
        else if (window.location.hash && !initial)
          notify(
            "The saved view was invalid. Loaded the default pilot instead.",
          );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoadError(e.message);
      });
    return () => controller.abort();
  }, [notify]);
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setInterval(
      () => setYear((y) => advanceYear(y, speed)),
      100,
    );
    return () => clearInterval(timer);
  }, [playing, speed, reduced]);
  useEffect(() => {
    if (year >= LAST_YEAR) setPlaying(false);
  }, [year]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    preference.addEventListener("change", change);
    document.addEventListener("visibilitychange", hide);
    return () => {
      preference.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (modal || drawMode) setPlaying(false);
  }, [modal, drawMode]);
  function changeYear(value: number) {
    setMotionInterrupt((i) => i + 1);
    setPlaying(false);
    setYear(value);
    setSelected(null);
  }
  function changeTimeline(value: TimelineMode) {
    setMotionInterrupt((i) => i + 1);
    setPlaying(false);
    setYear(LAST_YEAR);
    setSelected(null);
    setTimelineMode(value);
    if (value === "buildings") {
      setTheme("era");
      setLayers((l) => ({ ...l, buildings: true }));
    } else {
      setPeriod(null);
      setLayers((l) => ({ ...l, heritage: true }));
    }
  }
  function changeContext(value: ContextId) {
    setMotionInterrupt((i) => i + 1);
    setPlaying(false);
    setYear(LAST_YEAR);
    setSelected(null);
    setContext(value);
    setPeriod(null);
    setTimelineMode("buildings");
    setLayers((l) => ({ ...l, buildings: true }));
    if (value !== "none") map.current?.overview();
  }
  function playChronology(replay = false) {
    setMotionInterrupt((i) => i + 1);
    setSelected(null);
    if (replay || !playing) {
      if (replay || year >= LAST_YEAR) setYear(FIRST_YEAR);
      setLayers((l) => ({
        ...l,
        [timelineMode === "buildings" ? "buildings" : "heritage"]: true,
      }));
      if (timelineMode === "buildings") setTheme("era");
      map.current?.overview();
      setPlaying(true);
    } else setPlaying(false);
  }
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) {
        setMotionInterrupt((i) => i + 1);
        setPlaying(false);
        setSearching(false);
        setDrawMode(null);
        setDrawPoints([]);
        setSelected(null);
      }
    };
    const outside = (e: PointerEvent) => {
      if (searchBox.current && !searchBox.current.contains(e.target as Node))
        setSearching(false);
    };
    document.addEventListener("keydown", handle);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", handle);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  useEffect(() => {
    setTablePage(0);
  }, [tableQuery, analysis.result]);
  const visibleCount = useMemo(
    () =>
      data?.features.filter(
        (f) =>
          f.properties.kind === "building" && matchesSize(f.properties, size),
      ).length ?? 0,
    [data, size],
  );
  const heightCount = useMemo(
    () =>
      data?.features.filter(
        (f) =>
          f.properties.kind === "building" && f.properties.height_m !== null,
      ).length ?? 0,
    [data],
  );
  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    const landmarks = HERITAGE.filter(
      (h) => h.name.toLowerCase().includes(q) || h.hindi.includes(q),
    ).map((h) => ({ id: h.id, name: h.name, sub: h.type, item: h }));
    const buildings =
      data?.features
        .filter(
          (f) =>
            ["building", "station", "place"].includes(f.properties.kind) &&
            ((!!f.properties.name &&
              f.properties.name.toLowerCase().includes(q)) ||
              (!!q && f.properties.id.includes(q))),
        )
        .slice(0, 8)
        .map((f) => ({
          id: f.properties.id,
          name: f.properties.name || `Building ${f.properties.id}`,
          sub:
            f.properties.kind === "station"
              ? "Station record · OSM"
              : f.properties.kind === "place"
                ? "Place · OSM"
                : "Building · OSM",
          item: f,
        })) ?? [];
    return [...landmarks, ...buildings].slice(0, 8);
  }, [query, data]);
  const tableRows = useMemo(
    () =>
      analysis.result?.features.filter((f) =>
        (f.properties.name + " " + f.properties.id)
          .toLowerCase()
          .includes(tableQuery.toLowerCase()),
      ) ?? [],
    [analysis.result, tableQuery],
  );
  const heritageSelection = selected && "story" in selected ? selected : null;
  const featureSelection =
    selected && "properties" in selected ? selected : null;
  function selectHeritage(id: string, fromTour = false) {
    setPlaying(false);
    if (fromTour) {
      setTimelineMode("heritage");
      setContext("none");
      setPeriod(null);
    }
    if (!fromTour) setMotionInterrupt((i) => i + 1);
    if (window.innerWidth < 900) setPanelOpen(false);
    const h = HERITAGE.find((h) => h.id === id)!;
    setLens("all");
    setSelected(h);
    setLayers((l) => ({ ...l, heritage: true }));
    setPeriod(null);
    setShowUnknown(true);
    setYear((y) =>
      fromTour
        ? h.year
        : timelineMode === "buildings"
          ? LAST_YEAR
          : Math.max(y, h.year),
    );
    map.current?.flyTo(h.coords, 16.1);
    setQuery("");
    setSearching(false);
  }
  function selectFeature(feature: CityFeature, fly = false) {
    setPlaying(false);
    const date = buildingYear(feature);
    if (date !== null) setYear((y) => Math.max(y, date));
    if (fly) {
      setPeriod(null);
      setShowUnknown(true);
      setContext("none");
    }
    if (window.innerWidth < 900) setPanelOpen(false);
    setMotionInterrupt((i) => i + 1);
    setSelected(feature);
    setSearching(false);
    setQuery("");
    if (
      feature.properties.kind === "building" &&
      !matchesSize(feature.properties, size)
    ) {
      setSize("all");
      notify("Footprint filter reset to show the selected building.");
    }
    setLayers((l) => ({
      ...l,
      buildings: feature.properties.kind === "building" ? true : l.buildings,
      transit: feature.properties.kind === "station" ? true : l.transit,
    }));
    if (fly) map.current?.flyTo(centerOf(feature), 17);
  }
  function chooseArea(id: string) {
    setMotionInterrupt((i) => i + 1);
    const a = AREAS.find((a) => a.id === id)!;
    setArea(id === "pilot" ? null : a.area);
    setAreaName(a.name);
    setSelected(null);
    map.current?.flyTo(a.coords, a.zoom);
  }
  function applyArea(input: unknown, name: string) {
    try {
      setArea(validateArea(input));
      setAreaName(name);
      setSelected(null);
      setMode("analyse");
      setDrawMode(null);
      setDrawPoints([]);
      notify(
        "Study boundary applied. Analysis is clipped to the pilot coverage.",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Invalid boundary.");
    }
  }
  function onDrawPoint(p: [number, number]) {
    if (drawMode === "radius")
      applyArea(
        circle(p, radius / 1000, { steps: 64, units: "kilometers" }),
        `${radius} m radius`,
      );
    else if (drawPoints.length >= 99)
      notify("Use at most 100 points when drawing.");
    else setDrawPoints((points) => [...points, p]);
  }
  function finishDrawing() {
    if (drawPoints.length < 3) {
      notify("Add at least three corners.");
      return;
    }
    applyArea(
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[...drawPoints, drawPoints[0]]],
        },
      },
      "Drawn study area",
    );
  }
  function share() {
    if (!manifest) return;
    const view: SavedView = {
      version: 1,
      dataset: manifest.id,
      theme,
      size,
      layers,
      lens,
      year,
      timelineMode,
      context,
      period,
      showUnknown,
      mode,
      area,
      areaName,
      comparison: compareIds,
      camera: map.current?.camera(),
    };
    const url = new URL(window.location.href);
    url.hash = new URLSearchParams({ view: JSON.stringify(view) }).toString();
    window.history.replaceState(null, "", url);
    setShareUrl(url.toString());
    setModal("share");
  }
  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("View link copied.");
    } catch {
      notify("Clipboard unavailable. Select and copy the link below.");
    }
  }
  async function exportData(kind: "csv" | "geojson" | "png" | "brief") {
    if (!analysis.result || !manifest) return;
    setExportBusy(true);
    try {
      const filename = `delhi-atlas-${areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${manifest.snapshot.slice(0, 10)}`;
      if (kind === "csv")
        download(
          new Blob(["\ufeff" + toCsv(analysis.result, manifest.id, areaName)], {
            type: "text/csv;charset=utf-8",
          }),
          filename + ".csv",
        );
      if (kind === "geojson")
        download(
          new Blob(
            [
              JSON.stringify(
                {
                  ...analysis.result.clipped,
                  features:
                    analysis.result.clipped.features.map(withBuildingEvidence),
                  metadata: {
                    dataset: manifest.id,
                    study_area: study,
                    study_name: areaName,
                    footprint_filter: size,
                    source: manifest.source_url,
                    licence: manifest.licence,
                    attribution: manifest.attribution,
                    notes: manifest.notes,
                  },
                },
                null,
                2,
              ),
            ],
            { type: "application/geo+json" },
          ),
          filename + ".geojson",
        );
      if (kind === "brief") {
        const r = analysis.result;
        const text = `# Delhi Atlas — ${areaName}\n\nDataset: ${manifest.id}\nSource: ${manifest.source_url}\nAttribution: ${manifest.attribution}; ${manifest.licence}\nFootprint filter: ${size}\n\n- Mapped buildings intersecting study: ${r.count}\n- Study extent inside pilot: ${fmt(r.areaM2, 2)} m²\n- Unioned footprint area inside study: ${fmt(r.footprintM2, 2)} m²\n- Footprint coverage of study extent (including water): ${fmt(r.coverage, 2)}%\n- Buildings with a recorded or estimated height: ${r.knownHeightCount} (${r.estimatedHeightCount} estimated from levels)\n- Buildings with unknown height: ${r.unknownHeightCount}\n\nThis is an incomplete OpenStreetMap snapshot, not a cadastral or measured building survey. Coverage is not FAR. Unknown heights use uniform 8 m display only; they are excluded from height statistics. Study windows are not administrative boundaries.\n\n## Reproduce\n\nUse the exported study boundary, same dataset and filter. The GeoJSON export contains clipped footprints; the CSV includes full and clipped areas.\n\nStudy boundary (WGS 84):\n\n\`\`\`json\n${JSON.stringify(study)}\n\`\`\`\n`;
        download(
          new Blob([text], { type: "text/markdown" }),
          filename + "-brief.md",
        );
      }
      if (kind === "png") {
        const source = map.current?.canvas();
        if (!source) throw new Error("The map is not ready yet.");
        const canvas = document.createElement("canvas");
        const ratio = source.width / source.clientWidth;
        const exportScale = Math.max(1, 1000 / source.clientWidth);
        const exportWidth = source.clientWidth * exportScale;
        const exportHeight = source.clientHeight * exportScale;
        canvas.width = Math.round(exportWidth * ratio);
        canvas.height = Math.round((exportHeight + 180) * ratio);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#f7f5ef";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(ratio, ratio);
        ctx.drawImage(source, 0, 0, exportWidth, exportHeight);
        if (layers.heritage)
          for (const h of HERITAGE.filter(
            (h) =>
              (timelineMode !== "heritage" || h.year <= year) &&
              (lens === "all" || h.lenses?.includes(lens)),
          )) {
            const p = map.current?.project(h.coords);
            if (!p) continue;
            ctx.beginPath();
            ctx.arc(p.x * exportScale, p.y * exportScale, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#a85436";
            ctx.fill();
            ctx.font = "11px Inter";
            ctx.fillText(h.name, p.x * exportScale + 8, p.y * exportScale + 3);
          }
        const y = exportHeight;
        ctx.fillStyle = "#243c35";
        ctx.font = "600 20px Inter";
        ctx.fillText(`Delhi Atlas · ${areaName}`, 24, y + 32);
        ctx.font = "12px Inter";
        ctx.fillText(
          `OSM ${manifest.snapshot.slice(0, 10)} · ${fmt(analysis.result.count)} buildings in study · Filter: ${size} · Colour: ${theme}`,
          24,
          y + 58,
        );
        ctx.fillText(
          `© OpenStreetMap contributors · ODbL 1.0 · OSM / incomplete coverage · Unknown heights: 8 m display only`,
          24,
          y + 80,
        );
        ctx.fillText(
          `${map.current?.camera()?.pitch ? "3D perspective — no uniform scale" : "2D map"} · ${timelineMode === "buildings" ? "Recorded building dates" : "Site milestones"} through ${year} · Context: ${context} · Period: ${period ?? "all"} · Undated: ${showUnknown ? "shown" : "hidden"}`,
          24,
          y + 102,
        );
        const activeContext = CONTEXTS.find((c) => c.id === context)!;
        const legend =
          context !== "none"
            ? [...activeContext.categories.map((c) => c[1]), "Other buildings"]
            : theme === "footprint"
              ? labels
              : theme === "use"
                ? [
                    "Commercial",
                    "Residential",
                    "Religious",
                    "Institutional / transit",
                    "Unknown / other",
                  ]
                : theme === "era"
                  ? [
                      "Before 1700",
                      "1700–1946",
                      "1947–1999",
                      "2000 onward",
                      "Unrecorded date",
                    ]
                  : [
                      "Under 10 m",
                      "10–20 m",
                      "20–40 m",
                      "Over 40 m",
                      "Unknown",
                    ];
        const exportColours =
          context !== "none"
            ? [...activeContext.categories.map((c) => c[2]), "#e0dfd7"]
            : theme === "use"
              ? ["#c89854", "#7b9585", "#bd7d62", "#607d89", "#c9c7b9"]
              : theme === "era"
                ? ["#9d5d55", "#c28b53", "#6e9989", "#6b8caf", "#bfc4be"]
                : [...colours, "#c9c7b9"];
        legend.forEach((l, i) => {
          ctx.fillStyle = exportColours[i];
          ctx.fillRect(
            24 + (i % 3) * 175,
            y + 118 + Math.floor(i / 3) * 20,
            10,
            10,
          );
          ctx.fillStyle = "#243c35";
          ctx.font = "11px Inter";
          ctx.fillText(l, 40 + (i % 3) * 175, y + 127 + Math.floor(i / 3) * 20);
        });
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Image export failed"))),
            "image/png",
          ),
        );
        download(blob, filename + ".png");
      }
      notify("Export downloaded with source and dataset information.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExportBusy(false);
    }
  }
  const layerList = [
    {
      key: "buildings",
      name: "Built fabric",
      desc: `${fmt(manifest?.counts.building ?? 0)} mapped footprints`,
      icon: Building2,
    },
    {
      key: "heritage",
      name: "Heritage & history",
      desc: `${HERITAGE.length} place profiles, with sources`,
      icon: Landmark,
    },
    {
      key: "transit",
      name: "Transit & streets",
      desc: "Rail lines & station records",
      icon: TrainFront,
    },
    {
      key: "landscape",
      name: "Landscape & water",
      desc: "Parks, gardens & water bodies",
      icon: Leaf,
    },
    {
      key: "streets",
      name: "Street network",
      desc: "The connections in between",
      icon: Route,
    },
  ] as const;
  return (
    <div className="app">
      <header className="topbar" inert={!!modal}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            chooseArea("pilot");
          }}
          aria-label="Delhi Atlas home"
        >
          <span className="brand-symbol">
            <span />
            <span />
            <span />
          </span>
          <span>
            delhi<span className="brand-light">atlas</span>
            <sup>β</sup>
          </span>
        </a>
        <span className="brand-caption">A city, read in layers.</span>
        <nav className="mode-nav" aria-label="Workspace mode">
          {(["explore", "analyse", "compare"] as Mode[]).map((m) => (
            <button
              key={m}
              className={mode === m ? "active" : ""}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setSelected(null);
              }}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="text-button sources-trigger"
            onClick={() => setModal("sources")}
          >
            <BookOpen size={16} /> <span>Data & sources</span>
          </button>
          <button
            className="icon-button"
            title="Share this view"
            aria-label="Share this view"
            onClick={share}
          >
            <Share2 size={17} />
          </button>
          <button
            className="primary-button export-trigger"
            disabled={!analysis.result || analysis.busy}
            onClick={() => setModal("export")}
          >
            <ArrowDownToLine size={16} />
            <span>Export</span>
          </button>
        </div>
      </header>
      <main className="workspace" inert={!!modal}>
        {data && (
          <MapView
            ref={map}
            data={data}
            lens={lens}
            timelineMode={timelineMode}
            chronologyPlaying={playing}
            context={context}
            period={period}
            showUnknown={showUnknown}
            onMotionInterrupted={() => {
              setMotionInterrupt((i) => i + 1);
              setPlaying(false);
            }}
            layers={layers}
            theme={theme}
            size={size}
            area={area}
            year={year}
            selectedId={
              heritageSelection?.id ?? featureSelection?.properties.id ?? null
            }
            drawMode={drawMode}
            drawPoints={drawPoints}
            onFeature={(f) => selectFeature(f)}
            onHeritage={selectHeritage}
            onDrawPoint={onDrawPoint}
            onReady={() => setMapReady(true)}
            initialCamera={initial?.camera}
          />
        )}
        <CinematicControls
          map={map}
          ready={mapReady}
          onSite={(id) => selectHeritage(id, true)}
          interrupt={motionInterrupt}
        />
        {(!data || !mapReady) && !loadError && (
          <div className="map-loading">
            <div className="loading-mark">
              d<span>·</span>
            </div>
            <strong>Reading the city</strong>
            <span>Loading buildings, streets and places…</span>
            <LoaderCircle className="spin" size={20} />
          </div>
        )}
        {loadError && (
          <div className="map-loading" role="alert">
            <h2>Dataset unavailable</h2>
            <p>{loadError}</p>
            <button
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}
        <button
          className="panel-toggle icon-button"
          aria-label={panelOpen ? "Hide layer panel" : "Show layer panel"}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          {panelOpen ? (
            <PanelLeftClose size={19} />
          ) : (
            <PanelLeftOpen size={19} />
          )}
        </button>
        <aside
          className={`left-panel panel ${panelOpen ? "" : "collapsed"}`}
          aria-label="Map layers and filters"
        >
          <div className="panel-intro">
            <div className="eyebrow">
              <span className="status-dot" /> DELHI / URBAN ATLAS
            </div>
            <h1>Read the city.</h1>
            <p>
              Buildings, stories, and the spaces
              <br />
              that connect them.
            </p>
          </div>
          <div className="search-box" ref={searchBox}>
            <Search size={16} />
            <input
              aria-label="Search places and mapped buildings"
              placeholder="Find a place in Delhi"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearching(true);
              }}
              onFocus={() => setSearching(true)}
            />
            <kbd>⌕</kbd>
            {searching && (
              <div className="search-results">
                {searchResults.length ? (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() =>
                        "story" in r.item
                          ? selectHeritage(r.id)
                          : selectFeature(r.item, true)
                      }
                    >
                      <MapPin size={15} />
                      <span>
                        <strong>{r.name}</strong>
                        <small>{r.sub}</small>
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  ))
                ) : (
                  <p>No matching records in this pilot.</p>
                )}
                <div className="search-note">
                  Searches bundled places; no external geocoder.
                </div>
              </div>
            )}
          </div>
          <div className="section-heading">
            <span>CONTEXT LAYERS</span>
            <span>{Object.values(layers).filter(Boolean).length} active</span>
          </div>
          <div className="layer-list">
            {layerList.map(({ key, name, desc, icon: Icon }) => (
              <button
                key={key}
                className={`layer-row ${layers[key] ? "enabled" : ""}`}
                role="switch"
                aria-checked={layers[key]}
                onClick={() => {
                  setMotionInterrupt((i) => i + 1);
                  setPlaying(false);
                  map.current?.stopMotion();
                  setLayers((l) => ({ ...l, [key]: !l[key] }));
                }}
              >
                <span className={`layer-icon ${key}`}>
                  <Icon size={18} />
                </span>
                <span className="layer-text">
                  <strong>{name}</strong>
                  <small>{desc}</small>
                </span>
                <span className="switch">
                  <span />
                </span>
              </button>
            ))}
          </div>
          <ContextPanel
            context={context}
            onContext={changeContext}
            features={sizeFeatures}
          />
          <section className="heritage-lenses">
            <div className="section-heading">
              <span>HISTORY LENSES</span>
            </div>
            <div className="lens-buttons">
              {(
                [
                  ["all", "All stories"],
                  ["mughal", "Mughal"],
                  ["sacred", "Sacred"],
                  ["civic", "Civic"],
                  ["water", "Water & gardens"],
                ] as [HeritageLens, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={lens === id}
                  className={lens === id ? "active" : ""}
                  onClick={() => {
                    setLens(id);
                    setSelected(null);
                    setPlaying(false);
                    setYear(LAST_YEAR);
                    setLayers((l) => ({ ...l, heritage: true }));
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="directory-toggle"
              aria-expanded={directoryOpen}
              onClick={() => setDirectoryOpen(!directoryOpen)}
            >
              Browse {HERITAGE.length} landmark profiles{" "}
              <ChevronDown size={14} />
            </button>
            {directoryOpen && (
              <div className="landmark-directory">
                {HERITAGE.filter(
                  (h) => lens === "all" || h.lenses?.includes(lens),
                ).map((h) => (
                  <button key={h.id} onClick={() => selectHeritage(h.id)}>
                    <span>
                      {h.name}
                      <small>{h.dateLabel}</small>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
            )}
          </section>
          <div className="colour-section">
            <div className="section-heading">
              <span>COLOUR BUILDINGS BY</span>
              <SlidersHorizontal size={13} />
            </div>
            <div className="segmented">
              {(["footprint", "use", "height", "era"] as Theme[]).map((t) => (
                <button
                  key={t}
                  className={context === "none" && theme === t ? "active" : ""}
                  onClick={() => {
                    setTheme(t);
                    setContext("none");
                    if (t !== "era") setPeriod(null);
                  }}
                >
                  {t === "footprint"
                    ? "Footprint"
                    : t === "use"
                      ? "Use"
                      : t === "height"
                        ? "Height"
                        : "Date"}
                </button>
              ))}
            </div>
            {context !== "none" && (
              <p className="micro-note">
                The active context uses its own palette above. Choose a colour
                mode to leave this context.
              </p>
            )}
            {context === "none" && (
              <div className="legend">
                {theme === "era" ? (
                  PERIODS.map((p, i) => (
                    <button
                      className="period-row"
                      key={p.id}
                      aria-pressed={period === p.id}
                      onClick={() => {
                        setPeriod(period === p.id ? null : p.id);
                        setContext("none");
                        setTimelineMode("buildings");
                        setYear(LAST_YEAR);
                        setPlaying(false);
                        setSelected(null);
                        setMotionInterrupt((v) => v + 1);
                        setLayers((l) => ({ ...l, buildings: true }));
                      }}
                    >
                      <span
                        className="swatch"
                        style={{ background: p.color }}
                      />
                      <span>{p.label}</span>
                      <small>{periodCounts[i]}</small>
                    </button>
                  ))
                ) : (
                  <>
                    {(theme === "footprint"
                      ? labels
                      : theme === "use"
                        ? [
                            "Commercial / markets",
                            "Residential",
                            "Religious",
                            "Institutional / transit",
                          ]
                        : ["Under 10 m", "10–20 m", "20–40 m", "Over 40 m"]
                    ).map((label, i) => (
                      <div key={label}>
                        <span
                          className="swatch"
                          style={{
                            background:
                              theme === "use"
                                ? ["#c89854", "#7b9585", "#bd7d62", "#607d89"][
                                    i
                                  ]
                                : colours[i],
                          }}
                        />
                        <span>{label}</span>
                        {theme === "footprint" && (
                          <small>
                            {analysis.result
                              ? fmt(analysis.result.bins[i])
                              : "—"}
                          </small>
                        )}
                      </div>
                    ))}
                  </>
                )}
                {theme === "era" && (
                  <p className="micro-note">
                    Click a period to isolate dated buildings. Click it again to
                    restore all periods.
                  </p>
                )}
                {theme !== "footprint" && (
                  <div>
                    <span
                      className="swatch"
                      style={{ background: "#c9c7b9" }}
                    />
                    <span>Unknown / other</span>
                  </div>
                )}
              </div>
            )}
            <label className="field-label" htmlFor="footprint-filter">
              Footprint filter
            </label>
            <div className="select-wrap">
              <select
                id="footprint-filter"
                value={size}
                onChange={(e) => {
                  setSize(e.target.value as SizeFilter);
                  setSelected(null);
                }}
              >
                <option value="all">All mapped buildings</option>
                <option value="small">Small · under 100 m²</option>
                <option value="medium">Medium · 100–500 m²</option>
                <option value="large">Large · 500 m² and above</option>
              </select>
              <ChevronDown size={15} />
            </div>
            <p className="micro-note">
              {theme === "era"
                ? "Dates combine reviewed building sources and recorded OSM start dates. Open a building for its date basis and source. Grey buildings have no usable date."
                : theme === "height"
                  ? `Only ${heightCount} records have height estimates. Grey means unknown.`
                  : theme === "use"
                    ? "OSM building tags; unclassified footprints remain unknown."
                    : "Footprint area, not floor area. Legend counts follow the selected study area."}
            </p>
          </div>
          <button className="data-note" onClick={() => setModal("sources")}>
            <span className="data-dot" />
            <span>
              <strong>
                {manifest?.snapshot.slice(0, 4) ?? "—"} OSM snapshot
              </strong>
              <small>Understand coverage & limitations</small>
            </span>
            <MoveUpRight size={14} />
          </button>
        </aside>
        <div className={`map-topline ${!panelOpen ? "expanded" : ""}`}>
          <div className="location-breadcrumb">
            <span>INDIA</span>
            <ChevronRight size={11} />
            <strong>Delhi NCT</strong>
            <ChevronRight size={11} />
            <span>Urban core</span>
          </div>
          <div className="map-caption">
            <span className="archive-tag">
              {manifest?.snapshot.slice(0, 4)} OSM
            </span>
            <span className="live-dot" />
            {fmt(visibleCount)} dataset footprints
            <span className="caption-divider" />
            Uniform 8 m where height unknown
          </div>
        </div>
        {drawMode && (
          <div className="draw-toolbar">
            <MousePointer2 size={17} />
            <span>
              {drawMode === "polygon"
                ? `${drawPoints.length} corners · click to add`
                : `Click the centre of a ${radius} m buffer`}
            </span>
            {drawMode === "polygon" && (
              <>
                <button
                  className="icon-button"
                  disabled={!drawPoints.length}
                  aria-label="Undo last corner"
                  onClick={() => setDrawPoints((p) => p.slice(0, -1))}
                >
                  <Undo2 size={16} />
                </button>
                <button
                  className="primary-button"
                  disabled={drawPoints.length < 3}
                  onClick={finishDrawing}
                >
                  Finish boundary
                </button>
              </>
            )}
            <button
              className="icon-button"
              aria-label="Cancel drawing"
              onClick={() => {
                setDrawMode(null);
                setDrawPoints([]);
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <aside
          key={
            heritageSelection?.id ??
            featureSelection?.properties.id ??
            "overview"
          }
          className={`right-panel panel ${selected ? "has-selection" : ""}`}
          aria-label="Research inspector"
        >
          {selected ? (
            <>
              <div className="inspector-top">
                <span className="eyebrow">
                  {heritageSelection ? "A PLACE IN THE CITY" : "MAPPED FEATURE"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Close feature details"
                  onClick={() => setSelected(null)}
                >
                  <X size={17} />
                </button>
              </div>
              {heritageSelection ? (
                <>
                  <HeritagePhoto site={heritageSelection} />
                  <div className="detail-body">
                    <span className="pill">{heritageSelection.type}</span>
                    <h2>{heritageSelection.name}</h2>
                    <p className="hindi-label" lang="hi">
                      {heritageSelection.hindi}
                    </p>
                    <div className="heritage-date">
                      <strong>
                        {heritageSelection.datePrecision === "approximate"
                          ? "c. "
                          : ""}
                        {heritageSelection.year}
                      </strong>
                      <span>
                        {heritageSelection.period}
                        <small>{heritageSelection.dateLabel}</small>
                      </span>
                    </div>
                    <p className="story">{heritageSelection.story}</p>
                    <HeritageDetails site={heritageSelection} />
                    <a
                      className="source-link"
                      href={heritageSelection.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {heritageSelection.sourceName}
                      <ExternalLink size={13} />
                    </a>
                    <p className="micro-note">
                      A sourced place profile. The marker is an approximate site
                      location, not a surveyed footprint. The date describes the
                      stated milestone; nearby buildings may be much newer.
                    </p>
                    <button
                      className="secondary-button full"
                      onClick={() =>
                        applyArea(
                          circle(heritageSelection.coords, 0.5, {
                            steps: 64,
                            units: "kilometers",
                          }),
                          `500 m around ${heritageSelection.name}`,
                        )
                      }
                    >
                      <Focus size={16} /> Study its surroundings
                    </button>
                  </div>
                </>
              ) : (
                featureSelection && (
                  <div className="detail-body">
                    <div className="feature-glyph">
                      <Building2 size={34} />
                    </div>
                    <span className="pill">
                      {featureSelection.properties.kind === "station"
                        ? "Station record"
                        : featureSelection.properties.kind === "place"
                          ? "Mapped place"
                          : "Building footprint"}
                    </span>
                    <h2>
                      {featureSelection.properties.name ||
                        "An everyday building"}
                    </h2>
                    <p className="subtle">{featureSelection.properties.id}</p>
                    <dl className="facts">
                      <div>
                        <dt>Recorded use</dt>
                        <dd>
                          {featureSelection.properties.use === "yes"
                            ? "Unknown"
                            : featureSelection.properties.use}
                        </dd>
                      </div>
                      {featureSelection.properties.kind === "building" && (
                        <div>
                          <dt>Footprint area</dt>
                          <dd>
                            {fmt(featureSelection.properties.area_m2 ?? 0)} m²
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>Height</dt>
                        <dd>
                          {featureSelection.properties.height_m === null
                            ? "Unknown"
                            : `${featureSelection.properties.height_m} m (${featureSelection.properties.height_method.startsWith("Estimated:") ? "storey estimate" : "OSM tag"})`}
                        </dd>
                      </div>
                      <div>
                        <dt>Timeline date</dt>
                        <dd>
                          {buildingDate(featureSelection)?.label ?? "Unknown"}
                        </dd>
                      </div>
                      <div>
                        <dt>Source snapshot</dt>
                        <dd>{featureSelection.properties.snapshot}</dd>
                      </div>
                    </dl>
                    <p className="micro-note">
                      {featureSelection.properties.height_m === null
                        ? "The 8 m extrusion is for visual context only. No measured height is available."
                        : featureSelection.properties.height_method}
                    </p>
                    <a
                      href={featureSelection.properties.source_url}
                      className="source-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View current OpenStreetMap record
                      <ExternalLink size={13} />
                    </a>
                    <p className="micro-note">
                      The current online record may differ from this bundled
                      snapshot.
                    </p>
                    <BuildingProfile
                      feature={featureSelection}
                      onHeritage={selectHeritage}
                    />
                  </div>
                )
              )}
            </>
          ) : mode === "explore" ? (
            <>
              <div className="inspector-top">
                <span className="eyebrow">YOUR FIELD GUIDE</span>
                <Layers3 size={17} />
              </div>
              <div className="guide-body">
                <h2>
                  Many Delhis.
                  <br />
                  <em>One living city.</em>
                </h2>
                <p>
                  Look closer at the patterns that shape the capital. Choose a
                  neighbourhood to begin.
                </p>
                <div className="neighbourhoods">
                  {AREAS.slice(1).map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => chooseArea(a.id)}
                      className={areaName === a.name ? "chosen" : ""}
                    >
                      <span className="neighbourhood-number">0{i + 1}</span>
                      <span>
                        <strong>{a.name}</strong>
                        <small>
                          {i === 0
                            ? "Lanes, courtyards & imperial anchors"
                            : "Radial streets & modern civic life"}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
                <div className="guide-rule" />
                <div className="small-title">
                  {areaName.toUpperCase()} / AT A GLANCE
                </div>
                <Summary {...analysis} />
                <button
                  className="text-action"
                  onClick={() => {
                    setMode("analyse");
                    setSelected(null);
                  }}
                >
                  Make this a site study <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : mode === "analyse" ? (
            <>
              <div className="inspector-top">
                <span className="eyebrow">SITE STUDY</span>
                <Ruler size={17} />
              </div>
              <div className="guide-body">
                <h2>
                  Draw a question.
                  <br />
                  <em>Read the ground.</em>
                </h2>
                <p>
                  Select a study window, draw a boundary, or place a distance
                  buffer.
                </p>
                <label className="field-label" htmlFor="study-window">
                  Study area
                </label>
                <div className="select-wrap">
                  <select
                    id="study-window"
                    value={
                      AREAS.find((a) => a.name === areaName)?.id ?? "custom"
                    }
                    onChange={(e) => chooseArea(e.target.value)}
                  >
                    {AREAS.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                    {!AREAS.some((a) => a.name === areaName) && (
                      <option value="custom">{areaName}</option>
                    )}
                  </select>
                  <ChevronDown size={15} />
                </div>
                <div className="draw-actions">
                  <button
                    className={drawMode === "polygon" ? "active" : ""}
                    onClick={() => {
                      setDrawMode("polygon");
                      setDrawPoints([]);
                    }}
                  >
                    <SquareDashedMousePointer size={18} />
                    Draw boundary
                  </button>
                  <button
                    className={drawMode === "radius" ? "active" : ""}
                    onClick={() => {
                      setDrawMode("radius");
                      setDrawPoints([]);
                    }}
                  >
                    <Focus size={18} />
                    Place buffer
                  </button>
                </div>
                <div className="radius-row">
                  <label htmlFor="radius">Buffer radius</label>
                  <select
                    id="radius"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  >
                    <option value="250">250 m</option>
                    <option value="500">500 m</option>
                    <option value="1000">1,000 m</option>
                  </select>
                </div>
                <p className="micro-note">
                  Straight-line distance, not a walking catchment.
                </p>
                <button
                  className="text-action import-button"
                  onClick={() => importInput.current?.click()}
                >
                  <Upload size={14} /> Import a GeoJSON boundary
                </button>
                <div className="guide-rule" />
                <div className="small-title">{areaName.toUpperCase()}</div>
                <Summary {...analysis} />
                <button
                  className="secondary-button full"
                  disabled={!analysis.result}
                  onClick={() => setModal("table")}
                >
                  <Table2 size={16} />
                  Inspect building records
                  <ChevronRight size={14} />
                </button>
                {area && (
                  <button
                    className="text-action"
                    onClick={() => chooseArea("pilot")}
                  >
                    Clear study area <X size={13} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="inspector-top">
                <span className="eyebrow">NEIGHBOURHOOD COMPARISON</span>
                <Layers3 size={17} />
              </div>
              <div className="guide-body">
                <h2>
                  Two places.
                  <br />
                  <em>A closer reading.</em>
                </h2>
                <p>
                  Compare recorded built fabric within two study windows, using
                  the same snapshot and filter.
                </p>
                <div className="compare-selects">
                  {[0, 1].map((i) => (
                    <label key={i}>
                      <span className="small-title">
                        WINDOW {i === 0 ? "A" : "B"}
                      </span>
                      <select
                        aria-label={`Comparison window ${i === 0 ? "A" : "B"}`}
                        value={compareIds[i]}
                        onChange={(e) =>
                          setCompareIds((ids) =>
                            i === 0
                              ? [e.target.value, ids[1]]
                              : [ids[0], e.target.value],
                          )
                        }
                      >
                        {AREAS.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {compareA.busy || compareB.busy ? (
                  <div className="calculating">
                    <LoaderCircle size={16} className="spin" /> Comparing study
                    windows…
                  </div>
                ) : compareA.result && compareB.result ? (
                  <div className="comparison-table">
                    <div className="comparison-head">
                      <span>MEASURE</span>
                      <b>A</b>
                      <b>B</b>
                    </div>
                    {[
                      [
                        "Mapped buildings",
                        fmt(compareA.result.count),
                        fmt(compareB.result.count),
                      ],
                      [
                        "Extent, km²",
                        fmt(compareA.result.areaM2 / 1e6, 2),
                        fmt(compareB.result.areaM2 / 1e6, 2),
                      ],
                      [
                        "Footprint coverage",
                        `${fmt(compareA.result.coverage, 1)}%`,
                        `${fmt(compareB.result.coverage, 1)}%`,
                      ],
                      [
                        "Height available",
                        fmt(compareA.result.knownHeightCount),
                        fmt(compareB.result.knownHeightCount),
                      ],
                    ].map(([label, a, b]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{a}</strong>
                        <strong>{b}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="error-text">
                    {compareA.error || compareB.error}
                  </p>
                )}
                <p className="micro-note">
                  Study windows are not official neighbourhood boundaries.
                  Uneven source coverage limits comparison. Coverage is not FAR.
                </p>
                <div className="draw-actions">
                  <button onClick={() => chooseArea(compareIds[0])}>
                    View window A<ArrowRight size={14} />
                  </button>
                  <button onClick={() => chooseArea(compareIds[1])}>
                    View window B<ArrowRight size={14} />
                  </button>
                </div>
                <p className="micro-note">
                  Exports use the current map study: {areaName}. Choose “View
                  window” to export that selection.
                </p>
              </div>
            </>
          )}
        </aside>
        <div className="bottom-dock">
          <div className="district-tabs" aria-label="Pilot study windows">
            {AREAS.map((a) => (
              <button
                key={a.id}
                className={areaName === a.name ? "active" : ""}
                onClick={() => chooseArea(a.id)}
              >
                {a.id === "pilot" ? (
                  <Layers3 size={14} />
                ) : (
                  <MapPin size={13} />
                )}{" "}
                {a.name}
              </button>
            ))}
          </div>
          <Chronology
            mode={timelineMode}
            onMode={changeTimeline}
            year={year}
            onYear={changeYear}
            records={timelineMode === "buildings" ? datedRecords : siteRecords}
            total={dateCoverage.total}
            unknown={dateCoverage.unknown}
            playing={playing}
            onPlay={() => playChronology()}
            onReplay={() => playChronology(true)}
            speed={speed}
            onSpeed={setSpeed}
            showUnknown={showUnknown}
            onUnknown={setShowUnknown}
            ready={mapReady}
            reduced={reduced}
            onInfo={() => setModal("sources")}
          />
          <div className="map-footer">
            <span>
              © OpenStreetMap contributors · ODbL · Snapshot{" "}
              {manifest?.snapshot.slice(0, 10) ?? "—"}
            </span>
            <span>Drag to pan · Right-drag to rotate · Scroll to zoom</span>
          </div>
        </div>
        {toast && (
          <div className="toast" role="status">
            <Check size={16} />
            <span>{toast}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </main>
      <input
        ref={importInput}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        className="visually-hidden"
        aria-label="Import study boundary file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 2_000_000)
              throw new Error("Use a GeoJSON file smaller than 2 MB.");
            applyArea(
              JSON.parse(await file.text()),
              file.name.replace(/\.(geo)?json$/, ""),
            );
          } catch (err) {
            notify(
              err instanceof Error
                ? err.message
                : "Could not read the boundary.",
            );
          } finally {
            e.target.value = "";
          }
        }}
      />
      {modal === "sources" && (
        <Modal title="Evidence behind the atlas" onClose={closeModal}>
          <p className="modal-lead">
            A useful map begins with knowing what it can—and cannot—tell you.
          </p>
          <div className="notice">
            <BookOpen size={20} />
            <div>
              <strong>
                {manifest?.archive ? "Historical pilot" : "OSM pilot snapshot"}{" "}
                · {manifest?.snapshot.slice(0, 10)}
              </strong>
              <p>
                This bundled OSM extract is not a current survey. It supports
                exploration and testing of the research workflow. Coverage is
                incomplete.
              </p>
            </div>
          </div>
          <div className="source-card">
            <h3>Buildings, streets, landscape & transit</h3>
            <p>
              © OpenStreetMap contributors. Extracted from Geofabrik’s Northern
              Zone download dated {manifest?.snapshot.slice(0, 10)}. The
              upstream checksum was verified. Geometry was validated and
              contextual layers were clipped to the study extent.
            </p>
            <div className="source-links">
              <a href={manifest?.source_url} target="_blank" rel="noreferrer">
                Original OSM extract <ExternalLink size={12} />
              </a>
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                Attribution & ODbL licence <ExternalLink size={12} />
              </a>
              <a
                href={`${import.meta.env.BASE_URL}data/manifest.json`}
                target="_blank"
                rel="noreferrer"
              >
                Dataset manifest <ExternalLink size={12} />
              </a>
              <a
                href={`${import.meta.env.BASE_URL}data/delhi.geojson`}
                download
              >
                Download pilot GeoJSON <ArrowDownToLine size={12} />
              </a>
            </div>
          </div>
          <div className="source-card">
            <h3>What the building records contain</h3>
            <dl className="facts">
              <div>
                <dt>Named buildings</dt>
                <dd>{fmt(manifest?.building_attributes?.name ?? 0)}</dd>
              </div>
              <div>
                <dt>Height or storeys</dt>
                <dd>{fmt(heightCount)}</dd>
              </div>
              <div>
                <dt>Recorded construction dates</dt>
                <dd>{fmt(manifest?.building_attributes?.start_date ?? 0)}</dd>
              </div>
              <div>
                <dt>Mapped places</dt>
                <dd>{fmt(manifest?.counts.place ?? 0)}</dd>
              </div>
            </dl>
            <p>
              Government and heritage sources inform the curated profiles.
              General building tags come from OpenStreetMap; linked encyclopedia
              introductions are separately attributed under CC BY-SA 4.0.
              Missing attributes are not inferred from nearby landmarks.
            </p>
          </div>
          <div className="source-card">
            <h3>Height is mostly unknown</h3>
            <p>
              Only {heightCount} of {fmt(manifest?.counts.building ?? 0)}{" "}
              building records have usable height or storey tags. Unknown
              buildings use a uniform 8 m extrusion for display. These values
              are excluded from height statistics. Storey-derived heights use 3
              m per storey and remain estimates.
            </p>
          </div>
          <div className="source-card">
            <h3>Heritage is a separate editorial layer</h3>
            <p>
              {HERITAGE.length} curated place markers link to their cited
              sources. Dates describe completion or construction of the named
              site, not every footprint nearby. The Heritage milestones timeline
              filters {HERITAGE.length} curated sites and includes approximate
              dates and institutional milestones, as labelled in each profile.
              It does not reconstruct historical Delhi. Building dates playback
              and the Date colour mode combine reviewed dates for explicitly
              matched buildings with parseable OSM start dates. Each dossier
              identifies the date basis and source. Institutional milestones,
              ranges and approximate dates are not added as exact building ages;
              remaining unknown dates stay neutral in Date mode and can be
              hidden with Undated context. Context colours classify recorded
              tags and do not imply age. The timeline chart counts matching
              records across the urban core, independently of the study-area
              analysis. Profiles cite ASI, Ministry of Tourism, Delhi Tourism
              and secondary sources. Architectural readings are editorial
              interpretation.
            </p>
          </div>
          <div className="source-card">
            <h3>How to read the analysis</h3>
            <p>
              Calculations use the complete bundled building dataset, not just
              visible map tiles. Selected footprints are clipped to the study
              boundary and pilot extent; overlaps are unioned for coverage.
              Study area includes water. Coverage is not FAR, and a circular
              buffer is not a walking catchment.
            </p>
            <p>
              Use exports with their metadata and verify source coverage for
              your site. Mapped station records can include multiple records for
              an interchange; they are not a count of unique Metro stations.
            </p>
          </div>
          <div className="source-card">
            <h3>Coverage before conclusions</h3>
            <p>
              The map covers an expanded rectangular urban-core extent from
              Mehrauli to Old Delhi, not all Delhi NCT. Blank areas may be
              unmapped. Heritage markers are an illustrative selection, not a
              complete inventory. Treat this release as an exploration tool and
              verify findings against recent surveys before using them in a
              planning decision.
            </p>
          </div>
        </Modal>
      )}
      {modal === "export" && (
        <Modal title="Take your research with you" onClose={closeModal}>
          <p className="modal-lead">
            {areaName} · {analysis.result ? fmt(analysis.result.count) : "—"}{" "}
            matched building footprints · {manifest?.snapshot.slice(0, 10)}
          </p>
          <div className="export-options">
            {(
              [
                {
                  id: "png",
                  title: "Map image",
                  desc: "PNG · current camera, legend & attribution",
                  icon: MapPin,
                },
                {
                  id: "csv",
                  title: "Building records",
                  desc: "CSV · full / clipped area, height & source",
                  icon: Table2,
                },
                {
                  id: "geojson",
                  title: "Spatial selection",
                  desc: "GeoJSON · clipped footprints & study metadata",
                  icon: FileJson,
                },
                {
                  id: "brief",
                  title: "Research brief",
                  desc: "Markdown · summary, method & reproducible boundary",
                  icon: BookOpen,
                },
              ] as const
            ).map(({ id, title, desc, icon: Icon }) => (
              <button
                key={id}
                disabled={
                  exportBusy || !analysis.result || (id === "png" && !mapReady)
                }
                onClick={() => exportData(id)}
              >
                <span className="export-icon">
                  <Icon size={21} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </span>
                <ArrowDownToLine size={17} />
              </button>
            ))}
          </div>
          <p className="micro-note">
            Dataset: {manifest?.id}. Footprint filter: {size}. Map images
            include contextual buildings outside your study area. Data exports
            contain buildings matching the study boundary and footprint-size
            filter. Timeline, period and context filters affect the map image,
            not the research dataset.
          </p>
          {exportBusy && (
            <p role="status">
              <LoaderCircle size={16} className="spin" /> Preparing export…
            </p>
          )}
        </Modal>
      )}
      {modal === "share" && (
        <Modal title="Keep this perspective" onClose={closeModal}>
          <p className="modal-lead">
            Your link restores the camera, layers, filters, timeline and study
            boundary on this app’s host.
          </p>
          <label className="field-label" htmlFor="share-url">
            View link
          </label>
          <textarea
            id="share-url"
            className="share-input"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
          <button className="primary-button full" onClick={copyShare}>
            <Copy size={16} />
            Copy view link
          </button>
          <p className="micro-note">
            The app must be deployed on an accessible host for collaborators to
            open the link. No account or cloud save is required.
          </p>
        </Modal>
      )}
      {modal === "table" && (
        <Modal title="The buildings in your study" onClose={closeModal} wide>
          <p className="modal-lead">
            {areaName} · {fmt(tableRows.length)} matching records. Heights
            marked unknown are not measured.
          </p>
          <div className="table-tools">
            <div className="table-search">
              <Search size={16} />
              <input
                aria-label="Filter building table"
                placeholder="Filter by name or OSM ID"
                value={tableQuery}
                onChange={(e) => setTableQuery(e.target.value)}
              />
            </div>
            <button
              className="secondary-button"
              onClick={() => exportData("csv")}
            >
              <ArrowDownToLine size={15} />
              CSV
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Building / record</th>
                  <th>Full area, m²</th>
                  <th>In study, m²</th>
                  <th>Height</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {tableRows
                  .slice(tablePage * 25, (tablePage + 1) * 25)
                  .map((f) => (
                    <tr key={f.properties.id}>
                      <td>
                        <button
                          onClick={() => {
                            selectFeature(f, true);
                            setModal(null);
                          }}
                        >
                          {f.properties.name || f.properties.id}
                        </button>
                      </td>
                      <td>{fmt(f.properties.area_m2 ?? 0)}</td>
                      <td>{fmt(f.properties.selected_area_m2 ?? 0)}</td>
                      <td>
                        {f.properties.height_m === null
                          ? "Unknown"
                          : `${f.properties.height_m} m (est.)`}
                      </td>
                      <td>
                        <a
                          href={f.properties.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          OSM <ExternalLink size={11} />
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!tableRows.length && (
              <p className="empty-state">No matching building records.</p>
            )}
          </div>
          <div className="pagination">
            <button
              className="secondary-button"
              disabled={!tablePage}
              onClick={() => setTablePage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {tablePage + 1} of{" "}
              {Math.max(1, Math.ceil(tableRows.length / 25))}
            </span>
            <button
              className="secondary-button"
              disabled={(tablePage + 1) * 25 >= tableRows.length}
              onClick={() => setTablePage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
