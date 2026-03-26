# Neuron OS — System Architecture Summary

## Overview

Neuron OS is a freight forwarding ERP built for Philippine logistics companies. It is a React + Tailwind CSS v4 single-page application backed by a Supabase Edge Function using a Hono web server and a key-value store as its database.

The app is centered on the operational and financial workflow of freight forwarding, covering shipment execution, trucking coordination, accounting, reporting, and executive visibility.

---

## Major Modules / Screens

### 1. Executive Dashboard (`/dashboard`)
- KPI cards, revenue charts, booking volume, and operational health metrics using recharts
- Summary view pulling aggregated data across core modules

### 2. Operations (`/operations/*`)
- **Import Bookings** (`ImportBookings / ImportBookingDetails`)  
  Inbound shipments with consignee-centric data

- **Export Bookings** (`ExportBookings / ExportBookingDetails`)  
  Outbound shipments with shipper-centric data, plus subtabs for Form E and FSI

- **Trucking** (`TruckingModule / TruckingRecordDetails`)  
  Domestic trucking records linked to import/export bookings; has its own creation/detail panels

- **Others Bookings** (`OthersBookings / OthersBookingDetails`)  
  Marine insurance and miscellaneous services

- **Clients** (`ClientsModule`)  
  Shared client master list used across Operations

Each booking detail screen has a tabbed interface with:
- Booking Information
- Billings
- Expenses
- Trucking
- Attachments

### 3. Accounting (`/accounting/*`)
- **Vouchers** (`VouchersScreen / ViewVoucherScreen / CreateVoucherModal`)  
  Payment vouchers linked to expenses

- **Expenses** (`ExpensesScreen / ViewExpenseScreen / CreateExpenseScreen`)  
  Cost tracking with charge categories and line items

- **Billings** (`BillingsScreen / ViewBillingScreen / CreateBillingModal`)  
  Invoice creation and management, linked to bookings

- **Collections** (`CollectionsScreen / ViewCollectionScreen / CreateCollectionScreen`)  
  Payment recording against billings with allocation-based collection tracking using a payment queue/cart pattern

Each accounting screen follows a list → detail/create pattern using slide-out side panels.

### 4. Reports (`/reports/*`)
- Container Refund Monitoring
- Final Shipment Cost
- Expenses Summary
- In-Depth Profit & Loss
- Profit & Loss by Period
- VAT Returns

### 5. HR (`/hr`)
- Employee roster in Excel-style view
- Payroll modals
- Payslips
- Timekeeping
- Employee profiles

### 6. Activity Log (`/activity-log`)
- System-wide event log

### 7. Employee Profile (`/profile`)
- User profile with department/role override for development testing

---

## Important Flows Between Modules

### Core Business Pipeline
The core operational and financial flow is:

**Operations (Import or Export) → Trucking → Accounting (Vouchers → Expenses → Billings → Collections)**

- Operations creates and manages **Import** or **Export Bookings**
- Trucking records are linked to parent bookings where applicable
- **Vouchers** track supplier/vendor payment authorization
- **Expenses** track operational costs incurred per booking
- **Billings** invoice the client for the shipment or service
- **Collections** record incoming payments against one or more billings

### Booking ↔ Trucking Linkage
- Trucking records are linked to parent Import/Export bookings via `linkedBookingId` and `linkedBookingType`
- The trucking tab inside booking details shows linked trucking records
- Trucking booking details dynamically label fields such as **Consignee** vs **Shipper** based on the linked booking type

### Collection ↔ Billing Allocation
- Collections support multi-billing allocation, where a single payment can be split across multiple invoices
- The allocation data structure maps `billingId → amount`
- Server-side `computeCollectedForBillingIds()` aggregates allocated amounts to calculate outstanding balances
- Billings show **outstanding balance** = `totalAmount − sum(allocated collection amounts)`

---

## Shared Patterns & Reusable Components

### Design System Constants (Current Implementation)
The codebase currently uses a standardized set of inline style values consistently:

- Field height: `40px`
- Border radius: `12px`
- Border color: `#E5E9F0 / #E5E7EB`
- Sub-section headers: uppercase, `13px`, weight `600`, letter-spacing `0.06em`, color `#0F766E`
- Labels: `#667085`
- Value backgrounds: `#F9FAFB`
- Card structure: white background, `12px` border radius, `1px solid #E5E7EB` border, gray header bar

