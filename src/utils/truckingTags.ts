// Trucking tag definitions, vendor list, and utility helpers

export interface TruckingTag {
  key: string;
  label: string;
  group: "operations" | "documentation" | "financial" | "client";
}

export const TRUCKING_TAG_GROUPS: { id: TruckingTag["group"]; label: string }[] = [
  { id: "operations", label: "Operations / Movement" },
  { id: "documentation", label: "Documentation / Process" },
  { id: "financial", label: "Financial / Accounting" },
  { id: "client", label: "Client Handling" },
];

export const ALL_TRUCKING_TAGS: TruckingTag[] = [
  // Operations / Movement
  { key: "awaiting-discharge", label: "Awaiting Discharge", group: "operations" },
  { key: "ready-gatepass", label: "Ready Gatepass / For Delivery", group: "operations" },
  { key: "for-gatepass", label: "For Gatepass", group: "operations" },
  { key: "awaiting-trucking", label: "Awaiting Trucking", group: "operations" },
  { key: "checking-trucking", label: "Checking Trucking", group: "operations" },
  { key: "looking-truck", label: "Looking for a Truck", group: "operations" },
  { key: "requesting-rates", label: "Requesting Rates", group: "operations" },
  { key: "delivered", label: "Delivered", group: "operations" },
  { key: "booked", label: "Booked", group: "operations" },
  { key: "schedule", label: "Schedule", group: "operations" },
  { key: "re-schedule", label: "Re-Schedule", group: "operations" },
  // Documentation / Process
  { key: "awaiting-signed-docs", label: "Awaiting Signed Docs", group: "documentation" },
  { key: "awaiting-stowage", label: "Awaiting Stowage", group: "documentation" },
  { key: "awaiting-address", label: "Awaiting Address", group: "documentation" },
  { key: "awaiting-schedule", label: "Awaiting Schedule", group: "documentation" },
  { key: "for-web", label: "For WEB", group: "documentation" },
  { key: "cro", label: "CRO", group: "documentation" },
  // Financial / Accounting
  { key: "for-debit", label: "For Debit", group: "financial" },
  { key: "for-final", label: "For Final", group: "financial" },
  { key: "for-lodgement", label: "For Lodgement", group: "financial" },
  // Client Handling
  { key: "client-will-handle", label: "Client Will Handle", group: "client" },
  { key: "client-will-handle-trucking", label: "Client Will Handle the Trucking", group: "client" },
];

/** Returns a status summary string: "TAG1 • TAG2 +N" (max 2 visible) */
export function getStatusSummary(tagKeys: string[]): string {
  if (!tagKeys || tagKeys.length === 0) return "—";

  // Sort by group order
  const groupOrder: Record<TruckingTag["group"], number> = {
    operations: 0,
    documentation: 1,
    financial: 2,
    client: 3,
  };

  const sorted = [...tagKeys].sort((a, b) => {
    const ta = ALL_TRUCKING_TAGS.find((t) => t.key === a);
    const tb = ALL_TRUCKING_TAGS.find((t) => t.key === b);
    const ga = ta ? groupOrder[ta.group] : 99;
    const gb = tb ? groupOrder[tb.group] : 99;
    return ga - gb;
  });

  const labels = sorted.map((k) => {
    const tag = ALL_TRUCKING_TAGS.find((t) => t.key === k);
    return tag ? tag.label.toUpperCase() : k.toUpperCase();
  });

  if (labels.length <= 2) return labels.join(" • ");
  return `${labels[0]} • ${labels[1]} +${labels.length - 2}`;
}

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

export const CONTAINER_SIZES = ["20GP", "40HC", "40RH"];

export const SECTION_OPTIONS = ["1A", "1B", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];

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