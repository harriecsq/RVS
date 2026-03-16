import { useState } from "react";
import { ArrowLeft, MoreVertical, Lock, Edit3, Clock, ChevronRight } from "lucide-react";
import type { TruckingBooking, ExecutionStatus } from "../../types/operations";
import { BillingsTab } from "./shared/BillingsTab";
import { ExpensesTab } from "./shared/ExpensesTab";
import { StandardButton } from "../design-system/StandardButton";
import { StandardTabs } from "../design-system/StandardTabs";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface TruckingBookingDetailsProps {
  booking: TruckingBooking;
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

export function TruckingBookingDetails({
  booking,
  onBack,
  onUpdate,
  currentUser
}: TruckingBookingDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("booking-info");
  const [showTimeline, setShowTimeline] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [editedBooking, setEditedBooking] = useState<TruckingBooking>(booking);

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
                           booking.status === "In Progress" ? "#E8F2EE" :
                           booking.status === "Completed" ? "#D1FAE5" :
                           booking.status === "Cancelled" ? "#FEE2E2" : "#FFF3E0",
            color: booking.status === "Draft" ? "#6B7280" :
                   booking.status === "In Progress" ? "#0F766E" :
                   booking.status === "Completed" ? "#10B981" :
                   booking.status === "Cancelled" ? "#EF4444" : "#F59E0B",
            border: `1px solid ${booking.status === "Draft" ? "#E5E7EB" : 
                                 booking.status === "In Progress" ? "#0F766E33" :
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
              bookingType="trucking"
              currentUser={currentUser}
            />
          )}
          {activeTab === "expenses" && (
            <ExpensesTab
              bookingId={booking.bookingId}
              bookingType="trucking"
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
  booking: TruckingBooking;
  onBookingUpdated: () => void;
  addActivity: (fieldName: string, oldValue: string, newValue: string) => void;
  setEditedBooking: (booking: TruckingBooking) => void;
}) {

  const handleFieldSave = async (fieldName: keyof TruckingBooking, value: string, activityName?: string) => {
      try {
          const updates = { [fieldName]: value };
          
          // Determine if this is a legacy booking or new
          const isLegacy = !(booking as any).booking_type;
          
          const endpoint = isLegacy 
            ? `${API_URL}/bookings/${booking.bookingId}` 
            : `${API_URL}/trucking-bookings/${booking.bookingId}`;
          
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
              label="Truck Type" 
              value={booking.truckType || ""}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <LockedField 
              label="Mode" 
              value={booking.mode || ""}
            />
            <EditableField
              fieldName="preferredDeliveryDate"
              label="Preferred Delivery Date"
              value={booking.preferredDeliveryDate || ""}
              type="date"
              status={booking.status}
              onSave={(value) => handleFieldSave("preferredDeliveryDate", value, "Preferred Delivery Date")}
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

      {/* Shipment Information Section */}
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
          Shipment Information
        </h2>

        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="consignee"
              label="Consignee"
              value={booking.consignee || ""}
              status={booking.status}
              placeholder="Enter consignee..."
              onSave={(value) => handleFieldSave("consignee", value, "Consignee")}
            />
            <EditableField
              fieldName="driver"
              label="Driver"
              value={booking.driver || ""}
              status={booking.status}
              placeholder="Assign driver..."
              onSave={(value) => handleFieldSave("driver", value, "Driver")}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <EditableField
              fieldName="helper"
              label="Helper"
              value={booking.helper || ""}
              status={booking.status}
              placeholder="Assign helper..."
              onSave={(value) => handleFieldSave("helper", value, "Helper")}
            />
            <EditableField
              fieldName="vehicleReferenceNumber"
              label="Vehicle Reference Number"
              value={booking.vehicleReferenceNumber || ""}
              status={booking.status}
              placeholder="Enter vehicle ref..."
              onSave={(value) => handleFieldSave("vehicleReferenceNumber", value, "Vehicle Reference Number")}
            />
            <EditableField
              fieldName="pullOut"
              label="Pull Out Location"
              value={booking.pullOut || ""}
              status={booking.status}
              placeholder="Enter pull out location..."
              onSave={(value) => handleFieldSave("pullOut", value, "Pull Out")}
            />
          </div>

          <div>
            <EditableField
              fieldName="deliveryAddress"
              label="Delivery Address"
              value={booking.deliveryAddress || ""}
              type="textarea"
              status={booking.status}
              placeholder="Enter delivery address..."
              onSave={(value) => handleFieldSave("deliveryAddress", value, "Delivery Address")}
            />
          </div>

          <div>
            <EditableField
              fieldName="deliveryInstructions"
              label="Delivery Instructions"
              value={booking.deliveryInstructions || ""}
              type="textarea"
              status={booking.status}
              placeholder="Enter special instructions..."
              onSave={(value) => handleFieldSave("deliveryInstructions", value, "Delivery Instructions")}
            />
          </div>

          {booking.dateDelivered && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <EditableField
                fieldName="dateDelivered"
                label="Date Delivered"
                value={booking.dateDelivered}
                type="date"
                status={booking.status}
                onSave={(value) => {
                  onBookingUpdated();
                  addActivity("Date Delivered", booking.dateDelivered || "", value);
                  setEditedBooking({ ...booking, dateDelivered: value });
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* FCL Information Section */}
      {(booking.tabsBooking || booking.emptyReturn || booking.cyFee || booking.eirAvailability || 
        booking.earlyGateIn || booking.detDemValidity || booking.storageValidity || booking.shippingLine) && (
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
            FCL Information
          </h2>

          <div style={{ display: "grid", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
              {booking.tabsBooking && (
                <EditableField
                  fieldName="tabsBooking"
                  label="TABS Booking"
                  value={booking.tabsBooking}
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("TABS Booking", booking.tabsBooking || "", value);
                    setEditedBooking({ ...booking, tabsBooking: value });
                  }}
                />
              )}
              {booking.emptyReturn && (
                <EditableField
                  fieldName="emptyReturn"
                  label="Empty Return"
                  value={booking.emptyReturn}
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("Empty Return", booking.emptyReturn || "", value);
                    setEditedBooking({ ...booking, emptyReturn: value });
                  }}
                />
              )}
              {booking.cyFee && (
                <EditableField
                  fieldName="cyFee"
                  label="CY Fee"
                  value={booking.cyFee}
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("CY Fee", booking.cyFee || "", value);
                    setEditedBooking({ ...booking, cyFee: value });
                  }}
                />
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
              {booking.eirAvailability && (
                <EditableField
                  fieldName="eirAvailability"
                  label="EIR Availability"
                  value={booking.eirAvailability}
                  type="date"
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("EIR Availability", booking.eirAvailability || "", value);
                    setEditedBooking({ ...booking, eirAvailability: value });
                  }}
                />
              )}
              {booking.earlyGateIn && (
                <EditableField
                  fieldName="earlyGateIn"
                  label="Early Gate In"
                  value={booking.earlyGateIn}
                  type="date"
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("Early Gate In", booking.earlyGateIn || "", value);
                    setEditedBooking({ ...booking, earlyGateIn: value });
                  }}
                />
              )}
              {booking.detDemValidity && (
                <EditableField
                  fieldName="detDemValidity"
                  label="Det/Dem Validity"
                  value={booking.detDemValidity}
                  type="date"
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("Det/Dem Validity", booking.detDemValidity || "", value);
                    setEditedBooking({ ...booking, detDemValidity: value });
                  }}
                />
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
              {booking.storageValidity && (
                <EditableField
                  fieldName="storageValidity"
                  label="Storage Validity"
                  value={booking.storageValidity}
                  type="date"
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("Storage Validity", booking.storageValidity || "", value);
                    setEditedBooking({ ...booking, storageValidity: value });
                  }}
                />
              )}
              {booking.shippingLine && (
                <EditableField
                  fieldName="shippingLine"
                  label="Shipping Line"
                  value={booking.shippingLine}
                  status={booking.status}
                  onSave={(value) => {
                    onBookingUpdated();
                    addActivity("Shipping Line", booking.shippingLine || "", value);
                    setEditedBooking({ ...booking, shippingLine: value });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}