import { FilterSingleDropdown } from "./FilterSingleDropdown";

/**
 * Leg picker for export bookings that carry province segments.
 *
 * Self-hiding: returns null unless the booking is an export with at least one
 * province leg — so import vouchers and single-leg exports never see a control.
 *
 * A leg is a *view* of the linked booking (which segment's fields you're
 * billing), so this lives with the booking data, not as a standalone form field.
 */

interface Leg {
  id: string;
  label: string;
}

interface LegSelectorProps {
  /** The selected booking (full record with optional `segments`). */
  booking: any;
  /** Current leg id — "Manila" or a segment's segmentId. */
  value: string;
  onChange: (legId: string) => void;
  /** Optional label shown above the control. */
  label?: string;
}

export function deriveLegs(booking: any): Leg[] {
  const isExport =
    booking?.shipmentType?.toLowerCase().includes("export") ||
    booking?.type?.toLowerCase().includes("export");
  if (!isExport) return [];

  const segments: any[] = Array.isArray(booking?.segments) ? booking.segments : [];
  const provinceLegs = segments.filter(
    (s: any) => typeof s?.segmentLabel === "string" && s.segmentLabel.startsWith("Province"),
  );
  if (provinceLegs.length === 0) return [];

  return [
    { id: "Manila", label: "Manila" },
    ...provinceLegs.map((s: any) => ({ id: s.segmentId, label: s.segmentLabel })),
  ];
}

export function LegSelector({ booking, value, onChange, label = "Leg" }: LegSelectorProps) {
  const legs = deriveLegs(booking);
  if (legs.length < 2) return null; // no real choice → render nothing

  return (
    <div style={{ marginBottom: "16px" }}>
      {label && (
        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
          {label}
        </div>
      )}
      <FilterSingleDropdown
        value={value}
        onChange={onChange}
        preserveCase
        placeholder="Select leg"
        options={legs.map((leg) => ({ value: leg.id, label: leg.label }))}
        style={{ width: "220px" }}
      />
    </div>
  );
}
