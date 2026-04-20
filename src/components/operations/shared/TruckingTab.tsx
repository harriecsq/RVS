/**
 * TruckingTab — embedded tab inside Import/Export booking details.
 * Shows a table list of all trucking records for this booking (1 per container).
 * When multiple segments exist (export with province), groups records by segment.
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
import type { BookingSegment } from "../../../types/operations";

interface TruckingTabProps {
  bookingId: string;
  bookingType: string;
  currentUser?: { name: string; email: string; department: string } | null;
  onBookingTagsUpdated?: () => void;
  segmentId?: string;
  segments?: BookingSegment[];
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

function RecordTable({
  records,
  onSelectRecord,
}: {
  records: TruckingRecord[];
  onSelectRecord: (r: TruckingRecord) => void;
}) {
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

            return (
              <tr
                key={r.id}
                onClick={() => onSelectRecord(r)}
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
  );
}

export function TruckingTab({
  bookingId,
  bookingType,
  currentUser,
  onBookingTagsUpdated,
  segmentId,
  segments,
  externalEdit,
  onEditStateChange,
  onRecordSelected,
  externalSaveCounter,
}: TruckingTabProps) {
  const [records, setRecords] = useState<TruckingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TruckingRecord | null>(null);
  const [createPrefillSegmentId, setCreatePrefillSegmentId] = useState<string | undefined>(undefined);

  const isGrouped = segments && segments.length > 1;

  useEffect(() => {
    fetchRecords();
  }, [bookingId, segmentId]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      // When grouped (multi-segment), fetch ALL records; otherwise filter by segment
      const segParam = (!isGrouped && segmentId) ? `&segmentId=${segmentId}` : "";
      const res = await fetch(
        `${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}${segParam}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const data = result.data;
        data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setRecords(data);
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
    setCreatePrefillSegmentId(undefined);
    fetchRecords();
    toast.success("Trucking record saved");
  };

  const handleSelectRecord = (r: TruckingRecord) => {
    setSelectedRecord(r);
    onRecordSelected?.(true);
  };

  const handleOpenCreate = (prefillSeg?: string) => {
    setCreatePrefillSegmentId(prefillSeg);
    setShowCreate(true);
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
          onClose={() => { setShowCreate(false); setCreatePrefillSegmentId(undefined); }}
          onSaved={handleSaved}
          prefillBookingId={bookingId}
          prefillBookingType={bookingType}
          prefillSegmentId={createPrefillSegmentId || segmentId}
          segments={segments}
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

  // Group records by segment when multi-segment
  const sortedSegments = isGrouped
    ? [...segments].sort((a, b) => (a.legOrder || 0) - (b.legOrder || 0))
    : null;

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
          onClick={() => handleOpenCreate(undefined)}
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

      {/* Grouped view (multi-segment) */}
      {sortedSegments ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {sortedSegments.map((seg) => {
            const segRecords = records.filter((r) => r.linkedSegmentId === seg.segmentId);
            return (
              <div key={seg.segmentId}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#0A1D4D",
                    }}>
                      {seg.segmentLabel}
                    </span>
                    <span style={{
                      fontSize: "12px",
                      color: "#667085",
                      fontWeight: 500,
                    }}>
                      ({segRecords.length} record{segRecords.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreate(seg.segmentId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      background: "#FFFFFF",
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                {segRecords.length === 0 ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "80px",
                    border: "1px dashed #D1D5DB",
                    borderRadius: "10px",
                    backgroundColor: "#FAFBFC",
                  }}>
                    <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
                      No trucking records for {seg.segmentLabel}
                    </p>
                  </div>
                ) : (
                  <RecordTable records={segRecords} onSelectRecord={handleSelectRecord} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat view (single segment or no segments) */
        <>
          {records.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px" }}>
              <Truck size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No trucking records</p>
              <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>
                Add trucking assignments for each container.
              </p>
            </div>
          ) : (
            <RecordTable records={records} onSelectRecord={handleSelectRecord} />
          )}
        </>
      )}

      {/* Create Modal */}
      <CreateTruckingModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreatePrefillSegmentId(undefined); }}
        onSaved={handleSaved}
        prefillBookingId={bookingId}
        prefillBookingType={bookingType}
        prefillSegmentId={createPrefillSegmentId || segmentId}
        segments={segments}
      />
    </div>
  );
}
