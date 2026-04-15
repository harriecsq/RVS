# Export Status Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update trucking status options to branch by linked booking type (export vs. other), and replace the export booking status list in both the detail screen and list-view filter.

**Architecture:** Add a parallel `EXPORT_TRUCKING_STATUS_OPTIONS` constant and a pair of helper functions (`getTruckingStatusOptions`, `getTruckingStatusColors`) in `src/constants/truckingStatuses.ts`. Call sites (TruckingRecordDetails, TruckingModule list-view, CreateTruckingModal) use the helpers. Export booking detail + list-view replace their inline status constants with the new 11-item list. CreateTruckingModal swaps its native `<select>` for the NEURON `StandardSelect`.

**Tech Stack:** React 18 + TypeScript, Vite. No tests or linter; verification is via `npm run build` + manual UI check.

Spec: `docs/superpowers/specs/2026-04-15-export-status-lists-design.md`

---

## Files

- **Modify:** `src/constants/truckingStatuses.ts` — add export list, color map, and helpers
- **Modify:** `src/components/operations/TruckingRecordDetails.tsx` — use helpers at the `HeaderStatusDropdown` call
- **Modify:** `src/components/operations/TruckingModule.tsx` — per-row options/colors
- **Modify:** `src/components/operations/CreateTruckingModal.tsx` — contextual options + switch to `StandardSelect`; reset status on linked-booking change
- **Modify:** `src/components/operations/ExportBookingDetails.tsx` — replace `EXPORT_STATUS_OPTIONS` + `EXPORT_STATUS_TEXT_COLORS`
- **Modify:** `src/components/operations/ExportBookings.tsx` — replace `EXPORT_STATUS_FILTER_OPTIONS`

---

### Task 1: Add export trucking constants and helpers

**Files:**
- Modify: `src/constants/truckingStatuses.ts`

- [ ] **Step 1: Append export list, colors, and helpers to the file**

Append to `src/constants/truckingStatuses.ts` (below the existing `TRUCKING_STATUS_COLORS` block):

```ts
export const EXPORT_TRUCKING_STATUS_OPTIONS = [
  "For Pullout",
  "For TABS (Pick Up)",
  "For TABS (Drop Off)",
  "In Transit to the Warehouse",
  "Arrived at Warehouse",
  "Awaiting for Loading",
  "Ongoing Loading",
  "In Transit to Port",
  "For Pre-Advise",
  "Awaiting for Pre-Advise Approval",
  "In Yard",
] as const;

export type ExportTruckingStatus = (typeof EXPORT_TRUCKING_STATUS_OPTIONS)[number];

export const DEFAULT_EXPORT_TRUCKING_STATUS: ExportTruckingStatus = "For Pullout";

export const EXPORT_TRUCKING_STATUS_COLORS: Record<string, string> = {
  "For Pullout": "#6B7A76",
  "For TABS (Pick Up)": "#4285F4",
  "For TABS (Drop Off)": "#0E7490",
  "In Transit to the Warehouse": "#2563EB",
  "Arrived at Warehouse": "#10B981",
  "Awaiting for Loading": "#FBBC04",
  "Ongoing Loading": "#D97706",
  "In Transit to Port": "#0F766E",
  "For Pre-Advise": "#9900FF",
  "Awaiting for Pre-Advise Approval": "#B45309",
  "In Yard": "#16A34A",
};

export function isExportLinkedTrucking(linkedBookingType?: string): boolean {
  return (linkedBookingType || "").toLowerCase().includes("export");
}

export function getTruckingStatusOptions(linkedBookingType?: string): readonly string[] {
  return isExportLinkedTrucking(linkedBookingType)
    ? EXPORT_TRUCKING_STATUS_OPTIONS
    : TRUCKING_STATUS_OPTIONS;
}

export function getTruckingStatusColors(linkedBookingType?: string): Record<string, string> {
  return isExportLinkedTrucking(linkedBookingType)
    ? EXPORT_TRUCKING_STATUS_COLORS
    : TRUCKING_STATUS_COLORS;
}

export function getDefaultTruckingStatus(linkedBookingType?: string): string {
  return isExportLinkedTrucking(linkedBookingType)
    ? DEFAULT_EXPORT_TRUCKING_STATUS
    : DEFAULT_TRUCKING_STATUS;
}
```

