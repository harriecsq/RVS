# Multi-Trucking Per Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the trucking system from 1 trucking record per booking to 1 trucking record per container, with a list view in the TruckingTab, container selector with autofill-from-basis support, and updated voucher/expense integration.

**Architecture:** Each TruckingRecord stores a single container (flat `containerNo`/`containerSize` fields replacing the `containers[]` array). A shared `ContainerSelector` component is used in both trucking creation and voucher creation. The TruckingTab becomes a list/table view. Vouchers link to specific containers via `linkedContainerNos`/`linkedTruckingRecordIds`. Expense trucking line items auto-generate labels as `{Vendor} {count}x{size}` with per-container unit pricing.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Hono (Deno), Supabase KV Store

**Spec:** `docs/superpowers/specs/2026-03-30-multi-trucking-per-booking-design.md`

---

## Task 1: Update TruckingRecord type — single container model

**Files:**
- Modify: `src/components/operations/CreateTruckingModal.tsx:28-83` (ContainerEntry interface + TruckingRecord interface)

- [ ] **Step 1: Update TruckingRecord interface**

In `src/components/operations/CreateTruckingModal.tsx`, replace the `containers` array field with flat container fields. Keep the `ContainerEntry` interface (still useful for booking container parsing) but change `TruckingRecord`:

```tsx
// BEFORE (line 83):
containers: ContainerEntry[];

// AFTER — replace that single line with:
containerNo: string;
containerSize: string;
```

- [ ] **Step 2: Update `makeNewRecord` default values**

In `src/components/operations/CreateTruckingModal.tsx` at line ~511, replace the containers default:

```tsx
// BEFORE:
containers: [{ containerNo: "", size: "20'GP" }],

// AFTER:
containerNo: "",
containerSize: "20'GP",
```

- [ ] **Step 3: Remove multi-container helper functions**

In `src/components/operations/CreateTruckingModal.tsx`, remove these functions (lines ~735-742):

```tsx
// DELETE these lines:
const addContainer = () => set("containers", [...form.containers, { containerNo: "", size: "20'GP" }]);
const removeContainer = (i: number) => set("containers", form.containers.filter((_, idx) => idx !== i));
const updateContainer = (i: number, key: keyof ContainerEntry, val: string) => {
  set("containers", form.containers.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  if (autoFilledFields.containers) {
    setAutoFilledFields((prev) => ({ ...prev, containers: false }));
  }
};
```

- [ ] **Step 4: Update `applyBookingData` auto-fill logic**

In `src/components/operations/CreateTruckingModal.tsx`, the `applyBookingData` function (line ~620) currently builds a `containersVal` array and sets `form.containers`. Change this so it does NOT auto-fill container fields — the container will be selected explicitly via ContainerSelector (Task 3). Remove lines 678-710 that build `containersVal` and set `containers` in the form. The BL, commodity, shipping line, and vessel auto-fill should remain.

Replace the setForm call (lines 702-709) to remove the containers line:

```tsx
setForm((prev) => ({
  ...prev,
  blNumber: blVal || prev.blNumber,
  commodityItems: commodityVal || prev.commodityItems,
  shippingLine: shippingVal || prev.shippingLine,
  vesselVoyage: vesselVal || prev.vesselVoyage,
  // containers line removed — container is selected via ContainerSelector
}));
```

- [ ] **Step 5: Update the container display section in the form JSX**

In `src/components/operations/CreateTruckingModal.tsx`, find the containers rendering section (lines ~958-990 with `form.containers.map`). Replace it with simple read-only display fields for the selected container:

```tsx
{/* Container (selected via ContainerSelector) */}
<div style={{ marginBottom: "16px" }}>
  <SectionHeader>Container</SectionHeader>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
    <div>
      <Label>Container No.</Label>
      <TextInput
        value={form.containerNo}
        onChange={(v) => set("containerNo", v)}
        placeholder="e.g. MSKU1234567"
        disabled={!!form.linkedBookingId}
      />
    </div>
    <div>
      <Label>Size</Label>
      <TextInput
        value={form.containerSize}
        onChange={(v) => set("containerSize", v)}
        placeholder="e.g. 40'HC"
        disabled={!!form.linkedBookingId}
      />
    </div>
  </div>
</div>
```

- [ ] **Step 6: Verify build compiles**

Run: `npm run build`
Expected: Compilation may show errors in `TruckingModule.tsx` and `TruckingRecordDetails.tsx` referencing `record.containers` — these will be fixed in later tasks.

- [ ] **Step 7: Commit**

```bash
git add src/components/operations/CreateTruckingModal.tsx
git commit -m "refactor: change TruckingRecord from containers array to single container fields"
```

---

## Task 2: Update TruckingModule (standalone list) for single-container model

**Files:**
- Modify: `src/components/operations/TruckingModule.tsx:666-715` (table row rendering)

- [ ] **Step 1: Update table columns**

In `src/components/operations/TruckingModule.tsx`, update the table header (line ~638) to show "Container #" and "Size" as separate columns instead of a combined containers column. Replace the column headers array:

