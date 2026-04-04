/**
 * TruckingTab — embedded tab inside Import/Export booking details.
 * Shows a table list of all trucking records for this booking (1 per container).
 * Clicking a row shows TruckingRecordDetails inline.
 */
import { useState, useEffect } from "react";
import { Plus, Truck } from "lucide-react";
import { publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "../../ui/toast-utils";
import { CreateTruckingModal } from "../CreateTruckingModal";
import { TruckingRecordDetails } from "../TruckingRecordDetails";
import type { TruckingRecord } from "../CreateTruckingModal";
import { TRUCKING_VENDORS, hexToRgba } from "../../../utils/truckingTags";
import { API_BASE_URL } from "@/utils/api-config";

interface TruckingTabProps {
  bookingId: string;
  bookingType: string;
  currentUser?: { name: string; email: string; department: string } | null;
  onBookingTagsUpdated?: () => void;
  segmentId?: string;
  externalEdit?: boolean;
  onEditStateChange?: (editing: boolean) => void;
  onRecordSelected?: (hasSelection: boolean) => void;
  externalSaveCounter?: number;
}

function VendorPill({ vendor }: { vendor: string }) {
  const v = TRUCKING_VENDORS.find((vv) => vv.name === vendor);
  if (!v) return <span style={{ fontSize: "13px", color: "#667085" }}>—</span>;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "5px",
      fontSize: "11px",
      fontWeight: 700,
      backgroundColor: hexToRgba(v.hex, 0.14),
      color: v.hex,
      border: `1px solid ${hexToRgba(v.hex, 0.36)}`,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap" as const,
    }}>
      {v.name}
    </span>
  );
}

export function TruckingTab({
  bookingId,
  bookingType,
  currentUser,
  onBookingTagsUpdated,
  segmentId,
  externalEdit,
  onEditStateChange,
  onRecordSelected,
  externalSaveCounter,
}: TruckingTabProps) {
  const [records, setRecords] = useState<TruckingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TruckingRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [bookingId, segmentId]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const segParam = segmentId ? `&segmentId=${segmentId}` : "";
      const res = await fetch(
        `${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}${segParam}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setRecords(result.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Error fetching trucking records:", err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaved = () => {
    setShowCreate(false);
    fetchRecords();
    toast.success("Trucking record saved");
  };

  // Detail view — show selected record inline
  if (selectedRecord) {
    return (
      <>
        <TruckingRecordDetails
          record={selectedRecord}
          onBack={() => {
            setSelectedRecord(null);
            fetchRecords();
            onRecordSelected?.(false);
          }}
          onUpdate={fetchRecords}
          currentUser={currentUser}
          embedded
          onBookingTagsUpdated={onBookingTagsUpdated}
          externalEdit={externalEdit}
          onEditStateChange={onEditStateChange}
          externalSaveCounter={externalSaveCounter}
        />
        <CreateTruckingModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
          prefillBookingId={bookingId}
          prefillBookingType={bookingType}
          prefillSegmentId={segmentId}
        />
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
        <p style={{ color: "#667085", fontSize: "14px" }}>Loading trucking records...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0A1D4D", margin: 0 }}>
            Trucking Records
          </h3>
          <p style={{ fontSize: "13px", color: "#667085", margin: "2px 0 0" }}>
            {records.length} record{records.length !== 1 ? "s" : ""} linked to this booking
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            border: "none",
            borderRadius: "8px",
            background: "#0F766E",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> New Trucking
        </button>
      </div>

      {/* Empty state */}
      {records.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px" }}>
          <Truck size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No trucking records</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>
            Add trucking assignments for each container.
          </p>
        </div>
      ) : (
        /* Table */
        <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E9F0", backgroundColor: "#F9FAFB" }}>
                {["Container #", "Size", "Vendor", "Driver / Plate", "Delivery Address", "Rate"].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#667085",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const containerNo = r.containerNo || (r as any).containers?.[0]?.containerNo || "—";
                const containerSize = r.containerSize || (r as any).containers?.[0]?.size || "—";
                const driverPlate = [r.driverHelperName, r.plateNo].filter(Boolean).join(" / ") || "—";
                const firstAddr = r.deliveryAddresses?.[0]?.address || r.truckingAddress || "—";
                const rate = r.truckingRate || "—";

                const cellStyle: React.CSSProperties = {
                  padding: "14px 16px",
                  fontSize: "13px",
                  color: "#0A1D4D",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "200px",
                };

                return (
                  <tr
                    key={r.id}
                    onClick={() => { setSelectedRecord(r); onRecordSelected?.(true); }}
                    style={{
                      borderBottom: "1px solid #E5E9F0",
                      cursor: "pointer",
                      transition: "background-color 120ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F8F9FB"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}
                  >
                    <td style={{ ...cellStyle, fontWeight: 600 }}>{containerNo}</td>
                    <td style={cellStyle}>{containerSize}</td>
                    <td style={{ ...cellStyle, overflow: "visible" }}>
                      <VendorPill vendor={r.truckingVendor} />
                    </td>
                    <td style={cellStyle}>{driverPlate}</td>
                    <td style={cellStyle} title={firstAddr !== "—" ? firstAddr : undefined}>{firstAddr}</td>
                    <td style={cellStyle}>{rate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateTruckingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={handleSaved}
        prefillBookingId={bookingId}
        prefillBookingType={bookingType}
      />
    </div>
  );
}
