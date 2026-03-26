import { X, Package, ArrowLeft, ChevronDown, Trash2, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import { ComboInput } from "../ui/ComboInput";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { SHIPPING_LINE_OPTIONS, CONTAINER_SIZES, SECTION_OPTIONS } from "../../utils/truckingTags";
import { API_BASE_URL } from '@/utils/api-config';
import { PanelBackdrop } from "../shared/PanelBackdrop";

interface CreateBrokerageBookingPanelProps {
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
    origin?: string;
    pod?: string;
  } | null;
}

// Selectivity color mapping
const SELECTIVITY_OPTIONS = ["Green", "Orange", "Yellow", "Red"];
const SELECTIVITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Green:  { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  Orange: { bg: "#FFF7ED", text: "#9A3412", dot: "#F97316" },
  Yellow: { bg: "#FEFCE8", text: "#854D0E", dot: "#EAB308" },
  Red:    { bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
};

const GROSS_WEIGHT_UNITS = ["kg", "lbs", "tons"];

// Convert MM/DD/YYYY to ISO YYYY-MM-DD for SingleDateInput
const mmddToISO = (mmdd: string): string => {
  if (!mmdd) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(mmdd)) return mmdd;
  const parts = mmdd.split('/');
  if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[0]}-${parts[1]}`;
  }
  try {
    const d = new Date(mmdd);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {}
  return "";
};

// Convert ISO YYYY-MM-DD to MM/DD/YYYY
const isoToMMDD = (iso: string): string => {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y}`;
  }
  return iso;
};

