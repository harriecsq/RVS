import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Trash2, Plus, ChevronDown, Link2, FileText, Paperclip, Check } from "lucide-react";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { StandardButton } from "../design-system";
import { StandardTabs } from "../design-system/StandardTabs";
import { HeaderStatusDropdown } from "../shared/HeaderStatusDropdown";
import { TabRowActions } from "../shared/TabRowActions";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { Input } from "../ui/input";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { BookingSelector } from "../selectors/BookingSelector";
import { PayeeSelector } from "../selectors/PayeeSelector";
import { formatAmount } from "../../utils/formatAmount";
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

interface ViewVoucherScreenProps {
  voucherId: string;
  onBack: () => void;
}

type VoucherStatus = "Draft" | "For Approval" | "Approved" | "Paid" | "Cancelled";

const VOUCHER_STATUS_COLORS: Record<string, string> = {
  "Draft": "#6B7280",
  "For Approval": "#F59E0B",
  "Approved": "#3B82F6",
  "Paid": "#10B981",
  "Cancelled": "#DC2626",
};
const VOUCHER_STATUSES = ["Draft", "For Approval", "Approved", "Paid", "Cancelled"];

interface LineItem {
  id: string;
  description: string;
  amount: number;
  type?: 'particulars' | 'distribution';
  currency?: string;
  category?: string;
  // SOP fields
  isSopRow?: boolean;
  defaultSop?: string;
  sopType?: string;
  sopNumber?: string;
}

interface Voucher {
  id: string;
  voucherNumber: string;
  bookingId?: string;
  booking?: any; // To hold linked booking details
  amount: number;
  currency: string;
  payee?: string;
  category?: string;
  bank?: string;
  checkNo?: string;
  status: VoucherStatus;
  voucherDate: string;
  created_at: string;
  updated_at?: string;
  
  // Dynamic fields
  consignee?: string;
  shipper?: string;
  vesselVoy?: string;
  origin?: string;
  destination?: string;
  blNumber?: string;
  volume?: string;
  commodity?: string;
  containerNumbers?: string[];
  
  lineItems?: LineItem[];
  // Legacy
  expenseId?: string;
  expenseNumber?: string;
  lineItemIds?: string[];
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
}

// --- Components defined OUTSIDE to prevent re-renders losing focus ---

const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
      {label}
    </label>
    <div style={{
      padding: "10px 14px",
      backgroundColor: "#F9FAFB",
      border: "1px solid var(--neuron-ui-border)",
      borderRadius: "6px",
      fontSize: "14px",
      color: value ? "var(--neuron-ink-primary)" : "#9CA3AF",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      minHeight: "42px",
      overflow: "hidden"
    }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value || "—"}
      </span>
    </div>
  </div>
);

