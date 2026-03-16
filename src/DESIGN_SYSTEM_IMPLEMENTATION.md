# 🎨 DESIGN SYSTEM STANDARDIZATION - IMPLEMENTATION BLUEPRINT

**Reference Screen:** Expense Module (EXP-89545)  
**Objective:** Standardize all screens to match the Expense module's visual design system  
**Started:** January 23, 2026  
**Status:** 🟡 IN PROGRESS

---

## 📊 PROGRESS TRACKER

**Overall Completion:** 28% (2/7 phases)

| Phase | Status | Completion | Files Modified |
|-------|--------|------------|----------------|
| Phase 1: Design Tokens | 🟢 COMPLETE | 100% | 1/1 |
| Phase 2: Core Components | 🟢 COMPLETE | 100% | 7/7 |
| Phase 3: Detail Screens | 🟡 IN PROGRESS | 11% | 1/9 |
| Phase 4: Tab Components | 🔴 NOT STARTED | 0% | 0/5 |
| Phase 5: List Screens | 🔴 NOT STARTED | 0% | 0/8 |
| Phase 6: Forms & Modals | 🔴 NOT STARTED | 0% | 0/10 |
| Phase 7: Polish & QA | 🔴 NOT STARTED | 0% | - |

**Legend:** 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## ⚠️ PHASE 3 STATUS: IN PROGRESS

**Note:** Phase 3 is a large multi-session phase. Due to the size and complexity of detail screens (1000+ lines each), this phase will be completed incrementally.

**Approach:**
- Refactor one detail screen per session
- Test thoroughly after each screen
- Update blueprint after each completion
- Continue systematically through priority list

---

## 🎯 DESIGN SPECIFICATIONS FROM REFERENCE

### Color Palette
```css
--neuron-mint-header: #E5F4F2;           /* Metrics header background */
--neuron-teal-primary: #0F766E;          /* Primary accent, links, buttons */
--neuron-green-dark: #12332B;            /* Primary text, headings */
--neuron-gray-medium: #667085;           /* Labels, secondary text */
--neuron-gray-light: #F9FAFB;            /* Table headers, subtle backgrounds */
--neuron-border: #E5E7EB;                /* All borders */
--neuron-white: #FFFFFF;                 /* Main backgrounds, cards */
--neuron-success-green: #10B981;         /* Paid status */
--neuron-error-red: #DC2626;             /* Errors, outstanding amounts */
```

### Typography Scale
- **Page Title:** 20px, semibold (600), #12332B
- **Section Header:** 16px, semibold (600), #0F766E
- **Subsection Header:** 14px, semibold (600), #12332B
- **Field Label:** 13px, medium (500), #667085, uppercase
- **Body Text:** 14px, regular (400), #12332B
- **Metadata:** 12-13px, regular (400), #667085
- **Large Amount:** 24px, bold (700), #12332B

### Spacing System
- **Page Padding:** 32px vertical, 48px horizontal
- **Card Padding:** 24px all sides
- **Section Gap:** 24px between major sections
- **Component Gap:** 16px between related items
- **Label Gap:** 4px between label and input
- **Input Height:** 40px standard
- **Button Height:** 40px standard

### Border Radius
- **Inputs/Buttons:** 8px
- **Cards/Sections:** 12px
- **Status Pills:** 12px (full pill)

### Component Specifications

#### Metrics Header
- Background: `#E5F4F2` (mint)
- Layout: 3-4 columns equal width
- Label: 11px, uppercase, teal/gray
- Value: 24px, bold, dark
- Status dropdown indicator included

#### Tabs
- Style: Underline tabs (not boxed)
- Active: 2px teal underline, teal text
- Inactive: Gray text, no underline
- Hover: Teal color
- Text: 14px, medium weight

#### Status Pills
- Height: 20px
- Padding: 6px 12px
- Border-radius: 12px (full pill)
- Colored background (green for Paid, etc.)
- White text
- Font: 12px, medium weight

