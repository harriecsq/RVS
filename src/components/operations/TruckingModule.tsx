/**
 * TruckingModule — Operations > Trucking list screen.
 * Identical layout pattern to ImportBookings / ExportBookings.
 */
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Truck } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { useCachedFetch, invalidateCache } from "../../hooks/useCachedFetch";
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
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import { CombinationTagFilter } from "../shared/CombinationTagFilter";
import { GroupedBookingsTable } from "../shared/GroupedBookingsTable";
import { deriveCombos, getCombinationKey, getTagByKey } from "../../utils/statusTags";
import type { ColumnDef } from "../design-system";
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
  const { data: truckingResult, isLoading: isLoadingTrucking, refetch: refetchTrucking } = useCachedFetch<{ success: boolean; data: any[] }>("/trucking-records");
  const { data: bookingsResult, isLoading: isLoadingBookings } = useCachedFetch<{ success: boolean; data: any[] }>("/bookings");
  const isLoading = isLoadingTrucking || isLoadingBookings;
  const records = useMemo<TruckingRecord[]>(() => {
    if (!truckingResult?.success) return [];
    const data = [...(truckingResult.data || [])];
    data.sort((a: any, b: any) => String(b.truckingRefNo || "").localeCompare(String(a.truckingRefNo || ""), undefined, { numeric: true }));
    return data;
  }, [truckingResult]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TruckingRecord | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [selectedTruckingStatus, setSelectedTruckingStatus] = useState<string[]>([]);
  const [vendorFilter, setVendorFilter] = useState("all");
  const [portFilter, setPortFilter] = useState<string[]>([]);
  const [selectedComboKeys, setSelectedComboKeys] = useState<string[]>([]);

  const { bookingPortMap, bookingTagMap } = useMemo(() => {
    const portMap = new Map<string, string>();
    const tagMap = new Map<string, string[]>();
    if (bookingsResult?.success) {
      (bookingsResult.data || []).forEach((b: any) => {
        const isImport = (b.shipmentType || b.booking_type || b.mode || "Import").toLowerCase().includes("import");
        const seg0 = b.segments?.[0];
        const port = isImport ? (b.pod || seg0?.pod || "") : (b.origin || seg0?.origin || "");
        const tags: string[] = Array.isArray(b.shipmentTags) ? b.shipmentTags : [];
        const ids = [b.id, b.bookingId].filter(Boolean);
        ids.forEach((id: string) => { portMap.set(id, port); tagMap.set(id, tags); });
      });
    }
    return { bookingPortMap: portMap, bookingTagMap: tagMap };
  }, [bookingsResult]);

  const fetchRecords = () => { invalidateCache("/trucking-records"); refetchTrucking(); };

  const handleCreated = (record: TruckingRecord) => {
    setShowCreate(false);
    fetchRecords();
    toast.success("Trucking record created");
  };

  // ---- Determine which status set to use ----
  const isExport = bookingType === "export";
  const statusOptions = isExport ? EXPORT_TRUCKING_STATUS_OPTIONS : TRUCKING_STATUS_OPTIONS;

  // ---- Filtering ----
  const recordStatusOf = (r: any) => r.truckingStatus || (isExport ? "For Pullout" : "Awaiting Trucking");
  const recordTags = (r: any): string[] => bookingTagMap.get(r.linkedBookingId || "") ?? [];

  const baseFiltered = useMemo(() => records.filter((r) => {
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
        r.blNumber?.toLowerCase().includes(s) ||
        r.containerNo?.toLowerCase().includes(s) ||
        r.deliveryAddresses?.some((a: any) => a.address.toLowerCase().includes(s));
      if (!matchesSearch) return false;
    }

    if (vendorFilter !== "all" && r.truckingVendor !== vendorFilter) return false;

    if (dateFilterStart || dateFilterEnd) {
      const updatedISO = new Date(r.updatedAt).toISOString().split("T")[0];
      if (dateFilterStart && updatedISO < dateFilterStart) return false;
      if (dateFilterEnd && updatedISO > dateFilterEnd) return false;
    }

    if (selectedTruckingStatus.length > 0) {
      if (!selectedTruckingStatus.includes(recordStatusOf(r))) return false;
    }

    if (portFilter.length > 0) {
      const port = bookingPortMap.get(r.linkedBookingId || "") || "";
      if (!portFilter.some(p => port.toLowerCase().includes(p.toLowerCase()))) return false;
    }

    return true;
  }), [records, bookingType, search, vendorFilter, dateFilterStart, dateFilterEnd, selectedTruckingStatus, portFilter, bookingPortMap]);

  // Enrich records with shipmentTags from linked booking for combo filter
  const enrichedBaseFiltered = useMemo(() =>
    baseFiltered.map((r) => ({ ...r, shipmentTags: bookingTagMap.get(r.linkedBookingId || "") ?? [] })),
  [baseFiltered, bookingTagMap]);

  const availableCombos = useMemo(() => deriveCombos(enrichedBaseFiltered), [enrichedBaseFiltered]);

  useEffect(() => {
    const validKeys = new Set(availableCombos.map((c) => c.key));
    const pruned = selectedComboKeys.filter((k) => validKeys.has(k));
    if (pruned.length !== selectedComboKeys.length) setSelectedComboKeys(pruned);
  }, [availableCombos]);

  const filtered = useMemo(() => {
    const sorted = selectedTruckingStatus.length > 0
      ? [...enrichedBaseFiltered].sort((a, b) => {
          const ai = selectedTruckingStatus.indexOf(recordStatusOf(a));
          const bi = selectedTruckingStatus.indexOf(recordStatusOf(b));
          return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
        })
      : enrichedBaseFiltered;
    return selectedComboKeys.length > 0
      ? sorted.filter((r) => selectedComboKeys.includes(getCombinationKey(r.shipmentTags ?? [])))
      : sorted;
  }, [enrichedBaseFiltered, selectedTruckingStatus, selectedComboKeys]);

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
        initialShipmentTags={bookingTagMap.get(selectedRecord.linkedBookingId || "") ?? []}
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
          <MultiSelectPortalDropdown
            value={selectedTruckingStatus}
            onChange={setSelectedTruckingStatus}
            options={statusOptions.map((status) => ({ value: status, label: status }))}
            placeholder="All Statuses"
          />
          <CombinationTagFilter
            combos={availableCombos}
            selectedKeys={selectedComboKeys}
            onChange={setSelectedComboKeys}
          />
          <FilterSingleDropdown
            value={vendorFilter}
            onChange={setVendorFilter}
            options={vendorOptions}
            placeholder="All Vendors"
          />
          <MultiSelectPortalDropdown
            value={portFilter}
            options={[
              { value: "Manila North", label: "Manila North" },
              { value: "Manila South", label: "Manila South" },
              { value: "CDO", label: "CDO" },
              { value: "Iloilo", label: "Iloilo" },
              { value: "Davao", label: "Davao" },
            ]}
            onChange={setPortFilter}
            placeholder="All Ports"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 48px 48px 48px" }}>
        <GroupedBookingsTable
          data={filtered}
          columns={[
            {
              header: "Trucking Ref #",
              width: "13%",
              cell: (r) => <div style={{ fontSize: "13px", fontWeight: 600, color: "#0A1D4D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.truckingRefNo || r.id?.slice(0, 12) || "—"}</div>,
            },
            {
              header: "BL Number",
              width: "11%",
              cell: (r) => <div style={{ fontSize: "13px", color: "#0A1D4D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.blNumber || "—"}</div>,
            },
            {
              header: "Container #",
              width: "12%",
              cell: (r) => <div style={{ fontSize: "13px", color: "#0A1D4D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.containerNo || (r as any).containers?.[0]?.containerNo || "—"}</div>,
            },
            {
              header: "Container Status",
              width: "17%",
              cell: (r) => {
                const tags: string[] = (r as any).shipmentTags ?? [];
                if (tags.length === 0) return <span style={{ fontSize: "13px", color: "#9CA3AF" }}>—</span>;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {tags.map((t) => {
                      const tag = getTagByKey(t);
                      const isDanger = tag?.color === "danger";
                      return (
                        <span key={t} style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "1px 7px", borderRadius: "6px",
                          fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap",
                          backgroundColor: isDanger ? "#FEE2E2" : "#E8F5F3",
                          color: isDanger ? "#991B1B" : "#12332B",
                          border: isDanger ? "1px solid #FECACA" : "1px solid #C1D9CC",
                        }}>
                          {tag?.label ?? t}
                        </span>
                      );
                    })}
                  </div>
                );
              },
            },
            {
              header: "Size",
              width: "7%",
              cell: (r) => <div style={{ fontSize: "13px", color: "#0A1D4D" }}>{r.containerSize || (r as any).containers?.[0]?.size || "—"}</div>,
            },
            {
              header: "Trucking Vendor",
              width: "10%",
              cell: (r) => <VendorPill vendor={r.truckingVendor} />,
            },
            {
              header: "Created",
              width: "9%",
              cell: (r) => <div style={{ fontSize: "13px", color: "#0A1D4D" }}>{(r as any).truckingDate ? fmtUpdated((r as any).truckingDate) : r.createdAt ? fmtUpdated(r.createdAt) : "—"}</div>,
            },
            {
              header: "Status",
              width: "20%",
              cell: (r) => (
                <span style={{
                  display: "inline-flex", alignItems: "center", padding: "2px 10px",
                  borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                  background: "#E8F5F3",
                  color: getTruckingStatusColors(r.linkedBookingType)[r.truckingStatus || "Awaiting Trucking"] || "#6B7A76",
                  border: "1px solid #C1D9CC",
                }}>
                  {(DROP_CYCLE_STATUSES as readonly string[]).includes(r.truckingStatus || "")
                    ? `${r.truckingStatus} - Drop ${r.currentDrop || 1} of ${r.deliveryDrops?.length || 1}`
                    : r.truckingStatus || "Awaiting Trucking"}
                </span>
              ),
            },
          ] as ColumnDef<typeof filtered[0]>[]}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => setSelectedRecord(r as TruckingRecord)}
          selectedComboKeys={selectedComboKeys}
          availableCombos={availableCombos}
          emptyTitle={records.length === 0 ? "No trucking records yet" : "No results found"}
          emptyDescription={records.length === 0 ? "Click \"+ New Trucking\" to get started." : "Try adjusting your search or filters."}
          emptyIcon={<Truck size={24} />}
        />
      </div>

      {/* ── Create Modal ── */}
      <CreateTruckingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={handleCreated}
        prefillBookingType={isExport ? "export" : "import"}
      />
    </div>
  );
}