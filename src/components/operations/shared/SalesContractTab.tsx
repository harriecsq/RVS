import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus, Edit3, Save, X, ArrowLeft, Search } from "lucide-react";
import { NeuronDropdown } from "../../shared/NeuronDropdown";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import { buildSalesContractDefaults, applyTemplate } from "../../../utils/export-document-autofill";
import type { SalesContract } from "../../../types/export-documents";
import { useMasterTemplates } from "../../../hooks/useMasterTemplates";
import type { MasterTemplate } from "../../../types/master-template";

// ── Constants ────────────────────────────────────────────────────────

const COMPANY_CODE_OPTIONS = ["SCI", "RDS", "RVS", "SW"];
const fmtNum = (v: string) => { const n = parseFloat(v.replace(/,/g, "")); return isNaN(n) ? v : n.toLocaleString("en-US"); };

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

function FieldInput({ label, value, onChange, suffix, placeholder, readOnly, type }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string; readOnly?: boolean; type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type || "text"}
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

// ── Master template picker ───────────────────────────────────────────

function MasterTemplatePicker({
  templates,
  onSelect,
  onSkip,
}: {
  templates: MasterTemplate[];
  onSelect: (t: MasterTemplate | null) => void;
  onSkip: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase()))
    : templates;

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <button
          onClick={onSkip}
          style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#6B7A76" }}
        >
          <ArrowLeft size={18} />
        </button>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#12332B" }}>Choose a Master Template</h3>
      </div>
      <p style={{ fontSize: "13px", color: "#6B7A76", margin: "0 0 24px 30px" }}>
        Select a template to pre-fill all export documents, or start with a blank Sales Contract.
      </p>

      {/* Start Blank */}
      <button
        onClick={() => onSelect(null)}
        style={{
          display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px",
          border: "1px dashed #D1D5DB", borderRadius: "10px", background: "#FAFAFA",
          cursor: "pointer", textAlign: "left", width: "100%", marginBottom: "16px",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#237F66"; e.currentTarget.style.background = "#F0FAF7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.background = "#FAFAFA"; }}
      >
        <FileText size={20} style={{ color: "#D1D5DB", flexShrink: 0 }} />
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#6B7A76" }}>Start Blank</div>
      </button>

      {/* Search */}
      {templates.length > 0 && (
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            style={{
              width: "100%", padding: "8px 10px 8px 30px", fontSize: "13px",
              border: "1px solid #E5ECE9", borderRadius: "8px", outline: "none",
              color: "#12332B", background: "#FFFFFF", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Template list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {templates.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
            No master templates yet. Create one in the Templates section.
          </div>
        )}
        {filtered.length === 0 && templates.length > 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
            No templates match your search.
          </div>
        )}
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            style={{
              display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px",
              border: "1px solid #E5ECE9", borderRadius: "10px", background: "#FFFFFF",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#237F66"; e.currentTarget.style.background = "#F0FAF7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E5ECE9"; e.currentTarget.style.background = "#FFFFFF"; }}
          >
            <FileText size={20} style={{ color: "#237F66", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>{t.name}</div>
              <div style={{ fontSize: "12px", color: "#6B7A76", marginTop: "2px", display: "flex", gap: "8px", alignItems: "center" }}>
                {t.description && <span>{t.description}</span>}
                <span style={{ color: "#9CA3AF" }}>· Updated {new Date(t.updatedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────

function EmptyDocumentState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div style={{ padding: "32px 48px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
        <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
        <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No Sales Contract record</p>
        <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Sales Contract for this booking.</p>
        <button
          onClick={onCreateClick}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}
        >
          <Plus size={15} /> Create Sales Contract
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export interface DocumentEditState {
  isEditing: boolean;
  isSaving: boolean;
  refNo: string;
  docData?: SalesContract | null;
  appliedMaster?: MasterTemplate | null;
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: () => void;
}

interface SalesContractTabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: DocumentEditState) => void;
}

export function SalesContractTab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange }: SalesContractTabProps) {
  const [doc, setDoc] = useState<SalesContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<SalesContract>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;

  // Master template state
  const { templates: masterTemplates } = useMasterTemplates();
  const [showMasterPicker, setShowMasterPicker] = useState(false);
  const [appliedMaster, setAppliedMaster] = useState<MasterTemplate | null>(null);

  // Compound ref number fields (editable like voucher/billing)
  const [refCompanyCode, setRefCompanyCode] = useState("RVS");
  const [refYear, setRefYear] = useState(String(new Date().getFullYear()));
  const [refNumber, setRefNumber] = useState("");
  const [nextRefNumber, setNextRefNumber] = useState<number | null>(null);

  const fetchDocument = async () => {
    try {
      const id = encodeURIComponent(bookingId);
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data?.salesContract) {
        setDoc(result.data.salesContract);
        // Parse existing refNo to populate compound fields
        const existingRef = result.data.salesContract.refNo || "";
        const match = existingRef.match(/^(\w+)\s+(\d{4})-(\d+)$/);
        if (match) {
          setRefCompanyCode(match[1]);
          setRefYear(match[2]);
          setRefNumber(match[3]);
        }
      } else {
        setDoc(null);
      }
    } catch (err) {
      console.error("Error fetching sales contract:", err);
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

  useEffect(() => { fetchDocument(); }, [bookingId]);
  useEffect(() => { fetchNextRef(refCompanyCode, refYear); }, [refCompanyCode, refYear]);

  // Build the full ref number from compound fields
  const buildRefNo = () => {
    const num = refNumber.trim() || (nextRefNumber !== null ? String(nextRefNumber) : "1");
    return `${refCompanyCode} ${refYear}-${num}`;
  };

  const handleCreateClick = () => {
    if (masterTemplates.length > 0) {
      setShowMasterPicker(true);
    } else {
      proceedWithCreate(null);
    }
  };

  const handleMasterSelect = (master: MasterTemplate | null) => {
    setShowMasterPicker(false);
    setAppliedMaster(master);
    if (master) {
      const defaults = buildSalesContractDefaults(booking);
      const merged: Partial<SalesContract> = {
        ...defaults,
        ...master.salesContract,
        refNo: buildRefNo(),
        date: new Date().toISOString().split("T")[0],
        vesselVoyage: defaults.vesselVoyage || "",
        shipmentDate: defaults.shipmentDate || "",
        marksAndNos: defaults.marksAndNos || "",
        portOfLoading: defaults.portOfLoading || master.salesContract.portOfLoading || "",
        portOfDestination: defaults.portOfDestination || master.salesContract.portOfDestination || "",
      };
      setEditData(merged);
      setIsCreating(true);
      setIsEditing(true);
    } else {
      proceedWithCreate(null);
    }
  };

  const proceedWithCreate = async (templateFields: Record<string, any> | null) => {
    const defaults = buildSalesContractDefaults(booking);
    let merged: Partial<SalesContract> = {
      ...defaults,
      refNo: buildRefNo(),
      date: new Date().toISOString().split("T")[0],
      supplierName: "", supplierAddress: "",
      sellerName: defaults.sellerName || "", sellerAddress: "",
      buyerName: defaults.buyerName || "", buyerAddress: "", buyerContact: "", buyerPhone: "", buyerEmail: "",
      marksAndNos: defaults.marksAndNos || "", commodityDescription: defaults.commodityDescription || "", quantity: "", unitPrice: "", totalAmount: "",
      portOfLoading: defaults.portOfLoading || "", portOfDestination: defaults.portOfDestination || "",
      vesselVoyage: defaults.vesselVoyage || "", termsOfPayment: "", shipmentDate: defaults.shipmentDate || "",
      bankName: "", swiftCode: "", accountNo: "", accountName: "", bankAddress: "",
    };

    if (templateFields) {
      merged = applyTemplate(merged, templateFields, "salesContract");
      // Re-apply booking-specific fields that must always come from the booking
      merged.refNo = buildRefNo();
      merged.date = new Date().toISOString().split("T")[0];
      merged.vesselVoyage = defaults.vesselVoyage || "";
      merged.shipmentDate = defaults.shipmentDate || "";
      merged.marksAndNos = defaults.marksAndNos || "";
    }

    setEditData(merged);
    setIsCreating(true);
    setIsEditing(true);
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
    setAppliedMaster(null);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const id = encodeURIComponent(bookingId);
      const payload = { ...editDataRef.current, refNo: buildRefNo(), createdBy: currentUser?.name || "Unknown" };
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/sales-contract`, {
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
        setAppliedMaster(null);
        toast.success(isCreating ? "Sales Contract created" : "Sales Contract updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving sales contract:", err);
      toast.error("Failed to save Sales Contract");
    } finally {
      setIsSaving(false);
    }
  }, [bookingId, currentUser?.name]);

  // Report edit state to parent (for panel header controls)
  useEffect(() => {
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: doc?.refNo || (isEditing ? buildRefNo() : ""),
      docData: doc,
      appliedMaster,
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc?.refNo, appliedMaster]);

  const field = (key: keyof SalesContract) => {
    return isEditing ? (editData[key] as string || "") : (doc?.[key] as string || "");
  };

  const setField = (key: keyof SalesContract, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  if (!doc && !isEditing) {
    if (showMasterPicker) {
      return <MasterTemplatePicker templates={masterTemplates} onSelect={handleMasterSelect} onSkip={() => { setShowMasterPicker(false); proceedWithCreate(null); }} />;
    }
    return <EmptyDocumentState onCreateClick={handleCreateClick} />;
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      {/* Ref No. + Date */}
      <SectionCard title="Document Details">
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
      </SectionCard>

      {/* Supplier + Seller */}
      <SectionCard title="Supplier & Seller">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Supplier" value={field("supplierName")} onChange={(v) => setField("supplierName", v)} />
          ) : (
            <FieldView label="Supplier" value={field("supplierName")} />
          )}
          {isEditing ? (
            <FieldInput label="Supplier Address" value={field("supplierAddress")} onChange={(v) => setField("supplierAddress", v)} />
          ) : (
            <FieldView label="Supplier Address" value={field("supplierAddress")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Seller" value={field("sellerName")} onChange={(v) => setField("sellerName", v)} />
          ) : (
            <FieldView label="Seller" value={field("sellerName")} />
          )}
          {isEditing ? (
            <FieldInput label="Seller Address" value={field("sellerAddress")} onChange={(v) => setField("sellerAddress", v)} />
          ) : (
            <FieldView label="Seller Address" value={field("sellerAddress")} />
          )}
        </div>
      </SectionCard>

      {/* Buyer */}
      <SectionCard title="Buyer">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Buyer" value={field("buyerName")} onChange={(v) => setField("buyerName", v)} />
          ) : (
            <FieldView label="Buyer" value={field("buyerName")} />
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("buyerAddress")} onChange={(v) => setField("buyerAddress", v)} />
          ) : (
            <FieldView label="Address" value={field("buyerAddress")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact" value={field("buyerContact")} onChange={(v) => setField("buyerContact", v)} />
          ) : (
            <FieldView label="Contact" value={field("buyerContact")} />
          )}
          {isEditing ? (
            <FieldInput label="Phone" value={field("buyerPhone")} onChange={(v) => setField("buyerPhone", v)} />
          ) : (
            <FieldView label="Phone" value={field("buyerPhone")} />
          )}
          {isEditing ? (
            <FieldInput label="Email" value={field("buyerEmail")} onChange={(v) => setField("buyerEmail", v)} type="email" />
          ) : (
            <FieldView label="Email" value={field("buyerEmail")} />
          )}
        </div>
      </SectionCard>

      {/* Goods */}
      <SectionCard title="Goods">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Marks & Nos — number input, fixed CONTAINER unit */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Marks &amp; Nos</label>
            {isEditing ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input value={field("marksAndNos")} onChange={(e) => setField("marksAndNos", e.target.value)} placeholder="e.g. 4" style={{ flex: 1, height: "42px", padding: "0 12px", border: "1px solid #E5E9F0", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#667085", padding: "0 10px", height: "42px", display: "flex", alignItems: "center", background: "#F3F4F6", borderRadius: "6px", border: "1px solid #E5E9F0" }}>CONTAINER</span>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", backgroundColor: field("marksAndNos") ? "#F9FAFB" : "white", border: field("marksAndNos") ? "1px solid #E5E9F0" : "2px dashed #E5E9F0", borderRadius: "6px", fontSize: "14px", color: field("marksAndNos") ? "var(--neuron-ink-primary)" : "#9CA3AF", minHeight: "42px", display: "flex", alignItems: "center", gap: "6px" }}>
                {field("marksAndNos") ? <>{fmtNum(field("marksAndNos"))} <span style={{ color: "#667085", fontSize: "12px" }}>CONTAINER</span></> : "—"}
              </div>
            )}
          </div>
          {isEditing ? (
            <FieldInput label="Commodity Description" value={field("commodityDescription")} onChange={(v) => setField("commodityDescription", v)} />
          ) : (
            <FieldView label="Commodity Description" value={field("commodityDescription")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Quantity" value={field("quantity")} onChange={(v) => {
              setField("quantity", v);
              const total = (parseFloat(v) || 0) * (parseFloat(field("unitPrice")) || 0);
              setField("totalAmount", total ? total.toFixed(2) : "");
            }} suffix="MT" />
          ) : (
            <FieldView label="Quantity" value={fmtNum(field("quantity"))} suffix="MT" />
          )}
          {isEditing ? (
            <FieldInput label="Unit Price" value={field("unitPrice")} onChange={(v) => {
              setField("unitPrice", v);
              const total = (parseFloat(field("quantity")) || 0) * (parseFloat(v) || 0);
              setField("totalAmount", total ? total.toFixed(2) : "");
            }} suffix="USD" />
          ) : (
            <FieldView label="Unit Price" value={fmtNum(field("unitPrice"))} suffix="USD" />
          )}
          {isEditing ? (
            <FieldInput label="Total Amount" value={field("totalAmount")} onChange={(v) => setField("totalAmount", v)} suffix="USD" />
          ) : (
            <FieldView label="Total Amount" value={fmtNum(field("totalAmount"))} suffix="USD" />
          )}
        </div>
      </SectionCard>

      {/* Shipping */}
      <SectionCard title="Shipping">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Port of Loading" value={field("portOfLoading")} onChange={(v) => setField("portOfLoading", v)} />
          ) : (
            <FieldView label="Port of Loading" value={field("portOfLoading")} />
          )}
          {isEditing ? (
            <FieldInput label="Port of Destination" value={field("portOfDestination")} onChange={(v) => setField("portOfDestination", v)} />
          ) : (
            <FieldView label="Port of Destination" value={field("portOfDestination")} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Vessel/VOY" value={field("vesselVoyage")} onChange={(v) => setField("vesselVoyage", v)} />
          ) : (
            <FieldView label="Vessel/VOY" value={field("vesselVoyage")} />
          )}
          {isEditing ? (
            <FieldInput label="Terms of Payment" value={field("termsOfPayment")} onChange={(v) => setField("termsOfPayment", v)} />
          ) : (
            <FieldView label="Terms of Payment" value={field("termsOfPayment")} />
          )}
          {isEditing ? (
            <DateField label="Shipment Date" value={field("shipmentDate")} onChange={(v) => setField("shipmentDate", v)} />
          ) : (
            <FieldView label="Shipment Date" value={field("shipmentDate")} />
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
