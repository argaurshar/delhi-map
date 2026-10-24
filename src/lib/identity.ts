import { buildingDate, buildingEvidence } from "./buildings";
import {
  featureAddress,
  featureName,
  useCategory,
  useDefinition,
} from "./urban";
import type { CityFeature } from "./types";

export type EvidenceState = "reviewed" | "recorded" | "estimated" | "missing";
export interface RecordField {
  id: string;
  label: string;
  state: EvidenceState;
  value: string;
}
const supplied = (value?: string | null): string | null => {
  const text = value?.trim();
  return !text || /^(unknown|unspecified|unrecorded)$/i.test(text)
    ? null
    : text;
};

function nameBasis(feature: CityFeature): string {
  const key = feature.properties.name_source;
  const labels: Record<string, string> = {
    name: "Recorded map name",
    "name:en": "English map name",
    "name:hi": "Hindi map name",
    official_name: "Official-name field in map record",
    "official_name:en": "English official-name field in map record",
    "official_name:hi": "Hindi official-name field in map record",
    short_name: "Short map name",
  };
  return key ? (labels[key] ?? `Map name field: ${key}`) : "Recorded map name";
}

/** Identity is an association check, not a certificate of accuracy or ownership. */
export function identityEvidence(feature: CityFeature) {
  const reviewed = buildingEvidence(feature);
  const name = featureName(feature);
  if (reviewed)
    return {
      level: "reviewed" as const,
      label: "Reviewed identity association",
      explanation:
        "This name, map record and location match a curated source entry. Individual facts retain their own sources and qualifications.",
      scope:
        reviewed.relationship === "part of site"
          ? "Individual structure within a wider site"
          : "Named building or memorial footprint",
      name,
      nameSource: nameBasis(feature),
    };
  return {
    level: name ? ("named" as const) : ("anonymous" as const),
    label: name ? "Contributor-recorded identity" : "Unnamed mapped outline",
    explanation: name
      ? "The name comes from this exact map record. Its association has not been independently reviewed for this atlas."
      : "No name is recorded for this outline. The source ID identifies it; an address, operator or nearby place does not establish its name.",
    scope: "Exact mapped feature; association unreviewed",
    name,
    nameSource: name ? nameBasis(feature) : "No recorded name",
  };
}

export function heightEvidence(feature: CityFeature) {
  const p = feature.properties;
  if (p.height_m == null || !Number.isFinite(p.height_m) || p.height_m <= 0)
    return {
      state: "missing" as const,
      label: "Display height only",
      value: "8 m display extrusion; actual height unknown",
      explanation:
        "The visual extrusion is excluded from height statistics and is not a building measurement.",
    };
  if (/^Estimated:/i.test(p.height_method))
    return {
      state: "estimated" as const,
      label: "Estimated from recorded storeys",
      value: `${p.height_m} m · storey estimate`,
      explanation: p.height_method,
    };
  return {
    state: "recorded" as const,
    label: "Contributor-recorded height",
    value: `${p.height_m} m · recorded tag`,
    explanation:
      "A source height tag is available. No independent survey or measurement accuracy is established by this atlas.",
  };
}

/** Field coverage is deliberately separate from identity assurance. */
export function recordEvidence(feature: CityFeature) {
  const p = feature.properties;
  const tags = p.tags ?? {};
  const isBuilding = ["building", "buildingpart", "building_part"].includes(
    p.kind,
  );
  const identity = identityEvidence(feature);
  const height = heightEvidence(feature);
  const date = buildingDate(feature);
  const field = (
    id: string,
    label: string,
    raw?: string | null,
  ): RecordField => {
    const value = supplied(raw);
    return {
      id,
      label,
      state: value ? "recorded" : "missing",
      value: value || "Not recorded",
    };
  };
  const fields: RecordField[] = [
    {
      id: "name",
      label: "Name",
      state: identity.name
        ? identity.level === "reviewed"
          ? "reviewed"
          : "recorded"
        : "missing",
      value: identity.name || "Not recorded",
    },
    field("address", "Address", featureAddress(feature)),
    ...(isBuilding
      ? [
          {
            id: "use",
            label: "Use",
            state:
              useCategory(feature) === "unknown"
                ? ("missing" as const)
                : ("recorded" as const),
            value: useDefinition(feature).label,
          },
          {
            id: "height",
            label: "Height",
            state: height.state,
            value: height.value,
          },
          field("storeys", "Storeys", p.levels),
          {
            id: "date",
            label: "Usable building year",
            state: !date
              ? ("missing" as const)
              : date.basis === "Reviewed source"
                ? ("reviewed" as const)
                : ("recorded" as const),
            value: date?.label || "No usable construction year",
          },
          field(
            "architect",
            "Architect",
            tags.architect ?? tags["building:architect"],
          ),
          field("roof", "Roof form", tags["roof:shape"]),
        ]
      : [
          field("surface", "Surface", tags.surface),
          field("opening_hours", "Opening hours", tags.opening_hours),
        ]),
    field("access", "Access rule", tags.access),
    field("ownership", "Ownership type", tags.ownership),
  ];
  return {
    identity,
    height,
    fields,
    available: fields.filter((f) => f.state !== "missing").length,
    missing: fields.filter((f) => f.state === "missing").map((f) => f.label),
    estimated: fields.filter((f) => f.state === "estimated").length,
    total: fields.length,
  };
}

/** Source type helps readers assess provenance; it does not verify every claim. */
export function sourceEvidence(source: { url: string; checked: string }) {
  let type = "Public reference";
  try {
    const url = new URL(source.url);
    if (!["https:", "http:"].includes(url.protocol)) type = "Unusable link";
    else if (/\.(gov|nic)\.in$/.test(url.hostname)) type = "Government portal";
    else if (url.hostname === "whc.unesco.org") type = "UNESCO heritage record";
    else if (url.hostname.endsWith(".wikipedia.org"))
      type = "Secondary reference";
  } catch {
    type = "Unusable link";
  }
  const checked = /^\d{4}-\d{2}-\d{2}$/.test(source.checked);
  return {
    type,
    checked,
    status: checked
      ? `Source checked ${source.checked}`
      : source.checked || "Check date not recorded",
  };
}
