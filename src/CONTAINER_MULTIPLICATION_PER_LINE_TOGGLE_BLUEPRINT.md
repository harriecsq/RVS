# Container Multiplication Per-Line Toggle - Implementation Blueprint

## 📋 Problem Statement - REVISED

Currently, the **ChargeCategories** component has a **GLOBAL toggle** that affects ALL line items at once. This is **NOT GRANULAR ENOUGH**.

**Actual User Requirement:**
- Each line item needs its **OWN independent toggle** for auto-multiplication
- When toggle is **OFF** for a line item, the `{containerCount}X40'HC` column becomes **EDITABLE**
- User can manually enter a custom amount that overrides the automatic calculation
- Some charges need multiplication (per-container fees), others don't (fixed fees)

---

## 🎯 Solution Approach

**Per-Line-Item Toggle with Manual Override Capability**

### Key Features:
1. **Independent Toggle per Line Item** - Each line has its own checkbox
2. **Conditional Editability** - `{containerCount}X40'HC` column switches between read-only and editable
3. **Manual Override** - User can type custom amount when auto-multiply is OFF
4. **Smart Defaults** - Auto-multiply ON by default, manual amount pre-fills with unit price

### User Experience Flow:
```
1. User adds line item
   → Auto-multiply checkbox: ☑ (checked by default)
   → {containerCount}X40'HC column: READ-ONLY, shows calculated value

2. User unchecks auto-multiply checkbox
   → {containerCount}X40'HC column: BECOMES EDITABLE
   → Pre-fills with unit price (not calculated value)
   → User can type custom amount

3. User edits manual amount
   → Voucher Amount updates to reflect manual amount
   → Category total updates
   → Grand total updates

4. User checks auto-multiply checkbox again
   → {containerCount}X40'HC column: BACK TO READ-ONLY
   → Shows auto-calculated value (unitPrice × containerCount)
```

---

## 📐 Implementation Phases

### ✅ Phase 0: Blueprint Creation & Revert Previous Implementation
**Status:** ✅ COMPLETED
- [x] Create new blueprint for per-line-item toggle
- [x] Revert global toggle from header (previous implementation)
- [x] Update LineItem interface to include new fields
- [x] Plan new table column layout

---

### Phase 1: Update Data Structure & Interface
**Status:** ✅ COMPLETED
**Goal:** Add new fields to LineItem interface and update initialization logic

**Tasks:**
- [x] Add `autoMultiply: boolean` field to LineItem interface (default: true)
- [x] Add `manualAmount: number` field to LineItem interface (default: 0)
- [x] Update `addItem()` function to initialize new fields
- [x] Ensure TypeScript types are correct

**Result:** ✅ Data structure updated, global toggle removed, header reverted

**Implementation Details:**

**Location:** `/components/accounting/ChargeCategories.tsx`

**Updated LineItem Interface (lines 13-20):**
```typescript
interface LineItem {
  id: string;
  particulars: string;
  unitPrice: number;
  per: "40" | "BL";
  autoMultiply: boolean;     // NEW: Per-item toggle (default: true)
  manualAmount: number;      // NEW: Manual override amount
  currency: string;
  voucherNo: string;
}
```

**Updated addItem() Function (lines ~130-147):**
```typescript
const addItem = (categoryId: string) => {
  const newItem: LineItem = {
    id: `${categoryId}-${Date.now()}`,
    particulars: "",
    unitPrice: 0,
    per: "40",
    autoMultiply: true,        // NEW: Default ON
    manualAmount: 0,           // NEW: Default 0
    currency: mainCurrency,
    voucherNo: "",
  };

  handleCategoriesChange(
    categories.map((cat) =>
      cat.id === categoryId
        ? { ...cat, items: [...cat.items, newItem] }
        : cat
    )
  );
};
```

**Files to modify:**
- `/components/accounting/ChargeCategories.tsx` (lines 13-20, 130-147)

**Success Criteria:**
- ✅ LineItem interface includes `autoMultiply` and `manualAmount` fields
- ✅ New line items initialize with `autoMultiply: true, manualAmount: 0`
- ✅ No TypeScript errors
- ✅ Existing line items continue to work

---

### Phase 2: Update Table Column Layout
**Status:** ⏸️ WAITING (Phase 1 must complete first)
**Goal:** Add new "Auto" checkbox column and update grid layout

**Tasks:**
- [ ] Add "Auto" column header
- [ ] Update grid layout to accommodate new column
- [ ] Adjust column widths for proper spacing
- [ ] Ensure responsive layout

