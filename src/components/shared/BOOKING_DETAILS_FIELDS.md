# Booking Details — Field Visibility Across All Entity Types

Which fields the linked-booking / "Booking Details" summary renders in each screen,
and the conditions that show/hide/swap them. Use this when unifying onto a single
`BookingDetailsCard`.

Source of truth (verified in code):
- Voucher: `ViewVoucherScreen.tsx` (card) + `CreateVoucherModal.tsx` (summary box)
- Billing: `ViewBillingScreen.tsx` + `CreateBillingModal.tsx`
- Expense: `ViewExpenseScreen.tsx` + `CreateExpenseScreen.tsx`
- Trucking: `TruckingRecordDetails.tsx` + `CreateTruckingModal.tsx`

Legend: `✓` always shown · `—` not rendered · `c` conditional (see notes)

## Column key

| Code | Entity · variant |
|------|------------------|
| `V·SL·I` / `V·SL·E` | Voucher, category **Shipping Line**, Import / Export |
| `V·TR·I` / `V·TR·E` | Voucher, category **Trucking**, Import / Export |
| `V·GE` | Voucher, **General Expense** categories (Annual Expenses, Expenses, Transportation, Salary, Benefits, Utilities) |
| `BIL·I` / `BIL·E` | Billing, Import / Export |
| `EXP·I` / `EXP·E` | Expense, Import / Export |
| `TRK·I` / `TRK·E` | Trucking record, Import / Export |

## Master matrix

| Field | V·SL·I | V·SL·E | V·TR·I | V·TR·E | V·GE | BIL·I | BIL·E | EXP·I | EXP·E | TRK·I | TRK·E |
|-------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Booking Details card itself** | ✓ | ✓ | ✓ | ✓ | **—** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Linked Booking (ref) | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Leg selector | — | c | — | c | — | — | — | — | — | — | — |
| Shipper *(export)* | — | ✓ | — | ✓ | — | — | ✓ | — | ✓ | — | ✓ |
| Consignee *(import)* | ✓ | — | ✓ | — | — | ✓ | — | ✓ | — | ✓ | — |
| Client / Client Name | — | — | — | — | — | c | c | c | ✓ | c | c |
| Vessel / Voyage | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BL Number | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Container No | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | c | c |
| Size | — | — | — | — | — | — | — | — | — | c | c |
| Origin *(POL)* | ✓ | — | ✓ | — | — | ✓ | ✓ | ✓ | — | — | — |
| Destination *(POD)* | — | ✓ | — | — | — | ✓ | ✓ | ✓ | ✓ | — | — |
| Volume | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — |
| Weight | — | — | — | — | — | — | — | ✓ | — | — | — |
| Commodity | ✓ | ✓ | ✓ | ✓ | — | c | c | ✓ | ✓ | ✓ | ✓ |
| Shipping Line | — | — | — | — | — | — | — | — | — | ✓ | ✓ |
| Delivery Address *(import)* | — | — | ✓ | — | — | — | — | — | — | ✓ | — |
| Loading Address *(export)* | — | — | — | ✓ | — | — | — | — | ✓ | — | ✓ |
| Trucking Rate | — | — | ✓ | ✓ | — | — | — | — | — | ✓ | ✓ |
| Date | — | — | — | — | — | ✓ | ✓ | ✓ | ✓ | — | — |
| Releasing Date | — | — | — | — | — | — | — | ✓ | ✓ | — | — |
| Exchange Rate | — | — | — | — | — | ✓ | ✓ | — | ✓ | — | — |

> Voucher **dates** (Creation/Posting) and **Payment Method/Bank/Reference** live in a
> separate "General Information" section, NOT the Booking Details card — excluded here.
> For Trucking records, **Delivery/Loading Address** and **Trucking Rate** render in their
> own sections below the summary, not inside the booking grid — folded in above for comparison.

## Conditional notes (the `c` cells)

- **Leg selector** — only export bookings that carry ≥1 `Province` segment (Manila + province legs). See `LegSelector`.
- **Client / Client Name**
  - Billing (view): shown only when client name is distinct from shipper, consignee, AND company. Billing (create): always shown.
  - Expense import (view): only when `contactPersonName` exists. Expense export: shown as "Client".
  - Trucking: only when `hasDistinctClient` (name differs from shipper/consignee/company).
- **Container No** — Trucking: only when a container is set; rendered next to **Size**. Billing/Expense merge main-leg + province-segment containers (`A, B / P1, P2`, uppercase).
- **Commodity** — Billing: view shows if it exists; create shows only if truthy. (Trucking labels it "Commodity Items".)

## Import vs Export swaps (the core branching)

| Concept | Import shows | Export shows |
|---------|--------------|--------------|
| Party | **Consignee** | **Shipper** |
| Voucher route field | **Origin** | **Destination** (single swapped field) |
| Address (Trucking) | **Delivery Address** | **Loading Address** |

Billing & Expense (import) show **both** Origin and Destination; the voucher card shows only **one** (swapped).

## Per-entity quick lists

**Voucher · Shipping Line** — Linked Booking · Shipper/Consignee · Vessel/Voyage · BL · Origin/Destination · Volume · Container No · Commodity.
**Voucher · Trucking** — same minus **BL** (hidden) minus **Destination on export** (hidden); plus **Delivery/Loading Address** + **Trucking Rate**.
**Voucher · General Expense** — **no booking card at all** (`isBookingCategory` false).

**Billing** — Linked Booking · Shipper/Consignee · Client(c) · BL · Vessel/Voyage · Container No · Origin(POL) · Destination(POD) · Volume · Commodity(c) · Date · Exchange Rate. (Single booking only — first of many.)

**Expense** — Linked Booking · Consignee|Shipper · Client(c) · POD|Destination · Commodity · BL · Container No · **Weight** · Vessel/Voyage · Origin(import only) · **Loading Address**(export) · Date · **Releasing Date** · Exchange Rate(export). Province containers merged.

**Trucking** — Linked Booking · Shipper/Consignee · Client(c) · Container+Size(c) · Commodity · **Shipping Line** · Vessel/Voyage · BL. Addresses + Rate in separate sections.

## Label inconsistencies to normalize when unifying

| Concept | Variants seen across screens |
|---------|------------------------------|
| BL | "BL Number" (voucher) vs "B/L Number" (billing/expense/trucking) |
| Origin | "Origin" (voucher/expense) vs "Origin (POL)" (billing) |
| Destination | "Destination" (voucher/expense-export) vs "Destination (POD)" / "Port of Destination (POD)" (billing/expense-import) |
| Commodity | "Commodity" vs "Commodity Items" (trucking) |
| Party | "Shipper"/"Consignee" consistent everywhere |

## Fields unique to ONE entity (watch when porting)

- **Volume** — Voucher + Billing only (Expense uses Weight instead).
- **Weight** — Expense import only.
- **Size** — Trucking only.
- **Shipping Line** (as a booking field) — Trucking only.
- **Exchange Rate / Date / Releasing Date** — accounting docs (Billing/Expense); Releasing Date is Expense-only.
- **Trucking Rate / Delivery & Loading Address** — Voucher-Trucking + Trucking record.
