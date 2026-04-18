import type { TemplateDocType } from "../../../types/document-templates";
import { BOOKING_SPECIFIC_FIELDS } from "../../../constants/template-excluded-fields";

// ── Field definitions per doc type (only templatable fields) ────────

interface FieldDef {
  key: string;
  label: string;
  section: string;
}

const SALES_CONTRACT_FIELDS: FieldDef[] = [
  { key: "supplierName", label: "Supplier", section: "Supplier & Seller" },
  { key: "supplierAddress", label: "Supplier Address", section: "Supplier & Seller" },
  { key: "sellerName", label: "Seller", section: "Supplier & Seller" },
  { key: "sellerAddress", label: "Seller Address", section: "Supplier & Seller" },
  { key: "buyerName", label: "Buyer", section: "Buyer" },
  { key: "buyerAddress", label: "Address", section: "Buyer" },
  { key: "buyerContact", label: "Contact", section: "Buyer" },
  { key: "buyerPhone", label: "Phone", section: "Buyer" },
  { key: "buyerEmail", label: "Email", section: "Buyer" },
  { key: "commodityDescription", label: "Commodity Description", section: "Goods" },
  { key: "portOfLoading", label: "Port of Loading", section: "Shipping" },
  { key: "portOfDestination", label: "Port of Destination", section: "Shipping" },
  { key: "termsOfPayment", label: "Terms of Payment", section: "Shipping" },
  { key: "bankName", label: "Bank", section: "Bank Details" },
  { key: "swiftCode", label: "Swift Code", section: "Bank Details" },
  { key: "accountNo", label: "Account No.", section: "Bank Details" },
  { key: "accountName", label: "Account Name", section: "Bank Details" },
  { key: "bankAddress", label: "Bank Address", section: "Bank Details" },
];

const COMMERCIAL_INVOICE_FIELDS: FieldDef[] = [
  { key: "portOfLoading", label: "Port of Loading", section: "Shipping" },
  { key: "portOfDischarge", label: "Port of Discharge", section: "Shipping" },
  { key: "consigneeName", label: "Consignee", section: "Consignee" },
  { key: "consigneeAddress", label: "Address", section: "Consignee" },
  { key: "consigneeContact", label: "Contact", section: "Consignee" },
  { key: "consigneePhone", label: "Phone", section: "Consignee" },
  { key: "consigneeEmail", label: "Email", section: "Consignee" },
  { key: "description", label: "Commodity Description", section: "Goods" },
  { key: "bankName", label: "Bank", section: "Bank Details" },
  { key: "swiftCode", label: "Swift Code", section: "Bank Details" },
  { key: "accountNo", label: "Account No.", section: "Bank Details" },
  { key: "accountName", label: "Account Name", section: "Bank Details" },
  { key: "bankAddress", label: "Bank Address", section: "Bank Details" },
];

const PACKING_LIST_FIELDS: FieldDef[] = [
  { key: "shippedToName", label: "Shipped To", section: "Consignee" },
  { key: "shippedToAddress", label: "Address", section: "Consignee" },
  { key: "shippedToContact", label: "Contact", section: "Consignee" },
  { key: "shippedToPhone", label: "Phone", section: "Consignee" },
  { key: "shippedToEmail", label: "Email", section: "Consignee" },
  { key: "placeOfOrigin", label: "Place of Origin", section: "Shipping" },
  { key: "portOfDischarge", label: "Port of Discharge", section: "Shipping" },
  { key: "descriptionOfGoods", label: "Description of Goods", section: "Goods" },
  { key: "commodity", label: "Commodity", section: "Goods" },
];

const DECLARATION_FIELDS: FieldDef[] = [
  { key: "description", label: "Commodity Description", section: "Goods" },
];

