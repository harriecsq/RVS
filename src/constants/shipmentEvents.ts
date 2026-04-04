export const SHIPMENT_EVENT_KEYS = [
  "draft",
  "signed",
  "stowaged",
  "lodged",
  "final",
  "for-debit",
  "debited",
  "discharged",
  "cro",
  "web",
  "ready-gatepass",
  "delivered",
  "returned",
] as const;

export type ShipmentEventKey = (typeof SHIPMENT_EVENT_KEYS)[number];

export const SHIPMENT_EVENT_LABELS: Record<ShipmentEventKey, string> = {
  draft: "Draft",
  signed: "Signed",
  stowaged: "Stowaged",
  lodged: "Lodged",
  final: "Final",
  "for-debit": "For Debit",
  debited: "Debited",
  discharged: "Discharged",
  cro: "CRO",
  web: "WEB",
  "ready-gatepass": "Ready Gatepass",
  delivered: "Delivered",
  returned: "Returned",
};
