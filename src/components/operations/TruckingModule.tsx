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
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import { CombinationTagFilter } from "../shared/CombinationTagFilter";
import { GroupedBookingsTable } from "../shared/GroupedBookingsTable";
import { deriveCombos, getCombinationKey, getTagByKey } from "../../utils/statusTags";
import type { ColumnDef } from "../design-system";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronStatusPill } from "../NeuronStatusPill";



// ---- Vendor Pill ----
function VendorPill({ vendor }: { vendor: string }) {
  const v = TRUCKING_VENDORS.find((vv) => vv.name === vendor);
  if (!v) return <span style={{ fontSize: "13px", color: "#667085" }}>—</span>;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: "32px",
      padding: "0 12px",
      borderRadius: "var(--neuron-radius-l)",
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      backgroundColor: hexToRgba(v.hex, 0.14),
      color: v.hex,
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
  const { data: bookingsResult, isLoading: isLoadingBookings, refetch: refetchBookings } = useCachedFetch<{ success: boolean; data: any[] }>("/bookings");
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
  const [vendorFilter, setVendorFilter] = useState<string[]>([]);
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
  const refreshBookingTags = () => { invalidateCache("/bookings"); refetchBookings(); };

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

    if (vendorFilter.length > 0 && !vendorFilter.includes(r.truckingVendor)) return false;

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
    const needsSort = selectedTruckingStatus.length > 0 || vendorFilter.length > 0 || portFilter.length > 0;
    const sorted = needsSort
      ? [...enrichedBaseFiltered].sort((a, b) => {
          if (selectedTruckingStatus.length > 0) {
            const ai = selectedTruckingStatus.indexOf(recordStatusOf(a));
            const bi = selectedTruckingStatus.indexOf(recordStatusOf(b));
            const d = (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
            if (d !== 0) return d;
          }
          if (vendorFilter.length > 0) {
            const ai = vendorFilter.indexOf(a.truckingVendor);
            const bi = vendorFilter.indexOf(b.truckingVendor);
            const d = (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
            if (d !== 0) return d;
          }
          if (portFilter.length > 0) {
            const aPort = bookingPortMap.get(a.linkedBookingId || "") || "";
            const bPort = bookingPortMap.get(b.linkedBookingId || "") || "";
            const ai = portFilter.findIndex(p => aPort.toLowerCase().includes(p.toLowerCase()));
            const bi = portFilter.findIndex(p => bPort.toLowerCase().includes(p.toLowerCase()));
            const d = (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
            if (d !== 0) return d;
          }
          return 0;
        })
      : enrichedBaseFiltered;
    return selectedComboKeys.length > 0
      ? sorted.filter((r) => selectedComboKeys.includes(getCombinationKey(r.shipmentTags ?? [])))
      : sorted;
  }, [enrichedBaseFiltered, selectedTruckingStatus, vendorFilter, portFilter, selectedComboKeys, bookingPortMap]);

  // Filter options
  const vendorOptions = TRUCKING_VENDORS.map((v) => ({ label: v.name, value: v.name }));

  if (selectedRecord) {
    return (
      <TruckingRecordDetails
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
        onUpdate={fetchRecords}
        onBookingTagsUpdated={refreshBookingTags}
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
          {!isExport && (
            <CombinationTagFilter
              combos={availableCombos}
              selectedKeys={selectedComboKeys}
              onChange={setSelectedComboKeys}
            />
          )}
          <MultiSelectPortalDropdown
            value={vendorFilter}
            onChange={setVendorFilter}
            options={vendorOptions}
            placeholder="All Vendors"
            searchable
            searchPlaceholder="Search vendors..."
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
              width: "11%",
              cell: (r) => <div style={{ fontSize: "13px", fontWeight: 600, color: "#0A1D4D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.truckingRefNo || r.id?.slice(0, 12) || "—"}</div>,
            },
            {
              header: "BL Number",
              width: "10%",
              cell: (r) => <div style={{ fontSize: "13px", color: "#0A1D4D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.blNumber || "—"}</div>,
            },
            {
              header: "Container #",
              width: "10%",
              cell: (r) => <div style={{ fontSize: "13px", color: "#0A1D4D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.containerNo || (r as any).containers?.[0]?.containerNo || "—"}</div>,
            },
            {
              header: "Port",
              width: "9%",
              cell: (r) => <div style={{ fontSize: "13px", color: "#0A1D4D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bookingPortMap.get(r.linkedBookingId || "") || "—"}</div>,
            },
            {
              header: "Trucking Vendor",
              width: "9%",
              cell: (r) => <VendorPill vendor={r.truckingVendor} />,
            },
            ...(isExport ? [] : [{
              header: "Container Status",
              width: "22%",
              cell: (r: any) => {
                const tags: string[] = (r as any).shipmentTags ?? [];
                if (tags.length === 0) return <span style={{ fontSize: "13px", color: "#9CA3AF" }}>—</span>;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {tags.map((t) => {
                      const tag = getTagByKey(t);
                      const isDanger = tag?.color === "danger";
                      return (
                        <span key={t} style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          height: "32px", padding: "0 12px", borderRadius: "var(--neuron-radius-l)",
                          fontSize: "14px", fontWeight: 500, lineHeight: "20px", whiteSpace: "nowrap",
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
            }]),
            {
              header: "Status",
              width: "16%",
              cell: (r) => {
                const status = r.truckingStatus || "Awaiting Trucking";
                const colorMap = getTruckingStatusColors(r.linkedBookingType);
                const label = (DROP_CYCLE_STATUSES as readonly string[]).includes(r.truckingStatus || "")
                  ? `${r.truckingStatus} - Drop ${r.currentDrop || 1} of ${r.deliveryDrops?.length || 1}`
                  : status;
                return <NeuronStatusPill color={colorMap[status]}>{label}</NeuronStatusPill>;
              },
            },
            {
              header: "Created",
              width: "13%",
              cell: (r) => {
                const d = (r as any).truckingDate || r.createdAt;
                return <div style={{ fontSize: "13px", color: "#0A1D4D", whiteSpace: "nowrap" }}>{d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</div>;
              },
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