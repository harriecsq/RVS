# SOA Payment Monitoring Report — Design Spec

**Date:** 2026-04-16
**Status:** Draft
**Approach:** Standalone report component (Approach A)

---

## Overview

A new report under the Report Library that tracks billing (SOA) payment status. Each row represents one billing/SOA, showing linked collection details (check info, allocated amounts, payment dates). The report is billing-centric — filtered by SOA date, not collection date.

## Data Sources

Three API endpoints fetched in parallel:

| Endpoint | Purpose |
|---|---|
| `/billings` | Primary data — one row per billing |
| `/collections` | Payment details — linked via `allocations[].billingId` |
| `/bookings` | Commodity & container number — linked via `billing.bookingId` |

## Row Structure (1 row per billing)

| # | Column | Source | Notes |
|---|---|---|---|
| 1 | No. | Row index | Sequential number in filtered/sorted view |
| 2 | Client Name | `booking.customerName \|\| booking.clientName \|\| booking.client \|\| booking.shipper` | Resolved from linked booking |
| 3 | Commodity | `booking.commodity` | From linked booking |
| 4 | Container Number | `booking.containerNumbers \|\| booking.containers \|\| booking.containerNo` | From linked booking; comma-separated if multiple |
| 5 | SOA No. | `billing.billingNumber` | The billing/SOA number |
| 6 | SOA Amount | `billing.totalAmount` | Formatted as currency (₱) with tabular numerals |
| 7 | Name/Check | Collection's `referenceNumber`, or `"CASH"` if `paymentMethod === "Cash"` | Comma-separated if multiple collections for this billing |
| 8 | Check Amount | `allocation.amount` for this billing | Sum of all allocation amounts targeting this billing across all linked collections |
| 9 | Date of Payment | `collection.collectionDate` | Comma-separated if multiple collections; displayed as formatted date |

## Join Logic

1. **Booking lookup:** Map each booking by `id` and `bookingId` for O(1) lookup. For each billing, resolve via `billing.bookingId`.
2. **Collection-to-billing lookup:** Iterate all collections. For each `collection.allocations[]` entry, map `allocation.billingId` → collection + allocation amount. A single billing may have multiple collections (partial payments). A single collection may cover multiple billings.
3. **Row assembly:** For each billing, look up the booking (for client/commodity/container) and all collections (for check details/amounts/dates). Produce one flat row.

## KPI Cards (4, in display order)

| # | Label | Value | Color |
|---|---|---|---|
| 1 | Number of SOAs | Count of filtered rows | Default green |
| 2 | Total SOA Amount | Sum of `billing.totalAmount` | Default green |
| 3 | Total Collected | Sum of check amounts (allocation amounts) | Default green |
| 4 | Outstanding Balance | Total SOA Amount − Total Collected | Red if > 0, green if 0 |

All KPI values are computed from the **filtered** dataset.

## Filters

| Filter | Type | Behavior |
|---|---|---|
| Date Range | Date picker (From–To) | Filters on `billing.billingDate` (SOA date). E.g., selecting January shows all SOAs created in January regardless of when they were paid. |
| Service Type | Dropdown: All / Import / Export | Filters based on linked booking's `mode` field |
| Port | Dropdown: All / Manila North / Manila South / CDO / Iloilo / Davao | When Service Type = Import → matches booking's `pod`. When Service Type = Export → matches booking's `origin` (POL). Disabled when Service Type = "All". |
| Client | Text input | Filters on client name (case-insensitive contains) |
| Search | Text input | Universal search across SOA No, client name, commodity, container number |

## Sorting & Pagination

- **Default sort:** `billing.billingDate` descending (newest SOAs first)
- **Pagination:** 10 rows per page, same UI pattern as FinalShipmentCostReport

## CSV Export

Headers match the 9 visible columns. Same blob-download pattern as FinalShipmentCostReport. Filename: `SOAPaymentMonitoring_YYYY-MM-DD.csv`.

## Files to Create/Modify

| File | Action |
|---|---|
| `src/components/reports/SOAPaymentMonitoringReport.tsx` | **Create** — standalone report component |
| `src/components/Reports.tsx` | **Modify** — add entry to `accountingReports` array |
| `src/App.tsx` | **Modify** — add import, wrapper function, and route `/reports/soa-payment-monitoring` |

## Component Structure

```
SOAPaymentMonitoringReport
├── Header (title, subtitle, back arrow, export button)
├── FilterCard
│   ├── Search bar (universal)
│   ├── Date Range picker (UnifiedDateRangeFilter)
│   ├── Service Type dropdown
│   ├── Port dropdown (conditional on service type)
│   └── Client text input
├── KPI Cards (4-column grid)
└── Data Table
    ├── Table header (9 columns)
    ├── Table body (paginated rows)
    └── Pagination controls
```

## Design Tokens

Follows existing NEURON design system:
- Card borders: `var(--neuron-ui-border)`, 12px radius, no shadows
- Brand green: `var(--neuron-brand-green)` for KPIs and accents
- Financial values: tabular numerals, ₱ prefix via `formatAmount` utility
- Table hover: `var(--neuron-state-hover)`
- Muted text: `var(--neuron-ink-muted)`

## Edge Cases

- **Billing with no linked booking:** Show "—" for client, commodity, container
- **Billing with no collections:** Name/Check = "—", Check Amount = 0, Date of Payment = "—"
- **Multiple collections for one billing:** Comma-separate Name/Check values and dates; sum allocation amounts for Check Amount
- **Cash payment:** Display "CASH" instead of reference number
- **Port filter when Service Type = "All":** Port dropdown is disabled/hidden
