/**
 * CreateTruckingModal — rendered as a right-side panel matching the
 * exact Neuron design system used in CreateImportBookingPanel:
 *  - Fixed right-side slide-in panel
 *  - ArrowLeft close button + title header
 *  - px-10 py-8 / px-12 sections
 *  - Tailwind class typography + inline hex fallbacks
 *  - Custom div-based dropdowns, MM/DD/YYYY masking, time inputs
 */
import { ArrowLeft, Plus, Trash2, ChevronDown, Check, X, Link2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { BookingSelector } from "../selectors/BookingSelector";
import { ContainerSelector } from "../selectors/ContainerSelector";
import type { ContainerInfo } from "../selectors/ContainerSelector";
import { NeuronDatePicker } from "./shared/NeuronDatePicker";
import { NeuronTimePicker } from "./shared/NeuronTimePicker";
import { API_BASE_URL } from '@/utils/api-config';
import {
  TRUCKING_VENDORS,
  EMPTY_RETURN_OPTIONS,
  DISPATCHER_LIST,
  GATEPASS_LIST,
  hexToRgba,
} from "../../utils/truckingTags";
import { TRUCKING_STATUS_OPTIONS, DEFAULT_TRUCKING_STATUS } from "../../constants/truckingStatuses";

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

interface WarehouseArrivalDrop {
  date: string;
  time: string;
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
  linkedSegmentId?: string;
  containerNo: string;
  containerSize: string;
  commodityItems: string;
  shippingLine: string;
  vesselVoyage: string;
  blNumber: string;
  tabsBookingDate: string;
  tabsBookingTime: string;
  warehouseArrivalDate: string;
  warehouseArrivalTime: string;
  warehouseArrivals: WarehouseArrivalDrop[];
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
  detentionStartDate: string;
  detentionStartTime: string;
  freeTime: string;
  containerYard: string;
  emptyReturnNote: string;
  otherFees: string;
  storageBeginDate: string;
  storageBeginTime: string;
  storagePaymentDate: string;
  storagePaymentTime: string;
  demurrageBeginDate: string;
  demurrageBeginTime: string;
  demurragePaymentDate: string;
  demurragePaymentTime: string;
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
  truckingDate: string;
  truckingStatus: string;
  inyardDate: string;
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
  prefillSegmentId?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Shared label */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium mb-2" style={{ color: "#0A1D4D" }}>
      {children}
    </label>
  );
}

