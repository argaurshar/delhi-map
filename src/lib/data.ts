import type {
  Heritage,
  StudyArea,
  Layers,
  Properties,
  SizeFilter,
} from "./types";
export const DEFAULT_LAYERS: Layers = {
  buildings: true,
  heritage: true,
  transit: false,
  landscape: true,
  streets: true,
};
export const BOUNDS: [number, number, number, number] = [
  77.2025, 28.618, 77.255, 28.677,
];
export const rectangle = (b: number[]): StudyArea => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [b[0], b[1]],
        [b[2], b[1]],
        [b[2], b[3]],
        [b[0], b[3]],
        [b[0], b[1]],
      ],
    ],
  },
});
export const PILOT = rectangle(BOUNDS);
export const AREAS = [
  {
    id: "pilot",
    name: "Whole pilot",
    subtitle: "Central Delhi",
    coords: [77.2268, 28.648] as [number, number],
    zoom: 13.7,
    area: PILOT,
  },
  {
    id: "old-delhi",
    name: "Shahjahanabad",
    subtitle: "Old Delhi study window",
    coords: [77.2318, 28.6524] as [number, number],
    zoom: 15.0,
    area: rectangle([77.216, 28.645, 77.246, 28.6615]),
  },
  {
    id: "connaught",
    name: "Connaught Place",
    subtitle: "Central Delhi study window",
    coords: [77.2185, 28.6328] as [number, number],
    zoom: 15.5,
    area: rectangle([77.209, 28.625, 77.23, 28.64]),
  },
];
export const HERITAGE: Heritage[] = [
  {
    id: "red-fort",
    name: "Red Fort",
    hindi: "लाल क़िला",
    coords: [77.241, 28.6562],
    year: 1648,
    period: "Mughal Delhi",
    type: "Fort complex",
    dateLabel: "Completed 1648",
    story:
      "Commissioned by Shah Jahan, the Red Fort anchored the new capital of Shahjahanabad. Its palaces, gardens and ceremonial spaces connect the walled city to the former riverfront. Read it alongside the streets and markets that grew around the imperial centre.",
    source: "https://whc.unesco.org/en/list/231/",
    sourceName: "UNESCO · Red Fort Complex",
  },
  {
    id: "jama-masjid",
    name: "Jama Masjid",
    hindi: "जामा मस्जिद",
    coords: [77.2334, 28.6507],
    year: 1656,
    period: "Mughal Delhi",
    type: "Mosque",
    dateLabel: "Completed 1656",
    story:
      "Shah Jahan’s congregational mosque occupies an elevated position in the walled city. The large courtyard, gateways and surrounding lanes offer a useful reading of monument scale against the finer grain of Shahjahanabad.",
    source: "https://en.wikipedia.org/wiki/Jama_Masjid,_Delhi",
    sourceName: "Wikipedia · Jama Masjid, Delhi",
  },
  {
    id: "fatehpuri",
    name: "Fatehpuri Masjid",
    hindi: "फ़तेहपुरी मस्जिद",
    coords: [77.222, 28.6566],
    year: 1650,
    period: "Mughal Delhi",
    type: "Mosque",
    dateLabel: "Built 1650",
    story:
      "At the western end of Chandni Chowk, Fatehpuri Masjid forms a major spatial anchor opposite the Red Fort. Its setting is especially useful for studying the relationship between religious institutions, commercial streets and public space.",
    source: "https://en.wikipedia.org/wiki/Fatehpuri_Mosque",
    sourceName: "Wikipedia · Fatehpuri Mosque",
  },
  {
    id: "town-hall",
    name: "Delhi Town Hall",
    hindi: "टाउन हॉल",
    coords: [77.2287, 28.6573],
    year: 1863,
    period: "Colonial Delhi",
    type: "Civic building",
    dateLabel: "Completed 1863",
    story:
      "The Town Hall introduced a colonial civic institution into the established fabric of Chandni Chowk. Its open foreground and formal frontage provide a contrasting urban condition within the dense commercial district.",
    source: "https://en.wikipedia.org/wiki/Delhi_Town_Hall",
    sourceName: "Wikipedia · Delhi Town Hall",
  },
  {
    id: "connaught-place",
    name: "Connaught Place",
    hindi: "कनॉट प्लेस",
    coords: [77.2185, 28.6328],
    year: 1933,
    period: "Colonial Delhi",
    type: "Commercial precinct",
    dateLabel: "Completed 1933",
    story:
      "Designed as a commercial centre for New Delhi, Connaught Place uses concentric rings, radial streets and continuous colonnades. Compare its large, regular blocks with the smaller and less regular street network of Shahjahanabad.",
    source: "https://en.wikipedia.org/wiki/Connaught_Place,_New_Delhi",
    sourceName: "Wikipedia · Connaught Place",
  },
  {
    id: "jantar-mantar",
    name: "Jantar Mantar",
    hindi: "जंतर मंतर",
    coords: [77.2166, 28.6271],
    year: 1724,
    period: "Early modern Delhi",
    type: "Observatory",
    dateLabel: "Built 1724",
    story:
      "Jai Singh II’s astronomical observatory turns measurement into architecture. Its masonry instruments occupy an open site within today’s central city, offering a distinctive contrast between scientific landscape and surrounding urban development.",
    source: "https://en.wikipedia.org/wiki/Jantar_Mantar,_New_Delhi",
    sourceName: "Wikipedia · Jantar Mantar, New Delhi",
  },
  {
    id: "sacred-heart",
    name: "Sacred Heart Cathedral",
    hindi: "सेक्रेड हार्ट कैथेड्रल",
    coords: [77.2066, 28.6288],
    year: 1935,
    period: "Colonial Delhi",
    type: "Cathedral",
    dateLabel: "Completed 1935",
    story:
      "The cathedral is part of the institutional landscape of central New Delhi. Its formal approach, planted grounds and church building provide a counterpoint to the nearby commercial centre and government precincts.",
    source: "https://en.wikipedia.org/wiki/Sacred_Heart_Cathedral,_New_Delhi",
    sourceName: "Wikipedia · Sacred Heart Cathedral",
  },
];
export const matchesSize = (p: Properties, size: SizeFilter) =>
  size === "all" ||
  (size === "small"
    ? (p.area_m2 ?? 0) < 100
    : size === "medium"
      ? (p.area_m2 ?? 0) >= 100 && (p.area_m2 ?? 0) < 500
      : (p.area_m2 ?? 0) >= 500);
export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(n);
