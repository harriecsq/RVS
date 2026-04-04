# Multi-Booking Number with Container Assignment — Export Bookings

**Date:** 2026-04-04
**Status:** Approved

## Problem

Shipping lines may split a shipment's containers across multiple booking confirmations. The current export booking model only supports a single `bookingNumber` string field, so users cannot represent this real-world scenario.

## Solution

Allow multiple booking numbers per export booking, each with an optional set of assigned containers drawn from the booking's container list.

## Data Model

### New type

```typescript
interface BookingNumberEntry {
  id: string;             // crypto.randomUUID()
  bookingNumber: string;  // shipping line booking confirmation number
  containerNos: string[]; // subset of the booking's container numbers
}
```

### Changes to BrokerageBooking

- Add `bookingNumbers?: BookingNumberEntry[]`
- Keep legacy `bookingNumber?: string` on the type for backward compatibility with existing data

### Backward Compatibility

- Existing bookings that have `bookingNumber` (string) but no `bookingNumbers` array render the legacy value as a single read-only row.
- New bookings and edits always write to `bookingNumbers` array.
- No KV migration needed — the store is schemaless JSON blobs.

## UI — Create Export Booking Panel

### Container list (unchanged)

The existing repeatable container number inputs at the top of the form remain as-is.

### Booking Numbers section

Replaces the single "Booking Number" text input. Placed in the same grid row alongside Shipping Line.

Each entry consists of:
1. **Text input** — the booking number string
2. **Container checkboxes** — one checkbox per container from the booking's container list
3. **Delete button** — removes the entry

Behavior:
- A container can only be assigned to **one** booking number at a time. Checking it in one entry automatically unchecks it from any other entry.
- Unassigned containers are allowed — no validation enforced.
- If no containers have been entered yet, show "No containers added" in place of checkboxes.
- An "+ Add Booking Number" button appends a new empty entry.
- Starts with one empty entry by default (matching current single-field UX).

### Submission

The `bookingData` payload sent to the server includes:
- `bookingNumbers`: the full `BookingNumberEntry[]` array
- `bookingNumber`: set to the first entry's value for legacy compatibility (or empty string if none)

## UI — Export Booking Details

### View mode

Each booking number displays as a labeled row:
- Booking number value on the left
- Assigned container numbers as inline pills/tags on the right
- If legacy `bookingNumber` exists with no `bookingNumbers` array, show as a single row

### Edit mode

Same repeatable UI as the create panel — text input + container checkboxes per entry, with add/delete controls.

### Saving edits

PATCH payload includes updated `bookingNumbers` array. The server stores it directly in the booking JSON blob.

## Files to modify

1. `src/types/operations.ts` — add `BookingNumberEntry` interface, add `bookingNumbers` to `BrokerageBooking`
2. `src/components/operations/CreateExportBookingPanel.tsx` — replace single booking number input with repeatable section
3. `src/components/operations/ExportBookingDetails.tsx` — update view and edit modes for booking numbers
4. `src/supabase/functions/server/index.tsx` — ensure `bookingNumbers` is persisted/returned (likely no change needed since KV stores full JSON)

## Out of scope

- Import bookings (different workflow, no booking number field currently)
- Validation requiring all containers be assigned
- Segment-level booking numbers (booking numbers live at the booking level, not per segment)
