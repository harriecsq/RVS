# Document Template Spec — Neuron OS

Reference for all PDF document templates under `templates/`. Read this at the start of any document template session.

---

## Global Rules (apply to every template)

### Header / Letterhead
- The top of every document (above the document title) must be a **single PNG image** uploaded by the user via Document Settings → "Company Letterhead".
- Accessed as `settings.logoPng` (base64 data URL).
- If not uploaded, show a dashed placeholder: `"Company letterhead PNG — upload via Document Settings"`.
- Do **not** render a hard-coded company name, address, or logo in code — it all lives in the PNG.

### Date Formatting
- All dates must render as **long-form letters**: `March 20, 2026` (not `2026-03-20`).
- Use the helper `formatDateLetters(raw: string): string` — already defined in `SalesContractDocTemplate.tsx`, copy it to each template or extract to a shared util.
- Apply to every date field in every template: document date, shipment date, validity date, etc.

### Labels / Field Rows
- Labels are **not bold**. Only column headers in tables are bold.
- Label-value rows use `InfoRow` pattern: `LABEL :  value` — colon belongs to the label cell, never duplicated.
- No duplicate colons. Pattern: `<td>LABEL :</td><td>value</td>` — the label cell ends with ` :`.

### Stamps / Seals
- Per-document stamps are stored in `settings.stamps` — a `Record<string, StampSlot>` keyed by slot name.
- Each template declares which stamp slots it needs (see per-document section below).
- Access: `settings.stamps?.["buyer"]?.pngData`.
- Stamp slots are configured in `DocumentSettingsPanel` via the `stampSlots` prop (array of slot key strings).
- The `stampSlots` prop is passed from `DocumentsSubTab` when opening the `DocumentSidePanel`.

### Signatories
- Standard signatory slots: `preparedBy`, `approvedBy`, `conforme` — from `settings.signatories`.
- Use `TemplateSignatures` component for internal Neuron documents (billings, FSI, etc.).
- For trade documents (Sales Contract, Commercial Invoice, Packing List) use the document's own buyer/seller/supplier layout instead — do not use `TemplateSignatures`.

### Footer
- Trade documents (Sales Contract, Commercial Invoice, Packing List, Declaration, Form E) do **not** use `TemplateFooter` — they have their own signature block.
- Internal documents (Billing, FSI) may use `TemplateFooter`.

---

## Per-Document Stamp Slots

| Document            | Stamp Slots                                    |
|---------------------|------------------------------------------------|
| Sales Contract      | `buyer`, `seller`, `supplier`                  |
| Commercial Invoice  | `manager`, `seller`                            |
| Packing List        | `seller`, `company`                            |
| Declaration         | `supplier`                                     |
| Form E              | `exporter`, `company`                          |
| FSI                 | `company`                                      |
| Billing             | `company`                                      |

Pass the correct array as `stampSlots` in `DocumentsSubTab.tsx` for each `docKey`.

---

## Data Flow

```
ExportBooking (from DB)
  └── bookingData (generic fields: referenceNo, portOfLoading, etc.)
        + editState.docData (typed SalesContract | CommercialInvoice | etc.)
        → merged and spread into template's `data` prop
```

- `SalesContractTab` bubbles `doc` up via `onEditStateChange({ ..., docData: doc })`.
- `DocumentsSubTab.buildPdfPreview()` spreads `editState?.docData` over `bookingData`.
- Template receives a flat `data: Record<string, any>` — use field names from `src/types/export-documents.ts`.

---

## Field Name Reference (SalesContract)

From `src/types/export-documents.ts`:

```
refNo, date
supplierName, supplierAddress
sellerName, sellerAddress
buyerName, buyerAddress, buyerContact, buyerPhone, buyerEmail
commodityDescription, quantity, unitPrice, totalAmount
portOfLoading, portOfDestination, vesselVoyage, termsOfPayment, shipmentDate
bankName, swiftCode, accountNo, accountName, bankAddress
```

---

## File Locations

| File | Purpose |
|------|---------|
| `src/types/document-settings.ts` | `DocumentSettings` type — `logoPng`, `stamps`, `signatories`, `display` |
| `src/types/export-documents.ts` | Field types for each export document |
| `DocumentSettingsPanel.tsx` | Settings sidebar — logo upload, stamp slots, signatories, display toggles |
| `LogoUploadSlot.tsx` | Reusable letterhead PNG uploader |
| `PngUploadSlot.tsx` | Reusable single-stamp PNG uploader (label + upload zone) |
| `SignatureUploadSlot.tsx` | Reusable signatory uploader (name + title + signature PNG) |
| `DocumentSidePanel.tsx` | Side panel wrapper — accepts `stampSlots?: string[]` prop |
| `DocumentsSubTab.tsx` | Orchestrates all export documents — passes `stampSlots` per `docKey` |
| `templates/SalesContractDocTemplate.tsx` | Reference implementation of the full layout pattern |