Do NOT modify the existing `TRUCKING_STATUS_OPTIONS`, `DEFAULT_TRUCKING_STATUS`, or `TRUCKING_STATUS_COLORS`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/constants/truckingStatuses.ts
git commit -m "feat(trucking): add export-linked trucking status constants and helpers"
```

---

### Task 2: Wire TruckingRecordDetails header dropdown to helpers

**Files:**
- Modify: `src/components/operations/TruckingRecordDetails.tsx`

- [ ] **Step 1: Update the import**

Find the import at line 40:

```ts
import { TRUCKING_STATUS_OPTIONS, DEFAULT_TRUCKING_STATUS, TRUCKING_STATUS_COLORS, DROP_CYCLE_STATUSES } from "../../constants/truckingStatuses";
```

Replace with:

```ts
import {
  TRUCKING_STATUS_OPTIONS,
  DEFAULT_TRUCKING_STATUS,
  TRUCKING_STATUS_COLORS,
  DROP_CYCLE_STATUSES,
  getTruckingStatusOptions,
  getTruckingStatusColors,
  getDefaultTruckingStatus,
} from "../../constants/truckingStatuses";
```

- [ ] **Step 2: Update the HeaderStatusDropdown usage**

Find the block around line 1226–1232:

```tsx
<HeaderStatusDropdown
  currentStatus={currentRecord.truckingStatus || DEFAULT_TRUCKING_STATUS}
  displayLabel={truckingDisplayLabel}
  statusOptions={[...TRUCKING_STATUS_OPTIONS]}
  statusColorMap={TRUCKING_STATUS_COLORS}
  onStatusChange={handleTruckingStatusChange}
/>
```

Replace with:

```tsx
<HeaderStatusDropdown
  currentStatus={currentRecord.truckingStatus || getDefaultTruckingStatus(currentRecord.linkedBookingType)}
  displayLabel={truckingDisplayLabel}
  statusOptions={[...getTruckingStatusOptions(currentRecord.linkedBookingType)]}
  statusColorMap={getTruckingStatusColors(currentRecord.linkedBookingType)}
  onStatusChange={handleTruckingStatusChange}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/operations/TruckingRecordDetails.tsx
