# CURRENT_SCOPE_DECISIONS

## In Scope
- Dashboard
- Operations
- Accounting
- Reports
- HR
- Activity Log
- Profile

## Out of Scope
- Business Development
- Pricing
- Quotations
- Tasks
- Tickets

## Scope Notes
- BD and Pricing are prototype remnants and should not be part of the current-client architecture narrative.
- HR is an existing in-scope module, but it has known integration rough edges and should not be treated as clean architecture.
- The authoritative booking boundary should be type-specific endpoints, not the generic `/bookings` endpoint.
- Generic `/bookings` may be mentioned only as transitional implementation behavior, not as the intended architectural source of truth.
- Reports should be documented using the currently routed Reports.tsx implementation, not older alternate report modules.
- The core system flow is:
  Operations (Import/Export) → Trucking → Vouchers → Expenses → Billings → Collections