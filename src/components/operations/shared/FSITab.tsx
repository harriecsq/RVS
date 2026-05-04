import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus, Edit3, X, Trash2, Search, ChevronsUpDown, Check } from "lucide-react";
import { NeuronDropdown } from "../../shared/NeuronDropdown";
import { PortalDropdown } from "../../shared/PortalDropdown";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import type { FSI, FSIContainer, SalesContract, PackingList } from "../../../types/export-documents";
import { applyTemplate } from "../../../utils/export-document-autofill";
import { usePackingMetrics } from "../../../hooks/usePackingMetrics";
import { useMasterTemplates } from "../../../hooks/useMasterTemplates";

// ── Constants ────────────────────────────────────────────────────────

const FREIGHT_TERM_OPTIONS = ["Prepaid", "Collect"];

// ── MetricDropdown ──────────────────────────────────────────────────

function MetricDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { options, addMetric } = usePackingMetrics();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50); }, [open]);
  const filtered = options.filter((o) => o.toLowerCase().includes(searchQuery.toLowerCase()));
  const exactMatch = options.some((o) => o.toLowerCase() === searchQuery.trim().toLowerCase());
  const canAdd = searchQuery.trim().length > 0 && !exactMatch;
  const handleAdd = async () => {
    const name = searchQuery.trim();
    if (!name) return;
    await addMetric(name);
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
        {isEmpty ? "\u2014" : value}
        {!isEmpty && suffix && <span style={{ color: "#667085", fontSize: "12px" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, type, suffix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; suffix?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type || "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "\u2014"}
          style={{
            width: "100%", padding: "10px 14px", paddingRight: suffix ? "48px" : "14px",
            border: "1px solid #0F766E", borderRadius: "6px",
            fontSize: "14px", color: "var(--neuron-ink-primary)", background: "white",
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
        {isEmpty ? "\u2014" : value}
      </div>
    </div>
  );
}

function TextAreaInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "\u2014"}
        rows={5}
        style={{
          width: "100%", padding: "10px 14px",
          border: "1px solid #0F766E", borderRadius: "6px",
          fontSize: "14px", color: "var(--neuron-ink-primary)", background: "white",
          outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: "120px",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────

function EmptyDocumentState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div style={{ padding: "32px 48px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
        <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
        <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No FSI record</p>
        <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Final Shipping Instruction for this booking.</p>
        <button
          onClick={onCreateClick}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}
        >
          <Plus size={15} /> Create FSI
        </button>
      </div>
    </div>
  );
}

// ── Container table ─────────────────────────────────────────────────

function ContainerTableView({ containers }: { containers: FSIContainer[] }) {
  if (!containers || containers.length === 0) {
    return (
      <div style={{ padding: "10px 14px", backgroundColor: "white", border: "2px dashed #E5E9F0", borderRadius: "6px", fontSize: "14px", color: "#9CA3AF", minHeight: "42px", display: "flex", alignItems: "center" }}>
        No containers added
      </div>
    );
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #E5E9F0" }}>
          <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#667085" }}>Container No.</th>
          <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#667085" }}>Seal No.</th>
          <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#667085" }}>Volume/Type</th>
        </tr>
      </thead>
      <tbody>
        {containers.map((c, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #E5E9F0" }}>
            <td style={{ padding: "10px 14px", color: "var(--neuron-ink-primary)" }}>{c.containerNo || "\u2014"}</td>
            <td style={{ padding: "10px 14px", color: "var(--neuron-ink-primary)" }}>{c.sealNo || "\u2014"}</td>
            <td style={{ padding: "10px 14px", color: "var(--neuron-ink-primary)" }}>{c.volumeType || "\u2014"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ContainerTableEdit({ containers, onChange }: { containers: FSIContainer[]; onChange: (c: FSIContainer[]) => void }) {
  const addRow = () => onChange([...containers, { containerNo: "", sealNo: "", volumeType: "" }]);
  const removeRow = (idx: number) => onChange(containers.filter((_, i) => i !== idx));
  const updateRow = (idx: number, key: keyof FSIContainer, value: string) => {
    const updated = containers.map((c, i) => i === idx ? { ...c, [key]: value } : c);
    onChange(updated);
  };

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E5E9F0" }}>
            <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#667085" }}>Container No.</th>
            <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#667085" }}>Seal No.</th>
            <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#667085" }}>Volume/Type</th>
            <th style={{ width: "40px" }}></th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E5E9F0" }}>
              <td style={{ padding: "6px 8px" }}>
                <input type="text" value={c.containerNo} onChange={(e) => updateRow(i, "containerNo", e.target.value)} placeholder="Container No."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </td>
              <td style={{ padding: "6px 8px" }}>
                <input type="text" value={c.sealNo} onChange={(e) => updateRow(i, "sealNo", e.target.value)} placeholder="Seal No."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </td>
              <td style={{ padding: "6px 8px" }}>
                <input type="text" value={c.volumeType} onChange={(e) => updateRow(i, "volumeType", e.target.value)} placeholder="e.g. 40'HC"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </td>
              <td style={{ padding: "6px 8px", textAlign: "center" }}>
                <button onClick={() => removeRow(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px" }}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} style={{
        display: "flex", alignItems: "center", gap: "6px", marginTop: "12px",
        padding: "8px 16px", fontSize: "13px", fontWeight: 600, border: "1px dashed #0F766E",
        borderRadius: "8px", background: "white", color: "#0F766E", cursor: "pointer",
      }}>
        <Plus size={14} /> Add Container
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface FSITabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: import("./SalesContractTab").DocumentEditState) => void;
  initialDraftData?: Partial<FSI>;
}

export function FSITab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange, initialDraftData }: FSITabProps) {
  const [doc, setDoc] = useState<FSI | null>(null);
  const [sc, setSc] = useState<SalesContract | null>(null);
  const [pl, setPl] = useState<PackingList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<FSI>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;
  const { getById: getMasterTemplate, isLoading: templatesLoading, templates: masterTemplates } = useMasterTemplates();

  const fetchDocument = async () => {
    try {
      const id = encodeURIComponent(bookingId);
      const [fsiRes, docsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/fsi?${new URLSearchParams({ bookingId })}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
        fetch(`${API_BASE_URL}/export-bookings/${id}/documents`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
      ]);
      const fsiResult = await fsiRes.json();
      const docsResult = await docsRes.json();
      if (fsiResult.success && fsiResult.data) setDoc(fsiResult.data);
      else setDoc(null);
      if (docsResult.success && docsResult.data) {
        setSc(docsResult.data.salesContract || null);
        setPl(docsResult.data.packingList || null);
      }
    } catch (err) {
      console.error("Error fetching FSI:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocument(); }, [bookingId]);

  const buildDefaults = (): Partial<FSI> => {
    // Containers from booking containerNo/sealNo (comma-separated) + volume as volumeType
    const containerNos = booking?.containerNo ? booking.containerNo.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const sealNos = booking?.sealNo ? booking.sealNo.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const maxLen = Math.max(containerNos.length, sealNos.length);
    const containers: FSIContainer[] = maxLen > 0
      ? Array.from({ length: maxLen }, (_, i) => ({ containerNo: containerNos[i] || "", sealNo: sealNos[i] || "", volumeType: booking?.volume || "" }))
      : [{ containerNo: "", sealNo: "", volumeType: "" }];

    // Gross weight, amount, amountMetric from packing list container totals
    const plGrossWeight = pl?.containers?.length
      ? pl.containers.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0)
      : null;
    const grossWeight = plGrossWeight ? String(plGrossWeight) : (booking?.grossWeight || "");
    const plTotalAmount = pl?.containers?.length
      ? pl.containers.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
      : null;
    const plAmountMetric = pl?.containers?.[0]?.amountMetric || "Sacks";

    // Booking number from bookingNumbers array or legacy field
    const bookingNumber = booking?.bookingNumbers?.[0]?.bookingNumber || booking?.bookingNumber || "";

    const portOfDischarge = sc?.portOfDestination || booking?.pod || "";

    return {
      bookingId,
      shipperName: sc?.supplierName || "", shipperAddress: sc?.supplierAddress || "",
      shipperContactNumber: sc?.supplierPhone || (sc as any)?.supplierContact || "", shipperEmail: sc?.supplierEmail || "",
      consigneeName: sc?.buyerName || booking?.consignee || "", consigneeAddress: sc?.buyerAddress || "",
      consigneeContactPerson: sc?.buyerContact || "", consigneeContactNumber: sc?.buyerPhone || "", consigneeEmail: sc?.buyerEmail || "",
      notifyParty: "",
      preCarriageBy: "", placeOfReceipt: "",
      vesselVoyageNo: sc?.vesselVoyage || booking?.vesselVoyage || "",
      portOfLoading: sc?.portOfLoading || booking?.pol || "",
      portOfDischarge,
      placeOfDelivery: portOfDischarge,
      freightTerm: "", lss: "",
      to: "", attn: "", from: "", bookingNumber, billedTo: "",
      containers,
      volume: sc?.marksAndNos || "",
      amount: plTotalAmount ? String(plTotalAmount) : "",
      amountMetric: plAmountMetric,
      commodity: sc?.commodityDescription || booking?.commodity || "",
      netWeight: sc?.quantity || "",
      grossWeight,
      measurement: booking?.containerQty ? String(Number(booking.containerQty) * 50) : "",
      totalNumberOfContainers: booking?.containerQty ? String(booking.containerQty) : "",
      hsCode: "", usciCode: "",
    };
  };

  const handleCreateClick = () => { proceedWithCreate(null); };

  const proceedWithCreate = (templateFields: Record<string, any> | null) => {
    let merged = buildDefaults();
    const masterTemplate = sc?.masterTemplateId
      ? getMasterTemplate(sc.masterTemplateId)
      : masterTemplates.length === 1 ? masterTemplates[0] : null;
    const fsiTemplateFields = initialDraftData || masterTemplate?.fsi || null;
    if (fsiTemplateFields) { merged = applyTemplate(merged, fsiTemplateFields, "fsi"); }
    if (templateFields) { merged = applyTemplate(merged, templateFields, "fsi"); }
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
      const payload = { ...editDataRef.current, createdBy: currentUser?.name || "Unknown" };

      let res: Response;
      if (isCreating) {
        res = await fetch(`${API_BASE_URL}/fsi`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/fsi/${doc!.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success) {
        setDoc(result.data);
        setIsEditing(false);
        setIsCreating(false);
        setEditData({});
        toast.success(isCreating ? "FSI created" : "FSI updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving FSI:", err);
      toast.error("Failed to save FSI");
    } finally {
      setIsSaving(false);
    }
  }, [bookingId, currentUser?.name, isCreating, doc]);

  useEffect(() => {
    const docData = isEditing ? editData : (doc || {});
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: "",
      docData,
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc, editData, handleSave]);

  const field = (key: keyof FSI) => {
    return isEditing ? (editData[key] as string || "") : (doc?.[key] as string || "");
  };

  const setField = (key: keyof FSI, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const containers = isEditing
    ? (editData.containers || []) as FSIContainer[]
    : (doc?.containers || []) as FSIContainer[];

  if (isLoading || templatesLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  if (!doc && !isEditing) {
    return <EmptyDocumentState onCreateClick={handleCreateClick} />;
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      {/* Shipper */}
      <SectionCard title="Shipper Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Shipper" value={field("shipperName")} onChange={(v) => setField("shipperName", v)} /> : <FieldView label="Shipper" value={field("shipperName")} />}
          {isEditing ? <FieldInput label="Address" value={field("shipperAddress")} onChange={(v) => setField("shipperAddress", v)} /> : <FieldView label="Address" value={field("shipperAddress")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Contact Number" value={field("shipperContactNumber")} onChange={(v) => setField("shipperContactNumber", v)} /> : <FieldView label="Contact Number" value={field("shipperContactNumber")} />}
          {isEditing ? <FieldInput label="Email" value={field("shipperEmail")} onChange={(v) => setField("shipperEmail", v)} type="email" /> : <FieldView label="Email" value={field("shipperEmail")} />}
        </div>
      </SectionCard>

      {/* Consignee */}
      <SectionCard title="Consignee Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Consignee" value={field("consigneeName")} onChange={(v) => setField("consigneeName", v)} /> : <FieldView label="Consignee" value={field("consigneeName")} />}
          {isEditing ? <FieldInput label="Address" value={field("consigneeAddress")} onChange={(v) => setField("consigneeAddress", v)} /> : <FieldView label="Address" value={field("consigneeAddress")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Contact Person" value={field("consigneeContactPerson")} onChange={(v) => setField("consigneeContactPerson", v)} /> : <FieldView label="Contact Person" value={field("consigneeContactPerson")} />}
          {isEditing ? <FieldInput label="Contact Number" value={field("consigneeContactNumber")} onChange={(v) => setField("consigneeContactNumber", v)} /> : <FieldView label="Contact Number" value={field("consigneeContactNumber")} />}
          {isEditing ? <FieldInput label="Email" value={field("consigneeEmail")} onChange={(v) => setField("consigneeEmail", v)} type="email" /> : <FieldView label="Email" value={field("consigneeEmail")} />}
        </div>
      </SectionCard>

      {/* Notify Party */}
      <SectionCard title="Notify Party">
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Notify Party" value={field("notifyParty")} onChange={(v) => setField("notifyParty", v)} /> : <FieldView label="Notify Party" value={field("notifyParty")} />}
        </div>
      </SectionCard>

      {/* Shipping Details */}
      <SectionCard title="Shipping Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Pre-Carriage By" value={field("preCarriageBy")} onChange={(v) => setField("preCarriageBy", v)} /> : <FieldView label="Pre-Carriage By" value={field("preCarriageBy")} />}
          {isEditing ? <FieldInput label="Vessel / Voyage No." value={field("vesselVoyageNo")} onChange={(v) => setField("vesselVoyageNo", v)} /> : <FieldView label="Vessel / Voyage No." value={field("vesselVoyageNo")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Place of Receipt" value={field("placeOfReceipt")} onChange={(v) => setField("placeOfReceipt", v)} /> : <FieldView label="Place of Receipt" value={field("placeOfReceipt")} />}
          {isEditing ? <FieldInput label="Port of Loading" value={field("portOfLoading")} onChange={(v) => setField("portOfLoading", v)} /> : <FieldView label="Port of Loading" value={field("portOfLoading")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Port of Discharge" value={field("portOfDischarge")} onChange={(v) => setField("portOfDischarge", v)} /> : <FieldView label="Port of Discharge" value={field("portOfDischarge")} />}
          {isEditing ? <FieldInput label="Place of Delivery" value={field("placeOfDelivery")} onChange={(v) => setField("placeOfDelivery", v)} /> : <FieldView label="Place of Delivery" value={field("placeOfDelivery")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Freight Term</label>
              <NeuronDropdown value={field("freightTerm")} onChange={(v) => setField("freightTerm", v)} options={FREIGHT_TERM_OPTIONS} placeholder="Select..." />
            </div>
          ) : <FieldView label="Freight Term" value={field("freightTerm")} />}
          {isEditing ? (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>LSS</label>
              <NeuronDropdown value={field("lss")} onChange={(v) => setField("lss", v)} options={FREIGHT_TERM_OPTIONS} placeholder="Select..." />
            </div>
          ) : <FieldView label="LSS" value={field("lss")} />}
        </div>
      </SectionCard>

      {/* Booking Reference */}
      <SectionCard title="Booking Reference">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="To" value={field("to")} onChange={(v) => setField("to", v)} /> : <FieldView label="To" value={field("to")} />}
          {isEditing ? <FieldInput label="Attn" value={field("attn")} onChange={(v) => setField("attn", v)} /> : <FieldView label="Attn" value={field("attn")} />}
          {isEditing ? <FieldInput label="From" value={field("from")} onChange={(v) => setField("from", v)} /> : <FieldView label="From" value={field("from")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Booking Number" value={field("bookingNumber")} onChange={(v) => setField("bookingNumber", v)} /> : <FieldView label="Booking Number" value={field("bookingNumber")} />}
          {isEditing ? <FieldInput label="Billed To" value={field("billedTo")} onChange={(v) => setField("billedTo", v)} /> : <FieldView label="Billed To" value={field("billedTo")} />}
        </div>
      </SectionCard>

      {/* Container Details */}
      <SectionCard title="Container Details">
        {isEditing ? (
          <ContainerTableEdit
            containers={containers}
            onChange={(c) => setEditData((prev) => ({ ...prev, containers: c }))}
          />
        ) : (
          <ContainerTableView containers={containers} />
        )}
      </SectionCard>

      {/* Cargo Details */}
      <SectionCard title="Cargo Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {/* Volume — number input, fixed CONTAINER unit */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Volume</label>
            {isEditing ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input value={field("volume")} onChange={(e) => setField("volume", e.target.value)} placeholder="e.g. 4" style={{ flex: 1, height: "42px", padding: "0 12px", border: "1px solid #E5E9F0", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#667085", padding: "0 10px", height: "42px", display: "flex", alignItems: "center", background: "#F3F4F6", borderRadius: "6px", border: "1px solid #E5E9F0" }}>CONTAINER</span>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", backgroundColor: field("volume") ? "#F9FAFB" : "white", border: field("volume") ? "1px solid #E5E9F0" : "2px dashed #E5E9F0", borderRadius: "6px", fontSize: "14px", color: field("volume") ? "var(--neuron-ink-primary)" : "#9CA3AF", minHeight: "42px", display: "flex", alignItems: "center", gap: "6px" }}>
                {field("volume") ? <>{fmtNum(field("volume"))} <span style={{ color: "#667085", fontSize: "12px" }}>CONTAINER</span></> : "—"}
              </div>
            )}
          </div>
          {/* Amount — number input + MetricDropdown */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-base)", marginBottom: "8px" }}>Amount</label>
            {isEditing ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={field("amount")} onChange={(e) => setField("amount", e.target.value)} placeholder="Qty" style={{ flex: 1, height: "42px", padding: "0 12px", border: "1px solid #E5E9F0", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <div style={{ width: "140px" }}><MetricDropdown value={field("amountMetric")} onChange={(v) => setField("amountMetric", v)} /></div>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", backgroundColor: field("amount") ? "#F9FAFB" : "white", border: field("amount") ? "1px solid #E5E9F0" : "2px dashed #E5E9F0", borderRadius: "6px", fontSize: "14px", color: field("amount") ? "var(--neuron-ink-primary)" : "#9CA3AF", minHeight: "42px", display: "flex", alignItems: "center", gap: "6px" }}>
                {field("amount") ? <>{fmtNum(field("amount"))} <span style={{ color: "#667085", fontSize: "12px" }}>{field("amountMetric").toUpperCase()}</span></> : "—"}
              </div>
            )}
          </div>
          {isEditing ? <FieldInput label="Commodity" value={field("commodity")} onChange={(v) => setField("commodity", v)} /> : <FieldView label="Commodity" value={field("commodity")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Gross Weight" value={field("grossWeight")} onChange={(v) => setField("grossWeight", v)} suffix="KGS" /> : <FieldView label="Gross Weight" value={fmtNum(field("grossWeight"))} suffix="KGS" />}
          {isEditing ? <FieldInput label="Net Weight" value={field("netWeight")} onChange={(v) => setField("netWeight", v)} suffix="KGS" /> : <FieldView label="Net Weight" value={fmtNum(field("netWeight"))} suffix="KGS" />}
          {isEditing ? <FieldInput label="Measurement" value={field("measurement")} onChange={(v) => setField("measurement", v)} suffix="CBM" /> : <FieldView label="Measurement" value={fmtNum(field("measurement"))} suffix="CBM" />}
        </div>
      </SectionCard>

      {/* Customs Codes */}
      <SectionCard title="Customs Codes">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="HS Code" value={field("hsCode")} onChange={(v) => setField("hsCode", v)} /> : <FieldView label="HS Code" value={field("hsCode")} />}
          {isEditing ? <FieldInput label="USCI Code" value={field("usciCode")} onChange={(v) => setField("usciCode", v)} /> : <FieldView label="USCI Code" value={field("usciCode")} />}
        </div>
      </SectionCard>
    </div>
  );
}
