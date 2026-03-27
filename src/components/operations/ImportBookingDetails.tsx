import { useState, useEffect } from "react";
import { ArrowLeft, MoreVertical, Lock, Edit3, Clock, ChevronRight, Trash2, Plus, ChevronDown } from "lucide-react";
import type { BrokerageBooking, ExecutionStatus } from "../../types/operations";
import { BillingsSubTabs } from "./shared/BillingsSubTabs";
import { ExpensesSubTabs } from "./shared/ExpensesSubTabs";
import { TruckingTab } from "./shared/TruckingTab";
import { ProjectSelector } from "../selectors/ProjectSelector";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import { DocsTimelineStepper, DocsTimelineStep } from "./shared/DocsTimelineStepper";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { StandardButton } from "../design-system/StandardButton";
import { StandardTabs } from "../design-system/StandardTabs";
import { DateInput } from "../ui/DateInput";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { toast } from "../ui/toast-utils";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import { ActionsDropdown } from "../shared/ActionsDropdown";
import { SHIPPING_LINE_OPTIONS, CONTAINER_SIZES, SECTION_OPTIONS } from "../../utils/truckingTags";
import { BookingAttachmentsTab } from "../shared/BookingAttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { API_BASE_URL } from '@/utils/api-config';

interface BrokerageBookingDetailsProps {
  booking: BrokerageBooking;
  onBack: () => void;
  onBookingUpdated: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

type DetailTab = "booking-info" | "trucking" | "billings" | "expenses" | "attachments";

const STATUS_COLORS: Record<ExecutionStatus, string> = {
  "Draft": "bg-gray-100 text-gray-700 border-gray-300",
  "For Approval": "bg-amber-50 text-amber-700 border-amber-300",
  "Approved": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "In Transit": "bg-blue-50 text-blue-700 border-blue-300",
  "Delivered": "bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30",
  "Completed": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "On Hold": "bg-orange-50 text-orange-700 border-orange-300",
  "Cancelled": "bg-red-50 text-red-700 border-red-300",
};

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

export function BrokerageBookingDetails({
  booking,
  onBack,
  onBookingUpdated,
  currentUser
}: BrokerageBookingDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("booking-info");
  const [showTimeline, setShowTimeline] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [editedBooking, setEditedBooking] = useState<BrokerageBooking>(booking);
  const [currentBooking, setCurrentBooking] = useState<BrokerageBooking>(booking);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<BrokerageBooking>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showShippingLineDropdown, setShowShippingLineDropdown] = useState(false);

  useEffect(() => {
    setCurrentBooking(booking);
    setEditedBooking(booking);
  }, [booking]);

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

  const isBright = (hex: string) => {
    return ["#FFFF00", "#00FFFF", "#00FF00", "#FBBC04"].includes(hex.toUpperCase());
  };

  const handleStatusChange = async (newStatus: string) => {
    setShowStatusDropdown(false);
    if (currentBooking.status === newStatus) return;

    try {
      const isLegacy = !(currentBooking as any).booking_type;
      const endpoint = isLegacy 
        ? `${API_BASE_URL}/bookings/${currentBooking.bookingId}` 
        : `${API_BASE_URL}/import-bookings/${currentBooking.bookingId}`;
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
        setCurrentBooking(updated);
        setEditedBooking(updated);
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

  const SHIPPING_LINE_STATUS_OPTIONS = ["No Billing Yet", "With Billing", "Done Payment"];

  const SHIPPING_LINE_STATUS_COLORS: Record<string, string> = {
    "No Billing Yet": "#9CA3AF",
    "With Billing": "#F59E0B",
    "Done Payment": "#10B981",
  };

  const handleShippingLineStatusChange = async (newStatus: string) => {
    setShowShippingLineDropdown(false);
    if ((currentBooking as any).shippingLineStatus === newStatus) return;

    try {
      const isLegacy = !(currentBooking as any).booking_type;
      const endpoint = isLegacy 
        ? `${API_BASE_URL}/bookings/${currentBooking.bookingId}` 
        : `${API_BASE_URL}/import-bookings/${currentBooking.bookingId}`;
      const method = isLegacy ? "PATCH" : "PUT";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ shippingLineStatus: newStatus })
      });

