# ViewBillingScreen Refactor - Living Blueprint

**Objective**: Update ViewBillingScreen to display all fields captured in CreateBillingModal

**Status**: 🟡 IN PROGRESS  
**Last Updated**: January 23, 2026  
**Current Phase**: Phase 4 (PAUSED - Providing Summary)

---

## 📋 PHASE PLAN

### ✅ PHASE 0: Analysis & Planning
- [x] Analyze CreateBillingModal data structure
- [x] Identify missing fields in ViewBillingScreen
- [x] Create phased implementation plan
- [x] Document blueprint

### 🔄 PHASE 1: Update Data Interfaces & Fetch Logic
**Status**: ✅ COMPLETED

**Tasks**:
- [x] Update Billing interface to include all fields from CreateBillingModal
- [x] Update BillingParticular interface with full structure  
- [x] Fixed field name from 'description' to 'particulars'
- [x] Added all new optional fields (companyName, bookingIds, expenseIds, shipment details)
- [x] Added Booking and Expense interfaces for future use

**Files modified**:
- `/components/accounting/ViewBillingScreen.tsx`

**Completed**: Phase 1 interfaces ready, backend will now return new fields

---

### ✅ PHASE 2: Expand General Information Section
**Status**: ✅ COMPLETED

**Tasks**:
- [x] Add Company Name field
- [x] Add Linked Bookings section (display booking numbers as chips)
- [x] Add Linked Expenses section (display expense numbers as chips)
- [x] Restructured General Information with conditional rendering

**Files modified**:
- `/components/accounting/ViewBillingScreen.tsx`

**Completed**: General Information now shows all client and relationship data with color-coded chips

---

### ✅ PHASE 3: Add Shipment Details Section
**Status**: ✅ COMPLETED

**Tasks**:
- [x] Create new "Shipment Details" card (conditional rendering)
- [x] Display Vessel/Voyage
- [x] Display BL Number
- [x] Display Container Numbers (blue chips with monospace font)
- [x] Display Destination
- [x] Display Volume
- [x] Display Commodity
- [x] Display Contract Number
- [x] Display Exchange Rate

**Files modified**:
- `/components/accounting/ViewBillingScreen.tsx`

**Completed**: Shipment Details section appears when at least one field has data, displays all logistics information

---

### ⏳ PHASE 4: Transform Billing Particulars Table
**Status**: NOT STARTED

**Tasks**:
- [ ] Update table columns to match creation structure
- [ ] Add Volume Type column (40/BL)
- [ ] Add Volume Qty column
- [ ] Add Unit Cost column
- [ ] Add Total column (calculated display)
- [ ] Add Exchange Rate column (per line item)
- [ ] Update Amount column to show final PHP amount
- [ ] Update description column to use 'particulars' field
- [ ] Update edit mode to support all columns
- [ ] Ensure calculations are displayed correctly

**Expected outcome**: Full billing particulars breakdown matching creation screen

---

### ⏳ PHASE 5: Update Edit Mode Functionality
**Status**: NOT STARTED

**Tasks**:
- [ ] Add edit state for shipment details fields
- [ ] Add edit state for new general info fields
- [ ] Update save handler to include all new fields
- [ ] Ensure edit mode works for all new columns in particulars table

**Expected outcome**: All fields editable in edit mode

---

### ⏳ PHASE 6: Testing & Refinement
**Status**: NOT STARTED

**Tasks**:
- [ ] Test view mode displays all data correctly
- [ ] Test edit mode for all fields
- [ ] Test with real billing data
- [ ] Verify layout and spacing consistency
- [ ] Ensure Neuron design system compliance
- [ ] Handle edge cases (empty arrays, null values)

**Expected outcome**: Fully functional, polished view screen

---

## 📊 DATA STRUCTURE REFERENCE

### CreateBillingModal sends:
```typescript
{
  projectId: string,
  projectNumber: string,
  bookingIds: string[],          // ⚠️ MISSING in current view
  expenseIds: string[],          // ⚠️ MISSING in current view
  clientName: string,
  companyName: string,           // ⚠️ MISSING in current view
  totalExpenses: number,
  particulars: BillingParticular[],
  totalAmount: number,
  currency: string,
  vessel: string,                // ⚠️ MISSING in current view
  blNumber: string,              // ⚠️ MISSING in current view
  containerNumbers: string[],    // ⚠️ MISSING in current view
  destination: string,           // ⚠️ MISSING in current view
  volume: string,                // ⚠️ MISSING in current view
  commodity: string,             // ⚠️ MISSING in current view
  contractNumber: string,        // ⚠️ MISSING in current view
  exchangeRate: string           // ⚠️ MISSING in current view
}
```

### BillingParticular structure:
```typescript
{
  id: string,
  particulars: string,           // description
  volumeType: "40" | "BL",       // ⚠️ MISSING in current view
  volumeQty: number,             // ⚠️ MISSING in current view
  unitCost: number,              // ⚠️ MISSING in current view
  total: number,                 // ⚠️ MISSING (calculated: volumeQty * unitCost)
  exchangeRate: number | null,   // ⚠️ MISSING in current view
  amount: number                 // Current view only shows this
}
```

---

## 🎯 SUCCESS CRITERIA

- [ ] All fields from CreateBillingModal are displayed in ViewBillingScreen
- [ ] Data structure matches between creation and viewing
- [ ] Shipment details section added
- [ ] Billing particulars table shows full breakdown
- [ ] Edit mode works for all new fields
- [ ] Neuron design system maintained
- [ ] No regressions in existing functionality

---

## 📝 NOTES & DECISIONS

- Keeping metadata bar as is (already has project, status, dates)
- Shipment details will be a separate card section
- Container numbers will display as chips/tags for better readability
- Linked bookings/expenses will show as clickable tags (if navigation needed later)
- Maintaining the same padding (32px 48px) and design patterns

---

**Next Action**: Start Phase 4 - Transform Billing Particulars Table