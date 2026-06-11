# Edit Button Pattern — Detail Screens

Instructions for Claude. This describes the **inline edit pattern** used across every detail screen in this app (bookings, trucking, billings, expenses, vouchers, collections, clients). It is generic — apply it to any detail/view screen, not just one module.

---

## The core idea

A detail screen is **one component** that renders **view mode** OR **edit mode** off a single boolean `isEditing`. There is no separate "edit page" or route. Every field checks `isEditing` and swaps a read-only display for an input. Clicking Edit flips the boolean; the whole screen re-renders in place.

---

## Two states

| State | Meaning | Shown when |
|---|---|---|
| `currentRecord` | The saved, server-truth record | view mode |
| `editForm` | A mutable **working copy** | edit mode |

One derived value chooses which to render:

```ts
const [isEditing, setIsEditing] = useState(false);
const [editForm, setEditForm] = useState(record);

const r = isEditing ? editForm : currentRecord;   // every field reads from `r`
```

Because all fields read from `r`, flipping `isEditing` swaps the entire screen at once. View mode never reads `editForm`; edit mode never reads `currentRecord`.

---

## The four operations

### 1. Enter edit mode (the Edit button)

```ts
const enterEditMode = () => {
  setEditForm(JSON.parse(JSON.stringify(currentRecord)));  // DEEP clone
  setIsEditing(true);
};
```

**Deep clone is mandatory** if the record has nested arrays/objects (line items, drops, addresses, recipients). A shallow `{...currentRecord}` leaves nested structures pointing at the same references, so editing them would silently mutate the saved record before the user even hits Save. `JSON.parse(JSON.stringify(...))` snapshots the whole tree. (For a flat record with only string/number fields, a shallow spread is fine.)

### 2. Edit fields

All mutations go through one setter:

```ts
const set = (key, value) => setEditForm((prev) => ({ ...prev, [key]: value }));
```

Each field renders conditionally:

```tsx
{isEditing
  ? <input value={r.fieldName} onChange={(e) => set("fieldName", e.target.value)} />
  : <ReadField label="Field" value={r.fieldName} />}
```

Nested arrays use index-based immutable updates (map/filter), e.g.:

```ts
const updateItem = (i, key, val) =>
  set("items", editForm.items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
```

### 3. Cancel (with discard guard)

Track whether anything changed, then guard the exit:

```ts
const hasChanges = isEditing && JSON.stringify(editForm) !== JSON.stringify(currentRecord);

const cancelEdit = () => {
  if (hasChanges) setShowDiscardConfirm(true);  // open "Discard changes?" dialog
  else setIsEditing(false);                      // nothing changed → exit silently
};
const confirmDiscard = () => { setShowDiscardConfirm(false); setIsEditing(false); };
```

Cancelling never touches `currentRecord` — `editForm` is simply dropped and re-cloned next time Edit is clicked.

### 4. Save (PUT, then exit)

```ts
const handleSave = async () => {
  setIsSaving(true);
  try {
    const payload = { ...editForm, updatedAt: new Date().toISOString() };
    const res = await fetch(`${API_BASE_URL}/<resource>/${currentRecord.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) {
      toast.success("Saved");
      setCurrentRecord(result.data);  // promote server response to the new truth
      setIsEditing(false);            // exit → view mode now shows saved data
      onUpdate?.();                   // tell parent list to refresh
    } else {
      toast.error(`Failed to save: ${result.error || "Unknown error"}`);
    }
  } catch (err) {
    console.error(err);
    toast.error("Unable to save");
  } finally {
    setIsSaving(false);
  }
};
```

`currentRecord` is updated **only on save success** — from the server response, not from `editForm` directly. That keeps the screen consistent with whatever the backend actually persisted.

---

## The button itself

The Edit / Cancel / Save buttons live in a shared toolbar component (`TabRowActions` in this app, alongside the Activity and Actions buttons). The toolbar shows **Edit** when `isEditing` is false and swaps to **Cancel + Save** when true:

```tsx
<TabRowActions
  editLabel={canEditCurrentTab ? "Edit" : null}  // null hides the button (e.g. on read-only tabs)
  onEdit={enterEditMode}
  isEditing={isEditing}        // toolbar swaps Edit ↔ Cancel+Save
  onCancel={cancelEdit}
  onSave={handleSave}
  isSaving={isSaving}          // disables Save + shows spinner while PUT in flight
  saveLabel="Save Changes"
/>
```

The header back-arrow should also be edit-aware so users don't lose work: `onClick={isEditing ? cancelEdit : onBack}`.

---

## Optional: parent-driven edit

When a detail screen is **embedded** inside another (e.g. a trucking screen shown as a sub-tab of a booking), the parent's toolbar drives edit/save through props instead of the embedded toolbar. Two effects bridge them:

```ts
// parent toggles externalEdit → enter/exit edit mode, re-seed editForm
useEffect(() => {
  if (externalEdit !== undefined) {
    setIsEditing(externalEdit);
    if (externalEdit) setEditForm({ ...currentRecord });
  }
}, [externalEdit]);

// parent increments externalSaveCounter → trigger a save
useEffect(() => {
  if (externalSaveCounter > 0 && isEditing) handleSave();
}, [externalSaveCounter]);

// notify parent whenever local edit state changes (so its toolbar updates)
const setIsEditing = (editing) => { setIsEditingInternal(editing); onEditStateChange?.(editing); };
```

Skip this entirely if the screen is always standalone.

---

## Lifecycle

```
click Edit ─► enterEditMode: deep-clone currentRecord → editForm, isEditing = true
            ─► every field renders inputs bound to editForm via set()/update helpers
   ┌─ Cancel ─► hasChanges ? confirm dialog : exit.  editForm discarded, currentRecord intact
   └─ Save   ─► PUT editForm → setCurrentRecord(response), isEditing = false, onUpdate()
```

---

## Port checklist

1. Hold two states: saved `currentRecord` + working `editForm`. Render off `const r = isEditing ? editForm : currentRecord`.
2. Edit button → **deep-clone** `currentRecord` into `editForm`, set `isEditing = true`.
3. Each field: `{isEditing ? <input value={r.x} onChange={v => set("x", v)} /> : <ReadField value={r.x} />}`.
4. Cancel → discard guard if `hasChanges`; never mutate `currentRecord` until save succeeds.
5. Save → PUT `editForm`; on success promote the server response to `currentRecord` and exit edit mode.
6. (Optional) expose `externalEdit` / `externalSaveCounter` / `onEditStateChange` props if a parent must drive it.

## Common mistakes to avoid

- **Shallow clone of a nested record** → editing mutates the saved copy before Save. Use a deep clone.
- **Reading `editForm` in view mode** (or vice-versa) → stale/blank display. Always read from `r`.
- **Setting `currentRecord = editForm` on save instead of the server response** → screen drifts from backend (e.g. server-computed fields, normalized values).
- **No discard guard on Cancel / back** → silent data loss.
- **Editing nested arrays in place** (`editForm.items[i].x = v`) → React won't re-render. Use immutable map/filter.
