import { useState, useEffect } from "react";
import { ArrowLeft, MoreVertical, Lock, ChevronRight, Trash2, Plus, ChevronDown, Check } from "lucide-react";
import { BillingsSubTabs } from "./shared/BillingsSubTabs";
import { ExpensesSubTabs } from "./shared/ExpensesSubTabs";
import { TruckingTab } from "./shared/TruckingTab";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { StandardButton } from "../design-system/StandardButton";
import { StandardTabs } from "../design-system/StandardTabs";
import { DateInput } from "../ui/DateInput";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { toast } from "../ui/toast-utils";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import { HeaderStatusDropdown } from "../shared/HeaderStatusDropdown";
import { TabRowActions } from "../shared/TabRowActions";
import { SHIPPING_LINE_OPTIONS, CONTAINER_SIZE_OPTIONS, CONTAINER_TYPE_OPTIONS, formatContainerVolume, parseContainerVolume, SECTION_OPTIONS } from "../../utils/truckingTags";
import { BookingAttachmentsTab } from "../shared/BookingAttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { BookingInfoSubTabs } from "./shared/BookingInfoSubTabs";
import { PodDropdown } from "../shared/PodDropdown";
import { TagHistoryTimeline } from "../shared/TagHistoryTimeline";
import type { TagHistoryEntry, BookingSegment, BookingNumberEntry } from "../../types/operations";
import type { ExportDocuments } from "../../types/export-documents";
import { API_BASE_URL } from '@/utils/api-config';

export type ExecutionStatus = 
  | "Draft" 
  | "For Approval" 
  | "Approved" 
  | "In Transit" 
  | "Delivered" 
  | "Completed" 
  | "On Hold" 
  | "Cancelled";

export interface ExportBooking {
  id: string;
  bookingId: string;
  bookingNumber?: string;
  bookingNumbers?: BookingNumberEntry[];
  date?: string;
  customerName: string;
  companyName?: string;
  clientId?: string;
  contactId?: string;
  contactPersonName?: string;
  status: ExecutionStatus;
  shipmentTags?: string[];
  tagHistory?: TagHistoryEntry[];
  
  // Shipment Details
  consignee?: string;
  shipper?: string;
  mblMawb?: string;
  blNumber?: string;
  containerNo?: string;
  commodity?: string;
  volume?: string;
  sealNo?: string;
  vesselVoyage?: string;
  origin?: string;
  pod?: string;
  destination?: string;
  shippingLine?: string;
  
  // Vessel/VOY Details
  etd?: string;
  etdTime?: string;
  atd?: string;
  atdTime?: string;
  eta?: string;
  etaTime?: string;
  vesselStatus?: string;
  lctEdArrastre?: string;
  lctEdArrastreTime?: string;
  lctCargo?: string;
  lctCargoTime?: string;

  // Trucking
  loadingAddress?: string;
  loadingSchedule?: string;

  // Domestic Cost
  domesticFreight?: string;
  hustlingStripping?: string;
  forkliftOperator?: string;

  // Customs Processing
  exportDivision?: string;
  lodgmentCdsFee?: string;
  formE?: string;

  // Shipping Line Cost
  oceanFreight?: string;
  sealFee?: string;
  docsFee?: string;
  lssFee?: string;
  storageCost?: string;

  // Port Charges Cost
  arrastre?: string;
  shutOut?: string;

  // Miscellaneous Cost
  royaltyFee?: string;
  lona?: string;
  lalamove?: string;
  bir?: string;
  labor?: string;
  otherCharges?: string;

  // Operational Details (legacy)
  section?: string;
  ot?: string;
  receivedDocs?: string;
  ata?: string;
  discharged?: string;
  storageBegins?: string;
  demBegins?: string;
  entryNumber?: string;
  shippingLineStatus?: string;
  
  // Additional fields
  registryNo?: string;
  selectivity?: string;
  ticket?: string;
  rcvdBilling?: string;
  finalTaxNavValue?: string;
  stowage?: string;
  gatepass?: string;
  grossWeight?: string;
  docsTimeline?: any[];
  notes?: string;
  
  // Approval / Sign-off
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  
  accountOwner?: string;
  accountHandler?: string;
  createdAt: string;
  updatedAt: string;

  // Multi-leg segments
  segments?: BookingSegment[];

  // Export document generators
  exportDocuments?: ExportDocuments;
}

interface ExportBookingDetailsProps {
  booking: ExportBooking;
  onBack: () => void;
  onBookingUpdated: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

type DetailTab = "booking-info" | "trucking" | "billings" | "expenses" | "attachments";

// Activity Timeline Data Structure
interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: "field_updated" | "status_changed" | "created" | "note_added";
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  statusFrom?: ExecutionStatus;
  statusTo?: ExecutionStatus;
  note?: string;
}

// Initial mock activity data
const initialActivityLog: ActivityLogEntry[] = [
  {
    id: "init-1",
    timestamp: new Date(),
    user: "System",
    action: "created"
  },
];

// Field locking rules based on status
// NOTE: All fields are now editable regardless of status since changes are tracked in activity log
function isFieldLocked(fieldName: string, status: ExecutionStatus): { locked: boolean; reason: string } {
  // All fields are editable - changes will be tracked in the activity log
  return { locked: false, reason: "" };
}

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

