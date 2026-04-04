// Trucking tag definitions, vendor list, and utility helpers
import {
  ALL_STATUS_TAGS,
  TAG_GROUPS,
  getStatusSummary,
  type StatusTag,
} from "./statusTags";

// Backward compatibility aliases
export type TruckingTag = StatusTag;
export const TRUCKING_TAG_GROUPS = TAG_GROUPS;
export const ALL_TRUCKING_TAGS = ALL_STATUS_TAGS.filter((tag) =>
  tag.appliesTo.includes("trucking"),
);
export { getStatusSummary };

export interface TruckingVendor {
  name: string;
  hex: string;
}

export const TRUCKING_VENDORS: TruckingVendor[] = [
  { name: "ANTZ", hex: "#674EA7" },
  { name: "AMFRA", hex: "#EA4335" },
  { name: "GERGON", hex: "#4285F4" },
  { name: "E.B", hex: "#34A853" },
  { name: "THREEONEFIVE", hex: "#FF9900" },
  { name: "XTC", hex: "#FBBC04" },
  { name: "MALVHINCHEN", hex: "#BF9000" },
  { name: "JEFMEL", hex: "#1155CC" },
  { name: "CPR", hex: "#999999" },
  { name: "GREENTHUMB", hex: "#46BDC6" },
  { name: "ASBS", hex: "#FF00FF" },
  { name: "RSR MAX", hex: "#AEEB3A" },
  { name: "ONTIME", hex: "#8E7CC3" },
  { name: "MCA", hex: "#E978B2" },
  { name: "LRG", hex: "#CFE2F3" },
  { name: "AGARU", hex: "#F9CB9C" },
  { name: "RFKM", hex: "#B6D7A8" },
  { name: "DTDC", hex: "#45818E" },
  { name: "AG BAGUIO", hex: "#EA9999" },
  { name: "WENG", hex: "#EFE1C6" },
  { name: "ARS", hex: "#E06666" },
];

export const EMPTY_RETURN_OPTIONS = [
  "MIP",
  "ATI",
  "CY",
  "Pre-Advice MIP",
  "Pre-Advice ATI",
  "Pre-Advice CY",
  "For Reuse",
  "Reuse",
  "Client Own Container",
];

/** @deprecated Use CONTAINER_SIZE_OPTIONS + CONTAINER_TYPE_OPTIONS instead */
export const CONTAINER_SIZES = ["20GP", "40HC", "40RH"];

export const CONTAINER_SIZE_OPTIONS = ["20", "40"] as const;
export const CONTAINER_TYPE_OPTIONS = ["HQ", "HC", "RF", "GP", "SD"] as const;

/** Build display string from size + type, e.g. "40'HC" */
export function formatContainerVolume(size: string, type: string): string {
  if (!size && !type) return "";
  return `${size}'${type}`;
}

/** Parse a volume string like "40'HC" or legacy "40HC" into { size, type } */
export function parseContainerVolume(volume: string): { size: string; type: string } {
  if (!volume) return { size: "", type: "" };
  // Handle new format: "40'HC"
  if (volume.includes("'")) {
    const [size, type] = volume.split("'");
    return { size, type };
  }
  // Handle legacy format: "40HC", "20GP", "40RH"
  const match = volume.match(/^(\d+)(.+)$/);
  if (match) return { size: match[1], type: match[2] };
  return { size: "", type: volume };
}

export const SECTION_OPTIONS = [
  "1A",
  "1B",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
];

export const SHIPPING_LINE_OPTIONS = [
  "SINOTRANS",
  "TS LINE",
  "NINGBO/NOS",
  "CMA",
  "COSCO",
  "OOCL",
  "WANHAI",
  "ASL",
  "HMM",
  "EVERGREEN",
  "FOX LOGISTIC",
  "MACRO OCEAN",
  "STAR CONCORD",
  "BENLINE",
  "INTERASIA",
  "GSL",
  "SIMBA LOGISTIC",
  "PANDA LOGISTIC",
  "SITC",
  "EXCELSIOR LOGISTIC",
];

export const DISPATCHER_LIST = [
  "Ana Reyes",
  "Ben Santos",
  "Carlo Dela Cruz",
  "Diana Lim",
  "Edwin Bautista",
  "Fe Ramos",
  "Grace Villanueva",
  "Henry Torres",
  "Iris Mendoza",
  "Jose Garcia",
];

export const GATEPASS_LIST = [
  "Ana Reyes",
  "Ben Santos",
  "Carlo Dela Cruz",
  "Diana Lim",
  "Edwin Bautista",
  "Fe Ramos",
  "Grace Villanueva",
  "Henry Torres",
  "Iris Mendoza",
  "Jose Garcia",
];

/** Convert hex to rgba */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