```tsx
{[
  "Trucking Ref #",
  "BL Number",
  "Container #",
  "Size",
  "Trucking Vendor",
  "Created",
  "Status",
].map((col) => (
```

Update the `<colgroup>` (lines ~628-635) to match 7 columns:

```tsx
<colgroup>
  <col style={{ width: "13%" }} />
  <col style={{ width: "11%" }} />
  <col style={{ width: "12%" }} />
  <col style={{ width: "7%" }} />
  <col style={{ width: "10%" }} />
  <col style={{ width: "10%" }} />
  <col style={{ width: "37%" }} />
</colgroup>
```

- [ ] **Step 2: Update table row rendering**

In `src/components/operations/TruckingModule.tsx`, replace the container display logic in the row (lines ~667-670):

```tsx
// BEFORE:
const containers = r.containers || [];
const containerDisplay = containers.length === 0 ? "—"
  : containers.length === 1 ? (containers[0].containerNo || "—")
  : `${containers[0].containerNo || "—"} +${containers.length - 1}`;

// AFTER:
const containerDisplay = r.containerNo || (r as any).containers?.[0]?.containerNo || "—";
const sizeDisplay = r.containerSize || (r as any).containers?.[0]?.size || "—";
```

The `(r as any).containers?.[0]` fallback handles legacy records that haven't been re-saved yet.

Add a new `<td>` for size after the container # cell:

```tsx
<td style={truncCell} title={sizeDisplay !== "—" ? sizeDisplay : undefined}>
  {sizeDisplay}
</td>
```

- [ ] **Step 3: Update search filter**

In `src/components/operations/TruckingModule.tsx`, update the search filter (line ~476) to use flat fields instead of `r.containers?.some(...)`:

```tsx
// BEFORE:
r.containers?.some((c) => c.containerNo.toLowerCase().includes(s))

// AFTER:
r.containerNo?.toLowerCase().includes(s)
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/operations/TruckingModule.tsx
git commit -m "refactor: update TruckingModule table for single-container model"
```

---

## Task 3: Create ContainerSelector component

**Files:**
- Create: `src/components/selectors/ContainerSelector.tsx`

This is the shared component used by both trucking creation (single-select + basis picker) and voucher creation (multi-select).

- [ ] **Step 1: Create ContainerSelector component**

Create `src/components/selectors/ContainerSelector.tsx`:

