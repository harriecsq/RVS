import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Download,
  Truck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  FileCheck,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { useNavigate } from "react-router";
import { toast } from "sonner@2.0.3";

interface Booking {
  id: string;
  trackingNo: string;
  trackingNumber?: string; // API field
  bookingNumber?: string; // Legacy field
  client: string;
  clientName?: string; // API field
  shipper?: string;
  consignee?: string;
  pickup: string;
  origin?: string; // API field
  dropoff: string;
  destination?: string; // API field
  status: string;
  deliveryType?: "Import" | "Export" | "Domestic";
  shipmentType?: string; // API field
  deliveryDate: string;
  eta?: string; // API field
  delivered_at?: string;
  profit: number;
  driver?: string;
  vehicle?: string;
  notes?: string;
  specialInstructions?: string; // API field
  created_at?: string;
}

interface BookingsProps {
  bookings?: Booking[];
  onCreateBooking?: () => void;
  onViewDetail?: (bookingId: string) => void;
  onViewFull?: (bookingId: string) => void;
  onViewBooking?: (booking: Booking) => void;
}

// Status pill component
function StatusPill({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string }> = {
    "For Delivery": { bg: "#E8F2EE", text: "#0F766E" },
    "In Transit": { bg: "#FFF3E0", text: "#F25C05" },
    "Delivered": { bg: "#E8F5E9", text: "#10b981" },
    "Created": { bg: "#F3F4F6", text: "#6B7280" },
    "Draft": { bg: "#F3F4F6", text: "#6B7280" },
    "Cancelled": { bg: "#FEE2E2", text: "#EF4444" },
    "Closed": { bg: "#F9FAFB", text: "#6B7280" },
  };

  const config = statusConfig[status] || statusConfig["Created"];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 500,
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {status}
    </div>
  );
}

// KPI Card component
function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: any;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "transparent",
        borderRadius: "12px",
        border: "1px solid #E5E9F0",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Icon size={14} style={{ color: "#667085" }} />
        <span style={{ fontSize: "11px", fontWeight: 500, color: "#667085" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F766E", lineHeight: "1.2" }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "#667085" }}>{subtext}</div>
    </div>
  );
}

