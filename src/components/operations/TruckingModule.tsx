/**
 * TruckingModule — Operations > Trucking list screen.
 * Identical layout pattern to ImportBookings / ExportBookings.
 */
import { useState, useEffect } from "react";
import { Plus, Search, Truck } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { CreateTruckingModal } from "./CreateTruckingModal";
import { TruckingRecordDetails } from "./TruckingRecordDetails";
import type { TruckingRecord } from "./CreateTruckingModal";
import {
  TRUCKING_VENDORS,
  hexToRgba,
} from "../../utils/truckingTags";
import {
  TRUCKING_STATUS_OPTIONS,
  TRUCKING_STATUS_COLORS,
  DROP_CYCLE_STATUSES,
  EXPORT_TRUCKING_STATUS_OPTIONS,
  getTruckingStatusColors,
} from "../../constants/truckingStatuses";

import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { StandardFilterDropdown } from "../design-system/StandardFilterDropdown";
import { API_BASE_URL } from '@/utils/api-config';



// ---- Vendor Pill ----
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


// ---- Date formatting ----
function fmtDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${m}/${d}/${y}`;
}

function fmtUpdated(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = d.getFullYear();
    return `${mm}/${dd}/${yy}`;
  } catch { return "—"; }
}

// ---- Main component ----
interface TruckingModuleProps {
  currentUser?: { name: string; email: string; department: string } | null;
  bookingType?: "import" | "export";
}

export function TruckingModule({ currentUser, bookingType }: TruckingModuleProps) {
  const [records, setRecords] = useState<TruckingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TruckingRecord | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [selectedTruckingStatus, setSelectedTruckingStatus] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState("all");

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trucking-records`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success) {
        const data = result.data || [];
        data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setRecords(data);
      }
      else setRecords([]);
    } catch (err) {
      console.error("Error fetching trucking records:", err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreated = (record: TruckingRecord) => {
    setShowCreate(false);
    fetchRecords();
    toast.success("Trucking record created");
  };

  // ---- Determine which status set to use ----
  const isExport = bookingType === "export";
  const statusOptions = isExport ? EXPORT_TRUCKING_STATUS_OPTIONS : TRUCKING_STATUS_OPTIONS;

  // ---- Filtering ----
  const filtered = records.filter((r) => {
    // Filter by booking type when provided
    if (bookingType) {
      const recordType = (r.linkedBookingType || "").toLowerCase();
      if (bookingType === "export" && !recordType.includes("export")) return false;
      if (bookingType === "import" && recordType.includes("export")) return false;
    }

    const s = search.toLowerCase();
    if (s) {
      const matchesSearch =
        r.truckingRefNo?.toLowerCase().includes(s) ||
        r.linkedBookingId?.toLowerCase().includes(s) ||
        (r.blNumber || r.blNumber)?.toLowerCase().includes(s) ||
        r.containerNo?.toLowerCase().includes(s) ||
        r.deliveryAddresses?.some((a) => a.address.toLowerCase().includes(s));
      if (!matchesSearch) return false;
    }

    if (vendorFilter !== "all" && r.truckingVendor !== vendorFilter) return false;

    if (dateFilterStart || dateFilterEnd) {
      const updated = new Date(r.updatedAt);
      const updatedISO = updated.toISOString().split("T")[0];
      if (dateFilterStart && updatedISO < dateFilterStart) return false;
      if (dateFilterEnd && updatedISO > dateFilterEnd) return false;
    }

    if (selectedTruckingStatus) {
      if ((r.truckingStatus || (isExport ? "For Pullout" : "Awaiting Trucking")) !== selectedTruckingStatus) return false;
    }

    return true;
  });

  // Filter options
  const vendorOptions = [
    { label: "All Vendors", value: "all" },
    ...TRUCKING_VENDORS.map((v) => ({ label: v.name, value: v.name })),
  ];

  if (selectedRecord) {
    return (
      <TruckingRecordDetails
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
        onUpdate={fetchRecords}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#FFFFFF" }}>
      {/* ── Header ── */}
      <div style={{
        padding: "32px 48px 20px",
        borderBottom: "1px solid #E5E9F0",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0A1D4D", margin: 0 }}>
              {isExport ? "Export Trucking" : "Import Trucking"}
            </h1>
            <p style={{ fontSize: "14px", color: "#667085", margin: "4px 0 0" }}>
              Manage {isExport ? "export" : "import"} trucking assignments and delivery coordination
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
            <Plus size={16} /> New Trucking
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <Search size={16} style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9CA3AF",
            pointerEvents: "none",
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Booking ID, BL Number, Container #, Consignee, or Destination..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 42px",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#0A1D4D",
              outline: "none",
              boxSizing: "border-box",
              backgroundColor: "#FFFFFF",
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          <div style={{ gridColumn: "span 2" }}>
            <UnifiedDateRangeFilter
              startDate={dateFilterStart}
              endDate={dateFilterEnd}
              onStartDateChange={setDateFilterStart}
              onEndDateChange={setDateFilterEnd}
              compact
            />
          </div>
          <StandardFilterDropdown
            value={selectedTruckingStatus}
            onChange={setSelectedTruckingStatus}
            options={[
              { value: "", label: "All Statuses" },
              ...statusOptions.map((status) => ({ value: status, label: status })),
            ]}
          />
          <StandardFilterDropdown
            value={vendorFilter}
            onChange={setVendorFilter}
            options={vendorOptions}
            placeholder="All Vendors"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 48px 48px 48px" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
            <p style={{ color: "#667085", fontSize: "14px" }}>Loading trucking records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px" }}>
            <Truck size={48} style={{ color: "#D1D5DB", marginBottom: "16px" }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>
              {records.length === 0 ? "No trucking records yet" : "No results found"}
            </p>
            <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
              {records.length === 0 ? "Click \"+ New Trucking\" to get started." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "37%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E9F0", backgroundColor: "#F9FAFB" }}>
                {[
                  "Trucking Ref #",
                  "BL Number",
                  "Container #",
                  "Size",
                  "Trucking Vendor",
                  "Created",
                  "Status",
                ].map((col) => (
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
                      overflow: "hidden",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const containerDisplay = r.containerNo || (r as any).containers?.[0]?.containerNo || "—";
                const sizeDisplay = r.containerSize || (r as any).containers?.[0]?.size || "—";

                const createdDate = (r as any).truckingDate ? fmtUpdated((r as any).truckingDate) : r.createdAt ? fmtUpdated(r.createdAt) : "—";

                const truncCell: React.CSSProperties = {
                  padding: "16px 16px",
                  verticalAlign: "middle",
                  fontSize: "13px",
                  color: "#0A1D4D",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                };

                const refDisplay = r.truckingRefNo || r.id?.slice(0, 12) || "—";
                const blDisplay = r.blNumber || "—";

                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    style={{
                      borderBottom: "1px solid #E5E9F0",
                      cursor: "pointer",
                      transition: "background-color 120ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F8F9FB"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}
                  >
                    <td style={{ ...truncCell, fontWeight: 600 }} title={refDisplay !== "—" ? refDisplay : undefined}>
                      {refDisplay}
                    </td>
                    <td style={truncCell} title={blDisplay !== "—" ? blDisplay : undefined}>
                      {blDisplay}
                    </td>
                    <td style={truncCell} title={containerDisplay !== "—" ? containerDisplay : undefined}>
                      {containerDisplay}
                    </td>
                    <td style={truncCell}>
                      {sizeDisplay}
                    </td>
                    <td style={{ ...truncCell, overflow: "visible" }}>
                      <VendorPill vendor={r.truckingVendor} />
                    </td>
                    <td style={truncCell}>{createdDate}</td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 10px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: "#E8F5F3",
                          color: getTruckingStatusColors(r.linkedBookingType)[r.truckingStatus || "Awaiting Trucking"] || "#6B7A76",
                          border: "1px solid #C1D9CC",
                        }}
                      >
                        {(DROP_CYCLE_STATUSES as readonly string[]).includes(r.truckingStatus || "")
                          ? `${r.truckingStatus} - Drop ${r.currentDrop || 1} of ${r.deliveryDrops?.length || 1}`
                          : r.truckingStatus || "Awaiting Trucking"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <CreateTruckingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={handleCreated}
      />
    </div>
  );
}