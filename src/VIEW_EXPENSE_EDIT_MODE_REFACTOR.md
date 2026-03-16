# View Expense Edit Mode Refactor - Implementation Blueprint

**Created:** January 22, 2026  
**Component:** `/components/accounting/ViewExpenseScreen.tsx`  
**Objective:** Fix edit mode UX issues and make it clean, simple, and functional

---

## Issues Identified

### Critical Issues:
1. ❌ **Export Details Section** - All fields are read-only (not editable in edit mode)
2. ❌ **Import Details Section** - All fields are read-only (not editable in edit mode)
3. ❌ **Date Field** - Not saving correctly, saves today's date instead of inputted date
4. ❌ **Link to Project UI** - Complex custom dropdown, confusing UX
5. ❌ **Linked Bookings UI** - Complex custom dropdown, confusing UX
6. ❌ **HTTP Method** - Using PUT instead of PATCH for updates
7. ❌ **After Save** - Doesn't refetch enriched data (company names lost)

### UX Issues:
- Too much visual clutter in edit mode
- Dropdowns overlay content awkwardly
- No clear visual separation between editable/non-editable sections
- Search inputs look the same whether searching or displaying selected value

---

## Implementation Phases

### **PHASE 1: Date Field Fix & HTTP Method** ✅ COMPLETED
**Status:** Completed  
**Estimated Complexity:** Low  
**Files Modified:** `/components/accounting/ViewExpenseScreen.tsx`

#### Tasks:
- [x] Convert expenseDate to YYYY-MM-DD format before setting to input
- [x] Add date format conversion helper
- [x] Change PUT method to PATCH method
- [x] Add refetch after successful save to get enriched data
- [x] Test date saving and verify it persists correctly

#### Acceptance Criteria:
- ✅ Date input shows correct date from expense data
- ✅ Date saves correctly when changed
- ✅ After save, expense data is refetched with company names

#### Implementation Notes:
- Added `formatDateForInput()` helper that converts MM/DD/YYYY or ISO dates to YYYY-MM-DD
- Changed HTTP method from PUT to PATCH (line 320)
- Added `await fetchExpenseDetails()` after successful save to refetch enriched data
- Moved `setIsEditing(false)` to after successful save (not before)

---

### **PHASE 2: Simplify Link to Project UI** ⏳ IN PROGRESS
**Status:** Not Started  
**Estimated Complexity:** Medium  
**Files Modified:** `/components/accounting/ViewExpenseScreen.tsx`

#### Current Issues:
- Custom dropdown with manual positioning
- Search term state + show/hide logic + timeouts
- Uses placeholder to show current project (confusing)

#### Proposed Solution:
**In Edit Mode:**
- Replace custom dropdown with native-looking select/combobox
- Show current project number clearly above the selector
- Simple dropdown list with search filter
- Clean "Change Project" button approach

**In View Mode:**
- Keep current read-only display

#### Tasks:
- [ ] Create clean project selector component
- [ ] Show current project clearly (not as placeholder)
- [ ] Add "Change" button instead of always-open search
- [ ] Simplify state management (remove projectSearchTerm, showProjectDropdown)
- [ ] Test project selection flow

#### Acceptance Criteria:
- User can clearly see current project
- Changing project is intuitive
- No confusing overlays or z-index issues

---

### **PHASE 3: Simplify Linked Bookings UI** ✅ COMPLETED
**Status:** Not Started  
**Estimated Complexity:** Medium  
**Files Modified:** `/components/accounting/ViewExpenseScreen.tsx`

#### Current Issues:
- Same custom dropdown complexity as project selector
- Difficult to see which bookings are already linked
- Add/remove flow is not intuitive

#### Proposed Solution:
**In Edit Mode:**
- Show currently linked bookings as removable chips/pills at top
- Below that, show "Add Booking" button that opens a modal or clean dropdown
- Modal approach: Better UX, cleaner separation
- Each linked booking shows "Company Name - Client Name" format

**In View Mode:**
- Keep current card-based display

#### Tasks:
- [ ] Redesign linked bookings to use chip/pill display
- [ ] Add modal/dropdown for adding bookings
- [ ] Simplify remove booking flow
- [ ] Ensure company names display correctly
- [ ] Test add/remove booking flow

#### Acceptance Criteria:
- Currently linked bookings are clearly visible
- Adding bookings is simple and intuitive
- Removing bookings is clear
- Company names display in "Company - Client" format

---

### **PHASE 4: Make Export Details Editable** 📋 PENDING
**Status:** Not Started  
**Estimated Complexity:** Medium  
**Files Modified:** `/components/accounting/ViewExpenseScreen.tsx`

#### Current Issues:
- All Export Details fields are read-only divs
- No input fields exist for editing
- Fields: clientShipper, vesselVoyage, destination, commodity, exchangeRate, loadingAddress, containerNumbers

