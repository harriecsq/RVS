import { useState, useEffect } from "react";
import { ArrowLeft, FileText, DollarSign, Receipt, Edit2, Save, XCircle, ChevronDown, Clock, Edit3, X, Plus, Trash2, Link2 } from "lucide-react";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { CreateCollectionPanel } from "./CreateCollectionPanel";
import { CollectionDetailPanel } from "./CollectionDetailPanel";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { StandardTabs, StandardButton } from "../design-system";
import { NEURON_STYLES, NEURON_COLORS, NEURON_SPACING, NEURON_TYPOGRAPHY, NEURON_BORDERS, createHoverHandlers } from "../design-system/neuron-design-tokens";
import { ActionsDropdown } from "../shared/ActionsDropdown";
import { formatAmount } from "../../utils/formatAmount";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { BookingSelector } from "../selectors/BookingSelector";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { Paperclip } from "lucide-react";
import { API_BASE_URL } from '@/utils/api-config';


interface ViewBillingScreenProps {
  billingId: string;
  onBack?: () => void;
  /** When true, hides header/back button, metadata bar, and tab navigation. Renders overview content only. */
  embedded?: boolean;
}

type BillingStatus = "Draft" | "For Approval" | "Approved" | "Completed" | "Partially Collected" | "Cancelled";

interface BillingParticular {
  id: string;
  particulars: string; // Updated from 'description' to match CreateBillingModal
  volumeType: "40" | "BL";
  volumeQty: number;
  unitCost: number;
  total: number; // calculated: volumeQty * unitCost
  exchangeRate: number | null;
  applyExchangeRate?: boolean; // Whether to apply the billing-level exchange rate
  amount: number; // final PHP amount
}

interface Billing {
  id: string;
  billingNumber: string;
  voucherId?: string;
  voucherNumber?: string;
  clientId?: string;
  clientName: string;
  companyName?: string; // NEW
  expenseAmount?: number;
  particulars: BillingParticular[];
  margin?: number;
  totalAmount: number;
  pendingAmount?: number;
  totalExpenses?: number; // NEW
  currency: string;
  status: BillingStatus;
  billingDate: string;
  created_at: string;
  updated_at?: string;
  // Project & Relationships
  projectId?: string;
  projectNumber?: string; // NEW
  projectName?: string;
  bookingIds?: string[]; // NEW - array of booking IDs
  expenseIds?: string[]; // NEW - array of expense IDs
  // Shipment Details
  vessel?: string; // NEW
  blNumber?: string; // NEW
  containerNumbers?: string[]; // NEW
  destination?: string; // NEW
  origin?: string; // NEW
  shipper?: string; // NEW
  consignee?: string; // NEW
  volume?: string; // NEW
  commodity?: string; // NEW
  contractNumber?: string; // NEW
  exchangeRate?: string; // NEW - overall exchange rate
}

interface Collection {
  id: string;
  collectionNumber: string;
  customerName: string;
  billingNumber?: string;
  projectNumber?: string;
  amount: number;
  collectionDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  bankName?: string;
  checkNumber?: string;
  status: string;
  created_at: string;
  createdAt: string;
}

interface Booking {
  id: string;
  bookingId?: string;
  bookingNumber?: string;
  booking_number?: string;
  trackingNo?: string;
  customerName?: string;
  companyName?: string;
  company_name?: string;
  clientName?: string;
  client_name?: string;
  customer_name?: string;
  shipper?: string;
  deliveryType?: "Import" | "Export" | "Domestic";
  shipmentType?: string;
  origin?: string;
  pol?: string;
  pickup?: string;
}

interface Expense {
  id: string;
  expenseNumber: string;
  category?: string;
  vendor?: string;
  amount: number;
}

