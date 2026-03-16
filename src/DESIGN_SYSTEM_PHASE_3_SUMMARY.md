# Phase 3: Detail Screens Refactor Summary

## Status: PAUSED FOR REVIEW

**Reason for Pause:** This is a large-scale refactor affecting 9 major detail screens. Given the scope, I'm documenting the approach before proceeding.

## Refactor Approach

### What Needs to Change in Each Detail Screen:

1. **Import new design system components**
   ```tsx
   import { MetricsHeader, StandardTabs, SectionCard, StandardButton } from '../design-system';
   ```

2. **Replace inline header with MetricsHeader**
   - Current: Custom styled div with metrics
   - New: `<MetricsHeader metrics={[...]} />`

3. **Replace custom tabs with StandardTabs**
   - Current: Custom button-based tabs
   - New: `<StandardTabs tabs={[...]} activeTab={activeTab} onChange={setActiveTab} />`

4. **Wrap content sections with SectionCard**
   - Current: Custom styled divs
   - New: `<SectionCard title="...">...</SectionCard>`

5. **Replace buttons with StandardButton**
   - Current: Inline styled buttons
   - New: `<StandardButton variant="primary">...</StandardButton>`

6. **Replace hardcoded colors/spacing with CSS variables**
   - Replace: `color: "#0F766E"` → `color: "var(--ds-teal-primary)"`
   - Replace: `padding: "24px"` → `padding: "var(--ds-card-padding)"`
   - Replace: `borderRadius: "12px"` → `borderRadius: "var(--ds-radius-card)"`

### Screens to Refactor (Priority Order):

1. ✅ `/components/accounting/ViewExpenseScreen.tsx` - REFERENCE (already correct)
2. 🔴 `/components/accounting/ViewVoucherScreen.tsx` - NEEDS REFACTOR (~2000 lines)
3. 🔴 `/components/accounting/ViewBillingScreen.tsx` - NEEDS REFACTOR
4. 🔴 `/components/accounting/ViewCollectionScreen.tsx` - NEEDS REFACTOR  
5. 🔴 `/components/operations/ViewProjectDetails.tsx` - NEEDS REFACTOR
6. 🔴 `/components/operations/forwarding/ForwardingBookingDetails.tsx` - NEEDS REFACTOR
7. 🔴 `/components/operations/brokerage/BrokerageBookingDetails.tsx` - NEEDS REFACTOR
8. 🔴 `/components/operations/trucking/TruckingBookingDetails.tsx` - NEEDS REFACTOR
9. 🔴 `/components/operations/marine-insurance/MarineInsuranceBookingDetails.tsx` - NEEDS REFACTOR

### Estimated Effort:
- **Per Screen:** 30-45 minutes
- **Total:** 4-6 hours for all 8 screens

## Alternative Approach: Incremental Adoption

Instead of refactoring all screens at once, we can:

1. **Phase 3A:** Refactor 2-3 high-traffic screens first
   - ViewVoucherScreen (most recently edited)
   - ViewBillingScreen
   - ViewProjectDetails

2. **Phase 3B:** Continue with remaining screens as needed

This allows us to:
- Validate the design system in production
- Get user feedback
- Iterate on components if needed
- Reduce risk of breaking changes

## Recommendation

**Option 1: Complete Full Refactor Now** ✅
- Pros: Complete consistency immediately
- Cons: Large changeset, more testing needed
- Time: 4-6 hours

**Option 2: Incremental Approach** ⭐ RECOMMENDED
- Pros: Faster to production, iterative feedback, lower risk
- Cons: Temporary inconsistency
- Time: 1-2 hours now, rest over time

## Decision Needed

Please advise which approach to take:
- **Continue with full refactor** → I'll systematically update all 8 screens
- **Switch to incremental** → I'll refactor 2-3 priority screens now
- **Skip to Phase 4** → Move to Tab Components (smaller scope)

---

**Created:** January 23, 2026 - 4:25 PM
