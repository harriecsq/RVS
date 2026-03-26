import { useState, useEffect } from "react";
import { Plus, Package, Plane, Ship, MapPin, ExternalLink } from "lucide-react";
import { BookingDetailPanel } from "../operations/BookingDetailPanel";
import { CreateBrokerageBookingPanel } from "../operations/CreateBrokerageBookingPanel";
import { CreateForwardingBookingPanel } from "../operations/forwarding/CreateForwardingBookingPanel";
import type { Project } from "../../types/pricing";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';

interface Booking {
  id?: string;
  bookingId?: string;
  booking_number?: string;
  booking_type: "Export" | "Import" | "Forwarding" | "Trucking" | "Brokerage";
  status: string;
  origin?: string;
  destination?: string;
  aodPod?: string;
  commodity?: string;
  commodityDescription?: string;
  cargoType?: string;
  mode?: string;
  etd?: string;
  eta?: string;
  has_trucking?: boolean;
  created_at?: string;
  createdAt?: string;
}

interface BookingsTabProps {
  project: Project;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    department: string;
  } | null;
  onUpdate: () => void;
}

interface BookingCardProps {
  booking: Booking;
  project: Project;
  onNavigateToBooking: () => void;
}

function BookingCard({ booking, project, onNavigateToBooking }: BookingCardProps) {
  const bookingNumber = booking.bookingId || booking.booking_number || booking.id || '';
  const commodity = booking.commodityDescription || booking.commodity || booking.cargoType || '';
  const origin = booking.origin || '';
  const destination = booking.destination || booking.aodPod || '';
  const mode = booking.mode || '';
  const etd = booking.etd || '';
  const eta = booking.eta || '';

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
      case "completed":
      case "paid":
        return { bg: "#E8F5E9", text: "#2E7D32" };
      case "in transit":
      case "sent":
      case "pending":
        return { bg: "#E3F2FD", text: "#1565C0" };
      case "preparing shipment":
      case "booking confirmed":
        return { bg: "#FFF3E0", text: "#E65100" };
      case "draft":
        return { bg: "#F5F5F5", text: "#616161" };
      default:
        return { bg: "#F5F5F5", text: "#616161" };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const statusColors = getStatusColor(booking.status);

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid var(--neuron-ui-border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Booking Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--neuron-ui-border)",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
        onClick={onNavigateToBooking}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#F9FAFB";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "white";
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            {/* Header Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: booking.booking_type === "Export" ? "#FFF3E0" : "#E3F2FD",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {booking.booking_type === "Export" ? (
                  <Plane size={16} style={{ color: "#E65100" }} />
                ) : (
                  <Ship size={16} style={{ color: "#1565C0" }} />
                )}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#12332B" }}>
                    {bookingNumber}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 500,
                      backgroundColor: booking.booking_type === "Export" ? "#FFF3E0" : "#E3F2FD",
                      color: booking.booking_type === "Export" ? "#E65100" : "#1565C0",
                    }}
                  >
                    {booking.booking_type}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", marginTop: "2px" }}>
                  {commodity}
                </div>
              </div>
            </div>

            {/* Route Info */}
            {(origin || destination) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "12px",
                  paddingLeft: "44px",
                }}
              >
                {origin && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={14} style={{ color: "var(--neuron-ink-muted)" }} />
                    <span style={{ fontSize: "13px", color: "var(--neuron-ink-secondary)" }}>
                      {origin}
                    </span>
                  </div>
                )}
                {origin && destination && <span style={{ color: "var(--neuron-ink-muted)" }}>→</span>}
                {destination && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={14} style={{ color: "var(--neuron-ink-muted)" }} />
                    <span style={{ fontSize: "13px", color: "var(--neuron-ink-secondary)" }}>
                      {destination}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Details Row */}
            <div style={{ display: "flex", gap: "24px", paddingLeft: "44px", fontSize: "13px", flexWrap: "wrap" }}>
              {mode && (
                <div>
                  <span style={{ color: "var(--neuron-ink-muted)" }}>Mode: </span>
                  <span style={{ color: "var(--neuron-ink-secondary)", fontWeight: 500 }}>
                    {mode}
                  </span>
                </div>
              )}
              {etd && (
                <div>
                  <span style={{ color: "var(--neuron-ink-muted)" }}>ETD: </span>
                  <span style={{ color: "var(--neuron-ink-secondary)", fontWeight: 500 }}>
                    {new Date(etd).toLocaleDateString()}
                  </span>
                </div>
              )}
              {eta && (
                <div>
                  <span style={{ color: "var(--neuron-ink-muted)" }}>ETA: </span>
                  <span style={{ color: "var(--neuron-ink-secondary)", fontWeight: 500 }}>
                    {new Date(eta).toLocaleDateString()}
                  </span>
                </div>
              )}
              {booking.has_trucking && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                    backgroundColor: "#E8F5E9",
                    color: "#2E7D32",
                  }}
                >
                  With Trucking
                </span>
              )}
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
            <span
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                backgroundColor: statusColors.bg,
                color: statusColors.text,
              }}
            >
              {booking.status}
            </span>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to billing creation in accounting module
                  const route = project.movement === "Export" ? "/accounting/billings" : "/accounting/expenses";
                  const win = window as any;
                  if (win.navigate) {
                    win.navigate(route, {
                      state: { prefillBookingNumber: bookingNumber, prefillProjectNumber: project.project_number }
                    });
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  backgroundColor: "white",
                  color: "#0F766E",
                  border: "1px solid #0F766E",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0F766E";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.color = "#0F766E";
                }}
              >
                <Plus size={14} />
                Billing
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#0F766E" }}>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>View Details</span>
              <ExternalLink size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingsTab({ project, currentUser, onUpdate }: BookingsTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCreateForwardingBookingPanel, setShowCreateForwardingBookingPanel] = useState(false);
  const [showCreateBrokerageBookingPanel, setShowCreateBrokerageBookingPanel] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [project.id]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/bookings`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBooking = () => {
    // Open the appropriate create booking panel based on project movement
    if (project.movement === "Export") {
      setShowCreateForwardingBookingPanel(true);
    } else if (project.movement === "Import") {
      setShowCreateBrokerageBookingPanel(true);
    }
  };

  const handleViewBooking = (booking: Booking) => {
    // Open booking detail panel instead of navigating
    setSelectedBooking(booking);
  };

  const getBookingType = (booking: Booking): "forwarding" | "brokerage" | "trucking" | "others" => {
    const type = booking.booking_type?.toLowerCase();
    if (type === "export" || type === "forwarding") return "forwarding";
    if (type === "import" || type === "brokerage") return "brokerage";
    if (type === "trucking") return "trucking";
    return "others";
  };

  // Build comprehensive prefill data with all overlapping fields
  const getPrefillData = () => {
    const clientId = Array.isArray(project.client_ids) ? project.client_ids[0] : project.client_id;
    const clientName = Array.isArray(project.client_names) ? project.client_names[0] : project.client_name;
    
    return {
      projectId: project.id,
      projectNumber: project.project_number,
      projectName: project.project_name || project.quotation_name,
      clientId: clientId,
      clientName: clientName,
      commodity: project.commodity,
      volume_containers: project.volume_containers,
      shipping_line: project.shipping_line,
      vessel_voyage: project.vessel_voyage,
      trucker: project.trucker,
      // Export-specific fields
      ...(project.movement === "Export" && {
        destination: project.destination,
        loading_address: project.loading_address,
        loading_schedule: project.loading_schedule,
      }),
      // Import-specific fields
      ...(project.movement === "Import" && {
        origin: project.origin,
        pod: project.pod,
      }),
    };
  };

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      {/* Main Content Area */}
      <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header Section */}
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid var(--neuron-ui-border)",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--neuron-brand-green)",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Package size={18} />
              Project Bookings
            </h2>
          </div>
          <button
            onClick={handleCreateBooking}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              backgroundColor: "#0F766E",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0D6A63";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0F766E";
            }}
          >
            <Plus size={16} />
            Create Booking
          </button>
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--neuron-ink-muted)", fontSize: "14px" }}>Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <Package size={48} style={{ color: "#E5E9F0", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", marginBottom: "8px" }}>
              No Bookings Yet
            </h3>
            <p style={{ fontSize: "14px", color: "var(--neuron-ink-muted)" }}>
              Create your first booking for this project using the button above
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id || booking.bookingId}
                booking={booking}
                project={project}
                onNavigateToBooking={() => handleViewBooking(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking Detail Panel */}
      {selectedBooking && (
        <BookingDetailPanel
          isOpen={selectedBooking !== null}
          onClose={() => setSelectedBooking(null)}
          booking={selectedBooking}
          bookingType={getBookingType(selectedBooking)}
          onBookingUpdated={() => {
            fetchBookings();
            onUpdate();
          }}
          currentUser={currentUser}
        />
      )}

      {/* Create Forwarding Booking Panel */}
      {showCreateForwardingBookingPanel && (
        <CreateForwardingBookingPanel
          isOpen={showCreateForwardingBookingPanel}
          onClose={() => setShowCreateForwardingBookingPanel(false)}
          currentUser={currentUser}
          prefillData={getPrefillData()}
          onBookingCreated={() => {
            setShowCreateForwardingBookingPanel(false);
            fetchBookings();
            onUpdate();
          }}
        />
      )}

      {/* Create Brokerage Booking Panel */}
      {showCreateBrokerageBookingPanel && (
        <CreateBrokerageBookingPanel
          isOpen={showCreateBrokerageBookingPanel}
          onClose={() => setShowCreateBrokerageBookingPanel(false)}
          currentUser={currentUser}
          prefillData={getPrefillData()}
          onBookingCreated={() => {
            setShowCreateBrokerageBookingPanel(false);
            fetchBookings();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}