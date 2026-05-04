import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus } from "lucide-react";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";
import type { HeartOfExport } from "../../../types/export-documents";

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

const EXPENSE_ROWS: { key: keyof HeartOfExport; label: string }[] = [
  { key: "expShippingLine", label: "Shipping Line" },
  { key: "expTrucking", label: "Trucking" },
  { key: "expPettyCash", label: "Petty Cash" },
  { key: "expCommission", label: "Commission" },
  { key: "expOthers", label: "Others" },
  { key: "expSOA", label: "SOA" },
  { key: "expProfitSharing", label: "Profit Sharing" },
];

function emptyExpenseRow() { return { referenceNo: "", amount: "" }; }

function buildEmpty(booking: any, truckingVendors = "", truckingContainers = ""): Omit<HeartOfExport, "createdAt" | "updatedAt"> {
  return {
    bookingRef: booking?.bookingId || booking?.bookingNumber || "",
    date: booking?.bookingDate || booking?.date || "",
    blNumber: booking?.blNumber || "",
    client: booking?.customerName || booking?.clientName || "",
    shipper: booking?.shipper || "",
    consignee: booking?.consignee || "",
    commodity: booking?.commodity || "",
    volume: booking?.volume || "",
    shippingLine: booking?.shippingLine || "",
    vesselVoy: booking?.vesselVoyage || "",
    destination: booking?.pod || booking?.destination || "",
    trucker: truckingVendors || booking?.trucker || "",
    loadingAddress: booking?.loadingAddress || "",
    loadingSchedule: booking?.loadingSchedule || "",
    referenceNo: "",
    containerNumber: (() => {
      // Collect all container numbers across all segments
      const allNos: string[] = [];
      const segs: any[] = Array.isArray(booking?.segments) ? booking.segments : [];
      for (const seg of segs) {
        if (Array.isArray(seg.containerNos) && seg.containerNos.filter(Boolean).length > 0) {
          seg.containerNos.filter(Boolean).forEach((n: string) => allNos.push(n));
        } else if (seg.containerNo) {
          seg.containerNo.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((n: string) => allNos.push(n));
        }
      }
      if (allNos.length > 0) return [...new Set(allNos)].join(", ");
      // Fallback: active segment flat fields, then trucking-fetched
      if (Array.isArray(booking?.containerNos) && booking.containerNos.filter(Boolean).length > 0)
        return booking.containerNos.filter(Boolean).join(", ");
      if (booking?.containerNo) return booking.containerNo;
      return truckingContainers;
    })(),
    expShippingLine: { referenceNo: booking?.shippingLine || "", amount: "" },
    expTrucking: emptyExpenseRow(),
    expPettyCash: emptyExpenseRow(),
    expCommission: emptyExpenseRow(),
    expOthers: emptyExpenseRow(),
    expSOA: emptyExpenseRow(),
    expProfitSharing: emptyExpenseRow(),
  };
}

async function fetchTruckingData(bookingId: string): Promise<{ vendors: string; containers: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${encodeURIComponent(bookingId)}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    const result = await res.json();
    if (!result.success || !Array.isArray(result.data)) return { vendors: "", containers: "" };

    const vendors = [...new Set(
      result.data.map((r: any) => r.truckingVendor || r.vendorName || r.vendor_name || "").filter(Boolean)
    )].join(", ");

    const containers = [...new Set(
      result.data.map((r: any) =>
        r.containerNo || (Array.isArray(r.containers) && r.containers[0]?.containerNo) || ""
      ).filter(Boolean)
    )].join(", ");

    return { vendors, containers };
  } catch {
    return { vendors: "", containers: "" };
  }
}

interface HeartOfExportTabProps {
  bookingId: string;
  booking: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
  onEditStateChange?: (state: import("./SalesContractTab").DocumentEditState) => void;
}

