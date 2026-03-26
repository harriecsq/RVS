import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Plus, Trash2, Link2, ChevronsUpDown, Check } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { ComboInput } from "../ui/ComboInput";
import { BookingSelector } from "../selectors/BookingSelector";
import { PayeeSelector } from "../selectors/PayeeSelector";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { formatAmount } from "../../utils/formatAmount";
import { API_BASE_URL } from '@/utils/api-config';

// ─── Category Dropdown (matches PayeeSelector visual design) ─────────────────

const CATEGORY_GROUPS: { label: string; items: string[] }[] = [
  { label: "Booking Costing", items: ["Shipping Line", "Trucking"] },
  { label: "General Expenses", items: ["Annual Expenses", "Expenses", "Transportation", "Salary", "Benefits", "Utilities"] },
];

function CategoryDropdown({
  value,
  onChange,
  options,
  placeholder = "Select category",
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(!open); }}
        style={{
          width: "100%",
          height: "40px",
          padding: "0 12px",
          borderRadius: "12px",
          border: "1px solid #E5E9F0",
          background: disabled ? "#F9FAFB" : "#FFFFFF",
          color: value ? "#12332B" : "#667085",
          fontWeight: value ? 500 : 400,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
        onMouseEnter={(e) => { if (!disabled) (e.currentTarget).style.borderColor = "#0F766E"; }}
        onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "#E5E9F0"; }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder}
        </span>
        <ChevronsUpDown size={16} style={{ flexShrink: 0, opacity: 0.5, marginLeft: "8px" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          width: "100%",
          minWidth: "280px",
          background: "white",
          border: "1px solid #E5E9F0",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
          zIndex: 100,
          overflow: "hidden",
        }}>
          <div style={{ maxHeight: "300px", overflowY: "auto", padding: "4px" }}>
            {CATEGORY_GROUPS.map((group) => {
              const groupItems = group.items.filter((item) => options.includes(item));
              if (groupItems.length === 0) return null;
              return (
                <div key={group.label}>
                  <div style={{
                    padding: "8px 12px 4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    {group.label}
                  </div>
                  {groupItems.map((item) => {
                    const isSelected = value === item;
                    return (
                      <div
                        key={item}
                        onClick={() => { onChange(item); setOpen(false); }}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          borderRadius: "8px",
                          transition: "background-color 0.15s ease",
                          background: isSelected ? "#E8F5F3" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#F3F4F6"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "#E8F5F3" : "transparent"; }}
                      >
                        <Check size={16} style={{ flexShrink: 0, color: "#0F766E", opacity: isSelected ? 1 : 0 }} />
                        <div style={{ fontWeight: 500, color: "#12332B", fontSize: "14px" }}>{item}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compute volume summary from containers: "2x40HC" */
function computeVolumeSummary(containerNo: string | string[], volume: string): string {
  if (!containerNo && !volume) return "—";
  let containerCount = 1;
  if (containerNo) {
    const containers = Array.isArray(containerNo)
      ? containerNo.filter(Boolean)
      : containerNo.split(',').map((s: string) => s.trim()).filter(Boolean);
    containerCount = Math.max(containers.length, 1);
  }
  if (!volume) return "—";
  return `${containerCount}x${volume}`;
}

// Standardized Description Options
const DESCRIPTION_OPTIONS = {
  "Shipping Line": [
    "Local Charges",
    "Container Deposit",
    "Duties & Taxes",
    "Arrastre",
    "DO Fee",
    // SOP is dynamic
    "Notary / Go Fast / Lodgement",
    "Ocean Freight"
  ],
  "Trucking": [
    "Trucking/Hauling"
  ],
  // General Expenses (Empty defaults, user can add custom)
  "Annual Expenses": [],
  "Expenses": [],
  "Transportation": [],
  "Salary": [],
  "Benefits": [],
  "Utilities": []
};

interface CreateVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoucherCreated: () => void;
  // Legacy/Optional props
  expenseId?: string;
  expenseNumber?: string;
  /** When provided, links the voucher to this booking directly */
  bookingId?: string;
}

interface VoucherLineItem {
  id: string;
  description: string;
  amount: number;
  isSopRow?: boolean;
  defaultSop?: string;
  sopType?: string;
  sopNumber?: string;
}



export function CreateVoucherModal({
  isOpen,
  onClose,
  onVoucherCreated,
  expenseId,
  expenseNumber,
  bookingId: propBookingId
}: CreateVoucherModalProps) {
  // --- Helpers for Date ---
  const getTodayFormatted = () => {
    const today = new Date();
    return `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  };

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
    if (limited.length >= 1) formatted = limited.slice(0, 2);
    if (limited.length >= 3) formatted += '/' + limited.slice(2, 4);
    if (limited.length >= 5) formatted += '/' + limited.slice(4, 8);
    return formatted;
  };

  // --- State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Header Fields
  const [payee, setPayee] = useState("");
  const [category, setCategory] = useState<string>("");
  const [bank, setBank] = useState("");
  const [checkNo, setCheckNo] = useState("");
  const [voucherDate, setVoucherDate] = useState("");
  
  // Container State
  const [availableContainers, setAvailableContainers] = useState<string[]>([]);
  const [voucherContainers, setVoucherContainers] = useState<string[]>([""]);

  // Booking Link
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Linked expense numbers derived from selected booking
  const [linkedExpenseNumbers, setLinkedExpenseNumbers] = useState<string[]>([]);
  
  // Trucking record data derived from linked booking
  const [truckingRecordData, setTruckingRecordData] = useState<{ deliveryAddress: string; loadingAddress: string; truckingRate: string }>({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
  
  // Dynamic Booking Fields State
  const [bookingFields, setBookingFields] = useState({
    consignee: "",
    vesselVoyage: "",
    origin: "",
    loadingAddress: "",
    destination: "",
    deliveryAddress: "",
    blNumber: "",
    volume: "",
    containerNo: "",
    commodity: "",
    shipper: "",
    rate: ""
  });

  // Track auto-filled fields
  const [autoFilledFields, setAutoFilledFields] = useState<Record<string, boolean>>({});

  // Helper to clear auto-filled state
  const handleFieldChange = (field: string, value: string) => {
    // If it's a booking field
    if (field in bookingFields) {
      setBookingFields((prev: any) => ({ ...prev, [field]: value }));
    }
    
    // Clear auto-filled state
    if (autoFilledFields[field]) {
      setAutoFilledFields(prev => ({ ...prev, [field]: false }));
    }
  };

  // Helper for input styling
  const getInputStyle = (field: string) => {
    const isAutoFilled = autoFilledFields[field];
    return `border-[#E5E9F0] focus-visible:ring-[#0F766E] transition-colors ${
      isAutoFilled ? "bg-green-50 text-[#12332B]" : "bg-white"
    }`;
  };

  // Tables
  const [particulars, setParticulars] = useState<VoucherLineItem[]>([{ id: '1', description: "", amount: 0 }]);
  const [distribution, setDistribution] = useState<VoucherLineItem[]>([]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setPayee("");
      setCategory("");
      setBank("");
      setCheckNo("");
      setVoucherDate("");
      setSelectedBooking(null);
      setLinkedExpenseNumbers([]);
      setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
      setParticulars([{ id: Date.now().toString(), description: "", amount: 0 }]);
      setDistribution([]);
    }
  }, [isOpen]);

  // Fetch linked expenses when a booking is selected
  useEffect(() => {
    if (selectedBooking) {
      const bookingId = selectedBooking.bookingId || selectedBooking.bookingNumber || selectedBooking.booking_number || selectedBooking.id;
      if (bookingId) {
        fetchLinkedExpenses(bookingId);
      } else {
        setLinkedExpenseNumbers([]);
      }
    } else {
      setLinkedExpenseNumbers([]);
    }
  }, [selectedBooking]);

  const fetchLinkedExpenses = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const numbers = result.data
          .map((e: any) => e.expenseNumber || e.id)
          .filter(Boolean);
        setLinkedExpenseNumbers(numbers);
      }
    } catch (error) {
      console.error("Error fetching linked expenses for booking:", error);
    }
  };

  // Fetch trucking record data when category is Trucking and a booking is selected
  useEffect(() => {
    if (category === "Trucking" && selectedBooking) {
      const bookingId = selectedBooking.bookingId || selectedBooking.bookingNumber || selectedBooking.booking_number || selectedBooking.id;
      if (bookingId) {
        fetchTruckingRecordForBooking(bookingId);
      } else {
        setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
      }
    } else {
      setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
    }
  }, [selectedBooking, category]);

  const fetchTruckingRecordForBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        const truckingRecord = result.data[0];
        // Extract delivery addresses — join all address strings
        const addresses = (truckingRecord.deliveryAddresses || [])
          .map((a: any) => a.address)
          .filter(Boolean);
        const deliveryAddress = addresses.join("; ");
        // Extract loading address from export trucking record
        const loadingAddress = truckingRecord.truckingAddress || "";
        const truckingRate = truckingRecord.truckingRate || "";
        setTruckingRecordData({ deliveryAddress, loadingAddress, truckingRate });
      } else {
        setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
      }
    } catch (error) {
      console.error("Error fetching trucking record for booking:", error);
    }
  };

  // Auto-fill voucher entries amount when trucking rate is fetched from trucking record
  useEffect(() => {
    if (category === "Trucking" && truckingRecordData.truckingRate) {
      const rateStr = String(truckingRecordData.truckingRate).replace(/,/g, '');
      const rateVal = parseFloat(rateStr) || 0;
      if (rateVal > 0) {
        setParticulars(prev => {
          const hasTruckingRow = prev.some(item => item.description === "Trucking/Hauling");
          if (hasTruckingRow) {
            return prev.map(item =>
              item.description === "Trucking/Hauling" ? { ...item, amount: rateVal } : item
            );
          }
          return prev;
        });
      }
    }
  }, [truckingRecordData, category]);

  // Update items when booking changes (for Shipping Line)
  useEffect(() => {
    if (selectedBooking) {
        // Populate dynamic fields
        setBookingFields({
            consignee: selectedBooking.consignee || "",
            vesselVoyage: selectedBooking.vesselVoyage || selectedBooking.vessel_voyage || (selectedBooking.vessel && selectedBooking.voyage ? `${selectedBooking.vessel}/${selectedBooking.voyage}` : (selectedBooking.vessel || selectedBooking.voyage || "")),
            origin: selectedBooking.origin || selectedBooking.portOfOrigin || "",
            loadingAddress: selectedBooking.loadingAddress || selectedBooking.origin || "",
            destination: selectedBooking.destination || selectedBooking.portOfDestination || "",
            deliveryAddress: selectedBooking.deliveryAddress || selectedBooking.pod || selectedBooking.portOfDestination || "",
            blNumber: selectedBooking.blNumber || "",
            volume: selectedBooking.volume || "",
            containerNo: selectedBooking.containerNo || "",
            commodity: selectedBooking.commodity || "",
            shipper: selectedBooking.shipper || selectedBooking.client || "",
            rate: selectedBooking.rate || selectedBooking.truckingRates || ""
        });

        // Mark all populated fields as auto-filled
        const newAutoFilled: Record<string, boolean> = {};
        if (selectedBooking.consignee) newAutoFilled.consignee = true;
        if (selectedBooking.vesselVoyage || selectedBooking.vessel_voyage || selectedBooking.vessel) newAutoFilled.vesselVoyage = true;
        if (selectedBooking.origin || selectedBooking.portOfOrigin) newAutoFilled.origin = true;
        if (selectedBooking.loadingAddress || selectedBooking.origin) newAutoFilled.loadingAddress = true;
        if (selectedBooking.destination || selectedBooking.portOfDestination) newAutoFilled.destination = true;
        if (selectedBooking.deliveryAddress || selectedBooking.pod) newAutoFilled.deliveryAddress = true;
        if (selectedBooking.blNumber) newAutoFilled.blNumber = true;
        if (selectedBooking.volume) newAutoFilled.volume = true;
        if (selectedBooking.containerNo) newAutoFilled.containerNo = true;
        if (selectedBooking.commodity) newAutoFilled.commodity = true;
        if (selectedBooking.shipper || selectedBooking.client) newAutoFilled.shipper = true;
        if (selectedBooking.rate || selectedBooking.truckingRates) newAutoFilled.rate = true;
        
        setAutoFilledFields(newAutoFilled);
        
        // Parse containers from booking
        let containers: string[] = [];
        if (selectedBooking.containerNumbers) {
            if (Array.isArray(selectedBooking.containerNumbers)) {
                containers = selectedBooking.containerNumbers;
            } else if (typeof selectedBooking.containerNumbers === 'string') {
                containers = selectedBooking.containerNumbers.split(',').map((c: string) => c.trim()).filter(Boolean);
            }
        } else if (selectedBooking.containerNo) {
            // Check if containerNo is a string that looks like a list
            if (selectedBooking.containerNo.includes(',')) {
                containers = selectedBooking.containerNo.split(',').map((c: string) => c.trim()).filter(Boolean);
            } else {
                containers = [selectedBooking.containerNo];
            }
        }
        
        setAvailableContainers(containers);
        // Pre-fill editable list for Shipping Line with these containers
        setVoucherContainers(containers.length > 0 ? containers : [""]);

        // Auto-fill Payee based on Category
        if (category === "Trucking" && selectedBooking.trucker) {
             setPayee(selectedBooking.trucker);
        } else if (category === "Shipping Line" && selectedBooking.shippingLine) {
             setPayee(selectedBooking.shippingLine);
        } else if (selectedBooking.trucker && !payee) {
             // Legacy fallback or default behavior if no category selected yet but likely trucking?
             // Or maybe we shouldn't auto-fill if category mismatch?
             // Keeping original behavior partially for safety but prioritizing category match
             if (category === "Trucking") setPayee(selectedBooking.trucker);
        }
    }

    if (category === "Trucking" && selectedBooking) {
        const rateStr = String(selectedBooking.rate || selectedBooking.truckingRates || "0").replace(/,/g, '');
        const rateVal = parseFloat(rateStr) || 0;
        
        setParticulars(prev => prev.map(item => 
            item.description === "Trucking/Hauling" ? { ...item, amount: rateVal } : item
        ));
    }

    if (category === "Shipping Line" && selectedBooking) {
      const isExport = selectedBooking.shipmentType?.toLowerCase().includes("export") || selectedBooking.type?.toLowerCase().includes("export");
      const isImport = !isExport;

      // 1. Handle SOP Logic (Shared)
      const pod = selectedBooking.portOfDestination || selectedBooking.port_of_destination || selectedBooking.destination || "";
      const isNorth = /MICP|North/i.test(pod);
      const determinedSop = isNorth ? "SOP (MICP)" : "SOP (POM)";
      
      // Helper to preserve amounts
      const getExistingAmount = (desc: string) => {
        // Check particulars
        const foundP = particulars.find(p => p.description === desc || (p.isSopRow && desc.startsWith("SOP")));
        if (foundP) return foundP.amount;
        // Check distribution
        const foundD = distribution.find(d => d.description === desc);
        return foundD ? foundD.amount : 0;
      };

      // --- Table 1: Particulars ---
      const newParticulars: VoucherLineItem[] = [];
      let particularItems: string[] = [];

      if (isExport) {
          particularItems = [
              "Ocean Freight",
              "Storage",
              "Form E",
              "Form E Form",
              "Registration Fee"
          ];
      } else {
          // Import Defaults
          particularItems = [
              "Local Charges", 
              "Container Deposit", 
              "Duties & Taxes", 
              "Arrastre", 
              "DO Fee"
          ];
      }

      // Add Standard Particulars
      particularItems.forEach(desc => {
         newParticulars.push({ 
            id: Date.now().toString() + Math.random(), 
            description: desc, 
            amount: getExistingAmount(desc) 
         });
      });

      // Add Dynamic SOP Row (Only for Import Bookings)
      if (!isExport) {
        const existingSop = particulars.find(p => p.isSopRow);
        const currentSopType = existingSop?.sopType || existingSop?.defaultSop || determinedSop;
        
        const isFacilitation = existingSop?.sopType === "Facilitation";
        const finalSopType = isFacilitation ? "Facilitation" : determinedSop;
        
        // Auto-fill Section Number from Booking if available and not manually set
        // Support multiple field variations for robustness
        const bookingSection = selectedBooking.section || selectedBooking.SOP || selectedBooking.sop || "";
        const finalSopNum = existingSop?.sopNumber || bookingSection || "";
        
        const finalSopDesc = finalSopNum ? `${finalSopType} ${finalSopNum}` : finalSopType;

        newParticulars.push({
            id: existingSop?.id || (Date.now().toString() + Math.random()),
            description: finalSopDesc,
            amount: existingSop?.amount || 0,
            isSopRow: true,
            defaultSop: determinedSop,
            sopType: finalSopType,
            sopNumber: finalSopNum
        });
      }

      setParticulars(newParticulars);

      // --- Table 2: Distribution of Accounts ---
      const newDistribution: VoucherLineItem[] = [];
      let distributionItems: string[] = [];

      if (isExport) {
          distributionItems = [
              "Processing Fee",
              "Lodgement Fee",
              "Arrastre",
              "LONA",
              "Royalty Fee"
          ];
      } else {
          // Import Defaults
          distributionItems = [
              "Notary / Go Fast / Lodgement"
          ];
      }

      // Add Standard Distribution Items
      distributionItems.forEach(desc => {
          newDistribution.push({
              id: Date.now().toString() + Math.random(),
              description: desc,
              amount: getExistingAmount(desc)
          });
      });

      setDistribution(newDistribution);
    }
  }, [selectedBooking, category]);

  // --- Helpers ---
  const handleSopUpdate = (id: string, field: 'sopType' | 'sopNumber', value: string) => {
    setParticulars(prev => prev.map(item => {
        if (item.id === id) {
            const newType = field === 'sopType' ? value : (item.sopType || item.defaultSop || "SOP (MICP)");
            const newNumber = field === 'sopNumber' ? value : (item.sopNumber || "");
            const newDesc = newNumber ? `${newType} ${newNumber}` : newType;
            
            return {
                ...item,
                sopType: newType,
                sopNumber: newNumber,
                description: newDesc
            };
        }
        return item;
    }));
  };

  const getCategoryOptions = () => {
    return [
      // Booking Costing Categories
      "Shipping Line", 
      "Trucking",
      // General Expense Categories 
      "Annual Expenses",
      "Expenses", 
      "Transportation", 
      "Salary",
      "Benefits",
      "Utilities"
    ];
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);

    // Clear booking-related state when switching to a non-booking category
    const newRequiresBooking = newCategory === "Shipping Line" || newCategory === "Trucking";
    if (!newRequiresBooking) {
      setSelectedBooking(null);
      setBookingFields({
        consignee: "",
        vesselVoyage: "",
        origin: "",
        loadingAddress: "",
        destination: "",
        deliveryAddress: "",
        blNumber: "",
        volume: "",
        containerNo: "",
        commodity: "",
        shipper: "",
        rate: ""
      });
      setAutoFilledFields({});
      setAvailableContainers([]);
      setVoucherContainers([""]);
      setDistribution([]);
    }
    
    // Auto-populate particulars based on category
    const standardItems = DESCRIPTION_OPTIONS[newCategory as keyof typeof DESCRIPTION_OPTIONS];
    
    if (newCategory === "Shipping Line") {
        // Special handling for Shipping Line to inject SOP row
        const newParticulars: VoucherLineItem[] = [];
        
        // Add items before SOP
        const itemsBeforeSop = ["Local Charges", "Container Deposit", "Duties & Taxes", "Arrastre", "DO Fee"];
        itemsBeforeSop.forEach(desc => {
             newParticulars.push({ id: Date.now().toString() + Math.random(), description: desc, amount: 0 });
        });

        // Add Dynamic SOP Row
        // Default to SOP (MICP) if no booking, will update when booking selected
        newParticulars.push({
            id: Date.now().toString() + Math.random(),
            description: "SOP (MICP)",
            amount: 0,
            isSopRow: true,
            defaultSop: "SOP (MICP)",
            sopType: "SOP (MICP)",
            sopNumber: ""
        });

        // Add remaining items
        const itemsAfterSop = ["Notary / Go Fast / Lodgement", "Ocean Freight"];
        itemsAfterSop.forEach(desc => {
             newParticulars.push({ id: Date.now().toString() + Math.random(), description: desc, amount: 0 });
        });

        setParticulars(newParticulars);
    } else if (newCategory === "Trucking") {
      const newParticulars: VoucherLineItem[] = [];
      
      // Prefer trucking record rate, then fallback to booking rate
      let rateVal = 0;
      if (truckingRecordData.truckingRate) {
        const rateStr = String(truckingRecordData.truckingRate).replace(/,/g, '');
        rateVal = parseFloat(rateStr) || 0;
      } else if (selectedBooking) {
        const rateStr = String(selectedBooking.rate || selectedBooking.truckingRates || "0").replace(/,/g, '');
        rateVal = parseFloat(rateStr) || 0;
      }

      newParticulars.push({
          id: Date.now().toString() + Math.random(),
          description: "Trucking/Hauling",
          amount: rateVal
      });
      setParticulars(newParticulars);
    } else if (standardItems && standardItems.length > 0) {
      const newParticulars = standardItems.map(desc => ({
        id: Date.now().toString() + Math.random(),
        description: desc,
        amount: 0
      }));
      setParticulars(newParticulars);
    } else {
      // Default empty row for Other or unknown categories
      setParticulars([{ id: Date.now().toString(), description: "", amount: 0 }]);
    }
  };

  const calculateTotal = () => {
    const partTotal = particulars.reduce((sum, item) => sum + (item.amount || 0), 0);
    const distTotal = distribution.reduce((sum, item) => sum + (item.amount || 0), 0);
    return partTotal + distTotal;
  };

  const handleAddItem = (type: 'particulars' | 'distribution') => {
    const newItem = { id: Date.now().toString() + Math.random(), description: "", amount: 0 };
    if (type === 'particulars') setParticulars([...particulars, newItem]);
    else setDistribution([...distribution, newItem]);
  };

  const handleRemoveItem = (type: 'particulars' | 'distribution', id: string) => {
    if (type === 'particulars') {
      if (particulars.length > 1) setParticulars(particulars.filter(i => i.id !== id));
    } else {
      setDistribution(distribution.filter(i => i.id !== id));
    }
  };

  const handleUpdateItem = (type: 'particulars' | 'distribution', id: string, field: keyof VoucherLineItem, value: any) => {
    const updater = (items: VoucherLineItem[]) => items.map(item => {
      if (item.id === id) return { ...item, [field]: value };
      return item;
    });
    
    if (type === 'particulars') setParticulars(updater(particulars));
    else setDistribution(updater(distribution));
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((category === "Shipping Line" || category === "Trucking") && !selectedBooking) {
      toast.error("Booking link is required for Shipping Line and Trucking categories");
      return;
    }

    if (!payee) {
      toast.error("Payee is required");
      return;
    }
    
    if (!voucherDate) {
      toast.error("Voucher date is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // SingleDateInput already stores in YYYY-MM-DD ISO format
      const formattedDate = voucherDate;
      
      // 1. Create Voucher
      const voucherPayload = {
        voucherNumber: `V-${Date.now().toString().slice(-6)}`, // Auto-gen
        voucherDate: formattedDate,
        payee,
        category,
        bank,
        checkNo,
        amount: calculateTotal(),
        status: "Draft", // Default status
        bookingId: selectedBooking?.id || propBookingId,
        // Add dynamic fields from booking/input
        consignee: bookingFields.consignee,
        shipper: bookingFields.shipper,
        vesselVoy: bookingFields.vesselVoyage,
        origin: bookingFields.origin,
        destination: bookingFields.destination,
        blNumber: bookingFields.blNumber,
        volume: bookingFields.volume,
        commodity: bookingFields.commodity,
        containerNumbers: voucherContainers.filter(c => c.trim() !== ""),
        // Store line items
        lineItems: [
            ...particulars.map(p => ({ ...p, type: 'particulars' })),
            ...distribution.map(d => ({ ...d, type: 'distribution' }))
        ]
      };

      const response = await fetch(`${API_BASE_URL}/vouchers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(voucherPayload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Voucher created successfully");
        onVoucherCreated();
        onClose();
      } else {
        toast.error(result.error || "Failed to create voucher");
      }
    } catch (error) {
      console.error("Error creating voucher:", error);
      toast.error("Failed to create voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const requiresBooking = category === "Shipping Line" || category === "Trucking";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[999] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div
        className="fixed inset-y-0 right-0 w-[95vw] max-w-[800px] bg-white shadow-2xl z-[1000] animate-in slide-in-from-right duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#E5E9F0]">
          <div>
            <h2 className="text-xl font-semibold text-[#12332B]">Create Voucher</h2>
            <p className="text-sm text-[#667085] mt-1">Enter voucher details and line items</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#667085] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <form id="voucher-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Primary Header Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Payee</Label>
                <div className="relative">
                    <PayeeSelector 
                        value={payee} 
                        onSelect={setPayee} 
                        placeholder="Select or enter payee" 
                    />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Category</Label>
                <CategoryDropdown
                  value={category}
                  onChange={handleCategoryChange}
                  options={getCategoryOptions()}
                  placeholder="Select category"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Bank</Label>
                <div className="relative">
                    <Input 
                        value={bank} 
                        onChange={e => setBank(e.target.value)} 
                        placeholder="Enter bank"
                        style={{ height: '40px', borderRadius: '12px', border: '1px solid #E5E9F0', fontSize: '14px' }}
                        className="focus-visible:ring-[#0F766E]"
                    />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Check No.</Label>
                <div className="relative">
                    <Input 
                        value={checkNo} 
                        onChange={e => setCheckNo(e.target.value)} 
                        placeholder="Enter check number"
                        style={{ height: '40px', borderRadius: '12px', border: '1px solid #E5E9F0', fontSize: '14px' }}
                        className="focus-visible:ring-[#0F766E]"
                    />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Voucher Date</Label>
                <SingleDateInput
                  value={voucherDate}
                  onChange={(iso) => setVoucherDate(iso)}
                  placeholder="MM/DD/YYYY"
                />
              </div>
            </div>

            {/* 2. Booking Details (Conditional — Shipping Line / Trucking only) */}
            {requiresBooking && (
                <div style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  overflow: "hidden",
                }}>
                  <div style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #E5E7EB",
                    background: "#F9FAFB",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: 0 }}>
                      Booking Details
                    </h3>
                  </div>

                  <div style={{ padding: "20px 24px" }}>
                    {/* BookingSelector — always functional */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "6px" }}>
                        Select Booking <span style={{ color: "#EF4444" }}>*</span>
                      </div>
                      <BookingSelector
                        value={selectedBooking?.id || ""}
                        onSelect={setSelectedBooking}
                        placeholder="Search by Booking Ref, BL No, or Client..."
                      />
                    </div>

                    {selectedBooking && (
                      <>
                        {/* Linked info badge */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          backgroundColor: "#F0FDF4",
                          color: "#15803D",
                          border: "1px solid #BBF7D0",
                          marginBottom: "16px",
                        }}>
                          <Link2 size={14} />
                          {selectedBooking.shipmentType || "Booking"} linked — fields auto-filled
                        </div>

                        {/* Read-only summary fields */}
                        <div style={{
                          background: "#FAFBFC",
                          border: "1px solid #E5E7EB",
                          borderRadius: "10px",
                          padding: "16px 20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                            {/* Row 1: Linked Expense | Shipper/Consignee */}
                            <div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Linked Expense</div>
                              <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{(() => {
                                // Combine prop expenseNumber with fetched linked expenses from booking
                                const allExpenses = [...linkedExpenseNumbers];
                                if (expenseNumber && !allExpenses.includes(expenseNumber)) {
                                  allExpenses.unshift(expenseNumber);
                                }
                                return allExpenses.length > 0 ? allExpenses.join(", ") : "—";
                              })()}</div>
                            </div>
                            {(() => {
                              const isExportBooking = selectedBooking.shipmentType?.toLowerCase().includes("export") || selectedBooking.type?.toLowerCase().includes("export");
                              return (
                                <div>
                                  <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                                    {isExportBooking ? "Shipper" : "Consignee"}
                                  </div>
                                  <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                                    {isExportBooking ? (bookingFields.shipper || "—") : (bookingFields.consignee || "—")}
                                  </div>
                                </div>
                              );
                            })()}
                            {/* Row 2: Vessel / Voyage | BL Number (non-Trucking) or Delivery Address (Trucking) */}
                            <div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                              <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{bookingFields.vesselVoyage || "—"}</div>
                            </div>
                            {category === "Trucking" ? (
                              (() => {
                                const isExportBooking = selectedBooking.shipmentType?.toLowerCase().includes("export") || selectedBooking.type?.toLowerCase().includes("export");
                                return (
                                  <div>
                                    <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                                      {isExportBooking ? "Loading Address" : "Delivery Address"}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                                      {isExportBooking
                                        ? (truckingRecordData.loadingAddress || bookingFields.loadingAddress || "—")
                                        : (truckingRecordData.deliveryAddress || bookingFields.deliveryAddress || "—")}
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div>
                                <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>BL Number</div>
                                <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{bookingFields.blNumber || "—"}</div>
                              </div>
                            )}
                            {/* Row 3: Origin/Destination | Volume */}
                            {(() => {
                              const isExportBooking = selectedBooking.shipmentType?.toLowerCase().includes("export") || selectedBooking.type?.toLowerCase().includes("export");
                              return (
                                <div>
                                  <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                                    {isExportBooking ? "Destination" : "Origin"}
                                  </div>
                                  <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                                    {isExportBooking ? (bookingFields.destination || "—") : (bookingFields.origin || "—")}
                                  </div>
                                </div>
                              );
                            })()}
                            <div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Volume</div>
                              <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{computeVolumeSummary(bookingFields.containerNo, bookingFields.volume)}</div>
                            </div>
                            {/* Row 4: Container No | Commodity */}
                            <div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                              <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                                {voucherContainers.filter(Boolean).join(", ") || bookingFields.containerNo || "—"}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                              <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{bookingFields.commodity || "—"}</div>
                            </div>
                            {/* Trucking Rate (Trucking only) */}
                            {category === "Trucking" && (
                              <div>
                                <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Trucking Rate</div>
                                <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{truckingRecordData.truckingRate || bookingFields.rate || "—"}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
            )}

            {/* 3. Tables */}
            <div className="space-y-6">
                {/* Table 1: Voucher Entries */}
                <div className="border border-[#E5E9F0] rounded-lg overflow-hidden">
                    <div className="bg-[#FAFBFC] px-4 py-3 border-b border-[#E5E9F0] flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-[#12332B]">Voucher Entries</h3>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleAddItem('particulars')}
                            className="text-[#0F766E] hover:text-[#0D6560] hover:bg-[#0F766E]/5 h-8 text-xs"
                        >
                            <Plus className="h-3 w-3 mr-1" /> Add Line
                        </Button>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-[#E5E9F0] text-xs text-[#667085] uppercase">
                                <th className="px-4 py-3 text-left font-medium w-3/4">Particulars</th>
                                <th className="px-4 py-3 text-right font-medium w-1/4">Amount</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E9F0]">
                            {particulars.map((item) => (
                                <tr key={item.id} className="group hover:bg-gray-50">
                                    <td className="p-2">
                                        {item.isSopRow ? (
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <select
                                                        value={item.sopType || item.defaultSop || "SOP (MICP)"}
                                                        onChange={(e) => handleSopUpdate(item.id, 'sopType', e.target.value)}
                                                        className="w-full h-9 pl-3 pr-8 rounded border border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] focus:ring-0 text-sm transition-colors text-[#12332B] bg-transparent appearance-none"
                                                    >
                                                        <option value={item.defaultSop || "SOP (MICP)"}>{item.defaultSop || "SOP (MICP)"}</option>
                                                        <option value="Facilitation">Facilitation</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                                </div>
                                                <div className="w-20">
                                                    <Input
                                                        value={item.sopNumber || ""}
                                                        onChange={(e) => handleSopUpdate(item.id, 'sopNumber', e.target.value)}
                                                        className="h-9 border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B] text-center"
                                                        placeholder="#"
                                                        title="Section Number"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <Input
                                                value={item.description}
                                                onChange={(e) => handleUpdateItem('particulars', item.id, 'description', e.target.value)}
                                                className="h-9 border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B]"
                                                placeholder="Enter description"
                                            />
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            value={item.amount || ""}
                                            onChange={(e) => handleUpdateItem('particulars', item.id, 'amount', parseFloat(e.target.value) || 0)}
                                            className="h-9 text-right border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B]"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-2 text-center">
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveItem('particulars', item.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Table 2: Distribution of Account */}
                <div className="border border-[#E5E9F0] rounded-lg overflow-hidden">
                    <div className="bg-[#FAFBFC] px-4 py-3 border-b border-[#E5E9F0] flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-[#12332B]">Distribution of Account</h3>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleAddItem('distribution')}
                            className="text-[#0F766E] hover:text-[#0D6560] hover:bg-[#0F766E]/5 h-8 text-xs"
                        >
                            <Plus className="h-3 w-3 mr-1" /> Add Line
                        </Button>
                    </div>
                    {distribution.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white border-b border-[#E5E9F0] text-xs text-[#667085] uppercase">
                                    <th className="px-4 py-3 text-left font-medium w-3/4">Particulars</th>
                                    <th className="px-4 py-3 text-right font-medium w-1/4">Amount</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E9F0]">
                                {distribution.map((item) => (
                                    <tr key={item.id} className="group hover:bg-gray-50">
                                        <td className="p-2">
                                            <Input
                                                value={item.description}
                                                onChange={(e) => handleUpdateItem('distribution', item.id, 'description', e.target.value)}
                                                className="h-9 border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B]"
                                                placeholder="Enter description"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                value={item.amount || ""}
                                                onChange={(e) => handleUpdateItem('distribution', item.id, 'amount', parseFloat(e.target.value) || 0)}
                                                className="h-9 text-right border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B]"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveItem('distribution', item.id)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-sm text-[#667085] bg-white">
                            No items in distribution. <button type="button" onClick={() => handleAddItem('distribution')} className="text-[#0F766E] font-medium hover:underline">Add one</button>
                        </div>
                    )}
                </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E5E9F0] bg-white flex justify-between items-center">
            <div className="text-right">
                <div className="text-xs text-[#667085]">Total Amount</div>
                <div className="text-xl font-bold text-[#12332B]">₱{formatAmount(calculateTotal())}</div>
            </div>
            <div className="flex gap-3">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    className="border-[#E5E9F0] text-[#344054] hover:bg-gray-50"
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    form="voucher-form"
                    disabled={isSubmitting}
                    className="bg-[#0F766E] hover:bg-[#0D6560] text-[#F0FDF4] min-w-[140px]"
                >
                    {isSubmitting ? "Creating..." : "Create Voucher"}
                </Button>
            </div>
        </div>
      </div>
    </>
  );
}