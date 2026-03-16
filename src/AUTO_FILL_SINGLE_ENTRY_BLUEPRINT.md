# Auto-fill Single Entry Dropdowns - Implementation Blueprint

## Objective
Automatically fill dropdown fields when they contain exactly 1 unique value. No user interaction needed.

## Current State
- 10 useMemo hooks extract unique values from bookings/expenses
- All fields have corresponding state variables
- Dropdowns are manually selected by users

## Target State
- When a unique array has exactly 1 entry, auto-fill the corresponding field
- When a unique array has 0 or multiple entries, leave field empty/unchanged
- Happens automatically via useEffect

---

## Implementation Phases

### ✅ PHASE 0: Blueprint Creation
**Status:** COMPLETED
**Tasks:**
- [x] Create blueprint document
- [x] Define all phases
- [x] Map all 10 fields to implement

---

## Field Mapping Reference
| Field | Unique Array | State Setter | Type |
|-------|--------------|--------------|------|
| Client Name | `uniqueClientNames` | `setClientName` | string |
| Company Name | `uniqueCompanyNames` | `setCompanyName` | string |
| Vessel/Voyage | `uniqueVessels` | `setVessel` | string |
| BL Number | `uniqueBlNumbers` | `setBlNumber` | string |
| Destination | `uniqueDestinations` | `setDestination` | string |
| Commodity | `uniqueCommodities` | `setCommodity` | string |
| Volume | `uniqueVolumes` | `setVolume` | string |
| Contract Number | `uniqueContractNumbers` | `setContractNumber` | string |
| Exchange Rate | `uniqueExchangeRates` | `setExchangeRate` | string |
| Container Numbers | `uniqueContainerNumbers` | `setContainerNumbers` | string[] |

---

### ✅ PHASE 1-10: All Auto-fill UseEffects Added
**Status:** COMPLETED (Phases 1-10 implemented together)

**All fields now auto-fill when they have exactly 1 unique value:**
- [x] Client Name
- [x] Company Name
- [x] Vessel/Voyage
- [x] BL Number
- [x] Destination
- [x] Commodity
- [x] Volume
- [x] Contract Number
- [x] Exchange Rate
- [x] Container Numbers (special: loads all unique containers)

**Location:** Lines ~405-465 in CreateBillingModal.tsx

**Validation:**
Ready for testing
**Estimated Lines:** 5-7 lines
**Location:** After useMemo hooks, around line 220

**Tasks:**
- [ ] Add useEffect that watches `uniqueClientNames`
- [ ] If `uniqueClientNames.length === 1`, call `setClientName(uniqueClientNames[0])`
- [ ] Dependencies: `[uniqueClientNames]`

**Code Pattern:**
```typescript
useEffect(() => {
  if (uniqueClientNames.length === 1) {
    setClientName(uniqueClientNames[0]);
  }
}, [uniqueClientNames]);
```

**Validation:**
- Select bookings with same client → field auto-fills
- Select bookings with different clients → field stays empty

---

### ⏳ PHASE 2: Company Name Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 1

**Tasks:**
- [ ] Add useEffect that watches `uniqueCompanyNames`
- [ ] If `uniqueCompanyNames.length === 1`, call `setCompanyName(uniqueCompanyNames[0])`
- [ ] Dependencies: `[uniqueCompanyNames]`

**Validation:**
- Select bookings with same company → field auto-fills
- Select bookings with different companies → field stays empty

---

### ⏳ PHASE 3: Vessel/Voyage Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 2

**Tasks:**
- [ ] Add useEffect that watches `uniqueVessels`
- [ ] If `uniqueVessels.length === 1`, call `setVessel(uniqueVessels[0])`
- [ ] Dependencies: `[uniqueVessels]`

**Validation:**
- Select bookings with same vessel → field auto-fills

---

### ⏳ PHASE 4: BL Number Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 3

**Tasks:**
- [ ] Add useEffect that watches `uniqueBlNumbers`
- [ ] If `uniqueBlNumbers.length === 1`, call `setBlNumber(uniqueBlNumbers[0])`
- [ ] Dependencies: `[uniqueBlNumbers]`

