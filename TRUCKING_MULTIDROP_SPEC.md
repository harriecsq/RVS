# Trucking Multi-Drop Feature — Port Spec

Portable spec for the **multi-drop delivery** feature in the NEURON trucking module. Hand this to another Claude to replicate the feature. Everything below is the *current, real* code from this repo.

Stack context: React 18 + TypeScript, inline `style={{}}` objects (no Tailwind classes for these screens), Supabase Edge Function backend (`API_BASE_URL/trucking-records`). Custom date/time pickers (`NeuronDatePicker`, `NeuronTimePicker`). Icons from `lucide-react` (`Plus`, `Trash2`, `X`).

---

## 1. What the feature does

A single trucking record can have **multiple delivery "drops"** (multi-stop deliveries). Four parallel sections each hold one entry *per drop*, kept index-aligned:

| Section | Array field | Per-row shape |
|---|---|---|
| Warehouse Arrival | `warehouseArrivals` | `{ date, time }` |
| Delivery Schedule | `deliveryDrops` | `{ deaDate, deliveryScheduleDate, deliveryScheduleTime, unloadingStart, unloadingEnd, parking, instructions[], additionalNote }` |
| Delivery Address | `deliveryAddresses` | `{ address, postalCode, recipients[], additionalNote, contactPerson?, contact? }` |
| Remarks (import only) | `remarksDrops` | `{ startDate, startTime, doneDate, doneTime }` |

**Core rule — synced add:** clicking *"Add Drop"* in *any* section grows **all** sections to `max(lengths) + 1` so row indices stay aligned (Drop 1 = arrivals[0] + deliveryDrops[0] + addresses[0] + remarksDrops[0]). Removing is per-section (independent `removeDrop`/`removeAddress`/etc.). Each drop card is numbered "Drop N"; the remove button only appears when `length > 1`.

The feature appears in **two places** with identical logic, differing only in state var names:
- **Create/Edit modal** — `CreateTruckingModal.tsx`, state = `form` / `setForm`.
- **Detail screen** — `TruckingRecordDetails.tsx`, state = `editForm` / `setEditForm`.

Both have a **view mode** (read-only `ReadField` cards) and an **edit mode** (input cards). Detail screen toggles via `isEditing`.

---

## 2. Types

```ts
interface DeliveryInstruction { text: string; }

interface DeliveryDrop {
  deaDate: string;
  deliveryScheduleDate: string;
  deliveryScheduleTime: string;
  unloadingStart: string;
  unloadingEnd: string;            // "" = no end time; non-empty renders a "to" range
  parking: string;                 // default "Availability depends on time of arrival."
  instructions: DeliveryInstruction[];
  additionalNote: string;
}

interface WarehouseArrivalDrop { date: string; time: string; }

interface RemarksDrop { startDate: string; startTime: string; doneDate: string; doneTime: string; }

interface RecipientEntry { name: string; contacts: string[]; }

interface AddressEntry {
  address: string;
  postalCode: string;
  recipients: RecipientEntry[];
  additionalNote: string;
  contactPerson?: string;
  contact?: string;
}
```

The owning record type (`TruckingRecord`) carries all four arrays plus flat legacy fields `warehouseArrivalDate` / `warehouseArrivalTime` (kept in sync with `warehouseArrivals[0]`).

---

## 3. Initial seed (create modal)

```ts
// inside useState(() => ({ ... })) initial form
warehouseArrivalDate: "", warehouseArrivalTime: "",
warehouseArrivals: [{ date: "", time: "" }],
deliveryDrops: [{
  deaDate: "", deliveryScheduleDate: "", deliveryScheduleTime: "",
  unloadingStart: "", unloadingEnd: "", parking: "Availability depends on time of arrival.",
  instructions: [{ text: "" }], additionalNote: "",
}],
deliveryAddresses: [{ address: "", postalCode: "", recipients: [{ name: "", contacts: [""] }], additionalNote: "" }],
// remarksDrops seeded ONLY for import bookings:
remarksDrops: (prefillBookingType || "").toLowerCase().includes("import")
  ? [{ startDate: "", startTime: "", doneDate: "", doneTime: "" }]
  : [],
```

Helper used everywhere to mutate a top-level form key:
```ts
const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));   // detail screen: setEditForm
```

