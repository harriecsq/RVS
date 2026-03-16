# OUTSTANDING AMOUNTS IMPLEMENTATION BLUEPRINT
**Date Started:** January 23, 2026  
**Status:** 🟡 IN PROGRESS  
**Current Phase:** Phase 4 - Server: Bookings Financial Data

---

## 🎯 OBJECTIVE
Change all expense and billing displays from showing **TOTALS** to showing **OUTSTANDING AMOUNTS**:
- **Expenses Outstanding** = Total Expenses - Total Vouchers Paid
- **Billings Outstanding** = Total Billings - Total Collections Received

---

## 📋 IMPLEMENTATION PHASES

### **PHASE 1: Server - Projects Expense Outstanding** ✅ COMPLETED
**Endpoints modified:**
- [x] `GET /make-server-ce0d67b8/projects` (all projects)
- [x] `GET /make-server-ce0d67b8/projects/:id` (single project)

**Changes implemented:**
1. Fetches all vouchers linked to project expenses ✅
2. Calculates `totalExpenses` (sum of all expense amounts) ✅
3. Calculates `totalVouchers` (sum of all voucher amounts for those expenses) ✅
4. Calculates `expensesOutstanding = totalExpenses - totalVouchers` ✅
5. Returns new fields: `totalExpenses`, `totalVouchers`, `expensesOutstanding` ✅
6. Also renamed billing `balance` to `billingsOutstanding` for consistency ✅

**Files modified:**
- `/supabase/functions/server/index.tsx` (lines 2015-2090, 2134-2205)

---

### **PHASE 2: Frontend - Projects Expense Tab** ✅ COMPLETED
**Component modified:**
- [x] `/components/projects/ProjectExpensesTab.tsx`

**Changes implemented:**
1. Added `fetchProjectFinancials()` to get financial data from server ✅
2. Updated Summary Cards to show 3 financial metrics ✅
   - Total Expenses (all expenses)
   - Vouchers Paid (total paid via vouchers)
   - Outstanding (highlighted with green border) - THE KEY METRIC
