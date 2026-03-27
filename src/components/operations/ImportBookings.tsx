import { useState, useEffect } from "react";
import { Plus, Search, Package, Briefcase, FileEdit, Clock, CheckCircle, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { CreateBrokerageBookingPanel } from "./CreateImportBookingPanel";
import { BrokerageBookingDetails } from "./ImportBookingDetails";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { toast } from "../ui/toast-utils";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";
import { API_BASE_URL } from '@/utils/api-config';

interface BrokerageBooking {
  bookingId: string;
  customerName: string;
  status: string;
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
}

interface ImportBookingsProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

const getTimelineStatus = (timeline: { step: string; datetime: string | null }[] | undefined) => {
  const STEPS = ["Draft", "Signed", "Final", "For Debit", "Debited"];
  if (!timeline) return "Draft";
  
  for (const step of STEPS) {
    const entry = timeline.find(t => t.step === step);
    if (!entry || !entry.datetime) {
      return step;
    }
  }
  return "Debited";
};

const IMPORT_STATUS_COLORS: Record<string, string> = {
  "For Gatepass": "#FBBC04",
  "Awaiting Discharge & CRO": "#4285F4",
  "For Debit For Final": "#FF6D01",
  "For Lodgement": "#FFFF00",
  "Awaiting Stowage": "#00FF00",
  "With Stowage / Discharged & Awaiting Signed Docs": "#9900FF",
  "With ETA": "#00FFFF",
  "Without ETA": "#EA4335"
};

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isBright = (hex: string) => {
  return ["#FFFF00", "#00FFFF", "#00FF00"].includes(hex.toUpperCase());
};

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
    
    // Check if we should auto-open create panel with pre-filled data
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
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Check for navigation state to auto-open a booking
  useEffect(() => {
    if (location.state?.openBookingId && bookings.length > 0) {
      const bookingToOpen = bookings.find(b => b.bookingId === location.state.openBookingId);
      if (bookingToOpen) {
        setSelectedBooking(bookingToOpen);
        // Clear the navigation state
        window.history.replaceState({}, document.title);
      }
    }
  }, [location, bookings]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Filter for Import bookings and map fields
        const allBookings = result.data;
        const importBookings = allBookings
          .filter((b: any) => 
            b.booking_type === "Import" || 
            b.shipmentType === "Import" || 
            b.mode === "Import"
          )
          .map((b: any) => ({
            ...b,
            bookingId: b.id || b.bookingId, // Ensure bookingId exists
            customerName: b.customerName || b.client || b.clientName || "Unknown",
            companyName: b.companyName || b.company_name || "",
            contactPersonName: b.contactPersonName || b.contact_person_name || "",
            projectNumber: b.projectNumber || b.project_number,
            projectName: b.projectName || b.project_name,
            docsTimeline: b.docsTimeline || []
          }));
        setBookings(importBookings);
      } else {
        // Silently set empty bookings - server might not be deployed yet
        setBookings([]);
      }
    } catch (error) {
      // Silently set empty bookings - server might not be deployed yet
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookingCreated = () => {
    setShowCreateModal(false);
    fetchBookings();
  };

  // Get unique values for filters
  const uniqueDestinations = Array.from(new Set(bookings.map(b => b.destination).filter(Boolean)));

  // Apply all filters
  const filteredBookings = bookings.filter(booking => {
    const timelineStatus = getTimelineStatus(booking.docsTimeline);
    // Search filter
    const matchesSearch = 
      booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((booking as any).companyName && (booking as any).companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.mblMawb && booking.mblMawb.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.projectNumber && booking.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      timelineStatus.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Time period filter
    if (dateFilterStart || dateFilterEnd) {
      const bookingDate = new Date(booking.createdAt);
      const bookingISO = bookingDate.toISOString().split("T")[0];
      if (dateFilterStart && bookingISO < dateFilterStart) return false;
      if (dateFilterEnd && bookingISO > dateFilterEnd) return false;
    }

    // Status filter
    const matchesStatus = activeTab === "all" || booking.status === activeTab;
    if (!matchesStatus) return false;

    // Destination filter
    if (destinationFilter !== "all" && booking.destination !== destinationFilter) return false;

    // Company / Client filter
    if (companyFilter) {
      const bookingCompany = booking.consignee || booking.customerName || "";
      if (bookingCompany !== companyFilter) return false;
      if (clientFilter) {
        const bookingClient = booking.customerName || "";
        if (bookingClient !== clientFilter) return false;
      }
    }

    return true;
  });

  // Calculate counts for tabs
  const allCount = bookings.length;
  const draftCount = bookings.filter(b => b.status === "Draft").length;
  const inTransitCount = bookings.filter(b => b.status === "In Transit").length;
  const completedCount = bookings.filter(b => b.status === "Completed").length;

  if (selectedBooking) {
    return (
      <BrokerageBookingDetails 
        booking={selectedBooking} 
        onBack={() => { 
          setSelectedBooking(null); 
          fetchBookings(); 
        }} 
        onBookingUpdated={fetchBookings} 
      />
    );
  }

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
        {/* Header */}
        <div style={{ padding: "32px 48px 24px 48px" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "start", 
            justifyContent: "space-between", 
            marginBottom: "24px" 
          }}>
            <div>
              <h1 style={{ 
                fontSize: "32px", 
                fontWeight: 600, 
                color: "#0A1D4D", 
                marginBottom: "4px",
                letterSpacing: "-1.2px"
              }}>
                Import
              </h1>
              <p style={{ 
                fontSize: "14px", 
                color: "#667085"
              }}>
                Manage import operations and customs clearance
              </p>
            </div>
            
            {/* Action Button */}
            <button
              onClick={() => setShowCreateModal(true)}
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
                color: "white",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              New Booking
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#667085",
              }}
            />
            <input
              type="text"
              placeholder="Search by Booking ID, Customer, Company, MBL/MAWB, or Project Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 40px",
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                color: "#0A1D4D",
                backgroundColor: "#FFFFFF",
              }}
            />
          </div>

          {/* Filter Row */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
            gap: "12px",
            marginBottom: "24px"
          }}>
            {/* Time Period Filter */}
            <div style={{ gridColumn: "span 2" }}>
              <UnifiedDateRangeFilter
                startDate={dateFilterStart}
                endDate={dateFilterEnd}
                onStartDateChange={setDateFilterStart}
                onEndDateChange={setDateFilterEnd}
                compact
              />
            </div>

            {/* Status Filter */}
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              style={{
                padding: "10px 12px",
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#0A1D4D",
                backgroundColor: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="For Gatepass">For Gatepass</option>
              <option value="Awaiting Discharge & CRO">Awaiting Discharge & CRO</option>
              <option value="For Debit For Final">For Debit For Final</option>
              <option value="For Lodgement">For Lodgement</option>
              <option value="Awaiting Stowage">Awaiting Stowage</option>
              <option value="With Stowage / Discharged & Awaiting Signed Docs">With Stowage / Discharged & Awaiting Signed Docs</option>
              <option value="With ETA">With ETA</option>
              <option value="Without ETA">Without ETA</option>
              <option value="Delivered">Delivered</option>
              <option value="Returned">Returned</option>
            </select>

            {/* Destination Filter */}
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              style={{
                padding: "10px 12px",
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#0A1D4D",
                backgroundColor: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Destinations</option>
              {uniqueDestinations.map(destination => (
                <option key={destination} value={destination}>{destination}</option>
              ))}
            </select>

            {/* Company / Client Filter */}
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

        {/* Table */}
        <div style={{ padding: "0 48px 48px 48px" }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#0A1D4D]/60">Loading bookings...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-[#0A1D4D]/60 mb-2">
                {searchTerm || activeTab !== "all" 
                  ? "No bookings match your filters" 
                  : "No import bookings yet"}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[#0F766E] hover:underline"
              >
                Create your first booking
              </button>
            </div>
          ) : (
            <div style={{
              border: "1px solid #E5E9F0",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#FFFFFF"
            }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#0A1D4D]/10">
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Booking Ref #
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      BL Number
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Container #
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Consignee / Client
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Destination
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Timeline
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    // Container Logic
                    const containers = booking.containerNo ? booking.containerNo.split(",").map(c => c.trim()) : [];
                    const displayContainer = containers.length > 0 ? containers[0] : "—";
                    const extraContainers = containers.length > 1 ? ` +${containers.length - 1}` : "";

                    return (
                      <tr
                        key={booking.bookingId}
                        className="border-b border-[#0A1D4D]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                            {booking.bookingId}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div title={booking.blNumber} style={{ fontSize: "14px", color: "#0A1D4D", maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {booking.blNumber || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div title={booking.containerNo} style={{ fontSize: "14px", color: "#0A1D4D" }}>
                            {displayContainer}{extraContainers}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                            {booking.consignee || booking.customerName}
                          </div>
                          {booking.consignee && booking.customerName && booking.consignee !== booking.customerName && (
                            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                              {booking.customerName}
                            </div>
                          )}
                          {booking.companyName && booking.customerName !== booking.companyName && (
                            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                              {booking.companyName}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
                            {booking.pod || booking.destination || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
                            {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {(() => {
                            const color = IMPORT_STATUS_COLORS[booking.status];
                            if (color) {
                               const isBrightColor = isBright(color);
                               return (
                                 <div style={{
                                   display: "inline-flex",
                                   alignItems: "center",
                                   justifyContent: "center",
                                   borderRadius: "20px",
                                   padding: "0 12px",
                                   height: "32px",
                                   fontSize: "14px",
                                   fontWeight: 500,
                                   whiteSpace: "nowrap",
                                   backgroundColor: hexToRgba(color, isBrightColor ? 0.08 : 0.12),
                                   color: isBrightColor ? "#111827" : color
                                 }}>
                                   {booking.status}
                                 </div>
                               );
                            }
                            return <NeuronStatusPill status={booking.status} />;
                          })()}
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                            {getTimelineStatus(booking.docsTimeline)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateBrokerageBookingPanel
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setPrefillData(null); // Clear prefill data when closing
          }}
          onBookingCreated={handleBookingCreated}
          currentUser={currentUser}
          prefillData={prefillData}
        />
      )}
    </>
  );
}

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  isActive: boolean;
  color: string;
  onClick: () => void;
}

function TabButton({ icon, label, count, isActive, color, onClick }: TabButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        background: "transparent",
        border: "none",
        borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
        color: isActive ? color : (isHovered ? "#0A1D4D" : "#667085"),
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: "-1px"
      }}
    >
      {icon}
      {label}
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 700,
          background: isActive ? color : `${color}15`,
          color: isActive ? "#FFFFFF" : color,
          minWidth: "20px",
          textAlign: "center"
        }}
      >
        {count}
      </span>
    </button>
  );
}

interface StatusTabButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function StatusTabButton({ label, count, isActive, onClick }: StatusTabButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        background: "transparent",
        border: "none",
        borderBottom: isActive ? `2px solid #0F766E` : "2px solid transparent",
        color: isActive ? "#0F766E" : (isHovered ? "#0A1D4D" : "#667085"),
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: "-1px"
      }}
    >
      {label}
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 700,
          background: isActive ? "#0F766E" : `#0F766E15`,
          color: isActive ? "#FFFFFF" : "#0F766E",
          minWidth: "20px",
          textAlign: "center"
        }}
      >
        {count}
      </span>
    </button>
  );
}