```tsx
/**
 * ContainerSelector — shared component for selecting containers from a booking.
 * Used in trucking creation (single-select + basis autofill) and voucher creation (multi-select).
 */
import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import type { TruckingRecord } from "../operations/CreateTruckingModal";

interface ContainerInfo {
  containerNo: string;
  size: string;
}

interface ContainerSelectorProps {
  /** Booking ID to fetch containers from */
  bookingId: string;
  /** Selection mode: single (trucking creation) or multi (voucher creation) */
  mode: "single" | "multi";
  /** Container numbers already linked to trucking records (shown as disabled) */
  alreadyLinkedContainerNos?: string[];
  /** Currently selected container numbers */
  selectedContainerNos: string[];
  /** Callback when selection changes */
  onSelectionChange: (containerNos: string[], containers: ContainerInfo[]) => void;
  /** Existing trucking records for this booking — used for basis autofill picker */
  existingTruckingRecords?: TruckingRecord[];
  /** Callback when user selects a basis record to autofill from */
  onBasisSelected?: (record: TruckingRecord) => void;
}

export function ContainerSelector({
  bookingId,
  mode,
  alreadyLinkedContainerNos = [],
  selectedContainerNos,
  onSelectionChange,
  existingTruckingRecords = [],
  onBasisSelected,
}: ContainerSelectorProps) {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (bookingId) fetchContainers();
  }, [bookingId]);

  const fetchContainers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        const b = result.data;
        const parsed = parseContainersFromBooking(b);
        setContainers(parsed);
      }
    } catch (err) {
      console.error("Error fetching booking containers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Parse containers from booking data — handles all known field variants */
  function parseContainersFromBooking(b: any): ContainerInfo[] {
    const extractSize = (s: string): string => {
      if (!s) return "20'GP";
      if (s.includes("'")) return s;
      const upper = s.toUpperCase();
      if (upper.includes("40RH") || upper.includes("REEFER")) return "40'RF";
      if (upper.includes("40HC")) return "40'HC";
      if (upper.includes("40HQ")) return "40'HQ";
      if (upper.includes("40SD")) return "40'SD";
      if (upper.includes("40GP")) return "40'GP";
      if (upper.includes("40")) return "40'HC";
      if (upper.includes("20HC")) return "20'HC";
      if (upper.includes("20HQ")) return "20'HQ";
      if (upper.includes("20GP")) return "20'GP";
      if (upper.includes("20")) return "20'GP";
      return "20'GP";
    };

    const rawContainers = b.containers || b.containerNo || b.container_no || b.containerNumber || b.container_number || "";
    const rawVolume = b.volume_containers || b.volume || b.measurement || "";

    if (rawContainers) {
      if (Array.isArray(rawContainers)) {
        return rawContainers.map((c: any) => ({
          containerNo: typeof c === "string" ? c : (c.containerNo || c.container_no || c.containerNumber || ""),
          size: typeof c === "string" ? extractSize(rawVolume) : (c.size || c.containerSize || extractSize(rawVolume)),
        }));
      } else if (typeof rawContainers === "string" && rawContainers.trim()) {
        const parts = rawContainers.split(",").map((s: string) => s.trim()).filter(Boolean);
        const size = extractSize(rawVolume);
        return parts.map((p: string) => ({ containerNo: p, size }));
      }
    }

    // Fallback: parse volume string like "2x40'HC" to create placeholder entries
    if (rawVolume) {
      const match = rawVolume.match(/(\d+)\s*[xX]\s*(.*)/);
      if (match) {
        const count = parseInt(match[1], 10);
        const size = extractSize(match[2]);
        return Array(count).fill(null).map((_, i) => ({ containerNo: `Container ${i + 1} (TBD)`, size }));
      }
    }

    return [];
  }

  const toggleContainer = (containerNo: string) => {
    if (alreadyLinkedContainerNos.includes(containerNo)) return;

    let newSelection: string[];
    if (mode === "single") {
      newSelection = selectedContainerNos.includes(containerNo) ? [] : [containerNo];
    } else {
      newSelection = selectedContainerNos.includes(containerNo)
        ? selectedContainerNos.filter((n) => n !== containerNo)
        : [...selectedContainerNos, containerNo];
    }

    const selectedInfos = containers.filter((c) => newSelection.includes(c.containerNo));
    onSelectionChange(newSelection, selectedInfos);
  };

  if (isLoading) {
    return <p style={{ fontSize: "13px", color: "#667085", padding: "8px 0" }}>Loading containers...</p>;
  }

  if (containers.length === 0) {
    return <p style={{ fontSize: "13px", color: "#667085", padding: "8px 0" }}>No containers found for this booking.</p>;
  }

  return (
    <div>
      {/* Container list */}
      <div style={{ border: "1px solid #E5E9F0", borderRadius: "8px", overflow: "hidden" }}>
        {containers.map((c) => {
          const isLinked = alreadyLinkedContainerNos.includes(c.containerNo);
          const isSelected = selectedContainerNos.includes(c.containerNo);
          const isDisabled = isLinked;

          return (
            <div
              key={c.containerNo}
              onClick={() => !isDisabled && toggleContainer(c.containerNo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderBottom: "1px solid #E5E9F0",
                cursor: isDisabled ? "not-allowed" : "pointer",
                backgroundColor: isSelected ? "#F0FDF4" : isDisabled ? "#F9FAFB" : "#FFFFFF",
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  flexShrink: 0,
                  border: `1.5px solid ${isSelected || isLinked ? "#0F766E" : "#D1D5DB"}`,
                  backgroundColor: isSelected || isLinked ? "#0F766E" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(isSelected || isLinked) && <Check size={11} color="white" />}
              </div>

              {/* Container info */}
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                  {c.containerNo}
                </span>
                <span style={{ fontSize: "13px", color: "#667085", marginLeft: "12px" }}>
                  {c.size}
                </span>
              </div>

              {/* Linked badge */}
              {isLinked && (
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#667085",
                  backgroundColor: "#F3F4F6",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}>
                  Trucking assigned
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Basis autofill picker — only shown when there are existing trucking records */}
      {onBasisSelected && existingTruckingRecords.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 500, color: "#667085", display: "block", marginBottom: "6px" }}>
            <Copy size={13} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Copy details from existing trucking record:
          </label>
          <select
            onChange={(e) => {
              const record = existingTruckingRecords.find((r) => r.id === e.target.value);
              if (record) onBasisSelected(record);
            }}
            defaultValue=""
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              backgroundColor: "#FFFFFF",
              color: "#0A1D4D",
              cursor: "pointer",
            }}
          >
            <option value="" disabled>Select a record to copy from...</option>
            {existingTruckingRecords.map((r) => (
              <option key={r.id} value={r.id}>
                {r.containerNo || "Unknown"} — {r.truckingVendor || "No vendor"} — {r.truckingRate ? `Rate: ${r.truckingRate}` : "No rate"}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export type { ContainerInfo };
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/selectors/ContainerSelector.tsx
git commit -m "feat: add ContainerSelector component for trucking and voucher container selection"
```

---

## Task 4: Integrate ContainerSelector into CreateTruckingModal

**Files:**
- Modify: `src/components/operations/CreateTruckingModal.tsx:538-565` (modal state and booking selection flow)

- [ ] **Step 1: Add container selection state and imports**

At the top of `CreateTruckingModal.tsx`, add the import:

```tsx
import { ContainerSelector } from "../selectors/ContainerSelector";
import type { ContainerInfo } from "../selectors/ContainerSelector";
```

Inside `CreateTruckingModal` function (after `const [linkedBookingData, setLinkedBookingData] = useState<any>(null);` at line ~547), add:

