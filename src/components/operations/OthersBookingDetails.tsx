import { useState } from "react";
import { ArrowLeft, MoreVertical, Lock, Edit3, Clock, ChevronRight } from "lucide-react";
import type { OthersBooking, ExecutionStatus } from "../../types/operations";
import { BillingsTab } from "./shared/BillingsTab";
import { ExpensesTab } from "./shared/ExpensesTab";
import { StandardButton } from "../design-system/StandardButton";
import { StandardTabs } from "../design-system/StandardTabs";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { API_BASE_URL } from '@/utils/api-config';

interface OthersBookingDetailsProps {
  booking: OthersBooking;
  onBack: () => void;
  onUpdate: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

type DetailTab = "booking-info" | "billings" | "expenses";

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

const initialActivityLog: ActivityLogEntry[] = [
  {
    id: "init-1",
    timestamp: new Date(),
    user: "System",
    action: "created"
  },
];

// NOTE: All fields are now editable regardless of status since changes are tracked in activity log
function isFieldLocked(fieldName: string, status: ExecutionStatus): { locked: boolean; reason: string } {
  // All fields are editable - changes will be tracked in the activity log
  return { locked: false, reason: "" };
}

export function OthersBookingDetails({
  booking,
  onBack,
  onUpdate,
  currentUser
}: OthersBookingDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("booking-info");
  const [showTimeline, setShowTimeline] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [editedBooking, setEditedBooking] = useState<OthersBooking>(booking);

  const tabs = [
    { id: "booking-info", label: "Booking Information" },
    { id: "billings", label: "Billings" },
    { id: "expenses", label: "Expenses" }
  ] as const;

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

  return (
    <div style={{ 
      backgroundColor: "white",
      display: "flex",
      flexDirection: "column",
      height: "100vh"
    }}>
      {/* Header Bar */}
      <div style={{
        padding: "24px 48px",
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
            className="p-2 hover:bg-[#0F766E]/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#12332B]" />
          </button>
          
          <div>
            <h1 style={{ 
              fontSize: "20px",
              fontWeight: 600,
              color: "#12332B",
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
          <StandardButton
            variant={showTimeline ? "secondary" : "outline"}
            onClick={() => setShowTimeline(!showTimeline)}
            icon={<Clock size={16} />}
          >
            Activity
          </StandardButton>

          <div style={{
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 500,
            backgroundColor: booking.status === "Draft" ? "#F3F4F6" : 
                           booking.status === "In Transit" ? "#E8F2EE" :
                           booking.status === "Completed" ? "#D1FAE5" :
                           booking.status === "Cancelled" ? "#FEE2E2" : "#FFF3E0",
            color: booking.status === "Draft" ? "#6B7280" :
                   booking.status === "In Transit" ? "#0F766E" :
                   booking.status === "Completed" ? "#10B981" :
                   booking.status === "Cancelled" ? "#EF4444" : "#F59E0B",
            border: `1px solid ${booking.status === "Draft" ? "#E5E7EB" : 
                                 booking.status === "In Transit" ? "#0F766E33" :
                                 booking.status === "Completed" ? "#10B98133" :
                                 booking.status === "Cancelled" ? "#EF444433" : "#F59E0B33"}`
          }}>
            {booking.status}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        padding: "0 48px",
        borderBottom: "1px solid var(--neuron-ui-border)",
        backgroundColor: "white"
      }}>
        <StandardTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as DetailTab)}
        />
      </div>

      {/* Content with Timeline Sidebar */}
      <div style={{ 
        flex: 1,
        overflow: "hidden",
        display: "flex"
      }}>
        <div style={{ 
          flex: showTimeline ? "0 0 65%" : "1",
          overflow: "auto",
          transition: "flex 0.3s ease"
        }}>
          {activeTab === "booking-info" && (
            <BookingInformationTab
              booking={editedBooking}
              onBookingUpdated={onUpdate}
              addActivity={addActivity}
              setEditedBooking={setEditedBooking}
            />
          )}
          {activeTab === "billings" && (
            <BillingsTab
              bookingId={booking.bookingId}
              bookingType="others"
              currentUser={currentUser}
            />
          )}
          {activeTab === "expenses" && (
            <ExpensesTab
              bookingId={booking.bookingId}
              bookingType="others"
              currentUser={currentUser}
            />
          )}
        </div>

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
        <div style={{
          position: "absolute",
          left: "15px",
          top: "0",
          bottom: "0",
          width: "2px",
          backgroundColor: "#E5E7EB"
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {activities.map((activity) => (
            <div key={activity.id} style={{ position: "relative", paddingLeft: "40px" }}>
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

              <div style={{
                backgroundColor: "white",
                border: "1px solid var(--neuron-ui-border)",
                borderRadius: "8px",
                padding: "12px 16px"
              }}>
                <div style={{
                  fontSize: "11px",
                  color: "var(--neuron-ink-muted)",
                  marginBottom: "6px"
                }}>
                  {activity.timestamp.toLocaleString()}
                </div>

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
        border: "1px solid #E5E7EB",
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
  onSave?: (value: string) => void;
}

function EditableField({ 
  fieldName,
  label, 
  value, 
  type = "text", 
  options = [],
  required = false,
  placeholder = "Click to add...",
  status,
  onSave
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const lockStatus = isFieldLocked(fieldName, status);
  const isEmpty = !value || value.trim() === "";

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (onSave) {
      onSave(editValue);
    }
    
    setIsSaving(false);
    setSaveSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

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
          border: "1px solid #E5E7EB",
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

  if (isEditing) {
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
        <div style={{ position: "relative" }}>
          {type === "textarea" ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              autoFocus
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                backgroundColor: "white",
                border: "2px solid #0F766E",
                borderRadius: "6px",
                fontSize: "14px",
                color: "var(--neuron-ink-primary)",
                outline: "none",
                resize: "vertical"
              }}
            />
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              autoFocus
              style={{
                width: "100%",
                padding: "10px 14px",
                backgroundColor: "white",
                border: "2px solid #0F766E",
                borderRadius: "6px",
                fontSize: "14px",
                color: "var(--neuron-ink-primary)",
                outline: "none"
              }}
            />
          )}
          {isSaving && (
            <span style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "12px",
              color: "#0F766E"
            }}>
              Saving...
            </span>
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
        {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
      </label>
      <div
        onClick={() => setIsEditing(true)}
        style={{
          position: "relative",
          padding: "10px 14px",
          backgroundColor: isEmpty ? "white" : "#FAFBFC",
          border: `1px solid ${isEmpty && required ? "#FCD34D" : "#E5E7EB"}`,
          borderRadius: "6px",
          fontSize: "14px",
          color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          minHeight: type === "textarea" ? "80px" : "42px"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#0F766E";
          e.currentTarget.style.backgroundColor = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isEmpty && required ? "#FCD34D" : "#E5E7EB";
          e.currentTarget.style.backgroundColor = isEmpty ? "white" : "#FAFBFC";
        }}
      >
        {isEmpty ? (
          <span style={{ color: "#9CA3AF" }}>{placeholder}</span>
        ) : type === "date" && value ? (
          new Date(value).toLocaleDateString()
        ) : (
          value
        )}
        {!isEmpty && (
          <Edit3 
            size={14} 
            style={{ 
              position: "absolute", 
              right: "14px", 
              top: "50%", 
              transform: "translateY(-50%)",
              color: "#9CA3AF",
              opacity: 0
            }}
            className="edit-icon"
          />
        )}
        {/* Removed "✓ Saved" indicator */}
      </div>
      <style>{`
        div:hover .edit-icon {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

// Booking Information Tab Component
function BookingInformationTab({
  booking,
  onBookingUpdated,
  addActivity,
  setEditedBooking
}: {
  booking: OthersBooking;
  onBookingUpdated: () => void;
  addActivity: (fieldName: string, oldValue: string, newValue: string) => void;
  setEditedBooking: (booking: OthersBooking) => void;
}) {

  const handleFieldSave = async (fieldName: keyof OthersBooking, value: string, activityName?: string) => {
      try {
          const updates = { [fieldName]: value };
          
          // Determine if this is a legacy booking or new
          const isLegacy = !(booking as any).booking_type;
          
          const endpoint = isLegacy 
            ? `${API_BASE_URL}/bookings/${booking.bookingId}` 
            : `${API_BASE_URL}/others-bookings/${booking.bookingId}`;
          
          const method = isLegacy ? "PATCH" : "PUT";

          const response = await fetch(endpoint, {
              method: method,
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${publicAnonKey}`
              },
              body: JSON.stringify(updates)
          });

          if (!response.ok) {
              throw new Error("Failed to save changes");
          }

          const result = await response.json();
          if (result.success) {
               onBookingUpdated();
               addActivity(activityName || fieldName, String(booking[fieldName] || ""), value);
               setEditedBooking({ ...booking, [fieldName]: value });
               toast.success("Saved successfully");
          } else {
              throw new Error(result.error || "Failed to save changes");
          }
      } catch (error) {
          console.error("Error saving booking field:", error);
          toast.error("Failed to save changes");
      }
  };

  return (
    <div style={{ 
      padding: "32px 48px",
      maxWidth: "1400px",
      margin: "0 auto"
    }}>
      
      {/* General Information Section */}
      <div style={{
        backgroundColor: "white",
        border: "1px solid var(--neuron-ui-border)",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <h2 style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--neuron-brand-green)",
            margin: 0
          }}>
            General Information
          </h2>
          <span style={{
            fontSize: "12px",
            color: "var(--neuron-ink-muted)"
          }}>
            Last updated by {booking.accountHandler || "System"}, {new Date(booking.updatedAt).toLocaleString()}
          </span>
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <LockedField 
              label={!(booking as any).companyName || booking.customerName === (booking as any).companyName ? "Client / Company" : "Contact Person"} 
              value={booking.customerName}
            />
            <LockedField 
              label="Account Owner" 
              value={booking.accountOwner || ""}
            />
          </div>

          {/* Show company separately when contact was selected */}
          {(booking as any).companyName && booking.customerName !== (booking as any).companyName && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <LockedField 
                label="Company" 
                value={(booking as any).companyName}
              />
              <div />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="accountHandler"
              label="Account Handler"
              value={booking.accountHandler || ""}
              status={booking.status}
              placeholder="Assign handler..."
              onSave={(value) => handleFieldSave("accountHandler", value, "Account Handler")}
            />
            <LockedField 
              label="Service/s" 
              value={booking.service || ""}
            />
            <LockedField 
              label="Quotation Reference" 
              value={booking.quotationReferenceNumber || ""}
            />
          </div>
        </div>

        <div style={{
          marginTop: "16px",
          padding: "12px",
          backgroundColor: "#F0F9FF",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#0369A1"
        }}>
          <strong>Click any field to edit</strong>
        </div>
      </div>

      {/* Service Details Section */}
      <div style={{
        backgroundColor: "white",
        border: "1px solid var(--neuron-ui-border)",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <h2 style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--neuron-brand-green)",
          marginBottom: "20px"
        }}>
          Service Details
        </h2>

        <div style={{ display: "grid", gap: "20px" }}>
          <div>
            <EditableField
              fieldName="serviceDescription"
              label="Service Description"
              value={booking.serviceDescription || ""}
              type="textarea"
              status={booking.status}
              placeholder="Describe the service being provided..."
              onSave={(value) => handleFieldSave("serviceDescription", value, "Service Description")}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="deliveryAddress"
              label="Delivery Address"
              value={booking.deliveryAddress || ""}
              type="textarea"
              status={booking.status}
              placeholder="Enter delivery address..."
              onSave={(value) => handleFieldSave("deliveryAddress", value, "Delivery Address")}
            />
            <EditableField
              fieldName="specialRequirements"
              label="Special Requirements"
              value={booking.specialRequirements || ""}
              type="textarea"
              status={booking.status}
              placeholder="Enter any special requirements..."
              onSave={(value) => handleFieldSave("specialRequirements", value, "Special Requirements")}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="requestedDate"
              label="Requested Date"
              value={booking.requestedDate || ""}
              type="date"
              status={booking.status}
              onSave={(value) => handleFieldSave("requestedDate", value, "Requested Date")}
            />
            <EditableField
              fieldName="completionDate"
              label="Completion Date"
              value={booking.completionDate || ""}
              type="date"
              status={booking.status}
              onSave={(value) => handleFieldSave("completionDate", value, "Completion Date")}
            />
          </div>
        </div>
      </div>

      {/* Additional Notes Section */}
      {booking.notes && (
        <div style={{
          backgroundColor: "white",
          border: "1px solid var(--neuron-ui-border)",
          borderRadius: "8px",
          padding: "24px"
        }}>
          <h2 style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--neuron-brand-green)",
            marginBottom: "20px"
          }}>
            Additional Notes
          </h2>

          <div style={{ display: "grid", gap: "20px" }}>
            <EditableField
              fieldName="notes"
              label="Notes"
              value={booking.notes}
              type="textarea"
              status={booking.status}
              placeholder="Enter additional notes..."
              onSave={(value) => handleFieldSave("notes", value, "Notes")}
            />
          </div>
        </div>
      )}
    </div>
  );
}