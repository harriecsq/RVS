# Neuron Design Tokens

**Version:** 1.0  
**Last Updated:** January 24, 2026

## Overview

This file contains centralized design tokens for the Neuron OS design system. It ensures visual consistency across all modules (Projects, Expenses, Billings, Collections, Vouchers, etc.) by providing a single source of truth for colors, typography, spacing, borders, and composite styles.

## Quick Start

```tsx
import { 
  NEURON_COLORS, 
  NEURON_TYPOGRAPHY, 
  NEURON_SPACING,
  NEURON_STYLES 
} from './components/design-system';

// Use pre-composed styles
<div style={NEURON_STYLES.sectionCard}>
  <h3 style={NEURON_STYLES.sectionTitle}>General Information</h3>
</div>

// Or use individual tokens
<div style={{ 
  color: NEURON_COLORS.text.primary,
  fontSize: NEURON_TYPOGRAPHY.fontSize.md 
}}>
  Content here
</div>
```

---

## Core Tokens

### 1. Colors (`NEURON_COLORS`)

#### Primary Brand Colors
```tsx
NEURON_COLORS.primary.deepGreen  // #12332B - Main brand color
NEURON_COLORS.primary.tealGreen  // #0F766E - Accent color
```

#### Text Colors
```tsx
NEURON_COLORS.text.primary       // #12332B - Main text
NEURON_COLORS.text.secondary     // #667085 - Labels, captions
NEURON_COLORS.text.tertiary      // #98A2B3 - Placeholders
NEURON_COLORS.text.link          // #0F766E - Links
```

#### Background Colors
```tsx
NEURON_COLORS.background.primary    // #FFFFFF - Pure white
NEURON_COLORS.background.secondary  // #F9FAFB - Light gray
NEURON_COLORS.background.gradient   // Linear gradient for metadata bars
```

#### Border Colors
```tsx
NEURON_COLORS.border.primary     // #E5E9F0 - Main borders
NEURON_COLORS.border.secondary   // #E5E7EB - Alternative
NEURON_COLORS.border.focus       // #0F766E - Focus states
```

#### Status Colors
```tsx
NEURON_COLORS.status.draft       // #6B7280 - Gray
NEURON_COLORS.status.approved    // #10B981 - Green
NEURON_COLORS.status.cancelled   // #DC2626 - Red
// ... and more
```

### 2. Typography (`NEURON_TYPOGRAPHY`)

#### Font Sizes
```tsx
NEURON_TYPOGRAPHY.fontSize.xs     // 11px - Metadata labels
NEURON_TYPOGRAPHY.fontSize.base   // 13px - Field labels
NEURON_TYPOGRAPHY.fontSize.md     // 14px - Body text, inputs
NEURON_TYPOGRAPHY.fontSize.lg     // 16px - Section titles
NEURON_TYPOGRAPHY.fontSize['2xl'] // 20px - Page titles
```

#### Font Weights
```tsx
NEURON_TYPOGRAPHY.fontWeight.normal    // 400
NEURON_TYPOGRAPHY.fontWeight.medium    // 500
NEURON_TYPOGRAPHY.fontWeight.semibold  // 600
NEURON_TYPOGRAPHY.fontWeight.bold      // 700
```

### 3. Spacing (`NEURON_SPACING`)

```tsx
NEURON_SPACING.xs      // 4px
NEURON_SPACING.sm      // 8px
NEURON_SPACING.md      // 12px
NEURON_SPACING.lg      // 16px
NEURON_SPACING['3xl'] // 32px
NEURON_SPACING['4xl'] // 48px

// Special spacing
NEURON_SPACING.page.horizontal  // 48px - Page side padding
NEURON_SPACING.page.vertical    // 32px - Page top/bottom padding
NEURON_SPACING.component.card   // 32px - Card padding
NEURON_SPACING.component.input  // '10px 12px' - Input padding
```

### 4. Borders (`NEURON_BORDERS`)

```tsx
NEURON_BORDERS.width.thin      // 1px
NEURON_BORDERS.width.medium    // 1.5px

NEURON_BORDERS.radius.md       // 6px
NEURON_BORDERS.radius.lg       // 8px
NEURON_BORDERS.radius.xl       // 12px

// Pre-composed border styles
NEURON_BORDERS.style.default   // '1px solid #E5E9F0'
NEURON_BORDERS.style.focus     // '1px solid #0F766E'
```