3. Removed old "Paid/Draft" count cards, kept only "Pending" for status tracking ✅
4. Outstanding card has emphasis styling (border: 2px solid #0F766E) ✅

**Files modified:**
- `/components/projects/ProjectExpensesTab.tsx` (lines 38-216)

---

### **PHASE 3: Frontend - Projects Billing Tab** ✅ COMPLETED
**Component modified:**
- [x] `/components/projects/ProjectBillingsTab.tsx`

**Changes implemented:**
1. Added `fetchProjectFinancials()` to get financial data from server ✅
2. Updated Summary Cards to show 3 financial metrics ✅
   - Total Billed (all billings)
   - Collections Received (total collections)
   - Outstanding (highlighted with green border) - THE KEY METRIC
3. Removed old "Paid/Draft" count cards, kept only "Pending" for status tracking ✅
4. Outstanding card has emphasis styling (border: 2px solid #0F766E) ✅

**Files modified:**
- `/components/projects/ProjectBillingsTab.tsx` (lines 37-217)

---

### **PHASE 4: Server - Bookings Financial Data** 🟡 IN PROGRESS
**Endpoints to modify:**
- [ ] `GET /make-server-ce0d67b8/bookings/:bookingId/billings`
- [ ] `GET /make-server-ce0d67b8/bookings/:bookingId/expenses`

**Changes needed:**
1. **Billings endpoint:**
   - Fetch collections for each billing
   - Calculate `totalBillings`, `totalCollections`, `billingsOutstanding`
   
2. **Expenses endpoint:**
   - Fetch vouchers for each expense
   - Calculate `totalExpenses`, `totalVouchers`, `expensesOutstanding`

**Files to modify:**
- `/supabase/functions/server/index.tsx` (booking endpoints ~5900-6000)

---

### **PHASE 5: Frontend - Bookings Tabs** ⚪ NOT STARTED
**Components to find and modify:**
- [ ] Find booking detail component with billings tab
- [ ] Find booking detail component with expenses tab

**Changes needed:**
1. Update billing display to show outstanding
2. Update expense display to show outstanding
3. Match the same pattern as Projects tabs

---

### **PHASE 6: Testing & Verification** ⚪ NOT STARTED
**Test scenarios:**
- [ ] Project with expenses but no vouchers → Shows full expense as outstanding
- [ ] Project with expenses and partial vouchers → Shows correct outstanding
- [ ] Project with expenses and full vouchers → Shows zero outstanding
- [ ] Project with billings but no collections → Shows full billing as outstanding
- [ ] Project with billings and partial collections → Shows correct outstanding
- [ ] Project with billings and full collections → Shows zero outstanding
- [ ] Same tests for bookings

---

## 📊 PROGRESS TRACKER
- **Total Phases:** 6
- **Completed:** 3 (Phases 1-3: Projects Complete!)
- **In Progress:** 1 (Phase 4: Bookings Server)
- **Remaining:** 2
- **Overall Progress:** 50% → █████░░░░░

---

## 🔄 PHASE UPDATE LOG

### Phase 1: Server - Projects Expense Outstanding ✅
**Status:** ✅ COMPLETED  
**Started:** January 23, 2026  
**Completed:** January 23, 2026  

**Implementation Notes:**
- Modified GET /projects endpoint to calculate expense outstanding
- Modified GET /projects/:id endpoint to calculate expense outstanding
- Server now returns: totalExpenses, totalVouchers, expensesOutstanding
- Also renamed balance to billingsOutstanding for consistency
- Handles both direct project expenses and booking-linked expenses
- Calculates from charges array if available, otherwise uses amount field

**Files Modified:**
- `/supabase/functions/server/index.tsx` (lines 2015-2090, 2134-2205)

---

### Phase 2: Frontend - Projects Expense Tab ✅
**Status:** ✅ COMPLETED  
**Started:** January 23, 2026  
**Completed:** January 23, 2026  

**Implementation Notes:**
- Added `fetchProjectFinancials()` to get financial data from server
- Updated Summary Cards to show 3 financial metrics
   - Total Expenses (all expenses)
   - Vouchers Paid (total paid via vouchers)
   - Outstanding (highlighted with green border) - THE KEY METRIC
- Removed old "Paid/Draft" count cards, kept only "Pending" for status tracking
- Outstanding card has emphasis styling (border: 2px solid #0F766E)

**Files Modified:**
- `/components/projects/ProjectExpensesTab.tsx` (lines 38-216)

---

### Phase 3: Frontend - Projects Billing Tab ✅
**Status:** ✅ COMPLETED  
**Started:** January 23, 2026  
**Completed:** January 23, 2026  

**Implementation Notes:**
- Added `fetchProjectFinancials()` to get financial data from server
- Updated Summary Cards to show 3 financial metrics
   - Total Billed (all billings)
   - Collections Received (total collections)
   - Outstanding (highlighted with green border) - THE KEY METRIC
- Removed old "Paid/Draft" count cards, kept only "Pending" for status tracking
- Outstanding card has emphasis styling (border: 2px solid #0F766E)

**Files Modified:**
- `/components/projects/ProjectBillingsTab.tsx` (lines 37-217)

---

### Phase 4: Server - Bookings Financial Data 🟡
**Status:** 🟡 IN PROGRESS
**Started:** January 23, 2026
**Current Step:** Searching for booking endpoints

**Implementation Notes:**
- Looking for GET /bookings/:bookingId/billings endpoint
- Looking for GET /bookings/:bookingId/expenses endpoint
- Will add same financial calculation logic as projects

---

## 🎯 NEXT STEPS
1. ✅ ~~Create this blueprint document~~
2. ✅ ~~Implement Phase 1: Projects server endpoints~~
3. ✅ ~~Implement Phase 2: Projects Expense Tab~~
4. ✅ ~~Implement Phase 3: Projects Billing Tab~~
5. ⏳ **NOW:** Implement Phase 4: Bookings server endpoints
6. ⏳ Implement Phase 5: Bookings frontend tabs

---

**Last Updated:** January 23, 2026 - Phases 1-3 Completed (Projects Done!), Starting Phase 4 (Bookings)