```tsx
const [existingTruckingRecords, setExistingTruckingRecords] = useState<TruckingRecord[]>([]);
const [alreadyLinkedContainerNos, setAlreadyLinkedContainerNos] = useState<string[]>([]);
const [selectedContainerNos, setSelectedContainerNos] = useState<string[]>([]);
```

- [ ] **Step 2: Fetch existing trucking records when booking is selected**

Add a new effect after the existing booking fetch effects (after line ~584):

```tsx
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
```

- [ ] **Step 3: Add basis autofill handler**

Add after the existing `handleBookingSelect` function:

```tsx
const handleBasisSelected = (basisRecord: TruckingRecord) => {
  setForm((prev) => ({
    ...prev,
    // Copy all operational fields from basis, keep container from selector
    truckingVendor: basisRecord.truckingVendor || prev.truckingVendor,
    dispatcher: basisRecord.dispatcher || prev.dispatcher,
    gatepass: basisRecord.gatepass || prev.gatepass,
    truckingRate: basisRecord.truckingRate || prev.truckingRate,
    truckingSoa: basisRecord.truckingSoa || prev.truckingSoa,
    deliveryDrops: basisRecord.deliveryDrops?.length ? [...basisRecord.deliveryDrops] : prev.deliveryDrops,
    deliveryAddresses: basisRecord.deliveryAddresses?.length ? [...basisRecord.deliveryAddresses] : prev.deliveryAddresses,
    emptyReturn: basisRecord.emptyReturn || prev.emptyReturn,
    emptyReturnLocations: basisRecord.emptyReturnLocations?.length ? [...basisRecord.emptyReturnLocations] : prev.emptyReturnLocations,
    plateNo: basisRecord.plateNo || prev.plateNo,
    contact: basisRecord.contact || prev.contact,
    driverHelperName: basisRecord.driverHelperName || prev.driverHelperName,
    truckingAddress: basisRecord.truckingAddress || prev.truckingAddress,
    // Do NOT copy: containerNo, containerSize, id, truckingRefNo, remarks, notes
  }));
  toast.success("Details copied from existing trucking record");
};

const handleContainerSelected = (containerNos: string[], infos: ContainerInfo[]) => {
  setSelectedContainerNos(containerNos);
  if (infos.length === 1) {
    setForm((prev) => ({
      ...prev,
      containerNo: infos[0].containerNo,
      containerSize: infos[0].size,
    }));
  } else {
    setForm((prev) => ({
      ...prev,
      containerNo: "",
      containerSize: "",
    }));
  }
};
```

- [ ] **Step 4: Add ContainerSelector to the form JSX**

In the form body, after the BookingSelector section and before the container display fields (from Task 1 Step 5), add the ContainerSelector. Find the booking selector section and add after it:

```tsx
{/* Container Selection — shown when a booking is linked */}
{form.linkedBookingId && !existingRecord && (
  <div style={{ marginBottom: "24px" }}>
    <SectionHeader>Select Container</SectionHeader>
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
```

- [ ] **Step 5: Reset container state when modal opens**

In the existing `useEffect` that resets form on open (line ~550-557), add resets:

```tsx
useEffect(() => {
  if (isOpen) {
    setForm(existingRecord ? { ...existingRecord } : makeNewRecord(prefillBookingId, prefillBookingType));
    setAutoFilledFields({});
    setLinkedBookingData(null);
    setExistingTruckingRecords([]);
    setAlreadyLinkedContainerNos([]);
    setSelectedContainerNos([]);
    hasPrefilled.current = false;
  }
}, [isOpen, existingRecord, prefillBookingId, prefillBookingType]);
```

- [ ] **Step 6: Verify build compiles and test manually**

Run: `npm run dev`
Test: Open the Trucking module, click "+ New Trucking", select a booking. The ContainerSelector should appear showing the booking's containers.

- [ ] **Step 7: Commit**

```bash
git add src/components/operations/CreateTruckingModal.tsx
git commit -m "feat: integrate ContainerSelector into trucking creation with basis autofill"
```

---

## Task 5: Rewrite TruckingTab as a list view

**Files:**
- Modify: `src/components/operations/shared/TruckingTab.tsx` (full rewrite)

- [ ] **Step 1: Rewrite TruckingTab to list/table view**

Replace the entire content of `src/components/operations/shared/TruckingTab.tsx` with a list view that follows the VouchersTab pattern:

