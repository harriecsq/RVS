# Autofill Visual Indicators Implementation Blueprint

## 🎯 OBJECTIVE
Apply the EXACT autofill visual indicator design (light mint green background + teal border) from CreateForwardingBookingPanel to ALL autofilled fields across the ENTIRE Neuron OS system.

---

## 🎨 REFERENCE DESIGN (from CreateForwardingBookingPanel.tsx)

### Exact Styling:
```javascript
const getInputStyle = (fieldName: string) => {
  if (autofilledFields.has(fieldName)) {
    return {
      ...inputStyle,
      backgroundColor: "#E8F5F3", // Light mint green background for autofilled
      borderColor: "#0F766E", // Neuron teal green border
    };
  }
  return inputStyle;
};
```

### Implementation Pattern:
1. **State Variable**: `const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());`
2. **Helper Function**: `getInputStyle(fieldName: string)` that checks if field is in the Set
3. **Usage**: Apply to input elements: `style={getInputStyle('field_name')}`
4. **Tracking**: When autofilling, add field name to Set: `fieldsAutofilled.add('field_name')`

---

## 📋 COMPREHENSIVE FILE INVENTORY

### ✅ **PHASE 1: BOOKING CREATION PANELS** (ALREADY PARTIALLY DONE)

#### 1.1 CreateForwardingBookingPanel.tsx
**Status:** ✅ ALREADY IMPLEMENTED (Reference implementation)
- Location: `/components/operations/forwarding/CreateForwardingBookingPanel.tsx`
- Has: `autofilledFields` Set, `getInputStyle` helper
- Autofill Sources:
  - prefillData (from Project Details screen)
  - handleProjectSelect (dropdown selection)
- Fields with indicators: commodity, volume_containers, shipping_line, vessel_voyage, destination, loading_address, loading_schedule, trucker

#### 1.2 CreateBrokerageBookingPanel.tsx
**Status:** ⚠️ PARTIALLY IMPLEMENTED (autofill logic added, visual indicators MISSING)
- Location: `/components/operations/CreateBrokerageBookingPanel.tsx`
- Has: Updated handleProjectSelect with comprehensive autofill
- Missing: 
  - `autofilledFields` Set state variable
  - `getInputStyle` helper function
  - Visual indicators on input fields
- Autofill Sources:
  - prefillData (from Project Details screen)
  - handleProjectSelect (dropdown selection)
- Fields needing indicators: client, consignee, commodity, volume, vesselVoyage, shippingLine, origin, pod, trucker

---

### ✅ **PHASE 2: CreateBillingModal.tsx**
**Goal:** Add visual indicators for prefilled project/booking selectors + IMPLEMENT Smart Field Transformation (Type C)

**Steps:**
- [ ] 2.1: Add `autofilledSelectors` state variable
- [ ] 2.2: Add `autofilledFields` state variable (for Type C fields)
- [ ] 2.3: Add `getSelectorContainerStyle` helper function
- [ ] 2.4: Update prefillProjectId useEffect to set autofilled flag
- [ ] 2.5: Update prefillProjectNumber useEffect to set autofilled flag
- [ ] 2.6: Update prefillBookingId useEffect to set autofilled flag
- [ ] 2.7: Wrap ProjectSelector with styled container when prefilled
- [ ] 2.8: Style booking checkboxes/cards when prefilled
- [ ] 2.9: Style display-only project number field when prefilled
- [ ] 2.10: **TYPE C - SMART TRANSFORMATION:** Apply green indicators to text-editable dropdowns
  - [ ] Client Name field (already has dropdown, needs green indicator when autofilled)
  - [ ] Company Name field (already has dropdown, needs green indicator when autofilled)
  - [ ] Vessel/Voyage field (already has dropdown, needs green indicator when autofilled)
- [ ] 2.11: Implement autofill logic: when bookings selected, detect single vs multiple unique values
- [ ] 2.12: Add fields to `autofilledFields` Set when single value detected

**Status:** 🔴 NOT STARTED

---

### ✅ **PHASE 3: EXPENSE CREATION SCREENS**

