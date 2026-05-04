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
import { ArrowLeft, Truck, Save, X, ChevronDown, Check, Search, Plus, Trash2, Link2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import type { TruckingRecord } from "./CreateTruckingModal";
import { StandardButton } from "../design-system";
import { StandardTabs } from "../design-system/StandardTabs";
import { BookingSelector } from "../selectors/BookingSelector";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { PortalDropdown } from "../shared/PortalDropdown";
import { NotesSection } from "../shared/NotesSection";
import { HeaderStatusDropdown } from "../shared/HeaderStatusDropdown";
import { TabRowActions } from "../shared/TabRowActions";
import { TagHistoryTimeline } from "../shared/TagHistoryTimeline";
import { StatusTagBar } from "../shared/StatusTagBar";
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
import { getOperationalTags, getTagByKey } from "../../utils/statusTags";
import { formatDateTime } from "./shared/DateTimeInput";
import { API_BASE_URL } from '@/utils/api-config';
import {
  TRUCKING_STATUS_OPTIONS,
  DEFAULT_TRUCKING_STATUS,
  TRUCKING_STATUS_COLORS,
  DROP_CYCLE_STATUSES,
  getTruckingStatusOptions,
  getTruckingStatusColors,
  getDefaultTruckingStatus,
} from "../../constants/truckingStatuses";
import { ShipmentMilestonesTab } from "./shared/ShipmentMilestonesTab";
import type { ShipmentEvent } from "../../types/operations";

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
  /** When provided, edit mode is controlled externally (from parent's tab row). */
  externalEdit?: boolean;
  /** Called when edit state changes internally (cancel/save). */
  onEditStateChange?: (editing: boolean) => void;
  /** Increment to trigger save from parent. */
  externalSaveCounter?: number;
  /** Pre-loaded shipment tags from parent — avoids fetch delay on open. */
  initialShipmentTags?: string[];
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
  borderRadius: "6px",
};

