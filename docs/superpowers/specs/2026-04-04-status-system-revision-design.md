# Status System Revision — Import & Trucking

## Summary

Revise the status system for Import and Trucking modules to clearly separate three concerns:

1. **Shipment Milestones** — a fixed set of 13 events with user-editable date/time and notes, synced between import and trucking via the linked booking.
2. **Shipment Status Tags** — multi-select tags describing what the shipment is currently waiting for, synced between import and trucking (existing behavior, unchanged).
3. **Trucking Status** — a single-select dropdown independent to each trucking record, replacing the current multi-tag operational layer.

## Data Model

### ShipmentEvent

```typescript
interface ShipmentEvent {
  event: string;    // one of the 13 standard keys
  dateTime: string; // ISO 8601, user-selected (not auto-recorded)
  note: string;     // optional free text
}
```

Stored as `shipmentEvents: ShipmentEvent[]` on the import/export booking object. Only events that have been filled in are present in the array. Unfilled events are simply absent.

### Standard Event Keys (fixed, no enforced order)

| Key              | Display Label     |
|------------------|-------------------|
| `draft`          | Draft             |
| `signed`         | Signed            |
| `stowaged`       | Stowaged          |
| `lodged`         | Lodged            |
| `final`          | Final             |
| `for-debit`      | For Debit         |
| `debited`        | Debited           |
| `discharged`     | Discharged        |
| `cro`            | CRO               |
| `web`            | WEB               |
| `ready-gatepass` | Ready Gatepass    |
| `delivered`      | Delivered         |
| `returned`       | Returned          |

### Shipment Status Tags (unchanged)

Multi-select tags on the booking object (`shipmentTags: string[]`). No date/time attached. Synced between import and trucking via linked booking. Existing `StatusTagBar` component, shipment layer only.

No changes to the tag definitions in `src/utils/statusTags.ts` for the shipment layer.

### Trucking Status (new single-select field)

Stored as `truckingStatus: string` on the trucking record. Replaces the current `remarks` array for operational status purposes.

Options (in display order):
1. Awaiting Trucking
2. Checking Trucking
3. Looking for a Truck
4. Requesting Rates
5. Booked
6. Schedule
7. Re-Schedule
8. Awaiting Address
9. Awaiting Schedule
10. Client Will Handle

Default on creation: `Awaiting Trucking`.

### Removals

- Remove "Client Will Handle the Trucking" tag from `src/utils/statusTags.ts` operational layer.
- The operational layer tags in `statusTags.ts` are replaced by the single-select `truckingStatus` field. Operational tags can be removed from the tag definitions.

## UI — Import Detail Screen

### Sub-tabs

The existing booking info section gains sub-tabs:

1. **Booking Details** — existing content (consignee, BL, vessel, commodity, etc.). No changes.
2. **Shipment Milestones** — new tab.

### Shipment Milestones Tab

A form displaying all 13 standard events as rows. Each row contains:

- **Event label** — read-only (e.g., "Signed", "Lodged")
- **Date/time input** — using the existing `DateTimeInput` component (`src/components/operations/shared/DateTimeInput.tsx`)
- **Note field** — single-line text input

All 13 rows are always visible (unfilled events show empty inputs, they are not hidden). The user fills in date/time + note as events occur, in any order.

Save persists all filled events to the booking's `shipmentEvents` array via `PUT /api/import-bookings/:id/shipment-events`.

### Shipment Status Tags (header)

Unchanged — `StatusTagBar` with shipment layer tags in the header area. Multi-select, synced with trucking.

### Legacy Status Dropdown — Removed

The `HeaderStatusDropdown` currently showing `IMPORT_STATUS_OPTIONS` ("For Gatepass", "Awaiting Discharge & CRO", etc.) is removed from the import detail header. Shipment tags (multi-select) remain as the primary status indicator in the header. The `src/constants/importStatuses.ts` file can be deleted.

## UI — Trucking Detail Screen

### Header — Two Status Boxes Side by Side

The header gains two visually distinct status sections, displayed side by side:

**Left box — "Shipment Status":**
- Multi-tag pills showing the linked booking's shipment tags
- Editable — changes sync back to the import booking (existing `StatusTagBar` behavior)
- If no booking is linked: shows disabled state with text "No linked booking"
- Small link icon or label indicating sync (e.g., "Synced with IMP 2026-0001")

**Right box — "Trucking Status":**
- Single-select dropdown using `HeaderStatusDropdown` component
- Shows the 10 trucking status options listed above
- Local to the trucking record, no sync
- Default: "Awaiting Trucking"

### New Tab — Shipment Milestones

Placed to the left of the existing Attachments tab.

Same layout as the import version — 13 events with date/time + note fields. Reads and writes the linked booking's `shipmentEvents` via `PUT /api/trucking-records/:id/update-booking-events`.

Disabled (read-only or hidden) if no booking is linked.

### Removal of Operational Tag UI

The current `StatusTagBar` operational layer (multi-tag pills for "Booked", "Schedule", etc.) is removed from the trucking detail screen. Replaced by the single-select "Trucking Status" dropdown in the header.

## Server Changes

### New Endpoints