git commit -m "feat(trucking): show export-specific status options in record details"
```

---

### Task 3: Wire TruckingModule list-view dropdown to helpers

**Files:**
- Modify: `src/components/operations/TruckingModule.tsx`

- [ ] **Step 1: Read the current list-row dropdown**

Open the file and read the block around line 340. Locate the `TRUCKING_STATUS_OPTIONS.map(...)` usage and the color lookup; identify the enclosing row (the variable that represents the record, e.g. `record` or `row`). If the row exposes `linkedBookingType`, we'll use it.

- [ ] **Step 2: Update the import**

Find the import at line 16:

```ts
import { TRUCKING_STATUS_OPTIONS, TRUCKING_STATUS_COLORS, DROP_CYCLE_STATUSES } from "../../constants/truckingStatuses";
```

Replace with:

```ts
import {
  TRUCKING_STATUS_OPTIONS,
  TRUCKING_STATUS_COLORS,
  DROP_CYCLE_STATUSES,
  getTruckingStatusOptions,
  getTruckingStatusColors,
} from "../../constants/truckingStatuses";
```

- [ ] **Step 3: Swap the per-row dropdown to use helpers**

In the row rendering where `TRUCKING_STATUS_OPTIONS.map(...)` appears (around line 340), change:

```tsx
{TRUCKING_STATUS_OPTIONS.map((status) => (
```

to:

```tsx
{getTruckingStatusOptions(record.linkedBookingType).map((status) => (
```

And wherever `TRUCKING_STATUS_COLORS[...]` is used to look up a color **for that same row**, change it to:

```tsx
getTruckingStatusColors(record.linkedBookingType)[status]
```

(Use the actual row variable name from Step 1, e.g. `r`, `row`, `item`. The variable is whatever the enclosing `.map((record) => ...)` / `.map((row) => ...)` provides.)

Leave any color lookups that are NOT inside a row (e.g., used for a global legend) using `TRUCKING_STATUS_COLORS`.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/operations/TruckingModule.tsx
git commit -m "feat(trucking): show export-specific status options per row in list view"
```

---

### Task 4: CreateTruckingModal — contextual options and NEURON StandardSelect

**Files:**
- Modify: `src/components/operations/CreateTruckingModal.tsx`

- [ ] **Step 1: Update imports**

Find the import at line 27:

```ts
import { TRUCKING_STATUS_OPTIONS, DEFAULT_TRUCKING_STATUS } from "../../constants/truckingStatuses";
```

Replace with:

```ts
import {
  TRUCKING_STATUS_OPTIONS,
  DEFAULT_TRUCKING_STATUS,
  getTruckingStatusOptions,
  getDefaultTruckingStatus,
  isExportLinkedTrucking,
} from "../../constants/truckingStatuses";
```

Also add, near the other design-system imports in the same file (search for `from "../design-system"` — if present, extend it; otherwise add a new import):

```ts
import { StandardSelect } from "../design-system/StandardSelect";
```

- [ ] **Step 2: Reset status when the linked booking type changes**

Find the place where the linked booking is set on the form (search for `linkedBookingType` or `linkedBookingId` within the form-update handlers). When the linked booking is selected/changed and the new booking type is passed into the form, after the existing setter add:

```ts
setForm((prev) => {
  const nextOptions = getTruckingStatusOptions(nextLinkedBookingType);
  const currentStatus = prev.truckingStatus;
  if (!currentStatus || !nextOptions.includes(currentStatus as any)) {
    return { ...prev, truckingStatus: getDefaultTruckingStatus(nextLinkedBookingType) };
  }
  return prev;
});
```

Where `nextLinkedBookingType` is the booking type being applied (the same string that gets written to `form.linkedBookingType`).

If there is no centralized handler and the linked booking type is set in multiple places, apply the same reset logic at each call site. Read the file first and identify ALL such sites before editing.

- [ ] **Step 3: Replace native select with StandardSelect**

Find the native `<select>` block around lines 1335–1352:

```tsx
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
```

Replace with:

```tsx
<StandardSelect
  value={form.truckingStatus || getDefaultTruckingStatus(form.linkedBookingType)}
  onChange={(value) => setForm((prev) => ({ ...prev, truckingStatus: value }))}
  options={getTruckingStatusOptions(form.linkedBookingType).map((status) => ({ value: status, label: status }))}
/>
```

If the enclosing `<div>` provided its own label above the select (e.g., a "Status" label sibling), leave that label intact. If the label was rendered via a prop on `<select>`, migrate it via `StandardSelect`'s `label` prop instead.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual UI check**

Start dev server (`npm run dev`) and open the Create Trucking modal:
- With no booking linked: status dropdown shows the original 14-item list, default `"Awaiting Trucking"`.
- Link an **export** booking: dropdown swaps to the 11 export statuses, status resets to `"For Pullout"`.
- Link an **import** booking: dropdown swaps back to the 14-item list, status resets to `"Awaiting Trucking"`.
- Dropdown visually matches other `StandardSelect` usages in the form.

- [ ] **Step 6: Commit**

```bash
git add src/components/operations/CreateTruckingModal.tsx
git commit -m "feat(trucking): contextual status options + StandardSelect in create modal"
```

---

### Task 5: Replace export booking detail status constants

**Files:**
- Modify: `src/components/operations/ExportBookingDetails.tsx`

- [ ] **Step 1: Replace `EXPORT_STATUS_TEXT_COLORS` (lines 433–442)**

Find:

```ts
const EXPORT_STATUS_TEXT_COLORS: Record<string, string> = {
  "Draft": "#6B7280",
  "For Approval": "#B45309",
  "Approved": "#4285F4",
  "In Transit": "#F25C05",
  "Delivered": "#10B981",
  "Completed": "#10B981",
  "On Hold": "#B45309",
  "Cancelled": "#EA4335",
};
```

Replace with:

```ts
const EXPORT_STATUS_TEXT_COLORS: Record<string, string> = {
  "For Lodgement and Portal": "#6B7A76",
  "Awaiting for Final": "#FBBC04",
  "Final - For Arrastre Payment": "#B45309",
  "Arrastre Paid": "#10B981",
  "Sent Draft Documents for Approval": "#4285F4",
  "Approved Documents": "#0F766E",
  "Sent FSI and DG Declaration": "#9900FF",
  "Draft BL Okay to Finalize": "#0E7490",
  "Awaiting Billing and Signed BL": "#D97706",
  "Request for Telex": "#2563EB",
  "Form E Ongoing Process": "#16A34A",
};
```

- [ ] **Step 2: Replace `EXPORT_STATUS_OPTIONS` (lines 444–453)**

Find:

```ts
const EXPORT_STATUS_OPTIONS = [
  "Draft",
  "For Approval",
  "Approved",
  "In Transit",
  "Delivered",
  "Completed",
  "On Hold",
  "Cancelled"
];
```

Replace with:

```ts
const EXPORT_STATUS_OPTIONS = [
  "For Lodgement and Portal",
  "Awaiting for Final",
  "Final - For Arrastre Payment",
  "Arrastre Paid",
  "Sent Draft Documents for Approval",
  "Approved Documents",
  "Sent FSI and DG Declaration",
  "Draft BL Okay to Finalize",
  "Awaiting Billing and Signed BL",
  "Request for Telex",
  "Form E Ongoing Process",
];
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/operations/ExportBookingDetails.tsx
git commit -m "feat(export): replace booking status list in detail header"
```

---

### Task 6: Replace export bookings list-view filter options

**Files:**
- Modify: `src/components/operations/ExportBookings.tsx`

- [ ] **Step 1: Replace `EXPORT_STATUS_FILTER_OPTIONS` (lines 45–48)**

Find:

```ts
const EXPORT_STATUS_FILTER_OPTIONS = [
  "Draft", "For Approval", "Approved", "In Transit",
  "Delivered", "Completed", "On Hold", "Cancelled",
];
```

Replace with:

```ts
const EXPORT_STATUS_FILTER_OPTIONS = [
  "For Lodgement and Portal",
  "Awaiting for Final",
  "Final - For Arrastre Payment",
  "Arrastre Paid",
  "Sent Draft Documents for Approval",
  "Approved Documents",
  "Sent FSI and DG Declaration",
  "Draft BL Okay to Finalize",
  "Awaiting Billing and Signed BL",
  "Request for Telex",
  "Form E Ongoing Process",
];
```

Do NOT touch `LEGACY_EXPORT_STATUS_TO_TAGS` — per the spec it stays as-is for already-saved data.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual UI check**

Start dev server (`npm run dev`) and open the Export Bookings list view. Confirm the status tabs/filter dropdown shows the 11 new values. Confirm the detail header dropdown also shows the new values and saving one persists correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/operations/ExportBookings.tsx
git commit -m "feat(export): replace status filter options in list view"
```

---

## Self-Review

- Spec coverage: Task 1 covers new constants/helpers; Task 2 covers `TruckingRecordDetails`; Task 3 covers `TruckingModule` list view; Task 4 covers `CreateTruckingModal` (contextual options + `StandardSelect`); Task 5 covers `ExportBookingDetails`; Task 6 covers `ExportBookings`. The `LEGACY_EXPORT_STATUS_TO_TAGS` section is explicitly out of scope per the spec and is left untouched.
- Placeholder scan: no TBD / TODO / "handle edge cases" language. Every code step shows full replacement code.
- Type consistency: helpers return `readonly string[]` and `Record<string, string>`; call sites either spread into arrays (`[...getTruckingStatusOptions(...)]`) or iterate with `.map(...)`.
