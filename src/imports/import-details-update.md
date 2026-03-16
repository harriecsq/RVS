Revise the existing Import Creation Screen and View Import Details Screen (including in-page Edit mode). DO NOT redesign Neuron’s visual system. Retain the exact same layout patterns, spacing, typography, components, modals, and interaction behaviors used in other Import screens. Apply ONLY the revisions listed below.

SCOPE:
- Import Creation Screen (New Import)
- View Import Details Screen
- View Import Details Edit Mode (inline edit on the same screen, consistent with existing detail screens)

GLOBAL RULES:
- Keep all existing fields not mentioned below unchanged.
- Use existing Neuron input components (text input, dropdown, date picker, time picker, repeatable field patterns).
- Do NOT add any manage/add/delete modals for dropdown values. Fixed options only.

--------------------------------------------
1) CONTAINER NUMBER (repeatable inputs)
--------------------------------------------
- Update the “Container Number” field to allow multiple container numbers.
- Implement as a repeatable input list (same UI pattern as other repeatable fields in Neuron creation forms):
  - Show one input by default
  - Add a “+ Add Container” action to append another input row
  - Allow removing an added container row (except the first row)
- In View Import Details, display container numbers as a list or stacked items (same read-only repeatable field display pattern).
- In Edit Mode, maintain the same repeatable input behavior.

--------------------------------------------
2) SHIPPING LINE (dropdown)
--------------------------------------------
- Convert the “Shipping Line” field into a dropdown (select input).
- Dropdown options must be exactly these labels (preserve capitalization/spaces exactly):
  SINOTRANS
  TS LINE
  NINGBO/NOS
  CMA
  COSCO
  OOCL
  WANHAI
  ASL
  HMM
  EVERGREEN
  FOX LOGISTIC
  MACRO OCEAN
  STAR CONCORD
  BENLINE
  INTERASIA
  GSL
  SIMBA LOGISTIC
  PANDA LOGISTIC
  SITC
  EXCELSIOR LOGISTIC
- Use the same dropdown style as other Neuron dropdown fields.
- IMPORTANT: Treat this list as a reusable standard for future Shipping Line dropdowns across the app.

--------------------------------------------
3) REMOVE RECEIVED DOCS
--------------------------------------------
- Remove the “Received Docs” field entirely from:
  - Import Creation Screen
  - View Import Details
  - Edit Mode

--------------------------------------------
4) VOLUME (dropdown + computed display in View)
--------------------------------------------
CREATION + EDIT MODE:
- Convert the “Volume” field into a dropdown for volume types/sizing.
- The dropdown component behavior and option formatting must match EXACTLY the “Size” dropdown behavior used in the Trucking creation screen (same style and no-space label format if applicable, follow Trucking conventions).
- Keep the creation/edit interaction the same as a normal dropdown (no extra computed inputs in the form).

VIEW MODE (View Import Details):
- In View Import Details ONLY, display Volume as a computed grouped summary using the same logic as Trucking “Size” summary:
  - Format: “{#}x{VolumeOption}”
  - If multiple different volume options exist across entered container numbers, group and show comma-separated:
    Example: “2x40HC, 1x20GP”
- This computed display must be based on the number of container numbers and the assigned volume/sizing per container (same grouping logic as Trucking).
- Do NOT change the creation UI; only change how Volume is displayed in View mode.

--------------------------------------------
5) ETA / ATA / DISCHARGED / STORAGE BEGINS / DEM BEGINS (date + time with auto-calcs)
--------------------------------------------
- Update the following fields to include BOTH date and time inputs (date picker + time picker):
  - ETA
  - ATA
  - Discharged
- Add/update these computed-but-editable fields:
  - Storage Begins (date + time)
    - Auto-populate as Discharged + 5 days (default calculation)
    - Must remain editable by users
  - DEM Begins (date + time)
    - Auto-populate as Discharged + 14 days (default calculation)
    - Must remain editable by users
- Behavior:
  - When Discharged is set/changed, auto-recalculate Storage Begins and DEM Begins IF the user has not manually overridden them.
  - If the user edits Storage Begins or DEM Begins manually, preserve their override (do not keep auto-overwriting).
- Apply this behavior consistently in Create and Edit modes, and display date+time in View mode.

--------------------------------------------
6) SELECTIVITY (color-coded dropdown)
--------------------------------------------
- Convert “Selectivity” into a dropdown with EXACT options:
  - Green
  - Orange
  - Yellow
  - Red
- Each option must be color-coded in the dropdown and in the selected display (use the same pill/badge color-coding pattern already used in Neuron).
- Ensure label text remains readable and consistent with Neuron’s UI style.

--------------------------------------------
7) RCVD (date + time)
--------------------------------------------
- Revise the “RCVD” field to be a date + time input (date picker + time picker).
- Apply in Create, View, and Edit modes.

--------------------------------------------
8) GROSS WEIGHT (numeric + metric unit)
--------------------------------------------
- Add a new field labeled “Gross Weight” with:
  A) A numeric input for the value
  B) A small adjacent unit dropdown (compact field) for metric type
- Unit dropdown options (fixed list):
  - kg
  - lbs
  - tons
- Keep the unit dropdown visually smaller than the numeric input (same compact pattern used elsewhere in Neuron for units/secondary inputs, if any).
- Display both value + unit in View Import Details (e.g., “1250 kg”) and allow editing in Edit mode.

--------------------------------------------
DELIVERABLES REQUIRED
--------------------------------------------
1) Updated Import Creation Screen reflecting all changes
2) Updated View Import Details Screen reflecting all changes (including computed Volume display)
3) Updated View Import Details Edit Mode reflecting all changes
4) Ensure all new/updated fields preserve Neuron’s existing component design and do not introduce new modals or management flows