function NeuronDropdown({
  value, options, onChange, placeholder = "Select...",
}: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
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
      <div onClick={() => setOpen(!open)} style={{
        width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px",
        border: "1px solid #E5E9F0", fontSize: "14px", display: "flex",
        alignItems: "center", justifyContent: "space-between", cursor: "pointer",
        color: value ? "#12332B" : "#9CA3AF", backgroundColor: "#FFFFFF",
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder}</span>
        <ChevronDown size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "white", border: "1px solid #E5E9F0", borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)", zIndex: 100, maxHeight: "220px", overflowY: "auto",
        }}>
          {options.map((opt) => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: "10px 12px", cursor: "pointer", fontSize: "14px", color: "#12332B",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                backgroundColor: value === opt ? "#E8F2EE" : "transparent",
              }}
              onMouseEnter={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = value === opt ? "#E8F2EE" : "transparent"; }}
            >
              {opt}
              {value === opt && <Check size={14} style={{ color: "#237F66" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EditableField = ({
  label, 
  value, 
  onChange, 
  isEditing 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  isEditing: boolean 
}) => {
  if (!isEditing) return <Field label={label} value={value} />;
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
        {label}
      </label>
      <Input 
          value={value || ""} 
          onChange={(e) => onChange(e.target.value)}
          className="h-[42px] border-[#E5E9F0] focus-visible:ring-[#0F766E]"
      />
    </div>
  );
};



const TableSection = ({ 
  title, 
  items, 
  type, 
  isEditing, 
  onAddItem, 
  onRemoveItem, 
  onUpdateItem, 
  onSopUpdate 
}: { 
  title: string, 
  items: LineItem[], 
  type: 'particulars' | 'distribution', 
  isEditing: boolean,
  onAddItem: (type: 'particulars' | 'distribution') => void,
  onRemoveItem: (type: 'particulars' | 'distribution', id: string) => void,
  onUpdateItem: (type: 'particulars' | 'distribution', id: string, field: keyof LineItem, value: any) => void,
  onSopUpdate: (id: string, field: 'sopType' | 'sopNumber', value: string) => void
}) => (
  <div className="border border-[#E5E9F0] rounded-lg overflow-hidden mb-6">
      <div className="bg-[#FAFBFC] px-4 py-3 border-b border-[#E5E9F0] flex justify-between items-center">
          <h3 className="text-sm font-semibold text-[#0A1D4D]">{title}</h3>
          {isEditing && (
              <StandardButton 
                  variant="ghost" 
                  onClick={() => onAddItem(type)}
                  className="text-[#0F766E] hover:text-[#0D6560] hover:bg-[#0F766E]/5 h-8 text-xs px-2"
              >
                  <Plus className="h-3 w-3 mr-1" /> Add Line
              </StandardButton>
          )}
      </div>
      
      {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#667085] bg-white">
              No items. {isEditing && <button type="button" onClick={() => onAddItem(type)} className="text-[#0F766E] font-medium hover:underline">Add one</button>}
          </div>
      ) : (
          <table className="w-full">
              <thead>
                  <tr className="bg-white border-b border-[#E5E9F0] text-xs text-[#667085] uppercase">
                      <th className="px-4 py-3 text-left font-medium w-3/4">Particulars</th>
                      <th className="px-4 py-3 text-right font-medium w-1/4">Amount</th>
                      <th className="w-10"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F0]">
                  {items.map((item) => (
                      <tr key={item.id} className="group bg-white hover:bg-white">
                          <td className="p-2">
                              {isEditing ? (
                                  item.isSopRow ? (
                                      <div className="flex gap-2">
                                          <div className="relative flex-1">
                                              <select
                                                  value={item.sopType || item.defaultSop || "SOP (MICP)"}
                                                  onChange={(e) => onSopUpdate(item.id, 'sopType', e.target.value)}
                                                  className="w-full h-9 pl-3 pr-8 rounded border border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] focus:ring-0 text-sm transition-colors text-[#0A1D4D] bg-transparent appearance-none"
                                              >
                                                  <option value={item.defaultSop || "SOP (MICP)"}>{item.defaultSop || "SOP (MICP)"}</option>
                                                  <option value="Facilitation">Facilitation</option>
                                              </select>
                                              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                          </div>
                                          <div className="w-20">
                                              <Input
                                                  value={item.sopNumber || ""}
                                                  onChange={(e) => onSopUpdate(item.id, 'sopNumber', e.target.value)}
                                                  className="h-9 border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#0A1D4D] text-center"
                                                  placeholder="#"
                                                  title="Section Number"
                                              />
                                          </div>
                                      </div>
                                  ) : (
                                      <Input
                                          value={item.description || ""}
                                          onChange={(e) => onUpdateItem(type, item.id, 'description', e.target.value)}
                                          className="h-9 border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#0A1D4D]"
                                          placeholder="Enter description"
                                      />
                                  )
                              ) : (
                                  <div className="h-9 flex items-center text-sm text-[#0A1D4D] px-2">{item.description}</div>
                              )}
                          </td>
                          <td className="p-2">
                              {isEditing ? (
                                  <Input
                                      type="number"
                                      value={item.amount || ""}
                                      onChange={(e) => onUpdateItem(type, item.id, 'amount', parseFloat(e.target.value) || 0)}
                                      className="h-9 text-right border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#0A1D4D]"
                                      placeholder="0.00"
                                  />
                              ) : (
                                  <div className="h-9 flex items-center justify-end text-sm text-[#0A1D4D] px-2">
                                      ₱{formatAmount(item.amount || 0)}
                                  </div>
                              )}
                          </td>
                          {isEditing ? (
                              <td className="p-2 text-center">
                                  <button 
                                      type="button"
                                      onClick={() => onRemoveItem(type, item.id)}
                                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              </td>
                          ) : (
                              <td className="w-10"></td>
                          )}
                      </tr>
                  ))}
              </tbody>
          </table>
      )}
  </div>
);


