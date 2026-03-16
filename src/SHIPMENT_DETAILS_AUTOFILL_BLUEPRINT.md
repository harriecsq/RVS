# Shipment Details Auto-fill & Dropdown - Implementation Blueprint

## Objective
Add dropdown auto-fill functionality to all Shipment Details fields, extracting unique values from selected bookings (similar to Client Name and Company Name fields).

## Current State
- Shipment Details fields are plain text inputs
- No auto-fill or dropdown functionality
- Fields: Vessel/Voyage, BL Number, Container Numbers, Destination, Volume, Commodity, Contract Number, Exchange Rate

## Target State
- Each field has a dropdown showing unique values from selected bookings
- Users can select from dropdown or manually type
- Values auto-populate based on selected bookings

---

## Implementation Phases

### ✅ PHASE 0: Blueprint Creation
**Status:** COMPLETED
**Tasks:**
- [x] Create blueprint document
- [x] Define all phases

---

### ⏳ PHASE 1: Update Booking Interface
**Status:** NOT STARTED
**Estimated Lines:** ~10 lines
**Location:** Line ~24-35

**Tasks:**
- [ ] Add shipment-related fields to Booking interface:
  - `vessel_voyage?: string` or `vesselVoyage?: string`
  - `bl_number?: string` or `blNumber?: string`
  - `destination?: string`
  - `commodity?: string`
  - `volume?: string`
  - `contract_number?: string` or `contractNumber?: string`
  - `exchange_rate?: string` or `exchangeRate?: string`
  - `container_numbers?: string[]` or `containerNumbers?: string[]`

**Validation:**
- TypeScript compiles without errors

---

### ⏳ PHASE 2: Create Data Extraction useMemo Hooks
**Status:** NOT STARTED
**Estimated Lines:** ~100-120 lines
**Location:** After existing useMemo hooks (around line 195)

**Tasks:**
- [ ] Create `uniqueVessels` useMemo
- [ ] Create `uniqueBlNumbers` useMemo
- [ ] Create `uniqueDestinations` useMemo
- [ ] Create `uniqueCommodities` useMemo
- [ ] Create `uniqueVolumes` useMemo
- [ ] Create `uniqueContractNumbers` useMemo
- [ ] Create `uniqueExchangeRates` useMemo
- [ ] Create `uniqueContainerNumbers` useMemo (special - merge arrays)
- [ ] Each should filter selected bookings and return unique non-null values
- [ ] Use flexible ID matching (id, bookingId, bookingNumber)

**Validation:**
- Console log outputs show correct unique values
- useMemo dependencies are correct

---

### ⏳ PHASE 3: Add Dropdown States
**Status:** NOT STARTED
**Estimated Lines:** ~8 lines
**Location:** State declarations (around line 100-110)

**Tasks:**
- [ ] Add `const [showVesselDropdown, setShowVesselDropdown] = useState(false)`
- [ ] Add `const [showBlNumberDropdown, setShowBlNumberDropdown] = useState(false)`
- [ ] Add `const [showDestinationDropdown, setShowDestinationDropdown] = useState(false)`
- [ ] Add `const [showCommodityDropdown, setShowCommodityDropdown] = useState(false)`
- [ ] Add `const [showVolumeDropdown, setShowVolumeDropdown] = useState(false)`
- [ ] Add `const [showContractNumberDropdown, setShowContractNumberDropdown] = useState(false)`
- [ ] Add `const [showExchangeRateDropdown, setShowExchangeRateDropdown] = useState(false)`

**Validation:**
- No TypeScript errors
- App compiles

---

### ⏳ PHASE 4: Convert Vessel/Voyage Field to Dropdown
**Status:** NOT STARTED
**Estimated Lines:** ~50 lines
**Location:** Shipment Details section (around line 1140)

**Tasks:**
- [ ] Replace plain input with clickable div (like Client Name)
- [ ] Add ChevronDown icon
- [ ] Add conditional dropdown display
- [ ] Map through `uniqueVessels` array
- [ ] Handle selection and close dropdown
- [ ] Show "Select bookings first" when empty
- [ ] Maintain Neuron design consistency

**Validation:**
- Dropdown shows unique vessel values
- Selection updates field
- Dropdown closes after selection

---

### ⏳ PHASE 5: Convert BL Number Field to Dropdown
**Status:** NOT STARTED
**Location:** Shipment Details section

**Tasks:**
- [ ] Same implementation as Phase 4 but for BL Number field

---

### ⏳ PHASE 6: Convert Destination Field to Dropdown
**Status:** NOT STARTED
**Location:** Shipment Details section

**Tasks:**
- [ ] Same implementation as Phase 4 but for Destination field

---

### ⏳ PHASE 7: Convert Commodity Field to Dropdown
**Status:** NOT STARTED
**Location:** Shipment Details section

**Tasks:**
- [ ] Same implementation as Phase 4 but for Commodity field

---

### ⏳ PHASE 8: Convert Volume Field to Dropdown
**Status:** NOT STARTED
**Location:** Shipment Details section

**Tasks:**
- [ ] Same implementation as Phase 4 but for Volume field

---

### ⏳ PHASE 9: Convert Contract Number Field to Dropdown
**Status:** NOT STARTED
**Location:** Shipment Details section

**Tasks:**
- [ ] Same implementation as Phase 4 but for Contract Number field

---

### ⏳ PHASE 10: Convert Exchange Rate Field to Dropdown
**Status:** NOT STARTED
**Location:** Shipment Details section

**Tasks:**
- [ ] Same implementation as Phase 4 but for Exchange Rate field

---

### ⏳ PHASE 11: Handle Container Numbers (Special Case)
**Status:** NOT STARTED
**Location:** Shipment Details section

**Tasks:**
- [ ] Container Numbers is an array, not a single value
- [ ] Consider showing a "Load from bookings" button instead of dropdown
- [ ] Or show dropdown with option to merge/replace container numbers
- [ ] Needs special UX consideration

**Decision Needed:**
- How should multiple container arrays be merged?
- Should user choose which booking's containers to use?
- Or merge all unique containers from all bookings?

---

### ⏳ PHASE 12: Cleanup & Testing
**Status:** NOT STARTED

**Tasks:**
- [ ] Remove debug console.logs
- [ ] Test all dropdowns with different booking types
- [ ] Verify values auto-populate correctly
- [ ] Test with no bookings selected
- [ ] Test with multiple bookings selected
- [ ] Verify form submission includes all fields

**Validation:**
- All dropdowns work correctly
- No console errors
- Clean TypeScript compilation

---

## Progress Tracker
- **Total Phases:** 13 (including Phase 0)
- **Completed:** 11 (Phases 0-10)
- **In Progress:** 0
- **Not Started:** 2 (Phases 11-12)
- **Overall Progress:** 84.6%

**Note:** Container Numbers (Phase 11) is skipped for now as it requires special array handling logic.

---

## Notes & Decisions
- Container Numbers field needs special handling due to array nature
- All fields follow same pattern as Client Name/Company Name
- Maintain consistent Neuron design system styling
- All dropdowns should show "Select bookings first" when no bookings selected

---

**Last Updated:** Initial creation
**Next Phase:** Phase 1 - Update Booking Interface
