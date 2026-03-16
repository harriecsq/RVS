import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Trash2, Edit3, Plus, ChevronDown, Link2, FileText, Paperclip } from "lucide-react";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { StandardButton } from "../design-system";
import { StandardTabs } from "../design-system/StandardTabs";
import { ActionsDropdown } from "../shared/ActionsDropdown";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { ApprovalSignoffSection } from "../shared/ApprovalSignoffSection";
import { NotesSection } from "../shared/NotesSection";
import { Input } from "../ui/input";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { BookingSelector } from "../selectors/BookingSelector";
import { PayeeSelector } from "../selectors/PayeeSelector";
import { formatAmount } from "../../utils/formatAmount";

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
          <h3 className="text-sm font-semibold text-[#12332B]">{title}</h3>
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
                                                  onChange={(e) => onSopUpdate(item.id, 'sopNumber', e.target.value)}
                                                  className="h-9 border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B] text-center"
                                                  placeholder="#"
                                                  title="Section Number"
                                              />
                                          </div>
                                      </div>
                                  ) : (
                                      <Input
                                          value={item.description || ""}
                                          onChange={(e) => onUpdateItem(type, item.id, 'description', e.target.value)}
                                          className="h-9 border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B]"
                                          placeholder="Enter description"
                                      />
                                  )
                              ) : (
                                  <div className="h-9 flex items-center text-sm text-[#12332B] px-2">{item.description}</div>
                              )}
                          </td>
                          <td className="p-2">
                              {isEditing ? (
                                  <Input
                                      type="number"
                                      value={item.amount || ""}
                                      onChange={(e) => onUpdateItem(type, item.id, 'amount', parseFloat(e.target.value) || 0)}
                                      className="h-9 text-right border-transparent hover:border-[#E5E9F0] focus:border-[#0F766E] bg-transparent text-[#12332B]"
                                      placeholder="0.00"
                                  />
                              ) : (
                                  <div className="h-9 flex items-center justify-end text-sm text-[#12332B] px-2">
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"voucher-info" | "attachments">("voucher-info");

  // Line Items State
  const [particulars, setParticulars] = useState<LineItem[]>([]);
  const [distribution, setDistribution] = useState<LineItem[]>([]);
  const [linkedExpenseNumbers, setLinkedExpenseNumbers] = useState<string[]>([]);
  const [truckingRecordData, setTruckingRecordData] = useState<{ deliveryAddress: string; loadingAddress: string; truckingRate: string }>({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

  useEffect(() => {
    fetchVoucherDetails();
  }, [voucherId]);

  // Fetch linked expenses for the booking whenever voucher loads/changes
  useEffect(() => {
    const bookingIdToUse = voucher?.booking?.bookingId || voucher?.bookingId;
    if (bookingIdToUse) {
      fetchLinkedExpenses(bookingIdToUse);
    } else {
      setLinkedExpenseNumbers([]);
    }
  }, [voucher?.bookingId, voucher?.booking?.bookingId]);

  const fetchLinkedExpenses = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/expenses?bookingId=${bookingId}`, {
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

  const fetchTruckingRecordForBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/trucking-records?linkedBookingId=${bookingId}`, {
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

  const fetchVoucherDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/vouchers/${voucherId}`, {
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
    setShowStatusDropdown(false);
    if (voucher?.lineItems) {
        setParticulars(voucher.lineItems.filter((i: LineItem) => !i.type || i.type === 'particulars'));
        setDistribution(voucher.lineItems.filter((i: LineItem) => i.type === 'distribution'));
    }
  };

  const handleDeleteVoucher = async () => {
    try {
      const response = await fetch(`${API_URL}/vouchers/${voucherId}`, {
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
      
      const payload = {
          ...editedVoucher,
          amount: calculateTotal(),
          lineItems: combinedLineItems
      };

      const response = await fetch(`${API_URL}/vouchers/${voucherId}`, {
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
        setShowStatusDropdown(false);
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
      const response = await fetch(`${API_URL}/vouchers/${voucherId}`, {
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
        setShowStatusDropdown(false);
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
              <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--neuron-ink-primary)", marginBottom: "0" }}>
                {voucher.voucherNumber}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!isEditing && (
              <>
                <StandardButton variant={showTimeline ? "secondary" : "outline"} onClick={() => setShowTimeline(!showTimeline)} icon={<Clock size={16} />}>Activity</StandardButton>
                <StandardButton variant="outline" icon={<Edit3 size={16} />} onClick={() => setIsEditing(true)}>Edit Voucher</StandardButton>
                <ActionsDropdown onDownloadPDF={() => toast.success("PDF download starting...")} onDownloadWord={() => toast.success("Word download starting...")} onDelete={() => setShowDeleteConfirm(true)} />
              </>
            )}
            {isEditing && (
              <>
                <StandardButton variant="secondary" onClick={handleCancel}>Cancel</StandardButton>
                <StandardButton variant="primary" onClick={handleSave}>Save Changes</StandardButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Bar */}
      <div style={{
        background: voucher.status === "Draft" ? "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)" :
                   voucher.status === "For Approval" ? "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)" :
                   voucher.status === "Approved" ? "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)" :
                   voucher.status === "Paid" ? "linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)" :
                   "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)",
        borderBottom: "1.5px solid #0F766E",
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        gap: "32px",
        flexShrink: 0
      }}>
        {/* Status Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Status</div>
          <div
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="cursor-pointer flex items-center gap-2"
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#12332B"
            }}
          >
            {voucher.status}
            <ChevronDown size={14} className="text-[#0F766E]" />
          </div>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] overflow-hidden">
               {(["Draft", "For Approval", "Approved", "Paid", "Cancelled"] as VoucherStatus[]).map((status) => (
                 <div
                   key={status}
                   onClick={() => handleStatusChange(status)}
                   className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
                 >
                   {status}
                 </div>
               ))}
            </div>
          )}
        </div>
        <div className="w-[1px] h-10 bg-[#0F766E] opacity-20" />
        <div>
          <div className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wide mb-[2px]">Payee</div>
          <div className="text-sm font-semibold text-[#12332B]">{voucher.payee || "—"}</div>
        </div>
        <div className="w-[1px] h-10 bg-[#0F766E] opacity-20" />
        <div>
          <div className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wide mb-[2px]">Total Amount</div>
          <div className="text-xl font-bold text-[#12332B]">₱{formatAmount(calculateTotal())}</div>
        </div>
        <div className="w-[1px] h-10 bg-[#0F766E] opacity-20" />
        <div>
          <div className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wide mb-[2px]">Voucher Date</div>
          <div className="text-sm font-semibold text-[#12332B]">{formatDate(isEditing ? (editedVoucher?.voucherDate || voucher.voucherDate) : voucher.voucherDate)}</div>
        </div>
        <div className="w-[1px] h-10 bg-[#0F766E] opacity-20" />
        <div>
          <div className="text-[11px] font-semibold text-[#0F766E] uppercase tracking-wide mb-[2px]">Created Date</div>
          <div className="text-sm font-semibold text-[#12332B]">{formatDate(voucher.created_at)}</div>
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
        />
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "voucher-info" && (
        <div style={{ padding: "32px 48px" }}>
        <div className="flex flex-col gap-6">
          
          {/* Booking Details (read-only summary card) — only for Shipping Line / Trucking */}
          {isBookingCategory && (
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
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                          {displayVoucher?.booking?.bookingId || displayVoucher?.bookingId || "—"}
                        </div>
                      </div>
                    )}
                    {!isEditing && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                          Linked Expense
                        </div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                          {linkedExpenseNumbers.length > 0 ? linkedExpenseNumbers.join(", ") : "—"}
                        </div>
                      </div>
                    )}
                    {/* Row 2: Shipper/Consignee | Vessel / Voyage */}
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                        {shipperLabel}
                      </div>
                      <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                        {shipperValue || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                      <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{displayVoucher?.vesselVoy || "—"}</div>
                    </div>
                    {/* Row 3: BL Number (non-Trucking) or Delivery Address (Trucking) | Origin/Destination */}
                    {currentCategory === "Trucking" ? (
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                          {isExport ? "Loading Address" : "Delivery Address"}
                        </div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                          {isExport
                            ? (truckingRecordData.loadingAddress || displayVoucher?.booking?.loadingAddress || displayVoucher?.booking?.origin || "—")
                            : (truckingRecordData.deliveryAddress || displayVoucher?.booking?.deliveryAddress || displayVoucher?.booking?.pod || displayVoucher?.booking?.portOfDestination || "—")}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>BL Number</div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{displayVoucher?.blNumber || "—"}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                        {originLabel}
                      </div>
                      <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                        {originValue || "—"}
                      </div>
                    </div>
                    {/* Row 4: Volume | Container No */}
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Volume</div>
                      <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{computeVolumeSummary(displayVoucher?.containerNumbers || [], displayVoucher?.volume || "")}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                      <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                        {(displayVoucher?.containerNumbers || []).filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>
                    {/* Row 5: Commodity | Trucking Rate (Trucking only) */}
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                      <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{displayVoucher?.commodity || "—"}</div>
                    </div>
                    {currentCategory === "Trucking" && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Trucking Rate</div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{truckingRecordData.truckingRate || displayVoucher?.booking?.rate || displayVoucher?.booking?.truckingRates || "—"}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General Information */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <h3 className="text-base font-semibold text-[#12332B] m-0">General Information</h3>
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
                         className="w-full h-[42px] px-3 rounded-md border border-[#E5E9F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent text-[#12332B]"
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

                 {/* Row 3: Voucher Date */}
                 {isEditing ? (
                   <div>
                     <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                       Voucher Date
                     </label>
                     <SingleDateInput
                       value={editedVoucher?.voucherDate || ""}
                       onChange={(iso) => setEditedVoucher(prev => prev ? ({...prev, voucherDate: iso}) : null)}
                       placeholder="MM/DD/YYYY"
                     />
                   </div>
                 ) : (
                   <Field label="Voucher Date" value={voucher.voucherDate ? formatDate(voucher.voucherDate) : "—"} />
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

          {/* Approval / Sign-off Section */}
          <ApprovalSignoffSection
            preparedBy={(isEditing && editedVoucher ? editedVoucher : voucher)?.preparedBy || ""}
            checkedBy={(isEditing && editedVoucher ? editedVoucher : voucher)?.checkedBy || ""}
            approvedBy={(isEditing && editedVoucher ? editedVoucher : voucher)?.approvedBy || ""}
            onPreparedByChange={(val) => editedVoucher && setEditedVoucher({ ...editedVoucher, preparedBy: val } as any)}
            onCheckedByChange={(val) => editedVoucher && setEditedVoucher({ ...editedVoucher, checkedBy: val } as any)}
            onApprovedByChange={(val) => editedVoucher && setEditedVoucher({ ...editedVoucher, approvedBy: val } as any)}
            disabled={!isEditing}
          />

        </div>
      </div>
        )}

        {activeTab === "attachments" && voucher && (
          <AttachmentsTab
            entityType="voucher"
            entityId={voucherId}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl p-8 max-w-[480px] w-[90%] border border-[#E5E7EB]">
            <h3 className="text-lg font-semibold text-[#12332B] mb-3">Delete Voucher</h3>
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