export function ViewVoucherScreen({ voucherId, onBack }: ViewVoucherScreenProps) {
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVoucher, setEditedVoucher] = useState<Voucher | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"voucher-info" | "attachments">("voucher-info");
  const [editVoucherCompanyCode, setEditVoucherCompanyCode] = useState("RVS");
  const [editVoucherType, setEditVoucherType] = useState("CV");
  const [editVoucherYear, setEditVoucherYear] = useState(String(new Date().getFullYear()));
  const [editVoucherRefNumber, setEditVoucherRefNumber] = useState("");
  const [editNextVoucherNumber, setEditNextVoucherNumber] = useState<number | null>(null);

  // Line Items State
  const [particulars, setParticulars] = useState<LineItem[]>([]);
  const [distribution, setDistribution] = useState<LineItem[]>([]);
  const [truckingRecordData, setTruckingRecordData] = useState<{ deliveryAddress: string; loadingAddress: string; truckingRate: string }>({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
  const [manualDeliveryAddress, setManualDeliveryAddress] = useState("");
  const [manualLoadingAddress, setManualLoadingAddress] = useState("");

  useEffect(() => {
    fetchVoucherDetails();
  }, [voucherId]);

  // Fetch trucking record data when voucher category is Trucking
  useEffect(() => {
    const bookingIdToUse = voucher?.booking?.bookingId || voucher?.bookingId;
    const voucherCategory = voucher?.category;
    if (voucherCategory === "Trucking" && bookingIdToUse) {
      fetchTruckingRecordForBooking(bookingIdToUse);
    } else {
      setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
    }
  }, [voucher?.bookingId, voucher?.booking?.bookingId, voucher?.category]);

  // Parse voucher number when entering edit mode
  useEffect(() => {
    if (!isEditing || !voucher) return;
    const vn = voucher.voucherNumber || "";
    const parts = vn.split(" ");
    if (parts.length >= 3) {
      setEditVoucherCompanyCode(parts[0]);
      setEditVoucherType(parts[1]);
      const rest = parts.slice(2).join(" ");
      const dashIdx = rest.indexOf("-");
      if (dashIdx > 0) {
        setEditVoucherYear(rest.slice(0, dashIdx));
        setEditVoucherRefNumber(rest.slice(dashIdx + 1));
      }
    } else if (parts.length === 2) {
      setEditVoucherCompanyCode(parts[0]);
      const rest = parts[1];
      const dashIdx = rest.indexOf("-");
      if (dashIdx > 0) {
        setEditVoucherYear(rest.slice(0, dashIdx));
        setEditVoucherRefNumber(rest.slice(dashIdx + 1));
      }
    }
  }, [isEditing]);

  // Fetch next voucher number when editing
  useEffect(() => {
    if (!isEditing) return;
    const params = new URLSearchParams({ companyCode: editVoucherCompanyCode, voucherType: editVoucherType, year: editVoucherYear });
    fetch(`${API_BASE_URL}/next-ref/voucher?${params}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(r => r.json())
      .then(d => { if (d.nextNumber) setEditNextVoucherNumber(d.nextNumber); })
      .catch(() => {});
  }, [isEditing, editVoucherCompanyCode, editVoucherType, editVoucherYear]);

  const fetchTruckingRecordForBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        // If voucher has linked trucking record IDs, use those; otherwise use first
        const linkedIds = (displayVoucher as any)?.linkedTruckingRecordIds;
        let relevantRecords = result.data;
        if (Array.isArray(linkedIds) && linkedIds.length > 0) {
          relevantRecords = result.data.filter((r: any) => linkedIds.includes(r.id));
        }
        const truckingRecord = relevantRecords[0] || result.data[0];
        // Extract delivery addresses — join all address strings
        const addresses = (truckingRecord.deliveryAddresses || [])
          .map((a: any) => a.address)
          .filter(Boolean);
        const deliveryAddress = addresses.join("; ");
        // Extract loading address from export trucking record
        const loadingAddress = truckingRecord.truckingAddress || "";
        const truckingRate = truckingRecord.truckingRate || "";
        setTruckingRecordData({ deliveryAddress, loadingAddress, truckingRate });
        // If no saved addresses on the voucher, fall back to trucking record data
        if (!manualDeliveryAddress) setManualDeliveryAddress(deliveryAddress);
        if (!manualLoadingAddress) setManualLoadingAddress(loadingAddress);
      } else {
        setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
      }
    } catch (error) {
      console.error("Error fetching trucking record for booking:", error);
    }
  };

  const fetchVoucherDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vouchers/${voucherId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        const v = result.data;
        
        // Ensure all line items have stable IDs
        if (v.lineItems) {
            v.lineItems = v.lineItems.map((item: LineItem) => ({
                ...item,
                id: item.id || `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }));
        }

        setVoucher(v);
        setEditedVoucher(v);

        // Initialize editable address fields from voucher data
        setManualDeliveryAddress(v.deliveryAddress || "");
        setManualLoadingAddress(v.loadingAddress || "");

        // Split line items
        if (v.lineItems) {
            setParticulars(v.lineItems.filter((i: LineItem) => !i.type || i.type === 'particulars'));
            setDistribution(v.lineItems.filter((i: LineItem) => i.type === 'distribution'));
        }
      } else {
        toast.error("Failed to load voucher details");
      }
    } catch (error) {
      console.error("Error fetching voucher:", error);
      toast.error("Failed to load voucher details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedVoucher(voucher);
    if (voucher?.lineItems) {
        setParticulars(voucher.lineItems.filter((i: LineItem) => !i.type || i.type === 'particulars'));
        setDistribution(voucher.lineItems.filter((i: LineItem) => i.type === 'distribution'));
    }
  };

  const handleDeleteVoucher = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vouchers/${voucherId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to delete voucher");
        setShowDeleteConfirm(false);
        return;
      }

      toast.success("Voucher deleted successfully");
      setShowDeleteConfirm(false);
      onBack();
    } catch (error) {
      console.error("Error deleting voucher:", error);
      toast.error("An error occurred while deleting the voucher");
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    if (!editedVoucher) return;

    try {
      // Combine line items
      const combinedLineItems = [
          ...particulars.map(p => ({ ...p, type: 'particulars' as const })),
          ...distribution.map(d => ({ ...d, type: 'distribution' as const }))
      ];
      
      // Compose voucherNumber from dropdown fields
      const composedVoucherNumber = `${editVoucherCompanyCode} ${editVoucherType} ${editVoucherYear}-${editVoucherRefNumber || (editNextVoucherNumber !== null ? String(editNextVoucherNumber) : "")}`;

      const payload = {
          ...editedVoucher,
          voucherNumber: composedVoucherNumber,
          amount: calculateTotal(),
          lineItems: combinedLineItems,
          deliveryAddress: manualDeliveryAddress,
          loadingAddress: manualLoadingAddress,
      };

      const response = await fetch(`${API_BASE_URL}/vouchers/${voucherId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update voucher");
      }

      const result = await response.json();
      if (result.success && result.data) {
        toast.success("Voucher updated successfully");
        setVoucher(result.data);
        setEditedVoucher(result.data);
        setIsEditing(false);

      } else {
        toast.error("Failed to update voucher");
      }
    } catch (error) {
      console.error("Error updating voucher:", error);
      toast.error("Failed to update voucher");
    }
  };

  const handleStatusChange = async (newStatus: VoucherStatus) => {
    if (!voucher) return;
    try {
      const response = await fetch(`${API_BASE_URL}/vouchers/${voucherId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const result = await response.json();
      if (result.success && result.data) {
        setVoucher(result.data);
        setEditedVoucher(result.data);

        toast.success(`Status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  // --- Line Item Helpers ---
  const calculateTotal = () => {
    const partTotal = particulars.reduce((sum, item) => sum + (item.amount || 0), 0);
    const distTotal = distribution.reduce((sum, item) => sum + (item.amount || 0), 0);
    return partTotal + distTotal;
  };

  const handleAddItem = (type: 'particulars' | 'distribution') => {
    const newItem: LineItem = { id: Date.now().toString() + Math.random(), description: "", amount: 0, type };
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

  const handleUpdateItem = (type: 'particulars' | 'distribution', id: string, field: keyof LineItem, value: any) => {
    const updater = (items: LineItem[]) => items.map(item => {
      if (item.id === id) return { ...item, [field]: value };
      return item;
    });
    if (type === 'particulars') setParticulars(updater(particulars));
    else setDistribution(updater(distribution));
  };
  
  const handleSopUpdate = (id: string, field: 'sopType' | 'sopNumber', value: string) => {
    setParticulars(prev => prev.map(item => {
        if (item.id === id) {
            const newType = field === 'sopType' ? value : (item.sopType || item.defaultSop || "SOP (MICP)");
            const newNumber = field === 'sopNumber' ? value : (item.sopNumber || "");
            const newDesc = newNumber ? `${newType} ${newNumber}` : newType;
            return { ...item, sopType: newType, sopNumber: newNumber, description: newDesc };
        }
        return item;
    }));
  };

  // Determine if the voucher's category requires booking fields
  const currentCategory = isEditing ? (editedVoucher?.category || voucher?.category) : voucher?.category;
  const isBookingCategory = currentCategory === "Shipping Line" || currentCategory === "Trucking";

  // Use editedVoucher for display when editing, otherwise use saved voucher
  const displayVoucher = isEditing ? editedVoucher : voucher;

  // Determine Labels based on Import/Export
  const isExport = (displayVoucher?.booking?.shipmentType || displayVoucher?.booking?.type || displayVoucher?.booking?.booking_type || "")
    .toLowerCase().includes("export");
  
  const shipperLabel = isExport ? "Shipper" : "Consignee";
  const shipperValue = isExport ? displayVoucher?.shipper : displayVoucher?.consignee;
  
  const originLabel = isExport ? "Destination" : "Origin";
  const originValue = isExport ? displayVoucher?.destination : displayVoucher?.origin;

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#667085", fontSize: "14px" }}>Loading voucher details...</div>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#667085", fontSize: "14px" }}>Voucher not found</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid var(--neuron-ui-border)", padding: "20px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              {isEditing ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", color: "#667085", fontWeight: 500 }}>Ref:</span>
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                      {editVoucherCompanyCode} {editVoucherType} {editVoucherYear}-{editVoucherRefNumber || (editNextVoucherNumber !== null ? editNextVoucherNumber : "")}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", width: "420px" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Company</span>
                      <NeuronDropdown
                        value={editVoucherCompanyCode}
                        onChange={setEditVoucherCompanyCode}
                        options={["SCI", "RDS", "RVS", "SW"]}
                        placeholder="Code"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Type</span>
                      <NeuronDropdown
                        value={editVoucherType}
                        onChange={setEditVoucherType}
                        options={["ADV", "CV"]}
                        placeholder="Type"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Year</span>
                      <input
                        value={editVoucherYear}
                        onChange={e => setEditVoucherYear(e.target.value.replace(/\D/g, ""))}
                        style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none" }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Number</span>
                      <input
                        value={editVoucherRefNumber}
                        onChange={e => setEditVoucherRefNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder={editNextVoucherNumber !== null ? String(editNextVoucherNumber) : "…"}
                        style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none" }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--neuron-ink-primary)", marginBottom: "0" }}>
                  {voucher.voucherNumber}
                </h1>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <HeaderStatusDropdown
              currentStatus={voucher.status}
              statusOptions={VOUCHER_STATUSES}
              statusColorMap={VOUCHER_STATUS_COLORS}
              onStatusChange={(s) => handleStatusChange(s as any)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        padding: "0 48px",
        borderBottom: "1px solid #E5E9F0",
        backgroundColor: "white"
      }}>
        <StandardTabs
          tabs={[
            { id: "voucher-info", label: "Voucher Information", icon: <FileText size={18} /> },
            { id: "attachments", label: "Attachments", icon: <Paperclip size={18} /> },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as "voucher-info" | "attachments")}
          actions={
            <TabRowActions
              showTimeline={showTimeline}
              onToggleTimeline={() => setShowTimeline(!showTimeline)}
              editLabel={activeTab === "voucher-info" ? "Edit Voucher" : null}
              onEdit={() => setIsEditing(true)}
              isEditing={isEditing}
              onCancel={handleCancel}
              onSave={handleSave}
              isSaving={false}
              saveLabel="Save Changes"
              onDelete={() => setShowDeleteConfirm(true)}
              onDownloadPDF={() => toast.success("PDF download starting...")}
              onDownloadWord={() => toast.success("Word download starting...")}
            />
          }
        />
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: activeTab === "voucher-info" ? undefined : "none", padding: "32px 48px" }}>
        <div className="flex flex-col gap-6">
          
          {/* Booking Details (read-only summary card) — only for Shipping Line / Trucking */}
          {isBookingCategory && (
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
                {/* BookingSelector — only in edit mode */}
                {isEditing && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "6px" }}>Link to Booking</div>
                    <BookingSelector
                      value={editedVoucher?.bookingId || ""}
                      onSelect={(booking) => {
                        if (!booking) {
                          setEditedVoucher(prev => prev ? ({
                            ...prev,
                            bookingId: undefined,
                            booking: undefined,
                            vesselVoy: "",
                            blNumber: "",
                            origin: "",
                            destination: "",
                            shipper: "",
                            consignee: "",
                            volume: "",
                            commodity: "",
                            containerNumbers: [],
                          }) : null);
                          return;
                        }
                        const bk = booking as any;
                        const uid = bk.bookingId || bk.bookingNumber || bk.booking_number || booking.id;
                        // Parse container numbers
                        let containers: string[] = [];
                        if (bk.containerNumbers) {
                          containers = Array.isArray(bk.containerNumbers) ? bk.containerNumbers : bk.containerNumbers.split(",").map((c: string) => c.trim()).filter(Boolean);
                        } else if (bk.containerNo) {
                          containers = bk.containerNo.includes(",") ? bk.containerNo.split(",").map((c: string) => c.trim()).filter(Boolean) : [bk.containerNo];
                        }
                        // Destination logic
                        let dest = bk.destination || bk.dropoff || "";
                        if (bk.shipmentType?.toLowerCase() === "import") {
                          dest = bk.pod || bk.port_of_destination || dest;
                        }
                        setEditedVoucher(prev => prev ? ({
                          ...prev,
                          bookingId: uid,
                          booking: bk,
                          vesselVoy: bk.vesselVoyage || bk.vessel_voyage || bk.vessel || "",
                          blNumber: bk.blNumber || bk.bl_number || bk.awbBlNo || "",
                          origin: bk.origin || bk.pol || bk.pickup || "",
                          destination: dest,
                          shipper: bk.shipper || "",
                          consignee: bk.consignee || "",
                          volume: bk.volume || "",
                          commodity: bk.commodity || "",
                          containerNumbers: containers,
                        }) : null);
                      }}
                      placeholder="Search by Booking Ref, BL No, or Client..."
                    />
                    {editedVoucher?.bookingId && (
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
                          marginTop: "8px",
                        }}
                      >
                        <Link2 size={14} />
                        Booking linked — fields auto-filled
                      </div>
                    )}
                  </div>
                )}

                {/* Read-only summary fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {/* Row 1: Linked Booking | Linked Expense */}
                    {!isEditing && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                          Linked Booking
                        </div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                          {displayVoucher?.booking?.bookingId || displayVoucher?.bookingId || "—"}
                        </div>
                      </div>
                    )}
                    {/* Row 2: Shipper/Consignee | Vessel / Voyage */}
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                        {shipperLabel}
                      </div>
                      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                        {shipperValue || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{displayVoucher?.vesselVoy || "—"}</div>
                    </div>
                    {/* Row 3: BL Number (non-Trucking) | Origin/Destination */}
                    {currentCategory !== "Trucking" && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>BL Number</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{displayVoucher?.blNumber || "—"}</div>
                      </div>
                    )}
                    {/* Hide Destination for trucking vouchers linked to export bookings */}
                    {!(currentCategory === "Trucking" && isExport) && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                          {originLabel}
                        </div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                          {originValue || "—"}
                        </div>
                      </div>
                    )}
                    {/* Row 4: Volume | Container No */}
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Volume</div>
                      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{computeVolumeSummary(displayVoucher?.containerNumbers || [], displayVoucher?.volume || "")}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                        {(displayVoucher?.containerNumbers || []).filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>
                    {/* Row 5: Commodity | Trucking Rate (Trucking only) */}
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{displayVoucher?.commodity || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Delivery Address (Import) or Loading Address (Export) & Trucking Rate — editable fields outside the box */}
                {currentCategory === "Trucking" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: 500, color: "#667085", display: "block", marginBottom: "4px" }}>
                        {isExport ? "Loading Address" : "Delivery Address"}
                      </label>
                      <input
                        type="text"
                        value={isExport ? manualLoadingAddress : manualDeliveryAddress}
                        onChange={(e) => isExport ? setManualLoadingAddress(e.target.value) : setManualDeliveryAddress(e.target.value)}
                        placeholder={isExport ? "Enter loading address..." : "Enter delivery address..."}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          fontSize: "14px",
                          border: "1px solid #E5E9F0",
                          borderRadius: "8px",
                          backgroundColor: "#FFFFFF",
                          color: "#0A1D4D",
                          outline: "none",
                          boxSizing: "border-box" as const,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: 500, color: "#667085", display: "block", marginBottom: "4px" }}>
                        Trucking Rate
                      </label>
                      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500, padding: "10px 14px", border: "1px solid #E5E9F0", borderRadius: "8px", backgroundColor: "#FAFBFC" }}>
                        {truckingRecordData.truckingRate || displayVoucher?.booking?.rate || displayVoucher?.booking?.truckingRates || "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* General Information */}
          <div className="bg-white rounded-xl border border-[#E5E9F0] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5E9F0] bg-[#F9FAFB]">
              <h3 className="text-base font-semibold text-[#0A1D4D] m-0">General Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                 {/* Row 1: Payee & Category */}
                 {isEditing ? (
                   <div>
                     <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                       Payee
                     </label>
                     <PayeeSelector
                       value={editedVoucher?.payee || ""}
                       onSelect={val => setEditedVoucher(prev => prev ? ({...prev, payee: val}) : null)}
                       placeholder="Select payee..."
                       useInlineStyles
                     />
                   </div>
                 ) : (
                   <Field label="Payee" value={voucher.payee || ""} />
                 )}
                 
                 {isEditing ? (
                   <div>
                     <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                       Category
                     </label>
                     <div className="relative">
                       <select
                         value={editedVoucher?.category || ""}
                         onChange={(e) => setEditedVoucher(prev => prev ? ({...prev, category: e.target.value}) : null)}
                         className="w-full h-[42px] px-3 rounded-md border border-[#E5E9F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent text-[#0A1D4D]"
                       >
                         <option value="" disabled>Select Category</option>
                         <optgroup label="Booking Costing">
                           <option value="Shipping Line">Shipping Line</option>
                           <option value="Trucking">Trucking</option>
                         </optgroup>
                         <optgroup label="General Expenses">
                           <option value="Annual Expenses">Annual Expenses</option>
                           <option value="Expenses">Expenses</option>
                           <option value="Transportation">Transportation</option>
                           <option value="Salary">Salary</option>
                           <option value="Benefits">Benefits</option>
                           <option value="Utilities">Utilities</option>
                         </optgroup>
                       </select>
                       <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-500 pointer-events-none" />
                     </div>
                   </div>
                 ) : (
                   <EditableField 
                      label="Category" 
                      value={voucher.category || ""} 
                      onChange={() => {}}
                      isEditing={false}
                   />
                 )}

                 {/* Row 2: Bank & Check No */}
                 <EditableField 
                    label="Bank" 
                    value={isEditing ? (editedVoucher?.bank || "") : (voucher.bank || "")} 
                    onChange={val => setEditedVoucher(prev => prev ? ({...prev, bank: val}) : null)}
                    isEditing={isEditing}
                 />
                 <EditableField 
                    label="Check No." 
                    value={isEditing ? (editedVoucher?.checkNo || "") : (voucher.checkNo || "")} 
                    onChange={val => setEditedVoucher(prev => prev ? ({...prev, checkNo: val}) : null)}
                    isEditing={isEditing}
                 />

                 {/* Row 3: Date */}
                 {isEditing ? (
                   <div>
                     <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                       Date
                     </label>
                     <SingleDateInput
                       value={editedVoucher?.voucherDate || ""}
                       onChange={(iso) => setEditedVoucher(prev => prev ? ({...prev, voucherDate: iso}) : null)}
                       placeholder="MM/DD/YYYY"
                     />
                   </div>
                 ) : (
                   <Field label="Date" value={voucher.voucherDate ? formatDate(voucher.voucherDate) : "—"} />
                 )}
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div>
              <TableSection 
                  title="Voucher Entries" 
                  items={particulars} 
                  type="particulars" 
                  isEditing={isEditing}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItem={handleUpdateItem}
                  onSopUpdate={handleSopUpdate}
              />
              <TableSection 
                  title="Distribution of Account" 
                  items={distribution} 
                  type="distribution" 
                  isEditing={isEditing}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItem={handleUpdateItem}
                  onSopUpdate={handleSopUpdate}
              />
          </div>

          {/* Notes Section */}
          <NotesSection
            value={(isEditing && editedVoucher ? editedVoucher : voucher)?.notes || ""}
            onChange={(val) => editedVoucher && setEditedVoucher({ ...editedVoucher, notes: val } as any)}
            disabled={!isEditing}
          />


        </div>
      </div>

        <div style={{ display: activeTab === "attachments" ? undefined : "none" }}>
          {voucher && (
            <AttachmentsTab
              entityType="voucher"
              entityId={voucherId}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl p-8 max-w-[480px] w-[90%] border border-[#E5E9F0]">
            <h3 className="text-lg font-semibold text-[#0A1D4D] mb-3">Delete Voucher</h3>
            <p className="text-sm text-[#667085] mb-6 leading-relaxed">
              Are you sure you want to delete this voucher ({voucher.voucherNumber})? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <StandardButton variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</StandardButton>
              <StandardButton variant="danger" onClick={handleDeleteVoucher}>Delete Voucher</StandardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}