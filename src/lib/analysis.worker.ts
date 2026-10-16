import { analyse } from "./analysis";
import type { CityData, SizeFilter, StudyArea } from "./types";
let data: CityData;
self.onmessage = (
  event: MessageEvent<{
    id: number;
    data?: CityData;
    area: StudyArea;
    size: SizeFilter;
  }>,
) => {
  const message = event.data;
  if (message.data) data = message.data;
  try {
    self.postMessage({
      id: message.id,
      result: analyse(data, message.area, message.size),
    });
  } catch (error) {
    self.postMessage({
      id: message.id,
      error: error instanceof Error ? error.message : "Analysis failed",
    });
  }
};
