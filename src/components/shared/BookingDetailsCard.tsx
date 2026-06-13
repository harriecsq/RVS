import { BookingSelector } from "../selectors/BookingSelector";
import { LegSelector } from "./LegSelector";

/**
 * Self-contained Booking Details card.
 *
 * Drop-in usage:
 *   <BookingDetailsCard entity={voucher} booking={linkedBooking} isEditing={isEditing}
 *     onSelectBooking={(b) => ...} />
 *
 * Shows EVERY booking field. To trim, just delete the <Row> you don't need.
 * Field precedence: saved snapshot on the entity → matching segment → live booking.
 */

interface BookingDetailsCardProps {
  /** The saved entity that carries the booking snapshot (voucher / expense / billing / trucking record). */
  entity?: any;
  /** The live linked booking fetched by bookingId (optional fallback source). */
  booking?: any;
  /** Segment/leg id on the entity, used to pick the matching export segment. */
  segmentId?: string | null;
  /** Leg label pill (e.g. "Manila" / "Province 1"). Falls back to entity.segmentLabel. */
  segmentLabel?: string;
  isEditing?: boolean;
  /** Selected bookingId for the picker (edit mode). */
  bookingValue?: string;
  /** Called when a booking is picked in edit mode. */
  onSelectBooking?: (booking: any | null) => void;
  /** Current leg id — "Manila" or a segment's segmentId (edit mode). */
  legValue?: string;
  /** Called when a leg is picked. Omit to hide the leg selector. */
  onLegChange?: (legId: string) => void;
  /** Trucking-only fields. Pass when you want the address + rate inputs shown. */
  trucking?: {
    deliveryAddress: string;
    loadingAddress: string;
    rate: string;
    onDeliveryAddressChange?: (v: string) => void;
    onLoadingAddressChange?: (v: string) => void;
    onRateChange?: (v: string) => void;
  };
}

/** Compute volume summary from containers: "2x40HC" */
function computeVolumeSummary(containerNo: string | string[], volume: string): string {
  if (!containerNo && !volume) return "—";
  let containerCount = 1;
  if (containerNo) {
    const containers = Array.isArray(containerNo)
      ? containerNo.filter(Boolean)
      : containerNo.split(",").map((s: string) => s.trim()).filter(Boolean);
    containerCount = Math.max(containers.length, 1);
  }
  if (!volume) return "—";
  if (volume.trim() === "LCL") return "LCL";
  return `${containerCount}x${volume}`;
}

/** Pure field resolver — snapshot wins, then segment, then live booking. */
function resolveShipment(entity: any, booking: any, segmentId?: string | null) {
  const b: any = booking || {};
  const v: any = entity || {};
  const segments: any[] = Array.isArray(b.segments) ? b.segments : [];
  const matchingSeg = segmentId ? segments.find((s: any) => s.segmentId === segmentId) : null;
  const seg: any = matchingSeg ?? (segments.length > 0 ? segments[0] : {});

  const voucherContainers: string[] = Array.isArray(v.containerNumbers)
    ? v.containerNumbers.filter(Boolean)
    : (typeof v.containerNumbers === "string"
        ? v.containerNumbers.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []);

  let containers: string[];
  if (voucherContainers.length > 0) {
    containers = voucherContainers;
  } else {
    const containerRaw = seg.containerNo ?? b.containerNo ?? b.containerNos ?? "";
    containers = Array.isArray(containerRaw)
      ? containerRaw.filter(Boolean)
      : (typeof containerRaw === "string" ? containerRaw.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
  }

  const bookingRef = b.bookingId || v.booking?.bookingId || v.bookingId || "";
  const typeRaw = (b.shipmentType || b.type || b.booking_type || "").toLowerCase();

  return {
    bookingRef,
    isExport: typeRaw.includes("export"),
    blNumber: v.blNumber ?? seg.blNumber ?? b.blNumber ?? "",
    vesselVoy: v.vesselVoy ?? seg.vesselVoyage ?? b.vesselVoyage ?? seg.vessel ?? b.vessel ?? "",
    origin: v.origin ?? seg.origin ?? b.origin ?? b.pol ?? b.pickup ?? "",
    destination: v.destination ?? seg.destination ?? b.destination ?? seg.pod ?? b.pod ?? "",
    shipper: v.shipper ?? seg.shipper ?? b.shipper ?? "",
    consignee: v.consignee ?? seg.consignee ?? b.consignee ?? "",
    volume: v.volume ?? seg.volume ?? b.volume ?? "",
    commodity: v.commodity ?? seg.commodity ?? b.commodity ?? "",
    containers,
  };
}

/** One label/value cell. */
function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
        {value || "—"}
      </div>
    </div>
  );
}

