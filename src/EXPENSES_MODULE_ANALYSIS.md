# Expenses Module - Current State Analysis

**Analysis Date:** January 22, 2026  
**Module:** Accounting / Expenses

---

## 1. CURRENT EXPENSE DATA STRUCTURE

### Interface: `ExpenseData` (ViewExpenseScreen.tsx)
```typescript
interface ExpenseData {
  id: string;
  expenseNumber: string;
  projectId: string;
  projectNumber?: string;
  bookingIds: string[];                    // Array of linked booking IDs
  linkedBookingIds?: string[];             // Support for project-created expenses
  category: string;
  vendor?: string;
  amount: number;                          // ⚠️ SINGLE FIELD - Not auto-calculated
  expenseDate: string;
  paymentMethod?: string;
  description?: string;
  receiptNumber?: string;
  notes?: string;
  documentTemplate: "IMPORT" | "EXPORT" | "";
  status: string;
  createdAt: string;
  
  // Template-specific fields
  pod?: string;
  commodity?: string;
  blNumber?: string;
  containerNo?: string;
  weight?: string;
  vesselVoyage?: string;
  origin?: string;
  releasingDate?: string;
  clientShipper?: string;
  destination?: string;
  loadingAddress?: string;
  exchangeRate?: string;
  containerNumbers?: string[];
  charges?: LineItem[];                    // ⚠️ Array of line items with amounts
}

interface LineItem {
  category: string;
  description: string;
  amount: number;                          // Individual line item amount
  unitPrice?: number;
  per?: string;
  currency?: string;
  voucherNo?: string;
}
```

---

## 2. TOTAL AMOUNT CALCULATION - CURRENT STATE

### ❌ Problem: Amount is NOT Auto-Calculated

**ViewExpenseScreen.tsx (Line 609):**
```typescript
const grandTotal = displayedExpense.charges 
  ? displayedExpense.charges.reduce((sum, c) => sum + (c.amount || 0), 0) 
  : 0;
```

**Issue:** 
- `grandTotal` is calculated from `charges` array
- BUT this is NOT saved back to `expense.amount` field
- The `expense.amount` field is a STATIC value set at creation
- When line items are edited, `expense.amount` is NOT updated

### handleSave Function (Line 359-389):
```typescript
const handleSave = async () => {
  if (!editedExpense) return;
  
  // ⚠️ Sends editedExpense AS-IS without recalculating amount
  const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${publicAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(editedExpense),  // ← amount NOT recalculated here
  });
}
```

---

## 3. EXPENSE LINKAGE TO PROJECTS & BOOKINGS

### Current Linking Mechanism:

**Projects:**
- `expense.projectId` - Single project ID
- `expense.projectNumber` - Display value

**Bookings:**
- `expense.bookingIds` - Array of booking IDs (many-to-many)
- `expense.linkedBookingIds` - Alternative field for project-created expenses

### API Endpoints:

**Backend (index.tsx Line 3098):**
```typescript
// Create expense
app.post("/make-server-ce0d67b8/expenses", async (c) => {
  const expense = await c.req.json();
  expense.id = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  expense.created_at = expense.created_at || new Date().toISOString();
  expense.status = expense.status || "Pending";
  await kv.set(`expense:${expense.id}`, expense);  // ← Saved to KV store
});
```

**Storage Pattern:**
- Key: `expense:{expenseId}`
- Value: Full expense object with amount, bookingIds, projectId

---

## 4. DISPLAYING EXPENSES IN OTHER MODULES

### 4.1 Projects Module (ProjectExpensesTab.tsx)

**Current Behavior:**
```typescript
const handleExpenseClick = (expense: Expense) => {
  // ❌ NAVIGATES to Expenses module (full route change)
  navigate("/accounting/expenses", {
    state: {
      openExpenseId: expense.expenseId || expense.id,
    },
  });
};
```

**Display:**
- Shows expense list in table format
- Calculates totals from `expense.amount` field
- Line 109: `const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);`

### 4.2 Bookings Module (ExpensesTab.tsx)

