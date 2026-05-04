import { useState, useEffect, useMemo } from "react";
import { Plus, Package } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { publicAnonKey } from "../../utils/supabase/info";
import { useCachedFetch, invalidateCache } from "../../hooks/useCachedFetch";
import { CreateBrokerageBookingPanel } from "./CreateImportBookingPanel";
import { BrokerageBookingDetails } from "./ImportBookingDetails";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter, clientSelectionMatches, type ClientSelection } from "../shared/CompanyClientFilter";
import { getStatusSummary, deriveCombos, getCombinationKey } from "../../utils/statusTags";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
} from "../design-system";
import { CombinationTagFilter } from "../shared/CombinationTagFilter";
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import { GroupedBookingsTable } from "../shared/GroupedBookingsTable";
import { useClientsMasterList } from "../../hooks/useClientsMasterList";
import type { ColumnDef } from "../design-system";

interface BrokerageBooking {
  bookingId: string;
  customerName: string;
  shipmentTags?: string[];
  mode?: string;
  consignee?: string;
  mblMawb?: string;
  taggingTime?: string;
  projectNumber?: string;
  projectName?: string;
  accountOwner?: string;
  accountHandler?: string;
  entryType?: string;
  createdAt: string;
  updatedAt: string;
  blNumber?: string;
  containerNo?: string;
  eta?: string;
  pod?: string;
  destination?: string;
  docsTimeline?: { step: string; datetime: string | null }[];
  companyName?: string;
}