**Implementation Details:**

**Location:** `/components/accounting/ChargeCategories.tsx` (lines ~330-339: Table Header)

**Current Grid Layout:**
```typescript
grid-cols-[2.5fr_0.8fr_0.8fr_0.8fr_1fr_1.2fr_1fr_auto]
// Particulars | Unit Price | Per | Currency | {containerCount}X40'HC | Voucher No | Voucher Amount | Delete
```

**New Grid Layout:**
```typescript
grid-cols-[2.5fr_0.8fr_0.6fr_0.5fr_0.8fr_1fr_1.2fr_1fr_auto]
// Particulars | Unit Price | Per | Auto | Currency | {containerCount}X40'HC | Voucher No | Voucher Amount | Delete
```

**Updated Table Header:**
```tsx
<div className="grid grid-cols-[2.5fr_0.8fr_0.6fr_0.5fr_0.8fr_1fr_1.2fr_1fr_auto] gap-2 px-4 py-2 bg-[#FAFBFC] border-y border-[#E5E9F0] text-xs text-[#667085] font-medium">
  <div>Particulars</div>
  <div>Unit Price</div>
  <div>Per</div>
  <div>Auto</div>  {/* NEW COLUMN */}
  <div>Currency</div>
  <div>{containerCount}X40'HC</div>
  <div>Voucher No</div>
  <div className="text-right">Voucher Amount</div>
  <div></div>
</div>
```

**Files to modify:**
- `/components/accounting/ChargeCategories.tsx` (lines ~330-339, 343-456)

**Success Criteria:**
- ✅ New "Auto" column header visible
- ✅ Grid layout accommodates new column without breaking
- ✅ Column widths properly balanced
- ✅ No horizontal overflow or text cutoff
- ✅ All columns aligned properly

---

### Phase 3: Add Auto-Multiply Checkbox Column (Per Line Item)
**Status:** ⏸️ WAITING (Phase 2 must complete first)
**Goal:** Add checkbox in each line item row for auto-multiply toggle

**Tasks:**
- [ ] Add checkbox input in "Auto" column
- [ ] Connect checkbox to `item.autoMultiply` state
- [ ] Disable checkbox when "Per" is "BL" (grayed out)
- [ ] Style checkbox to match Neuron design system
- [ ] Update state when checkbox is toggled

**Implementation Details:**

**Location:** `/components/accounting/ChargeCategories.tsx` (lines ~342-456: Line Items Rendering)

**Add Checkbox Column (after "Per" column, before "Currency" column):**
```tsx
{/* Per */}
<Select
  value={item.per}
  onValueChange={(value) =>
    updateItem(category.id, item.id, "per", value)
  }
>
  <SelectTrigger className="border-[#E5E9F0] h-9 text-sm">
    <SelectValue />
  </SelectTrigger>
  <SelectContent zIndex="z-[1100]">
    <SelectItem value="40">40'HC</SelectItem>
    <SelectItem value="BL">BL</SelectItem>
  </SelectContent>
</Select>

{/* NEW: Auto-Multiply Checkbox */}
<div className="flex items-center justify-center">
  <input
    type="checkbox"
    checked={item.autoMultiply}
    disabled={item.per === "BL"}  // Grayed out when "Per" is "BL"
    onChange={(e) =>
      updateItem(category.id, item.id, "autoMultiply", e.target.checked)
    }
    className={`w-4 h-4 rounded focus:ring-2 focus:ring-[#0F766E] cursor-pointer accent-[#0F766E] ${
      item.per === "BL" 
        ? "opacity-40 cursor-not-allowed" 
        : ""
    }`}
  />
</div>

{/* Currency */}
<Select
  value={item.currency}
  onValueChange={(value) =>
    updateItem(category.id, item.id, "currency", value)
  }
>
  {/* ... */}
</Select>
```

**Handle Checkbox State Change:**
- When checkbox is **unchecked**: Set `manualAmount = item.unitPrice` (pre-fill with unit price)
- When checkbox is **checked**: Clear `manualAmount = 0` (back to auto-calculation)

**Enhanced updateItem() Function:**
```typescript
const updateItem = (
  categoryId: string,
  itemId: string,
  field: keyof LineItem,
  value: any
) => {
  handleCategoriesChange(
    categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            items: cat.items.map((item) => {
              if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value };
                
                // Special handling for autoMultiply toggle
                if (field === "autoMultiply") {
                  if (value === false) {
                    // Unchecked: Pre-fill manualAmount with unitPrice
                    updatedItem.manualAmount = item.unitPrice;
                  } else {
                    // Checked: Clear manualAmount
                    updatedItem.manualAmount = 0;
                  }
                }
                
                return updatedItem;
              }
              return item;
            }),
          }
        : cat
    )
  );
};
```

