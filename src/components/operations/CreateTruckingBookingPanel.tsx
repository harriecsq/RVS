import { ArrowLeft, Truck } from "lucide-react";
import { useState } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { API_BASE_URL } from '@/utils/api-config';

interface CreateTruckingBookingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Styles lifted 1:1 from TruckingRecordDetails edit mode ─────────────────

/** Same as EditLabel in TruckingRecordDetails */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "8px", color: "#667085" }}>
      {children}
    </label>
  );
}

/** Same input styling as EditTextInput in TruckingRecordDetails */
const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #E5E9F0",
  fontSize: "14px",
  color: "#0A1D4D",
  outline: "none",
  backgroundColor: "#FFFFFF",
  boxSizing: "border-box" as const,
};

/** Same textarea styling as EditTextArea in TruckingRecordDetails */
const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  fontFamily: "inherit",
  resize: "vertical" as const,
  minHeight: "80px",
};

/** Teal uppercase sub-section header – identical to TruckingRecordDetails */
const SUB_HEADER: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#0F766E",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: "12px",
};

/** #E5E9F0 divider – identical to TruckingRecordDetails */
const DIVIDER: React.CSSProperties = {
  borderTop: "1px solid #E5E9F0",
  margin: "24px 0",
};

/** Card wrapper – identical to InfoCard in TruckingRecordDetails */
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      border: "1px solid #E5E9F0",
      overflow: "hidden",
      marginBottom: "24px",
    }}>
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid #E5E9F0",
        background: "#F9FAFB",
      }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: "24px" }}>
        {children}
      </div>
    </div>
  );
}

