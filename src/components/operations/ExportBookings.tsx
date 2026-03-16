import { useState, useEffect } from "react";
import { Plus, Search, Package } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { CreateExportBookingPanel } from "./CreateExportBookingPanel";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { toast } from "../ui/toast-utils";
import { ExportBookingDetails, ExportBooking } from "./ExportBookingDetails";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";

interface ExportBookingsProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

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

export function ExportBookings({ currentUser }: ExportBookingsProps = {}) {
  const [bookings, setBookings] = useState<ExportBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "in-transit" | "completed">("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ExportBooking | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/bookings`, {
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
        // Filter for Export bookings and map fields
        const allBookings = result.data;
        const exportBookings = allBookings
          .filter((b: any) => 
            b.booking_type === "Export" || 
            b.shipmentType === "Export" || 
            b.mode === "Export"
          )
          .map((b: any) => ({
            ...b,
            bookingId: b.id || b.bookingId, // Ensure bookingId exists
            customerName: b.customerName || b.client || b.clientName || "Unknown",
            companyName: b.companyName || b.company_name || "",
            contactPersonName: b.contactPersonName || b.contact_person_name || "",
            projectNumber: b.projectNumber || b.project_number,
            projectName: b.projectName || b.project_name
          }));
        setBookings(exportBookings);
      } else {
        setBookings([]);
      }
    } catch (error) {
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

  // Apply all filters
  const filteredBookings = bookings.filter(booking => {
    // Search filter
    const matchesSearch = 
      booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((booking as any).companyName && (booking as any).companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.mblMawb && booking.mblMawb.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Time period filter
    if (dateFilterStart || dateFilterEnd) {
      const bookingDate = new Date(booking.createdAt);
      const bookingISO = bookingDate.toISOString().split("T")[0];
      if (dateFilterStart && bookingISO < dateFilterStart) return false;
      if (dateFilterEnd && bookingISO > dateFilterEnd) return false;
    }

    // Status filter
    const matchesStatus = activeTab === "all" || 
      (activeTab === "draft" && booking.status === "Draft") || 
      (activeTab === "in-transit" && booking.status === "In Transit") || 
      (activeTab === "completed" && booking.status === "Completed");
    if (!matchesStatus) return false;

    // Company / Client filter
    if (companyFilter) {
      const bookingCompany = booking.customerName || "";
      if (bookingCompany !== companyFilter) return false;
      if (clientFilter) {
        const bookingClient = (booking as any).companyName || "";
        if (bookingClient !== clientFilter) return false;
      }
    }

    return true;
  });

  if (selectedBooking) {
    return (
      <ExportBookingDetails 
        booking={selectedBooking} 
        onBack={() => { 
          setSelectedBooking(null); 
          fetchBookings(); 
        }} 
        onBookingUpdated={fetchBookings}
        currentUser={currentUser}
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
                color: "#12332B", 
                marginBottom: "4px",
                letterSpacing: "-1.2px"
              }}>
                Export
              </h1>
              <p style={{ 
                fontSize: "14px", 
                color: "#667085"
              }}>
                Manage export operations and documentation
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
              placeholder="Search by Booking ID, Customer, Company, or MBL/MAWB..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 40px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                color: "#12332B",
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
              onChange={(e) => setActiveTab(e.target.value as "all" | "draft" | "in-transit" | "completed")}
              style={{
                padding: "10px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#12332B",
                backgroundColor: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="For Approval">For Approval</option>
              <option value="Approved">Approved</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Company / Client Filter */}
            <CompanyClientFilter
              items={bookings}
              getCompany={(b: any) => b.customerName || ""}
              getClient={(b: any) => b.companyName || ""}
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
              <div className="text-[#12332B]/60">Loading bookings...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-[#12332B]/60 mb-2">
                {searchTerm || activeTab !== "all" 
                  ? "No bookings match your filters" 
                  : "No export bookings yet"}
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
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#FFFFFF"
            }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#12332B]/10">
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
                      Shipper / Client
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
                        className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                            {booking.bookingId}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div title={booking.blNumber} style={{ fontSize: "14px", color: "#12332B", maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {booking.blNumber || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div title={booking.containerNo} style={{ fontSize: "14px", color: "#12332B" }}>
                            {displayContainer}{extraContainers}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "14px", color: "#12332B" }}>
                            {booking.shipper || booking.customerName}
                          </div>
                          {booking.shipper && booking.customerName && booking.shipper !== booking.customerName && (
                            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                              {booking.customerName}
                            </div>
                          )}
                          {(booking as any).companyName && booking.customerName !== (booking as any).companyName && (
                            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                              {(booking as any).companyName}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "13px", color: "#12332B" }}>
                            {booking.pod || booking.destination || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "13px", color: "#12332B" }}>
                            {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <NeuronStatusPill status={booking.status} />
                        </td>
                        <td className="py-4 px-4">
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                            {getTimelineStatus((booking as any).docsTimeline)}
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
        <CreateExportBookingPanel
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onBookingCreated={handleBookingCreated}
          currentUser={currentUser}
        />
      )}
    </>
  );
}