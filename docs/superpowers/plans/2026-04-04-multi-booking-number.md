# Multi-Booking Number with Container Assignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow export bookings to have multiple shipping-line booking numbers, each with containers optionally assigned to it.

**Architecture:** Add a `BookingNumberEntry[]` array to the booking data model. Replace the single text input in the create panel with a repeatable section (text input + container checkboxes per entry). Mirror this in the detail screen's view/edit modes. KV store is schemaless so no migration needed.

**Tech Stack:** React 18, TypeScript, inline styles (Neuron design system)

**Spec:** `docs/superpowers/specs/2026-04-04-multi-booking-number-container-assignment-design.md`

---

### Task 1: Add BookingNumberEntry type and update BrokerageBooking

**Files:**
- Modify: `src/types/operations.ts:81-149` (BrokerageBooking interface)

- [ ] **Step 1: Add BookingNumberEntry interface**

Add this interface just before `BrokerageBooking` (around line 80):

```typescript
export interface BookingNumberEntry {
  id: string;
  bookingNumber: string;
  containerNos: string[];
}
```

- [ ] **Step 2: Add bookingNumbers field to BrokerageBooking**

Inside the `BrokerageBooking` interface, add after the existing `bookingId` field (around line 83):

```typescript
  bookingNumbers?: BookingNumberEntry[];
```

Keep the existing `bookingNumber?: string` — it does not exist on `BrokerageBooking` currently, so no change needed there. The legacy `bookingNumber` string only lives on `ExportBooking` in `ExportBookingDetails.tsx`.

- [ ] **Step 3: Add bookingNumbers to the local ExportBooking interface in ExportBookingDetails.tsx**

In `src/components/operations/ExportBookingDetails.tsx`, the local `ExportBooking` interface (line ~35) has `bookingNumber?: string`. Add below it:

```typescript
  bookingNumbers?: BookingNumberEntry[];
```

Also add the import at the top of the file. Since `BookingNumberEntry` is exported from `src/types/operations.ts`, add it to any existing import from that file, or add:

```typescript
import type { BookingNumberEntry } from "../../types/operations";
```

- [ ] **Step 4: Commit**

```bash
git add src/types/operations.ts src/components/operations/ExportBookingDetails.tsx
git commit -m "feat: add BookingNumberEntry type for multi-booking numbers"
```

---

### Task 2: Replace single booking number with repeatable section in CreateExportBookingPanel

**Files:**
- Modify: `src/components/operations/CreateExportBookingPanel.tsx`

- [ ] **Step 1: Replace the bookingNumber state with bookingNumbers array state**

At line 428, replace:

```typescript
const [bookingNumber, setBookingNumber] = useState("");
```

with:

```typescript
const [bookingNumbers, setBookingNumbers] = useState<{ id: string; bookingNumber: string; containerNos: string[] }[]>([
  { id: crypto.randomUUID(), bookingNumber: "", containerNos: [] }
]);
```

- [ ] **Step 2: Add helper functions for booking number entries**

Add these right after the `updateSealRow` function (around line 512):

```typescript
// Booking number helpers
const addBookingNumberEntry = () => {
  setBookingNumbers([...bookingNumbers, { id: crypto.randomUUID(), bookingNumber: "", containerNos: [] }]);
};
const removeBookingNumberEntry = (index: number) => {
  setBookingNumbers(bookingNumbers.filter((_, i) => i !== index));
};
const updateBookingNumberValue = (index: number, value: string) => {
  const updated = [...bookingNumbers];
  updated[index] = { ...updated[index], bookingNumber: value };
  setBookingNumbers(updated);
};
const toggleContainerAssignment = (entryIndex: number, containerNo: string) => {
  const updated = bookingNumbers.map((entry, i) => {
    if (i === entryIndex) {
      // Toggle: add if not present, remove if present
      const has = entry.containerNos.includes(containerNo);
      return { ...entry, containerNos: has ? entry.containerNos.filter(c => c !== containerNo) : [...entry.containerNos, containerNo] };
    }
    // Remove from other entries (exclusive assignment)
    return { ...entry, containerNos: entry.containerNos.filter(c => c !== containerNo) };
  });
  setBookingNumbers(updated);
};
```

- [ ] **Step 3: Update the submission payload**

