# Billing Client Fields Refactor - Implementation Blueprint

## Objective
Replace single "Client" field with two separate fields (Client Name, Company Name) that show dropdown options extracted from selected bookings.

## Current State
- Single "Client" field with manual client selection
- Uses `selectedClientName` state
- Has search functionality
- Located at lines ~935-1030 in CreateBillingModal.tsx

## Target State
- Two separate fields: "Client Name" and "Company Name"
- Each field has dropdown showing unique values from SELECTED bookings only
- Dropdowns are auto-populated based on selected bookings
- Fields are editable/selectable

---

## Implementation Phases

### ✅ PHASE 0: Blueprint Creation
**Status:** COMPLETED
**Tasks:**
- [x] Create blueprint document
- [x] Define all phases

---

### ✅ PHASE 1: Update Interfaces & State
**Status:** COMPLETED
**Estimated Lines:** ~10-15 lines
**Location:** Lines 24-30, 60-90

**Tasks:**
- [x] Update `Booking` interface to include `client_name?: string` and `company_name?: string`
- [x] Add new state: `const [clientName, setClientName] = useState("")`
- [x] Add new state: `const [companyName, setCompanyName] = useState("")` (already existed)
- [x] Add new state: `const [showClientNameDropdown, setShowClientNameDropdown] = useState(false)`
- [x] Add new state: `const [showCompanyNameDropdown, setShowCompanyNameDropdown] = useState(false)`
- [x] Keep old states for now (will remove in Phase 3)

**Validation:**
- TypeScript compiles without errors
- No runtime errors

---

### ✅ PHASE 2: Create Data Extraction Helpers
**Status:** COMPLETED
**Estimated Lines:** ~30-40 lines
**Location:** After state declarations (around line 150)

**Tasks:**
- [x] Create `uniqueClientNames` useMemo that:
  - Gets bookings that match selectedBookingIds
  - Extracts client_name from each
  - Returns unique values only
  - Filters out undefined/null
- [x] Create `uniqueCompanyNames` useMemo that:
  - Gets bookings that match selectedBookingIds
  - Extracts company_name from each
  - Returns unique values only
  - Filters out undefined/null
- [x] Add `useMemo` hooks for performance (recalculate only when selectedBookingIds or bookings change)
- [x] Import useMemo from React

**Validation:**
- Console log the returned arrays to verify correct data
- Check that values update when booking selection changes

---

### ✅ PHASE 3: Delete Old Client Field
**Status:** COMPLETED
**Estimated Lines:** ~95 lines to remove
**Location:** Lines ~932-1030

**Tasks:**
- [x] Remove entire "SECTION 2: Client Selection" div block
- [x] Remove old state variables:
  - `selectedClientName`
  - `showClientDropdown`
  - `clientSearchQuery`
  - `clients` array
  - `isLoadingClients`
  - `selectedClientId`
- [x] Remove `fetchClients()` function
- [x] Remove fetchClients call from useEffect
- [x] Keep section numbers (Section 3 stays as Section 3)

**Validation:**
- File compiles without errors
- No references to removed variables
- UI renders without the old client field

---

### ✅ PHASE 4: Create Client Name Field
**Status:** COMPLETED
**Estimated Lines:** ~70 lines
**Location:** After "SECTION 1: Booking Selection" (around line 935)

**Tasks:**
- [x] Create new "SECTION 2: Client Information" heading
- [x] Add "Client Name" label
- [x] Add input field that:
  - Shows current `clientName` value
  - Has placeholder "Select or enter client name"
  - Is clickable to toggle dropdown
  - Has ChevronDown icon
- [x] Add dropdown that:
  - Shows when `showClientNameDropdown` is true
  - Maps through `uniqueClientNames` array
  - Allows clicking to select a value
  - Updates `clientName` state on selection
  - Closes after selection
- [x] Style consistently with Neuron design system

**Validation:**
- Dropdown shows unique client names from selected bookings
- Clicking a value updates the field
- Dropdown closes after selection
- If no bookings selected, dropdown shows "Select bookings first"

---

### ✅ PHASE 5: Create Company Name Field
**Status:** COMPLETED
**Estimated Lines:** ~70 lines
**Location:** Right after Client Name field

**Tasks:**
- [x] Add "Company Name" label
- [x] Add input field that:
  - Shows current `companyName` value
  - Has placeholder "Select or enter company name"
  - Is clickable to toggle dropdown
  - Has ChevronDown icon
- [x] Add dropdown that:
  - Shows when `showCompanyNameDropdown` is true
  - Maps through `uniqueCompanyNames` array
  - Allows clicking to select a value
  - Updates `companyName` state on selection
  - Closes after selection
- [x] Style consistently with Neuron design system

**Validation:**
- Dropdown shows unique company names from selected bookings
- Clicking a value updates the field
- Dropdown closes after selection
- If no bookings selected, dropdown shows "Select bookings first"

---

### ✅ PHASE 6: Update Form Submission
**Status:** COMPLETED
**Estimated Lines:** ~5-10 lines
**Location:** handleSubmit function (around line 600-700)

**Tasks:**
- [x] Update validation to check `clientName` instead of `selectedClientId`
- [x] Update billing object to use `clientName` directly (not `selectedClientName`)
- [x] Add `companyName` to billing object
- [x] Remove `clientId` and `selectedClientName` from request body

**Validation:**
- Form submits successfully
- Client name and company name are saved correctly
- Backend receives correct data

