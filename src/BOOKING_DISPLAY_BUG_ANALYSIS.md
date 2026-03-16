# Booking Display Bug - Root Cause Analysis

**Date:** January 23, 2026  
**Issue:** Bookings disappear after remove → save → re-add cycle  
**Component:** ViewBillingScreen - Booking selector

---

## 🐛 **Problem Description**

### User Flow:
1. User opens a billing in edit mode
2. User removes a booking (e.g., "EXP-20260121-Z25")
3. User saves the billing
4. User tries to re-add the same booking
5. **BUG:** The booking doesn't appear in the UI

### Console Output (from screenshot):
```
Current editedBookingIds: ["EXP-20260121-Z25"]
All linkedBookings IDs: [{ "bookingId": "EXP-20260121-Z72" }]
Filtered count: 0
Filtered bookings: []
```

---

## 🔍 **Root Cause Analysis**

### **The Two-State Problem:**

The system uses **TWO separate state variables** to manage bookings:

1. **`editedBookingIds`** (Set<string>)
   - Contains booking IDs the user **wants** to link
   - Updated immediately when user clicks "Add Booking"
   - Line 1413: `setEditedBookingIds(newSet);`

2. **`linkedBookings`** (Booking[])
   - Contains actual booking **objects** fetched from database
   - Only updated after save + refetch
   - Line 285: `setLinkedBookings(result.data);`

### **Display Logic:**

```typescript
// Line 1474-1477
const filtered = linkedBookings.filter(b => {
  const uniqueId = b.bookingId || b.bookingNumber || b.booking_number || b.id;
  return editedBookingIds.has(uniqueId);
});
```

**The filter matches:**
- Bookings in `linkedBookings` array (database source)
- WHERE booking ID exists in `editedBookingIds` Set (user intent)

---

## 💥 **Why It Breaks**

### Scenario Breakdown:

| Step | `editedBookingIds` | `linkedBookings` | Display Result |
|------|-------------------|------------------|----------------|
| **Initial State** | ["Z25", "Z72"] | [Booking Z25, Booking Z72] | ✅ Shows Z25, Z72 |
| **Remove Z25** | ["Z72"] | [Booking Z25, Booking Z72] | ✅ Shows Z72 only |
| **Save** | ["Z72"] | [Booking Z25, Booking Z72] | ✅ Shows Z72 only |
| **Refetch After Save** | ["Z72"] | [Booking Z72] | ✅ Shows Z72 only |
| **Re-add Z25** | ["Z72", "Z25"] | [Booking Z72] | ❌ Shows Z72 only! |

### The Problem:
- After save + refetch, `linkedBookings` **only contains Z72**
- User adds Z25 back to `editedBookingIds`
- But Z25 is **not in linkedBookings** array
- Filter finds **no match** → Z25 doesn't display

---

## 🔧 **Why This Architecture Exists**

### Original Design Intent:
1. `linkedBookings` = "Source of truth" from database
2. `editedBookingIds` = User's edit intentions
3. Display = Intersection of both

### Why It Worked Before:
- As long as bookings weren't removed and saved, `linkedBookings` contained all possible bookings
- User could add/remove from `editedBookingIds` and display worked
- Problem only occurs **after save + refetch** when a booking is permanently removed from `linkedBookings`

---

## 🎯 **Solutions (3 Options)**

### **Option 1: Add to linkedBookings when user clicks "Add Booking"** ⭐ RECOMMENDED
**Approach:** When user adds a booking from dropdown, add the full booking object to `linkedBookings` immediately

**Pros:**
- Maintains current architecture
- Minimal code changes
- No network calls needed
- Works with existing display logic

**Cons:**
- `linkedBookings` becomes a mix of saved + unsaved bookings
- Need to clean up on cancel

**Implementation:**
```typescript
// Line ~1413 - In the dropdown onClick handler
const newSet = new Set(editedBookingIds);
newSet.add(uniqueBookingId);
setEditedBookingIds(newSet);

// ADD THIS:
setLinkedBookings(prev => {
  // Check if booking already exists
  const exists = prev.some(b => {
    const id = b.bookingId || b.bookingNumber || b.booking_number || b.id;
    return id === uniqueBookingId;
  });
  
  // If not exists, add it
  if (!exists) {
    return [...prev, booking];
  }
  return prev;
});

toast.success(`Added ${bookingNum}`);
```

---

### **Option 2: Fetch booking from database when re-adding**
**Approach:** When user adds a booking that's not in `linkedBookings`, fetch it from API

**Pros:**
- Always has fresh data
- `linkedBookings` stays accurate

**Cons:**
- Network call for every add (slower UX)
- More complex logic
- Need loading states

**Implementation:**
```typescript
// Check if booking exists in linkedBookings
const bookingExists = linkedBookings.some(b => {
  const id = b.bookingId || b.bookingNumber || b.booking_number || b.id;
  return id === uniqueBookingId;
});

if (!bookingExists) {
  // Fetch the booking
  const response = await fetch(`${API_URL}/bookings/${uniqueBookingId}`);
  const result = await response.json();
  if (result.success) {
    setLinkedBookings(prev => [...prev, result.data]);
  }
}
```

