# 🎨 NEURON OS - TOP INFO BAR DESIGN BLUEPRINT

**Document Version:** 2.0  
**Last Updated:** January 26, 2026  
**Status:** ✅ Production Standard  
**Applies To:** All Detail/View Screens System-Wide

---

## 📋 OVERVIEW

This blueprint defines the **standardized top metadata/summary bar** used across all Neuron OS detail screens (Bookings, Expenses, Vouchers, Billings, etc.). This bar sits directly below the header and displays key record information with **dynamic status-based gradient backgrounds**.

---

## 🎨 DESIGN SPECIFICATIONS

### **Container Styling**

```tsx
<div style={{
  background: "linear-gradient(135deg, [START_COLOR] 0%, [END_COLOR] 100%)", // Dynamic based on status
  borderBottom: "1.5px solid #0F766E",
  padding: "16px 48px",
  display: "flex",
  alignItems: "center",
  gap: "32px",
  flexShrink: 0
}}>
```

### **Status-Based Gradient Colors**

| Status | Start Color | End Color | Visual Example |
|--------|-------------|-----------|----------------|
| **Draft** | `#F3F4F6` | `#E5E7EB` | Light Gray Gradient |
| **For Approval** | `#FEF3C7` | `#FDE68A` | Yellow/Amber Gradient |
| **Approved** | `#DBEAFE` | `#BFDBFE` | Light Blue Gradient |
| **Paid** | `#E8F5E9` | `#E0F2F1` | Green/Teal Gradient |
| **Cancelled** | `#FEE2E2` | `#FECACA` | Light Red Gradient |

### **Complete Gradient Mapping Code**

```tsx
// Define status-based gradients
const getStatusGradient = (status: string) => {
  switch (status) {
    case "Draft":
      return "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)"; // Gray
    case "For Approval":
      return "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)"; // Yellow
    case "Approved":
      return "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)"; // Blue
    case "Paid":
      return "linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)"; // Green
    case "Cancelled":
      return "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)"; // Red
    default:
      return "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)"; // Default Gray
  }
};

// Apply to container
<div style={{
  background: getStatusGradient(record.status),
  borderBottom: "1.5px solid #0F766E",
  padding: "16px 48px",
  display: "flex",
  alignItems: "center",
  gap: "32px",
  flexShrink: 0
}}>
```

---

## 📊 LAYOUT STRUCTURE

### **4-Section Layout (Standard)**

```
┌──────────────────────────────────────────────────────────────────────┐
│  AMOUNT FIELD  │  STATUS DROPDOWN  │  PRIMARY DATE  │  CREATED DATE  │
└──────────────────────────────────────────────────────────────────────┘
```

**Visual Separators:** Thin vertical lines (`1px × 40px`, `#0F766E` at 20% opacity) between each section.

### **Section 1: Total Amount (or Primary Metric)**

```tsx
<div>
  <div style={{ 
    fontSize: "11px", 
    fontWeight: 600, 
    color: "#0F766E", 
    textTransform: "uppercase", 
    letterSpacing: "0.5px", 
    marginBottom: "2px" 
  }}>
    Total Amount
  </div>
  <div style={{ fontSize: "20px", fontWeight: 700, color: "#12332B" }}>
    ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </div>
</div>
```

**Adaptations by Module:**
- **Vouchers:** `Total Amount` → `voucher.amount`
- **Expenses:** `Grand Total` → calculated from line items
- **Billings:** `Total Amount` → `billing.totalAmount`
- **Bookings:** `Revenue` → calculated metric

---

### **Section 2: Status Dropdown (Interactive)**

