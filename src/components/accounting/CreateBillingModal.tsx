import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Receipt, Link2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { formatAmount } from "../../utils/formatAmount";
import { ComboInput } from "../ui/ComboInput";
import { BookingSelector } from "../selectors/BookingSelector";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { API_BASE_URL } from '@/utils/api-config';

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

interface CreateBillingScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  prefillBookingId?: string;
}

interface Expense {
  id: string;
  expenseNumber: string;
  projectId?: string;
  bookingIds?: string[];
  category: string;
  vendor?: string;
  amount: number;
  charges?: any[];
  blNumber?: string;
  bl_number?: string;
  exchangeRate?: string;
  exchange_rate?: string;
  containerNumbers?: string[];
  container_numbers?: string[];
  containerType?: string;
  container_type?: string;
  billing_amount?: number;
}

interface BillingParticular {
  id: string;
  particulars: string;
  volumeType: "40" | "BL";
  volumeQty: string;
  unitCost: string;
  total: number;
  applyExchangeRate: boolean;
  amount: number;
}

export function CreateBillingScreen({
  onBack,
  onSuccess,
  prefillBookingId,
}: CreateBillingScreenProps) {
  // Booking selection
  const [selectedBookingId, setSelectedBookingId] = useState<string>(prefillBookingId || "");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Expense selection
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [linkedExpenseIds, setLinkedExpenseIds] = useState<Set<string>>(new Set());
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  // Client/Bill To
  const [clientName, setClientName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [billingDate, setBillingDate] = useState<string>("");
  const [creationDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Billing particulars
  const [billingParticulars, setBillingParticulars] = useState<BillingParticular[]>([
    {
      id: `particular-${Date.now()}`,
      particulars: "",
      volumeType: "40",
      volumeQty: "",
      unitCost: "",
      total: 0,
      applyExchangeRate: false,
      amount: 0,
    }
  ]);

  // Shipment details
  const [vessel, setVessel] = useState("");
  const [blNumber, setBlNumber] = useState("");
  const [containerNumbers, setContainerNumbers] = useState<string[]>([""]);
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [shipper, setShipper] = useState("");
  const [consignee, setConsignee] = useState("");
  const [volume, setVolume] = useState("");
  const [commodity, setCommodity] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  
  const [expenseBillingAmount, setExpenseBillingAmount] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-filled fields tracking
  const [autoFilledFields, setAutoFilledFields] = useState<Record<string, boolean>>({});
  const [hasPrefilled, setHasPrefilled] = useState(false); // prevent re-triggering

  // Prefill: fetch booking data on mount when prefillBookingId is provided
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
            const bookingData = { ...result.data, id: result.data.id || result.data.bookingId || prefillBookingId };
            handleBookingSelect(bookingData);
            return;
          }
        } catch (err) {
          console.error("Failed to fetch booking by ID for billing prefill:", err);
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
          console.error("Fallback booking fetch for billing prefill also failed:", err);
        }
      };
      fetchAndSelectBooking();
    }
  }, [prefillBookingId, hasPrefilled]);

  // Auto-fill from selected booking
  useEffect(() => {
    if (selectedBooking) {
      setClientName(selectedBooking.clientName || selectedBooking.client || selectedBooking.customerName || selectedBooking.customer_name || "");
      setVessel(selectedBooking.vesselVoyage || selectedBooking.vessel_voyage || "");
      setBlNumber(selectedBooking.blNumber || selectedBooking.bl_number || selectedBooking.awbBlNo || "");
      
      // Destination Logic: Use POD for Imports
      let dest = selectedBooking.destination || selectedBooking.dropoff || "";
      if (selectedBooking.shipmentType?.toLowerCase() === 'import') {
         dest = selectedBooking.pod || selectedBooking.port_of_destination || dest;
      }
      setDestination(dest);

      setOrigin(selectedBooking.origin || selectedBooking.pol || selectedBooking.pickup || "");
      setShipper(selectedBooking.shipper || "");
      setConsignee(selectedBooking.consignee || "");
      setCommodity(selectedBooking.commodity || "");
      setVolume(selectedBooking.volume || "");
      
      // Parse container numbers
      let containers: string[] = [""];
      if (selectedBooking.containerNumbers) {
          if (Array.isArray(selectedBooking.containerNumbers)) {
               containers = selectedBooking.containerNumbers;
          } else if (typeof selectedBooking.containerNumbers === 'string') {
               containers = selectedBooking.containerNumbers.split(',').map((c: string) => c.trim()).filter(Boolean);
          }
      } else if (selectedBooking.containerNo) {
          if (selectedBooking.containerNo.includes(',')) {
              containers = selectedBooking.containerNo.split(',').map((c: string) => c.trim()).filter(Boolean);
          } else {
              containers = [selectedBooking.containerNo];
          }
      }
      if (containers.length === 0) containers = [""];
      setContainerNumbers(containers);

      // Mark fields as auto-filled
      setAutoFilledFields({
        clientName: true,
        vessel: true,
        blNumber: true,
        destination: true,
        origin: true,
        shipper: true,
        consignee: true,
        commodity: true,
        volume: true,
        containerNumbers: true,
      });

      // Fetch expenses for this booking
      fetchExpenses(selectedBooking.id);
    } else {
      setClientName("");
      setVessel("");
      setBlNumber("");
      setDestination("");
      setOrigin("");
      setShipper("");
      setConsignee("");
      setCommodity("");
      setVolume("");
      setContainerNumbers([""]);
      setExpenses([]);
      setExpenseBillingAmount(0);
      setAutoFilledFields({});
    }
  }, [selectedBooking]);

  // Auto-fill billing particulars volume when shipment volume changes
  useEffect(() => {
    const vol = parseFloat(volume) || 0;
    const rate = parseFloat(exchangeRate) || 0;
    
    if (billingParticulars.length > 0) {
      setBillingParticulars(prev => prev.map(p => {
        const cost = parseFloat(p.unitCost) || 0;
        const newTotal = vol * cost;
        const newAmount = p.applyExchangeRate ? newTotal * rate : newTotal;
        return {
          ...p,
          volumeQty: volume || "0",
          total: newTotal,
          amount: newAmount
        };
      }));
    }
  }, [volume]);

  // Update amounts when global exchange rate changes
  useEffect(() => {
    const rate = parseFloat(exchangeRate) || 0;
    if (billingParticulars.length > 0) {
       setBillingParticulars(prev => prev.map(p => {
         const newAmount = p.applyExchangeRate ? p.total * rate : p.total;
         return {
           ...p,
           amount: newAmount
         };
       }));
    }
  }, [exchangeRate]);

  const handleContainerChange = (index: number, value: string) => {
    const newContainers = [...containerNumbers];
    newContainers[index] = value;
    setContainerNumbers(newContainers);
    setAutoFilledFields(prev => ({ ...prev, containerNumbers: false }));
  };

  const addContainerRow = () => {
    setContainerNumbers([...containerNumbers, ""]);
  };

  const removeContainerRow = (index: number) => {
    if (containerNumbers.length > 1) {
      setContainerNumbers(containerNumbers.filter((_, i) => i !== index));
    }
  };

  const fetchExpenses = async (bookingId: string) => {
    setIsLoadingExpenses(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        // Filter expenses that are linked to selected booking
        const filteredExpenses = (result.data || []).filter((expense: Expense) => {
          return expense.bookingIds?.includes(bookingId) || (expense as any).bookingId === bookingId;
        });
        setExpenses(filteredExpenses);
        
        // Calculate total billing amount from linked expenses
        const totalBilling = filteredExpenses.reduce((sum: number, exp: Expense) => sum + (exp.billing_amount || 0), 0);
        setExpenseBillingAmount(totalBilling);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const handleBookingSelect = (booking: any) => {
    setSelectedBooking(booking);
    setSelectedBookingId(booking?.id || "");
    
    if (booking) {
       // Auto-fill client name immediately on selection to ensure responsiveness
       setClientName(booking.clientName || booking.client || booking.customerName || booking.customer_name || "");
    }
  };

  const addBillingParticular = () => {
    const vol = parseFloat(volume) || 0;
    const newParticular: BillingParticular = {
      id: `particular-${Date.now()}`,
      particulars: "",
      volumeType: "40",
      volumeQty: vol ? vol.toString() : "",
      unitCost: "",
      total: 0,
      applyExchangeRate: false,
      amount: 0,
    };
    setBillingParticulars([...billingParticulars, newParticular]);
  };

  const updateParticular = (id: string, field: keyof BillingParticular, value: any) => {
    setBillingParticulars(billingParticulars.map(p => {
      if (p.id !== id) return p;

      const updated = { ...p, [field]: value };
      const rate = parseFloat(exchangeRate) || 0;

      if (field === "volumeQty" || field === "unitCost") {
        const qty = parseFloat(field === "volumeQty" ? value : updated.volumeQty) || 0;
        const cost = parseFloat(field === "unitCost" ? value : updated.unitCost) || 0;
        updated.total = qty * cost;
        updated.amount = updated.applyExchangeRate 
          ? updated.total * rate 
          : updated.total;
      }

      if (field === "applyExchangeRate") {
        updated.applyExchangeRate = value;
        updated.amount = value ? updated.total * rate : updated.total;
      }

      return updated;
    }));
  };

  const removeParticular = (id: string) => {
    setBillingParticulars(billingParticulars.filter(p => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingId) {
      toast.error("Please select a booking");
      return;
    }

    if (!clientName) {
      toast.error("Please enter a client name");
      return;
    }

    if (!billingDate) {
      toast.error("Please select a billing date");
      return;
    }

    if (billingParticulars.length === 0) {
      toast.error("Please add at least one billing particular");
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = billingParticulars.reduce((sum, p) => sum + p.amount, 0);
      
      // Extract client ID from booking if available
      const clientId = selectedBooking?.client_id || selectedBooking?.clientId || selectedBooking?.customer_id || selectedBooking?.customerId || "";

      const response = await fetch(`${API_BASE_URL}/billings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          bookingId: selectedBookingId, // Primary link
          bookingIds: [selectedBookingId], // Legacy support
          clientId, // Save Client ID for filtering
          clientName,
          companyName,
          category,
          vessel,
          blNumber,
          containerNumbers: containerNumbers.filter(Boolean),
          destination,
          origin,
          shipper,
          consignee,
          volume,
          commodity,
          contractNumber,
          exchangeRate,
          particulars: billingParticulars,
          totalAmount,
          status: "Draft", // Default status
          billingDate: billingDate,
          dueDate: new Date(new Date(billingDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days from billing date
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Billing created successfully!");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create billing");
      }
    } catch (error) {
      console.error("Error creating billing:", error);
      toast.error("Failed to create billing");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to handle manual change
  const handleManualChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value);
    setAutoFilledFields(prev => ({ ...prev, [field]: false }));
  };

  return (
    <div className="h-full overflow-auto" style={{ background: "#FFFFFF" }}>
      {/* Header — matches CreateExpenseScreen */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E9F0]">
        <div style={{ padding: "24px 48px" }}>
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#0F766E]/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#12332B]" />
            </button>
            <div>
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  color: "#12332B",
                  letterSpacing: "-0.5px",
                }}
              >
                Billing
              </h1>
              <p style={{ fontSize: "14px", color: "#667085" }}>
                Generate a new invoice and link it to a booking
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ padding: "32px 48px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            
            {/* ── BOOKING DETAILS (unified summary card) ── */}
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
                    value={selectedBookingId}
                    onSelect={handleBookingSelect}
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
                        {/* Row 1: Shipper/Consignee (conditional) | Client Name */}
                        {selectedBooking?.shipmentType?.toLowerCase() === 'export' && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Shipper</div>
                            <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{shipper || "—"}</div>
                          </div>
                        )}
                        {selectedBooking?.shipmentType?.toLowerCase() === 'import' && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Consignee</div>
                            <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{consignee || "—"}</div>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Client Name</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{clientName || "—"}</div>
                        </div>
                        {companyName && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Company</div>
                            <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{companyName}</div>
                          </div>
                        )}
                        {/* Row 2: BL Number | Vessel / Voyage */}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>BL Number</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{blNumber || "—"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{vessel || "—"}</div>
                        </div>
                        {/* Row 3: Container No | Origin (POL) */}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{containerNumbers.filter(Boolean).join(", ") || "—"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Origin (POL)</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{origin || "—"}</div>
                        </div>
                        {/* Row 4: Destination (POD) | Volume */}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Destination (POD)</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{destination || "—"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Volume</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{computeVolumeSummary(containerNumbers, volume)}</div>
                        </div>
                        {/* Row 5: Commodity (conditional) */}
                        {commodity && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                            <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{commodity}</div>
                          </div>
                        )}
                      </div>

                      {/* Linked Expenses badge */}
                      <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "12px", marginTop: "2px" }}>
                        {expenses.length > 0 ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "6px", fontSize: "12px", fontWeight: 500, color: "#059669" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
                            {expenses.length} Linked Expense{expenses.length > 1 ? 's' : ''} Found
                          </div>
                        ) : (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "12px", fontWeight: 500, color: "#6B7280" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#9CA3AF" }} />
                            No Linked Expenses
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── BILLING DATE & EXCHANGE RATE (separate editable fields) ── */}
            <Card className="p-6 border border-[#E5E9F0] shadow-sm">
              <h3 className="text-base font-semibold text-[#12332B] mb-5">Billing Settings</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[13px] font-medium text-[#667085] mb-2 block">
                    Billing Date <span className="text-red-500">*</span>
                  </Label>
                  <SingleDateInput
                    value={billingDate}
                    onChange={(iso) => setBillingDate(iso)}
                    placeholder="MM/DD/YYYY"
                  />
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-[#667085] mb-2 block">Exchange Rate</Label>
                  <Input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="0.00"
                    className="h-11 border-[#E5E9F0]"
                  />
                </div>
              </div>
            </Card>

            {/* Billing Particulars — table format matching ExpenseCostingTables */}
            <div className="border border-[#E5E9F0] rounded-lg overflow-hidden">
              <div className="bg-[#FAFBFC] px-4 py-3 border-b border-[#E5E9F0] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#12332B]">Billing Particulars</h3>
                </div>
                <Button
                  type="button"
                  onClick={addBillingParticular}
                  variant="ghost"
                  size="sm"
                  className="text-[#0F766E] hover:text-[#0D6560] hover:bg-[#0F766E]/5 h-8 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="bg-white border-b border-[#E5E9F0] text-xs text-[#667085] uppercase">
                    <th className="px-4 py-3 text-left font-medium w-[35%]">Particulars</th>
                    <th className="px-4 py-3 text-right font-medium w-[10%]">Volume</th>
                    <th className="px-4 py-3 text-right font-medium w-[15%]">Unit Cost</th>
                    <th className="px-4 py-3 text-right font-medium w-[15%]">Total</th>
                    <th className="px-4 py-3 text-center font-medium w-[8%]">Ex. Rate</th>
                    <th className="px-4 py-3 text-right font-medium w-[15%]">Amount</th>
                    <th className="w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9F0]">
                  {billingParticulars.map((particular) => (
                    <tr key={particular.id} className="group hover:bg-gray-50">
                      <td className="p-2 pl-4">
                        <Input
                          value={particular.particulars}
                          onChange={(e) => updateParticular(particular.id, "particulars", e.target.value)}
                          className="h-9 border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B] text-sm"
                          placeholder="Enter description"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={particular.volumeQty}
                          onChange={(e) => updateParticular(particular.id, "volumeQty", e.target.value)}
                          className="h-9 text-right border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B] text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={particular.unitCost}
                          onChange={(e) => updateParticular(particular.id, "unitCost", e.target.value)}
                          className="h-9 text-right border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B] text-sm"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-2">
                        <div className="h-9 flex items-center justify-end px-3 bg-[#F9FAFB] rounded-md border border-[#E5E9F0] text-sm font-medium text-gray-500">
                          {formatAmount(particular.total)}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={particular.applyExchangeRate}
                            onCheckedChange={(checked) => updateParticular(particular.id, "applyExchangeRate", checked === true)}
                            className="border-[#D0D5DD] data-[state=checked]:bg-[#0F766E] data-[state=checked]:border-[#0F766E]"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="h-9 flex items-center justify-end px-3 bg-[#F9FAFB] rounded-md border border-[#E5E9F0] text-sm font-medium text-[#12332B]">
                          {formatAmount(particular.amount)}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeParticular(particular.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FAFBFC] border-t border-[#E5E9F0]">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold text-[#667085] uppercase">Subtotal</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#12332B]">
                      ₱{formatAmount(billingParticulars.reduce((sum, p) => sum + p.amount, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total — matches ExpenseCostingTables style */}
            <div className="bg-white border border-[#E5E9F0] rounded-lg p-6 flex justify-between items-center shadow-sm">
              <div>
                <div className="text-sm font-medium text-[#667085]">Total Billing Amount</div>
                {expenseBillingAmount > 0 && (
                  <div className="text-xs text-[#98A2B3] mt-1">
                    Amount for Billing (from Expenses): ₱{formatAmount(expenseBillingAmount)}
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-[#12332B]">
                ₱{formatAmount(billingParticulars.reduce((sum, p) => sum + p.amount, 0))}
              </div>
            </div>

            {/* Action Buttons — matches CreateExpenseScreen */}
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
                disabled={isSubmitting}
                className="h-12 px-8 bg-[#0F766E] hover:bg-[#0D6560] text-[#F0FDF4]"
              >
                {isSubmitting ? "Creating..." : "Create Billing"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}