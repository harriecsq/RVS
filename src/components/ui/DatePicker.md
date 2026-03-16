# DatePicker Component Usage Guide

## Overview
The DatePicker component provides a calendar-based date selection interface with a month view where users can click day numbers. It still allows manual typing through the underlying native date input.

## Basic Usage

```tsx
import { DatePicker } from './components/ui/DatePicker';

function MyComponent() {
  const [date, setDate] = useState('');
  
  return (
    <DatePicker
      value={date}
      onChange={setDate}
      placeholder="Select date"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Date value in YYYY-MM-DD format |
| `onChange` | `(value: string) => void` | - | Callback when date changes |
| `placeholder` | `string` | `'Select date'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable the input |
| `required` | `boolean` | `false` | Mark as required field |
| `className` | `string` | `''` | Additional CSS classes |
| `style` | `React.CSSProperties` | `{}` | Inline styles |
| `id` | `string` | - | HTML id attribute |
| `min` | `string` | - | Minimum selectable date (YYYY-MM-DD) |
| `max` | `string` | - | Maximum selectable date (YYYY-MM-DD) |

## Replacement Pattern

### Before (native input):
```tsx
<input
  type="date"
  value={startDate}
  onChange={(e) => setStartDate(e.target.value)}
  className="..."
  style={{...}}
/>
```

### After (DatePicker):
```tsx
<DatePicker
  value={startDate}
  onChange={setStartDate}
  className="..."
  style={{...}}
/>
```

## Features

- ✅ Calendar month view with clickable day numbers
- ✅ Manual typing still supported via native input overlay
- ✅ "Today" quick selection button
- ✅ Month navigation with arrow buttons
- ✅ Visual indication of selected date
- ✅ "Today" indicator (border around current date)
- ✅ Min/max date constraints
- ✅ Disabled dates shown in gray
- ✅ Click outside to close
- ✅ Responsive calendar popup

## Styling

The component uses Neuron OS design tokens:
- Deep green accent (#0F766E) for selected dates
- Clean borders (var(--neuron-ui-border))
- Consistent border radius (8px for input, 12px for calendar)
- Hover states on all interactive elements

## Files Already Updated

1. `/components/Reports.tsx` - Start/End date filters
2. `/components/bd/CreateProjectModal.tsx` - Shipment dates

## Files To Update

Replace `type="date"` inputs in these files:
- `/components/bd/AddBudgetRequestPanel.tsx`
- `/components/bd/AddTaskPanel.tsx`
- `/components/bd/TaskDetailInline.tsx`
- `/components/pricing/quotations/GeneralDetailsSection.tsx`
- `/components/AccountingEntryModal.tsx`
- `/components/AccountingExpenseModal.tsx`
- `/components/AccountingRevenueModal.tsx`
- `/components/AccountingV4.tsx`
- `/components/BillingWorkspace.tsx`
- `/components/BookingDetail.tsx`
- `/components/BookingFullView.tsx`
- `/components/CreateBooking.tsx`
- `/components/CreateBookingModal.tsx`
- `/components/ExpenseModal.tsx`
- All operations booking components

## Implementation Steps

1. Import the DatePicker component
2. Replace input with type="date"
3. Update onChange handler to accept string directly (not event)
4. Keep the same className and style props
5. Test calendar functionality and manual typing