**Files to modify:**
- `/components/accounting/ChargeCategories.tsx` (lines ~160-177: updateItem function, ~380-395: checkbox UI)

**Success Criteria:**
- ✅ Checkbox visible in "Auto" column for each line item
- ✅ Checkbox connected to `item.autoMultiply` state
- ✅ Checkbox disabled/grayed when "Per" is "BL"
- ✅ Checkbox responds to clicks and updates state
- ✅ manualAmount pre-fills with unitPrice when unchecked
- ✅ Matches Neuron design system styling

---

### Phase 4: Make {containerCount}X40'HC Column Conditionally Editable
**Status:** ⏸️ WAITING (Phase 3 must complete first)
**Goal:** Toggle between read-only display and editable input based on autoMultiply state

**Tasks:**
- [ ] Show read-only display when `autoMultiply = true`
- [ ] Show editable input when `autoMultiply = false`
- [ ] Connect input to `manualAmount` field
- [ ] Style editable input to match other inputs
- [ ] Style read-only display to match existing

**Implementation Details:**

**Location:** `/components/accounting/ChargeCategories.tsx` (lines ~432-437: Container Multiplier column)

**Current Code (Read-Only Only):**
```tsx
{/* Container Multiplier (#X40'HC) - Calculated, Not Editable */}
<div className="text-sm text-[#12332B] font-medium text-center bg-[#FAFBFC] px-3 py-2 rounded border border-[#E5E9F0]">
  {calculateContainerMultipliedAmount(item) > 0 
    ? calculateContainerMultipliedAmount(item).toFixed(2)
    : "-"}
</div>
```

**New Code (Conditional Rendering):**
```tsx
{/* Container Multiplier (#X40'HC) - Conditional: Read-only or Editable */}
{item.autoMultiply ? (
  // AUTO-MULTIPLY ON: Read-only, show calculated value
  <div className="text-sm text-[#12332B] font-medium text-center bg-[#FAFBFC] px-3 py-2 rounded border border-[#E5E9F0]">
    {item.per === "40"
      ? (item.unitPrice * containerCount).toFixed(2)
      : "-"}
  </div>
) : (
  // AUTO-MULTIPLY OFF: Editable input for manual amount
  <Input
    type="number"
    step="0.01"
    value={item.manualAmount || ""}
    onChange={(e) =>
      updateItem(
        category.id,
        item.id,
        "manualAmount",
        parseFloat(e.target.value) || 0
      )
    }
    className="border-[#E5E9F0] h-9 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    placeholder="0.00"
  />
)}
```

