# Phase 4: Make Export Details Editable - Implementation Plan

**Status:** In Progress  
**Started:** January 22, 2026

---

## Fields to Make Editable:

1. ✅ Client/Shipper (text input)
2. ⏳ Vessel/Voyage (text input)
3. ⏳ Destination (text input)
4. ⏳ Commodity (text input)
5. ⏳ Exchange Rate (number input)
6. ⏳ Loading Address (textarea)
7. ⏳ Container Numbers (chip input - add/remove)

---

## Implementation Strategy:

### Step 1: Make text fields editable (Client/Shipper, Vessel/Voyage, Destination, Commodity)
- Add conditional rendering based on `isEditing`
- If editing: show `<input>` with value from `editedExpense`
- If viewing: show read-only div with value from `expense`
- Wire onChange handlers to update `editedExpense` state

### Step 2: Make Exchange Rate editable (number input)
- Use `type="number"` input
- Handle numeric validation

### Step 3: Make Loading Address editable (textarea)
- Use `<textarea>` for multi-line input
- Maintain Neuron styling

### Step 4: Make Container Numbers editable (chip input)
- Show existing containers as removable chips
- Add input to add new container numbers
- Wire up add/remove functionality

---

## Current Implementation:

Working on Step 1...

