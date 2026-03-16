# Neuron OS Design System

A comprehensive design system for Neuron OS, ensuring visual consistency and exceptional user experience across all modules.

## 📚 Documentation

- **[Design Tokens](./DESIGN-TOKENS.md)** - Complete reference for colors, typography, spacing, and composite styles
- **[Quick Reference Card](./QUICK-REFERENCE.md)** - Quick copy-paste patterns and key values (keep this open!)
- **[Migration Checklist](./MIGRATION-CHECKLIST.md)** - Step-by-step guide for refactoring existing screens
- **[Usage Example](./USAGE-EXAMPLE.tsx)** - Working example of a detail view screen
- **Component Documentation** - See individual component sections below

## Quick Links

- [Quick Reference Card](./QUICK-REFERENCE.md) ⭐ **Most Useful!**
- [Design Tokens & Composite Styles](./DESIGN-TOKENS.md)
- [Migration Guide](./MIGRATION-CHECKLIST.md)
- [Usage Example](./USAGE-EXAMPLE.tsx)
- [Core Components](#core-components)

## Design Principles

### 1. **Visual Consistency**
- **Colors**: Deep green (#12332B), Teal green (#0F766E), Pure white backgrounds
- **Borders**: Stroke borders instead of shadows
- **Spacing**: Consistent padding (32px 48px for main containers)
- **Typography**: Clear hierarchy with consistent font sizes and weights

### 2. **Component Reusability**
- All components are modular and reusable
- Single source of truth for styling
- Easy to maintain and update

### 3. **Accessibility First**
- Proper focus states
- Color contrast compliance
- Keyboard navigation support
- Screen reader friendly

## Core Components

### Buttons

#### StandardButton
Primary button component with consistent styling and hover states.

**Props:**
- `label`: string - Button text
- `onClick`: () => void - Click handler
- `color`: 'primary' | 'secondary' | 'danger' - Color variant
- `size`: 'small' | 'medium' | 'large' - Button size
- `disabled`: boolean - Disabled state
- `icon`: ReactNode - Optional icon

**Usage:**
```tsx
import { StandardButton } from '../components/design-system';

<StandardButton
  label="Create New"
  onClick={handleCreate}
  color="primary"
  size="medium"
/>
```

### Tabs

#### StandardTabs
Consistent tab navigation with support for counts and custom colors.

**Props:**
- `activeTab`: string - Currently active tab value
- `onTabChange`: (tab: string) => void - Tab change handler
- `tabs`: Array<{ value: string, label: string, count?: number, color?: string }> - Tab configuration

**Usage:**
```tsx
import { StandardTabs } from '../components/design-system';

<StandardTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
  tabs={[
    { value: 'all', label: 'All Projects', count: 10, color: 'primary' },
    { value: 'active', label: 'Active', count: 5, color: 'warning' }
  ]}
/>
```

### Cards & Containers

#### StandardCard
Consistent card component for displaying content.

**Props:**
- `title`: string - Card title
- `subtitle`?: string - Optional subtitle
- `children`: ReactNode - Card content
- `actions`?: ReactNode - Optional action buttons
- `noPadding`: boolean - Remove default padding

#### StandardModal
Standardized modal dialog.

**Props:**
- `open`: boolean - Modal visibility
- `onClose`: () => void - Close handler
- `title`: string - Modal title
- `subtitle`?: string - Optional subtitle
- `children`: ReactNode - Modal content
- `footer`?: ReactNode - Optional footer content
- `size`: 'small' | 'medium' | 'large' - Modal size

#### StandardSidePanel
Consistent side panel for detail views.

**Props:**
- `open`: boolean - Panel visibility
- `onClose`: () => void - Close handler
- `title`: string - Panel title
- `subtitle`?: string - Optional subtitle
- `children`: ReactNode - Panel content
- `width`: string - Panel width (default: '800px')

### Form Components

#### StandardInput
Text input with consistent styling, labels, and error states.

**Props:**
- `label`?: string - Input label
- `value`: string | number - Input value
- `onChange`: (value: string) => void - Change handler
- `type`: 'text' | 'number' | 'email' | 'password' - Input type
- `placeholder`?: string - Placeholder text
- `required`: boolean - Required field
- `disabled`: boolean - Disabled state
- `error`?: string - Error message
- `helperText`?: string - Helper text
- `icon`?: ReactNode - Optional icon

**Usage:**
```tsx
import { StandardInput } from '../components/design-system';

<StandardInput
  label="Customer Name"
  value={name}
  onChange={setName}
  placeholder="Enter customer name"
  required
/>
```

#### StandardTextarea
Multi-line text input with consistent styling.

**Props:**
- `label`?: string - Textarea label
- `value`: string - Textarea value
- `onChange`: (value: string) => void - Change handler
- `placeholder`?: string - Placeholder text
- `required`: boolean - Required field
- `disabled`: boolean - Disabled state
- `error`?: string - Error message
- `helperText`?: string - Helper text
- `rows`: number - Number of rows

#### StandardSelect
Dropdown select with consistent styling.

**Props:**
- `label`?: string - Select label
- `value`: string - Selected value
- `onChange`: (value: string) => void - Change handler
- `options`: Array<{ value: string, label: string }> - Options
- `placeholder`?: string - Placeholder text
- `required`: boolean - Required field
- `disabled`: boolean - Disabled state
- `error`?: string - Error message
- `helperText`?: string - Helper text
- `icon`?: ReactNode - Optional icon

#### StandardDatePicker
Date input with calendar icon.

**Props:**
- `label`?: string - Date picker label
- `value`: string - Date value (YYYY-MM-DD)
- `onChange`: (value: string) => void - Change handler
- `placeholder`?: string - Placeholder text
- `required`: boolean - Required field
- `disabled`: boolean - Disabled state
- `error`?: string - Error message
- `helperText`?: string - Helper text
- `min`?: string - Minimum date
- `max`?: string - Maximum date

### Search & Filter

#### StandardSearchInput
Consistent search input with search icon.

**Props:**
- `value`: string - Search value
- `onChange`: (value: string) => void - Change handler
- `placeholder`?: string - Placeholder text
- `disabled`: boolean - Disabled state

**Usage:**
```tsx
import { StandardSearchInput } from '../components/design-system';

<StandardSearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search projects..."
/>
```

#### StandardFilterDropdown
Consistent dropdown filter.

**Props:**
- `value`: string - Selected value
- `onChange`: (value: string) => void - Change handler
- `options`: Array<{ value: string, label: string }> - Filter options
- `placeholder`?: string - Placeholder text
- `disabled`: boolean - Disabled state

### Feedback Components

#### StandardBadge
Badge component for counts and labels.

**Props:**
- `children`: ReactNode - Badge content
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral' - Color variant
- `size`: 'sm' | 'md' - Badge size

**Usage:**
```tsx
import { StandardBadge } from '../components/design-system';

<StandardBadge variant="success" size="sm">
  5
</StandardBadge>
```

#### StandardEmptyState
Empty state component for when there's no data.

**Props:**
- `icon`?: ReactNode - Optional icon
- `title`: string - Empty state title
- `description`?: string - Optional description
- `action`?: { label: string, onClick: () => void } - Optional action button

**Usage:**
```tsx
import { StandardEmptyState } from '../components/design-system';
import { Package } from 'lucide-react';

<StandardEmptyState
  icon={<Package size={48} />}
  title="No Projects Yet"
  description="Create your first project to get started"
  action={{ label: 'Create Project', onClick: handleCreate }}
/>
```

#### StandardLoadingState
Loading state component with spinner.

**Props:**
- `message`?: string - Loading message (default: 'Loading...')

**Usage:**
```tsx
import { StandardLoadingState } from '../components/design-system';

<StandardLoadingState message="Loading projects..." />
```

## Design Tokens

All design tokens are defined in `/styles/globals.css`:

### Colors
```css
--neuron-forest: #12332B;
--neuron-teal: #0F766E;
--neuron-ui-border: #E5E7EB;
--neuron-ink-primary: #12332B;
--neuron-ink-secondary: #6B7280;
--neuron-ink-muted: #9CA3AF;
--neuron-state-selected: #F3F4F6;
--neuron-semantic-success: #10B981;
--neuron-semantic-warn: #F59E0B;
--neuron-semantic-danger: #EF4444;
--neuron-brand-green-100: #D1FAE5;
```

### Spacing
```css
--neuron-spacing-xs: 4px;
--neuron-spacing-sm: 8px;
--neuron-spacing-md: 12px;
--neuron-spacing-lg: 16px;
--neuron-spacing-xl: 24px;
--neuron-spacing-2xl: 32px;
--neuron-spacing-3xl: 48px;
```

### Border Radius
```css
--neuron-radius-s: 6px;
--neuron-radius-m: 8px;
--neuron-radius-l: 12px;
--neuron-radius-xl: 16px;
```

### Typography
```css
--neuron-font-size-xs: 11px;
--neuron-font-size-sm: 12px;
--neuron-font-size-base: 13px;
--neuron-font-size-md: 14px;
--neuron-font-size-lg: 16px;
--neuron-font-size-xl: 20px;
--neuron-font-size-2xl: 24px;
--neuron-font-size-3xl: 32px;
```

## Best Practices

### 1. Always Use Design System Components
- Never create one-off styled elements
- Use design system components for consistency
- If a component doesn't exist, add it to the design system

### 2. Follow Naming Conventions
- Use Standard prefix for all design system components
- Use descriptive names (StandardButton, not Button)
- Keep component files in /components/design-system/

### 3. Maintain Consistency
- Use design tokens instead of hardcoded values
- Follow the established color palette
- Use consistent spacing (32px 48px for main containers)

### 4. Test for Accessibility
- Ensure proper keyboard navigation
- Check color contrast ratios
- Test with screen readers
- Add proper ARIA labels

### 5. Document Everything
- Add JSDoc comments to all props
- Include usage examples
- Update this README when adding new components

## Migration Guide

To migrate existing components to the design system:

1. **Identify inconsistent styling**
   - Look for inline styles
   - Check for hardcoded colors, spacing, borders
   - Find duplicate implementations

2. **Replace with design system components**
   ```tsx
   // Before
   <input
     style={{
       padding: '10px 12px',
       border: '1px solid #E5E7EB',
       borderRadius: '8px'
     }}
   />

   // After
   <StandardInput
     value={value}
     onChange={setValue}
     placeholder="Enter value"
   />
   ```

3. **Use design tokens for custom styling**
   ```tsx
   // Before
   style={{ color: '#12332B', fontSize: '14px' }}

   // After
   style={{ color: 'var(--neuron-ink-primary)', fontSize: 'var(--neuron-font-size-md)' }}
   ```

4. **Update imports**
   ```tsx
   import {
     StandardButton,
     StandardInput,
     StandardTabs
   } from '../components/design-system';
   ```

## Future Enhancements

- [ ] Dark mode support
- [ ] Animation library integration
- [ ] Form validation system
- [ ] Toast notification system
- [ ] Data table component
- [ ] File upload component
- [ ] Multi-select component
- [ ] Date range picker
- [ ] Time picker
- [ ] Color picker
- [ ] Rich text editor
- [ ] Chart components

## Support

For questions or suggestions about the design system, please reach out to the development team.