# Export Trucking & Export Booking Status Lists

Date: 2026-04-15

## Goal

Replace the status dropdowns for:

1. Trucking records **linked to an export booking** — show a distinct 11-status list.
2. Export booking header status — replace the current 8-status list with a new 11-status list.

Trucking records linked to import bookings or with no linked booking keep the existing `TRUCKING_STATUS_OPTIONS`.

## New Status Lists

### Export-linked trucking

```
For Pullout
For TABS (Pick Up)
For TABS (Drop Off)
In Transit to the Warehouse
Arrived at Warehouse
Awaiting for Loading
Ongoing Loading
In Transit to Port
For Pre-Advise
Awaiting for Pre-Advise Approval
In Yard
```

Default on create (when linked booking is export): `"For Pullout"`.

### Export booking

```
For Lodgement and Portal
Awaiting for Final
Final - For Arrastre Payment
Arrastre Paid
Sent Draft Documents for Approval
Approved Documents
Sent FSI and DG Declaration
Draft BL Okay to Finalize
Awaiting Billing and Signed BL
Request for Telex
Form E Ongoing Process
```

## Changes

### `src/constants/truckingStatuses.ts`

Add alongside the existing constants (do not remove them):

- `EXPORT_TRUCKING_STATUS_OPTIONS` — 11 strings above.
- `EXPORT_TRUCKING_STATUS_COLORS` — one color per status, picked to match the existing NEURON palette.
- `isExportLinkedTrucking(linkedBookingType?)` — case-insensitive substring check for `"export"`.
- `getTruckingStatusOptions(linkedBookingType?)` — returns the export list or the default list.
- `getTruckingStatusColors(linkedBookingType?)` — returns the matching color map.

### `src/components/operations/TruckingRecordDetails.tsx`

- Replace the hardcoded `TRUCKING_STATUS_OPTIONS`/`TRUCKING_STATUS_COLORS` at the `HeaderStatusDropdown` call (~line 1229) with `getTruckingStatusOptions(currentRecord.linkedBookingType)` and `getTruckingStatusColors(...)`.

### `src/components/operations/TruckingModule.tsx`

- In the list-view row dropdown (~line 340), compute options and colors per row from its own `linkedBookingType`.

### `src/components/operations/CreateTruckingModal.tsx`

- Compute options/colors from the currently-selected linked booking's type. Fall back to the import list when no booking is selected.
- When the linked booking changes and the current status is not valid in the new list, reset to the new list's default.
- Replace the native `<select>` at ~line 1335 with the NEURON `StandardSelect` component (`src/components/design-system/StandardSelect.tsx`) so the dropdown matches the rest of the design system.

### `src/components/operations/ExportBookingDetails.tsx`

- Replace `EXPORT_STATUS_OPTIONS` (lines 444–453) with the new 11 statuses.
- Replace `EXPORT_STATUS_TEXT_COLORS` (lines 433–442) with colors for the new statuses.

### `src/components/operations/ExportBookings.tsx`

- Replace `EXPORT_STATUS_FILTER_OPTIONS` (lines 45–48) with the new 11 statuses so the tab filter matches.

## Out of Scope

- `LEGACY_EXPORT_STATUS_TO_TAGS` mapping — left as-is. It only maps already-saved legacy values for display; new bookings won't use those strings.
- Server-side validation / migrations of existing booking `status` values. Existing records keep whatever value they have; UI will display the raw string even if it's no longer in the list.
- Import trucking and unlinked trucking status options — unchanged.
