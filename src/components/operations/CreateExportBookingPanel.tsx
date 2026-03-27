import { ArrowLeft, ChevronDown, Plus, Trash2, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import { SHIPPING_LINE_OPTIONS, CONTAINER_SIZES } from "../../utils/truckingTags";
import { NeuronDatePicker } from "./shared/NeuronDatePicker";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import { API_BASE_URL } from '@/utils/api-config';
import { PanelBackdrop } from "../shared/PanelBackdrop";

interface CreateExportBookingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
  prefillData?: {
    clientId?: string;
    clientName?: string;
    commodity?: string;
    volume_containers?: string;
    shipping_line?: string;
    vessel_voyage?: string;
    trucker?: string;
    origin?: string;
    pod?: string;
  } | null;
}

/* ── Section title ── */
function SectionTitle({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div
      style={{
        marginTop: first ? 0 : 28,
        marginBottom: 16,
        paddingBottom: 10,
        borderBottom: "1px solid #E5E9F0",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        color: "#0F766E",
      }}
    >
      {children}
    </div>
  );
}

/* ── Neuron-styled dropdown ── */
function NeuronDropdown({
  value,
  options,
  onChange,
  placeholder = "Select...",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          color: value ? "#0A1D4D" : "#9CA3AF",
          fontWeight: value ? 500 : 400,
          backgroundColor: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          outline: "none",
          minHeight: "42px",
        }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown
          size={16}
          color="#667085"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "white",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
            zIndex: 9999,
            maxHeight: "220px",
            overflowY: "auto" as const,
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={{
                padding: "10px 14px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                color: "#0A1D4D",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: value === opt ? "#F0FAF8" : "transparent",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (value !== opt) e.currentTarget.style.backgroundColor = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = value === opt ? "#F0FAF8" : "transparent";
              }}
            >
              {opt}
              {value === opt && <Check size={14} style={{ color: "#0F766E" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Searchable shipping-line dropdown ── */
function ShippingLineDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? SHIPPING_LINE_OPTIONS.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : SHIPPING_LINE_OPTIONS;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          color: value ? "#111827" : "#9CA3AF",
          fontWeight: value ? 500 : 400,
          backgroundColor: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          outline: "none",
          minHeight: "42px",
        }}
      >
        {value || "Select shipping line"}
        <ChevronDown
          size={16}
          color="#667085"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "white",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
            zIndex: 9999,
            maxHeight: "300px",
            overflowY: "auto" as const,
          }}
        >
          <div
            style={{
              padding: "8px",
              borderBottom: "1px solid #E5E9F0",
              position: "sticky" as const,
              top: 0,
              background: "white",
              zIndex: 1,
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "13px",
                border: "1px solid #E5E9F0",
                borderRadius: "6px",
                outline: "none",
                color: "#111827",
                backgroundColor: "#F9FAFB",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#0F766E";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E9F0";
              }}
            />
          </div>
          {filtered.map((option, index) => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
                setSearch("");
              }}
              style={{
                padding: "10px 14px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: value === option ? "#F0FDF4" : "transparent",
                borderBottom: index < filtered.length - 1 ? "1px solid #E5E9F0" : "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (value !== option) e.currentTarget.style.background = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                if (value !== option) e.currentTarget.style.background = "transparent";
              }}
            >
              {option}
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: "12px 14px",
                fontSize: "13px",
                color: "#9CA3AF",
                textAlign: "center" as const,
              }}
            >
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Neuron text input ── */
const neuronInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  border: "1px solid #E5E9F0",
  borderRadius: "8px",
  color: "#0A1D4D",
  backgroundColor: "white",
  outline: "none",
  transition: "all 0.2s",
  minHeight: "42px",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 500,
  marginBottom: "8px",
  color: "#667085",
};

function NeuronInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={neuronInputStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#D0D5DD";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E5E9F0";
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#0F766E";
        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(15, 118, 110, 0.1)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#E5E9F0";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

/* ── Date + Time row (side by side) ── */
function DateTimeField({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
}: {
  dateValue: string;
  timeValue: string;
  onDateChange: (iso: string) => void;
  onTimeChange: (t: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <div style={{ flex: 1 }}>
        <NeuronDatePicker value={dateValue} onChange={onDateChange} />
      </div>
      <div style={{ flex: 1 }}>
        <NeuronTimePicker value={timeValue} onChange={onTimeChange} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════ */

export function CreateExportBookingPanel({
  isOpen,
  onClose,
  onBookingCreated,
  currentUser,
  prefillData,
}: CreateExportBookingPanelProps) {
  const [loading, setLoading] = useState(false);

  // ── Shipment Details ──
  const [date, setDate] = useState("");
  const [clientId, setClientId] = useState(prefillData?.clientId || "");
  const [contactId, setContactId] = useState("");
  const [client, setClient] = useState(prefillData?.clientName || "");
  const [companyName, setCompanyName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [containerNumbers, setContainerNumbers] = useState<string[]>([""]);
  const [blNumber, setBlNumber] = useState("");
  const [volume, setVolume] = useState(prefillData?.volume_containers || "");
  const [commodity, setCommodity] = useState(prefillData?.commodity || "");
  const [sealNo, setSealNo] = useState("");
  const [shippingLine, setShippingLine] = useState(prefillData?.shipping_line || "");
  const [bookingNumber, setBookingNumber] = useState("");
  const [origin, setOrigin] = useState(prefillData?.origin || "");
  const [showPolDropdown, setShowPolDropdown] = useState(false);
  const polRef = useRef<HTMLDivElement>(null);
  const [pod, setPod] = useState(prefillData?.pod || "");

  // ── Vessel/VOY Details ──
  const [vesselVoyage, setVesselVoyage] = useState(prefillData?.vessel_voyage || "");
  const [etd, setEtd] = useState("");
  const [etdTime, setEtdTime] = useState("");
  const [atd, setAtd] = useState("");
  const [atdTime, setAtdTime] = useState("");
  const [eta, setEta] = useState("");
  const [etaTime, setEtaTime] = useState("");
  const [vesselStatus, setVesselStatus] = useState("VESSEL IS NOT OPEN");
  const [lctEdArrastre, setLctEdArrastre] = useState("");
  const [lctEdArrastreTime, setLctEdArrastreTime] = useState("");
  const [lctCargo, setLctCargo] = useState("");
  const [lctCargoTime, setLctCargoTime] = useState("");

  // ── Domestic Cost ──
  const [domesticFreight, setDomesticFreight] = useState("");
  const [hustlingStripping, setHustlingStripping] = useState("");
  const [forkliftOperator, setForkliftOperator] = useState("");

  // ── Customs Processing ──
  const [exportDivision, setExportDivision] = useState("");
  const [lodgmentCdsFee, setLodgmentCdsFee] = useState("");
  const [formE, setFormE] = useState("");

  // ── Shipping Line Cost ──
  const [oceanFreight, setOceanFreight] = useState("");
  const [sealFee, setSealFee] = useState("");
  const [docsFee, setDocsFee] = useState("");
  const [lssFee, setLssFee] = useState("");
  const [storageCost, setStorageCost] = useState("");

  // ── Port Charges Cost ──
  const [arrastre, setArrastre] = useState("");
  const [shutOut, setShutOut] = useState("");

  // ── Miscellaneous Cost ──
  const [royaltyFee, setRoyaltyFee] = useState("");
  const [lona, setLona] = useState("");
  const [lalamove, setLalamove] = useState("");
  const [bir, setBir] = useState("");
  const [labor, setLabor] = useState("");
  const [otherCharges, setOtherCharges] = useState("");

  // Handle prefill data
  useEffect(() => {
    if (isOpen && prefillData) {
      setClientId(prefillData.clientId || "");
    }
  }, [isOpen, prefillData]);

  // Container number helpers
  const addContainerRow = () => setContainerNumbers([...containerNumbers, ""]);
  const removeContainerRow = (index: number) =>
    setContainerNumbers(containerNumbers.filter((_, i) => i !== index));
  const updateContainerRow = (index: number, value: string) => {
    const updated = [...containerNumbers];
    updated[index] = value;
    setContainerNumbers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client.trim()) {
      toast.error("Client is required");
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        date,
        customerName: client,
        companyName: companyName || client,
        clientId,
        contactId,
        contactPersonName,
        containerNo: containerNumbers.filter((c) => c.trim()).join(", "),
        blNumber,
        volume,
        commodity,
        sealNo,
        shippingLine,
        bookingNumber,
        origin,
        pod,
        vesselVoyage,
        etd,
        etdTime,
        atd,
        atdTime,
        eta,
        etaTime,
        vesselStatus,
        lctEdArrastre,
        lctEdArrastreTime,
        lctCargo,
        lctCargoTime,
        domesticFreight,
        hustlingStripping,
        forkliftOperator,
        exportDivision,
        lodgmentCdsFee,
        formE,
        oceanFreight,
        sealFee,
        docsFee,
        lssFee,
        storageCost,
        arrastre,
        shutOut,
        royaltyFee,
        lona,
        lalamove,
        bir,
        labor,
        otherCharges,
        createdBy: currentUser?.name || "Unknown",
        createdAt: new Date().toISOString(),
        shipmentType: "Export",
        booking_type: "Export",
        mode: "Sea",
      };

      const response = await fetch(`${API_BASE_URL}/export-bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Export booking created successfully");
        onBookingCreated();
        handleClose();
      } else {
        toast.error("Error creating booking: " + result.error);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Unable to create booking");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setDate("");
    setClient("");
    setCompanyName("");
    setClientId("");
    setContactId("");
    setContactPersonName("");
    setContainerNumbers([""]);
    setBlNumber("");
    setVolume("");
    setCommodity("");
    setSealNo("");
    setShippingLine("");
    setBookingNumber("");
    setOrigin("");
    setPod("");
    setVesselVoyage("");
    setEtd("");
    setEtdTime("");
    setAtd("");
    setAtdTime("");
    setEta("");
    setEtaTime("");
    setVesselStatus("VESSEL IS NOT OPEN");
    setLctEdArrastre("");
    setLctEdArrastreTime("");
    setLctCargo("");
    setLctCargoTime("");
    setDomesticFreight("");
    setHustlingStripping("");
    setForkliftOperator("");
    setExportDivision("");
    setLodgmentCdsFee("");
    setFormE("");
    setOceanFreight("");
    setSealFee("");
    setDocsFee("");
    setLssFee("");
    setStorageCost("");
    setArrastre("");
    setShutOut("");
    setRoyaltyFee("");
    setLona("");
    setLalamove("");
    setBir("");
    setLabor("");
    setOtherCharges("");
  };

  if (!isOpen) return null;

  const isFormValid = client.trim() !== "";

  /* ── 2-col helper ── */
  const twoCol: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  };

  return (
    <>
      {/* Backdrop */}
      <PanelBackdrop onClick={handleClose} />

      {/* Side Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in"
        style={{
          borderLeft: "1px solid var(--neuron-ui-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-10 py-8 border-b"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#0F766E]/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#0A1D4D]" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-[#0A1D4D] mb-1">
                Create Export Booking
              </h2>
              <p className="text-sm text-[#667085]">
                Fill in the details for export customs clearance and brokerage
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form onSubmit={handleSubmit} id="create-export-form" className="space-y-4">

            {/* ═══════════════ SHIPMENT DETAILS ═══════════════ */}
            <SectionTitle first>Shipment Details</SectionTitle>

            {/* Row 1: Date + Company/Contact */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Date</label>
                <NeuronDatePicker value={date} onChange={setDate} />
              </div>
              <div>
                <CompanyContactSelector
                  companyId={clientId}
                  contactId={contactId}
                  onSelect={({ company, contact }) => {
                    const cName = company ? (company.name || company.company_name || "") : "";
                    setCompanyName(cName);
                    if (company) {
                      setClientId(company.id);
                    } else {
                      setClientId("");
                    }
                    if (contact) {
                      setContactId(contact.id);
                      setContactPersonName(contact.name);
                      setClient(contact.name);
                    } else {
                      setContactId("");
                      setContactPersonName("");
                      setClient(cName);
                    }
                  }}
                />
              </div>
            </div>

            {/* Row 2: Container No. + BL Number + Volume */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              {/* Container Number — repeatable */}
              <div>
                <label style={labelStyle}>Container No.</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {containerNumbers.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        value={c}
                        onChange={(e) => updateContainerRow(i, e.target.value)}
                        placeholder={`Container #${i + 1}`}
                        style={{
                          ...neuronInputStyle,
                          flex: 1,
                          width: "auto",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#0F766E";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#E5E9F0";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeContainerRow(i)}
                        disabled={containerNumbers.length <= 1}
                        style={{
                          padding: "8px",
                          color: "#EF4444",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: containerNumbers.length <= 1 ? "not-allowed" : "pointer",
                          opacity: containerNumbers.length <= 1 ? 0.3 : 1,
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addContainerRow}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px",
                      border: "1px dashed #0F766E",
                      borderRadius: "8px",
                      backgroundColor: "#F0FDFA",
                      color: "#0F766E",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={14} /> Add Container
                  </button>
                </div>
              </div>

              {/* BL Number */}
              <div>
                <label style={labelStyle}>BL Number</label>
                <NeuronInput value={blNumber} onChange={setBlNumber} placeholder="Enter BL number" />
              </div>

              {/* Volume — dropdown */}
              <div>
                <label style={labelStyle}>Volume</label>
                <NeuronDropdown
                  value={volume}
                  options={CONTAINER_SIZES}
                  onChange={setVolume}
                  placeholder="Select size"
                />
              </div>
            </div>

            {/* Commodity | Seal No. */}
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Commodity</label>
                <NeuronInput value={commodity} onChange={setCommodity} placeholder="Enter commodity" />
              </div>
              <div>
                <label style={labelStyle}>Seal No.</label>
                <NeuronInput value={sealNo} onChange={setSealNo} placeholder="Enter seal number" />
              </div>
            </div>

            {/* Shipping Line | Booking Number */}
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Shipping Line</label>
                <ShippingLineDropdown value={shippingLine} onChange={setShippingLine} />
              </div>
              <div>
                <label style={labelStyle}>Booking Number</label>
                <NeuronInput
                  value={bookingNumber}
                  onChange={setBookingNumber}
                  placeholder="Enter booking number"
                />
              </div>
            </div>

            {/* POL | POD */}
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>POL (Port of Loading)</label>
                <div ref={polRef} style={{ position: "relative" }}>
                  <div
                    onClick={() => setShowPolDropdown(!showPolDropdown)}
                    onBlur={() => setTimeout(() => setShowPolDropdown(false), 200)}
                    tabIndex={0}
                    style={{
                      ...neuronInputStyle,
                      color: origin ? "#111827" : "#9CA3AF",
                      fontWeight: origin ? 500 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {origin || "Select POL"}
                    <ChevronDown size={16} color="#667085" style={{ transform: showPolDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </div>

                  {showPolDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1.5px solid #E5E9F0",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 9999,
                      maxHeight: "300px",
                      overflowY: "auto"
                    }}>
                      {["Manila North", "Manila South", "CDO", "Iloilo"].map((option, index) => (
                        <div
                          key={option}
                          onClick={() => {
                            setOrigin(option);
                            setShowPolDropdown(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: "pointer",
                            color: "#111827",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            background: origin === option ? "#F0FDF4" : "transparent",
                            borderBottom: index < 3 ? "1px solid #E5E9F0" : "none",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (origin !== option) {
                              e.currentTarget.style.background = "#F9FAFB";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (origin !== option) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>POD (Port of Destination)</label>
                <NeuronInput value={pod} onChange={setPod} placeholder="Enter POD" />
              </div>
            </div>

            {/* ═══════════════ VESSEL/VOY DETAILS ═══════════════ */}
            <SectionTitle>Vessel/VOY Details</SectionTitle>

            {/* Vessel/VOY | ETD */}
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Vessel/VOY</label>
                <NeuronInput
                  value={vesselVoyage}
                  onChange={setVesselVoyage}
                  placeholder="Enter vessel & voyage"
                />
              </div>
              <div>
                <label style={labelStyle}>ETD</label>
                <DateTimeField
                  dateValue={etd}
                  timeValue={etdTime}
                  onDateChange={setEtd}
                  onTimeChange={setEtdTime}
                />
              </div>
            </div>

            {/* ATD | ETA */}
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>ATD</label>
                <DateTimeField
                  dateValue={atd}
                  timeValue={atdTime}
                  onDateChange={setAtd}
                  onTimeChange={setAtdTime}
                />
              </div>
              <div>
                <label style={labelStyle}>ETA</label>
                <DateTimeField
                  dateValue={eta}
                  timeValue={etaTime}
                  onDateChange={setEta}
                  onTimeChange={setEtaTime}
                />
              </div>
            </div>

            {/* Vessel Status */}
            <div>
              <label style={labelStyle}>Vessel Status</label>
              <NeuronDropdown
                value={vesselStatus}
                options={["VESSEL IS OPEN", "VESSEL IS NOT OPEN"]}
                onChange={setVesselStatus}
                placeholder="Select vessel status"
              />
            </div>

            {/* LCT ED/Arrastre | LCT Cargo */}
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>LCT ED/Arrastre</label>
                <DateTimeField
                  dateValue={lctEdArrastre}
                  timeValue={lctEdArrastreTime}
                  onDateChange={setLctEdArrastre}
                  onTimeChange={setLctEdArrastreTime}
                />
              </div>
              <div>
                <label style={labelStyle}>LCT Cargo</label>
                <DateTimeField
                  dateValue={lctCargo}
                  timeValue={lctCargoTime}
                  onDateChange={setLctCargo}
                  onTimeChange={setLctCargoTime}
                />
              </div>
            </div>

            {/* ═══════════════ DOMESTIC COST ═══════════════ */}
            <SectionTitle>Domestic Cost</SectionTitle>

            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Domestic Freight</label>
                <NeuronInput
                  value={domesticFreight}
                  onChange={setDomesticFreight}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={labelStyle}>Hustling/Stripping</label>
                <NeuronInput
                  value={hustlingStripping}
                  onChange={setHustlingStripping}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Forklift Operator</label>
              <NeuronInput
                value={forkliftOperator}
                onChange={setForkliftOperator}
                placeholder="Enter forklift operator"
              />
            </div>

            {/* ═══════════════ CUSTOMS PROCESSING ═══════════════ */}
            <SectionTitle>Customs Processing</SectionTitle>

            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Export Division</label>
                <NeuronInput
                  value={exportDivision}
                  onChange={setExportDivision}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={labelStyle}>Lodgment/CDS Fee</label>
                <NeuronInput
                  value={lodgmentCdsFee}
                  onChange={setLodgmentCdsFee}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Form E</label>
              <NeuronInput value={formE} onChange={setFormE} placeholder="Enter Form E" />
            </div>

            {/* ═══════════════ SHIPPING LINE COST ═══════════════ */}
            <SectionTitle>Shipping Line Cost</SectionTitle>

            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Ocean Freight</label>
                <NeuronInput
                  value={oceanFreight}
                  onChange={setOceanFreight}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={labelStyle}>Seal Fee</label>
                <NeuronInput value={sealFee} onChange={setSealFee} placeholder="0.00" />
              </div>
            </div>
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Docs Fee</label>
                <NeuronInput value={docsFee} onChange={setDocsFee} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>LSS Fee</label>
                <NeuronInput value={lssFee} onChange={setLssFee} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Storage</label>
              <NeuronInput value={storageCost} onChange={setStorageCost} placeholder="0.00" />
            </div>

            {/* ═══════════════ PORT CHARGES COST ═══════════════ */}
            <SectionTitle>Port Charges Cost</SectionTitle>

            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Arrastre</label>
                <NeuronInput value={arrastre} onChange={setArrastre} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Shut Out</label>
                <NeuronInput value={shutOut} onChange={setShutOut} placeholder="Enter shut out" />
              </div>
            </div>

            {/* ═══════════════ MISCELLANEOUS COST ═══════════════ */}
            <SectionTitle>Miscellaneous Cost</SectionTitle>

            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Royalty Fee</label>
                <NeuronInput value={royaltyFee} onChange={setRoyaltyFee} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Lona</label>
                <NeuronInput value={lona} onChange={setLona} placeholder="0.00" />
              </div>
            </div>
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Lalamove</label>
                <NeuronInput value={lalamove} onChange={setLalamove} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>BIR</label>
                <NeuronInput value={bir} onChange={setBir} placeholder="0.00" />
              </div>
            </div>
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Labor</label>
                <NeuronInput value={labor} onChange={setLabor} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Other Charges</label>
                <NeuronInput
                  value={otherCharges}
                  onChange={setOtherCharges}
                  placeholder="0.00"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div
          className="px-12 py-6 border-t flex justify-end gap-3"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FAFAFA",
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg border font-medium transition-colors"
            style={{
              borderColor: "var(--neuron-ui-border)",
              color: "var(--neuron-ink-base)",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-export-form"
            disabled={!isFormValid || loading}
            className="px-6 py-2.5 rounded-lg font-medium transition-opacity"
            style={{
              backgroundColor: isFormValid && !loading ? "#0F766E" : "#D1D5DB",
              color: "white",
              fontSize: "14px",
              cursor: isFormValid && !loading ? "pointer" : "not-allowed",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating..." : "Create Export Booking"}
          </button>
        </div>
      </div>
    </>
  );
}