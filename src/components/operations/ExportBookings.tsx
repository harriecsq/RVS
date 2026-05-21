import { useState, useEffect, useMemo } from "react";
import { Plus, Package } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { publicAnonKey } from "../../utils/supabase/info";
import { useCachedFetch, invalidateCache } from "../../hooks/useCachedFetch";
import { CreateExportBookingPanel } from "./CreateExportBookingPanel";
import { ExportBookingDetails, ExportBooking } from "./ExportBookingDetails";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter, clientSelectionMatches, type ClientSelection } from "../shared/CompanyClientFilter";
import { getStatusSummary } from "../../utils/statusTags";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { EXPORT_STATUS_TEXT_COLORS } from "../../constants/exportStatuses";
import {
  StandardButton,
  StandardSearchInput,
  StandardTable,
} from "../design-system";
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import { useClientsMasterList } from "../../hooks/useClientsMasterList";
import type { ColumnDef } from "../design-system";
import { getCurrentMonthRange } from "../../utils/dateRangeDefaults";

interface ExportBookingsProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

const LEGACY_EXPORT_STATUS_TO_TAGS: Record<string, string[][]> = {
  Draft: [["booked"]],
  "For Approval": [["for-web"]],
  Approved: [["for-final"]],
  "In Transit": [["with-eta"]],
  Delivered: [["delivered"]],
  Completed: [["for-debit"], ["delivered"]],
  "On Hold": [["awaiting-signed-docs"]],
  Cancelled: [["re-schedule"]],
};

const EXPORT_STATUS_FILTER_OPTIONS = [
  "Draft",
  "For Lodgement and Portal",
  "Awaiting for Final",
  "Final - For Arrastre Payment",
  "Arrastre Paid",
  "Sent Draft Documents for Approval",
  "Approved Documents",
  "Sent FSI and DG Declaration",
  "Draft BL Okay to Finalize",
  "Awaiting Billing and Signed BL",
  "Request for Telex",
  "Form E Ongoing Process",
  "Shipped Out",
  "Cancelled",
];

function getBookingShipmentTags(booking: ExportBooking): string[] {
  return Array.isArray(booking.shipmentTags) ? booking.shipmentTags : [];
}