---

### ✅ PHASE 7: Cleanup & Testing
**Status:** COMPLETED

**Tasks:**
- [x] Remove unused Client interface
- [x] Remove commented-out code (fetchClients comment)
- [x] Keep Search import (still used in project search)
- [x] Keep ChevronDown import (used in new dropdowns)
- [x] All imports verified and necessary
- [x] Ready for testing

**Testing Checklist (User to verify):**
- [ ] Select project → bookings load
- [ ] Select multiple bookings → client dropdowns populate with unique values
- [ ] Click Client Name dropdown → shows client names from selected bookings
- [ ] Select client name → field updates
- [ ] Click Company Name dropdown → shows company names from selected bookings
- [ ] Select company name → field updates
- [ ] Submit form → data saves with clientName and companyName
- [ ] Verify no console errors
- [ ] Verify TypeScript compiles cleanly

**Validation:**
- Code cleanup completed
- Ready for end-to-end testing by user

---

## Progress Tracker
- **Total Phases:** 8 (including Phase 0)
- **Completed:** 8
- **In Progress:** 0
- **Not Started:** 0
- **Overall Progress:** 100% ✅

---

## Notes & Decisions
- Using `useMemo` for performance optimization on unique value extraction
- Keeping dropdown UI consistent with existing Neuron design patterns
- Client fields are editable (not just selectable) in case manual entry is needed
- Fields show "Select bookings first" message when no bookings are selected

---

## Implementation Summary

### What Was Changed:
1. **Interfaces Updated:** Added `client_name` and `company_name` fields to Booking interface
2. **State Refactored:** Replaced old client selection states with new `clientName`, `companyName`, and their respective dropdown states
3. **Data Extraction:** Created `useMemo` hooks to extract unique client and company names from selected bookings
4. **UI Replaced:** Removed old single Client field with search; added two new dropdown fields (Client Name, Company Name)
5. **Form Submission:** Updated to send `clientName` and `companyName` instead of `clientId`
6. **Cleanup:** Removed unused Client interface, fetchClients function, and old client-related states

### Key Features:
- ✅ Dropdowns auto-populate from selected bookings only
- ✅ Shows unique values (no duplicates)
- ✅ User-friendly "Select bookings first" message when no bookings selected
- ✅ Consistent Neuron design system styling
- ✅ Performance optimized with useMemo
- ✅ Two-column layout matching existing design patterns

### Files Modified:
- `/components/accounting/CreateBillingModal.tsx` - Complete refactor

---

**Last Updated:** Implementation Complete - All 8 Phases Done + Bug Fix
**Status:** ✅ READY FOR TESTING

---

## Post-Implementation Bug Fixes

### Bug Fix #1: fetchProjectDetails Reference Error
**Issue:** `setSelectedClientId is not defined` error when fetching project details
**Root Cause:** fetchProjectDetails was still using old state setters (setSelectedClientId, setSelectedClientName)
**Fix:** Updated to use new state setters (setClientName, setCompanyName) and also auto-populate company name if available from project
**File:** /components/accounting/CreateBillingModal.tsx line ~222-229
**Status:** ✅ Fixed

### Bug Fix #2: Company Name Dropdown Shows "Select bookings first"
**Issue:** Company Name dropdown not populating even when bookings are selected
**Root Cause:** 
- Bookings don't have a `company_name` field
- Business logic requires: Export bookings use `shipper` field, Import bookings use `consignee` field
**Fix:** 
- Updated Booking interface to include `booking_type`, `shipper`, and `consignee` fields
- Modified `uniqueCompanyNames` useMemo to check `booking_type` and extract correct field:
  - Export bookings → use `shipper`
  - Import bookings → use `consignee`
  - Other types → fallback to `company_name`
- Added console logs for debugging
**File:** /components/accounting/CreateBillingModal.tsx
**Status:** ✅ Fixed

### Bug Fix #3: Shipment Details Field Names Mismatch
**Issue:** Most shipment detail dropdowns showing "Select bookings first" despite bookings being selected
**Root Cause:** 
- Field names in code didn't match actual booking/expense data structure
- Some fields should come from expenses, not bookings
**Fix:**
- **Destination**: Now uses `aodPOD` or `aolPOL` from bookings (instead of `destination`)
- **BL Number**: Now extracts from LINKED EXPENSES (not bookings)  
- **Exchange Rate**: Now extracts from LINKED EXPENSES (not bookings)
- **Commodity**: Uses `commodity` from bookings (should work as-is)
- **Volume**: Field doesn't exist in seed data (manual input only)
- **Contract Number**: Field doesn't exist in seed data (manual input only)
**File:** /components/accounting/CreateBillingModal.tsx
**Status:** ✅ Fixed
**Issue:** Company Name dropdown not populating even when bookings are selected
**Root Cause:** 
- Bookings don't have a `company_name` field
- Business logic requires: Export bookings use `shipper` field, Import bookings use `consignee` field
**Fix:** 
- Updated Booking interface to include `booking_type`, `shipper`, and `consignee` fields
- Modified `uniqueCompanyNames` useMemo to check `booking_type` and extract correct field:
  - Export bookings → use `shipper`
  - Import bookings → use `consignee`
  - Other types → fallback to `company_name`
- Added console logs for debugging
**File:** /components/accounting/CreateBillingModal.tsx
**Status:** ✅ Fixed