---

## 4. Synced-add logic (THE key function)

Identical in both files; `prev` is `form` (modal) or `editForm` (detail). Note `<T,>` comma needed in `.tsx` to disambiguate from JSX.

```ts
const addSyncedDrop = () => {
  setForm((prev) => {                              // detail screen: setEditForm((prev: any) => ...)
    const wa = prev.warehouseArrivals?.length
      ? prev.warehouseArrivals
      : [{ date: prev.warehouseArrivalDate || "", time: prev.warehouseArrivalTime || "" }];
    const target = Math.max(
      wa.length,
      prev.deliveryDrops.length,
      prev.deliveryAddresses.length,
      (prev.remarksDrops || []).length,
    ) + 1;
    const pad = <T,>(arr: T[], make: () => T): T[] => {
      const result = [...arr];
      while (result.length < target) result.push(make());
      return result;
    };
    return {
      ...prev,
      warehouseArrivals: pad(wa, () => ({ date: "", time: "" })),
      deliveryDrops: pad(prev.deliveryDrops, () => ({
        deaDate: "", deliveryScheduleDate: "", deliveryScheduleTime: "",
        unloadingStart: "", unloadingEnd: "", parking: "Availability depends on time of arrival.",
        instructions: [{ text: "" }], additionalNote: "",
      })),
      deliveryAddresses: pad(prev.deliveryAddresses, () => ({
        address: "", postalCode: "", recipients: [{ name: "", contacts: [""] }], additionalNote: "",
      })),
      remarksDrops: pad(prev.remarksDrops || [], () => ({ startDate: "", startTime: "", doneDate: "", doneTime: "" })),
    };
  });
};
```

---

## 5. Per-drop CRUD helpers

```ts
const addDrop = () => addSyncedDrop();
const removeDrop = (i) => set("deliveryDrops", form.deliveryDrops.filter((_, idx) => idx !== i));
const updateDrop = (i, key, val) =>
  set("deliveryDrops", form.deliveryDrops.map((d, idx) => idx === i ? { ...d, [key]: val } : d));

// nested instructions per drop (di = drop index, ii = instruction index)
const addInstruction = (di) =>
  set("deliveryDrops", form.deliveryDrops.map((d, idx) =>
    idx === di ? { ...d, instructions: [...d.instructions, { text: "" }] } : d));
const updateInstruction = (di, ii, val) =>
  set("deliveryDrops", form.deliveryDrops.map((d, idx) =>
    idx === di ? { ...d, instructions: d.instructions.map((ins, i) => i === ii ? { text: val } : ins) } : d));
const removeInstruction = (di, ii) =>
  set("deliveryDrops", form.deliveryDrops.map((d, idx) =>
    idx === di ? { ...d, instructions: d.instructions.filter((_, i) => i !== ii) } : d));

// Address + Warehouse-arrival adds ALSO route through the synced add:
const addAddress      = () => addSyncedDrop();
const addRemarksDrop  = () => addSyncedDrop();
const removeAddress = (i) => set("deliveryAddresses", form.deliveryAddresses.filter((_, idx) => idx !== i));
const updateAddress = (i, key, val) =>
  set("deliveryAddresses", form.deliveryAddresses.map((a, idx) => idx === i ? { ...a, [key]: val } : a));

// nested recipients + contacts inside an address (ai=address, ri=recipient, ci=contact)
const addRecipient = (ai) =>
  set("deliveryAddresses", form.deliveryAddresses.map((a, i) => i === ai ? { ...a, recipients: [...a.recipients, { name: "", contacts: [""] }] } : a));
const updateRecipient = (ai, ri, key, val) =>
  set("deliveryAddresses", form.deliveryAddresses.map((a, i) =>
    i === ai ? { ...a, recipients: a.recipients.map((r, j) => j === ri ? { ...r, [key]: val } : r) } : a));
const addContact = (ai, ri) =>
  set("deliveryAddresses", form.deliveryAddresses.map((a, i) =>
    i === ai ? { ...a, recipients: a.recipients.map((r, j) => j === ri ? { ...r, contacts: [...r.contacts, ""] } : r) } : a));
const updateContact = (ai, ri, ci, val) =>
  set("deliveryAddresses", form.deliveryAddresses.map((a, i) =>
    i === ai ? { ...a, recipients: a.recipients.map((r, j) => j === ri ? { ...r, contacts: r.contacts.map((c, k) => k === ci ? val : c) } : r) } : a));

// remarks drops
const updateRemarksDrop = (i, key, val) =>
  set("remarksDrops", (form.remarksDrops || []).map((d, idx) => idx === i ? { ...d, [key]: val } : d));
const removeRemarksDrop = (i) =>
  set("remarksDrops", (form.remarksDrops || []).filter((_, idx) => idx !== i));
```