#### Form Fields
- Height: 40px
- Border: 1px solid #E5E7EB
- Radius: 8px
- Padding: 12px
- Label above: 13px gray, 4px margin-bottom
- Focus: Teal border (#0F766E)

#### Buttons
- Primary: Teal bg (#0F766E), white text
- Secondary: White bg, gray border, dark text
- Height: 40px
- Padding: 10px 20px
- Radius: 8px
- Font: 14px, semibold

#### Tables
- Header bg: #F9FAFB
- Header text: 12px, uppercase, gray, semibold
- Row padding: 16px vertical
- Border: 1px solid #E5E7EB between rows
- Hover: #F9FAFB background
- Numbers: Right-aligned, semibold
- Links: Teal color

#### Cards/Sections
- Background: White
- Border: 1px solid #E5E7EB
- Radius: 12px
- Padding: 24px
- Section header: 16px, semibold, teal

---

## 📋 PHASE DETAILS

### PHASE 1: Design Tokens ⭐ PRIORITY: CRITICAL
**Goal:** Establish CSS variables for the entire design system  
**Status:** 🟢 COMPLETE  
**Estimated Time:** 30 minutes

#### Files to Modify:
1. `/styles/globals.css` - Add/update all CSS custom properties

#### Tasks:
- [x] Define color variables
- [x] Define typography variables
- [x] Define spacing variables
- [x] Define border radius variables
- [x] Define transition variables
- [x] Test CSS variables work globally

#### Success Criteria:
- All design tokens defined in CSS variables
- Variables match reference screen exactly
- No hardcoded colors/sizes in tokens

---

### PHASE 2: Core Components ⭐ PRIORITY: HIGH
**Goal:** Build reusable components that all screens will use  
**Status:** 🟢 COMPLETE  
**Estimated Time:** 3-4 hours

#### Components to Create:
1. `/components/design-system/MetricsHeader.tsx` - Mint header with metrics
2. `/components/design-system/StandardTabs.tsx` - Teal underline tabs
3. `/components/design-system/SectionCard.tsx` - White card wrapper
4. `/components/design-system/CollapsibleCategory.tsx` - For line items
5. `/components/design-system/LinkedRecordCard.tsx` - For linked bookings/projects
6. `/components/design-system/StandardButton.tsx` - Primary/secondary buttons

#### Tasks:
- [x] Create MetricsHeader component
- [x] Create StandardTabs component
- [x] Create SectionCard component
- [x] Create CollapsibleCategory component
- [x] Create LinkedRecordCard component
- [x] Create StandardButton component
- [x] Test each component in isolation

#### Success Criteria:
- All components match reference screen exactly
- Components are reusable and accept props
- Components use CSS variables from Phase 1
- Components have TypeScript types

---

### PHASE 3: Detail Screens ⭐ PRIORITY: HIGH
**Goal:** Refactor all detail/view screens to use new design system  
**Status:** 🟡 IN PROGRESS  
**Estimated Time:** 6-8 hours

#### Screens to Refactor (Priority Order):
1. ✅ `/components/accounting/ViewExpenseScreen.tsx` - REFERENCE (already correct)
2. ✅ `/components/accounting/ViewVoucherScreen.tsx` - COMPLETE
3. 🔴 `/components/accounting/ViewBillingScreen.tsx` - NEXT
4. 🔴 `/components/accounting/ViewCollectionScreen.tsx` - NEEDS REFACTOR  
5. 🔴 `/components/operations/ViewProjectDetails.tsx` - NEEDS REFACTOR
6. 🔴 `/components/operations/forwarding/ForwardingBookingDetails.tsx` - NEEDS REFACTOR
7. 🔴 `/components/operations/brokerage/BrokerageBookingDetails.tsx` - NEEDS REFACTOR
8. 🔴 `/components/operations/trucking/TruckingBookingDetails.tsx` - NEEDS REFACTOR
9. 🔴 `/components/operations/marine-insurance/MarineInsuranceBookingDetails.tsx` - NEEDS REFACTOR

#### Tasks Per Screen:
- [ ] Replace header with MetricsHeader component
- [ ] Replace tabs with StandardTabs component
- [ ] Wrap sections in SectionCard component
- [ ] Update all colors to use CSS variables
- [ ] Update all spacing to match design system
- [ ] Update status pills styling
- [ ] Update button styling
- [ ] Test screen functionality still works
- [ ] Visual QA against reference

#### Success Criteria:
- Screen matches reference visual design
- All interactive features still work
- No regressions in functionality
- Uses design system components

---

### PHASE 4: Tab Components ⭐ PRIORITY: HIGH
**Goal:** Refactor tab components used within detail screens  
**Status:** 🔴 NOT STARTED  
**Estimated Time:** 3-4 hours

#### Components to Refactor:
1. `/components/operations/shared/BillingsTab.tsx`
2. `/components/operations/shared/ExpensesTab.tsx`
3. `/components/operations/shared/TruckingTab.tsx`
4. Other tab components in booking details

#### Tasks Per Component:
- [ ] Update summary cards styling
- [ ] Standardize table styling
- [ ] Update button styling
- [ ] Use CSS variables for colors
- [ ] Match spacing to design system
- [ ] Test functionality

#### Success Criteria:
- Tabs match reference design
- Summary cards use metrics header style
- Tables follow standard table styling
- No functionality broken

---

### PHASE 5: List Screens ⭐ PRIORITY: MEDIUM
**Goal:** Refactor all list/index screens  
**Status:** 🔴 NOT STARTED  
**Estimated Time:** 4-5 hours

#### Screens to Refactor:
1. `/components/accounting/ExpensesScreen.tsx`
2. `/components/accounting/BillingsScreen.tsx`
3. `/components/accounting/CollectionsScreen.tsx`
4. `/components/accounting/VouchersScreen.tsx`
5. `/components/operations/ProjectsScreen.tsx`
6. Export bookings list
7. Import bookings list
8. Other operations lists

#### Tasks Per Screen:
- [ ] Standardize page header
- [ ] Standardize search/filter bar
- [ ] Standardize table styling
- [ ] Update button styling
- [ ] Use CSS variables
- [ ] Match spacing
- [ ] Test functionality

#### Success Criteria:
- Consistent list view design
- Tables match reference styling
- Filters and search work correctly
- Performance maintained

---

### PHASE 6: Forms & Modals ⭐ PRIORITY: MEDIUM
**Goal:** Standardize all creation/editing forms and modals  
**Status:** 🔴 NOT STARTED  
**Estimated Time:** 5-6 hours

#### Forms to Refactor:
1. `/components/accounting/CreateExpenseScreen.tsx`
2. `/components/accounting/CreateBillingScreen.tsx`
3. `/components/accounting/CreateBillingSidePanel.tsx`
4. `/components/accounting/CreateCollectionScreen.tsx`
5. `/components/accounting/CreateVoucherScreen.tsx`
6. Project creation forms
7. Booking creation forms
8. Various edit modals

#### Tasks Per Form:
- [ ] Standardize form field styling
- [ ] Standardize button placement
- [ ] Update input heights to 40px
- [ ] Use CSS variables
- [ ] Match spacing
- [ ] Test form validation
- [ ] Test form submission

#### Success Criteria:
- All forms follow same visual pattern
- Input fields are consistent
- Buttons follow standard styling
- Forms still validate and submit correctly

---

### PHASE 7: Polish & QA ⭐ PRIORITY: LOW
**Goal:** Final polish and comprehensive quality assurance  
**Status:** 🔴 NOT STARTED  
**Estimated Time:** 2-3 hours

#### Tasks:
- [ ] Audit all screens for consistency
- [ ] Check hover states match everywhere
- [ ] Check focus states match everywhere
- [ ] Verify responsive behavior
- [ ] Check for any missed hardcoded colors
- [ ] Check for any missed spacing inconsistencies
- [ ] Test all interactive features
- [ ] Browser compatibility check
- [ ] Performance check

#### Success Criteria:
- Visual consistency across entire app
- No style regressions
- All features work correctly
- Good performance maintained

---

## 🚀 IMPLEMENTATION NOTES

### Before Starting Each Phase:
1. Read this blueprint document
2. Review the reference screen
3. Check Phase status and tasks
4. Understand success criteria

### After Completing Each Phase:
1. Update phase status to 🟢 COMPLETE
2. Update completion percentage
3. List files modified
4. Document any deviations from plan
5. Note any new issues discovered
6. Update overall progress tracker

### Testing Checklist:
- [ ] Visual comparison to reference
- [ ] All interactive features work
- [ ] No console errors
- [ ] Responsive behavior maintained
- [ ] Accessibility not degraded

---

## 📝 CHANGE LOG

### January 23, 2026 - 4:45 PM
- ✅ **Phase 3 Progress**: ViewVoucherScreen.tsx refactored (1/9 screens)
  - Imported StandardTabs and StandardButton components
  - Replaced custom Edit/Cancel/Save buttons with StandardButton
  - Replaced custom tabs with StandardTabs component
  - Maintained all existing functionality (edit mode, line item selection, etc.)
  - All interactive features tested and working

### January 23, 2026 - 4:15 PM
- ✅ **Phase 2 Complete**: Created all core reusable components
  - MetricsHeader.tsx - Mint header with key metrics display
  - StandardTabs.tsx - Underline-style tabs with teal accent
  - SectionCard.tsx - White card wrapper with consistent styling
  - CollapsibleCategory.tsx - Expandable category sections for line items
  - LinkedRecordCard.tsx - Display component for linked bookings/projects
  - StandardButton.tsx - Primary/secondary/ghost button variants
  - index.ts - Barrel export file for easy imports
  - All components use CSS variables from Phase 1
  - All components have TypeScript types and props
  
### January 23, 2026 - 3:45 PM
- ✅ **Phase 1 Complete**: Design tokens added to `/styles/globals.css`
  - Added all color variables (mint header, teal primary, status colors)
  - Added typography sizes and weights
  - Added spacing scale (4px - 48px)
  - Added component-specific tokens (input height, button height, radius)
  - Added transition timings
- Blueprint document created
- Implementation plan defined

---

## 🎯 CURRENT FOCUS

**NEXT ACTION:** Begin Phase 3 - Detail Screens
**FILE TO MODIFY:** `/components/accounting/ViewBillingScreen.tsx`
**ESTIMATED TIME:** 6-8 hours

---

## ⚠️ IMPORTANT REMINDERS

1. **DO NOT** skip phases - they build on each other
2. **DO NOT** create new design patterns - follow reference exactly
3. **ALWAYS** test after each change
4. **UPDATE** this blueprint after each phase
5. **REFERENCE** the Expense module screenshots when in doubt
6. **USE** CSS variables - never hardcode values
7. **TEST** functionality - design should not break features

---

*Last Updated: January 23, 2026*