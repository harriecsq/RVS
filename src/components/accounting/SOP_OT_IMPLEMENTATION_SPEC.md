# SOP Particular Row + OT Number — Implementation Spec

Self-contained spec for the dynamic **SOP** voucher particular line (MICP/POM/Facilitation)
and the **OT** amount seed. Implement on any stack — no line numbers, no framework assumptions.

Context: this is a freight-forwarding voucher. A voucher belongs to a **category**. When
category = "Shipping Line" AND a **booking** is selected, the particulars (line items) are
auto-populated. One special line — the **SOP row** — appears only for *import-default*
bookings and behaves differently from a normal text line.

---

## 1. Data Model

A voucher line item:

```
LineItem {
  id: string
  description: string      // human label OR composed SOP label
  amount: number           // peso value

  // SOP-only fields (omit/false on normal lines):
  isSopRow?: boolean        // true => render as dropdown + number field
  defaultSop?: string       // POD-derived default: "SOP (MICP)" or "SOP (POM)"
  sopType?: string          // current type: defaultSop value, or "Facilitation"
  sopNumber?: string        // section number (free text, e.g. "1234"); may be empty
}
```

A booking provides (field-name fallbacks listed in priority order):

```
pod      <- pod | portOfDestination | port_of_destination | destination
section  <- section | SOP | sop
ot       <- ot          // money string, may contain commas, e.g. "12,500"
shipmentType / type     // used to detect export vs import
```

---

## 2. Branch Conditions (which booking gets an SOP row)

```
isExport            = lower(shipmentType).includes("export") OR lower(type).includes("export")
isImport            = NOT isExport
isExportProvinceLeg = isExport AND selectedLeg != "Manila"
isProvincialImportPod = isImport AND pod ∈ { "CDO", "Iloilo", "Davao" }
isImportDefault     = isImport AND NOT isProvincialImportPod
```

**The SOP row is added ONLY when `isImportDefault` is true.**
Never on export, never on export province leg, never on provincial import POD.

---

## 3. SOP Type — MICP vs POM

```
isNorth      = regex /MICP|North/i tests true against pod
determinedSop = isNorth ? "SOP (MICP)" : "SOP (POM)"
```

- POD text contains "MICP" or "North" (case-insensitive) → **"SOP (MICP)"**
- otherwise → **"SOP (POM)"**

Store `determinedSop` as `defaultSop`. It is the first/auto dropdown option.

### Type override: Facilitation
The type dropdown has exactly two options:
1. `defaultSop` (the determined `SOP (MICP)` or `SOP (POM)`)
2. `"Facilitation"`

Rule when re-populating an existing SOP row:
```
isFacilitation = existingSop.sopType == "Facilitation"
finalSopType   = isFacilitation ? "Facilitation" : determinedSop
```
=> If user chose Facilitation, keep it. Otherwise type re-snaps to the POD-determined value
(so changing the booking's POD updates MICP/POM automatically, but a manual Facilitation choice is preserved).

---

## 4. Section Number

```
bookingSection = section (with the fallbacks above) or ""
finalSopNumber = existingSop.sopNumber || bookingSection || ""
```
- Pre-fill from booking section if present and user hasn't set one.
- User-editable free-text field (placeholder "#", tooltip "Section Number").

---

## 5. Description Composition

```
finalSopDesc = finalSopNumber ? `${finalSopType} ${finalSopNumber}` : finalSopType
```
Examples:
- type "SOP (MICP)", number "1234"  => "SOP (MICP) 1234"
- type "SOP (POM)",  number ""      => "SOP (POM)"
- type "Facilitation", number "77"  => "Facilitation 77"

Re-compose `description` every time the user edits either the type dropdown or the number field.

---

## 6. OT — Amount Seed

OT seeds the SOP row's **amount** (peso value), NOT its label.

```
parseMoney(v) = parseFloat(String(v).replace(/,/g, ""))  // strip commas; NaN/inf => 0
otSeed        = parseMoney(booking.ot)
amount        = existingSop.amount || otSeed
```
- Use `otSeed` only when there is no existing manually-entered SOP amount.
- This preserves user edits across re-population (e.g. switching leg/POD).

---

## 7. Full SOP Row Construction (pseudocode)

```
if (isImportDefault) {
  existingSop  = currentParticulars.find(p => p.isSopRow)

  isFacilitation = existingSop?.sopType == "Facilitation"
  finalSopType   = isFacilitation ? "Facilitation" : determinedSop

  finalSopNumber = existingSop?.sopNumber || bookingSection || ""
  finalSopDesc   = finalSopNumber ? `${finalSopType} ${finalSopNumber}` : finalSopType

  otSeed = parseMoney(booking.ot)

  push({
    id:          existingSop?.id ?? newId(),
    description: finalSopDesc,
    amount:      existingSop?.amount || otSeed,
    isSopRow:    true,
    defaultSop:  determinedSop,
    sopType:     finalSopType,
    sopNumber:   finalSopNumber,
  })
}
```

Position: appended **after** the standard import-default particulars
(Local Charges, Container Deposit, Duties & Taxes, Arrastre, DO Fee).

---

## 8. Render Behavior (SOP row)

When `isSopRow == true`, the description cell is NOT a plain text input. Render:

- **Type dropdown** (left, flex-grow):
  - value = `sopType || defaultSop || "SOP (MICP)"`
  - options: `defaultSop` (or "SOP (MICP)") and `"Facilitation"`
  - on change → update `sopType`, then re-compose `description`
- **Number field** (right, ~80px, centered): placeholder "#", tooltip "Section Number"
  - value = `sopNumber`
  - on change → update `sopNumber`, then re-compose `description`

Update handler (both fields):
```
onSopUpdate(id, field /* "sopType" | "sopNumber" */, value):
  newType   = field=="sopType"   ? value : (sopType || defaultSop || "SOP (MICP)")
  newNumber = field=="sopNumber" ? value : (sopNumber || "")
  newDesc   = newNumber ? `${newType} ${newNumber}` : newType
  set { sopType: newType, sopNumber: newNumber, description: newDesc }
```

Normal (non-SOP) lines render a single editable text description input.

---

## 9. Edge Cases / Invariants

- Only one SOP row per voucher (find by `isSopRow`).
- POD match is case-insensitive; missing POD => not North => "SOP (POM)".
- `ot`/`section` may be absent → amount 0, number "".
- Manual Facilitation type and manual amount survive re-population; POD-derived type/number do not override them.
- Default fallback type everywhere uncertain: `"SOP (MICP)"`.
