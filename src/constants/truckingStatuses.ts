export const TRUCKING_STATUS_OPTIONS = [
  "Awaiting Trucking",
  "Checking Trucking",
  "Looking for a Truck",
  "Requesting Rates",
  "Booked",
  "Schedule",
  "Re-Schedule",
  "Awaiting Address",
  "Awaiting Schedule",
  "In Transit",
  "Unloading Start",
  "Unloading End",
  "Delivered",
  "Client Will Handle",
] as const;

export type TruckingStatus = (typeof TRUCKING_STATUS_OPTIONS)[number];

export const DEFAULT_TRUCKING_STATUS: TruckingStatus = "Awaiting Trucking";

/** Statuses that cycle per delivery drop */
export const DROP_CYCLE_STATUSES = ["In Transit", "Unloading Start", "Unloading End"] as const;

/** Color map for HeaderStatusDropdown display */
export const TRUCKING_STATUS_COLORS: Record<string, string> = {
  "Awaiting Trucking": "#6B7A76",
  "Checking Trucking": "#4285F4",
  "Looking for a Truck": "#FF6D01",
  "Requesting Rates": "#FBBC04",
  Booked: "#0F766E",
  Schedule: "#10B981",
  "Re-Schedule": "#EA4335",
  "Awaiting Address": "#9900FF",
  "Awaiting Schedule": "#0E7490",
  "In Transit": "#2563EB",
  "Unloading Start": "#D97706",
  "Unloading End": "#16A34A",
  Delivered: "#059669",
  "Client Will Handle": "#64748B",
};

export const EXPORT_TRUCKING_STATUS_OPTIONS = [
  "For Pullout",
  "For TABS (Pick Up)",
  "For TABS (Drop Off)",
  "In Transit to the Warehouse",
  "Arrived at Warehouse",
  "Awaiting for Loading",
  "Ongoing Loading",
  "In Transit to Port",
  "For Pre-Advise",
  "Awaiting for Pre-Advise Approval",
  "In Yard",
] as const;

export type ExportTruckingStatus = (typeof EXPORT_TRUCKING_STATUS_OPTIONS)[number];

export const DEFAULT_EXPORT_TRUCKING_STATUS: ExportTruckingStatus = "For Pullout";

export const EXPORT_TRUCKING_STATUS_COLORS: Record<string, string> = {
  "For Pullout": "#6B7A76",
  "For TABS (Pick Up)": "#4285F4",
  "For TABS (Drop Off)": "#0E7490",
  "In Transit to the Warehouse": "#2563EB",
  "Arrived at Warehouse": "#10B981",
  "Awaiting for Loading": "#FBBC04",
  "Ongoing Loading": "#D97706",
  "In Transit to Port": "#0F766E",
  "For Pre-Advise": "#9900FF",
  "Awaiting for Pre-Advise Approval": "#B45309",
  "In Yard": "#16A34A",
};

export function isExportLinkedTrucking(linkedBookingType?: string): boolean {
  return (linkedBookingType || "").toLowerCase().includes("export");
}

export function getTruckingStatusOptions(linkedBookingType?: string): readonly string[] {
  return isExportLinkedTrucking(linkedBookingType)
    ? EXPORT_TRUCKING_STATUS_OPTIONS
    : TRUCKING_STATUS_OPTIONS;
}

export function getTruckingStatusColors(linkedBookingType?: string): Record<string, string> {
  return isExportLinkedTrucking(linkedBookingType)
    ? EXPORT_TRUCKING_STATUS_COLORS
    : TRUCKING_STATUS_COLORS;
}

export function getDefaultTruckingStatus(linkedBookingType?: string): string {
  return isExportLinkedTrucking(linkedBookingType)
    ? DEFAULT_EXPORT_TRUCKING_STATUS
    : DEFAULT_TRUCKING_STATUS;
}
