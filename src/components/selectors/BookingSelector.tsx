import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { PortalDropdown } from "../shared/PortalDropdown";
import { publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';

interface Booking {
  id: string;
  trackingNo: string;
  client: string;
  clientName?: string;
  shipper?: string;
  status: string;
  bl_number?: string;
  awbBlNo?: string;
  booking_number?: string;
  shipmentType?: string;
  mode?: string;
}

interface BookingSelectorProps {
  value?: string;
  onSelect: (booking: Booking | null) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  bookingTypeFilter?: "import" | "export";
}

export function BookingSelector({
  value,
  onSelect,
  className,
  placeholder = "Select booking...",
  disabled = false,
  bookingTypeFilter,
}: BookingSelectorProps) {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        let response: Response | null = null;
        let lastError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await fetch(`${API_BASE_URL}/bookings`, {
              headers: { 'Authorization': `Bearer ${publicAnonKey}` }
            });
            break;
          } catch (fetchErr) {
            lastError = fetchErr;
            if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        if (!response) throw lastError || new Error("Failed to fetch bookings after retries");
        if (!response.ok) throw new Error("Failed to fetch bookings");
        const result = await response.json();
        if (result.success) {
          const mapped = result.data.map((b: any) => ({
            ...b,
            id: b.id || b.bookingId,
            trackingNo: b.trackingNumber || b.trackingNo || b.booking_number || b.id || b.bookingId,
            client: b.client || b.clientName || b.customerName || b.customer_name || b.shipper || "Unknown Client",
            status: b.status,
            bl_number: b.bl_number || b.blNumber || b.awbBlNo || b.awb_bl_no || "",
            shipmentType: b.shipmentType || b.booking_type || "Unknown",
          }));
          mapped.sort((a: any, b: any) => {
            const da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
            const db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
            return db - da;
          });
          setBookings(mapped);
        }
      } catch (error) {
        console.error("Error loading bookings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if ((open || (value && bookings.length === 0)) && !isLoading) {
      fetchBookings();
    }
  }, [open, value]);

  useEffect(() => { if (!open) setSearchQuery(""); }, [open]);

  const selectedBooking = bookings.find((b) => b.id === value) || null;

  const filteredBookings = bookings.filter((booking) => {
    if (bookingTypeFilter) {
      const type = (booking.shipmentType || "").toLowerCase();
      if (!type.includes(bookingTypeFilter)) return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      (booking.trackingNo || "").toLowerCase().includes(q) ||
      (booking.client || "").toLowerCase().includes(q) ||
      (booking.bl_number || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(!open); }}
        style={{
          width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px",
          border: "1px solid #E5E9F0", background: disabled ? "#F9FAFB" : "#FFFFFF",
          color: selectedBooking ? "#12332B" : "#9CA3AF", fontSize: "14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer", outline: "none", gap: "8px",
          opacity: disabled ? 0.7 : 1,
        }}
        className={className}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
          {selectedBooking ? selectedBooking.trackingNo : placeholder}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, color: "#9CA3AF", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
      </button>

      <PortalDropdown isOpen={open && !disabled} onClose={() => setOpen(false)} triggerRef={triggerRef} align="left">
        <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} color="#9CA3AF" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ref, BL Number, or Company..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", padding: "8px 12px 8px 30px", fontSize: "13px",
                border: "1px solid #E5E9F0", borderRadius: "6px", outline: "none",
                color: "#12332B", backgroundColor: "#F9FAFB", boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#237F66"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>No booking found.</div>
        ) : (
          filteredBookings.slice(0, 50).map((booking, idx) => {
            const isSelected = booking.id === value;
            const isLast = idx === Math.min(filteredBookings.length, 50) - 1;
            return (
              <div
                key={`${booking.id}-${idx}`}
                onClick={() => { onSelect(booking); setOpen(false); }}
                style={{
                  padding: "10px 12px", cursor: "pointer", fontSize: "14px", color: "#12332B",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                  backgroundColor: isSelected ? "#E8F2EE" : "transparent",
                  borderBottom: isLast ? "none" : "1px solid #E5E9F0",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#E8F2EE" : "transparent"; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {booking.trackingNo}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6B7A76", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {booking.client}{booking.bl_number ? ` • BL: ${booking.bl_number}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: "#F3F4F6", color: "#6B7A76" }}>
                    {booking.status}
                  </span>
                  {isSelected && <Check size={14} style={{ color: "#237F66" }} />}
                </div>
              </div>
            );
          })
        )}
      </PortalDropdown>
    </div>
  );
}