In the `handleSubmit` function (around line 525), in the `bookingData` object:

Replace:
```typescript
bookingNumber,
```

With:
```typescript
bookingNumber: bookingNumbers[0]?.bookingNumber || "",
bookingNumbers: bookingNumbers.filter(e => e.bookingNumber.trim()),
```

- [ ] **Step 4: Update the handleClose reset**

In `handleClose` (around line 645), replace:
```typescript
setBookingNumber("");
```

With:
```typescript
setBookingNumbers([{ id: crypto.randomUUID(), bookingNumber: "", containerNos: [] }]);
```

- [ ] **Step 5: Replace the Booking Number input in the JSX**

Find the `{/* Shipping Line | Booking Number */}` section (around line 913). Replace the entire block:

```tsx
{/* Shipping Line | Booking Number */}
<div style={twoCol}>
  <div>
    <label style={labelStyle}>Shipping Line</label>
    <ShippingLineDropdown value={shippingLine} onChange={setShippingLine} />
  </div>
  <div>
    <label style={labelStyle}>Booking Number</label>
    <NeuronInput
      value={bookingNumber}
      onChange={setBookingNumber}
      placeholder="Enter booking number"
    />
  </div>
</div>
```

With:

```tsx
{/* Shipping Line */}
<div>
  <label style={labelStyle}>Shipping Line</label>
  <ShippingLineDropdown value={shippingLine} onChange={setShippingLine} />
</div>

{/* Booking Numbers */}
<div>
  <label style={labelStyle}>Booking Numbers</label>
  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    {bookingNumbers.map((entry, idx) => {
      const filledContainers = containerNumbers.filter(c => c.trim());
      return (
        <div key={entry.id} style={{
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          padding: "12px",
          backgroundColor: "#FAFBFC",
        }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: filledContainers.length > 0 ? "10px" : 0 }}>
            <input
              type="text"
              value={entry.bookingNumber}
              onChange={(e) => updateBookingNumberValue(idx, e.target.value)}
              placeholder={`Booking number #${idx + 1}`}
              style={{ ...neuronInputStyle, flex: 1, backgroundColor: "white" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
            />
            <button
              type="button"
              onClick={() => removeBookingNumberEntry(idx)}
              disabled={bookingNumbers.length <= 1}
              style={{
                padding: "8px",
                color: "#EF4444",
                backgroundColor: "transparent",
                border: "none",
                cursor: bookingNumbers.length <= 1 ? "not-allowed" : "pointer",
                opacity: bookingNumbers.length <= 1 ? 0.3 : 1,
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
          {filledContainers.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {filledContainers.map((c) => {
                const isChecked = entry.containerNos.includes(c);
                return (
                  <label
                    key={c}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      border: isChecked ? "1px solid #0F766E" : "1px solid #E5E9F0",
                      backgroundColor: isChecked ? "#F0FDFA" : "white",
                      color: isChecked ? "#0F766E" : "#667085",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleContainerAssignment(idx, c)}
                      style={{ display: "none" }}
                    />
                    {isChecked && <Check size={12} />}
                    {c}
                  </label>
                );
              })}
            </div>
          )}
          {filledContainers.length === 0 && (
            <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>
              No containers added yet
            </div>
          )}
        </div>
      );
    })}
    <button
      type="button"
      onClick={addBookingNumberEntry}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: "8px",
        border: "1px dashed #0F766E",
        borderRadius: "8px",
        backgroundColor: "#F0FDFA",
        color: "#0F766E",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      <Plus size={14} /> Add Booking Number
    </button>
  </div>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/operations/CreateExportBookingPanel.tsx