export function CreateBrokerageBookingPanel({
  isOpen,
  onClose,
  onBookingCreated,
  currentUser,
  prefillData,
}: CreateBrokerageBookingPanelProps) {
  const [loading, setLoading] = useState(false);
  
  // Import booking fields
  const [date, setDate] = useState("");
  const [clientId, setClientId] = useState(prefillData?.clientId || "");
  const [contactId, setContactId] = useState(""); 
  const [client, setClient] = useState(prefillData?.clientName || "");
  const [companyName, setCompanyName] = useState(""); // Always stores company name for dedup
  const [contactPersonName, setContactPersonName] = useState(""); 
  // Container Numbers - repeatable
  const [containerNumbers, setContainerNumbers] = useState<string[]>([""]);
  const [blNumber, setBlNumber] = useState("");
  const [shipper, setShipper] = useState(""); 
  const [consignee, setConsignee] = useState(""); 
  const [commodity, setCommodity] = useState(prefillData?.commodity || "");
  const [volume, setVolume] = useState(prefillData?.volume_containers || "");
  const [vesselVoyage, setVesselVoyage] = useState(prefillData?.vessel_voyage || "");
  const [shippingLine, setShippingLine] = useState(prefillData?.shipping_line || "");
  const [section, setSection] = useState("");
  const [ot, setOt] = useState("");
  // ETA / ATA / Discharged - date + time
  const [eta, setEta] = useState("");
  const [etaTime, setEtaTime] = useState("");
  const [ata, setAta] = useState("");
  const [ataTime, setAtaTime] = useState("");
  const [discharged, setDischarged] = useState("");
  const [dischargedTime, setDischargedTime] = useState("");
  // Storage Begins / DEM Begins - date + time with auto-calc
  const [storageBegins, setStorageBegins] = useState("");
  const [storageBeginsTime, setStorageBeginsTime] = useState("");
  const [storageManualOverride, setStorageManualOverride] = useState(false);
  const [demBegins, setDemBegins] = useState("");
  const [demBeginsTime, setDemBeginsTime] = useState("");
  const [demManualOverride, setDemManualOverride] = useState(false);
  const [entryNumber, setEntryNumber] = useState("");
  
  // Clearance / References
  const [registryNo, setRegistryNo] = useState("");
  const [selectivity, setSelectivity] = useState("");
  const [ticket, setTicket] = useState("");
  // RCVD Billing - date + time
  const [rcvdBilling, setRcvdBilling] = useState("");
  const [rcvdBillingTime, setRcvdBillingTime] = useState("");
  const [finalTaxNavValue, setFinalTaxNavValue] = useState("");
  const [arrastre, setArrastre] = useState("");
  const [stowage, setStowage] = useState("");
  // Gatepass - date + time
  const [gatepassDate, setGatepassDate] = useState("");
  const [gatepassDateError, setGatepassDateError] = useState("");
  const [gatepassTime, setGatepassTime] = useState("");
  // Gross Weight
  const [grossWeightValue, setGrossWeightValue] = useState("");
  const [grossWeightUnit, setGrossWeightUnit] = useState("kg");

  const [status, setStatus] = useState("");
  const [shippingLineStatus, setShippingLineStatus] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showShippingLineStatusDropdown, setShowShippingLineStatusDropdown] = useState(false);

  // Dropdown visibility states
  const [showShippingLineDropdown, setShowShippingLineDropdown] = useState(false);
  const [showVolumeDropdown, setShowVolumeDropdown] = useState(false);
  const [showSelectivityDropdown, setShowSelectivityDropdown] = useState(false);
  const [showGrossWeightUnitDropdown, setShowGrossWeightUnitDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [shippingLineSearch, setShippingLineSearch] = useState("");

  // Status Dropdown Constants
  const IMPORT_STATUS_COLORS: Record<string, string> = {
    "For Gatepass": "#FBBC04",
    "Awaiting Discharge & CRO": "#4285F4",
    "For Debit For Final": "#FF6D01",
    "For Lodgement": "#FFFF00",
    "Awaiting Stowage": "#00FF00",
    "With Stowage / Discharged & Awaiting Signed Docs": "#9900FF",
    "With ETA": "#00FFFF",
    "Without ETA": "#EA4335",
    "Delivered": "#10B981",
    "Returned": "#64748B"
  };

  const IMPORT_STATUS_TEXT_COLORS: Record<string, string> = {
    "For Gatepass": "#B45309",
    "Awaiting Discharge & CRO": "#4285F4",
    "For Debit For Final": "#FF6D01",
    "For Lodgement": "#854D0E",
    "Awaiting Stowage": "#15803D",
    "With Stowage / Discharged & Awaiting Signed Docs": "#9900FF",
    "With ETA": "#0E7490",
    "Without ETA": "#EA4335",
    "Delivered": "#10B981",
    "Returned": "#64748B"
  };

  const IMPORT_STATUS_OPTIONS = [
    "For Gatepass",
    "Awaiting Discharge & CRO",
    "For Debit For Final",
    "For Lodgement",
    "Awaiting Stowage",
    "With Stowage / Discharged & Awaiting Signed Docs",
    "With ETA",
    "Without ETA",
    "Delivered",
    "Returned"
  ];

  const hexToRgba = (hex: string, alpha: number) => {
    if (!hex || !hex.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Additional fields 
  const [origin, setOrigin] = useState(prefillData?.origin || "");
  const [pod, setPod] = useState(prefillData?.pod || "");
  const [showPodDropdown, setShowPodDropdown] = useState(false);
  const podRef = useRef<HTMLDivElement>(null);
  const [projectId_, setProjectId] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());

  // Date validation states
  const [dateError, setDateError] = useState("");
  const [etaError, setEtaError] = useState("");
  const [ataError, setAtaError] = useState("");
  const [dischargedError, setDischargedError] = useState("");
  const [storageBeginsError, setStorageBeginsError] = useState("");
  const [demBeginsError, setDemBeginsError] = useState("");
  const [rcvdBillingError, setRcvdBillingError] = useState("");

  // Handle prefill data
  useEffect(() => {
    if (isOpen && prefillData) {
      setClientId(prefillData.clientId || "");
      setClient(prefillData.clientName || "");
      setCommodity(prefillData.commodity || "");
      setVolume(prefillData.volume_containers || "");
      setVesselVoyage(prefillData.vessel_voyage || "");
      setShippingLine(prefillData.shipping_line || "");
      setOrigin(prefillData.origin || "");
      setPod(prefillData.pod || "");

      const fields = new Set<string>();
      if (prefillData.clientId) fields.add('clientId');
      if (prefillData.clientName) fields.add('clientName');
      if (prefillData.commodity) fields.add('commodity');
      if (prefillData.volume_containers) fields.add('volume');
      if (prefillData.vessel_voyage) fields.add('vesselVoyage');
      if (prefillData.shipping_line) fields.add('shippingLine');
      if (prefillData.origin) fields.add('origin');
      if (prefillData.pod) fields.add('pod');
      
      setAutofilledFields(fields);
    }
  }, [isOpen, prefillData]);

  // Date validation and formatting helpers
  const validateDate = (dateStr: string): boolean => {
    if (dateStr.length !== 10) return false;
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    
    return true;
  };

  const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 8);
    
    let formatted = '';
    if (limited.length >= 1) {
      formatted = limited.slice(0, 2);
    }
    if (limited.length >= 3) {
      formatted += '/' + limited.slice(2, 4);
    }
    if (limited.length >= 5) {
      formatted += '/' + limited.slice(4, 8);
    }
    
    return formatted;
  };

  const handleDateChange = (value: string, setter: (val: string) => void, setError: (err: string) => void) => {
    const formatted = formatDateInput(value);
    setter(formatted);
    
    if (formatted.length === 10) {
      const isValid = validateDate(formatted);
      setError(isValid ? "" : "Invalid date");
    } else {
      setError("");
    }
  };

  // Auto-calculate Storage Begins and DEM Begins from Discharged
  const addDaysToDate = (dateStr: string, days: number): string => {
    if (!dateStr || dateStr.length !== 10 || !validateDate(dateStr)) return "";
    const parts = dateStr.split('/');
    const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    d.setDate(d.getDate() + days);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const handleDischargedDateChange = (value: string) => {
    const formatted = formatDateInput(value);
    setDischarged(formatted);
    
    if (formatted.length === 10) {
      const isValid = validateDate(formatted);
      setDischargedError(isValid ? "" : "Invalid date");
      
      if (isValid) {
        // Auto-calculate Storage Begins (+5 days) if not manually overridden
        if (!storageManualOverride) {
          const storageDateVal = addDaysToDate(formatted, 5);
          setStorageBegins(storageDateVal);
          if (!storageBeginsTime && dischargedTime) {
            setStorageBeginsTime(dischargedTime);
          }
        }
        // Auto-calculate DEM Begins (+14 days) if not manually overridden
        if (!demManualOverride) {
          const demDateVal = addDaysToDate(formatted, 14);
          setDemBegins(demDateVal);
          if (!demBeginsTime && dischargedTime) {
            setDemBeginsTime(dischargedTime);
          }
        }
      }
    } else {
      setDischargedError("");
    }
  };

  // ISO version for SingleDateInput calendar picker
  const handleDischargedDateChangeISO = (iso: string) => {
    const formatted = isoToMMDD(iso);
    setDischarged(formatted);
    setDischargedError("");
    
    if (formatted) {
      // Auto-calculate Storage Begins (+5 days) if not manually overridden
      if (!storageManualOverride) {
        const storageDateVal = addDaysToDate(formatted, 5);
        setStorageBegins(storageDateVal);
        if (!storageBeginsTime && dischargedTime) {
          setStorageBeginsTime(dischargedTime);
        }
      }
      // Auto-calculate DEM Begins (+14 days) if not manually overridden
      if (!demManualOverride) {
        const demDateVal = addDaysToDate(formatted, 14);
        setDemBegins(demDateVal);
        if (!demBeginsTime && dischargedTime) {
          setDemBeginsTime(dischargedTime);
        }
      }
    }
  };

  const handleDischargedTimeChange = (value: string) => {
    setDischargedTime(value);
    if (!storageManualOverride && !storageBeginsTime) {
      setStorageBeginsTime(value);
    }
    if (!demManualOverride && !demBeginsTime) {
      setDemBeginsTime(value);
    }
  };

  const handleClientSelect = (selectedClient: any) => {
    if (selectedClient) {
      setClient(selectedClient.name || selectedClient.company_name || "");
      setClientId(selectedClient.id || "");
    } else {
      setClient("");
      setClientId("");
    }
  };

  // Container number helpers
  const addContainerRow = () => setContainerNumbers([...containerNumbers, ""]);
  const removeContainerRow = (index: number) => setContainerNumbers(containerNumbers.filter((_, i) => i !== index));
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
      // Combine date+time fields
      const combineDateTime = (d: string, t: string) => {
        if (!d) return "";
        return t ? `${d} ${t}` : d;
      };

      // Format Gatepass
      let gatepass = "";
      if (gatepassDate) {
        gatepass = combineDateTime(gatepassDate, gatepassTime);
      }

      // Format Gross Weight
      const grossWeight = grossWeightValue ? `${grossWeightValue} ${grossWeightUnit}` : "";

      const bookingData = {
        date,
        customerName: client,
        companyName: companyName || client, // Always store company name separately
        clientId,
        contactId,
        contactPersonName,
        projectId: projectId_ || undefined,
        projectNumber: projectNumber || undefined,
        containerNo: containerNumbers.filter(c => c.trim()).join(", "),
        blNumber,
        shipper,
        consignee,
        commodity,
        volume,
        vesselVoyage,
        origin,
        pod,
        shippingLine,
        section,
        ot,
        eta: combineDateTime(eta, etaTime),
        ata: combineDateTime(ata, ataTime),
        discharged: combineDateTime(discharged, dischargedTime),
        storageBegins: combineDateTime(storageBegins, storageBeginsTime),
        demBegins: combineDateTime(demBegins, demBeginsTime),
        entryNumber,
        registryNo,
        selectivity,
        ticket,
        rcvdBilling: combineDateTime(rcvdBilling, rcvdBillingTime),
        finalTaxNavValue,
        arrastre,
        stowage,
        gatepass,
        grossWeight,
        status,
        shippingLineStatus,
        createdBy: currentUser?.name || "Unknown",
        createdAt: new Date().toISOString(),
        shipmentType: "Import",
        booking_type: "Import",
        mode: "Sea"
      };

      const response = await fetch(`${API_BASE_URL}/import-bookings`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Import booking created successfully");
        onBookingCreated();
        handleClose();
      } else {
        toast.error("Error creating booking: " + result.error);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Unable to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setDate("");
    setClient("");
    setCompanyName("");
    setClientId("");
    setContactId("");
    setContactPersonName("");
    setProjectId("");
    setProjectNumber("");
    setContainerNumbers([""]);
    setBlNumber("");
    setShipper("");
    setConsignee("");
    setCommodity("");
    setVolume("");
    setVesselVoyage("");
    setShippingLine("");
    setSection("");
    setOt("");
    setEta("");
    setEtaTime("");
    setAta("");
    setAtaTime("");
    setDischarged("");
    setDischargedTime("");
    setStorageBegins("");
    setStorageBeginsTime("");
    setStorageManualOverride(false);
    setDemBegins("");
    setDemBeginsTime("");
    setDemManualOverride(false);
    setEntryNumber("");
    setRegistryNo("");
    setSelectivity("");
    setTicket("");
    setRcvdBilling("");
    setRcvdBillingTime("");
    setFinalTaxNavValue("");
    setArrastre("");
    setStowage("");
    setGatepassDate("");
    setGatepassDateError("");
    setGatepassTime("");
    setGrossWeightValue("");
    setGrossWeightUnit("kg");
    setStatus("");
    setShippingLineStatus("");
  };

  if (!isOpen) return null;

  const isFormValid = client.trim() !== "";

  const inputStyle = {
    borderColor: "var(--neuron-ui-border)",
    fontSize: "14px",
    color: "var(--neuron-ink-primary)"
  };
  
  // Visual indicator for autofilled fields
  const autofilledInputStyle = {
    ...inputStyle,
    background: "#E8F5F3",
    borderColor: "#0F766E"
  };
  
  // Helper function to get input style with autofill indicator
  const getInputStyle = (fieldName: string) => {
    if (autofilledFields.has(fieldName)) {
      return {
        ...inputStyle,
        backgroundColor: "#E8F5F3",
        borderColor: "#0F766E",
      };
    }
    return inputStyle;
  };

  // Reusable Neuron dropdown renderer
  const renderNeuronDropdown = (
    value: string,
    options: string[],
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    onSelect: (v: string) => void,
    placeholder: string,
    renderOption?: (option: string) => React.ReactNode,
    searchable?: boolean,
    searchValue?: string,
    setSearchValue?: (v: string) => void
  ) => {
    const filteredOptions = searchable && searchValue
      ? options.filter(opt => opt.toLowerCase().includes(searchValue.toLowerCase()))
      : options;
    return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        tabIndex={0}
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
        {renderOption && value ? renderOption(value) : (value || placeholder)}
        <ChevronDown size={16} color="#667085" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </div>
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "white",
          border: "1.5px solid #E5E7EB",
          borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          zIndex: 50,
          maxHeight: "300px",
          overflowY: "auto"
        }}>
          {searchable && setSearchValue && (
            <div style={{ padding: "8px", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
              <input
                type="text"
                value={searchValue || ""}
                onChange={(e) => setSearchValue(e.target.value)}
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
                  backgroundColor: "#F9FAFB"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
              />
            </div>
          )}
          {filteredOptions.map((option, index) => (
            <div
              key={option}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
                if (setSearchValue) setSearchValue("");
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
                borderBottom: index < filteredOptions.length - 1 ? "1px solid #E5E7EB" : "none",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (value !== option) e.currentTarget.style.background = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                if (value !== option) e.currentTarget.style.background = "transparent";
              }}
            >
              {renderOption ? renderOption(option) : option}
            </div>
          ))}
          {searchable && filteredOptions.length === 0 && (
            <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>
              No results found
            </div>
          )}
        </div>
      )}
    </div>
    );
  };

  // Selectivity option renderer with color dot
  const renderSelectivityOption = (option: string) => {
    const colors = SELECTIVITY_COLORS[option];
    if (!colors) return option;
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: colors.dot, flexShrink: 0 }} />
        <span style={{ color: colors.text, fontWeight: 500 }}>{option}</span>
      </span>
    );
  };

  // Date+Time field renderer (dateVal is MM/DD/YYYY, onDateChange receives ISO from SingleDateInput)
  const renderDateTimeField = (
    label: string,
    dateVal: string,
    onDateChange: (iso: string) => void,
    dateError: string,
    timeVal: string,
    onTimeChange: (v: string) => void,
    style?: React.CSSProperties
  ) => (
    <div style={style}>
      <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
        {label}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "8px" }}>
        <div>
          <SingleDateInput
            value={mmddToISO(dateVal)}
            onChange={onDateChange}
            placeholder="MM/DD/YYYY"
          />
          {dateError && <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px" }}>{dateError}</p>}
        </div>
        <div>
          <NeuronTimePicker value={timeVal} onChange={onTimeChange} />
        </div>
      </div>
    </div>
  );

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
              <ArrowLeft className="w-5 h-5 text-[#12332B]" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-[#12332B] mb-1">
                Create Import Booking
              </h2>
              <p className="text-sm text-[#667085]">
                Fill in the details for import customs clearance and brokerage
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form onSubmit={handleSubmit} id="create-import-form" className="space-y-4">
            
            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                Date
              </label>
              <SingleDateInput
                value={mmddToISO(date)}
                onChange={(iso) => { setDate(isoToMMDD(iso)); setDateError(""); }}
                placeholder="MM/DD/YYYY"
              />
              {dateError && <p className="text-red-500 text-sm mt-1">{dateError}</p>}
            </div>

            {/* Client Selection (Company & Contact) */}
            <div>
              <CompanyContactSelector
                companyId={clientId}
                contactId={contactId}
                onSelect={({ company, contact }) => {
                  const cName = company ? (company.name || company.company_name || "") : "";
                  setCompanyName(cName);
                  if (company) {
                    setClientId(company.id);
                    setConsignee(cName);
                  } else {
                    setClientId("");
                    setConsignee("");
                  }
                  
                  if (contact) {
                    setContactId(contact.id);
                    setContactPersonName(contact.name);
                    setClient(contact.name);
                  } else {
                    setContactId("");
                    setContactPersonName("");
                    // No contact: customerName = company name (merged field)
                    setClient(cName);
                  }
                }}
              />
            </div>

            {/* BL Number Row */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#667085" }}>
                BL Number
              </label>
              <input
                type="text"
                value={blNumber}
                onChange={(e) => setBlNumber(e.target.value)}
                placeholder="Enter BL number"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #E5E9F0",
                  borderRadius: "8px",
                  color: "#12332B",
                  backgroundColor: "white",
                  outline: "none",
                  transition: "all 0.2s",
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Consignee */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#667085" }}>
                  Consignee
                </label>
                <input
                  type="text"
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  placeholder="Consignee name"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    color: "#12332B",
                    backgroundColor: "white",
                    outline: "none",
                    transition: "all 0.2s",
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
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#667085" }}>
                  Client
                </label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Client name"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    color: "#12332B",
                    backgroundColor: "white",
                    outline: "none",
                    transition: "all 0.2s",
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
              </div>
            </div>

            {/* Container Numbers - Repeatable Input List */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                Container No.
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {containerNumbers.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={c}
                      onChange={(e) => updateContainerRow(i, e.target.value)}
                      placeholder={`Container #${i + 1}`}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #E5E9F0",
                        borderRadius: "8px",
                        color: "#12332B",
                        backgroundColor: "white",
                        outline: "none",
                        height: "42px",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
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

            {/* Two column grid for remaining fields */}
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Commodity
                </label>
                <input
                  type="text"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  placeholder="Enter commodity"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={getInputStyle('commodity')}
                />
              </div>

              {/* Volume - Dropdown using CONTAINER_SIZES */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Volume
                </label>
                {renderNeuronDropdown(
                  volume,
                  CONTAINER_SIZES,
                  showVolumeDropdown,
                  setShowVolumeDropdown,
                  setVolume,
                  "Select size"
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Vessel & Voyage
                </label>
                <input
                  type="text"
                  value={vesselVoyage}
                  onChange={(e) => setVesselVoyage(e.target.value)}
                  placeholder="Enter vessel & voyage"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={getInputStyle('vesselVoyage')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  POL (Port of Loading)
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Enter POL"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={getInputStyle('origin')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  POD (Port of Discharge)
                </label>
                <div style={{ position: "relative" }} ref={podRef}>
                  <div
                    onClick={() => setShowPodDropdown(!showPodDropdown)}
                    onBlur={() => setTimeout(() => setShowPodDropdown(false), 200)}
                    tabIndex={0}
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                    style={{
                      ...inputStyle,
                      color: pod ? "#111827" : "#9CA3AF",
                      fontWeight: pod ? 500 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    {pod || "Select POD"}
                    <ChevronDown size={16} color="#667085" style={{ transform: showPodDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </div>

                  {showPodDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 50,
                      maxHeight: "300px",
                      overflowY: "auto"
                    }}>
                      {["Manila North", "Manila South", "CDO", "Iloilo"].map((option, index) => (
                        <div
                          key={option}
                          onClick={() => {
                            setPod(option);
                            setShowPodDropdown(false);
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
                            background: pod === option ? "#F0FDF4" : "transparent",
                            borderBottom: index < 3 ? "1px solid #E5E7EB" : "none",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (pod !== option) {
                              e.currentTarget.style.background = "#F9FAFB";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (pod !== option) {
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

              {/* Shipping Line - Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Shipping Line
                </label>
                {renderNeuronDropdown(
                  shippingLine,
                  SHIPPING_LINE_OPTIONS,
                  showShippingLineDropdown,
                  setShowShippingLineDropdown,
                  setShippingLine,
                  "Select shipping line",
                  undefined,
                  true,
                  shippingLineSearch,
                  setShippingLineSearch
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Section
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      border: "1px solid #E5E9F0",
                      borderRadius: "8px",
                      color: section ? "#111827" : "#9CA3AF",
                      fontWeight: section ? 500 : 400,
                      backgroundColor: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      outline: "none",
                      minHeight: "42px",
                    }}
                  >
                    {section || "Select section"}
                    <ChevronDown size={16} color="#667085" style={{ transform: showSectionDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                  </div>
                  {showSectionDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 50,
                      maxHeight: "300px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}>
                      <div style={{ padding: "8px", borderBottom: "1px solid #E5E7EB" }}>
                        <input
                          type="text"
                          value={sectionSearch}
                          onChange={(e) => setSectionSearch(e.target.value)}
                          placeholder="Search section..."
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: "13px",
                            border: "1px solid #E5E9F0",
                            borderRadius: "6px",
                            outline: "none",
                            color: "#111827",
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
                        />
                      </div>
                      <div style={{ overflowY: "auto", maxHeight: "240px" }}>
                        {SECTION_OPTIONS.filter(opt => opt.toLowerCase().includes(sectionSearch.toLowerCase())).map((option, index, arr) => (
                          <div
                            key={option}
                            onClick={() => {
                              setSection(option);
                              setShowSectionDropdown(false);
                              setSectionSearch("");
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
                              background: section === option ? "#F0FDF4" : "transparent",
                              borderBottom: index < arr.length - 1 ? "1px solid #E5E7EB" : "none",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (section !== option) e.currentTarget.style.background = "#F9FAFB";
                            }}
                            onMouseLeave={(e) => {
                              if (section !== option) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {option}
                          </div>
                        ))}
                        {SECTION_OPTIONS.filter(opt => opt.toLowerCase().includes(sectionSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: "10px 14px", fontSize: "13px", color: "#9CA3AF" }}>
                            No matching sections
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  OT
                </label>
                <input
                  type="text"
                  value={ot}
                  onChange={(e) => setOt(e.target.value)}
                  placeholder="Enter OT"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              {/* ETA - Date + Time */}
              {renderDateTimeField(
                "ETA",
                eta,
                (iso) => { setEta(isoToMMDD(iso)); setEtaError(""); },
                etaError,
                etaTime,
                setEtaTime
              )}

              {/* ATA - Date + Time */}
              {renderDateTimeField(
                "ATA",
                ata,
                (iso) => { setAta(isoToMMDD(iso)); setAtaError(""); },
                ataError,
                ataTime,
                setAtaTime
              )}

              {/* Discharged - Date + Time (triggers auto-calc) */}
              {renderDateTimeField(
                "Discharged",
                discharged,
                handleDischargedDateChangeISO,
                dischargedError,
                dischargedTime,
                handleDischargedTimeChange
              )}

              {/* Storage Begins - Date + Time (auto-calculated, editable override) */}
              {renderDateTimeField(
                "Storage Begins",
                storageBegins,
                (iso) => {
                  setStorageManualOverride(true);
                  setStorageBegins(isoToMMDD(iso));
                  setStorageBeginsError("");
                },
                storageBeginsError,
                storageBeginsTime,
                (v) => { setStorageManualOverride(true); setStorageBeginsTime(v); }
              )}

              {/* DEM Begins - Date + Time (auto-calculated, editable override) */}
              {renderDateTimeField(
                "DEM Begins",
                demBegins,
                (iso) => {
                  setDemManualOverride(true);
                  setDemBegins(isoToMMDD(iso));
                  setDemBeginsError("");
                },
                demBeginsError,
                demBeginsTime,
                (v) => { setDemManualOverride(true); setDemBeginsTime(v); }
              )}

              {/* Clearance / References Group */}
              <div className="col-span-2">
                 
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Registry No.
                </label>
                <input
                  type="text"
                  value={registryNo}
                  onChange={(e) => setRegistryNo(e.target.value)}
                  placeholder="Enter registry no."
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              {/* Selectivity - Color-coded Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Selectivity
                </label>
                {renderNeuronDropdown(
                  selectivity,
                  SELECTIVITY_OPTIONS,
                  showSelectivityDropdown,
                  setShowSelectivityDropdown,
                  setSelectivity,
                  "Select selectivity",
                  renderSelectivityOption
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Ticket
                </label>
                <input
                  type="text"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="Enter ticket"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              {/* RCVD Billing - Date + Time */}
              {renderDateTimeField(
                "RCVD Billing",
                rcvdBilling,
                (iso) => { setRcvdBilling(isoToMMDD(iso)); setRcvdBillingError(""); },
                rcvdBillingError,
                rcvdBillingTime,
                setRcvdBillingTime
              )}

              {/* Charges / Values Group */}
              <div className="col-span-2">
                 
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Final Tax/NAV Value
                </label>
                <input
                  type="text"
                  value={finalTaxNavValue}
                  onChange={(e) => setFinalTaxNavValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Arrastre
                </label>
                <input
                  type="text"
                  value={arrastre}
                  onChange={(e) => setArrastre(e.target.value)}
                  placeholder="Enter arrastre"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Stowage
                </label>
                <input
                  type="text"
                  value={stowage}
                  onChange={(e) => setStowage(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Gatepass
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "8px" }}>
                  <div style={{ position: "relative" }}>
                    <SingleDateInput
                      value={mmddToISO(gatepassDate)}
                      onChange={(iso) => { setGatepassDate(isoToMMDD(iso)); setGatepassDateError(""); }}
                      placeholder="MM/DD/YYYY"
                    />
                    {gatepassDateError && <p className="text-red-500 text-sm mt-1">{gatepassDateError}</p>}
                  </div>
                  <div>
                    <NeuronTimePicker value={gatepassTime} onChange={(v) => setGatepassTime(v)} />
                  </div>
                </div>
              </div>

              {/* Gross Weight - Numeric + Unit Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Gross Weight
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={grossWeightValue}
                    onChange={(e) => {
                      // Allow only numbers and decimal
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setGrossWeightValue(val);
                    }}
                    placeholder="0.00"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      fontSize: "14px",
                      border: "1px solid #E5E9F0",
                      borderRadius: "8px",
                      color: "#12332B",
                      backgroundColor: "white",
                      outline: "none",
                      height: "42px",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
                  />
                  <div style={{ position: "relative", width: "80px" }}>
                    <div
                      onClick={() => setShowGrossWeightUnitDropdown(!showGrossWeightUnitDropdown)}
                      onBlur={() => setTimeout(() => setShowGrossWeightUnitDropdown(false), 200)}
                      tabIndex={0}
                      style={{
                        padding: "10px 8px",
                        fontSize: "14px",
                        border: "1px solid #E5E9F0",
                        borderRadius: "8px",
                        color: "#111827",
                        fontWeight: 500,
                        backgroundColor: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        outline: "none",
                        height: "42px",
                      }}
                    >
                      {grossWeightUnit}
                      <ChevronDown size={14} color="#667085" style={{ transform: showGrossWeightUnitDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </div>
                    {showGrossWeightUnitDropdown && (
                      <div style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "white",
                        border: "1.5px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        zIndex: 50,
                      }}>
                        {GROSS_WEIGHT_UNITS.map((unit, index) => (
                          <div
                            key={unit}
                            onClick={() => {
                              setGrossWeightUnit(unit);
                              setShowGrossWeightUnitDropdown(false);
                            }}
                            style={{
                              padding: "8px 10px",
                              fontSize: "14px",
                              fontWeight: 500,
                              cursor: "pointer",
                              color: "#111827",
                              background: grossWeightUnit === unit ? "#F0FDF4" : "transparent",
                              borderBottom: index < GROSS_WEIGHT_UNITS.length - 1 ? "1px solid #E5E7EB" : "none",
                            }}
                            onMouseEnter={(e) => {
                              if (grossWeightUnit !== unit) e.currentTarget.style.background = "#F9FAFB";
                            }}
                            onMouseLeave={(e) => {
                              if (grossWeightUnit !== unit) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {unit}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Entry #
                </label>
                <input
                  type="text"
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  placeholder="Enter entry number"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Booking Status
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    onBlur={() => setTimeout(() => setShowStatusDropdown(false), 200)}
                    tabIndex={0}
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                    style={{
                      ...inputStyle,
                      color: status ? (IMPORT_STATUS_TEXT_COLORS[status] || "#111827") : "#9CA3AF",
                      fontWeight: status ? 600 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    {status || "Select booking status"}
                    <ChevronDown size={16} color="#667085" style={{ transform: showStatusDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </div>

                  {showStatusDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 50,
                      maxHeight: "300px",
                      overflowY: "auto"
                    }}>
                      {IMPORT_STATUS_OPTIONS.map((option, index) => (
                        <div
                          key={option}
                          onClick={() => {
                            setStatus(option);
                            setShowStatusDropdown(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: "pointer",
                            color: IMPORT_STATUS_TEXT_COLORS[option] || "#111827",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            background: status === option ? "#F0FDF4" : "transparent",
                            borderBottom: index < IMPORT_STATUS_OPTIONS.length - 1 ? "1px solid #E5E7EB" : "none",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (status !== option) {
                              e.currentTarget.style.background = "#F9FAFB";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (status !== option) {
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
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Shipping Line Status
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    onClick={() => setShowShippingLineStatusDropdown(!showShippingLineStatusDropdown)}
                    onBlur={() => setTimeout(() => setShowShippingLineStatusDropdown(false), 200)}
                    tabIndex={0}
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                    style={{
                      ...inputStyle,
                      color: shippingLineStatus ? "#111827" : "#9CA3AF",
                      fontWeight: shippingLineStatus ? 500 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    {shippingLineStatus || "Select shipping line status"}
                    <ChevronDown size={16} color="#667085" style={{ transform: showShippingLineStatusDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </div>

                  {showShippingLineStatusDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 50,
                      maxHeight: "300px",
                      overflowY: "auto"
                    }}>
                      {["No Billing Yet", "With Billing", "Done Payment"].map((option, index) => (
                        <div
                          key={option}
                          onClick={() => {
                            setShippingLineStatus(option);
                            setShowShippingLineStatusDropdown(false);
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
                            background: shippingLineStatus === option ? "#F0FDF4" : "transparent",
                            borderBottom: index < 2 ? "1px solid #E5E7EB" : "none",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (shippingLineStatus !== option) {
                              e.currentTarget.style.background = "#F9FAFB";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (shippingLineStatus !== option) {
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
              fontSize: "14px"
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-import-form"
            disabled={!isFormValid || loading}
            className="px-6 py-2.5 rounded-lg font-medium transition-opacity"
            style={{
              backgroundColor: isFormValid && !loading ? "#0F766E" : "#D1D5DB",
              color: "white",
              fontSize: "14px",
              cursor: isFormValid && !loading ? "pointer" : "not-allowed",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Creating..." : "Create Import Booking"}
          </button>
        </div>
      </div>
    </>
  );
}
