# Design System Migration Checklist

Use this checklist when refactoring detail view screens (ViewBillingScreen, ViewExpenseScreen, ViewCollectionScreen, etc.) to use the new design tokens.

## Pre-Migration

- [ ] Read [DESIGN-TOKENS.md](./DESIGN-TOKENS.md)
- [ ] Review [USAGE-EXAMPLE.tsx](./USAGE-EXAMPLE.tsx)
- [ ] Identify current screen structure
- [ ] Backup current code (git commit)

## Step 1: Import Design Tokens

```tsx
import { 
  NEURON_STYLES, 
  NEURON_COLORS,
  NEURON_SPACING,
  NEURON_BORDERS,
  createHoverHandlers,
  getStatusColor
} from '../design-system';
```

## Step 2: Page Structure

### Header
- [ ] Replace header container with `NEURON_STYLES.pageHeader`
- [ ] Replace page title with `NEURON_STYLES.pageTitle`
- [ ] Replace back button with `NEURON_STYLES.backButton`
- [ ] Use `createHoverHandlers()` for hover effects

**Before:**
```tsx
<div style={{ 
  background: "white",
  borderBottom: "1px solid #E5E9F0",
  padding: "20px 48px"
}}>
  <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#12332B" }}>
    {billing.billingNumber}
  </h1>
</div>
```

**After:**
```tsx
<div style={NEURON_STYLES.pageHeader}>
  <h1 style={NEURON_STYLES.pageTitle}>
    {billing.billingNumber}
  </h1>
</div>
```

### Metadata Bar
- [ ] Replace metadata bar container with `NEURON_STYLES.metadataBar`
- [ ] Replace metadata labels with `NEURON_STYLES.metadataLabel`
- [ ] Replace large values with `NEURON_STYLES.metadataValue`
- [ ] Replace small values with `NEURON_STYLES.metadataValueSmall`
- [ ] Replace separators with `NEURON_STYLES.separator`

**Before:**
```tsx
<div style={{
  background: "linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)",
  borderBottom: "1.5px solid #0F766E",
  padding: "16px 48px"
}}>
  <div>
    <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E" }}>
      Total Amount
    </div>
    <div style={{ fontSize: "20px", fontWeight: 700, color: "#12332B" }}>
      ₱50,000.00
    </div>
  </div>
</div>
```

**After:**
```tsx
<div style={NEURON_STYLES.metadataBar}>
  <div>
    <div style={NEURON_STYLES.metadataLabel}>Total Amount</div>
    <div style={NEURON_STYLES.metadataValue}>₱50,000.00</div>
  </div>
  <div style={NEURON_STYLES.separator} />
  {/* More metadata items... */}
</div>
```

### Content Area
- [ ] Replace content wrapper with `NEURON_STYLES.contentArea`
- [ ] Replace padding with `NEURON_STYLES.contentPadding`

**Before:**
```tsx
<div style={{ padding: "32px 48px" }}>
  {/* Content */}
</div>
```

**After:**
```tsx
<div style={NEURON_STYLES.contentArea}>
  <div style={NEURON_STYLES.contentPadding}>
    {/* Content */}
  </div>
</div>
```

## Step 3: Section Cards

For each section (General Information, Shipment Details, etc.):

### Container
- [ ] Replace section card container with `NEURON_STYLES.sectionCard`

**Before:**
```tsx
<div style={{ 
  border: "1px solid #E5E7EB", 
  borderRadius: "12px", 
  padding: "24px",
  backgroundColor: "#FFFFFF"
}}>
```

**After:**
```tsx
<div style={NEURON_STYLES.sectionCard}>
```

