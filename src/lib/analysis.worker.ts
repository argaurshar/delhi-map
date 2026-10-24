import { analyse, analyseOverviewSelection } from "./analysis";
import type { FilterSelection } from "./selection";
import type { CityData, SizeFilter, StudyArea, Overview } from "./types";
let data: CityData;
self.onmessage = (
  event: MessageEvent<{
    id: number;
    data?: CityData;
    area: StudyArea;
    size: SizeFilter;
    selection?: FilterSelection | null;
    overview?: Overview | null;
  }>,
) => {
  const message = event.data;
  if (message.data) data = message.data;
  try {
    self.postMessage({
      id: message.id,
      result:
        message.overview && message.selection
          ? analyseOverviewSelection(
              data,
              message.overview,
              message.size,
              message.selection,
            )
          : analyse(data, message.area, message.size, message.selection),
    });
  } catch (error) {
    self.postMessage({
      id: message.id,
      error: error instanceof Error ? error.message : "Analysis failed",
    });
  }
};
