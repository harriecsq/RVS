import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus, Search, ChevronsUpDown, Check } from "lucide-react";
import { PortalDropdown } from "../../shared/PortalDropdown";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import { applyTemplate } from "../../../utils/export-document-autofill";
import type { FormE } from "../../../types/export-documents";
import { TemplatableFieldOverlay } from "./TemplatableFieldOverlay";

// ── MetricDropdown ──────────────────────────────────────────────────

const DEFAULT_METRICS = ["Sacks", "Bags", "Boxes", "Cartons", "Drums", "Pallets"];

function MetricDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(() => {
    try { const s = localStorage.getItem("packing-list-metrics"); return s ? JSON.parse(s) : DEFAULT_METRICS; }
    catch { return DEFAULT_METRICS; }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50); }, [open]);
  const filtered = options.filter((o) => o.toLowerCase().includes(searchQuery.toLowerCase()));
  const exactMatch = options.some((o) => o.toLowerCase() === searchQuery.trim().toLowerCase());
  const canAdd = searchQuery.trim().length > 0 && !exactMatch;
  const handleAdd = () => {
    const name = searchQuery.trim();
    if (!name) return;
    const updated = [...options, name];
    setOptions(updated);
    localStorage.setItem("packing-list-metrics", JSON.stringify(updated));
    onChange(name); setOpen(false); setSearchQuery("");
  };
  return (
    <div style={{ position: "relative" }}>
      <button ref={buttonRef} type="button" onClick={() => { setOpen(!open); setSearchQuery(""); }}
        style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "6px", border: "1px solid #0F766E", background: "white", color: value ? "var(--neuron-ink-primary)" : "#667085", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", outline: "none", boxSizing: "border-box" }}>
        <span>{value || "Select metric"}</span>
        <ChevronsUpDown size={14} color="#667085" />
      </button>
      <PortalDropdown isOpen={open} onClose={() => { setOpen(false); setSearchQuery(""); }} triggerRef={buttonRef} minWidth="200px" align="left">
        <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px", border: "1px solid #E5E9F0", borderRadius: "6px" }}>
            <Search size={14} color="#667085" />
            <input ref={searchRef} autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search or add..." style={{ flex: 1, padding: "8px 0", border: "none", outline: "none", fontSize: "13px" }} />
          </div>
        </div>
        <div style={{ padding: "4px" }}>
          {filtered.map((o) => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); setSearchQuery(""); }}
              style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "space-between", background: value === o ? "#E8F2EE" : "transparent", color: "var(--neuron-ink-primary)" }}
              onMouseEnter={(e) => { if (value !== o) e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { if (value !== o) e.currentTarget.style.background = "transparent"; }}>
              {o}{value === o && <Check size={14} color="#0F766E" />}
            </div>
          ))}
          {canAdd && (
            <div onClick={handleAdd} style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px", color: "#0F766E" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#E8F2EE"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <Plus size={14} /> Add "{searchQuery.trim()}"
            </div>
          )}
        </div>
      </PortalDropdown>
    </div>
  );
}

const fmtNum = (v: string) => { const n = parseFloat(v.replace(/,/g, "")); return isNaN(n) ? v : n.toLocaleString("en-US"); };

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
  packagesVolume: "",
  packagesAmount: "",
  packagesAmountMetric: "Sacks",
  packagesCommodity: "",
  packagesNetWeight: "",
  packagesHsCode: "",
  packagesNotifyParty: "",
  packagesNotifyAddress: "",
  originCriteria: "",
  grossWeight: "",
  invoiceNumber: "",
  invoiceDated: "",
  exporterCountry: "",
  importingCountry: "",
  signatoryPlace: "",
  signatoryDate: "",
  authorizedSignatory: "",
};

// ── Main component ──────────────────────────────────────────────────

interface FormETabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: import("./SalesContractTab").DocumentEditState) => void;
  onTemplateSaveConfig?: (config: any) => void;
  initialDraftData?: Partial<FormE>;
}