### 5. Shadows (`NEURON_SHADOWS`)

```tsx
NEURON_SHADOWS.base  // Card shadow
NEURON_SHADOWS.lg    // Dropdown shadow
```

---

## Composite Styles (`NEURON_STYLES`)

Pre-composed style objects for common UI patterns. These ensure consistency across all detail views.

### Form Elements

#### Field Label
```tsx
<div style={NEURON_STYLES.fieldLabel}>
  Client Name
</div>
```
**Properties:**
- fontSize: 13px
- color: #667085
- marginBottom: 8px
- fontWeight: 500

#### Input Field (Editable)
```tsx
<input 
  type="text"
  value={value}
  onChange={handleChange}
  style={NEURON_STYLES.input}
/>
```
**Properties:**
- padding: 10px 12px
- fontSize: 14px
- color: #12332B
- background: #FFFFFF
- border: 1px solid #E5E7EB
- borderRadius: 8px

#### Read-Only Field
```tsx
<div style={NEURON_STYLES.readOnlyField}>
  {billing.billingNumber}
</div>
```
**Properties:**
- padding: 10px 12px
- fontSize: 14px
- color: #12332B
- background: #F9FAFB
- border: 1px solid #E5E9F0
- borderRadius: 8px

### Cards & Sections

#### Section Card
```tsx
<div style={NEURON_STYLES.sectionCard}>
  {/* Card content */}
</div>
```
**Properties:**
- background: #FFFFFF
- borderRadius: 12px
- padding: 32px
- boxShadow: 0 1px 3px...
- marginBottom: 24px

#### Section Title
```tsx
<h3 style={NEURON_STYLES.sectionTitle}>
  General Information
</h3>
```
**Properties:**
- fontSize: 16px
- fontWeight: 600
- color: #0F766E (Teal Green!)
- marginBottom: 24px

### Page Structure

#### Page Header
```tsx
<div style={NEURON_STYLES.pageHeader}>
  {/* Header content */}
</div>
```

#### Page Title
```tsx
<h1 style={NEURON_STYLES.pageTitle}>
  {billing.billingNumber}
</h1>
```

#### Metadata Bar (Gradient Bar)
```tsx
<div style={NEURON_STYLES.metadataBar}>
  {/* Metadata items */}
</div>
```

#### Metadata Item
```tsx
<div>
  <div style={NEURON_STYLES.metadataLabel}>Total Amount</div>
  <div style={NEURON_STYLES.metadataValue}>₱50,000.00</div>
</div>
```

#### Separator
```tsx
<div style={NEURON_STYLES.separator} />
```

### Layouts

#### 2-Column Grid
```tsx
<div style={NEURON_STYLES.grid2Col}>
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

#### Content Area
```tsx
<div style={NEURON_STYLES.contentArea}>
  <div style={NEURON_STYLES.contentPadding}>
    {/* Content */}
  </div>
</div>
```

---

## Helper Functions

### `getStatusColor(status: string)`
Returns the appropriate color for a given status string.

```tsx
import { getStatusColor } from './components/design-system';

const color = getStatusColor(billing.status); // Returns #10B981 for "Approved"
```

### `mergeStyles(baseStyle, customStyle)`
Merges custom styles with base styles.

```tsx
import { mergeStyles, NEURON_STYLES } from './components/design-system';

<div style={mergeStyles(NEURON_STYLES.sectionCard, { marginTop: '20px' })}>
  Custom styled card
</div>
```

### `createFocusHandlers()`
Returns onFocus/onBlur handlers for inputs with focus styling.

```tsx
import { createFocusHandlers } from './components/design-system';

<input 
  type="text"
  {...createFocusHandlers()}
/>
```

### `createHoverHandlers(hoverColor?)`
Returns onMouseEnter/onMouseLeave handlers for hover effects.

```tsx
import { createHoverHandlers } from './components/design-system';

<button 
  {...createHoverHandlers()}
>
  Hover me
</button>
```

---

## Usage Examples

### Example 1: Detail View Page Structure

```tsx
import { 
  NEURON_STYLES, 
  NEURON_COLORS, 
  NEURON_SPACING 
} from './components/design-system';