/** One editable input (used by trucking address/rate). */
function EditableInput({ label, value, readOnly, onChange, placeholder, weight }: {
  label: string; value: string; readOnly: boolean; onChange?: (v: string) => void; placeholder?: string; weight?: number;
}) {
  return (
    <div>
      <label style={{ fontSize: "13px", fontWeight: 500, color: "#667085", display: "block", marginBottom: "4px" }}>{label}</label>
      <input
        type="text"
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 14px", fontSize: "14px", border: "1px solid #E5E9F0", borderRadius: "8px",
          backgroundColor: readOnly ? "#F9FAFB" : "#FFFFFF", color: "#0A1D4D", fontWeight: weight ?? 400,
          outline: "none", boxSizing: "border-box", cursor: readOnly ? "default" : "text",
        }}
      />
    </div>
  );
}

export function BookingDetailsCard({
  entity,
  booking,
  segmentId,
  segmentLabel,
  isEditing = false,
  bookingValue = "",
  onSelectBooking,
  legValue = "",
  onLegChange,
  trucking,
}: BookingDetailsCardProps) {
  const s = resolveShipment(entity, booking, segmentId);
  const leg = segmentLabel ?? entity?.segmentLabel;

  return (
    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E9F0", overflow: "hidden" }}>
      {/* Header + optional leg pill */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB", display: "flex", alignItems: "center", gap: "8px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>Booking Details</h3>
        {leg && (
          <span style={{
            fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "999px",
            background: leg === "Manila" ? "#E8F2EE" : "#237F66",
            color: leg === "Manila" ? "#237F66" : "#FFFFFF",
            border: `1px solid ${leg === "Manila" ? "#BBF7D0" : "#1E6D59"}`,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            Leg: {leg}
          </span>
        )}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Booking picker — edit mode only */}
        {isEditing && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>Link to Booking</div>
            <BookingSelector
              value={bookingValue}
              onSelect={(b) => onSelectBooking?.(b)}
              placeholder="Search by Booking Ref, BL No, or Client..."
            />
            {bookingValue && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", marginTop: "8px" }}>
                Booking linked — fields auto-filled
              </div>
            )}
            {onLegChange && (
              <div style={{ marginTop: "16px" }}>
                <LegSelector booking={booking} value={legValue} onChange={onLegChange} />
              </div>
            )}
          </div>
        )}

        {/* ── ALL FIELDS. Delete any <Row> not needed. ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {!isEditing && <Row label="Linked Booking" value={s.bookingRef} />}
          <Row label="Shipper" value={s.shipper} />
          <Row label="Consignee" value={s.consignee} />
          <Row label="Vessel / Voyage" value={s.vesselVoy} />
          <Row label="BL Number" value={s.blNumber} />
          <Row label="Origin" value={s.origin} />
          <Row label="Destination" value={s.destination} />
          <Row label="Volume" value={computeVolumeSummary(s.containers, s.volume)} />
          <Row label="Container No" value={s.containers.join(", ")} />
          <Row label="Commodity" value={s.commodity} />
        </div>

        {/* Trucking-only: addresses + rate. Omit the `trucking` prop to hide. */}
        {trucking && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
            <EditableInput
              label={s.isExport ? "Loading Address" : "Delivery Address"}
              value={s.isExport ? trucking.loadingAddress : trucking.deliveryAddress}
              readOnly={!isEditing}
              onChange={s.isExport ? trucking.onLoadingAddressChange : trucking.onDeliveryAddressChange}
              placeholder={s.isExport ? "Enter loading address..." : "Enter delivery address..."}
            />
            <EditableInput
              label="Trucking Rate"
              value={trucking.rate}
              readOnly={!isEditing}
              onChange={trucking.onRateChange}
              placeholder="Enter rate..."
              weight={500}
            />
          </div>
        )}
      </div>
    </div>
  );
}
