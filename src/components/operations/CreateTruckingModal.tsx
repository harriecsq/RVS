/**
 * CreateTruckingModal — rendered as a right-side panel matching the
 * exact Neuron design system used in CreateImportBookingPanel:
 *  - Fixed right-side slide-in panel
 *  - ArrowLeft close button + title header
 *  - px-10 py-8 / px-12 sections
 *  - Tailwind class typography + inline hex fallbacks
 *  - Custom div-based dropdowns, MM/DD/YYYY masking, time inputs
 */
import { ArrowLeft, Plus, Trash2, ChevronDown, Check, Search, X, Link2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { BookingSelector } from "../selectors/BookingSelector";
import { NeuronDatePicker } from "./shared/NeuronDatePicker";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import { API_BASE_URL } from '@/utils/api-config';
import {
  ALL_TRUCKING_TAGS,
  TRUCKING_TAG_GROUPS,
  TRUCKING_VENDORS,
  EMPTY_RETURN_OPTIONS,
  CONTAINER_SIZES,
  DISPATCHER_LIST,
  GATEPASS_LIST,
  hexToRgba,
} from "../../utils/truckingTags";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContainerEntry {
  containerNo: string;
  size: string;
}

interface DeliveryInstruction {
  text: string;
}

interface DeliveryDrop {
  deaDate: string;
  deliveryScheduleDate: string;
  deliveryScheduleTime: string;
  unloadingStart: string;
  unloadingEnd: string;
  parking: string;
  instructions: DeliveryInstruction[];
  additionalNote: string;
}

interface RecipientEntry {
  name: string;
  contacts: string[];
}

interface AddressEntry {
  address: string;
  postalCode: string;
  recipients: RecipientEntry[];
  additionalNote: string;
}

interface EmptyReturnLocation {
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  showEnd?: boolean;
}

interface RemarksDrop {
  startDate: string;
  startTime: string;
  doneDate: string;
  doneTime: string;
}

export interface TruckingRecord {
  id: string;
  truckingRefNo: string;
  linkedBookingId?: string;
  linkedBookingType?: string;
  containers: ContainerEntry[];
  commodityItems: string;
  shippingLine: string;
  vesselVoyage: string;
  blNumber: string;
  tabsBookingDate: string;
  tabsBookingTime: string;
  warehouseArrivalDate: string;
  warehouseArrivalTime: string;
  deliveryDrops: DeliveryDrop[];
  deliveryAddresses: AddressEntry[];
  truckingRate: string;
  truckingVendor: string;
  dispatcher: string;
  gatepass: string;
  truckingSoa: string;
  remarks: string[];
  remarksDrops: RemarksDrop[];
  emptyReturn: string;
  emptyReturnLocations: EmptyReturnLocation[];
  otherFees: string;
  storageBeginDate: string;
  storageBeginTime: string;
  storagePaymentDate: string;
  storagePaymentTime: string;
  demurrageBeginDate: string;
  demurrageBeginTime: string;
  containerDamage: string;
  doDate: string;
  padlockDate: string;
  notes: string;
  // Export-specific trucking fields
  plateNo: string;
  contact: string;
  driverHelperName: string;
  stickers: string;
  weighing: string;
  waitingFee: string;
  loadingDate: string;
  truckingAddress: string;
  truckingStatus: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface CreateTruckingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (record: TruckingRecord) => void;
  existingRecord?: TruckingRecord | null;
  prefillBookingId?: string;
  prefillBookingType?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Shared label */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium mb-2" style={{ color: "#12332B" }}>
      {children}
    </label>
  );
}

/** Shared section divider */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-widest mb-4 pb-2"
      style={{ color: "#667085", borderBottom: "1px solid #E5E7EB", letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  );
}

/** Shared text input */
function TextInput({
  value, onChange, placeholder = "", disabled,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
      style={{ borderColor: "#E5E7EB", fontSize: "14px", color: "#12332B", outline: "none", backgroundColor: "#FFFFFF" }}
    />
  );
}

/** Date input with calendar popup + optional time picker side by side */
function DateTimeRow({
  dateValue, timeValue, onDateChange, onTimeChange, dateLabel, hideLabels, dateStyle,
}: { dateValue: string; timeValue: string; onDateChange: (iso: string) => void; onTimeChange: (t: string) => void; dateLabel?: string; hideLabels?: boolean; dateStyle?: React.CSSProperties }) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        {!hideLabels && <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>{dateLabel || "Date"}</label>}
        <NeuronDatePicker value={dateValue} onChange={onDateChange} style={dateStyle} />
      </div>
      <div className="flex-1">
        {!hideLabels && <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>Time</label>}
        <NeuronTimePicker value={timeValue} onChange={onTimeChange} />
      </div>
    </div>
  );
}

/** Compact date-only input with calendar popup */
function DateRow({
  dateValue, onDateChange, dateStyle,
}: { dateValue: string; onDateChange: (iso: string) => void; dateStyle?: React.CSSProperties }) {
  return <NeuronDatePicker value={dateValue} onChange={onDateChange} style={dateStyle} />;
}

