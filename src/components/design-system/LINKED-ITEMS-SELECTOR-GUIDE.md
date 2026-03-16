# LinkedItemsSelector - Design Pattern Guide

## Overview

Clean, minimal design pattern for displaying and managing linked items (Projects, Bookings, Expenses, etc.). This is the standardized Neuron OS pattern for entity linking across all modules.

## Design Principles

- **Simple gray headers** - 13px, #667085, medium weight
- **Light gray cards** - #F9FAFB background, #E5E7EB border
- **No fancy styling** - No shadows, no colored borders, no badges
- **Clear hierarchy** - Bold title (14px), lighter subtitle (13px)
- **Consistent spacing** - 12px gaps between cards, 14px/16px padding inside

## Components

### 1. LinkedItemsSelector (Wrapper)
Section wrapper with header and optional action button

```tsx
import { LinkedItemsSelector } from '@/components/design-system';

<LinkedItemsSelector
  title="Linked Bookings"
  actionLabel="Add Booking"
  isEditing={isEditing}
  onAction={() => setShowDropdown(true)}
>
  {/* Cards go here */}
</LinkedItemsSelector>
```

### 2. SimpleCard (Individual Item)
Display individual linked items with title, subtitle, and optional remove button

```tsx
import { SimpleCard } from '@/components/design-system';

<SimpleCard 
  title="BKG-12345"
  subtitle="Acme Corporation"
  isEditing={isEditing}
  onRemove={() => handleRemove()}
/>
```

### 3. SimpleCardsContainer (Container)
Wrapper for multiple cards with consistent spacing and empty state

```tsx
import { SimpleCardsContainer } from '@/components/design-system';

<SimpleCardsContainer 
  emptyMessage="No bookings linked"
  showEmpty={items.length === 0}
>
  {items.map(item => (
    <SimpleCard key={item.id} title={item.number} subtitle={item.name} />
  ))}
</SimpleCardsContainer>
```

## Complete Example

```tsx
import { 
  LinkedItemsSelector, 
  SimpleCard, 
  SimpleCardsContainer 
} from '@/components/design-system';

function BillingDetails({ billing, isEditing }) {
  const [linkedBookings, setLinkedBookings] = useState([]);
  
  return (
    <LinkedItemsSelector
      title="Linked Bookings"
      actionLabel="Add Booking"
      isEditing={isEditing}
      onAction={() => setShowBookingDropdown(true)}
    >
      <SimpleCardsContainer 
        emptyMessage="No bookings linked"
        showEmpty={linkedBookings.length === 0}
      >
        {linkedBookings.map(booking => (
          <SimpleCard
            key={booking.id}
            title={booking.bookingNumber}
            subtitle={booking.clientName}
            isEditing={isEditing}
            onRemove={() => handleRemoveBooking(booking.id)}
          />
        ))}
      </SimpleCardsContainer>
    </LinkedItemsSelector>
  );
}
```

## With Dropdown Selector

```tsx
<LinkedItemsSelector
  title="Link to Project"
  actionLabel={currentProjectId ? "Change" : "Select"}
  isEditing={isEditing}
  onAction={() => setShowProjectDropdown(true)}
>
  {isEditing ? (
    <div style={{ position: "relative" }}>
      {/* Your dropdown component */}
      {showProjectDropdown && <ProjectDropdown />}
      
      {/* Selected item display */}
      {currentProjectId && (
        <SimpleCard title={projectNumber} />
      )}
    </div>
  ) : (
    <SimpleCard title={projectNumber} />
  )}
</LinkedItemsSelector>
```

## Design Specs

### Colors
- **Header text**: `#667085` (gray)
- **Action button**: `#0F766E` (teal green)
- **Card background**: `#F9FAFB` (light gray)
- **Card border**: `#E5E7EB` (subtle gray)
- **Title text**: `#111827` (dark)
- **Subtitle text**: `#6B7280` (medium gray)
- **Remove icon**: `#9CA3AF` → `#EF4444` (gray → red on hover)

### Typography
- **Header**: 13px, font-weight 500
- **Action button**: 13px, font-weight 600
- **Card title**: 14px, font-weight 600
- **Card subtitle**: 13px, font-weight 400

### Spacing
- **Header margin-bottom**: 12px
- **Cards gap**: 12px
- **Card padding**: 14px 16px
- **Title-subtitle gap**: 4px

## Use Cases

✅ **Perfect for:**
- Linking bookings to billings
- Linking projects to expenses
- Linking documents to projects
- Any many-to-many relationships
- Entity selection with display

❌ **Not suitable for:**
- Complex nested hierarchies
- Large datasets (>100 items)
- Items requiring rich previews
- Drag-and-drop reordering

## Migration from Old Components

If you're using `LinkedItemsSection` or `LinkedItemCard`:

**Before:**
```tsx
<LinkedItemsSection title="Linked Bookings" count={3}>
  <LinkedItemCard title="BKG-001" variant="primary" />
</LinkedItemsSection>
```

**After:**
```tsx
<LinkedItemsSelector title="Linked Bookings">
  <SimpleCardsContainer>
    <SimpleCard title="BKG-001" />
  </SimpleCardsContainer>
</LinkedItemsSelector>
```

## Related Components

- `StandardSelect` - For single-item selection
- `StandardFilterDropdown` - For multi-select filters
- `LinkedRecordCard` - For richer linked item displays (different use case)
