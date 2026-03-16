# Neuron Design System - Quick Reference Card

**Keep this open while coding!** 📌

## Import Statement

```tsx
import { 
  NEURON_STYLES, 
  NEURON_COLORS, 
  NEURON_SPACING 
} from '../design-system';
```

---

## 🎨 Common Patterns (Copy & Paste)

### Section Card
```tsx
<div style={NEURON_STYLES.sectionCard}>
  <h3 style={NEURON_STYLES.sectionTitle}>Section Title</h3>
  <div style={NEURON_STYLES.grid2Col}>
    {/* Fields go here */}
  </div>
</div>
```

### Form Field (Read-Only)
```tsx
<div>
  <div style={NEURON_STYLES.fieldLabel}>Field Label</div>
  <div style={NEURON_STYLES.readOnlyField}>{value}</div>
</div>
```

### Form Field (Editable)
```tsx
<div>
  <div style={NEURON_STYLES.fieldLabel}>Field Label</div>
  {isEditing ? (
    <input 
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={NEURON_STYLES.input}
    />
  ) : (
    <div style={NEURON_STYLES.readOnlyField}>{value}</div>
  )}
</div>
```

### Page Structure
```tsx
<div style={{ background: '#F9FAFB', height: '100%', overflow: 'hidden' }}>
  {/* Header */}
  <div style={NEURON_STYLES.pageHeader}>
    <h1 style={NEURON_STYLES.pageTitle}>Page Title</h1>
  </div>

  {/* Metadata Bar */}
  <div style={NEURON_STYLES.metadataBar}>
    <div>
      <div style={NEURON_STYLES.metadataLabel}>LABEL</div>
      <div style={NEURON_STYLES.metadataValue}>Value</div>
    </div>
    <div style={NEURON_STYLES.separator} />
    {/* More metadata items */}
  </div>

  {/* Content */}
  <div style={NEURON_STYLES.contentArea}>
    <div style={NEURON_STYLES.contentPadding}>
      {/* Sections go here */}
    </div>
  </div>
</div>
```

---

## 📏 Key Values (Memorize These!)

| Element | Property | Value |
|---------|----------|-------|
| **Section Title** | color | `#0F766E` (TEAL!) |
| **Section Title** | fontSize | `16px` |
| **Field Label** | fontSize | `13px` |
| **Field Label** | marginBottom | `8px` |
| **Field Label** | fontWeight | `500` |
| **Input/Read-only** | padding | `10px 12px` |
| **Input/Read-only** | fontSize | `14px` |
| **Input** | border | `1px solid #E5E7EB` |
| **Read-only** | background | `#F9FAFB` |
| **Read-only** | border | `1px solid #E5E9F0` |
| **Card** | padding | `32px` |
| **Card** | borderRadius | `12px` |
| **Grid Gap** | gap | `20px` |
| **Section Margin** | marginBottom | `24px` |

---

## 🎯 The 5 Golden Rules

1. **Section titles = Teal Green** (`#0F766E`)
2. **Read-only fields = Styled boxes** (not plain text!)
3. **Input padding = 10px 12px** (not 12px 16px)
4. **Label fontSize = 13px** (not 12px)
5. **Card padding = 32px** (not 24px)

---

## 🚫 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| `color: "#12332B"` for section title | `color: "#0F766E"` |
| Plain text for read-only fields | `style={NEURON_STYLES.readOnlyField}` |
| `padding: "12px 16px"` | `padding: "10px 12px"` |
| `fontSize: "12px"` for labels | `fontSize: "13px"` |
| `marginBottom: "4px"` for labels | `marginBottom: "8px"` |
| `padding: "24px"` for cards | `padding: "32px"` |
| Cards without shadow | `boxShadow: NEURON_SHADOWS.base` |
| `border: "1.5px solid"` | `border: "1px solid"` |

---

## 🎨 Color Cheat Sheet

```tsx
// Primary Colors
NEURON_COLORS.primary.deepGreen   // #12332B (main text, titles)
NEURON_COLORS.primary.tealGreen   // #0F766E (section titles, links)

// Text Colors
NEURON_COLORS.text.primary        // #12332B (main text)
NEURON_COLORS.text.secondary      // #667085 (labels, captions)
NEURON_COLORS.text.link           // #0F766E (linked records)

// Background Colors
NEURON_COLORS.background.primary    // #FFFFFF (white)
NEURON_COLORS.background.secondary  // #F9FAFB (light gray)
NEURON_COLORS.background.gradient   // Metadata bar gradient

// Border Colors
NEURON_COLORS.border.primary      // #E5E9F0 (main borders)
NEURON_COLORS.border.secondary    // #E5E7EB (input borders)

// Status Colors
NEURON_COLORS.status.approved     // #10B981 (green)
NEURON_COLORS.status.draft        // #6B7280 (gray)
NEURON_COLORS.status.cancelled    // #DC2626 (red)
```

---

## 📦 Pre-Composed Styles

Copy these **exactly as shown**:

```tsx
// Page Structure
NEURON_STYLES.pageHeader
NEURON_STYLES.pageTitle
NEURON_STYLES.metadataBar
NEURON_STYLES.metadataLabel
NEURON_STYLES.metadataValue
NEURON_STYLES.metadataValueSmall
NEURON_STYLES.separator
NEURON_STYLES.contentArea
NEURON_STYLES.contentPadding

// Sections
NEURON_STYLES.sectionCard
NEURON_STYLES.sectionTitle
NEURON_STYLES.grid2Col

// Form Elements
NEURON_STYLES.fieldLabel
NEURON_STYLES.input
NEURON_STYLES.readOnlyField

// Buttons
NEURON_STYLES.backButton
NEURON_STYLES.activityButton
NEURON_STYLES.activityButtonActive
```

---

## 🔍 Quick Validation

Before committing, check these:

✅ All section titles are **teal green** (#0F766E)  
✅ All read-only fields have **styled boxes**  
✅ All input fields have **10px 12px padding**  
✅ All field labels are **13px with 8px margin**  
✅ All cards have **32px padding**  
✅ All cards have **shadow** (not just borders)  
✅ No hardcoded colors/spacing in your code  
✅ Visual match with ViewExpenseScreen  

---

## 🆘 When in Doubt

1. Open [DESIGN-TOKENS.md](./DESIGN-TOKENS.md)
2. Check [USAGE-EXAMPLE.tsx](./USAGE-EXAMPLE.tsx)
3. Compare with ViewExpenseScreen.tsx
4. Use this quick reference!

---

**Last Updated:** January 24, 2026  
**Version:** 1.0
