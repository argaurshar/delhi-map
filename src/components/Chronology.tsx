import { Pause, Play, RotateCcw, CircleHelp } from "lucide-react";
import {
  FIRST_YEAR,
  LAST_YEAR,
  histogram,
  type DateRecord,
  type TimelineMode,
} from "../lib/chronology";
interface Props {
  mode: TimelineMode;
  onMode: (mode: TimelineMode) => void;
  year: number;
  onYear: (year: number) => void;
  records: DateRecord[];
  unknown: number;
  total: number;
  playing: boolean;
  onPlay: () => void;
  onReplay: () => void;
  speed: number;
  onSpeed: (speed: number) => void;
  showUnknown: boolean;
  onUnknown: (show: boolean) => void;
  ready: boolean;
  onInfo: () => void;
  reduced: boolean;
}
export function Chronology(p: Props) {
  const bins = histogram(p.records),
    max = Math.max(1, ...bins.map((b) => b.count));
  const revealed = p.records.filter((r) => r.year <= p.year).length;
  const position = (y: number) =>
    Math.max(
      0,
      Math.min(100, ((y - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * 100),
    );
  return (
    <section
      className="chronology panel"
      aria-label="City chronology"
      data-year={p.year}
      data-revealed={revealed}
      data-total={p.records.length}
    >
      <div className="chronology-toolbar">
        <div
          className="chronology-tabs"
          role="group"
          aria-label="Timeline subject"
        >
          <button
            aria-pressed={p.mode === "buildings"}
            onClick={() => p.onMode("buildings")}
          >
            Building dates
          </button>
          <button
            aria-pressed={p.mode === "heritage"}
            onClick={() => p.onMode("heritage")}
          >
            Heritage milestones
          </button>
        </div>
        {p.mode === "buildings" && (
          <label className="unknown-toggle">
            <input
              type="checkbox"
              checked={p.showUnknown}
              onChange={(e) => p.onUnknown(e.target.checked)}
            />
            Undated context
          </label>
        )}
        <button
          className="icon-button chronology-info"
          aria-label="About the timeline"
          onClick={p.onInfo}
        >
          <CircleHelp size={16} />
        </button>
      </div>
      <div className="chronology-main">
        <div className="chronology-transport">
          <button
            className={`play-button ${p.playing ? "playing" : ""}`}
            disabled={!p.ready || !p.records.length || p.reduced}
            aria-label={p.playing ? "Pause chronology" : "Play chronology"}
            onClick={p.onPlay}
          >
            {p.playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="icon-button"
            disabled={!p.ready || !p.records.length || p.reduced}
            aria-label="Replay chronology"
            onClick={p.onReplay}
          >
            <RotateCcw size={15} />
          </button>
          <select
            aria-label="Chronology speed"
            value={p.speed}
            onChange={(e) => p.onSpeed(Number(e.target.value))}
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </div>
        <div className="chronology-plot">
          {!p.records.length && (
            <span className="chronology-empty">
              No usable dates in this context
            </span>
          )}
          <svg
            viewBox="0 0 836 52"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${p.records.length} ${p.mode === "buildings" ? "dated building records" : "site milestones"}; ${revealed} through ${p.year}`}
          >
            {bins.map((b) => {
              let bottom = 50;
              return (
                <g
                  key={b.year}
                  opacity={b.year <= p.year ? 1 : 0.2}
                  data-year={b.year}
                >
                  <title>
                    {b.year}: {b.count}{" "}
                    {p.mode === "buildings" ? "building records" : "milestones"}
                  </title>
                  {b.segments.map((s) => {
                    const h = (s.count / max) * 44;
                    bottom -= h;
                    return (
                      <rect
                        key={s.color}
                        x={Math.max(0, b.year - FIRST_YEAR - 2)}
                        y={bottom}
                        width="4"
                        height={h}
                        fill={s.color}
                      />
                    );
                  })}
                </g>
              );
            })}
            <line
              x1={p.year - FIRST_YEAR}
              x2={p.year - FIRST_YEAR}
              y1="0"
              y2="52"
              stroke="#315f52"
              strokeWidth="1.5"
            />
          </svg>
          <input
            type="range"
            min={FIRST_YEAR}
            max={LAST_YEAR}
            step="1"
            value={p.year}
            disabled={!p.ready}
            aria-label={
              p.mode === "buildings"
                ? "Building date cutoff"
                : "Heritage milestone cutoff"
            }
            aria-valuetext={`${p.year}: ${revealed} of ${p.records.length} ${p.mode === "buildings" ? "dated buildings" : "milestones"}`}
            onChange={(e) => p.onYear(Number(e.target.value))}
          />
          <div className="chronology-ticks">
            <span>{FIRST_YEAR}</span>
            <span style={{ left: `${position(1600)}%` }}>1600</span>
            <span style={{ left: `${position(1900)}%` }}>1900</span>
            <span>Today</span>
          </div>
        </div>
        <div className="chronology-counter">
          <strong>{p.year === LAST_YEAR ? "Today" : p.year}</strong>
          <span>
            <b>{revealed.toLocaleString()}</b> /{" "}
            {p.records.length.toLocaleString()}{" "}
            {p.mode === "buildings" ? "dated buildings" : "milestones"}
          </span>
        </div>
      </div>
      <p className="chronology-note">
        {p.mode === "buildings"
          ? `${p.records.length.toLocaleString()} usable dates among ${p.total.toLocaleString()} matching footprints · ${p.unknown.toLocaleString()} undated. Undated context is not assigned a historical age.`
          : "Site milestones include construction starts, approximate dates and institution openings. They do not date surrounding buildings."}
        {p.reduced && " Reduced motion: use the year slider for static views."}
      </p>
    </section>
  );
}
