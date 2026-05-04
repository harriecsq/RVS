# Impeccable Design Context — NEURON OS

## Design Context

### Users

**Primary users**: Full-time employees of Philippine freight forwarding companies (operations clerks, accountants, brokers) who sit at office desktops and input data into NEURON OS for the entire workday.

**Context**:
- Long sessions (8+ hours) at a desk — this is their primary work tool, not a glanceable app
- Office desktops only — no mobile, no tablet (desktop-first is a hard constraint, not a "we'll get to it")
- Heavy data entry: bookings, vouchers, billings, collections, expenses across import/export shipments
- Financial + operational accuracy matters — every peso on every invoice is load-bearing
- Users are power users by repetition. They know the system. They don't need onboarding nudges — they need speed and zero friction.

**Job to be done**: Move shipment/financial data through the operations → accounting pipeline accurately and without cognitive fatigue, across hundreds of repetitive entries per day.

### Brand Personality

Three words: **Simple. Clean. Modern.**

**Emotional goals**:
- **Calm**: no visual noise, no alarming colors, no animation that fights the user. An 8-hour session should not leave the user's eyes tired.
- **Fast**: interactions respond instantly. Forms don't block, dropdowns don't lag, state updates are optimistic. "Fast" is a design decision, not just a perf target — it shows up in tight spacing, dense tables, keyboard-first flows, and minimal decoration.

Interface should feel like a well-tuned instrument: quiet, predictable, precise.

### Aesthetic Direction

**Visual tone**: Clinical-precise, stroke-first, information-dense. Think Bloomberg Terminal meets Linear — serious financial tool, not a consumer app.

**Theme**:
- Light mode is primary (current, finalized)
- **Dark mode is now in scope** — add it as an adaptability layer. Users working late on month-end closings will appreciate it. Design tokens must resolve via CSS `light-dark()` or a `.dark` class (already scaffolded in `globals.css` via `@custom-variant dark`).

**Colors (LOCKED — do not change)**:
- Primary green: `#237F66` (brand)
- Hover green: `#1E6D59`
- Light green surface: `#E8F2EE`
- Text primary (deep green): `#12332B`
- Text muted: `#6B7A76`
- Card border: `#E5ECE9`
- Semantic: warn `#F59E0B`, danger `#EF4444`, info `#3B82F6`

Match CLAUDE.md — this is the source of truth for brand color. Earlier versions of this file listed teal `#0F766E` / navy ink `#0A1D4D`; that was incorrect.

**Surfaces**: Stroke-first. 1px borders, NO box-shadows, 12px radius on cards, 6px on inputs/buttons. This is already consistent — preserve it.

**Typography**:
- Currently Inter (on the impeccable reject list). User is **open to a more distinctive pairing**, capped at **1–2 families total**.
- Constraint: Inter's metrics are baked into the existing UI, so any replacement must have similar x-height and body-text legibility at 14px to avoid a full re-spacing pass.
- Direction for future proposals: one distinctive-but-restrained text/display face (NOT another reflex-list font like DM Sans, Plus Jakarta, Outfit, Space Grotesk, IBM Plex). Optionally paired with one monospace for tabular/financial columns.
- Numerals MUST be tabular for financial data, regardless of font choice.

**Anti-reference rule**: **Not overwhelming.** Avoid anything loud, maximalist, gradient-heavy, or decorative-for-decoration's-sake. Specifically reject:
- Consumer-fintech gradients and glowing accents
- Glassmorphism, neon, purple-to-blue hero gradients
- Playful/Notion-like illustrated empty states
- Dense-and-ugly legacy-ERP visual noise (SAP, old Oracle screens)
- Any "AI dashboard" cliché: big number + gradient accent + sparkline + icon-card grid

### Design Principles

1. **Calm over clever.** No motion, decoration, or color that the user hasn't asked for. Every pixel must earn its place across 8 hours of staring.

2. **Stroke-first, shadow-never.** 1px borders and whitespace do the structural work. No elevation via shadow — already a system-wide rule, do not break it.