```tsx
<div style={{ position: "relative" }}>
  <div style={{ 
    fontSize: "11px", 
    fontWeight: 600, 
    color: "#0F766E", 
    textTransform: "uppercase", 
    letterSpacing: "0.5px", 
    marginBottom: "2px" 
  }}>
    Status
  </div>
  
  {/* Status Dropdown Trigger */}
  <div
    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
    onBlur={() => setTimeout(() => setShowStatusDropdown(false), 200)}
    tabIndex={0}
    style={{
      fontSize: "14px",
      fontWeight: 600,
      color: getStatusColor(record.status), // Dynamic color
      cursor: "pointer",
      padding: "4px 24px 4px 8px",
      borderRadius: "6px",
      border: "1.5px solid transparent",
      position: "relative",
      transition: "all 0.2s ease",
      background: showStatusDropdown ? "#FFFFFF" : "transparent"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "#FFFFFF";
      e.currentTarget.style.borderColor = "#0F766E";
    }}
    onMouseLeave={(e) => {
      if (!showStatusDropdown) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }
    }}
  >
    {record.status}
    
    {/* Dropdown Arrow */}
    <div style={{
      position: "absolute",
      right: "6px",
      top: "50%",
      transform: `translateY(-50%) ${showStatusDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
      transition: "transform 0.2s ease",
      pointerEvents: "none",
      color: "#0F766E"
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  </div>

  {/* Status Dropdown Menu */}
  {showStatusDropdown && (
    <div style={{
      position: "absolute",
      top: "calc(100% + 4px)",
      left: 0,
      background: "white",
      border: "1.5px solid #E5E7EB",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      zIndex: 50,
      minWidth: "160px",
      overflow: "hidden"
    }}>
      {statusOptions.map((status, index) => (
        <div
          key={status}
          onClick={() => handleStatusChange(status)}
          style={{
            padding: "10px 14px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            color: status === record.status ? "#0F766E" : "#12332B",
            background: status === record.status ? "#F0FDF4" : "transparent",
            borderBottom: index < statusOptions.length - 1 ? "1px solid #F3F4F6" : "none",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            if (status !== record.status) {
              e.currentTarget.style.background = "#F9FAFB";
            }
          }}
          onMouseLeave={(e) => {
            if (status !== record.status) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          {status}
        </div>
      ))}
    </div>
  )}
</div>
```

**Status Color Mapping:**

```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case "Draft":
      return "#6B7280"; // Gray
    case "For Approval":
      return "#F59E0B"; // Amber/Yellow
    case "Approved":
      return "#3B82F6"; // Blue
    case "Paid":
      return "#10B981"; // Green
    case "Cancelled":
      return "#EF4444"; // Red
    default:
      return "#667085"; // Default Gray
  }
};
```

---

### **Section 3: Primary Date Field**

```tsx
<div>
  <div style={{ 
    fontSize: "11px", 
    fontWeight: 600, 
    color: "#0F766E", 
    textTransform: "uppercase", 
    letterSpacing: "0.5px", 
    marginBottom: "2px" 
  }}>
    Voucher Date {/* Adapt label per module */}
  </div>
  <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
    {formatDate(record.primaryDate)}
  </div>
</div>
```

**Adaptations by Module:**
- **Vouchers:** `Voucher Date` → `voucher.voucherDate`
- **Expenses:** `Expense Date` → `expense.expenseDate`
- **Billings:** `Billing Date` → `billing.billingDate`
- **Bookings:** `Booking Date` → `booking.bookingDate`

---

### **Section 4: Created Date**

```tsx
<div>
  <div style={{ 
    fontSize: "11px", 
    fontWeight: 600, 
    color: "#0F766E", 
    textTransform: "uppercase", 
    letterSpacing: "0.5px", 
    marginBottom: "2px" 
  }}>
    Created
  </div>
  <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
    {formatDate(record.created_at)}
  </div>
</div>
```

---

### **Vertical Separators**

```tsx
<div style={{ 
  width: "1px", 
  height: "40px", 
  background: "#0F766E", 
  opacity: 0.2 
}} />
```

Place between each section (3 total separators for 4 sections).

---

## 🔧 IMPLEMENTATION REQUIREMENTS

### **1. State Management**

```tsx
const [showStatusDropdown, setShowStatusDropdown] = useState(false);
```

### **2. Status Update Handler**

```tsx
const handleStatusChange = async (newStatus: StatusType) => {
  if (!record) return;
  
  try {
    const response = await fetch(`${API_URL}/[resource]/${recordId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      throw new Error("Failed to update status");
    }

    const result = await response.json();
    if (result.success && result.data) {
      setRecord(result.data);
      setEditedRecord(result.data);
      setShowStatusDropdown(false);
      toast.success(`Status updated to ${newStatus}`);
    }
  } catch (error) {
    console.error("Error updating status:", error);
    toast.error("Failed to update status");
  }
};
```

### **3. Date Formatting Utility**

```tsx
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
```

### **4. Placement in Component Tree**

```tsx
{/* Header */}
<div style={{ ... }}>
  {/* Back button, title, actions */}
</div>

{/* INFO BAR - Insert here */}
<div style={{ background: getStatusGradient(record.status), ... }}>
  {/* 4 sections */}
</div>

{/* Main Content */}
<div style={{ padding: "32px 48px", ... }}>
  {/* Form fields, details, etc. */}
</div>
```

---

## 📋 MODULE-SPECIFIC STATUS OPTIONS

### **Vouchers**
```tsx
const voucherStatuses: VoucherStatus[] = ["Draft", "For Approval", "Approved", "Paid", "Cancelled"];
```

### **Expenses**
```tsx
const expenseStatuses: ExpenseStatus[] = ["Draft", "For Approval", "Approved", "Paid", "Cancelled"];
```

### **Billings**
```tsx
const billingStatuses: BillingStatus[] = ["Draft", "For Approval", "Approved", "Paid", "Cancelled"];
```

### **Bookings**
```tsx
const bookingStatuses: BookingStatus[] = ["Draft", "Confirmed", "In Progress", "Completed", "Cancelled"];
```

---

## 🎨 COMPLETE IMPLEMENTATION EXAMPLE (VOUCHERS)

```tsx
{/* Metadata/Summary Bar */}
<div style={{
  background: (() => {
    switch (voucher.status) {
      case "Draft": return "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)";
      case "For Approval": return "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)";
      case "Approved": return "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)";
      case "Paid": return "linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)";
      case "Cancelled": return "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)";
      default: return "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)";
    }
  })(),
  borderBottom: "1.5px solid #0F766E",
  padding: "16px 48px",
  display: "flex",
  alignItems: "center",
  gap: "32px",
  flexShrink: 0
}}>
  {/* Total Amount */}
  <div>
    <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
      Total Amount
    </div>
    <div style={{ fontSize: "20px", fontWeight: 700, color: "#12332B" }}>
      ₱{voucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  </div>

  {/* Separator */}
  <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

  {/* Status Dropdown - Full implementation from Section 2 above */}
  
  {/* Separator */}
  <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

  {/* Voucher Date */}
  <div>
    <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
      Voucher Date
    </div>
    <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
      {formatDate(voucher.voucherDate)}
    </div>
  </div>

  {/* Separator */}
  <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

  {/* Created Date */}
  <div>
    <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
      Created
    </div>
    <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
      {formatDate(voucher.created_at)}
    </div>
  </div>
</div>
```

---

## 🔄 COPY-PASTE CHECKLIST

When implementing this in a new module:

- [ ] Replace `record` with module-specific variable (voucher, expense, billing, etc.)
- [ ] Update status options array with module-specific statuses
- [ ] Adapt amount field label and data source
- [ ] Adapt primary date field label and data source
- [ ] Update API endpoint in `handleStatusChange`
- [ ] Ensure `formatDate()` utility exists
- [ ] Add `showStatusDropdown` state
- [ ] Import `toast` from sonner
- [ ] Verify status color mappings match your module's workflow
- [ ] Test dropdown interaction and status updates
- [ ] Verify gradient changes on status update

---

## 📐 TYPOGRAPHY REFERENCE

| Element | Font Size | Font Weight | Color | Transform |
|---------|-----------|-------------|-------|-----------|
| **Labels** | 11px | 600 | #0F766E | UPPERCASE |
| **Amount** | 20px | 700 | #12332B | — |
| **Status** | 14px | 600 | Dynamic | — |
| **Dates** | 14px | 600 | #12332B | — |
| **Dropdown Items** | 14px | 500 | #12332B | — |

---

## 🎯 DESIGN PRINCIPLES

1. **Status-Driven Design:** Background gradient changes based on record status
2. **Visual Hierarchy:** Large bold amounts, medium-weight status/dates
3. **Teal Green System:** All accents use `#0F766E` (labels, borders, separators)
4. **Interactive Feedback:** Hover states, rotation animations, smooth transitions
5. **Consistent Spacing:** 32px gaps, 48px horizontal padding
6. **Accessibility:** Tabindex, hover states, focus management

---

## 📦 FILES ALREADY USING THIS PATTERN

- ✅ `/components/accounting/ViewExpenseScreen.tsx` (Original implementation)
- ✅ `/components/accounting/ViewVoucherScreen.tsx` (With dynamic gradients v2.0 - **PRODUCTION COMPLETE**)

---

## 🚀 ROLLOUT PLAN

**Next modules to implement:**

1. ViewBillingScreen.tsx
2. ViewBookingDetailScreen.tsx  
3. ViewRevenueScreen.tsx (if exists)
4. ViewPaymentScreen.tsx (if exists)

**Implementation Note:** Copy the complete gradient switch statement and status color mapping from `/components/accounting/ViewVoucherScreen.tsx` (lines 360-374 for gradient, lines 410-414 for status text color).

---

**Blueprint Status:** ✅ **PRODUCTION READY**  
**Last Verified:** January 26, 2026  
**Maintained By:** Neuron OS Design System Team