#### 3.1 CreateExpenseScreen.tsx
**Status:** 🔴 NOT IMPLEMENTED
- Location: `/components/accounting/CreateExpenseScreen.tsx`
- Autofill Sources:
  - `prefillProjectNumber` → finds and selects project by number (lines 162-174)
  - `prefillBookingNumber` → finds and selects booking by number (lines 178-189)
- Current Implementation:
  - Sets `formData.projectId` and `formData.documentTemplate` when project prefilled
  - Sets `selectedBookingIds` array when booking prefilled
- Fields needing indicators:
  - Project selector (when prefilled)
  - Document Template field (when prefilled)
  - Booking checkboxes (when prefilled)
- Special Note: Similar pattern to billing - uses selectors vs direct input fields

---

### ✅ **PHASE 4: CreateVoucherModal.tsx**
**Goal:** Add visual indicators for autofilled voucher form fields

**Steps:**
- [✅] 4.1: Investigation completed - found extensive autofill logic
- [ ] 4.2: Add `autofilledFields` state variable
- [ ] 4.3: Add `getInputStyle` and `getComboInputStyle` helper functions
- [ ] 4.4: Update fetchExpenseLineItems to track autofilled fields (lines 233-275)
- [ ] 4.5: Update expense selector autofill logic to track when prefilled
- [ ] 4.6: Apply styling to autofilled fields:
  - [ ] Expense selector dropdown (when initialExpenseId provided)
  - [ ] Payee ComboInput (when autofilled from expense.vendor)
  - [ ] Shipper ComboInput (when autofilled from expense.clientShipper)
  - [ ] Vessel/Voy ComboInput (when autofilled from expense.vesselVoyage)
  - [ ] Destination ComboInput (when autofilled from expense.destination/pod)
  - [ ] BL Number ComboInput (when autofilled from expense.blNumber)
  - [ ] Container Number inputs (when autofilled from expense data)
  - [ ] Volume field (when auto-calculated)
- [ ] 4.7: Handle ComboInput special case (may need wrapper styling)
- [ ] 4.8: Test with prefilled expense flow

**Status:** 🔴 NOT STARTED

---

### ✅ **PHASE 5: ADDITIONAL COMPONENTS TO CHECK**

#### 5.1 ProjectExpensesTab.tsx
**Status:** ✅ WRAPPER ONLY
- Location: `/components/bd/ProjectExpensesTab.tsx`
- Implementation: Passes `prefillProjectNumber` to CreateExpenseModal
- Action: No changes needed (handled by Phase 3)

#### 5.2 CreateExpenseModal.tsx
**Status:** ✅ WRAPPER ONLY
- Location: `/components/accounting/CreateExpenseModal.tsx`
- Implementation: This is just a wrapper that renders CreateExpenseScreen
- Action: No changes needed (handled by Phase 3)

---

## 📐 IMPLEMENTATION APPROACH BY TYPE

### **Type A: Direct Input Fields (like Forwarding/Brokerage Booking Panels)**
Pattern to use:
```javascript
// 1. Add state
const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());

// 2. Add helper function
const getInputStyle = (fieldName: string) => {
  if (autofilledFields.has(fieldName)) {
    return {
      ...inputStyle, // or spread base styles
      backgroundColor: "#E8F5F3",
      borderColor: "#0F766E",
    };
  }
  return inputStyle;
};

// 3. Update autofill logic
const handlePrefill = () => {
  const fieldsAutofilled = new Set<string>();
  
  if (prefillData?.commodity) {
    setCommodity(prefillData.commodity);
    fieldsAutofilled.add('commodity');
  }
  
  setAutofilledFields(fieldsAutofilled);
};

// 4. Apply to inputs
<input
  value={commodity}
  onChange={...}
  style={getInputStyle('commodity')}
/>
```

