You are editing the existing Neuron app design. DO NOT redesign the visual system. Reuse the exact same components, spacing, typography, table layout, filters, chips, buttons, and modal patterns already used in Import/Export/Accounting screens and existing detail screens. Match the current style 1:1.

GOAL: Add a new Operations module called “Trucking”, connect it to the EXISTING Trucking tabs already present in Import Details and Export Details (do not create new tabs), and create consistent list + create + view detail screens that behave like other Neuron modules.

IMPORTANT CONSTRAINTS:
- Do NOT add any “Manage add/delete” options for employees or vendors.
- Do NOT add any “Edit vendors” or “Manage employees” modals/links. Those were placeholders and must not exist.
- Use only the existing dropdown patterns with fixed options.
- The Trucking View Details screen MUST include the same top action layout shown in the reference image: “Activity” button, primary “Edit” button, and “Actions” dropdown containing Download (PDF, Word) and Delete.
- The Trucking View Details screen MUST also include the same top summary bar/header design used in other Neuron View Details screens.

--------------------------------------------
A) SIDEBAR NAVIGATION UPDATE
--------------------------------------------
In the left sidebar under Operations:
- Keep Export
- Keep Import
- Add Trucking directly BELOW “Import”
- Use the same icon style and spacing as other Operations items
- When Trucking is active, highlight it like Import is highlighted in the reference screenshot.

--------------------------------------------
B) TRUCKING LIST PAGE (Operations > Trucking)
--------------------------------------------
Create a page titled “Trucking”
Subtitle: “Manage trucking assignments and delivery coordination”
Top-right primary button: “+ New Trucking” (same style as “+ New Booking”)

Search bar (same style as Import list):
Placeholder: “Search by Booking ID, BL Number, Container #, Consignee, or Destination...”

Filter row (same style as Import list):
- Time dropdown (default “All Time”)
- Status dropdown (default “All Statuses”)
- Owner dropdown (default “All Owners”)
- Destination dropdown (default “All Destinations”)

Table style: identical to Import list view. Suggested columns:
- TRUCKING REF #
- BOOKING REF # (link to related Import/Export record if applicable)
- BL #
- CONTAINER # (if multiple, show first + “+N”)
- CONSIGNEE
- DESTINATION
- DELIVERY DATE (derived from Delivery Schedule date if present)
- STATUS (generated from tags, displayed like pill/badge)
- TRUCKING VENDOR (vendor pill/badge with vendor color)
- DISPATCHER
- GATEPASS
- LAST UPDATED

Row click opens “View Trucking Details” screen.

--------------------------------------------
C) CONNECT TO EXISTING TRUCKING TAB (Import Details + Export Details)
--------------------------------------------
The “Trucking” tab already exists in Import Details and Export Details. Do NOT create a new tab. Reuse it and connect it to Trucking records.

Inside the existing Trucking tab on Import Details:
- Show a related Trucking list (same inner-tab table pattern as Expenses/Billings tabs).
- Add top-right button inside the tab: “+ New Trucking”
- Creating from this tab auto-links the new trucking record to the current Import record.

Inside the existing Trucking tab on Export Details:
- Same behavior and layout.
- Creating from this tab auto-links the new trucking record to the current Export record.

--------------------------------------------
D) NEW TRUCKING CREATION SCREEN / MODAL
--------------------------------------------
When user clicks “+ New Trucking”:
- Open the same creation modal/page pattern used elsewhere in Neuron (retain exact modal/scrim/header/footer).
- Title: “New Trucking”
- Primary: “Create Trucking”
- Secondary: “Cancel”
- Use existing form components only.

Fields and inputs (retain wording):

TRUCKING
- Container # (repeatable input; can add multiple container numbers)
  - “+ Add Container” action
- Commodity Items (text input)
- Shipping Line (text input)
- Vessel / Voyage (text input)
- BL # (text input)
- Total Containers (read-only; computed from number of Container # inputs)
- Size (dropdown; per container if needed; options include: 20 - GP, 40 - HC, RH)

TABS BOOKING
- Date (date picker)
- Time (time picker)

WAREHOUSE ARRIVAL
- Date (date picker)
- Time (time picker)

DELIVERY SCHEDULE (repeatable Drops)
Each Drop includes:
- DEA Date (text input)
- Delivery Schedule (date picker)
- Unloading Time (time input; allow range Start + End)
- Parking (text input; default text “Availability depends on time of arrival.” but editable)
- Instructions (numbered inputs 1), 2), 3)... with “+ Add instruction”)
- Additional Text / Note (textarea)
- “+ Add Drop” to add multiple drops

DELIVERY ADDRESS (repeatable)
- Address (text input; can add multiple addresses)
For each Address entry:
- Postal Code (text input)
- Recipient (text input; can add multiple recipients)
- Contact (text input; allow multiple mobile numbers per recipient)
- “+ Add Address” and “+ Add Recipient” actions (simple repeaters, no manage modals)