interface ImportBookingsProps {
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


function getBookingShipmentTags(booking: BrokerageBooking): string[] {
  return Array.isArray(booking.shipmentTags) ? booking.shipmentTags : [];
}

export function ImportBookings({ currentUser }: ImportBookingsProps = {}) {
  const { data: bookingsResult, isLoading, refetch } = useCachedFetch<{ success: boolean; data: any[] }>("/bookings");
  const bookings = useMemo<BrokerageBooking[]>(() => {
    if (!bookingsResult?.success) return [];
    const list = (bookingsResult.data || [])
      .filter((b: any) => b.booking_type === "Import" || b.shipmentType === "Import" || b.mode === "Import")
      .map((b: any) => ({
        ...b,
        bookingId: b.id || b.bookingId,
        customerName: b.customerName || b.client || b.clientName || "Unknown",
        companyName: b.companyName || b.company_name || "",
        contactPersonName: b.contactPersonName || b.contact_person_name || "",
        projectNumber: b.projectNumber || b.project_number,
        projectName: b.projectName || b.project_name,
        docsTimeline: b.docsTimeline || [],
      }));
    list.sort((a: any, b: any) => String(b.bookingId || "").localeCompare(String(a.bookingId || ""), undefined, { numeric: true }));
    return list;
  }, [bookingsResult]);
  const fetchBookings = () => { invalidateCache("/bookings"); refetch(); };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComboKeys, setSelectedComboKeys] = useState<string[]>([]);
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [portFilter, setPortFilter] = useState<string[]>([]);
  const clientsMasterList = useClientsMasterList();
  const [clientSelections, setClientSelections] = useState<ClientSelection[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BrokerageBooking | null>(null);
  const [prefillData, setPrefillData] = useState<any>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as any;
    if (state?.createFromProject) {
      setPrefillData({
        projectId: state.projectId,
        projectNumber: state.projectNumber,
        projectName: state.projectName,
        clientId: state.clientId,
        clientName: state.clientName,
        commodity: state.commodity,
        volume_containers: state.volume_containers,
        shipping_line: state.shipping_line,
        vessel_voyage: state.vessel_voyage,
        trucker: state.trucker,
        origin: state.origin,
        pod: state.pod,
      });
      setShowCreateModal(true);
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    if (location.state?.openBookingId && bookings.length > 0) {
      const bookingToOpen = bookings.find(b => b.bookingId === location.state.openBookingId);
      if (bookingToOpen) {
        setSelectedBooking(bookingToOpen);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location, bookings]);

  const baseFiltered = useMemo(() => bookings.filter(booking => {
    const timelineStatus = getTimelineStatus(booking.docsTimeline);
    const shipmentTags = getBookingShipmentTags(booking);
    const shipmentStatusSummary = shipmentTags.length > 0 ? getStatusSummary(shipmentTags) : "";
    const matchesSearch =
      booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.companyName && booking.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.mblMawb && booking.mblMawb.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.projectNumber && booking.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      timelineStatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipmentStatusSummary.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (dateFilterStart || dateFilterEnd) {
      const bookingISO = new Date(booking.createdAt).toISOString().split("T")[0];
      if (dateFilterStart && bookingISO < dateFilterStart) return false;
      if (dateFilterEnd && bookingISO > dateFilterEnd) return false;
    }

    if (portFilter.length > 0) {
      const bookingPort = booking.pod || booking.destination || "";
      if (!portFilter.some(p => bookingPort.toLowerCase().includes(p.toLowerCase()))) return false;
    }

    if (clientSelections.length > 0) {
      const bookingCompany = booking.consignee || booking.customerName || "";
      if (!clientSelectionMatches(clientSelections, { company: bookingCompany, client: booking.customerName || "" })) return false;
    }

    return true;
  }), [bookings, searchTerm, dateFilterStart, dateFilterEnd, portFilter, clientSelections]);

  // Derive combos from the base-filtered list (after all other filters)
  const availableCombos = useMemo(() => deriveCombos(baseFiltered), [baseFiltered]);

  // Prune selected combos that no longer exist in current view
  useEffect(() => {
    const validKeys = new Set(availableCombos.map((c) => c.key));
    const pruned = selectedComboKeys.filter((k) => validKeys.has(k));
    if (pruned.length !== selectedComboKeys.length) setSelectedComboKeys(pruned);
  }, [availableCombos]);

  const filteredBookings = useMemo(() =>
    selectedComboKeys.length > 0
      ? baseFiltered.filter((b) => selectedComboKeys.includes(getCombinationKey(getBookingShipmentTags(b))))
      : baseFiltered,
  [baseFiltered, selectedComboKeys]);

  if (selectedBooking) {
    return (
      <BrokerageBookingDetails
        booking={selectedBooking}
        onBack={() => { setSelectedBooking(null); fetchBookings(); }}
        onBookingUpdated={fetchBookings}
      />
    );
  }

  const columns: ColumnDef<BrokerageBooking>[] = [
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
        const containers = booking.containerNo ? booking.containerNo.split(",").map(c => c.trim()).filter(Boolean) : [];
        if (containers.length === 0) return <div style={{ fontSize: "14px", color: "#0A1D4D" }}>—</div>;
        return (
          <div style={{ fontSize: "14px", color: "#0A1D4D", display: "flex", flexDirection: "column", gap: "2px" }}>
            {containers.map((c, i) => <div key={i}>{c}</div>)}
          </div>
        );
      },
    },
    {
      header: "Consignee / Client",
      cell: (booking) => {
        const lines = Array.from(new Set(
          [booking.consignee, booking.customerName, booking.companyName]
            .map(v => (v || "").trim())
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
      header: "Destination",
      cell: (booking) => (
        <div style={{ fontSize: "13px", color: "#0A1D4D" }}>{booking.pod || booking.destination || "—"}</div>
      ),
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
        const label = shipmentTags.length > 0 ? getStatusSummary(shipmentTags) : "—";
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
  ];

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
        <NeuronPageHeader
          title="Import"
          subtitle="Manage import operations and customs clearance"
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
              placeholder="Search by Booking ID, Customer, Company, MBL/MAWB, or Project Number..."
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

            <CombinationTagFilter
              combos={availableCombos}
              selectedKeys={selectedComboKeys}
              onChange={setSelectedComboKeys}
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
          </div>
        </div>

        <div style={{ padding: "0 48px 48px 48px" }}>
          <GroupedBookingsTable
            data={filteredBookings}
            columns={columns}
            rowKey={(b) => b.bookingId}
            isLoading={isLoading}
            onRowClick={(b) => setSelectedBooking(b)}
            selectedComboKeys={selectedComboKeys}
            availableCombos={availableCombos}
            emptyTitle={searchTerm || selectedComboKeys.length > 0 ? "No bookings match your filters" : "No import bookings yet"}
            emptyDescription={searchTerm || selectedComboKeys.length > 0 ? undefined : "Create your first booking to get started"}
            emptyIcon={<Package size={24} />}
          />
        </div>
      </div>

      {showCreateModal && (
        <CreateBrokerageBookingPanel
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setPrefillData(null); }}
          onBookingCreated={() => { setShowCreateModal(false); fetchBookings(); }}
          currentUser={currentUser}
          prefillData={prefillData}
        />
      )}
    </>
  );
}