export function FormETab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange, onTemplateSaveConfig, initialDraftData }: FormETabProps) {
  const [doc, setDoc] = useState<FormE | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<FormE>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;
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

  const handleCreateClick = () => { proceedWithCreate(null); };

  const proceedWithCreate = (templateFields: Record<string, any> | null) => {
    let merged: Partial<FormE> = { ...emptyFormE };
    if (initialDraftData) { merged = { ...merged, ...initialDraftData }; }
    if (templateFields) { merged = applyTemplate(merged, templateFields, "formE"); }
    setEditData(merged);
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const id = encodeURIComponent(bookingId);
      const payload = { ...editDataRef.current, createdBy: currentUser?.name || "Unknown" };
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
  }, [bookingId, currentUser?.name]);

  useEffect(() => {
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: "",
      docData: isEditing ? editData as any : doc,
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc, editData]);

  useEffect(() => {
    if (doc && !isEditing) {
      onTemplateSaveConfig?.({
        docType: "formE",
        docData: doc as any || {},
        clientId: booking?.clientId,
        clientName: booking?.customerName || booking?.clientName,
        currentUser,
      });
    } else {
      onTemplateSaveConfig?.(null);
    }
  }, [doc, isEditing]);

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
          <button onClick={handleCreateClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={15} /> Create Form E
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      {/* Exporter */}
      <SectionCard title="Exporter">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Exporter" value={field("exporterName")} onChange={(v) => setField("exporterName", v)} placeholder="Exporter name" />
          ) : (
            <TemplatableFieldOverlay fieldKey="exporterName"><FieldView label="Exporter" value={field("exporterName")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("exporterAddress")} onChange={(v) => setField("exporterAddress", v)} placeholder="Exporter address" />
          ) : (
            <TemplatableFieldOverlay fieldKey="exporterAddress"><FieldView label="Address" value={field("exporterAddress")} /></TemplatableFieldOverlay>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact Number" value={field("exporterContactNumber")} onChange={(v) => setField("exporterContactNumber", v)} placeholder="Contact number" />
          ) : (
            <TemplatableFieldOverlay fieldKey="exporterContactNumber"><FieldView label="Contact Number" value={field("exporterContactNumber")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <FieldInput label="Email" value={field("exporterEmail")} onChange={(v) => setField("exporterEmail", v)} placeholder="Email address" />
          ) : (
            <TemplatableFieldOverlay fieldKey="exporterEmail"><FieldView label="Email" value={field("exporterEmail")} /></TemplatableFieldOverlay>
          )}
        </div>
      </SectionCard>

      {/* Consignee */}
      <SectionCard title="Consignee">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Consignee" value={field("consigneeName")} onChange={(v) => setField("consigneeName", v)} placeholder="Consignee name" />
          ) : (
            <TemplatableFieldOverlay fieldKey="consigneeName"><FieldView label="Consignee" value={field("consigneeName")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("consigneeAddress")} onChange={(v) => setField("consigneeAddress", v)} placeholder="Consignee address" />
          ) : (
            <TemplatableFieldOverlay fieldKey="consigneeAddress"><FieldView label="Address" value={field("consigneeAddress")} /></TemplatableFieldOverlay>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact Number" value={field("consigneeContactNumber")} onChange={(v) => setField("consigneeContactNumber", v)} placeholder="Contact number" />
          ) : (
            <TemplatableFieldOverlay fieldKey="consigneeContactNumber"><FieldView label="Contact Number" value={field("consigneeContactNumber")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <FieldInput label="Contact Email" value={field("consigneeContactEmail")} onChange={(v) => setField("consigneeContactEmail", v)} placeholder="Contact email" />
          ) : (
            <TemplatableFieldOverlay fieldKey="consigneeContactEmail"><FieldView label="Contact Email" value={field("consigneeContactEmail")} /></TemplatableFieldOverlay>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact Person" value={field("consigneeContactPerson")} onChange={(v) => setField("consigneeContactPerson", v)} placeholder="Contact person" />
          ) : (
            <TemplatableFieldOverlay fieldKey="consigneeContactPerson"><FieldView label="Contact Person" value={field("consigneeContactPerson")} /></TemplatableFieldOverlay>
          )}
        </div>
      </SectionCard>

      {/* Shipping Details */}
      <SectionCard title="Shipping Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Means of Transport" value={field("meansOfTransport")} onChange={(v) => setField("meansOfTransport", v)} placeholder="Means of transport" />
          ) : (
            <TemplatableFieldOverlay fieldKey="meansOfTransport"><FieldView label="Means of Transport" value={field("meansOfTransport")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <DateField label="Departure Date" value={field("departureDate")} onChange={(v) => setField("departureDate", v)} />
          ) : (
            <TemplatableFieldOverlay fieldKey="departureDate"><FieldView label="Departure Date" value={field("departureDate")} /></TemplatableFieldOverlay>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Vessel" value={field("vessel")} onChange={(v) => setField("vessel", v)} placeholder="Vessel name" />
          ) : (
            <TemplatableFieldOverlay fieldKey="vessel"><FieldView label="Vessel" value={field("vessel")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <FieldInput label="Port of Discharge" value={field("portOfDischarge")} onChange={(v) => setField("portOfDischarge", v)} placeholder="Port of discharge" />
          ) : (
            <TemplatableFieldOverlay fieldKey="portOfDischarge"><FieldView label="Port of Discharge" value={field("portOfDischarge")} /></TemplatableFieldOverlay>
          )}
        </div>
      </SectionCard>

      {/* Goods */}
      <SectionCard title="Goods">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Item Number" value={field("itemNumber")} onChange={(v) => setField("itemNumber", v)} placeholder="Item number" />
          ) : (
            <TemplatableFieldOverlay fieldKey="itemNumber"><FieldView label="Item Number" value={field("itemNumber")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <FieldInput label="Marks and Numbers" value={field("marksAndNumbers")} onChange={(v) => setField("marksAndNumbers", v)} placeholder="Marks and numbers" />
          ) : (
            <TemplatableFieldOverlay fieldKey="marksAndNumbers"><FieldView label="Marks and Numbers" value={field("marksAndNumbers")} /></TemplatableFieldOverlay>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Volume — number input, fixed CONTAINER unit */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Volume</label>
            {isEditing ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input value={field("packagesVolume")} onChange={(e) => setField("packagesVolume", e.target.value)} placeholder="e.g. 4" style={{ flex: 1, height: "42px", padding: "0 12px", border: "1px solid #E5E9F0", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#667085", padding: "0 10px", height: "42px", display: "flex", alignItems: "center", background: "#F3F4F6", borderRadius: "6px", border: "1px solid #E5E9F0" }}>CONTAINER</span>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", backgroundColor: field("packagesVolume") ? "#F9FAFB" : "white", border: field("packagesVolume") ? "1px solid #E5E9F0" : "2px dashed #E5E9F0", borderRadius: "6px", fontSize: "14px", color: field("packagesVolume") ? "var(--neuron-ink-primary)" : "#9CA3AF", minHeight: "42px", display: "flex", alignItems: "center", gap: "6px" }}>
                {field("packagesVolume") ? <>{fmtNum(field("packagesVolume"))} <span style={{ color: "#667085", fontSize: "12px" }}>CONTAINER</span></> : "—"}
              </div>
            )}
          </div>
          {/* Amount — number input + MetricDropdown */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Amount</label>
            {isEditing ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={field("packagesAmount")} onChange={(e) => setField("packagesAmount", e.target.value)} placeholder="Qty" style={{ flex: 1, height: "42px", padding: "0 12px", border: "1px solid #E5E9F0", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <div style={{ width: "140px" }}><MetricDropdown value={field("packagesAmountMetric")} onChange={(v) => setField("packagesAmountMetric", v)} /></div>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", backgroundColor: field("packagesAmount") ? "#F9FAFB" : "white", border: field("packagesAmount") ? "1px solid #E5E9F0" : "2px dashed #E5E9F0", borderRadius: "6px", fontSize: "14px", color: field("packagesAmount") ? "var(--neuron-ink-primary)" : "#9CA3AF", minHeight: "42px", display: "flex", alignItems: "center", gap: "6px" }}>
                {field("packagesAmount") ? <>{fmtNum(field("packagesAmount"))} <span style={{ color: "#667085", fontSize: "12px" }}>{field("packagesAmountMetric").toUpperCase()}</span></> : "—"}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Commodity" value={field("packagesCommodity")} onChange={(v) => setField("packagesCommodity", v)} placeholder="e.g. COCONUT SHELL CHARCOAL" />
          ) : (
            <FieldView label="Commodity" value={field("packagesCommodity")} />
          )}
          {isEditing ? (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Net Weight</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  value={field("packagesNetWeight")}
                  onChange={(e) => setField("packagesNetWeight", e.target.value)}
                  placeholder="0.00"
                  style={{ flex: 1, padding: "10px 14px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "14px", color: "var(--neuron-ink-primary)", background: "white", outline: "none", boxSizing: "border-box" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#667085", whiteSpace: "nowrap" }}>KGS</span>
              </div>
            </div>
          ) : (
            <FieldView label="Net Weight" value={field("packagesNetWeight") ? `${fmtNum(field("packagesNetWeight"))} KGS` : ""} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="HS Code" value={field("packagesHsCode")} onChange={(v) => setField("packagesHsCode", v)} placeholder="e.g. 4402.20" />
          ) : (
            <FieldView label="HS Code" value={field("packagesHsCode")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Notify Party" value={field("packagesNotifyParty")} onChange={(v) => setField("packagesNotifyParty", v)} placeholder="Notify party name" />
          ) : (
            <FieldView label="Notify Party" value={field("packagesNotifyParty")} />
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("packagesNotifyAddress")} onChange={(v) => setField("packagesNotifyAddress", v)} placeholder="Notify party address" />
          ) : (
            <FieldView label="Address" value={field("packagesNotifyAddress")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Origin Criteria" value={field("originCriteria")} onChange={(v) => setField("originCriteria", v)} placeholder="Origin criteria" />
          ) : (
            <TemplatableFieldOverlay fieldKey="originCriteria"><FieldView label="Origin Criteria" value={field("originCriteria")} /></TemplatableFieldOverlay>
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
            <TemplatableFieldOverlay fieldKey="grossWeight"><FieldView label="Gross Weight" value={field("grossWeight") ? `${fmtNum(field("grossWeight"))} KGS` : ""} /></TemplatableFieldOverlay>
          )}
        </div>
      </SectionCard>

      {/* Invoice */}
      <SectionCard title="Invoice">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Invoice Number" value={field("invoiceNumber")} onChange={(v) => setField("invoiceNumber", v)} placeholder="Invoice number" />
          ) : (
            <TemplatableFieldOverlay fieldKey="invoiceNumber"><FieldView label="Invoice Number" value={field("invoiceNumber")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <DateField label="Dated" value={field("invoiceDated")} onChange={(v) => setField("invoiceDated", v)} />
          ) : (
            <TemplatableFieldOverlay fieldKey="invoiceDated"><FieldView label="Dated" value={field("invoiceDated")} /></TemplatableFieldOverlay>
          )}
        </div>
      </SectionCard>

      {/* Countries */}
      <SectionCard title="Countries">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Exporter Country" value={field("exporterCountry")} onChange={(v) => setField("exporterCountry", v)} placeholder="Exporter country" />
          ) : (
            <TemplatableFieldOverlay fieldKey="exporterCountry"><FieldView label="Exporter Country" value={field("exporterCountry")} /></TemplatableFieldOverlay>
          )}
          {isEditing ? (
            <FieldInput label="Importing Country" value={field("importingCountry")} onChange={(v) => setField("importingCountry", v)} placeholder="Importing country" />
          ) : (
            <TemplatableFieldOverlay fieldKey="importingCountry"><FieldView label="Importing Country" value={field("importingCountry")} /></TemplatableFieldOverlay>
          )}
        </div>
      </SectionCard>

      {/* Signatory */}
      <SectionCard title="Signatory">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Place" value={field("signatoryPlace")} onChange={(v) => setField("signatoryPlace", v)} placeholder="Place" />
          ) : (
            <FieldView label="Place" value={field("signatoryPlace")} />
          )}
          {isEditing ? (
            <DateField label="Date" value={field("signatoryDate")} onChange={(v) => setField("signatoryDate", v)} />
          ) : (
            <FieldView label="Date" value={field("signatoryDate")} />
          )}
        </div>
        {isEditing ? (
          <FieldInput label="Authorized Signatory" value={field("authorizedSignatory")} onChange={(v) => setField("authorizedSignatory", v)} placeholder="Authorized signatory name" />
        ) : (
          <FieldView label="Authorized Signatory" value={field("authorizedSignatory")} />
        )}
      </SectionCard>
    </div>
  );
}
