# ViewBillingScreen Edit Mode Implementation Blueprint
**Date:** January 23, 2026  
**Status:** Planning Phase  
**Goal:** Make all fields in ViewBillingScreen editable with proper state management and save functionality

---

## 📊 CURRENT STATE ANALYSIS

### ✅ Currently Editable (in Edit Mode):
1. **Billing Particulars - Description only** (line items)
   - State: `editedParticulars`
   - Only the "particulars" field has input field in edit mode

### ❌ Currently Read-Only (need to make editable):

#### **General Information Section:**
1. Client Name (`billing.clientName`)
2. Company Name (`billing.companyName`)
3. Linked Voucher (`billing.voucherNumber`)
4. Total Expenses (`billing.expenseAmount`)

#### **Shipment Details Section:**
5. Vessel/Voyage (`billing.vessel`)
6. BL Number (`billing.blNumber`)
7. Destination (`billing.destination`)
8. Volume (`billing.volume`)
9. Commodity (`billing.commodity`)
10. Contract Number (`billing.contractNumber`)
11. Exchange Rate (`billing.exchangeRate`)
12. Container Numbers (`billing.containerNumbers[]`)

#### **Billing Particulars Table:**
13. Volume Type (`particular.volumeType`)
14. Quantity (`particular.volumeQty`)
15. Unit Cost (`particular.unitCost`)
16. Total (`particular.total`) - should be calculated
17. Exchange Rate (`particular.exchangeRate`)
18. Amount (`particular.amount`) - should be calculated

### 🔴 Current Issues:
- Only `editedParticulars` state exists for billing particulars descriptions
- No state variables for General Information fields
- No state variables for Shipment Details fields
- No actual save implementation - just shows toast
- "Save Changes" button doesn't call API to persist changes
- Missing validation logic
- No error handling for failed saves

---

## 🎯 IMPLEMENTATION PLAN

### **PHASE 1: State Management Setup** ✅
**Goal:** Create all necessary state variables for editable fields

#### Tasks:
1. ✅ Already exists: `editedParticulars` (BillingParticular[])
2. ✅ Already exists: `editedMargin` (number) - but not used
3. ✅ Add: `editedClientName` (string)
4. ✅ Add: `editedCompanyName` (string)
5. ✅ Add: `editedVoucherNumber` (string)
6. ✅ Add: `editedExpenseAmount` (number)
7. ✅ Add: `editedVessel` (string)
8. ✅ Add: `editedBlNumber` (string)
9. ✅ Add: `editedDestination` (string)
10. ✅ Add: `editedVolume` (string)
11. ✅ Add: `editedCommodity` (string)
12. ✅ Add: `editedContractNumber` (string)
13. ✅ Add: `editedExchangeRate` (string)
14. ✅ Add: `editedContainerNumbers` (string[])

**Code Location:** Lines 93-120 in ViewBillingScreen.tsx
**Status:** COMPLETE - All 14 state variables added

---

### **PHASE 2: Initialize Edited State** ✅
**Goal:** Populate edited state when billing loads or edit mode starts

#### Tasks:
1. ✅ Update the `useEffect` that runs when `billing` changes
2. ✅ Initialize all new state variables with current billing data
3. ✅ Ensure state resets when edit is cancelled

**Code Location:** Lines 132-163 in ViewBillingScreen.tsx (existing useEffect)
**Status:** COMPLETE - All fields initialize with fallback values when billing loads

**Initialization Code:**
```typescript
useEffect(() => {
  if (billing) {
    // Initialize billing particulars
    setEditedParticulars(billing.particulars);
    setEditedMargin(billing.margin || 0);
    setEditedStatus(billing.status);
    
    // Initialize General Information fields
    setEditedClientName(billing.clientName || "");
    setEditedCompanyName(billing.companyName || "");
    setEditedVoucherNumber(billing.voucherNumber || "");
    setEditedExpenseAmount(billing.expenseAmount || 0);
    
    // Initialize Shipment Details fields
    setEditedVessel(billing.vessel || "");
    setEditedBlNumber(billing.blNumber || "");
    setEditedDestination(billing.destination || "");
    setEditedVolume(billing.volume || "");
    setEditedCommodity(billing.commodity || "");
    setEditedContractNumber(billing.contractNumber || "");
    setEditedExchangeRate(billing.exchangeRate || "");
    setEditedContainerNumbers(billing.containerNumbers || []);
    
    // Fetch related bookings and expenses
    if (billing.bookingIds && billing.bookingIds.length > 0) {
      fetchLinkedBookings(billing.bookingIds);
    }
    if (billing.expenseIds && billing.expenseIds.length > 0) {
      fetchLinkedExpenses(billing.expenseIds);
    }
  }
}, [billing]);
```

---

### **PHASE 3: General Information - Make Fields Editable** ⬜
**Goal:** Add input fields for General Information section in edit mode

#### Fields to Update:
1. ⬜ Client Name - text input
2. ⬜ Company Name - text input
3. ⬜ Linked Voucher - text input (or keep read-only?)
4. ⬜ Total Expenses - number input (or keep calculated?)

**Design Pattern:**
```tsx
{isEditing ? (
  <input
    type="text"
    value={editedClientName}
    onChange={(e) => setEditedClientName(e.target.value)}
    style={{ /* Neuron input styles */ }}
  />
) : (
  billing.clientName
)}
```

**Code Location:** Lines 625-730 (General Information section)

---

### **PHASE 4: Shipment Details - Make Fields Editable** ⬜
**Goal:** Add input fields for Shipment Details section in edit mode