```tsx
/**
 * TruckingTab — embedded tab inside Import/Export booking details.
 * Shows a table list of all trucking records for this booking (1 per container).
 * Clicking a row shows TruckingRecordDetails inline.
 */
import { useState, useEffect } from "react";
import { Plus, Truck, ArrowLeft } from "lucide-react";
import { publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "../../ui/toast-utils";
import { CreateTruckingModal } from "../CreateTruckingModal";
import { TruckingRecordDetails } from "../TruckingRecordDetails";
import type { TruckingRecord } from "../CreateTruckingModal";
import { TRUCKING_VENDORS, hexToRgba } from "../../../utils/truckingTags";
import { API_BASE_URL } from "@/utils/api-config";

interface TruckingTabProps {
  bookingId: string;
  bookingType: string;
  currentUser?: { name: string; email: string; department: string } | null;
  onBookingTagsUpdated?: () => void;
}

function VendorPill({ vendor }: { vendor: string }) {
  const v = TRUCKING_VENDORS.find((vv) => vv.name === vendor);
  if (!v) return <span style={{ fontSize: "13px", color: "#667085" }}>--</span>;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "5px",
      fontSize: "11px",
      fontWeight: 700,
      backgroundColor: hexToRgba(v.hex, 0.14),
      color: v.hex,
      border: `1px solid ${hexToRgba(v.hex, 0.36)}`,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap" as const,
    }}>
      {v.name}
    </span>
  );
}

export function TruckingTab({
  bookingId,
  bookingType,
  currentUser,
  onBookingTagsUpdated,
}: TruckingTabProps) {
  const [records, setRecords] = useState<TruckingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TruckingRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [bookingId]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setRecords(result.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Error fetching trucking records:", err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaved = () => {
    setShowCreate(false);
    fetchRecords();
    toast.success("Trucking record saved");
  };

  // Detail view — show selected record inline
  if (selectedRecord) {
    return (
      <>
        <TruckingRecordDetails
          record={selectedRecord}
          onBack={() => {
            setSelectedRecord(null);
            fetchRecords();
          }}
          onUpdate={fetchRecords}
          currentUser={currentUser}
          embedded
          onBookingTagsUpdated={onBookingTagsUpdated}
        />
        <CreateTruckingModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
          prefillBookingId={bookingId}
          prefillBookingType={bookingType}
        />
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
        <p style={{ color: "#667085", fontSize: "14px" }}>Loading trucking records...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0A1D4D", margin: 0 }}>
            Trucking Records
          </h3>
          <p style={{ fontSize: "13px", color: "#667085", margin: "2px 0 0" }}>
            {records.length} record{records.length !== 1 ? "s" : ""} linked to this booking
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            border: "none",
            borderRadius: "8px",
            background: "#0F766E",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> New Trucking
        </button>
      </div>

      {/* Empty state */}
      {records.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px" }}>
          <Truck size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>No trucking records</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>
            Add trucking assignments for each container.
          </p>
        </div>
      ) : (
        /* Table */
        <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E9F0", backgroundColor: "#F9FAFB" }}>
                {["Container #", "Size", "Vendor", "Driver / Plate", "Delivery Address", "Rate"].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#667085",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const containerNo = r.containerNo || (r as any).containers?.[0]?.containerNo || "--";
                const containerSize = r.containerSize || (r as any).containers?.[0]?.size || "--";
                const driverPlate = [r.driverHelperName, r.plateNo].filter(Boolean).join(" / ") || "--";
                const firstAddr = r.deliveryAddresses?.[0]?.address || r.truckingAddress || "--";
                const rate = r.truckingRate || "--";

                const cellStyle: React.CSSProperties = {
                  padding: "14px 16px",
                  fontSize: "13px",
                  color: "#0A1D4D",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "200px",
                };

                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    style={{
                      borderBottom: "1px solid #E5E9F0",
                      cursor: "pointer",
                      transition: "background-color 120ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F8F9FB"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}
                  >
                    <td style={{ ...cellStyle, fontWeight: 600 }}>{containerNo}</td>
                    <td style={cellStyle}>{containerSize}</td>
                    <td style={{ ...cellStyle, overflow: "visible" }}>
                      <VendorPill vendor={r.truckingVendor} />
                    </td>
                    <td style={cellStyle}>{driverPlate}</td>
                    <td style={cellStyle} title={firstAddr !== "--" ? firstAddr : undefined}>{firstAddr}</td>
                    <td style={cellStyle}>{rate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateTruckingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={handleSaved}
        prefillBookingId={bookingId}
        prefillBookingType={bookingType}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles and test**

Run: `npm run dev`
Test: Open an import/export booking, go to the Trucking tab. Should see table (or empty state). Click "+ New Trucking" and create a record. Should appear in the list. Click the row to view details.

- [ ] **Step 3: Commit**

```bash
git add src/components/operations/shared/TruckingTab.tsx
git commit -m "feat: rewrite TruckingTab as list/table view for multi-trucking support"
```

---

## Task 6: Update TruckingRecordDetails for single-container model

**Files:**
- Modify: `src/components/operations/TruckingRecordDetails.tsx`

- [ ] **Step 1: Find and update container display references**

Search for `containers` references in `TruckingRecordDetails.tsx` and update them to use flat fields. The key areas:

Find all `record.containers` or `currentRecord.containers` references and replace with `record.containerNo` / `record.containerSize` (or `currentRecord.containerNo` / `currentRecord.containerSize`).

For the container display in the detail view, where it maps over `containers[]` to show container pills/badges, replace with a single container display:

```tsx
// BEFORE (pattern like):
{currentRecord.containers?.map((c, i) => (
  <span key={i}>{c.containerNo} ({c.size})</span>
))}