**Current Behavior:**
- Same as Projects - navigates to Expenses module
- Uses `navigate()` to route change
- Does NOT use side panel

---

## 5. SIDE PANEL PATTERN - EXISTS IN CODEBASE

### Examples Found:

**CustomerDetail.tsx:**
```typescript
<div className="fixed right-0 top-0 h-full w-[680px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
  {/* Panel content */}
</div>
```

**BudgetRequestDetailPanel.tsx:**
```typescript
<div className="fixed right-0 top-0 h-full w-[920px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
  {/* Panel content */}
</div>
```

**Pattern:**
- Fixed position overlay
- Slide-in animation
- Width: 680px - 920px
- Backdrop overlay with blur
- Close button in header

---

## 6. SUMMARY OF ISSUES

### Issue #1: Amount Field Not Auto-Calculated
- ❌ `expense.amount` is static
- ❌ NOT updated when line items change
- ❌ Causes data inconsistency
- ❌ Projects/Bookings show wrong totals

### Issue #2: Amount Not Reflected in Linked Modules
- ❌ Projects show `expense.amount` (may be outdated)
- ❌ Bookings show `expense.amount` (may be outdated)
- ❌ No real-time recalculation from `charges` array

### Issue #3: No Side Panel for Cross-Module Viewing
- ❌ Clicking expense in Projects → navigates away from Projects
- ❌ Clicking expense in Bookings → navigates away from Bookings
- ❌ User loses context
- ❌ No quick preview option

---

## 7. REQUIRED CHANGES

### Change #1: Auto-Calculate Total Amount
**Where:** ViewExpenseScreen.tsx - handleSave()
**What:** Calculate total from charges before saving
```typescript
const grandTotal = editedExpense.charges
  ? editedExpense.charges.reduce((sum, c) => sum + (c.amount || 0), 0)
  : 0;

const expenseToSave = {
  ...editedExpense,
  amount: grandTotal  // ← Update amount field
};
```

### Change #2: Reflect Amount in Projects/Bookings
**Where:** ProjectExpensesTab.tsx, ExpensesTab.tsx
**What:** Ensure displays use updated `expense.amount`
**Note:** If amount is auto-calculated, this should work automatically

### Change #3: Side Panel Implementation
**Where:** 
- Create new component: `ExpenseDetailPanel.tsx`
- Update: ProjectExpensesTab.tsx
- Update: ExpensesTab.tsx

**What:**
- Replace `navigate()` with panel state
- Show ViewExpenseScreen content in slide-out panel
- Add backdrop overlay
- Allow closing panel to return to original context

---

## 8. FILES TO MODIFY

1. **ViewExpenseScreen.tsx**
   - Update `handleSave()` to calculate and set amount
   - Ensure amount is always synced with charges

2. **CreateExpenseScreen.tsx**
   - Update expense creation to calculate initial amount

3. **ExpenseDetailPanel.tsx** (NEW)
   - Side panel wrapper component
   - Contains ViewExpenseScreen
   - Handles open/close state

4. **ProjectExpensesTab.tsx**
   - Replace navigate with panel state
   - Add ExpenseDetailPanel component

5. **ExpensesTab.tsx** (Bookings)
   - Replace navigate with panel state
   - Add ExpenseDetailPanel component

6. **/supabase/functions/server/index.tsx**
   - Consider if amount should be calculated server-side
   - Add validation to ensure amount matches charges total

---

## 9. OPEN QUESTIONS

1. **Should amount be calculated client-side or server-side?**
   - Client: Faster, immediate feedback
   - Server: Single source of truth, validation

2. **Should we prevent manual amount editing?**
   - Make `amount` read-only (calculated field)
   - Or allow override with warning?

3. **Should CreateExpenseModal also have this logic?**
   - Yes, for consistency
   - Calculate amount when charges are added

4. **Side panel width?**
   - 920px (matches BudgetRequestDetailPanel)
   - Or full ViewExpenseScreen width?

---

**End of Analysis**