export function CreateTruckingBookingPanel({
  isOpen,
  onClose,
  onSuccess,
}: CreateTruckingBookingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    accountOwner: "",
    accountHandler: "",
    service: "",
    truckType: "",
    mode: "",
    preferredDeliveryDate: "",
    quotationReferenceNumber: "",
    status: "Draft",
    consignee: "",
    driver: "",
    helper: "",
    vehicleReferenceNumber: "",
    pullOut: "",
    deliveryAddress: "",
    deliveryInstructions: "",
    dateDelivered: "",
    tabsBooking: "",
    emptyReturn: "",
    cyFee: "No",
    eirAvailability: "",
    earlyGateIn: "No",
    detDemValidity: "",
    storageValidity: "",
    shippingLine: "",
  });

  const set = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName) {
      toast.error("Customer Name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/trucking-bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create trucking booking");
      }

      const result = await response.json();
      if (result.success) {
        toast.success("Trucking booking created successfully");
        onSuccess();
        onClose();
      } else {
        toast.error("Failed to create booking: " + result.error);
      }
    } catch (error) {
      console.error("Error creating trucking booking:", error);
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isFormValid = formData.customerName.trim() !== "";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(18, 51, 43, 0.15)",
          zIndex: 40,
        }}
      />

      {/* Side Panel — 680px, same as before */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100%",
          width: "680px",
          background: "white",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #E5E9F0",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px 48px",
          borderBottom: "1px solid #E5E9F0",
          background: "white",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#6B7280",
                borderRadius: "6px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                Create Trucking Booking
              </h1>
              <p style={{ fontSize: "13px", color: "#667085", margin: "2px 0 0" }}>
                Fill in the details below, then create
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div style={{
          background: "#F9FAFB",
          flex: 1,
          overflow: "auto",
        }}>
          <form onSubmit={handleSubmit} id="create-trucking-form" style={{ padding: "32px 48px" }}>

            {/* ════════════════════════════════════════════════════════════════
                BOOKING DETAILS — matches the Booking Details card
               ════════════════════════════════════════════════════════════════ */}
            <InfoCard title="Booking Details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Customer Name spans full row */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>Customer Name <span style={{ color: "#EF4444" }}>*</span></FieldLabel>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    placeholder="Enter customer name"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <FieldLabel>Consignee</FieldLabel>
                  <input
                    type="text"
                    value={formData.consignee}
                    onChange={(e) => set("consignee", e.target.value)}
                    placeholder="Consignee name"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Shipping Line</FieldLabel>
                  <input
                    type="text"
                    value={formData.shippingLine}
                    onChange={(e) => set("shippingLine", e.target.value)}
                    placeholder="Shipping line name"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <FieldLabel>Quotation Reference</FieldLabel>
                  <input
                    type="text"
                    value={formData.quotationReferenceNumber}
                    onChange={(e) => set("quotationReferenceNumber", e.target.value)}
                    placeholder="Quotation reference"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Service</FieldLabel>
                  <input
                    type="text"
                    value={formData.service}
                    onChange={(e) => set("service", e.target.value)}
                    placeholder="e.g., Container Delivery"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <FieldLabel>Truck Type</FieldLabel>
                  <input
                    type="text"
                    value={formData.truckType}
                    onChange={(e) => set("truckType", e.target.value)}
                    placeholder="e.g., 10-wheeler, Wing van"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Mode</FieldLabel>
                  <input
                    type="text"
                    value={formData.mode}
                    onChange={(e) => set("mode", e.target.value)}
                    placeholder="e.g., FCL, LCL"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>
            </InfoCard>

            {/* ════════════════════════════════════════════════════════════════
                DELIVERY DETAILS — matches Delivery Details card
               ════════════════════════════════════════════════════════════════ */}
            <InfoCard title="Delivery Details">
              {/* ── Delivery Schedule ── */}
              <div style={SUB_HEADER}>Delivery Schedule</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <FieldLabel>Preferred Delivery Date</FieldLabel>
                  <input
                    type="date"
                    value={formData.preferredDeliveryDate}
                    onChange={(e) => set("preferredDeliveryDate", e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Date Delivered</FieldLabel>
                  <input
                    type="date"
                    value={formData.dateDelivered}
                    onChange={(e) => set("dateDelivered", e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              <div style={DIVIDER} />

              {/* ── Delivery Address ── */}
              <div style={SUB_HEADER}>Delivery Address</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <FieldLabel>Pull Out Location</FieldLabel>
                  <input
                    type="text"
                    value={formData.pullOut}
                    onChange={(e) => set("pullOut", e.target.value)}
                    placeholder="Pull out location"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Delivery Address</FieldLabel>
                  <textarea
                    value={formData.deliveryAddress}
                    onChange={(e) => set("deliveryAddress", e.target.value)}
                    rows={3}
                    placeholder="Enter delivery address"
                    style={TEXTAREA_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Delivery Instructions</FieldLabel>
                  <textarea
                    value={formData.deliveryInstructions}
                    onChange={(e) => set("deliveryInstructions", e.target.value)}
                    rows={3}
                    placeholder="Special delivery instructions"
                    style={TEXTAREA_STYLE}
                  />
                </div>
              </div>
            </InfoCard>

            {/* ════════════════════════════════════════════════════════════════
                OPERATIONS & DETAILS — matches Operations & Details card
               ════════════════════════════════════════════════════════════════ */}
            <InfoCard title="Operations & Details">
              {/* ── Status ── */}
              <div style={SUB_HEADER}>Status</div>
              <div style={{ maxWidth: "320px" }}>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={formData.status}
                  onChange={(e) => set("status", e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="Draft">Draft</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div style={DIVIDER} />

              {/* ── Rate, Vendor & People ── */}
              <div style={SUB_HEADER}>Rate, Vendor & People</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <FieldLabel>Account Owner</FieldLabel>
                  <input
                    type="text"
                    value={formData.accountOwner}
                    onChange={(e) => set("accountOwner", e.target.value)}
                    placeholder="Account owner"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Account Handler</FieldLabel>
                  <input
                    type="text"
                    value={formData.accountHandler}
                    onChange={(e) => set("accountHandler", e.target.value)}
                    placeholder="Account handler"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Driver</FieldLabel>
                  <input
                    type="text"
                    value={formData.driver}
                    onChange={(e) => set("driver", e.target.value)}
                    placeholder="Driver name"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Helper</FieldLabel>
                  <input
                    type="text"
                    value={formData.helper}
                    onChange={(e) => set("helper", e.target.value)}
                    placeholder="Helper name"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Vehicle Reference Number</FieldLabel>
                  <input
                    type="text"
                    value={formData.vehicleReferenceNumber}
                    onChange={(e) => set("vehicleReferenceNumber", e.target.value)}
                    placeholder="Vehicle reference"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              <div style={DIVIDER} />

              {/* ── Storage & Demurrage Validity ── */}
              <div style={SUB_HEADER}>Storage & Demurrage Validity</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <FieldLabel>Det/Dem Validity</FieldLabel>
                  <input
                    type="date"
                    value={formData.detDemValidity}
                    onChange={(e) => set("detDemValidity", e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Storage Validity</FieldLabel>
                  <input
                    type="date"
                    value={formData.storageValidity}
                    onChange={(e) => set("storageValidity", e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              <div style={DIVIDER} />

              {/* ── Empty Return ── */}
              <div style={SUB_HEADER}>Empty Return</div>
              <div style={{ maxWidth: "320px" }}>
                <FieldLabel>Destination</FieldLabel>
                <input
                  type="text"
                  value={formData.emptyReturn}
                  onChange={(e) => set("emptyReturn", e.target.value)}
                  placeholder="Empty return location"
                  style={INPUT_STYLE}
                />
              </div>

              <div style={DIVIDER} />

              {/* ── Other Details ── */}
              <div style={SUB_HEADER}>Other Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>TABS Booking</FieldLabel>
                  <input
                    type="text"
                    value={formData.tabsBooking}
                    onChange={(e) => set("tabsBooking", e.target.value)}
                    placeholder="TABS booking reference"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>CY Fee</FieldLabel>
                  <select
                    value={formData.cyFee}
                    onChange={(e) => set("cyFee", e.target.value)}
                    style={INPUT_STYLE}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Early Gate In</FieldLabel>
                  <select
                    value={formData.earlyGateIn}
                    onChange={(e) => set("earlyGateIn", e.target.value)}
                    style={INPUT_STYLE}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>EIR Availability</FieldLabel>
                  <input
                    type="date"
                    value={formData.eirAvailability}
                    onChange={(e) => set("eirAvailability", e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>
            </InfoCard>

          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "16px 48px",
          borderTop: "1px solid #E5E9F0",
          background: "white",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #E5E9F0",
              background: "white",
              color: "#667085",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-trucking-form"
            disabled={!isFormValid || loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              backgroundColor: isFormValid && !loading ? "#0F766E" : "#A0C4BE",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: isFormValid && !loading ? "pointer" : "not-allowed",
              opacity: isFormValid && !loading ? 1 : 0.7,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (isFormValid && !loading) e.currentTarget.style.backgroundColor = "#0D6560";
            }}
            onMouseLeave={(e) => {
              if (isFormValid && !loading) e.currentTarget.style.backgroundColor = "#0F766E";
            }}
          >
            <Truck size={16} />
            {loading ? "Creating..." : "Create Booking"}
          </button>
        </div>
      </div>
    </>
  );
}
