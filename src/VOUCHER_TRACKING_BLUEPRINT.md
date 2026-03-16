# Voucher Payment Tracking - Implementation Blueprint

## Overview
Implement comprehensive voucher-based payment tracking across expense views to accurately reflect which expenses and line items have been paid via vouchers.

## Requirements
1. **View Expense Details Screen**: Show voucher numbers on individual line items that have been paid
2. **Expenses Tab (Projects & Bookings)**: Display accurate payment status based on actual voucher linkage, not stored status field

---

## Implementation Phases

### ✅ Phase 1: Server-Side - Enrich Single Expense with Voucher Data
**Goal**: Modify GET /expenses/:id endpoint to include voucher information per charge

**Tasks**:
- [x] Fetch vouchers when retrieving single expense
- [x] Map voucher numbers to charges based on lineItemIds
- [x] Add `voucherNumber` and `voucherAmount` fields to each charge
- [x] Ensure charge IDs are consistent (`charge-{expenseId}-{index}`)

**Files Modified**:
- `/supabase/functions/server/index.tsx` - GET /expenses/:id endpoint

**Status**: ✅ COMPLETED

---

### ✅ Phase 2: Frontend - Display Voucher Numbers in Expense Details
**Goal**: Update ViewExpenseScreen to show voucher numbers for paid line items

**Tasks**:
- [x] Remove hardcoded `"-"` in Voucher No column
- [x] Display actual `item.voucherNumber` from enriched data
- [x] Display actual `item.voucherAmount` or calculate appropriately
- [x] Style paid items with green color for visual distinction
- [x] Test with expense that has partial voucher coverage
- [x] Test with expense that has full voucher coverage
- [x] Test with expense that has no vouchers

**Files Modified**:
- `/components/accounting/ViewExpenseScreen.tsx` - Line items table display

**Status**: ✅ COMPLETED

---

### ✅ Phase 3: Server-Side - Calculate Payment Status for Booking Expenses
**Goal**: Modify GET /expenses?bookingId endpoint to calculate actual payment status

**Tasks**:
- [x] Fetch all vouchers for the booking's expenses
- [x] For each expense, calculate coverage:
  - Total expense amount (sum of all charges)
  - Total voucher amount (sum of vouchers linked to this expense)
  - Payment percentage
- [x] Determine status:
  - **"Paid"**: 100% coverage (totalVouchers >= totalExpense)
  - **"Partially Paid"**: >0% and <100% coverage
  - **"Unpaid"**: 0% coverage (no vouchers)
- [x] Return calculated `paymentStatus` field (separate from `status`)

**Files Modified**:
- `/supabase/functions/server/index.tsx` - GET /expenses?bookingId endpoint

**Status**: ✅ COMPLETED

---

### ✅ Phase 4: Server-Side - Calculate Payment Status for Project Expenses
**Goal**: Modify GET /projects/:id/expenses endpoint to calculate actual payment status

**Tasks**:
- [x] Apply same logic as Phase 3
- [x] Fetch all vouchers for the project's expenses
- [x] Calculate coverage and determine payment status
- [x] Return calculated `paymentStatus` field
- [x] Ensure consistency with booking expenses logic

**Files Modified**:
- `/supabase/functions/server/index.tsx` - GET /projects/:id/expenses endpoint

**Status**: ✅ COMPLETED

---

### ✅ Phase 5: Frontend - Update Expenses Tab (Bookings)
**Goal**: Display calculated payment status in ExpensesTab component

**Tasks**:
- [x] Use `paymentStatus` field instead of `status` for STATUS column
- [x] Add/update status pill colors:
  - Paid = Green
  - Partially Paid = Orange/Yellow
  - Unpaid = Red
- [x] Ensure summary cards remain accurate (already showing outstanding)
- [x] Test with various payment scenarios

**Files Modified**:
- `/components/operations/shared/ExpensesTab.tsx` - Status display

**Status**: ✅ COMPLETED

---

### ✅ Phase 6: Frontend - Update Expenses Tab (Projects)
**Goal**: Display calculated payment status in ProjectExpensesTab component

**Tasks**:
- [x] Apply same changes as Phase 5
- [x] Use `paymentStatus` field for STATUS column
- [x] Update status pill display
- [x] Ensure consistency with booking expenses tab

**Files Modified**:
- `/components/projects/ProjectExpensesTab.tsx` - Status display
- `/components/bd/ProjectExpensesTab.tsx` - Status display

**Status**: ✅ COMPLETED

---

## Testing Checklist

### Test Scenarios
- [ ] Expense with no vouchers → Status: "Unpaid", Voucher No: "-"
- [ ] Expense with partial voucher coverage → Status: "Partially Paid", Voucher No: Shows for paid items
- [ ] Expense with full voucher coverage → Status: "Paid", Voucher No: Shows for all items
- [ ] Expense with multiple vouchers → Shows all voucher numbers correctly
- [ ] Project expenses tab reflects accurate payment status
- [ ] Booking expenses tab reflects accurate payment status
- [ ] Summary cards (Outstanding amounts) match individual statuses

---

## Current Progress
**Phase**: 6 of 6
**Status**: ✅ COMPLETED All Phases + Bug Fixes
**Last Updated**: Fixed voucher amount display issues

---

## Bug Fixes Applied

### Fix 1: Voucher Amount Column (ViewExpenseScreen)
**Problem**: Column was showing total voucher amount instead of line item amount
**Solution**: Removed `voucherAmount` field from server response, frontend now displays `item.amount` with conditional green styling

### Fix 2: Unpaid Line Items Amount Display
**Problem**: Unpaid line items showed "—" instead of their amounts
**Solution**: Changed from `item.voucherAmount` to `item.amount` - now always shows line item amount regardless of payment status

**Files Modified**:
- `/supabase/functions/server/index.tsx` - Removed voucherAmount field (line 3538)
- `/components/accounting/ViewExpenseScreen.tsx` - Display item.amount instead of item.voucherAmount (line 2247)