---

### **Option 3: Change display logic to use allBookings instead**
**Approach:** Display bookings from `allBookings` (dropdown source) instead of `linkedBookings`

**Pros:**
- `allBookings` contains all project bookings
- No need to maintain `linkedBookings` for display

**Cons:**
- Major architectural change
- Need to fetch `allBookings` even in read mode
- Performance impact (loading all bookings)

**Implementation:**
```typescript
const filtered = allBookings.filter(b => {
  const uniqueId = b.bookingId || b.bookingNumber || b.booking_number || b.id;
  return editedBookingIds.has(uniqueId);
});
```

---

## 🎯 **Recommended Solution: Option 1**

### Why Option 1 is Best:
1. **Minimal changes** - Single addition to existing click handler
2. **No network overhead** - Booking object already available in dropdown
3. **Maintains architecture** - Doesn't break existing patterns
4. **Fast UX** - Immediate display, no loading states
5. **Easy to implement** - ~10 lines of code

### What to Change:
1. **Add booking to linkedBookings** when user clicks "Add Booking" in dropdown
2. **Keep existing removal logic** (works fine)
3. **Keep existing save logic** (works fine)
4. **Keep existing display logic** (works fine)

### Edge Cases to Handle:
1. **Cancel button:** Keep `linkedBookings` as is (refetch will fix it)
2. **Duplicate prevention:** Check if booking already in `linkedBookings` before adding
3. **Save:** No changes needed - send `editedBookingIds` as array

---

## 📝 **Code Locations**

| Item | File | Line |
|------|------|------|
| Add Booking Click | ViewBillingScreen.tsx | 1389-1417 |
| Display Logic | ViewBillingScreen.tsx | 1474-1477 |
| linkedBookings State | ViewBillingScreen.tsx | 132 |
| editedBookingIds State | ViewBillingScreen.tsx | 118 |
| fetchLinkedBookings | ViewBillingScreen.tsx | 270-296 |

---

## ✅ **Testing Plan**

After implementing Option 1, test:

1. ✅ Add booking → displays immediately
2. ✅ Remove booking → disappears immediately
3. ✅ Save with removed booking → stays removed
4. ✅ Re-add previously removed booking → displays immediately
5. ✅ Cancel after adding booking → reverts correctly
6. ✅ Multiple add/remove cycles → works correctly
7. ✅ Save with re-added booking → persists correctly

---

## 🚀 **Implementation Steps**

1. Locate the "Add Booking" onClick handler (~line 1389)
2. After `setEditedBookingIds(newSet)`, add logic to update `linkedBookings`
3. Check for duplicates before adding
4. Test all scenarios above
5. Update blueprint documentation

---

**Status:** ✅ IMPLEMENTED  
**Priority:** High (User-blocking bug)  
**Implementation Time:** 15 minutes

---

## ✅ **Implementation Details**

### **Changes Made:**
**File:** `/components/accounting/ViewBillingScreen.tsx`  
**Location:** Line ~1413 (Add Booking click handler)

### **Code Added:**
```typescript
setEditedBookingIds(newSet);

// BUGFIX: Also add the booking object to linkedBookings array
// so it can be displayed immediately (not just the ID)
setLinkedBookings(prev => {
  // Check if booking already exists in linkedBookings
  const exists = prev.some(b => {
    const existingId = b.bookingId || b.bookingNumber || b.booking_number || b.id;
    return existingId === uniqueBookingId;
  });
  
  // If not exists, add the full booking object
  if (!exists) {
    console.log("✅ Adding booking to linkedBookings array:", booking);
    return [...prev, booking];
  }
  
  console.log("ℹ️ Booking already in linkedBookings, skipping add");
  return prev;
});

toast.success(`Added ${bookingNum}`);
```

### **What This Does:**
1. When user clicks a booking in the dropdown, it adds the ID to `editedBookingIds` (existing)
2. **NEW:** It also adds the full booking object to `linkedBookings` array
3. The display filter can now find the booking and show it as a pill
4. Duplicate check prevents adding the same booking twice

### **Why This Works:**
- The booking object is already available in the dropdown (no fetch needed)
- Display logic filters `linkedBookings` by `editedBookingIds`, now both contain the booking
- No architectural changes needed
- Fast and immediate UI update

---

## 🧪 **Testing Results**

Test the following scenarios:

- [ ] Add new booking → displays as pill immediately
- [ ] Remove booking → pill disappears
- [ ] Save with removed booking → stays removed after page refresh
- [ ] Re-add previously removed booking → pill appears immediately ✨ (FIXED)
- [ ] Cancel after adding booking → state resets correctly
- [ ] Multiple add/remove cycles → works correctly
- [ ] Save with newly added booking → persists to database

---

**Fixed By:** Assistant  
**Date:** January 23, 2026  
**Status:** Ready for testing