/** Custom div-based dropdown */
function NeuronDropdown({
  value, options, onChange, placeholder = "Select...", style = {},
}: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
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
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 rounded-lg border flex items-center justify-between cursor-pointer"
        style={{ borderColor: "#E5E7EB", fontSize: "14px", color: value ? "#12332B" : "#9CA3AF", backgroundColor: "#FFFFFF", ...style }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 mt-1 bg-white rounded-lg border overflow-auto"
          style={{
            top: "100%", zIndex: 9999, maxHeight: "220px",
            borderColor: "#E5E7EB", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="px-4 py-2 cursor-pointer flex items-center justify-between"
              style={{
                fontSize: "14px", color: "#12332B",
                backgroundColor: value === opt ? "#F0FAF8" : "transparent",
              }}
              onMouseEnter={(e) => { if (value !== opt) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F7FAF8"; }}
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

/** Vendor-coloured dropdown */
function VendorDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 rounded-lg border flex items-center justify-between cursor-pointer"
        style={{ borderColor: "#E5E7EB", fontSize: "14px", backgroundColor: "#FFFFFF" }}
      >
        {vendor ? (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs"
            style={{
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
        <ChevronDown size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 mt-1 bg-white rounded-lg border overflow-hidden"
          style={{
            top: "100%", zIndex: 9999,
            borderColor: "#E5E7EB", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "#E5E7EB" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border text-sm"
              style={{ borderColor: "#E5E7EB", color: "#12332B", outline: "none", fontSize: "14px", backgroundColor: "#FFFFFF" }}
            />
          </div>
          <div className="overflow-auto" style={{ maxHeight: "220px" }}>
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm" style={{ color: "#9CA3AF" }}>No vendors found</div>
            )}
            {filtered.map((v) => (
              <div
                key={v.name}
                onClick={() => { onChange(v.name); setOpen(false); }}
                className="px-4 py-2 cursor-pointer flex items-center gap-3"
                style={{ fontSize: "14px", backgroundColor: value === v.name ? "#F0FAF8" : "transparent" }}
                onMouseEnter={(e) => { if (value !== v.name) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F7FAF8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = value === v.name ? "#F0FAF8" : "transparent"; }}
              >
                <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: v.hex, flexShrink: 0, display: "inline-block" }} />
                <span style={{ color: "#12332B" }}>{v.name}</span>
                {value === v.name && <Check size={14} style={{ color: "#0F766E", marginLeft: "auto" }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tag chip */
function TagChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: "#E4EFEA", color: "#12332B", border: "1px solid #C1D9CC" }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center opacity-50 hover:opacity-100 transition-opacity"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#12332B", padding: 0 }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

/** Tag multi-select picker */
function TagSelector({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
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

  const filtered = ALL_TRUCKING_TAGS.filter(
    (t) => !search || t.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {selected.length === 0 && (
          <span className="text-sm" style={{ color: "#9CA3AF" }}>No tags selected</span>
        )}
        {selected.map((key) => {
          const tag = ALL_TRUCKING_TAGS.find((t) => t.key === key);
          return <TagChip key={key} label={tag?.label || key} onRemove={() => toggle(key)} />;
        })}
      </div>
      <div ref={ref} className="relative">
        <div
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-2.5 rounded-lg border flex items-center gap-2 cursor-pointer"
          style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
        >
          <Search size={14} style={{ color: "#9CA3AF" }} />
          <span className="text-sm" style={{ color: "#9CA3AF" }}>Add tags...</span>
        </div>
        {open && (
          <div
            className="absolute left-0 right-0 mt-1 bg-white rounded-lg border overflow-auto"
            style={{
              top: "100%", zIndex: 9999, maxHeight: "300px",
              borderColor: "#E5E7EB", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
            }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: "#E5E7EB" }}>
              <input
                autoFocus
                type="text"
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-1.5 rounded-md border text-sm"
                style={{ borderColor: "#E5E7EB", color: "#12332B", outline: "none" }}
              />
            </div>
            {TRUCKING_TAG_GROUPS.map((group) => {
              const groupTags = filtered.filter((t) => t.group === group.id);
              if (!groupTags.length) return null;
              return (
                <div key={group.id}>
                  <div className="px-3 py-1.5 text-xs font-bold uppercase" style={{ color: "#9CA3AF", letterSpacing: "0.07em" }}>
                    {group.label}
                  </div>
                  {groupTags.map((tag) => (
                    <div
                      key={tag.key}
                      onClick={(e) => { e.stopPropagation(); toggle(tag.key); }}
                      className="px-4 py-2 cursor-pointer flex items-center gap-2.5"
                      style={{
                        fontSize: "14px", color: "#12332B",
                        backgroundColor: selected.includes(tag.key) ? "#F0FAF8" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!selected.includes(tag.key)) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F7FAF8"; }}
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

// ─── Add link button ─────────────────────────────────────────────────────────
function AddLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-semibold hover:opacity-80 transition-opacity mt-1"
      style={{ background: "none", border: "none", cursor: "pointer", color: "#0F766E", padding: 0 }}
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
      className="p-1 hover:bg-red-50 rounded transition-colors"
      style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626" }}
    >
      <Trash2 size={15} />
    </button>
  );
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function makeNewRecord(prefillBookingId?: string, prefillBookingType?: string): TruckingRecord {
  return {
    id: "", truckingRefNo: "",
    linkedBookingId: prefillBookingId || "",
    linkedBookingType: prefillBookingType || "",
    containers: [{ containerNo: "", size: "20GP" }],
    commodityItems: "", shippingLine: "", vesselVoyage: "", blNumber: "",
    tabsBookingDate: "", tabsBookingTime: "",
    warehouseArrivalDate: "", warehouseArrivalTime: "",
    deliveryDrops: [{
      deaDate: "", deliveryScheduleDate: "", deliveryScheduleTime: "",
      unloadingStart: "", unloadingEnd: "", parking: "Availability depends on time of arrival.",
      instructions: [{ text: "" }], additionalNote: "",
    }],
    deliveryAddresses: [{ address: "", postalCode: "", recipients: [{ name: "", contacts: [""] }], additionalNote: "" }],
    truckingRate: "", truckingVendor: "", dispatcher: "", gatepass: "", truckingSoa: "",
    remarks: [],
    remarksDrops: [],
    emptyReturn: "", emptyReturnLocations: [],
    otherFees: "",
    storageBeginDate: "", storageBeginTime: "",
    storagePaymentDate: "", storagePaymentTime: "",
    demurrageBeginDate: "", demurrageBeginTime: "",
    containerDamage: "", doDate: "", padlockDate: "", notes: "",
    plateNo: "", contact: "", driverHelperName: "", stickers: "",
    weighing: "", waitingFee: "", loadingDate: "", truckingAddress: "", truckingStatus: "",
    createdAt: "", updatedAt: "",
  };
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CreateTruckingModal({
  isOpen, onClose, onSaved, existingRecord, prefillBookingId, prefillBookingType,
}: CreateTruckingModalProps) {
  const [form, setForm] = useState<TruckingRecord>(
    existingRecord ? { ...existingRecord } : makeNewRecord(prefillBookingId, prefillBookingType)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Record<string, boolean>>({});
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [linkedBookingData, setLinkedBookingData] = useState<any>(null);
  const hasPrefilled = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setForm(existingRecord ? { ...existingRecord } : makeNewRecord(prefillBookingId, prefillBookingType));
      setAutoFilledFields({});
      setLinkedBookingData(null);
      hasPrefilled.current = false;
    }
  }, [isOpen, existingRecord, prefillBookingId, prefillBookingType]);

  // Auto-fetch booking details when opened with a prefillBookingId
  useEffect(() => {
    if (isOpen && prefillBookingId && !hasPrefilled.current && !existingRecord) {
      hasPrefilled.current = true;
      fetchAndAutoFill(prefillBookingId);
    }
  }, [isOpen, prefillBookingId]);

  // Fetch linked booking data for display when editing an existing record
  useEffect(() => {
    if (isOpen && existingRecord?.linkedBookingId && !linkedBookingData) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/bookings/${existingRecord.linkedBookingId}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          const result = await res.json();
          if (result.success && result.data) {
            setLinkedBookingData(result.data);
          }
        } catch (err) {
          console.error("Error fetching linked booking for display:", err);
        }
      })();
    }
  }, [isOpen, existingRecord]);

  if (!isOpen) return null;

  // ─── Field setter ──────────────────────────────────────────────────────────
  const set = <K extends keyof TruckingRecord>(key: K, value: TruckingRecord[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (autoFilledFields[key as string]) {
      setAutoFilledFields((prev) => ({ ...prev, [key as string]: false }));
    }
  };

  // ─── Auto-fill style helper ──────────────────────────────────────────────
  const autoFillBg = (field: string): React.CSSProperties =>
    autoFilledFields[field]
      ? { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }
      : {};

  // ─── Booking selection & auto-fill ────────────────────────────────────────
  async function fetchAndAutoFill(bookingId: string) {
    setIsLoadingBooking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        applyBookingData(result.data);
      }
    } catch (err) {
      console.error("Error fetching booking details for auto-fill:", err);
    } finally {
      setIsLoadingBooking(false);
    }
  }

  function applyBookingData(b: any) {
    setLinkedBookingData(b);
    // Also update linkedBookingType from the fetched data if available
    const detectedType = b.shipmentType || b.booking_type || b.mode || b.type || "";
    if (detectedType) {
      setForm((prev) => ({ ...prev, linkedBookingType: detectedType || prev.linkedBookingType }));
    }
    const filled: Record<string, boolean> = {};

    // Helper to extract container size from a string (e.g. "1x40HC" or "40HQ")
    const extractSize = (s: string): string => {
      const upper = (s || "").toUpperCase();
      if (upper.includes("40RH") || upper.includes("REERER")) return "40RH";
      if (upper.includes("40HC") || upper.includes("40HQ") || upper.includes("40")) return "40HC";
      if (upper.includes("20GP") || upper.includes("20")) return "20GP";
      return "20GP";
    };

    // Helper to parse volume string like "2x40HC" into multiple container slots
    const parseVolumeToContainers = (vol: string): ContainerEntry[] => {
      if (!vol) return [];
      const match = vol.match(/(\d+)\s*[xX]\s*(.*)/);
      if (match) {
        const count = parseInt(match[1], 10);
        const size = extractSize(match[2]);
        return Array(count).fill(null).map(() => ({ containerNo: "", size }));
      }
      const size = extractSize(vol);
      return [{ containerNo: "", size }];
    };

    // BL # — fallback chain for all known field name variants
    const blVal = b.blNumber || b.bl_number || b.awbBlNo || b.awb_bl_no || b.billOfLading || "";
    if (blVal) filled.blNumber = true;

    // Commodity Items
    const commodityVal = b.commodityItems || b.commodity_items || b.commodity || b.commodityDescription || b.commodity_description || "";
    if (commodityVal) filled.commodityItems = true;

    // Shipping Line
    const shippingVal = b.shippingLine || b.shipping_line || b.carrier || "";
    if (shippingVal) filled.shippingLine = true;

    // Vessel / Voyage
    const vesselVal = b.vesselVoyage || b.vessel_voyage || b.vessel || b.vesselName || b.vessel_name || "";
    if (vesselVal) filled.vesselVoyage = true;

    // Container Data & Volume
    let containersVal: ContainerEntry[] | null = null;
    const rawContainers = b.containers || b.containerNo || b.container_no || b.containerNumber || b.container_number || "";
    const rawVolume = b.volume_containers || b.volume || b.measurement || "";

    if (rawContainers) {
      if (Array.isArray(rawContainers)) {
        containersVal = rawContainers.map((c: any) => ({
          containerNo: typeof c === "string" ? c : (c.containerNo || c.container_no || c.containerNumber || ""),
          size: typeof c === "string" ? extractSize(rawVolume) : (c.size || c.containerSize || extractSize(rawVolume)),
        }));
      } else if (typeof rawContainers === "string" && rawContainers.trim()) {
        const parts = rawContainers.split(",").map((s: string) => s.trim()).filter(Boolean);
        const extractedSize = extractSize(rawVolume);
        containersVal = parts.map((p: string) => ({ containerNo: p, size: extractedSize }));
      }
    }

    // Fallback: If no specific container numbers, but we have volume info, create the entries
    if ((!containersVal || containersVal.length === 0) && rawVolume) {
      containersVal = parseVolumeToContainers(rawVolume);
    }

    if (containersVal && containersVal.length > 0) filled.containers = true;

    setForm((prev) => ({
      ...prev,
      blNumber: blVal || prev.blNumber,
      commodityItems: commodityVal || prev.commodityItems,
      shippingLine: shippingVal || prev.shippingLine,
      vesselVoyage: vesselVal || prev.vesselVoyage,
      containers: (containersVal && containersVal.length > 0) ? containersVal : prev.containers,
    }));
    setAutoFilledFields(filled);

    if (Object.keys(filled).length > 0) {
      toast.success("Booking fields auto-filled");
    }
  }

  const handleBookingSelect = async (booking: any) => {
    if (!booking) {
      setForm((prev) => ({ ...prev, linkedBookingId: "", linkedBookingType: "" }));
      setAutoFilledFields({});
      setLinkedBookingData(null);
      return;
    }

    setForm((prev) => ({
      ...prev,
      linkedBookingId: booking.id || "",
      linkedBookingType: booking.shipmentType || booking.booking_type || booking.mode || "",
    }));

    await fetchAndAutoFill(booking.id);
  };

  // ─── Containers ───────────────────────────────────────────────────────────
  const addContainer = () => set("containers", [...form.containers, { containerNo: "", size: "20GP" }]);
  const removeContainer = (i: number) => set("containers", form.containers.filter((_, idx) => idx !== i));
  const updateContainer = (i: number, key: keyof ContainerEntry, val: string) => {
    set("containers", form.containers.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
    if (autoFilledFields.containers) {
      setAutoFilledFields((prev) => ({ ...prev, containers: false }));
    }
  };

  // ─── Drops ────────────────────────────────────────────────────────────────
  const addDrop = () => set("deliveryDrops", [
    ...form.deliveryDrops,
    { deaDate: "", deliveryScheduleDate: "", deliveryScheduleTime: "", unloadingStart: "", unloadingEnd: "", parking: "Availability depends on time of arrival.", instructions: [{ text: "" }], additionalNote: "" },
  ]);
  const removeDrop = (i: number) => set("deliveryDrops", form.deliveryDrops.filter((_, idx) => idx !== i));
  const updateDrop = <K extends keyof DeliveryDrop>(i: number, key: K, val: DeliveryDrop[K]) =>
    set("deliveryDrops", form.deliveryDrops.map((d, idx) => idx === i ? { ...d, [key]: val } : d));
  const addInstruction = (di: number) =>
    set("deliveryDrops", form.deliveryDrops.map((d, idx) => idx === di ? { ...d, instructions: [...d.instructions, { text: "" }] } : d));
  const updateInstruction = (di: number, ii: number, val: string) =>
    set("deliveryDrops", form.deliveryDrops.map((d, idx) =>
      idx === di ? { ...d, instructions: d.instructions.map((ins, i) => i === ii ? { text: val } : ins) } : d
    ));
  const removeInstruction = (di: number, ii: number) =>
    set("deliveryDrops", form.deliveryDrops.map((d, idx) =>
      idx === di ? { ...d, instructions: d.instructions.filter((_, i) => i !== ii) } : d
    ));

  // ─── Addresses ────────────────────────────────────────────────────────────
  const addAddress = () => set("deliveryAddresses", [...form.deliveryAddresses, { address: "", postalCode: "", recipients: [{ name: "", contacts: [""] }], additionalNote: "" }]);
  const removeAddress = (i: number) => set("deliveryAddresses", form.deliveryAddresses.filter((_, idx) => idx !== i));
  const updateAddress = <K extends keyof AddressEntry>(i: number, key: K, val: AddressEntry[K]) =>
    set("deliveryAddresses", form.deliveryAddresses.map((a, idx) => idx === i ? { ...a, [key]: val } : a));
  const addRecipient = (ai: number) =>
    set("deliveryAddresses", form.deliveryAddresses.map((a, i) => i === ai ? { ...a, recipients: [...a.recipients, { name: "", contacts: [""] }] } : a));
  const removeRecipient = (ai: number, ri: number) =>
    set("deliveryAddresses", form.deliveryAddresses.map((a, i) => i === ai ? { ...a, recipients: a.recipients.filter((_, r) => r !== ri) } : a));
  const updateRecipient = (ai: number, ri: number, key: keyof RecipientEntry, val: any) =>
    set("deliveryAddresses", form.deliveryAddresses.map((a, i) =>
      i === ai ? { ...a, recipients: a.recipients.map((r, j) => j === ri ? { ...r, [key]: val } : r) } : a
    ));
  const addContact = (ai: number, ri: number) =>
    set("deliveryAddresses", form.deliveryAddresses.map((a, i) =>
      i === ai ? { ...a, recipients: a.recipients.map((r, j) => j === ri ? { ...r, contacts: [...r.contacts, ""] } : r) } : a
    ));
  const removeContact = (ai: number, ri: number, ci: number) =>
    set("deliveryAddresses", form.deliveryAddresses.map((a, i) =>
      i === ai ? { ...a, recipients: a.recipients.map((r, j) => j === ri ? { ...r, contacts: r.contacts.filter((_, k) => k !== ci) } : r) } : a
    ));
  const updateContact = (ai: number, ri: number, ci: number, val: string) =>
    set("deliveryAddresses", form.deliveryAddresses.map((a, i) =>
      i === ai ? { ...a, recipients: a.recipients.map((r, j) => j === ri ? { ...r, contacts: r.contacts.map((c, k) => k === ci ? val : c) } : r) } : a
    ));

  // ─── Empty return locations ───────────────────────────────────────────────
  const addLocation = () => set("emptyReturnLocations", [...form.emptyReturnLocations, { location: "", startDate: "", startTime: "", endDate: "", endTime: "" }]);
  const removeLocation = (i: number) => set("emptyReturnLocations", form.emptyReturnLocations.filter((_, idx) => idx !== i));
  const updateLocation = <K extends keyof EmptyReturnLocation>(i: number, key: K, val: EmptyReturnLocation[K]) =>
    set("emptyReturnLocations", form.emptyReturnLocations.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  const toggleLocationShowEnd = (i: number, show: boolean) =>
    set("emptyReturnLocations", form.emptyReturnLocations.map((l, idx) =>
      idx === i ? { ...l, showEnd: show, ...(show ? {} : { endDate: "", endTime: "" }) } : l
    ));

  // ─── Remarks drops ────────────────────────────────────────────────────────
  const remarksDrops = form.remarksDrops || [];
  const addRemarksDrop = () => set("remarksDrops", [...remarksDrops, { startDate: "", startTime: "", doneDate: "", doneTime: "" }]);
  const removeRemarksDrop = (i: number) => set("remarksDrops", remarksDrops.filter((_, idx) => idx !== i));
  const updateRemarksDrop = <K extends keyof RemarksDrop>(i: number, key: K, val: string) =>
    set("remarksDrops", remarksDrops.map((d, idx) => idx === i ? { ...d, [key]: val } : d));

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...form, updatedAt: new Date().toISOString(), createdAt: form.createdAt || new Date().toISOString() };
      const url = existingRecord ? `${API_BASE_URL}/trucking-records/${existingRecord.id}` : `${API_BASE_URL}/trucking-records`;
      const method = existingRecord ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(existingRecord ? "Trucking record updated" : "Trucking record created");
        onSaved(result.data);
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backdropFilter: "blur(2px)", backgroundColor: "rgba(18, 51, 43, 0.15)" }}
      />

      {/* Side Panel */}
      <div
        className="fixed right-0 top-0 h-full bg-white z-50 flex flex-col"
        style={{
          width: "820px",
          borderLeft: "1px solid #E5E7EB",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-10 py-8 border-b flex-shrink-0"
          style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-[#0F766E]/10"
              style={{ color: "#12332B" }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: "#12332B" }}>
                {existingRecord ? "Edit Trucking" : "New Trucking"}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: "#667085" }}>
                {form.linkedBookingId
                  ? `Linked to booking: ${form.linkedBookingId}`
                  : "Fill in trucking assignment details"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Form Body ── */}
        <div className="flex-1 overflow-auto">
          <form onSubmit={handleSubmit} className="px-12 py-8 space-y-8">

            {/* ── BOOKING DETAILS (unified summary card) ── */}
            <div>
              <SectionHeader>
                Booking Details
              </SectionHeader>
              <div className="space-y-3">
                <div>
                  <Label>Link to Booking</Label>
                  <BookingSelector
                    value={form.linkedBookingId || ""}
                    onSelect={handleBookingSelect}
                    placeholder="Search by Booking Ref, BL No, or Client..."
                  />
                </div>
                {isLoadingBooking && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                    style={{ backgroundColor: "#F0FAF8", color: "#0F766E", border: "1px solid #D1FAE5" }}
                  >
                    <div
                      className="animate-spin rounded-full border-2 border-t-transparent"
                      style={{ width: 14, height: 14, borderColor: "#0F766E", borderTopColor: "transparent" }}
                    />
                    Loading booking details…
                  </div>
                )}
                {!isLoadingBooking && form.linkedBookingId && Object.values(autoFilledFields).some(Boolean) && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                    style={{ backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}
                  >
                    <Link2 size={14} />
                    Booking linked — fields auto-filled
                  </div>
                )}

                {/* Read-only summary fields — shown when a booking is linked */}
                {!isLoadingBooking && linkedBookingData && form.linkedBookingId && (
                  <div
                    style={{
                      background: "#FAFBFC",
                      border: "1px solid #E5E7EB",
                      borderRadius: "10px",
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    {/* Client + Consignee/Shipper */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Client</div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                          {linkedBookingData.customerName || linkedBookingData.client_name || linkedBookingData.clientName || "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                          {(form.linkedBookingType || "").toLowerCase().includes("export") ? "Shipper" : "Consignee"}
                        </div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                          {(form.linkedBookingType || "").toLowerCase().includes("export")
                            ? (linkedBookingData.shipper || "—")
                            : (linkedBookingData.consignee || "—")}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    

                    {/* Containers + Size */}
                    {form.containers.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                            Containers ({form.containers.length})
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "2px" }}>
                            {form.containers.map((c, i) => (
                              <span
                                key={i}
                                style={{
                                  display: "inline-block",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#12332B",
                                }}
                              >
                                {c.containerNo || "—"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Size</div>
                          <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>
                            {(() => {
                              const counts: Record<string, number> = {};
                              for (const c of form.containers) { const s = c.size || "Unknown"; counts[s] = (counts[s] || 0) + 1; }
                              return Object.entries(counts).map(([s, n]) => `${n}x${s}`).join(", ") || "—";
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Commodity, Shipping Line, Vessel, BL */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity Items</div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{form.commodityItems || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Shipping Line</div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{form.shippingLine || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{form.vesselVoyage || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>B/L Number</div>
                        <div style={{ fontSize: "13px", color: "#12332B", fontWeight: 500 }}>{form.blNumber || "—"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Conditional: EXPORT vs IMPORT trucking sections ── */}
            {(form.linkedBookingType || "").toLowerCase().includes("export") ? (
              <>
                {/* ── TRUCKING INFORMATION (Export-specific) ── */}
                <div>
                  <SectionHeader>Trucking Information</SectionHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Trucking</Label>
                      <VendorDropdown value={form.truckingVendor} onChange={(v) => set("truckingVendor", v)} />
                    </div>
                    <div>
                      <Label>Plate No.</Label>
                      <TextInput value={form.plateNo} onChange={(v) => set("plateNo", v)} placeholder="Enter plate number" />
                    </div>
                    <div>
                      <Label>Contact</Label>
                      <TextInput value={form.contact} onChange={(v) => set("contact", v)} placeholder="Enter contact number" />
                    </div>
                    <div>
                      <Label>Driver/Helper Name</Label>
                      <TextInput value={form.driverHelperName} onChange={(v) => set("driverHelperName", v)} placeholder="Enter driver/helper name" />
                    </div>
                    <div>
                      <Label>Rate</Label>
                      <TextInput value={form.truckingRate} onChange={(v) => set("truckingRate", v)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Stickers</Label>
                      <TextInput value={form.stickers} onChange={(v) => set("stickers", v)} placeholder="Enter stickers" />
                    </div>
                    <div>
                      <Label>Weighing</Label>
                      <TextInput value={form.weighing} onChange={(v) => set("weighing", v)} placeholder="Enter weighing details" />
                    </div>
                    <div>
                      <Label>Waiting Fee</Label>
                      <TextInput value={form.waitingFee} onChange={(v) => set("waitingFee", v)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>SOA Number</Label>
                      <TextInput value={form.truckingSoa} onChange={(v) => set("truckingSoa", v)} placeholder="Enter SOA number" />
                    </div>
                    <div>
                      <Label>Loading Date</Label>
                      <DateRow dateValue={form.loadingDate} onDateChange={(v) => set("loadingDate", v)} />
                    </div>
                    <div>
                      <Label>Loading Address</Label>
                      <TextInput value={form.truckingAddress} onChange={(v) => set("truckingAddress", v)} placeholder="Enter address" />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <TextInput value={form.truckingStatus} onChange={(v) => set("truckingStatus", v)} placeholder="Enter status" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
            {/* ── TABS BOOKING ── */}
            <div>
              <SectionHeader>Tabs Booking</SectionHeader>
              <DateTimeRow
                dateValue={form.tabsBookingDate} timeValue={form.tabsBookingTime}
                onDateChange={(v) => set("tabsBookingDate", v)} onTimeChange={(v) => set("tabsBookingTime", v)}
              />
            </div>

            {/* ── WAREHOUSE ARRIVAL ── */}
            <div>
              <SectionHeader>Warehouse Arrival</SectionHeader>
              <DateTimeRow
                dateValue={form.warehouseArrivalDate} timeValue={form.warehouseArrivalTime}
                onDateChange={(v) => set("warehouseArrivalDate", v)} onTimeChange={(v) => set("warehouseArrivalTime", v)}
              />
            </div>

            {/* ── DELIVERY SCHEDULE ── */}
            <div>
              <SectionHeader>Delivery Schedule</SectionHeader>
              <div className="space-y-4">
                {form.deliveryDrops.map((drop, di) => (
                  <div
                    key={di}
                    className="rounded-xl p-5 space-y-4"
                    style={{ border: "1px solid #E5E7EB", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#12332B" }}>Drop {di + 1}</span>
                      {form.deliveryDrops.length > 1 && <RemoveBtn onClick={() => removeDrop(di)} />}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>DEA Date</label>
                        <NeuronDatePicker value={drop.deaDate} onChange={(v) => updateDrop(di, "deaDate", v)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>Delivery Schedule Date</label>
                        <DateRow dateValue={drop.deliveryScheduleDate} onDateChange={(v) => updateDrop(di, "deliveryScheduleDate", v)} />
                      </div>
                    </div>

                    {/* Time range: start (required) + optional end */}
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>
                        Unloading Time
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <NeuronTimePicker value={drop.deliveryScheduleTime} onChange={(v) => updateDrop(di, "deliveryScheduleTime", v)} />
                        </div>
                        {drop.unloadingEnd ? (
                          <>
                            <span className="text-sm font-medium" style={{ color: "#667085" }}>to</span>
                            <div className="flex-1">
                              <NeuronTimePicker value={drop.unloadingEnd} onChange={(v) => updateDrop(di, "unloadingEnd", v)} />
                            </div>
                            <button
                              type="button"
                              onClick={() => updateDrop(di, "unloadingEnd", "")}
                              className="p-1 hover:bg-red-50 rounded transition-colors"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626" }}
                            >
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateDrop(di, "unloadingEnd", drop.deliveryScheduleTime || "00:00")}
                            className="flex items-center gap-1 text-sm font-semibold hover:opacity-80 transition-opacity"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#0F766E", padding: 0 }}
                          >
                            <Plus size={14} />
                            Add end time
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Parking</Label>
                      <TextInput value={drop.parking} onChange={(v) => updateDrop(di, "parking", v)} />
                    </div>

                    <div>
                      <Label>Additional Note</Label>
                      <textarea
                        value={drop.additionalNote}
                        onChange={(e) => updateDrop(di, "additionalNote", e.target.value)}
                        rows={5}
                        placeholder="Enter any additional notes or instructions..."
                        className="w-full px-4 py-2.5 rounded-lg border resize-y"
                        style={{ borderColor: "#E5E7EB", fontSize: "14px", color: "#12332B", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px" }}
                      />
                    </div>
                  </div>
                ))}
                <AddLink onClick={addDrop}>Add Drop</AddLink>
              </div>
            </div>

            {/* ── DELIVERY ADDRESS ── */}
            <div>
              <SectionHeader>Delivery Address</SectionHeader>
              <div className="space-y-4">
                {form.deliveryAddresses.map((addr, ai) => (
                  <div
                    key={ai}
                    className="rounded-xl p-5 space-y-4"
                    style={{ border: "1px solid #E5E7EB", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#12332B" }}>Address {ai + 1}</span>
                      {form.deliveryAddresses.length > 1 && <RemoveBtn onClick={() => removeAddress(ai)} />}
                    </div>

                    <div className="grid grid-cols-[2fr_1fr] gap-4">
                      <div>
                        <Label>Street Address</Label>
                        <TextInput value={addr.address} onChange={(v) => updateAddress(ai, "address", v)} placeholder="Full address" />
                      </div>
                      <div>
                        <Label>Postal Code</Label>
                        <TextInput value={addr.postalCode} onChange={(v) => updateAddress(ai, "postalCode", v)} placeholder="Postal code" />
                      </div>
                    </div>

                    {addr.recipients.map((rec, ri) => (
                      <div
                        key={ri}
                        className="rounded-lg p-4 space-y-3"
                        style={{ border: "1px solid #F0F0F0", backgroundColor: "#FFFFFF" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase" style={{ color: "#667085", letterSpacing: "0.06em" }}>Recipient {ri + 1}</span>
                          {addr.recipients.length > 1 && <RemoveBtn onClick={() => removeRecipient(ai, ri)} />}
                        </div>
                        <div>
                          <Label>Recipient Name</Label>
                          <TextInput value={rec.name} onChange={(v) => updateRecipient(ai, ri, "name", v)} placeholder="Full name" />
                        </div>
                        {rec.contacts.map((contact, ci) => (
                          <div key={ci} className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "#667085", letterSpacing: "0.06em" }}>Contact {ci + 1}</label>
                              <TextInput value={contact} onChange={(v) => updateContact(ai, ri, ci, v)} placeholder="Mobile number" />
                            </div>
                            {rec.contacts.length > 1 && <div className="pt-5"><RemoveBtn onClick={() => removeContact(ai, ri, ci)} /></div>}
                          </div>
                        ))}
                        <AddLink onClick={() => addContact(ai, ri)}>Add contact number</AddLink>
                      </div>
                    ))}
                    <AddLink onClick={() => addRecipient(ai)}>Add Recipient</AddLink>

                    <div>
                      <Label>Additional Note</Label>
                      <textarea
                        value={addr.additionalNote}
                        onChange={(e) => updateAddress(ai, "additionalNote", e.target.value)}
                        rows={5}
                        placeholder="Enter any additional notes or instructions..."
                        className="w-full px-4 py-2.5 rounded-lg border resize-y"
                        style={{ borderColor: "#E5E7EB", fontSize: "14px", color: "#12332B", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px" }}
                      />
                    </div>
                  </div>
                ))}
                <AddLink onClick={addAddress}>Add Address</AddLink>
              </div>
            </div>

            {/* ── TRUCKING RATE ── */}
            <div>
              <SectionHeader>Trucking Rate</SectionHeader>
              <div className="w-64">
                <Label>Rate (₱)</Label>
                <TextInput value={form.truckingRate} onChange={(v) => set("truckingRate", v)} placeholder="0.00" />
              </div>
            </div>

            {/* ── TRUCKING VENDOR ── */}
            <div>
              <SectionHeader>Trucking Vendor</SectionHeader>
              <div className="w-80">
                <Label>Trucking Company</Label>
                <VendorDropdown value={form.truckingVendor} onChange={(v) => set("truckingVendor", v)} />
              </div>
            </div>

            {/* ── PEOPLE ── */}
            <div>
              <SectionHeader>People</SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dispatcher</Label>
                  <NeuronDropdown value={form.dispatcher} options={DISPATCHER_LIST} onChange={(v) => set("dispatcher", v)} placeholder="Select dispatcher..." />
                </div>
                <div>
                  <Label>Gatepass</Label>
                  <NeuronDropdown value={form.gatepass} options={GATEPASS_LIST} onChange={(v) => set("gatepass", v)} placeholder="Select gatepass..." />
                </div>
              </div>
            </div>

            {/* ── TRUCKING SOA ── */}
            <div>
              <SectionHeader>Trucking – SOA</SectionHeader>
              <div className="w-80">
                <Label>SOA Number</Label>
                <input
                  type="text"
                  value={form.truckingSoa}
                  onChange={(e) => set("truckingSoa", e.target.value)}
                  placeholder="Enter SOA number"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={{ borderColor: "#E5E7EB", fontSize: "14px", color: "#12332B", outline: "none", backgroundColor: "#FFFFFF" }}
                />
              </div>
            </div>

            {/* ── Status ── */}
            <div>
              <SectionHeader>Status</SectionHeader>
              <TagSelector selected={form.remarks} onChange={(tags) => set("remarks", tags)} />

              {/* Remarks Drops — Start & Done date/time per drop */}
              <div className="mt-5 space-y-3">
                {remarksDrops.map((rd, ri) => (
                  <div
                    key={ri}
                    className="rounded-xl p-5 space-y-4"
                    style={{ border: "1px solid #E5E7EB", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#12332B" }}>Drop {ri + 1}</span>
                      <RemoveBtn onClick={() => removeRemarksDrop(ri)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>Start</label>
                      <DateTimeRow
                        dateValue={rd.startDate} timeValue={rd.startTime}
                        onDateChange={(v) => updateRemarksDrop(ri, "startDate", v)}
                        onTimeChange={(v) => updateRemarksDrop(ri, "startTime", v)}
                        hideLabels
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>Completion</label>
                      <DateTimeRow
                        dateValue={rd.doneDate} timeValue={rd.doneTime}
                        onDateChange={(v) => updateRemarksDrop(ri, "doneDate", v)}
                        onTimeChange={(v) => updateRemarksDrop(ri, "doneTime", v)}
                        hideLabels
                      />
                    </div>
                  </div>
                ))}
                <AddLink onClick={addRemarksDrop}>Add Drop</AddLink>
              </div>
            </div>

            {/* ── EMPTY RETURN ── */}
            <div>
              <SectionHeader>Empty Return</SectionHeader>
              <div className="w-80 mb-4">
                <Label>Destination</Label>
                <NeuronDropdown value={form.emptyReturn} options={EMPTY_RETURN_OPTIONS} onChange={(v) => set("emptyReturn", v)} placeholder="Select destination..." />
              </div>
              <div className="space-y-3">
                {form.emptyReturnLocations.map((loc, li) => (
                  <div
                    key={li}
                    className="rounded-xl p-5 space-y-4"
                    style={{ border: "1px solid #E5E7EB", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#12332B" }}>Location {li + 1}</span>
                      <RemoveBtn onClick={() => removeLocation(li)} />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <TextInput value={loc.location} onChange={(v) => updateLocation(li, "location", v)} placeholder="Location name" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>Start</label>
                      <DateTimeRow
                        dateValue={loc.startDate} timeValue={loc.startTime}
                        onDateChange={(v) => updateLocation(li, "startDate", v)}
                        onTimeChange={(v) => updateLocation(li, "startTime", v)}
                        hideLabels
                      />
                    </div>
                    {loc.showEnd ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold uppercase" style={{ color: "#667085", letterSpacing: "0.06em" }}>End</label>
                          <button
                            type="button"
                            onClick={() => toggleLocationShowEnd(li, false)}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626" }}
                          >
                            <X size={15} />
                          </button>
                        </div>
                        <DateTimeRow
                          dateValue={loc.endDate} timeValue={loc.endTime}
                          onDateChange={(v) => updateLocation(li, "endDate", v)}
                          onTimeChange={(v) => updateLocation(li, "endTime", v)}
                          hideLabels
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleLocationShowEnd(li, true)}
                        className="flex items-center gap-1 text-sm font-semibold hover:opacity-80 transition-opacity"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#0F766E", padding: 0 }}
                      >
                        <Plus size={14} />
                        Add end time
                      </button>
                    )}
                  </div>
                ))}
                <AddLink onClick={addLocation}>Add Location</AddLink>
              </div>
            </div>

            {/* ── OTHER FEES ── */}
            <div>
              <SectionHeader>Other Fees</SectionHeader>
              <TextInput value={form.otherFees} onChange={(v) => set("otherFees", v)} placeholder="Describe other fees" />
            </div>

            {/* ── STORAGE & DEMURRAGE ── */}
            <div>
              <SectionHeader>Storage &amp; Demurrage Validity</SectionHeader>
              <div className="space-y-4">
                <DateTimeRow
                  dateValue={form.storageBeginDate} timeValue={form.storageBeginTime}
                  onDateChange={(v) => set("storageBeginDate", v)} onTimeChange={(v) => set("storageBeginTime", v)}
                  dateLabel="Storage Begin"
                />
                <DateTimeRow
                  dateValue={form.storagePaymentDate} timeValue={form.storagePaymentTime}
                  onDateChange={(v) => set("storagePaymentDate", v)} onTimeChange={(v) => set("storagePaymentTime", v)}
                  dateLabel="Storage Payment"
                />
                <DateTimeRow
                  dateValue={form.demurrageBeginDate} timeValue={form.demurrageBeginTime}
                  onDateChange={(v) => set("demurrageBeginDate", v)} onTimeChange={(v) => set("demurrageBeginTime", v)}
                  dateLabel="Demurrage Begin"
                />
              </div>
            </div>

            {/* ── CONTAINER DAMAGE ── */}
            <div>
              <SectionHeader>Container Damage</SectionHeader>
              <TextInput value={form.containerDamage} onChange={(v) => set("containerDamage", v)} placeholder="Describe any damage" />
            </div>

            {/* ── DO & PADLOCK ── */}
            <div>
              <SectionHeader>DO & Padlock</SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>DO Date</Label>
                  <DateRow dateValue={form.doDate} onDateChange={(v) => set("doDate", v)} />
                </div>
                <div>
                  <Label>Padlock Date</Label>
                  <DateRow dateValue={form.padlockDate} onDateChange={(v) => set("padlockDate", v)} />
                </div>
              </div>
            </div>
              </>
            )}

            {/* ── NOTES ── */}
            <div>
              <SectionHeader>Notes</SectionHeader>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={4}
                placeholder="Additional notes..."
                className="w-full px-4 py-2.5 rounded-lg border resize-y"
                style={{ borderColor: "#E5E7EB", fontSize: "14px", color: "#12332B", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF" }}
              />
            </div>

            {/* bottom padding so last field isn't under footer */}
            <div style={{ height: "80px" }} />
          </form>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-10 py-5 flex items-center justify-end gap-3 flex-shrink-0"
          style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: "#E5E7EB", color: "#667085", background: "#FFFFFF" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
            style={{
              backgroundColor: isSaving ? "#A0C4BE" : "#0F766E",
              color: "#FFFFFF",
              border: "none",
              cursor: isSaving ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? "Saving..." : existingRecord ? "Save Changes" : "Create Trucking"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}