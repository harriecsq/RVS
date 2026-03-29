# Unified Status Tag System — Implementation Specification

## Goal

Replace the single-select status dropdowns in import and export bookings with a multi-tag system (modeled after trucking's existing `remarks: string[]` pattern), sync shipment-level tags between bookings and their linked trucking records, and persist an audit trail of all tag changes.

---

## Background & Current State

### How Statuses Work Today

There are three separate status systems that need to be unified:

**1. Import Bookings** (`src/components/operations/ImportBookingDetails.tsx`)
- Single-select dropdown from 10 options
- Status stored as a single string field `status` on `BrokerageBooking`
- Options: "For Gatepass", "Awaiting Discharge & CRO", "For Debit For Final", "For Lodgement", "Awaiting Stowage", "With Stowage / Discharged & Awaiting Signed Docs", "With ETA", "Without ETA", "Delivered", "Returned"
- Color maps: `IMPORT_STATUS_COLORS` (line 163), `IMPORT_STATUS_TEXT_COLORS` (line 176)
- Change handler: `handleStatusChange()` (lines 214-250) — calls PUT/PATCH to backend
- State: `showStatusDropdown` (line 155)

**2. Export Bookings** (`src/components/operations/ExportBookingDetails.tsx`)
- Single-select dropdown from 8 `ExecutionStatus` values
- Options: Draft, For Approval, Approved, In Transit, Delivered, Completed, On Hold, Cancelled
- Color maps: `EXPORT_STATUS_COLORS`, `EXPORT_STATUS_TEXT_COLORS`
- Change handler: `handleStatusChange()` (lines 310-346)
- `ExecutionStatus` type also defined locally at lines 23-31 (duplicate of `src/types/operations.ts` lines 61-69)

**3. Trucking Records** (`src/components/operations/TruckingRecordDetails.tsx`)
- Multi-tag toggle system — multiple tags can be active simultaneously
- Tags stored as `remarks: string[]` on `TruckingRecord`
- ~22 tags defined in `src/utils/truckingTags.ts` across 4 groups (Operations, Documentation, Financial, Client)
- UI: `StatusTagPill` (lines 642-686) and `StatusTagBar` (lines 689-932) — inline components
- Quick update handler: `handleQuickStatusUpdate()` (lines 1108-1147) — optimistic update + PUT
- Rendered at lines 1457-1460

### Data Types

**`BrokerageBooking`** (import bookings) — `src/types/operations.ts` lines 71-137:
- `status: ExecutionStatus` (single string)
- No tag array or history fields

**`TruckingBooking`** — `src/types/operations.ts` lines 139-183:
- `status: ExecutionStatus` (single string, not actually used in trucking records)

**`TruckingRecord`** — `src/components/operations/CreateTruckingModal.tsx` lines 79-131:
- `remarks: string[]` (array of tag keys like `"awaiting-discharge"`, `"delivered"`)
- `remarksDrops: RemarksDrop[]` (timestamps for delivery drops, not status-related)
- `linkedBookingId?: string` — links to the import/export booking
- `linkedBookingType?: string` — "Import" or "Export"

**`ExecutionStatus`** — `src/types/operations.ts` lines 61-69:
```typescript
export type ExecutionStatus =
  | "Draft" | "For Approval" | "Approved" | "In Transit"
  | "Delivered" | "Completed" | "On Hold" | "Cancelled";
```

**Export booking type** is defined inline in `ExportBookingDetails.tsx` (lines 33-134), not in the shared types file.

### Tag Definitions

**`src/utils/truckingTags.ts`** — the current tag system (trucking only):
```typescript
export interface TruckingTag {
  key: string;    // kebab-case identifier e.g. "awaiting-discharge"
  label: string;  // display text e.g. "Awaiting Discharge"
  group: "operations" | "documentation" | "financial" | "client";
}
```

Current tags (lines 16-43):
- **Operations/Movement**: awaiting-discharge, ready-gatepass, for-gatepass, awaiting-trucking, checking-trucking, looking-truck, requesting-rates, delivered, booked, schedule, re-schedule
- **Documentation/Process**: awaiting-signed-docs, awaiting-stowage, awaiting-address, awaiting-schedule, for-web, cro
- **Financial/Accounting**: for-debit, for-final, for-lodgement
- **Client Handling**: client-will-handle, client-will-handle-trucking

Groups defined at lines 9-14:
```typescript
export const TRUCKING_TAG_GROUPS = [
  { id: "operations", label: "Operations / Movement" },
  { id: "documentation", label: "Documentation / Process" },
  { id: "financial", label: "Financial / Accounting" },
  { id: "client", label: "Client Handling" },
];
```

This file also exports vendor lists, container options, shipping line options, and utility functions that must be preserved.

### Linking Between Bookings & Trucking

- Each import/export booking can have one linked trucking record
- `TruckingTab` (`src/components/operations/shared/TruckingTab.tsx`) is embedded as a tab in both `ImportBookingDetails` and `ExportBookingDetails`
- It fetches trucking records via: `GET /trucking-records?linkedBookingId=${bookingId}`
- The trucking record stores `linkedBookingId` and `linkedBookingType`

### Existing Activity Log (local-only, not persisted)

`ImportBookingDetails.tsx` has a local-only activity timeline (lines 1032-1156):
```typescript
interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: "field_updated" | "status_changed" | "created" | "note_added";
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  statusFrom?: ExecutionStatus;
  statusTo?: ExecutionStatus;
  note?: string;
}
```
This is initialized with a single "created" entry and only lives in React state — it is NOT persisted to the backend. The visual timeline uses a vertical line with colored dots and cards.

### Backend

**Server file**: `src/supabase/functions/server/index.tsx` (~9,400 lines, Hono framework)

**Import booking endpoints** (lines 5890-5989):
- `GET /make-server-ce0d67b8/import-bookings` — list all, sorted by createdAt desc
- `GET /make-server-ce0d67b8/import-bookings/:id` — get single
- `POST /make-server-ce0d67b8/import-bookings` — create, generates ID `IMP-YYYY-NNN`
- `PUT /make-server-ce0d67b8/import-bookings/:id` — merge update, preserves bookingId/createdAt

**Export booking endpoints** (lines 5726-5824):
- Same pattern as import, ID format `EXP-YYYY-NNN`, key prefix `export_booking:`

**Trucking record endpoints** (lines 3470-3535):
- `POST /make-server-ce0d67b8/trucking-records` — create
- `GET /make-server-ce0d67b8/trucking-records` — list, supports `?linkedBookingId=` filter
- `GET /make-server-ce0d67b8/trucking-records/:id` — get single
- `PUT /make-server-ce0d67b8/trucking-records/:id` — merge update

**KV key prefixes**: `import_booking:`, `export_booking:`, `trucking-record:`

All endpoints use `kv.get()`, `kv.set()`, `kv.getByPrefix()` from `kv_store.tsx`.

---

## Design Decisions

1. **Multi-tag model**: All three booking types (import, export, trucking) use the same toggleable tag system where multiple statuses can be active simultaneously.
2. **Single source of truth**: Shipment-level status tags live on the import/export booking. The linked trucking record reads them from the booking and writes changes back to the booking.
3. **Two layers of tags**:
   - **Shipment tags** — synced between booking and its linked trucking record. Editable from both views. Persisted on the booking.
   - **Operational tags** — type-specific, NOT synced. Trucking operational tags stay on the trucking record only.
4. **Inline audit trail**: Each booking stores a `tagHistory` array tracking who added/removed which tag and when. Displayed as a timeline in the detail view.

---

## Step-by-Step Implementation

### Step 1: Create Unified Tag Definitions

**Create new file**: `src/utils/statusTags.ts`

```typescript
export type TagLayer = "shipment" | "operational";
export type BookingType = "import" | "export" | "trucking";
export type TagGroup = "operations" | "documentation" | "financial" | "client";

export interface StatusTag {
  key: string;           // kebab-case unique ID
  label: string;         // human-readable display label
  group: TagGroup;       // which group heading it falls under
  layer: TagLayer;       // "shipment" = synced, "operational" = local only
  appliesTo: BookingType[]; // which booking types show this tag
}

export const TAG_GROUPS: { id: TagGroup; label: string }[] = [
  { id: "operations", label: "Operations / Movement" },
  { id: "documentation", label: "Documentation / Process" },
  { id: "financial", label: "Financial / Accounting" },
  { id: "client", label: "Client Handling" },
];
```

**Define ALL_STATUS_TAGS** — the master tag list. Classification:

| Tag Key | Label | Group | Layer | Applies To |
|---------|-------|-------|-------|------------|
| `awaiting-discharge` | Awaiting Discharge | operations | shipment | import, trucking |
| `ready-gatepass` | Ready Gatepass / For Delivery | operations | shipment | import, trucking |
| `for-gatepass` | For Gatepass | operations | shipment | import, trucking |
| `delivered` | Delivered | operations | shipment | import, export, trucking |
| `awaiting-stowage` | Awaiting Stowage | documentation | shipment | import, export, trucking |
| `awaiting-signed-docs` | Awaiting Signed Docs | documentation | shipment | import, export, trucking |
| `cro` | CRO | documentation | shipment | import, trucking |
| `for-web` | For WEB | documentation | shipment | import, export, trucking |
| `for-debit` | For Debit | financial | shipment | import, export, trucking |
| `for-final` | For Final | financial | shipment | import, export, trucking |
| `for-lodgement` | For Lodgement | financial | shipment | import, export, trucking |
| `with-eta` | With ETA | operations | shipment | import, export |
| `without-eta` | Without ETA | operations | shipment | import, export |
| `returned` | Returned | operations | shipment | import |
| `awaiting-discharge-cro` | Awaiting Discharge & CRO | operations | shipment | import |
| `with-stowage-discharged` | With Stowage / Discharged & Awaiting Signed Docs | documentation | shipment | import |
| `for-debit-for-final` | For Debit For Final | financial | shipment | import |
| `awaiting-trucking` | Awaiting Trucking | operations | operational | trucking |
| `checking-trucking` | Checking Trucking | operations | operational | trucking |
| `looking-truck` | Looking for a Truck | operations | operational | trucking |
| `requesting-rates` | Requesting Rates | operations | operational | trucking |
| `booked` | Booked | operations | operational | trucking |
| `schedule` | Schedule | operations | operational | trucking |
| `re-schedule` | Re-Schedule | operations | operational | trucking |
| `awaiting-address` | Awaiting Address | documentation | operational | trucking |
| `awaiting-schedule` | Awaiting Schedule | documentation | operational | trucking |
| `client-will-handle` | Client Will Handle | client | operational | trucking |
| `client-will-handle-trucking` | Client Will Handle the Trucking | client | operational | trucking |

**Add helper functions**:
```typescript
/** Get all tags applicable to a booking type */
export function getTagsForType(bookingType: BookingType): StatusTag[]

/** Get only shipment-layer tags for a booking type */
export function getShipmentTags(bookingType: BookingType): StatusTag[]

/** Get only operational-layer tags for a booking type */
export function getOperationalTags(bookingType: BookingType): StatusTag[]

/** Look up a tag definition by key */
export function getTagByKey(key: string): StatusTag | undefined

/** Returns summary string: "TAG1 • TAG2 +N" (max 2 visible). Same logic as existing getStatusSummary in truckingTags.ts but uses ALL_STATUS_TAGS instead of ALL_TRUCKING_TAGS */
export function getStatusSummary(tagKeys: string[]): string
```

**Modify existing file**: `src/utils/truckingTags.ts`

Keep all non-tag exports unchanged (vendor lists, container options, shipping lines, dispatchers, `hexToRgba`, etc.). For tag-related exports, re-export from `statusTags.ts` for backward compatibility:

```typescript
import { ALL_STATUS_TAGS, TAG_GROUPS, getStatusSummary, type StatusTag } from "./statusTags";

// Backward compat aliases
export type TruckingTag = StatusTag;
export const TRUCKING_TAG_GROUPS = TAG_GROUPS;
export const ALL_TRUCKING_TAGS = ALL_STATUS_TAGS.filter(t => t.appliesTo.includes("trucking"));
export { getStatusSummary };

// ... keep all other exports (TRUCKING_VENDORS, EMPTY_RETURN_OPTIONS, etc.) unchanged
```

---

### Step 2: Add New Types

**Modify**: `src/types/operations.ts`

Add new interface after `ExecutionStatus`:
```typescript
export interface TagHistoryEntry {
  id: string;              // unique ID (use crypto.randomUUID() or Date.now() + random)
  timestamp: string;       // ISO 8601 string
  user: string;            // user name who made the change
  action: "tag_added" | "tag_removed";
  tag: string;             // tag key e.g. "for-gatepass"
  tagLabel: string;        // tag label at time of change e.g. "For Gatepass"
  layer: "shipment" | "operational";
}
```

Add new fields to `BrokerageBooking` interface (after `status` field at line 80):
```typescript
  shipmentTags?: string[];         // array of active shipment tag keys
  tagHistory?: TagHistoryEntry[];  // persisted audit trail
```

Keep `status: ExecutionStatus` for backward compatibility with unmigrated bookings.

Also add the same fields to the `ExportBooking` interface defined inline in `src/components/operations/ExportBookingDetails.tsx` (after the `status` field around line 43).

---

### Step 3: Backend — New Tag Endpoints

**Modify**: `src/supabase/functions/server/index.tsx`

Import `TagHistoryEntry` is not possible in the Deno backend since it can't import from the frontend types. Instead, define the `TagHistoryEntry` shape inline in the server or duplicate the interface.

#### 3A. Add shipment tag update endpoint for import bookings

Add after the existing `PUT /import-bookings/:id` endpoint (around line 5989):

```
PUT /make-server-ce0d67b8/import-bookings/:id/shipment-tags
```

**Request body**: `{ shipmentTags: string[], user: string }`

**Logic**:
1. Get `id` from URL params
2. Fetch existing booking from KV: `kv.get(\`import_booking:${id}\`)`
3. Return 404 if not found
4. Get old tags: `existing.shipmentTags || []`
5. Get new tags from request body
6. Compute diff:
   - Added tags = tags in new but not in old
   - Removed tags = tags in old but not in new
7. For each added/removed tag, create a `TagHistoryEntry` with:
   - `id`: generate unique ID
   - `timestamp`: `new Date().toISOString()`
   - `user`: from request body
   - `action`: "tag_added" or "tag_removed"
   - `tag`: the tag key
   - `tagLabel`: the tag label (look up from a server-side tag map, or pass from client)
   - `layer`: "shipment"
8. Append new history entries to `existing.tagHistory || []`
9. Save updated booking: `{ ...existing, shipmentTags: newTags, tagHistory: updatedHistory, updatedAt: new Date().toISOString() }`
10. Return `{ success: true, data: updatedBooking }`

#### 3B. Add same endpoint for export bookings

```
PUT /make-server-ce0d67b8/export-bookings/:id/shipment-tags
```

Same logic as 3A but using `export_booking:` KV prefix.

#### 3C. Enrich trucking record GET with linked booking's shipment tags

**Modify** the existing `GET /trucking-records/:id` endpoint:

After fetching the trucking record, if it has `linkedBookingId` and `linkedBookingType`:
1. Determine KV prefix: if `linkedBookingType` contains "Import" (case-insensitive) use `import_booking:`, if "Export" use `export_booking:`
2. Fetch the linked booking from KV
3. If found, add to the response:
   ```json
   {
     "success": true,
     "data": {
       ...truckingRecord,
       "linkedBookingShipmentTags": linkedBooking.shipmentTags || [],
       "linkedBookingTagHistory": linkedBooking.tagHistory || []
     }
   }
   ```

Also modify the `GET /trucking-records` (list) endpoint: for each record in the response that has a `linkedBookingId`, do the same enrichment. Note: this may be slow if there are many records, so consider doing this only for the filtered result when `?linkedBookingId=` query param is present.

#### 3D. Add trucking-to-booking tag write endpoint

```
PUT /make-server-ce0d67b8/trucking-records/:id/update-booking-tags
```

**Request body**: `{ shipmentTags: string[], user: string }`

**Logic**:
1. Fetch trucking record by ID
2. Get `linkedBookingId` and `linkedBookingType` from it
3. If no linked booking, return error: `{ success: false, error: "No linked booking" }`
4. Determine KV prefix from `linkedBookingType`
5. Fetch the linked booking
6. Apply same diff + history logic as Step 3A
7. Save the updated booking
8. Return `{ success: true, data: { shipmentTags: updatedBooking.shipmentTags, tagHistory: updatedBooking.tagHistory } }`

#### 3E. Lazy migration in existing GET endpoints

**Modify** `GET /import-bookings/:id` and `GET /import-bookings`:

After fetching a booking, if it has a `status` field but `shipmentTags` is undefined or null:
1. Map old status to tag keys using this mapping:
   ```
   "For Gatepass" → ["for-gatepass"]
   "Awaiting Discharge & CRO" → ["awaiting-discharge", "cro"]
   "For Debit For Final" → ["for-debit", "for-final"]
   "For Lodgement" → ["for-lodgement"]
   "Awaiting Stowage" → ["awaiting-stowage"]
   "With Stowage / Discharged & Awaiting Signed Docs" → ["with-stowage-discharged"]
   "With ETA" → ["with-eta"]
   "Without ETA" → ["without-eta"]
   "Delivered" → ["delivered"]
   "Returned" → ["returned"]
   ```
2. Set `booking.shipmentTags = mappedTags`
3. Set `booking.tagHistory = []` (empty — no history for legacy data)
4. Save the booking back to KV with the new fields
5. Return the updated booking

**Modify** `GET /export-bookings/:id` and `GET /export-bookings`:

Same pattern with this mapping:
```
"Delivered" → ["delivered"]
"Completed" → ["delivered"]
All other ExecutionStatus values → [] (no shipment tag equivalent)
```

---

### Step 4: Extract Shared UI Components

#### 4A. Create `src/components/shared/StatusTagPill.tsx`

Extract the `StatusTagPill` component from `TruckingRecordDetails.tsx` lines 642-686. It's a self-contained component.

**Changes from the original**:
- Add an optional `layer` prop: `layer?: "shipment" | "operational"`
- Visual distinction by layer:
  - Shipment (default): `backgroundColor: "#E8F5F3"`, `color: "#12332B"`, `border: "1px solid #C1D9CC"` (existing green tint)
  - Operational: `backgroundColor: "#EFF6FF"`, `color: "#1E40AF"`, `border: "1px solid #BFDBFE"` (blue-gray tint)

```typescript
interface StatusTagPillProps {
  label: string;
  onRemove?: () => void;
  layer?: "shipment" | "operational";
}
```

Export as named export: `export function StatusTagPill(...)`

#### 4B. Create `src/components/shared/StatusTagBar.tsx`

Extract and generalize the `StatusTagBar` from `TruckingRecordDetails.tsx` lines 689-932.

**New props interface**:
```typescript
interface StatusTagBarProps {
  bookingType: "import" | "export" | "trucking";
  shipmentTags: string[];
  operationalTags: string[];
  onShipmentTagsChange: (tags: string[]) => void;
  onOperationalTagsChange: (tags: string[]) => void;
  shipmentTagsReadOnly?: boolean;  // when true, shipment tags are shown but not editable
  disabled?: boolean;              // disables everything
}
```

**Key changes from the trucking-only version**:

1. Import `ALL_STATUS_TAGS`, `TAG_GROUPS`, `getTagsForType` from `../utils/statusTags` (not truckingTags)

2. The pill display area shows all active tags (shipment + operational), sorted by group order. Each pill uses `StatusTagPill` with the appropriate `layer` prop. Shipment tag pills call `onShipmentTagsChange` on remove; operational tag pills call `onOperationalTagsChange`.

3. The "+ Add" dropdown groups available tags into two sections with visual headers:
   - **"Shipment Status"** section header — with a small subtitle: "Synced with linked booking/trucking"
   - Then the tag groups (Operations, Documentation, Financial, Client) filtered to only show shipment-layer tags applicable to this `bookingType`
   - A visual separator (thin border line)
   - **"Operational"** section header — with subtitle: "Local to this record"
   - Then the tag groups filtered to only show operational-layer tags applicable to this `bookingType`
   - If a section has no tags for this booking type, omit the section entirely

4. The search input filters across both sections

5. When `shipmentTagsReadOnly` is true, shipment tag pills don't show the "x" remove button, and shipment tags in the dropdown are grayed out / non-interactive

6. If both `shipmentTags` and `operationalTags` are empty, show the "—" empty state pill (same as existing)

7. Keep the portal-based dropdown positioning logic (lines 719-736, 828-930)

#### 4C. Create `src/components/shared/TagHistoryTimeline.tsx`

New component modeled after the existing `ActivityTimeline` in `ImportBookingDetails.tsx` lines 1032-1156.

```typescript
interface TagHistoryTimelineProps {
  history: TagHistoryEntry[];  // from src/types/operations
  maxEntries?: number;         // default 50, with "Show more" button
}

export function TagHistoryTimeline({ history, maxEntries = 50 }: TagHistoryTimelineProps)
```

**Visual design** — same vertical timeline pattern:
- Vertical line: `position: absolute, left: 15px, width: 2px, backgroundColor: #E5E9F0`
- Each entry has a dot + card:
  - Dot color: `tag_added` → `#10B981` (green), `tag_removed` → `#EF4444` (red)
  - Card shows:
    - Timestamp (11px, muted) — format: `new Date(entry.timestamp).toLocaleString()`
    - Action text (13px): "Added **{tagLabel}**" or "Removed **{tagLabel}**" (bold the tag label)
    - Small layer badge: "Shipment" or "Operational" in a tiny pill (10px font, matching layer color)
    - User line (11px, muted): "by {user}"
- Entries sorted by timestamp descending (newest first)
- If `history.length > maxEntries`, show first `maxEntries` entries and a "Show more" button

---

### Step 5: Update Import Booking Detail View

**Modify**: `src/components/operations/ImportBookingDetails.tsx`

#### 5A. Add imports
```typescript
import { StatusTagBar } from "../shared/StatusTagBar";
import { TagHistoryTimeline } from "../shared/TagHistoryTimeline";
import type { TagHistoryEntry } from "../../types/operations";
import { getTagByKey } from "../../utils/statusTags";
```

#### 5B. Remove old status code
- Delete `IMPORT_STATUS_COLORS` constant (lines 163-174)
- Delete `IMPORT_STATUS_TEXT_COLORS` constant (lines 176-187)
- Delete `IMPORT_STATUS_OPTIONS` constant (lines 189-200)
- Delete `hexToRgba` helper (lines 202-208) — already exists in truckingTags.ts
- Delete `isBright` helper (lines 210-212)
- Delete `handleStatusChange` function (lines 214-250)
- Delete `showStatusDropdown` state (line 155)
- Delete `STATUS_COLORS` constant (lines 32-41) — the ExecutionStatus Tailwind class map
- Delete `ActivityLogEntry` interface (lines 44-55)
- Delete `initialActivityLog` (lines 58-65)
- Delete the `ActivityTimeline` component (lines 1032-1156) — replaced by `TagHistoryTimeline`
- Delete `activityLog` state (line 147) and any `addActivity()` calls

#### 5C. Add new state and handlers

Add state:
```typescript
const [shipmentTags, setShipmentTags] = useState<string[]>(currentBooking.shipmentTags || []);
const [tagHistory, setTagHistory] = useState<TagHistoryEntry[]>(currentBooking.tagHistory || []);
const [isTagsSaving, setIsTagsSaving] = useState(false);
```

Update `useEffect` that syncs `currentBooking` from props (around line 158-161):
```typescript
useEffect(() => {
  setCurrentBooking(booking);
  setEditedBooking(booking);
  setShipmentTags(booking.shipmentTags || []);
  setTagHistory(booking.tagHistory || []);
}, [booking]);
```

Add handler:
```typescript
const handleShipmentTagsChange = async (newTags: string[]) => {
  // Optimistic update
  const prevTags = shipmentTags;
  const prevHistory = tagHistory;
  setShipmentTags(newTags);

  setIsTagsSaving(true);
  try {
    const res = await fetch(
      `${API_BASE_URL}/import-bookings/${currentBooking.bookingId}/shipment-tags`,
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
      }
    );
    const result = await res.json();
    if (result.success) {
      setCurrentBooking(result.data);
      setEditedBooking(result.data);
      setShipmentTags(result.data.shipmentTags || []);
      setTagHistory(result.data.tagHistory || []);
      onBookingUpdated();
    } else {
      // Revert
      setShipmentTags(prevTags);
      setTagHistory(prevHistory);
      toast.error(`Failed to update status: ${result.error || "Unknown error"}`);
    }
  } catch (err) {
    setShipmentTags(prevTags);
    setTagHistory(prevHistory);
    toast.error("Unable to update status");
  } finally {
    setIsTagsSaving(false);
  }
};
```

#### 5D. Replace status dropdown UI in the summary/metadata bar

Find the status dropdown section in the summary bar (around lines 620-719 where the metadata bar with status, shipping line status, route, etc. is rendered). There's a clickable status button that shows the status dropdown.

Replace the entire status dropdown section (the status pill button + the absolute-positioned dropdown list) with:
```tsx
<div style={{ flex: 1 }}>
  <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
    Status
    {isTagsSaving && (
      <span style={{ fontSize: "10px", fontWeight: 400, color: "#9CA3AF", marginLeft: "8px", textTransform: "none", letterSpacing: "normal" }}>
        Saving...
      </span>
    )}
  </div>
  <StatusTagBar
    bookingType="import"
    shipmentTags={shipmentTags}
    operationalTags={[]}
    onShipmentTagsChange={handleShipmentTagsChange}
    onOperationalTagsChange={() => {}}
  />
</div>
```

Note: Import bookings currently have no operational tags of their own, so the operational section will be empty. The `StatusTagBar` component should handle this gracefully by not showing the "Operational" section header when there are no operational tags available for the booking type.

#### 5E. Replace Activity Timeline

Find where `<ActivityTimeline activities={activityLog} />` is rendered (or wherever the activity timeline section is in the detail view). Replace with:
```tsx
<TagHistoryTimeline history={tagHistory} />
```

#### 5F. Backward compatibility

For legacy bookings that haven't been migrated yet (no `shipmentTags` field), the backend lazy migration (Step 3E) should handle this. But as an extra safety net in the UI, if `shipmentTags` is undefined/empty AND `status` has a value, you can show the old status as a `NeuronStatusPill` as a fallback. This is optional since the backend migration should handle it.

---

### Step 6: Update Export Booking Detail View

**Modify**: `src/components/operations/ExportBookingDetails.tsx`

Same structural changes as Step 5:

1. Add imports for `StatusTagBar`, `TagHistoryTimeline`, `TagHistoryEntry`, `getTagByKey`
2. Remove the local `ExecutionStatus` type definition (lines 23-31) — it's already in `src/types/operations.ts`
3. Remove `EXPORT_STATUS_COLORS`, `EXPORT_STATUS_TEXT_COLORS` constants
4. Remove `handleStatusChange` function
5. Remove `showStatusDropdown` state
6. Add `shipmentTags`, `tagHistory`, `isTagsSaving` state
7. Add `handleShipmentTagsChange` handler — same as import but hitting `/export-bookings/:id/shipment-tags` and using `currentBooking.id || currentBooking.bookingId` for the ID
8. Replace status dropdown in the summary bar with `<StatusTagBar bookingType="export" ... />`
9. Replace activity timeline with `<TagHistoryTimeline />`

---

### Step 7: Update Trucking Record Detail View

**Modify**: `src/components/operations/TruckingRecordDetails.tsx`

#### 7A. Remove inline components, use shared ones

- Delete the `StatusTagPill` component (lines 642-686)
- Delete the `StatusTagBar` component (lines 689-932)
- Add imports:
  ```typescript
  import { StatusTagBar } from "../shared/StatusTagBar";
  import { StatusTagPill } from "../shared/StatusTagPill";
  import { TagHistoryTimeline } from "../shared/TagHistoryTimeline";
  import type { TagHistoryEntry } from "../../types/operations";
  ```

#### 7B. Add state for linked booking's shipment tags

```typescript
const [linkedShipmentTags, setLinkedShipmentTags] = useState<string[]>(
  (record as any).linkedBookingShipmentTags || []
);
const [linkedTagHistory, setLinkedTagHistory] = useState<TagHistoryEntry[]>(
  (record as any).linkedBookingTagHistory || []
);
const [isShipmentTagsSaving, setIsShipmentTagsSaving] = useState(false);
```

Update the effect that syncs `currentRecord` from props to also set these:
```typescript
setLinkedShipmentTags((record as any).linkedBookingShipmentTags || []);
setLinkedTagHistory((record as any).linkedBookingTagHistory || []);
```

#### 7C. Add handler for updating linked booking's shipment tags

```typescript
const handleLinkedShipmentTagsChange = async (newTags: string[]) => {
  if (!currentRecord.linkedBookingId) {
    toast.error("No linked booking to update");
    return;
  }

  const prevTags = linkedShipmentTags;
  setLinkedShipmentTags(newTags);
  setIsShipmentTagsSaving(true);

  try {
    const res = await fetch(
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
      }
    );
    const result = await res.json();
    if (result.success) {
      setLinkedShipmentTags(result.data.shipmentTags || []);
      setLinkedTagHistory(result.data.tagHistory || []);
      onUpdate();
      // Notify parent to refresh booking tags
      onBookingTagsUpdated?.();
    } else {
      setLinkedShipmentTags(prevTags);
      toast.error(`Failed to update shipment tags: ${result.error || "Unknown error"}`);
    }
  } catch (err) {
    setLinkedShipmentTags(prevTags);
    toast.error("Unable to update shipment tags");
  } finally {
    setIsShipmentTagsSaving(false);
  }
};
```

#### 7D. Modify `handleQuickStatusUpdate` to only handle operational tags

The existing `handleQuickStatusUpdate` (lines 1108-1147) writes to `remarks`. Keep this, but it should only contain operational tag keys now. The function itself doesn't need to change — it just writes `remarks` to the trucking record. The UI will only pass operational tags to it.

#### 7E. Replace StatusTagBar usage

Find where `<StatusTagBar>` is rendered (lines 1457-1460):

```tsx
<StatusTagBar
  selected={currentRecord.remarks || []}
  onChange={handleQuickStatusUpdate}
/>
```

Replace with:

```tsx
<StatusTagBar
  bookingType="trucking"
  shipmentTags={linkedShipmentTags}
  operationalTags={currentRecord.remarks || []}
  onShipmentTagsChange={handleLinkedShipmentTagsChange}
  onOperationalTagsChange={handleQuickStatusUpdate}
  shipmentTagsReadOnly={!currentRecord.linkedBookingId}
  disabled={false}
/>
```

Update the "Saving..." indicator (lines 1451-1455) to also check `isShipmentTagsSaving`:
```tsx
{(isStatusSaving || isShipmentTagsSaving) && (
  <span style={{ ... }}>Saving...</span>
)}
```

#### 7F. Handle unlinked trucking records

When `linkedBookingId` is absent, the `StatusTagBar` should show shipment tags as read-only and empty. The `shipmentTagsReadOnly` prop handles this. Optionally, add a note below the tag bar:

```tsx
{!currentRecord.linkedBookingId && (
  <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic", marginTop: "4px" }}>
    Link a booking to enable shipment status tags
  </div>
)}
```

#### 7G. Add tag history display

Add a section (perhaps in a new tab or at the bottom of the detail info) showing:
```tsx
{linkedTagHistory.length > 0 && (
  <TagHistoryTimeline history={linkedTagHistory} />
)}
```

#### 7H. Add `onBookingTagsUpdated` prop

Add to the component's props interface:
```typescript
onBookingTagsUpdated?: () => void;
```

Call this after successful shipment tag updates (already shown in 7C above).

---

### Step 8: Update TruckingTab Bridge

**Modify**: `src/components/operations/shared/TruckingTab.tsx`

#### 8A. Add new prop

```typescript
interface TruckingTabProps {
  bookingId: string;
  bookingType: string;
  currentUser?: { name: string; email: string; department: string } | null;
  onBookingTagsUpdated?: () => void;  // NEW
}
```

#### 8B. Pass through to TruckingRecordDetails

Where `<TruckingRecordDetails>` is rendered (around line 110+), pass the new prop:
```tsx
<TruckingRecordDetails
  record={record}
  onUpdate={fetchRecord}
  currentUser={currentUser}
  embedded={true}
  onBookingTagsUpdated={onBookingTagsUpdated}  // NEW
/>
```

#### 8C. Wire up in ImportBookingDetails.tsx

Find where `<TruckingTab>` is rendered in `ImportBookingDetails.tsx` and add:
```tsx
<TruckingTab
  bookingId={currentBooking.bookingId}
  bookingType="Import"
  currentUser={currentUser}
  onBookingTagsUpdated={() => {
    // Re-fetch the booking to get updated shipment tags
    fetchBookingDetails();  // or whatever the booking refresh function is called
  }}
/>
```

If there's no `fetchBookingDetails` function, you'll need to add one that re-fetches the current booking from the API and updates `currentBooking` state.

Same for `ExportBookingDetails.tsx`.

---

### Step 9: Update List/Table Views

#### 9A. Import Bookings List

**Modify**: `src/components/operations/ImportBookings.tsx`

Find where the status column is rendered in the table (around lines 519-543, where it shows a colored status pill).

Replace the single-status pill rendering with a tag summary:

```tsx
import { getStatusSummary } from "../../utils/statusTags";
import { StatusTagPill } from "../shared/StatusTagPill";
```

In the table row status cell:
```tsx
{booking.shipmentTags && booking.shipmentTags.length > 0 ? (
  <span style={{ fontSize: "12px", fontWeight: 500 }}>
    {getStatusSummary(booking.shipmentTags)}
  </span>
) : (
  // Fallback for unmigrated bookings
  <span>{booking.status || "—"}</span>
)}
```

Also update any status filtering logic (if there's a status filter dropdown in the list view) to filter by tag presence instead of single status match.

#### 9B. Export Bookings List

**Modify**: `src/components/operations/ExportBookings.tsx`

Same pattern as 9A.

---

### Step 10: Trucking Remarks Migration

This handles the case where existing trucking records have shipment-layer tag keys in their `remarks` array that should now live on the linked booking.

**Add to the backend** (in `src/supabase/functions/server/index.tsx`):

In the `GET /trucking-records` and `GET /trucking-records/:id` endpoints, after fetching a record:

1. Define which tag keys are shipment-layer:
   ```typescript
   const SHIPMENT_TAG_KEYS = new Set([
     "awaiting-discharge", "ready-gatepass", "for-gatepass", "delivered",
     "awaiting-stowage", "awaiting-signed-docs", "cro", "for-web",
     "for-debit", "for-final", "for-lodgement", "with-eta", "without-eta",
     "returned", "awaiting-discharge-cro", "with-stowage-discharged",
     "for-debit-for-final"
   ]);
   ```

2. If the record has `linkedBookingId` and its `remarks` contain any shipment tag keys:
   - Split `remarks` into shipment keys and operational keys
   - Add shipment keys to the linked booking's `shipmentTags` (union, no duplicates)
   - Remove shipment keys from `remarks`, keeping only operational keys
   - Save both the updated trucking record and the linked booking back to KV
   - This is a one-time migration that happens on read

3. If the record has NO `linkedBookingId`, leave `remarks` unchanged (no booking to migrate to)

---

## File Summary

### New Files
| File | Description |
|------|-------------|
| `src/utils/statusTags.ts` | Unified tag definitions, helpers |
| `src/components/shared/StatusTagPill.tsx` | Reusable tag pill component with layer styling |
| `src/components/shared/StatusTagBar.tsx` | Reusable tag picker with two-layer dropdown |
| `src/components/shared/TagHistoryTimeline.tsx` | Timeline showing tag change audit trail |

### Modified Files
| File | Changes |
|------|---------|
| `src/utils/truckingTags.ts` | Re-export from statusTags.ts for backward compat |
| `src/types/operations.ts` | Add `TagHistoryEntry`, add fields to `BrokerageBooking` |
| `src/supabase/functions/server/index.tsx` | New endpoints (3A-3D), lazy migration (3E), remarks migration (Step 10) |
| `src/components/operations/ImportBookingDetails.tsx` | Replace status dropdown with StatusTagBar, replace activity log with TagHistoryTimeline |
| `src/components/operations/ExportBookingDetails.tsx` | Same as ImportBookingDetails |
| `src/components/operations/TruckingRecordDetails.tsx` | Remove inline StatusTagPill/StatusTagBar, use shared components, split remarks into shipment + operational |
| `src/components/operations/shared/TruckingTab.tsx` | Add `onBookingTagsUpdated` prop, pass through |
| `src/components/operations/ImportBookings.tsx` | Update status column to show tag summary |
| `src/components/operations/ExportBookings.tsx` | Update status column to show tag summary |

---

## Verification Checklist

1. **Import booking tag management**: Open an import booking detail view. The old status dropdown should be replaced with a tag bar. Toggle tags on/off. Verify tags persist after page refresh.
2. **Tag history**: After toggling tags on an import booking, verify the timeline shows entries with correct user name, timestamp, and added/removed action.
3. **Trucking sync (read)**: Open a trucking record linked to an import booking. Verify the shipment tags section shows the booking's tags.
4. **Trucking sync (write)**: Toggle a shipment tag from the trucking view. Go back to the import booking view. Verify the tag change is reflected there.
5. **Operational tags isolation**: Toggle an operational tag (e.g., "Looking for a Truck") on a trucking record. Verify it does NOT appear on the linked import booking.
6. **Export bookings**: Repeat tests 1-4 for export bookings.
7. **Unlinked trucking**: Open a trucking record with no linked booking. Verify the shipment section is read-only with a "Link a booking" message.
8. **List views**: Check import/export list pages. Verify tag summaries appear instead of single status text.
9. **Legacy migration**: If you have old bookings with single `status` field, verify they auto-migrate to tags on first GET.
10. **Build check**: Run `npm run build` to verify no TypeScript errors.
