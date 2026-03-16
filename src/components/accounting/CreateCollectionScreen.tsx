import { X, Search, Plus, Minus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { formatAmount } from "../../utils/formatAmount";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface CreateCollectionScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  preSelectedBillingId?: string;
}

interface Billing {
  id: string;
  billingNumber: string;
  clientId: string;
  clientName: string;
  companyName?: string;
  totalAmount: number;
  collected?: number;
  balance?: number;
  bookingNumber?: string;
  bookingId?: string;
  bookingIds?: string[];
  status: string;
  billingDate: string;
  blNumber?: string;
  bl_number?: string;
  projectNumber?: string;
}

const PAYMENT_METHODS = ["Cash", "Check", "Bank Transfer"];

export function CreateCollectionScreen({ onBack, onSuccess, preSelectedBillingId }: CreateCollectionScreenProps) {
  const isMountedRef = useRef(true);

  const [billings, setBillings] = useState<Billing[]>([]);
  
  // Map of billingId -> amount to pay
  const [selectedAllocations, setSelectedAllocations] = useState<Map<string, number>>(new Map());
  // Track raw input strings for amount fields (so empty = blank, not 0)
  const [allocationInputs, setAllocationInputs] = useState<Map<string, string>>(new Map());
  // Track auto-filled amounts per billing
  const [autoFilledAllocations, setAutoFilledAllocations] = useState<Set<string>>(new Set());
  
  const [isLoadingBillings, setIsLoadingBillings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filter states for invoice selector
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [billingSearch, setBillingSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  
  const [formData, setFormData] = useState({
    collectionDate: new Date().toISOString().split("T")[0],
    collectionNumber: `COL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`,
    paymentMethod: "",
    referenceNumber: "",
    notes: "",
    bankName: "",
    checkNumber: "",
  });

  // Calculate total amount from allocations
  const totalAmount = Array.from(selectedAllocations.values()).reduce((sum, amount) => sum + amount, 0);

  // Track mounted state for safe async updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Fetch billings on mount
  useEffect(() => {
    fetchBillings();
  }, []);

  // Filter billings using all search/filter controls
  const filteredBillings = useMemo(() => {
    return billings.filter(b => {
      // Company filter
      if (companyFilter) {
        const billingCompany = b.companyName || b.clientName || "";
        if (billingCompany !== companyFilter) return false;
        if (clientFilter) {
          const billingClient = b.clientName || "";
          if (billingClient !== clientFilter) return false;
        }
      }

      // Billing number search
      if (billingSearch) {
        const q = billingSearch.toLowerCase().trim();
        const num = (b.billingNumber || "").toLowerCase();
        if (!num.includes(q)) return false;
      }

      // Booking search
      if (bookingSearch) {
        const q = bookingSearch.toLowerCase().trim();
        const bookNum = (b.bookingNumber || "").toLowerCase();
        const bookId = (b.bookingId || "").toLowerCase();
        const bookIds = (b.bookingIds || []).map(id => (id || "").toLowerCase());
        const matches = bookNum.includes(q) || bookId.includes(q) || bookIds.some(id => id.includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [billings, companyFilter, clientFilter, billingSearch, bookingSearch]);

  // Auto-select billing if preSelectedBillingId provided
  useEffect(() => {
    if (preSelectedBillingId && billings.length > 0) {
      const billing = billings.find(b => b.id === preSelectedBillingId);
      if (billing) {
        // Directly set allocation to avoid stale closure
        const balance = billing.balance ?? (billing.totalAmount - (billing.collected ?? 0));
        setSelectedAllocations(prev => {
          if (prev.size > 0) return prev; // Already allocated, skip
          const next = new Map(prev);
          next.set(billing.id, balance);
          return next;
        });
        setAutoFilledAllocations(prev => {
          const next = new Set(prev);
          next.add(billing.id);
          return next;
        });
      }
    }
  }, [billings, preSelectedBillingId]);

  const fetchBillings = async () => {
    setIsLoadingBillings(true);
    try {
      const response = await fetch(`${API_URL}/billings`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();

      if (isMountedRef.current && result.success && result.data) {
        // Filter only billings with outstanding balance
        const availableBillings = result.data.filter((b: Billing) => {
          const balance = b.balance ?? (b.totalAmount - (b.collected ?? 0));
          return balance > 0.01; // Filter out effectively paid
        });
        setBillings(availableBillings);
      }
    } catch (error) {
      console.error("Error fetching billings:", error);
      toast.error("Failed to load billings");
    } finally {
      setIsLoadingBillings(false);
    }
  };

  const handleAmountChange = (billingId: string, rawValue: string) => {
    const billing = billings.find(b => b.id === billingId);
    const balance = billing
      ? (billing.balance ?? (billing.totalAmount - (billing.collected ?? 0)))
      : Infinity;

    // Update raw input string (allows blank/partial typing)
    const newInputs = new Map(allocationInputs);
    newInputs.set(billingId, rawValue);
    setAllocationInputs(newInputs);

    // Parse and clamp the numeric value
    const parsed = parseFloat(rawValue);
    const numericValue = isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), balance);

    const newAllocations = new Map(selectedAllocations);
    if (newAllocations.has(billingId)) {
      newAllocations.set(billingId, numericValue);
      setSelectedAllocations(newAllocations);
      
      // Clear auto-filled status on manual change
      if (autoFilledAllocations.has(billingId)) {
        const newAutoFilled = new Set(autoFilledAllocations);
        newAutoFilled.delete(billingId);
        setAutoFilledAllocations(newAutoFilled);
      }
    }
  };

  const handleAmountBlur = (billingId: string) => {
    const billing = billings.find(b => b.id === billingId);
    const balance = billing
      ? (billing.balance ?? (billing.totalAmount - (billing.collected ?? 0)))
      : Infinity;

    const currentInput = allocationInputs.get(billingId) ?? "";
    const parsed = parseFloat(currentInput);

    if (currentInput === "" || isNaN(parsed)) {
      // If empty or invalid on blur, clear the allocation to 0
      const newAllocations = new Map(selectedAllocations);
      newAllocations.set(billingId, 0);
      setSelectedAllocations(newAllocations);
      // Keep input blank
      return;
    }

    // Clamp to balance and format
    const clamped = Math.min(Math.max(parsed, 0), balance);
    const newInputs = new Map(allocationInputs);
    newInputs.set(billingId, clamped.toFixed(2));
    setAllocationInputs(newInputs);

    const newAllocations = new Map(selectedAllocations);
    newAllocations.set(billingId, clamped);
    setSelectedAllocations(newAllocations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAllocations.size === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Total amount must be greater than 0");
      return;
    }

    if (!formData.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Validate amounts
    for (const [billingId, amount] of selectedAllocations.entries()) {
        if (amount <= 0) {
            toast.error("Allocation amount must be greater than 0");
            return;
        }
        const billing = billings.find(b => b.id === billingId);
        if (billing) {
            const balance = billing.balance ?? (billing.totalAmount - (billing.collected ?? 0));
            if (amount > balance + 0.01) {
                toast.error(`Amount for ${billing.billingNumber} exceeds balance`);
                return;
            }
        }
    }

    // Derive client info from first selected billing
    const firstBillingId = Array.from(selectedAllocations.keys())[0];
    const firstBilling = billings.find(b => b.id === firstBillingId);
    const derivedClientId = firstBilling?.clientId || "";
    const derivedClientName = firstBilling?.clientName || "";

    setIsSaving(true);
    try {
      const allocations = Array.from(selectedAllocations.entries()).map(([billingId, amount]) => ({
        billingId,
        amount
      }));

      const payload = {
        ...formData,
        clientId: derivedClientId,
        clientName: derivedClientName,
        amount: totalAmount,
        allocations
      };

      const response = await fetch(`${API_URL}/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Collection created successfully");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create collection");
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create collection");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getBookingDisplay = (billing: Billing) => {
    if (billing.bookingNumber && billing.bookingNumber !== "undefined" && billing.bookingNumber !== "null") {
      return `Booking: ${billing.bookingNumber}`;
    }
    if (billing.bookingIds && Array.isArray(billing.bookingIds) && billing.bookingIds.length > 0) {
       const validIds = billing.bookingIds.filter(id => id && id !== "undefined");
       if (validIds.length > 0) {
           return `Booking: ${validIds.join(", ")}`;
       }
    }
    if (billing.bookingId && billing.bookingId !== "undefined" && billing.bookingId !== "null") {
      return `Booking: ${billing.bookingId}`;
    }
    return "No Booking";
  };

  const hasActiveFilters = !!companyFilter || !!billingSearch || !!bookingSearch;

  // Derive selected billing objects from the full billings list (filter-independent)
  const selectedBillings = useMemo(() => {
    return billings.filter(b => selectedAllocations.has(b.id));
  }, [billings, selectedAllocations]);

  // Outstanding billings: filtered list minus already-selected items
  const availableBillings = useMemo(() => {
    return filteredBillings.filter(b => !selectedAllocations.has(b.id));
  }, [filteredBillings, selectedAllocations]);

  // Add a billing to the payment queue
  const handleAddBilling = (billing: Billing) => {
    if (selectedAllocations.has(billing.id)) return;
    const balance = billing.balance ?? (billing.totalAmount - (billing.collected ?? 0));
    const newAllocations = new Map(selectedAllocations);
    newAllocations.set(billing.id, balance);
    setSelectedAllocations(newAllocations);

    const newAutoFilled = new Set(autoFilledAllocations);
    newAutoFilled.add(billing.id);
    setAutoFilledAllocations(newAutoFilled);

    const newInputs = new Map(allocationInputs);
    newInputs.set(billing.id, balance.toFixed(2));
    setAllocationInputs(newInputs);
  };

  // Remove a billing from the payment queue
  const handleRemoveBilling = (billingId: string) => {
    const newAllocations = new Map(selectedAllocations);
    newAllocations.delete(billingId);
    setSelectedAllocations(newAllocations);

    const newAutoFilled = new Set(autoFilledAllocations);
    newAutoFilled.delete(billingId);
    setAutoFilledAllocations(newAutoFilled);

    const newInputs = new Map(allocationInputs);
    newInputs.delete(billingId);
    setAllocationInputs(newInputs);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header — matches voucher creation panel */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[#E5E9F0]">
        <div>
          <h2 className="text-xl font-semibold text-[#12332B]">Create Collection</h2>
          <p className="text-sm text-[#667085] mt-1">Record payment received from customer</p>
        </div>
        <button
          onClick={onBack}
          className="p-2 text-[#667085] hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <form id="collection-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. Payment Details — flat grid like voucher header fields */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <Label className="text-xs font-medium text-[#667085] mb-1.5 block">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-[#E5E9F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent text-[#12332B]"
              >
                <option value="" disabled>Select method</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Collection Date</Label>
              <SingleDateInput
                value={formData.collectionDate}
                onChange={(date) => setFormData({ ...formData, collectionDate: date })}
                placeholder="MM/DD/YYYY"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Reference No.</Label>
              <Input
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="h-10 border-[#E5E9F0] text-sm text-[#12332B] focus-visible:ring-[#0F766E]"
                placeholder="Check # or Transaction ID"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-[#667085] mb-1.5 block">Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-10 border-[#E5E9F0] text-sm text-[#12332B] focus-visible:ring-[#0F766E]"
                placeholder="Optional notes"
              />
            </div>
          </div>

          {/* 2. Select Invoices — outstanding billings work queue */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            overflow: "hidden",
          }}>
            {/* Card Header */}
            <div style={{
              padding: "14px 24px",
              borderBottom: "1px solid #E5E7EB",
              background: "#F9FAFB",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "12px 12px 0 0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#12332B", margin: 0 }}>
                  Select Invoices
                </h3>
                <span style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#667085",
                  backgroundColor: "#F3F4F6",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}>
                  {billings.length} outstanding
                </span>
              </div>
              {selectedAllocations.size > 0 && (
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F766E" }}>
                  {selectedAllocations.size} selected
                </span>
              )}
            </div>

            {/* Filter Bar */}
            <div style={{
              padding: "12px 24px",
              borderBottom: "1px solid #F0F2F5",
              backgroundColor: "#FAFBFC",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}>
              {/* Consignee/Shipper + Client Filter */}
              <div style={{ minWidth: "180px" }}>
                <CompanyClientFilter
                  items={billings}
                  getCompany={(b) => b.companyName || b.clientName || ""}
                  getClient={(b) => b.clientName || ""}
                  selectedCompany={companyFilter}
                  selectedClient={clientFilter}
                  onCompanyChange={setCompanyFilter}
                  onClientChange={setClientFilter}
                  placeholder="All Companies"
                />
              </div>

              {/* Billing Search */}
              <div style={{ position: "relative", flex: "1", minWidth: "140px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={billingSearch}
                  onChange={(e) => setBillingSearch(e.target.value)}
                  placeholder="Search billing no."
                  style={{
                    width: "100%",
                    height: "40px",
                    paddingLeft: "34px",
                    paddingRight: "12px",
                    borderRadius: "12px",
                    border: "1px solid #E5E9F0",
                    backgroundColor: "#FFFFFF",
                    fontSize: "13px",
                    color: "#12332B",
                    outline: "none",
                    transition: "border-color 0.15s ease",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
                />
              </div>

              {/* Booking Search */}
              <div style={{ position: "relative", flex: "1", minWidth: "140px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder="Search booking no."
                  style={{
                    width: "100%",
                    height: "40px",
                    paddingLeft: "34px",
                    paddingRight: "12px",
                    borderRadius: "12px",
                    border: "1px solid #E5E9F0",
                    backgroundColor: "#FFFFFF",
                    fontSize: "13px",
                    color: "#12332B",
                    outline: "none",
                    transition: "border-color 0.15s ease",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
                />
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setCompanyFilter(null);
                    setClientFilter(null);
                    setBillingSearch("");
                    setBookingSearch("");
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #E5E9F0",
                    backgroundColor: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#667085",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#D1D5DB";
                    e.currentTarget.style.color = "#374151";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E5E9F0";
                    e.currentTarget.style.color = "#667085";
                  }}
                >
                  <X size={12} />
                  Clear
                </button>
              )}
            </div>

            {/* ── Payment Queue (Selected Billings) ── */}
            {selectedBillings.length > 0 && (
              <div>
                <div style={{
                  padding: "10px 24px",
                  background: "#F0FDF4",
                  borderBottom: "1px solid #D1FAE5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    color: "#0F766E",
                  }}>
                    Payment Queue
                  </span>
                  <span style={{ fontSize: "12px", color: "#0F766E", fontWeight: 500 }}>
                    {selectedBillings.length} {selectedBillings.length === 1 ? "invoice" : "invoices"} · ₱{formatAmount(totalAmount)}
                  </span>
                </div>
                <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                  {selectedBillings.map((billing) => {
                    const balance = billing.balance ?? (billing.totalAmount - (billing.collected ?? 0));
                    const bookingDisplay = getBookingDisplay(billing);
                    const companyDisplay = billing.companyName || billing.clientName || "—";
                    const clientDisplay = (billing.companyName && billing.clientName && billing.companyName !== billing.clientName)
                      ? billing.clientName
                      : null;

                    return (
                      <div
                        key={billing.id}
                        style={{
                          padding: "12px 24px",
                          borderBottom: "1px solid #E5E7EB",
                          backgroundColor: "#FAFFFE",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveBilling(billing.id)}
                            style={{
                              marginTop: "2px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: "1px solid #FCA5A5",
                              backgroundColor: "#FEF2F2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              flexShrink: 0,
                              transition: "all 0.15s ease",
                            }}
                            title="Remove from payment queue"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#FEE2E2";
                              e.currentTarget.style.borderColor = "#F87171";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#FEF2F2";
                              e.currentTarget.style.borderColor = "#FCA5A5";
                            }}
                          >
                            <Minus size={11} color="#EF4444" />
                          </button>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ fontWeight: 500, color: "#12332B", fontSize: "13px" }}>
                                  {billing.billingNumber}
                                </div>
                                <div style={{ fontSize: "12px", color: "#374151", marginTop: "1px" }}>
                                  {companyDisplay}
                                  {clientDisplay && (
                                    <span style={{ color: "#9CA3AF" }}> · {clientDisplay}</span>
                                  )}
                                </div>
                                <div style={{ fontSize: "11px", color: "#667085", marginTop: "2px" }}>
                                  <span style={{ fontWeight: 500, color: "#4B5563" }}>{bookingDisplay}</span>
                                  <span style={{ margin: "0 4px" }}>·</span>
                                  <span>Balance: ₱{formatAmount(balance)}</span>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                <label style={{ fontSize: "12px", fontWeight: 500, color: "#0F766E", whiteSpace: "nowrap" }}>
                                  Pay:
                                </label>
                                <div className="relative" style={{ width: "130px" }}>
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] text-sm">₱</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={allocationInputs.get(billing.id) ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                        handleAmountChange(billing.id, val);
                                      }
                                    }}
                                    onBlur={() => handleAmountBlur(billing.id)}
                                    max={balance}
                                    placeholder=""
                                    className={`w-full h-8 pl-7 pr-3 text-right text-sm border border-[#E5E9F0] rounded-md focus:border-[#0F766E] outline-none transition-colors ${
                                      autoFilledAllocations.has(billing.id) ? "bg-green-50 text-[#12332B]" : "bg-white text-[#12332B]"
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Outstanding Billings (Source List) ── */}
            <div>
              <div style={{
                padding: "10px 24px",
                background: "#F9FAFB",
                borderBottom: "1px solid #F0F2F5",
                borderTop: selectedBillings.length > 0 ? "1px solid #E5E7EB" : "none",
              }}>
                <span style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  color: "#667085",
                }}>
                  Outstanding Billings
                </span>
              </div>

              {isLoadingBillings ? (
                <div className="text-center py-6 text-sm text-[#667085]">Loading invoices...</div>
              ) : billings.length === 0 ? (
                <div className="text-center py-10 text-[#667085]">
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
                    All invoices are fully collected
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    No outstanding balances found
                  </div>
                </div>
              ) : availableBillings.length === 0 ? (
                <div className="text-center py-8 text-[#667085]">
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
                    {hasActiveFilters
                      ? "No matching invoices found"
                      : "All outstanding invoices have been added"}
                  </div>
                  <div style={{ fontSize: "12px" }}>
                    {hasActiveFilters
                      ? "Try adjusting your search or filter criteria"
                      : "Review the payment queue above"}
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {availableBillings.map((billing) => {
                    const balance = billing.balance ?? (billing.totalAmount - (billing.collected ?? 0));
                    const bookingDisplay = getBookingDisplay(billing);
                    const companyDisplay = billing.companyName || billing.clientName || "—";
                    const clientDisplay = (billing.companyName && billing.clientName && billing.companyName !== billing.clientName)
                      ? billing.clientName
                      : null;
                    
                    return (
                      <div
                        key={billing.id}
                        onClick={() => handleAddBilling(billing)}
                        style={{
                          padding: "12px 24px",
                          borderBottom: "1px solid #F0F2F5",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          <div
                            style={{
                              marginTop: "2px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: "1px solid #D0D5DD",
                              backgroundColor: "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Plus size={11} color="#667085" />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ fontWeight: 500, color: "#12332B", fontSize: "13px" }}>
                                  {billing.billingNumber}
                                </div>
                                <div style={{ fontSize: "12px", color: "#374151", marginTop: "1px" }}>
                                  {companyDisplay}
                                  {clientDisplay && (
                                    <span style={{ color: "#9CA3AF" }}> · {clientDisplay}</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: "11px", color: "#667085" }}>Balance</div>
                                <div style={{ fontWeight: 600, color: "#12332B", fontSize: "13px" }}>₱{formatAmount(balance)}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: "11px", color: "#667085", marginTop: "2px" }}>
                              <span style={{ fontWeight: 500, color: "#4B5563" }}>{bookingDisplay}</span>
                              <span style={{ margin: "0 4px" }}>·</span>
                              <span>{formatDate(billing.billingDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Footer — matches voucher creation panel */}
      <div className="p-6 border-t border-[#E5E9F0] bg-white flex justify-between items-center">
        <div>
          <div className="text-xs text-[#667085]">Total Payment</div>
          <div className="text-xl font-bold text-[#12332B]">₱{formatAmount(totalAmount)}</div>
        </div>
        <div className="flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack}
            className="border-[#E5E9F0] text-[#344054] hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="collection-form"
            disabled={isSaving || totalAmount <= 0}
            className="bg-[#0F766E] hover:bg-[#0D6560] text-[#F0FDF4] min-w-[140px]"
          >
            {isSaving ? "Saving..." : "Record Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}