# Status System Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the status system into three independent concerns: Shipment Milestones (date/time events synced via booking), Shipment Tags (multi-select synced status, unchanged), and Trucking Status (single-select dropdown, trucking-only).

**Architecture:** Shipment events are stored as `shipmentEvents: ShipmentEvent[]` on the import/export booking object and accessed from trucking via the linked booking. Trucking gets a new `truckingStatus` string field replacing the old multi-tag `remarks` operational layer. The existing shipment tag sync mechanism is preserved unchanged.

**Tech Stack:** React 18, TypeScript, Hono (Deno), Supabase KV Store

**Spec:** `docs/superpowers/specs/2026-04-04-status-system-revision-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/constants/shipmentEvents.ts` | Create | 13 standard event keys and display labels |
| `src/constants/truckingStatuses.ts` | Create | 10 trucking status options, default value |
| `src/types/operations.ts` | Modify | Add `ShipmentEvent` interface, update `BrokerageBooking` |
| `src/utils/statusTags.ts` | Modify | Remove all operational layer tags |
| `src/utils/truckingTags.ts` | Modify | Remove operational tag exports |
| `src/components/operations/shared/ShipmentMilestonesTab.tsx` | Create | Reusable milestones form (13 rows with date/time + note) |
| `src/components/operations/ImportBookingDetails.tsx` | Modify | Add sub-tabs (Booking Details + Shipment Milestones), remove legacy HeaderStatusDropdown |
| `src/components/operations/TruckingRecordDetails.tsx` | Modify | Two status boxes in header, add Shipment Milestones tab, replace operational tags with dropdown |
| `src/components/operations/TruckingModule.tsx` | Modify | Show `truckingStatus` instead of `StatusPill` from remarks |
| `src/components/operations/CreateTruckingModal.tsx` | Modify | Default `truckingStatus`, remove TagSelector for operational tags |
| `src/supabase/functions/server/index.tsx` | Modify | New endpoints for shipment events, trucking status default, enrichment includes events |

---

## Task 1: Constants and Types

**Files:**
- Create: `src/constants/shipmentEvents.ts`
- Create: `src/constants/truckingStatuses.ts`
- Modify: `src/types/operations.ts:71-100`

- [ ] **Step 1: Create `src/constants/shipmentEvents.ts`**

```typescript
export const SHIPMENT_EVENT_KEYS = [
  "draft",
  "signed",
  "stowaged",
  "lodged",
  "final",
  "for-debit",
  "debited",
  "discharged",
  "cro",
  "web",
  "ready-gatepass",
  "delivered",
  "returned",
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

- [ ] **Step 2: Create `src/constants/truckingStatuses.ts`**

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

/** Color map for HeaderStatusDropdown display */
export const TRUCKING_STATUS_COLORS: Record<string, string> = {
  "Awaiting Trucking": "#6B7A76",
  "Checking Trucking": "#4285F4",
  "Looking for a Truck": "#FF6D01",
  "Requesting Rates": "#FBBC04",
  Booked: "#0F766E",
  Schedule: "#10B981",
  "Re-Schedule": "#EA4335",
  "Awaiting Address": "#9900FF",
  "Awaiting Schedule": "#0E7490",
  "Client Will Handle": "#64748B",
};
```

- [ ] **Step 3: Add `ShipmentEvent` interface and update `BrokerageBooking` in `src/types/operations.ts`**

Add after the `TagHistoryEntry` interface (after line 79):

```typescript
export interface ShipmentEvent {
  event: string;
  dateTime: string;
  note: string;
}
```

Add `shipmentEvents` field to `BrokerageBooking` interface, after line 99 (`tagHistory`):

```typescript
  shipmentEvents?: ShipmentEvent[];
```

- [ ] **Step 4: Commit**

```bash
git add src/constants/shipmentEvents.ts src/constants/truckingStatuses.ts src/types/operations.ts
git commit -m "feat: add shipment event and trucking status constants and types"
```

---

## Task 2: Remove Operational Tags from Tag Definitions

**Files:**
- Modify: `src/utils/statusTags.ts:20-49`
- Modify: `src/utils/truckingTags.ts:1-15`

- [ ] **Step 1: Remove all operational layer tags from `src/utils/statusTags.ts`**

In the `ALL_STATUS_TAGS` array (lines 20-49), remove every entry with `layer: "operational"`. These are lines 38-48:

```typescript
// REMOVE these entries:
  { key: "awaiting-trucking", label: "Awaiting Trucking", group: "operations", layer: "operational", appliesTo: ["trucking"] },
  { key: "checking-trucking", label: "Checking Trucking", group: "operations", layer: "operational", appliesTo: ["trucking"] },
  { key: "looking-truck", label: "Looking for a Truck", group: "operations", layer: "operational", appliesTo: ["trucking"] },
  { key: "requesting-rates", label: "Requesting Rates", group: "operations", layer: "operational", appliesTo: ["trucking"] },
  { key: "booked", label: "Booked", group: "operations", layer: "operational", appliesTo: ["trucking"] },
  { key: "schedule", label: "Schedule", group: "operations", layer: "operational", appliesTo: ["trucking"] },
  { key: "re-schedule", label: "Re-Schedule", group: "operations", layer: "operational", appliesTo: ["trucking"] },
  { key: "awaiting-address", label: "Awaiting Address", group: "documentation", layer: "operational", appliesTo: ["trucking"] },
  { key: "awaiting-schedule", label: "Awaiting Schedule", group: "documentation", layer: "operational", appliesTo: ["trucking"] },
  { key: "client-will-handle", label: "Client Will Handle", group: "client", layer: "operational", appliesTo: ["trucking"] },
  { key: "client-will-handle-trucking", label: "Client Will Handle the Trucking", group: "client", layer: "operational", appliesTo: ["trucking"] },
```

After removal, `ALL_STATUS_TAGS` should only contain the 17 shipment-layer entries (lines 21-37).

- [ ] **Step 2: Update `src/utils/truckingTags.ts`**

The `ALL_TRUCKING_TAGS` export filters by `appliesTo.includes("trucking")`. With operational tags removed, this will now return only shipment-layer tags that apply to trucking. The file still works correctly — no code change needed beyond verifying it compiles. But remove the now-unnecessary `getStatusSummary` re-export since operational tags are gone and the summary was primarily used for operational tags:

Verify the file still exports correctly. The existing code at lines 12-13 will still work:
```typescript
export const ALL_TRUCKING_TAGS = ALL_STATUS_TAGS.filter((tag) =>
  tag.appliesTo.includes("trucking"),
);
```

This now returns only shipment-layer tags for trucking (awaiting-discharge, ready-gatepass, for-gatepass, delivered, awaiting-stowage, awaiting-signed-docs, cro, for-web, for-debit, for-final, for-lodgement).

- [ ] **Step 3: Commit**

```bash
git add src/utils/statusTags.ts src/utils/truckingTags.ts
git commit -m "feat: remove operational layer tags from status tag definitions"
```

---

## Task 3: Server — Shipment Events Endpoints

**Files:**
- Modify: `src/supabase/functions/server/index.tsx`

- [ ] **Step 1: Add `SHIPMENT_EVENT_KEYS` validation set to the server**

Add near the existing `SHIPMENT_TAG_KEYS` set (around line 6027):

```typescript
const VALID_SHIPMENT_EVENT_KEYS = new Set([
  "draft", "signed", "stowaged", "lodged", "final",
  "for-debit", "debited", "discharged", "cro", "web",
  "ready-gatepass", "delivered", "returned",
]);
```

- [ ] **Step 2: Add `PUT /import-bookings/:id/shipment-events` endpoint**

Add after the existing `PUT /import-bookings/:id/shipment-tags` endpoint (after line 6879):

```typescript
app.put("/make-server-ce0d67b8/import-bookings/:id/shipment-events", async (c) => {
  const id = c.req.param("id");
  const { shipmentEvents, user } = await c.req.json();

  const existing = await kv.get(`import_booking:${id}`);
  if (!existing) return c.json({ success: false, error: "Not found" }, 404);

  // Validate event keys
  const validEvents = (shipmentEvents || []).filter(
    (e: any) => VALID_SHIPMENT_EVENT_KEYS.has(e.event) && e.dateTime
  );

  const updated = {
    ...existing,
    shipmentEvents: validEvents,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(`import_booking:${id}`, updated);
  return c.json({ success: true, data: updated });
});
```

- [ ] **Step 3: Add `PUT /trucking-records/:id/update-booking-events` endpoint**