### **Type B: Dropdown/Selector Fields (like Billing/Expense Screens)**
Pattern to use:
```javascript
// 1. Add state
const [autofilledSelectors, setAutofilledSelectors] = useState<Set<string>>(new Set());

// 2. Add helper for selector containers
const getSelectorStyle = (selectorName: string) => {
  if (autofilledSelectors.has(selectorName)) {
    return {
      backgroundColor: "#E8F5F3",
      border: "1px solid #0F766E",
      borderRadius: "8px",
      padding: "12px",
    };
  }
  return {};
};

// 3. Track autofilled selectors
useEffect(() => {
  if (prefillProjectId) {
    setSelectedProjectId(prefillProjectId);
    setAutofilledSelectors(new Set(['project']));
  }
}, [prefillProjectId]);

// 4. Apply to selector containers
<div style={getSelectorStyle('project')}>
  <ProjectSelector ... />
</div>
```

### **Type C: Smart Field Transformation (Multiple Bookings → Text-Editable Dropdown)**

**🎯 Use Case:** When multiple bookings are selected in Billing/Expense creation, and those bookings contain **different values** for the same field (e.g., vessel, destination, client name).

**Behavior:**
- **Single Value** → Display as regular text input with green autofill indicator
- **Multiple Values** → Transform into text-editable dropdown (ChevronDown icon on right)

**Reference Implementation:** Already exists in CreateBillingModal.tsx and CreateExpenseScreen.tsx
- Client Name dropdown (lines ~1260-1340)
- Company Name dropdown (lines ~1370-1430)
- Vessel/Voyage dropdown (lines ~1475-1540)

**Pattern Structure (from CreateBillingModal.tsx):**
```javascript
// State for dropdown visibility
const [showClientNameDropdown, setShowClientNameDropdown] = useState(false);

// Compute unique values from selected bookings
const uniqueClientNames = useMemo(() => {
  if (selectedBookingIds.size === 0) return [];
  const names = new Set<string>();
  bookings
    .filter(b => selectedBookingIds.has(b.id))
    .forEach(b => {
      if (b.clientName) names.add(b.clientName);
    });
  return Array.from(names);
}, [bookings, selectedBookingIds]);

// Container with green indicator when autofilled
<div
  style={{
    display: "flex",
    alignItems: "center",
    border: "1px solid #E5E9F0",
    borderRadius: "8px",
    backgroundColor: autofilledFields.has('clientName') ? "#E8F5F3" : "white",
    borderColor: autofilledFields.has('clientName') ? "#0F766E" : "#E5E9F0",
    transition: "all 0.2s",
  }}
>
  {/* Text-editable input */}
  <input
    type="text"
    value={clientName}
    onChange={(e) => setClientName(e.target.value)}
    placeholder="Select or enter client name"
    style={{
      flex: 1,
      padding: "12px 16px",
      border: "none",
      outline: "none",
      fontSize: "14px",
      color: "#12332B",
      backgroundColor: "transparent",
      borderRadius: "8px",
    }}
  />
  
  {/* ChevronDown icon to toggle dropdown */}
  <ChevronDown
    size={16}
    onClick={() => setShowClientNameDropdown(!showClientNameDropdown)}
    style={{
      color: "#667085",
      transform: showClientNameDropdown ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s",
      cursor: "pointer",
      marginRight: "12px",
      flexShrink: 0,
    }}
  />
</div>

{/* Dropdown menu */}
{showClientNameDropdown && (
  <div
    style={{
      marginTop: "8px",
      border: "1px solid #E5E9F0",
      borderRadius: "8px",
      backgroundColor: "white",
      overflow: "hidden",
      maxHeight: "200px",
      overflowY: "auto",
    }}
  >
    {uniqueClientNames.length === 0 ? (
      <div style={{ padding: "16px", textAlign: "center", color: "#667085", fontSize: "13px" }}>
        Select bookings first
      </div>
    ) : (
      uniqueClientNames.map((name, index) => (
        <div
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            setClientName(name);
            setShowClientNameDropdown(false);
          }}
          style={{
            padding: "12px 16px",
            cursor: "pointer",
            borderBottom: index < uniqueClientNames.length - 1 ? "1px solid #F9FAFB" : "none",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#F9FAFB";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
          }}
        >
          <div style={{ fontSize: "14px", color: "#12332B" }}>
            {name}
          </div>
        </div>
      ))
    )}
  </div>
)}
```

