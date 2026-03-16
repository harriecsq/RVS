# Billing Creation Modal → Full Screen Conversion Blueprint

**Goal:** Convert CreateBillingModal from a modal overlay to a full-screen experience matching CreateExpenseScreen pattern.

**Status:** 🟡 IN PROGRESS

---

## Phase Overview

- ✅ **Phase 0:** Blueprint Creation
- 🔄 **Phase 1:** Create CreateBillingScreen Component (Current)
- ⏳ **Phase 2:** Update BillingsScreen State Management
- ⏳ **Phase 3:** Remove Old Modal Component
- ⏳ **Phase 4:** Testing & Verification

---

## Phase 0: Blueprint Creation ✅

**Status:** COMPLETE

**What:** Created this blueprint document to track progress

**Completed:** Yes

---

## Phase 1: Create CreateBillingScreen Component 🔄

**Status:** IN PROGRESS

**What:** 
- Copy CreateBillingModal.tsx → CreateBillingScreen.tsx
- Remove modal wrapper (fixed overlay, backdrop, centered container)
- Change props from `isOpen`, `onClose` → `onBack`, `onSuccess`
- Add back button with ArrowLeft icon (like CreateExpenseScreen)
- Convert layout to full-screen with proper padding (32px 48px)
- Keep all business logic intact (project selection, booking selection, expense linking, billing particulars, margin calculation)

**Key Changes:**
1. Props interface update:
   ```tsx
   // OLD (Modal)
   interface CreateBillingModalProps {
     isOpen: boolean;
     onClose: () => void;
     projectId?: string;
     projectNumber?: string;
     onBillingCreated: () => void;
   }
   
   // NEW (Screen)
   interface CreateBillingScreenProps {
     onBack: () => void;
     onSuccess: () => void;
     projectId?: string;
     projectNumber?: string;
   }
   ```

2. Return structure:
   ```tsx
   // OLD (Modal - overlay wrapper)
   return !isOpen ? null : (
     <div style={{ fixed overlay backdrop }}>
       <div style={{ centered modal container }}>
         {/* X close button */}
         {/* content */}
       </div>
     </div>
   );
   
   // NEW (Screen - full page)
   return (
     <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
       {/* Back button */}
       {/* content with padding: 32px 48px */}
     </div>
   );
   ```

3. Header changes:
   - Replace X close button → ArrowLeft back button
   - Update header styling to match ExpensesScreen pattern
   - Keep "Create Billing" title and description

**Files to Create:**
- `/components/accounting/CreateBillingScreen.tsx` (new file)

**Completed:** No

---

## Phase 2: Update BillingsScreen State Management ⏳

**Status:** NOT STARTED

**What:**
- Change state from `showCreateModal` → `showCreateScreen`
- Update import: `CreateBillingModal` → `CreateBillingScreen`
- Add conditional rendering: `if (showCreateScreen) return <CreateBillingScreen />`
- Update all onClick handlers to use `setShowCreateScreen(true)`
- Pass correct props: `onBack={() => setShowCreateScreen(false)}` and `onSuccess={handleBillingCreated}`

**Key Changes:**
1. Import update:
   ```tsx
   // OLD
   import { CreateBillingModal } from "./CreateBillingModal";
   
   // NEW
   import { CreateBillingScreen } from "./CreateBillingScreen";
   ```

2. State update:
   ```tsx
   // OLD
   const [showCreateModal, setShowCreateModal] = useState(false);
   
   // NEW
   const [showCreateScreen, setShowCreateScreen] = useState(false);
   ```

3. Conditional rendering (add before ViewBillingScreen check):
   ```tsx
   // Add this before selectedBillingId check
   if (showCreateScreen) {
     return (
       <CreateBillingScreen
         onBack={() => setShowCreateScreen(false)}
         onSuccess={handleBillingCreated}
       />
     );
   }
   ```

4. Remove modal JSX at bottom:
   ```tsx
   // REMOVE this entire section:
   <CreateBillingModal
     isOpen={showCreateModal}
     onClose={() => setShowCreateModal(false)}
     onBillingCreated={handleBillingCreated}
   />
   ```

**Files to Modify:**
- `/components/accounting/BillingsScreen.tsx`

**Completed:** No

---

## Phase 3: Remove Old Modal Component ⏳

**Status:** NOT STARTED

**What:**
- Delete the old CreateBillingModal.tsx file (no longer needed)
- Verify no other files import CreateBillingModal

**Files to Delete:**
- `/components/accounting/CreateBillingModal.tsx`

**Completed:** No

---

## Phase 4: Testing & Verification ⏳

**Status:** NOT STARTED

**What:**
- Verify "Create Billing" button opens full-screen view
- Test back button returns to billings list
- Test billing creation flow end-to-end
- Verify all data persists correctly
- Check console for any errors

**Test Cases:**
1. ✅ Click "Create Billing" → Opens full screen
2. ✅ Click back button → Returns to list
3. ✅ Create billing with project selection
4. ✅ Create billing with multiple bookings
5. ✅ Create billing with expense linking
6. ✅ Margin calculation works correctly
7. ✅ Success callback refreshes list

**Completed:** No

---

## Next Steps

**Current Phase:** Phase 1 - Create CreateBillingScreen Component

**Action:** Convert CreateBillingModal to CreateBillingScreen with full-screen layout

---

**Last Updated:** Phase 0 Complete - Starting Phase 1