// AFTER:
<span>{currentRecord.containerNo || "—"} ({currentRecord.containerSize || "—"})</span>
```

Also update any container summary lines like:
```tsx
// BEFORE:
const containerCount = currentRecord.containers?.length || 0;

// AFTER:
const containerCount = currentRecord.containerNo ? 1 : 0;
```

- [ ] **Step 2: Add legacy fallback for container fields**

At the top of the component where `currentRecord` is initialized/derived, add a normalization step:

```tsx
// Normalize legacy records that have containers[] instead of flat fields
const normalizeRecord = (r: TruckingRecord): TruckingRecord => {
  if (!r.containerNo && (r as any).containers?.length > 0) {
    return {
      ...r,
      containerNo: (r as any).containers[0].containerNo || "",
      containerSize: (r as any).containers[0].size || "",
    };
  }
  return r;
};
```

Apply this when setting current record state.

- [ ] **Step 3: Verify build compiles and test**

Run: `npm run dev`
Test: Click on a trucking record to view its details. Container should display correctly as a single entry.

- [ ] **Step 4: Commit**

```bash
git add src/components/operations/TruckingRecordDetails.tsx
git commit -m "refactor: update TruckingRecordDetails for single-container model with legacy fallback"
```

---

## Task 7: Add server-side read shim for legacy trucking records

**Files:**
- Modify: `src/supabase/functions/server/index.tsx:3486-3625` (trucking endpoints)

- [ ] **Step 1: Add normalization helper function**

Before the trucking endpoints (around line 3486), add a helper:

```tsx
/** Normalize legacy trucking records that use containers[] array to flat fields */
function normalizeTruckingRecord(record: any): any {
  if (!record) return record;
  if (!record.containerNo && Array.isArray(record.containers) && record.containers.length > 0) {
    return {
      ...record,
      containerNo: record.containers[0].containerNo || record.containers[0].container_no || "",
      containerSize: record.containers[0].size || record.containers[0].containerSize || "",
    };
  }
  return record;
}
```

- [ ] **Step 2: Apply normalization in GET endpoints**

In the GET all endpoint (line ~3508), apply normalization after fetching:

```tsx
// AFTER: let records = await kv.getByPrefix("trucking-record:");
records = records.map(normalizeTruckingRecord);
```

In the GET single endpoint (line ~3529), apply to the fetched record:

```tsx
// AFTER: const record = await kv.get(`trucking-record:${id}`);
const normalized = normalizeTruckingRecord(record);
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/supabase/functions/server/index.tsx
git commit -m "feat: add server-side normalization shim for legacy trucking records"
```

---

## Task 8: Update CreateVoucherModal — container selection for Trucking vouchers

**Files:**
- Modify: `src/components/accounting/CreateVoucherModal.tsx:254-396` (trucking data fetching + container state)

- [ ] **Step 1: Import ContainerSelector and add state**

Add import at top of `CreateVoucherModal.tsx`:

```tsx
import { ContainerSelector } from "../selectors/ContainerSelector";
import type { ContainerInfo } from "../selectors/ContainerSelector";
```

Add new state variables after the existing container state (line ~254):

```tsx
const [selectedTruckingContainerNos, setSelectedTruckingContainerNos] = useState<string[]>([]);
const [truckingRecordsForBooking, setTruckingRecordsForBooking] = useState<any[]>([]);
```

- [ ] **Step 2: Update trucking record fetching to get all records**

Replace `fetchTruckingRecordForBooking` (lines ~372-396) to fetch all trucking records and let the user select which containers:

```tsx
const fetchTruckingRecordsForBooking = async (bookingId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      setTruckingRecordsForBooking(result.data);
    } else {
      setTruckingRecordsForBooking([]);
    }
  } catch (error) {
    console.error("Error fetching trucking records:", error);
  }
};
```

Update the effect (lines ~359-370) to call the new function name:

```tsx
useEffect(() => {
  if (category === "Trucking" && selectedBooking) {
    const bookingId = selectedBooking.bookingId || selectedBooking.bookingNumber || selectedBooking.booking_number || selectedBooking.id;
    if (bookingId) {
      fetchTruckingRecordsForBooking(bookingId);
    } else {
      setTruckingRecordsForBooking([]);
    }
  } else {
    setTruckingRecordsForBooking([]);
    setSelectedTruckingContainerNos([]);
  }
}, [selectedBooking, category]);
```

- [ ] **Step 3: Compute trucking data from selected containers**

Add a derived computation after the fetching logic:

```tsx
// Derive trucking data from selected containers
useEffect(() => {
  if (selectedTruckingContainerNos.length === 0) {
    setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
    return;
  }
  const selectedRecords = truckingRecordsForBooking.filter((r: any) =>
    selectedTruckingContainerNos.includes(r.containerNo || r.containers?.[0]?.containerNo)
  );
  if (selectedRecords.length === 0) {
    setTruckingRecordData({ deliveryAddress: "", loadingAddress: "", truckingRate: "" });
    return;
  }
  // Use first record for address fields
  const first = selectedRecords[0];
  const addresses = (first.deliveryAddresses || []).map((a: any) => a.address).filter(Boolean);
  const deliveryAddress = addresses.join("; ");
  const loadingAddress = first.truckingAddress || "";
  // Sum rates across selected records
  const totalRate = selectedRecords.reduce((sum: number, r: any) => {
    const rate = parseFloat(String(r.truckingRate || "0").replace(/,/g, "")) || 0;
    return sum + rate;
  }, 0);
  setTruckingRecordData({ deliveryAddress, loadingAddress, truckingRate: String(totalRate) });
}, [selectedTruckingContainerNos, truckingRecordsForBooking]);
```

- [ ] **Step 4: Add ContainerSelector to voucher form JSX**

In the form, after the booking selector section and when `category === "Trucking"`, add the container selector. Find the location where the trucking delivery/rate info is displayed and add before it:

```tsx
{category === "Trucking" && selectedBooking && truckingRecordsForBooking.length > 0 && (
  <div style={{ marginBottom: "20px" }}>
    <label style={{ fontSize: "13px", fontWeight: 500, color: "#667085", display: "block", marginBottom: "8px" }}>
      Select Containers for this Voucher
    </label>
    <ContainerSelector
      bookingId={selectedBooking.bookingId || selectedBooking.bookingNumber || selectedBooking.id}
      mode="multi"
      selectedContainerNos={selectedTruckingContainerNos}
      onSelectionChange={(nos) => setSelectedTruckingContainerNos(nos)}
    />
  </div>
)}
```

- [ ] **Step 5: Include container data in voucher submission payload**

Find the submit handler and add `linkedContainerNos` and `linkedTruckingRecordIds` to the voucher payload:

```tsx
// Add to the voucher object being submitted:
linkedContainerNos: category === "Trucking" ? selectedTruckingContainerNos : undefined,
linkedTruckingRecordIds: category === "Trucking"
  ? truckingRecordsForBooking
      .filter((r: any) => selectedTruckingContainerNos.includes(r.containerNo || r.containers?.[0]?.containerNo))
      .map((r: any) => r.id)
  : undefined,
