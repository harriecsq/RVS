import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus, Edit3, Save, X, AlertCircle, Trash2, ChevronsUpDown, Search, Check } from "lucide-react";
import { NeuronDropdown } from "../../shared/NeuronDropdown";
import { PortalDropdown } from "../../shared/PortalDropdown";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import { buildPackingListDefaults, applyTemplate } from "../../../utils/export-document-autofill";
import type { PackingList, PackingListContainer, SalesContract } from "../../../types/export-documents";

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

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <SingleDateInput value={value} onChange={onChange} placeholder="YYYY-MM-DD" />
    </div>
  );
}

// ── Metric dropdown (PayeeSelector-style with add-new) ──────────────

const DEFAULT_METRICS = ["Sacks", "Bags", "Boxes", "Cartons", "Drums", "Pallets"];

function MetricDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("packing-list-metrics");
      return saved ? JSON.parse(saved) : DEFAULT_METRICS;
    } catch { return DEFAULT_METRICS; }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = options.filter((o) => o.toLowerCase().includes(searchQuery.toLowerCase()));
  const exactMatch = options.some((o) => o.toLowerCase() === searchQuery.trim().toLowerCase());
  const canAdd = searchQuery.trim().length > 0 && !exactMatch;

  const handleAdd = () => {
    const name = searchQuery.trim();
    if (!name) return;
    const updated = [...options, name];
    setOptions(updated);
    localStorage.setItem("packing-list-metrics", JSON.stringify(updated));
    onChange(name);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setOpen(!open); setSearchQuery(""); }}
        style={{
          width: "100%", height: "42px", padding: "0 12px", borderRadius: "6px",
          border: "1px solid #0F766E", background: "white", color: value ? "var(--neuron-ink-primary)" : "#667085",
          fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", outline: "none", boxSizing: "border-box",
        }}
      >
        <span>{value || "Select metric"}</span>
        <ChevronsUpDown size={14} color="#667085" />
      </button>

      <PortalDropdown isOpen={open} onClose={() => { setOpen(false); setSearchQuery(""); }} triggerRef={buttonRef} minWidth="200px" align="left">
        <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px", border: "1px solid #E5E9F0", borderRadius: "6px" }}>
            <Search size={14} color="#667085" />
            <input
              ref={searchRef}
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or add..."
              style={{ flex: 1, padding: "8px 0", border: "none", outline: "none", fontSize: "13px" }}
            />
          </div>
        </div>
        <div style={{ padding: "4px" }}>
          {filtered.map((o) => (
            <div
              key={o}
              onClick={() => { onChange(o); setOpen(false); setSearchQuery(""); }}
              style={{
                padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderRadius: "4px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: value === o ? "#E8F2EE" : "transparent", color: "var(--neuron-ink-primary)",
              }}
              onMouseEnter={(e) => { if (value !== o) e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { if (value !== o) e.currentTarget.style.background = "transparent"; }}
            >
              {o}
              {value === o && <Check size={14} color="#0F766E" />}
            </div>
          ))}
          {canAdd && (
            <div
              onClick={handleAdd}
              style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderRadius: "4px", display: "flex", alignItems: "center", gap: "6px", color: "#0F766E" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#E8F2EE"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={14} /> Add "{searchQuery.trim()}"
            </div>
          )}
        </div>
      </PortalDropdown>
    </div>
  );
}

// ── Container table ──────────────────────────────────────────────────