**🔧 Implementation Steps for Smart Transformation:**
1. **Detect multi-value scenario**: When multiple bookings selected, compute unique values
2. **Single value** (length === 1): Autofill the field, add to `autofilledFields`, show as regular input with green indicator
3. **Multiple values** (length > 1): Show text-editable dropdown with ChevronDown, apply green indicator to container, allow user to pick or type custom value
4. **No values** (length === 0): Show empty field, no autofill indicator

**📍 Where This Applies:**
- **CreateBillingModal.tsx**: Client Name, Company Name, Vessel/Voyage (already implemented)
- **CreateExpenseScreen.tsx**: Client/Shipper, Vessel/Voyage, Destination, POD (needs implementation if autofill added)
- Future: Any screen where multiple items with varying metadata are selected

---

## 📝 DETAILED IMPLEMENTATION PHASES

### ✅ PHASE 1: CreateBrokerageBookingPanel.tsx
**Goal:** Add visual indicators to match CreateForwardingBookingPanel

**Steps:**
- [ ] 1.1: Add `autofilledFields` state variable
- [ ] 1.2: Add `getInputStyle` helper function (matching exact design)
- [ ] 1.3: Update prefillData useEffect to track autofilled fields
- [ ] 1.4: Update handleProjectSelect to track autofilled fields
- [ ] 1.5: Apply getInputStyle to all input fields that can be autofilled:
  - [ ] Commodity
  - [ ] Volume
  - [ ] Vessel/Voyage
  - [ ] Shipping Line
  - [ ] Consignee (if using input, not selector)
  - [ ] Origin
  - [ ] POD
  - [ ] Trucker

**Status:** 🔴 NOT STARTED

---

### ✅ PHASE 2: CreateBillingModal.tsx
**Goal:** Add visual indicators for prefilled project/booking selectors + IMPLEMENT Smart Field Transformation (Type C)

**Steps:**
- [ ] 2.1: Add `autofilledSelectors` state variable
- [ ] 2.2: Add `autofilledFields` state variable (for Type C fields)
- [ ] 2.3: Add `getSelectorContainerStyle` helper function
- [ ] 2.4: Update prefillProjectId useEffect to set autofilled flag
- [ ] 2.5: Update prefillProjectNumber useEffect to set autofilled flag
- [ ] 2.6: Update prefillBookingId useEffect to set autofilled flag
- [ ] 2.7: Wrap ProjectSelector with styled container when prefilled
- [ ] 2.8: Style booking checkboxes/cards when prefilled
- [ ] 2.9: Style display-only project number field when prefilled
- [ ] 2.10: **TYPE C - SMART TRANSFORMATION:** Apply green indicators to text-editable dropdowns
  - [ ] Client Name field (already has dropdown, needs green indicator when autofilled)
  - [ ] Company Name field (already has dropdown, needs green indicator when autofilled)
  - [ ] Vessel/Voyage field (already has dropdown, needs green indicator when autofilled)
- [ ] 2.11: Implement autofill logic: when bookings selected, detect single vs multiple unique values
- [ ] 2.12: Add fields to `autofilledFields` Set when single value detected

**Status:** 🔴 NOT STARTED

---

### ✅ PHASE 3: CreateExpenseScreen.tsx
**Goal:** Add visual indicators for prefilled project/booking selectors

**Steps:**
- [ ] 3.1: Add `autofilledSelectors` state variable
- [ ] 3.2: Add `getSelectorContainerStyle` helper function
- [ ] 3.3: Update prefillProjectNumber useEffect to set autofilled flag
- [ ] 3.4: Update prefillBookingNumber useEffect to set autofilled flag
- [ ] 3.5: Also track document template field (autofilled from project movement)
- [ ] 3.6: Wrap ProjectSelector with styled container when prefilled
- [ ] 3.7: Style document template dropdown when prefilled
- [ ] 3.8: Style booking checkboxes/cards when prefilled

**Status:** 🔴 NOT STARTED

---

### ✅ PHASE 4: CreateVoucherModal.tsx
**Goal:** Add visual indicators for autofilled voucher form fields

