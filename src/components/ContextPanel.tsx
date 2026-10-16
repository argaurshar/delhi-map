import { useEffect, useMemo, useRef } from "react";
import { CONTEXTS, contextCategory, type ContextId } from "../lib/chronology";
import type { CityFeature } from "../lib/types";
export function ContextPanel({
  context,
  onContext,
  features,
}: {
  context: ContextId;
  onContext: (id: ContextId) => void;
  features: CityFeature[];
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (context !== "none")
      section.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [context]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        CONTEXTS.map((c) => {
          const categories: Record<string, number> = {};
          let total = 0;
          for (const f of features) {
            const category = contextCategory(f, c.id);
            if (category) {
              total++;
              categories[category] = (categories[category] ?? 0) + 1;
            }
          }
          return [c.id, { total, categories }];
        }),
      ),
    [features],
  );
  const active = CONTEXTS.find((c) => c.id === context)!;
  return (
    <section
      ref={section}
      className="building-context"
      aria-label="Building context lenses"
    >
      <div className="section-heading">
        <span>BUILDING CONTEXT</span>
        <span>OSM tags</span>
      </div>
      {context === "none" ? (
        <div className="context-catalogue">
          {CONTEXTS.filter((c) => c.id !== "none").map((c) => (
            <button key={c.id} onClick={() => onContext(c.id)}>
              <span>{c.name}</span>
              <small>{counts[c.id].total.toLocaleString()}</small>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="context-description" key={context}>
          <button className="context-back" onClick={() => onContext("none")}>
            ← All building contexts
          </button>
          <h3>{active.name}</h3>
          <p>{active.description}</p>
          <div className="context-legend">
            {active.categories.map(([id, label, color]) => (
              <div key={id}>
                <i style={{ background: color }} />
                <span>{label}</span>
                <small>
                  {(counts[context].categories[id] ?? 0).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
          <p className="micro-note">
            Counts follow the footprint-size filter across the urban core. Other
            buildings stay neutral. Timeline counts use the matching dated
            records.
          </p>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap contributors · ODbL ↗
          </a>
        </div>
      )}
    </section>
  );
}