/** Compact label-value for booking-derived summary card */
const SUMMARY_LABEL: React.CSSProperties = {
  fontSize: "12px",
  color: "#667085",
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
  if (!v) return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, backgroundColor: "#F3F4F6", border: "1px solid #E5E9F0", color: "#667085", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{vendor || "—"}</span>;
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
        borderRadius: "6px",
        border: "1px solid #E5E9F0",
        fontSize: "14px",
        color: disabled ? "#9CA3AF" : "#0A1D4D",
        outline: "none",
        backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
        boxSizing: "border-box",
        transition: "border-color 0.15s ease",
      }}
      onFocus={(e) => { if (!disabled) e.currentTarget.style.borderColor = "#0F766E"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const vendor = TRUCKING_VENDORS.find((v) => v.name === value);

  useEffect(() => { if (!open) setSearch(""); }, [open]);

  const filtered = TRUCKING_VENDORS.filter(
    (v) => !search || v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px",
          border: "1px solid #E5E9F0", fontSize: "14px", display: "flex",
          alignItems: "center", justifyContent: "space-between", cursor: "pointer",
          backgroundColor: "#FFFFFF", gap: "8px",
        }}
      >
        {vendor ? (
          <span
            style={{
              display: "inline-flex", alignItems: "center", padding: "2px 8px",
              borderRadius: "4px", fontSize: "12px",
              backgroundColor: hexToRgba(vendor.hex, 0.14),
              color: vendor.hex,
              border: `1px solid ${hexToRgba(vendor.hex, 0.4)}`,
            }}
          >
            {vendor.name}
          </span>
        ) : (
          <span style={{ color: "#9CA3AF" }}>Select vendor...</span>
        )}
        <ChevronDown
          size={16}
          style={{ color: "#9CA3AF", flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        />
      </div>

      <PortalDropdown isOpen={open} onClose={() => setOpen(false)} triggerRef={triggerRef} align="left">
        <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <input
            autoFocus type="text" placeholder="Search vendors..." value={search}
            onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", padding: "8px 12px", fontSize: "13px", border: "1px solid #E5E9F0",
              borderRadius: "6px", outline: "none", color: "#12332B", backgroundColor: "#F9FAFB", boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#237F66"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
          />
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>No vendors found</div>
        )}
        {filtered.map((v, idx) => {
          const selected = value === v.name;
          const isLast = idx === filtered.length - 1;
          return (
            <div
              key={v.name}
              onClick={() => { onChange(v.name); setOpen(false); }}
              style={{
                padding: "10px 12px", cursor: "pointer", fontSize: "14px", color: "#12332B",
                display: "flex", alignItems: "center", gap: "10px",
                backgroundColor: selected ? "#E8F2EE" : "transparent",
                borderBottom: isLast ? "none" : "1px solid #E5E9F0",
                userSelect: "none",
              }}
              onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? "#E8F2EE" : "transparent"; }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: v.hex, flexShrink: 0, display: "inline-block" }} />
              <span style={{ flex: 1 }}>{v.name}</span>
              {selected && <Check size={14} style={{ color: "#237F66", flexShrink: 0 }} />}
            </div>
          );
        })}
      </PortalDropdown>
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
                  <div style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.05em" }}>
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
  externalEdit,
  onEditStateChange,
  externalSaveCounter,
  initialShipmentTags,
}: TruckingRecordDetailsProps) {
  const [activeTab, setActiveTab] = useState<"trucking-info" | "attachments">("trucking-info");
  const [showActivity, setShowActivity] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TruckingRecord>(normalizeRecord(record) as TruckingRecord);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkedShipmentTags, setLinkedShipmentTags] = useState<string[]>(
    initialShipmentTags ?? ((record as any).linkedBookingShipmentTags || []) as string[],
  );
  const [linkedShipmentEvents, setLinkedShipmentEvents] = useState<ShipmentEvent[]>(
    ((record as any).linkedBookingShipmentEvents || []) as ShipmentEvent[],
  );
  const [linkedTagHistory, setLinkedTagHistory] = useState<TagHistoryEntry[]>(
    ((record as any).linkedBookingTagHistory || []) as TagHistoryEntry[],
  );
  const [isShipmentTagsSaving, setIsShipmentTagsSaving] = useState(false);

  // ── Inline edit state ──
  const [isEditing, setIsEditingInternal] = useState(false);

  const setIsEditing = (editing: boolean) => {
    setIsEditingInternal(editing);
    onEditStateChange?.(editing);
  };

  // React to external edit requests
  useEffect(() => {
    if (externalEdit !== undefined) {
      setIsEditingInternal(externalEdit);
      onEditStateChange?.(externalEdit);
      if (externalEdit) {
        setEditForm({ ...currentRecord });
      }
    }
  }, [externalEdit]);

  // React to external save requests
  useEffect(() => {
    if (externalSaveCounter && externalSaveCounter > 0 && isEditing) {
      handleSave();
    }
  }, [externalSaveCounter]);

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
    setLinkedShipmentTags(initialShipmentTags ?? ((record as any).linkedBookingShipmentTags || []) as string[]);
    setLinkedShipmentEvents(((record as any).linkedBookingShipmentEvents || []) as ShipmentEvent[]);
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
        setLinkedShipmentEvents((b.shipmentEvents || []) as ShipmentEvent[]);
        setLinkedTagHistory(Array.isArray((b as any).tagHistory) ? (b as any).tagHistory : []);
        
        if (autoFill) {
          const blVal = b.blNumber || b.bl_number || b.awbBlNo || b.awb_bl_no || b.billOfLading || "";
          const commodityVal = b.commodityItems || b.commodity_items || b.commodity || b.commodityDescription || b.commodity_description || "";
          const shippingVal = b.shippingLine || b.shipping_line || b.carrier || "";
          const vesselVal = b.vesselVoyage || b.vessel_voyage || b.vessel || b.vesselName || b.vessel_name || "";
          const loadingAddrVal = b.loadingAddress || b.loading_address || "";
          const loadingDateVal = b.loadingSchedule || b.loading_schedule || "";

          // Container is managed via ContainerSelector now — not auto-filled here

          setEditForm((prev: any) => ({
            ...prev,
            blNumber: blVal || prev.blNumber,
            commodityItems: commodityVal || prev.commodityItems,
            shippingLine: shippingVal || prev.shippingLine,
            vesselVoyage: vesselVal || prev.vesselVoyage,
            truckingAddress: loadingAddrVal || prev.truckingAddress,
            loadingDate: loadingDateVal || prev.loadingDate,
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

  // ── Drop-cycle helpers ──
  const totalDrops = currentRecord.deliveryDrops?.length || 1;
  const currentDrop: number = currentRecord.currentDrop || 1;

  const isDropStatus = (s: string) => (DROP_CYCLE_STATUSES as readonly string[]).includes(s);

  /** Build display label for drop-cycle statuses, e.g. "In Transit - Drop 1 of 3" */
  const truckingDisplayLabel = isDropStatus(currentRecord.truckingStatus || "")
    ? `${currentRecord.truckingStatus} - Drop ${currentDrop} of ${totalDrops}`
    : undefined;

  // ── Trucking status update (independent dropdown, persists immediately) ──
  const handleTruckingStatusChange = useCallback(
    async (newStatus: string) => {
      const prevRecord = { ...currentRecord };

      // Compute the next currentDrop value
      let nextDrop = currentRecord.currentDrop || 1;
      const prevStatus = currentRecord.truckingStatus || "";

      if (newStatus === "In Transit") {
        // If previous status was "Unloading End", advance to next drop
        if (prevStatus === "Unloading End") {
          nextDrop = Math.min((currentRecord.currentDrop || 1) + 1, totalDrops);
        } else if (!isDropStatus(prevStatus)) {
          // Entering drop cycle for the first time — start at drop 1
          nextDrop = 1;
        }
      }

      setCurrentRecord((prev) => ({ ...prev, truckingStatus: newStatus, currentDrop: nextDrop }));
      if (isEditing) {
        setEditForm((prev) => ({ ...prev, truckingStatus: newStatus, currentDrop: nextDrop }));
      }

      try {
        const payload = { ...currentRecord, truckingStatus: newStatus, currentDrop: nextDrop, updatedAt: new Date().toISOString() };
        const res = await fetch(`${API_BASE_URL}/trucking-records/${currentRecord.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          setCurrentRecord(result.data);
          if (isEditing) {
            setEditForm((prev) => ({ ...prev, truckingStatus: result.data.truckingStatus, currentDrop: result.data.currentDrop }));
          }
          onUpdate();
        } else {
          setCurrentRecord(prevRecord);
          toast.error(`Failed to update status: ${result.error || "Unknown error"}`);
        }
      } catch (err) {
        console.error("Error updating trucking status:", err);
        setCurrentRecord(prevRecord);
        toast.error("Unable to update status");
      }
    },
    [currentRecord, isEditing, onUpdate, totalDrops],
  );

  const pendingLinkedTagsRef = useRef<string[]>(linkedShipmentTags);
  const linkedTagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkedTagSaveBaseRef = useRef<string[]>(linkedShipmentTags);

  const handleLinkedShipmentTagsChange = useCallback(
    (newTags: string[]) => {
      if (!currentRecord.linkedBookingId) {
        toast.error("No linked booking to update");
        return;
      }
      pendingLinkedTagsRef.current = newTags;
      setLinkedShipmentTags(newTags);
      const revertTags = linkedTagSaveBaseRef.current;
      const revertHistory = linkedTagHistory;
      if (linkedTagDebounceRef.current) clearTimeout(linkedTagDebounceRef.current);
      linkedTagDebounceRef.current = setTimeout(async () => {
        setIsShipmentTagsSaving(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/trucking-records/${currentRecord.id}/update-booking-tags`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
              body: JSON.stringify({ shipmentTags: pendingLinkedTagsRef.current, user: currentUser?.name || "Unknown" }),
            },
          );
          const result = await response.json();
          if (result.success) {
            const saved = (result.data?.shipmentTags || []) as string[];
            setLinkedShipmentTags(saved);
            linkedTagSaveBaseRef.current = saved;
            pendingLinkedTagsRef.current = saved;
            setLinkedTagHistory((result.data?.tagHistory || []) as TagHistoryEntry[]);
            onUpdate();
            onBookingTagsUpdated?.();
          } else {
            setLinkedShipmentTags(revertTags);
            pendingLinkedTagsRef.current = revertTags;
            setLinkedTagHistory(revertHistory);
            toast.error(`Failed to update shipment tags: ${result.error || "Unknown error"}`);
          }
        } catch (error) {
          console.error("Error updating linked shipment tags:", error);
          setLinkedShipmentTags(revertTags);
          pendingLinkedTagsRef.current = revertTags;
          setLinkedTagHistory(revertHistory);
          toast.error("Unable to update shipment tags");
        } finally {
          setIsShipmentTagsSaving(false);
        }
      }, 400);
    },
    [currentRecord.id, currentRecord.linkedBookingId, currentUser?.name, linkedTagHistory, onBookingTagsUpdated, onUpdate],
  );

  const handleSaveLinkedShipmentEvents = useCallback(
    async (events: ShipmentEvent[]) => {
      if (!currentRecord.linkedBookingId) {
        toast.error("No linked booking to update");
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/trucking-records/${currentRecord.id}/update-booking-events`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              shipmentEvents: events,
              user: currentUser?.name || "Unknown",
            }),
          },
        );
        const result = await response.json();
        if (result.success) {
          setLinkedShipmentEvents(result.data.shipmentEvents || []);
          toast.success("Shipment milestones saved");
          onUpdate();
        } else {
          toast.error(`Failed to save: ${result.error || "Unknown error"}`);
        }
      } catch (err) {
        console.error("Error saving shipment events:", err);
        toast.error("Unable to save shipment milestones");
      }
    },
    [currentRecord.id, currentRecord.linkedBookingId, currentUser?.name, onUpdate],
  );

  // Warehouse arrival helpers
  const warehouseArrivals = editForm.warehouseArrivals?.length ? editForm.warehouseArrivals : [{ date: editForm.warehouseArrivalDate || "", time: editForm.warehouseArrivalTime || "" }];
  const updateWarehouseArrival = (i: number, key: string, val: string) =>
    set("warehouseArrivals" as any, warehouseArrivals.map((w: any, idx: number) => idx === i ? { ...w, [key]: val } : w) as any);
  const removeWarehouseArrival = (i: number) =>
    set("warehouseArrivals" as any, warehouseArrivals.filter((_: any, idx: number) => idx !== i) as any);

  // Sync: adding a drop adds to ALL multi-drop sections simultaneously
  const addSyncedDrop = () => {
    setEditForm((prev: any) => {
      const wa = prev.warehouseArrivals?.length ? prev.warehouseArrivals : [{ date: prev.warehouseArrivalDate || "", time: prev.warehouseArrivalTime || "" }];
      const target = Math.max(wa.length, prev.deliveryDrops.length, prev.deliveryAddresses.length, (prev.remarksDrops || []).length) + 1;
      const pad = <T,>(arr: T[], make: () => T): T[] => {
        const result = [...arr];
        while (result.length < target) result.push(make());
        return result;
      };
      return {
        ...prev,
        warehouseArrivals: pad(wa, () => ({ date: "", time: "" })),
        deliveryDrops: pad(prev.deliveryDrops, () => ({ deaDate: "", deliveryScheduleDate: "", deliveryScheduleTime: "", unloadingStart: "", unloadingEnd: "", parking: "Availability depends on time of arrival.", instructions: [{ text: "" }], additionalNote: "" })),
        deliveryAddresses: pad(prev.deliveryAddresses, () => ({ address: "", postalCode: "", recipients: [{ name: "", contacts: [""] }], additionalNote: "" })),
        remarksDrops: pad(prev.remarksDrops || [], () => ({ startDate: "", startTime: "", doneDate: "", doneTime: "" })),
      };
    });
  };

  // Drop helpers
  const addDrop = () => addSyncedDrop();
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
  const addAddress = () => addSyncedDrop();
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
      const wa = editForm.warehouseArrivals?.length ? editForm.warehouseArrivals : [{ date: editForm.warehouseArrivalDate || "", time: editForm.warehouseArrivalTime || "" }];
      const payload = {
        ...editForm,
        warehouseArrivals: wa,
        warehouseArrivalDate: wa[0]?.date || editForm.warehouseArrivalDate,
        warehouseArrivalTime: wa[0]?.time || editForm.warehouseArrivalTime,
        updatedAt: new Date().toISOString(),
      };
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
              {isEditing ? (() => {
                const raw = editForm.truckingRefNo || "";
                const m = raw.match(/^(TRK)\s*(\d{4})-(\d*)$/);
                const prefixText = "TRK";
                const yearPart = m ? m[2] : String(new Date().getFullYear());
                const num = m ? m[3] : "";
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                    <span style={{ fontSize: "14px", color: "#667085", fontWeight: 500, marginRight: "8px" }}>Ref:</span>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "8px", alignItems: "end" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Prefix</span>
                        <div style={{ height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", display: "flex", alignItems: "center", color: "#12332B", backgroundColor: "#F9FAFB" }}>TRK</div>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Year</span>
                        <input value={yearPart} onChange={e => { const y = e.target.value.replace(/\D/g, ""); setEditForm({ ...editForm, truckingRefNo: `TRK ${y}-${num}` }); }} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none" }} />
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Number</span>
                        <input value={num} onChange={e => { const n = e.target.value.replace(/\D/g, ""); setEditForm({ ...editForm, truckingRefNo: `TRK ${yearPart}-${n}` }); }} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none" }} />
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <h1 style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#0A1D4D",
                  marginBottom: "0",
                  margin: 0,
                }}>
                  {currentRecord.truckingRefNo || currentRecord.id}
                </h1>
              )}
              {isEditing && (
                <p style={{ fontSize: "13px", color: "#667085", margin: "2px 0 0" }}>
                  Make changes below, then save
                </p>
              )}
            </div>
          </div>

          {/* Right: two status boxes */}
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
            {/* Shipment Status — synced with linked booking, editable. Hidden for linked export bookings. */}
            {currentRecord.linkedBookingId ? (
              !isExportBooking && (
                <StatusTagBar
                  bookingType="trucking"
                  shipmentTags={linkedShipmentTags}
                  operationalTags={[]}
                  onShipmentTagsChange={handleLinkedShipmentTagsChange}
                  onOperationalTagsChange={() => {}}
                />
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.05em" }}>
                  Shipment Status
                </span>
                <span style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>No linked booking</span>
              </div>
            )}

            {/* Trucking Status — independent dropdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.05em" }}>
                Trucking Status
              </span>
              <HeaderStatusDropdown
                currentStatus={currentRecord.truckingStatus || getDefaultTruckingStatus(currentRecord.linkedBookingType)}
                displayLabel={truckingDisplayLabel}
                statusOptions={[...getTruckingStatusOptions(currentRecord.linkedBookingType)]}
                statusColorMap={getTruckingStatusColors(currentRecord.linkedBookingType)}
                onStatusChange={handleTruckingStatusChange}
              />
            </div>
          </div>
        </div>
      </div>


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
            actions={
              <TabRowActions
                showTimeline={showActivity}
                onToggleTimeline={() => setShowActivity(!showActivity)}
                editLabel={activeTab === "trucking-info" ? "Edit Trucking" : null}
                onEdit={enterEditMode}
                isEditing={isEditing}
                onCancel={cancelEdit}
                onSave={handleSave}
                isSaving={isSaving}
                saveLabel="Save Changes"
                onDelete={() => setShowDeleteConfirm(true)}
                onDownloadPDF={() => toast.info("PDF download — coming soon")}
                onDownloadWord={() => toast.info("Word download — coming soon")}
              />
            }
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
                <>
                {/* ── Export Card 1: Trucking Information (Rate + Vendor + Driver + Contact + Plate + SOA) ── */}
                <InfoCard title="Trucking Information">
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div>
                          <EditLabel>Rate (₱)</EditLabel>
                          <EditTextInput value={editForm.truckingRate} onChange={(v) => set("truckingRate", v)} placeholder="0.00" />
                        </div>
                        <div>
                          <EditLabel>Trucking Company</EditLabel>
                          <EditVendorDropdown value={editForm.truckingVendor} onChange={(v) => set("truckingVendor", v)} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div>
                          <EditLabel>Driver</EditLabel>
                          <EditTextInput value={(editForm as any).driverHelperName || ""} onChange={(v) => set("driverHelperName" as any, v)} placeholder="Enter driver name" />
                        </div>
                        <div>
                          <EditLabel>Contact</EditLabel>
                          <EditTextInput value={(editForm as any).contact || ""} onChange={(v) => set("contact" as any, v)} placeholder="Enter contact number" />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div>
                          <EditLabel>Plate Number</EditLabel>
                          <EditTextInput value={(editForm as any).plateNo || ""} onChange={(v) => set("plateNo" as any, v)} placeholder="Enter plate number" />
                        </div>
                        <div>
                          <EditLabel>SOA Number</EditLabel>
                          <EditTextInput value={editForm.truckingSoa} onChange={(v) => set("truckingSoa", v)} placeholder="Enter SOA number" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <ReadField label="Rate (₱)" value={r.truckingRate} />
                        <div>
                          <div style={LABEL_STYLE}>Trucking Company</div>
                          <div style={{
                            ...VALUE_BOX,
                            background: (() => {
                              const vi = TRUCKING_VENDORS.find((v) => v.name === r.truckingVendor);
                              return vi ? hexToRgba(vi.hex, 0.10) : "#F9FAFB";
                            })(),
                          }}>{r.truckingVendor || "—"}</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <ReadField label="Driver" value={(r as any).driverHelperName} />
                        <ReadField label="Contact" value={(r as any).contact} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <ReadField label="Plate Number" value={(r as any).plateNo} />
                        <ReadField label="SOA Number" value={r.truckingSoa} />
                      </div>
                    </div>
                  )}
                </InfoCard>

                {/* ── Export Card 2: Tabs Booking ── */}
                <InfoCard title="Tabs Booking">
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
                </InfoCard>

                {/* ── Export Card 3: Loading Schedule ── */}
                <InfoCard title="Loading Schedule">
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {editForm.deliveryDrops.map((drop: any, di: number) => (
                        <div
                          key={di}
                          style={{ border: "1px solid #E5E9F0", borderRadius: "8px", padding: "20px", backgroundColor: "#FFFFFF" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em" }}>Load {di + 1}</span>
                            {editForm.deliveryDrops.length > 1 && <RemoveBtn onClick={() => removeDrop(di)} />}
                          </div>
                          <div style={{ marginBottom: "16px" }}>
                            <EditLabel>Loading Schedule Date</EditLabel>
                            <NeuronDatePicker value={drop.deliveryScheduleDate} onChange={(v: string) => updateDrop(di, "deliveryScheduleDate", v)} />
                          </div>
                          <div style={{ marginBottom: "16px" }}>
                            <EditLabel>Loading Time</EditLabel>
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
                          <div>
                            <EditLabel>Additional Note</EditLabel>
                            <EditTextArea value={drop.additionalNote} onChange={(v) => updateDrop(di, "additionalNote", v)} placeholder="Enter any additional notes..." />
                          </div>
                        </div>
                      ))}
                      <AddLink onClick={addDrop}>Add Load</AddLink>
                    </div>
                  ) : (
                    <>
                      {r.deliveryDrops?.length > 0 ? r.deliveryDrops.map((drop: any, i: number) => (
                        <div
                          key={i}
                          style={{ border: "1px solid #E5E9F0", borderRadius: "8px", padding: "20px", marginBottom: i < r.deliveryDrops.length - 1 ? "16px" : "0", backgroundColor: "#FFFFFF" }}
                        >
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em", margin: "0 0 16px" }}>Load {i + 1}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                            <ReadField label="Loading Schedule Date" value={formatDateTime(drop.deliveryScheduleDate, "")} />
                            <ReadField
                              label="Loading Time"
                              value={drop.deliveryScheduleTime
                                ? drop.unloadingEnd
                                  ? `${formatTimeAmPm(drop.deliveryScheduleTime)} – ${formatTimeAmPm(drop.unloadingEnd)}`
                                  : formatTimeAmPm(drop.deliveryScheduleTime)
                                : "—"}
                            />
                          </div>
                          {drop.additionalNote && (
                            <ReadField label="Additional Note" value={drop.additionalNote} />
                          )}
                        </div>
                      )) : (
                        <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No loading schedule</span>
                      )}
                    </>
                  )}
                </InfoCard>

                {/* ── Export Card 4: Loading Address ── */}
                <InfoCard title="Loading Address">
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {editForm.deliveryAddresses.map((addr: any, ai: number) => (
                        <div
                          key={ai}
                          style={{ border: "1px solid #E5E9F0", borderRadius: "8px", padding: "20px", backgroundColor: "#FFFFFF" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em" }}>Address {ai + 1}</span>
                            {editForm.deliveryAddresses.length > 1 && <RemoveBtn onClick={() => removeAddress(ai)} />}
                          </div>
                          <div style={{ marginBottom: "16px" }}>
                            <EditLabel>Full Address</EditLabel>
                            <EditTextInput value={addr.address} onChange={(v) => updateAddress(ai, "address", v)} placeholder="Full address" />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                            <div>
                              <EditLabel>Contact Person</EditLabel>
                              <EditTextInput
                                value={addr.contactPerson || ""}
                                onChange={(v) => {
                                  const updated = editForm.deliveryAddresses.map((a: any, i: number) => i === ai ? { ...a, contactPerson: v } : a);
                                  set("deliveryAddresses", updated as any);
                                }}
                                placeholder="Full name"
                              />
                            </div>
                            <div>
                              <EditLabel>Contact</EditLabel>
                              <EditTextInput
                                value={addr.contact || ""}
                                onChange={(v) => {
                                  const updated = editForm.deliveryAddresses.map((a: any, i: number) => i === ai ? { ...a, contact: v } : a);
                                  set("deliveryAddresses", updated as any);
                                }}
                                placeholder="Mobile number"
                              />
                            </div>
                          </div>
                          <div>
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
                          style={{ border: "1px solid #E5E9F0", borderRadius: "8px", padding: "20px", marginBottom: ai < r.deliveryAddresses.length - 1 ? "16px" : "0", backgroundColor: "#FFFFFF" }}
                        >
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em", margin: "0 0 16px" }}>Address {ai + 1}</p>
                          <div style={{ marginBottom: "16px" }}>
                            <ReadField label="Full Address" value={addr.address} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                            <ReadField label="Contact Person" value={addr.contactPerson} />
                            <ReadField label="Contact" value={addr.contact} />
                          </div>
                          {addr.additionalNote && (
                            <ReadField label="Additional Note" value={addr.additionalNote} />
                          )}
                        </div>
                      )) : (
                        <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No loading addresses</span>
                      )}
                    </>
                  )}
                </InfoCard>

                {/* ── Export Card 5: Port Arrival ── */}
                <InfoCard title="Port Arrival">
                  {isEditing ? (
                    <EditDateTimeRow
                      dateValue={warehouseArrivals[0]?.date || ""}
                      timeValue={warehouseArrivals[0]?.time || ""}
                      onDateChange={(v: string) => updateWarehouseArrival(0, "date", v)}
                      onTimeChange={(v: string) => updateWarehouseArrival(0, "time", v)}
                      dateLabel="Date"
                    />
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      {(() => {
                        const arrivals = r.warehouseArrivals?.length ? r.warehouseArrivals : [{ date: r.warehouseArrivalDate, time: r.warehouseArrivalTime }];
                        const wa = arrivals[0] || { date: "", time: "" };
                        return (
                          <>
                            <ReadField label="Date" value={formatISOToDisplay(wa.date)} />
                            <ReadField label="Time" value={formatTimeAmPm(wa.time)} />
                          </>
                        );
                      })()}
                    </div>
                  )}
                </InfoCard>

                {/* ── Export Card 6: Additional Info ── */}
                <InfoCard title="Additional Info">
                  {isEditing ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div>
                        <EditLabel>Sticker</EditLabel>
                        <EditTextInput value={(editForm as any).stickers || ""} onChange={(v) => set("stickers" as any, v)} placeholder="Enter sticker details" />
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
                        <EditLabel>Done Inyard</EditLabel>
                        <NeuronDatePicker value={(editForm as any).inyardDate || ""} onChange={(v: string) => set("inyardDate" as any, v)} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <ReadField label="Sticker" value={(r as any).stickers} />
                      <ReadField label="Weighing" value={(r as any).weighing} />
                      <ReadField label="Waiting Fee" value={(r as any).waitingFee} />
                      <ReadField label="Done Inyard" value={(r as any).inyardDate ? formatISOToDisplay((r as any).inyardDate) : "—"} />
                    </div>
                  )}
                </InfoCard>
                </>
              ) : (
              <>
              {/* ── Date field ── */}
              <InfoCard title="Trucking Information">
                {isEditing ? (
                  <div>
                    <EditLabel>Date</EditLabel>
                    <NeuronDatePicker value={editForm.truckingDate || ""} onChange={(v: string) => set("truckingDate", v)} />
                  </div>
                ) : (
                  <ReadField label="Date" value={formatISOToDisplay(r.truckingDate || "")} />
                )}
              </InfoCard>

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
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {warehouseArrivals.map((wa: any, wi: number) => (
                      <div
                        key={wi}
                        style={{ border: "1px solid #E5E9F0", borderRadius: "12px", padding: "20px", backgroundColor: "#FAFAFA" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0A1D4D" }}>Drop {wi + 1}</span>
                          {warehouseArrivals.length > 1 && (
                            <button onClick={() => removeWarehouseArrival(wi)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: "12px", fontWeight: 600 }}>Remove</button>
                          )}
                        </div>
                        <EditDateTimeRow
                          dateValue={wa.date}
                          timeValue={wa.time}
                          onDateChange={(v: string) => updateWarehouseArrival(wi, "date", v)}
                          onTimeChange={(v: string) => updateWarehouseArrival(wi, "time", v)}
                          dateLabel="Date"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addSyncedDrop}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#0F766E", fontSize: "13px", fontWeight: 600, textAlign: "left", padding: "4px 0" }}
                    >
                      + Add Drop
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {(() => {
                      const arrivals = r.warehouseArrivals?.length ? r.warehouseArrivals : [{ date: r.warehouseArrivalDate, time: r.warehouseArrivalTime }];
                      return arrivals.map((wa: any, wi: number) => (
                        <div key={wi}>
                          {arrivals.length > 1 && <div style={{ fontSize: "12px", fontWeight: 700, color: "#0A1D4D", marginBottom: "6px" }}>Drop {wi + 1}</div>}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                            <ReadField label="Date" value={formatISOToDisplay(wa.date)} />
                            <ReadField label="Time" value={formatTimeAmPm(wa.time)} />
                          </div>
                        </div>
                      ));
                    })()}
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
                            <EditLabel>Delivery Schedule Date</EditLabel>
                            <NeuronDatePicker value={drop.deliveryScheduleDate} onChange={(v: string) => updateDrop(di, "deliveryScheduleDate", v)} />
                          </div>
                          <div>
                            <EditLabel>DEA Date</EditLabel>
                            <NeuronDatePicker value={drop.deaDate} onChange={(v: string) => updateDrop(di, "deaDate", v)} />
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
                          <ReadField label="Delivery Schedule Date" value={formatDateTime(drop.deliveryScheduleDate, "")} />
                          <ReadField label="DEA Date" value={formatDateTime(drop.deaDate, "")} />
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
                        <div style={{ marginTop: "16px" }}>
                          <ReadField label="Additional Note" value={drop.additionalNote} />
                        </div>
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

                        <div style={{ marginBottom: "16px" }}>
                          <EditLabel>Full Address</EditLabel>
                          <EditTextInput value={addr.address} onChange={(v) => updateAddress(ai, "address", v)} placeholder="Full address" />
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
                              <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.05em" }}>Recipient {ri + 1}</span>
                              {addr.recipients.length > 1 && <RemoveBtn onClick={() => removeRecipient(ai, ri)} />}
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                              <EditLabel>Recipient Name</EditLabel>
                              <EditTextInput value={rec.name} onChange={(v) => updateRecipient(ai, ri, "name", v)} placeholder="Full name" />
                            </div>
                            <div>
                              <EditLabel>Contact</EditLabel>
                              <EditTextInput value={rec.contacts?.[0] ?? ""} onChange={(v) => updateContact(ai, ri, 0, v)} placeholder="Mobile number" />
                            </div>
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
                        <div style={{ marginBottom: "16px" }}>
                          <ReadField label="Full Address" value={addr.address} />
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
                              <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" as const, color: "#667085", letterSpacing: "0.05em" }}>Recipient {ri + 1}</span>
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
                        <div style={{ marginTop: "16px" }}>
                          <ReadField label="Additional Note" value={addr.additionalNote} />
                        </div>
                      </div>
                    )) : (
                      <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No delivery addresses</span>
                    )}
                  </>
                )}
              </InfoCard>

              {/* ── Operations & Details Card (merged) ── */}
              <InfoCard title="Operations & Details">
                {/* ── Rate and Vendor ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Rate and Vendor</div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div>
                        <EditLabel>Rate (₱)</EditLabel>
                        <EditTextInput value={editForm.truckingRate} onChange={(v) => set("truckingRate", v)} placeholder="0.00" />
                      </div>
                      <div>
                        <EditLabel>Trucking Company</EditLabel>
                        <EditVendorDropdown value={editForm.truckingVendor} onChange={(v) => set("truckingVendor", v)} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div>
                        <EditLabel>SOA Number</EditLabel>
                        <EditTextInput value={editForm.truckingSoa} onChange={(v) => set("truckingSoa", v)} placeholder="Enter SOA number" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <ReadField label="Rate (₱)" value={r.truckingRate} />
                      <div>
                        <div style={LABEL_STYLE}>Trucking Company</div>
                        <div style={{
                          ...VALUE_BOX,
                          background: (() => {
                            const vi = TRUCKING_VENDORS.find((v) => v.name === r.truckingVendor);
                            return vi ? hexToRgba(vi.hex, 0.10) : "#F9FAFB";
                          })(),
                        }}>{r.truckingVendor || "—"}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <ReadField label="SOA Number" value={r.truckingSoa} />
                    </div>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── People ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>People</div>
                {isEditing ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
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
                    <EditDateTimeRow
                      dateValue={editForm.demurragePaymentDate}
                      timeValue={editForm.demurragePaymentTime}
                      onDateChange={(v) => set("demurragePaymentDate", v)}
                      onTimeChange={(v) => set("demurragePaymentTime", v)}
                      dateLabel="Demurrage Payment"
                    />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "24px" }}>
                    <ReadField label="Storage Begin" value={formatDateTime(r.storageBeginDate, r.storageBeginTime)} />
                    <ReadField label="Storage Payment" value={formatDateTime(r.storagePaymentDate, r.storagePaymentTime)} />
                    <ReadField label="Demurrage Begin" value={formatDateTime(r.demurrageBeginDate, r.demurrageBeginTime)} />
                    <ReadField label="Demurrage Payment" value={formatDateTime(r.demurragePaymentDate, r.demurragePaymentTime)} />
                  </div>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Empty Return ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Empty Return</div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <EditLabel>Location</EditLabel>
                        <EditNeuronDropdown value={editForm.emptyReturn} options={EMPTY_RETURN_OPTIONS} onChange={(v) => set("emptyReturn", v)} placeholder="Select location..." />
                      </div>
                      <div>
                        <EditLabel>Free Time</EditLabel>
                        <EditTextInput value={editForm.freeTime || ""} onChange={(v) => set("freeTime", v)} placeholder="Enter free time" />
                      </div>
                    </div>
                    {(editForm.emptyReturn === "CY" || editForm.emptyReturn === "Pre-Advice CY") && (
                      <div>
                        <EditLabel>Container Yard</EditLabel>
                        <EditTextInput value={editForm.containerYard || ""} onChange={(v) => set("containerYard", v)} placeholder="Enter container yard" />
                      </div>
                    )}
                    <EditDateTimeRow
                      dateValue={editForm.detentionStartDate}
                      timeValue={editForm.detentionStartTime}
                      onDateChange={(v) => set("detentionStartDate", v)}
                      onTimeChange={(v) => set("detentionStartTime", v)}
                      dateLabel="Detention Start"
                    />
                    <div>
                      <EditLabel>Additional Note</EditLabel>
                      <textarea
                        value={editForm.emptyReturnNote || ""}
                        onChange={(e) => set("emptyReturnNote", e.target.value as any)}
                        rows={5}
                        placeholder="Enter any additional notes or instructions..."
                        style={{ width: "100%", padding: "10px 16px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px", resize: "vertical" as const }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {(r.emptyReturn === "CY" || r.emptyReturn === "Pre-Advice CY") ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                        <ReadField label="Location" value={r.emptyReturn} />
                        <ReadField label="Container Yard" value={r.containerYard} />
                        <ReadField label="Free Time" value={r.freeTime} />
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <ReadField label="Location" value={r.emptyReturn} />
                        <ReadField label="Free Time" value={r.freeTime} />
                      </div>
                    )}
                    <ReadField label="Detention Start" value={formatDateTime(r.detentionStartDate, r.detentionStartTime)} />
                    <ReadField label="Additional Note" value={r.emptyReturnNote} />
                  </div>
                )}
                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Other Fees ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Other Fees</div>
                {isEditing ? (
                  <div style={{ marginBottom: "24px" }}>
                    <textarea
                      value={editForm.otherFees || ""}
                      onChange={(e) => set("otherFees", e.target.value as any)}
                      rows={5}
                      placeholder="Describe other fees..."
                      style={{ width: "100%", padding: "10px 16px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px", resize: "vertical" as const }}
                    />
                  </div>
                ) : (
                  <div style={{ marginBottom: "24px" }}>
                    <ReadField label="" value={r.otherFees} />
                  </div>
                )}

                <div style={{ borderTop: "1px solid #E5E9F0", margin: "24px 0" }} />

                {/* ── Additional Info ── */}
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Additional Info</div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div>
                        <EditLabel>DO Date</EditLabel>
                        <NeuronDatePicker value={editForm.doDate} onChange={(v: string) => set("doDate", v)} />
                      </div>
                      <div>
                        <EditLabel>Padlock Date</EditLabel>
                        <NeuronDatePicker value={editForm.padlockDate} onChange={(v: string) => set("padlockDate", v)} />
                      </div>
                    </div>
                    <div>
                      <EditLabel>Container Damage</EditLabel>
                      <EditTextInput value={editForm.containerDamage} onChange={(v) => set("containerDamage", v)} placeholder="Describe any damage" />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <ReadField label="DO Date" value={formatISOToDisplay(r.doDate)} />
                      <ReadField label="Padlock Date" value={formatISOToDisplay(r.padlockDate)} />
                    </div>
                    <ReadField label="Container Damage" value={r.containerDamage} />
                  </div>
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
