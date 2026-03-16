# 🗓️ DATE EDITING STANDARDIZATION BLUEPRINT

**Project:** Standardize ALL date editing across Neuron OS to use HTML5 date inputs  
**Created:** January 26, 2026  
**Status:** 🟡 IN PROGRESS  
**Current Phase:** Phase 0 - Planning Complete

---

## **📋 OVERVIEW**

Replace all complex text-based date inputs with simple, user-friendly HTML5 `<input type="date">` fields across the entire system. This will make date editing consistent, easy, and eliminate parsing errors.

---

## **❌ CURRENT PROBLEMS**

1. **ViewVoucherScreen.tsx** - Uses `type="text"` with complex parsing logic (lines 576-600)
2. **ViewExpenseScreen.tsx** - Uses `type="text"` with formatDateForDisplay helper (line 1084-1086)
3. **CreateExpenseScreen.tsx** - Uses `type="text"` with MM/DD/YYYY formatting logic (multiple instances)
4. Inconsistent date formats across different screens
5. Manual parsing prone to errors
6. Poor UX - users can't use date pickers

---

## **✅ TARGET SOLUTION**

Use HTML5 `<input type="date">` everywhere:
- Native date picker UI
- No parsing needed
- Returns YYYY-MM-DD format (ISO 8601)
- Works on all modern browsers
- Consistent UX

---

## **🎯 PHASES**

### **✅ PHASE 0: PLANNING & BLUEPRINT CREATION**
**Status:** COMPLETE  
**Files:** `/DATE_EDITING_STANDARDIZATION.md`

- [x] Search for all date input fields
- [x] Identify problem areas
- [x] Create phased implementation plan

---

### **⏳ PHASE 1: FIX VOUCHER DATE EDITING**
**Status:** NOT STARTED  
**File:** `/components/accounting/ViewVoucherScreen.tsx`  
**Lines:** 575-601 (Request Date field in General Information section)

**Current Code:**
```typescript
<input
  type="text"
  value={editedVoucher?.voucherDate ? new Date(editedVoucher.voucherDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ""}
  onChange={(e) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        setEditedVoucher(editedVoucher ? {...editedVoucher, voucherDate: parsedDate.toISOString()} : null);
      } else {
        setEditedVoucher(editedVoucher ? {...editedVoucher, voucherDate: dateValue} : null);
      }
    } else {
      setEditedVoucher(editedVoucher ? {...editedVoucher, voucherDate: ""} : null);
    }
  }}
  placeholder="MM/DD/YYYY"
/>
```

**New Code:**
```typescript
<input
  type="date"
  value={editedVoucher?.voucherDate ? editedVoucher.voucherDate.split('T')[0] : ""}
  onChange={(e) => {
    const isoDate = e.target.value ? new Date(e.target.value).toISOString() : "";
    setEditedVoucher(editedVoucher ? {...editedVoucher, voucherDate: isoDate} : null);
  }}
  style={{
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    color: "#12332B"
  }}
/>
```

**Checklist:**
- [ ] Replace text input with date input
- [ ] Simplify onChange handler
- [ ] Test date selection
- [ ] Verify save functionality

---

### **⏳ PHASE 2: FIX EXPENSE DATE EDITING (ViewExpenseScreen)**
**Status:** NOT STARTED  
**File:** `/components/accounting/ViewExpenseScreen.tsx`  
**Lines:** 1083-1109 (Date field in Expense Information section)

**Current Code:**
```typescript
<input
  type="text"
  value={formatDateForDisplay(editedExpense?.expenseDate || "")}
  onChange={(e) => setEditedExpense({ ...editedExpense!, expenseDate: e.target.value })}
  placeholder="MM-DD-YYYY"
  // ... styles
/>
```

**New Code:**
```typescript
<input
  type="date"
  value={editedExpense?.expenseDate ? editedExpense.expenseDate.split('T')[0] : ""}
  onChange={(e) => {
    const isoDate = e.target.value ? new Date(e.target.value).toISOString() : "";
    setEditedExpense({ ...editedExpense!, expenseDate: isoDate });
  }}
  // ... styles (same)
/>
```

**Checklist:**
- [ ] Replace text input with date input
- [ ] Remove formatDateForDisplay dependency
- [ ] Test date editing
- [ ] Verify save updates correctly

---

### **⏳ PHASE 3: FIX EXPENSE DATE CREATION (CreateExpenseScreen)**
**Status:** NOT STARTED  
**File:** `/components/accounting/CreateExpenseScreen.tsx`  
**Lines:** Multiple instances (891-944 and 1158-1210)

**Current Code:** Complex MM/DD/YYYY formatting with validation logic