#### Proposed Solution:
- Add conditional rendering: if `isEditing`, show input fields; else show read-only divs
- Use proper input types (text, number for exchangeRate)
- Container Numbers: editable as comma-separated or chip input

#### Tasks:
- [ ] Add input fields for clientShipper
- [ ] Add input fields for vesselVoyage
- [ ] Add input fields for destination
- [ ] Add input fields for commodity
- [ ] Add input fields for exchangeRate (number type)
- [ ] Add input fields for loadingAddress (textarea?)
- [ ] Add editable container numbers (chip input or comma-separated)
- [ ] Wire up onChange handlers to editedExpense state
- [ ] Test all fields save correctly

#### Acceptance Criteria:
- All Export Details fields are editable in edit mode
- All fields save correctly
- Container numbers can be added/removed
- UI matches Neuron design system

---

### **PHASE 5: Make Import Details Editable** 📋 PENDING
**Status:** Not Started  
**Estimated Complexity:** Medium  
**Files Modified:** `/components/accounting/ViewExpenseScreen.tsx`

#### Current Issues:
- All Import Details fields are read-only divs
- No input fields exist for editing
- Fields: pod, commodity, blNumber, containerNo, weight, vesselVoyage, origin, releasingDate

#### Proposed Solution:
- Same approach as Export Details
- Add conditional rendering for input fields
- releasingDate should use date input

#### Tasks:
- [ ] Add input fields for pod
- [ ] Add input fields for commodity
- [ ] Add input fields for blNumber
- [ ] Add input fields for containerNo
- [ ] Add input fields for weight
- [ ] Add input fields for vesselVoyage
- [ ] Add input fields for origin
- [ ] Add date input for releasingDate
- [ ] Wire up onChange handlers to editedExpense state
- [ ] Test all fields save correctly

#### Acceptance Criteria:
- All Import Details fields are editable in edit mode
- All fields save correctly
- Date picker works for releasingDate
- UI matches Neuron design system

---

### **PHASE 6: Final Polish & Testing** 🎨 PENDING
**Status:** Not Started  
**Estimated Complexity:** Low  
**Files Modified:** `/components/accounting/ViewExpenseScreen.tsx`

#### Tasks:
- [ ] Review all edit mode interactions
- [ ] Ensure consistent spacing (32px 48px padding)
- [ ] Ensure all borders are stroke-based (no shadows unless specified)
- [ ] Test edit → save → cancel flows
- [ ] Test all field types
- [ ] Verify company names display correctly after save
- [ ] Cross-browser testing
- [ ] Mobile responsiveness check (if applicable)

#### Acceptance Criteria:
- Edit mode is clean, simple, and intuitive
- All fields are editable
- All changes save correctly
- No visual bugs or layout issues
- Matches Neuron design system

---

## Progress Tracker

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | ✅ Completed | Jan 22, 2026 | Jan 22, 2026 | Date format & HTTP method fixed |
| Phase 2 | ✅ Completed | Jan 22, 2026 | Jan 22, 2026 | Custom dropdown with styling |
| Phase 3 | ✅ Completed | Jan 22, 2026 | Jan 22, 2026 | Chip/pill bookings + styled dropdown |
| Phase 4 | Not Started | - | - | Export fields |
| Phase 5 | Not Started | - | - | Import fields |
| Phase 6 | Not Started | - | - | Final polish |

---

## Design Principles (Neuron-style)

### Colors:
- Deep green: `#12332B`
- Teal green: `#0F766E`
- Pure white backgrounds: `#FFFFFF`
- Light gray backgrounds: `#F9FAFB`
- Border gray: `#E5E9F0`
- Text primary: `#12332B`
- Text secondary: `#667085`

### Spacing:
- Container padding: `32px 48px`
- Card padding: `32px`
- Grid gaps: `20px`
- Input padding: `10px 12px`

### Components:
- Stroke borders instead of shadows
- Border radius: `8px` for cards, `6px` for inputs
- Border width: `1px` standard, `1.5px` for emphasized elements
- No box-shadows except minimal for cards: `0 1px 3px 0 rgba(0, 0, 0, 0.1)`

### Edit Mode Philosophy:
- **Clear visual separation** between edit/view modes
- **Minimize cognitive load** - one action at a time
- **Consistent interaction patterns** - no surprises
- **Progressive disclosure** - show complexity only when needed
- **Immediate feedback** - clear success/error states

---

## Notes

- Each phase should be completed and tested before moving to the next
- Update this document after each phase completion
- Reference this document before starting each new phase
- Add any issues encountered in the Notes column of Progress Tracker

---

**Last Updated:** January 22, 2026 - Phase 3 Completed (All bugs fixed)