```

- [ ] **Step 6: Verify build compiles and test**

Run: `npm run dev`
Test: Create a Trucking voucher, select a booking that has trucking records. The ContainerSelector should appear in multi-select mode. Selecting containers should update the rate.

- [ ] **Step 7: Commit**

```bash
git add src/components/accounting/CreateVoucherModal.tsx
git commit -m "feat: add container selection to trucking voucher creation"
```

---

## Task 9: Update expense trucking line item label and pricing

**Files:**
- Modify: `src/components/accounting/ExpenseCostingTables.tsx:108-113` (TRUCKING label generation)
- Modify: `src/components/accounting/CreateExpenseScreen.tsx:180-199` (trucking data fetching)

- [ ] **Step 1: Update `generateImportStandardLabel` for TRUCKING**

In `src/components/accounting/ExpenseCostingTables.tsx`, update the TRUCKING case (lines 108-113):

```tsx
case "TRUCKING": {
  const vendor = truckingVendor || booking?.trucker || booking?.truckingVendor || "N/A";
  // If containerCount is available, generate "{vendor} {count}x{size}" label
  const rawVol = booking?.volume || "";
  const volMatch = rawVol.match(/^\d+x(.+)$/i);
  const volumeType = volMatch ? volMatch[1] : rawVol;
  if (containerCount && containerCount > 0 && volumeType) {
    return `${vendor} ${containerCount}x${volumeType}`;
  }
  const addr = booking?.destination || booking?.pod || "N/A";
  return `${vendor} Trucking - ${addr}`;
}
```

- [ ] **Step 2: Update voucher-to-expense line item mapping for trucking**

In the auto-mapping logic (around lines 336-368 in `ExpenseCostingTables.tsx`), when a voucher matched to TRUCKING has `linkedContainerNos`, use the container count to compute per-container amount:

Find the block where `matchedKey === "TRUCKING"` updates a standardized item and update:

```tsx
if (stdItem) {
  // If voucher has linked containers, compute per-container pricing
  const linkedContainers = (voucher as any).linkedContainerNos;
  const containerCount = Array.isArray(linkedContainers) ? linkedContainers.length : 1;
  stdItem.amount = amt; // Total amount from voucher line
  stdItem.voucherNo = vNo;
  stdItem.sourceVoucherLineItemId = sourceId;
  matchedKeys.add(matchedKey);

  // Update label with vendor + container info
  const voucherVendor = (voucher as any).payee || truckingVendor || "";
  if (voucherVendor && containerCount > 0) {
    const rawVol = booking?.volume || "";
    const volMatch = rawVol.match(/^\d+x(.+)$/i);
    const volumeType = volMatch ? volMatch[1] : rawVol;
    if (volumeType) {
      stdItem.particulars = `${voucherVendor} ${containerCount}x${volumeType}`;
    }
  }
}
```

- [ ] **Step 3: Update CreateExpenseScreen trucking data fetching**

In `src/components/accounting/CreateExpenseScreen.tsx`, update the trucking record fetch (lines ~180-199) to handle multiple records:

```tsx
// Fetch trucking records for this booking
const truckingRes = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${booking.id}`, {
  headers: { Authorization: `Bearer ${publicAnonKey}` },
});
const truckingResult = await truckingRes.json();
if (truckingResult.success && Array.isArray(truckingResult.data) && truckingResult.data.length > 0) {
  // Use first record for loading address, collect vendor from all
  const firstRecord = truckingResult.data[0];
  const truckingAddr = firstRecord.truckingAddress || firstRecord.trucking_address || "";
  if (truckingAddr) {
    setFormData(prev => ({ ...prev, loadingAddress: truckingAddr }));
  }
  const vendorName = firstRecord.vendorName || firstRecord.vendor_name || firstRecord.truckingVendor || firstRecord.trucker || "";
  if (vendorName) {
    setTruckingVendorForExpense(vendorName);
  }
}
```