### Title
- [ ] Replace section title with `NEURON_STYLES.sectionTitle`
- [ ] ⚠️ **IMPORTANT:** Color should be TEAL GREEN (#0F766E), not deep green!

**Before:**
```tsx
<h3 style={{ 
  fontSize: "16px", 
  fontWeight: 600, 
  color: "#12332B",  // ❌ WRONG!
  marginBottom: "20px" 
}}>
  General Information
</h3>
```

**After:**
```tsx
<h3 style={NEURON_STYLES.sectionTitle}>
  General Information
</h3>
```

### Grid Layout
- [ ] Replace grid with `NEURON_STYLES.grid2Col`

**Before:**
```tsx
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
```

**After:**
```tsx
<div style={NEURON_STYLES.grid2Col}>
```

## Step 4: Form Fields

For each field in the section:

### Labels
- [ ] Replace field labels with `NEURON_STYLES.fieldLabel`

**Before:**
```tsx
<div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
  Client Name
</div>
```

**After:**
```tsx
<div style={NEURON_STYLES.fieldLabel}>
  Client Name
</div>
```

### Read-Only Fields
- [ ] Replace read-only fields with `NEURON_STYLES.readOnlyField`
- [ ] ⚠️ **IMPORTANT:** Read-only fields should have a box, not just plain text!

**Before:**
```tsx
<div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
  {billing.clientName}
</div>
```

**After:**
```tsx
<div style={NEURON_STYLES.readOnlyField}>
  {billing.clientName}
</div>
```

### Editable Input Fields
- [ ] Replace input fields with `NEURON_STYLES.input`
- [ ] Remove focus/blur handlers (or use `createFocusHandlers()`)

**Before:**
```tsx
<input
  type="text"
  value={clientName}
  onChange={(e) => setClientName(e.target.value)}
  style={{
    width: "100%",
    padding: "12px 16px",  // ❌ Wrong padding!
    fontSize: "14px",
    border: "1.5px solid #E5E9F0",  // ❌ Wrong border!
    borderRadius: "8px",
    color: "#12332B",
    backgroundColor: "white"
  }}
/>
```

**After:**
```tsx
<input
  type="text"
  value={clientName}
  onChange={(e) => setClientName(e.target.value)}
  style={NEURON_STYLES.input}
/>
```

## Step 5: Special Cases

### Status Colors
- [ ] Use `getStatusColor()` for status-based colors

```tsx
// Before
<div style={{ color: billing.status === "Approved" ? "#10B981" : "#667085" }}>
  {billing.status}
</div>

// After
<div style={{ 
  ...NEURON_STYLES.readOnlyField,
  color: getStatusColor(billing.status)
}}>
  {billing.status}
</div>
```

### Linked Vouchers (Teal Color)
- [ ] Use `NEURON_COLORS.text.link` for linked record numbers

```tsx
<div style={{
  ...NEURON_STYLES.readOnlyField,
  color: NEURON_COLORS.text.link
}}>
  {billing.voucherNumber}
</div>
```

### Custom Styles
- [ ] Use `mergeStyles()` for custom additions

```tsx
import { mergeStyles } from '../design-system';

<div style={mergeStyles(NEURON_STYLES.sectionCard, { 
  marginTop: NEURON_SPACING['3xl'] 
})}>
  Custom styled section
</div>
```

## Step 6: Buttons

### Activity Button
- [ ] Replace activity button with composite styles

**Before:**
```tsx
<button
  onClick={() => setShowTimeline(!showTimeline)}
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: showTimeline ? "#E8F2EE" : "white",
    border: `1.5px solid ${showTimeline ? "#0F766E" : "#E5E9F0"}`,
    // ... more styles
  }}
>
  <Clock size={16} />
  Activity
</button>
```

**After:**
```tsx
<button
  onClick={() => setShowTimeline(!showTimeline)}
  style={{
    ...NEURON_STYLES.activityButton,
    ...(showTimeline ? NEURON_STYLES.activityButtonActive : {})
  }}
  {...createHoverHandlers(
    showTimeline ? undefined : NEURON_COLORS.interactive.hover
  )}
>
  <Clock size={16} />
  Activity
</button>
```

### Edit/Save Buttons
- [ ] Continue using `StandardButton` component (already compliant)

## Step 7: Testing

- [ ] Visual comparison with ViewExpenseScreen (reference implementation)
- [ ] Check all field labels (13px, medium weight, 8px margin)
- [ ] Check all section titles (16px, teal green color)
- [ ] Check all read-only fields (have boxes with #F9FAFB background)
- [ ] Check all input fields (10px 12px padding, 1px border)
- [ ] Check card padding (32px, not 24px)
- [ ] Check card shadow (should have subtle shadow)
- [ ] Test edit mode toggle
- [ ] Test responsive behavior

## Common Mistakes to Avoid

❌ **Section titles with deep green** (#12332B) → ✅ Should be teal green (#0F766E)  
❌ **Read-only fields as plain text** → ✅ Should have boxes  
❌ **Input padding 12px 16px** → ✅ Should be 10px 12px  
❌ **Border 1.5px** → ✅ Should be 1px (except thick borders)  
❌ **Label fontSize 12px** → ✅ Should be 13px  
❌ **Label margin 4px** → ✅ Should be 8px  
❌ **Card padding 24px** → ✅ Should be 32px  
❌ **Cards with borders only** → ✅ Should have shadow  

## Completion Checklist

- [ ] All sections use `NEURON_STYLES.sectionCard`
- [ ] All section titles use `NEURON_STYLES.sectionTitle` (teal green!)
- [ ] All field labels use `NEURON_STYLES.fieldLabel`
- [ ] All read-only fields use `NEURON_STYLES.readOnlyField`
- [ ] All input fields use `NEURON_STYLES.input`
- [ ] All grids use `NEURON_STYLES.grid2Col`
- [ ] Header uses `NEURON_STYLES.pageHeader` and `NEURON_STYLES.pageTitle`
- [ ] Metadata bar uses composite metadata styles
- [ ] Content area uses `NEURON_STYLES.contentArea` and padding
- [ ] No hardcoded colors, spacing, or typography values
- [ ] Visual comparison matches ViewExpenseScreen
- [ ] Git commit with clear message

## Final Review

Compare your refactored screen side-by-side with ViewExpenseScreen:
1. Do section titles have the same teal green color?
2. Do read-only fields have the same styled boxes?
3. Do input fields have the same padding and borders?
4. Do field labels have the same size and weight?
5. Do cards have the same shadow and padding?

If all answers are YES, you're done! ✅

---

**Reference Files:**
- [DESIGN-TOKENS.md](./DESIGN-TOKENS.md) - Complete token reference
- [USAGE-EXAMPLE.tsx](./USAGE-EXAMPLE.tsx) - Working example
- `/components/accounting/ViewExpenseScreen.tsx` - Reference implementation
