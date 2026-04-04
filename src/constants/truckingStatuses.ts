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
  "Client Will Handle",
] as const;

export type TruckingStatus = (typeof TRUCKING_STATUS_OPTIONS)[number];

export const DEFAULT_TRUCKING_STATUS: TruckingStatus = "Awaiting Trucking";

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
  "Client Will Handle": "#64748B",
};