**Steps:**
- [✅] 4.1: Investigation completed - found extensive autofill logic
- [ ] 4.2: Add `autofilledFields` state variable
- [ ] 4.3: Add `getInputStyle` and `getComboInputStyle` helper functions
- [ ] 4.4: Update fetchExpenseLineItems to track autofilled fields (lines 233-275)
- [ ] 4.5: Update expense selector autofill logic to track when prefilled
- [ ] 4.6: Apply styling to autofilled fields:
  - [ ] Expense selector dropdown (when initialExpenseId provided)
  - [ ] Payee ComboInput (when autofilled from expense.vendor)
  - [ ] Shipper ComboInput (when autofilled from expense.clientShipper)
  - [ ] Vessel/Voy ComboInput (when autofilled from expense.vesselVoyage)
  - [ ] Destination ComboInput (when autofilled from expense.destination/pod)
  - [ ] BL Number ComboInput (when autofilled from expense.blNumber)
  - [ ] Container Number inputs (when autofilled from expense data)
  - [ ] Volume field (when auto-calculated)
- [ ] 4.7: Handle ComboInput special case (may need wrapper styling)
- [ ] 4.8: Test with prefilled expense flow

**Status:** 🔴 NOT STARTED

---

### ✅ PHASE 5: Testing & Validation
**Goal:** Comprehensive testing of all autofill visual indicators

**Test Scenarios:**
- [ ] 5.1: Brokerage booking - create from Bookings screen → select project → verify green indicators
- [ ] 5.2: Brokerage booking - create from Project Details → verify green indicators
- [ ] 5.3: Forwarding booking - create from Bookings screen → select project → verify green indicators
- [ ] 5.4: Forwarding booking - create from Project Details → verify green indicators
- [ ] 5.5: Billing - create from project → verify project selector has green indicator
- [ ] 5.6: Billing - create from booking → verify booking selection has green indicator
- [ ] 5.7: Expense - create from project → verify project selector has green indicator
- [ ] 5.8: Expense - create from booking → verify booking selection has green indicator
- [ ] 5.9: Verify manually entered/changed values lose green indicator
- [ ] 5.10: Verify consistency of green color (#E8F5F3) and border (#0F766E) across all components

**Status:** 🔴 NOT STARTED

---

## 🎯 SUCCESS CRITERIA

1. ✅ All autofilled fields across the entire system display light mint green background (#E8F5F3)
2. ✅ All autofilled fields have teal green border (#0F766E)
3. ✅ Visual indicators work for both:
   - Direct input fields (text, date, etc.)
   - Dropdown/selector fields (project, booking, client selectors)
4. ✅ Indicators appear when:
   - Using prefillData from parent components
   - Selecting items from dropdowns that trigger autofill
5. ✅ Consistent implementation pattern across all components
6. ✅ No regression in existing autofill functionality

---

## 📊 PROGRESS TRACKER

| Phase | Component | Status | Files Changed |
|-------|-----------|--------|---------------|
| Reference | CreateForwardingBookingPanel | ✅ Complete | 1/1 |
| 1 | CreateBrokerageBookingPanel | 🔴 Not Started | 0/1 |
| 2 | CreateBillingModal | 🔴 Not Started | 0/1 |
| 3 | CreateExpenseScreen | 🔴 Not Started | 0/1 |
| 4 | CreateVoucherModal | ✅ Investigation Complete | 0/1 |
| 5 | Testing & Validation | 🔴 Not Started | - |

**Overall Progress: Investigation Complete - Ready for implementation (Phases 1-4)**

---

## 🔄 NEXT ACTION
**READY FOR USER:** All autofill components have been analyzed and documented. Implementation blueprint is complete with detailed plans for all 4 phases + testing.

**Summary:**
- ✅ 2 Booking panels (1 done, 1 needs visual indicators)
- ✅ 1 Billing screen (needs visual indicators for selectors)
- ✅ 1 Expense screen (needs visual indicators for selectors)  
- ✅ 1 Voucher modal (needs visual indicators for ComboInputs and fields)

User should review blueprint and confirm to proceed with implementation.