3. **Tabular numerals everywhere money lives.** Financial data must align. Use `font-variant-numeric: tabular-nums` on any numeric column, total, amount, or rate.

4. **Keyboard-first, density-first.** These users do not browse — they enter data. Prefer tight vertical rhythm, keyboard nav on every dropdown, tab-order correctness, and form-layout consistency over breathing-room marketing aesthetics.

5. **Design-system components win.** When a `Standard*` component exists in `src/components/design-system/`, use it. Inconsistent one-off inputs/selects are technical debt, not a design choice (see Known Inconsistencies below).

---

## Known Design Inconsistencies (Audit Findings)

The codebase is transitional (Figma Make origin) and has visible drift. The canonical direction is the `design-system/` folder.

### Canonical components (USE THESE)

Location: `src/components/design-system/`

- `StandardInput` — use instead of raw `<input>` or `<Input>` from `ui/input`
- `StandardSelect` — use instead of raw `<select>` or shadcn `<Select>` from `ui/select`
- `StandardDatePicker` — use instead of raw date inputs
- `StandardSearchInput`, `StandardFilterDropdown`, `StandardButton`, `StandardTabs`, `StandardTable`, `StandardTextarea`, `StandardEmptyState`, `StandardLoadingState`, `StandardSkeleton`

Adopted in (good examples): `AddClientPanel.tsx`, `ClientDetailView.tsx`, `SOAPaymentMonitoringReport.tsx`, `CreateTruckingModal.tsx`, `ViewCollectionScreen.tsx`, `EmployeeProfile.tsx`.

### Legacy / inconsistent (needs migration)

~40 files still use raw `<Select>` / `<Input>` / `<select>` / `<input>` instead of `Standard*`. High-impact migration targets (ranked by user-facing surface area):

1. **Operations booking panels** — `CreateImportBookingPanel.tsx`, `CreateExportBookingPanel.tsx`, `ImportBookingDetails.tsx`, `ExportBookingDetails.tsx`, `TruckingRecordDetails.tsx` — heaviest daily-use forms
2. **Accounting modals** — `CreateBillingModal.tsx`, `CreateVoucherModal.tsx`, `CreateExpenseScreen.tsx`, `CreateCollectionScreen.tsx`, `ExpenseModal.tsx` — high-frequency entry
3. **View screens** — `ViewBillingScreen.tsx`, `ViewExpenseScreen.tsx`, `ViewVoucherScreen.tsx` — read-heavy, inconsistency visible
4. **Shared booking tabs** — `CommercialInvoiceTab.tsx`, `DeclarationTab.tsx`, `FormETab.tsx`, `FSITab.tsx` — document panels, user spends hours here
5. **HR modals** — `CreatePayrollModal.tsx`, `EmployeeFileModal.tsx`, `EmployeeProfileModal.tsx`, `PayrollPayslipsModal.tsx` — lower priority, less daily use

### Dropdown rendering inconsistencies

- Some dropdowns use Radix's portal (shadcn Select), some use a custom `useDropdownPortal` hook (`PortalDropdown`, `PodDropdown`), some render in-flow. Pick one canonical approach — probably `useDropdownPortal` + `StandardSelect` — and migrate.
- Z-index, positioning, and keyboard behavior diverge between them. Users will feel this as "dropdowns that behave differently."

### Dark mode status

Scaffolded but not wired up. `@custom-variant dark (&:is(.dark *));` exists in `globals.css`, but the actual dark token set (`--neuron-bg-page-dark`, etc.) is missing. A dark-mode pass should:
- Define dark-side values for every `--neuron-*` and `--ds-*` token
- Use `light-dark()` in `:root` rather than separate `.dark` blocks where possible
- Audit every hardcoded hex in components (there are many — this will be a grind)
- Preserve the locked brand colors but shift surfaces/ink to dark equivalents

---

## Open Questions (not blocking, but ask when relevant)

- WCAG target level (AA assumed; confirm if AAA ever required for contrast on financial data)
- Reduced-motion preference behavior (probably just respect `prefers-reduced-motion` — no elaborate animations exist anyway)
