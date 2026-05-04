import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus } from "lucide-react";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import type { ProcessingFee } from "../../../types/export-documents";

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

const emptyDoc: Omit<ProcessingFee, "createdAt" | "updatedAt"> = {
  billingStatementNo: "",
  date: "",
  address: "UNIT 3406 ALVARADO COMMERCIAL CENTER 908 ALVARADO ST. BINONDO, MANILA, PHILIPPINES",
  tinNo: "TIN 009 132 182 000",
  vesselVoy: "",
  loadedAt: "",
  volume: "",
  containerSize: "",
  containerNo: "",
  commodity: "",
  blNumber: "",
  destination: "",
  price: "",
};

// ── Main component ───────────────────────────────────────────────────

interface ProcessingFeeTabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: import("./SalesContractTab").DocumentEditState) => void;
}

export function ProcessingFeeTab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange }: ProcessingFeeTabProps) {
  const [doc, setDoc] = useState<ProcessingFee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<ProcessingFee>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;

  const fetchDocument = async () => {
    try {
      const id = encodeURIComponent(bookingId);
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setDoc(result.data.processingFee || null);
      }
    } catch (err) {
      console.error("Error fetching Processing Fee:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocument(); }, [bookingId]);

  const handleCreateClick = () => {
    setEditData({
      ...emptyDoc,
      vesselVoy: booking?.vesselVoyage || "",
      loadedAt: booking?.pol || booking?.origin || "",
      blNumber: booking?.blNumber || booking?.segments?.[0]?.blNumber || "",
      volume: String(booking?.containerNo?.split(",").filter((s: string) => s.trim()).length || ""),
      containerSize: booking?.volume?.match(/\d+/)?.[0] || "",
      containerNo: booking?.containerNo || "",
      commodity: booking?.commodity || "",
      destination: booking?.pod || "",
    });
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
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/processing-fee`, {
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
        toast.success(isCreating ? "Processing Fee created" : "Processing Fee updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving Processing Fee:", err);
      toast.error("Failed to save Processing Fee");
    } finally {
      setIsSaving(false);
    }
  }, [bookingId, currentUser?.name, isCreating]);

  useEffect(() => {
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: doc?.billingStatementNo || "",
      docData: isEditing ? editData as any : doc,
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc, editData, handleSave]);

  const field = (key: keyof ProcessingFee) =>
    isEditing ? (editData[key] as string || "") : (doc?.[key] as string || "");

  const setField = (key: keyof ProcessingFee, value: string) =>
    setEditData((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  if (!doc && !isEditing) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No Processing Fee record</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Processing Fee billing statement for this booking.</p>
          <button onClick={handleCreateClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={15} /> Create Processing Fee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      <SectionCard title="Billing Statement">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing
            ? <FieldInput label="Billing Statement No." value={field("billingStatementNo")} onChange={(v) => setField("billingStatementNo", v)} placeholder="e.g. 0247B" />
            : <FieldView label="Billing Statement No." value={field("billingStatementNo")} />}
          {isEditing
            ? <DateField label="Date" value={field("date")} onChange={(v) => setField("date", v)} />
            : <FieldView label="Date" value={field("date")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing
            ? <FieldInput label="Address" value={field("address")} onChange={(v) => setField("address", v)} placeholder="Company address" />
            : <FieldView label="Address" value={field("address")} />}
          {isEditing
            ? <FieldInput label="TIN #" value={field("tinNo")} onChange={(v) => setField("tinNo", v)} placeholder="e.g. 009 132 182 000" />
            : <FieldView label="TIN #" value={field("tinNo")} />}
        </div>
      </SectionCard>

      <SectionCard title="Shipment Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing
            ? <FieldInput label="Vessel / Voy" value={field("vesselVoy")} onChange={(v) => setField("vesselVoy", v)} placeholder="e.g. CMA CGM KAURI V. 1RDZCGW1NC" />
            : <FieldView label="Vessel / Voy" value={field("vesselVoy")} />}
          {isEditing
            ? <FieldInput label="Loaded At" value={field("loadedAt")} onChange={(v) => setField("loadedAt", v)} placeholder="e.g. MANILA SOUTH" />
            : <FieldView label="Loaded At" value={field("loadedAt")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {isEditing
            ? <FieldInput label="Volume" value={field("volume")} onChange={(v) => setField("volume", v)} placeholder="e.g. 2" />
            : <FieldView label="Volume" value={field("volume")} />}
          {isEditing
            ? <FieldInput label="Container Size" value={field("containerSize")} onChange={(v) => setField("containerSize", v)} placeholder="e.g. 40" />
            : <FieldView label="Container Size" value={field("containerSize")} />}
          {isEditing
            ? <FieldInput label="Container #" value={field("containerNo")} onChange={(v) => setField("containerNo", v)} placeholder="e.g. ECMU5449218" />
            : <FieldView label="Container #" value={field("containerNo")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing
            ? <FieldInput label="Commodity" value={field("commodity")} onChange={(v) => setField("commodity", v)} placeholder="e.g. ASSORTED HOUSEHOLD ARTICLES (GM)" />
            : <FieldView label="Commodity" value={field("commodity")} />}
          {isEditing
            ? <FieldInput label="BL Number" value={field("blNumber")} onChange={(v) => setField("blNumber", v)} placeholder="e.g. CNH0936712" />
            : <FieldView label="BL Number" value={field("blNumber")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing
            ? <FieldInput label="Destination" value={field("destination")} onChange={(v) => setField("destination", v)} placeholder="e.g. NANSHA, CHINA" />
            : <FieldView label="Destination" value={field("destination")} />}
          {isEditing
            ? <FieldInput label="Price (PHP)" value={field("price")} onChange={(v) => setField("price", v)} placeholder="e.g. 5000" />
            : <FieldView label="Price (PHP)" value={field("price")} />}
        </div>
      </SectionCard>
    </div>
  );
}
