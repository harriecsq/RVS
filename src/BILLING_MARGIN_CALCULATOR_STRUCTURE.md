# Billing Margin Calculator Component Structure

> **Documentation for reusable "Add Margin + Calculation Summary" component**  
> **Source:** CreateBillingModal.tsx (lines 2280-2437)  
> **Created:** January 2026  
> **Purpose:** Reference for porting this exact structure to other modules

---

## 📋 Component Overview

This is a **calculator/bottom section** with:
1. **Left side:** Margin input with 3 calculation modes (%, #, Total)
2. **Right side:** Live calculation summary showing total selected, margin applied, and final total
3. **Bottom:** Action buttons (Cancel + Create)

---

## 🎨 Visual Structure

```
┌────────────────────────────────────────────────────────────────┐
│  Calculator/Bottom Section (gray background #F9FAFB)          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────┐  ┌──────────────────────────┐   │
│  │ Add Margin              │  │ Summary Box (white)      │   │
│  │ [% Margin][# Margin]    │  │ Total Selected: PHP 0.00 │   │
│  │ [Total Amount]          │  │ Margin: PHP 0.00         │   │
│  │ [input field...........]│  │ ─────────────────────    │   │
│  └─────────────────────────┘  │ Final Total: PHP 0.00    │   │
│                                └──────────────────────────┘   │
│                                                                │
│                          [Cancel] [Create Billing] ──────────►│
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 State Requirements

### Required State Variables
```typescript
// Margin calculation state
const [marginType, setMarginType] = useState<"percentage" | "amount" | "total">("percentage");
const [marginValue, setMarginValue] = useState("");

// Array of items being billed (for calculation)
const [billingParticulars, setBillingParticulars] = useState<Array<{
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
}>>([]);
```

### Calculation Functions
```typescript
// Calculate total of selected items
const calculateTotalSelected = () => {
  return billingParticulars.reduce((sum, p) => sum + p.amount, 0);
};

// Calculate final total with margin applied
const calculateFinalTotal = () => {
  const selectedTotal = calculateTotalSelected();
  
  if (marginType === "total" && marginValue) {
    return parseFloat(marginValue);
  }
  
  if (marginType === "percentage" && marginValue) {
    const percentage = parseFloat(marginValue);
    return selectedTotal * (1 + percentage / 100);
  }
  
  if (marginType === "amount" && marginValue) {
    return selectedTotal + parseFloat(marginValue);
  }
  
  return selectedTotal;
};

// Usage
const totalSelected = calculateTotalSelected();
const finalTotal = calculateFinalTotal();
```

---

## 💻 Complete JSX Structure

```tsx
{/* Calculator/Bottom Section */}
<div
  style={{
    padding: "24px 32px",
    borderTop: "2px solid #E5E9F0",
    backgroundColor: "#F9FAFB",
  }}
>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "20px" }}>
    {/* Left: Margin Input */}
    <div>
      <label
        style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "8px" }}
      >
        Add Margin
      </label>
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setMarginType("percentage")}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: "14px",
            fontWeight: 500,
            color: marginType === "percentage" ? "white" : "#667085",
            backgroundColor: marginType === "percentage" ? "#0F766E" : "white",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          % Margin
        </button>
        <button
          type="button"
          onClick={() => setMarginType("amount")}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: "14px",
            fontWeight: 500,
            color: marginType === "amount" ? "white" : "#667085",
            backgroundColor: marginType === "amount" ? "#0F766E" : "white",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          # Margin
        </button>
        <button
          type="button"
          onClick={() => setMarginType("total")}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: "14px",
            fontWeight: 500,
            color: marginType === "total" ? "white" : "#667085",
            backgroundColor: marginType === "total" ? "#0F766E" : "white",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Total Amount
        </button>
      </div>
      <input
        type="number"
        value={marginValue}
        onChange={(e) => setMarginValue(e.target.value)}
        placeholder={
          marginType === "percentage" 
            ? "Enter percentage (e.g., 20)" 
            : marginType === "amount"
            ? "Enter amount (e.g., 5000)"
            : "Enter total amount"
        }
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: "14px",
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          color: "#12332B",
        }}
      />
    </div>

    {/* Right: Summary */}
    <div>
      <div style={{ padding: "16px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #E5E9F0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "13px", color: "#667085" }}>Total Selected:</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
            PHP {totalSelected.toFixed(2)}
          </span>
        </div>
        {marginValue && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: "#667085" }}>
              {marginType === "percentage" ? `Margin (${marginValue}%):` : marginType === "amount" ? "Margin:" : ""}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
              {marginType === "total" 
                ? "" 
                : `PHP ${(finalTotal - totalSelected).toFixed(2)}`}
            </span>
          </div>
        )}
        <div style={{ borderTop: "2px solid #E5E9F0", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>Final Billing Total:</span>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#0F766E" }}>
            PHP {finalTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  </div>

  {/* Action Buttons */}
  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
    <button
      type="button"
      onClick={onBack}
      style={{
        padding: "12px 24px",
        fontSize: "14px",
        fontWeight: 500,
        color: "#667085",
        backgroundColor: "white",
        border: "1px solid #E5E9F0",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      style={{
        padding: "12px 24px",
        fontSize: "14px",
        fontWeight: 500,
        color: "white",
        backgroundColor: isSubmitting ? "#98A2B3" : "#0F766E",
        border: "none",
        borderRadius: "8px",
        cursor: isSubmitting ? "not-allowed" : "pointer",
      }}
    >
      {isSubmitting ? "Creating..." : "Create Billing"}
    </button>
  </div>
</div>
```

---

## 🎯 Three Margin Calculation Modes

### 1. **% Margin** (Percentage)
- **User enters:** `20` (means 20%)
- **Calculation:** `finalTotal = totalSelected × (1 + 20/100)`
- **Example:** PHP 10,000 → PHP 12,000 (20% markup)
- **Display:** Shows "Margin (20%): PHP 2,000"

### 2. **# Margin** (Fixed Amount)
- **User enters:** `5000` (adds PHP 5,000)
- **Calculation:** `finalTotal = totalSelected + 5000`
- **Example:** PHP 10,000 → PHP 15,000
- **Display:** Shows "Margin: PHP 5,000"

### 3. **Total Amount** (Target Total)
- **User enters:** `50000` (final total should be exactly 50k)
- **Calculation:** `finalTotal = 50000` (ignores totalSelected)
- **Example:** PHP 10,000 → PHP 50,000
- **Display:** No margin breakdown shown, just final total

---

## 🎨 Design System Values

```typescript
// Colors (Neuron OS Design System)
const colors = {
  deepGreen: "#12332B",      // Primary text, labels
  tealGreen: "#0F766E",      // Active state, final total, primary buttons
  borderGray: "#E5E9F0",     // All borders, dividers
  textGray: "#667085",       // Secondary text, placeholders
  bgGray: "#F9FAFB",         // Background section
  white: "#FFFFFF",          // Buttons, cards
  disabledGray: "#98A2B3",   // Disabled buttons
};

// Spacing
const spacing = {
  sectionPadding: "24px 32px",
  gap: "32px",               // Grid gap
  buttonGap: "12px",         // Between margin type buttons
  summaryPadding: "16px",    // Inside summary card
};

// Typography
const typography = {
  label: { fontSize: "13px", fontWeight: 500 },
  input: { fontSize: "14px" },
  summaryText: { fontSize: "13px" },
  summaryValue: { fontSize: "14px", fontWeight: 600 },
  finalTotal: { fontSize: "18px", fontWeight: 700 },
};
```

---

## 📦 Props Interface (When Extracted as Component)

```typescript
interface MarginCalculatorProps {
  // Data
  items: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
  }>;
  
  // Callbacks
  onCancel: () => void;
  onSubmit: (data: {
    totalSelected: number;
    finalTotal: number;
    marginType: "percentage" | "amount" | "total";
    marginValue: string;
  }) => void;
  
  // Optional
  submitButtonText?: string;
  isSubmitting?: boolean;
  currencySymbol?: string; // Default: "PHP"
}
```

---

## 🔄 How to Port to Another Module

### Step 1: Copy State
```typescript
const [marginType, setMarginType] = useState<"percentage" | "amount" | "total">("percentage");
const [marginValue, setMarginValue] = useState("");
const [items, setItems] = useState<Array<{id: string, amount: number}>>([]);
```

### Step 2: Copy Calculation Functions
```typescript
const calculateTotalSelected = () => items.reduce((sum, p) => sum + p.amount, 0);
const calculateFinalTotal = () => { /* copy logic from above */ };
```

### Step 3: Copy JSX Structure
- Copy the entire `<div>` with `backgroundColor: "#F9FAFB"`
- Update button labels if needed (e.g., "Create Billing" → "Create Invoice")
- Update currency symbol if needed (e.g., "PHP" → "USD")

### Step 4: Wire Up Submit Handler
```typescript
const handleSubmit = () => {
  const finalData = {
    totalSelected: calculateTotalSelected(),
    finalTotal: calculateFinalTotal(),
    marginType,
    marginValue,
  };
  onSubmit(finalData);
};
```

---

## ✅ Testing Scenarios

1. **Empty state:** No items → shows PHP 0.00 everywhere
2. **Percentage mode:** 20% on PHP 10,000 → Final: PHP 12,000
3. **Amount mode:** +PHP 5,000 on PHP 10,000 → Final: PHP 15,000
4. **Total mode:** Set PHP 50,000 → Final: PHP 50,000 (ignores items)
5. **Button states:** Disabled when submitting, active color on selected type

---

## 🚀 Usage in Other Modules

This component is perfect for:
- ✅ **Invoicing Module** - Calculate client invoices with markup
- ✅ **Quotations Module** - Add profit margin to cost estimates
- ✅ **Purchase Orders** - Calculate final amounts with fees
- ✅ **Expenses to Billing** - Convert expense lists to billing amounts
- ✅ **Any financial calculation** needing flexible margin application

---

**End of Documentation**  
*Keep this file for reference when implementing similar calculators in other modules*
