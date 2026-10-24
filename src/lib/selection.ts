import type { ExpressionSpecification } from "maplibre-gl";
import { buildingYear } from "./buildings";
import {
  FIRST_YEAR,
  LAST_YEAR,
  PERIODS,
  inPeriod,
  type PeriodId,
  type TimelineMode,
} from "./chronology";
import { matchesSize } from "./data";
import {
  ACCESS_CATEGORIES,
  USE_CATEGORIES,
  matchesResearch,
  type ResearchFilters,
} from "./urban";
import type { CityFeature, SizeFilter } from "./types";

/** Building eligibility shared by the visible map and explicit filtered research.
 * Context palettes and layer visibility do not change record eligibility.
 * The heritage timeline controls site markers, not building construction dates.
 */
export interface FilterSelection {
  research: ResearchFilters;
  size: SizeFilter;
  year: number;
  timelineMode: TimelineMode;
  period: PeriodId | null;
  showUnknown: boolean;
}

export function matchesSelection(
  feature: CityFeature,
  selection: FilterSelection,
): boolean {
  if (
    feature.properties.kind !== "building" ||
    !matchesSize(feature.properties, selection.size) ||
    !matchesResearch(feature, selection.research)
  )
    return false;
  const year = buildingYear(feature);
  if (!inPeriod(year, selection.period)) return false;
  if (selection.timelineMode === "buildings") {
    if (year === null)
      return selection.showUnknown && selection.period === null;
    return year <= selection.year;
  }
  return true;
}

/** Whether research controls are at their unrestricted defaults. Actual dates
 * can lie outside the supported timeline, so this is not a cache-validity test.
 * Size is separate because the overview has exact precomputed size bins. */
export function isUnfilteredSelection(selection: FilterSelection): boolean {
  return (
    selection.research.use === "all" &&
    selection.research.access === "all" &&
    selection.research.yearFrom <= FIRST_YEAR &&
    selection.period === null &&
    (selection.timelineMode === "heritage" ||
      (selection.year === LAST_YEAR && selection.showUnknown))
  );
}

export function selectionExpression(
  selection: FilterSelection,
): ExpressionSpecification {
  const { research, size, year, timelineMode, period, showUnknown } = selection;
  const filters: ["all", ...ExpressionSpecification[]] = [
    "all",
    ["==", ["get", "kind"], "building"],
  ];
  if (research.use !== "all")
    filters.push(["==", ["get", "use_class"], research.use]);
  if (research.access !== "all")
    filters.push(["==", ["get", "access_class"], research.access]);
  filters.push([
    "any",
    ["==", ["get", "recorded_year"], null],
    [">=", ["get", "recorded_year"], research.yearFrom],
  ]);
  const footprint: ExpressionSpecification = [
    "coalesce",
    ["get", "area_m2"],
    0,
  ];
  if (size === "small") filters.push(["<", footprint, 100]);
  if (size === "medium")
    filters.push([">=", footprint, 100], ["<", footprint, 500]);
  if (size === "large") filters.push([">=", footprint, 500]);
  if (timelineMode === "buildings") {
    const dates: ["any", ...ExpressionSpecification[]] = [
      "any",
      [
        "all",
        ["!=", ["get", "recorded_year"], null],
        ["<=", ["get", "recorded_year"], year],
      ],
    ];
    if (showUnknown && !period)
      dates.push(["==", ["get", "recorded_year"], null]);
    filters.push(dates);
  }
  if (period) {
    const interval = PERIODS.find((p) => p.id === period)!;
    filters.push(
      ["!=", ["get", "recorded_year"], null],
      [">=", ["get", "recorded_year"], interval.start],
      ["<=", ["get", "recorded_year"], interval.end],
    );
  }
  return filters;
}

export function selectionDescription(selection: FilterSelection): string {
  const use =
    USE_CATEGORIES.find((c) => c.id === selection.research.use)?.label ??
    "All uses";
  const access =
    ACCESS_CATEGORIES.find((c) => c.id === selection.research.access)?.label ??
    "All access records";
  const period =
    PERIODS.find((p) => p.id === selection.period)?.label ?? "All periods";
  const upper =
    selection.timelineMode === "buildings"
      ? selection.year
      : "no upper building-date limit";
  const unknown =
    selection.period ||
    (selection.timelineMode === "buildings" && !selection.showUnknown)
      ? "undated excluded"
      : "undated included";
  return `${use}; ${access}; footprint ${selection.size}; built ${selection.research.yearFrom}–${upper}; ${period}; ${unknown}`;
}