export function ViewBillingScreen() {
  return (
    <div style={{ background: '#F9FAFB', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={NEURON_STYLES.pageHeader}>
        <h1 style={NEURON_STYLES.pageTitle}>BIL-2024-001</h1>
      </div>

      {/* Metadata Bar */}
      <div style={NEURON_STYLES.metadataBar}>
        <div>
          <div style={NEURON_STYLES.metadataLabel}>Total Amount</div>
          <div style={NEURON_STYLES.metadataValue}>₱50,000.00</div>
        </div>
        <div style={NEURON_STYLES.separator} />
        <div>
          <div style={NEURON_STYLES.metadataLabel}>Status</div>
          <div style={NEURON_STYLES.metadataValueSmall}>Approved</div>
        </div>
      </div>

      {/* Content */}
      <div style={NEURON_STYLES.contentArea}>
        <div style={NEURON_STYLES.contentPadding}>
          {/* Section */}
          <div style={NEURON_STYLES.sectionCard}>
            <h3 style={NEURON_STYLES.sectionTitle}>General Information</h3>
            
            <div style={NEURON_STYLES.grid2Col}>
              <div>
                <div style={NEURON_STYLES.fieldLabel}>Client Name</div>
                <div style={NEURON_STYLES.readOnlyField}>Acme Corp</div>
              </div>
              
              <div>
                <div style={NEURON_STYLES.fieldLabel}>Billing Date</div>
                <div style={NEURON_STYLES.readOnlyField}>01-15-2024</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Example 2: Form with Edit Mode

```tsx
const [isEditing, setIsEditing] = useState(false);
const [clientName, setClientName] = useState('Acme Corp');

<div style={NEURON_STYLES.sectionCard}>
  <h3 style={NEURON_STYLES.sectionTitle}>General Information</h3>
  
  <div>
    <div style={NEURON_STYLES.fieldLabel}>Client Name</div>
    {isEditing ? (
      <input 
        type="text"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        style={NEURON_STYLES.input}
      />
    ) : (
      <div style={NEURON_STYLES.readOnlyField}>{clientName}</div>
    )}
  </div>
</div>
```

---

## Key Design Principles

1. **Section Titles = Teal Green (#0F766E)** - Not deep green!
2. **Read-only fields have boxes** - Not just plain text
3. **Input padding = 10px 12px** - Not 12px 16px
4. **Field labels = 13px, medium weight** - Not 12px
5. **Label margin-bottom = 8px** - Not 4px
6. **Cards have shadow** - Not just borders
7. **Card padding = 32px** - Not 24px
8. **Borders = 1px solid** - Not 1.5px (except thick borders)

---

## Migration Guide

### Before (Inconsistent)
```tsx
<div style={{ 
  border: "1px solid #E5E7EB", 
  borderRadius: "12px", 
  padding: "24px",
  backgroundColor: "#FFFFFF"
}}>
  <h3 style={{ 
    fontSize: "16px", 
    fontWeight: 600, 
    color: "#12332B",  // ❌ Wrong color!
    marginBottom: "20px" 
  }}>
    General Information
  </h3>
  
  <div>
    <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
      Client Name
    </div>
    <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
      Acme Corp
    </div>
  </div>
</div>
```

### After (With Design Tokens)
```tsx
<div style={NEURON_STYLES.sectionCard}>
  <h3 style={NEURON_STYLES.sectionTitle}>
    General Information
  </h3>
  
  <div>
    <div style={NEURON_STYLES.fieldLabel}>Client Name</div>
    <div style={NEURON_STYLES.readOnlyField}>Acme Corp</div>
  </div>
</div>
```

---

## Notes

- **File Location:** `/components/design-system/neuron-design-tokens.ts`
- **Export:** Available via `/components/design-system/index.ts`
- **TypeScript Support:** Full type safety with `as const` assertions
- **React Support:** All composite styles are typed as `React.CSSProperties`

## Questions?

If you encounter any styling inconsistencies or need additional composite styles, refer to:
- ViewExpenseScreen.tsx (reference implementation)
- This documentation
- The design-system README

---

**Remember:** Always import from the design system, never hardcode values!