**Design Specifications:**
- **Read-only:** Gray background (#FAFBFC), centered text, border
- **Editable:** White background, centered text, border, numeric input
- **Transition:** Smooth switch between modes when checkbox toggles

**Files to modify:**
- `/components/accounting/ChargeCategories.tsx` (lines ~432-437)

**Success Criteria:**
- ✅ Column shows read-only when autoMultiply is ON
- ✅ Column shows editable input when autoMultiply is OFF
- ✅ Input connected to manualAmount field
- ✅ Input updates state on change
- ✅ Styling matches other inputs/displays
- ✅ No layout shifts when switching modes
- ✅ Numeric input with proper formatting

---

### Phase 5: Update Calculation Logic
**Status:** ⏸️ WAITING (Phase 4 must complete first)
**Goal:** Update calculation functions to respect per-item autoMultiply flag and use manualAmount

**Tasks:**
- [ ] Update `calculateItemAmount()` to check `item.autoMultiply`
- [ ] Use `item.manualAmount` when autoMultiply is OFF
- [ ] Ensure category totals calculate correctly
- [ ] Ensure grand total calculates correctly
- [ ] Ensure data sent to parent is correct

**Implementation Details:**

**Location:** `/components/accounting/ChargeCategories.tsx` (lines ~180-200: Calculation functions)

**Updated `calculateItemAmount()` Function:**
```typescript
const calculateItemAmount = (item: LineItem) => {
  if (item.per === "40") {
    if (item.autoMultiply) {
      // AUTO-MULTIPLY ON: Use calculated amount (unitPrice × containerCount)
      return item.unitPrice * containerCount;
    } else {
      // AUTO-MULTIPLY OFF: Use manual amount
      return item.manualAmount;
    }
  } else {
    // Per is "BL": Just unit price (no multiplication)
    return item.unitPrice;
  }
};
```

**Remove `calculateContainerMultipliedAmount()` Function:**
- No longer needed since we're using conditional rendering
- Column now either shows calculated value or is editable

**Files to modify:**
- `/components/accounting/ChargeCategories.tsx` (lines ~180-200)

**Success Criteria:**
- ✅ calculateItemAmount() respects per-item autoMultiply flag
- ✅ Uses manualAmount when autoMultiply is OFF
- ✅ Category totals calculate correctly
- ✅ Grand total calculates correctly
- ✅ Data sent to parent includes correct amounts
- ✅ No calculation errors or NaN values

---

### Phase 6: Revert Previous Global Toggle Implementation
**Status:** ⏸️ WAITING (Phase 5 must complete first)
**Goal:** Remove global toggle from header (previous implementation that's no longer needed)

**Tasks:**
- [ ] Remove `autoMultiplyByContainer` state from component
- [ ] Remove toggle UI from header
- [ ] Revert header to original layout
- [ ] Clean up any references to global toggle

**Implementation Details:**

**Location:** `/components/accounting/ChargeCategories.tsx` (lines 49, 227-238)

**Remove State (line 49):**
```typescript
// REMOVE THIS LINE:
const [autoMultiplyByContainer, setAutoMultiplyByContainer] = useState(true);
```

**Revert Header (lines 227-238):**
```tsx
// REMOVE the toggle UI section:
{/* NEW: Auto-multiply toggle */}
<label className="flex items-center gap-2 cursor-pointer select-none">
  {/* ... REMOVE ALL THIS ... */}
</label>

// KEEP only:
<div className="flex items-center gap-3">  {/* Changed from gap-6 back to gap-3 */}
  {/* Existing: Set default currency */}
  <Select value={mainCurrency} onValueChange={handleMainCurrencyChange}>
    {/* ... */}
  </Select>

  {/* Existing: Add Category button */}
  <Select>
    {/* ... */}
  </Select>
</div>
```

**Files to modify:**
- `/components/accounting/ChargeCategories.tsx` (lines 49, 227-238)

**Success Criteria:**
- ✅ Global toggle removed from header
- ✅ autoMultiplyByContainer state removed
- ✅ Header reverted to original layout
- ✅ No references to global toggle remain
- ✅ Component compiles without errors

---

### Phase 7: Testing & Verification
**Status:** ⏸️ WAITING (Phase 6 must complete first)
**Goal:** Ensure per-line-item toggle works correctly in all scenarios

**Test Cases:**

**Scenario 1: Auto-Multiply ON (Default)**
- [ ] New line item has checkbox checked by default ✅
- [ ] "Per" = "40'HC" AND autoMultiply = ON → Amount = unitPrice × containerCount ✅
- [ ] "Per" = "BL" → Checkbox grayed out, Amount = unitPrice ✅
- [ ] {containerCount}X40'HC column is READ-ONLY ✅
- [ ] Category totals calculate correctly ✅
- [ ] Grand total calculates correctly ✅

**Scenario 2: Auto-Multiply OFF (Manual Override)**
- [ ] Uncheck auto-multiply → manualAmount pre-fills with unitPrice ✅
- [ ] {containerCount}X40'HC column becomes EDITABLE input ✅
- [ ] Type custom amount → Voucher Amount updates ✅
- [ ] Category total updates with manual amount ✅
- [ ] Grand total updates correctly ✅

**Scenario 3: Toggle Between ON/OFF**
- [ ] Check → Uncheck → {containerCount}X40'HC switches to editable ✅
- [ ] Uncheck → Check → {containerCount}X40'HC switches to read-only ✅
- [ ] Calculations update immediately ✅
- [ ] No data loss when toggling ✅

**Scenario 4: Per = "BL" Behavior**
- [ ] Checkbox is disabled/grayed when "Per" = "BL" ✅
- [ ] Cannot check/uncheck when "Per" = "BL" ✅
- [ ] Amount always equals unitPrice when "Per" = "BL" ✅
- [ ] Switching "Per" from "40" to "BL" grays out checkbox ✅
- [ ] Switching "Per" from "BL" to "40" enables checkbox ✅

**Scenario 5: Multiple Line Items**
- [ ] Each line item has independent toggle state ✅
- [ ] Line 1 ON, Line 2 OFF → Totals calculate correctly ✅
- [ ] Changing one line doesn't affect others ✅
- [ ] Adding new line item doesn't reset existing toggles ✅

**Scenario 6: Edge Cases**
- [ ] Container count = 0 → Calculations handle correctly ✅
- [ ] Unit price = 0 → Manual amount can be set ✅
- [ ] Manual amount = 0 → Displays as "0.00" ✅
- [ ] Manual amount = negative → Validation/handling ✅
- [ ] Deleting line item → No errors ✅

**Scenario 7: Data Sent to Parent**
- [ ] onChargesChange sends correct amounts (auto or manual) ✅
- [ ] Parent component receives per-item toggle state ✅
- [ ] Expense submission includes correct calculated amounts ✅

**Success Criteria:**
- ✅ All test cases pass
- ✅ No calculation errors
- ✅ No UI glitches or layout issues
- ✅ Intuitive user experience
- ✅ Per-line-item control works as expected

---

## 📊 Current Progress

**Overall:** 5/7 Phases Complete (71%) - **CORE IMPLEMENTATION COMPLETE!**

| Phase | Status | Progress |
|-------|--------|----------|
| 0. Blueprint Creation & Revert | ✅ COMPLETED | 100% |
| 1. Update Data Structure | ✅ COMPLETED | 100% |
| 2. Update Table Layout | ✅ COMPLETED | 100% |
| 3. Add Checkbox Column | ✅ COMPLETED | 100% |
| 4. Conditional Editability | ✅ COMPLETED | 100% |
| 5. Update Calculation Logic | ✅ COMPLETED | 100% |
| 6. Revert Global Toggle | ✅ N/A (Already completed in Phase 0) | 100% |
| 7. Testing & Verification | ⏸️ USER TESTING REQUIRED | 0% |

---

## 🔧 Technical Notes

### LineItem Data Structure:

**Before:**
```typescript
interface LineItem {
  id: string;
  particulars: string;
  unitPrice: number;
  per: "40" | "BL";
  currency: string;
  voucherNo: string;
}
```

**After:**
```typescript
interface LineItem {
  id: string;
  particulars: string;
  unitPrice: number;
  per: "40" | "BL";
  autoMultiply: boolean;     // NEW: Default true
  manualAmount: number;      // NEW: Default 0, pre-fills with unitPrice when autoMultiply OFF
  currency: string;
  voucherNo: string;
}
```

### Calculation Flow:

**When autoMultiply = true:**
```
unitPrice → × containerCount → Voucher Amount
         (if "Per" = "40'HC")
```

**When autoMultiply = false:**
```
manualAmount → Voucher Amount
(user-entered in {containerCount}X40'HC column)
```

### UI States:

| Per  | autoMultiply | Checkbox | {containerCount}X40'HC Column | Voucher Amount |
|------|--------------|----------|-------------------------------|----------------|
| 40   | true         | ☑ Enabled | READ-ONLY (calculated)       | unitPrice × containerCount |
| 40   | false        | ☐ Enabled | EDITABLE (input)             | manualAmount |
| BL   | true         | ☑ Disabled/Gray | READ-ONLY (-)           | unitPrice |
| BL   | false        | ☐ Disabled/Gray | READ-ONLY (-)           | unitPrice |

### Column Layout:

**Before (8 columns):**
```
Particulars | Unit Price | Per | Currency | {containerCount}X40'HC | Voucher No | Voucher Amount | Delete
```

**After (9 columns):**
```
Particulars | Unit Price | Per | Auto | Currency | {containerCount}X40'HC | Voucher No | Voucher Amount | Delete
```

---

## 📝 Change Log

### 2025-01-21

**Session 2: Requirement Clarification & New Blueprint**
- Identified previous implementation was incorrect (global toggle vs per-line toggle)
- Created new blueprint for per-line-item toggle with manual override
- Clarified requirements:
  - Auto-multiply ON by default
  - Manual amount pre-fills with unit price (not calculated value)
  - Checkbox grayed out when "Per" = "BL"
  - Column header: "Auto"
- Planned 7-phase implementation
- Ready to begin Phase 0 (revert) and Phase 1 (data structure)

---

## 🚀 Next Steps

**Phase 0 - Complete Blueprint & Revert Previous Implementation**
**Phase 1 - Update Data Structure & Interface**

1. Revert global toggle from header
2. Add `autoMultiply` and `manualAmount` to LineItem interface
3. Update `addItem()` to initialize new fields
4. Proceed with remaining phases sequentially