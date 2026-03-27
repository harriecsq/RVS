import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card } from "../ui/card";
import { BookingSelector } from "../selectors/BookingSelector";
import { ExpenseCostingTables, ExpenseTablesData } from "./ExpenseCostingTables";
import { ComboInput } from "../ui/ComboInput";
import { DateInput } from "../ui/DateInput";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { API_BASE_URL } from '@/utils/api-config';

interface CreateExpenseScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  prefillBookingId?: string;
  prefillBookingNumber?: string;
  hideHeader?: boolean;
}

export function CreateExpenseScreen({ onBack, onSuccess, prefillBookingId, prefillBookingNumber, hideHeader }: CreateExpenseScreenProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [expenseTables, setExpenseTables] = useState<ExpenseTablesData>({
    particulars: [{ id: Math.random().toString(36).substr(2, 9), particulars: "", amount: 0, currency: "PHP" }],
    additionalCharges: [{ id: Math.random().toString(36).substr(2, 9), particulars: "", amount: 0, currency: "PHP" }],
    refundableDeposits: [{ id: Math.random().toString(36).substr(2, 9), particulars: "", amount: 0, currency: "PHP" }]
  });
  const [linkedVouchers, setLinkedVouchers] = useState<any[]>([]);
  const [truckingVendorForExpense, setTruckingVendorForExpense] = useState<string>("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null); // Store full booking object
  
  // Track auto-filled state
  const [autoFilledFields, setAutoFilledFields] = useState<Record<string, boolean>>({});
  const [hasPrefilled, setHasPrefilled] = useState(false); // prevent re-triggering

  const [formData, setFormData] = useState({
    bookingId: "",
    documentTemplate: "" as "IMPORT" | "EXPORT" | "",
    
    // Common fields
    client: "",
    shipperConsignee: "",
    
    // IMPORT-specific fields
    pod: "",
    commodity: "",
    blNumber: "",
    containerNo: "",
    weight: "",
    vesselVoyage: "",
    origin: "",
    date: "",
    releasingDate: "",
    
    // EXPORT-specific fields
    destination: "",
    loadingAddress: "",
    exchangeRate: "",
    containerNumbers: [""],
  });

  // Helper to clear auto-filled state on user interaction
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (autoFilledFields[field]) {
      setAutoFilledFields(prev => ({ ...prev, [field]: false }));
    }
  };

  // Helper for input styling
  const getInputStyle = (field: string) => {
    const isAutoFilled = autoFilledFields[field];
    return `h-11 border-[#E5E9F0] transition-colors ${
      isAutoFilled ? "bg-green-50 text-[#0A1D4D]" : "bg-white"
    }`;
  };

  const handleBookingSelect = async (booking: any) => {
    console.log("Selected Booking for Expense:", booking);
    setSelectedBooking(booking);
    setLinkedVouchers([]); // Clear previous vouchers immediately to prevent mismatch
    
    if (!booking) {
      setFormData(prev => ({
        ...prev,
        bookingId: "",
        documentTemplate: ""
      }));
      setLinkedVouchers([]);
      return;
    }

    // Fetch linked vouchers
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/vouchers`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` }
        });
        const result = await response.json();
        if (result.success) {
            setLinkedVouchers(result.data || []);
        }
    } catch (err) {
        console.error("Failed to fetch vouchers", err);
        // Fallback or silently fail
    }

    // Support both camelCase and snake_case properties
    const shipmentType = booking.shipmentType || booking.shipment_type || booking.type || "";
    let template: "IMPORT" | "EXPORT" | "" = "";
    
    // Robust detection of shipment type
    const typeStr = String(shipmentType).toUpperCase();
    if (typeStr.includes("IMPORT") || typeStr === "IMPS" || typeStr === "I") template = "IMPORT";
    else if (typeStr.includes("EXPORT") || typeStr === "EXPS" || typeStr === "E") template = "EXPORT";

    // Parse container numbers
    let containers = [""];
    if (booking.containerNumbers) {
        if (Array.isArray(booking.containerNumbers)) {
             containers = booking.containerNumbers;
        } else if (typeof booking.containerNumbers === 'string') {
             containers = booking.containerNumbers.split(',').map((c: string) => c.trim()).filter(Boolean);
        }
    } else if (booking.containerNo) {
        if (booking.containerNo.includes(',')) {
            containers = booking.containerNo.split(',').map((c: string) => c.trim()).filter(Boolean);
        } else {
            containers = [booking.containerNo];
        }
    }
    if (containers.length === 0) containers = [""];

    // Mark fields as auto-filled if they have values
    const newAutoFilledFields: Record<string, boolean> = {};
    const clientVal = booking.contactPersonName || booking.contact_person_name || booking.customerName || booking.customer_name || "";
    // Consignee/Shipper = Company field. Fall back to customerName (which IS the company in merged mode)
    const companyVal = booking.companyName || booking.company_name || booking.customerName || booking.customer_name || "";
    if (clientVal) newAutoFilledFields["client"] = true;
    if (companyVal) newAutoFilledFields["shipperConsignee"] = true;
    if (booking.bl_number || booking.blNumber) newAutoFilledFields["blNumber"] = true;
    if (booking.commodity) newAutoFilledFields["commodity"] = true;
    if (booking.vesselVoyage || booking.vessel_voyage || booking.vessel || booking.carrier) newAutoFilledFields["vesselVoyage"] = true;
    if (booking.origin || booking.pol || booking.pickup) newAutoFilledFields["origin"] = true;
    if (booking.destination || booking.pod || booking.dropoff) newAutoFilledFields["destination"] = true;
    if (booking.pod || booking.dropoff) newAutoFilledFields["pod"] = true;
    if (booking.pickup || booking.loading_address) newAutoFilledFields["loadingAddress"] = true;
    if (booking.containerNo || (containers.length > 0 && containers[0] !== "")) newAutoFilledFields["containerNo"] = true;
    if (booking.weight || booking.grossWeight || booking.gross_weight) newAutoFilledFields["weight"] = true;
    
    setAutoFilledFields(newAutoFilledFields);

    setFormData(prev => ({
      ...prev,
      bookingId: booking.id,
      documentTemplate: template,
      // Auto-fill common fields — Client from Contact Person, Shipper/Consignee from Company
      client: clientVal,
      shipperConsignee: companyVal,
      blNumber: booking.bl_number || booking.blNumber || "",
      commodity: booking.commodity || "",
      vesselVoyage: booking.vesselVoyage || booking.vessel_voyage || booking.vessel || booking.carrier || "",
      origin: booking.origin || booking.pol || booking.pickup || "",
      destination: booking.destination || booking.pod || booking.dropoff || "",
      pod: booking.pod || booking.dropoff || "",
      loadingAddress: booking.pickup || booking.loading_address || "",
      weight: booking.weight || booking.grossWeight || booking.gross_weight || "",
      containerNumbers: containers,
      containerNo: containers.join(', ') // Keep string version synced
    }));

    // Fetch trucking record for this booking to get Loading Address from trucking tab
    try {
      const truckingRes = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${booking.id}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });
      const truckingResult = await truckingRes.json();
      if (truckingResult.success && Array.isArray(truckingResult.data) && truckingResult.data.length > 0) {
        const truckingRecord = truckingResult.data[0];
        const truckingAddr = truckingRecord.truckingAddress || truckingRecord.trucking_address || "";
        if (truckingAddr) {
          setFormData(prev => ({ ...prev, loadingAddress: truckingAddr }));
          setAutoFilledFields(prev => ({ ...prev, loadingAddress: true }));
        }
        const vendorName = truckingRecord.vendorName || truckingRecord.vendor_name || truckingRecord.truckingVendor || truckingRecord.trucker || "";
        if (vendorName) {
          setTruckingVendorForExpense(vendorName);
        }
      }
    } catch (err) {
      console.error("Failed to fetch trucking record for loading address:", err);
    }
  };

  const handleContainerChange = (index: number, value: string) => {
    const newContainers = [...formData.containerNumbers];
    newContainers[index] = value;
    setFormData(prev => ({
        ...prev, 
        containerNumbers: newContainers,
        containerNo: newContainers.filter(Boolean).join(', ')
    }));
    if (autoFilledFields["containerNo"]) {
      setAutoFilledFields(prev => ({ ...prev, containerNo: false }));
    }
  };

  const addContainerRow = () => {
    setFormData(prev => ({ ...prev, containerNumbers: [...prev.containerNumbers, ""] }));
  };

  const removeContainerRow = (index: number) => {
    if (formData.containerNumbers.length > 1) {
        const newContainers = formData.containerNumbers.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev, 
            containerNumbers: newContainers,
            containerNo: newContainers.filter(Boolean).join(', ')
        }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bookingId) {
      toast.error("Please select a booking");
      return;
    }

    setIsSaving(true);

    try {
      const expensePayload: any = {
        // Auto-generate expense number in background if needed by backend, or omit
        expenseNumber: `EXP-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`, 
        bookingId: formData.bookingId,
        bookingIds: [formData.bookingId],
        amount: 0, // Will be updated by charges
        expenseDate: new Date().toISOString().split('T')[0], // Default to today
        documentTemplate: formData.documentTemplate,
        status: "Draft",
        createdAt: new Date().toISOString(),
        // Common fields
        client: formData.client,
        shipperConsignee: formData.shipperConsignee,
      };

      // Add IMPORT-specific fields
      if (formData.documentTemplate === "IMPORT") {
        expensePayload.pod = formData.pod;
        expensePayload.commodity = formData.commodity;
        expensePayload.blNumber = formData.blNumber;
        expensePayload.containerNo = formData.containerNo;
        expensePayload.containerNumbers = formData.containerNumbers.filter(Boolean); // Send array too
        expensePayload.weight = formData.weight;
        expensePayload.vesselVoyage = formData.vesselVoyage;
        expensePayload.origin = formData.origin;
        expensePayload.date = formData.date;
        expensePayload.releasingDate = formData.releasingDate;
      }

      // Add EXPORT-specific fields
      if (formData.documentTemplate === "EXPORT") {
        expensePayload.clientShipper = formData.client;
        expensePayload.vesselVoyage = formData.vesselVoyage;
        expensePayload.destination = formData.destination;
        expensePayload.commodity = formData.commodity;
        expensePayload.blNumber = formData.blNumber;
        expensePayload.containerNo = formData.containerNo;
        expensePayload.loadingAddress = formData.loadingAddress;
        expensePayload.exchangeRate = formData.exchangeRate;
        expensePayload.containerNumbers = formData.containerNumbers.filter(Boolean);
      }

      // Add charges from ExpenseTables
      const allCharges: any[] = [];
      
      if (formData.documentTemplate === "EXPORT" && expenseTables.exportCategories) {
        // EXPORT: Map from export categories
        Object.entries(expenseTables.exportCategories).forEach(([categoryName, items]) => {
          items.forEach(item => {
            if (item.particulars || item.amount) {
              allCharges.push({
                description: item.particulars,
                amount: item.amount,
                currency: item.currency,
                unitPrice: item.unitPrice,
                per: item.per,
                category: categoryName,
                voucherNo: item.voucherNo,
                sourceVoucherLineItemId: item.sourceVoucherLineItemId
              });
            }
          });
        });
      } else {
        // IMPORT: Map from traditional categories
        // Map Particulars
        expenseTables.particulars.forEach(item => {
          allCharges.push({
            description: item.particulars,
            amount: item.amount,
            currency: item.currency,
            unitPrice: item.unitPrice,
            per: item.per,
            category: "Particulars",
            voucherNo: item.voucherNo,
            sourceVoucherLineItemId: item.sourceVoucherLineItemId
          });
        });

        // Map Additional Charges
        expenseTables.additionalCharges.forEach(item => {
          allCharges.push({
            description: item.particulars,
            amount: item.amount,
            currency: item.currency,
            unitPrice: item.unitPrice,
            per: item.per,
            category: "Additional Charges",
            voucherNo: item.voucherNo,
            sourceVoucherLineItemId: item.sourceVoucherLineItemId
          });
        });

        // Map Refundable Deposits
        expenseTables.refundableDeposits.forEach(item => {
          allCharges.push({
            description: item.particulars,
            amount: item.amount,
            currency: item.currency,
            unitPrice: item.unitPrice,
            per: item.per,
            category: "Refundable Deposits",
            voucherNo: item.voucherNo,
            sourceVoucherLineItemId: item.sourceVoucherLineItemId
          });
        });
      }

      if (allCharges.length > 0) {
        expensePayload.charges = allCharges;
        // Calculate Total Amount (excluding Refundable Deposits)
        if (formData.documentTemplate === "EXPORT" && expenseTables.exportCategories) {
          expensePayload.amount = Object.values(expenseTables.exportCategories)
            .flat()
            .reduce((sum, i) => sum + (i.amount || 0), 0);
        } else {
          const totalParticulars = expenseTables.particulars.reduce((sum, i) => sum + (i.amount || 0), 0);
          const totalAdditional = expenseTables.additionalCharges.reduce((sum, i) => sum + (i.amount || 0), 0);
          expensePayload.amount = totalParticulars + totalAdditional;
        }
      }

      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(expensePayload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Expense created successfully!");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create expense");
      }
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Failed to create expense");
    } finally {
      setIsSaving(false);
    }
  };

  const ContainerInputList = () => (
    <div>
      <Label className="text-[13px] font-medium text-[#667085] mb-2 block">Container Number/s</Label>
      <div className="flex flex-col gap-2">
        {formData.containerNumbers.map((container, index) => (
          <div key={index} className="flex gap-2">
            <Input 
              value={container}
              onChange={(e) => handleContainerChange(index, e.target.value)}
              onFocus={() => {
                if (autoFilledFields["containerNo"]) setAutoFilledFields(prev => ({ ...prev, containerNo: false }));
              }}
              className={getInputStyle("containerNo")}
              placeholder={`Container #${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeContainerRow(index)}
              className="p-2 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-200"
              disabled={formData.containerNumbers.length <= 1}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addContainerRow}
          className="flex items-center justify-center gap-2 h-10 border border-dashed border-[#0F766E] text-[#0F766E] rounded hover:bg-[#0F766E]/5 text-sm font-medium"
        >
          <Plus size={16} /> Add Container
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (prefillBookingId && !hasPrefilled) {
      setHasPrefilled(true);
      const fetchAndSelectBooking = async () => {
        try {
          // First try the unified bookings endpoint
          const response = await fetch(`${API_BASE_URL}/bookings/${prefillBookingId}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` }
          });
          const result = await response.json();
          if (result.success && result.data) {
            // Ensure the booking object has an id field
            const bookingData = { ...result.data, id: result.data.id || result.data.bookingId || prefillBookingId };
            handleBookingSelect(bookingData);
            return;
          }
        } catch (err) {
          console.error("Failed to fetch booking by ID for prefill:", err);
        }
        
        // Fallback: try fetching all bookings and find the match
        try {
          const response = await fetch(`${API_BASE_URL}/bookings`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` }
          });
          const result = await response.json();
          if (result.success && result.data) {
            const match = result.data.find((b: any) => 
              b.id === prefillBookingId || b.bookingId === prefillBookingId
            );
            if (match) {
              const bookingData = { ...match, id: match.id || match.bookingId || prefillBookingId };
              handleBookingSelect(bookingData);
            }
          }
        } catch (err) {
          console.error("Fallback booking fetch also failed:", err);
        }
      };
      fetchAndSelectBooking();
    }
  }, [prefillBookingId, hasPrefilled]);

  return (
    <div className="h-full overflow-auto" style={{ background: "#FFFFFF" }}>
      {/* Header */}
      {!hideHeader && (
        <div className="sticky top-0 z-10 bg-white border-b border-[#E5E9F0]">
          <div style={{ padding: "24px 48px" }}>
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={onBack}
                className="p-2 hover:bg-[#0F766E]/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#0A1D4D]" />
              </button>
              <div>
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    color: "#0A1D4D",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Expense
                </h1>
                <p style={{ fontSize: "14px", color: "#667085" }}>
                  Record a new expense and link it to a booking
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ padding: "32px 48px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* ── BOOKING DETAILS (unified summary card) ── */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #E5E9F0",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "16px 24px",
                borderBottom: "1px solid #E5E9F0",
                background: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                  Booking Details
                </h3>
              </div>

              <div style={{ padding: "20px 24px" }}>
                {/* BookingSelector — always functional */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "6px" }}>
                    Select Booking
                  </div>
                  <BookingSelector
                    value={formData.bookingId}
                    onSelect={handleBookingSelect}
                    placeholder="Search by Booking Ref, BL No, or Client..."
                  />
                </div>

                {formData.documentTemplate && (
                  <div
                    style={{
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
                    }}
                  >
                    <Link2 size={14} />
                    {formData.documentTemplate === "IMPORT" ? "Import" : "Export"} booking linked — fields auto-filled
                  </div>
                )}

                {/* Read-only summary fields — shown when a booking is linked */}
                {formData.bookingId && (
                  <div
                    style={{
                      background: "#FAFBFC",
                      border: "1px solid #E5E9F0",
                      borderRadius: "8px",
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    {/* IMPORT template fields */}
                    {formData.documentTemplate === "IMPORT" && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Consignee</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.shipperConsignee || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Client</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.client || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>BL Number</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.blNumber || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.commodity || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.vesselVoyage || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.containerNumbers.filter(Boolean).join(", ") || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Origin</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.origin || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Port of Destination (POD)</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.pod || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Weight</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.weight || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Releasing Date</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.releasingDate || "—"}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* EXPORT template fields */}
                    {formData.documentTemplate === "EXPORT" && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Shipper</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.shipperConsignee || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Client</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.client || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Destination</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.destination || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.vesselVoyage || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.commodity || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>BL Number</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.blNumber || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.containerNumbers.filter(Boolean).join(", ") || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Loading Address</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formData.loadingAddress || "—"}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* No template yet — waiting for booking selection */}
                    {!formData.documentTemplate && (
                      <div style={{ fontSize: "13px", color: "#9CA3AF", fontStyle: "italic" }}>
                        Booking details will appear here once a booking is selected
                      </div>
                    )}
                  </div>
                )}

                {!formData.bookingId && (
                  <div style={{ fontSize: "13px", color: "#9CA3AF", fontStyle: "italic" }}>
                    No booking selected
                  </div>
                )}
              </div>
            </div>

            {/* ── EXCHANGE RATE (separate section, shown for EXPORT bookings) ── */}
            {formData.documentTemplate === "EXPORT" && (
              <div style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #E5E9F0",
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #E5E9F0",
                  background: "#F9FAFB",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                    Exchange Rate
                  </h3>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "6px" }}>
                      Exchange Rate
                    </div>
                    <Input
                      value={formData.exchangeRate}
                      onChange={(e) => handleFieldChange("exchangeRate", e.target.value)}
                      className="h-11 border-[#E5E9F0] bg-white"
                      placeholder="Enter exchange rate"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Expense Tables */}
            <ExpenseCostingTables
              booking={selectedBooking}
              vouchers={linkedVouchers}
              onChange={setExpenseTables}
              isImport={formData.documentTemplate === "IMPORT"}
              exchangeRate={formData.exchangeRate}
              truckingVendor={truckingVendorForExpense}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="h-12 px-6 border-[#E5E9F0]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-12 px-8 bg-[#0F766E] hover:bg-[#0D6560] text-[#F0FDF4]"
              >
                {isSaving ? "Saving..." : "Create Expense"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}