export function Bookings({ onCreateBooking }: BookingsProps) {
  const navigate = useNavigate();
  const [currentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const fetchBookings = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8/bookings`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch bookings");
      
      const result = await response.json();
      if (result.success) {
        // Map API data to component state
        const mappedBookings = result.data.map((b: any) => ({
          ...b,
          id: b.id,
          trackingNo: b.trackingNumber || b.trackingNo || b.booking_number || b.id,
          client: b.client || b.clientName || b.customerName || b.customer_name || b.shipper || "Unknown Client",
          pickup: b.origin || b.pickup || "N/A",
          dropoff: b.destination || b.dropoff || "N/A",
          status: b.status || "Created",
          deliveryDate: b.eta || b.deliveryDate || "TBD",
          created_at: b.created_at
        }));
        
        // Remove duplicates based on ID
        const uniqueBookings = Array.from(new Map(mappedBookings.map((item: any) => [item.id, item])).values()) as Booking[];
        
        // Sort by created_at desc
        uniqueBookings.sort((a: any, b: any) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        
        setBookings(uniqueBookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Group bookings by date
  const groupedBookings = bookings.reduce((groups: any, booking) => {
    const date = booking.created_at ? new Date(booking.created_at).toISOString().split('T')[0] : 'Unknown Date';
    if (!groups[date]) {
      groups[date] = {
        date,
        label: booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() : 'UNKNOWN DATE',
        bookings: []
      };
    }
    groups[date].bookings.push(booking);
    return groups;
  }, {});

  const bookingGroups = Object.values(groupedBookings).sort((a: any, b: any) => b.date.localeCompare(a.date));

  // Handle navigate to create
  const handleCreate = () => {
    if (onCreateBooking) {
      onCreateBooking();
    } else {
      navigate('/operations/create');
    }
  };

  // Handle navigate to detail
  const handleViewDetail = (booking: Booking) => {
    navigate(`/operations/${booking.id}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
      }}
    >
      {/* Main Content */}
      <div
        style={{
          padding: "32px 48px",
          maxWidth: "100%",
          margin: "0 auto",
        }}
      >
        {/* Page Header Row - Title + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: 600, color: "#12332B", marginBottom: "4px", letterSpacing: "-1.2px" }}>
              Bookings
            </h1>
            <p style={{ fontSize: "14px", color: "#667085" }}>
              Manage Bookings
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={fetchBookings}
              disabled={isRefreshing}
              style={{
                height: "48px",
                width: "48px",
                borderRadius: "16px",
                background: "transparent",
                border: "1px solid #E5E9F0",
                color: "#12332B",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 200ms ease-out",
              }}
            >
              <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleCreate}
              style={{
                height: "48px",
                padding: "0 24px",
                borderRadius: "16px",
                background: "#0F766E",
                border: "none",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(15, 118, 110, 0.2)",
                transition: "all 200ms ease-out",
                outline: "none",
              }}
            >
              <Plus size={20} />
              Create New Booking
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <KPICard
            icon={Truck}
            label="Total Bookings"
            value={bookings.length.toString()}
            subtext="All time"
          />
          <KPICard
            icon={Clock}
            label="Pending Deliveries"
            value={bookings.filter(b => b.status !== 'Delivered' && b.status !== 'Cancelled').length.toString()}
            subtext="Active shipments"
          />
          <KPICard
            icon={FileCheck}
            label="Completed Bookings"
            value={bookings.filter(b => b.status === 'Delivered').length.toString()}
            subtext="Successfully delivered"
          />
        </div>

        {/* Filter Bar */}
        <div
          style={{
            background: "transparent",
            borderRadius: "12px",
            border: "1px solid #E5E9F0",
            padding: "12px 20px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 280px", minWidth: "280px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#667085",
              }}
            />
            <input
              placeholder="Search bookings by ID, client, or tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "36px",
                paddingRight: "12px",
                height: "40px",
                fontSize: "14px",
                border: "1px solid #E5E9F0",
                borderRadius: "12px",
                background: "#FFFFFF",
                outline: "none",
                color: "#12332B",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Export Button */}
          <button
            style={{
              height: "40px",
              padding: "0 16px",
              borderRadius: "12px",
              border: "1px solid #E5E9F0",
              background: "transparent",
              fontSize: "14px",
              fontWeight: 500,
              color: "#12332B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
              whiteSpace: "nowrap",
              marginLeft: "auto"
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Bookings Table */}
        <div
          style={{
            background: "transparent",
            borderRadius: "12px",
            border: "1px solid #E5E9F0",
            overflow: "hidden",
            minHeight: "400px"
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#667085]">
              <Truck size={48} className="mb-4 opacity-20" />
              <p>No bookings found. Create one to get started.</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 2fr 1fr 1.5fr",
                  padding: "12px 20px",
                  borderBottom: "1px solid #E5E9F0",
                  background: "#F9FAFB",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", letterSpacing: "0.5px" }}>
                  TRACKING NO.
                </div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", letterSpacing: "0.5px" }}>
                  CLIENT
                </div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", letterSpacing: "0.5px" }}>
                  ROUTE
                </div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", letterSpacing: "0.5px" }}>
                  STATUS
                </div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                  DELIVERY
                </div>
              </div>

              {/* Table Body */}
              <div>
                {(bookingGroups as any[]).map((group) => (
                  <div key={group.date}>
                    {/* Date Group Header */}
                    <div
                      style={{
                        padding: "8px 20px",
                        background: "#F9FAFB",
                        borderBottom: "1px solid #E5E9F0",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", letterSpacing: "0.5px" }}>
                        {group.label}
                      </div>
                    </div>

                    {/* Bookings in this date group */}
                    {group.bookings.map((booking: Booking, index: number) => (
                      <div
                        key={booking.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1.5fr 2fr 1fr 1.5fr",
                          padding: "16px 20px",
                          borderBottom: index < group.bookings.length - 1 || (bookingGroups as any[]).indexOf(group) < (bookingGroups as any[]).length - 1 ? "1px solid #E5E9F0" : "none",
                          cursor: "pointer",
                          transition: "background 150ms ease",
                        }}
                        onClick={() => handleViewDetail(booking)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#F9FAFB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Tracking Number */}
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
                          {booking.trackingNo}
                        </div>

                        {/* Client */}
                        <div style={{ fontSize: "14px", color: "#12332B" }}>
                          {booking.client}
                        </div>

                        {/* Route */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#667085" }}>
                          <Truck size={14} style={{ flexShrink: 0 }} />
                          <span>{booking.pickup}</span>
                          <ArrowRight size={14} style={{ flexShrink: 0 }} />
                          <span>{booking.dropoff}</span>
                        </div>

                        {/* Status */}
                        <div>
                          <StatusPill status={booking.status} />
                        </div>

                        {/* Delivery */}
                        <div style={{ fontSize: "14px", color: "#667085" }}>
                          ETA • {booking.deliveryDate}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}