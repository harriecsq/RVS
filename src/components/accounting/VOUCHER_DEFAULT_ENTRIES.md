# Voucher Default Entries Reference

All hardcoded voucher line items by variation. Source: `CreateVoucherModal.tsx`.

There are two population layers:

1. **On category pick (no booking yet)** — `handleCategoryChange` (line 770)
2. **When a booking is selected (Shipping Line only)** — `useEffect` (line 584), which branches on shipment type, POD, and leg.

When a booking is selected, the booking-based set **overrides** the category-pick set.

---

## Layer 1 — On Category Pick (no booking)

### Shipping Line (lines 805–826)
Particulars:
1. Local Charges
2. Container Deposit
3. Duties & Taxes
4. Arrastre
5. DO Fee
6. `SOP (MICP)` — dynamic SOP row
7. Notary / Go Fast / Lodgement
8. Ocean Freight

### Trucking (line 835)
Particulars:
1. Trucking/Hauling — `amount = rate × container count`

### General Expenses
Categories: Annual Expenses, Expenses, Transportation, Salary, Benefits, Utilities.
Defaults: **empty** (one blank row; user adds custom). See `DESCRIPTION_OPTIONS` lines 134–139.

---

## Layer 2 — When Booking Selected (Shipping Line)

Branch logic (line 584):
- `isExport` = shipmentType/type contains "export"
- `isExportProvinceLeg` = export AND `selectedLeg !== "Manila"`
- `isProvincialImportPod` = import AND POD ∈ { CDO, Iloilo, Davao }
- else Import default

### Particulars

**Export — province leg** (line 612):
1. Domestic Freight
2. Stripping, Hustling, Stuffing

**Export** (line 617):
1. Ocean Freight
2. Storage
3. Form E
4. Form E Form
5. Registration Fee

**Provincial Import** — POD = CDO / Iloilo / Davao (line 625):
1. Local Charges
2. Container Deposit
3. Duties & Taxes
4. Arrastre
5. Wharfage

**Import — default** (line 634):
1. Local Charges
2. Container Deposit
3. Duties & Taxes
4. Arrastre
5. DO Fee
6. **Dynamic SOP row** (line 667): `SOP (MICP)` if POD matches MICP/North, else `SOP (POM)`; switchable to `Facilitation`. Import-default ONLY — never export, never provincial import.

### Distribution of Accounts (line 695)

| Variation | Distribution items |
|---|---|
| Export — province leg | *(empty)* |
| Export | Processing Fee, Lodgement Fee, Arrastre, LONA, Royalty Fee |
| Provincial Import | *(empty — table kept, no rows)* |
| Import — default | Notary / Go Fast / Lodgement |

---

## Auto-Seeded Amounts

| Field | Source | Line |
|---|---|---|
| Import Arrastre | `booking.arrastreAmount` | 650 |
| SOP row | `booking.ot` | 681 |
| Trucking/Hauling | `booking.rate` / `booking.truckingRates` | 576 |

Existing amounts are preserved across category/leg switches via `getExistingAmount` (line 599).