---

## 6. Design / visual spec

**Drop card** (edit + view): `border: 1px solid #E5E9F0`, `borderRadius: 8px`, `padding: 20px`, `backgroundColor: #FFFFFF`, `marginBottom: 16px` between cards. Cards stacked in a `flex column gap:16px` container.

**Card header row:** `flex`, `space-between`, `marginBottom: 16px`. Left = label `"Drop N"` (`fontSize:13px, fontWeight:600, color:#344054, letterSpacing:0.02em`). Right = `<RemoveBtn>` only when `length > 1`.

**Section header** (e.g. "Delivery Schedule"): `fontSize:13px, fontWeight:600, color:#0F766E, textTransform:uppercase, letterSpacing:0.06em, marginBottom:12px`. Sections separated by `borderTop:1px solid #E5E9F0; margin:24px 0`.

**Field grid:** two-column `display:grid; gridTemplateColumns:1fr 1fr; gap:16px` (view mode uses `gap:20px`).

**Unloading time range:** single time picker by default. If `drop.unloadingEnd` is non-empty → renders `[start] "to" [end] [X-remove]`. Else renders a `+ Add end time` button that sets `unloadingEnd = deliveryScheduleTime || "00:00"`. View mode: `"{start} – {end}"` or just `{start}`, else `"—"`.

**Colors:** teal accent `#0F766E` (links, headers, focus border), navy text `#0A1D4D`, muted `#667085`, border `#E5E9F0`, danger `#EF4444`. View-mode empty value → `"—"`.

**Empty state (view):** `deliveryDrops?.length > 0 ? map(...) : <span color:#9CA3AF>No delivery drops</span>`.

### Helper components (define once)

```tsx
function ReadField({ label, value }) {
  return (<div><div style={LABEL_STYLE}>{label}</div><div style={VALUE_BOX}>{value || "—"}</div></div>);
}

function EditLabel({ children }) {
  return (<label style={{ display:"block", fontSize:"13px", fontWeight:500, marginBottom:"8px", color:"#667085" }}>{children}</label>);
}

function EditTextInput({ value, onChange, placeholder = "", disabled }) {
  return (<input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    style={{ width:"100%", padding:"10px 12px", borderRadius:"6px", border:"1px solid #E5E9F0", fontSize:"14px",
             color: disabled ? "#9CA3AF" : "#0A1D4D", outline:"none", backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
             boxSizing:"border-box", transition:"border-color 0.15s ease" }}
    onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = "#0F766E"; }}
    onBlur={e => { e.currentTarget.style.borderColor = "#E5E9F0"; }} />);
}

function EditTextArea({ value, onChange, placeholder = "", rows = 4 }) {
  return (<textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
    style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", border:"1px solid #E5E9F0", fontSize:"14px",
             color:"#0A1D4D", outline:"none", fontFamily:"inherit", backgroundColor:"#FFFFFF",
             resize:"vertical", minHeight:"80px", boxSizing:"border-box" }} />);
}

function AddLink({ onClick, children }) {
  return (<button type="button" onClick={onClick}
    style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"14px", fontWeight:600,
             background:"none", border:"none", cursor:"pointer", color:"#0F766E", padding:0, marginTop:"4px" }}>
    <Plus size={14} />{children}</button>);
}

function RemoveBtn({ onClick }) {
  return (<button type="button" onClick={onClick}
    style={{ background:"none", border:"none", cursor:"pointer", color:"#EF4444", padding:"4px", display:"flex", alignItems:"center" }}>
    <Trash2 size={15} /></button>);
}
```

---

## 7. Render — Delivery Schedule section (edit mode)

