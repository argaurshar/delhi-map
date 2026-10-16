import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCw,
  X,
  Film,
} from "lucide-react";
import type { MapHandle } from "./MapView";
import { HERITAGE } from "../lib/data";

const tours = [
  {
    id: "city",
    name: "Delhi through time",
    sites: [
      "qutub",
      "humayun",
      "red-fort",
      "jama-masjid",
      "india-gate",
      "lotus",
      "akshardham",
    ],
  },
  {
    id: "mughal",
    name: "Mughal landscapes",
    sites: ["humayun", "purana-qila", "red-fort", "jama-masjid", "safdarjung"],
  },
  {
    id: "civic",
    name: "The capital & its institutions",
    sites: [
      "rashtrapati",
      "old-parliament",
      "india-gate",
      "national-museum",
      "war-memorial",
    ],
  },
];
export function CinematicControls({
  map,
  ready,
  onSite,
  interrupt,
}: {
  map: RefObject<MapHandle | null>;
  ready: boolean;
  onSite: (id: string) => void;
  interrupt: number;
}) {
  const [open, setOpen] = useState(false),
    [playing, setPlaying] = useState(false),
    [orbit, setOrbit] = useState(false);
  const [tourId, setTourId] = useState("city"),
    [index, setIndex] = useState(0),
    [speed, setSpeed] = useState(1);
  const selected = tours.find((t) => t.id === tourId)!;
  const site = HERITAGE.find((h) => h.id === selected.sites[index])!;
  const callback = useRef(onSite);
  callback.current = onSite;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visit = (i: number) => {
    const h = HERITAGE.find((h) => h.id === selected.sites[i])!;
    setIndex(i);
    callback.current(h.id);
    map.current?.cinematic(h.coords, h.id === "red-fort" ? 15.8 : 16.5);
  };
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index === selected.sites.length - 1) {
        setPlaying(false);
        setOrbit(false);
        return;
      }
      const next = index + 1,
        h = HERITAGE.find((h) => h.id === selected.sites[next])!;
      setIndex(next);
      callback.current(h.id);
      map.current?.cinematic(h.coords, h.id === "red-fort" ? 15.8 : 16.5);
    }, 14000 / speed);
    return () => clearTimeout(timer);
  }, [playing, index, tourId, speed, map, selected.sites]);
  useEffect(() => {
    if (orbit && !reduced) map.current?.startOrbit();
    else map.current?.stopOrbit();
    return () => map.current?.stopOrbit();
  }, [orbit, reduced, map]);
  useEffect(() => {
    setPlaying(false);
    setOrbit(false);
  }, [interrupt]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) {
        setPlaying(false);
        setOrbit(false);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return (
    <div className={`cinema ${open ? "open" : ""}`}>
      <div className="cinema-actions">
        <button
          disabled={!ready}
          className={open ? "active" : ""}
          onClick={() => {
            setOpen(!open);
            if (open) {
              setPlaying(false);
              setOrbit(false);
            }
          }}
        >
          <Film size={15} /> Guided tour
        </button>
        <button
          disabled={!ready || reduced}
          aria-pressed={orbit}
          aria-label={orbit ? "Stop orbit" : "Orbit map"}
          onClick={() => {
            setOrbit(!orbit);
            if (orbit) setPlaying(false);
          }}
        >
          <RotateCw size={15} />
          {orbit ? "Stop orbit" : "Orbit"}
        </button>
        <button
          disabled={!ready || reduced}
          onClick={() => map.current?.reveal()}
        >
          Replay 3D reveal
        </button>
      </div>
      {open && (
        <section className="tour-player" aria-label="Guided city tour">
          <div className="tour-top">
            <select
              aria-label="Choose guided tour"
              value={tourId}
              onChange={(e) => {
                setPlaying(false);
                setOrbit(false);
                setIndex(0);
                setTourId(e.target.value);
              }}
            >
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              aria-label="Close guided tour"
              onClick={() => {
                setOpen(false);
                setPlaying(false);
                setOrbit(false);
              }}
            >
              <X size={15} />
            </button>
          </div>
          <div className="tour-current">
            <span>
              {String(index + 1).padStart(2, "0")} / {selected.sites.length}
            </span>
            <div>
              <strong>{site.name}</strong>
              <small>{site.dateLabel}</small>
            </div>
          </div>
          <div
            className="tour-progress"
            key={`${tourId}-${index}-${playing}-${speed}`}
          >
            <span
              style={{
                animationDuration: `${14000 / speed}ms`,
                animationPlayState: playing ? "running" : "paused",
              }}
            />
          </div>
          <div className="tour-transport">
            <button
              aria-label="Previous tour stop"
              disabled={index === 0}
              onClick={() => visit(index - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="tour-play"
              aria-label={playing ? "Pause guided tour" : "Play guided tour"}
              onClick={() => {
                if (!playing) visit(index);
                else map.current?.stopMotion();
                setPlaying(!playing);
                setOrbit(!playing && !reduced);
              }}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
              {playing ? "Pause" : "Play tour"}
            </button>
            <button
              aria-label="Next tour stop"
              disabled={index === selected.sites.length - 1}
              onClick={() => visit(index + 1)}
            >
              <ChevronRight size={18} />
            </button>
            <select
              aria-label="Tour speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
          </div>
          <p>
            Drag the map to pause.{" "}
            {reduced
              ? "Reduced motion: static scene changes."
              : "Fly between sites, then orbit each landmark."}
          </p>
        </section>
      )}
    </div>
  );
}
