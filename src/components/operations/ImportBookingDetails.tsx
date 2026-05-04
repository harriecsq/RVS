import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, MoreVertical, Lock, ChevronRight, Trash2, Plus, ChevronDown } from "lucide-react";
import type { BrokerageBooking } from "../../types/operations";
import { BillingsSubTabs } from "./shared/BillingsSubTabs";
import { ExpensesSubTabs } from "./shared/ExpensesSubTabs";
import { TruckingTab } from "./shared/TruckingTab";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import { DocsTimelineStepper, DocsTimelineStep } from "./shared/DocsTimelineStepper";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { StandardButton } from "../design-system/StandardButton";
import { StandardTabs } from "../design-system/StandardTabs";
import { DateInput } from "../ui/DateInput";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { toast } from "../ui/toast-utils";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import { TabRowActions } from "../shared/TabRowActions";
import { SubTabRow } from "./shared/SubTabRow";
import { ShipmentMilestonesTab } from "./shared/ShipmentMilestonesTab";
import type { ShipmentMilestonesTabHandle } from "./shared/ShipmentMilestonesTab";
import type { ShipmentEvent } from "../../types/operations";
import { SHIPPING_LINE_OPTIONS, CONTAINER_SIZE_OPTIONS, CONTAINER_TYPE_OPTIONS, formatContainerVolume, parseContainerVolume, SECTION_OPTIONS } from "../../utils/truckingTags";
import { BookingAttachmentsTab } from "../shared/BookingAttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { StatusTagBar } from "../shared/StatusTagBar";
import { getTagByKey } from "../../utils/statusTags";
import { TagHistoryTimeline } from "../shared/TagHistoryTimeline";
import type { TagHistoryEntry } from "../../types/operations";
import { API_BASE_URL } from '@/utils/api-config';
import { DocumentViewToggle } from "../shared/document-preview/DocumentViewToggle";
import { DocumentPreviewShell } from "../shared/document-preview/DocumentPreviewShell";
import { ImportJobOrderTemplate } from "../shared/document-preview/templates/ImportJobOrderTemplate";

interface BrokerageBookingDetailsProps {
  booking: BrokerageBooking;
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
  action: "field_updated" | "created" | "note_added";
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
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


export function BrokerageBookingDetails({
  booking,
  onBack,
  onBookingUpdated,
  currentUser
}: BrokerageBookingDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("booking-info");
  const [activeBookingSubTab, setActiveBookingSubTab] = useState<"booking-details" | "shipment-milestones">("booking-details");
  const [showTimeline, setShowTimeline] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [editedBooking, setEditedBooking] = useState<BrokerageBooking>(booking);
  const [currentBooking, setCurrentBooking] = useState<BrokerageBooking>(booking);
  const [shipmentTags, setShipmentTags] = useState<string[]>([]);
  const [tagHistory, setTagHistory] = useState<TagHistoryEntry[]>([]);
  const [isTagsSaving, setIsTagsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<BrokerageBooking>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookingView, setBookingView] = useState<"form" | "pdf">("form");
  const [pdfTruckingRecords, setPdfTruckingRecords] = useState<any[]>([]);
  const [pdfBillingNumbers, setPdfBillingNumbers] = useState<string[]>([]);

  // Milestones edit state
  const milestonesRef = useRef<ShipmentMilestonesTabHandle>(null);
  const [milestonesEditing, setMilestonesEditing] = useState(false);

  // Sub-tab edit propagation state
  const [subTabHasRecord, setSubTabHasRecord] = useState<Record<string, boolean>>({});
  const [subTabEditing, setSubTabEditing] = useState(false);
  const [subTabEditRequest, setSubTabEditRequest] = useState(false);
  const [subTabSaveCounter, setSubTabSaveCounter] = useState(0);

  const getEditLabel = (): string | null => {
    switch (activeTab) {
      case "booking-info":
        return activeBookingSubTab === "shipment-milestones"
          ? "Edit Milestones"
          : "Edit Booking";
      case "trucking": return subTabHasRecord["trucking"] ? "Edit Trucking" : null;
      case "billings": return subTabHasRecord["billings"] ? "Edit Billing" : null;
      case "expenses": return subTabHasRecord["expenses"] ? "Edit Expense" : null;
      default: return null;
    }
  };

  const handleTabEdit = () => {
    if (activeTab === "booking-info") {
      if (activeBookingSubTab === "shipment-milestones") {
        setMilestonesEditing(true);
      } else {
        const parsed = parseContainerVolume((editedBooking as any).volume || "");
        setEditData({ __containerSize: parsed.size, __containerType: parsed.type } as any);
        setIsEditing(true);
      }
    } else {
      setSubTabEditRequest(true);
    }
  };

  const handleTabCancel = () => {
    if (activeTab === "booking-info") {
      if (milestonesEditing) {
        milestonesRef.current?.cancel();
        setMilestonesEditing(false);
      } else {
        handleCancel();
      }
    } else {
      setSubTabEditRequest(false);
      setSubTabEditing(false);
    }
  };

  const handleTabSave = async () => {
    if (activeTab === "booking-info") {
      if (milestonesEditing) {
        if (!milestonesRef.current) {
          toast.error("Unable to save — milestones component not ready");
          return;
        }
        setIsSaving(true);
        try {
          await milestonesRef.current.save();
          setMilestonesEditing(false);
        } catch {
          // Stay in edit mode — toast already shown by handleSaveShipmentEvents
        } finally {
          setIsSaving(false);
        }
      } else {
        handleSave();
      }
    } else {
      setSubTabSaveCounter((c: number) => c + 1);
    }
  };

  const isAnyEditing = activeTab === "booking-info" ? (isEditing || milestonesEditing) : subTabEditing;

  useEffect(() => {
    setCurrentBooking(booking);
    setEditedBooking(booking);
    setShipmentTags((booking as any).shipmentTags || []);
    setTagHistory(Array.isArray((booking as any).tagHistory) ? (booking as any).tagHistory : []);
  }, [booking]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.bookingId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (!result.success || !result.data) return;
      const refreshed = result.data as BrokerageBooking;
      setCurrentBooking(refreshed);
      setEditedBooking(refreshed);
      setShipmentTags((refreshed as any).shipmentTags || []);
      setTagHistory(Array.isArray((refreshed as any).tagHistory) ? (refreshed as any).tagHistory : []);
    } catch (error) {
      console.error("Error refreshing booking details:", error);
    }
  };