Add after the existing `PUT /trucking-records/:id/update-booking-tags` endpoint (after line 3660):

```typescript
app.put("/make-server-ce0d67b8/trucking-records/:id/update-booking-events", async (c) => {
  const id = c.req.param("id");
  const { shipmentEvents, user } = await c.req.json();

  const record = await kv.get(`trucking-record:${id}`);
  if (!record) return c.json({ success: false, error: "Trucking record not found" }, 404);
  if (!record.linkedBookingId || !record.linkedBookingType) {
    return c.json({ success: false, error: "No linked booking" }, 400);
  }

  const prefix = record.linkedBookingType === "import" ? "import_booking:" : "export_booking:";
  const booking = await kv.get(`${prefix}${record.linkedBookingId}`);
  if (!booking) return c.json({ success: false, error: "Linked booking not found" }, 404);

  // Validate event keys
  const validEvents = (shipmentEvents || []).filter(
    (e: any) => VALID_SHIPMENT_EVENT_KEYS.has(e.event) && e.dateTime
  );

  const updatedBooking = {
    ...booking,
    shipmentEvents: validEvents,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(`${prefix}${record.linkedBookingId}`, updatedBooking);

  return c.json({ success: true, data: { shipmentEvents: validEvents } });
});
```

- [ ] **Step 4: Update `enrichTruckingRecordWithLinkedTags` to include `shipmentEvents`**

In the `enrichTruckingRecordWithLinkedTags` function (around line 6299-6314), update the return when a linked booking is found to also include `shipmentEvents`:

Currently it returns:
```typescript
return {
  ...migratedRecord,
  linkedBookingShipmentTags: booking.shipmentTags || [],
  linkedBookingTagHistory: booking.tagHistory || [],
};
```

Change to:
```typescript
return {
  ...migratedRecord,
  linkedBookingShipmentTags: booking.shipmentTags || [],
  linkedBookingTagHistory: booking.tagHistory || [],
  linkedBookingShipmentEvents: booking.shipmentEvents || [],
};
```

Also update the fallback return (when no booking found) to include `linkedBookingShipmentEvents: []`.

- [ ] **Step 5: Update `POST /trucking-records` to set default `truckingStatus`**

In the POST handler (around line 3499-3538), add default `truckingStatus` to the body before saving:

After the line that sets `createdAt` and `updatedAt`, add:
```typescript
body.truckingStatus = body.truckingStatus || "Awaiting Trucking";
```

- [ ] **Step 6: Remove operational tag keys from server `STATUS_TAG_LABELS`**

In the `STATUS_TAG_LABELS` object (lines 5978-6007), remove the operational entries:
```typescript
// REMOVE these entries:
  "awaiting-trucking": "Awaiting Trucking",
  "checking-trucking": "Checking Trucking",
  "looking-truck": "Looking for a Truck",
  "requesting-rates": "Requesting Rates",
  "booked": "Booked",
  "schedule": "Schedule",
  "re-schedule": "Re-Schedule",
  "awaiting-address": "Awaiting Address",
  "awaiting-schedule": "Awaiting Schedule",
  "client-will-handle": "Client Will Handle",
  "client-will-handle-trucking": "Client Will Handle the Trucking",
```

- [ ] **Step 7: Commit**

```bash
git add src/supabase/functions/server/index.tsx
git commit -m "feat: add shipment events endpoints, trucking status default, enrich with events"
```

---

## Task 4: ShipmentMilestonesTab Component

**Files:**
- Create: `src/components/operations/shared/ShipmentMilestonesTab.tsx`

- [ ] **Step 1: Create the reusable `ShipmentMilestonesTab` component**

This component is shared between ImportBookingDetails and TruckingRecordDetails. It renders all 13 event rows with date/time inputs and note fields.

