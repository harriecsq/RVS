import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus, Edit3, Save, X, AlertCircle } from "lucide-react";
import { NeuronDropdown } from "../../shared/NeuronDropdown";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import { buildDeclarationDefaults, applyTemplate } from "../../../utils/export-document-autofill";
import type { Declaration, DeclarationContainer, SalesContract } from "../../../types/export-documents";
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

function FieldInput({ label, value, onChange, readOnly, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; readOnly?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder || "—"}
        style={{
          width: "100%", padding: "10px 14px",
          border: `1px solid ${readOnly ? "#E5E9F0" : "#0F766E"}`, borderRadius: "6px",
          fontSize: "14px", color: "var(--neuron-ink-primary)", background: readOnly ? "#F9FAFB" : "white",
          outline: "none", boxSizing: "border-box",
        }}
      />
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

// ── Main component ───────────────────────────────────────────────────

interface DeclarationTabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: import("./SalesContractTab").DocumentEditState) => void;
}

export function DeclarationTab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange }: DeclarationTabProps) {
  const [doc, setDoc] = useState<Declaration | null>(null);
  const [sc, setSc] = useState<SalesContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Declaration>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;
  const { templates, fetchTemplateFields } = useDocTemplates("declaration", booking?.clientId);
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
        setDoc(result.data.declaration || null);
        setSc(result.data.salesContract || null);
        // Parse existing refNo to populate compound fields
        const existingRef = result.data.declaration?.refNo || "";
        const match = existingRef.match(/^(\w+)\s+(\d{4})-(\d+)$/);
        if (match) {
          setRefCompanyCode(match[1]);
          setRefYear(match[2]);
          setRefNumber(match[3]);
        }
      }
    } catch (err) {
      console.error("Error fetching declaration:", err);
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
    let merged = buildDeclarationDefaults(booking, sc || undefined);
    if (templateFields) { merged = applyTemplate(merged, templateFields, "declaration"); }
    setEditData({ ...merged, refNo: buildRefNo() });
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
    // Parse existing refNo into compound fields
    const match = (doc.refNo || "").match(/^(\w+)\s+(\d{4})-(\d+)$/);
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
      const payload = { ...editDataRef.current, refNo: buildRefNo(), createdBy: currentUser?.name || "Unknown" };
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/declaration`, {
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
        toast.success(isCreating ? "Declaration created" : "Declaration updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving declaration:", err);
      toast.error("Failed to save Declaration");
    } finally {
      setIsSaving(false);
    }
  }, [bookingId, currentUser?.name]);

  useEffect(() => {
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: doc?.refNo || (isEditing ? buildRefNo() : ""),
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc?.refNo]);

  const field = (key: keyof Declaration) => {
    return isEditing ? (editData[key] as string || "") : (doc?.[key] as string || "");
  };

  const setField = (key: keyof Declaration, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  if (!sc && !doc) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <AlertCircle size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>Sales Contract required</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>Create a Sales Contract first to generate a Declaration.</p>
        </div>
      </div>
    );
  }

  if (!doc && !isEditing) {
    if (showTemplatePicker) {
      return <TemplatePickerView onSelect={handleTemplateSelect} onCancel={() => setShowTemplatePicker(false)} templates={templates} docType="declaration" />;
    }
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No Declaration record</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Declaration for this booking.</p>
          <button onClick={handleCreateClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={15} /> Create Declaration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      <SectionCard title="Declaration Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Ref No.</label>
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
            <FieldView label="Ref No." value={doc?.refNo || ""} />
          )}
          {isEditing ? (
            <DateField label="Date" value={field("date")} onChange={(v) => setField("date", v)} />
          ) : (
            <FieldView label="Date" value={field("date")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Vessel/Voyage" value={field("vesselVoyage")} onChange={(v) => setField("vesselVoyage", v)} />
          ) : (
            <FieldView label="Vessel/Voyage" value={field("vesselVoyage")} />
          )}
          {isEditing ? (
            <FieldInput label="B/L Number" value={field("blNumber")} onChange={(v) => setField("blNumber", v)} />
          ) : (
            <FieldView label="B/L Number" value={field("blNumber")} />
          )}
        </div>
        {/* Container table — individual rows per container */}
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Containers</label>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #E5E9F0", borderRadius: "8px", overflow: "hidden" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                <th style={{ padding: "10px 14px", fontSize: "12px", fontWeight: 600, color: "#667085", textAlign: "left", borderBottom: "1px solid #E5E9F0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Container No.</th>
                <th style={{ padding: "10px 14px", fontSize: "12px", fontWeight: 600, color: "#667085", textAlign: "left", borderBottom: "1px solid #E5E9F0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Seal No.</th>
                {isEditing && <th style={{ padding: "10px 14px", width: "50px", borderBottom: "1px solid #E5E9F0" }} />}
              </tr>
            </thead>
            <tbody>
              {(isEditing ? (editData.containers || []) : (doc?.containers || [])).map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #E5E9F0" }}>
                  <td style={{ padding: isEditing ? "6px 8px" : "10px 14px" }}>
                    {isEditing ? (
                      <input type="text" value={row.containerNo} onChange={(e) => {
                        const updated = [...(editData.containers || [])];
                        updated[idx] = { ...updated[idx], containerNo: e.target.value };
                        setEditData((prev) => ({ ...prev, containers: updated }));
                      }} placeholder="Container #" style={{ width: "100%", padding: "8px 12px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                    ) : (
                      <span style={{ fontSize: "14px", color: row.containerNo ? "var(--neuron-ink-primary)" : "#9CA3AF" }}>{row.containerNo || "—"}</span>
                    )}
                  </td>
                  <td style={{ padding: isEditing ? "6px 8px" : "10px 14px" }}>
                    {isEditing ? (
                      <input type="text" value={row.sealNo} onChange={(e) => {
                        const updated = [...(editData.containers || [])];
                        updated[idx] = { ...updated[idx], sealNo: e.target.value };
                        setEditData((prev) => ({ ...prev, containers: updated }));
                      }} placeholder="Seal #" style={{ width: "100%", padding: "8px 12px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                    ) : (
                      <span style={{ fontSize: "14px", color: row.sealNo ? "var(--neuron-ink-primary)" : "#9CA3AF" }}>{row.sealNo || "—"}</span>
                    )}
                  </td>
                  {isEditing && (
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      <button onClick={() => {
                        const updated = (editData.containers || []).filter((_, i) => i !== idx);
                        setEditData((prev) => ({ ...prev, containers: updated }));
                      }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px" }} title="Remove row">
                        <X size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {(isEditing ? (editData.containers || []) : (doc?.containers || [])).length === 0 && (
                <tr><td colSpan={isEditing ? 3 : 2} style={{ padding: "16px 14px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No containers</td></tr>
              )}
            </tbody>
          </table>
          {isEditing && (
            <button onClick={() => {
              const updated = [...(editData.containers || []), { containerNo: "", sealNo: "" }];
              setEditData((prev) => ({ ...prev, containers: updated }));
            }} style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "13px", fontWeight: 500, border: "1px dashed #0F766E", borderRadius: "6px", background: "white", color: "#0F766E", cursor: "pointer" }}>
              <Plus size={14} /> Add Container
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Description (Commodity)" value={field("description")} onChange={(v) => setField("description", v)} />
          ) : (
            <FieldView label="Description (Commodity)" value={field("description")} />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