```tsx
{isEditing ? (
  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
    {editForm.deliveryDrops.map((drop, di) => (
      <div key={di} style={{ border: "1px solid #E5E9F0", borderRadius: "8px", padding: "20px", backgroundColor: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em" }}>Drop {di + 1}</span>
          {editForm.deliveryDrops.length > 1 && <RemoveBtn onClick={() => removeDrop(di)} />}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div><EditLabel>Delivery Schedule Date</EditLabel>
            <NeuronDatePicker value={drop.deliveryScheduleDate} onChange={v => updateDrop(di, "deliveryScheduleDate", v)} /></div>
          <div><EditLabel>DEA Date</EditLabel>
            <NeuronDatePicker value={drop.deaDate} onChange={v => updateDrop(di, "deaDate", v)} /></div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <EditLabel>Unloading Time</EditLabel>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <NeuronTimePicker value={drop.deliveryScheduleTime} onChange={v => updateDrop(di, "deliveryScheduleTime", v)} />
            </div>
            {drop.unloadingEnd ? (
              <>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#667085" }}>to</span>
                <div style={{ flex: 1 }}>
                  <NeuronTimePicker value={drop.unloadingEnd} onChange={v => updateDrop(di, "unloadingEnd", v)} />
                </div>
                <button type="button" onClick={() => updateDrop(di, "unloadingEnd", "")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}>
                  <X size={15} />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => updateDrop(di, "unloadingEnd", drop.deliveryScheduleTime || "00:00")}
                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontWeight: 600,
                         background: "none", border: "none", cursor: "pointer", color: "#0F766E", padding: 0 }}>
                <Plus size={14} /> Add end time
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <EditLabel>Parking</EditLabel>
          <EditTextInput value={drop.parking} onChange={v => updateDrop(di, "parking", v)} />
        </div>

        <div>
          <EditLabel>Additional Note</EditLabel>
          <EditTextArea value={drop.additionalNote} onChange={v => updateDrop(di, "additionalNote", v)} placeholder="Enter any additional notes..." />
        </div>
      </div>
    ))}
    <AddLink onClick={addDrop}>Add Drop</AddLink>
  </div>
) : ( /* view mode below */ )}
```

## 8. Render — Delivery Schedule section (view mode)

```tsx
{r.deliveryDrops?.length > 0 ? r.deliveryDrops.map((drop, i) => (
  <div key={i} style={{ border: "1px solid #E5E9F0", borderRadius: "8px", padding: "20px",
                        marginBottom: i < r.deliveryDrops.length - 1 ? "16px" : "0", backgroundColor: "#FFFFFF" }}>
    <p style={{ fontSize: "13px", fontWeight: 600, color: "#344054", letterSpacing: "0.02em", margin: "0 0 16px" }}>Drop {i + 1}</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
      <ReadField label="Delivery Schedule Date" value={formatDateTime(drop.deliveryScheduleDate, "")} />
      <ReadField label="DEA Date" value={formatDateTime(drop.deaDate, "")} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
      <ReadField label="Unloading Time" value={
        drop.deliveryScheduleTime
          ? (drop.unloadingEnd
              ? `${formatTimeAmPm(drop.deliveryScheduleTime)} – ${formatTimeAmPm(drop.unloadingEnd)}`
              : formatTimeAmPm(drop.deliveryScheduleTime))
          : "—"} />
      <ReadField label="Parking" value={drop.parking} />
    </div>
    <div style={{ marginTop: "16px" }}>
      <ReadField label="Additional Note" value={drop.additionalNote} />
    </div>
  </div>
)) : (
  <span style={{ fontSize: "14px", color: "#9CA3AF" }}>No delivery drops</span>
)}
```

## 9. Render — Warehouse Arrival (uses synced add too)

