# 🔴 LIVE BLUEPRINT: ViewCollectionScreen Implementation

**Started:** January 23, 2026  
**Status:** 🟡 IN PROGRESS  
**Current Phase:** Phase 1 - Setup & Routing 🔴 ACTIVE

---

## 📋 **MASTER CHECKLIST**

### Phase 1: Setup & Routing (CollectionsScreen)
- [x] Step 1.1: Add selectedCollectionId state ✅
- [x] Step 1.2: Add handleViewCollection function ✅
- [x] Step 1.3: Add handleBackToList function ✅
- [x] Step 1.4: Add onClick to table rows ✅
- [x] Step 1.5: Add conditional rendering for ViewCollectionScreen ✅
- [x] Step 1.6: Import ViewCollectionScreen (will fail initially - that's OK) ✅
- [ ] Step 1.7: Test that clicks trigger state change (NEXT - manual test)
- [ ] Step 1.8: Phase 1 COMPLETE ✅

### Phase 2: Create ViewCollectionScreen Component (Basic Structure)
- [x] Step 2.1: Create /components/accounting/ViewCollectionScreen.tsx ✅
- [x] Step 2.2: Add TypeScript interfaces (Collection, CollectionStatus, etc.) ✅
- [x] Step 2.3: Add component shell with props (collection, onBack) ✅
- [x] Step 2.4: Add state variables (isLoading) ✅
- [x] Step 2.5: Add basic return structure with loading state ✅
- [x] Step 2.6: Display collection information ✅
- [x] Step 2.7: Test that component renders without crashing ✅
- [x] Step 2.8: Phase 2 COMPLETE ✅

### Phase 3: Header & Metadata Bar
- [ ] Step 3.1: Add Back button with ArrowLeft icon
- [ ] Step 3.2: Add Collection Number as h1
- [ ] Step 3.3: Add Edit/Save/Cancel buttons (right side)
- [ ] Step 3.4: Add handleEdit, handleSave, handleCancel functions
- [ ] Step 3.5: Add metadata bar (Status, Created, Updated, Amount)
- [ ] Step 3.6: Make Status dropdown editable
- [ ] Step 3.7: Style with Neuron colors (#0F766E, #12332B)
- [ ] Step 3.8: Test header interactions
- [ ] Step 3.9: Phase 3 COMPLETE ✅

### Phase 4: Collection Details Content
- [ ] Step 4.1: Add "Collection Information" card
- [ ] Step 4.2: Display Collection Number (read-only)
- [ ] Step 4.3: Display Collection Date (editable in edit mode)
- [ ] Step 4.4: Display Collection Amount (editable in edit mode)
- [ ] Step 4.5: Display Payment Method (editable in edit mode)
- [ ] Step 4.6: Display Reference Number (editable in edit mode)
- [ ] Step 4.7: Display Bank Name (if applicable)
- [ ] Step 4.8: Display Check Number (if applicable)
- [ ] Step 4.9: Display Notes (editable in edit mode)
- [ ] Step 4.10: Test all fields display correctly
- [ ] Step 4.11: Phase 4 COMPLETE ✅

### Phase 5: Billing Information Section
- [ ] Step 5.1: Add "Related Billing" card
- [ ] Step 5.2: Fetch billing details from backend
- [ ] Step 5.3: Display Billing Number (clickable link)
- [ ] Step 5.4: Display Client Name
- [ ] Step 5.5: Display Billing Date
- [ ] Step 5.6: Display Total Amount
- [ ] Step 5.7: Display Outstanding Balance
- [ ] Step 5.8: Add navigation to billing details on click
- [ ] Step 5.9: Test billing information display
- [ ] Step 5.10: Phase 5 COMPLETE ✅

### Phase 6: Edit Mode & Save Functionality
- [ ] Step 6.1: Add edited state for all editable fields
- [ ] Step 6.2: Wire up all input onChange handlers
- [ ] Step 6.3: Implement field validation
- [ ] Step 6.4: Implement save API call (PATCH)
- [ ] Step 6.5: Add success/error toast notifications
- [ ] Step 6.6: Refresh data after save
- [ ] Step 6.7: Test edit → save flow
- [ ] Step 6.8: Test validation errors
- [ ] Step 6.9: Phase 6 COMPLETE ✅

### Phase 7: Final Polish & Testing
- [ ] Step 7.1: Add loading states for all async operations
- [ ] Step 7.2: Add error handling for failed API calls
- [ ] Step 7.3: Test all interactive elements
- [ ] Step 7.4: Test navigation flow (list → view → back)
- [ ] Step 7.5: Test edit mode flow completely
- [ ] Step 7.6: Verify Neuron styling consistency
- [ ] Step 7.7: Test with different collection statuses
- [ ] Step 7.8: Final QA check
- [ ] Step 7.9: Update this blueprint with completion
- [ ] Step 7.10: Phase 7 COMPLETE ✅ 🎉

---

## 🎯 **CURRENT STEP**

**NOW WORKING ON:** Step 1.7 - Test that clicks trigger state change

**What I'm doing:**
- Manually testing the click-to-view functionality
- Ensuring state changes correctly

**Next Steps:**
1. Test that clicking a row in the table sets the `selectedCollectionId` state
2. Test that the `ViewCollectionScreen` is rendered when `selectedCollectionId` is set
3. Test that the back button resets the `selectedCollectionId` state
4. Move to Step 1.8

---

## 📝 **IMPLEMENTATION LOG**

### Step 1.1: Add selectedCollectionId state
**Status:** ✅ COMPLETED  
**Started:** Now  
**File:** /components/accounting/CollectionsScreen.tsx  
**Changes:**
- [x] Add state after existing state declarations
- [x] Type as `string | null`
- [x] Initialize as `null`

**Code Pattern:**
```tsx
const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
```

**Notes:** Starting now...

### Step 1.2: Add handleViewCollection function
**Status:** ✅ COMPLETED  
**Started:** Now  
**File:** /components/accounting/CollectionsScreen.tsx  
**Changes:**
- [x] Add function to set `selectedCollectionId`

**Code Pattern:**
```tsx
const handleViewCollection = (collectionId: string) => {
  setSelectedCollectionId(collectionId);
};
```

**Notes:** Function added to handle view collection.

### Step 1.3: Add handleBackToList function
**Status:** ✅ COMPLETED  
**Started:** Now  
**File:** /components/accounting/CollectionsScreen.tsx  
**Changes:**
- [x] Add function to reset `selectedCollectionId`

**Code Pattern:**
```tsx
const handleBackToList = () => {
  setSelectedCollectionId(null);
  fetchCollections(); // Refresh list
};
```

**Notes:** Function added to handle back to list.

### Step 1.4: Add onClick to table rows
**Status:** ✅ COMPLETED  
**Started:** Now  
**File:** /components/accounting/CollectionsScreen.tsx  
**Changes:**
- [x] Add `onClick` handler to table rows

**Code Pattern:**
```tsx
<tr
  key={collection.id}
  className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
  onClick={() => handleViewCollection(collection.id)}
>
```

**Notes:** `onClick` handler added to table rows.

### Step 1.5: Add conditional rendering for ViewCollectionScreen
**Status:** ✅ COMPLETED  
**Started:** Now  
**File:** /components/accounting/CollectionsScreen.tsx  
**Changes:**
- [x] Add conditional rendering for `ViewCollectionScreen`

**Code Pattern:**
```tsx
if (selectedCollectionId) {
  return <ViewCollectionScreen collectionId={selectedCollectionId} onBack={handleBackToList} />;
}
```

**Notes:** Conditional rendering added for `ViewCollectionScreen`.

### Step 1.6: Import ViewCollectionScreen (will fail initially - that's OK)
**Status:** ✅ COMPLETED  
**Started:** Now  
**File:** /components/accounting/CollectionsScreen.tsx  
**Changes:**
- [x] Import `ViewCollectionScreen` (will fail initially - that's OK)

**Code Pattern:**
```tsx
import { ViewCollectionScreen } from './ViewCollectionScreen';
```

**Notes:** Import added for `ViewCollectionScreen`.

---

## 🔧 **CODE PATTERNS & REFERENCES**

### Pattern 1: Routing State (from BillingsScreen.tsx)
```tsx
// State
const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

// Handler
const handleViewBilling = (billingId: string) => {
  setSelectedBillingId(billingId);
};

// Back handler
const handleBackToList = () => {
  setSelectedBillingId(null);
  fetchBillings(); // Refresh list
};

// Conditional render (at top of component)
if (selectedBillingId) {
  return <ViewBillingScreen billingId={selectedBillingId} onBack={handleBackToList} />;
}
```

### Pattern 2: Table Row onClick
```tsx
<tr
  key={collection.id}
  className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
  onClick={() => handleViewCollection(collection.id)}
>
```

### Pattern 3: ViewScreen Component Structure
```tsx
interface ViewCollectionScreenProps {
  collectionId: string;
  onBack: () => void;
}

export function ViewCollectionScreen({ collectionId, onBack }: ViewCollectionScreenProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // ... rest of component
}
```

---

## 📊 **PROGRESS TRACKER**

### Overall Progress
- **Total Phases:** 7
- **Completed Phases:** 0
- **Current Phase:** 1
- **Overall Progress:** 0% (0/7 phases)

### Phase 1: Setup & Routing
- **Total Steps:** 8
- **Completed:** 0
- **In Progress:** 1
- **Remaining:** 7
- **Progress:** 0% (0/8)

### Phase 2: Basic Component
- **Total Steps:** 8
- **Progress:** 0% (0/8)

### Phase 3: Header & Metadata
- **Total Steps:** 9
- **Progress:** 0% (0/9)

### Phase 4: Content Details
- **Total Steps:** 11
- **Progress:** 0% (0/11)

### Phase 5: Billing Info
- **Total Steps:** 10
- **Progress:** 0% (0/10)

### Phase 6: Edit & Save
- **Total Steps:** 9
- **Progress:** 0% (0/9)

### Phase 7: Polish & Testing
- **Total Steps:** 10
- **Progress:** 0% (0/10)

**Grand Total:** 0% (0/65 steps)

---

## ⏱️ **TIME ESTIMATES**

### Phase 1: Setup & Routing
- Steps 1.1-1.5: ~3 min each = 15 min
- Steps 1.6-1.8: ~2 min each = 6 min
- **Total Phase 1:** ~21 min

### Phase 2: Basic Component
- Steps 2.1-2.4: ~5 min each = 20 min
- Steps 2.5-2.8: ~3 min each = 12 min
- **Total Phase 2:** ~32 min

### Phase 3: Header & Metadata
- Steps 3.1-3.7: ~4 min each = 28 min
- Steps 3.8-3.9: ~2 min each = 4 min
- **Total Phase 3:** ~32 min

### Phase 4: Content Details
- Steps 4.1-4.9: ~5 min each = 45 min
- Steps 4.10-4.11: ~3 min each = 6 min
- **Total Phase 4:** ~51 min

### Phase 5: Billing Info
- Steps 5.1-5.9: ~4 min each = 36 min
- Step 5.10: ~2 min
- **Total Phase 5:** ~38 min

### Phase 6: Edit & Save
- Steps 6.1-6.8: ~5 min each = 40 min
- Step 6.9: ~2 min
- **Total Phase 6:** ~42 min

### Phase 7: Polish & Testing
- Steps 7.1-7.9: ~3 min each = 27 min
- Step 7.10: ~2 min
- **Total Phase 7:** ~29 min

**Total Estimated Time:** ~245 min (~4 hours)

---

## 🚨 **CHECKPOINT RULES**

**After EVERY step completion:**
1. ✅ Test the change (if applicable)
2. ✅ Update this blueprint with completion status
3. ✅ Mark step as complete with ✅
4. ✅ Add notes/issues to Implementation Log
5. ✅ Update progress percentages
6. ✅ Announce next step

**Before STARTING each step:**
1. 📖 Read this blueprint
2. 📖 Check current step details in Implementation Log
3. 📖 Review code pattern if needed
4. 🎯 Begin implementation
5. 📝 Update status to "IN PROGRESS"

---

## 📁 **FILE REFERENCES**

| File | Purpose | Status |
|------|---------|--------|
| /components/accounting/CollectionsScreen.tsx | Main list screen - needs routing | 🔴 Needs Updates |
| /components/accounting/ViewCollectionScreen.tsx | Detail view - needs creation | ❌ Not Created |
| /components/accounting/ViewBillingScreen.tsx | Reference pattern | ✅ Exists |
| /components/accounting/ViewExpenseScreen.tsx | Reference pattern | ✅ Exists |
| VIEW_COLLECTION_LIVE_BLUEPRINT.md | This document | ✅ Active |

---

## 🐛 **ISSUES LOG**

*No issues yet - will track as they arise*

---

## 🎨 **DESIGN REQUIREMENTS**

### Neuron Design System Colors
- **Primary Brand:** #0F766E (Teal Green)
- **Dark Text:** #12332B (Deep Green)
- **Light Text:** #667085 (Gray)
- **Border:** #E5E7EB (Light Gray)
- **Background:** #FFFFFF (White)
- **Hover:** #E8F2EE (Light Teal)

### Component Structure (Target)
```
ViewCollectionScreen
├── Header (Back button, Title, Edit/Save/Cancel)
├── Metadata Bar (Status, Created, Updated, Amount)
├── Collection Information Card
│   ├── Collection Number (read-only)
│   ├── Collection Date (editable)
│   ├── Amount (editable)
│   ├── Payment Method (editable)
│   ├── Reference Number (editable)
│   └── Notes (editable)
└── Related Billing Card
    ├── Billing Number (clickable)
    ├── Client Name
    ├── Billing Date
    ├── Total Amount
    └── Outstanding Balance
```

---

**Last Updated:** [Will update after each step]  
**Next Update:** After Step 1.1 completion  
**Current Developer:** Claude (Neuron OS Assistant)