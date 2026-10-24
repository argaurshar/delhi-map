import { useEffect, useMemo, useState } from "react";
import type {
  Analysis,
  CityData,
  SizeFilter,
  StudyArea,
  Overview,
} from "./types";
import type { FilterSelection } from "./selection";
import { overviewResult } from "./overview";

export function useAnalysis(
  data: CityData | null,
  area: StudyArea,
  size: SizeFilter,
  enabled = true,
  overview: Overview | null = null,
  selection: FilterSelection | null = null,
) {
  const request = useMemo(
    () => ({ data, area, size, enabled, overview, selection }),
    [data, area, size, enabled, overview, selection],
  );
  const [state, setState] = useState<{
    request: typeof request | null;
    result: Analysis | null;
    busy: boolean;
    error: string;
  }>({ request: null, result: null, busy: false, error: "" });
  useEffect(() => {
    if (!data || !enabled) {
      setState({ request, result: null, busy: false, error: "" });
      return;
    }
    setState({ request, result: null, busy: true, error: "" });
    // Only an unfiltered study can use overview statistics directly. A filtered
    // request always verifies the selected IDs in its worker, even at defaults.
    if (overview && !selection) {
      try {
        setState({
          request,
          result: overviewResult(data, overview, size),
          busy: false,
          error: "",
        });
      } catch (e) {
        setState({
          request,
          result: null,
          busy: false,
          error: e instanceof Error ? e.message : "Overview unavailable",
        });
      }
      return;
    }
    let active = true;
    let worker: Worker | undefined;
    const timer = window.setTimeout(() => {
      worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event) => {
        if (!active) return;
        setState({
          request,
          result: event.data.error ? null : event.data.result,
          busy: false,
          error: event.data.error ?? "",
        });
      };
      worker.onerror = () => {
        if (active)
          setState({
            request,
            result: null,
            busy: false,
            error: "Analysis could not complete. Try a smaller study boundary.",
          });
      };
      worker.postMessage({ id: 1, data, area, size, selection, overview });
    }, 160);
    return () => {
      active = false;
      window.clearTimeout(timer);
      worker?.terminate();
    };
  }, [request, data, area, size, enabled, overview, selection]);
  // Do not expose stale records during the render before effect cleanup runs.
  if (state.request !== request)
    return { result: null, busy: Boolean(data && enabled), error: "" };
  return { result: state.result, busy: state.busy, error: state.error };
}