TRUCKING RATE
- Trucking Rate (number input; allow “/” character if needed)

TRUCKING VENDOR
- Trucking (dropdown with colored vendor labels; fixed list, no edit/manage options):
  ANTZ - #674EA7
  AMFRA - #EA4335
  GERGON - #4285F4
  E.B - #34A853
  THREEONEFIVE - #FF9900
  XTC - #FBBC04
  MALVHINCHEN - #BF9000
  JEFMEL - #1155CC
  CPR - #999999
  GREENTHUMB - #46BDC6
  ASBS - #FF00FF
  RSR MAX - #AEEB3A
  ONTIME - #8E7CC3
  MCA - #E978B2
  LRG - #CFE2F3
  AGARU - #F9CB9C
  RFKM - #B6D7A8
  DTDC - #45818E
  AG BAGUIO - #EA9999
  WENG - #EFE1C6
  ARS - #E06666

PEOPLE
- Dispatcher (dropdown of employee names; fixed, no manage options)
- Gatepass (dropdown of employee names; fixed, no manage options)

TRUCKING - SOA
- Text/number input

REMARKS (TAGS)
Implement as multi-select tags (not a single dropdown). Selected tags show as chips.
- Chip UX: on hover, show a small “x” icon on the chip to remove the tag.
- Add tags via searchable picker from a controlled list (no free typing).

Tag groups must be defined and ordered (for display and summary generation):
Operations / Movement Tags:
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

Documentation / Process Tags:
- Awaiting Signed Docs
- Awaiting Stowage
- Awaiting Address
- Awaiting Schedule
- For WEB
- CRO

Financial / Accounting Tags:
- For Debit
- For Final
- For Lodgement

Client Handling Tags:
- Client Will Handle
- Client Will Handle the Trucking

Tag display order everywhere (chips + combined status summary):
Operations/Movement first → Documentation/Process → Financial/Accounting → Client Handling last.

Status column behavior in list tables:
- Generate a combined status summary from selected tags using “ • ” separator.
- If too long, show first 2 tags + “+N”.
Example: “FOR DEBIT • AWAITING DISCHARGE +2”

EMPTY RETURN
- Empty Return dropdown:
  MIP
  ATI
  CY
  Pre-Advice MIP
  Pre-Advice ATI
  Pre-Advice CY
  For Reuse
  Reuse
  Client Own Container
- Location + Start + End (repeatable block):
  - Location (text input)
  - Start (date+time)
  - End (date+time)
  - “+ Add” to add more blocks

OTHER FEES
- Other Fees (text input)

STORAGE & DEMURRAGE VALIDITY
- Storage Begin (date+time)
- Storage Payment (date+time)
- Demurrage Begin (date+time)

CONTAINER DAMAGE
- Container Damage (text input)

DO
- Date input

PADLOCK
- Date input

NOTES
- Notes (text input/textarea)

--------------------------------------------
E) VIEW TRUCKING DETAILS SCREEN (REQUIRED)
--------------------------------------------
Create a “View Trucking Details” screen that matches the existing View Details pattern used in Neuron (same top summary bar/header, same header spacing, same typography, same layout).

Top action area MUST match the reference image:
- Left button: “Activity”
- Primary button: “Edit Trucking” (same style as “Edit Booking”)
- “Actions” dropdown button
Actions dropdown must contain:
- Download
  - PDF
  - Word
- Delete

Top summary bar/header MUST exist (same design as other Neuron detail screens) and MUST include these key fields:
- Status (computed from Remarks tags; show as the combined status summary pill/badge)
- Tabs Booking (Date + Time)
- Warehouse Arrival (Date + Time)
- Empty Return (dropdown value)

In the View Trucking Details body:
- Display all Trucking fields read-only using the same label/value layout used in other detail screens.
- For repeatable fields (Container # list, Delivery Drops, Addresses, Location ranges), display them as stacked blocks/cards consistent with existing repeatable field display patterns.
- Display selected Remarks tags as chips in the defined order.
- Display Trucking vendor as a colored pill using the vendor’s hex code.

Edit behavior:
- Clicking “Edit Trucking” opens the same edit form pattern used elsewhere (same components, same modal/page pattern).
- After saving, return to View Trucking Details.

--------------------------------------------
F) CONSISTENCY REQUIREMENTS
--------------------------------------------
- Retain exact Neuron visual system. No redesigns.
- Do NOT create new Trucking tabs; reuse existing Trucking tabs and connect them to records.
- Ensure Trucking records created in any entry point appear correctly:
  - Operations > Trucking list
  - Import Details > existing Trucking tab (if linked)
  - Export Details > existing Trucking tab (if linked)
- No vendor/employee management modals or edit lists included in this scope.