const FORM_E_FIELDS: FieldDef[] = [
  { key: "exporterName", label: "Exporter", section: "Exporter" },
  { key: "exporterAddress", label: "Address", section: "Exporter" },
  { key: "exporterContactNumber", label: "Contact Number", section: "Exporter" },
  { key: "exporterEmail", label: "Email", section: "Exporter" },
  { key: "consigneeName", label: "Consignee", section: "Consignee" },
  { key: "consigneeAddress", label: "Address", section: "Consignee" },
  { key: "consigneeContactPerson", label: "Contact Person", section: "Consignee" },
  { key: "consigneeContactNumber", label: "Contact Number", section: "Consignee" },
  { key: "consigneeContactEmail", label: "Email", section: "Consignee" },
  { key: "portOfDischarge", label: "Port of Discharge", section: "Shipping" },
  { key: "exporterCountry", label: "Exporter Country", section: "Countries" },
  { key: "importingCountry", label: "Importing Country", section: "Countries" },
  { key: "originCriteria", label: "Origin Criteria", section: "Goods" },
  { key: "packagesDescription", label: "Packages Description", section: "Goods" },
];

const FSI_FIELDS: FieldDef[] = [
  { key: "shipperName", label: "Shipper", section: "Shipper" },
  { key: "shipperAddress", label: "Address", section: "Shipper" },
  { key: "shipperContactNumber", label: "Contact Number", section: "Shipper" },
  { key: "shipperEmail", label: "Email", section: "Shipper" },
  { key: "consigneeName", label: "Consignee", section: "Consignee" },
  { key: "consigneeAddress", label: "Address", section: "Consignee" },
  { key: "consigneeContactPerson", label: "Contact Person", section: "Consignee" },
  { key: "consigneeContactNumber", label: "Contact Number", section: "Consignee" },
  { key: "consigneeEmail", label: "Email", section: "Consignee" },
  { key: "notifyParty", label: "Notify Party", section: "Notify Party" },
  { key: "preCarriageBy", label: "Pre-carriage By", section: "Shipping" },
  { key: "portOfDischarge", label: "Port of Discharge", section: "Shipping" },
  { key: "placeOfDelivery", label: "Place of Delivery", section: "Shipping" },
  { key: "freightTerm", label: "Freight Term", section: "Shipping" },
  { key: "lss", label: "LSS", section: "Shipping" },
  { key: "billedTo", label: "Billed To", section: "Booking Reference" },
  { key: "descriptionOfGoods", label: "Description of Goods", section: "Cargo" },
  { key: "hsCode", label: "HS Code", section: "Customs" },
  { key: "usciCode", label: "USCI Code", section: "Customs" },
];

const FIELD_DEFS: Record<TemplateDocType, FieldDef[]> = {
  salesContract: SALES_CONTRACT_FIELDS,
  commercialInvoice: COMMERCIAL_INVOICE_FIELDS,
  packingList: PACKING_LIST_FIELDS,
  declaration: DECLARATION_FIELDS,
  formE: FORM_E_FIELDS,
  fsi: FSI_FIELDS,
};

// ── Component ──────────────────────────────────────────────────────

interface TemplateEditorFormProps {
  docType: TemplateDocType;
  fields: Record<string, any>;
  onChange: (fields: Record<string, any>) => void;
}

export function TemplateEditorForm({ docType, fields, onChange }: TemplateEditorFormProps) {
  const defs = FIELD_DEFS[docType] || [];

  const setField = (key: string, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  // Group fields by section
  const sections: { name: string; items: FieldDef[] }[] = [];
  const seen = new Set<string>();
  for (const def of defs) {
    if (!seen.has(def.section)) {
      seen.add(def.section);
      sections.push({ name: def.section, items: defs.filter((d) => d.section === def.section) });
    }
  }

  if (defs.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
        This document type has very few templatable fields.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {sections.map((section) => (
        <div key={section.name} style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E9F0" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #E5E9F0" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0F766E", margin: 0 }}>
              {section.name}
            </h3>
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {section.items.map((def) => (
              <div key={def.key}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>
                  {def.label}
                </label>
                {def.key === "packagesDescription" || def.key === "descriptionOfGoods" ? (
                  <textarea
                    value={fields[def.key] || ""}
                    onChange={(e) => setField(def.key, e.target.value)}
                    placeholder="—"
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 14px", border: "1px solid #E5ECE9",
                      borderRadius: "6px", fontSize: "14px", color: "#12332B",
                      outline: "none", boxSizing: "border-box", resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={fields[def.key] || ""}
                    onChange={(e) => setField(def.key, e.target.value)}
                    placeholder="—"
                    style={{
                      width: "100%", padding: "10px 14px", border: "1px solid #E5ECE9",
                      borderRadius: "6px", fontSize: "14px", color: "#12332B",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { FIELD_DEFS };