      if (!response.ok) throw new Error("Failed to update shipping line status");

      const result = await response.json();
      if (result.success) {
        const updated = { ...currentBooking, shippingLineStatus: newStatus };
        setCurrentBooking(updated);
        setEditedBooking(updated);
        toast.success(`Shipping line status updated to ${newStatus}`);
        onBookingUpdated();
      } else {
        throw new Error(result.error || "Failed to update shipping line status");
      }
    } catch (error) {
      console.error("Error updating shipping line status:", error);
      toast.error("Failed to update shipping line status");
    }
  };

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
      // 1. Prepare payload
      // Merge editData with original booking to ensure we have a complete object if needed, 
      // or just send updates if the backend supports PATCH-like behavior on PUT.
      // Based on server code, it likely updates existing with provided fields.
      // Let's send the specific updates.
      const payload = {
        ...editData,
        // Ensure critical fields are preserved if needed, but usually updates are enough
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
            <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
              {booking.bookingId}
              {(booking as any).companyName && booking.customerName !== (booking as any).companyName && (
                <span> · {(booking as any).companyName}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Activity Timeline Button */}
          <StandardButton
            variant={showTimeline ? "secondary" : "outline"}
            onClick={() => setShowTimeline(!showTimeline)}
            icon={<Clock size={16} />}
          >
            Activity
          </StandardButton>

          {/* Edit Booking Button - Only show on Booking Information tab when not editing */}
          {activeTab === "booking-info" && !isEditing && (
            <StandardButton
              variant="primary"
              onClick={() => setIsEditing(true)}
              icon={<Edit3 size={16} />}
            >
              Edit Booking
            </StandardButton>
          )}

          {/* Save and Cancel Buttons - Show when editing */}
          {activeTab === "booking-info" && isEditing && (
            <>
              <StandardButton
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </StandardButton>
              <StandardButton
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </StandardButton>
            </>
          )}

          {/* Actions Dropdown */}
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
        </div>
      </div>

      {/* Metadata/Summary Bar */}
      <div style={{
        backgroundColor: (() => {
           const color = IMPORT_STATUS_COLORS[currentBooking.status];
           if (!color) return "#F3F4F6"; 
           const opacity = isBright(color) ? 0.08 : 0.12;
           return hexToRgba(color, opacity);
        })(),
        transition: "background-color 0.2s ease",
        borderBottom: "1.5px solid #0F766E",
        padding: "14px 48px",
        display: "flex",
        alignItems: "stretch",
        gap: "0",
        flexShrink: 0,
        minHeight: "64px",
      }}>
        {/* Status Dropdown */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: "160px", paddingRight: "24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", lineHeight: 1 }}>
            Status
          </div>
          
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              onBlur={() => setTimeout(() => setShowStatusDropdown(false), 200)}
              tabIndex={0}
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: IMPORT_STATUS_TEXT_COLORS[currentBooking.status] || "#111827",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "4px 24px 4px 8px",
                borderRadius: "6px",
                border: "1.5px solid transparent",
                position: "relative",
                transition: "all 0.2s ease",
                background: showStatusDropdown ? "#FFFFFF" : "transparent",
                lineHeight: "1.3",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FFFFFF";
                e.currentTarget.style.borderColor = (() => {
                   const color = IMPORT_STATUS_COLORS[currentBooking.status];
                   return color ? hexToRgba(color, 0.3) : "#0F766E";
                })();
              }}
              onMouseLeave={(e) => {
                if (!showStatusDropdown) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <div style={{ 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis", 
                maxWidth: "280px"
              }}>
                {currentBooking.status}
              </div>
              
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
                minWidth: "320px",
                overflow: "hidden"
              }}>
                {IMPORT_STATUS_OPTIONS.map((status, index) => (
                  <div
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    style={{
                      padding: "10px 14px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      color: IMPORT_STATUS_TEXT_COLORS[status] || "#111827",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: status === currentBooking.status ? "#F0FDF4" : "transparent",
                      borderBottom: index < IMPORT_STATUS_OPTIONS.length - 1 ? "1px solid #E5E9F0" : "none",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (status !== currentBooking.status) {
                        e.currentTarget.style.background = "#F9FAFB";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (status !== currentBooking.status) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {status}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", alignSelf: "stretch", background: "#0F766E", opacity: 0.15, margin: "2px 0" }} />

        {/* Shipping Line Status Dropdown */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: "150px", padding: "0 24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", lineHeight: 1 }}>
            Shipping Line Status
          </div>
          
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setShowShippingLineDropdown(!showShippingLineDropdown)}
              onBlur={() => setTimeout(() => setShowShippingLineDropdown(false), 200)}
              tabIndex={0}
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: SHIPPING_LINE_STATUS_COLORS[(currentBooking as any).shippingLineStatus] || "#9CA3AF",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "4px 24px 4px 8px",
                borderRadius: "6px",
                border: "1.5px solid transparent",
                position: "relative",
                transition: "all 0.2s ease",
                background: showShippingLineDropdown ? "#FFFFFF" : "transparent",
                lineHeight: "1.3",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FFFFFF";
                e.currentTarget.style.borderColor = "#E5E9F0";
              }}
              onMouseLeave={(e) => {
                if (!showShippingLineDropdown) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <div style={{ 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis", 
                maxWidth: "180px"
              }}>
                {(currentBooking as any).shippingLineStatus || "Not Set"}
              </div>
              
              <div style={{
                position: "absolute",
                right: "6px",
                top: "50%",
                transform: `translateY(-50%) ${showShippingLineDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
                transition: "transform 0.2s ease",
                pointerEvents: "none",
                color: "#0F766E"
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            
            {showShippingLineDropdown && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                background: "white",
                border: "1.5px solid #E5E9F0",
                borderRadius: "8px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                zIndex: 50,
                minWidth: "200px",
                overflow: "hidden"
              }}>
                {SHIPPING_LINE_STATUS_OPTIONS.map((slStatus, index) => (
                  <div
                    key={slStatus}
                    onClick={() => handleShippingLineStatusChange(slStatus)}
                    style={{
                      padding: "10px 14px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      color: SHIPPING_LINE_STATUS_COLORS[slStatus] || "#111827",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: slStatus === (currentBooking as any).shippingLineStatus ? "#F0FDF4" : "transparent",
                      borderBottom: index < SHIPPING_LINE_STATUS_OPTIONS.length - 1 ? "1px solid #E5E9F0" : "none",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (slStatus !== (currentBooking as any).shippingLineStatus) {
                        e.currentTarget.style.background = "#F9FAFB";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (slStatus !== (currentBooking as any).shippingLineStatus) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {slStatus}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", alignSelf: "stretch", background: "#0F766E", opacity: 0.15, margin: "2px 0" }} />

        {/* Route */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: "160px", padding: "0 24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", lineHeight: 1 }}>
            Route
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", lineHeight: "1.3" }}>
            {(currentBooking as any).origin || "Origin"} → {currentBooking.pod || currentBooking.destination || "Destination"}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", alignSelf: "stretch", background: "#0F766E", opacity: 0.15, margin: "2px 0" }} />

        {/* Created Date */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: "100px", padding: "0 24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", lineHeight: 1 }}>
            Created Date
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", lineHeight: "1.3" }}>
            {new Date(currentBooking.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Separator before timeline */}
        <div style={{ width: "1px", alignSelf: "stretch", background: "#0F766E", opacity: 0.15, margin: "2px 0" }} />

        {/* Docs Timeline Stepper — fills remaining space */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: "24px", minWidth: 0 }}>
          <DocsTimelineStepper 
             timeline={(currentBooking as any).docsTimeline || []} 
             onUpdate={handleTimelineUpdate} 
          />
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
            // Exit edit mode when switching to other tabs
            if (isEditing && tabId !== "booking-info") {
              setIsEditing(false);
            }
          }}
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
          {activeTab === "booking-info" && (
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
          {activeTab === "trucking" && (
            <TruckingTab
              bookingId={booking.bookingId}
              bookingType="import"
              currentUser={currentUser}
            />
          )}
          {activeTab === "billings" && (
            <BillingsSubTabs
              bookingId={booking.bookingId}
              bookingNumber={booking.bookingNumber}
              bookingType="brokerage"
              currentUser={currentUser}
            />
          )}
          {activeTab === "expenses" && (
            <ExpensesSubTabs
              bookingId={booking.bookingId}
              bookingNumber={booking.bookingNumber}
              bookingType="brokerage"
              currentUser={currentUser}
            />
          )}
          {activeTab === "attachments" && (
            <BookingAttachmentsTab
              bookingType="import"
              bookingId={booking.bookingId}
            />
          )}
        </div>

        {/* Timeline Sidebar */}
        {showTimeline && (
          <div style={{
            flex: "0 0 35%",
            borderLeft: "1px solid var(--neuron-ui-border)",
            backgroundColor: "#FAFBFC",
            overflow: "auto"
          }}>
            <ActivityTimeline activities={activityLog} />
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
  status: ExecutionStatus;
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
  status,
  isEditing = false,
  editData = {},
  setEditData
}: EditableFieldProps) {
  const lockStatus = isFieldLocked(fieldName, status);
  
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
          {type === "date" ? toDisplayDate(displayValue) : (displayValue || "—")}
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

function ContainerListField({
  fieldName,
  label,
  value, // Comma separated string or array
  status,
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
const SELECTIVITY_OPTIONS = ["Green", "Orange", "Yellow", "Red"];
const SELECTIVITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Green:  { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  Orange: { bg: "#FFF7ED", text: "#9A3412", dot: "#F97316" },
  Yellow: { bg: "#FEFCE8", text: "#854D0E", dot: "#EAB308" },
  Red:    { bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
};

const GROSS_WEIGHT_UNITS = ["kg", "lbs", "tons"];

/** Compute volume summary from containers: "2x40HC, 1x20GP" */
function computeVolumeSummary(containerNo: string, volume: string): string {
  if (!containerNo && !volume) return "—";
  // Parse container count
  let containerCount = 1;
  if (containerNo) {
    const containers = Array.isArray(containerNo) 
      ? containerNo 
      : containerNo.split(',').map((s: string) => s.trim()).filter(Boolean);
    containerCount = Math.max(containers.length, 1);
  }
  if (!volume) return "—";
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
  projects: Project[];
}) {
  // Split Gatepass into Date and Time
  const [gatepassDate, setGatepassDate] = useState("");
  const [gatepassDateError, setGatepassDateError] = useState("");
  const [gatepassTime, setGatepassTime] = useState("");

  // Dropdown visibility states
  const [showShippingLineDD, setShowShippingLineDD] = useState(false);
  const [showVolumeDD, setShowVolumeDD] = useState(false);
  const [showSelectivityDD, setShowSelectivityDD] = useState(false);
  const [showGrossWeightUnitDD, setShowGrossWeightUnitDD] = useState(false);
  const [showSectionDD, setShowSectionDD] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [shippingLineSearch, setShippingLineSearch] = useState("");

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
              </div>
            )}
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
          <span style={{
            fontSize: "12px",
            color: "#667085"
          }}>
            Last updated by System, {new Date(booking.updatedAt).toLocaleString()}
          </span>
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
              status={booking.status}
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
                onSelect={({ company, contact }) => {
                  const updates = { ...editData };
                  const cName = company ? (company.name || company.company_name || "") : "";
                  updates.companyName = cName;
                  
                  if (company) {
                    updates.clientId = company.id;
                    updates.consignee = cName;
                  } else {
                    updates.clientId = "";
                    updates.consignee = "";
                  }
                  
                  if (contact) {
                    updates.contactId = contact.id;
                    updates.contactPersonName = contact.name;
                    updates.customerName = contact.name;
                  } else {
                    updates.contactId = "";
                    updates.contactPersonName = "";
                    // No contact: customerName = company name (merged)
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
          {/* Row 0: Consignee, Client — conditionally collapse when merged and identical */}
          {(() => {
            const isMerged = !(booking as any).companyName || booking.customerName === (booking as any).companyName;
            const consigneeMatchesClient = isMerged && ((booking as any).consignee || "") === booking.customerName;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {!consigneeMatchesClient && (
                  <EditableField
                    fieldName="consignee"
                    label="Consignee"
                    value={(booking as any).consignee || ""}
                    status={booking.status as ExecutionStatus}
                    placeholder="Enter consignee..."
                    isEditing={isEditing}
                    editData={editData}
                    setEditData={setEditData}
                  />
                )}
                <EditableField
                  fieldName="customerName"
                  label={isMerged ? "Client / Company" : "Contact Person"}
                  value={(booking as any).customerName || ""}
                  status={booking.status as ExecutionStatus}
                  placeholder="Client name"
                  isEditing={isEditing}
                  editData={editData}
                  setEditData={setEditData}
                />
                {!isMerged && (
                  <EditableField
                    fieldName="companyName"
                    label="Company"
                    value={(booking as any).companyName || ""}
                    status={booking.status as ExecutionStatus}
                    placeholder=""
                    isEditing={false}
                    editData={editData}
                    setEditData={setEditData}
                  />
                )}
              </div>
            );
          })()}

          {/* Row 1: Container No., BL Number */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <ContainerListField
              fieldName="containerNo"
              label="Container No."
              value={(booking as any).containerNo || ""}
              status={booking.status as ExecutionStatus}
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            <EditableField
              fieldName="blNumber"
              label="BL Number"
              value={(booking as any).blNumber || ""}
              status={booking.status as ExecutionStatus}
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
              status={booking.status as ExecutionStatus}
              placeholder="Enter commodity..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            {/* Volume: View mode = computed summary, Edit mode = dropdown */}
            {isEditing ? (
              renderEditDropdown("volume", "Volume", CONTAINER_SIZES, showVolumeDD, setShowVolumeDD)
            ) : (
              renderVolumeView()
            )}
          </div>

          {/* Row 3: Vessel & Voyage, Shipping Line */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="vesselVoyage"
              label="Vessel & Voyage"
              value={(booking as any).vesselVoyage || ""}
              status={booking.status as ExecutionStatus}
              placeholder="Enter vessel & voyage..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            {/* Shipping Line - Dropdown */}
            {renderEditDropdown("shippingLine", "Shipping Line", SHIPPING_LINE_OPTIONS, showShippingLineDD, setShowShippingLineDD, undefined, true, shippingLineSearch, setShippingLineSearch)}
          </div>

          {/* Row 4: Section, OT (Received Docs removed) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {renderSectionDropdown()}
            <EditableField
              fieldName="ot"
              label="OT"
              value={(booking as any).ot || ""}
              status={booking.status as ExecutionStatus}
              placeholder="Enter OT..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
          </div>

          {/* Row 5: POL & POD */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="origin"
              label="POL (Port of Loading)"
              value={(booking as any).origin || ""}
              status={booking.status as ExecutionStatus}
              placeholder="Enter POL..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
            <EditableField
              fieldName="pod"
              label="POD (Port of Discharge)"
              value={(booking as any).pod || ""}
              status={booking.status as ExecutionStatus}
              placeholder="Enter POD..."
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Dates and Additional Info Section (merged) */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E9F0",
        overflow: "hidden"
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
            Dates and Additional Info
          </h3>
        </div>

        <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gap: "20px" }}>
          {/* Timeline & Dates sub-section */}
          <div style={{ marginBottom: "4px" }}>
            
            {/* Row 1: ETA, ATA (date + time) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              {renderDateTimeEditField("eta", "ETA")}
              {renderDateTimeEditField("ata", "ATA")}
            </div>

            {/* Row 2: Discharged, Storage Begins, DEM Begins (date + time with auto-calc) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
              {renderDateTimeEditField("discharged", "Discharged", handleDischargedChange)}
              {renderDateTimeEditField("storageBegins", "Storage Begins", () => setStorageManualOverride(true))}
              {renderDateTimeEditField("demBegins", "DEM Begins", () => setDemManualOverride(true))}
            </div>
          </div>

          

          {/* Group 1: Clearance / References */}
          <div style={{ marginBottom: "4px" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <EditableField
                fieldName="registryNo"
                label="Registry No."
                value={(booking as any).registryNo || ""}
                status={booking.status as ExecutionStatus}
                placeholder="Enter Registry No..."
                isEditing={isEditing}
                editData={editData}
                setEditData={setEditData}
              />
              {/* Selectivity - Color-coded Dropdown */}
              {renderEditDropdown("selectivity", "Selectivity", SELECTIVITY_OPTIONS, showSelectivityDD, setShowSelectivityDD, renderSelectivityOption)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <EditableField
                fieldName="ticket"
                label="Ticket"
                value={(booking as any).ticket || ""}
                status={booking.status as ExecutionStatus}
                placeholder="Enter Ticket..."
                isEditing={isEditing}
                editData={editData}
                setEditData={setEditData}
              />
              {/* RCVD Billing - Date + Time */}
              {renderDateTimeEditField("rcvdBilling", "RCVD Billing")}
            </div>
          </div>

          {/* Group 2: Charges / Values */}
          <div style={{ marginBottom: "4px", marginTop: "12px" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <EditableField
                fieldName="finalTaxNavValue"
                label="Final Tax/NAV Value"
                value={(booking as any).finalTaxNavValue || ""}
                status={booking.status as ExecutionStatus}
                placeholder="0.00"
                type="text"
                isEditing={isEditing}
                editData={editData}
                setEditData={setEditData}
              />
              <EditableField
                fieldName="arrastre"
                label="Arrastre"
                value={(booking as any).arrastre || ""}
                status={booking.status as ExecutionStatus}
                placeholder="Enter Arrastre..."
                isEditing={isEditing}
                editData={editData}
                setEditData={setEditData}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <EditableField
                fieldName="stowage"
                label="Stowage"
                value={(booking as any).stowage || ""}
                status={booking.status as ExecutionStatus}
                placeholder="0.00"
                type="text"
                isEditing={isEditing}
                editData={editData}
                setEditData={setEditData}
              />
              {isEditing ? (
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--neuron-ink-base)",
                    marginBottom: "8px"
                  }}>
                    Gatepass
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "8px" }}>
                    <div style={{ position: "relative" }}>
                      <SingleDateInput
                        value={mmddToISO(gatepassDate)}
                        onChange={(iso) => {
                          const formatted = isoToMMDD(iso);
                          setGatepassDate(formatted);
                          if (formatted && validateDate(formatted)) {
                            setGatepassDateError("");
                          }
                          setEditData({ ...editData, gatepass: combineDateTime(formatted, gatepassTime) } as any);
                        }}
                        placeholder="MM/DD/YYYY"
                      />
                      {gatepassDateError && <p className="text-red-500 text-xs mt-1" style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px" }}>{gatepassDateError}</p>}
                    </div>
                    <div>
                      <NeuronTimePicker value={gatepassTime} onChange={(v) => handleGatepassTimeChange(v)} />
                    </div>
                  </div>
                </div>
              ) : (
                <EditableField
                  fieldName="gatepass"
                  label="Gatepass"
                  value={(booking as any).gatepass || ""}
                  status={booking.status as ExecutionStatus}
                  placeholder="MM/DD/YYYY HH:mm"
                  type="text"
                  isEditing={isEditing}
                  editData={editData}
                  setEditData={setEditData}
                />
              )}
            </div>
            {/* Gross Weight + Entry Number */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {renderGrossWeightField()}
              <EditableField
                fieldName="entryNumber"
                label="Entry #"
                value={(booking as any).entryNumber || ""}
                status={booking.status as ExecutionStatus}
                placeholder="Enter entry number..."
                isEditing={isEditing}
                editData={editData}
                setEditData={setEditData}
              />
            </div>
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