### Shared Components (`/components/shared/`)

| Component | Purpose |
|---|---|
| `CompanyClientFilter` | Hierarchical dropdown used for filtering lists across billing, collections, and expenses |
| `UnifiedDateRangeFilter` / `SingleDateInput` | Standardized date range and single-date inputs used across all screens |
| `ApprovalSignoffSection` | Prepared By / Checked By / Approved By signoff card used in billing, expense, and voucher detail screens |
| `NotesSection` | Reusable notes/remarks card for detail screens |
| `BookingAttachmentsTab` | Aggregated attachments view with collapsible sections for Import/Export docs, Trucking, Billings, and Expenses |
| `AttachmentsTab` | Simpler attachment management with upload, download, and delete |
| `StatusEditDropdown` | Inline status editor dropdown |
| `ActionsDropdown` | Standard actions menu |
| `LinkedIdStack` | Display of linked entity IDs with overflow handling |

### Selector Components (`/components/selectors/`)
- `BookingSelector`
- `PayeeSelector`
- `CompanyContactSelector`

Each is a searchable dropdown that fetches data from the backend and returns a selected entity.

### Operations Shared (`/components/operations/shared/`)
- `SubTabRow` — standardized sub-tab navigation bar used inside booking detail screens
- `BillingsSubTabs` / `ExpensesSubTabs` / `BookingInfoSubTabs` — tab containers for billing, expense, and booking info sections
- `BillingsTab`, `ExpensesTab`, `TruckingTab`, `BookingVouchersTab`, `CollectionsListTab` — reusable tabs for booking detail views
- `FormETab`, `FSITab` — export-specific sub-tabs
- `ServiceModuleLayout` — shared layout template for service-type booking list screens
- `ProjectAutofillSection` — UI for auto-populating booking fields from related data sources

### UI Foundation (`/components/ui/`)
- Full shadcn/ui component library including Button, Input, Label, Select, Dialog, Sheet, Tabs, etc.
- Extended with custom components such as `ComboInput`, `DateInput`, and `DatePicker`

### Neuron Design Components
- `NeuronSidebar` — collapsible left sidebar with department-grouped navigation
- `NeuronCard`
- `NeuronButton`
- `NeuronStatusPill`
- `NeuronTypography`

---

## Business Rules & Non-Obvious Behaviors

### Import vs. Export Differentiation
- Import bookings use **Consignee** as the primary party
- Export bookings use **Shipper** as the primary party
- Billing details dynamically swap labels:
  - Import shows **Consignee / Client Name**
  - Export shows **Shipper / Client Name**

### Expense Charge Categories by Booking Type
- **Import** uses a 7-column table with Particulars and standardized pre-populated line items
- **Export** uses a 5-column table with 6 fixed categories:
  - Shipping
  - Customs
  - Port Charges
  - Form E
  - Miscellaneous
  - Trucking
- Export includes inline Unit Price with multi-currency support (`PHP / USD / RMB`) and exchange rate conversion
- Export bookings include an **Exchange Rate** section card between booking details and expense tables
- Export expenses do **not** have a Refundable Deposits table
- Export expense categories can be removed and restored through the UI

### Standardized Particulars (Import)
- When an import booking is selected on an expense, 8 specific line items always appear pre-populated
- Vouchers match into existing standardized items rather than creating new rows
- The **+ Add Item** button becomes a dropdown showing removed standardized items plus **Add Custom Item**

### Suggested Particulars (Export)
- For non-trucking export categories, the **+ Add Item** button is a dropdown with suggested items
- Removed items automatically reappear in the suggestion dropdown
- When an export booking is selected, all 6 categories start empty

### Container Multiplication
- Volume calculations in export expense lines apply exchange rate conversion and multiply by container count
- Per-unit selectors such as `PER 40 / 20 / BL` affect how quantities are computed

### Multi-Currency Support
- Export expense line items support:
  - PHP (`₱`)
  - USD (`$`)
  - RMB (`¥`)
