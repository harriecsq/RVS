import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus, Edit3, X, AlertCircle } from "lucide-react";
import { NeuronDropdown } from "../../shared/NeuronDropdown";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import { buildCommercialInvoiceDefaults, applyTemplate } from "../../../utils/export-document-autofill";
import type { CommercialInvoice, SalesContract } from "../../../types/export-documents";
import { TemplatePickerView } from "./TemplatePickerView";
import { useDocTemplates } from "../../../hooks/useDocTemplates";

// ── Constants ────────────────────────────────────────────────────────

const COMPANY_CODE_OPTIONS = ["SCI", "RDS", "RVS", "SW"];

// ── NeuronDropdown (matches voucher/billing pattern) ─────────────────


// ── Shared helpers ───────────────────────────────────────────────────

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

function FieldView({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  const isEmpty = !value || value.trim() === "";
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <div style={{
        padding: "10px 14px", backgroundColor: isEmpty ? "white" : "#F9FAFB",
        border: isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0", borderRadius: "6px",
        fontSize: "14px", color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
        minHeight: "42px", display: "flex", alignItems: "center", gap: "6px",
      }}>
        {isEmpty ? "—" : value}
        {!isEmpty && suffix && <span style={{ color: "#667085", fontSize: "12px" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, suffix, placeholder, readOnly }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder || "—"}
          style={{
            width: "100%", padding: "10px 14px", paddingRight: suffix ? "48px" : "14px",
            border: `1px solid ${readOnly ? "#E5E9F0" : "#0F766E"}`, borderRadius: "6px",
            fontSize: "14px", color: "var(--neuron-ink-primary)", background: readOnly ? "#F9FAFB" : "white",
            outline: "none", boxSizing: "border-box",
          }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#667085", fontWeight: 500, pointerEvents: "none" }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  if (readOnly) return <FieldView label={label} value={value} />;
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <SingleDateInput value={value} onChange={onChange} placeholder="YYYY-MM-DD" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface CommercialInvoiceTabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: import("./SalesContractTab").DocumentEditState) => void;
}

export function CommercialInvoiceTab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange }: CommercialInvoiceTabProps) {
  const [doc, setDoc] = useState<CommercialInvoice | null>(null);
  const [sc, setSc] = useState<SalesContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<CommercialInvoice>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;
  const { templates, fetchTemplateFields } = useDocTemplates("commercialInvoice", booking?.clientId);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Compound ref number fields (editable like voucher/billing)
  const [refCompanyCode, setRefCompanyCode] = useState("RVS");
  const [refYear, setRefYear] = useState(String(new Date().getFullYear()));
  const [refNumber, setRefNumber] = useState("");
  const [nextRefNumber, setNextRefNumber] = useState<number | null>(null);

  const fetchDocuments = async () => {
    try {
      const id = encodeURIComponent(bookingId);
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setDoc(result.data.commercialInvoice || null);
        setSc(result.data.salesContract || null);
        // Parse existing invoiceNo to populate compound fields
        const existingRef = result.data.commercialInvoice?.invoiceNo || "";
        const match = existingRef.match(/^(\w+)\s+(\d{4})-(\d+)$/);
        if (match) {
          setRefCompanyCode(match[1]);
          setRefYear(match[2]);
          setRefNumber(match[3]);
        }
      }
    } catch (err) {
      console.error("Error fetching commercial invoice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch next available ref number when company code or year changes
  const fetchNextRef = async (companyCode: string, year: string) => {
    try {
      const params = new URLSearchParams({ companyCode, year });
      const res = await fetch(`${API_BASE_URL}/next-ref/export-document?${params}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success) setNextRefNumber(result.nextNumber);
    } catch {}
  };

  useEffect(() => { fetchDocuments(); }, [bookingId]);
  useEffect(() => { fetchNextRef(refCompanyCode, refYear); }, [refCompanyCode, refYear]);

  // Build the full ref number from compound fields
  const buildRefNo = () => {
    const num = refNumber.trim() || (nextRefNumber !== null ? String(nextRefNumber) : "1");
    return `${refCompanyCode} ${refYear}-${num}`;
  };

  const handleCreateClick = () => {
    setShowTemplatePicker(true);
  };

  const proceedWithCreate = (templateFields: Record<string, any> | null) => {
    let merged = buildCommercialInvoiceDefaults(booking, sc || undefined);
    if (templateFields) { merged = applyTemplate(merged, templateFields, "commercialInvoice"); }
    setEditData({ ...merged, invoiceNo: buildRefNo() });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleTemplateSelect = async (templateId: string | null) => {
    setShowTemplatePicker(false);
    if (!templateId) { proceedWithCreate(null); return; }
    const fields = await fetchTemplateFields(templateId);
    proceedWithCreate(fields);
  };

  const handleEdit = () => {
    if (!doc) return;
    setEditData({ ...doc });
    // Parse existing invoiceNo into compound fields
    const match = (doc.invoiceNo || "").match(/^(\w+)\s+(\d{4})-(\d+)$/);
    if (match) {
      setRefCompanyCode(match[1]);
      setRefYear(match[2]);
      setRefNumber(match[3]);
    }
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditData({});
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const id = encodeURIComponent(bookingId);
      const payload = { ...editDataRef.current, invoiceNo: buildRefNo(), createdBy: currentUser?.name || "Unknown" };
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/commercial-invoice`, {
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
        toast.success(isCreating ? "Commercial Invoice created" : "Commercial Invoice updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving commercial invoice:", err);
      toast.error("Failed to save Commercial Invoice");
    } finally {
      setIsSaving(false);
    }
  }, [bookingId, currentUser?.name]);

  useEffect(() => {
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: doc?.invoiceNo || (isEditing ? buildRefNo() : ""),
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc?.invoiceNo]);

  const field = (key: keyof CommercialInvoice) => {
    return isEditing ? (editData[key] as string || "") : (doc?.[key] as string || "");
  };

  const setField = (key: keyof CommercialInvoice, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  // Require Sales Contract first
  if (!sc && !doc) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <AlertCircle size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>Sales Contract required</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>Create a Sales Contract first to generate a Commercial Invoice.</p>
        </div>
      </div>
    );
  }

  if (!doc && !isEditing) {
    if (showTemplatePicker) {
      return <TemplatePickerView onSelect={handleTemplateSelect} onCancel={() => setShowTemplatePicker(false)} templates={templates} docType="commercialInvoice" />;
    }
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No Commercial Invoice record</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Commercial Invoice for this booking.</p>
          <button onClick={handleCreateClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={15} /> Create Commercial Invoice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      {/* Shipping + Invoice Details */}
      <SectionCard title="Invoice Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Port of Loading" value={field("portOfLoading")} onChange={(v) => setField("portOfLoading", v)} />
          ) : (
            <FieldView label="Port of Loading" value={field("portOfLoading")} />
          )}
          {isEditing ? (
            <FieldInput label="Port of Discharge" value={field("portOfDischarge")} onChange={(v) => setField("portOfDischarge", v)} />
          ) : (
            <FieldView label="Port of Discharge" value={field("portOfDischarge")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Invoice No.</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.8fr", gap: "8px" }}>
                <NeuronDropdown value={refCompanyCode} onChange={setRefCompanyCode} options={COMPANY_CODE_OPTIONS} placeholder="Code" />
                <input
                  type="text"
                  value={refYear}
                  onChange={(e) => setRefYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Year"
                  style={{ width: "100%", padding: "0 12px", height: "40px", border: "1px solid #0F766E", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder={nextRefNumber !== null ? String(nextRefNumber) : "#"}
                  style={{ width: "100%", padding: "0 12px", height: "40px", border: "1px solid #0F766E", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <p style={{ fontSize: "12px", marginTop: "8px", color: "#9CA3AF" }}>
                {buildRefNo()}
              </p>
            </div>
          ) : (
            <FieldView label="Invoice No." value={doc?.invoiceNo || ""} />
          )}
          {isEditing ? (
            <DateField label="Date" value={field("date")} onChange={(v) => setField("date", v)} />
          ) : (
            <FieldView label="Date" value={field("date")} />
          )}
        </div>
      </SectionCard>

      {/* Consignee */}
      <SectionCard title="Consignee">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Consignee" value={field("consigneeName")} onChange={(v) => setField("consigneeName", v)} />
          ) : (
            <FieldView label="Consignee" value={field("consigneeName")} />
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("consigneeAddress")} onChange={(v) => setField("consigneeAddress", v)} />
          ) : (
            <FieldView label="Address" value={field("consigneeAddress")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact" value={field("consigneeContact")} onChange={(v) => setField("consigneeContact", v)} />
          ) : (
            <FieldView label="Contact" value={field("consigneeContact")} />
          )}
          {isEditing ? (
            <FieldInput label="Phone" value={field("consigneePhone")} onChange={(v) => setField("consigneePhone", v)} />
          ) : (
            <FieldView label="Phone" value={field("consigneePhone")} />
          )}
          {isEditing ? (
            <FieldInput label="Email" value={field("consigneeEmail")} onChange={(v) => setField("consigneeEmail", v)} />
          ) : (
            <FieldView label="Email" value={field("consigneeEmail")} />
          )}
        </div>
      </SectionCard>

      {/* Goods */}
      <SectionCard title="Goods">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {(() => {
            const containerNo = booking?.containerNo || "";
            const containerCount = containerNo ? (Array.isArray(containerNo) ? containerNo : containerNo.split(',').map((s: string) => s.trim()).filter(Boolean)).length : 0;
            const marksVal = field("marksAndNos");
            const displayValue = marksVal ? `${containerCount}x${marksVal} CONTAINER` : "";
            if (isEditing) {
              return (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Marks & Nos</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "var(--neuron-ink-primary)", whiteSpace: "nowrap" }}>{containerCount}x</span>
                    <input
                      type="text"
                      value={marksVal}
                      onChange={(e) => setField("marksAndNos", e.target.value)}
                      placeholder="e.g. 40'HC"
                      style={{ flex: 1, padding: "10px 14px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "14px", color: "var(--neuron-ink-primary)", background: "white", outline: "none", boxSizing: "border-box" }}
                    />
                    <span style={{ fontSize: "14px", color: "var(--neuron-ink-primary)", whiteSpace: "nowrap" }}>CONTAINER</span>
                  </div>
                </div>
              );
            }
            return <FieldView label="Marks & Nos" value={displayValue} />;
          })()}
          {isEditing ? (
            <FieldInput label="Description" value={field("description")} onChange={(v) => setField("description", v)} />
          ) : (
            <FieldView label="Description" value={field("description")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Total Net Weight" value={field("totalNetWeight")} onChange={(v) => setField("totalNetWeight", v)} suffix="MT" />
          ) : (
            <FieldView label="Total Net Weight" value={field("totalNetWeight")} suffix="MT" />
          )}
          {isEditing ? (
            <FieldInput label="Unit Price" value={field("unitPrice")} onChange={(v) => setField("unitPrice", v)} suffix="USD" />
          ) : (
            <FieldView label="Unit Price" value={field("unitPrice")} suffix="USD" />
          )}
          {isEditing ? (
            <FieldInput label="Total Invoice Value" value={field("totalInvoiceValue")} onChange={(v) => setField("totalInvoiceValue", v)} suffix="USD" />
          ) : (
            <FieldView label="Total Invoice Value" value={field("totalInvoiceValue")} suffix="USD" />
          )}
        </div>
      </SectionCard>

      {/* Bank Details */}
      <SectionCard title="Bank Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Bank" value={field("bankName")} onChange={(v) => setField("bankName", v)} />
          ) : (
            <FieldView label="Bank" value={field("bankName")} />
          )}
          {isEditing ? (
            <FieldInput label="Swift Code" value={field("swiftCode")} onChange={(v) => setField("swiftCode", v)} />
          ) : (
            <FieldView label="Swift Code" value={field("swiftCode")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Account No." value={field("accountNo")} onChange={(v) => setField("accountNo", v)} />
          ) : (
            <FieldView label="Account No." value={field("accountNo")} />
          )}
          {isEditing ? (
            <FieldInput label="Account Name" value={field("accountName")} onChange={(v) => setField("accountName", v)} />
          ) : (
            <FieldView label="Account Name" value={field("accountName")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Bank Address" value={field("bankAddress")} onChange={(v) => setField("bankAddress", v)} />
          ) : (
            <FieldView label="Bank Address" value={field("bankAddress")} />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
