import { useState, useEffect } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { BookingSelector } from "../selectors/BookingSelector";
import { useNavigate } from "react-router";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

// --- Interfaces ---

interface Booking {
  id: string;
  bookingId?: string;
  bookingNumber?: string;
  booking_number?: string;
  bookingDate?: string;
  booking_date?: string;
  created_at?: string;
  vesselVoyage?: string; // Combined field used in booking details
  vessel_voyage?: string; // Snake_case variant
  vessel?: string;
  voyage?: string;
  voyageNumber?: string;
  voyage_number?: string;
  blNumber?: string; // Bill of Lading
  bl_number?: string;
  awbBlNo?: string; // Alternative from CreateBooking
  origin?: string;
  pol?: string;
  portOfLoading?: string; // Alternative
  destination?: string;
  pod?: string; // Port of Discharge
  portOfDischarge?: string;
  volume?: string;
  measurement?: string; // Alternative
  containerNumbers?: string[];
  containerNo?: string; // Alternative string
  containers?: any[];
}

interface VatReturnForm {
  date: string;
  vesselVoy: string;
  blNumber: string;
  loadedAt: string;
  destination: string;
  jobDescription: string;
}

export function VatReturnsReport() {
  const navigate = useNavigate();
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  
  // Form State
  const [formData, setFormData] = useState<VatReturnForm>({
    date: "",
    vesselVoy: "",
    blNumber: "",
    loadedAt: "",
    destination: "",
    jobDescription: ""
  });

  // --- Handlers ---

  const handleBookingSelect = async (selectedBooking: any) => {
    if (!selectedBooking) {
        setSelectedBookingId("");
        return;
    }

    const bookingId = selectedBooking.id;
    setSelectedBookingId(bookingId);

    try {
        // Fetch the single booking by ID instead of all bookings
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
             headers: { Authorization: `Bearer ${publicAnonKey}` }
        });
        const result = await response.json();
        
        let booking: Booking | undefined;
        
        if (result.success && result.data) {
             booking = result.data as Booking;
        }

        if (!booking) {
            // Fallback to the object returned by selector if fetch fails or not found
            booking = selectedBooking;
        }

        if (booking) {
            // Populate Form
            
            // Date: MM/DD/YYYY
            let dateStr = "";
            // Prioritize bookingDate, then booking_date, then created_at
            const rawDate = booking.bookingDate || booking.booking_date || booking.created_at;
            if (rawDate) {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                 const month = String(d.getMonth() + 1).padStart(2, '0');
                 const day = String(d.getDate()).padStart(2, '0');
                 const year = d.getFullYear();
                 dateStr = `${month}/${day}/${year}`;
              }
            }

            // Vessel / Voy — prioritize the combined vesselVoyage field from booking details
            let vesselVoy = booking.vesselVoyage || booking.vessel_voyage || "";
            if (!vesselVoy) {
              // Fallback: construct from separate vessel + voyage fields
              const vessel = booking.vessel || "";
              const voyage = booking.voyage || booking.voyageNumber || booking.voyage_number || "";
              vesselVoy = [vessel, voyage].filter(Boolean).join(" / ");
            }

            // BL Number
            const bl = booking.blNumber || booking.bl_number || booking.awbBlNo || "";

            // Loaded At (POL)
            const loadedAt = booking.pol || booking.origin || booking.portOfLoading || "";

            // Destination (POD)
            const dest = booking.pod || booking.portOfDischarge || booking.destination || "";

            // Job Description: Volume + Container Numbers
            let containers = "";
            if (booking.containerNumbers && Array.isArray(booking.containerNumbers)) {
                containers = booking.containerNumbers.join(", ");
            } else if (booking.containerNo) {
                containers = booking.containerNo;
            }
            
            // Format: 1x40 HQ – WHSU3657240
            // Volume/Measurement
            const volume = booking.volume || booking.measurement || "";
            const jobDesc = [volume, containers].filter(Boolean).join(" – ");

            setFormData({
              date: dateStr,
              vesselVoy: vesselVoy,
              blNumber: bl,
              loadedAt: loadedAt,
              destination: dest,
              jobDescription: jobDesc
            });

            toast.success("Booking loaded successfully");
        }
    } catch (err) {
        console.error("Error fetching full booking details:", err);
        toast.error("Loaded booking, but failed to fetch some details");
    }
  };

  const handleInputChange = (field: keyof VatReturnForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = () => {
    if (!selectedBookingId) {
        toast.error("Please select a booking first");
        return;
    }

    const headers = [
      "Date",
      "Vessel / Voy",
      "Bill of Lading No",
      "Loaded At",
      "Destination",
      "Job Description"
    ];

    const row = [
      formData.date,
      formData.vesselVoy,
      formData.blNumber,
      formData.loadedAt,
      formData.destination,
      formData.jobDescription
    ];

    const csvContent = [
      headers.join(","),
      row.map(c => `"${c.replace(/"/g, '""')}"`).join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `VAT_Return_${formData.blNumber || "Shipment"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported successfully");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", paddingBottom: "48px" }}>
      {/* Header */}
      <div style={{
        padding: "20px 48px",
        background: "white",
        borderBottom: "1px solid #E5E7EB",
        maxWidth: "1440px",
        width: "100%",
        margin: "0 auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => navigate("/reports")}
            style={{
              background: "transparent",
              border: "none",
              padding: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "#6B7280",
              borderRadius: "6px"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ 
              fontSize: "20px", 
              fontWeight: 600, 
              color: "#12332B", 
              marginBottom: "2px"
            }}>
              VAT Returns
            </h1>
            <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
              Generate VAT-compliant shipment document.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "32px 48px", maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Booking Selector Card */}
        <div style={{ 
          backgroundColor: "white", 
          border: "1px solid #E5E7EB", 
          borderRadius: "12px", 
          overflow: "hidden",
          marginBottom: "24px"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: 0 }}>Select Booking</h3>
          </div>
          <div style={{ padding: "24px" }}>
            <div style={{ width: "100%" }}>
              <BookingSelector
                  value={selectedBookingId}
                  onSelect={handleBookingSelect}
                  placeholder="Search booking no..."
              />
            </div>
          </div>
        </div>

        {/* Editable Form Card */}
        <div style={{ 
          backgroundColor: "white", 
          border: "1px solid #E5E7EB", 
          borderRadius: "12px", 
          overflow: "hidden",
          marginBottom: "24px",
          opacity: selectedBookingId ? 1 : 0.6,
          pointerEvents: selectedBookingId ? "auto" : "none"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: 0 }}>
              Shipment Details
            </h3>
          </div>

          <div style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Date */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "6px" }}>
                Date
              </label>
              <input 
                type="text"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                style={{ width: "100%", minHeight: "42px", padding: "10px 12px", fontSize: "14px", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", color: "#12332B" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
              />
            </div>

            {/* Vessel / Voy */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "6px" }}>
                Vessel / Voy
              </label>
              <input 
                type="text"
                value={formData.vesselVoy}
                onChange={(e) => handleInputChange("vesselVoy", e.target.value)}
                style={{ width: "100%", minHeight: "42px", padding: "10px 12px", fontSize: "14px", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", color: "#12332B" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
              />
            </div>

            {/* Bill of Lading No */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "6px" }}>
                Bill of Lading No
              </label>
              <input 
                type="text"
                value={formData.blNumber}
                onChange={(e) => handleInputChange("blNumber", e.target.value)}
                style={{ width: "100%", minHeight: "42px", padding: "10px 12px", fontSize: "14px", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", color: "#12332B" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
              />
            </div>

            {/* Loaded At */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "6px" }}>
                Loaded At
              </label>
              <input 
                type="text"
                value={formData.loadedAt}
                onChange={(e) => handleInputChange("loadedAt", e.target.value)}
                style={{ width: "100%", minHeight: "42px", padding: "10px 12px", fontSize: "14px", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", color: "#12332B" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
              />
            </div>

            {/* Destination */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "6px" }}>
                Destination (POD)
              </label>
              <input 
                type="text"
                value={formData.destination}
                onChange={(e) => handleInputChange("destination", e.target.value)}
                style={{ width: "100%", minHeight: "42px", padding: "10px 12px", fontSize: "14px", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", color: "#12332B" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
              />
            </div>

            {/* Job Description */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "6px" }}>
                Job Description
              </label>
              <textarea 
                value={formData.jobDescription}
                onChange={(e) => handleInputChange("jobDescription", e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", color: "#12332B", resize: "vertical" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
              />
              <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>Example: 1x40 HC – WHSU3657240</p>
            </div>
          </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
                onClick={handleExport}
                disabled={!selectedBookingId}
                style={{ 
                    height: "44px", 
                    padding: "0 24px", 
                    fontSize: "14px", 
                    fontWeight: 600, 
                    color: "#FFFFFF", 
                    backgroundColor: selectedBookingId ? "#0F766E" : "#9CA3AF", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: selectedBookingId ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}
            >
                <Download size={18} />
                Export Excel
            </button>
        </div>

      </div>
    </div>
  );
}