/** Shared section divider */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-widest mb-4 pb-2"
      style={{ color: "#667085", borderBottom: "1px solid #E5E9F0", letterSpacing: "0.08em" }}
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
      style={{ borderColor: "#E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", backgroundColor: "#FFFFFF" }}
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
        style={{ borderColor: "#E5E9F0", fontSize: "14px", color: value ? "#0A1D4D" : "#9CA3AF", backgroundColor: "#FFFFFF", ...style }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 mt-1 bg-white rounded-lg border overflow-auto"
          style={{
            top: "100%", zIndex: 9999, maxHeight: "220px",
            borderColor: "#E5E9F0", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="px-4 py-2 cursor-pointer flex items-center justify-between"
              style={{
                fontSize: "14px", color: "#0A1D4D",
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
        style={{ borderColor: "#E5E9F0", fontSize: "14px", backgroundColor: "#FFFFFF" }}
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
            borderColor: "#E5E9F0", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "#E5E9F0" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border text-sm"
              style={{ borderColor: "#E5E9F0", color: "#0A1D4D", outline: "none", fontSize: "14px", backgroundColor: "#FFFFFF" }}
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
      style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}
    >
      <Trash2 size={15} />
    </button>
  );
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function makeNewRecord(prefillBookingId?: string, prefillBookingType?: string, prefillSegmentId?: string): TruckingRecord {
  return {
    id: "", truckingRefNo: "",
    linkedBookingId: prefillBookingId || "",
    linkedBookingType: prefillBookingType || "",
    linkedSegmentId: prefillSegmentId || "",
    containerNo: "",
    containerSize: "20'GP",
    commodityItems: "", shippingLine: "", vesselVoyage: "", blNumber: "",
    tabsBookingDate: "", tabsBookingTime: "",
    warehouseArrivalDate: "", warehouseArrivalTime: "",
    warehouseArrivals: [{ date: "", time: "" }],
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
    detentionStartDate: "", detentionStartTime: "", freeTime: "", containerYard: "", emptyReturnNote: "",
    otherFees: "",
    storageBeginDate: "", storageBeginTime: "",
    storagePaymentDate: "", storagePaymentTime: "",
    demurrageBeginDate: "", demurrageBeginTime: "",
    demurragePaymentDate: "", demurragePaymentTime: "",
    containerDamage: "", doDate: "", padlockDate: "", notes: "",
    plateNo: "", contact: "", driverHelperName: "", stickers: "",
    weighing: "", waitingFee: "", loadingDate: "", truckingAddress: "", truckingStatus: DEFAULT_TRUCKING_STATUS, inyardDate: "",
    truckingDate: new Date().toISOString().split("T")[0],
    createdAt: "", updatedAt: "",
  };
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CreateTruckingModal({
  isOpen, onClose, onSaved, existingRecord, prefillBookingId, prefillBookingType, prefillSegmentId,
}: CreateTruckingModalProps) {
  const [form, setForm] = useState<TruckingRecord>(
    existingRecord ? { ...existingRecord } : makeNewRecord(prefillBookingId, prefillBookingType, prefillSegmentId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [nextRefNumber, setNextRefNumber] = useState<number | null>(null);
  const [refYear, setRefYear] = useState(String(new Date().getFullYear()));
  const [autoFilledFields, setAutoFilledFields] = useState<Record<string, boolean>>({});
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [linkedBookingData, setLinkedBookingData] = useState<any>(null);
  const [existingTruckingRecords, setExistingTruckingRecords] = useState<TruckingRecord[]>([]);
  const [alreadyLinkedContainerNos, setAlreadyLinkedContainerNos] = useState<string[]>([]);
  const [selectedContainerNos, setSelectedContainerNos] = useState<string[]>([]);
  const hasPrefilled = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setForm(existingRecord ? { ...existingRecord } : makeNewRecord(prefillBookingId, prefillBookingType, prefillSegmentId));
      setAutoFilledFields({});
      setRefNumber(existingRecord ? (existingRecord.truckingRefNo || "").replace(/^TRK\s*\d{4}-/, "") : "");
      setNextRefNumber(null);
      setLinkedBookingData(null);
      setExistingTruckingRecords([]);
      setAlreadyLinkedContainerNos([]);
      setSelectedContainerNos([]);
      hasPrefilled.current = false;
    }
  }, [isOpen, existingRecord, prefillBookingId, prefillBookingType, prefillSegmentId]);

  // Fetch next available trucking ref number
  useEffect(() => {
    if (isOpen && !existingRecord) {
      fetch(`${API_BASE_URL}/next-ref/trucking`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      })
        .then((r) => r.json())
        .then((d) => { if (d.success) setNextRefNumber(d.nextNumber); })
        .catch(() => {});
    }
  }, [isOpen, existingRecord]);

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

  // Fetch existing trucking records for this booking to populate ContainerSelector
  useEffect(() => {
    if (isOpen && form.linkedBookingId && !existingRecord) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${form.linkedBookingId}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          const result = await res.json();
          if (result.success && Array.isArray(result.data)) {
            setExistingTruckingRecords(result.data);
            const linked = result.data.map((r: any) => r.containerNo || r.containers?.[0]?.containerNo).filter(Boolean);
            setAlreadyLinkedContainerNos(linked);
          }
        } catch (err) {
          console.error("Error fetching existing trucking records:", err);
        }
      })();
    }
  }, [isOpen, form.linkedBookingId, existingRecord]);

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

    // Loading Address from booking
    const loadingAddrVal = b.loadingAddress || b.loading_address || "";
    if (loadingAddrVal) filled.truckingAddress = true;

    // Loading Date from booking's loadingSchedule
    const loadingDateVal = b.loadingSchedule || b.loading_schedule || "";
    if (loadingDateVal) filled.loadingDate = true;

    // Container is selected via ContainerSelector — not auto-filled here

    setForm((prev) => ({
      ...prev,
      blNumber: blVal || prev.blNumber,
      commodityItems: commodityVal || prev.commodityItems,
      shippingLine: shippingVal || prev.shippingLine,
      vesselVoyage: vesselVal || prev.vesselVoyage,
      truckingAddress: loadingAddrVal || prev.truckingAddress,
      loadingDate: loadingDateVal || prev.loadingDate,
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

  // ─── Container selection & basis autofill ─────────────────────────────────
  const handleContainerSelected = (containerNos: string[], infos: ContainerInfo[]) => {
    setSelectedContainerNos(containerNos);
    if (infos.length === 1) {
      setForm((prev) => ({
        ...prev,
        containerNo: infos[0].containerNo,
        containerSize: infos[0].size,
      }));
    } else {
      setForm((prev) => ({ ...prev, containerNo: "", containerSize: "" }));
    }
  };

  const handleBasisSelected = (basisRecord: TruckingRecord) => {
    // Copy all operational fields — skip identity fields (id, truckingRefNo, containerNo, containerSize, linkedBookingId, linkedBookingType, createdAt, updatedAt, createdBy, remarks, notes)
    setForm((prev) => ({
      ...prev,
      // Booking details (already auto-filled from booking but basis may have better values)
      commodityItems: basisRecord.commodityItems || prev.commodityItems,
      shippingLine: basisRecord.shippingLine || prev.shippingLine,
      vesselVoyage: basisRecord.vesselVoyage || prev.vesselVoyage,
      blNumber: basisRecord.blNumber || prev.blNumber,
      // Tabs booking
      tabsBookingDate: basisRecord.tabsBookingDate || prev.tabsBookingDate,
      tabsBookingTime: basisRecord.tabsBookingTime || prev.tabsBookingTime,
      // Warehouse arrival
      warehouseArrivalDate: basisRecord.warehouseArrivalDate || prev.warehouseArrivalDate,
      warehouseArrivalTime: basisRecord.warehouseArrivalTime || prev.warehouseArrivalTime,
      warehouseArrivals: basisRecord.warehouseArrivals?.length ? [...basisRecord.warehouseArrivals] : prev.warehouseArrivals,
      // Delivery
      deliveryDrops: basisRecord.deliveryDrops?.length ? [...basisRecord.deliveryDrops] : prev.deliveryDrops,
      deliveryAddresses: basisRecord.deliveryAddresses?.length ? [...basisRecord.deliveryAddresses] : prev.deliveryAddresses,
      // Vendor & rates
      truckingVendor: basisRecord.truckingVendor || prev.truckingVendor,
      truckingRate: basisRecord.truckingRate || prev.truckingRate,
      dispatcher: basisRecord.dispatcher || prev.dispatcher,
      gatepass: basisRecord.gatepass || prev.gatepass,
      truckingSoa: basisRecord.truckingSoa || prev.truckingSoa,
      // Empty return
      emptyReturn: basisRecord.emptyReturn || prev.emptyReturn,
      emptyReturnLocations: basisRecord.emptyReturnLocations?.length ? [...basisRecord.emptyReturnLocations] : prev.emptyReturnLocations,
      detentionStartDate: basisRecord.detentionStartDate || prev.detentionStartDate,
      detentionStartTime: basisRecord.detentionStartTime || prev.detentionStartTime,
      freeTime: basisRecord.freeTime || prev.freeTime,
      containerYard: basisRecord.containerYard || prev.containerYard,
      emptyReturnNote: basisRecord.emptyReturnNote || prev.emptyReturnNote,
      // Remarks drops
      remarksDrops: basisRecord.remarksDrops?.length ? [...basisRecord.remarksDrops] : prev.remarksDrops,
      // Storage & demurrage
      otherFees: basisRecord.otherFees || prev.otherFees,
      storageBeginDate: basisRecord.storageBeginDate || prev.storageBeginDate,
      storageBeginTime: basisRecord.storageBeginTime || prev.storageBeginTime,
      storagePaymentDate: basisRecord.storagePaymentDate || prev.storagePaymentDate,
      storagePaymentTime: basisRecord.storagePaymentTime || prev.storagePaymentTime,
      demurrageBeginDate: basisRecord.demurrageBeginDate || prev.demurrageBeginDate,
      demurrageBeginTime: basisRecord.demurrageBeginTime || prev.demurrageBeginTime,
      demurragePaymentDate: basisRecord.demurragePaymentDate || prev.demurragePaymentDate,
      demurragePaymentTime: basisRecord.demurragePaymentTime || prev.demurragePaymentTime,
      containerDamage: basisRecord.containerDamage || prev.containerDamage,
      doDate: basisRecord.doDate || prev.doDate,
      padlockDate: basisRecord.padlockDate || prev.padlockDate,
      // Export-specific
      plateNo: basisRecord.plateNo || prev.plateNo,
      contact: basisRecord.contact || prev.contact,
      driverHelperName: basisRecord.driverHelperName || prev.driverHelperName,
      stickers: basisRecord.stickers || prev.stickers,
      weighing: basisRecord.weighing || prev.weighing,
      waitingFee: basisRecord.waitingFee || prev.waitingFee,
      loadingDate: basisRecord.loadingDate || prev.loadingDate,
      truckingAddress: basisRecord.truckingAddress || prev.truckingAddress,
      truckingStatus: basisRecord.truckingStatus || prev.truckingStatus,
      inyardDate: (basisRecord as any).inyardDate || prev.inyardDate,
    }));
    toast.success("Details copied from existing trucking record");
  };

  // ─── Warehouse Arrivals ────────────────────────────────────────────────────
  const warehouseArrivals = form.warehouseArrivals?.length ? form.warehouseArrivals : [{ date: form.warehouseArrivalDate || "", time: form.warehouseArrivalTime || "" }];
  const updateWarehouseArrival = (i: number, key: keyof WarehouseArrivalDrop, val: string) =>
    set("warehouseArrivals", warehouseArrivals.map((w, idx) => idx === i ? { ...w, [key]: val } : w));
  const removeWarehouseArrival = (i: number) => set("warehouseArrivals", warehouseArrivals.filter((_, idx) => idx !== i));

  // ─── Sync: adding a drop adds to ALL multi-drop sections simultaneously ──
  const addSyncedDrop = () => {
    setForm((prev) => {
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

  // ─── Drops ────────────────────────────────────────────────────────────────
  const addDrop = () => addSyncedDrop();
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
  const addAddress = () => addSyncedDrop();
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
  const addRemarksDrop = () => addSyncedDrop();
  const removeRemarksDrop = (i: number) => set("remarksDrops", remarksDrops.filter((_, idx) => idx !== i));
  const updateRemarksDrop = <K extends keyof RemarksDrop>(i: number, key: K, val: string) =>
    set("remarksDrops", remarksDrops.map((d, idx) => idx === i ? { ...d, [key]: val } : d));

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const wa = form.warehouseArrivals?.length ? form.warehouseArrivals : [{ date: form.warehouseArrivalDate, time: form.warehouseArrivalTime }];
      const payload = {
        ...form,
        truckingRefNo: `TRK ${refYear}-${refNumber.trim() || (nextRefNumber !== null ? String(nextRefNumber) : "1")}`,
        warehouseArrivals: wa,
        warehouseArrivalDate: wa[0]?.date || form.warehouseArrivalDate,
        warehouseArrivalTime: wa[0]?.time || form.warehouseArrivalTime,
        updatedAt: new Date().toISOString(),
        createdAt: form.createdAt || new Date().toISOString(),
      };
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
          borderLeft: "1px solid #E5E9F0",
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-10 py-8 border-b flex-shrink-0"
          style={{ borderColor: "#E5E9F0", backgroundColor: "#FFFFFF" }}
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-[#0F766E]/10"
              style={{ color: "#0A1D4D" }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: "#0A1D4D" }}>
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

            {/* ── Reference Number ── */}
            <div>
              <Label>Reference No.</Label>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "8px", alignItems: "end" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Prefix</span>
                  <div style={{ height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", display: "flex", alignItems: "center", color: "#12332B", backgroundColor: "#F9FAFB" }}>TRK</div>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Year</span>
                  <input value={refYear} onChange={e => setRefYear(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none" }} />
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: "2px" }}>Number</span>
                  <input value={refNumber} onChange={e => setRefNumber(e.target.value.replace(/\D/g, ""))} placeholder={nextRefNumber !== null ? String(nextRefNumber) : "…"} style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid #E5E9F0", fontSize: "14px", outline: "none" }} />
                </div>
              </div>
              <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                {`TRK ${refYear}-${refNumber || (nextRefNumber !== null ? nextRefNumber : "")}`}
              </p>
            </div>

            {/* ── DATE ── */}
            <div>
              <Label>Date</Label>
              <div className="w-64">
                <NeuronDatePicker value={form.truckingDate} onChange={(v) => set("truckingDate", v)} />
              </div>
            </div>

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

                {/* Container Selection — shown when a booking is linked */}
                {form.linkedBookingId && !existingRecord && (
                  <div style={{ marginBottom: "4px" }}>
                    <Label>Select Container</Label>
                    <ContainerSelector
                      bookingId={form.linkedBookingId}
                      mode="single"
                      alreadyLinkedContainerNos={alreadyLinkedContainerNos}
                      selectedContainerNos={selectedContainerNos}
                      onSelectionChange={handleContainerSelected}
                      existingTruckingRecords={existingTruckingRecords}
                      onBasisSelected={handleBasisSelected}
                    />
                  </div>
                )}

                {/* Read-only summary fields — shown when a booking is linked */}
                {!isLoadingBooking && linkedBookingData && form.linkedBookingId && (
                  <div
                    style={{
                      background: "#FAFBFC",
                      border: "1px solid #E5E9F0",
                      borderRadius: "8px",
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
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                          {linkedBookingData.customerName || linkedBookingData.client_name || linkedBookingData.clientName || "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                          {(form.linkedBookingType || "").toLowerCase().includes("export") ? "Shipper" : "Consignee"}
                        </div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                          {(form.linkedBookingType || "").toLowerCase().includes("export")
                            ? (linkedBookingData.shipper || "—")
                            : (linkedBookingData.consignee || "—")}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    

                    {/* Container (single) */}
                    {form.containerNo && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                            Container
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#0A1D4D" }}>
                            {form.containerNo || "—"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Size</div>
                          <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                            {form.containerSize || "—"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Commodity, Shipping Line, Vessel, BL */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity Items</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{form.commodityItems || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Shipping Line</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{form.shippingLine || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel / Voyage</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{form.vesselVoyage || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>B/L Number</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{form.blNumber || "—"}</div>
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
                      <Label>Inyard Status</Label>
                      <DateRow dateValue={form.inyardDate} onDateChange={(v) => set("inyardDate", v)} />
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
              <div className="space-y-4">
                {warehouseArrivals.map((wa, wi) => (
                  <div
                    key={wi}
                    className="rounded-xl p-5 space-y-4"
                    style={{ border: "1px solid #E5E9F0", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#0A1D4D" }}>Drop {wi + 1}</span>
                      {warehouseArrivals.length > 1 && <RemoveBtn onClick={() => removeWarehouseArrival(wi)} />}
                    </div>
                    <DateTimeRow
                      dateValue={wa.date} timeValue={wa.time}
                      onDateChange={(v) => updateWarehouseArrival(wi, "date", v)}
                      onTimeChange={(v) => updateWarehouseArrival(wi, "time", v)}
                    />
                  </div>
                ))}
                <AddLink onClick={addSyncedDrop}>Add Drop</AddLink>
              </div>
            </div>

            {/* ── DELIVERY SCHEDULE ── */}
            <div>
              <SectionHeader>Delivery Schedule</SectionHeader>
              <div className="space-y-4">
                {form.deliveryDrops.map((drop, di) => (
                  <div
                    key={di}
                    className="rounded-xl p-5 space-y-4"
                    style={{ border: "1px solid #E5E9F0", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#0A1D4D" }}>Drop {di + 1}</span>
                      {form.deliveryDrops.length > 1 && <RemoveBtn onClick={() => removeDrop(di)} />}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>Delivery Schedule Date</label>
                        <DateRow dateValue={drop.deliveryScheduleDate} onDateChange={(v) => updateDrop(di, "deliveryScheduleDate", v)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: "#667085", letterSpacing: "0.06em" }}>DEA Date</label>
                        <NeuronDatePicker value={drop.deaDate} onChange={(v) => updateDrop(di, "deaDate", v)} />
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
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}
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
                        style={{ borderColor: "#E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px" }}
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
                    style={{ border: "1px solid #E5E9F0", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#0A1D4D" }}>Address {ai + 1}</span>
                      {form.deliveryAddresses.length > 1 && <RemoveBtn onClick={() => removeAddress(ai)} />}
                    </div>

                    <div>
                      <Label>Full Address</Label>
                      <TextInput value={addr.address} onChange={(v) => updateAddress(ai, "address", v)} placeholder="Full address" />
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
                        style={{ borderColor: "#E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px" }}
                      />
                    </div>
                  </div>
                ))}
                <AddLink onClick={addAddress}>Add Address</AddLink>
              </div>
            </div>

            {/* ── RATE AND VENDOR ── */}
            <div>
              <SectionHeader>Rate and Vendor</SectionHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rate (₱)</Label>
                    <TextInput value={form.truckingRate} onChange={(v) => set("truckingRate", v)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Trucking Company</Label>
                    <VendorDropdown value={form.truckingVendor} onChange={(v) => set("truckingVendor", v)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SOA Number</Label>
                    <TextInput value={form.truckingSoa} onChange={(v) => set("truckingSoa", v)} placeholder="Enter SOA number" />
                  </div>
                </div>
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

            {/* ── Status ── */}
            <div>
              <SectionHeader>Status</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#344054" }}>
                  Trucking Status
                </label>
                <select
                  value={form.truckingStatus || DEFAULT_TRUCKING_STATUS}
                  onChange={(e) => setForm((prev) => ({ ...prev, truckingStatus: e.target.value }))}
                  style={{
                    padding: "10px 12px",
                    fontSize: "13px",
                    border: "1px solid #D0D5DD",
                    borderRadius: "8px",
                    color: "#0A1D4D",
                    background: "#FFFFFF",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {TRUCKING_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Remarks Drops — Start & Done date/time per drop */}
              <div className="mt-5 space-y-3">
                {remarksDrops.map((rd, ri) => (
                  <div
                    key={ri}
                    className="rounded-xl p-5 space-y-4"
                    style={{ border: "1px solid #E5E9F0", backgroundColor: "#FAFAFA" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "#0A1D4D" }}>Drop {ri + 1}</span>
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location</Label>
                    <NeuronDropdown value={form.emptyReturn} options={EMPTY_RETURN_OPTIONS} onChange={(v) => set("emptyReturn", v)} placeholder="Select location..." />
                  </div>
                  <div>
                    <Label>Free Time</Label>
                    <TextInput value={form.freeTime} onChange={(v) => set("freeTime", v)} placeholder="Enter free time" />
                  </div>
                </div>
                {(form.emptyReturn === "CY" || form.emptyReturn === "Pre-Advice CY") && (
                  <div>
                    <Label>Container Yard</Label>
                    <TextInput value={form.containerYard} onChange={(v) => set("containerYard", v)} placeholder="Enter container yard" />
                  </div>
                )}
                <DateTimeRow
                  dateValue={form.detentionStartDate} timeValue={form.detentionStartTime}
                  onDateChange={(v) => set("detentionStartDate", v)} onTimeChange={(v) => set("detentionStartTime", v)}
                  dateLabel="Detention Start"
                />
                <div>
                  <Label>Additional Note</Label>
                  <textarea
                    value={form.emptyReturnNote}
                    onChange={(e) => set("emptyReturnNote", e.target.value)}
                    rows={5}
                    placeholder="Enter any additional notes or instructions..."
                    className="w-full px-4 py-2.5 rounded-lg border resize-y"
                    style={{ borderColor: "#E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px" }}
                  />
                </div>
              </div>
            </div>

            {/* ── OTHER FEES ── */}
            <div>
              <SectionHeader>Other Fees</SectionHeader>
              <textarea
                value={form.otherFees}
                onChange={(e) => set("otherFees", e.target.value)}
                rows={5}
                placeholder="Describe other fees..."
                className="w-full px-4 py-2.5 rounded-lg border resize-y"
                style={{ borderColor: "#E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF", minHeight: "120px" }}
              />
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
                <DateTimeRow
                  dateValue={form.demurragePaymentDate} timeValue={form.demurragePaymentTime}
                  onDateChange={(v) => set("demurragePaymentDate", v)} onTimeChange={(v) => set("demurragePaymentTime", v)}
                  dateLabel="Demurrage Payment"
                />
              </div>
            </div>

            {/* ── ADDITIONAL INFO ── */}
            <div>
              <SectionHeader>Additional Info</SectionHeader>
              <div className="space-y-4">
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
                <div>
                  <Label>Container Damage</Label>
                  <TextInput value={form.containerDamage} onChange={(v) => set("containerDamage", v)} placeholder="Describe any damage" />
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
                style={{ borderColor: "#E5E9F0", fontSize: "14px", color: "#0A1D4D", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF" }}
              />
            </div>

            {/* bottom padding so last field isn't under footer */}
            <div style={{ height: "80px" }} />
          </form>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-10 py-5 flex items-center justify-end gap-3 flex-shrink-0"
          style={{ borderTop: "1px solid #E5E9F0", backgroundColor: "#FFFFFF" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: "#E5E9F0", color: "#667085", background: "#FFFFFF" }}
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