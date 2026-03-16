# Phased Plan Live Blueprint: Client/Company Architecture Refactor

**Objective:** Refactor the system to establish a strict "Company first, then Contacts" hierarchy and enforce single-client selection system-wide.

## Current Status
**Date:** January 29, 2026
**Phase:** Completed

---

## Phase 1: Foundation & Data Structure Alignment (Clients Module)
*Goal: Separate Company creation from Contact creation and enable multiple contacts per company.*

- [x] **Step 1.1: Refactor `AddClientPanel` (Company Creation)**
  - Remove mandatory "Client Name" field (or relabel as "Primary Contact").
  - Focus form on Company details (Name, Industry, Address, etc.).
  - Ensure backend compatibility (map fields correctly).

- [x] **Step 1.2: Refactor `CustomerDetail` (Company Detail View)**
  - Add a dedicated "Contacts" section/tab.
  - Implement "Add Contact" functionality within the Company Detail view.
  - List existing contacts associated with the company.
  - Connect to backend `/contacts` endpoints.

- [x] **Step 1.3: Update `ClientsListWithFilters`**
  - Ensure the list displays Companies (Entities) primarily.
  - Update search/filters to work with the new structure.

---

## Phase 2: Selection Logic Refactor (System-Wide)
*Goal: Enforce "Select Company -> Select Single Contact" logic system-wide.*

- [x] **Step 2.1: Create `CompanyContactSelector` Component**
  - Develop a reusable component.
  - Logic: User selects Company -> Fetch/Show Contacts for that Company -> User selects ONE Contact.
  - Replace existing `ClientSelector`.

- [x] **Step 2.2: Refactor `CreateProjectPanel`**
  - **CRITICAL CHANGE:** Remove multi-client support.
  - Implement `CompanyContactSelector`.
  - Update form state to store single `company_id` and `contact_id`.

- [x] **Step 2.3: Refactor Booking Modals**
  - Update `CreateBrokerageBookingModal`, `CreateTruckingBookingModal`, etc.
  - Replace free-text "Customer Name" inputs with `CompanyContactSelector`.

---

## Phase 3: Downstream Integration & Cleanup
*Goal: Ensure reporting and billing modules handle the new structure.*

- [x] **Step 3.1: Billing Integration**
  - Update `CreateBillingModal` to respect the single-client context from Bookings/Projects.
  - Confirmed: `CreateBillingModal` derives client info from `Booking` object which is correctly populated by the new creation modals.

- [x] **Step 3.2: General Cleanup**
  - Remove unused "multi-select" logic.
  - Verify data consistency across all modules.