```tsx
{/* edit mode: one EditDateTimeRow per arrival, then a "+ Add Drop" button */}
{editForm.warehouseArrivals.map((wa, wi) => (
  <EditDateTimeRow key={wi} dateValue={wa.date} timeValue={wa.time}
    onDateChange={v => updateWarehouseArrival(wi, "date", v)}
    onTimeChange={v => updateWarehouseArrival(wi, "time", v)} dateLabel="Date" />
))}
<button onClick={addSyncedDrop}
  style={{ background: "none", border: "none", cursor: "pointer", color: "#0F766E",
           fontSize: "13px", fontWeight: 600, textAlign: "left", padding: "4px 0" }}>+ Add Drop</button>

{/* view mode: fall back to legacy flat fields if array empty */}
{(() => {
  const arrivals = r.warehouseArrivals?.length ? r.warehouseArrivals : [{ date: r.warehouseArrivalDate, time: r.warehouseArrivalTime }];
  return arrivals.map((wa, wi) => (
    <div key={wi}>
      {arrivals.length > 1 && <div style={{ fontSize: "12px", fontWeight: 700, color: "#0A1D4D", marginBottom: "6px" }}>Drop {wi + 1}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <ReadField label="Date" value={formatISOToDisplay(wa.date)} />
        <ReadField label="Time" value={formatTimeAmPm(wa.time)} />
      </div>
    </div>
  ));
})()}
```

Warehouse-arrival CRUD:
```ts
const updateWarehouseArrival = (i, key, val) =>
  set("warehouseArrivals", warehouseArrivals.map((w, idx) => idx === i ? { ...w, [key]: val } : w));
const removeWarehouseArrival = (i) =>
  set("warehouseArrivals", warehouseArrivals.filter((_, idx) => idx !== i));
```

---

## 10. Submit / persistence

`warehouseArrivals[0]` is mirrored back into the flat legacy fields on save. PUT if editing existing, POST if new.

```ts
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSaving(true);
  try {
    const wa = form.warehouseArrivals?.length ? form.warehouseArrivals
             : [{ date: form.warehouseArrivalDate, time: form.warehouseArrivalTime }];
    const payload = {
      ...form,
      truckingRefNo: /* "TRK [EXP|IMP] {year}-{num}" */,
      warehouseArrivals: wa,
      warehouseArrivalDate: wa[0]?.date || form.warehouseArrivalDate,
      warehouseArrivalTime: wa[0]?.time || form.warehouseArrivalTime,
      updatedAt: new Date().toISOString(),
      createdAt: form.createdAt || new Date().toISOString(),
    };
    const url    = existingRecord ? `${API_BASE_URL}/trucking-records/${existingRecord.id}` : `${API_BASE_URL}/trucking-records`;
    const method = existingRecord ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) { toast.success(existingRecord ? "Trucking record updated" : "Trucking record created"); onSaved(result.data); }
    else toast.error(`Failed to save: ${result.error || "Unknown error"}`);
  } catch (err) { console.error(err); toast.error("Unable to save trucking record"); }
  finally { setIsSaving(false); }
};
```

The whole `payload` (all four arrays) is stored as one JSON blob under KV key `trucking-record:{id}` — no relational tables.

---

## 11. Source file map (this repo)

| Concern | File | Lines |
|---|---|---|
| Types | `src/components/operations/CreateTruckingModal.tsx` | 48–122 |
| Initial seed | `CreateTruckingModal.tsx` | 460–479 |
| `addSyncedDrop` + CRUD | `CreateTruckingModal.tsx` | 858–935 |
| Submit | `CreateTruckingModal.tsx` | 937–975 |
| Helper components | `src/components/operations/TruckingRecordDetails.tsx` | 132–253, 602–637 |
| `addSyncedDrop` + CRUD (detail) | `TruckingRecordDetails.tsx` | 1009–1042 |
| Render (edit/view) | `TruckingRecordDetails.tsx` | 1612–1663, 1880–2027 |
| Tag/vendor constants | `src/utils/truckingTags.ts` | whole file |

---

## 12. Porting checklist

1. Add the four arrays to your record type + seed them (one empty entry each; `remarksDrops` only for import).
2. Drop in `addSyncedDrop` — this is the heart; everything else is plain map/filter CRUD.
3. Add helper components (`ReadField`, `EditLabel`, `EditTextInput`, `EditTextArea`, `AddLink`, `RemoveBtn`).
4. Render each section with `.map((drop, i) => card)` + an `AddLink`/button calling the synced add.
5. On submit, mirror `warehouseArrivals[0]` → flat `warehouseArrivalDate`/`Time` for legacy compatibility.
6. Supply your own `NeuronDatePicker` / `NeuronTimePicker` (or swap for native `<input type=date|time>`).
