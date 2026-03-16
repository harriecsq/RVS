# Shipment Details & Billing Particulars - Edit Mode Implementation Plan

**Date:** January 23, 2026  
**Status:** 🟡 IN PROGRESS  
**Goal:** Make Shipment Details and Billing Particulars fully editable

---

## 📋 **Overview**

Make these sections editable in ViewBillingScreen:
1. **Shipment Details** - 8 fields (vessel, BL, destination, volume, commodity, contract, exchange rate, container numbers)
2. **Billing Particulars** - Editable table with add/remove rows

---

## ✅ **Current State**

### Already Implemented:
- ✅ State variables for all shipment fields (lines 122-130)
- ✅ State initialization in useEffect (lines 216-224)
- ✅ State included in save payload (lines 463-470)
- ✅ View mode display (lines 1828-1940)

### Still Needed:
- ❌ Edit mode inputs for shipment fields
- ❌ Edit mode for billing particulars table
- ❌ Add/remove rows in particulars
- ❌ Auto-calculation of totals

---

## 🎯 **Phase 3: Shipment Details Edit Mode**

### Fields to Make Editable:
1. **Vessel/Voyage** - Text input
2. **BL Number** - Text input
3. **Destination** - Text input
4. **Volume** - Text input
5. **Commodity** - Text input
6. **Contract Number** - Text input
7. **Exchange Rate** - Number input
8. **Container Numbers** - Multi-input with add/remove

### Implementation Pattern:
```typescript
{isEditing ? (
  <input
    type="text"
    value={editedVessel}
    onChange={(e) => setEditedVessel(e.target.value)}
    style={{...inputStyles}}
  />
) : (
  <div>{billing.vessel}</div>
)}
```

### Container Numbers Pattern:
```typescript
{isEditing ? (
  <>
    {editedContainerNumbers.map((cn, index) => (
      <div key={index}>
        <input value={cn} onChange={...} />
        <button onClick={() => removeContainer(index)}>X</button>
      </div>
    ))}
    <button onClick={addContainer}>+ Add Container</button>
  </>
) : (
  <div>{billing.containerNumbers.map(...)}</div>
)}
```

---

## 🎯 **Phase 4: Billing Particulars Edit Mode**

### Current Structure:
```typescript
interface BillingParticular {
  id: string;
  particulars: string;  // Description
  volumeType: "40" | "BL";
  volumeQty: number;
  unitCost: number;
  total: number;  // volumeQty * unitCost
  exchangeRate: number | null;
  amount: number;  // final PHP amount
}
```

### Features Needed:
1. **Inline Editing** - Each row becomes editable
2. **Add Row** - Button to add new particular
3. **Remove Row** - X button on each row
4. **Auto-Calculation**:
   - `total = volumeQty * unitCost`
   - `amount = exchangeRate ? total * exchangeRate : total`

### Table Structure (Edit Mode):
| Particulars | Volume | Qty | Unit Cost | Total | Exch. Rate | Amount | Actions |
|------------|--------|-----|-----------|-------|------------|--------|---------|
| `<input>` | `<select>` | `<input>` | `<input>` | Calculated | `<input>` | Calculated | `<X>` |

---

## 🔧 **Implementation Steps**

### Step 1: Shipment Details - Simple Fields (30 min)
1. Wrap each field with `isEditing ?` condition
2. Add text inputs with Neuron styling
3. Wire up to existing state variables
4. Test each field independently

### Step 2: Shipment Details - Container Numbers (20 min)
1. Create add/remove container functions
2. Input for new container
3. X button on each container pill
4. Test add/remove cycles

### Step 3: Billing Particulars - Table Structure (40 min)
1. Check if table header needs Actions column
2. Convert each cell to conditional input/display
3. Wire up to `editedParticulars` state
4. Test inline editing

### Step 4: Billing Particulars - Add/Remove (30 min)
1. Create `addParticular()` function
2. Create `removeParticular(index)` function
3. Add "+ Add Line Item" button
4. X button on each row
5. Test add/remove cycles

### Step 5: Billing Particulars - Auto-Calculation (20 min)
1. Calculate `total` when qty or unitCost changes
2. Calculate `amount` when total or exchangeRate changes
3. Update total billing amount display
4. Test calculations

### Step 6: Testing & Polish (20 min)
1. Test all fields save correctly
2. Test validation
3. Test cancel reverts changes
4. Polish styling/UX

**Total Estimated Time:** ~2.5 hours

---

## 💡 **Design Decisions**

### Shipment Details:
- **Always visible in edit mode** (show empty inputs if no data)
- **Optional fields** - Can be left blank
- **No validation** - All fields optional except container numbers format

### Billing Particulars:
- **Minimum 1 row** - Can't delete if only one particular
- **Auto-calculation** - Total and Amount calculated automatically
- **Validation** - Description required, numeric fields must be > 0

### Container Numbers:
- **Multi-input** - Can have multiple containers
- **Format validation** - Alphanumeric only
- **Duplicate check** - Prevent same container twice

---

## 🎨 **Neuron Styling Standards**

### Input Fields:
```typescript
style={{
  width: "100%",
  padding: "12px 16px",
  fontSize: "14px",
  border: "1.5px solid #E5E9F0",
  borderRadius: "8px",
  color: "#12332B",
  backgroundColor: "white",
  outline: "none",
  transition: "border-color 0.2s ease"
}}
onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
```

### Buttons:
- **Add buttons:** Teal background (#0F766E), white text
- **Remove buttons:** Red/transparent with X icon
- **Hover effects:** Smooth transitions

---

## 📝 **Code Locations**

| Item | File | Line | Status |
|------|------|------|--------|
| Shipment Details Section | ViewBillingScreen.tsx | 1828-1940 | View only |
| Billing Particulars Section | ViewBillingScreen.tsx | ~1950-2100 | View only |
| State Variables | ViewBillingScreen.tsx | 122-130 | ✅ Done |
| State Initialization | ViewBillingScreen.tsx | 216-224 | ✅ Done |
| Save Payload | ViewBillingScreen.tsx | 463-470 | ✅ Done |

---

## ⚠️ **Important Considerations**

### Billing Particulars State Management:
- Array of objects, not primitives
- Need deep copy when updating
- ID generation for new rows

### Auto-Calculation:
- Recalculate on every change
- Update parent state immediately
- Consider debouncing for performance

### Validation:
- Description required per row
- Numeric validation (>= 0)
- At least one particular required

---

## 🧪 **Testing Checklist**

### Shipment Details:
- [ ] Edit each field independently
- [ ] Save with all fields filled
- [ ] Save with some fields empty
- [ ] Add container numbers
- [ ] Remove container numbers
- [ ] Cancel reverts changes

### Billing Particulars:
- [ ] Edit description
- [ ] Edit quantity - total updates
- [ ] Edit unit cost - total updates
- [ ] Edit exchange rate - amount updates
- [ ] Add new row
- [ ] Remove row
- [ ] Can't remove last row
- [ ] Total billing amount updates
- [ ] Save persists changes
- [ ] Cancel reverts changes

---

**Status:** Ready to implement  
**Next Step:** Start with Shipment Details edit mode  
**Estimated Completion:** ~2.5 hours
