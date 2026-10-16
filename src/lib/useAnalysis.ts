import { useEffect, useState } from "react";
import type { Analysis, CityData, SizeFilter, StudyArea } from "./types";
export function useAnalysis(
  data: CityData | null,
  area: StudyArea,
  size: SizeFilter,
  enabled = true,
) {
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!data || !enabled) {
      setResult(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    setResult(null);
    setError("");
    const worker = new Worker(
      new URL("./analysis.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event) => {
      if (event.data.error) setError(event.data.error);
      else setResult(event.data.result);
      setBusy(false);
    };
    worker.onerror = () => {
      setError("Analysis could not complete. Try a smaller study boundary.");
      setBusy(false);
    };
    worker.postMessage({ id: 1, data, area, size });
    return () => worker.terminate();
  }, [data, area, size, enabled]);
  return { result, busy, error };
}