#### Fields to Update:
1. ⬜ Vessel/Voyage - text input
2. ⬜ BL Number - text input
3. ⬜ Destination - text input
4. ⬜ Volume - text input
5. ⬜ Commodity - text input
6. ⬜ Contract Number - text input
7. ⬜ Exchange Rate - text input
8. ⬜ Container Numbers - array of text inputs with add/remove buttons

**Special Handling:**
- Container Numbers need add/remove functionality similar to CreateBillingModal
- All fields should follow Neuron input styling

**Code Location:** Lines 790-880 (Shipment Details section)

---

### **PHASE 5: Billing Particulars - Complete Edit Fields** ⬜
**Goal:** Make ALL columns in particulars table editable, not just description

#### Fields to Update:
1. ✅ Particulars (description) - already editable
2. ⬜ Volume Type - dropdown (40'HC or BL)
3. ⬜ Quantity - number input
4. ⬜ Unit Cost - number input
5. ⬜ Total - auto-calculated (Qty × Unit Cost)
6. ⬜ Exchange Rate - number input
7. ⬜ Amount - auto-calculated (Total × Exchange Rate, or Total if no rate)

**Calculation Logic:**
```typescript
// When Qty or Unit Cost changes:
updated.total = qty * unitCost;

// When Total or Exchange Rate changes:
updated.amount = exchangeRate ? total * exchangeRate : total;
```

**Code Location:** Lines 991-1060 (Billing Particulars table rows)

---

### **PHASE 6: Save Functionality** ⬜
**Goal:** Implement actual API call to save changes

#### Tasks:
1. ⬜ Create `handleSaveChanges()` function
2. ⬜ Collect all edited data into update payload
3. ⬜ Call PATCH `/billings/:id` endpoint
4. ⬜ Handle success: refresh billing data, exit edit mode, show success toast
5. ⬜ Handle errors: show error toast, keep in edit mode
6. ⬜ Add loading state during save

**API Endpoint:** `PATCH /make-server-ce0d67b8/billings/:id`

**Payload Structure:**
```typescript
{
  clientName: editedClientName,
  companyName: editedCompanyName,
  voucherNumber: editedVoucherNumber,
  expenseAmount: editedExpenseAmount,
  vessel: editedVessel,
  blNumber: editedBlNumber,
  destination: editedDestination,
  volume: editedVolume,
  commodity: editedCommodity,
  contractNumber: editedContractNumber,
  exchangeRate: editedExchangeRate,
  containerNumbers: editedContainerNumbers,
  particulars: editedParticulars,
  margin: editedMargin,
  totalAmount: calculateTotalAmount(), // calculated from particulars
  updated_at: new Date().toISOString()
}
```

**Code Location:** Lines 460-481 (Save Changes button onClick)

---

### **PHASE 7: Cancel Functionality** ⬜
**Goal:** Properly reset all edited state when cancel is clicked

#### Tasks:
1. ⬜ Reset ALL edited state variables to original billing data
2. ⬜ Exit edit mode
3. ⬜ Show cancel confirmation toast

**Code Location:** Lines 425-449 (Cancel button onClick)

---

### **PHASE 8: Validation & Polish** ⬜
**Goal:** Add validation and improve UX

#### Tasks:
1. ⬜ Validate required fields (e.g., clientName can't be empty)
2. ⬜ Validate number fields (positive values only)
3. ⬜ Prevent save if validation fails
4. ⬜ Add visual indicators for required fields
5. ⬜ Add confirmation dialog for cancel if changes were made
6. ⬜ Add "dirty" state tracking (has user made changes?)
7. ⬜ Disable save button if no changes were made

---

## 🎨 DESIGN STANDARDS

### Input Field Styling (Neuron Theme):
```typescript
{
  padding: "12px 16px",
  fontSize: "14px",
  border: "1.5px solid #E5E9F0",
  borderRadius: "8px",
  color: "#12332B",
  backgroundColor: "white",
  outline: "none",
  transition: "border-color 0.2s ease"
}
```

### Input Focus States:
```typescript
onFocus: { borderColor: "#0F766E" }
onBlur: { borderColor: "#E5E9F0" }
```

---

## 🚀 EXECUTION ORDER

1. ✅ **Phase 1** - Add all state variables (10 min)
2. ✅ **Phase 2** - Initialize state in useEffect (5 min)
3. ⬜ **Phase 3** - General Information inputs (15 min)
4. ⬜ **Phase 4** - Shipment Details inputs (20 min)
5. ⬜ **Phase 5** - Complete Billing Particulars (15 min)
6. ⬜ **Phase 6** - Save functionality (20 min)
7. ⬜ **Phase 7** - Cancel functionality (5 min)
8. ⬜ **Phase 8** - Validation & polish (15 min)

**Total Estimated Time:** ~105 minutes (1.75 hours)

---

## 📝 NOTES

- Keep linked bookings/expenses read-only (managed via separate flow)
- Status is already editable via dropdown (separate from edit mode)
- Billing number and dates should remain read-only
- Total billing amount is auto-calculated from particulars + margin
- Follow CreateBillingModal patterns for consistency

---

## ✅ COMPLETION CHECKLIST

- [ ] All state variables created
- [ ] State initialization implemented
- [ ] General Information fields editable
- [ ] Shipment Details fields editable
- [ ] Billing Particulars fully editable
- [ ] Save API call implemented
- [ ] Cancel properly resets state
- [ ] Validation added
- [ ] Error handling implemented
- [ ] Testing completed
- [ ] Blueprint updated with ✅ marks

---

**Status Updates:**
- 2026-01-23 18:00 - Blueprint created, ready to begin implementation