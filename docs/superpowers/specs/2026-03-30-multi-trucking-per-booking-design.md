# Multi-Trucking Per Booking — Design Spec

**Date:** 2026-03-30
**Status:** Draft

## Summary

Change the trucking model from 1 trucking record per booking to **1 trucking record per container**. A booking with 3 containers will have 3 independent trucking records, each with its own vendor, driver, delivery address, schedule, rates, and status tags. Update the TruckingTab to a list view, add a shared ContainerSelector component, and update voucher/expense flows to work with container-level trucking.

---

## 1. Data Model Changes

### TruckingRecord — single container

Replace `containers: ContainerEntry[]` with flat fields:

```ts
// BEFORE
containers: ContainerEntry[];  // array of { containerNo, size }

// AFTER
containerNo: string;     // e.g. "MSKU1234567"
containerSize: string;   // e.g. "40'GP"
```

All other fields stay the same — each trucking record already has its own vendor, driver, delivery address, schedule, rate, etc.

### Server KV — no structural change

Key pattern stays `trucking-record:{id}`. The GET endpoint's `?linkedBookingId=` filter already returns an array. No server-side migration needed — new records are created with flat container fields; any legacy records with `containers[]` are handled via a read-time shim that extracts `containers[0]`.

### Voucher — container linking

Add to the voucher data model:

```ts
// New fields on voucher (when category === "Trucking")
linkedContainerNos?: string[];      // e.g. ["MSKU1234567", "MSKU7654321"]
linkedTruckingRecordIds?: string[]; // IDs of the trucking records for those containers
```

This allows a single trucking voucher to cover 1 or many containers from the same booking.

---

## 2. Shared ContainerSelector Component

A reusable component used in both **trucking creation** and **voucher creation**.

**Location:** `src/components/selectors/ContainerSelector.tsx`

**Props:**
```ts
interface ContainerSelectorProps {
  bookingId: string;
  bookingType: string;
  // Containers already linked to trucking records (shown as disabled/checked)
  alreadyLinkedContainerNos?: string[];
  // Selection mode
  mode: "single" | "multi";
  // Callbacks
  onSelect: (selected: ContainerInfo[]) => void;
  // Optional: for trucking creation, show basis autofill picker
  showBasisPicker?: boolean;
  existingTruckingRecords?: TruckingRecord[];
  onBasisSelected?: (record: TruckingRecord) => void;
}
```

**Behavior:**
- Fetches the booking to get its containers list
- Renders a checkbox list of containers (containerNo + size)
- Already-linked containers: checked + disabled + grayed out label
- In `"single"` mode (trucking creation): exactly 1 container selectable
- In `"multi"` mode (voucher creation): multiple containers selectable
- When `showBasisPicker` is true: shows a "Copy details from" dropdown listing existing trucking records for this booking (labeled by containerNo), fires `onBasisSelected` to pre-fill the form

---

## 3. TruckingTab — List View Redesign

**Current:** Shows a single inline TruckingRecordDetails or empty state.

