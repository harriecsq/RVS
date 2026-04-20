import { useState, useEffect, useMemo } from "react";
import { Plus, Package } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { publicAnonKey } from "../../utils/supabase/info";
import { useCachedFetch, invalidateCache } from "../../hooks/useCachedFetch";
import { CreateExportBookingPanel } from "./CreateExportBookingPanel";
import { ExportBookingDetails, ExportBooking } from "./ExportBookingDetails";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";
import { getStatusSummary } from "../../utils/statusTags";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
  StandardTable,
} from "../design-system";
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { useClientsMasterList } from "../../hooks/useClientsMasterList";
import type { ColumnDef } from "../design-system";

interface ExportBookingsProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

const getTimelineStatus = (timeline: { step: string; datetime: string | null }[] | undefined) => {
  const STEPS = ["Draft", "Signed", "Final", "For Debit", "Debited"];
  if (!timeline) return "Draft";
  for (const step of STEPS) {
    const entry = timeline.find(t => t.step === step);
    if (!entry || !entry.datetime) return step;
  }
  return "Debited";
};

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
];

function getBookingShipmentTags(booking: ExportBooking): string[] {
  return Array.isArray(booking.shipmentTags) ? booking.shipmentTags : [];
}

export function ExportBookings({ currentUser }: ExportBookingsProps = {}) {
  const { data: bookingsResult, isLoading, refetch } = useCachedFetch<{ success: boolean; data: any[] }>("/bookings");
  const bookings = useMemo<ExportBooking[]>(() => {
    if (!bookingsResult?.success) return [];
    const list = (bookingsResult.data || [])
      .filter((b: any) => b.booking_type === "Export" || b.shipmentType === "Export" || b.mode === "Export")
      .map((b: any) => ({
        ...b,
        bookingId: b.id || b.bookingId,
        customerName: b.customerName || b.client || b.clientName || "Unknown",
        companyName: b.companyName || b.company_name || "",
        contactPersonName: b.contactPersonName || b.contact_person_name || "",
        projectNumber: b.projectNumber || b.project_number,
        projectName: b.projectName || b.project_name,
      }));
    list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return list;
  }, [bookingsResult]);
  const fetchBookings = () => { invalidateCache("/bookings"); refetch(); };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [portFilter, setPortFilter] = useState<string[]>([]);
  const clientsMasterList = useClientsMasterList();
  const [selectedBooking, setSelectedBooking] = useState<ExportBooking | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  if (selectedBooking) {
    return (
      <ExportBookingDetails
        booking={selectedBooking}
        onBack={() => { setSelectedBooking(null); fetchBookings(); }}
        onBookingUpdated={fetchBookings}
        currentUser={currentUser}
      />
    );
  }

  const filteredBookings = bookings.filter(booking => {
    const shipmentTags = getBookingShipmentTags(booking);
    const shipmentStatusSummary = shipmentTags.length > 0 ? getStatusSummary(shipmentTags) : (booking.status || "");
    const matchesSearch =
      booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((booking as any).companyName && (booking as any).companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.mblMawb && booking.mblMawb.toLowerCase().includes(searchTerm.toLowerCase())) ||
      shipmentStatusSummary.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (dateFilterStart || dateFilterEnd) {
      const bookingISO = new Date(booking.createdAt).toISOString().split("T")[0];
      if (dateFilterStart && bookingISO < dateFilterStart) return false;
      if (dateFilterEnd && bookingISO > dateFilterEnd) return false;
    }

    const filterTagCombos = LEGACY_EXPORT_STATUS_TO_TAGS[activeTab] || [];
    const matchesStatusByTags =
      filterTagCombos.length > 0 &&
      filterTagCombos.some((combo) => combo.every((tag) => shipmentTags.includes(tag)));
    const matchesStatus = activeTab === "all" || matchesStatusByTags || booking.status === activeTab;
    if (!matchesStatus) return false;

    if (portFilter.length > 0) {
      const bookingPort = (booking as any).origin || booking.pod || (booking as any).destination || "";
      if (!portFilter.some(p => bookingPort.toLowerCase().includes(p.toLowerCase()))) return false;
    }

    if (companyFilter) {
      if ((booking.customerName || "") !== companyFilter) return false;
      if (clientFilter && ((booking as any).companyName || "") !== clientFilter) return false;
    }

    return true;
  });

  const columns: ColumnDef<ExportBooking>[] = [
    {
      header: "Booking Ref #",
      cell: (booking) => (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>{booking.bookingId}</div>
      ),
    },
    {
      header: "BL Number",
      cell: (booking) => (
        <div title={booking.blNumber} style={{ fontSize: "14px", color: "#0A1D4D", maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {booking.blNumber || "—"}
        </div>
      ),
    },
    {
      header: "Container #",
      cell: (booking) => {
        const containers = booking.containerNo ? booking.containerNo.split(",").map((c: string) => c.trim()) : [];
        const displayContainer = containers.length > 0 ? containers[0] : "—";
        const extraContainers = containers.length > 1 ? ` +${containers.length - 1}` : "";
        return (
          <div title={booking.containerNo} style={{ fontSize: "14px", color: "#0A1D4D" }}>
            {displayContainer}{extraContainers}
          </div>
        );
      },
    },
    {
      header: "Shipper / Client",
      cell: (booking) => (
        <>
          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
            {booking.shipper || booking.customerName}
          </div>
          {booking.shipper && booking.customerName && booking.shipper !== booking.customerName && (
            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>{booking.customerName}</div>
          )}
          {(booking as any).companyName && booking.customerName !== (booking as any).companyName && (
            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>{(booking as any).companyName}</div>
          )}
        </>
      ),
    },
    {
      header: "Route",
      cell: (booking) => {
        const segs = (booking as any).segments;
        if (Array.isArray(segs) && segs.length > 1) {
          const sorted = [...segs].sort((a: any, b: any) => (a.legOrder || 0) - (b.legOrder || 0));
          const points = [sorted[0]?.origin, ...sorted.map((s: any) => s.destination || s.pod)].filter(Boolean);
          const unique = [...new Set(points)];
          return (
            <div>
              <div style={{ fontSize: "13px", color: "#0A1D4D" }}>{unique.join(" → ") || "—"}</div>
              <span style={{ fontSize: "11px", color: "#0F766E", fontWeight: 600 }}>{segs.length} legs</span>
            </div>
          );
        }
        return <div style={{ fontSize: "13px", color: "#0A1D4D" }}>{booking.pod || booking.destination || "—"}</div>;
      },
    },
    {
      header: "Date",
      cell: (booking) => (
        <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
          {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (booking) => {
        const shipmentTags = getBookingShipmentTags(booking);
        const label = shipmentTags.length > 0 ? getStatusSummary(shipmentTags) : (booking.status || "—");
        return (
          <div style={{
            display: "inline-flex", alignItems: "center", borderRadius: "20px",
            padding: "0 12px", height: "32px", fontSize: "13px", fontWeight: 600,
            whiteSpace: "nowrap", backgroundColor: "#E8F5F3", color: "#0A1D4D",
            border: "1px solid #C1D9CC",
          }}>
            {label}
          </div>
        );
      },
    },
    {
      header: "Timeline",
      cell: (booking) => (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
          {getTimelineStatus((booking as any).docsTimeline)}
        </div>
      ),
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Booking ID, Customer, Company, or MBL/MAWB..."
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

            <FilterSingleDropdown
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: "all", label: "All Statuses" },
                ...EXPORT_STATUS_FILTER_OPTIONS.map(s => ({ value: s, label: s })),
              ]}
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
              selectedCompany={companyFilter}
              selectedClient={clientFilter}
              onCompanyChange={setCompanyFilter}
              onClientChange={setClientFilter}
              placeholder="All Companies"
            />
          </div>
        </div>

        <div style={{ padding: "0 48px 48px 48px" }}>
          <StandardTable
            data={filteredBookings}
            columns={columns}
            rowKey={(b) => b.bookingId}
            isLoading={isLoading}
            onRowClick={(b) => setSelectedBooking(b)}
            emptyTitle={searchTerm || activeTab !== "all" ? "No bookings match your filters" : "No export bookings yet"}
            emptyDescription={searchTerm || activeTab !== "all" ? undefined : "Create your first booking to get started"}
            emptyIcon={<Package size={24} />}
          />
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