**New Code:**
```typescript
<Input
  id="expenseDate"
  type="date"
  value={formData.expenseDate}
  onChange={(e) => {
    setFormData((prev) => ({
      ...prev,
      expenseDate: e.target.value
    }));
  }}
  style={{ padding: "10px 12px", fontSize: "14px", height: "auto" }}
  className="border-[#E5E9F0]"
  required
/>
```

**Note:** Remove all the complex parsing logic and date preview display

**Checklist:**
- [ ] Update first instance (Charge Items mode)
- [ ] Update second instance (Line Items mode)
- [ ] Remove date parsing functions
- [ ] Remove date preview display
- [ ] Test expense creation
- [ ] Verify date saves in ISO format

---

### **⏳ PHASE 4: VERIFY OTHER DATE INPUTS ARE ALREADY CORRECT**
**Status:** NOT STARTED  
**Action:** Audit these files to confirm they already use `type="date"`

**Already Using type="date" (NO CHANGES NEEDED):**
- ✅ `/components/pricing/quotations/GeneralDetailsSection.tsx` (line 215)
- ✅ `/components/bd/AddBudgetRequestPanel.tsx` (line 355)
- ✅ `/components/bd/AddTaskPanel.tsx` (line 234)
- ✅ `/components/bd/TaskDetailInline.tsx` (line 352)
- ✅ `/components/accounting/AddRequestForPaymentPanel.tsx` (line 930)

**Checklist:**
- [ ] Verify all above files use type="date" correctly
- [ ] Test date pickers work
- [ ] Confirm no issues

---

### **⏳ PHASE 5: CREATE UTILITY HELPER FUNCTIONS**
**Status:** NOT STARTED  
**File:** Create new `/utils/dateHelpers.ts`

**Purpose:** Centralized date formatting and conversion utilities

```typescript
/**
 * Convert ISO date string to YYYY-MM-DD for date input
 */
export const toDateInputValue = (isoDate: string): string => {
  if (!isoDate) return "";
  return isoDate.split('T')[0];
};

/**
 * Convert date input value to ISO string
 */
export const fromDateInputValue = (dateValue: string): string => {
  if (!dateValue) return "";
  return new Date(dateValue).toISOString();
};

/**
 * Format date for display (e.g., "January 26, 2026")
 */
export const formatDateLong = (dateString: string): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
};

/**
 * Format date for display (e.g., "01/26/2026")
 */
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "2-digit", 
    day: "2-digit" 
  });
};
```

**Checklist:**
- [ ] Create utility file
- [ ] Add helper functions
- [ ] Export all functions
- [ ] Document usage

---

### **⏳ PHASE 6: FINAL TESTING & VERIFICATION**
**Status:** NOT STARTED  
**Action:** Test all date fields across the system

**Test Cases:**
- [ ] Voucher Request Date - edit and save
- [ ] Expense Date - edit and save (view screen)
- [ ] Expense Date - create new expense
- [ ] Budget Request Due Date - create/edit
- [ ] Task Due Date - create/edit
- [ ] Quotation Date - create/edit
- [ ] Payment Schedule Date - create RFP
- [ ] All dates display correctly in lists
- [ ] All dates save in ISO format to backend
- [ ] All date pickers are accessible
- [ ] Mobile responsiveness

---

## **📊 FILES REQUIRING CHANGES**

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| `ViewVoucherScreen.tsx` | 575-601 | Text input with complex parsing | 🔴 HIGH |
| `ViewExpenseScreen.tsx` | 1083-1109 | Text input with formatDateForDisplay | 🔴 HIGH |
| `CreateExpenseScreen.tsx` | 891-944, 1158-1210 | Complex MM/DD/YYYY formatting | 🔴 HIGH |

---

## **🔄 PROGRESS TRACKER**

**Total Phases:** 7 (Planning + 6 Implementation)  
**Completed:** 1 (Phase 0)  
**In Progress:** 0  
**Not Started:** 6  

**Overall Progress:** 14% ✅

---

## **📝 UPDATE LOG**

### January 26, 2026 - Phase 0 Complete
- ✅ Blueprint document created
- ✅ All problematic date inputs identified
- ✅ Solution designed (HTML5 date inputs)
- ✅ All phases defined
- 🎯 Ready to begin Phase 1

---

## **⚠️ IMPORTANT NOTES**

1. **ISO Format:** All dates should be stored in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
2. **Display vs Edit:** Use formatDate() for display, type="date" for editing
3. **Browser Support:** HTML5 date inputs work on all modern browsers
4. **Date Value:** `type="date"` expects YYYY-MM-DD, use `.split('T')[0]` to convert from ISO
5. **Backwards Compatibility:** Existing dates in database should work without migration

---

**Next Action:** Proceed to Phase 1 - Fix Voucher Date Editing