**New:** Shows a table/list of all trucking records for this booking (same pattern as VouchersTab / CollectionsTab).

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Trucking                              [+ New Trucking] │
├──────────┬──────────┬────────┬──────────┬───────────┤
│ Container │ Vendor   │ Driver │ Status   │ Rate      │
├──────────┼──────────┼────────┼──────────┼───────────┤
│ MSKU123.. │ XTC      │ J.Cruz │ 3 tags   │ ₱15,000   │
│ MSKU765.. │ XTC      │ M.Reyes│ 2 tags   │ ₱15,000   │
│ MSKU987.. │ —        │ —      │ —        │ —         │ (empty = not yet created)
└──────────┴──────────┴────────┴──────────┴───────────┘
```

**Table columns:** Container #, Container Size, Vendor, Driver, Delivery Address (truncated), Status Tags, Rate

**Row click:** Opens TruckingRecordDetails inline (same embedded behavior as today, but with a back arrow to return to the list).

**Empty containers row (stretch goal):** Optionally show unlinked containers from the booking as ghost rows with a "Create" action. This makes it visible which containers still need trucking. Can be deferred to a follow-up.

---

## 4. Trucking Creation Flow (Updated)

### Step 1: Open creation
User clicks "+ New Trucking" from TruckingTab list (or from the standalone Trucking module).

### Step 2: Link booking (if not already in context)
Same BookingSelector as today. When opened from a booking's TruckingTab, the booking is pre-linked.

### Step 3: Container selection
ContainerSelector appears in `"single"` mode:
- Shows all containers from the booking
- Already-linked containers are disabled
- User picks exactly 1 container

### Step 4: Basis autofill (optional)
If other trucking records exist for this booking:
- "Copy details from" dropdown appears, listing existing records by container number
- Selecting one pre-fills: vendor, driver, delivery addresses, rates, schedules, dispatcher, gatepass, etc.
- Container-specific fields (containerNo, containerSize) are NOT copied — they come from the selected container

### Step 5: Fill form and submit
User adjusts any pre-filled fields and submits. Creates 1 trucking record with the single container.

### Step 6: Repeat
User returns to TruckingTab list, clicks "+ New Trucking" again. The just-created container is now disabled in the selector. Autofill basis is always available.

---

## 5. Voucher Creation — Trucking Category Changes

### Current behavior
When category = "Trucking" and a booking is selected, the system fetches `trucking-records?linkedBookingId=X` and uses `data[0]` to populate delivery address and rate.

### New behavior

After selecting a booking:
1. ContainerSelector appears in `"multi"` mode
2. Shows all containers that have trucking records for this booking
3. User selects which container(s) this voucher covers
4. Selected trucking records' data is used:
   - Delivery/loading address: from the first selected record (or a summary if they differ)
   - Rate: sum of selected records' rates (or user can override)
5. Voucher is saved with `linkedContainerNos` and `linkedTruckingRecordIds`

---

## 6. Expense Creation — Trucking Line Item Changes

### Current behavior
Trucking = 1 line item, label generated by `generateImportStandardLabel("TRUCKING", booking, truckingVendor, containerCount)`.

### New behavior

When a trucking voucher is linked to an expense:
- **1 voucher = 1 line item** (unchanged)
- **Label auto-generated as:** `{Vendor} {containerCount}x{containerSize}`
  - Example: `XTC 2x40` (vendor "XTC", 2 containers, size 40')
  - Vendor and container info come from the voucher's `linkedTruckingRecordIds`
- **Unit price:** voucher line item amount **divided by** the number of linked containers
  - Example: voucher line item = ₱30,000, 2 containers → unit price = ₱15,000
- **Quantity:** number of containers (e.g., 2)
- So total = unit price × quantity = original voucher line item amount

This means `generateImportStandardLabel("TRUCKING", ...)` needs access to the voucher's linked trucking records to compute the label and per-container rate.

---

## 7. Files to Create or Modify

### New files
| File | Purpose |
|------|---------|
| `src/components/selectors/ContainerSelector.tsx` | Shared container picker (single/multi mode + basis autofill) |

### Modified files
| File | Change |
|------|--------|
| `src/types/operations.ts` | `TruckingBooking` — replace `containers[]` with `containerNo` + `containerSize`. Add `linkedContainerNos`/`linkedTruckingRecordIds` to voucher type |
| `src/components/operations/shared/TruckingTab.tsx` | Rewrite from single-record view to list/table view |
| `src/components/operations/CreateTruckingModal.tsx` | Remove multi-container entry, add ContainerSelector + basis autofill |
| `src/components/operations/TruckingRecordDetails.tsx` | Update container display from array to single fields |
| `src/components/operations/TruckingModule.tsx` | Update table columns (container # is now a single value, not array) |
| `src/components/accounting/CreateVoucherModal.tsx` | Add ContainerSelector for trucking vouchers |
| `src/components/accounting/ViewVoucherScreen.tsx` | Display linked containers, handle multiple trucking records |
| `src/components/accounting/CreateExpenseScreen.tsx` | Auto-generate `{Vendor} {count}x{size}` label, compute per-container unit price |
| `src/components/accounting/ExpenseCostingTables.tsx` | Update `generateImportStandardLabel("TRUCKING", ...)` to use voucher's container data |
| `src/supabase/functions/server/index.tsx` | Add read-time shim for legacy `containers[]`, update tag sync logic |

### Accounting module consumers (minor updates)
| File | Change |
|------|--------|
| `src/components/accounting/ViewExpenseScreen.tsx` | Handle multi-trucking records when displaying trucking info |

---

## 8. Migration / Backwards Compatibility

- **Legacy trucking records** with `containers[]`: server-side read shim extracts `containers[0]` into flat `containerNo`/`containerSize` fields. No batch migration needed.
- **Existing vouchers** without `linkedContainerNos`: treated as linked to all trucking records for that booking (graceful fallback).
- **No breaking API changes**: the `trucking-records` endpoints keep the same URL structure. The POST body just sends flat container fields instead of an array.

---

## 9. Out of Scope

- Splitting a trucking record (1 record into 2)
- Bulk-creating trucking records for all containers at once
- Per-container rate differences within a single voucher (all containers same size/rate)
- Ghost rows for unlinked containers in TruckingTab (nice-to-have, deferred)