```typescript
import { useState, useEffect } from "react";
import { SHIPMENT_EVENT_KEYS, SHIPMENT_EVENT_LABELS } from "../../../constants/shipmentEvents";
import type { ShipmentEvent } from "../../../types/operations";
import { DateTimeInput } from "./DateTimeInput";

interface ShipmentMilestonesTabProps {
  shipmentEvents: ShipmentEvent[];
  onSave: (events: ShipmentEvent[]) => Promise<void>;
  disabled?: boolean;
}

export function ShipmentMilestonesTab({
  shipmentEvents,
  onSave,
  disabled = false,
}: ShipmentMilestonesTabProps) {
  // Build local state: a map from event key to { dateTime, note }
  // Split dateTime ISO into date (YYYY-MM-DD) and time (HH:mm) for DateTimeInput
  const [eventData, setEventData] = useState<
    Record<string, { date: string; time: string; note: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from props
  useEffect(() => {
    const map: Record<string, { date: string; time: string; note: string }> = {};
    for (const ev of shipmentEvents) {
      const dt = ev.dateTime ? new Date(ev.dateTime) : null;
      map[ev.event] = {
        date: dt ? dt.toISOString().slice(0, 10) : "",
        time: dt ? dt.toISOString().slice(11, 16) : "",
        note: ev.note || "",
      };
    }
    setEventData(map);
  }, [shipmentEvents]);

  const updateField = (
    eventKey: string,
    field: "date" | "time" | "note",
    value: string,
  ) => {
    setEventData((prev) => ({
      ...prev,
      [eventKey]: {
        date: prev[eventKey]?.date || "",
        time: prev[eventKey]?.time || "",
        note: prev[eventKey]?.note || "",
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert local state back to ShipmentEvent[] (only include events with a date)
      const events: ShipmentEvent[] = [];
      for (const key of SHIPMENT_EVENT_KEYS) {
        const data = eventData[key];
        if (data?.date) {
          // Combine date + time into ISO string
          const timePart = data.time || "00:00";
          const dateTime = `${data.date}T${timePart}:00`;
          events.push({ event: key, dateTime, note: data.note || "" });
        }
      }
      await onSave(events);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px 48px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#0A1D4D",
            margin: 0,
          }}
        >
          Shipment Milestones
        </h3>
        {!disabled && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              background: isSaving ? "#9CA3AF" : "#0F766E",
              color: "#FFFFFF",
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr 1fr",
          gap: "12px",
          padding: "8px 0",
          borderBottom: "1px solid #E5E9F0",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#667085",
            letterSpacing: "0.06em",
          }}
        >
          Event
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#667085",
            letterSpacing: "0.06em",
          }}
        >
          Date & Time
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#667085",
            letterSpacing: "0.06em",
          }}
        >
          Note
        </span>
      </div>

      {/* Event rows */}
      {SHIPMENT_EVENT_KEYS.map((key) => {
        const data = eventData[key] || { date: "", time: "", note: "" };
        return (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr 1fr",
              gap: "12px",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #F3F4F6",
            }}
          >
            {/* Event label */}
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#0A1D4D",
              }}
            >
              {SHIPMENT_EVENT_LABELS[key]}
            </span>

            {/* Date + Time */}
            <DateTimeInput
              dateValue={data.date}
              timeValue={data.time}
              onDateChange={(val) => updateField(key, "date", val)}
              onTimeChange={(val) => updateField(key, "time", val)}
              disabled={disabled}
              compact
            />

            {/* Note */}
            <input
              type="text"
              value={data.note}
              onChange={(e) => updateField(key, "note", e.target.value)}
              disabled={disabled}
              placeholder="Add note..."
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                outline: "none",
                color: "#0A1D4D",
                background: disabled ? "#F9FAFB" : "#FFFFFF",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/operations/shared/ShipmentMilestonesTab.tsx
git commit -m "feat: create reusable ShipmentMilestonesTab component"
```

---

## Task 5: Import Detail — Sub-tabs and Shipment Milestones

**Files:**
- Modify: `src/components/operations/ImportBookingDetails.tsx`

- [ ] **Step 1: Add imports**

At the top of `ImportBookingDetails.tsx`, add:

```typescript
import { SubTabRow } from "./shared/SubTabRow";
import { ShipmentMilestonesTab } from "./shared/ShipmentMilestonesTab";
import type { ShipmentEvent } from "../../types/operations";
```

Remove the import of `IMPORT_STATUS_OPTIONS` and `IMPORT_STATUS_TEXT_COLORS` from `../../constants/importStatuses`.

Remove the import of `HeaderStatusDropdown` from `../shared/HeaderStatusDropdown` (used for the legacy status dropdown in the header).

- [ ] **Step 2: Add sub-tab state and shipment events save handler to `BrokerageBookingDetails`**

