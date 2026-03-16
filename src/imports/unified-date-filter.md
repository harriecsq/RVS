Add a standardized Date Filter feature to the following screens:

List Screens
1. Import Module List Screen
2. Export Module List Screen
3. Trucking Module List Screen
4. Expenses Module List Screen
5. Billings Module List Screen
6. Collections Module List Screen
7. Vouchers Module List Screen

Report / Monitoring Screens
8. Container Refund Monitoring Screen
9. Expenses Summary Screen
10. Final Shipment Cost Screen
11. Profit/Loss per Period Screen

Core instruction:
Merge the existing Date Filter pattern from the Reports screens with the date input behavior from the Trucking Creation Screen.

What to reuse from each source:
- From the Reports screens:
  - the filter placement in the filter/action area
  - the two-input date range structure
  - the visual style of the filter fields
  - the selected date display format
- From the Trucking Creation Screen:
  - the calendar icon on the right side of the input field
  - the click behavior of that icon
  - the saved calendar modal used for date picking
  - the overall modal interaction pattern

Implementation requirement:
Create a shared Date Filter component that looks and behaves like this:
- It should use the same two-input date range structure already established in the Reports screens.
- Each date input should include the same right-side calendar icon used in the Trucking Creation Screen.
- Clicking the calendar icon should open the same existing calendar modal from the Trucking Creation Screen.
- The modal should not be redesigned.
- After selecting dates, the chosen range should populate the two input fields using the same format already used in Reports.
- This should behave as a reusable shared system component, not as a custom one-off design.

For the 7 list screens:
- Add this Date Filter at the start of the filter/action bar.
- Keep it aligned with existing search fields, dropdowns, and action buttons.
- The date filter should function as a filter for the records shown in that module’s table/list only.
- Preserve all existing tables, columns, and module-specific controls.

For the 4 report/monitoring screens:
- Apply the same calendar-enabled date input design there as well.
- Specifically ensure the trucking-style calendar icon and modal behavior are implemented onto:
  - Container Refund Monitoring Screen
  - Expenses Summary Screen
  - Final Shipment Cost Screen
  - Profit/Loss per Period Screen
- These screens should visually and behaviorally match the same unified Date Filter system.

Design constraints:
- Keep the existing Reports screen styling as the base visual reference.
- Keep spacing, typography, border radius, field height, padding, and alignment consistent with the design system.
- Do not change layout structure unless necessary to fit the filter cleanly.
- Maintain consistent placement across all applicable screens.
- Ensure this feels like one reusable system-level date filter pattern across the product.

What not to do:
- Do not add Apply, Clear, or Reset buttons or logic.
- Do not redesign the calendar modal.
- Do not invent a new date picker style.
- Do not replace the two-input Reports pattern with a single date field.
- Do not move major layout sections unnecessarily.
- Do not alter existing table columns, screen hierarchy, or module-specific actions unless required for clean alignment.
- Do not create different visual variations per screen.
- Do not use a different date format from what is already used in Reports.
- Do not place the calendar icon anywhere other than the right side of the input field.
- Do not create a custom modal for each screen; reuse the same existing modal/component.
- Do not make this look like a new feature invented for one page; it must feel like a shared design system pattern.

Goal:
Implement one unified Date Filter system across the listed module, report, and monitoring screens by combining:
1. the Reports screen’s date filter structure, placement, and styling
with
2. the Trucking Creation Screen’s calendar icon and calendar modal behavior.

The final output should feel fully consistent, reusable, and native to the system.