git commit -m "feat: multi-booking number UI in export create panel"
```

---

### Task 3: Update ExportBookingDetails view mode for booking numbers

**Files:**
- Modify: `src/components/operations/ExportBookingDetails.tsx`

- [ ] **Step 1: Add a BookingNumbersViewField component**

Add this function after the existing `ContainerListField` function (around line 1520):

```tsx
function BookingNumbersViewField({
  bookingNumbers,
  legacyBookingNumber,
}: {
  bookingNumbers?: BookingNumberEntry[];
  legacyBookingNumber?: string;
}) {
  const entries = bookingNumbers && bookingNumbers.length > 0
    ? bookingNumbers
    : legacyBookingNumber
      ? [{ id: "legacy", bookingNumber: legacyBookingNumber, containerNos: [] }]
      : [];

  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px",
      }}>
        Booking Numbers
      </label>
      {entries.length === 0 ? (
        <div style={{
          padding: "10px 14px",
          backgroundColor: "white",
          border: "2px dashed #E5E9F0",
          borderRadius: "6px",
          fontSize: "14px",
          color: "#9CA3AF",
        }}>
          —
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{
              padding: "10px 14px",
              backgroundColor: "#FAFBFC",
              border: "1px solid #E5E9F0",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--neuron-ink-primary)" }}>
                {entry.bookingNumber}
              </span>
              {entry.containerNos.length > 0 && (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {entry.containerNos.map((c) => (
                    <span key={c} style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 500,
                      backgroundColor: "#E8F2EE",
                      color: "#237F66",
                    }}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the Booking Number field in the Shipment Details JSX**

Find the `{/* Row 4: Shipping Line + Booking Number */}` section (around line 2585). Replace:

```tsx
{/* Row 4: Shipping Line + Booking Number */}
<div style={twoCol}>
  {renderEditDropdown("shippingLine", "Shipping Line", SHIPPING_LINE_OPTIONS, showShippingLineDD, setShowShippingLineDD, undefined, true, shippingLineSearch, setShippingLineSearch)}
  <EditableField
    fieldName="bookingNumber"
    label="Booking Number"
    value={(mergedBooking as any).bookingNumber || ""}
    status={mergedBooking.status as ExecutionStatus}
    isEditing={isEditing}
    editData={mergedEditData}
    setEditData={mergedSetEditData}
  />
</div>
```

With:

```tsx
{/* Row 4: Shipping Line */}
<div style={twoCol}>
  {renderEditDropdown("shippingLine", "Shipping Line", SHIPPING_LINE_OPTIONS, showShippingLineDD, setShowShippingLineDD, undefined, true, shippingLineSearch, setShippingLineSearch)}
  <div />
</div>

{/* Row 4b: Booking Numbers */}
{isEditing ? (
  <BookingNumbersEditField
    bookingNumbers={(mergedEditData as any).bookingNumbers ?? (mergedBooking as any).bookingNumbers}
    legacyBookingNumber={(mergedBooking as any).bookingNumber}
    containerNo={(mergedEditData as any).containerNo ?? (mergedBooking as any).containerNo}
    setEditData={mergedSetEditData}
  />
) : (
  <BookingNumbersViewField
    bookingNumbers={(mergedBooking as any).bookingNumbers}
    legacyBookingNumber={(mergedBooking as any).bookingNumber}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/operations/ExportBookingDetails.tsx
git commit -m "feat: booking numbers view mode in export detail screen"
```

---

### Task 4: Add BookingNumbersEditField for the detail screen edit mode

**Files:**
- Modify: `src/components/operations/ExportBookingDetails.tsx`

- [ ] **Step 1: Add the BookingNumbersEditField component**

Add this function right after the `BookingNumbersViewField` function:

```tsx
function BookingNumbersEditField({
  bookingNumbers,
  legacyBookingNumber,
  containerNo,
  setEditData,
}: {
  bookingNumbers?: BookingNumberEntry[];
  legacyBookingNumber?: string;
  containerNo?: string;
  setEditData: (data: any) => void;
}) {
  // Initialize from existing data or legacy field
  const entries: BookingNumberEntry[] = bookingNumbers && bookingNumbers.length > 0
    ? bookingNumbers
    : legacyBookingNumber
      ? [{ id: crypto.randomUUID(), bookingNumber: legacyBookingNumber, containerNos: [] }]
      : [{ id: crypto.randomUUID(), bookingNumber: "", containerNos: [] }];

  // Parse container list from the booking's containerNo field
  const allContainers: string[] = (() => {
    if (!containerNo) return [];
    if (Array.isArray(containerNo)) return (containerNo as string[]).filter(Boolean);
    return containerNo.split(",").map((s: string) => s.trim()).filter(Boolean);
  })();

  const updateEntries = (newEntries: BookingNumberEntry[]) => {
    setEditData({ bookingNumbers: newEntries, bookingNumber: newEntries[0]?.bookingNumber || "" });
  };

  const addEntry = () => {
    updateEntries([...entries, { id: crypto.randomUUID(), bookingNumber: "", containerNos: [] }]);
  };

  const removeEntry = (index: number) => {
    updateEntries(entries.filter((_, i) => i !== index));
  };

  const updateValue = (index: number, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], bookingNumber: value };
    updateEntries(updated);
  };

  const toggleContainer = (entryIndex: number, container: string) => {
    const updated = entries.map((entry, i) => {
      if (i === entryIndex) {
        const has = entry.containerNos.includes(container);
        return { ...entry, containerNos: has ? entry.containerNos.filter(c => c !== container) : [...entry.containerNos, container] };
      }
      return { ...entry, containerNos: entry.containerNos.filter(c => c !== container) };
    });
    updateEntries(updated);
  };

  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px",
      }}>
        Booking Numbers
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {entries.map((entry, idx) => (
          <div key={entry.id} style={{
            border: "1px solid var(--neuron-ui-border, #E5E9F0)",
            borderRadius: "8px",
            padding: "12px",
            backgroundColor: "#FAFBFC",
          }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: allContainers.length > 0 ? "10px" : 0 }}>
              <input
                type="text"
                value={entry.bookingNumber}
                onChange={(e) => updateValue(idx, e.target.value)}
                placeholder={`Booking number #${idx + 1}`}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid var(--neuron-ui-border, #E5E9F0)",
                  borderRadius: "6px",
                  color: "var(--neuron-ink-primary)",
                  backgroundColor: "white",
                  outline: "none",
                  minHeight: "42px",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--neuron-ui-border, #E5E9F0)"; }}
              />
              <button
                type="button"
                onClick={() => removeEntry(idx)}
                disabled={entries.length <= 1}
                style={{
                  padding: "8px",
                  color: "#EF4444",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: entries.length <= 1 ? "not-allowed" : "pointer",
                  opacity: entries.length <= 1 ? 0.3 : 1,
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
            {allContainers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {allContainers.map((c) => {
                  const isChecked = entry.containerNos.includes(c);
                  return (
                    <label
                      key={c}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        border: isChecked ? "1px solid #0F766E" : "1px solid #E5E9F0",
                        backgroundColor: isChecked ? "#F0FDFA" : "white",
                        color: isChecked ? "#0F766E" : "#667085",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleContainer(idx, c)}
                        style={{ display: "none" }}
                      />
                      {isChecked && <Check size={12} />}
                      {c}
                    </label>
                  );
                })}
              </div>
            )}
            {allContainers.length === 0 && (
              <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>
                No containers on this booking
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addEntry}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px",
            border: "1px dashed #0F766E",
            borderRadius: "8px",
            backgroundColor: "#F0FDFA",
            color: "#0F766E",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Add Booking Number
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ensure Check, Plus, Trash2 are imported**

At the top of `ExportBookingDetails.tsx`, verify the lucide-react import includes `Check`, `Plus`, and `Trash2`. If missing, add them. The file already imports from `lucide-react` — check which icons are included and add any missing ones.

- [ ] **Step 3: Commit**

```bash
git add src/components/operations/ExportBookingDetails.tsx
git commit -m "feat: booking numbers edit mode in export detail screen"
```

---

### Task 5: Verify and test

**Files:** None (manual verification)

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

Verify no build errors.

- [ ] **Step 2: Manual test — Create Export Booking**

1. Navigate to Operations > Export Bookings > Create
2. Add 4 containers (e.g., MSCU1111111, MSCU2222222, MSCU3333333, MSCU4444444)
3. In Booking Numbers section, enter "BKG-001" and assign first 2 containers
4. Click "+ Add Booking Number", enter "BKG-002", assign last 2 containers
5. Submit the booking — verify it saves successfully

- [ ] **Step 3: Manual test — View Export Booking**

1. Open the booking just created
2. Verify Booking Numbers section shows both entries with container pills
3. Click Edit — verify the repeatable edit UI appears with correct data
4. Add a third booking number, reassign a container, save
5. Verify the view refreshes with updated data

- [ ] **Step 4: Manual test — Legacy booking**

1. Open an existing booking that was created before this change (has `bookingNumber` string, no `bookingNumbers` array)
2. Verify it displays the legacy booking number correctly
3. Edit it — verify it migrates to the new format on save

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
