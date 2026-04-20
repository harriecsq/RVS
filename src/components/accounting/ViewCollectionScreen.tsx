import { useState } from "react";
import { ArrowLeft, Trash2, X, Check, FileText, Receipt, Plus, Paperclip } from "lucide-react";
import { HeaderStatusDropdown } from "../shared/HeaderStatusDropdown";
import { TabRowActions } from "../shared/TabRowActions";
import { StandardButton, StandardInput, StandardTextarea, StandardTabs } from "../design-system";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { toast } from "sonner@2.0.3";
import { formatAmount } from "../../utils/formatAmount";
import { CollectionBillingsTab } from "./CollectionBillingsTab";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { SingleDateInput } from "../shared/UnifiedDateRangeFilter";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { API_BASE_URL } from '@/utils/api-config';

const COLLECTION_STATUS_COLORS: Record<string, string> = {
  "Draft": "#6B7280",
  "For Approval": "#F59E0B",
  "Approved": "#3B82F6",
  "Collected": "#10B981",
  "Cancelled": "#EF4444",
};
const COLLECTION_STATUSES = ["Draft", "For Approval", "Approved", "Collected", "Cancelled"];

interface ViewCollectionScreenProps {
  collection: {
    id: string;
    collectionNumber: string;
    customerName: string;
    billingNumber?: string;
    projectNumber?: string;
    amount: number;
    collectionDate: string;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
    bankName?: string;
    checkNumber?: string;
    status: "Draft" | "For Approval" | "Approved" | "Collected" | "Cancelled";
    createdAt: string;
    allocations?: {
      billingId: string;
      billingNumber: string;
      amount: number;
      projectId?: string;
      projectNumber?: string;
      bookingNumber?: string;
    }[];
  };
  onBack: () => void;
  onDeleted?: () => void;
}