- [ ] **Step 4: Verify build compiles and test**

Run: `npm run dev`
Test: Create an expense linked to a booking with trucking vouchers. The trucking line item should show the `{Vendor} {count}x{size}` label format.

- [ ] **Step 5: Commit**

```bash
git add src/components/accounting/ExpenseCostingTables.tsx src/components/accounting/CreateExpenseScreen.tsx
git commit -m "feat: update expense trucking line items with vendor+container label and per-container pricing"
```

---

## Task 10: Update ViewVoucherScreen and ViewExpenseScreen for multi-trucking

**Files:**
- Modify: `src/components/accounting/ViewVoucherScreen.tsx:320-350` (trucking record fetch)
- Modify: `src/components/accounting/ViewExpenseScreen.tsx:565-600` (trucking record fetch)

- [ ] **Step 1: Update ViewVoucherScreen trucking data display**

In `src/components/accounting/ViewVoucherScreen.tsx`, update the trucking record fetch (lines ~320-350) to handle multiple records. If the voucher has `linkedTruckingRecordIds`, filter to only those records:

```tsx
const response = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}`, {
  headers: { Authorization: `Bearer ${publicAnonKey}` },
});
const result = await response.json();
if (result.success && Array.isArray(result.data) && result.data.length > 0) {
  // If voucher has linked trucking record IDs, use those; otherwise use first
  const linkedIds = displayVoucher?.linkedTruckingRecordIds;
  let relevantRecords = result.data;
  if (Array.isArray(linkedIds) && linkedIds.length > 0) {
    relevantRecords = result.data.filter((r: any) => linkedIds.includes(r.id));
  }
  const truckingRecord = relevantRecords[0] || result.data[0];
  // ... rest of existing logic using truckingRecord
```

- [ ] **Step 2: Update ViewExpenseScreen trucking data handling**

In `src/components/accounting/ViewExpenseScreen.tsx`, update similarly at lines ~573. Same pattern — use first record for display but handle array properly:

```tsx
if (truckingResult.success && Array.isArray(truckingResult.data) && truckingResult.data.length > 0) {
  const truckingRecord = truckingResult.data[0];
  // ... existing logic
}
```

This section already accesses `data[0]` but should be verified to not break with the new normalized records.

- [ ] **Step 3: Verify build compiles and test**

Run: `npm run dev`
Test: View an existing voucher and expense that have trucking data. Verify display is correct.

- [ ] **Step 4: Commit**

```bash
git add src/components/accounting/ViewVoucherScreen.tsx src/components/accounting/ViewExpenseScreen.tsx
git commit -m "refactor: update voucher and expense views for multi-trucking record support"
```

---

## Task 11: End-to-end integration testing

- [ ] **Step 1: Test trucking creation flow**

1. Open an import booking with 3 containers
2. Go to Trucking tab — should show empty list with "+ New Trucking" button
3. Click "+ New Trucking" — booking is pre-linked
4. ContainerSelector should show 3 containers, all selectable
5. Select 1 container, fill out form, submit
6. Should return to list showing 1 row

- [ ] **Step 2: Test autofill from basis**

1. Click "+ New Trucking" again
2. ContainerSelector should show first container as disabled (already linked)
3. Select second container
4. "Copy details from" dropdown should show the first record
5. Select it — form should pre-fill with vendor, rate, addresses, etc.
6. Adjust delivery address if needed, submit
7. List should show 2 rows

- [ ] **Step 3: Test voucher container selection**

1. Create a Trucking voucher for the same booking
2. ContainerSelector should appear in multi-select mode
3. Select 2 containers
4. Rate should sum both trucking records' rates
5. Submit voucher

- [ ] **Step 4: Test expense line item generation**

1. Create/view expense for the same booking
2. Trucking line item should show label like "XTC 2x40'HC"
3. Amount should reflect the voucher's line item amount

- [ ] **Step 5: Test standalone Trucking module**

1. Open Operations > Trucking
2. Table should show individual rows per container (not combined)
3. Container # and Size should display correctly
4. Click a row — detail view should show single container info

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration testing fixes for multi-trucking feature"
```
