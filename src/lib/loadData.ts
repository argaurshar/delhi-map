// Revision of the derived attributes; the upstream snapshot date is unchanged.
export const DATA_REVISION = "2026-10-15-urban-details-1";
export async function loadCity(signal: AbortSignal) {
  const base = import.meta.env.BASE_URL;
  if (typeof DecompressionStream !== "undefined") {
    const response = await fetch(
      `${base}data/delhi.geojson.gz?v=${DATA_REVISION}`,
      { signal },
    );
    if (!response.ok || !response.body)
      throw new Error("The map download is unavailable.");
    // Some static servers advertise .gz files as an encoded JSON response;
    // fetch has already decoded those bodies before JavaScript sees them.
    if (response.headers.get("Content-Encoding")?.includes("gzip"))
      return response.json();
    return new Response(
      response.body.pipeThrough(new DecompressionStream("gzip")),
    ).json();
  }
  const response = await fetch(`${base}data/delhi.geojson?v=${DATA_REVISION}`, {
    signal,
  });
  if (!response.ok) throw new Error("The map download is unavailable.");
  return response.json();
}
