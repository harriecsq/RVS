# Master Template + Global Document Settings — Implementation Plan

Plan for two related improvements to the export document system:
1. **Global Document Settings** — upload letterhead/stamps/signatories once, reuse everywhere.
2. **Master Templates** — pre-built bundles of all 6 export documents, picked from the Sales Contract tab, which auto-populate drafts for the other 5 docs without marking them "Created".

---

## Phase 1 — Global Document Settings

**Goal:** Upload letterhead, stamps, and signatories once. Used across all documents and all bookings.

### Tasks

1. **New context / hook:** `src/hooks/useDocumentSettings.tsx`
   - Exposes `{ settings, updateSettings }`.
   - Persists to `localStorage` under `neuron:documentSettings`.
   - Initial value: `DEFAULT_DOCUMENT_SETTINGS`.

2. **New page:** `src/components/admin/DocumentSettingsPage.tsx`
   - Route: `/admin/document-settings` (or tab within existing admin page).
   - Contains: letterhead upload, master stamp library (add/remove stamps by slot name), default signatories, display toggles.

3. **Refactor `DocumentSidePanel.tsx`:**
   - Remove local `docSettings` `useState`.
   - Replace with `const { settings } = useDocumentSettings()`.
   - Remove the embedded in-panel settings editor (or keep as a read-only link to the settings page).

4. **Refactor `ViewBillingScreen.tsx`:**
   - Same swap — replace local `billingDocSettings` state with `useDocumentSettings()`.

### Verification
Upload letterhead in settings → close/reopen browser → open any doc → letterhead persists.

---

## Phase 2 — Master Template Library

**Goal:** Pre-built bundles of all 6 export docs that can be picked and applied to a booking.

### Tasks

1. **New type:** `src/types/master-template.ts`
   ```ts
   interface MasterTemplate {
     id: string;
     name: string;                // e.g. "ABC Trading — Hamburg Route"
     description?: string;
     salesContract: Partial<SalesContract>;
     commercialInvoice: Partial<CommercialInvoice>;
     packingList: Partial<PackingList>;
     declaration: Partial<Declaration>;
     formE: Partial<FormE>;
     fsi: Partial<FSI>;
     createdAt: string;
     updatedAt: string;
   }
   ```

2. **Storage:** `localStorage` under `neuron:masterTemplates` → `MasterTemplate[]`.
   - Hook: `useMasterTemplates()` → `{ templates, save, delete, getById }`.
   - Can migrate to server KV later.

3. **New page:** `src/components/admin/MasterTemplatesPage.tsx`
   - Route: `/admin/master-templates`.
   - List view + Create/Edit view with 6 tabs (one per doc), reusing the existing `SalesContractTab`-style forms in "template mode" (no `bookingId`, saves to template instead of to a booking).

### Verification
Create a master template with all 6 docs filled → reload page → template still in list with correct data.

---

## Phase 3 — Apply Master to Booking (core UX)

**Goal:** Sales Contract becomes the entry point. Picking a master auto-fills in-memory drafts for all 6 docs without saving or marking them created. Each other doc must still be explicitly saved (unchanged save flow).

### Tasks

1. **Modify `SalesContractTab.tsx`:**
   - When booking has **no saved Sales Contract yet**, replace the blank form with a **"Pick Master Template"** screen:
     - Selector listing all master templates.
     - Required — no "create blank" option.
   - On pick: populate Sales Contract form fields from `template.salesContract`.
   - Bubble up via `onEditStateChange({ docData, appliedMaster: template })` — new field `appliedMaster` holds the full template.
   - Sales Contract still requires explicit **Save** (unchanged).

2. **Modify `DocumentsSubTab.tsx`:**
   - New state: `draftDocs: Partial<ExportDocuments>` — in-memory only, never persisted.
   - When `editState.appliedMaster` arrives from Sales Contract:
     - Populate `draftDocs.commercialInvoice = master.commercialInvoice`, `draftDocs.packingList = master.packingList`, etc.
     - **Do NOT** update `docStatus` — status badges stay "Not Created".
   - When user opens another doc panel:
     - Pass `draftDocs[docKey]` as initial form data into that doc's tab.
     - Tab opens prefilled; status is still "Not Created".
     - User edits freely, then clicks **Save** — only then does it persist and flip to "Created".

3. **Modify each doc tab** (`CommercialInvoiceTab.tsx`, `PackingListTab.tsx`, `DeclarationTab.tsx`, `FormETab.tsx`, `FSITab.tsx`):
   - Accept a new optional prop: `initialDraftData?: Partial<Doc>`.
   - When no saved doc exists AND `initialDraftData` is provided → use it as initial form state.
   - Save flow unchanged — clicking Save persists to DB and triggers `onDocumentUpdated()`.

4. **`DocumentSidePanel.tsx` preview:**
   - `buildPdfPreview` already spreads `editState?.docData`. Extend to also spread `draftDocs[docKey]` when no saved doc exists.
   - Users see PDF preview populated from the master even before saving.

### Verification
- Fresh booking → Sales Contract tab → forced to pick master → pick one → fields populate.
- Close without saving Sales Contract → reopen → must pick master again (nothing saved).
- Save Sales Contract → other 5 docs still show "Not Created".
- Open Commercial Invoice → form prefilled from master → close without saving → still "Not Created".
- Open Commercial Invoice again → still prefilled from master → edit → Save → now shows "Created".

---

## Phase 4 — Polish

- "Change Master Template" button on saved Sales Contract (with warning: "This will reset drafts of unsaved documents").
- Optional subtle "Draft Ready" chip next to "Not Created" on docs that have a master-applied draft waiting.
- Migration path to server KV (replace localStorage hooks with API calls) — defer until needed.

---

## Files Touched

### New
- `src/hooks/useDocumentSettings.tsx`
- `src/hooks/useMasterTemplates.tsx`
- `src/types/master-template.ts`
- `src/components/admin/DocumentSettingsPage.tsx`
- `src/components/admin/MasterTemplatesPage.tsx`

### Modified
- `src/App.tsx` (routes)
- `src/components/operations/shared/DocumentSidePanel.tsx`
- `src/components/operations/shared/DocumentsSubTab.tsx`
- `src/components/operations/shared/SalesContractTab.tsx`
- `src/components/operations/shared/CommercialInvoiceTab.tsx`
- `src/components/operations/shared/PackingListTab.tsx`
- `src/components/operations/shared/DeclarationTab.tsx`
- `src/components/operations/shared/FormETab.tsx`
- `src/components/operations/shared/FSITab.tsx`
- `src/components/accounting/ViewBillingScreen.tsx`

### Unchanged
All 7 template files in `document-preview/templates/` — they already read from `settings` and `data` props, so no changes needed.