function ContainerTable({ containers, onChange, isEditing }: {
  containers: PackingListContainer[];
  onChange: (c: PackingListContainer[]) => void;
  isEditing: boolean;
}) {
  const updateRow = (idx: number, field: keyof PackingListContainer, value: string) => {
    const updated = containers.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    onChange(updated);
  };

  const addRow = () => {
    onChange([...containers, { containerNo: "", sealNumber: "", amount: "", amountMetric: "Sacks", netWeight: "", grossWeight: "" }]);
  };

  const removeRow = (idx: number) => {
    onChange(containers.filter((_, i) => i !== idx));
  };

  const totalAmount = containers.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalNet = containers.reduce((sum, c) => sum + (parseFloat(c.netWeight) || 0), 0);
  const totalGross = containers.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0);

  const cellStyle: React.CSSProperties = { padding: "10px 12px", fontSize: "13px", borderBottom: "1px solid #E5E9F0" };
  const headStyle: React.CSSProperties = { ...cellStyle, fontWeight: 600, color: "#0F766E", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em", background: "#F9FAFB" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #D1D5DB", borderRadius: "4px", fontSize: "13px", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #E5E9F0", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr>
            <th style={headStyle}>Container No.</th>
            <th style={headStyle}>Seal Number</th>
            <th style={{ ...headStyle, minWidth: "180px" }}>Amount</th>
            <th style={headStyle}>Net Weight (KGS)</th>
            <th style={headStyle}>Gross Weight (KGS)</th>
            {isEditing && <th style={{ ...headStyle, width: "40px" }}></th>}
          </tr>
        </thead>
        <tbody>
          {containers.map((c, idx) => (
            <tr key={idx}>
              <td style={cellStyle}>
                {isEditing ? <input style={inputStyle} value={c.containerNo} onChange={(e) => updateRow(idx, "containerNo", e.target.value)} /> : (c.containerNo || "—")}
              </td>
              <td style={cellStyle}>
                {isEditing ? <input style={inputStyle} value={c.sealNumber} onChange={(e) => updateRow(idx, "sealNumber", e.target.value)} /> : (c.sealNumber || "—")}
              </td>
              <td style={cellStyle}>
                {isEditing ? (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input style={{ ...inputStyle, flex: 1 }} value={c.amount} onChange={(e) => updateRow(idx, "amount", e.target.value)} placeholder="Qty" />
                    <div style={{ width: "110px" }}>
                      <MetricDropdown value={c.amountMetric} onChange={(v) => updateRow(idx, "amountMetric", v)} />
                    </div>
                  </div>
                ) : (
                  c.amount ? `${c.amount} ${c.amountMetric}` : "—"
                )}
              </td>
              <td style={cellStyle}>
                {isEditing ? <input style={inputStyle} value={c.netWeight} onChange={(e) => updateRow(idx, "netWeight", e.target.value)} /> : (c.netWeight ? `${c.netWeight} KGS` : "—")}
              </td>
              <td style={cellStyle}>
                {isEditing ? <input style={inputStyle} value={c.grossWeight} onChange={(e) => updateRow(idx, "grossWeight", e.target.value)} /> : (c.grossWeight ? `${c.grossWeight} KGS` : "—")}
              </td>
              {isEditing && (
                <td style={cellStyle}>
                  <button onClick={() => removeRow(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#EF4444" }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {/* Totals row */}
          <tr style={{ background: "#F9FAFB", fontWeight: 600 }}>
            <td style={cellStyle} colSpan={2}>
              <span style={{ color: "#0F766E", fontSize: "12px", textTransform: "uppercase" }}>Totals</span>
            </td>
            <td style={cellStyle}>{totalAmount > 0 ? totalAmount.toLocaleString() : "—"}</td>
            <td style={cellStyle}>{totalNet > 0 ? `${totalNet.toLocaleString()} KGS` : "—"}</td>
            <td style={cellStyle}>{totalGross > 0 ? `${totalGross.toLocaleString()} KGS` : "—"}</td>
            {isEditing && <td style={cellStyle}></td>}
          </tr>
        </tbody>
      </table>
      {isEditing && (
        <button onClick={addRow} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", marginTop: "12px", fontSize: "13px", fontWeight: 500, border: "1px dashed #D1D5DB", borderRadius: "6px", background: "white", color: "#374151", cursor: "pointer" }}>
          <Plus size={14} /> Add Container
        </button>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface PackingListTabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: import("./SalesContractTab").DocumentEditState) => void;
  initialDraftData?: Partial<PackingList>;
}

export function PackingListTab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange, initialDraftData }: PackingListTabProps) {
  const [doc, setDoc] = useState<PackingList | null>(null);
  const [sc, setSc] = useState<SalesContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<PackingList>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;
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
        setDoc(result.data.packingList || null);
        setSc(result.data.salesContract || null);
        // Parse existing refNo to populate compound fields
        const existingRef = result.data.packingList?.refNo || "";
        const match = existingRef.match(/^(\w+)\s+(\d{4})-(\d+)$/);
        if (match) {
          setRefCompanyCode(match[1]);
          setRefYear(match[2]);
          setRefNumber(match[3]);
        }
      }
    } catch (err) {
      console.error("Error fetching packing list:", err);
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

  const handleCreateClick = () => { proceedWithCreate(null); };

  const proceedWithCreate = (templateFields: Record<string, any> | null) => {
    let merged = buildPackingListDefaults(booking, sc || undefined);
    if (initialDraftData) { merged = { ...merged, ...initialDraftData }; }
    if (templateFields) { merged = applyTemplate(merged, templateFields, "packingList"); }
    setEditData({ ...merged, refNo: buildRefNo() });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (!doc) return;
    setEditData({ ...doc, containers: doc.containers ? doc.containers.map((c) => ({ ...c })) : [] });
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
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/packing-list`, {
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
        toast.success(isCreating ? "Packing List created" : "Packing List updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving packing list:", err);
      toast.error("Failed to save Packing List");
    } finally {
      setIsSaving(false);
    }
  }, [bookingId, currentUser?.name]);

  useEffect(() => {
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: doc?.refNo || (isEditing ? buildRefNo() : ""),
      docData: isEditing ? { ...editData, refNo: buildRefNo() } as any : doc,
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc?.refNo, editData]);

  const field = (key: keyof PackingList) => {
    if (key === "containers") return;
    return isEditing ? (editData[key] as string || "") : (doc?.[key] as string || "");
  };

  const setField = (key: keyof PackingList, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const containers = isEditing ? (editData.containers || []) : (doc?.containers || []);

  if (isLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  if (!sc && !doc) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <AlertCircle size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>Sales Contract required</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>Create a Sales Contract first to generate a Packing List.</p>
        </div>
      </div>
    );
  }

  if (!doc && !isEditing) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No Packing List record</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Packing List for this booking.</p>
          <button onClick={handleCreateClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={15} /> Create Packing List
          </button>
        </div>
      </div>
    );
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
            <DateField label="Date" value={field("date") || ""} onChange={(v) => setField("date", v)} />
          ) : (
            <FieldView label="Date" value={field("date") || ""} />
          )}
        </div>
      </SectionCard>

      {/* Shipped To */}
      <SectionCard title="Shipped To">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Shipped To" value={field("shippedToName") || ""} onChange={(v) => setField("shippedToName", v)} />
          ) : (
            <FieldView label="Shipped To" value={field("shippedToName") || ""} />
          )}
          {isEditing ? (
            <FieldInput label="Address" value={field("shippedToAddress") || ""} onChange={(v) => setField("shippedToAddress", v)} />
          ) : (
            <FieldView label="Address" value={field("shippedToAddress") || ""} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Contact" value={field("shippedToContact") || ""} onChange={(v) => setField("shippedToContact", v)} />
          ) : (
            <FieldView label="Contact" value={field("shippedToContact") || ""} />
          )}
          {isEditing ? (
            <FieldInput label="Phone" value={field("shippedToPhone") || ""} onChange={(v) => setField("shippedToPhone", v)} />
          ) : (
            <FieldView label="Phone" value={field("shippedToPhone") || ""} />
          )}
          {isEditing ? (
            <FieldInput label="Email" value={field("shippedToEmail") || ""} onChange={(v) => setField("shippedToEmail", v)} />
          ) : (
            <FieldView label="Email" value={field("shippedToEmail") || ""} />
          )}
        </div>
      </SectionCard>

      {/* Shipping */}
      <SectionCard title="Shipping">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Vessel/VOY" value={field("vesselVoyage") || ""} onChange={(v) => setField("vesselVoyage", v)} />
          ) : (
            <FieldView label="Vessel/VOY" value={field("vesselVoyage") || ""} />
          )}
          {isEditing ? (
            <FieldInput label="Place of Origin" value={field("placeOfOrigin") || ""} onChange={(v) => setField("placeOfOrigin", v)} />
          ) : (
            <FieldView label="Place of Origin" value={field("placeOfOrigin") || ""} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Port of Discharge" value={field("portOfDischarge") || ""} onChange={(v) => setField("portOfDischarge", v)} />
          ) : (
            <FieldView label="Port of Discharge" value={field("portOfDischarge") || ""} />
          )}
          {isEditing ? (
            <DateField label="Shipment Date" value={field("shipmentDate") || ""} onChange={(v) => setField("shipmentDate", v)} />
          ) : (
            <FieldView label="Shipment Date" value={field("shipmentDate") || ""} />
          )}
        </div>
      </SectionCard>

      {/* Description of Goods */}
      <SectionCard title="Description of Goods">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <FieldInput label="Volume" value={field("volume") || ""} onChange={(v) => setField("volume", v)} placeholder="e.g. 2x40'HC CONTAINER" />
          ) : (
            <FieldView label="Volume" value={field("volume") || ""} />
          )}
          {isEditing ? (
            <FieldInput label="Commodity" value={field("commodity") || ""} onChange={(v) => setField("commodity", v)} />
          ) : (
            <FieldView label="Commodity" value={field("commodity") || ""} />
          )}
        </div>
      </SectionCard>

      {/* Container Table */}
      <SectionCard title="Containers">
        <ContainerTable
          containers={containers}
          onChange={(c) => setEditData((prev) => ({ ...prev, containers: c }))}
          isEditing={isEditing}
        />
      </SectionCard>
    </div>
  );
}