export function ViewBillingScreen({ billingId, onBack, embedded = false }: ViewBillingScreenProps) {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "collections" | "attachments">("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Edited state for all editable fields
  const [editedParticulars, setEditedParticulars] = useState<BillingParticular[]>([]);
  const [editedMargin, setEditedMargin] = useState(0);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [editedStatus, setEditedStatus] = useState<BillingStatus>("Draft");
  const [showTimeline, setShowTimeline] = useState(false);
  
  // General Information fields
  const [editedClientName, setEditedClientName] = useState("");
  const [editedCompanyName, setEditedCompanyName] = useState("");
  const [editedVoucherNumber, setEditedVoucherNumber] = useState("");
  const [editedExpenseAmount, setEditedExpenseAmount] = useState(0);
  const [editedBillingDate, setEditedBillingDate] = useState("");
  const [billingDateInputValue, setBillingDateInputValue] = useState(""); // For user typing
  
  // Relationship IDs (for managing linked bookings/expenses) - Using Set for cleaner operations
  const [editedBookingIds, setEditedBookingIds] = useState<Set<string>>(new Set());
  const [editedExpenseIds, setEditedExpenseIds] = useState<Set<string>>(new Set());
  
  // Shipment Details fields
  const [editedVessel, setEditedVessel] = useState("");
  const [editedBlNumber, setEditedBlNumber] = useState("");
  const [editedDestination, setEditedDestination] = useState("");
  const [editedOrigin, setEditedOrigin] = useState("");
  const [editedShipper, setEditedShipper] = useState("");
  const [editedConsignee, setEditedConsignee] = useState("");
  const [editedVolume, setEditedVolume] = useState("");
  const [editedCommodity, setEditedCommodity] = useState("");
  const [editedContractNumber, setEditedContractNumber] = useState("");
  const [editedExchangeRate, setEditedExchangeRate] = useState("");
  const [editedContainerNumbers, setEditedContainerNumbers] = useState<string[]>([]);
  
  // Notes field
  const [editedNotes, setEditedNotes] = useState("");
  
  // Approval / Sign-off fields
  const [editedPreparedBy, setEditedPreparedBy] = useState("");
  const [editedCheckedBy, setEditedCheckedBy] = useState("");
  const [editedApprovedBy, setEditedApprovedBy] = useState("");
  
  // NEW: State for fetched bookings and expenses
  const [linkedBookings, setLinkedBookings] = useState<Booking[]>([]);
  const [linkedExpenses, setLinkedExpenses] = useState<Expense[]>([]);
  const [isLoadingRelatedData, setIsLoadingRelatedData] = useState(false);
  
  // Project state (for filtering bookings by project)
  const [currentProjectId, setCurrentProjectId] = useState<string>("");

  /** Compute volume summary from containers: "2x40HC" */
  const computeVolumeSummary = (containerNo: string | string[], vol: string): string => {
    if (!containerNo && !vol) return "—";
    let containerCount = 1;
    if (containerNo) {
      const containers = Array.isArray(containerNo)
        ? containerNo.filter(Boolean)
        : containerNo.split(',').map((s: string) => s.trim()).filter(Boolean);
      containerCount = Math.max(containers.length, 1);
    }
    if (!vol) return "—";
    return `${containerCount}x${vol}`;
  };

  const [projects, setProjects] = useState<any[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  // Dropdown state for adding bookings/expenses (inline, not modal)
  const [showBookingDropdown, setShowBookingDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");

  // Helper to format booking display name as "Company Name - Client Name"
  const getBookingDisplayName = (booking: Booking): string => {
    const companyName = booking.companyName || booking.company_name || "";
    const clientName = booking.clientName || booking.client_name || booking.customerName || booking.customer_name || booking.shipper || "";
    
    if (companyName && clientName) {
      return `${companyName} - ${clientName}`;
    } else if (companyName) {
      return companyName;
    } else if (clientName) {
      return clientName;
    }
    return "";
  };

  // Determine shipment type from linked bookings
  const primaryBooking = linkedBookings.length > 0 ? linkedBookings[0] : null;
  const shipmentType = (primaryBooking as any)?.shipmentType?.toLowerCase() || (primaryBooking as any)?.deliveryType?.toLowerCase() || "";
  const isImport = shipmentType === "import";
  const isExport = shipmentType === "export";

  // Fallback Logic for Shipment Data:
  // Use billing data first, then fall back to the primary linked booking.
  const displayOrigin = billing?.origin || billing?.pol || billing?.pickup || (primaryBooking as any)?.origin || (primaryBooking as any)?.pol || (primaryBooking as any)?.pickup || "—";
  const displayConsignee = billing?.consignee || (primaryBooking as any)?.consignee || "—";


  useEffect(() => {
    fetchBillingDetails();
  }, [billingId]);

  useEffect(() => {
    if (billing) {
      // Initialize billing particulars
      setEditedParticulars(billing.particulars);
      setEditedMargin(billing.margin || 0);
      setEditedStatus(billing.status);
      
      // Initialize General Information fields
      setEditedClientName(billing.clientName || "");
      setEditedCompanyName(billing.companyName || "");
      setEditedVoucherNumber(billing.voucherNumber || "");
      setEditedExpenseAmount(billing.expenseAmount || 0);
      setEditedBillingDate(billing.billingDate || "");
      
      // Initialize billing date input value (MM/DD/YYYY format)
      if (billing.billingDate) {
        const date = new Date(billing.billingDate);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        setBillingDateInputValue(`${month}/${day}/${year}`);
      } else {
        setBillingDateInputValue("");
      }
      
      // Initialize Project ID
      setCurrentProjectId(billing.projectId || "");
      
      // Initialize Relationship IDs (convert arrays to Sets)
      setEditedBookingIds(new Set(billing.bookingIds || []));
      setEditedExpenseIds(new Set(billing.expenseIds || []));
      
      // Initialize Shipment Details fields
      setEditedVessel(billing.vessel || "");
      setEditedBlNumber(billing.blNumber || "");
      setEditedDestination(billing.destination || "");
      setEditedOrigin(billing.origin || billing.pol || billing.pickup || "");
      setEditedShipper(billing.shipper || "");
      setEditedConsignee(billing.consignee || "");
      setEditedVolume(billing.volume || "");
      setEditedCommodity(billing.commodity || "");
      setEditedContractNumber(billing.contractNumber || "");
      setEditedExchangeRate(billing.exchangeRate || "");
      setEditedContainerNumbers(billing.containerNumbers || []);
      setEditedNotes((billing as any).notes || "");
      setEditedPreparedBy((billing as any).preparedBy || "");
      setEditedCheckedBy((billing as any).checkedBy || "");
      setEditedApprovedBy((billing as any).approvedBy || "");
      
      // Fetch related bookings and expenses when billing data loads
      if (billing.bookingIds && billing.bookingIds.length > 0) {
        fetchLinkedBookings(billing.bookingIds);
      }
      if (billing.expenseIds && billing.expenseIds.length > 0) {
        fetchLinkedExpenses(billing.expenseIds);
      }
    }
  }, [billing]);

  // Fetch collections when billing is loaded or Collections tab is active
  useEffect(() => {
    if (billing) {
      fetchCollections();
    }
  }, [billing]);

  const fetchBillingDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/billings/${billingId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setBilling(result.data);
      } else {
        toast.error("Failed to load billing details");
      }
    } catch (error) {
      console.error("Error fetching billing:", error);
      toast.error("Failed to load billing details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const response = await fetch(`${API_BASE_URL}/collections?billingId=${billingId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setCollections(result.data);
      } else {
        toast.error("Failed to load collections");
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleViewCollection = (collection: Collection) => {
    setSelectedCollection(collection);
  };

  const handleBackFromCollection = () => {
    setSelectedCollection(null);
  };

  const fetchLinkedBookings = async (bookingIds: string[]) => {
    setIsLoadingRelatedData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings?ids=${bookingIds.join(",")}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setLinkedBookings(result.data);
      } else {
        toast.error("Failed to load linked bookings");
      }
    } catch (error) {
      console.error("Error fetching linked bookings:", error);
      toast.error("Failed to load linked bookings");
    } finally {
      setIsLoadingRelatedData(false);
    }
  };

  const fetchLinkedExpenses = async (expenseIds: string[]) => {
    setIsLoadingRelatedData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expenses?ids=${expenseIds.join(",")}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setLinkedExpenses(result.data);
      } else {
        toast.error("Failed to load linked expenses");
      }
    } catch (error) {
      console.error("Error fetching linked expenses:", error);
      toast.error("Failed to load linked expenses");
    } finally {
      setIsLoadingRelatedData(false);
    }
  };

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setProjects(result.data);
      } else {
        toast.error("Failed to load projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      // Fetch all bookings (global search)
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setAllBookings(result.data);
      } else {
        toast.error("Failed to load bookings");
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    }
  };

  const fetchAllExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        // Store ALL expenses (don't filter - we'll filter in the UI)
        setAllExpenses(result.data);
      } else {
        toast.error("Failed to load expenses");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
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

  const formatCurrency = (amount: number | undefined | null, currency: string = "PHP") => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `${currency} 0.00`;
    }
    return `${currency} ${formatAmount(amount)}`;
  };

  // Save function to persist all changes
  const handleSave = async () => {
    if (editedParticulars.length === 0) {
      toast.error("At least one particular/line item is required");
      return;
    }

    if (!editedClientName.trim()) {
      toast.error("Client name is required");
      return;
    }

    if (!editedBillingDate) {
      toast.error("Billing date is required");
      return;
    }

    // Validate numeric fields
    if (isNaN(editedMargin)) {
      toast.error("Margin must be a valid number");
      return;
    }

    // Validate billing particulars
    for (let i = 0; i < editedParticulars.length; i++) {
      const particular = editedParticulars[i];
      if (!particular.particulars || particular.particulars.trim() === "") {
        toast.error(`Line item ${i + 1}: Description is required`);
        return;
      }
      if (particular.volumeQty <= 0) {
        toast.error(`Line item ${i + 1}: Quantity must be greater than 0`);
        return;
      }
      if (particular.unitCost <= 0) {
        toast.error(`Line item ${i + 1}: Unit cost must be greater than 0`);
        return;
      }
    }

    setIsLoading(true);
    
    try {
      
      // Calculate total amount from particulars
      const totalAmount = editedParticulars.reduce((sum, p) => sum + p.amount, 0);
      
      // Calculate total expenses from linked expenses
      const totalExpenses = linkedExpenses
        .filter(exp => editedExpenseIds.has(exp.id))
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      // Prepare the update payload
      const updatePayload = {
        status: editedStatus,
        clientName: editedClientName,
        companyName: editedCompanyName,
        billingDate: editedBillingDate,
        particulars: editedParticulars,
        margin: editedMargin,
        totalAmount, // Include calculated total
        totalExpenses, // Include calculated total expenses
        currency: billing?.currency || "PHP", // Preserve original currency
        projectId: currentProjectId,
        bookingIds: Array.from(editedBookingIds), // Convert Set to Array
        expenseIds: Array.from(editedExpenseIds), // Convert Set to Array
        vessel: editedVessel,
        blNumber: editedBlNumber,
        destination: editedDestination,
        origin: editedOrigin,
        shipper: editedShipper,
        consignee: editedConsignee,
        volume: editedVolume,
        commodity: editedCommodity,
        contractNumber: editedContractNumber,
        exchangeRate: editedExchangeRate,
        containerNumbers: editedContainerNumbers,
        notes: editedNotes,
        preparedBy: editedPreparedBy,
        checkedBy: editedCheckedBy,
        approvedBy: editedApprovedBy,
      };

      const response = await fetch(`${API_BASE_URL}/billings/${billingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Billing updated successfully!");
        
        // Exit edit mode
        setIsEditing(false);
        
        // Refetch billing data to show updated values
        await fetchBillingDetails();
      } else {
        toast.error(result.error || "Failed to save billing");
      }
    } catch (error) {
      console.error("Error saving billing:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBilling = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billings/${billingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to delete billing");
        setShowDeleteConfirm(false);
        return;
      }

      toast.success("Billing deleted successfully");
      setShowDeleteConfirm(false);
      if (onBack) onBack(); // Go back to list view
    } catch (error) {
      console.error("Error deleting billing:", error);
      toast.error("An error occurred while deleting the billing");
      setShowDeleteConfirm(false);
    }
  };

  // Helper for Container Numbers
  const renderBillingContainerField = () => {
    // Determine current value
    const rawValue = isEditing 
        ? editedContainerNumbers 
        : billing?.containerNumbers;
    
    // Parse
    const containers: string[] = Array.isArray(rawValue) ? rawValue : (typeof rawValue === 'string' ? (rawValue as string).split(',').map(s => s.trim()).filter(Boolean) : []);

    const handleChange = (index: number, val: string) => {
        const newContainers = [...containers];
        newContainers[index] = val;
        setEditedContainerNumbers(newContainers);
    };

    const addRow = () => {
        setEditedContainerNumbers([...containers, ""]);
    };

    const removeRow = (index: number) => {
        const newContainers = containers.filter((_, i) => i !== index);
        setEditedContainerNumbers(newContainers);
    };

    if (!isEditing) {
        return (
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={NEURON_STYLES.fieldLabel}>Container Numbers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {containers.length > 0 ? containers.map((c, i) => (
                    <div key={i} style={NEURON_STYLES.readOnlyField}>
                      {c}
                    </div>
                )) : (
                    <div style={{...NEURON_STYLES.readOnlyField, color: '#9CA3AF'}}>—</div>
                )}
            </div>
          </div>
        );
    }

    // Edit mode
    const editableContainers = containers.length > 0 ? containers : [""];

    return (
        <div style={{ gridColumn: "1 / -1" }}>
            <div style={NEURON_STYLES.fieldLabel}>Container Numbers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {editableContainers.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                        <input
                            type="text"
                            value={c}
                            onChange={(e) => handleChange(i, e.target.value)}
                            style={NEURON_STYLES.input}
                            placeholder={`Container #${i + 1}`}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (editableContainers.length <= 1 && i === 0) {
                                    setEditedContainerNumbers([]);
                                } else {
                                    removeRow(i);
                                }
                            }}
                            disabled={editableContainers.length <= 1}
                            style={{ 
                                padding: "8px", 
                                color: "#EF4444", 
                                background: "transparent", 
                                border: "none",
                                cursor: editableContainers.length <= 1 ? "not-allowed" : "pointer",
                                opacity: editableContainers.length <= 1 ? 0.5 : 1
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addRow}
                    style={{
                        padding: "8px",
                        border: "1px dashed #0F766E",
                        borderRadius: "6px",
                        background: "#F0FDFA",
                        color: "#0F766E",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                    }}
                >
                    <Plus size={14} /> Add Container
                </button>
            </div>
        </div>
    );
  };

  const handleStatusChange = async (newStatus: BillingStatus) => {
    setEditedStatus(newStatus);
    setShowStatusDropdown(false);
    
    try {
      const response = await fetch(`${API_BASE_URL}/billings/${billingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Status updated to ${newStatus}`);
        await fetchBillingDetails();
      } else {
        toast.error("Failed to update status");
        setEditedStatus(billing.status);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      setEditedStatus(billing.status);
    }
  };

  const getStatusColor = (status: BillingStatus) => {
    switch (status) {
      case "Completed":
        return "#10B981";
      case "Approved":
        return "#3B82F6"; // Blue
      case "Submitted":
        return "#3B82F6";
      case "Draft":
        return "#6B7280";
      case "Cancelled":
        return "#DC2626";
      case "Partially Collected":
        return "#F97316"; // Orange
      default:
        return "#6B7280";
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: NEURON_COLORS.background.primary, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ 
          color: NEURON_COLORS.text.secondary, 
          fontSize: NEURON_TYPOGRAPHY.fontSize.md 
        }}>
          Loading billing details...
        </div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: NEURON_COLORS.background.primary, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ 
          color: NEURON_COLORS.text.secondary, 
          fontSize: NEURON_TYPOGRAPHY.fontSize.md 
        }}>
          Billing not found
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Hide number input spinner arrows */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
      <div style={{ 
        background: NEURON_COLORS.background.secondary,
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "1px solid var(--neuron-ui-border)",
        padding: "20px 48px",
        flexShrink: 0,
        ...(embedded ? { position: "sticky" as const, top: 0, zIndex: 10 } : {})
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Arrow Button — hidden in embedded mode */}
            {!embedded && (<button
              onClick={onBack}
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
            </button>)}
            
            {/* Title Block */}
            <div>
              <h1 style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--neuron-ink-primary)",
                marginBottom: "0"
              }}>
                {billing.billingNumber}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: NEURON_SPACING.md, alignItems: "center" }}>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              style={{
                ...NEURON_STYLES.activityButton,
                ...(showTimeline ? NEURON_STYLES.activityButtonActive : {})
              }}
              {...createHoverHandlers(
                showTimeline ? undefined : NEURON_COLORS.interactive.hover
              )}
            >
              <Clock size={16} />
              Activity
            </button>

            {!isEditing && (
              <>
                <StandardButton
                  variant="secondary"
                  icon={<Edit3 size={16} />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Billing
                </StandardButton>

                <ActionsDropdown
                  onDownloadPDF={() => {
                    toast.success("PDF download starting...");
                    // TODO: Implement PDF generation
                  }}
                  onDownloadWord={() => {
                    toast.success("Word download starting...");
                    // TODO: Implement Word generation
                  }}
                  onDelete={() => setShowDeleteConfirm(true)}
                />
              </>
            )}

            {isEditing && (
              <>
                <StandardButton
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    toast.info("Edit cancelled");
                  }}
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </StandardButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metadata/Summary Bar */}
      {!embedded && (<div style={{
        background: (() => {
          switch (billing.status) {
            case "Draft": return "linear-gradient(135deg, #F3F4F6 0%, #E5E9F0 100%)";
            case "For Approval": return "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)";
            case "Approved": return "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)";
            case "Completed": return "linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)";
            case "Partially Collected": return "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)";
            case "Cancelled": return "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)";
            default: return "linear-gradient(135deg, #F3F4F6 0%, #E5E9F0 100%)";
          }
        })(),
        borderBottom: "1.5px solid #0F766E",
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        gap: "32px",
        flexShrink: 0
      }}>
        {/* Total Amount */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Total Amount
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0A1D4D" }}>
            ₱{formatAmount(billing.totalAmount)}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Status - Editable Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Status
          </div>
          
          {/* Status Dropdown Trigger */}
          <div
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            onBlur={() => setTimeout(() => setShowStatusDropdown(false), 200)}
            tabIndex={0}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: billing.status === "Draft" ? "#6B7280" :
                     billing.status === "For Approval" ? "#F59E0B" :
                     billing.status === "Approved" ? "#3B82F6" :
                     billing.status === "Completed" ? "#10B981" :
                     billing.status === "Partially Collected" ? "#F97316" :
                     billing.status === "Cancelled" ? "#DC2626" : "#667085",
              cursor: "pointer",
              padding: "4px 24px 4px 8px",
              borderRadius: "6px",
              border: "1.5px solid transparent",
              position: "relative",
              transition: "all 0.2s ease",
              background: showStatusDropdown ? "#FFFFFF" : "transparent"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FFFFFF";
              e.currentTarget.style.borderColor = "#0F766E";
            }}
            onMouseLeave={(e) => {
              if (!showStatusDropdown) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {billing.status}
            
            {/* Dropdown Arrow */}
            <div style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: `translateY(-50%) ${showStatusDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
              transition: "transform 0.2s ease",
              pointerEvents: "none",
              color: "#0F766E"
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Status Dropdown Menu */}
          {showStatusDropdown && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              background: "white",
              border: "1.5px solid #E5E9F0",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 50,
              minWidth: "160px",
              overflow: "hidden"
            }}>
              {["Draft", "For Approval", "Approved", "Completed", "Partially Collected", "Cancelled"].map((status, index) => (
                <div
                  key={status}
                  onClick={() => handleStatusChange(status as BillingStatus)}
                  style={{
                    padding: "10px 14px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    borderBottom: index < 5 ? "1px solid #E5E9F0" : "none",
                    background: billing.status === status ? "#F0FDF4" : "white",
                    color: status === "Draft" ? "#6B7280" :
                           status === "For Approval" ? "#F59E0B" :
                           status === "Approved" ? "#3B82F6" :
                           status === "Completed" ? "#10B981" :
                           status === "Partially Collected" ? "#F97316" :
                           status === "Cancelled" ? "#DC2626" : "#667085",
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (billing.status !== status) {
                      e.currentTarget.style.background = "#F9FAFB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = billing.status === status ? "#F0FDF4" : "white";
                  }}
                >
                  {status}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Billing Date — always read-only in topbar */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Billing Date
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
            {billing.billingDate ? formatDate(billing.billingDate) : "—"}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Created Date */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Created Date
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
            {formatDate(billing.created_at)}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Project */}
        {billing.projectName && (
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
              Project
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
              {billing.projectName}
            </div>
          </div>
        )}
      </div>)}

      {/* Tab Navigation */}
      {!embedded && (
        <StandardTabs
          tabs={[
            { id: "overview", label: "Billings Overview", icon: <FileText size={18} /> },
            { id: "collections", label: "Collections", icon: <DollarSign size={18} /> },
            { id: "attachments", label: "Attachments", icon: <Paperclip size={18} /> },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as "overview" | "collections" | "attachments")}
        />
      )}

      {/* Content */}
      <div style={{
        padding: "32px 48px",
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden"
      }}>
        <div style={{ display: (embedded || activeTab === "overview") ? undefined : "none" }}>
          <div>
            {/* Main Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: NEURON_SPACING['2xl'] }}>
              {/* ── BOOKING DETAILS (unified read-only summary card) ── */}
              <div style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #E5E9F0",
                overflow: "hidden",
                marginBottom: "24px"
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
                        value={Array.from(editedBookingIds)[0] || ""}
                        onSelect={(booking) => {
                          if (!booking) {
                            setEditedBookingIds(new Set());
                            setLinkedBookings([]);
                            // Clear booking-derived fields
                            setEditedVessel("");
                            setEditedBlNumber("");
                            setEditedDestination("");
                            setEditedOrigin("");
                            setEditedShipper("");
                            setEditedConsignee("");
                            setEditedVolume("");
                            setEditedCommodity("");
                            setEditedContainerNumbers([]);
                            setEditedClientName("");
                            setEditedCompanyName("");
                            return;
                          }
                          const bk = booking as any;
                          const uid = bk.bookingId || bk.bookingNumber || bk.booking_number || booking.id;
                          setEditedBookingIds(new Set([uid]));
                          setLinkedBookings([bk]);

                          // Auto-fill shipment detail fields from selected booking
                          setEditedVessel(bk.vesselVoyage || bk.vessel_voyage || bk.vessel || "");
                          setEditedBlNumber(bk.blNumber || bk.bl_number || bk.awbBlNo || "");
                          // Destination logic: use POD for imports
                          let dest = bk.destination || bk.dropoff || "";
                          if (bk.shipmentType?.toLowerCase() === "import") {
                            dest = bk.pod || bk.port_of_destination || dest;
                          }
                          setEditedDestination(dest);
                          setEditedOrigin(bk.origin || bk.pol || bk.pickup || "");
                          setEditedShipper(bk.shipper || "");
                          setEditedConsignee(bk.consignee || "");
                          setEditedVolume(bk.volume || "");
                          setEditedCommodity(bk.commodity || "");
                          setEditedClientName(bk.clientName || bk.client || bk.customerName || bk.customer_name || editedClientName);
                          setEditedCompanyName(bk.companyName || bk.company_name || editedCompanyName);
                          // Parse container numbers
                          let containers: string[] = [];
                          if (bk.containerNumbers) {
                            containers = Array.isArray(bk.containerNumbers) ? bk.containerNumbers : bk.containerNumbers.split(",").map((c: string) => c.trim()).filter(Boolean);
                          } else if (bk.containerNo) {
                            containers = bk.containerNo.includes(",") ? bk.containerNo.split(",").map((c: string) => c.trim()).filter(Boolean) : [bk.containerNo];
                          }
                          setEditedContainerNumbers(containers);
                          // Fetch full booking data for enrichment
                          fetchLinkedBookings([uid]);
                        }}
                        placeholder="Search by Booking Ref, BL No, or Client..."
                      />
                      {linkedBookings.length > 0 && (
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

                  {/* Read-only summary fields — booking-derived data */}
                  {(() => {
                    // Use edited state when editing, otherwise fall back to saved billing data
                    const dBlNumber = isEditing ? editedBlNumber : (billing.blNumber || "");
                    const dVessel = isEditing ? editedVessel : (billing.vessel || "");
                    const dOrigin = isEditing ? editedOrigin : (billing.origin || "");
                    const dDestination = isEditing ? editedDestination : (billing.destination || "");
                    const dShipper = isEditing ? editedShipper : (billing.shipper || "");
                    const dConsignee = isEditing ? editedConsignee : (billing.consignee || "");
                    const dVolume = isEditing ? editedVolume : (billing.volume || "");
                    const dCommodity = isEditing ? editedCommodity : (billing.commodity || "");
                    const dClientName = isEditing ? editedClientName : (billing.clientName || "");
                    const dCompanyName = isEditing ? editedCompanyName : (billing.companyName || "");
                    const dContainerRaw = isEditing ? editedContainerNumbers : (billing.containerNumbers || []);
                    const dContainers: string[] = Array.isArray(dContainerRaw) ? dContainerRaw : (typeof dContainerRaw === 'string' ? (dContainerRaw as string).split(',').map(s => s.trim()).filter(Boolean) : []);

                    return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        {/* Row 1: Shipper/Consignee (conditional) | Client Name */}
                        {isExport && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Shipper</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dShipper || "—"}</div>
                          </div>
                        )}
                        {isImport && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Consignee</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dConsignee || "—"}</div>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Client Name</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dClientName || "—"}</div>
                        </div>
                        {dCompanyName && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Company</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dCompanyName}</div>
                          </div>
                        )}
                        {/* Row 2: B/L Number | Vessel / Voyage */}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>B/L Number</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dBlNumber || "—"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dVessel || "—"}</div>
                        </div>
                        {/* Row 3: Container No | Origin (POL) */}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                            {dContainers.length > 0 ? dContainers.join(", ") : "—"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Origin (POL)</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dOrigin || "—"}</div>
                        </div>
                        {/* Row 4: Destination (POD) | Volume */}
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Destination (POD)</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dDestination || "—"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Volume</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{computeVolumeSummary(dContainers, dVolume)}</div>
                        </div>
                        {/* Row 5: Commodity (conditional) */}
                        {dCommodity && (
                          <div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                            <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{dCommodity}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>

              {/* ── EXCHANGE RATE (separate editable field) ── */}
              <div style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #E5E9F0",
                overflow: "hidden",
                marginBottom: "24px"
              }}>
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #E5E9F0",
                  background: "#F9FAFB"
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                    Billing Settings
                  </h3>
                </div>
                <div style={{ padding: "24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <div style={NEURON_STYLES.fieldLabel}>Billing Date</div>
                      {isEditing ? (
                        <SingleDateInput
                          value={editedBillingDate}
                          onChange={(iso) => setEditedBillingDate(iso)}
                          placeholder="Set date"
                        />
                      ) : (
                        <div style={NEURON_STYLES.readOnlyField}>
                          {billing.billingDate ? formatDate(billing.billingDate) : "—"}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={NEURON_STYLES.fieldLabel}>Exchange Rate</div>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editedExchangeRate}
                          onChange={(e) => setEditedExchangeRate(e.target.value)}
                          placeholder="0.00"
                          style={{ ...NEURON_STYLES.input, width: "100%", boxSizing: "border-box" as const }}
                        />
                      ) : (
                        <div style={NEURON_STYLES.readOnlyField}>
                          {billing.exchangeRate || "—"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Particulars — table format matching CreateBillingModal */}
              <div style={{
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "24px"
              }}>
                <div style={{
                  background: "#FAFBFC",
                  padding: "12px 16px",
                  borderBottom: "1px solid #E5E9F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                    Billing Particulars
                  </h3>
                  {isEditing && (
                    <button
                      onClick={() => {
                        const overallRate = parseFloat(editedExchangeRate) || 0;
                        setEditedParticulars([
                          ...editedParticulars,
                          {
                            id: Math.random().toString(36).substr(2, 9),
                            particulars: "",
                            volumeType: "BL",
                            volumeQty: 1,
                            unitCost: 0,
                            total: 0,
                            exchangeRate: null,
                            applyExchangeRate: false,
                            amount: 0
                          }
                        ]);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#0F766E",
                        fontSize: "12px",
                        fontWeight: 500,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        transition: "background 0.15s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(15,118,110,0.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  )}
                </div>

                {editedParticulars.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center" }}>
                    <Receipt size={32} style={{ color: "#98A2B3", margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>No billing particulars added yet.</p>
                    {isEditing && (
                      <button
                        onClick={() => {
                          setEditedParticulars([{
                            id: Math.random().toString(36).substr(2, 9),
                            particulars: "",
                            volumeType: "BL",
                            volumeQty: 1,
                            unitCost: 0,
                            total: 0,
                            exchangeRate: null,
                            applyExchangeRate: false,
                            amount: 0
                          }]);
                        }}
                        style={{ color: "#0F766E", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", marginTop: "4px" }}
                      >
                        Add one
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "white", borderBottom: "1px solid #E5E9F0" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "35%" }}>Particulars</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "10%" }}>Volume</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "15%" }}>Unit Cost</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "15%" }}>Total</th>
                        <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "8%" }}>Ex. Rate</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "15%" }}>Amount</th>
                        {isEditing && <th style={{ width: "5%" }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {editedParticulars.map((particular, index) => {
                        const overallRate = parseFloat(editedExchangeRate) || 0;
                        const isExRateApplied = particular.applyExchangeRate ?? (particular.exchangeRate !== null && particular.exchangeRate !== undefined && particular.exchangeRate > 0);
                        return (
                          <tr key={particular.id || index} style={{ borderBottom: "1px solid #E5E9F0", background: "white" }}>
                            <td style={{ padding: "8px 8px 8px 16px" }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={particular.particulars}
                                  onChange={(e) => {
                                    const newParticulars = [...editedParticulars];
                                    newParticulars[index] = { ...particular, particulars: e.target.value };
                                    setEditedParticulars(newParticulars);
                                  }}
                                  placeholder="Enter description"
                                  style={{
                                    height: "36px",
                                    width: "100%",
                                    border: "1px solid #E5E9F0",
                                    borderRadius: "6px",
                                    padding: "0 10px",
                                    fontSize: "14px",
                                    color: "#0A1D4D",
                                    background: "transparent",
                                    outline: "none",
                                    boxSizing: "border-box" as const,
                                    transition: "border-color 0.15s ease"
                                  }}
                                  onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                                  onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                                  onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "#E5E9F0"; }}
                                  onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "#E5E9F0"; }}
                                />
                              ) : (
                                <div style={{
                                  height: "36px",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "0 12px",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "#0A1D4D"
                                }}>{particular.particulars}</div>
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {(() => {
                                const volLabel = (isEditing ? editedVolume : billing?.volume) || "";
                                return isEditing ? (
                                  <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    height: "36px",
                                    border: "1px solid #E5E9F0",
                                    borderRadius: "6px",
                                    overflow: "hidden",
                                    transition: "border-color 0.15s ease"
                                  }}
                                  onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.style.borderColor = "#E5E9F0"; }}
                                  >
                                    <input
                                      type="number"
                                      value={particular.volumeQty}
                                      onChange={(e) => {
                                        const qty = parseFloat(e.target.value) || 0;
                                        const total = qty * particular.unitCost;
                                        const amount = isExRateApplied && overallRate > 0 ? total * overallRate : total;
                                        const newParticulars = [...editedParticulars];
                                        newParticulars[index] = { ...particular, volumeQty: qty, total, amount };
                                        setEditedParticulars(newParticulars);
                                      }}
                                      style={{
                                        height: "100%",
                                        width: volLabel ? "50px" : "100%",
                                        minWidth: "40px",
                                        border: "none",
                                        padding: "0 8px",
                                        fontSize: "14px",
                                        color: "#0A1D4D",
                                        background: "transparent",
                                        outline: "none",
                                        textAlign: "right" as const,
                                        boxSizing: "border-box" as const,
                                        flex: volLabel ? "0 0 auto" : "1"
                                      }}
                                    />
                                    {volLabel && (
                                      <span style={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "#667085",
                                        paddingRight: "10px",
                                        whiteSpace: "nowrap",
                                        userSelect: "none",
                                        flexShrink: 0
                                      }}>x{volLabel}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{
                                    height: "36px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    padding: "0 12px",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: "#0A1D4D"
                                  }}>{particular.volumeQty}{volLabel ? <span style={{ color: "#0A1D4D", fontWeight: 500, marginLeft: "1px" }}>x{volLabel}</span> : ""}</div>
                                );
                              })()}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={particular.unitCost}
                                  onChange={(e) => {
                                    const cost = parseFloat(e.target.value) || 0;
                                    const total = particular.volumeQty * cost;
                                    const amount = isExRateApplied && overallRate > 0 ? total * overallRate : total;
                                    const newParticulars = [...editedParticulars];
                                    newParticulars[index] = { ...particular, unitCost: cost, total, amount };
                                    setEditedParticulars(newParticulars);
                                  }}
                                  placeholder="0.00"
                                  style={{
                                    height: "36px",
                                    width: "100%",
                                    border: "1px solid #E5E9F0",
                                    borderRadius: "6px",
                                    padding: "0 10px",
                                    fontSize: "14px",
                                    color: "#0A1D4D",
                                    background: "transparent",
                                    outline: "none",
                                    textAlign: "right" as const,
                                    boxSizing: "border-box" as const,
                                    transition: "border-color 0.15s ease"
                                  }}
                                  onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                                  onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                                  onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "#E5E9F0"; }}
                                  onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "#E5E9F0"; }}
                                />
                              ) : (
                                <div style={{
                                  height: "36px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  padding: "0 12px",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "#0A1D4D"
                                }}>
                                  {formatAmount(particular.unitCost)}
                                </div>
                              )}
                            </td>
                            {/* Total — computed read-only */}
                            <td style={{ padding: "8px" }}>
                              <div style={{
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#0A1D4D"
                              }}>
                                {formatAmount(particular.total || (particular.volumeQty * particular.unitCost))}
                              </div>
                            </td>
                            {/* Exchange Rate checkbox */}
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              {isEditing ? (
                                <div style={{ display: "flex", justifyContent: "center" }}>
                                  <div
                                    onClick={() => {
                                      const checked = !isExRateApplied;
                                      const total = particular.volumeQty * particular.unitCost;
                                      const amount = checked && overallRate > 0 ? total * overallRate : total;
                                      const newParticulars = [...editedParticulars];
                                      newParticulars[index] = {
                                        ...particular,
                                        applyExchangeRate: checked,
                                        exchangeRate: checked ? overallRate : null,
                                        total,
                                        amount
                                      };
                                      setEditedParticulars(newParticulars);
                                    }}
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      borderRadius: "4px",
                                      border: isExRateApplied ? "none" : "1px solid #D0D5DD",
                                      background: isExRateApplied ? "#0F766E" : "white",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      color: "white",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                  >
                                    {isExRateApplied && "✓"}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: "flex", justifyContent: "center" }}>
                                  <div style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "4px",
                                    border: isExRateApplied ? "none" : "1px solid #D0D5DD",
                                    background: isExRateApplied ? "#0F766E" : "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "10px",
                                    color: "white"
                                  }}>
                                    {isExRateApplied && "✓"}
                                  </div>
                                </div>
                              )}
                            </td>
                            {/* Amount — computed read-only */}
                            <td style={{ padding: "8px" }}>
                              <div style={{
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                padding: "0 12px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#0A1D4D"
                              }}>
                                {formatAmount(particular.amount)}
                              </div>
                            </td>
                            {isEditing && (
                              <td style={{ padding: "8px", textAlign: "center" }}>
                                <button
                                  onClick={() => {
                                    const newParticulars = editedParticulars.filter((_, i) => i !== index);
                                    setEditedParticulars(newParticulars);
                                  }}
                                  style={{
                                    color: "#D1D5DB",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "4px",
                                    transition: "color 0.15s ease"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#EF4444"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "#D1D5DB"}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Grand Total — integrated footer (matches Expense Details design) */}
                  <div style={{
                    padding: "14px 16px",
                    background: "#FAFBFC",
                    borderTop: "2px solid #E5E9F0",
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0A1D4D", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>Total</span>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: "#0A1D4D" }}>
                        ₱{formatAmount(editedParticulars.reduce((sum, p) => sum + p.amount, 0))}
                      </span>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>

              {/* Notes Section */}
              <NotesSection
                value={isEditing ? editedNotes : ((billing as any)?.notes || "")}
                onChange={setEditedNotes}
                disabled={!isEditing}
              />


          </div>
        </div>
        <div style={{ display: (!embedded && activeTab === "collections") ? undefined : "none", height: "100%" }}>
            {/* Collections Tab Content */}
              <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
                {/* Summary Cards */}
                {(() => {
                  const totalBillingAmount = billing?.totalAmount || 0;
                  const collectedAmount = collections
                    .filter((c) => c.status === "Collected")
                    .reduce((sum, c) => sum + ((c as any).allocatedAmount ?? c.amount ?? 0), 0);
                  const pendingAmount = totalBillingAmount - collectedAmount;
                  const fmtCard = (amount: number) =>
                    `₱${formatAmount(amount || 0)}`;
                  const cards = [
                    { label: "Total Billing Amount", value: fmtCard(totalBillingAmount) },
                    { label: "Collected", value: fmtCard(collectedAmount) },
                    { label: "Pending", value: fmtCard(pendingAmount) },
                  ];
                  return (
                    <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                      {cards.map((card) => (
                        <div
                          key={card.label}
                          style={{
                            flex: 1,
                            border: "1px solid #E5E9F0",
                            borderRadius: "8px",
                            padding: "20px 24px",
                            backgroundColor: "#FFFFFF",
                          }}
                        >
                          <div style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#667085",
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.5px",
                          }}>{card.label}</div>
                          <div style={{
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "#0A1D4D",
                            marginTop: "8px",
                          }}>{card.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Container matching Vouchers Tab design */}
                <div style={{ 
                  border: "1px solid #E5E9F0", 
                  borderRadius: "12px", 
                  backgroundColor: "#FFFFFF",
                  overflow: "hidden"
                }}>
                  {/* Header */}
                  <div style={{ 
                    padding: "24px", 
                    borderBottom: "1px solid #E5E9F0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                        Collections
                      </h3>
                      <p style={{ fontSize: "14px", color: "#667085", marginTop: "4px", marginBottom: 0 }}>
                        Payments collected against {billing?.billingNumber || "this billing"}
                      </p>
                    </div>
                    
                    {/* Add Collection Button */}
                    <button
                      onClick={() => setShowCreateCollection(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        fontSize: "14px",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "8px",
                        background: "#0F766E",
                        color: "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#0D6660"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#0F766E"}
                    >
                      <Plus size={16} />
                      Add Collection
                    </button>
                  </div>
                  
                  {isLoadingCollections ? (
                    <div style={{ padding: "48px 24px", textAlign: "center" }}>
                      <div style={{ color: "#667085", fontSize: "14px" }}>Loading collections...</div>
                    </div>
                  ) : collections.length > 0 ? (
                    <div>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E9F0" }}>
                            <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Collection Number</th>
                            <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                            <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Payment Method</th>
                            <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Allocated</th>
                            <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {collections.map((collection, index) => (
                            <tr 
                              key={collection.id || index} 
                              style={{ 
                                borderBottom: index < collections.length - 1 ? "1px solid #E5E9F0" : "none",
                                transition: "background 0.15s ease",
                                cursor: "pointer"
                              }}
                              onClick={() => handleViewCollection(collection)}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "#FFFFFF"}
                            >
                              <td style={{ padding: "16px 24px" }}>
                                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                                  {collection.collectionNumber}
                                </div>
                              </td>
                              <td style={{ padding: "16px 24px" }}>
                                <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                                  {formatDate(collection.collectionDate)}
                                </div>
                              </td>
                              <td style={{ padding: "16px 24px" }}>
                                <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                                  {collection.paymentMethod || "—"}
                                </div>
                              </td>
                              <td style={{ padding: "16px 24px", textAlign: "left" }}>
                                <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                                  ₱{formatAmount((collection as any).allocatedAmount ?? collection.amount)}
                                </div>
                              </td>
                              <td style={{ padding: "16px 24px", textAlign: "left" }}>
                                <NeuronStatusPill status={collection.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: "48px 24px", textAlign: "center" }}>
                      <DollarSign size={40} style={{ color: "#E5E9F0", margin: "0 auto 12px" }} />
                      <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
                        No collections recorded for this billing yet
                      </p>
                    </div>
                  )}
                </div>
              </div>

          </div>

        {!embedded && (
          <div style={{ display: activeTab === "attachments" ? undefined : "none" }}>
            {billing && (
              <AttachmentsTab
                entityType="billing"
                entityId={billingId}
              />
            )}
          </div>
        )}
      </div>
      </div>

      <CreateCollectionPanel 
         isOpen={showCreateCollection}
         onClose={() => setShowCreateCollection(false)}
         onSuccess={() => { setShowCreateCollection(false); fetchCollections(); fetchBillingDetails(); }}
         preSelectedBillingId={billingId}
      />

      <CollectionDetailPanel
        collection={selectedCollection}
        isOpen={!!selectedCollection}
        onClose={handleBackFromCollection}
        onCollectionDeleted={() => { handleBackFromCollection(); fetchCollections(); fetchBillingDetails(); }}
        onCollectionUpdated={() => { fetchCollections(); fetchBillingDetails(); }}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            width: "100%",
            maxWidth: "400px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
              Delete Billing?
            </h3>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px" }}>
              Are you sure you want to delete this billing? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #D1D5DB",
                  backgroundColor: "white",
                  color: "#344054",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBilling}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#EF4444",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