Inside the `BrokerageBookingDetails` component (the main export), add state for the sub-tab after the existing state declarations:

```typescript
const [activeBookingSubTab, setActiveBookingSubTab] = useState<"booking-details" | "shipment-milestones">("booking-details");
```

Add the save handler for shipment events:

```typescript
const handleSaveShipmentEvents = async (events: ShipmentEvent[]) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/import-bookings/${currentBooking.id}/shipment-events`,
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
      setCurrentBooking(result.data);
      toast.success("Shipment milestones saved");
      onBookingUpdated();
    } else {
      toast.error(`Failed to save: ${result.error || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Error saving shipment events:", err);
    toast.error("Unable to save shipment milestones");
  }
};
```

- [ ] **Step 3: Remove the `HeaderStatusDropdown` from the header**

In the header section (around lines 608-614), remove the `HeaderStatusDropdown` component and the `handleStatusChange` function (around lines 307-342). The shipment tags (`StatusTagBar`) remain as the primary status indicator.

- [ ] **Step 4: Add `SubTabRow` inside the "booking-info" tab content area**

Find the "booking-info" tab content (around line 669):

```tsx
<div style={{ display: activeTab === "booking-info" ? undefined : "none", height: "100%" }}>
```

Replace the direct rendering of `BookingInformationTab` with a sub-tab layout:

```tsx
<div style={{ display: activeTab === "booking-info" ? undefined : "none", height: "100%", display2: "flex", flexDirection: "column" }}>
  <SubTabRow
    tabs={[
      { id: "booking-details", label: "Booking Details" },
      { id: "shipment-milestones", label: "Shipment Milestones" },
    ]}
    activeTab={activeBookingSubTab}
    onTabChange={(id) => setActiveBookingSubTab(id as "booking-details" | "shipment-milestones")}
  />
  <div style={{ flex: 1, overflow: "auto" }}>
    {activeBookingSubTab === "booking-details" && (
      <BookingInformationTab
        booking={editedBooking}
        onBookingUpdated={onBookingUpdated}
        addActivity={addActivity}
        setEditedBooking={setEditedBooking}
        isEditing={isEditing}
        editData={editData}
        setEditData={setEditData}
        handleSave={handleSave}
        handleCancel={handleCancel}
        isSaving={isSaving}
        projects={projects}
      />
    )}
    {activeBookingSubTab === "shipment-milestones" && (
      <ShipmentMilestonesTab
        shipmentEvents={currentBooking.shipmentEvents || []}
        onSave={handleSaveShipmentEvents}
      />
    )}
  </div>
</div>
```

Note: The wrapping div needs `display: "flex"` and `flexDirection: "column"` as inline styles. The existing `display` conditional for tab visibility should be preserved using the pattern already in the file.

- [ ] **Step 5: Remove `LEGACY_IMPORT_STATUS_TO_TAGS` mapping**

The `LEGACY_IMPORT_STATUS_TO_TAGS` mapping (lines 143-154) and `mapLegacyImportStatusToTags` function (lines 156-158) were used to bridge old statuses to tags. With the legacy dropdown removed, these are no longer needed by the UI. However, the server still has its own migration logic, so this frontend code can be safely removed.

- [ ] **Step 6: Commit**

```bash
git add src/components/operations/ImportBookingDetails.tsx
git commit -m "feat: add sub-tabs with Shipment Milestones to import booking detail"
```

---

## Task 6: Trucking Detail — Two Status Boxes in Header

**Files:**
- Modify: `src/components/operations/TruckingRecordDetails.tsx`

- [ ] **Step 1: Add imports**

Add at the top of `TruckingRecordDetails.tsx`:

```typescript
import { TRUCKING_STATUS_OPTIONS, DEFAULT_TRUCKING_STATUS, TRUCKING_STATUS_COLORS } from "../../../constants/truckingStatuses";
```

(The `HeaderStatusDropdown` import should already exist.)

- [ ] **Step 2: Replace the single status dropdown in the header with two side-by-side boxes**

Find the header area where the current `HeaderStatusDropdown` is rendered (around lines 1189-1196). Currently it shows:

```tsx
<HeaderStatusDropdown
  currentStatus={primaryTagLabel}
  statusOptions={truckingTagLabels}
  statusColorMap={truckingTagColorMap}
  onStatusChange={handleTagFromDropdown}
/>
```

Replace this section with two side-by-side status boxes:

```tsx
<div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
  {/* Shipment Status — synced with linked booking */}
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.06em" }}>
      Shipment Status
      {currentRecord.linkedBookingId && (
        <span style={{ fontSize: "10px", fontWeight: 400, textTransform: "none", color: "#9CA3AF", marginLeft: "6px" }}>
          Synced
        </span>
      )}
    </span>
    {currentRecord.linkedBookingId ? (
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {linkedShipmentTags.length > 0 ? (
          linkedShipmentTags.map((tagKey) => {
            const tag = getTagByKey(tagKey);
            return (
              <span
                key={tagKey}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "#E8F5F3",
                  color: "#0A1D4D",
                  border: "1px solid #C1D9CC",
                }}
              >
                {tag?.label || tagKey}
              </span>
            );
          })
        ) : (
          <span style={{ fontSize: "12px", color: "#9CA3AF" }}>No status tags</span>
        )}
      </div>
    ) : (
      <span style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>No linked booking</span>
    )}
  </div>

  {/* Trucking Status — independent dropdown */}
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.06em" }}>
      Trucking Status
    </span>
    <HeaderStatusDropdown
      currentStatus={currentRecord.truckingStatus || DEFAULT_TRUCKING_STATUS}
      statusOptions={[...TRUCKING_STATUS_OPTIONS]}
      statusColorMap={TRUCKING_STATUS_COLORS}
      onStatusChange={handleTruckingStatusChange}
    />
  </div>
</div>
```

- [ ] **Step 3: Add `handleTruckingStatusChange` handler**

Replace the existing `handleTagFromDropdown` function and `handleQuickStatusUpdate` function with a simpler handler for the single-select trucking status:

```typescript
const handleTruckingStatusChange = useCallback(
  async (newStatus: string) => {
    const prevRecord = { ...currentRecord };
    setCurrentRecord((prev) => ({ ...prev, truckingStatus: newStatus }));
    if (isEditing) {
      setEditForm((prev) => ({ ...prev, truckingStatus: newStatus }));
    }

    try {
      const payload = { ...currentRecord, truckingStatus: newStatus, updatedAt: new Date().toISOString() };
      const res = await fetch(`${API_BASE_URL}/trucking-records/${currentRecord.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setCurrentRecord(result.data);
        if (isEditing) {
          setEditForm((prev) => ({ ...prev, truckingStatus: result.data.truckingStatus }));
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
  [currentRecord, isEditing, onUpdate],
);
```

- [ ] **Step 4: Remove the operational tag computation and related code**

Remove the code that computes `truckingOpTags`, `truckingTagLabels`, `truckingTagColorMap`, and `primaryTagLabel` (around lines 1064-1099). These were used for the old multi-tag operational status dropdown and are no longer needed.

Remove `handleTagFromDropdown` (lines 1092-1099) and `handleQuickStatusUpdate` (lines 835-874).

Remove the status tags display section (lines 1804-1876) that renders the operational tags as chips in the trucking info area. This UI section is replaced by the header dropdown.

- [ ] **Step 5: Commit**

```bash
git add src/components/operations/TruckingRecordDetails.tsx
git commit -m "feat: two status boxes in trucking header — synced shipment + independent trucking dropdown"
```

---

## Task 7: Trucking Detail — Shipment Milestones Tab

**Files:**
- Modify: `src/components/operations/TruckingRecordDetails.tsx`

- [ ] **Step 1: Add ShipmentMilestonesTab import**

```typescript
import { ShipmentMilestonesTab } from "./shared/ShipmentMilestonesTab";
import type { ShipmentEvent } from "../../types/operations";
```

- [ ] **Step 2: Add state for linked shipment events**

After the existing `linkedShipmentTags` state (around line 681):

```typescript
const [linkedShipmentEvents, setLinkedShipmentEvents] = useState<ShipmentEvent[]>(
  ((record as any).linkedBookingShipmentEvents || []) as ShipmentEvent[],
);
```

Also update the linked booking fetch (around line 735-794) to extract `shipmentEvents` from the enriched record response. In the fetch handler where `linkedBookingShipmentTags` is set, also set:

```typescript
setLinkedShipmentEvents((enrichedRecord.linkedBookingShipmentEvents || []) as ShipmentEvent[]);
```

- [ ] **Step 3: Add shipment events save handler**

```typescript
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
```

- [ ] **Step 4: Add "Shipment Milestones" to the tab list**

Find the tabs array (around line 1209-1212):

```typescript
tabs={[
  { id: "trucking-info", label: "Trucking Information" },
  { id: "attachments", label: "Attachments" }
]}
```

Change to:

```typescript
tabs={[
  { id: "trucking-info", label: "Trucking Information" },
  { id: "shipment-milestones", label: "Shipment Milestones" },
  { id: "attachments", label: "Attachments" }
]}
```

Update the `activeTab` type to include `"shipment-milestones"`:

```typescript
const [activeTab, setActiveTab] = useState<"trucking-info" | "shipment-milestones" | "attachments">("trucking-info");
```

- [ ] **Step 5: Render ShipmentMilestonesTab content**

In the tab content rendering area, add a new content section for the milestones tab (next to the existing trucking-info and attachments content):

```tsx
{activeTab === "shipment-milestones" && (
  <ShipmentMilestonesTab
    shipmentEvents={linkedShipmentEvents}
    onSave={handleSaveLinkedShipmentEvents}
    disabled={!currentRecord.linkedBookingId}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/operations/TruckingRecordDetails.tsx
git commit -m "feat: add Shipment Milestones tab to trucking detail screen"
```

---

## Task 8: Trucking Module — List View Status Display

**Files:**
- Modify: `src/components/operations/TruckingModule.tsx`

- [ ] **Step 1: Replace `StatusPill` with simple trucking status text**

Find the `StatusPill` component (lines 356-403) and the `StatusTagFilter` component (lines 114-330). These display operational tags from `remarks`. Replace them.

First, replace the `StatusPill` usage in the table body (around line 716):

```tsx
// Old:
<StatusPill tags={r.remarks || []} />

// New:
<span
  style={{
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    background: "#E8F5F3",
    color: TRUCKING_STATUS_COLORS[r.truckingStatus || "Awaiting Trucking"] || "#6B7A76",
    border: "1px solid #C1D9CC",
  }}
>
  {r.truckingStatus || "Awaiting Trucking"}
</span>
```

Add the import at the top:
```typescript
import { TRUCKING_STATUS_OPTIONS, TRUCKING_STATUS_COLORS } from "../../constants/truckingStatuses";
```

- [ ] **Step 2: Replace `StatusTagFilter` with a simple dropdown filter**

Replace the complex multi-tag `StatusTagFilter` component with a single-select status filter. Find where `StatusTagFilter` is rendered (around line 599):

```tsx
// Old:
<StatusTagFilter
  selectedTags={statusTags}
  onChange={setStatusTags}
  matchMode={statusMatchMode}
  onMatchModeChange={setStatusMatchMode}
/>

// New:
<select
  value={selectedTruckingStatus}
  onChange={(e) => setSelectedTruckingStatus(e.target.value)}
  style={{
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #E5E9F0",
    borderRadius: "8px",
    color: "#0A1D4D",
    background: "#FFFFFF",
    cursor: "pointer",
    outline: "none",
  }}
>
  <option value="">All Statuses</option>
  {TRUCKING_STATUS_OPTIONS.map((status) => (
    <option key={status} value={status}>{status}</option>
  ))}
</select>
```

Update the state:
```typescript
// Old:
const [statusTags, setStatusTags] = useState<string[]>([]);
const [statusMatchMode, setStatusMatchMode] = useState<"any" | "all">("all");

// New:
const [selectedTruckingStatus, setSelectedTruckingStatus] = useState<string>("");
```

Update the filtering logic (around lines 490-496):
```typescript
// Old:
if (statusTags.length > 0) {
  if (statusMatchMode === "any") {
    if (!tags.some((t) => statusTags.includes(t))) return false;
  } else if (statusMatchMode === "all") {
    if (!statusTags.every((t) => tags.includes(t))) return false;
  }
}

// New:
if (selectedTruckingStatus) {
  if ((r.truckingStatus || "Awaiting Trucking") !== selectedTruckingStatus) return false;
}
```

- [ ] **Step 3: Remove the `StatusPill` and `StatusTagFilter` component definitions**

Delete the `StatusPill` component (lines 356-403) and `StatusTagFilter` component (lines 114-330) from the file since they are no longer used.

Remove the import of `ALL_TRUCKING_TAGS` and `TRUCKING_TAG_GROUPS` from `../../utils/truckingTags` if no longer referenced.

- [ ] **Step 4: Commit**

```bash
git add src/components/operations/TruckingModule.tsx
git commit -m "feat: replace multi-tag status with single-select trucking status in list view"
```

---

## Task 9: Create Trucking Modal — Default Status and Remove Tag Selector

**Files:**
- Modify: `src/components/operations/CreateTruckingModal.tsx`

- [ ] **Step 1: Add import and set default trucking status**

Add import:
```typescript
import { TRUCKING_STATUS_OPTIONS, DEFAULT_TRUCKING_STATUS, TRUCKING_STATUS_COLORS } from "../../constants/truckingStatuses";
```

In the initial form state (around line 545-556), add:
```typescript
truckingStatus: DEFAULT_TRUCKING_STATUS,
```

- [ ] **Step 2: Replace `TagSelector` with a simple status dropdown**

Find where the `TagSelector` component is rendered for operational tags (around lines 1456-1485). Replace with a simple select dropdown:

```tsx
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
```

- [ ] **Step 3: Remove the `TagSelector` and `TagChip` component definitions**

Delete the `TagSelector` component (around lines 393-494) and `TagChip` component (around lines 373-390) from the file. Remove imports of `ALL_TRUCKING_TAGS`, `TRUCKING_TAG_GROUPS` from `../../utils/truckingTags` if no longer referenced.

- [ ] **Step 4: Ensure `truckingStatus` is included in the form submission**

The existing `handleSubmit` (around line 921) already spreads `...form` into the payload, so `truckingStatus` will be included automatically. Verify this is the case — no additional change needed.

- [ ] **Step 5: Commit**

```bash
git add src/components/operations/CreateTruckingModal.tsx
git commit -m "feat: replace tag selector with trucking status dropdown in create modal"
```

---

## Task 10: Cleanup and Verification

**Files:**
- Delete: `src/constants/importStatuses.ts`
- Verify: All modified files compile

- [ ] **Step 1: Delete `src/constants/importStatuses.ts`**

This file contained `IMPORT_STATUS_OPTIONS`, `IMPORT_STATUS_COLORS`, and `IMPORT_STATUS_TEXT_COLORS` which were used by the legacy `HeaderStatusDropdown` in ImportBookingDetails. Since that dropdown is removed, this file is no longer needed.

```bash
git rm src/constants/importStatuses.ts
```

- [ ] **Step 2: Search for any remaining references to `importStatuses`**

```bash
grep -r "importStatuses" src/ --include="*.ts" --include="*.tsx"
```

If any files still import from `importStatuses`, update them to remove the import. The server file (`index.tsx`) has its own `LEGACY_IMPORT_STATUS_TO_TAGS` mapping that is independent of this frontend file.

- [ ] **Step 3: Search for any remaining references to removed operational tag functions**

```bash
grep -r "getOperationalTags\|operationalTags\|ALL_TRUCKING_TAGS\|TRUCKING_TAG_GROUPS" src/ --include="*.ts" --include="*.tsx"
```

Fix any remaining references. The `StatusTagBar` component still has operational tag support — if it's only used for imports (which don't have operational tags), the operational section will simply be empty. No change needed to `StatusTagBar` itself.

- [ ] **Step 4: Run build to verify compilation**

```bash
npm run build
```

Fix any TypeScript or build errors.

- [ ] **Step 5: Run dev server and manually test**

```bash
npm run dev
```

Verify:
1. Import detail: Sub-tabs appear (Booking Details + Shipment Milestones)
2. Import detail: Legacy status dropdown is gone
3. Import detail: Shipment Milestones tab shows 13 events with date/time + note
4. Import detail: Saving milestones persists correctly
5. Trucking detail: Two status boxes in header (Shipment Status + Trucking Status)
6. Trucking detail: Trucking Status dropdown works with 10 options
7. Trucking detail: Shipment Milestones tab present and syncs with linked booking
8. Trucking list: Shows single trucking status instead of multi-tag pills
9. Trucking list: Status filter works as single-select dropdown
10. Create trucking modal: Shows trucking status dropdown, default "Awaiting Trucking"

- [ ] **Step 6: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove legacy import statuses, clean up references"
```
