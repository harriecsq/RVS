export type TagLayer = "shipment" | "operational";
export type BookingType = "import" | "export" | "trucking";
export type TagGroup = "operations" | "documentation" | "financial" | "client";

export interface StatusTag {
  key: string;
  label: string;
  group: TagGroup;
  layer: TagLayer;
  appliesTo: BookingType[];
  color?: "danger";
}

export const TAG_GROUPS: { id: TagGroup; label: string }[] = [
  { id: "operations", label: "Operations / Movement" },
  { id: "documentation", label: "Documentation / Process" },
  { id: "financial", label: "Financial / Accounting" },
  { id: "client", label: "Client Handling" },
];

export const ALL_STATUS_TAGS: StatusTag[] = [
  { key: "draft", label: "Draft", group: "operations", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "awaiting-discharge", label: "Awaiting Discharge", group: "operations", layer: "shipment", appliesTo: ["import", "trucking"] },
  { key: "ready-gatepass", label: "For Delivery", group: "operations", layer: "shipment", appliesTo: ["import", "trucking"] },
  { key: "for-gatepass", label: "For Gatepass", group: "operations", layer: "shipment", appliesTo: ["import", "trucking"] },
  { key: "delivered", label: "Delivered", group: "operations", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "returned", label: "Returned", group: "operations", layer: "shipment", appliesTo: ["import", "trucking"] },
  { key: "cancelled", label: "Cancelled", group: "operations", layer: "shipment", appliesTo: ["import", "trucking"], color: "danger" },
  { key: "awaiting-stowage", label: "Awaiting Stowage", group: "documentation", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "awaiting-signed-docs", label: "Awaiting Signed Docs", group: "documentation", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "cro", label: "CRO", group: "documentation", layer: "shipment", appliesTo: ["import", "trucking"] },
  { key: "for-web", label: "For WEB", group: "documentation", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "for-debit", label: "For Debit", group: "financial", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "for-final", label: "For Final", group: "financial", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "for-lodgement", label: "For Lodgement", group: "financial", layer: "shipment", appliesTo: ["import", "export", "trucking"] },
  { key: "with-eta", label: "With ETA", group: "operations", layer: "shipment", appliesTo: ["export"] },
  { key: "without-eta", label: "Without ETA", group: "operations", layer: "shipment", appliesTo: ["export"] },
  { key: "awaiting-discharge-cro", label: "Awaiting Discharge & CRO", group: "operations", layer: "shipment", appliesTo: [] },
  { key: "with-stowage-discharged", label: "With Stowage / Discharged & Awaiting Signed Docs", group: "documentation", layer: "shipment", appliesTo: [] },
  { key: "for-debit-for-final", label: "For Debit For Final", group: "financial", layer: "shipment", appliesTo: [] },
];

const GROUP_ORDER: Record<TagGroup, number> = {
  operations: 0,
  documentation: 1,
  financial: 2,
  client: 3,
};

export function getTagsForType(bookingType: BookingType): StatusTag[] {
  return ALL_STATUS_TAGS.filter((tag) => tag.appliesTo.includes(bookingType));
}

export function getShipmentTags(bookingType: BookingType): StatusTag[] {
  return ALL_STATUS_TAGS.filter(
    (tag) => tag.layer === "shipment" && tag.appliesTo.includes(bookingType),
  );
}

export function getOperationalTags(bookingType: BookingType): StatusTag[] {
  return ALL_STATUS_TAGS.filter(
    (tag) => tag.layer === "operational" && tag.appliesTo.includes(bookingType),
  );
}

export function getTagByKey(key: string): StatusTag | undefined {
  return ALL_STATUS_TAGS.find((tag) => tag.key === key);
}

export type ComboKey = string; // sorted, pipe-joined tag slugs e.g. "cro|for-debit"
export interface ComboEntry { key: ComboKey; tags: string[]; count: number }

/** Produces a deterministic key from a tag array (sort + join). Empty → "(no tags)" */
export function getCombinationKey(tags: string[]): ComboKey {
  if (!tags || tags.length === 0) return "(no tags)";
  return [...tags].sort().join("|");
}

/** Human-readable label for a combo, e.g. "CRO • For Debit" */
export function formatCombinationLabel(tags: string[]): string {
  if (!tags || tags.length === 0) return "(No Tags)";
  return tags
    .slice()
    .sort()
    .map((k) => getTagByKey(k)?.label ?? k)
    .join(" • ");
}

/** Derive unique tag combos present in a booking list, sorted by count desc */
export function deriveCombos(bookings: { shipmentTags?: string[] }[]): ComboEntry[] {
  const map = new Map<ComboKey, { tags: string[]; count: number }>();
  for (const b of bookings) {
    const tags = Array.isArray(b.shipmentTags) ? b.shipmentTags : [];
    const key = getCombinationKey(tags);
    const entry = map.get(key);
    if (entry) { entry.count++; }
    else { map.set(key, { tags: tags.slice().sort(), count: 1 }); }
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, tags: v.tags, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

/** Returns summary string: "TAG1 • TAG2 +N" (max 2 visible) */
export function getStatusSummary(tagKeys: string[]): string {
  if (!tagKeys || tagKeys.length === 0) return "—";

  const sorted = [...tagKeys].sort((a, b) => {
    const ta = getTagByKey(a);
    const tb = getTagByKey(b);
    const ga = ta ? GROUP_ORDER[ta.group] : 99;
    const gb = tb ? GROUP_ORDER[tb.group] : 99;
    return ga - gb;
  });

  const labels = sorted.map((key) => {
    const tag = getTagByKey(key);
    return tag ? tag.label.toUpperCase() : key.toUpperCase();
  });

  if (labels.length <= 2) return labels.join(" • ");
  return `${labels[0]} • ${labels[1]} +${labels.length - 2}`;
}

