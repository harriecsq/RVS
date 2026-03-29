import { useState, useEffect } from "react";
import { Plus, Package } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { publicAnonKey } from "../../utils/supabase/info";
import { CreateBrokerageBookingPanel } from "./CreateImportBookingPanel";
import { BrokerageBookingDetails } from "./ImportBookingDetails";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";
import { getStatusSummary } from "../../utils/statusTags";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
  StandardFilterDropdown,
  StandardTable,
} from "../design-system";
import type { ColumnDef } from "../design-system";

interface BrokerageBooking {
  bookingId: string;
  customerName: string;
  status: string;
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

const LEGACY_IMPORT_STATUS_TO_TAGS: Record<string, string[][]> = {
  "For Gatepass": [["for-gatepass"]],
  "Awaiting Discharge & CRO": [["awaiting-discharge", "cro"], ["awaiting-discharge-cro"]],
  "For Debit For Final": [["for-debit", "for-final"], ["for-debit-for-final"]],
  "For Lodgement": [["for-lodgement"]],
  "Awaiting Stowage": [["awaiting-stowage"]],
  "With Stowage / Discharged & Awaiting Signed Docs": [["with-stowage-discharged"], ["awaiting-stowage", "awaiting-signed-docs"]],
  "With ETA": [["with-eta"]],
  "Without ETA": [["without-eta"]],
  "Delivered": [["delivered"]],
  "Returned": [["returned"]],
};

const IMPORT_STATUS_FILTER_OPTIONS = [
  "For Gatepass",
  "Awaiting Discharge & CRO",
  "For Debit For Final",
  "For Lodgement",
  "Awaiting Stowage",
  "With Stowage / Discharged & Awaiting Signed Docs",
  "With ETA",
  "Without ETA",
  "Delivered",
  "Returned",
];

function getBookingShipmentTags(booking: BrokerageBooking): string[] {
  return Array.isArray(booking.shipmentTags) ? booking.shipmentTags : [];
}

export function ImportBookings({ currentUser }: ImportBookingsProps = {}) {
  const [bookings, setBookings] = useState<BrokerageBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BrokerageBooking | null>(null);
  const [prefillData, setPrefillData] = useState<any>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
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

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        const importBookings = result.data
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
        setBookings(importBookings);
      } else {
        setBookings([]);
      }
    } catch (error) {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedBooking) {
    return (
      <BrokerageBookingDetails
        booking={selectedBooking}
        onBack={() => { setSelectedBooking(null); fetchBookings(); }}
        onBookingUpdated={fetchBookings}
      />
    );
  }

  const uniqueDestinations = Array.from(new Set(bookings.map(b => b.destination).filter(Boolean))) as string[];

  const filteredBookings = bookings.filter(booking => {
    const timelineStatus = getTimelineStatus(booking.docsTimeline);
    const shipmentTags = getBookingShipmentTags(booking);
    const shipmentStatusSummary = shipmentTags.length > 0 ? getStatusSummary(shipmentTags) : (booking.status || "");
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

    const filterTagCombos = LEGACY_IMPORT_STATUS_TO_TAGS[activeTab] || [];
    const matchesStatusByTags =
      filterTagCombos.length > 0 &&
      filterTagCombos.some((combo) => combo.every((tag) => shipmentTags.includes(tag)));
    const matchesStatus = activeTab === "all" || matchesStatusByTags || booking.status === activeTab;
    if (!matchesStatus) return false;

    if (destinationFilter !== "all" && booking.destination !== destinationFilter) return false;

    if (companyFilter) {
      const bookingCompany = booking.consignee || booking.customerName || "";
      if (bookingCompany !== companyFilter) return false;
      if (clientFilter && (booking.customerName || "") !== clientFilter) return false;
    }

    return true;
  });

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
        const containers = booking.containerNo ? booking.containerNo.split(",").map(c => c.trim()) : [];
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
      header: "Consignee / Client",
      cell: (booking) => (
        <>
          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
            {booking.consignee || booking.customerName}
          </div>
          {booking.consignee && booking.customerName && booking.consignee !== booking.customerName && (
            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>{booking.customerName}</div>
          )}
          {booking.companyName && booking.customerName !== booking.companyName && (
            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>{booking.companyName}</div>
          )}
        </>
      ),
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
          {getTimelineStatus(booking.docsTimeline)}
        </div>
      ),
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

            <StandardFilterDropdown
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: "all", label: "All Statuses" },
                ...IMPORT_STATUS_FILTER_OPTIONS.map(s => ({ value: s, label: s })),
              ]}
            />

            <StandardFilterDropdown
              value={destinationFilter}
              onChange={setDestinationFilter}
              options={[
                { value: "all", label: "All Destinations" },
                ...uniqueDestinations.map(d => ({ value: d, label: d })),
              ]}
            />

            <CompanyClientFilter
              items={bookings}
              getCompany={(b: any) => b.consignee || b.customerName || ""}
              getClient={(b: any) => b.customerName || ""}
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
            emptyTitle={searchTerm || activeTab !== "all" ? "No bookings match your filters" : "No import bookings yet"}
            emptyDescription={searchTerm || activeTab !== "all" ? undefined : "Create your first booking to get started"}
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
