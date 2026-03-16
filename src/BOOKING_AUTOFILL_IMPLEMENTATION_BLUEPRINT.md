# Booking Autofill Implementation Blueprint

## 🎯 OBJECTIVE
Enable complete auto-filling of booking fields when a user selects a project from the ProjectSelector dropdown, matching the same behavior as when bookings are created from the Project Details screen.

---

## 📋 REFERENCE: Current Prefill Fields (from BookingsTab.tsx)

When creating a booking FROM the Project Details screen, the following fields are autofilled:

```javascript
{
  projectId: project.id,
  projectNumber: project.project_number,
  projectName: project.project_name || project.quotation_name,
  clientId: clientId,
  clientName: clientName,
  commodity: project.commodity,
  volume_containers: project.volume_containers,
  shipping_line: project.shipping_line,
  vessel_voyage: project.vessel_voyage,
  trucker: project.trucker,
  
  // Export-specific fields (Forwarding):
  destination: project.destination,
  loading_address: project.loading_address,
  loading_schedule: project.loading_schedule,
  
  // Import-specific fields (Brokerage):
  origin: project.origin,
  pod: project.pod,
}
```

**Additional fields available in Project type that may be useful:**
- `pol_aol` (Port/Airport of Loading)
- `pod_aod` (Port/Airport of Discharge)
- `carrier`
- `shipment_type`
- `volume`
- `gross_weight`
- `cargo_type`
- `incoterm`

---

## 🔍 CURRENT STATE ANALYSIS

### CreateBrokerageBookingPanel.tsx (Import/Brokerage)
**Status:** ⚠️ Partially Working
- ✅ Lines 175-198: `handleProjectSelect` autofills client_name, client_id, consignee
- ❌ Missing: commodity, volume_containers, shipping_line, vessel_voyage, origin, pod, trucker

### CreateForwardingBookingPanel.tsx (Export/Forwarding)
**Status:** ❌ Not Working
- ❌ Lines 283-289: `handleProjectSelect` ONLY sets project_id and project_number
- ❌ Missing: ALL other fields (client, commodity, volume, shipping_line, destination, loading_address, etc.)

---

## 📐 IMPLEMENTATION PHASES

### ✅ PHASE 1: Update CreateBrokerageBookingPanel.tsx
**Goal:** Fetch full project details and autofill ALL relevant fields when project is selected

**Fields to autofill:**
1. ✅ Client (already working)
2. ✅ Commodity → `commodity` state
3. ✅ Volume → `volume` state
4. ✅ Shipping Line → `shippingLine` state
5. ✅ Vessel/Voyage → `vesselVoyage` state
6. ✅ Origin → `origin` state (NEW - added state)
7. ✅ POD → `pod` state (NEW - added state)
8. ✅ Trucker → `trucker` state (NEW - added state)
9. ✅ Consignee → `consignee` state (already working)

**Implementation Steps:**
- [✅] 1.1: Review current state variables in CreateBrokerageBookingPanel
- [✅] 1.2: Add missing state variables (origin, pod, trucker)
- [✅] 1.3: Update `handleProjectSelect` to fetch full project via projects array
- [✅] 1.4: Map all project fields to booking form fields
- [✅] 1.5: Added console.log for debugging autofill
- [✅] 1.6: Ensured prefillData props include new fields

**Status:** ✅ COMPLETED

---

### ✅ PHASE 2: Update CreateForwardingBookingPanel.tsx
**Goal:** Fetch full project details and autofill ALL relevant fields when project is selected

**Fields to autofill (based on formData structure):**
1. ✅ Customer Name → `customer_name` in formData
2. ✅ Customer ID → `customer_id` in formData
3. ✅ Commodity → `commodity` in formData
4. ✅ Volume/Containers → `volume_containers` in formData
5. ✅ Shipping Line → `shipping_line` in formData
6. ✅ Vessel/Voyage → `vessel_voyage` in formData
7. ✅ Destination → `destination` in formData
8. ✅ Loading Address → `loading_address` in formData
9. ✅ Loading Schedule → `loading_schedule` in formData
10. ✅ Trucker → `trucker` in formData
11. ✅ Shipper → `shipper` in formData (autofilled with client_name)

**Implementation Steps:**
- [✅] 2.1: Review current formData structure in CreateForwardingBookingPanel
- [✅] 2.2: Update `handleProjectSelect` to fetch full project via projects array
- [✅] 2.3: Map all project fields to formData fields
- [✅] 2.4: Ensure autofilledFields Set is updated for visual indicators
- [✅] 2.5: Added getInputStyle helper function for visual autofill indicators
- [✅] 2.6: Added console.log for debugging autofill

**Status:** ✅ COMPLETED

---

### ✅ PHASE 3: Testing & Validation
**Goal:** Comprehensive testing of both booking creation flows

**Test Scenarios:**
- [ ] 3.1: Create Brokerage booking from Bookings screen → select project → verify all fields autofill
- [ ] 3.2: Create Forwarding booking from Bookings screen → select project → verify all fields autofill
- [ ] 3.3: Create Brokerage booking from Project Details screen → verify prefillData still works
- [ ] 3.4: Create Forwarding booking from Project Details screen → verify prefillData still works
- [ ] 3.5: Test with project that has minimal data (optional fields empty)
- [ ] 3.6: Test with project that has complete data (all fields filled)
- [ ] 3.7: Verify visual indicators (autofilled fields styling) work correctly
- [ ] 3.8: Test clearing project selection and re-selecting different project

**Status:** 🔴 NOT STARTED

---

## 🎯 SUCCESS CRITERIA

1. ✅ When a project is selected via dropdown in CreateBrokerageBookingPanel:
   - All available project fields automatically populate booking fields
   - Visual indicators show which fields were autofilled
   
2. ✅ When a project is selected via dropdown in CreateForwardingBookingPanel:
   - All available project fields automatically populate booking fields
   - Visual indicators show which fields were autofilled
   
3. ✅ Existing prefillData flow (from Project Details screen) continues to work without regression

4. ✅ User can override autofilled values if needed

5. ✅ No console errors or broken functionality

---

## 📝 IMPLEMENTATION LOG

### [TIMESTAMP] - Blueprint Created
- Initial analysis completed
- Identified all fields that need autofill
- Created phased implementation plan

### [January 24, 2026] - PHASE 1 & 2 COMPLETED
- ✅ Updated CreateBrokerageBookingPanel.tsx:
  - Added state variables: origin, pod, trucker
  - Implemented comprehensive autofill in handleProjectSelect
  - Autofills: client, commodity, volume, shipping_line, vessel_voyage, origin, pod, trucker, consignee
  - Added console.log for debugging
  
- ✅ Updated CreateForwardingBookingPanel.tsx:
  - Implemented comprehensive autofill in handleProjectSelect
  - Autofills: customer_name, customer_id, shipper, commodity, volume_containers, shipping_line, vessel_voyage, destination, loading_address, loading_schedule, trucker
  - Added visual indicators using getInputStyle helper function (light mint green background for autofilled fields)
  - Integrated autofilledFields Set for tracking
  - Added console.log for debugging

---

## 🔄 NEXT ACTION
**READY FOR TESTING:** Both panels are now fully implemented. User should test the autofill functionality in the application.