**`PUT /api/import-bookings/:id/shipment-events`**
- Body: `{ shipmentEvents: ShipmentEvent[], user: string }`
- Validates event keys against the 13 standard keys
- Replaces the booking's `shipmentEvents` array
- Updates `updatedAt` timestamp
- Returns updated booking

**`PUT /api/trucking-records/:id/update-booking-events`**
- Body: `{ shipmentEvents: ShipmentEvent[], user: string }`
- Validates the trucking record has a `linkedBookingId`
- Fetches the linked booking, updates its `shipmentEvents`
- Persists the linked booking back to KV store
- Returns updated `shipmentEvents`

### Modified Endpoints

**`PUT /api/trucking-records/:id`**
- Now accepts `truckingStatus` as a string field
- The `remarks` field continues to exist for backward compatibility but is no longer the primary operational status

**`POST /api/trucking-records`**
- Sets `truckingStatus: "Awaiting Trucking"` as default if not provided

**`GET /api/trucking-records/:id` and `GET /api/trucking-records`**
- Enrichment already fetches linked booking data; ensure `shipmentEvents` is included in the enriched response

### Migration

Existing trucking records with operational tags in `remarks` are mapped to the closest `truckingStatus` value on read (lazy migration). Mapping: if `remarks` contains exactly one known operational tag key that matches a `TRUCKING_STATUS_OPTIONS` value, use it. Otherwise, default to "Awaiting Trucking". The `remarks` field is preserved as-is for backward compatibility but is no longer displayed in the UI. The `TruckingModule.tsx` list view switches from showing `StatusPill` (based on `remarks`) to showing the `truckingStatus` string.

## Sync Behavior

| Data | Stored On | Synced? | Mechanism |
|------|-----------|---------|-----------|
| Shipment Events | Import/Export booking (`shipmentEvents`) | Yes — import + trucking both read/write | Trucking writes via linked booking ID |
| Shipment Tags | Import/Export booking (`shipmentTags`) | Yes — import + trucking both read/write | Existing `update-booking-tags` endpoint |
| Trucking Status | Trucking record (`truckingStatus`) | No — trucking only | Direct field on trucking record |

## Constants & Type Changes

### New: `src/constants/shipmentEvents.ts`

```typescript
export const SHIPMENT_EVENT_KEYS = [
  "draft", "signed", "stowaged", "lodged", "final",
  "for-debit", "debited", "discharged", "cro", "web",
  "ready-gatepass", "delivered", "returned",
] as const;

export type ShipmentEventKey = (typeof SHIPMENT_EVENT_KEYS)[number];

export const SHIPMENT_EVENT_LABELS: Record<ShipmentEventKey, string> = {
  draft: "Draft",
  signed: "Signed",
  stowaged: "Stowaged",
  lodged: "Lodged",
  final: "Final",
  "for-debit": "For Debit",
  debited: "Debited",
  discharged: "Discharged",
  cro: "CRO",
  web: "WEB",
  "ready-gatepass": "Ready Gatepass",
  delivered: "Delivered",
  returned: "Returned",
};
```

### New: `src/constants/truckingStatuses.ts`

```typescript
export const TRUCKING_STATUS_OPTIONS = [
  "Awaiting Trucking",
  "Checking Trucking",
  "Looking for a Truck",
  "Requesting Rates",
  "Booked",
  "Schedule",
  "Re-Schedule",
  "Awaiting Address",
  "Awaiting Schedule",
  "Client Will Handle",
] as const;

export type TruckingStatus = (typeof TRUCKING_STATUS_OPTIONS)[number];

export const DEFAULT_TRUCKING_STATUS: TruckingStatus = "Awaiting Trucking";
```

### Modified: `src/utils/statusTags.ts`

- Remove all operational layer tags (they're replaced by the single-select `truckingStatus`)
- Remove "Client Will Handle the Trucking" entry
- Keep shipment layer tags unchanged

### Modified: `src/types/operations.ts`

- Add `ShipmentEvent` interface
- Add `shipmentEvents?: ShipmentEvent[]` to `BrokerageBooking` and export booking types
- Add `truckingStatus?: string` to trucking record type

## Files Affected

| File | Change |
|------|--------|
| `src/constants/shipmentEvents.ts` | New — event keys and labels |
| `src/constants/truckingStatuses.ts` | New — trucking status options |
| `src/types/operations.ts` | Add ShipmentEvent, update booking/trucking types |
| `src/utils/statusTags.ts` | Remove operational tags, remove "Client Will Handle the Trucking" |
| `src/utils/truckingTags.ts` | Update to reflect removal of operational tags |
| `src/components/operations/ImportBookingDetails.tsx` | Add sub-tabs, Shipment Milestones tab |
| `src/components/operations/TruckingRecordDetails.tsx` | Two status boxes in header, Shipment Milestones tab, replace operational tags with dropdown |
| `src/components/operations/TruckingModule.tsx` | Update list view status display for single truckingStatus |
| `src/components/operations/CreateTruckingModal.tsx` | Default truckingStatus, remove operational tag selector |
| `src/components/operations/shared/BookingInfoSubTabs.tsx` | Add sub-tab support if not already present |
| `src/components/shared/StatusTagBar.tsx` | Remove operational layer support (or keep for backward compat) |
| `src/supabase/functions/server/index.tsx` | New endpoints, modified endpoints, migration logic |
