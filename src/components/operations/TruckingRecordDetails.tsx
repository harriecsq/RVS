/**
 * TruckingRecordDetails — view/edit detail screen for a Trucking record.
 * Supports in-page inline editing (no side panel).
 * Design matches ViewExpenseScreen pattern:
 * - White header with back arrow, title, action buttons
 * - Gradient summary/metadata bar with vendor-coloured bottom border
 * - #F9FAFB content background with max-width 900px white cards
 * - Card headers: #F9FAFB bg, 16px/600 title
 * - Field labels: 13px/#667085/500, values in bordered boxes
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Edit3, Clock, Truck, Save, X, ChevronDown, Check, Search, Plus, Trash2, Link2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import type { TruckingRecord } from "./CreateTruckingModal";
import { StandardButton } from "../design-system";
import { StandardTabs } from "../design-system/StandardTabs";
import { BookingSelector } from "../selectors/BookingSelector";
import { ActionsDropdown } from "../shared/ActionsDropdown";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { StatusTagBar as SharedStatusTagBar } from "../shared/StatusTagBar";
import { TagHistoryTimeline } from "../shared/TagHistoryTimeline";
import { NeuronDatePicker } from "./shared/NeuronDatePicker";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import type { TagHistoryEntry } from "../../types/operations";
import {
  TRUCKING_TAG_GROUPS,
  TRUCKING_VENDORS,
  EMPTY_RETURN_OPTIONS,
  DISPATCHER_LIST,
  GATEPASS_LIST,
  getStatusSummary,
  hexToRgba,
} from "../../utils/truckingTags";
import { getOperationalTags } from "../../utils/statusTags";
import { formatDateTime } from "./shared/DateTimeInput";
import { API_BASE_URL } from '@/utils/api-config';

const OPERATIONAL_TRUCKING_TAGS = getOperationalTags("trucking");

/** Convert "HH:mm" (24h) to "h:mm AM/PM" */
function formatTimeAmPm(time: string | undefined | null): string {
  if (!time) return "—";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

interface TruckingRecordDetailsProps {
  record: TruckingRecord;
  onBack: () => void;
  onUpdate: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
  /** When true, hides the back arrow button. Used when rendered inline inside a booking tab. */
  embedded?: boolean;
  onBookingTagsUpdated?: () => void;
}

// ─── Display helpers (matching ViewExpenseScreen) ────────────────────────────

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "13px",
  color: "#667085",
  marginBottom: "8px",
  fontWeight: 500,
};

const VALUE_BOX: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "14px",
  color: "#0A1D4D",
  background: "#F9FAFB",
  border: "1px solid #E5E9F0",
  borderRadius: "8px",
};

/** Compact label-value for booking-derived summary card */
const SUMMARY_LABEL: React.CSSProperties = {
  fontSize: "11px",
  color: "#9CA3AF",
  fontWeight: 500,
  marginBottom: "2px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

const SUMMARY_VALUE: React.CSSProperties = {
  fontSize: "13px",
  color: "#0A1D4D",
  fontWeight: 500,
  lineHeight: "1.4",
};

function SummaryField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div style={SUMMARY_LABEL}>{label}</div>
      <div style={SUMMARY_VALUE}>{value || "—"}</div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={VALUE_BOX}>{value || "—"}</div>
    </div>
  );
}

function VendorPill({ vendor }: { vendor: string }) {
  const v = TRUCKING_VENDORS.find((v) => v.name === vendor);
  if (!v) return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, backgroundColor: "#F3F4F6", border: "1px solid #E5E9F0", color: "#6B7280", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{vendor || "—"}</span>;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 12px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: 600,
      backgroundColor: hexToRgba(v.hex, 0.08),
      border: `1px solid ${hexToRgba(v.hex, 0.3)}`,
      color: v.hex,
      letterSpacing: "0.03em",
      whiteSpace: "nowrap",
    }}>
      {v.name}
    </span>
  );
}

/** White card wrapper matching ViewExpenseScreen info cards */
function InfoCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      border: "1px solid #E5E9F0",
      overflow: "hidden",
      marginBottom: "24px",
      ...style,
    }}>
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid #E5E9F0",
        background: "#F9FAFB",
      }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: "24px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Inline edit sub-components ────────────────────────────────────────��─────

function EditLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "8px", color: "#667085" }}>
      {children}
    </label>
  );
}

function EditTextInput({
  value, onChange, placeholder = "", disabled,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #E5E9F0",
        fontSize: "14px",
        color: "#0A1D4D",
        outline: "none",
        backgroundColor: "#FFFFFF",
        boxSizing: "border-box",
      }}
    />
  );
}

function EditTextArea({
  value, onChange, placeholder = "", rows = 4,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #E5E9F0",
        fontSize: "14px",
        color: "#0A1D4D",
        outline: "none",
        fontFamily: "inherit",
        backgroundColor: "#FFFFFF",
        resize: "vertical",
        minHeight: "80px",
        boxSizing: "border-box",
      }}
    />
  );
}

function EditDateTimeRow({
  dateValue, timeValue, onDateChange, onTimeChange, dateLabel,
}: { dateValue: string; timeValue: string; onDateChange: (iso: string) => void; onTimeChange: (t: string) => void; dateLabel?: string }) {
  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <div style={{ flex: 1 }}>
        {dateLabel && <EditLabel>{dateLabel}</EditLabel>}
        <NeuronDatePicker value={dateValue} onChange={onDateChange} />
      </div>
      <div style={{ flex: 1 }}>
        {dateLabel && <EditLabel>Time</EditLabel>}
        <NeuronTimePicker value={timeValue} onChange={onTimeChange} />
      </div>
    </div>
  );
}

