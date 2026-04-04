import { useState, useEffect } from "react";
import { FileText, Plus, Edit3, Save, X } from "lucide-react";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import type { FormE } from "../../../types/export-documents";

// ── Shared helpers (same pattern as DeclarationTab) ─────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E9F0", marginBottom: "24px" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #E5E9F0" }}>
        <h3 style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0F766E", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gap: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

function FieldView({ label, value }: { label: string; value: string }) {
  const isEmpty = !value || value.trim() === "";
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <div style={{
        padding: "10px 14px", backgroundColor: isEmpty ? "white" : "#F9FAFB",
        border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0", borderRadius: "6px",
        fontSize: "14px", color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
        minHeight: "42px", display: "flex", alignItems: "center",
      }}>
        {isEmpty ? "—" : value}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "—"}
        style={{
          width: "100%", padding: "10px 14px",
          border: "1px solid #0F766E", borderRadius: "6px",
          fontSize: "14px", color: "var(--neuron-ink-primary)", background: "white",
          outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "—"}
        rows={5}
        style={{
          width: "100%", padding: "10px 14px",
          border: "1px solid #0F766E", borderRadius: "6px",
          fontSize: "14px", color: "var(--neuron-ink-primary)", background: "white",
          outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function TextAreaView({ label, value }: { label: string; value: string }) {
  const isEmpty = !value || value.trim() === "";
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <div style={{
        padding: "10px 14px", backgroundColor: isEmpty ? "white" : "#F9FAFB",
        border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0", borderRadius: "6px",
        fontSize: "14px", color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
        minHeight: "120px", whiteSpace: "pre-wrap",
      }}>
        {isEmpty ? "—" : value}
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <SingleDateInput value={value} onChange={onChange} placeholder="YYYY-MM-DD" />
    </div>
  );
}

// ── Empty default ───────────────────────────────────────────────────

const emptyFormE: Omit<FormE, "createdAt" | "updatedAt" | "createdBy"> = {
  exporterName: "",
  exporterAddress: "",
  exporterContactNumber: "",
  exporterEmail: "",
  consigneeName: "",
  consigneeAddress: "",
  consigneeContactNumber: "",
  consigneeContactEmail: "",
  consigneeContactPerson: "",
  meansOfTransport: "",
  departureDate: "",
  vessel: "",
  portOfDischarge: "",
  itemNumber: "",
  marksAndNumbers: "",
  packagesDescription: "",
  originCriteria: "",
  grossWeight: "",
  invoiceNumber: "",
  invoiceDated: "",
  exporterCountry: "",
  importingCountry: "",
};

// ── Main component ──────────────────────────────────────────────────

interface FormETabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
}

export function FormETab({ bookingId, booking, currentUser, onDocumentUpdated }: FormETabProps) {
  const [doc, setDoc] = useState<FormE | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<FormE>>({});

  const fetchDocuments = async () => {
    try {
      const id = encodeURIComponent(bookingId);
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setDoc(result.data.formE || result.data["form-e"] || null);
      }
    } catch (err) {
      console.error("Error fetching Form E:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [bookingId]);

  const handleCreate = () => {
    setEditData({ ...emptyFormE });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (!doc) return;
    setEditData({ ...doc });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditData({});
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const id = encodeURIComponent(bookingId);
      const payload = { ...editData, createdBy: currentUser?.name || "Unknown" };
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/form-e`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setDoc(result.data);
        setIsEditing(false);
        setIsCreating(false);
        setEditData({});
        toast.success(isCreating ? "Form E created" : "Form E updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving Form E:", err);
      toast.error("Failed to save Form E");
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: keyof FormE) => {
    return isEditing ? (editData[key] as string || "") : (doc?.[key] as string || "");
  };

  const setField = (key: keyof FormE, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  // Empty state — no Form E yet
  if (!doc && !isEditing) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No Form E record</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Form E certificate of origin for this booking.</p>
          <button onClick={handleCreate} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={15} /> Create Form E
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>Form E</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {isEditing ? (
            <>
              <button onClick={handleCancel} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, border: "1px solid #D1D5DB", borderRadius: "8px", background: "white", color: "#374151", cursor: "pointer" }}>
                <X size={14} /> Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "white", cursor: "pointer", opacity: isSaving ? 0.6 : 1 }}>
                <Save size={14} /> {isSaving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button onClick={handleEdit} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, border: "1px solid #D1D5DB", borderRadius: "8px", background: "white", color: "#374151", cursor: "pointer" }}>
              <Edit3 size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Exporter */}
      <SectionCard title="Exporter">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Exporter" value={field("exporterName")} onChange={(v) => setField("exporterName", v)} placeholder="Exporter name" />
          ) : (
            <FieldView label="Exporter" value={field("exporterName")} />
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("exporterAddress")} onChange={(v) => setField("exporterAddress", v)} placeholder="Exporter address" />
          ) : (
            <FieldView label="Address" value={field("exporterAddress")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact Number" value={field("exporterContactNumber")} onChange={(v) => setField("exporterContactNumber", v)} placeholder="Contact number" />
          ) : (
            <FieldView label="Contact Number" value={field("exporterContactNumber")} />
          )}
          {isEditing ? (
            <FieldInput label="Email" value={field("exporterEmail")} onChange={(v) => setField("exporterEmail", v)} placeholder="Email address" />
          ) : (
            <FieldView label="Email" value={field("exporterEmail")} />
          )}
        </div>
      </SectionCard>

      {/* Consignee */}
      <SectionCard title="Consignee">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Consignee" value={field("consigneeName")} onChange={(v) => setField("consigneeName", v)} placeholder="Consignee name" />
          ) : (
            <FieldView label="Consignee" value={field("consigneeName")} />
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("consigneeAddress")} onChange={(v) => setField("consigneeAddress", v)} placeholder="Consignee address" />
          ) : (
            <FieldView label="Address" value={field("consigneeAddress")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact Number" value={field("consigneeContactNumber")} onChange={(v) => setField("consigneeContactNumber", v)} placeholder="Contact number" />
          ) : (
            <FieldView label="Contact Number" value={field("consigneeContactNumber")} />
          )}
          {isEditing ? (
            <FieldInput label="Contact Email" value={field("consigneeContactEmail")} onChange={(v) => setField("consigneeContactEmail", v)} placeholder="Contact email" />
          ) : (
            <FieldView label="Contact Email" value={field("consigneeContactEmail")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact Person" value={field("consigneeContactPerson")} onChange={(v) => setField("consigneeContactPerson", v)} placeholder="Contact person" />
          ) : (
            <FieldView label="Contact Person" value={field("consigneeContactPerson")} />
          )}
        </div>
      </SectionCard>

      {/* Shipping Details */}
      <SectionCard title="Shipping Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Means of Transport" value={field("meansOfTransport")} onChange={(v) => setField("meansOfTransport", v)} placeholder="Means of transport" />
          ) : (
            <FieldView label="Means of Transport" value={field("meansOfTransport")} />
          )}
          {isEditing ? (
            <DateField label="Departure Date" value={field("departureDate")} onChange={(v) => setField("departureDate", v)} />
          ) : (
            <FieldView label="Departure Date" value={field("departureDate")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Vessel" value={field("vessel")} onChange={(v) => setField("vessel", v)} placeholder="Vessel name" />
          ) : (
            <FieldView label="Vessel" value={field("vessel")} />
          )}
          {isEditing ? (
            <FieldInput label="Port of Discharge" value={field("portOfDischarge")} onChange={(v) => setField("portOfDischarge", v)} placeholder="Port of discharge" />
          ) : (
            <FieldView label="Port of Discharge" value={field("portOfDischarge")} />
          )}
        </div>
      </SectionCard>

      {/* Goods */}
      <SectionCard title="Goods">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Item Number" value={field("itemNumber")} onChange={(v) => setField("itemNumber", v)} placeholder="Item number" />
          ) : (
            <FieldView label="Item Number" value={field("itemNumber")} />
          )}
          {isEditing ? (
            <FieldInput label="Marks and Numbers" value={field("marksAndNumbers")} onChange={(v) => setField("marksAndNumbers", v)} placeholder="Marks and numbers" />
          ) : (
            <FieldView label="Marks and Numbers" value={field("marksAndNumbers")} />
          )}
        </div>
        {/* Large text area for packages/description */}
        {isEditing ? (
          <TextAreaField label="Number and type of packages, description of products" value={field("packagesDescription")} onChange={(v) => setField("packagesDescription", v)} placeholder="Enter number and type of packages, description of products..." />
        ) : (
          <TextAreaView label="Number and type of packages, description of products" value={field("packagesDescription")} />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Origin Criteria" value={field("originCriteria")} onChange={(v) => setField("originCriteria", v)} placeholder="Origin criteria" />
          ) : (
            <FieldView label="Origin Criteria" value={field("originCriteria")} />
          )}
          {isEditing ? (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Gross Weight</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  value={field("grossWeight")}
                  onChange={(e) => setField("grossWeight", e.target.value)}
                  placeholder="0.00"
                  style={{
                    flex: 1, padding: "10px 14px",
                    border: "1px solid #0F766E", borderRadius: "6px",
                    fontSize: "14px", color: "var(--neuron-ink-primary)", background: "white",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#667085", whiteSpace: "nowrap" }}>KGS</span>
              </div>
            </div>
          ) : (
            <FieldView label="Gross Weight" value={field("grossWeight") ? `${field("grossWeight")} KGS` : ""} />
          )}
        </div>
      </SectionCard>

      {/* Invoice */}
      <SectionCard title="Invoice">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Invoice Number" value={field("invoiceNumber")} onChange={(v) => setField("invoiceNumber", v)} placeholder="Invoice number" />
          ) : (
            <FieldView label="Invoice Number" value={field("invoiceNumber")} />
          )}
          {isEditing ? (
            <DateField label="Dated" value={field("invoiceDated")} onChange={(v) => setField("invoiceDated", v)} />
          ) : (
            <FieldView label="Dated" value={field("invoiceDated")} />
          )}
        </div>
      </SectionCard>

      {/* Countries */}
      <SectionCard title="Countries">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Exporter Country" value={field("exporterCountry")} onChange={(v) => setField("exporterCountry", v)} placeholder="Exporter country" />
          ) : (
            <FieldView label="Exporter Country" value={field("exporterCountry")} />
          )}
          {isEditing ? (
            <FieldInput label="Importing Country" value={field("importingCountry")} onChange={(v) => setField("importingCountry", v)} placeholder="Importing country" />
          ) : (
            <FieldView label="Importing Country" value={field("importingCountry")} />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