export function ViewCollectionScreen({ collection, onBack, onDeleted }: ViewCollectionScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentCollection, setCurrentCollection] = useState(collection);
  const [editedCollection, setEditedCollection] = useState(collection);
  const [editedAllocations, setEditedAllocations] = useState(collection.allocations || []);
  const [showTimeline, setShowTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "billings" | "attachments">("overview");

  // Approval / Sign-off fields
  const [editedPreparedBy, setEditedPreparedBy] = useState((collection as any).preparedBy || "");
  const [editedCheckedBy, setEditedCheckedBy] = useState((collection as any).checkedBy || "");
  const [editedApprovedBy, setEditedApprovedBy] = useState((collection as any).approvedBy || "");

  // Update local state when prop changes
  if (collection.id !== currentCollection.id && !isEditing) {
    setCurrentCollection(collection);
    setEditedCollection(collection);
    setEditedAllocations(collection.allocations || []);
    setEditedPreparedBy((collection as any).preparedBy || "");
    setEditedCheckedBy((collection as any).checkedBy || "");
    setEditedApprovedBy((collection as any).approvedBy || "");
  }

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const totalFromAllocations = editedAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
      const response = await fetch(`${API_BASE_URL}/collections/${currentCollection.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          ...editedCollection,
          amount: totalFromAllocations,
          allocations: editedAllocations,
          preparedBy: editedPreparedBy,
          checkedBy: editedCheckedBy,
          approvedBy: editedApprovedBy
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update collection");
      }

      const updatedCollection = { ...editedCollection, amount: totalFromAllocations, allocations: editedAllocations };
      setCurrentCollection(updatedCollection);
      setIsEditing(false);
      toast.success("Collection updated successfully");
    } catch (error) {
      console.error("Error updating collection:", error);
      toast.error("Failed to update collection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedCollection(currentCollection);
    setEditedAllocations(currentCollection.allocations || []);
    setEditedPreparedBy((currentCollection as any).preparedBy || "");
    setEditedCheckedBy((currentCollection as any).checkedBy || "");
    setEditedApprovedBy((currentCollection as any).approvedBy || "");
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus: "Draft" | "For Approval" | "Approved" | "Collected" | "Cancelled") => {
    try {
      const response = await fetch(`${API_BASE_URL}/collections/${currentCollection.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to update status");
        return;
      }

      setCurrentCollection({ ...currentCollection, status: newStatus });

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    } catch {
      return "—";
    }
  };

  const handleDeleteCollection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/collections/${collection.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to delete collection");
        setShowDeleteConfirm(false);
        return;
      }

      toast.success("Collection deleted successfully");
      setShowDeleteConfirm(false);
      if (onDeleted) onDeleted();
      else onBack();
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error("An error occurred while deleting the collection");
      setShowDeleteConfirm(false);
    }
  };



  // Helper component for read-only fields matching ProjectOverviewTab style
  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
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
        minHeight: "42px" // Ensure consistent height
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "—"}
        </span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#667085", fontSize: "14px" }}>Loading collection details...</div>
      </div>
    );
  }

  // Determine allocations
  // If allocations array exists, use it. Otherwise, construct one from legacy fields
  const allocations = currentCollection.allocations && currentCollection.allocations.length > 0
    ? currentCollection.allocations
    : currentCollection.billingNumber 
        ? [{
            billingId: "legacy",
            billingNumber: currentCollection.billingNumber,
            amount: currentCollection.amount,
            projectNumber: currentCollection.projectNumber
          }]
        : [];

  // Compute total amount from allocations (auto-updated)
  const computedAmount = (isEditing ? editedAllocations : allocations).reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#F9FAFB"
    }}>
      {/* Header - Matching ProjectDetail */}
      <div style={{
        background: "white",
        borderBottom: "1px solid var(--neuron-ui-border)",
        padding: "20px 48px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                color: "#667085",
                borderRadius: "6px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F3F4F6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ArrowLeft size={20} />
            </button>
            
            <div>
              {isEditing ? (() => {
                const raw = editedCollection.collectionNumber || "";
                const m = raw.match(/^(COL)\s*(\d{4})-(\d*)$/);
                const prefixText = "COL";
                const yearPart = m ? m[2] : String(new Date().getFullYear());
                const num = m ? m[3] : "";
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "8px", alignItems: "end" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Prefix</span>
                      <div style={{ height: "40px", padding: "0 12px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "14px", display: "flex", alignItems: "center", color: "#667085", backgroundColor: "#F9FAFB" }}>COL</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Year</span>
                      <input value={yearPart} onChange={e => { const y = e.target.value.replace(/\D/g, ""); setEditedCollection({ ...editedCollection, collectionNumber: `COL ${y}-${num}` }); }} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none", transition: "border-color 0.15s ease" }} onFocus={e => { e.currentTarget.style.borderColor = "#0F766E"; }} onBlur={e => { e.currentTarget.style.borderColor = "#E5E9F0"; }} />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Number</span>
                      <input value={num} onChange={e => { const n = e.target.value.replace(/\D/g, ""); setEditedCollection({ ...editedCollection, collectionNumber: `COL ${yearPart}-${n}` }); }} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "6px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none", transition: "border-color 0.15s ease" }} onFocus={e => { e.currentTarget.style.borderColor = "#0F766E"; }} onBlur={e => { e.currentTarget.style.borderColor = "#E5E9F0"; }} />
                    </div>
                  </div>
                );
              })() : (
                <h1 style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "var(--neuron-ink-primary)",
                  marginBottom: "0"
                }}>
                  {currentCollection.collectionNumber}
                </h1>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <HeaderStatusDropdown
              currentStatus={currentCollection.status}
              statusOptions={COLLECTION_STATUSES}
              statusColorMap={COLLECTION_STATUS_COLORS}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      {/* Standard Tabs */}
      <StandardTabs
        tabs={[
          { id: "overview", label: "Overview", icon: <FileText size={18} /> },
          { id: "billings", label: "Billings", icon: <Receipt size={18} /> },
          { id: "attachments", label: "Attachments", icon: <Paperclip size={18} /> },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as "overview" | "billings" | "attachments")}
        actions={
          <TabRowActions
            showTimeline={showTimeline}
            onToggleTimeline={() => setShowTimeline(!showTimeline)}
            editLabel={activeTab === "overview" ? "Edit Collection" : null}
            onEdit={() => {
              setEditedCollection(currentCollection);
              setEditedAllocations(currentCollection.allocations || []);
              setIsEditing(true);
            }}
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

      {/* Content Area */}
      <div style={{ flex: 1, overflow: "auto", background: "#F9FAFB" }}>
        
        <div style={{ display: activeTab === "overview" ? undefined : "none", padding: "32px 48px" }}>
            {/* Collection Information */}
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
            background: "#F9FAFB"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
              Collection Details
            </h3>
          </div>

          <div style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {isEditing ? (
                <>
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--neuron-ink-base)",
                      marginBottom: "8px"
                    }}>
                      Date
                    </label>
                    <SingleDateInput
                      value={(() => {
                        try {
                          const d = new Date(editedCollection.collectionDate);
                          return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
                        } catch { return ""; }
                      })()}
                      onChange={(iso) => setEditedCollection({ ...editedCollection, collectionDate: iso })}
                      placeholder="Select date"
                    />
                  </div>
                  
                  <FilterSingleDropdown
                    label="Payment Method"
                    value={editedCollection.paymentMethod || ""}
                    options={[
                      { value: "Cash", label: "Cash" },
                      { value: "Bank Transfer", label: "Bank Transfer" },
                      { value: "Check", label: "Check" }
                    ]}
                    onChange={(value) => setEditedCollection({ ...editedCollection, paymentMethod: value })}
                    placeholder="Select payment method"
                  />
                  
                  <StandardInput
                    label="Reference Number"
                    value={editedCollection.referenceNumber || ""}
                    onChange={(value) => setEditedCollection({ ...editedCollection, referenceNumber: value })}
                    placeholder="Enter reference number"
                  />
                  
                  {/* Only show single Billing Number field if it's not a multi-allocation, OR if we want to allow editing the primary link */}
                  {/* With multi-allocation, this field is less relevant. */}
                  {!currentCollection.allocations && (
                      <StandardInput
                        label="Billing Number"
                        value={editedCollection.billingNumber || ""}
                        onChange={(value) => setEditedCollection({ ...editedCollection, billingNumber: value })}
                        placeholder="Enter billing number"
                      />
                  )}

                  {editedCollection.paymentMethod === "Bank Transfer" && (
                    <StandardInput
                      label="Bank Name"
                      value={editedCollection.bankName || ""}
                      onChange={(value) => setEditedCollection({ ...editedCollection, bankName: value })}
                      placeholder="Enter bank name"
                    />
                  )}
                </>
              ) : (
                <>
                  <Field 
                    label="Date" 
                    value={formatDate(currentCollection.collectionDate)}
                  />
                  
                  <Field 
                    label="Payment Method" 
                    value={currentCollection.paymentMethod}
                  />
                  
                  <Field 
                    label="Reference Number" 
                    value={currentCollection.referenceNumber}
                  />

                  {currentCollection.paymentMethod === "Bank Transfer" && (
                    <Field 
                      label="Bank Name" 
                      value={currentCollection.bankName}
                    />
                  )}
                </>
              )}
            </div>
            

          </div>
        </div>

        {/* Allocations Table */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #E5E9F0",
          overflow: "hidden"
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
              Payment Allocation
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#667085" }}>
                {(isEditing ? editedAllocations : allocations).length} Invoice{(isEditing ? editedAllocations : allocations).length !== 1 ? "s" : ""}
              </span>
              {isEditing && (
                <button
                  onClick={() => {
                    setEditedAllocations([
                      ...editedAllocations,
                      { billingId: `new-${Date.now()}`, billingNumber: "", amount: 0 }
                    ]);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#0F766E",
                    background: "white",
                    border: "1.5px solid #0F766E",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F0FDF4"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                >
                  <Plus size={14} />
                  Add Row
                </button>
              )}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Invoice #</th>
                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Booking</th>
                <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Applied Amount</th>
                {isEditing && (
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", width: "60px" }}></th>
                )}
              </tr>
            </thead>
            <tbody>
              {isEditing ? (
                editedAllocations.length > 0 ? (
                  editedAllocations.map((alloc, index) => (
                    <tr key={alloc.billingId || index} style={{ borderBottom: "1px solid #E5E9F0" }}>
                      <td style={{ padding: "12px 24px" }}>
                        <input
                          type="text"
                          value={alloc.billingNumber}
                          onChange={(e) => {
                            const updated = [...editedAllocations];
                            updated[index] = { ...updated[index], billingNumber: e.target.value };
                            setEditedAllocations(updated);
                          }}
                          placeholder="Enter invoice #"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#0A1D4D",
                            border: "1.5px solid #E5E9F0",
                            borderRadius: "6px",
                            outline: "none",
                            background: "white",
                            transition: "border-color 0.15s ease"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                        />
                      </td>
                      <td style={{ padding: "12px 24px" }}>
                        <input
                          type="text"
                          value={alloc.bookingNumber || alloc.projectNumber || ""}
                          onChange={(e) => {
                            const updated = [...editedAllocations];
                            updated[index] = { ...updated[index], bookingNumber: e.target.value };
                            setEditedAllocations(updated);
                          }}
                          placeholder="Booking #"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "14px",
                            color: "#0F766E",
                            border: "1.5px solid #E5E9F0",
                            borderRadius: "6px",
                            outline: "none",
                            background: "white",
                            transition: "border-color 0.15s ease"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                        />
                      </td>
                      <td style={{ padding: "12px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                          <span style={{ fontSize: "14px", color: "#667085", fontWeight: 500 }}>₱</span>
                          <input
                            type="number"
                            value={alloc.amount || ""}
                            onChange={(e) => {
                              const updated = [...editedAllocations];
                              updated[index] = { ...updated[index], amount: parseFloat(e.target.value) || 0 };
                              setEditedAllocations(updated);
                            }}
                            placeholder="0.00"
                            style={{
                              width: "140px",
                              padding: "8px 12px",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#0A1D4D",
                              border: "1.5px solid #E5E9F0",
                              borderRadius: "6px",
                              outline: "none",
                              background: "white",
                              textAlign: "right",
                              transition: "border-color 0.15s ease"
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                            onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                          />
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button
                          onClick={() => {
                            setEditedAllocations(editedAllocations.filter((_, i) => i !== index));
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "#667085", fontSize: "14px" }}>
                      No allocations. Click "Add Row" to add an invoice allocation.
                    </td>
                  </tr>
                )
              ) : (
                allocations.length > 0 ? (
                  allocations.map((alloc, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #E5E9F0" }}>
                      <td style={{ padding: "16px 24px", fontSize: "14px", color: "#0A1D4D", fontWeight: 500 }}>
                        {alloc.billingNumber}
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "14px", color: "#0F766E" }}>
                        {alloc.bookingNumber || alloc.projectNumber || "—"}
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "14px", color: "#0A1D4D", textAlign: "right" }}>
                        ₱{formatAmount(alloc.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ padding: "32px", textAlign: "center", color: "#667085", fontSize: "14px" }}>
                      No invoice allocations found.
                    </td>
                  </tr>
                )
              )}
            </tbody>
            {(() => {
              const displayAllocations = isEditing ? editedAllocations : allocations;
              if (displayAllocations.length === 0) return null;
              const total = displayAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
              return (
                <tfoot style={{ background: "#F9FAFB", borderTop: "2px solid #E5E9F0" }}>
                  <tr>
                    <td colSpan={isEditing ? 2 : 2} style={{ padding: "16px 24px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#0A1D4D" }}>
                      Total Allocated:
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: "#0A1D4D" }}>
                      ₱{formatAmount(total)}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>

              {/* Notes Section */}
              <NotesSection
                value={isEditing ? (editedCollection.notes || "") : (currentCollection.notes || "")}
                onChange={(val) => setEditedCollection({ ...editedCollection, notes: val })}
                disabled={!isEditing}
              />


          </div>

        <div style={{ display: activeTab === "billings" ? undefined : "none" }}>
          <CollectionBillingsTab
            collectionId={currentCollection.id}
            collectionNumber={currentCollection.collectionNumber}
            allocations={allocations}
          />
        </div>

        <div style={{ display: activeTab === "attachments" ? undefined : "none" }}>
          <AttachmentsTab
            entityType="collection"
            entityId={currentCollection.id}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(18, 51, 43, 0.15)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              width: "480px",
              padding: "32px",
              borderRadius: "12px",
              border: "1px solid var(--neuron-ui-border)",
              boxShadow: "0 4px 24px rgba(18, 51, 43, 0.12)"
            }}
          >
            <h2 style={{ 
              fontSize: "20px", 
              fontWeight: 600, 
              color: "#0A1D4D", 
              marginBottom: "12px" 
            }}>
              Delete Collection?
            </h2>
            <p style={{ 
              fontSize: "14px", 
              color: "#667085", 
              marginBottom: "24px", 
              lineHeight: "1.5"
            }}>
              Are you sure you want to delete collection <strong>{currentCollection.collectionNumber}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <StandardButton
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </StandardButton>
              <StandardButton
                variant="danger"
                onClick={handleDeleteCollection}
                icon={<Trash2 size={16} />}
              >
                Delete Collection
              </StandardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}