export function HeartOfExportTab({ bookingId, booking, currentUser, onDocumentUpdated, onEditStateChange }: HeartOfExportTabProps) {
  const [doc, setDoc] = useState<HeartOfExport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<HeartOfExport>>({});
  const editDataRef = useRef(editData);
  editDataRef.current = editData;
  // Prefetched trucking data, so Create is instant when the user clicks
  const truckingDataRef = useRef<{ vendors: string; containers: string } | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);

  const fetchDocument = async () => {
    try {
      const id = encodeURIComponent(bookingId);
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setDoc(result.data.heartOfExport || null);
      }
    } catch (err) {
      console.error("Error fetching Heart of Export:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocument(); }, [bookingId]);

  // Warm trucking data on mount so Create opens instantly. If the user clicks before
  // it lands, pendingCreate flips and the open fires when the data arrives.
  useEffect(() => {
    let cancelled = false;
    fetchTruckingData(bookingId).then((data) => {
      if (cancelled) return;
      truckingDataRef.current = data;
      if (pendingCreate) {
        setPendingCreate(false);
        setEditData(buildEmpty(booking, data.vendors, data.containers));
        setIsCreating(true);
        setIsEditing(true);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleCreateClick = () => {
    const data = truckingDataRef.current;
    if (!data) {
      setPendingCreate(true);
      return;
    }
    setEditData(buildEmpty(booking, data.vendors, data.containers));
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
      const res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/heart-of-export`, {
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
        toast.success(isCreating ? "Heart of Export created" : "Heart of Export updated");
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving Heart of Export:", err);
      toast.error("Failed to save Heart of Export");
    } finally {
      setIsSaving(false);
    }
  }, [bookingId, currentUser?.name, isCreating]);

  useEffect(() => {
    onEditStateChange?.({
      isEditing, isSaving,
      refNo: doc?.bookingRef || "",
      docData: isEditing ? editData as any : doc,
      handleEdit, handleCancel, handleSave,
    });
  }, [isEditing, isSaving, doc, editData, handleSave]);

  const field = <K extends keyof HeartOfExport>(key: K): string =>
    ((isEditing ? editData[key] : doc?.[key]) as string) || "";

  const setField = (key: keyof HeartOfExport, value: string) =>
    setEditData((prev) => ({ ...prev, [key]: value }));

  const expRow = (key: keyof HeartOfExport) =>
    ((isEditing ? editData[key] : doc?.[key]) as { referenceNo: string; amount: string }) || { referenceNo: "", amount: "" };

  const setExpRow = (key: keyof HeartOfExport, field: "referenceNo" | "amount", value: string) =>
    setEditData((prev) => ({
      ...prev,
      [key]: { ...((prev[key] as any) || { referenceNo: "", amount: "" }), [field]: value },
    }));

  // When shippingLine changes, auto-fill expShippingLine.referenceNo
  const handleShippingLineChange = (v: string) => {
    setEditData((prev) => ({
      ...prev,
      shippingLine: v,
      expShippingLine: { ...((prev.expShippingLine as any) || { referenceNo: "", amount: "" }), referenceNo: v },
    }));
  };

  if (isLoading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>Loading...</div>;
  }

  if (!doc && !isEditing) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No Heart of Export record</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>Create a Heart of Export document for this booking.</p>
          <button onClick={handleCreateClick} disabled={pendingCreate} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#0F766E", color: "#FFFFFF", cursor: pendingCreate ? "wait" : "pointer", opacity: pendingCreate ? 0.7 : 1 }}>
            <Plus size={15} /> {pendingCreate ? "Loading…" : "Create Heart of Export"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px", overflow: "auto" }}>
      <SectionCard title="Booking Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Booking Ref #" value={field("bookingRef")} onChange={(v) => setField("bookingRef", v)} placeholder="e.g. EXP-000230" /> : <FieldView label="Booking Ref #" value={field("bookingRef")} />}
          {isEditing ? <DateField label="Date" value={field("date")} onChange={(v) => setField("date", v)} /> : <FieldView label="Date" value={field("date")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="BL Number" value={field("blNumber")} onChange={(v) => setField("blNumber", v)} placeholder="e.g. CNL0BX2025-0673" /> : <FieldView label="BL Number" value={field("blNumber")} />}
          {isEditing ? <FieldInput label="Client" value={field("client")} onChange={(v) => setField("client", v)} /> : <FieldView label="Client" value={field("client")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Shipper" value={field("shipper")} onChange={(v) => setField("shipper", v)} /> : <FieldView label="Shipper" value={field("shipper")} />}
          {isEditing ? <FieldInput label="Consignee" value={field("consignee")} onChange={(v) => setField("consignee", v)} /> : <FieldView label="Consignee" value={field("consignee")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Commodity" value={field("commodity")} onChange={(v) => setField("commodity", v)} /> : <FieldView label="Commodity" value={field("commodity")} />}
          {isEditing ? <FieldInput label="Volume" value={field("volume")} onChange={(v) => setField("volume", v)} placeholder="e.g. 1X40'HC" /> : <FieldView label="Volume" value={field("volume")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing
            ? <FieldInput label="Shipping Line" value={field("shippingLine")} onChange={handleShippingLineChange} placeholder="e.g. SINOTRANS" />
            : <FieldView label="Shipping Line" value={field("shippingLine")} />}
          {isEditing ? <FieldInput label="Vessel / Voy" value={field("vesselVoy")} onChange={(v) => setField("vesselVoy", v)} placeholder="e.g. OSG ADMIRAL V.2545N" /> : <FieldView label="Vessel / Voy" value={field("vesselVoy")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Destination" value={field("destination")} onChange={(v) => setField("destination", v)} placeholder="e.g. XIAMEN, CHINA" /> : <FieldView label="Destination" value={field("destination")} />}
          {isEditing ? <FieldInput label="Trucker" value={field("trucker")} onChange={(v) => setField("trucker", v)} placeholder="e.g. ASBS, XTC" /> : <FieldView label="Trucker" value={field("trucker")} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Loading Address" value={field("loadingAddress")} onChange={(v) => setField("loadingAddress", v)} placeholder="e.g. VALENZUELA" /> : <FieldView label="Loading Address" value={field("loadingAddress")} />}
          {isEditing ? <FieldInput label="Loading Schedule" value={field("loadingSchedule")} onChange={(v) => setField("loadingSchedule", v)} /> : <FieldView label="Loading Schedule" value={field("loadingSchedule")} />}
        </div>
      </SectionCard>

      <SectionCard title="Expense Particulars">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {isEditing ? <FieldInput label="Reference #" value={field("referenceNo")} onChange={(v) => setField("referenceNo", v)} /> : <FieldView label="Reference #" value={field("referenceNo")} />}
          {isEditing ? <FieldInput label="Container Number" value={field("containerNumber")} onChange={(v) => setField("containerNumber", v)} placeholder="e.g. SNBU4839O922" /> : <FieldView label="Container Number" value={field("containerNumber")} />}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E5E9F0" }}>
              <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#0F766E", width: "35%" }}>Particulars</th>
              <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#0F766E", width: "40%" }}>Reference Number</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#0F766E", width: "25%" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {EXPENSE_ROWS.map(({ key, label }) => {
              const row = expRow(key);
              return (
                <tr key={key} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500, color: "#12332B" }}>{label}</td>
                  <td style={{ padding: "6px 12px" }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.referenceNo}
                        onChange={(e) => setExpRow(key, "referenceNo", e.target.value)}
                        placeholder="—"
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                      />
                    ) : (
                      <span style={{ color: row.referenceNo ? "#12332B" : "#9CA3AF" }}>{row.referenceNo || "—"}</span>
                    )}
                  </td>
                  <td style={{ padding: "6px 12px" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => setExpRow(key, "amount", e.target.value)}
                        placeholder="0.00"
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #0F766E", borderRadius: "6px", fontSize: "13px", outline: "none", textAlign: "right", boxSizing: "border-box", fontVariantNumeric: "tabular-nums" }}
                      />
                    ) : (
                      <span style={{ display: "block", textAlign: "right", color: row.amount ? "#12332B" : "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                        {row.amount ? parseFloat(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