// Convert MM/DD/YYYY to ISO YYYY-MM-DD for SingleDateInput
const mmddToISO = (mmdd: string): string => {
  if (!mmdd) return "";
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(mmdd)) return mmdd;
  const parts = mmdd.split('/');
  if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[0]}-${parts[1]}`;
  }
  // Try parsing as date string
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

const LEGACY_EXPORT_STATUS_TO_TAGS: Record<string, string[]> = {
  Delivered: ["delivered"],
  Completed: ["delivered"],
};

function mapLegacyExportStatusToTags(status?: string): string[] {
  if (!status) return [];
  return LEGACY_EXPORT_STATUS_TO_TAGS[status] || [];
}

export function ExportBookingDetails({
  booking,
  onBack,
  onBookingUpdated,
  currentUser
}: ExportBookingDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("booking-info");
  const [showTimeline, setShowTimeline] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [editedBooking, setEditedBooking] = useState<ExportBooking>(booking);
  const [currentBooking, setCurrentBooking] = useState<ExportBooking>(booking);
  const [shipmentTags, setShipmentTags] = useState<string[]>([]);
  const [tagHistory, setTagHistory] = useState<TagHistoryEntry[]>([]);
  const [isTagsSaving, setIsTagsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ExportBooking>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sub-tab edit propagation state
  const [subTabHasRecord, setSubTabHasRecord] = useState<Record<string, boolean>>({});
  const [subTabEditing, setSubTabEditing] = useState(false);
  const [subTabEditRequest, setSubTabEditRequest] = useState(false);
  const [subTabSaveCounter, setSubTabSaveCounter] = useState(0);

  // Get context-aware edit label based on active tab
  const getEditLabel = (): string | null => {
    switch (activeTab) {
      case "booking-info": return "Edit Booking";
      case "trucking": return subTabHasRecord["trucking"] ? "Edit Trucking" : null;
      case "billings": return subTabHasRecord["billings"] ? "Edit Billing" : null;
      case "expenses": return subTabHasRecord["expenses"] ? "Edit Expense" : null;
      default: return null;
    }
  };

  // Unified edit handler that delegates to the right component
  const handleTabEdit = () => {
    if (activeTab === "booking-info") {
      const parsed = parseContainerVolume((editedBooking as any).volume || "");
      setEditData({ __containerSize: parsed.size, __containerType: parsed.type } as any);
      setIsEditing(true);
    } else {
      setSubTabEditRequest(true);
    }
  };

  // Unified cancel handler
  const handleTabCancel = () => {
    if (activeTab === "booking-info") {
      handleCancel();
    } else {
      setSubTabEditRequest(false);
      setSubTabEditing(false);
    }
  };

  // Unified save handler
  const handleTabSave = () => {
    if (activeTab === "booking-info") {
      handleSave();
    } else {
      // Trigger save in the embedded sub-screen via counter
      setSubTabSaveCounter((c: number) => c + 1);
    }
  };

  // Track whether we're in an editing state (booking-info or sub-tab)
  const isAnyEditing = activeTab === "booking-info" ? isEditing : subTabEditing;

  // Multi-leg segment state
  const [activeSegmentId, setActiveSegmentId] = useState<string>(() =>
    booking.segments?.[0]?.segmentId || ""
  );
  const [segmentEditData, setSegmentEditData] = useState<Record<string, any>>({});

  useEffect(() => {
    setCurrentBooking(booking);
    setEditedBooking(booking);
    setShipmentTags(
      Array.isArray(booking.shipmentTags)
        ? booking.shipmentTags
        : mapLegacyExportStatusToTags(booking.status as string),
    );
    setTagHistory(Array.isArray(booking.tagHistory) ? booking.tagHistory : []);
    // Initialize segment selection
    if (booking.segments?.length && !activeSegmentId) {
      setActiveSegmentId(booking.segments[0].segmentId);
    }
  }, [booking]);

  const fetchBookingDetails = async () => {
    try {
      const bookingId = encodeURIComponent(currentBooking.id || currentBooking.bookingId);
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (!result.success || !result.data) return;
      const refreshed = result.data as ExportBooking;
      setCurrentBooking(refreshed);
      setEditedBooking(refreshed);
      setShipmentTags(
        Array.isArray(refreshed.shipmentTags)
          ? refreshed.shipmentTags
          : mapLegacyExportStatusToTags(refreshed.status as string),
      );
      setTagHistory(Array.isArray(refreshed.tagHistory) ? refreshed.tagHistory : []);
    } catch (error) {
      console.error("Error refreshing export booking details:", error);
    }
  };

  const handleShipmentTagsChange = async (newTags: string[]) => {
    const previousTags = shipmentTags;
    const previousHistory = tagHistory;
    setShipmentTags(newTags);
    setIsTagsSaving(true);

    try {
      const bookingId = encodeURIComponent(currentBooking.id || currentBooking.bookingId);
      const response = await fetch(
        `${API_BASE_URL}/export-bookings/${bookingId}/shipment-tags`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            shipmentTags: newTags,
            user: currentUser?.name || "Unknown",
          }),
        },
      );
      const result = await response.json();
      if (result.success && result.data) {
        const updated = result.data as ExportBooking;
        setCurrentBooking(updated);
        setEditedBooking(updated);
        setShipmentTags(Array.isArray(updated.shipmentTags) ? updated.shipmentTags : []);
        setTagHistory(Array.isArray(updated.tagHistory) ? updated.tagHistory : []);
        onBookingUpdated();
      } else {
        setShipmentTags(previousTags);
        setTagHistory(previousHistory);
        toast.error(`Failed to update status: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating export shipment tags:", error);
      setShipmentTags(previousTags);
      setTagHistory(previousHistory);
      toast.error("Unable to update status");
    } finally {
      setIsTagsSaving(false);
    }
  };


  const EXPORT_STATUS_TEXT_COLORS: Record<string, string> = {
    "For Lodgement and Portal": "#6B7A76",
    "Awaiting for Final": "#FBBC04",
    "Final - For Arrastre Payment": "#B45309",
    "Arrastre Paid": "#10B981",
    "Sent Draft Documents for Approval": "#4285F4",
    "Approved Documents": "#0F766E",
    "Sent FSI and DG Declaration": "#9900FF",
    "Draft BL Okay to Finalize": "#0E7490",
    "Awaiting Billing and Signed BL": "#D97706",
    "Request for Telex": "#2563EB",
    "Form E Ongoing Process": "#16A34A",
  };

  const EXPORT_STATUS_OPTIONS = [
    "For Lodgement and Portal",
    "Awaiting for Final",
    "Final - For Arrastre Payment",
    "Arrastre Paid",
    "Sent Draft Documents for Approval",
    "Approved Documents",
    "Sent FSI and DG Declaration",
    "Draft BL Okay to Finalize",
    "Awaiting Billing and Signed BL",
    "Request for Telex",
    "Form E Ongoing Process",
  ];


  const handleStatusChange = async (newStatus: string) => {
    if (currentBooking.status === newStatus) return;

    try {
      const isLegacy = !(currentBooking as any).booking_type;
      const endpoint = isLegacy 
        ? `${API_BASE_URL}/bookings/${currentBooking.bookingId}` 
        : `${API_BASE_URL}/export-bookings/${currentBooking.id || currentBooking.bookingId}`;
      const method = isLegacy ? "PATCH" : "PUT";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error("Failed to update status");

      const result = await response.json();
      if (result.success) {
        const updated = { ...currentBooking, status: newStatus };
        setCurrentBooking(updated as ExportBooking);
        setEditedBooking(updated as ExportBooking);
        toast.success(`Status updated to ${newStatus}`);
        onBookingUpdated();
      } else {
        throw new Error(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };



  const tabs = [
    { id: "booking-info", label: "Booking Information" },
    { id: "trucking", label: "Trucking" },
    { id: "billings", label: "Billings" },
    { id: "expenses", label: "Expenses" },
    { id: "attachments", label: "Attachments" }
  ] as const;

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        });
        const result = await response.json();
        if (result.success) {
          setProjects(result.data);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, []);

  const addActivity = (
    fieldName: string,
    oldValue: string,
    newValue: string
  ) => {
    const newActivity: ActivityLogEntry = {
      id: `activity-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      user: currentUser?.name || "Current User",
      action: "field_updated",
      fieldName,
      oldValue,
      newValue
    };

    setActivityLog(prev => [newActivity, ...prev]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('[ExportBookingDetails] Saving booking with editData:', editData);
    
    try {
      // Merge container size/type virtual fields back into volume
      const { __containerSize, __containerType, ...cleanEditData } = editData as any;
      if (__containerSize !== undefined || __containerType !== undefined) {
        const size = __containerSize ?? parseContainerVolume((editedBooking as any).volume || "").size;
        const type = __containerType ?? parseContainerVolume((editedBooking as any).volume || "").type;
        (cleanEditData as any).volume = formatContainerVolume(size, type);
      }

      // Merge segment-level edits into local segments before saving
      let finalSegments = currentBooking.segments || [];
      if (Object.keys(segmentEditData).length > 0 && activeSegment) {
        Object.keys(segmentEditData).forEach(key => {
          const oldValue = String((activeSegment as any)?.[key] ?? (editedBooking as any)[key] ?? "");
          const newValue = String(segmentEditData[key] ?? "");
          if (oldValue !== newValue) {
            addActivity(key, oldValue, newValue);
          }
        });
        finalSegments = finalSegments.map(seg =>
          seg.segmentId === activeSegment.segmentId
            ? { ...seg, ...segmentEditData, updatedAt: new Date().toISOString() }
            : seg
        );
      }

      const payload = {
        ...cleanEditData,
        segments: finalSegments,
        updatedAt: new Date().toISOString()
      };

      const isLegacy = !(booking as any).booking_type;
      const encodedId = encodeURIComponent(booking.id || booking.bookingId);

      const endpoint = isLegacy
        ? `${API_BASE_URL}/bookings/${encodedId}`
        : `${API_BASE_URL}/export-bookings/${encodedId}`;
      
      const method = isLegacy ? "PATCH" : "PUT";

      console.log(`Saving booking to ${endpoint} via ${method} (Legacy: ${isLegacy})`);

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save booking");
      }

      // Track changes for activity log (booking-level)
      Object.keys(editData).forEach(key => {
        const oldValue = String((editedBooking as any)[key] || "");
        const newValue = String((editData as any)[key] || "");
        if (oldValue !== newValue) {
          addActivity(key, oldValue, newValue);
        }
      });

      setIsEditing(false);
      setEditData({});
      setSegmentEditData({});
      toast.success("Booking saved successfully");

      // Re-fetch from server to get authoritative state including segment syncs
      await fetchBookingDetails();
      onBookingUpdated();

    } catch (error) {
      console.error("Error saving booking:", error);
      toast.error("Failed to save booking changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
    setSegmentEditData({});
    setCurrentBooking(editedBooking);
  };

  // ─── Segment Handlers ────────────────────────────────────────────────
  const activeSegment = currentBooking.segments?.find(s => s.segmentId === activeSegmentId)
    || currentBooking.segments?.[0];

  const handleAddSegment = () => {
    const existingSegments = currentBooking.segments || [];
    // Auto-label: "Province", "Province 2", "Province 3", etc.
    const provinceCount = existingSegments.filter(s => s.segmentLabel.startsWith("Province")).length;
    const label = provinceCount === 0 ? "Province" : `Province ${provinceCount + 1}`;
    const newSegment: BookingSegment = {
      segmentId: crypto.randomUUID(),
      segmentLabel: label,
      legOrder: existingSegments.length + 1,
      containerNos: [],
    };
    setCurrentBooking(prev => ({ ...prev, segments: [...(prev.segments || []), newSegment] }));
    setActiveSegmentId(newSegment.segmentId);
    toast.success("Province added — save booking to persist");
  };

  const handleDeleteSegment = (segmentId: string) => {
    const segments = currentBooking.segments || [];
    if (segments.length <= 1) {
      toast.error("Cannot delete the last segment");
      return;
    }
    if (!confirm("Delete this segment? Save the booking to persist this change.")) return;
    const updatedSegments = segments
      .filter(s => s.segmentId !== segmentId)
      .map((s, i) => ({ ...s, legOrder: i + 1 }));
    setCurrentBooking(prev => ({ ...prev, segments: updatedSegments }));
    if (activeSegmentId === segmentId) {
      setActiveSegmentId(updatedSegments[0]?.segmentId || "");
    }
    toast.success("Segment removed — save booking to persist");
  };


  const handleDeleteBooking = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export-bookings/${encodeURIComponent(booking.id || booking.bookingId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to delete booking");
        setShowDeleteConfirm(false);
        return;
      }

      toast.success("Booking deleted successfully");
      console.log("Booking deleted successfully");
      setShowDeleteConfirm(false);
      onBookingUpdated();
      onBack();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("An error occurred while deleting the booking");
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: "#F9FAFB",
      display: "flex",
      flexDirection: "column",
      height: "100vh"
    }}>
      {/* Header Bar */}
      <div style={{
        padding: "20px 48px",
        borderBottom: "1px solid var(--neuron-ui-border)",
        backgroundColor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Left Side: Arrow + Title/Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
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
          </button>
          
          <div>
            <h1 style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#0A1D4D",
              marginBottom: "2px"
            }}>
              {booking.customerName}
            </h1>
            {isEditing ? (() => {
              const raw = (editData.bookingId !== undefined ? String(editData.bookingId) : booking.bookingId) || "";
              const m = raw.match(/^(EXP)\s*(\d{4})-(\d*)$/);
              const yearPart = m ? m[2] : String(new Date().getFullYear());
              const num = m ? m[3] : "";
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <label style={{ fontSize: "12px", color: "#667085", fontWeight: 500, marginRight: "4px" }}>Ref:</label>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "8px", alignItems: "end" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Prefix</span>
                      <div style={{ height: "28px", padding: "0 8px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "13px", display: "flex", alignItems: "center", color: "#12332B", backgroundColor: "#F9FAFB", fontWeight: 600 }}>EXP</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Year</span>
                      <input value={yearPart} onChange={e => { const y = e.target.value.replace(/\D/g, ""); setEditData({ ...editData, bookingId: `EXP ${y}-${num}` }); }} style={{ width: "80px", height: "28px", padding: "0 8px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "13px", outline: "none", background: "#FFFFFF" }} />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Number</span>
                      <input value={num} onChange={e => { const n = e.target.value.replace(/\D/g, ""); setEditData({ ...editData, bookingId: `EXP ${yearPart}-${n}` }); }} style={{ width: "80px", height: "28px", padding: "0 8px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "13px", outline: "none", background: "#FFFFFF" }} />
                    </div>
                  </div>
                </div>
              );
            })() : (
              <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
                {booking.bookingId}
                {(booking as any).companyName && booking.customerName !== (booking as any).companyName && (
                  <span> &middot; {(booking as any).companyName}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Status Only */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!isEditing && (
            <HeaderStatusDropdown
              currentStatus={currentBooking.status}
              statusOptions={EXPORT_STATUS_OPTIONS}
              statusColorMap={EXPORT_STATUS_TEXT_COLORS}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        padding: "0 48px",
        borderBottom: "1px solid #E5E9F0",
        backgroundColor: "white"
      }}>
        <StandardTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            setActiveTab(tabId as DetailTab);
            // Exit edit mode when switching tabs
            if (isEditing && tabId !== "booking-info") {
              setIsEditing(false);
            }
            if (subTabEditing) {
              setSubTabEditRequest(false);
              setSubTabEditing(false);
            }
          }}
          actions={
            <TabRowActions
              showTimeline={showTimeline}
              onToggleTimeline={() => setShowTimeline(!showTimeline)}
              editLabel={getEditLabel()}
              onEdit={handleTabEdit}
              isEditing={isAnyEditing}
              onCancel={handleTabCancel}
              onSave={handleTabSave}
              isSaving={isSaving}
              onDelete={() => setShowDeleteConfirm(true)}
              onDownloadPDF={() => toast.success("PDF download starting...")}
              onDownloadWord={() => toast.success("Word download starting...")}
            />
          }
        />
      </div>

      {/* Content with Timeline Sidebar */}
      <div style={{ 
        flex: 1,
        overflow: "hidden",
        display: "flex"
      }}>
        {/* Main Content */}
        <div style={{ 
          flex: showTimeline ? "0 0 65%" : "1",
          overflow: "auto",
          transition: "flex 0.3s ease"
        }}>
          <div style={{ display: activeTab === "booking-info" ? undefined : "none", height: "100%" }}>
            <BookingInfoSubTabs
              bookingId={booking.bookingId}
              currentUser={currentUser}
              segments={currentBooking.segments}
              activeSegmentId={activeSegmentId}
              onSegmentChange={setActiveSegmentId}
              onAddSegment={handleAddSegment}
              onDeleteSegment={handleDeleteSegment}
              isEditing={isEditing}
              booking={currentBooking}
              onDocumentUpdated={fetchBookingDetails}
            >
              <BookingInformationTab
                booking={editedBooking}
                onBookingUpdated={onBookingUpdated}
                addActivity={addActivity}
                setEditedBooking={setEditedBooking}
                isEditing={isEditing}
                editData={editData}
                setEditData={setEditData}
                handleSave={handleSave}
                handleCancel={handleCancel}
                isSaving={isSaving}
                projects={projects}
                activeSegment={activeSegment}
                segmentEditData={segmentEditData}
                setSegmentEditData={setSegmentEditData}
              />
            </BookingInfoSubTabs>
          </div>
          <div style={{ display: activeTab === "trucking" ? undefined : "none", height: "100%" }}>
            <TruckingTab
              bookingId={booking.bookingId}
              bookingType="export"
              currentUser={currentUser}
              onBookingTagsUpdated={fetchBookingDetails}
              segmentId={activeSegmentId}
              segments={currentBooking.segments}
              externalEdit={activeTab === "trucking" ? subTabEditRequest : undefined}
              onEditStateChange={(editing) => setSubTabEditing(editing)}
              onRecordSelected={(has: boolean) => setSubTabHasRecord((prev: Record<string, boolean>) => ({ ...prev, trucking: has }))}
              externalSaveCounter={activeTab === "trucking" ? subTabSaveCounter : undefined}
            />
          </div>
          <div style={{ display: activeTab === "billings" ? undefined : "none", height: "100%" }}>
            <BillingsSubTabs
              bookingId={booking.bookingId}
              bookingNumber={booking.bookingNumber || booking.bookingId}
              bookingType="export"
              currentUser={currentUser}
              segmentId={activeSegmentId}
              externalEdit={activeTab === "billings" ? subTabEditRequest : undefined}
              onEditStateChange={(editing: boolean) => setSubTabEditing(editing)}
              onRecordSelected={(has: boolean) => setSubTabHasRecord((prev: Record<string, boolean>) => ({ ...prev, billings: has }))}
              externalSaveCounter={activeTab === "billings" ? subTabSaveCounter : undefined}
            />
          </div>
          <div style={{ display: activeTab === "expenses" ? undefined : "none", height: "100%" }}>
            <ExpensesSubTabs
              bookingId={booking.bookingId}
              bookingNumber={booking.bookingNumber || booking.bookingId}
              bookingType="export"
              currentUser={currentUser}
              segmentId={activeSegmentId}
              externalEdit={activeTab === "expenses" ? subTabEditRequest : undefined}
              onEditStateChange={(editing: boolean) => setSubTabEditing(editing)}
              onRecordSelected={(has: boolean) => setSubTabHasRecord((prev: Record<string, boolean>) => ({ ...prev, expenses: has }))}
              externalSaveCounter={activeTab === "expenses" ? subTabSaveCounter : undefined}
            />
          </div>
          <div style={{ display: activeTab === "attachments" ? undefined : "none", height: "100%" }}>
            <BookingAttachmentsTab
              bookingType="export"
              bookingId={booking.bookingId}
            />
          </div>
        </div>

        {/* Timeline Sidebar */}
        {showTimeline && (
          <div style={{
            flex: "0 0 35%",
            borderLeft: "1px solid var(--neuron-ui-border)",
            backgroundColor: "#FAFBFC",
            overflow: "auto"
          }}>
            <TagHistoryTimeline history={tagHistory} />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "480px",
              width: "90%",
              border: "1px solid #E5E9F0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#0A1D4D",
              marginBottom: "12px",
            }}>
              Delete Booking
            </h3>
            <p style={{
              fontSize: "14px",
              color: "#667085",
              marginBottom: "24px",
              lineHeight: "1.5",
            }}>
              Are you sure you want to delete this booking ({booking.bookingId})? This action cannot be undone.
            </p>
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}>
              <StandardButton
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </StandardButton>
              <StandardButton
                variant="danger"
                onClick={handleDeleteBooking}
              >
                Delete Booking
              </StandardButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Activity Timeline Component
function ActivityTimeline({ activities }: { activities: ActivityLogEntry[] }) {
  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{
        fontSize: "16px",
        fontWeight: 600,
        color: "var(--neuron-brand-green)",
        marginBottom: "20px"
      }}>
        Activity Timeline
      </h3>

      <div style={{ position: "relative" }}>
        {/* Timeline Line */}
        <div style={{
          position: "absolute",
          left: "15px",
          top: "0",
          bottom: "0",
          width: "2px",
          backgroundColor: "#E5E9F0"
        }} />

        {/* Activity Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {activities.map((activity) => (
            <div key={activity.id} style={{ position: "relative", paddingLeft: "40px" }}>
              {/* Timeline Dot */}
              <div style={{
                position: "absolute",
                left: "8px",
                top: "4px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: activity.action === "status_changed" ? "#0F766E" :
                               activity.action === "created" ? "#6B7280" :
                               activity.action === "field_updated" ? "#3B82F6" : "#F59E0B",
                border: "3px solid #FAFBFC"
              }} />

              {/* Activity Content */}
              <div style={{
                backgroundColor: "white",
                border: "1px solid var(--neuron-ui-border)",
                borderRadius: "8px",
                padding: "12px 16px"
              }}>
                {/* Timestamp */}
                <div style={{
                  fontSize: "11px",
                  color: "var(--neuron-ink-muted)",
                  marginBottom: "6px"
                }}>
                  {activity.timestamp.toLocaleString()}
                </div>

                {/* Action Description */}
                {activity.action === "field_updated" && (
                  <div>
                    <div style={{
                      fontSize: "13px",
                      color: "var(--neuron-ink-base)",
                      marginBottom: "4px"
                    }}>
                      <span style={{ fontWeight: 600 }}>{activity.fieldName}</span> updated
                    </div>
                    {activity.oldValue && activity.newValue && (
                      <div style={{
                        fontSize: "12px",
                        color: "var(--neuron-ink-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "6px"
                      }}>
                        <span style={{
                          padding: "2px 8px",
                          backgroundColor: "#FEE2E2",
                          borderRadius: "4px",
                          textDecoration: "line-through",
                          color: "#EF4444"
                        }}>
                          {activity.oldValue || "(empty)"}
                        </span>
                        <ChevronRight size={12} />
                        <span style={{
                          padding: "2px 8px",
                          backgroundColor: "#D1FAE5",
                          borderRadius: "4px",
                          color: "#10B981"
                        }}>
                          {activity.newValue}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {activity.action === "created" && (
                  <div style={{
                    fontSize: "13px",
                    color: "var(--neuron-ink-base)"
                  }}>
                    Booking created
                  </div>
                )}

                {/* User */}
                <div style={{
                  fontSize: "11px",
                  color: "var(--neuron-ink-muted)",
                  marginTop: "8px"
                }}>
                  by {activity.user}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Locked Field Component
function LockedField({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div>
      <label style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px"
      }}>
        {label}
        <Lock size={12} color="#9CA3AF" title={tooltip} style={{ cursor: "help" }} />
      </label>
      <div style={{
        padding: "10px 14px",
        backgroundColor: "#F9FAFB",
        border: "1px solid #E5E9F0",
        borderRadius: "6px",
        fontSize: "14px",
        color: "#6B7280",
        cursor: "not-allowed"
      }}>
        {value || "\u2014"}
      </div>
    </div>
  );
}

interface EditableFieldProps {
  fieldName: string;
  label: string;
  value: string;
  type?: "text" | "date" | "textarea" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  status: ExecutionStatus | string;
  isEditing?: boolean;
  editData?: Partial<ExportBooking>;
  setEditData?: (data: Partial<ExportBooking>) => void;
}

function EditableField({ 
  fieldName,
  label, 
  value, 
  type = "text", 
  options = [],
  required = false,
  placeholder = "\u2014",
  status,
  isEditing = false,
  editData = {},
  setEditData
}: EditableFieldProps) {
  const lockStatus = isFieldLocked(fieldName, status as ExecutionStatus);
  
  // Helper to ensure date is YYYY-MM-DD for input fields
  const toInputDate = (dateVal: string | Date | undefined | null): string => {
    if (!dateVal) return "";
    try {
      if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        return dateVal;
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split('T')[0];
    } catch (e) {
      return "";
    }
  };

  // Helper to format date for display (MM/DD/YYYY)
  const toDisplayDate = (dateVal: string): string => {
    if (!dateVal) return "";
    try {
      const [y, m, d] = dateVal.split("-");
      if (y && m && d) {
        return `${m}/${d}/${y}`;
      }
      return dateVal;
    } catch (e) {
      return dateVal;
    }
  };

  // Use editData value if available, otherwise use original value
  const rawValue = editData[fieldName as keyof ExportBooking] !== undefined 
    ? String(editData[fieldName as keyof ExportBooking] || "")
    : value;
    
  const inputDateValue = type === "date" ? toInputDate(rawValue) : rawValue;
  const displayValue = type === "date" ? inputDateValue : rawValue;
  
  const isEmpty = !displayValue || displayValue.trim() === "";

  const handleChange = (newValue: string) => {
    if (setEditData) {
      setEditData({ [fieldName]: newValue } as any);
    }
  };

  // If field is locked by status, show as locked field
  if (lockStatus.locked) {
    return (
      <div>
        <label style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--neuron-ink-base)",
          marginBottom: "8px"
        }}>
          {label}
          {required && <span style={{ color: "#EF4444" }}>*</span>}
          <Lock size={12} color="#9CA3AF" title={lockStatus.reason} style={{ cursor: "help" }} />
        </label>
        <div style={{
          padding: "10px 14px",
          backgroundColor: "#F9FAFB",
          border: "1px solid #E5E9F0",
          borderRadius: "6px",
          fontSize: "14px",
          color: "#6B7280",
          cursor: "not-allowed"
        }}>
          {type === "date" ? toDisplayDate(displayValue) : (displayValue || "\u2014")}
        </div>
      </div>
    );
  }

  // View mode (not editing)
  if (!isEditing) {
    return (
      <div>
        <label style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--neuron-ink-base)",
          marginBottom: "8px"
        }}>
          {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
        </label>
        <div style={{
          padding: "10px 14px",
          backgroundColor: isEmpty ? "white" : "#F9FAFB",
          border: isEmpty && required ? "2px dashed #FCD34D" : isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
          borderRadius: "6px",
          fontSize: "14px",
          color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
          minHeight: type === "textarea" ? "80px" : "42px",
          display: "flex",
          alignItems: "center"
        }}>
          {isEmpty ? (
            <span style={{ color: "#9CA3AF" }}>{placeholder}</span>
          ) : type === "date" ? (
            toDisplayDate(displayValue)
          ) : (
            displayValue
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px"
      }}>
        {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "white",
            border: "1px solid var(--neuron-ui-border)",
            borderRadius: "8px",
            fontSize: "14px",
            color: "var(--neuron-ink-primary)",
            outline: "none",
            resize: "vertical"
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
        />
      ) : type === "select" ? (
        <select
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "white",
            border: "1px solid var(--neuron-ui-border)",
            borderRadius: "8px",
            fontSize: "14px",
            color: "var(--neuron-ink-primary)",
            outline: "none",
            minHeight: "42px"
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : type === "date" ? (
        <SingleDateInput
          value={displayValue}
          onChange={handleChange}
          placeholder="MM/DD/YYYY"
        />
      ) : (
        <input
          type={type}
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "white",
            border: "1px solid var(--neuron-ui-border)",
            borderRadius: "8px",
            fontSize: "14px",
            color: "var(--neuron-ink-primary)",
            outline: "none",
            minHeight: "42px"
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border)"; }}
        />
      )}
    </div>
  );
}

function PodEditableField({
  label,
  value,
  required = false,
  placeholder = "\u2014",
  status,
  isEditing = false,
  editData = {},
  setEditData,
}: {
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  status: ExecutionStatus | string;
  isEditing?: boolean;
  editData?: Partial<ExportBooking>;
  setEditData?: (data: Partial<ExportBooking>) => void;
}) {
  const lockStatus = isFieldLocked("pod", status as ExecutionStatus);
  const rawValue =
    (editData as any).pod !== undefined ? String((editData as any).pod || "") : value;
  const isEmpty = !rawValue || rawValue.trim() === "";

  const handleChange = (newValue: string) => {
    if (setEditData) setEditData({ pod: newValue } as any);
  };

  if (lockStatus.locked) {
    return (
      <div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--neuron-ink-base)",
            marginBottom: "8px",
          }}
        >
          {label}
          {required && <span style={{ color: "#EF4444" }}>*</span>}
          <Lock size={12} color="#9CA3AF" title={lockStatus.reason} style={{ cursor: "help" }} />
        </label>
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#6B7280",
            cursor: "not-allowed",
          }}
        >
          {rawValue || "\u2014"}
        </div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--neuron-ink-base)",
            marginBottom: "8px",
          }}
        >
          {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
        </label>
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: isEmpty ? "white" : "#F9FAFB",
            border: isEmpty && required ? "2px dashed #FCD34D" : isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
            minHeight: "42px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {isEmpty ? <span style={{ color: "#9CA3AF" }}>{placeholder}</span> : rawValue}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--neuron-ink-base)",
          marginBottom: "8px",
        }}
      >
        {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
      </label>
      <PodDropdown value={rawValue} onChange={handleChange} placeholder="Select POD" />
    </div>
  );
}

function ContainerListField({
  fieldName,
  label,
  value,
  sealFieldName = "sealNo",
  sealValue = "",
  status,
  isEditing,
  editData,
  setEditData
}: any) {
  const parseList = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
          const parsed = val.split(',').map((s: string) => s.trim());
          return isEditing ? parsed : parsed.filter(Boolean);
      }
      return [];
  };

  const rawValue = isEditing && editData[fieldName] !== undefined
      ? editData[fieldName]
      : value;
  const rawSealValue = isEditing && editData[sealFieldName] !== undefined
      ? editData[sealFieldName]
      : sealValue;

  const containers = parseList(rawValue);
  const seals = parseList(rawSealValue);

  if (containers.length === 0 && isEditing) {
      if (editData[fieldName] === undefined || editData[fieldName] === "") {
          containers.push("");
      }
  }
  // Ensure seals array matches containers length
  while (seals.length < containers.length) seals.push("");

  const handleChange = (index: number, val: string) => {
      const newContainers = [...containers];
      newContainers[index] = val;
      setEditData({ [fieldName]: newContainers.join(', ') } as any);
  };

  const handleSealChange = (index: number, val: string) => {
      const newSeals = [...seals];
      newSeals[index] = val;
      setEditData({ [sealFieldName]: newSeals.join(', ') } as any);
  };

  const addRow = () => {
      const newContainers = [...containers, ""];
      const newSeals = [...seals, ""];
      setEditData({ [fieldName]: newContainers.join(', '), [sealFieldName]: newSeals.join(', ') } as any);
  };

  const removeRow = (index: number) => {
      const newContainers = containers.filter((_: any, i: number) => i !== index);
      const newSeals = seals.filter((_: any, i: number) => i !== index);
      setEditData({ [fieldName]: newContainers.join(', '), [sealFieldName]: newSeals.join(', ') } as any);
  };

  if (!isEditing) {
      return (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <label style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--neuron-ink-base)",
              }}>
                {label}
              </label>
              <label style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--neuron-ink-base)",
              }}>
                Seal No.
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {containers.length > 0 ? containers.map((c: string, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{
                        padding: "10px 14px",
                        backgroundColor: "#FAFBFC",
                        border: "1px solid #E5E9F0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}>
                        {c || "\u2014"}
                      </div>
                      <div style={{
                        padding: "10px 14px",
                        backgroundColor: "#FAFBFC",
                        border: "1px solid #E5E9F0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}>
                        {seals[i] || "\u2014"}
                      </div>
                    </div>
                )) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{
                        padding: "10px 14px",
                        backgroundColor: "#FAFBFC",
                        border: "2px dashed #E5E9F0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: "#9CA3AF"
                      }}>{"\u2014"}</div>
                      <div style={{
                        padding: "10px 14px",
                        backgroundColor: "#FAFBFC",
                        border: "2px dashed #E5E9F0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: "#9CA3AF"
                      }}>{"\u2014"}</div>
                    </div>
                )}
            </div>
          </div>
      );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
        <label style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--neuron-ink-base)",
        }}>
          {label}
        </label>
        <label style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--neuron-ink-base)",
        }}>
          Seal No.
        </label>
        <div style={{ width: "34px" }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {containers.map((c: string, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => handleChange(i, e.target.value)}
                    placeholder={`Container #${i + 1}`}
                    style={{
                      padding: "10px 14px",
                      backgroundColor: "white",
                      border: "1px solid #0F766E",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)",
                      outline: "none"
                    }}
                  />
                  <input
                    type="text"
                    value={seals[i] || ""}
                    onChange={(e) => handleSealChange(i, e.target.value)}
                    placeholder={`Seal #${i + 1}`}
                    style={{
                      padding: "10px 14px",
                      backgroundColor: "white",
                      border: "1px solid #0F766E",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)",
                      outline: "none"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={containers.length <= 1}
                    style={{
                        padding: '8px',
                        color: '#EF4444',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: containers.length <= 1 ? 'not-allowed' : 'pointer',
                        opacity: containers.length <= 1 ? 0.5 : 1
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
              </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                border: '1px dashed #0F766E',
                borderRadius: '6px',
                backgroundColor: '#F0FDFA',
                color: '#0F766E',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Add Container
          </button>
      </div>
    </div>
  );
}

function BookingNumbersViewField({
  bookingNumbers,
  legacyBookingNumber,
}: {
  bookingNumbers?: BookingNumberEntry[];
  legacyBookingNumber?: string;
}) {
  const entries = bookingNumbers && bookingNumbers.length > 0
    ? bookingNumbers
    : legacyBookingNumber
      ? [{ id: "legacy", bookingNumber: legacyBookingNumber, containerNos: [] as string[] }]
      : [];

  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px",
      }}>
        Booking Numbers
      </label>
      {entries.length === 0 ? (
        <div style={{
          padding: "10px 14px",
          backgroundColor: "white",
          border: "2px dashed #E5E9F0",
          borderRadius: "6px",
          fontSize: "14px",
          color: "#9CA3AF",
        }}>
          —
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{
              padding: "10px 14px",
              backgroundColor: "#FAFBFC",
              border: "1px solid #E5E9F0",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--neuron-ink-primary)" }}>
                {entry.bookingNumber}
              </span>
              {entry.containerNos.length > 0 && (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {entry.containerNos.map((c) => (
                    <span key={c} style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 500,
                      backgroundColor: "#E8F2EE",
                      color: "#237F66",
                    }}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingNumbersEditField({
  bookingNumbers,
  legacyBookingNumber,
  containerNo,
  setEditData,
}: {
  bookingNumbers?: BookingNumberEntry[];
  legacyBookingNumber?: string;
  containerNo?: string;
  setEditData: (data: any) => void;
}) {
  // Initialize from existing data or legacy field
  const entries: BookingNumberEntry[] = bookingNumbers && bookingNumbers.length > 0
    ? bookingNumbers
    : legacyBookingNumber
      ? [{ id: crypto.randomUUID(), bookingNumber: legacyBookingNumber, containerNos: [] }]
      : [{ id: crypto.randomUUID(), bookingNumber: "", containerNos: [] }];

  // Parse container list from the booking's containerNo field
  const allContainers: string[] = (() => {
    if (!containerNo) return [];
    if (Array.isArray(containerNo)) return (containerNo as string[]).filter(Boolean);
    return containerNo.split(",").map((s: string) => s.trim()).filter(Boolean);
  })();

  const updateEntries = (newEntries: BookingNumberEntry[]) => {
    setEditData({ bookingNumbers: newEntries, bookingNumber: newEntries[0]?.bookingNumber || "" });
  };

  const addEntry = () => {
    updateEntries([...entries, { id: crypto.randomUUID(), bookingNumber: "", containerNos: [] }]);
  };

  const removeEntry = (index: number) => {
    updateEntries(entries.filter((_, i) => i !== index));
  };

  const updateValue = (index: number, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], bookingNumber: value };
    updateEntries(updated);
  };

  const toggleContainer = (entryIndex: number, container: string) => {
    const updated = entries.map((entry, i) => {
      if (i === entryIndex) {
        const has = entry.containerNos.includes(container);
        return { ...entry, containerNos: has ? entry.containerNos.filter(c => c !== container) : [...entry.containerNos, container] };
      }
      return { ...entry, containerNos: entry.containerNos.filter(c => c !== container) };
    });
    updateEntries(updated);
  };

  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px",
      }}>
        Booking Numbers
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {entries.map((entry, idx) => (
          <div key={entry.id} style={{
            border: "1px solid var(--neuron-ui-border, #E5E9F0)",
            borderRadius: "8px",
            padding: "12px",
            backgroundColor: "#FAFBFC",
          }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: allContainers.length > 0 ? "10px" : 0 }}>
              <input
                type="text"
                value={entry.bookingNumber}
                onChange={(e) => updateValue(idx, e.target.value)}
                placeholder={`Booking number #${idx + 1}`}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid var(--neuron-ui-border, #E5E9F0)",
                  borderRadius: "6px",
                  color: "var(--neuron-ink-primary)",
                  backgroundColor: "white",
                  outline: "none",
                  minHeight: "42px",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border, #E5E9F0)"; }}
              />
              <button
                type="button"
                onClick={() => removeEntry(idx)}
                disabled={entries.length <= 1}
                style={{
                  padding: "8px",
                  color: "#EF4444",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: entries.length <= 1 ? "not-allowed" : "pointer",
                  opacity: entries.length <= 1 ? 0.3 : 1,
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
            {allContainers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {allContainers.map((c) => {
                  const isChecked = entry.containerNos.includes(c);
                  return (
                    <label
                      key={c}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        border: isChecked ? "1px solid #0F766E" : "1px solid #E5E9F0",
                        backgroundColor: isChecked ? "#F0FDFA" : "white",
                        color: isChecked ? "#0F766E" : "#667085",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleContainer(idx, c)}
                        style={{ display: "none" }}
                      />
                      {isChecked && <Check size={12} />}
                      {c}
                    </label>
                  );
                })}
              </div>
            )}
            {allContainers.length === 0 && (
              <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>
                No containers on this booking
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addEntry}
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
          <Plus size={14} /> Add Booking Number
        </button>
      </div>
    </div>
  );
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

/** Compute volume summary from containers: "2x40'HC" */
function computeVolumeSummary(containerNo: string, volume: string): string {
  if (!containerNo && !volume) return "\u2014";
  let containerCount = 1;
  if (containerNo) {
    const containers = Array.isArray(containerNo) 
      ? containerNo 
      : containerNo.split(',').map((s: string) => s.trim()).filter(Boolean);
    containerCount = Math.max(containers.length, 1);
  }
  if (!volume) return "\u2014";
  if (volume.trim() === "LCL") return "LCL";
  return `${containerCount}x${volume}`;
}

// Booking Information Tab Component
// Fields that live on the segment, not the booking
const SEGMENT_FIELDS = new Set([
  // Client / Parties
  "customerName", "consignee", "shipper", "commodity", "volume",
  "containerNo", "sealNo", "grossWeight",
  // Route
  "origin", "pod", "destination",
  // Vessel / VOY
  "vesselVoyage", "shippingLine",
  "etd", "etdTime", "atd", "atdTime", "eta", "etaTime", "vesselStatus",
  "lctEdArrastre", "lctEdArrastreTime", "lctCargo", "lctCargoTime",
  // BL
  "blNumber", "mblMawb",
  // Trucking
  "loadingAddress", "loadingSchedule",
  // Costs
  "domesticFreight", "hustlingStripping", "forkliftOperator",
  "exportDivision", "lodgmentCdsFee", "formE",
  "oceanFreight", "sealFee", "docsFee", "lssFee", "storageCost",
  "arrastre", "shutOut",
  "royaltyFee", "lona", "lalamove", "bir", "labor", "otherCharges",
  // Operational Details
  "section", "ot", "receivedDocs", "ata", "discharged",
  "storageBegins", "demBegins", "entryNumber", "shippingLineStatus",
  "registryNo", "selectivity", "ticket", "rcvdBilling",
  "finalTaxNavValue", "stowage", "gatepass",
  // Approval / Sign-off
  "preparedBy", "checkedBy", "approvedBy",
  // Assignment
  "accountOwner", "accountHandler",
  // Notes
  "notes",
]);

/* ── Section card wrapper (top-level to preserve React identity across renders) ── */
function SectionCard({ title, children, lastUpdated }: { title: string; children: React.ReactNode; lastUpdated?: string }) {
  return (
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
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h3 style={{
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "#0F766E",
          margin: 0
        }}>
          {title}
        </h3>
        {lastUpdated && (
          <span style={{ fontSize: "12px", color: "#667085" }}>
            {lastUpdated}
          </span>
        )}
      </div>
      <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gap: "20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function BookingInformationTab({
  booking,
  onBookingUpdated,
  addActivity,
  setEditedBooking,
  isEditing,
  editData,
  setEditData,
  handleSave,
  handleCancel,
  isSaving,
  projects,
  activeSegment,
  segmentEditData,
  setSegmentEditData,
}: {
  booking: ExportBooking;
  onBookingUpdated: () => void;
  addActivity: (fieldName: string, oldValue: string, newValue: string) => void;
  setEditedBooking: (booking: ExportBooking) => void;
  isEditing: boolean;
  editData: Partial<ExportBooking>;
  setEditData: (data: Partial<ExportBooking>) => void;
  handleSave: () => void;
  handleCancel: () => void;
  isSaving: boolean;
  projects: any[];
  activeSegment?: BookingSegment;
  segmentEditData: Record<string, any>;
  setSegmentEditData: (data: Record<string, any>) => void;
}) {
  // Capture original parent setters to avoid name conflicts with merged wrappers
  const parentSetEditData = setEditData;
  const parentSetSegmentEditData = setSegmentEditData;

  // Merge active segment fields into booking so existing field rendering works unchanged
  const mergedBooking: ExportBooking = activeSegment
    ? { ...booking, ...activeSegment } as ExportBooking
    : booking;

  // Merge editData: combine booking-level edits + segment-level edits
  const mergedEditData: Partial<ExportBooking> = { ...editData, ...segmentEditData } as any;

  // Intercept setEditData to route segment fields to segmentEditData
  const mergedSetEditData = (data: Partial<ExportBooking>) => {
    const bookingUpdates: Partial<ExportBooking> = { ...editData };
    const segUpdates: Record<string, any> = { ...segmentEditData };
    let hasBookingChange = false;
    let hasSegChange = false;
    for (const [key, val] of Object.entries(data)) {
      if (SEGMENT_FIELDS.has(key)) {
        segUpdates[key] = val;
        hasSegChange = true;
      } else {
        (bookingUpdates as any)[key] = val;
        hasBookingChange = true;
      }
    }
    if (hasBookingChange) parentSetEditData(bookingUpdates);
    if (hasSegChange) parentSetSegmentEditData(segUpdates);
  };

  // Helper: get field value — reads from segment for segment-level fields
  const getFieldValue = (field: string): any => {
    if (SEGMENT_FIELDS.has(field)) {
      if (isEditing && field in segmentEditData) return segmentEditData[field];
      return (activeSegment as any)?.[field] ?? (mergedBooking as any)[field] ?? "";
    }
    if (isEditing && field in mergedEditData) return (mergedEditData as any)[field];
    return (mergedBooking as any)[field] ?? "";
  };

  // Helper: set field value — routes to segment or booking edit data
  const setFieldValue = (field: string, value: any) => {
    if (SEGMENT_FIELDS.has(field)) {
      parentSetSegmentEditData({ ...segmentEditData, [field]: value });
    } else {
      parentSetEditData({ ...editData, [field]: value });
    }
  };

  // Split Gatepass into Date and Time
  const [gatepassDate, setGatepassDate] = useState("");
  const [gatepassDateError, setGatepassDateError] = useState("");
  const [gatepassTime, setGatepassTime] = useState("");

  // Dropdown visibility states
  const [showShippingLineDD, setShowShippingLineDD] = useState(false);
  const [showContainerSizeDD, setShowContainerSizeDD] = useState(false);
  const [showContainerTypeDD, setShowContainerTypeDD] = useState(false);
  const [showSelectivityDD, setShowSelectivityDD] = useState(false);
  const [showVesselStatusDD, setShowVesselStatusDD] = useState(false);
  const [showGrossWeightUnitDD, setShowGrossWeightUnitDD] = useState(false);
  const [showSectionDD, setShowSectionDD] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [shippingLineSearch, setShippingLineSearch] = useState("");

  // Date+Time split states
  const splitDateTime = (val: string | undefined): { date: string; time: string } => {
    if (!val) return { date: "", time: "" };
    const parts = val.split(' ');
    return { date: parts[0] || "", time: parts[1] || "" };
  };

  const getFieldVal = (fieldName: string) => {
    if (isEditing && (mergedEditData as any)[fieldName] !== undefined) return (mergedEditData as any)[fieldName] || "";
    return (mergedBooking as any)[fieldName] || "";
  };

  // Auto-calc helpers
  const [storageManualOverride, setStorageManualOverride] = useState(false);
  const [demManualOverride, setDemManualOverride] = useState(false);

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

  const combineDateTime = (d: string, t: string) => {
    if (!d) return "";
    return t ? `${d} ${t}` : d;
  };

  // Parse gatepass
  useEffect(() => {
    const currentVal = isEditing
      ? (mergedEditData as any).gatepass
      : (mergedBooking as any).gatepass;

    if (currentVal) {
      const parts = currentVal.split(' ');
      setGatepassDate(parts[0] || "");
      setGatepassTime(parts.length > 1 ? parts[1] : "");
    } else {
      setGatepassDate("");
      setGatepassTime("");
    }
  }, [isEditing, mergedBooking, (mergedEditData as any).gatepass]);

  // Reset overrides when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setStorageManualOverride(false);
      setDemManualOverride(false);
    }
  }, [isEditing]);

  const handleGatepassDateChange = (val: string) => {
    const formatted = formatDateInput(val);
    setGatepassDate(formatted);
    if (formatted.length === 10) {
      setGatepassDateError(validateDate(formatted) ? "" : "Invalid date");
    } else {
      setGatepassDateError("");
    }
    mergedSetEditData({ gatepass: combineDateTime(formatted, gatepassTime) } as any);
  };

  const handleGatepassTimeChange = (val: string) => {
    setGatepassTime(val);
    mergedSetEditData({ gatepass: combineDateTime(gatepassDate, val) } as any);
  };

  // Reusable date+time edit field
  const renderDateTimeEditField = (
    fieldName: string,
    label: string,
    onDateChangeExtra?: (formatted: string) => void
  ) => {
    const currentVal = getFieldVal(fieldName);
    const { date: dVal, time: tVal } = splitDateTime(currentVal);
    
    if (!isEditing) {
      const isEmpty = !currentVal || currentVal.trim() === "";
      return (
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
            {label}
          </label>
          <div style={{
            padding: "10px 14px",
            backgroundColor: isEmpty ? "white" : "#F9FAFB",
            border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
            minHeight: "42px",
            display: "flex",
            alignItems: "center"
          }}>
            {isEmpty ? "\u2014" : currentVal}
          </div>
        </div>
      );
    }

    // Edit mode
    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
          {label}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "6px" }}>
          <div>
            <SingleDateInput
              value={mmddToISO(dVal)}
              onChange={(iso) => {
                const formatted = isoToMMDD(iso);
                const newCombined = combineDateTime(formatted, tVal);
                mergedSetEditData({ [fieldName]: newCombined } as any);
                if (onDateChangeExtra && formatted) {
                  onDateChangeExtra(formatted);
                }
              }}
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <NeuronTimePicker
              value={tVal}
              onChange={(v) => {
                const newCombined = combineDateTime(dVal, v);
                mergedSetEditData({ [fieldName]: newCombined } as any);
              }}
              style={{ padding: "9px 28px 9px 8px", fontSize: "13px" }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Discharged change handler with auto-calc
  const handleDischargedChange = (formatted: string) => {
    const currentDischarged = getFieldVal("discharged");
    const { time: dTime } = splitDateTime(currentDischarged);

    if (!storageManualOverride) {
      const storageDateVal = addDaysToDate(formatted, 5);
      if (storageDateVal) {
        mergedSetEditData({
          discharged: combineDateTime(formatted, dTime),
          storageBegins: combineDateTime(storageDateVal, dTime),
        } as any);
      }
    }
    if (!demManualOverride) {
      const demDateVal = addDaysToDate(formatted, 14);
      if (demDateVal) {
        const updates: any = { discharged: combineDateTime(formatted, dTime) };
        if (!storageManualOverride) {
          updates.storageBegins = combineDateTime(addDaysToDate(formatted, 5), dTime);
        }
        updates.demBegins = combineDateTime(demDateVal, dTime);
        mergedSetEditData(updates);
      }
    }
  };

  // Reusable Neuron dropdown for edit mode
  const renderEditDropdown = (
    fieldName: string,
    label: string,
    options: string[],
    isOpenState: boolean,
    setIsOpenState: (v: boolean) => void,
    renderOption?: (option: string) => React.ReactNode,
    searchable?: boolean,
    searchValue?: string,
    setSearchValue?: (v: string) => void
  ) => {
    const currentVal = getFieldVal(fieldName);
    const filteredOptions = searchable && searchValue
      ? options.filter(opt => opt.toLowerCase().includes(searchValue.toLowerCase()))
      : options;
    
    if (!isEditing) {
      // View mode - special display for selectivity
      if (fieldName === "selectivity" && currentVal && SELECTIVITY_COLORS[currentVal]) {
        const colors = SELECTIVITY_COLORS[currentVal];
        return (
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
              {label}
            </label>
            <div style={{
              padding: "10px 14px",
              backgroundColor: colors.bg,
              border: `1px solid ${colors.dot}30`,
              borderRadius: "6px",
              fontSize: "14px",
              color: colors.text,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "42px"
            }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: colors.dot }} />
              {currentVal}
            </div>
          </div>
        );
      }
      
      const isEmpty = !currentVal || currentVal.trim() === "";
      return (
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
            {label}
          </label>
          <div style={{
            padding: "10px 14px",
            backgroundColor: isEmpty ? "white" : "#F9FAFB",
            border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
            minHeight: "42px",
            display: "flex",
            alignItems: "center"
          }}>
            {isEmpty ? "\u2014" : currentVal}
          </div>
        </div>
      );
    }
    
    // Edit mode dropdown
    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
          {label}
        </label>
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setIsOpenState(!isOpenState)}
            onBlur={() => setTimeout(() => setIsOpenState(false), 200)}
            tabIndex={0}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "14px",
              border: "1px solid #0F766E",
              borderRadius: "6px",
              color: currentVal ? "#111827" : "#9CA3AF",
              fontWeight: currentVal ? 500 : 400,
              backgroundColor: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              outline: "none",
              minHeight: "42px"
            }}
          >
            {renderOption && currentVal ? renderOption(currentVal) : (currentVal || `Select ${label.toLowerCase()}...`)}
            <ChevronDown size={16} color="#667085" style={{ transform: isOpenState ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
          </div>
          {isOpenState && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "white",
              border: "1.5px solid #E5E9F0",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              zIndex: 50,
              maxHeight: "300px",
              overflowY: "auto"
            }}>
              {searchable && setSearchValue && (
                <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
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
                    mergedSetEditData({ [fieldName]: option } as any);
                    setIsOpenState(false);
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
                    background: currentVal === option ? "#F0FDF4" : "transparent",
                    borderBottom: index < filteredOptions.length - 1 ? "1px solid #E5E9F0" : "none",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => { if (currentVal !== option) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { if (currentVal !== option) e.currentTarget.style.background = "transparent"; }}
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
      </div>
    );
  };

  // Selectivity option renderer
  const renderSelectivityOption = (option: string) => {
    const colors = SELECTIVITY_COLORS[option];
    if (!colors) return <>{option}</>;
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: colors.dot, flexShrink: 0 }} />
        <span style={{ color: colors.text, fontWeight: 500 }}>{option}</span>
      </span>
    );
  };

  // Section dropdown (searchable) for both view and edit mode
  const renderSectionDropdown = () => {
    const currentVal = getFieldVal("section");

    if (!isEditing) {
      const isEmpty = !currentVal || currentVal.trim() === "";
      return (
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
            Section
          </label>
          <div style={{
            padding: "10px 14px",
            backgroundColor: isEmpty ? "white" : "#F9FAFB",
            border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
            minHeight: "42px",
            display: "flex",
            alignItems: "center"
          }}>
            {isEmpty ? "\u2014" : currentVal}
          </div>
        </div>
      );
    }

    const filtered = SECTION_OPTIONS.filter(opt => opt.toLowerCase().includes(sectionSearch.toLowerCase()));

    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
          Section
        </label>
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setShowSectionDD(!showSectionDD)}
            onBlur={() => setTimeout(() => setShowSectionDD(false), 200)}
            tabIndex={0}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "14px",
              border: "1px solid #0F766E",
              borderRadius: "6px",
              color: currentVal ? "#111827" : "#9CA3AF",
              fontWeight: currentVal ? 500 : 400,
              backgroundColor: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              outline: "none",
              minHeight: "42px"
            }}
          >
            {currentVal || "Select section..."}
            <ChevronDown size={16} color="#667085" style={{ transform: showSectionDD ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
          </div>
          {showSectionDD && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "white",
              border: "1.5px solid #E5E9F0",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              zIndex: 50,
              maxHeight: "300px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0" }}>
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
                {filtered.map((option, index) => (
                  <div
                    key={option}
                    onClick={() => {
                      mergedSetEditData({ section: option } as any);
                      setShowSectionDD(false);
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
                      background: currentVal === option ? "#F0FDF4" : "transparent",
                      borderBottom: index < filtered.length - 1 ? "1px solid #E5E9F0" : "none",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => { if (currentVal !== option) e.currentTarget.style.background = "#F9FAFB"; }}
                    onMouseLeave={(e) => { if (currentVal !== option) e.currentTarget.style.background = "transparent"; }}
                  >
                    {option}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: "10px 14px", fontSize: "13px", color: "#9CA3AF" }}>
                    No matching sections
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Volume view display (computed summary)
  const renderVolumeView = () => {
    const vol = getFieldVal("volume");
    const containerNo = getFieldVal("containerNo");
    const summary = computeVolumeSummary(containerNo, vol);
    const isEmpty = summary === "\u2014";
    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
          Volume
        </label>
        <div style={{
          padding: "10px 14px",
          backgroundColor: isEmpty ? "white" : "#F9FAFB",
          border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
          borderRadius: "6px",
          fontSize: "14px",
          color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
          minHeight: "42px",
          display: "flex",
          alignItems: "center"
        }}>
          {isEmpty ? "\u2014" : summary}
        </div>
      </div>
    );
  };

  // Gross Weight field
  const renderGrossWeightField = () => {
    const currentVal = getFieldVal("grossWeight");
    
    if (!isEditing) {
      const isEmpty = !currentVal || currentVal.trim() === "";
      return (
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
            Gross Weight
          </label>
          <div style={{
            padding: "10px 14px",
            backgroundColor: isEmpty ? "white" : "#F9FAFB",
            border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
            minHeight: "42px",
            display: "flex",
            alignItems: "center"
          }}>
            {isEmpty ? "\u2014" : currentVal}
          </div>
        </div>
      );
    }
    
    const parseGrossWeight = (val: string): { value: string; unit: string } => {
      if (!val) return { value: "", unit: "kg" };
      const parts = val.trim().split(/\s+/);
      if (parts.length >= 2) {
        return { value: parts[0], unit: parts[1] };
      }
      return { value: parts[0] || "", unit: "kg" };
    };
    
    const parsed = parseGrossWeight(currentVal);
    
    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
          Gross Weight
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={parsed.value}
            onChange={(e) => {
              const numVal = e.target.value.replace(/[^0-9.]/g, '');
              mergedSetEditData({ grossWeight: numVal ? `${numVal} ${parsed.unit}` : "" } as any);
            }}
            placeholder="0.00"
            style={{
              flex: 1,
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #0F766E",
              borderRadius: "6px",
              color: "var(--neuron-ink-primary)",
              backgroundColor: "white",
              outline: "none",
              height: "42px"
            }}
          />
          <div style={{ position: "relative", width: "80px" }}>
            <div
              onClick={() => setShowGrossWeightUnitDD(!showGrossWeightUnitDD)}
              onBlur={() => setTimeout(() => setShowGrossWeightUnitDD(false), 200)}
              tabIndex={0}
              style={{
                padding: "10px 8px",
                fontSize: "14px",
                border: "1px solid #0F766E",
                borderRadius: "6px",
                color: "#111827",
                fontWeight: 500,
                backgroundColor: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                outline: "none",
                height: "42px"
              }}
            >
              {parsed.unit}
              <ChevronDown size={14} color="#667085" style={{ transform: showGrossWeightUnitDD ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
            {showGrossWeightUnitDD && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "white",
                border: "1.5px solid #E5E9F0",
                borderRadius: "8px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                zIndex: 50
              }}>
                {GROSS_WEIGHT_UNITS.map((unit, index) => (
                  <div
                    key={unit}
                    onClick={() => {
                      mergedSetEditData({ grossWeight: parsed.value ? `${parsed.value} ${unit}` : "" } as any);
                      setShowGrossWeightUnitDD(false);
                    }}
                    style={{
                      padding: "8px 10px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      color: "#111827",
                      background: parsed.unit === unit ? "#F0FDF4" : "transparent",
                      borderBottom: index < GROSS_WEIGHT_UNITS.length - 1 ? "1px solid #E5E9F0" : "none"
                    }}
                    onMouseEnter={(e) => { if (parsed.unit !== unit) e.currentTarget.style.background = "#F9FAFB"; }}
                    onMouseLeave={(e) => { if (parsed.unit !== unit) e.currentTarget.style.background = "transparent"; }}
                  >
                    {unit}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const twoCol = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" } as React.CSSProperties;
  const threeCol = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" } as React.CSSProperties;

  return (
    <div style={{ 
      padding: "32px 48px",
      maxWidth: "1400px",
      margin: "0 auto"
    }}>
      
      {/* ═══════════════ SHIPMENT DETAILS ═══════════════ */}
      <SectionCard title="Shipment Details" lastUpdated={`Last updated by System, ${new Date(mergedBooking.updatedAt).toLocaleString()}`}>
        {/* Row 1: Date + Company/Contact */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <EditableField
            fieldName="date"
            label="Date"
            value={mergedBooking.date || ""}
            type="date"
            status={mergedBooking.status}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <div>
            <CompanyContactSelector
              companyId={((isEditing && (mergedEditData as any).clientId !== undefined) ? (mergedEditData as any).clientId : (mergedBooking as any).clientId) || ""}
              contactId={((isEditing && (mergedEditData as any).contactId !== undefined) ? (mergedEditData as any).contactId : (mergedBooking as any).contactId) || ""}
              disabled={!isEditing}
              showContact={true}
              showLabels={true}
              companyLabel="Shipper"
              contactLabel="Client"
              onSelect={({ company, contact }) => {
                const updates: any = {};
                const cName = company ? (company.name || company.company_name || "") : "";
                updates.companyName = cName;
                updates.shipper = cName;
                if (company) {
                  updates.clientId = company.id;
                } else {
                  updates.clientId = "";
                }
                if (contact) {
                  updates.contactId = contact.id;
                  updates.contactPersonName = contact.name;
                  updates.customerName = contact.name;
                } else {
                  updates.contactId = "";
                  updates.contactPersonName = "";
                  updates.customerName = cName;
                }
                mergedSetEditData(updates as any);
              }}
            />
          </div>
        </div>

        {/* Row 2: Container No. + Seal No. | Volume */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          <ContainerListField
            fieldName="containerNo"
            label="Container No."
            value={(mergedBooking as any).containerNo || ""}
            sealFieldName="sealNo"
            sealValue={(mergedBooking as any).sealNo || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          {isEditing ? (
            <div style={{ display: "flex", gap: "8px" }}>
              {(mergedEditData as any).__containerType !== "LCL" && (
                <div style={{ flex: 1 }}>
                  {renderEditDropdown(
                    "__containerSize" as any, "Size", [...CONTAINER_SIZE_OPTIONS],
                    showContainerSizeDD, setShowContainerSizeDD
                  )}
                </div>
              )}
              <div style={{ flex: 1 }}>
                {renderEditDropdown(
                  "__containerType" as any, "Type", [...CONTAINER_TYPE_OPTIONS],
                  showContainerTypeDD, setShowContainerTypeDD
                )}
              </div>
            </div>
          ) : (
            renderVolumeView()
          )}
        </div>

        {/* Row 3: Commodity | BL Number */}
        <div style={twoCol}>
          <EditableField
            fieldName="commodity"
            label="Commodity"
            value={(mergedBooking as any).commodity || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="blNumber"
            label="BL Number"
            value={(mergedBooking as any).blNumber || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>

        {/* Row 4: Shipping Line */}
        <div style={twoCol}>
          {renderEditDropdown("shippingLine", "Shipping Line", SHIPPING_LINE_OPTIONS, showShippingLineDD, setShowShippingLineDD, undefined, true, shippingLineSearch, setShippingLineSearch)}
          <div />
        </div>

        {/* Row 4b: Booking Numbers */}
        {isEditing ? (
          <BookingNumbersEditField
            bookingNumbers={(mergedEditData as any).bookingNumbers ?? (mergedBooking as any).bookingNumbers}
            legacyBookingNumber={(mergedBooking as any).bookingNumber}
            containerNo={(mergedEditData as any).containerNo ?? (mergedBooking as any).containerNo}
            setEditData={mergedSetEditData}
          />
        ) : (
          <BookingNumbersViewField
            bookingNumbers={(mergedBooking as any).bookingNumbers}
            legacyBookingNumber={(mergedBooking as any).bookingNumber}
          />
        )}

        {/* Row 5: POL + POD */}
        <div style={twoCol}>
          <EditableField
            fieldName="origin"
            label="POL (Port of Loading)"
            value={(mergedBooking as any).origin || ""}
            type="select"
            options={["Manila North", "Manila South", "CDO", "Iloilo", "Davao"]}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <PodEditableField
            label="POD (Port of Destination)"
            value={(mergedBooking as any).pod || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
      </SectionCard>

      {/* ═══════════════ VESSEL/VOY DETAILS ═══════════════ */}
      <SectionCard title="Vessel/VOY Details">
        {/* Row 1: Vessel/VOY + Vessel Status */}
        <div style={twoCol}>
          <EditableField
            fieldName="vesselVoyage"
            label="Vessel/VOY"
            value={(mergedBooking as any).vesselVoyage || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          {renderEditDropdown("vesselStatus", "Vessel Status", ["VESSEL IS OPEN", "VESSEL IS NOT OPEN"], showVesselStatusDD, setShowVesselStatusDD)}
        </div>

        {/* Row 2: ETD + ATD + ETA */}
        <div style={threeCol}>
          {renderDateTimeEditField("etd", "ETD")}
          {renderDateTimeEditField("atd", "ATD")}
          {renderDateTimeEditField("eta", "ETA")}
        </div>

        {/* Row 3: LCT ED/Arrastre + LCT Cargo */}
        <div style={twoCol}>
          {renderDateTimeEditField("lctEdArrastre", "LCT ED/Arrastre")}
          {renderDateTimeEditField("lctCargo", "LCT Cargo")}
        </div>
      </SectionCard>

      {/* ═══════════════ TRUCKING ═══════════════ */}
      <SectionCard title="Trucking">
        <div style={twoCol}>
          <EditableField
            fieldName="loadingAddress"
            label="Loading Address"
            value={(mergedBooking as any).loadingAddress || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          {(() => {
            const schedVal = (mergedBooking as any).loadingSchedule || "";
            if (!isEditing) {
              const isEmpty = !schedVal;
              return (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                    Loading Schedule
                  </label>
                  <div style={{
                    padding: "10px 14px",
                    backgroundColor: isEmpty ? "white" : "#F9FAFB",
                    border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
                    minHeight: "42px",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    {isEmpty ? "—" : isoToMMDD(schedVal)}
                  </div>
                </div>
              );
            }
            return (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                  Loading Schedule
                </label>
                <SingleDateInput
                  value={mmddToISO((mergedEditData as any).loadingSchedule ?? schedVal)}
                  onChange={(iso) => {
                    mergedSetEditData({ loadingSchedule: isoToMMDD(iso) } as any);
                  }}
                  placeholder="MM/DD/YYYY"
                />
              </div>
            );
          })()}
        </div>
      </SectionCard>

      {/* ═══════════════ DOMESTIC COST ═══════════════ */}
      <SectionCard title="Domestic Cost">
        <div style={threeCol}>
          <EditableField
            fieldName="domesticFreight"
            label="Domestic Freight"
            value={(mergedBooking as any).domesticFreight || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="hustlingStripping"
            label="Hustling/Stripping"
            value={(mergedBooking as any).hustlingStripping || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="forkliftOperator"
            label="Forklift Operator"
            value={(mergedBooking as any).forkliftOperator || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
      </SectionCard>

      {/* ═══════════════ CUSTOMS PROCESSING ═══════════════ */}
      <SectionCard title="Customs Processing">
        <div style={threeCol}>
          <EditableField
            fieldName="exportDivision"
            label="Export Division"
            value={(mergedBooking as any).exportDivision || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="lodgmentCdsFee"
            label="Lodgment/CDS Fee"
            value={(mergedBooking as any).lodgmentCdsFee || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="formE"
            label="Form E"
            value={(mergedBooking as any).formE || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
      </SectionCard>

      {/* ═══════════════ SHIPPING LINE COST ═══════════════ */}
      <SectionCard title="Shipping Line Cost">
        {/* Row 1: Ocean Freight + Seal Fee */}
        <div style={twoCol}>
          <EditableField
            fieldName="oceanFreight"
            label="Ocean Freight"
            value={(mergedBooking as any).oceanFreight || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="sealFee"
            label="Seal Fee"
            value={(mergedBooking as any).sealFee || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
        {/* Row 2: Docs Fee + LSS Fee + Storage */}
        <div style={threeCol}>
          <EditableField
            fieldName="docsFee"
            label="Docs Fee"
            value={(mergedBooking as any).docsFee || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="lssFee"
            label="LSS Fee"
            value={(mergedBooking as any).lssFee || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="storageCost"
            label="Storage"
            value={(mergedBooking as any).storageCost || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
      </SectionCard>

      {/* ═══════════════ PORT CHARGES COST ═══════════════ */}
      <SectionCard title="Port Charges Cost">
        <div style={twoCol}>
          <EditableField
            fieldName="arrastre"
            label="Arrastre"
            value={(mergedBooking as any).arrastre || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="shutOut"
            label="Shut Out"
            value={(mergedBooking as any).shutOut || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
      </SectionCard>

      {/* ═══════════════ MISCELLANEOUS COST ═══════════════ */}
      <SectionCard title="Miscellaneous Cost">
        {/* Row 1: Royalty Fee + Lona + Lalamove */}
        <div style={threeCol}>
          <EditableField
            fieldName="royaltyFee"
            label="Royalty Fee"
            value={(mergedBooking as any).royaltyFee || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="lona"
            label="Lona"
            value={(mergedBooking as any).lona || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="lalamove"
            label="Lalamove"
            value={(mergedBooking as any).lalamove || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
        {/* Row 2: BIR + Labor + Other Charges */}
        <div style={threeCol}>
          <EditableField
            fieldName="bir"
            label="BIR"
            value={(mergedBooking as any).bir || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="labor"
            label="Labor"
            value={(mergedBooking as any).labor || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
          <EditableField
            fieldName="otherCharges"
            label="Other Charges"
            value={(mergedBooking as any).otherCharges || ""}
            status={mergedBooking.status as ExecutionStatus}
            isEditing={isEditing}
            editData={mergedEditData}
            setEditData={mergedSetEditData}
          />
        </div>
      </SectionCard>

      {/* Notes Section */}
      <NotesSection
        value={getFieldVal("notes")}
        onChange={(val) => mergedSetEditData({ notes: val } as any)}
        disabled={!isEditing}
      />

    </div>
  );
}