function EditNeuronDropdown({
  value, options, onChange, placeholder = "Select...",
}: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "1px solid #E5E9F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontSize: "14px",
          color: value ? "#0A1D4D" : "#9CA3AF",
          backgroundColor: "#FFFFFF",
          boxSizing: "border-box",
        }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: "4px",
            background: "white",
            borderRadius: "8px",
            border: "1px solid #E5E9F0",
            maxHeight: "220px",
            overflowY: "auto",
            zIndex: 9999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#0A1D4D",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: value === opt ? "#F0FAF8" : "transparent",
              }}
              onMouseEnter={(e) => { if (value !== opt) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F8F9FB"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = value === opt ? "#F0FAF8" : "transparent"; }}
            >
              {opt}
              {value === opt && <Check size={14} style={{ color: "#0F766E" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditVendorDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const vendor = TRUCKING_VENDORS.find((v) => v.name === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = TRUCKING_VENDORS.filter(
    (v) => !search || v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "8px",
          border: vendor ? `1px solid ${hexToRgba(vendor.hex, 0.3)}` : "1px solid #E5E9F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontSize: "14px",
          backgroundColor: vendor ? hexToRgba(vendor.hex, 0.08) : "#FFFFFF",
          color: vendor ? vendor.hex : "#0A1D4D",
          fontWeight: vendor ? 500 : 400,
          boxSizing: "border-box",
        }}
      >
        {vendor ? (
          <span>{vendor.name}</span>
        ) : (
          <span style={{ color: "#9CA3AF" }}>Select vendor...</span>
        )}
        <ChevronDown size={16} style={{ color: vendor ? vendor.hex : "#9CA3AF", flexShrink: 0 }} />
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: "4px",
            background: "white",
            borderRadius: "8px",
            border: "1px solid #E5E9F0",
            zIndex: 9999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5E9F0" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #E5E9F0",
                fontSize: "14px",
                color: "#0A1D4D",
                outline: "none",
                backgroundColor: "#FFFFFF",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "12px 16px", fontSize: "14px", color: "#9CA3AF" }}>No vendors found</div>
            )}
            {filtered.map((v) => (
              <div
                key={v.name}
                onClick={() => { onChange(v.name); setOpen(false); }}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  backgroundColor: value === v.name ? "#F0FAF8" : "transparent",
                }}
                onMouseEnter={(e) => { if (value !== v.name) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F8F9FB"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = value === v.name ? "#F0FAF8" : "transparent"; }}
              >
                <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: v.hex, flexShrink: 0, display: "inline-block" }} />
                <span style={{ color: "#0A1D4D" }}>{v.name}</span>
                {value === v.name && <Check size={14} style={{ color: "#0F766E", marginLeft: "auto" }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditTagChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: "#E8F5F3",
        color: "#0A1D4D",
        border: "1px solid #C1D9CC",
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#0A1D4D", padding: 0, display: "flex", alignItems: "center", opacity: 0.5 }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

function EditTagSelector({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  const filtered = OPERATIONAL_TRUCKING_TAGS.filter(
    (t) => !search || t.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px", minHeight: "28px" }}>
        {selected.length === 0 && (
          <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No tags selected</span>
        )}
        {selected.map((key) => {
          const tag = OPERATIONAL_TRUCKING_TAGS.find((t) => t.key === key);
          return <EditTagChip key={key} label={tag?.label || key} onRemove={() => toggle(key)} />;
        })}
      </div>
      <div ref={ref} style={{ position: "relative" }}>
        <div
          onClick={() => setOpen(!open)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #E5E9F0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            backgroundColor: "#FFFFFF",
            boxSizing: "border-box",
          }}
        >
          <Search size={14} style={{ color: "#9CA3AF" }} />
          <span style={{ fontSize: "14px", color: "#9CA3AF" }}>Add tags...</span>
        </div>
        {open && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "100%",
              marginTop: "4px",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #E5E9F0",
              maxHeight: "300px",
              overflowY: "auto",
              zIndex: 9999,
              boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
            }}
          >
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5E9F0" }}>
              <input
                autoFocus
                type="text"
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #E5E9F0",
                  fontSize: "14px",
                  color: "#0A1D4D",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {TRUCKING_TAG_GROUPS.map((group) => {
              const groupTags = filtered.filter((t) => t.group === group.id);
              if (!groupTags.length) return null;
              return (
                <div key={group.id}>
                  <div style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.07em" }}>
                    {group.label}
                  </div>
                  {groupTags.map((tag) => (
                    <div
                      key={tag.key}
                      onClick={(e) => { e.stopPropagation(); toggle(tag.key); }}
                      style={{
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#0A1D4D",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        backgroundColor: selected.includes(tag.key) ? "#F0FAF8" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!selected.includes(tag.key)) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F8F9FB"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = selected.includes(tag.key) ? "#F0FAF8" : "transparent"; }}
                    >
                      <div
                        style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `1.5px solid ${selected.includes(tag.key) ? "#0F766E" : "#D1D5DB"}`,
                          backgroundColor: selected.includes(tag.key) ? "#0F766E" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {selected.includes(tag.key) && <Check size={10} color="white" />}
                      </div>
                      {tag.label}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AddLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "14px",
        fontWeight: 600,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#0F766E",
        padding: 0,
        marginTop: "4px",
      }}
    >
      <Plus size={14} />
      {children}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex", alignItems: "center" }}
    >
      <Trash2 size={15} />
    </button>
  );
}

// ─── Summary-bar Status Tag Picker ──────────────────────────────────────────

/** Pill with hover-to-remove "×" for the summary bar */
// ─── Main Component ──────────────────────────────────────────────────────────

/** Normalize legacy records that have containers[] instead of flat fields */
function normalizeRecord(r: any): any {
  if (!r.containerNo && Array.isArray(r.containers) && r.containers.length > 0) {
    return {
      ...r,
      containerNo: r.containers[0].containerNo || "",
      containerSize: r.containers[0].size || "",
    };
  }
  return r;
}

export function TruckingRecordDetails({
  record,
  onBack,
  onUpdate,
  currentUser,
  embedded = false,
  onBookingTagsUpdated,
}: TruckingRecordDetailsProps) {
  const [activeTab, setActiveTab] = useState<"trucking-info" | "attachments">("trucking-info");
  const [showActivity, setShowActivity] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TruckingRecord>(normalizeRecord(record) as TruckingRecord);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkedShipmentTags, setLinkedShipmentTags] = useState<string[]>(
    ((record as any).linkedBookingShipmentTags || []) as string[],
  );
  const [linkedTagHistory, setLinkedTagHistory] = useState<TagHistoryEntry[]>(
    ((record as any).linkedBookingTagHistory || []) as TagHistoryEntry[],
  );
  const [isShipmentTagsSaving, setIsShipmentTagsSaving] = useState(false);

  // ── Inline edit state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<TruckingRecord>({ ...record });
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const r = isEditing ? editForm : currentRecord;

  // Determine if this is an export booking
  const isExportBooking = (currentRecord.linkedBookingType || "").toLowerCase().includes("export");

  // ── Linked booking state ──
  const [linkedBookingData, setLinkedBookingData] = useState<any>(null);
  const [isLoadingLinkedBooking, setIsLoadingLinkedBooking] = useState(false);

  useEffect(() => {
    setCurrentRecord(record);
    setEditForm({ ...record });
    setLinkedShipmentTags(((record as any).linkedBookingShipmentTags || []) as string[]);
    setLinkedTagHistory(((record as any).linkedBookingTagHistory || []) as TagHistoryEntry[]);
  }, [record]);

  const fetchLinkedBooking = useCallback(async (bookingId: string, autoFill = false) => {
    if (!bookingId) {
      setLinkedBookingData(null);
      return;
    }
    setIsLoadingLinkedBooking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        const b = result.data;
        setLinkedBookingData(b);
        setLinkedShipmentTags(Array.isArray((b as any).shipmentTags) ? (b as any).shipmentTags : []);
        setLinkedTagHistory(Array.isArray((b as any).tagHistory) ? (b as any).tagHistory : []);
        
        if (autoFill) {
          const blVal = b.blNumber || b.bl_number || b.awbBlNo || b.awb_bl_no || b.billOfLading || "";
          const commodityVal = b.commodityItems || b.commodity_items || b.commodity || b.commodityDescription || b.commodity_description || "";
          const shippingVal = b.shippingLine || b.shipping_line || b.carrier || "";
          const vesselVal = b.vesselVoyage || b.vessel_voyage || b.vessel || b.vesselName || b.vessel_name || "";

          // Container is managed via ContainerSelector now — not auto-filled here

          setEditForm((prev: any) => ({
            ...prev,
            blNumber: blVal || prev.blNumber,
            commodityItems: commodityVal || prev.commodityItems,
            shippingLine: shippingVal || prev.shippingLine,
            vesselVoyage: vesselVal || prev.vesselVoyage,
          }));
          toast.success("Fields auto-filled from booking");
        }
      } else {
        setLinkedBookingData(null);
      }
    } catch (err) {
      console.error("Error fetching linked booking:", err);
      setLinkedBookingData(null);
    } finally {
      setIsLoadingLinkedBooking(false);
    }
  }, []);

  // Fetch linked booking on mount / when record changes
  useEffect(() => {
    if (currentRecord.linkedBookingId) {
      fetchLinkedBooking(currentRecord.linkedBookingId);
    }
  }, [currentRecord.linkedBookingId, fetchLinkedBooking]);

  // Track changes
  const hasChanges = isEditing && JSON.stringify(editForm) !== JSON.stringify(currentRecord);

  // Sorted tags for display
  const groupOrder: Record<string, number> = { operations: 0, documentation: 1, financial: 2, client: 3 };
  const sortedTags = [...(r.remarks || [])].sort((a, b) => {
    const ta = OPERATIONAL_TRUCKING_TAGS.find((t) => t.key === a);
    const tb = OPERATIONAL_TRUCKING_TAGS.find((t) => t.key === b);
    return (groupOrder[ta?.group || ""] ?? 99) - (groupOrder[tb?.group || ""] ?? 99);
  });

  function formatISOToDisplay(isoDate: string): string {
    if (!isoDate) return "—";
    const [y, m, d] = isoDate.split("-");
    if (!y || !m || !d) return isoDate;
    return `${m}/${d}/${y}`;
  }

  // ── Edit helpers ──
  const enterEditMode = () => {
    setEditForm(JSON.parse(JSON.stringify(currentRecord)));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditing(false);
    }
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    setIsEditing(false);
  };

  // Field setter for edit form
  const set = <K extends keyof TruckingRecord>(key: K, value: TruckingRecord[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Quick status-tag update (persists immediately, no edit mode required) ──
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const handleQuickStatusUpdate = useCallback(
    async (newTags: string[]) => {
      // Optimistic update
      const prevRecord = { ...currentRecord };
      setCurrentRecord((prev) => ({ ...prev, remarks: newTags }));
      // Also update editForm if currently in edit mode
      if (isEditing) {
        setEditForm((prev) => ({ ...prev, remarks: newTags }));
      }

      setIsStatusSaving(true);
      try {
        const payload = { ...currentRecord, remarks: newTags, updatedAt: new Date().toISOString() };
        const res = await fetch(`${API_BASE_URL}/trucking-records/${currentRecord.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          setCurrentRecord(result.data);
          if (isEditing) {
            setEditForm((prev) => ({ ...prev, remarks: result.data.remarks }));
          }
          onUpdate();
        } else {
          // Revert on failure
          setCurrentRecord(prevRecord);
          toast.error(`Failed to update status: ${result.error || "Unknown error"}`);
        }
      } catch (err) {
        console.error("Error updating status tags:", err);
        setCurrentRecord(prevRecord);
        toast.error("Unable to update status");
      } finally {
        setIsStatusSaving(false);
      }
    },
    [currentRecord, isEditing, onUpdate],
  );

  const handleLinkedShipmentTagsChange = useCallback(
    async (newTags: string[]) => {
      if (!currentRecord.linkedBookingId) {
        toast.error("No linked booking to update");
        return;
      }

      const previousTags = linkedShipmentTags;
      setLinkedShipmentTags(newTags);
      setIsShipmentTagsSaving(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/trucking-records/${currentRecord.id}/update-booking-tags`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              shipmentTags: newTags,
              user: currentUser?.name || "Unknown",
            }),
          },
        );
        const result = await response.json();
        if (result.success) {
          setLinkedShipmentTags((result.data?.shipmentTags || []) as string[]);
          setLinkedTagHistory((result.data?.tagHistory || []) as TagHistoryEntry[]);
          onUpdate();
          onBookingTagsUpdated?.();
        } else {
          setLinkedShipmentTags(previousTags);
          toast.error(`Failed to update shipment tags: ${result.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error updating linked shipment tags:", error);
        setLinkedShipmentTags(previousTags);
        toast.error("Unable to update shipment tags");
      } finally {
        setIsShipmentTagsSaving(false);
      }
    },
    [currentRecord.id, currentRecord.linkedBookingId, currentUser?.name, linkedShipmentTags, onBookingTagsUpdated, onUpdate],
  );

  // Drop helpers
  const addDrop = () => set("deliveryDrops", [
    ...editForm.deliveryDrops,
    { deaDate: "", deliveryScheduleDate: "", deliveryScheduleTime: "", unloadingStart: "", unloadingEnd: "", parking: "Availability depends on time of arrival.", instructions: [{ text: "" }], additionalNote: "" },
  ]);
  const removeDrop = (i: number) => set("deliveryDrops", editForm.deliveryDrops.filter((_: any, idx: number) => idx !== i));
  const updateDrop = (i: number, key: string, val: any) =>
    set("deliveryDrops", editForm.deliveryDrops.map((d: any, idx: number) => idx === i ? { ...d, [key]: val } : d));
  const addInstruction = (di: number) =>
    set("deliveryDrops", editForm.deliveryDrops.map((d: any, idx: number) => idx === di ? { ...d, instructions: [...d.instructions, { text: "" }] } : d));
  const updateInstruction = (di: number, ii: number, val: string) =>
    set("deliveryDrops", editForm.deliveryDrops.map((d: any, idx: number) =>
      idx === di ? { ...d, instructions: d.instructions.map((ins: any, i: number) => i === ii ? { text: val } : ins) } : d
    ));
  const removeInstruction = (di: number, ii: number) =>
    set("deliveryDrops", editForm.deliveryDrops.map((d: any, idx: number) =>
      idx === di ? { ...d, instructions: d.instructions.filter((_: any, i: number) => i !== ii) } : d
    ));

  // Address helpers
  const addAddress = () => set("deliveryAddresses", [...editForm.deliveryAddresses, { address: "", postalCode: "", recipients: [{ name: "", contacts: [""] }], additionalNote: "" }]);
  const removeAddress = (i: number) => set("deliveryAddresses", editForm.deliveryAddresses.filter((_: any, idx: number) => idx !== i));
  const updateAddress = (i: number, key: string, val: any) =>
    set("deliveryAddresses", editForm.deliveryAddresses.map((a: any, idx: number) => idx === i ? { ...a, [key]: val } : a));
  const addRecipient = (ai: number) =>
    set("deliveryAddresses", editForm.deliveryAddresses.map((a: any, i: number) => i === ai ? { ...a, recipients: [...a.recipients, { name: "", contacts: [""] }] } : a));
  const removeRecipient = (ai: number, ri: number) =>
    set("deliveryAddresses", editForm.deliveryAddresses.map((a: any, i: number) => i === ai ? { ...a, recipients: a.recipients.filter((_: any, r: number) => r !== ri) } : a));
  const updateRecipient = (ai: number, ri: number, key: string, val: any) =>
    set("deliveryAddresses", editForm.deliveryAddresses.map((a: any, i: number) =>
      i === ai ? { ...a, recipients: a.recipients.map((r: any, j: number) => j === ri ? { ...r, [key]: val } : r) } : a
    ));
  const addContact = (ai: number, ri: number) =>
    set("deliveryAddresses", editForm.deliveryAddresses.map((a: any, i: number) =>
      i === ai ? { ...a, recipients: a.recipients.map((r: any, j: number) => j === ri ? { ...r, contacts: [...r.contacts, ""] } : r) } : a
    ));
  const removeContact = (ai: number, ri: number, ci: number) =>
    set("deliveryAddresses", editForm.deliveryAddresses.map((a: any, i: number) =>
      i === ai ? { ...a, recipients: a.recipients.map((r: any, j: number) => j === ri ? { ...r, contacts: r.contacts.filter((_: any, k: number) => k !== ci) } : r) } : a
    ));
  const updateContact = (ai: number, ri: number, ci: number, val: string) =>
    set("deliveryAddresses", editForm.deliveryAddresses.map((a: any, i: number) =>
      i === ai ? { ...a, recipients: a.recipients.map((r: any, j: number) => j === ri ? { ...r, contacts: r.contacts.map((c: any, k: number) => k === ci ? val : c) } : r) } : a
    ));

  // Empty return location helpers
  const addLocation = () => set("emptyReturnLocations", [...editForm.emptyReturnLocations, { location: "", startDate: "", startTime: "", endDate: "", endTime: "" }]);
  const removeLocation = (i: number) => set("emptyReturnLocations", editForm.emptyReturnLocations.filter((_: any, idx: number) => idx !== i));
  const updateLocation = (i: number, key: string, val: any) =>
    set("emptyReturnLocations", editForm.emptyReturnLocations.map((l: any, idx: number) => idx === i ? { ...l, [key]: val } : l));
  const toggleLocationShowEnd = (i: number, show: boolean) =>
    set("emptyReturnLocations", editForm.emptyReturnLocations.map((l: any, idx: number) =>
      idx === i ? { ...l, showEnd: show, ...(show ? {} : { endDate: "", endTime: "" }) } : l
    ));

  // Remarks drops helpers
  const remarksDrops = editForm.remarksDrops || [];
  const addRemarksDrop = () => set("remarksDrops", [...remarksDrops, { startDate: "", startTime: "", doneDate: "", doneTime: "" }]);
  const removeRemarksDrop = (i: number) => set("remarksDrops", remarksDrops.filter((_: any, idx: number) => idx !== i));
  const updateRemarksDrop = (i: number, key: string, val: string) =>
    set("remarksDrops", remarksDrops.map((d: any, idx: number) => idx === i ? { ...d, [key]: val } : d));

  // ── Delete ──
  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/trucking-records/${currentRecord.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Trucking record deleted");
        setShowDeleteConfirm(false);
        onBack();
        onUpdate();
      } else {
        toast.error("Failed to delete");
      }
    } catch (err) {
      toast.error("Error deleting record");
    }
  };

  // ── Save (inline edit) ──
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { ...editForm, updatedAt: new Date().toISOString() };
      const res = await fetch(`${API_BASE_URL}/trucking-records/${currentRecord.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Trucking record updated");
        setCurrentRecord(result.data);
        setIsEditing(false);
        onUpdate();
      } else {
        toast.error(`Failed to save: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error saving trucking record:", err);
      toast.error("Unable to save trucking record");
    } finally {
      setIsSaving(false);
    }
  };

  // Determine gradient for summary bar based on vendor color
  const vendorInfo = TRUCKING_VENDORS.find((v) => v.name === currentRecord.truckingVendor);
  const vendorHex = vendorInfo?.hex || "#667085";
  const getSummaryBarGradient = () => {
    return `linear-gradient(135deg, ${hexToRgba(vendorHex, 0.08)} 0%, ${hexToRgba(vendorHex, 0.16)} 100%)`;
  };

  return (
    <div style={{
      background: "#F9FAFB",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>

      {/* ── Header ── */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #E5E9F0",
        padding: "20px 48px",
        flexShrink: 0,
        ...(embedded ? { position: "sticky" as const, top: 0, zIndex: 10 } : {})
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Back arrow — hidden in embedded mode */}
            {!embedded && (
            <button
              onClick={isEditing ? cancelEdit : onBack}
              style={{
                background: "transparent",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#6B7280",
                borderRadius: "6px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft size={20} />
            </button>
            )}

            {/* Title */}
            <div>
              <h1 style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#0A1D4D",
                marginBottom: "0",
                margin: 0,
              }}>
                {isEditing ? "Editing: " : ""}{currentRecord.truckingRefNo || currentRecord.id}
              </h1>
              {isEditing && (
                <p style={{ fontSize: "13px", color: "#667085", margin: "2px 0 0" }}>
                  Make changes below, then save
                </p>
              )}
            </div>
          </div>

          {/* Right: buttons */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {isEditing ? (
              <>
                <StandardButton
                  variant="secondary"
                  onClick={cancelEdit}
                >
                  Cancel
                </StandardButton>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    backgroundColor: isSaving ? "#A0C4BE" : "#0F766E",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.7 : 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowActivity(!showActivity)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    backgroundColor: showActivity ? "#E8F5F3" : "white",
                    border: `1.5px solid ${showActivity ? "#0F766E" : "#E5E9F0"}`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: showActivity ? "#0F766E" : "#667085",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!showActivity) e.currentTarget.style.backgroundColor = "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    if (!showActivity) e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <Clock size={16} />
                  Activity
                </button>

                <StandardButton
                  variant="secondary"
                  icon={<Edit3 size={16} />}
                  onClick={enterEditMode}
                >
                  Edit Trucking
                </StandardButton>
              </>
            )}

            <ActionsDropdown
              onDownloadPDF={() => toast.info("PDF download — coming soon")}
              onDownloadWord={() => toast.info("Word download — coming soon")}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </div>
        </div>
      </div>

      {/* ── Summary / Metadata Bar (hidden in embedded mode) ── */}
      {!embedded && (<div style={{
        background: getSummaryBarGradient(),
        border: "none",
        borderBottom: `1.5px solid ${vendorHex}`,
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        gap: "32px",
        flexShrink: 0,
      }}>
        {/* Vendor — displayed first */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Vendor
          </div>
          <VendorPill vendor={currentRecord.truckingVendor} />
        </div>

        <div style={{ width: "1px", height: "40px", background: vendorHex, opacity: 0.2, flexShrink: 0 }} />

        {/* Created Date */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Created Date
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
            {currentRecord.createdAt ? new Date(currentRecord.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
          </div>
        </div>

        <div style={{ width: "1px", height: "40px", background: vendorHex, opacity: 0.2, flexShrink: 0 }} />

        {/* Status — interactive tag picker */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            Status
            {(isStatusSaving || isShipmentTagsSaving) && (
              <span style={{ fontSize: "10px", fontWeight: 400, color: "#9CA3AF", marginLeft: "8px", textTransform: "none", letterSpacing: "normal" }}>
                Saving...
              </span>
            )}
          </div>
          <SharedStatusTagBar
            bookingType="trucking"
            shipmentTags={linkedShipmentTags}
            operationalTags={currentRecord.remarks || []}
            onShipmentTagsChange={handleLinkedShipmentTagsChange}
            onOperationalTagsChange={handleQuickStatusUpdate}
            shipmentTagsReadOnly={!currentRecord.linkedBookingId}
            disabled={false}
          />
          {!currentRecord.linkedBookingId && (
            <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic", marginTop: "4px" }}>
              Link a booking to enable shipment status tags
            </div>
          )}
        </div>
      </div>)}

      {/* ── Tabs ── */}
      {!embedded && (
        <div style={{
          padding: "0 48px",
          borderBottom: "1px solid #E5E9F0",
          backgroundColor: "white"
        }}>
          <StandardTabs
            tabs={[
              { id: "trucking-info", label: "Trucking Information" },
              { id: "attachments", label: "Attachments" }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as "trucking-info" | "attachments")}
          />
        </div>
      )}

      {/* ── Content ── */}
      <div style={{
        background: "#F9FAFB",
        flex: 1,
        overflow: "auto",
      }}>
        {(embedded || activeTab === "trucking-info") && (
        <div style={{ padding: "32px 48px" }}>
          <div>
            {showActivity && (
              <InfoCard title="Shipment Tag History">
                <TagHistoryTimeline history={linkedTagHistory} maxEntries={20} />
              </InfoCard>
            )}

            {/* ── Booking Details (unified summary card) ── */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #E5E9F0",
              overflow: "hidden",
              marginBottom: "24px",
            }}>
              <div style={{
                padding: "16px 24px",
                borderBottom: "1px solid #E5E9F0",
                background: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                  Booking Details
                </h3>
              </div>
              <div style={{ padding: "20px 24px" }}>
                {/* BookingSelector — only in edit mode */}
                {isEditing && (
                  <div style={{ marginBottom: "16px" }}>
                    <EditLabel>Link to Booking</EditLabel>
                    <BookingSelector
                      value={editForm.linkedBookingId || ""}
                      onSelect={async (booking) => {
                        if (!booking) {
                          set("linkedBookingId", "");
                          set("linkedBookingType", "");
                          setLinkedBookingData(null);
                          return;
                        }
                        set("linkedBookingId", booking.id || "");
                        set("linkedBookingType", (booking as any).shipmentType || (booking as any).booking_type || (booking as any).mode || "");
                        await fetchLinkedBooking(booking.id, true);
                      }}
                      placeholder="Search by Booking Ref, BL No, or Client..."
                    />
                    {isLoadingLinkedBooking && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          backgroundColor: "#F0FAF8",
                          color: "#0F766E",
                          border: "1px solid #D1FAE5",
                          marginTop: "8px",
                        }}
                      >
                        <div
                          className="animate-spin"
                          style={{
                            width: 14,
                            height: 14,
                            border: "2px solid #0F766E",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                          }}
                        />
                        Loading booking details…
                      </div>
                    )}
                    {!isLoadingLinkedBooking && editForm.linkedBookingId && linkedBookingData && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          backgroundColor: "#F0FDF4",
                          color: "#15803D",
                          border: "1px solid #BBF7D0",
                          marginTop: "8px",
                        }}
                      >
                        <Link2 size={14} />
                        Booking linked — fields auto-filled
                      </div>
                    )}
                  </div>
                )}

                {/* Summary fields — always read-only */}
                {(() => {
                  const bookingId = isEditing ? editForm.linkedBookingId : r.linkedBookingId;
                  if (!bookingId) {
                    return (
                      <div style={{ fontSize: "13px", color: "#9CA3AF", fontStyle: "italic" }}>
                        No booking linked
                      </div>
                    );
                  }

                  const clientVal = linkedBookingData?.customerName || linkedBookingData?.client_name || linkedBookingData?.clientName || "—";
                  const hasDistinctCompany = linkedBookingData?.companyName && clientVal !== linkedBookingData.companyName;

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Row 1: Booking Ref */}
                      <SummaryField label="Linked Booking Ref" value={bookingId} />

                      {/* Row 2: Client + Consignee */}
                      {isLoadingLinkedBooking ? (
                        <div style={{ fontSize: "13px", color: "#667085", fontStyle: "italic" }}>
                          Loading booking details…
                        </div>
                      ) : linkedBookingData ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <SummaryField label="Client" value={clientVal} />
                          <SummaryField 
                            label={isExportBooking ? "Shipper" : "Consignee"} 
                            value={isExportBooking ? (linkedBookingData.shipper || "—") : (linkedBookingData.consignee || "—")} 
                          />
                        </div>
                      ) : null}

                      {/* Divider */}
                      

                      {/* Row 3: Container + Size */}
                      {r.containerNo && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <SummaryField label="Container" value={r.containerNo} />
                          <SummaryField label="Size" value={r.containerSize || "—"} />
                        </div>
                      )}

                      {/* Row 4–5: Commodity, Shipping Line, Vessel, BL */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <SummaryField label="Commodity Items" value={r.commodityItems} />
                        <SummaryField label="Shipping Line" value={r.shippingLine} />
                        <SummaryField label="Vessel / Voyage" value={r.vesselVoyage} />
                        <SummaryField label="B/L Number" value={r.blNumber} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

              {/* ── Conditional: Export vs Import trucking content ── */}
              {isExportBooking ? (
                /* ── Export: Trucking Information Card ── */
                <InfoCard title="Trucking Information">
                  {isEditing ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div>
                        <EditLabel>Trucking</EditLabel>
                        <EditVendorDropdown value={editForm.truckingVendor} onChange={(v) => set("truckingVendor", v)} />
                      </div>
                      <div>
                        <EditLabel>Plate No.</EditLabel>
                        <EditTextInput value={(editForm as any).plateNo || ""} onChange={(v) => set("plateNo" as any, v)} placeholder="Enter plate number" />
                      </div>
                      <div>
                        <EditLabel>Contact</EditLabel>
                        <EditTextInput value={(editForm as any).contact || ""} onChange={(v) => set("contact" as any, v)} placeholder="Enter contact number" />
                      </div>
                      <div>
                        <EditLabel>Driver/Helper Name</EditLabel>
                        <EditTextInput value={(editForm as any).driverHelperName || ""} onChange={(v) => set("driverHelperName" as any, v)} placeholder="Enter driver/helper name" />
                      </div>
                      <div>
                        <EditLabel>Rate</EditLabel>
                        <EditTextInput value={editForm.truckingRate} onChange={(v) => set("truckingRate", v)} placeholder="0.00" />
                      </div>
                      <div>
                        <EditLabel>Stickers</EditLabel>
                        <EditTextInput value={(editForm as any).stickers || ""} onChange={(v) => set("stickers" as any, v)} placeholder="Enter stickers" />
                      </div>
                      <div>
                        <EditLabel>Weighing</EditLabel>
                        <EditTextInput value={(editForm as any).weighing || ""} onChange={(v) => set("weighing" as any, v)} placeholder="Enter weighing details" />
                      </div>
                      <div>
                        <EditLabel>Waiting Fee</EditLabel>
                        <EditTextInput value={(editForm as any).waitingFee || ""} onChange={(v) => set("waitingFee" as any, v)} placeholder="0.00" />
                      </div>
                      <div>
                        <EditLabel>SOA Number</EditLabel>
                        <EditTextInput value={editForm.truckingSoa} onChange={(v) => set("truckingSoa", v)} placeholder="Enter SOA number" />
                      </div>
                      <div>
                        <EditLabel>Loading Date</EditLabel>
                        <NeuronDatePicker value={(editForm as any).loadingDate || ""} onChange={(v: string) => set("loadingDate" as any, v)} />
                      </div>
                      <div>
                        <EditLabel>Loading Address</EditLabel>
                        <EditTextInput value={(editForm as any).truckingAddress || ""} onChange={(v) => set("truckingAddress" as any, v)} placeholder="Enter loading address" />
                      </div>
                      <div>
                        <EditLabel>Status</EditLabel>
                        <EditTextInput value={(editForm as any).truckingStatus || ""} onChange={(v) => set("truckingStatus" as any, v)} placeholder="Enter status" />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div>
                        <div style={LABEL_STYLE}>Trucking</div>
                        <div style={{
                          ...VALUE_BOX,
                          background: (() => {
                            const vi = TRUCKING_VENDORS.find((v) => v.name === r.truckingVendor);
                            return vi ? hexToRgba(vi.hex, 0.10) : "#F9FAFB";
                          })(),
                        }}>{r.truckingVendor || "—"}</div>
                      </div>
                      <ReadField label="Plate No." value={(r as any).plateNo} />
                      <ReadField label="Contact" value={(r as any).contact} />
                      <ReadField label="Driver/Helper Name" value={(r as any).driverHelperName} />
                      <ReadField label="Rate" value={r.truckingRate} />
                      <ReadField label="Stickers" value={(r as any).stickers} />
                      <ReadField label="Weighing" value={(r as any).weighing} />
                      <ReadField label="Waiting Fee" value={(r as any).waitingFee} />
                      <ReadField label="SOA Number" value={r.truckingSoa} />
                      <ReadField label="Loading Date" value={formatISOToDisplay((r as any).loadingDate || "")} />
                      <ReadField label="Loading Address" value={(r as any).truckingAddress} />
                      <ReadField label="Status" value={(r as any).truckingStatus} />
                    </div>
                  )}
                </InfoCard>
              ) : (
              <>
              {/* ── Delivery Details Card (merged) ── */}
              <InfoCard title="Delivery Details">
                {/* ── Tabs Booking ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Tabs Booking</div>
                {isEditing ? (
                  <EditDateTimeRow
                    dateValue={editForm.tabsBookingDate}
                    timeValue={editForm.tabsBookingTime}
                    onDateChange={(v) => set("tabsBookingDate", v)}
                    onTimeChange={(v) => set("tabsBookingTime", v)}
                    dateLabel="Date"
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <ReadField label="Date" value={formatISOToDisplay(r.tabsBookingDate)} />
                    <ReadField label="Time" value={formatTimeAmPm(r.tabsBookingTime)} />
                  </div>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Warehouse Arrival ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Warehouse Arrival</div>
                {isEditing ? (
                  <EditDateTimeRow
                    dateValue={editForm.warehouseArrivalDate}
                    timeValue={editForm.warehouseArrivalTime}
                    onDateChange={(v) => set("warehouseArrivalDate", v)}
                    onTimeChange={(v) => set("warehouseArrivalTime", v)}
                    dateLabel="Date"
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <ReadField label="Date" value={formatISOToDisplay(r.warehouseArrivalDate)} />
                    <ReadField label="Time" value={formatTimeAmPm(r.warehouseArrivalTime)} />
                  </div>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Delivery Schedule ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Delivery Schedule</div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {editForm.deliveryDrops.map((drop: any, di: number) => (
                      <div
                        key={di}
                        style={{
                          border: "1px solid #E5E9F0",
                          borderRadius: "8px",
                          padding: "20px",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em" }}>Drop {di + 1}</span>
                          {editForm.deliveryDrops.length > 1 && <RemoveBtn onClick={() => removeDrop(di)} />}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                          <div>
                            <EditLabel>DEA Date</EditLabel>
                            <NeuronDatePicker value={drop.deaDate} onChange={(v: string) => updateDrop(di, "deaDate", v)} />
                          </div>
                          <div>
                            <EditLabel>Delivery Schedule Date</EditLabel>
                            <NeuronDatePicker value={drop.deliveryScheduleDate} onChange={(v: string) => updateDrop(di, "deliveryScheduleDate", v)} />
                          </div>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                          <EditLabel>Unloading Time</EditLabel>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ flex: 1 }}>
                              <NeuronTimePicker value={drop.deliveryScheduleTime} onChange={(v: string) => updateDrop(di, "deliveryScheduleTime", v)} />
                            </div>
                            {drop.unloadingEnd ? (
                              <>
                                <span style={{ fontSize: "14px", fontWeight: 500, color: "#667085" }}>to</span>
                                <div style={{ flex: 1 }}>
                                  <NeuronTimePicker value={drop.unloadingEnd} onChange={(v: string) => updateDrop(di, "unloadingEnd", v)} />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateDrop(di, "unloadingEnd", "")}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}
                                >
                                  <X size={15} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateDrop(di, "unloadingEnd", drop.deliveryScheduleTime || "00:00")}
                                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "#0F766E", padding: 0 }}
                              >
                                <Plus size={14} />
                                Add end time
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                          <EditLabel>Parking</EditLabel>
                          <EditTextInput value={drop.parking} onChange={(v) => updateDrop(di, "parking", v)} />
                        </div>

                        <div>
                          <EditLabel>Additional Note</EditLabel>
                          <EditTextArea value={drop.additionalNote} onChange={(v) => updateDrop(di, "additionalNote", v)} placeholder="Enter any additional notes..." />
                        </div>
                      </div>
                    ))}
                    <AddLink onClick={addDrop}>Add Drop</AddLink>
                  </div>
                ) : (
                  <>
                    {r.deliveryDrops?.length > 0 ? r.deliveryDrops.map((drop: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          border: "1px solid #E5E9F0",
                          borderRadius: "8px",
                          padding: "20px",
                          marginBottom: i < r.deliveryDrops.length - 1 ? "16px" : "0",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em", margin: "0 0 16px" }}>Drop {i + 1}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                          <ReadField label="DEA Date" value={formatDateTime(drop.deaDate, "")} />
                          <ReadField label="Delivery Schedule Date" value={formatDateTime(drop.deliveryScheduleDate, "")} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                          <ReadField
                            label="Unloading Time"
                            value={
                              drop.deliveryScheduleTime
                                ? drop.unloadingEnd
                                  ? `${formatTimeAmPm(drop.deliveryScheduleTime)} – ${formatTimeAmPm(drop.unloadingEnd)}`
                                  : formatTimeAmPm(drop.deliveryScheduleTime)
                                : "—"
                            }
                          />
                          <ReadField label="Parking" value={drop.parking} />
                        </div>
                        {drop.additionalNote && (
                          <div style={{ marginTop: "16px" }}>
                            <ReadField label="Additional Note" value={drop.additionalNote} />
                          </div>
                        )}
                      </div>
                    )) : (
                      <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No delivery drops</span>
                    )}
                  </>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Delivery Address ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Delivery Address</div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {editForm.deliveryAddresses.map((addr: any, ai: number) => (
                      <div
                        key={ai}
                        style={{
                          border: "1px solid #E5E9F0",
                          borderRadius: "8px",
                          padding: "20px",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em" }}>Address {ai + 1}</span>
                          {editForm.deliveryAddresses.length > 1 && <RemoveBtn onClick={() => removeAddress(ai)} />}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }}>
                          <div>
                            <EditLabel>Street Address</EditLabel>
                            <EditTextInput value={addr.address} onChange={(v) => updateAddress(ai, "address", v)} placeholder="Full address" />
                          </div>
                          <div>
                            <EditLabel>Postal Code</EditLabel>
                            <EditTextInput value={addr.postalCode} onChange={(v) => updateAddress(ai, "postalCode", v)} placeholder="Postal code" />
                          </div>
                        </div>

                        {addr.recipients?.map((rec: any, ri: number) => (
                          <div
                            key={ri}
                            style={{
                              border: "1px solid #F0F0F0",
                              borderRadius: "8px",
                              padding: "16px",
                              marginBottom: "12px",
                              backgroundColor: "#FFFFFF",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.06em" }}>Recipient {ri + 1}</span>
                              {addr.recipients.length > 1 && <RemoveBtn onClick={() => removeRecipient(ai, ri)} />}
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                              <EditLabel>Recipient Name</EditLabel>
                              <EditTextInput value={rec.name} onChange={(v) => updateRecipient(ai, ri, "name", v)} placeholder="Full name" />
                            </div>
                            {rec.contacts?.map((contact: string, ci: number) => (
                              <div key={ci} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ flex: 1 }}>
                                  <EditLabel>Contact {ci + 1}</EditLabel>
                                  <EditTextInput value={contact} onChange={(v) => updateContact(ai, ri, ci, v)} placeholder="Mobile number" />
                                </div>
                                {rec.contacts.length > 1 && <div style={{ paddingTop: "20px" }}><RemoveBtn onClick={() => removeContact(ai, ri, ci)} /></div>}
                              </div>
                            ))}
                            <AddLink onClick={() => addContact(ai, ri)}>Add contact number</AddLink>
                          </div>
                        ))}
                        <AddLink onClick={() => addRecipient(ai)}>Add Recipient</AddLink>

                        <div style={{ marginTop: "16px" }}>
                          <EditLabel>Additional Note</EditLabel>
                          <EditTextArea value={addr.additionalNote || ""} onChange={(v) => updateAddress(ai, "additionalNote", v)} placeholder="Enter any additional notes..." />
                        </div>
                      </div>
                    ))}
                    <AddLink onClick={addAddress}>Add Address</AddLink>
                  </div>
                ) : (
                  <>
                    {r.deliveryAddresses?.length > 0 ? r.deliveryAddresses.map((addr: any, ai: number) => (
                      <div
                        key={ai}
                        style={{
                          border: "1px solid #E5E9F0",
                          borderRadius: "8px",
                          padding: "20px",
                          marginBottom: ai < r.deliveryAddresses.length - 1 ? "16px" : "0",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em", margin: "0 0 16px" }}>Address {ai + 1}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "16px" }}>
                          <ReadField label="Street Address" value={addr.address} />
                          <ReadField label="Postal Code" value={addr.postalCode} />
                        </div>
                        {addr.recipients?.map((rec: any, ri: number) => (
                          <div key={ri} style={{
                            marginBottom: ri < addr.recipients.length - 1 ? "12px" : "0",
                            padding: "16px",
                            border: "1px solid #F0F0F0",
                            borderRadius: "8px",
                            backgroundColor: "#FFFFFF",
                          }}>
                            <div style={{ marginBottom: "12px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase" as const, color: "#667085", letterSpacing: "0.06em" }}>Recipient {ri + 1}</span>
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                              <ReadField label="Recipient Name" value={rec.name} />
                            </div>
                            {rec.contacts?.map((c: string, ci: number) => (
                              <div key={ci} style={{ marginBottom: ci < rec.contacts.length - 1 ? "8px" : "0" }}>
                                <ReadField label={`Contact ${ci + 1}`} value={c} />
                              </div>
                            ))}
                          </div>
                        ))}
                        {addr.additionalNote && (
                          <div style={{ marginTop: "16px" }}>
                            <ReadField label="Additional Note" value={addr.additionalNote} />
                          </div>
                        )}
                      </div>
                    )) : (
                      <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No delivery addresses</span>
                    )}
                  </>
                )}
              </InfoCard>

              {/* ── Operations & Details Card (merged) ── */}
              <InfoCard title="Operations & Details">
                {/* ── Status ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Status</div>
                {isEditing ? (
                  <>
                    <EditTagSelector selected={editForm.remarks || []} onChange={(tags) => set("remarks", tags)} />

                    {/* Remarks Drops */}
                    <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {remarksDrops.map((rd: any, ri: number) => (
                        <div
                          key={ri}
                          style={{
                            border: "1px solid #E5E9F0",
                            borderRadius: "8px",
                            padding: "20px",
                            backgroundColor: "#FFFFFF",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em" }}>Drop {ri + 1}</span>
                            <RemoveBtn onClick={() => removeRemarksDrop(ri)} />
                          </div>
                          <div style={{ marginBottom: "12px" }}>
                            <EditLabel>Start</EditLabel>
                            <EditDateTimeRow
                              dateValue={rd.startDate}
                              timeValue={rd.startTime}
                              onDateChange={(v) => updateRemarksDrop(ri, "startDate", v)}
                              onTimeChange={(v) => updateRemarksDrop(ri, "startTime", v)}
                            />
                          </div>
                          <div>
                            <EditLabel>Completion</EditLabel>
                            <EditDateTimeRow
                              dateValue={rd.doneDate}
                              timeValue={rd.doneTime}
                              onDateChange={(v) => updateRemarksDrop(ri, "doneDate", v)}
                              onTimeChange={(v) => updateRemarksDrop(ri, "doneTime", v)}
                            />
                          </div>
                        </div>
                      ))}
                      <AddLink onClick={addRemarksDrop}>Add Drop</AddLink>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {sortedTags.length === 0 ? (
                        <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No tags selected</span>
                      ) : sortedTags.map((key) => {
                        const tag = OPERATIONAL_TRUCKING_TAGS.find((t) => t.key === key);
                        return (
                          <span
                            key={key}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 12px",
                              borderRadius: "8px",
                              fontSize: "13px",
                              fontWeight: 600,
                              backgroundColor: "#E8F5F3",
                              color: "#0A1D4D",
                              border: "1px solid #C1D9CC",
                            }}
                          >
                            {tag?.label || key}
                          </span>
                        );
                      })}
                    </div>
                    {/* Read-only Drops */}
                    {(r.remarksDrops || []).length > 0 && (
                      <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        {(r.remarksDrops as any[] || []).map((rd: any, ri: number) => (
                          <div
                            key={ri}
                            style={{
                              border: "1px solid #E5E9F0",
                              borderRadius: "8px",
                              padding: "20px",
                              backgroundColor: "#FFFFFF",
                            }}
                          >
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em", margin: "0 0 16px" }}>Drop {ri + 1}</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                              <ReadField label="Start" value={formatDateTime(rd.startDate, rd.startTime)} />
                              <ReadField label="Completion" value={formatDateTime(rd.doneDate, rd.doneTime)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Rate, Vendor & People ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Rate, Vendor & People</div>
                {isEditing ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div>
                      <EditLabel>Trucking Rate (₱)</EditLabel>
                      <EditTextInput value={editForm.truckingRate} onChange={(v) => set("truckingRate", v)} placeholder="0.00" />
                    </div>
                    <div>
                      <EditLabel>Trucking Vendor</EditLabel>
                      <EditVendorDropdown value={editForm.truckingVendor} onChange={(v) => set("truckingVendor", v)} />
                    </div>
                    <div>
                      <EditLabel>Trucking – SOA Number</EditLabel>
                      <EditTextInput value={editForm.truckingSoa} onChange={(v) => set("truckingSoa", v)} placeholder="Enter SOA number" />
                    </div>
                    <div>
                      <EditLabel>Dispatcher</EditLabel>
                      <EditNeuronDropdown value={editForm.dispatcher} options={DISPATCHER_LIST} onChange={(v) => set("dispatcher", v)} placeholder="Select dispatcher..." />
                    </div>
                    <div>
                      <EditLabel>Gatepass</EditLabel>
                      <EditNeuronDropdown value={editForm.gatepass} options={GATEPASS_LIST} onChange={(v) => set("gatepass", v)} placeholder="Select gatepass..." />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <ReadField label="Trucking Rate (₱)" value={r.truckingRate} />
                    <div>
                      <div style={LABEL_STYLE}>Trucking Vendor</div>
                      <div style={{
                        ...VALUE_BOX,
                        background: (() => {
                          const vi = TRUCKING_VENDORS.find((v) => v.name === r.truckingVendor);
                          return vi ? hexToRgba(vi.hex, 0.10) : "#F9FAFB";
                        })(),
                      }}>{r.truckingVendor || "—"}</div>
                    </div>
                    <ReadField label="Trucking – SOA" value={r.truckingSoa} />
                    <ReadField label="Dispatcher" value={r.dispatcher} />
                    <ReadField label="Gatepass" value={r.gatepass} />
                  </div>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Storage & Demurrage Validity ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Storage & Demurrage Validity</div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <EditDateTimeRow
                      dateValue={editForm.storageBeginDate}
                      timeValue={editForm.storageBeginTime}
                      onDateChange={(v) => set("storageBeginDate", v)}
                      onTimeChange={(v) => set("storageBeginTime", v)}
                      dateLabel="Storage Begin"
                    />
                    <EditDateTimeRow
                      dateValue={editForm.storagePaymentDate}
                      timeValue={editForm.storagePaymentTime}
                      onDateChange={(v) => set("storagePaymentDate", v)}
                      onTimeChange={(v) => set("storagePaymentTime", v)}
                      dateLabel="Storage Payment"
                    />
                    <EditDateTimeRow
                      dateValue={editForm.demurrageBeginDate}
                      timeValue={editForm.demurrageBeginTime}
                      onDateChange={(v) => set("demurrageBeginDate", v)}
                      onTimeChange={(v) => set("demurrageBeginTime", v)}
                      dateLabel="Demurrage Begin"
                    />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                    <ReadField label="Storage Begin" value={formatDateTime(r.storageBeginDate, r.storageBeginTime)} />
                    <ReadField label="Storage Payment" value={formatDateTime(r.storagePaymentDate, r.storagePaymentTime)} />
                    <ReadField label="Demurrage Begin" value={formatDateTime(r.demurrageBeginDate, r.demurrageBeginTime)} />
                  </div>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Empty Return ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Empty Return</div>
                {isEditing ? (
                  <>
                    <div style={{ marginBottom: "20px", maxWidth: "320px" }}>
                      <EditLabel>Destination</EditLabel>
                      <EditNeuronDropdown value={editForm.emptyReturn} options={EMPTY_RETURN_OPTIONS} onChange={(v) => set("emptyReturn", v)} placeholder="Select destination..." />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {editForm.emptyReturnLocations?.map((loc: any, li: number) => (
                        <div
                          key={li}
                          style={{
                            border: "1px solid #E5E9F0",
                            borderRadius: "8px",
                            padding: "20px",
                            backgroundColor: "#FFFFFF",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em" }}>Location {li + 1}</span>
                            <RemoveBtn onClick={() => removeLocation(li)} />
                          </div>
                          <div style={{ marginBottom: "12px" }}>
                            <EditLabel>Location</EditLabel>
                            <EditTextInput value={loc.location} onChange={(v) => updateLocation(li, "location", v)} placeholder="Location name" />
                          </div>
                          <div style={{ marginBottom: "12px" }}>
                            <EditLabel>Start</EditLabel>
                            <EditDateTimeRow
                              dateValue={loc.startDate}
                              timeValue={loc.startTime}
                              onDateChange={(v) => updateLocation(li, "startDate", v)}
                              onTimeChange={(v) => updateLocation(li, "startTime", v)}
                            />
                          </div>
                          {loc.showEnd ? (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                <EditLabel>End</EditLabel>
                                <button
                                  type="button"
                                  onClick={() => toggleLocationShowEnd(li, false)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}
                                >
                                  <X size={15} />
                                </button>
                              </div>
                              <EditDateTimeRow
                                dateValue={loc.endDate}
                                timeValue={loc.endTime}
                                onDateChange={(v) => updateLocation(li, "endDate", v)}
                                onTimeChange={(v) => updateLocation(li, "endTime", v)}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleLocationShowEnd(li, true)}
                              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "#0F766E", padding: 0 }}
                            >
                              <Plus size={14} />
                              Add end time
                            </button>
                          )}
                        </div>
                      ))}
                      <AddLink onClick={addLocation}>Add Location</AddLink>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: r.emptyReturnLocations?.length ? "20px" : "0" }}>
                      <ReadField label="Empty Return Destination" value={r.emptyReturn} />
                    </div>
                    {r.emptyReturnLocations?.map((loc: any, li: number) => (
                      <div
                        key={li}
                        style={{
                          border: "1px solid #E5E9F0",
                          borderRadius: "8px",
                          padding: "20px",
                          marginBottom: li < r.emptyReturnLocations.length - 1 ? "16px" : "0",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em", margin: "0 0 16px" }}>Location {li + 1}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                          <ReadField label="Location" value={loc.location} />
                          <ReadField label="Start" value={formatDateTime(loc.startDate, loc.startTime)} />
                          <ReadField label="End" value={formatDateTime(loc.endDate, loc.endTime)} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Other Details ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Other Details</div>
                {isEditing ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                      <div>
                        <EditLabel>Other Fees</EditLabel>
                        <EditTextInput value={editForm.otherFees} onChange={(v) => set("otherFees", v)} placeholder="Describe other fees" />
                      </div>
                      <div>
                        <EditLabel>Container Damage</EditLabel>
                        <EditTextInput value={editForm.containerDamage} onChange={(v) => set("containerDamage", v)} placeholder="Describe any damage" />
                      </div>
                      <div>
                        <EditLabel>DO Date</EditLabel>
                        <NeuronDatePicker value={editForm.doDate} onChange={(v: string) => set("doDate", v)} />
                      </div>
                      <div>
                        <EditLabel>Padlock Date</EditLabel>
                        <NeuronDatePicker value={editForm.padlockDate} onChange={(v: string) => set("padlockDate", v)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <ReadField label="Other Fees" value={r.otherFees} />
                      <ReadField label="Container Damage" value={r.containerDamage} />
                      <ReadField label="DO Date" value={formatISOToDisplay(r.doDate)} />
                      <ReadField label="Padlock Date" value={formatISOToDisplay(r.padlockDate)} />
                    </div>
                  </>
                )}
              </InfoCard>
              </>
              )}

          </div>

          {/* Notes Section */}
          <NotesSection
            value={isEditing ? (editForm.notes || "") : (r.notes || "")}
            onChange={(val) => set("notes", val)}
            disabled={!isEditing}
          />

        </div>
        )}

        {!embedded && activeTab === "attachments" && (
          <AttachmentsTab
            entityType="trucking-record"
            entityId={currentRecord.id}
          />
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "420px",
            width: "90%",
            border: "1px solid #E5E9F0",
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 12px" }}>
              Delete Trucking Record
            </h3>
            <p style={{ fontSize: "14px", color: "#667085", margin: "0 0 24px", lineHeight: "1.5" }}>
              Are you sure you want to delete this trucking record? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <StandardButton variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </StandardButton>
              <button
                onClick={handleDelete}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "8px",
                  background: "#EF4444",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discard Changes Confirmation Modal ── */}
      {showDiscardConfirm && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "420px",
            width: "90%",
            border: "1px solid #E5E9F0",
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 12px" }}>
              Discard Changes?
            </h3>
            <p style={{ fontSize: "14px", color: "#667085", margin: "0 0 24px", lineHeight: "1.5" }}>
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <StandardButton variant="secondary" onClick={() => setShowDiscardConfirm(false)}>
                Keep Editing
              </StandardButton>
              <button
                onClick={confirmDiscard}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "8px",
                  background: "#EF4444",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