- A bulk currency switcher at the category header level can change all items at once
- Volume columns compute the PHP-equivalent using the exchange rate

### Collection Allocation
- Collections use an allocation-based model where a single payment can cover multiple billings
- The UI uses a **payment queue** pattern so selected invoices persist independently of search and filter state
- Outstanding balance is computed server-side by summing all allocation amounts across collections

---

## KV Store Data Model

All data is stored in a single Supabase `kv_store` table with key prefixes such as:

- `user:`
- `client:`
- `contact:`
- `booking:`
- `export-booking:`
- `import-booking:`
- `trucking-booking:`
- `others-booking:`
- `trucking-record:`
- `trucking-leg:`
- `billing:`
- `collection:`
- `expense:`
- `voucher:`
- `vendor:`
- `activity:`
- `form-e:`
- `fsi:`
- `payee:`
- `attachment:`
- `report:`

Queries use `getByPrefix` for listing entities.

Cross-entity relationships are stored as ID references within the JSON values.

---

## Auto-Seeding
- The server auto-seeds demo data on first startup
- A `system:seeded` marker prevents re-seeding
- Additional seed endpoints exist for clients, payees, vendors, and comprehensive data

---

## Authentication
- Currently uses a mock/demo login system with no real Supabase auth
- User context is stored in `localStorage` with a `UserProvider`
- A development role override system allows switching department/role for testing different permission views
- Three departments currently matter in scope:
  - **Operations**
  - **Accounting**
  - **Executive**
- RBAC defined in `permissions.ts` controls action visibility per department

---

## Status Mapping
- Booking execution statuses:
  - `Draft`
  - `For Approval`
  - `Approved`
  - `In Transit`
  - `Delivered`
  - `Completed`
  - `On Hold`
  - `Cancelled`

---

## Retry Logic
- The server uses a `kvRetry` helper that retries KV operations up to 3 times with exponential backoff to handle transient database errors

---

## Architecture Diagram (Conceptual)

```text
┌─────────────────────────────────────────────────────┐
│                    App.tsx (Router)                │
│  BrowserRouter → Routes → RouteWrapper → Layout    │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐               │
│  │  Dashboard   │   │  Operations  │               │
│  └──────────────┘   └──────────────┘               │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐               │
│  │  Accounting  │   │   Reports    │               │
│  └──────────────┘   └──────────────┘               │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐               │
│  │      HR      │   │ Activity Log │               │
│  └──────────────┘   └──────────────┘               │
└─────────────────────┬───────────────────────────────┘
                      │ fetch() calls
                      ▼
┌─────────────────────────────────────────────────────┐
│       Supabase Edge Function (Hono Server)         │
│  /make-server-ce0d67b8/*                            │
│                                                     │
│  Route handlers for CRUD across operational and     │
│  accounting entities                                │
│  Auto-seed on startup · Retry helper · CORS         │
└─────────────────────┬───────────────────────────────┘
                      │ kv.get/set/getByPrefix
                      ▼
┌─────────────────────────────────────────────────────┐
│         Supabase KV Store (kv_store table)         │
│  Key prefixes: user: client: booking: billing: ... │
└─────────────────────────────────────────────────────┘
```

---

## Key Design Assumptions

- **Prototype-grade persistence**  
  The KV store is used as a document-style database. Relationships are ID references within JSON blobs rather than relational joins.

- **Philippine market focus**  
  Currency defaults to PHP, addresses are Philippine, and the operating context is local freight forwarding.

- **Desktop-first**  
  The app uses a fixed sidebar layout and desktop-oriented screen structure. No real mobile-first behavior is assumed.

- **Inline styles dominate**  
  Despite Tailwind v4 being available, much of the styling uses inline `style={{}}` objects for layout precision and consistency.

- **No production-ready auth yet**  
  Login is mocked. The role override system is a dev/demo convenience, not production security.

- **Single-server monolith**  
  The API layer currently lives in a highly centralized server structure. Functional for a prototype, but likely to need splitting as the system matures.

---

## Context Note

This prototype was originally derived from another client’s system, which is why some older patterns and legacy remnants may still exist in the codebase. This summary has been revised to reflect the parts that are actually relevant to the current client scope, especially around Operations, Trucking, Accounting, and Executive reporting.