  const pendingTagsRef = useRef<string[]>(shipmentTags);
  const tagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagSaveBaseRef = useRef<string[]>(shipmentTags);

  const flushTagSave = useCallback(async (tagsToSave: string[], revertTags: string[], revertHistory: typeof tagHistory) => {
    setIsTagsSaving(true);
    try {
      const isLegacy = !(booking as any).booking_type;
      const endpoint = isLegacy
        ? `${API_BASE_URL}/import-bookings/${currentBooking.bookingId}/shipment-tags`
        : `${API_BASE_URL}/import-bookings/${currentBooking.bookingId}/shipment-tags`;
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ shipmentTags: tagsToSave, user: currentUser?.name || "Unknown" }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        const updated = result.data as BrokerageBooking;
        setCurrentBooking(updated);
        setEditedBooking(updated);
        const saved = Array.isArray((updated as any).shipmentTags) ? (updated as any).shipmentTags : [];
        setShipmentTags(saved);
        tagSaveBaseRef.current = saved;
        pendingTagsRef.current = saved;
        setTagHistory(Array.isArray((updated as any).tagHistory) ? (updated as any).tagHistory : []);
        onBookingUpdated();
      } else {
        setShipmentTags(revertTags);
        pendingTagsRef.current = revertTags;
        setTagHistory(revertHistory);
        toast.error(`Failed to update status: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating shipment tags:", error);
      setShipmentTags(revertTags);
      pendingTagsRef.current = revertTags;
      setTagHistory(revertHistory);
      toast.error("Unable to update status");
    } finally {
      setIsTagsSaving(false);
    }
  }, [booking, currentBooking.bookingId, currentUser, onBookingUpdated, tagHistory]);

  const handleShipmentTagsChange = useCallback((newTags: string[]) => {
    pendingTagsRef.current = newTags;
    setShipmentTags(newTags);
    const revertTags = tagSaveBaseRef.current;
    const revertHistory = tagHistory;
    if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current);
    tagDebounceRef.current = setTimeout(() => {
      flushTagSave(pendingTagsRef.current, revertTags, revertHistory);
    }, 400);
  }, [flushTagSave, tagHistory]);




  const handleTimelineUpdate = async (newTimeline: DocsTimelineStep[]) => {
    // Optimistic update
    const updatedBooking = { ...currentBooking, docsTimeline: newTimeline };
    setCurrentBooking(updatedBooking as any);
    
    try {
      const isLegacy = !(currentBooking as any).booking_type;
      const endpoint = isLegacy 
        ? `${API_BASE_URL}/bookings/${currentBooking.bookingId}` 
        : `${API_BASE_URL}/import-bookings/${currentBooking.bookingId}`;
      const method = isLegacy ? "PATCH" : "PUT";

      await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ docsTimeline: newTimeline })
      });
      
      onBookingUpdated();
    } catch (error) {
      console.error("Error updating timeline:", error);
      toast.error("Failed to update timeline");
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
    console.log('[BrokerageBookingDetails] Saving booking with editData:', editData);

    try {
      // Merge container size/type virtual fields back into volume
      const { __containerSize, __containerType, ...cleanEditData } = editData as any;
      if (__containerSize !== undefined || __containerType !== undefined) {
        const size = __containerSize ?? parseContainerVolume((editedBooking as any).volume || "").size;
        const type = __containerType ?? parseContainerVolume((editedBooking as any).volume || "").type;
        (cleanEditData as any).volume = formatContainerVolume(size, type);
      }

      const payload = {
        ...cleanEditData,
        updatedAt: new Date().toISOString()
      };

      // 2. Call API
      // Determine if this is a legacy booking (prefix "booking:") or new (prefix "import_booking:")
      // Legacy bookings don't have booking_type set (fetched from generic /bookings endpoint without mapping)
      const isLegacy = !(booking as any).booking_type;
      
      const endpoint = isLegacy 
        ? `${API_BASE_URL}/bookings/${booking.bookingId}` 
        : `${API_BASE_URL}/import-bookings/${booking.bookingId}`;
      
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

      // 3. Update local state on success
      // Merge editData with original booking
      const updatedBooking = { ...editedBooking, ...editData, updatedAt: payload.updatedAt };
      
      // Track changes for activity log
      Object.keys(editData).forEach(key => {
        const oldValue = String((editedBooking as any)[key] || "");
        const newValue = String((editData as any)[key] || "");
        if (oldValue !== newValue) {
          addActivity(key, oldValue, newValue);
        }
      });

      setEditedBooking(updatedBooking as BrokerageBooking);
      setIsEditing(false);
      setEditData({});
      toast.success("Booking saved successfully");
      
      // Call parent update handler
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
  };

  const handleDeleteBooking = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/import-bookings/${booking.bookingId}`, {
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
      onBookingUpdated(); // Refresh the list
      onBack(); // Go back to list view
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("An error occurred while deleting the booking");
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveShipmentEvents = async (events: ShipmentEvent[]) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/import-bookings/${currentBooking.bookingId}/shipment-events`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            shipmentEvents: events,
            user: currentUser?.name || "Unknown",
          }),
        },
      );
      const result = await response.json();
      if (result.success) {
        setCurrentBooking(result.data);
        toast.success("Shipment milestones saved");
        onBookingUpdated();
      } else {
        toast.error(`Failed to save: ${result.error || "Unknown error"}`);
        throw new Error(result.error || "Save failed");
      }
    } catch (err) {
      console.error("Error saving shipment events:", err);
      toast.error("Unable to save shipment milestones");
      throw err;
    }
  };

  const viewToggle = (
    <DocumentViewToggle
      value={bookingView}
      onChange={(v) => {
        setBookingView(v);
        if (v === "pdf") {
          fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${currentBooking.bookingId}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          })
            .then((r) => r.json())
            .then((result) => { if (result.success && Array.isArray(result.data)) setPdfTruckingRecords(result.data); })
            .catch(() => {});
          fetch(`${API_BASE_URL}/billings?bookingId=${currentBooking.bookingId}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          })
            .then((r) => r.json())
            .then((result) => { if (result.success && Array.isArray(result.data)) setPdfBillingNumbers(result.data.map((b: any) => b.billingNumber).filter(Boolean)); })
            .catch(() => {});
        }
      }}
    />
  );

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
              const m = raw.match(/^(IMP)\s*(\d{4})-(\d*)$/);
              const yearPart = m ? m[2] : String(new Date().getFullYear());
              const num = m ? m[3] : "";
              return (
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "8px", alignItems: "end" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Prefix</span>
                    <div style={{ height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", display: "flex", alignItems: "center", color: "#12332B", backgroundColor: "#F9FAFB" }}>IMP</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Year</span>
                    <input value={yearPart} onChange={e => { const y = e.target.value.replace(/\D/g, ""); setEditData({ ...editData, bookingId: `IMP ${y}-${num}` }); }} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none", transition: "border-color 0.15s ease" }} onFocus={e => { e.currentTarget.style.borderColor = "#0F766E"; }} onBlur={e => { e.currentTarget.style.borderColor = "#E5E9F0"; }} />
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Number</span>
                    <input value={num} onChange={e => { const n = e.target.value.replace(/\D/g, ""); setEditData({ ...editData, bookingId: `IMP ${yearPart}-${n}` }); }} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none", transition: "border-color 0.15s ease" }} onFocus={e => { e.currentTarget.style.borderColor = "#0F766E"; }} onBlur={e => { e.currentTarget.style.borderColor = "#E5E9F0"; }} />
                  </div>
                </div>
              );
            })() : (
              <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
                {booking.bookingId}
                {(booking as any).companyName && booking.customerName !== (booking as any).companyName && (
                  <span> · {(booking as any).companyName}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Shipment Status Tags — editable, aligned with trucking's tag set */}
        <StatusTagBar
          bookingType="import"
          shipmentTags={shipmentTags}
          operationalTags={[]}
          onShipmentTagsChange={handleShipmentTagsChange}
          onOperationalTagsChange={() => {}}
        />
      </div>

      {/* Tabs */}
      {bookingView === "form" && (
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
            if (isEditing && tabId !== "booking-info") {
              setIsEditing(false);
            }
            if (milestonesEditing) {
              milestonesRef.current?.cancel();
              setMilestonesEditing(false);
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
      )}

      {/* Form / PDF view toggle — visible above PDF preview when in PDF mode */}
      {bookingView === "pdf" && viewToggle}

      {/* PDF View */}
      {bookingView === "pdf" && (() => {
        const uniqueVendors = [...new Set(pdfTruckingRecords.map((r) => r.truckingVendor).filter(Boolean))];
        const uniqueRates = [...new Set(pdfTruckingRecords.map((r) => r.truckingRate).filter(Boolean))];
        const truckingDisplay = uniqueVendors.join(", ");
        const truckingRateDisplay = uniqueRates.join(", ");
        const evMap: Record<string, string> = {};
        const baseEvents: ShipmentEvent[] = (currentBooking as any).shipmentEvents || [];
        for (const ev of baseEvents) {
          if (ev?.event) evMap[ev.event] = ev.dateTime || "";
        }
        // Fallbacks from booking fields if not in shipmentEvents
        if (!evMap["eta"] && currentBooking.eta) evMap["eta"] = currentBooking.eta;
        if (!evMap["ata"] && currentBooking.ata) evMap["ata"] = currentBooking.ata;
        if (!evMap["storage-begins"] && (currentBooking as any).storageBegins) evMap["storage-begins"] = (currentBooking as any).storageBegins;
        if (!evMap["dem-begins"] && (currentBooking as any).demBegins) evMap["dem-begins"] = (currentBooking as any).demBegins;
        return (
          <DocumentPreviewShell settings={null}>
            <ImportJobOrderTemplate
              data={{
                bookingId: currentBooking.bookingId,
                voucherNo: (currentBooking as any).voucherNo,
                consignee: currentBooking.consignee || currentBooking.customerName,
                rcvdBilling: evMap["rcvd-billing"],
                shippingLine: currentBooking.shippingLine,
                vesselVoyage: currentBooking.vesselVoyage,
                blNumber: currentBooking.blNumber,
                polPod: [currentBooking.origin, currentBooking.pod || currentBooking.destination].filter(Boolean).join(" / "),
                commodity: currentBooking.commodity,
                volume: currentBooking.volume,
                containerNo: currentBooking.containerNo,
                registryNo: (currentBooking as any).registryNo,
                entryNo: currentBooking.entryNumber,
                eta: evMap["eta"],
                ata: evMap["ata"],
                section: currentBooking.section,
                ot: (currentBooking as any).ot,
                dischargedDate: evMap["discharged"],
                stowage: (currentBooking as any).stowage,
                storageBegin: evMap["storage-begins"],
                demurrageBegin: evMap["dem-begins"],
                arrastre: evMap["arrastre"],
                gatepass: evMap["ready-gatepass"] || (currentBooking as any).gatepass,
                selectivity: (currentBooking as any).selectivity,
                finalTaxNavValue: (currentBooking as any).finalTaxNavValue,
                ticket: (currentBooking as any).ticket,
                trucking: truckingDisplay || (currentBooking as any).truckingCompany,
                truckingRates: truckingRateDisplay || (currentBooking as any).truckingRates,
                delivered: evMap["delivered"],
                returned: evMap["returned"],
                soaNo: pdfBillingNumbers.join(", ") || (currentBooking as any).soaNo,
                draftDocs: evMap["draft"],
                signedDocs: evMap["signed"],
                final: evMap["final"],
                forDebit: evMap["for-debit"],
                debited: evMap["debited"],
              }}
            />
          </DocumentPreviewShell>
        );
      })()}

      {/* Content with Timeline Sidebar */}
      <div style={{
        flex: 1,
        overflow: "hidden",
        display: bookingView === "pdf" ? "none" : "flex"
      }}>
        {/* Main Content */}
        <div style={{ 
          flex: showTimeline ? "0 0 65%" : "1",
          overflow: "auto",
          transition: "flex 0.3s ease"
        }}>
          <div style={{ display: activeTab === "booking-info" ? undefined : "none", height: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <SubTabRow
                tabs={[
                  { id: "booking-details", label: "Booking Details" },
                  { id: "shipment-milestones", label: "Shipment Milestones" },
                ]}
                activeTab={activeBookingSubTab}
                onTabChange={(id) => {
                  if (milestonesEditing) {
                    milestonesRef.current?.cancel();
                    setMilestonesEditing(false);
                  }
                  if (isEditing) {
                    handleCancel();
                  }
                  setActiveBookingSubTab(id as "booking-details" | "shipment-milestones");
                }}
              />
              {viewToggle}
              <div style={{ flex: 1, overflow: "auto" }}>
                {activeBookingSubTab === "booking-details" && (
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
                  />
                )}
                {activeBookingSubTab === "shipment-milestones" && (() => {
                  const baseEvents: ShipmentEvent[] = (currentBooking as any).shipmentEvents || [];
                  const existingKeys = new Set(baseEvents.map((e: ShipmentEvent) => e.event));
                  const bookingFallbacks: Array<{ key: string; field: string }> = [
                    { key: "eta", field: "eta" },
                    { key: "ata", field: "ata" },
                    { key: "storage-begins", field: "storageBegins" },
                    { key: "dem-begins", field: "demBegins" },
                  ];
                  const merged = [...baseEvents];
                  for (const { key, field } of bookingFallbacks) {
                    if (!existingKeys.has(key) && (currentBooking as any)[field]) {
                      merged.push({ event: key, dateTime: (currentBooking as any)[field], note: "" });
                    }
                  }
                  return (
                    <ShipmentMilestonesTab
                      ref={milestonesRef}
                      shipmentEvents={merged}
                      onSave={handleSaveShipmentEvents}
                      isEditing={milestonesEditing}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
          <div style={{ display: activeTab === "trucking" ? undefined : "none", height: "100%" }}>
            <TruckingTab
              bookingId={booking.bookingId}
              bookingType="import"
              currentUser={currentUser}
              onBookingTagsUpdated={fetchBookingDetails}
              externalEdit={activeTab === "trucking" ? subTabEditRequest : undefined}
              onEditStateChange={(editing: boolean) => setSubTabEditing(editing)}
              onRecordSelected={(has: boolean) => setSubTabHasRecord((prev: Record<string, boolean>) => ({ ...prev, trucking: has }))}
              externalSaveCounter={activeTab === "trucking" ? subTabSaveCounter : undefined}
            />
          </div>
          <div style={{ display: activeTab === "billings" ? undefined : "none", height: "100%" }}>
            <BillingsSubTabs
              bookingId={booking.bookingId}
              bookingNumber={booking.bookingNumber}
              bookingType="brokerage"
              currentUser={currentUser}
              externalEdit={activeTab === "billings" ? subTabEditRequest : undefined}
              onEditStateChange={(editing: boolean) => setSubTabEditing(editing)}
              onRecordSelected={(has: boolean) => setSubTabHasRecord((prev: Record<string, boolean>) => ({ ...prev, billings: has }))}
              externalSaveCounter={activeTab === "billings" ? subTabSaveCounter : undefined}
            />
          </div>
          <div style={{ display: activeTab === "expenses" ? undefined : "none", height: "100%" }}>
            <ExpensesSubTabs
              bookingId={booking.bookingId}
              bookingNumber={booking.bookingNumber}
              bookingType="brokerage"
              currentUser={currentUser}
              externalEdit={activeTab === "expenses" ? subTabEditRequest : undefined}
              onEditStateChange={(editing: boolean) => {
                setSubTabEditing(editing);
                if (!editing) setSubTabEditRequest(false);
              }}
              onRecordSelected={(has: boolean) => setSubTabHasRecord((prev: Record<string, boolean>) => ({ ...prev, expenses: has }))}
              externalSaveCounter={activeTab === "expenses" ? subTabSaveCounter : undefined}
            />
          </div>
          <div style={{ display: activeTab === "attachments" ? undefined : "none", height: "100%" }}>
            <BookingAttachmentsTab
              bookingType="import"
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
                backgroundColor: activity.action === "created" ? "#6B7280" :
                               activity.action === "field_updated" ? "#3B82F6" : "#F59E0B",
                border: "3px solid #FAFBFC"
              }} />

              {/* Activity Content */}
              <div style={{
                backgroundColor: "white",
                border: "1px solid var(--neuron-ui-border)",
                borderRadius: "6px",
                padding: "12px 16px"
              }}>
                {/* Timestamp */}
                <div style={{
                  fontSize: "12px",
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
                  fontSize: "12px",
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
        {value || "—"}
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
  isEditing?: boolean;
  editData?: Partial<BrokerageBooking>;
  setEditData?: (data: Partial<BrokerageBooking>) => void;
}

function EditableField({
  fieldName,
  label,
  value,
  type = "text",
  options = [],
  required = false,
  placeholder = "—",
  isEditing = false,
  editData = {},
  setEditData
}: EditableFieldProps) {

  // Helper to ensure date is YYYY-MM-DD for input fields
  const toInputDate = (dateVal: string | Date | undefined | null): string => {
    if (!dateVal) return "";
    try {
      // If it's already YYYY-MM-DD
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
  const rawValue = editData[fieldName as keyof BrokerageBooking] !== undefined 
    ? String(editData[fieldName as keyof BrokerageBooking] || "")
    : value;
    
  // For date inputs, ensure correct format
  // If type is date, we maintain YYYY-MM-DD internally for the DateInput value prop
  // But for View mode, we want to show MM/DD/YYYY
  const inputDateValue = type === "date" ? toInputDate(rawValue) : rawValue;
  const displayValue = type === "date" ? inputDateValue : rawValue;
  
  const isEmpty = !displayValue || displayValue.trim() === "";

  const handleChange = (newValue: string) => {
    if (setEditData) {
      setEditData({ ...editData, [fieldName]: newValue });
    }
  };

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
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#0A1D4D",
            outline: "none",
            resize: "vertical",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
        />
      ) : type === "select" ? (
        <select
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#0A1D4D",
            outline: "none",
            minHeight: "40px",
            appearance: "auto",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
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
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#0A1D4D",
            outline: "none",
            minHeight: "40px",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
        />
      )}
    </div>
  );
}

const PORT_OPTIONS = ["Manila North", "Manila South", "CDO", "Iloilo", "Davao"];

// Shared portal dropdown list — renders at document.body to escape overflow:hidden containers
function PortalDropdownList({
  anchorRef,
  open,
  onClose,
  children,
  width,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number | string;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean }>({ top: 0, left: 0, width: 0, openUp: false });
  const listRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const viewH = window.innerHeight;
    const spaceBelow = viewH - rect.bottom;
    const openUp = spaceBelow < 320 && rect.top > spaceBelow;
    setPos({
      top: openUp ? rect.top + window.scrollY : rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: typeof width === "number" ? width : rect.width,
      openUp,
    });
  }, [anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!anchorRef.current?.contains(target) && !listRef.current?.contains(target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={listRef}
      style={{
        position: "absolute",
        top: pos.top,
        transform: pos.openUp ? "translateY(calc(-100% - 8px))" : undefined,
        left: pos.left,
        width: pos.width,
        zIndex: 99999,
        background: "white",
        border: "1.5px solid #E5E9F0",
        borderRadius: "8px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        maxHeight: "300px",
        overflowY: "auto",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function PodSelectField({
  label,
  value,
  placeholder = "—",
  isEditing = false,
  editData = {},
  setEditData,
}: {
  label: string;
  value: string;
  placeholder?: string;
  isEditing?: boolean;
  editData?: Partial<BrokerageBooking>;
  setEditData?: (data: Partial<BrokerageBooking>) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const rawValue =
    (editData as any).pod !== undefined ? String((editData as any).pod || "") : value;
  const isEmpty = !rawValue || rawValue.trim() === "";

  const handleChange = (newValue: string) => {
    if (setEditData) setEditData({ ...editData, pod: newValue } as any);
  };

  if (!isEditing) {
    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
          {label}
        </label>
        <div style={{ padding: "10px 14px", backgroundColor: isEmpty ? "white" : "#F9FAFB", border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0", borderRadius: "6px", fontSize: "14px", color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)", minHeight: "40px", display: "flex", alignItems: "center" }}>
          {isEmpty ? <span style={{ color: "#9CA3AF" }}>{placeholder}</span> : rawValue}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <div
          ref={anchorRef}
          onClick={() => setOpen(!open)}
          style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #E5E9F0", borderRadius: "6px", color: rawValue ? "#111827" : "#9CA3AF", fontWeight: rawValue ? 500 : 400, backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", outline: "none", minHeight: "40px", boxSizing: "border-box" }}
        >
          {rawValue || "Select POD"}
          <ChevronDown size={16} color="#667085" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        </div>
        <PortalDropdownList anchorRef={anchorRef} open={open} onClose={() => setOpen(false)}>
          {PORT_OPTIONS.map((option, index) => (
            <div
              key={option}
              onMouseDown={(e) => { e.preventDefault(); handleChange(option); setOpen(false); }}
              style={{ padding: "10px 14px", fontSize: "14px", fontWeight: 500, cursor: "pointer", color: "#111827", display: "flex", alignItems: "center", background: rawValue === option ? "#F0FDF4" : "transparent", borderBottom: index < PORT_OPTIONS.length - 1 ? "1px solid #E5E9F0" : "none", transition: "background 0.15s ease" }}
              onMouseEnter={(e) => { if (rawValue !== option) e.currentTarget.style.background = "#F9FAFB"; }}
              onMouseLeave={(e) => { if (rawValue !== option) e.currentTarget.style.background = "transparent"; }}
            >
              {option}
            </div>
          ))}
        </PortalDropdownList>
      </div>
    </div>
  );
}

function ContainerListField({
  fieldName,
  label,
  value, // Comma separated string or array
  isEditing,
  editData,
  setEditData
}: any) {
  // Parse initial value
  const parseContainers = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
          const parsed = val.split(',').map(s => s.trim());
          // In edit mode, preserve empty strings so new rows don't disappear
          return isEditing ? parsed : parsed.filter(Boolean);
      }
      return [];
  };

  // Determine current value
  const rawValue = isEditing && editData[fieldName] !== undefined 
      ? editData[fieldName] 
      : value;
  
  const containers = parseContainers(rawValue);
  // Ensure at least one empty row if editing and list is empty
  if (containers.length === 0 && isEditing) {
      if (editData[fieldName] === undefined) {
          // If just started editing and value was empty, treat as empty array
          // We push one empty string to start
          containers.push("");
      } else if (editData[fieldName] === "") {
          // Explicitly empty string means one empty row
          containers.push("");
      }
  }

  const handleChange = (index: number, val: string) => {
      const newContainers = [...containers];
      newContainers[index] = val;
      setEditData({ ...editData, [fieldName]: newContainers.join(', ') });
  };

  const addRow = () => {
      const newContainers = [...containers, ""];
      setEditData({ ...editData, [fieldName]: newContainers.join(', ') });
  };

  const removeRow = (index: number) => {
      const newContainers = containers.filter((_, i) => i !== index);
      setEditData({ ...editData, [fieldName]: newContainers.join(', ') });
  };

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
              {label}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {containers.length > 0 ? containers.map((c, i) => (
                    <div key={i} style={{
                      padding: "10px 14px",
                      backgroundColor: "#FAFBFC",
                      border: "1px solid #E5E9F0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)"
                    }}>
                      {c}
                    </div>
                )) : (
                    <div style={{
                      padding: "10px 14px",
                      backgroundColor: "#FAFBFC",
                      border: "2px dashed #E5E9F0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "#9CA3AF"
                    }}>—</div>
                )}
            </div>
          </div>
      );
  }

  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px"
      }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {containers.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => handleChange(i, e.target.value)}
                    placeholder={`Container #${i + 1}`}
                    style={{
                      flex: 1,
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

// Selectivity color mapping
const SELECTIVITY_OPTIONS = ["Orange", "Yellow", "Red"];
const SELECTIVITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Green:  { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  Orange: { bg: "#FFF7ED", text: "#9A3412", dot: "#F97316" },
  Yellow: { bg: "#FEFCE8", text: "#854D0E", dot: "#EAB308" },
  Red:    { bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
};

const GROSS_WEIGHT_UNITS = ["kg", "lbs", "tons"];

/** Compute volume summary from containers: "2x40'HC" */
function computeVolumeSummary(containerNo: string, volume: string): string {
  if (!containerNo && !volume) return "—";
  let containerCount = 1;
  if (containerNo) {
    const containers = Array.isArray(containerNo)
      ? containerNo
      : containerNo.split(',').map((s: string) => s.trim()).filter(Boolean);
    containerCount = Math.max(containers.length, 1);
  }
  if (!volume) return "—";
  if (volume.trim() === "LCL") return "LCL";
  return `${containerCount}x${volume}`;
}

// Booking Information Tab Component
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
  projects
}: {
  booking: BrokerageBooking;
  onBookingUpdated: () => void;
  addActivity: (fieldName: string, oldValue: string, newValue: string) => void;
  setEditedBooking: (booking: BrokerageBooking) => void;
  isEditing: boolean;
  editData: Partial<BrokerageBooking>;
  setEditData: (data: Partial<BrokerageBooking>) => void;
  handleSave: () => void;
  handleCancel: () => void;
  isSaving: boolean;
  projects: any[];
}) {
  // Split Gatepass into Date and Time
  const [gatepassDate, setGatepassDate] = useState("");
  const [gatepassDateError, setGatepassDateError] = useState("");
  const [gatepassTime, setGatepassTime] = useState("");

  // Dropdown visibility states
  const [showShippingLineDD, setShowShippingLineDD] = useState(false);
  const [showShippingLineStatusDD, setShowShippingLineStatusDD] = useState(false);
  const [showContainerSizeDD, setShowContainerSizeDD] = useState(false);
  const [showContainerTypeDD, setShowContainerTypeDD] = useState(false);
  const [showSelectivityDD, setShowSelectivityDD] = useState(false);
  const [showGrossWeightUnitDD, setShowGrossWeightUnitDD] = useState(false);
  const [showStowageUnitDD, setShowStowageUnitDD] = useState(false);
  const [showSectionDD, setShowSectionDD] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [shippingLineSearch, setShippingLineSearch] = useState("");

  // Anchor refs for portal dropdowns
  const ddAnchorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const ddAnchorRef = (name: string) => (el: HTMLDivElement | null) => { ddAnchorRefs.current[name] = el; };
  const getAnchorRef = (name: string): React.RefObject<HTMLDivElement | null> => ({ current: ddAnchorRefs.current[name] ?? null });

  // Date+Time split states for ETA, ATA, Discharged, Storage Begins, DEM Begins, RCVD
  const splitDateTime = (val: string | undefined): { date: string; time: string } => {
    if (!val) return { date: "", time: "" };
    const parts = val.split(' ');
    return { date: parts[0] || "", time: parts[1] || "" };
  };

  const getFieldVal = (fieldName: string) => {
    if (isEditing && (editData as any)[fieldName] !== undefined) return (editData as any)[fieldName] || "";
    return (booking as any)[fieldName] || "";
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
      ? (editData as any).gatepass 
      : (booking as any).gatepass;
    
    if (currentVal) {
      const parts = currentVal.split(' ');
      setGatepassDate(parts[0] || "");
      setGatepassTime(parts.length > 1 ? parts[1] : "");
    } else {
      setGatepassDate("");
      setGatepassTime("");
    }
  }, [isEditing, booking, (editData as any).gatepass]);

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
    setEditData({ ...editData, gatepass: combineDateTime(formatted, gatepassTime) } as any);
  };

  const handleGatepassTimeChange = (val: string) => {
    setGatepassTime(val);
    setEditData({ ...editData, gatepass: combineDateTime(gatepassDate, val) } as any);
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
      // View mode
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
            {isEmpty ? "—" : currentVal}
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
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "8px" }}>
          <div>
            <SingleDateInput
              value={mmddToISO(dVal)}
              onChange={(iso) => {
                const formatted = isoToMMDD(iso);
                const newCombined = combineDateTime(formatted, tVal);
                setEditData({ ...editData, [fieldName]: newCombined } as any);
                if (onDateChangeExtra && formatted) {
                  onDateChangeExtra(formatted);
                }
              }}
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div>
            <NeuronTimePicker
              value={tVal}
              onChange={(v) => {
                const newCombined = combineDateTime(dVal, v);
                setEditData({ ...editData, [fieldName]: newCombined } as any);
              }}
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
        setEditData({ ...editData, 
          discharged: combineDateTime(formatted, dTime),
          storageBegins: combineDateTime(storageDateVal, dTime),
        } as any);
      }
    }
    if (!demManualOverride) {
      const demDateVal = addDaysToDate(formatted, 14);
      if (demDateVal) {
        // Merge with previous storage update
        const prevUpdates = { ...editData, discharged: combineDateTime(formatted, dTime) } as any;
        if (!storageManualOverride) {
          prevUpdates.storageBegins = combineDateTime(addDaysToDate(formatted, 5), dTime);
        }
        prevUpdates.demBegins = combineDateTime(demDateVal, dTime);
        setEditData(prevUpdates);
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
            {isEmpty ? "—" : currentVal}
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
            ref={ddAnchorRef(fieldName)}
            onClick={() => setIsOpenState(!isOpenState)}
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
          <PortalDropdownList anchorRef={getAnchorRef(fieldName)} open={isOpenState} onClose={() => setIsOpenState(false)}>
            {searchable && setSearchValue && (
              <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <input
                  type="text"
                  value={searchValue || ""}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  onMouseDown={(e) => e.stopPropagation()}
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  setEditData({ ...editData, [fieldName]: option } as any);
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
          </PortalDropdownList>
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
            {isEmpty ? "—" : currentVal}
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
            ref={ddAnchorRef("section")}
            onClick={() => setShowSectionDD(!showSectionDD)}
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
          <PortalDropdownList anchorRef={getAnchorRef("section")} open={showSectionDD} onClose={() => { setShowSectionDD(false); setSectionSearch(""); }}>
            <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white" }}>
              <input
                type="text"
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                placeholder="Search section..."
                autoFocus
                onMouseDown={(e) => e.stopPropagation()}
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
            {filtered.map((option, index) => (
              <div
                key={option}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setEditData({ ...editData, section: option } as any);
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
          </PortalDropdownList>
        </div>
      </div>
    );
  };

  // Volume view display (computed summary)
  const renderVolumeView = () => {
    const vol = getFieldVal("volume");
    const containerNo = getFieldVal("containerNo");
    const summary = computeVolumeSummary(containerNo, vol);
    const isEmpty = summary === "—";
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
          {isEmpty ? "—" : summary}
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
            {isEmpty ? "—" : currentVal}
          </div>
        </div>
      );
    }
    
    // Parse existing value like "1250 kg"
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
              setEditData({ ...editData, grossWeight: numVal ? `${numVal} ${parsed.unit}` : "" } as any);
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
              ref={ddAnchorRef("grossWeightUnit")}
              onClick={() => setShowGrossWeightUnitDD(!showGrossWeightUnitDD)}
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
            <PortalDropdownList anchorRef={getAnchorRef("grossWeightUnit")} open={showGrossWeightUnitDD} onClose={() => setShowGrossWeightUnitDD(false)} width={80}>
              {GROSS_WEIGHT_UNITS.map((unit, index) => (
                <div
                  key={unit}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEditData({ ...editData, grossWeight: parsed.value ? `${parsed.value} ${unit}` : "" } as any);
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
            </PortalDropdownList>
          </div>
        </div>
      </div>
    );
  };

  const renderStowageField = () => {
    const currentVal = getFieldVal("stowage");

    if (!isEditing) {
      const isEmpty = !currentVal || currentVal.trim() === "";
      return (
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
            Stowage
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
            {isEmpty ? "—" : currentVal}
          </div>
        </div>
      );
    }

    const parseStowage = (val: string): { value: string; unit: string } => {
      if (!val) return { value: "", unit: "kg" };
      const parts = val.trim().split(/\s+/);
      if (parts.length >= 2) return { value: parts[0], unit: parts[1] };
      return { value: parts[0] || "", unit: "kg" };
    };

    const parsed = parseStowage(currentVal);

    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
          Stowage
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={parsed.value}
            onChange={(e) => {
              const numVal = e.target.value.replace(/[^0-9.]/g, '');
              setEditData({ ...editData, stowage: numVal ? `${numVal} ${parsed.unit}` : "" } as any);
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
              ref={ddAnchorRef("stowageUnit")}
              onClick={() => setShowStowageUnitDD(!showStowageUnitDD)}
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
              <ChevronDown size={14} color="#667085" style={{ transform: showStowageUnitDD ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
            <PortalDropdownList anchorRef={getAnchorRef("stowageUnit")} open={showStowageUnitDD} onClose={() => setShowStowageUnitDD(false)} width={80}>
              {GROSS_WEIGHT_UNITS.map((unit, index) => (
                <div
                  key={unit}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEditData({ ...editData, stowage: parsed.value ? `${parsed.value} ${unit}` : "" } as any);
                    setShowStowageUnitDD(false);
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
            </PortalDropdownList>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: "32px 48px",
      maxWidth: "1400px",
      margin: "0 auto"
    }}>
      
      {/* General Information Section */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E9F0",
        overflow: "hidden",
        marginBottom: "24px"
      }}>
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #E5E9F0",
          background: "#F9FAFB",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
            General Information
          </h3>
        </div>

        <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gap: "20px" }}>
          {/* Row 1: Date, Client Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
            <EditableField
              fieldName="date"
              label="Date"
              value={booking.date || ""}
              type="date"
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            
            {/* Client / Company Selector */}
            <div style={{ gridColumn: "span 1" }}>
              <CompanyContactSelector
                companyId={((isEditing && (editData as any).clientId !== undefined) ? (editData as any).clientId : (booking as any).clientId) || ""}
                contactId={((isEditing && (editData as any).contactId !== undefined) ? (editData as any).contactId : (booking as any).contactId) || ""}
                disabled={!isEditing}
                showContact={true}
                showLabels={true}
                companyLabel="Consignee"
                contactLabel="Client"
                onSelect={({ company, contact }) => {
                  const updates = { ...editData };
                  const cName = company ? (company.name || company.company_name || "") : "";
                  updates.companyName = cName;
                  updates.consignee = cName;

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
                  setEditData(updates);
                }}
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Shipment Details Section */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E9F0",
        overflow: "hidden",
        marginBottom: "24px"
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
            Shipment Details
          </h3>
        </div>

        <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gap: "20px" }}>
          {/* Row 1: Container No., BL Number */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <ContainerListField
              fieldName="containerNo"
              label="Container No."
              value={(booking as any).containerNo || ""}
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            <EditableField
              fieldName="blNumber"
              label="BL Number"
              value={(booking as any).blNumber || ""}
              placeholder="Enter BL number..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
          </div>

          {/* Row 2: Commodity, Volume */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="commodity"
              label="Commodity"
              value={(booking as any).commodity || ""}
              placeholder="Enter commodity..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            {/* Volume: View mode = computed summary, Edit mode = size+type dropdowns */}
            {isEditing ? (
              <div style={{ display: "flex", gap: "8px" }}>
                {(editData as any).__containerType !== "LCL" && (
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

          {/* Row 3: Vessel & Voyage, Shipping Line, Shipping Line Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="vesselVoyage"
              label="Vessel & Voyage"
              value={(booking as any).vesselVoyage || ""}
              placeholder="Enter vessel & voyage..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            {/* Shipping Line - Dropdown */}
            {renderEditDropdown("shippingLine", "Shipping Line", SHIPPING_LINE_OPTIONS, showShippingLineDD, setShowShippingLineDD, undefined, true, shippingLineSearch, setShippingLineSearch)}
            {/* Shipping Line Status - Dropdown */}
            {renderEditDropdown("shippingLineStatus", "Shipping Line Status", ["No Billing Yet", "With Billing", "Done Payment"], showShippingLineStatusDD, setShowShippingLineStatusDD)}
          </div>

          {/* Row 4: POL & POD */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="origin"
              label="POL (Port of Loading)"
              value={(booking as any).origin || ""}
              placeholder="Enter POL..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            <PodSelectField
              label="POD (Port of Discharge)"
              value={(booking as any).pod || ""}
              placeholder="Select POD..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E9F0",
        overflow: "hidden"
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
            Additional Info
          </h3>
        </div>

        <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gap: "20px" }}>

          {/* Row: Section, OT */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {renderSectionDropdown()}
            <EditableField
              fieldName="ot"
              label="OT"
              value={(booking as any).ot || ""}
              placeholder="Enter OT..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
          </div>

          {/* Row: Registry No., Selectivity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="registryNo"
              label="Registry No."
              value={(booking as any).registryNo || ""}
              placeholder="Enter Registry No..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            {renderEditDropdown("selectivity", "Selectivity", SELECTIVITY_OPTIONS, showSelectivityDD, setShowSelectivityDD, renderSelectivityOption)}
          </div>

          {/* Row: Entry #, Ticket */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="entryNumber"
              label="Entry #"
              value={(booking as any).entryNumber || ""}
              placeholder="Enter entry number..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            <EditableField
              fieldName="ticket"
              label="Ticket"
              value={(booking as any).ticket || ""}
              placeholder="Enter Ticket..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
          </div>

          {/* Row: Final Tax/NAV Value, Arrastre */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="finalTaxNavValue"
              label="Final Tax/NAV Value"
              value={(booking as any).finalTaxNavValue || ""}
              placeholder="0.00"
              type="text"
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            {(() => {
              const amountVal = (editData as any).arrastreAmount !== undefined
                ? String((editData as any).arrastreAmount || "")
                : (booking as any).arrastreAmount || "";
              const isAmountEmpty = !amountVal || amountVal.trim() === "";

              if (!isEditing) {
                return (
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                      Arrastre
                    </label>
                    <div style={{
                      padding: "10px 14px",
                      backgroundColor: isAmountEmpty ? "white" : "#F9FAFB",
                      border: isAmountEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: isAmountEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
                      minHeight: "42px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      {isAmountEmpty ? "Amount —" : amountVal}
                    </div>
                  </div>
                );
              }

              return (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                    Arrastre
                  </label>
                  <input
                    type="text"
                    value={amountVal}
                    onChange={(e) => setEditData({ ...editData, arrastreAmount: e.target.value } as any)}
                    placeholder="Amount (0.00)"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid #E5E9F0",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              );
            })()}
          </div>

          {/* Row: Gross Weight, Stowage */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {renderGrossWeightField()}
            {renderStowageField()}
          </div>

        </div>
        </div>
      </div>

      {/* Notes Section */}
      <NotesSection
        value={getFieldVal("notes")}
        onChange={(val) => setEditData({ ...editData, notes: val } as any)}
        disabled={!isEditing}
      />

    </div>
  );
}
