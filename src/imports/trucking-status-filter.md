Add a Status filter to the Trucking module LIST screen (Operations > Trucking), using the same tag-based Status logic already implemented for Trucking Remarks/Status. Do NOT redesign the page—reuse the exact same Neuron list screen components, spacing, and filter row pattern.

PLACEMENT:
- In the Trucking list screen filter row (beneath the search bar), keep the existing filters (All Time, All Owners, All Vendors).
- Replace the current “All Statuses” filter with a tag-based Status filter control (or update it) while keeping the same dropdown/filter styling used across Neuron list screens.

BEHAVIOR (TAG-BASED FILTER):
- The Status filter must support multi-select filtering using the controlled tag list (no free typing).
- The filter dropdown opens a searchable list of status tags (same tag list used in Trucking Remarks).
- Users can select multiple tags; the list results should show records that match:
  - Default matching rule: “Has ANY selected tag” (OR logic).
- Add an optional toggle inside the dropdown for advanced filtering:
  - “Match ANY” (OR) / “Match ALL” (AND)
  - Default is “Match ANY”.

DISPLAY:
- When tags are selected, the filter label should change from “All Statuses” to:
  - “Status: 1 selected” / “Status: N selected” (keep it compact, same style as other filters).
- Selected tags should NOT be displayed as full chips in the filter row (to avoid clutter). Only show the compact count text.
- In the dropdown panel itself, show selected tags with checkmarks and allow deselection.

TAG LIST (must reuse existing labels, not slugs):
Operations/Movement:
- Awaiting Discharge
- Ready Gatepass / For Delivery
- For Gatepass
- Awaiting Trucking
- Checking Trucking
- Looking for a Truck
- Requesting Rates
- Delivered
- Booked
- Schedule
- Re-Schedule

Documentation/Process:
- Awaiting Signed Docs
- Awaiting Stowage
- Awaiting Address
- Awaiting Schedule
- For WEB
- CRO

Financial/Accounting:
- For Debit
- For Final
- For Lodgement

Client Handling:
- Client Will Handle
- Client Will Handle the Trucking

IMPORTANT RULES:
- Render and search using the human-readable display labels (e.g., “Awaiting Discharge”), never internal tag keys (e.g., “awaiting-discharge”).
- Filtering must use the record’s selected tags as the source of truth.
- Do not change the table layout, search bar, or other filters beyond adding this Status tag-based filter.