**Validation:**
- Link expenses with same BL → field auto-fills

---

### ⏳ PHASE 5: Destination Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 4

**Tasks:**
- [ ] Add useEffect that watches `uniqueDestinations`
- [ ] If `uniqueDestinations.length === 1`, call `setDestination(uniqueDestinations[0])`
- [ ] Dependencies: `[uniqueDestinations]`

**Validation:**
- Select bookings with same destination → field auto-fills

---

### ⏳ PHASE 6: Commodity Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 5

**Tasks:**
- [ ] Add useEffect that watches `uniqueCommodities`
- [ ] If `uniqueCommodities.length === 1`, call `setCommodity(uniqueCommodities[0])`
- [ ] Dependencies: `[uniqueCommodities]`

**Validation:**
- Select bookings with same commodity → field auto-fills

---

### ⏳ PHASE 7: Volume Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 6

**Tasks:**
- [ ] Add useEffect that watches `uniqueVolumes`
- [ ] If `uniqueVolumes.length === 1`, call `setVolume(uniqueVolumes[0])`
- [ ] Dependencies: `[uniqueVolumes]`

**Validation:**
- Link expenses with same volume → field auto-fills

---

### ⏳ PHASE 8: Contract Number Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 7

**Tasks:**
- [ ] Add useEffect that watches `uniqueContractNumbers`
- [ ] If `uniqueContractNumbers.length === 1`, call `setContractNumber(uniqueContractNumbers[0])`
- [ ] Dependencies: `[uniqueContractNumbers]`

**Validation:**
- Select bookings with same contract → field auto-fills

---

### ⏳ PHASE 9: Exchange Rate Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 8

**Tasks:**
- [ ] Add useEffect that watches `uniqueExchangeRates`
- [ ] If `uniqueExchangeRates.length === 1`, call `setExchangeRate(uniqueExchangeRates[0])`
- [ ] Dependencies: `[uniqueExchangeRates]`

**Validation:**
- Link expenses with same rate → field auto-fills

---

### ⏳ PHASE 10: Container Numbers Auto-fill
**Status:** NOT STARTED
**Estimated Lines:** 5-7 lines
**Location:** After Phase 9

**Special Note:** This field is an ARRAY, not a string

**Tasks:**
- [ ] Add useEffect that watches `uniqueContainerNumbers`
- [ ] If `uniqueContainerNumbers.length > 0`, call `setContainerNumbers(uniqueContainerNumbers)`
- [ ] Different logic: load ALL unique containers, not just when there's 1
- [ ] Dependencies: `[uniqueContainerNumbers]`

**Code Pattern:**
```typescript
useEffect(() => {
  if (uniqueContainerNumbers.length > 0) {
    setContainerNumbers(uniqueContainerNumbers);
  }
}, [uniqueContainerNumbers]);
```

**Validation:**
- Link expenses with containers → all containers auto-fill

---

### ⏳ PHASE 11: Testing & Cleanup
**Status:** NOT STARTED

**Tasks:**
- [ ] Remove debug console.logs from useMemo hooks
- [ ] Test each field individually
- [ ] Test with multiple bookings (same values vs different values)
- [ ] Test with multiple expenses
- [ ] Verify no performance issues
- [ ] Ensure fields can still be manually edited after auto-fill

**Validation:**
- All 10 fields auto-fill when appropriate
- Manual editing still works
- No console errors
- Clean TypeScript compilation

---

## Progress Tracker
- **Total Phases:** 12 (including Phase 0)
- **Completed:** 11 (Phases 0-10)
- **In Progress:** 0
- **Not Started:** 1 (Phase 11 - Testing)
- **Overall Progress:** 91.7%

---

## Notes & Decisions
- All useEffect hooks will be added after the useMemo hooks section
- Each useEffect watches exactly one unique array
- Container Numbers has different logic (loads all, not just when length === 1)
- Fields remain manually editable after auto-fill
- Auto-fill happens reactively whenever unique arrays change

---

**Last Updated:** Initial creation
**Next Phase:** Phase 1 - Client Name Auto-fill