export function ExportBookings({ currentUser }: ExportBookingsProps = {}) {
  const { data: bookingsResult, isLoading, refetch } = useCachedFetch<{ success: boolean; data: any[] }>("/bookings");
  const bookings = useMemo<ExportBooking[]>(() => {
    if (!bookingsResult?.success) return [];
    const list = (bookingsResult.data || [])
      .filter((b: any) => b.movement === "EXPORT" || b.booking_type === "Export" || b.shipmentType === "Export")
      .map((b: any) => ({
        ...b,
        bookingId: b.id || b.bookingId,
        customerName: b.customerName || b.client || b.clientName || "Unknown",
        companyName: b.companyName || b.company_name || "",
        contactPersonName: b.contactPersonName || b.contact_person_name || "",
        projectNumber: b.projectNumber || b.project_number,
        projectName: b.projectName || b.project_name,
      }));
    list.sort((a: any, b: any) => String(b.bookingId || "").localeCompare(String(a.bookingId || ""), undefined, { numeric: true }));
    return list;
  }, [bookingsResult]);
  const fetchBookings = () => { invalidateCache("/bookings"); refetch(); };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string[]>([]);
  const [dateFilterStart, setDateFilterStart] = useState(() => getCurrentMonthRange().start);
  const [dateFilterEnd, setDateFilterEnd] = useState(() => getCurrentMonthRange().end);
  const [clientSelections, setClientSelections] = useState<ClientSelection[]>([]);
  const [portFilter, setPortFilter] = useState<string[]>([]);
  const clientsMasterList = useClientsMasterList();
  const [selectedBooking, setSelectedBooking] = useState<ExportBooking | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | undefined>(undefined);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [legViews, setLegViews] = useState<string[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  const getExportMatchedStatusIndex = (shipmentTags: string[], bookingStatus: string | undefined): number => {
    if (activeTab.length === 0) return -1;
    for (let i = 0; i < activeTab.length; i++) {
      const sel = activeTab[i];
      const combos = LEGACY_EXPORT_STATUS_TO_TAGS[sel] || [];
      const byTags = combos.length > 0 && combos.some((combo) => combo.every((tag) => shipmentTags.includes(tag)));
      if (byTags || bookingStatus === sel) return i;
    }
    return -1;
  };

  const provinceSegments = (booking: ExportBooking): any[] =>
    ((booking as any).segments || []).filter((s: any) =>
      typeof s?.segmentLabel === "string" && s.segmentLabel.toLowerCase().startsWith("province")
    );

  const childMatchesFilters = (booking: ExportBooking, seg: any): boolean => {
    const q = searchTerm.toLowerCase();
    if (q) {
      const containerHit = (seg.containerNos || []).some((c: string) => (c || "").toLowerCase().includes(q));
      const originHit = (seg.origin || "").toLowerCase().includes(q);
      const destHit = (seg.destination || "").toLowerCase().includes(q);
      const statusHit = (seg.status || "").toLowerCase().includes(q);
      const tagsHit = (Array.isArray(seg.shipmentTags) ? getStatusSummary(seg.shipmentTags) : "").toLowerCase().includes(q);
      const blHit = (seg.blNumber || "").toLowerCase().includes(q);
      if (!(containerHit || originHit || destHit || statusHit || tagsHit || blHit)) return false;
    }
    const createdISO = new Date(seg.createdAt || booking.createdAt).toISOString().split("T")[0];
    if (dateFilterStart && createdISO < dateFilterStart) return false;
    if (dateFilterEnd && createdISO > dateFilterEnd) return false;
    if (activeTab.length > 0) {
      const segTags: string[] = Array.isArray(seg.shipmentTags) ? seg.shipmentTags : [];
      if (getExportMatchedStatusIndex(segTags, seg.status) === -1) return false;
    }
    if (portFilter.length > 0) {
      const port = seg.origin || seg.destination || "";
      if (!portFilter.some(p => port.toLowerCase().includes(p.toLowerCase()))) return false;
    }
    return true;
  };

  const parentMatchesFilters = (booking: ExportBooking): boolean => {
    const shipmentTags = getBookingShipmentTags(booking);
    const shipmentStatusSummary = shipmentTags.length > 0 ? getStatusSummary(shipmentTags) : (booking.status || "");
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      booking.bookingId.toLowerCase().includes(q) ||
      booking.customerName.toLowerCase().includes(q) ||
      ((booking as any).companyName && (booking as any).companyName.toLowerCase().includes(q)) ||
      (booking.mblMawb && booking.mblMawb.toLowerCase().includes(q)) ||
      ((booking as any).blNumber && (booking as any).blNumber.toLowerCase().includes(q)) ||
      ((booking as any).segments || []).some((seg: any) => (seg?.blNumber || "").toLowerCase().includes(q)) ||
      ((booking as any).containerNo && (booking as any).containerNo.toLowerCase().includes(q)) ||
      ((booking as any).bookingNumbers || []).some((bn: any) =>
        (bn.containerNos || []).some((c: string) => (c || "").toLowerCase().includes(q))
      ) ||
      shipmentStatusSummary.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (dateFilterStart || dateFilterEnd) {
      const bookingISO = new Date(booking.createdAt).toISOString().split("T")[0];
      if (dateFilterStart && bookingISO < dateFilterStart) return false;
      if (dateFilterEnd && bookingISO > dateFilterEnd) return false;
    }

    if (activeTab.length > 0 && getExportMatchedStatusIndex(shipmentTags, booking.status) === -1) return false;

    if (portFilter.length > 0) {
      const bookingPort = (booking as any).origin || booking.pod || (booking as any).destination || "";
      if (!portFilter.some(p => bookingPort.toLowerCase().includes(p.toLowerCase()))) return false;
    }

    if (clientSelections.length > 0) {
      if (!clientSelectionMatches(clientSelections, {
        company: booking.customerName || "",
        client: (booking as any).companyName || "",
      })) return false;
    }

    return true;
  };

  // Mode B: keep booking if parent matches OR any province leg matches.
  const filterMatches = new Map<string, { parent: boolean; childIds: Set<string> }>();
  const manilaSelected = legViews.includes("manila");
  const provinceSelected = legViews.includes("province");
  const onlyProvinceSelected = provinceSelected && !manilaSelected;
  const onlyManilaSelected = manilaSelected && !provinceSelected;

  const filteredBookingsRaw = bookings.filter(booking => {
    const legs = provinceSegments(booking);
    if (onlyProvinceSelected && legs.length === 0) return false;
    const parentOk = parentMatchesFilters(booking);
    const childIds = new Set<string>();
    for (const seg of legs) {
      if (childMatchesFilters(booking, seg)) childIds.add(seg.segmentId);
    }
    if (parentOk || childIds.size > 0) {
      filterMatches.set(booking.bookingId, { parent: parentOk, childIds });
      return true;
    }
    return false;
  });

  const filteredBookings = (activeTab.length > 0 || portFilter.length > 0 || clientSelections.length > 0)
    ? [...filteredBookingsRaw].sort((a, b) => {
        if (activeTab.length > 0) {
          const ai = getExportMatchedStatusIndex(getBookingShipmentTags(a), a.status);
          const bi = getExportMatchedStatusIndex(getBookingShipmentTags(b), b.status);
          const d = (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
          if (d !== 0) return d;
        }
        if (portFilter.length > 0) {
          const aPort = (a as any).origin || a.pod || (a as any).destination || "";
          const bPort = (b as any).origin || b.pod || (b as any).destination || "";
          const ai = portFilter.findIndex(p => aPort.toLowerCase().includes(p.toLowerCase()));
          const bi = portFilter.findIndex(p => bPort.toLowerCase().includes(p.toLowerCase()));
          const d = (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
          if (d !== 0) return d;
        }
        if (clientSelections.length > 0) {
          const aIdx = clientSelections.findIndex((sel) =>
            clientSelectionMatches([sel], { company: a.customerName || "", client: (a as any).companyName || "" })
          );
          const bIdx = clientSelections.findIndex((sel) =>
            clientSelectionMatches([sel], { company: b.customerName || "", client: (b as any).companyName || "" })
          );
          const d = (aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx) - (bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx);
          if (d !== 0) return d;
        }
        return 0;
      })
    : filteredBookingsRaw;

  type RowItem =
    | { kind: "parent"; key: string; booking: ExportBooking; hasLegs: boolean; isExpanded: boolean; legCount: number }
    | { kind: "child"; key: string; parent: ExportBooking; segment: any; provinceIndex: number };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Seed auto-expand into expandedIds when filter produces child matches,
  // so user can manually collapse afterwards.
  const childMatchKey = Array.from(filterMatches.entries())
    .filter(([, v]) => v.childIds.size > 0)
    .map(([k]) => k)
    .sort()
    .join("|");
  useEffect(() => {
    if (!childMatchKey) return;
    setExpandedIds(prev => {
      const next = new Set(prev);
      for (const id of childMatchKey.split("|")) next.add(id);
      return next;
    });
  }, [childMatchKey]);

  // When "All Province" view selected (alone), auto-expand visible bookings once.
  useEffect(() => {
    if (!onlyProvinceSelected) return;
    setExpandedIds(prev => {
      const next = new Set(prev);
      for (const b of filteredBookingsRaw) next.add(b.bookingId);
      return next;
    });
  }, [onlyProvinceSelected]);

  if (selectedBooking) {
    return (
      <ExportBookingDetails
        booking={selectedBooking}
        initialSegmentId={selectedSegmentId}
        onBack={() => { setSelectedBooking(null); setSelectedSegmentId(undefined); fetchBookings(); }}
        onBookingUpdated={fetchBookings}
        currentUser={currentUser}
      />
    );
  }

  const tableRows: RowItem[] = [];
  for (const booking of filteredBookings) {
    const legs = provinceSegments(booking);
    const isExpanded = onlyManilaSelected ? false : expandedIds.has(booking.bookingId);
    tableRows.push({
      kind: "parent",
      key: booking.bookingId,
      booking,
      hasLegs: !onlyManilaSelected && legs.length > 0,
      isExpanded,
      legCount: legs.length,
    });
    if (!onlyManilaSelected && legs.length > 0 && isExpanded) {
      legs.forEach((seg: any, i: number) => {
        tableRows.push({
          kind: "child",
          key: `${booking.bookingId}::${seg.segmentId}`,
          parent: booking,
          segment: seg,
          provinceIndex: i + 1,
        });
      });
    }
  }

  const columns: ColumnDef<RowItem>[] = [
    {
      header: "Booking Ref #",
      cell: (row) => {
        if (row.kind === "child") {
          return (
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#0A1D4D", paddingLeft: "24px" }}>
              └─ PROVINCE-{String(row.provinceIndex).padStart(2, "0")}
            </div>
          );
        }
        const b = row.booking;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {row.hasLegs ? (
              <span
                onClick={(e) => { e.stopPropagation(); toggleExpanded(b.bookingId); }}
                style={{ display: "inline-flex", width: "28px", height: "28px", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "20px", lineHeight: 1, color: "#237F66", borderRadius: "6px" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#E8F2EE"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                aria-label={row.isExpanded ? "Collapse" : "Expand"}
              >
                {row.isExpanded ? "▾" : "▸"}
              </span>
            ) : (
              <span style={{ display: "inline-block", width: "28px" }} />
            )}
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
              {b.bookingId}
              {row.hasLegs && (
                <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: 500, color: "#6B7A76" }}>
                  +{row.legCount} {row.legCount === 1 ? "leg" : "legs"}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "BL Number",
      cell: (row) => {
        const blNumber = row.kind === "child"
          ? (row.segment.blNumber || "")
          : ((row.booking as any).segments?.[0]?.blNumber || row.booking.blNumber || "");
        return (
          <div title={blNumber} style={{ fontSize: "14px", color: "#0A1D4D", maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {blNumber || "—"}
          </div>
        );
      },
    },
    {
      header: "Container #",
      cell: (row) => {
        let containers: string[] = [];
        if (row.kind === "child") {
          containers = Array.isArray(row.segment.containerNos) ? row.segment.containerNos.filter(Boolean) : [];
        } else {
          const seg0: any = (row.booking as any).segments?.[0];
          const segContainers: string[] = Array.isArray(seg0?.containerNos) ? seg0.containerNos.filter(Boolean) : [];
          const rawContainerNo: string = seg0?.containerNo || row.booking.containerNo || "";
          containers = segContainers.length > 0
            ? segContainers
            : (rawContainerNo ? rawContainerNo.split(",").map((c: string) => c.trim()).filter(Boolean) : []);
        }
        if (containers.length === 0) return <div style={{ fontSize: "14px", color: "#0A1D4D" }}>—</div>;
        return (
          <div style={{ fontSize: "14px", color: "#0A1D4D", display: "flex", flexDirection: "column", gap: "2px" }}>
            {containers.map((c, i) => <div key={i}>{c}</div>)}
          </div>
        );
      },
    },
    {
      header: "Shipper / Client",
      cell: (row) => {
        if (row.kind === "child") {
          const dest = row.segment.destination || "";
          return (
            <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
              <span style={{ fontSize: "11px", color: "#6B7A76", marginRight: "6px" }}>To:</span>
              {dest ? <span style={{ textTransform: "uppercase" }}>{dest}</span> : "—"}
            </div>
          );
        }
        const b = row.booking;
        const lines = Array.from(new Set(
          [b.shipper, b.customerName, (b as any).companyName]
            .map((v: any) => (v || "").trim())
            .filter(Boolean)
        ));
        if (lines.length === 0) return <div style={{ fontSize: "14px", color: "#0A1D4D" }}>—</div>;
        const [primary, ...rest] = lines;
        return (
          <>
            <div style={{ fontSize: "14px", color: "#0A1D4D" }}>{primary}</div>
            {rest.map((line, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>{line}</div>
            ))}
          </>
        );
      },
    },
    {
      header: "Origin",
      cell: (row) => {
        const origin = row.kind === "child"
          ? (row.segment.origin || "")
          : ((row.booking as any).segments?.[0]?.origin || (row.booking as any).origin || "");
        return (
          <div style={{ fontSize: "13px", color: "#0A1D4D", textTransform: "uppercase" }}>{origin || "—"}</div>
        );
      },
    },
    {
      header: "Status",
      cell: (row) => {
        const status = row.kind === "child"
          ? (row.segment.status || "—")
          : (row.booking.status || "—");
        return (
          <NeuronStatusPill
            status={status}
            colorMap={EXPORT_STATUS_TEXT_COLORS}
          />
        );
      },
    },
    {
      header: "Created",
      cell: (row) => {
        const iso = row.kind === "child"
          ? (row.segment.createdAt || row.parent.createdAt)
          : row.booking.createdAt;
        return (
          <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
            {new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
        <NeuronPageHeader
          title="Export"
          subtitle="Manage export operations and documentation"
          action={
            <StandardButton
              variant="primary"
              icon={<Plus size={16} />}
              iconPosition="left"
              onClick={() => setShowCreateModal(true)}
            >
              New Booking
            </StandardButton>
          }
        />

        <div style={{ padding: "0 48px 24px 48px" }}>
          <div style={{ marginBottom: "24px" }}>
            <StandardSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by Booking ID, Customer, Company, MBL/MAWB, BL #, or Container #..."
            />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
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
              value={activeTab}
              onChange={setActiveTab}
              preserveCase
              options={EXPORT_STATUS_FILTER_OPTIONS.map(s => ({ value: s, label: s }))}
              placeholder="All Statuses"
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

            <CompanyClientFilter
              extraEntries={clientsMasterList}
              selected={clientSelections}
              onChange={setClientSelections}
              placeholder="All Companies"
            />

            <MultiSelectPortalDropdown
              value={legViews}
              onChange={setLegViews}
              options={[
                { value: "manila", label: "All Manila" },
                { value: "province", label: "All Province" },
              ]}
              placeholder="All Bookings"
              preserveCase
            />
          </div>

        </div>

        <div style={{ padding: "0 48px 48px 48px" }}>
          <StandardTable<RowItem>
            data={tableRows}
            columns={columns}
            rowKey={(r) => r.key}
            isLoading={isLoading}
            rowClassName={(r) => r.kind === "child" ? "neuron-province-leg-row" : ""}
            onRowClick={(r) => {
              if (r.kind === "child") {
                setSelectedSegmentId(r.segment.segmentId);
                setSelectedBooking(r.parent);
              } else {
                setSelectedSegmentId(undefined);
                setSelectedBooking(r.booking);
              }
            }}
            emptyTitle={searchTerm || activeTab.length > 0 ? "No bookings match your filters" : "No export bookings yet"}
            emptyDescription={searchTerm || activeTab.length > 0 ? undefined : "Create your first booking to get started"}
            emptyIcon={<Package size={24} />}
          />
          <style>{`tr.neuron-province-leg-row td { background-color: #F7FAF9; }`}</style>
        </div>
      </div>

      {showCreateModal && (
        <CreateExportBookingPanel
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onBookingCreated={() => { setShowCreateModal(false); fetchBookings(); }}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
