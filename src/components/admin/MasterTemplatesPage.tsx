import { useState } from "react";
import { Plus, Edit3, Trash2, ArrowLeft, Save, Search, FileText } from "lucide-react";
import { useMasterTemplates } from "../../hooks/useMasterTemplates";
import type { MasterTemplate } from "../../types/master-template";
import { toast } from "../ui/toast-utils";
import { NeuronDropdown } from "../shared/NeuronDropdown";
import { LogoUploadSlot } from "../shared/document-preview/LogoUploadSlot";
import { PngUploadSlot } from "../shared/document-preview/PngUploadSlot";

// ── Simple field helpers ────────────────────────────────────────────

function FieldInput({ label, value, onChange, placeholder, autofilled, readOnly }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; autofilled?: boolean; readOnly?: boolean }) {
  if (readOnly) {
    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: autofilled ? "#237F66" : "#6B7A76", marginBottom: "6px" }}>{label}</label>
        <p style={{ margin: 0, fontSize: "14px", color: "#12332B" }}>{value || "—"}</p>
      </div>
    );
  }
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: autofilled ? "#237F66" : "#12332B", marginBottom: "6px" }}>
        {label}{autofilled && <span style={{ fontSize: "11px", fontWeight: 600, marginLeft: "6px", color: "#237F66" }}>auto-filled</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "—"}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${autofilled ? "#86C9B7" : "#E5ECE9"}`, borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#12332B", background: autofilled ? "#F0FAF7" : "white" }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, readOnly }: { label: string; value: string; onChange: (v: string) => void; options: string[]; readOnly?: boolean }) {
  if (readOnly) {
    return (
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#6B7A76", marginBottom: "6px" }}>{label}</label>
        <p style={{ margin: 0, fontSize: "14px", color: "#12332B" }}>{value || "—"}</p>
      </div>
    );
  }
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>{label}</label>
      <NeuronDropdown value={value} onChange={onChange} options={options} placeholder="Select..." />
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>{children}</div>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: "10px", border: "1px solid #E5ECE9", marginBottom: "20px" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5ECE9" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#237F66", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: "20px", display: "grid", gap: "16px" }}>{children}</div>
    </div>
  );
}

// ── Tab definitions ────────────────────────────────────────────────

type TabKey = "salesContract" | "commercialInvoice" | "packingList" | "declaration" | "formE" | "fsi";

const TABS: { key: TabKey; label: string }[] = [
  { key: "salesContract", label: "Sales Contract" },
  { key: "formE", label: "Form E" },
  { key: "fsi", label: "FSI" },
];

// ── Per-doc form renderers ─────────────────────────────────────────

function f(data: any, key: string) { return data[key] || ""; }
function s(setFn: (fn: (d: any) => any) => void, key: string) {
  return (v: string) => setFn((d) => ({ ...d, [key]: v }));
}

function SalesContractForm({ data, setData, readOnly }: { data: any; setData: any; autofilled?: Set<string>; readOnly?: boolean }) {
  return (
    <>
      <SectionCard title="Supplier & Seller">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Supplier" value={f(data, "supplierName")} onChange={s(setData, "supplierName")} />
          <FieldInput readOnly={readOnly} label="Supplier Address" value={f(data, "supplierAddress")} onChange={s(setData, "supplierAddress")} />
          <FieldInput readOnly={readOnly} label="Supplier Phone" value={f(data, "supplierPhone")} onChange={s(setData, "supplierPhone")} />
          <FieldInput readOnly={readOnly} label="Supplier Email" value={f(data, "supplierEmail")} onChange={s(setData, "supplierEmail")} />
          <FieldInput readOnly={readOnly} label="Seller" value={f(data, "sellerName")} onChange={s(setData, "sellerName")} />
          <FieldInput readOnly={readOnly} label="Seller Address" value={f(data, "sellerAddress")} onChange={s(setData, "sellerAddress")} />
        </Grid2>
      </SectionCard>
      <SectionCard title="Buyer">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Buyer Name" value={f(data, "buyerName")} onChange={s(setData, "buyerName")} />
          <FieldInput readOnly={readOnly} label="Buyer Address" value={f(data, "buyerAddress")} onChange={s(setData, "buyerAddress")} />
          <FieldInput readOnly={readOnly} label="Contact" value={f(data, "buyerContact")} onChange={s(setData, "buyerContact")} />
          <FieldInput readOnly={readOnly} label="Phone" value={f(data, "buyerPhone")} onChange={s(setData, "buyerPhone")} />
          <FieldInput readOnly={readOnly} label="Email" value={f(data, "buyerEmail")} onChange={s(setData, "buyerEmail")} />
        </Grid2>
      </SectionCard>
      <SectionCard title="Goods">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Commodity Description" value={f(data, "commodityDescription")} onChange={s(setData, "commodityDescription")} />
          <FieldInput readOnly={readOnly} label="Terms of Payment" value={f(data, "termsOfPayment")} onChange={s(setData, "termsOfPayment")} />
        </Grid2>
      </SectionCard>
      <SectionCard title="Bank Details">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Bank Name" value={f(data, "bankName")} onChange={s(setData, "bankName")} />
          <FieldInput readOnly={readOnly} label="Swift Code" value={f(data, "swiftCode")} onChange={s(setData, "swiftCode")} />
          <FieldInput readOnly={readOnly} label="Account No." value={f(data, "accountNo")} onChange={s(setData, "accountNo")} />
          <FieldInput readOnly={readOnly} label="Account Name" value={f(data, "accountName")} onChange={s(setData, "accountName")} />
          <FieldInput readOnly={readOnly} label="Bank Address" value={f(data, "bankAddress")} onChange={s(setData, "bankAddress")} />
        </Grid2>
      </SectionCard>
    </>
  );
}

function CommercialInvoiceForm({ data, setData, autofilled, readOnly }: { data: any; setData: any; autofilled?: Set<string>; readOnly?: boolean }) {
  const af = (k: string) => autofilled?.has(k);
  return (
    <>
      <SectionCard title="Consignee">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Consignee Name" value={f(data, "consigneeName")} onChange={s(setData, "consigneeName")} autofilled={af("consigneeName")} />
          <FieldInput readOnly={readOnly} label="Consignee Address" value={f(data, "consigneeAddress")} onChange={s(setData, "consigneeAddress")} autofilled={af("consigneeAddress")} />
          <FieldInput readOnly={readOnly} label="Contact" value={f(data, "consigneeContact")} onChange={s(setData, "consigneeContact")} autofilled={af("consigneeContact")} />
          <FieldInput readOnly={readOnly} label="Phone" value={f(data, "consigneePhone")} onChange={s(setData, "consigneePhone")} autofilled={af("consigneePhone")} />
          <FieldInput readOnly={readOnly} label="Email" value={f(data, "consigneeEmail")} onChange={s(setData, "consigneeEmail")} autofilled={af("consigneeEmail")} />
        </Grid2>
      </SectionCard>
      <SectionCard title="Bank Details">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Bank Name" value={f(data, "bankName")} onChange={s(setData, "bankName")} autofilled={af("bankName")} />
          <FieldInput readOnly={readOnly} label="Swift Code" value={f(data, "swiftCode")} onChange={s(setData, "swiftCode")} autofilled={af("swiftCode")} />
          <FieldInput readOnly={readOnly} label="Account No." value={f(data, "accountNo")} onChange={s(setData, "accountNo")} autofilled={af("accountNo")} />
          <FieldInput readOnly={readOnly} label="Account Name" value={f(data, "accountName")} onChange={s(setData, "accountName")} autofilled={af("accountName")} />
          <FieldInput readOnly={readOnly} label="Bank Address" value={f(data, "bankAddress")} onChange={s(setData, "bankAddress")} autofilled={af("bankAddress")} />
        </Grid2>
      </SectionCard>
    </>
  );
}

function PackingListForm({ data, setData, autofilled, readOnly }: { data: any; setData: any; autofilled?: Set<string>; readOnly?: boolean }) {
  const af = (k: string) => autofilled?.has(k);
  return (
    <SectionCard title="Shipped To">
      <Grid2>
        <FieldInput readOnly={readOnly} label="Name" value={f(data, "shippedToName")} onChange={s(setData, "shippedToName")} autofilled={af("shippedToName")} />
        <FieldInput readOnly={readOnly} label="Address" value={f(data, "shippedToAddress")} onChange={s(setData, "shippedToAddress")} autofilled={af("shippedToAddress")} />
        <FieldInput readOnly={readOnly} label="Contact" value={f(data, "shippedToContact")} onChange={s(setData, "shippedToContact")} autofilled={af("shippedToContact")} />
        <FieldInput readOnly={readOnly} label="Phone" value={f(data, "shippedToPhone")} onChange={s(setData, "shippedToPhone")} autofilled={af("shippedToPhone")} />
        <FieldInput readOnly={readOnly} label="Email" value={f(data, "shippedToEmail")} onChange={s(setData, "shippedToEmail")} autofilled={af("shippedToEmail")} />
        <FieldInput readOnly={readOnly} label="Description of Goods" value={f(data, "descriptionOfGoods")} onChange={s(setData, "descriptionOfGoods")} autofilled={af("descriptionOfGoods")} />
      </Grid2>
    </SectionCard>
  );
}

function DeclarationForm({ data, setData, autofilled, readOnly }: { data: any; setData: any; autofilled?: Set<string>; readOnly?: boolean }) {
  const af = (k: string) => autofilled?.has(k);
  return (
    <SectionCard title="Declaration">
      <FieldInput readOnly={readOnly} label="Description" value={f(data, "description")} onChange={s(setData, "description")} autofilled={af("description")} />
    </SectionCard>
  );
}

function FormEForm({ data, setData, readOnly }: { data: any; setData: any; autofilled?: Set<string>; readOnly?: boolean }) {
  return (
    <>
      <SectionCard title="Exporter">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Exporter Country" value={f(data, "exporterCountry")} onChange={s(setData, "exporterCountry")} />
          <FieldInput readOnly={readOnly} label="Importing Country" value={f(data, "importingCountry")} onChange={s(setData, "importingCountry")} />
        </Grid2>
      </SectionCard>
      <SectionCard title="Goods">
        <Grid2>
          <FieldInput readOnly={readOnly} label="Means of Transport" value={f(data, "meansOfTransport")} onChange={s(setData, "meansOfTransport")} />
          <FieldInput readOnly={readOnly} label="Item Number" value={f(data, "itemNumber")} onChange={s(setData, "itemNumber")} />
          <FieldInput readOnly={readOnly} label="Marks and Numbers on Packages" value={f(data, "marksAndNumbers")} onChange={s(setData, "marksAndNumbers")} />
          <FieldInput readOnly={readOnly} label="Notify Party" value={f(data, "packagesNotifyParty")} onChange={s(setData, "packagesNotifyParty")} />
          <FieldInput readOnly={readOnly} label="Notify Address" value={f(data, "packagesNotifyAddress")} onChange={s(setData, "packagesNotifyAddress")} />
          <FieldInput readOnly={readOnly} label="Origin Criteria" value={f(data, "originCriteria")} onChange={s(setData, "originCriteria")} />
          <FieldInput readOnly={readOnly} label="HS Code" value={f(data, "packagesHsCode")} onChange={s(setData, "packagesHsCode")} />
        </Grid2>
      </SectionCard>
    </>
  );
}

function FSIForm({ data, setData, readOnly }: { data: any; setData: any; autofilled?: Set<string>; readOnly?: boolean }) {
  return (
    <SectionCard title="Shipping">
      <Grid2>
        <FieldInput readOnly={readOnly} label="To" value={f(data, "to")} onChange={s(setData, "to")} />
        <FieldInput readOnly={readOnly} label="Attn" value={f(data, "attn")} onChange={s(setData, "attn")} />
        <FieldInput readOnly={readOnly} label="From" value={f(data, "from")} onChange={s(setData, "from")} />
        <FieldInput readOnly={readOnly} label="Billed To" value={f(data, "billedTo")} onChange={s(setData, "billedTo")} />
        <FieldInput readOnly={readOnly} label="Notify Party" value={f(data, "notifyParty")} onChange={s(setData, "notifyParty")} />
        <FieldSelect readOnly={readOnly} label="Freight Term" value={f(data, "freightTerm")} onChange={s(setData, "freightTerm")} options={["Prepaid", "Collect"]} />
        <FieldSelect readOnly={readOnly} label="LSS" value={f(data, "lss")} onChange={s(setData, "lss")} options={["Prepaid", "Collect"]} />
        <FieldInput readOnly={readOnly} label="HS Code" value={f(data, "hsCode")} onChange={s(setData, "hsCode")} />
        <FieldInput readOnly={readOnly} label="USCI Code" value={f(data, "usciCode")} onChange={s(setData, "usciCode")} />
      </Grid2>
    </SectionCard>
  );
}

// ── Auto-fill mapping from Sales Contract ─────────────────────────

function deriveFromSC(sc: any): Partial<Record<Exclude<TabKey, "salesContract">, any>> {
  const buyer = {
    consigneeName: sc.buyerName || "",
    consigneeAddress: sc.buyerAddress || "",
    consigneeContact: sc.buyerContact || "",
    consigneePhone: sc.buyerPhone || "",
    consigneeEmail: sc.buyerEmail || "",
  };
  return {
    commercialInvoice: {
      ...buyer,
      description: sc.commodityDescription || "",
      bankName: sc.bankName || "",
      swiftCode: sc.swiftCode || "",
      accountNo: sc.accountNo || "",
      accountName: sc.accountName || "",
      bankAddress: sc.bankAddress || "",
    },
    packingList: {
      shippedToName: sc.buyerName || "",
      shippedToAddress: sc.buyerAddress || "",
      shippedToContact: sc.buyerContact || "",
      shippedToPhone: sc.buyerPhone || "",
      shippedToEmail: sc.buyerEmail || "",
      descriptionOfGoods: sc.commodityDescription || "",
    },
    declaration: {
      description: sc.commodityDescription || "",
    },
    formE: {
      consigneeName: sc.buyerName || "",
      consigneeAddress: sc.buyerAddress || "",
      consigneeContactPerson: sc.buyerContact || "",
      consigneeContactNumber: sc.buyerPhone || "",
      consigneeContactEmail: sc.buyerEmail || "",
      packagesCommodity: sc.commodityDescription || "",
    },
    fsi: {
      shipperName: sc.supplierName || "",
      shipperAddress: sc.supplierAddress || "",
      consigneeName: sc.buyerName || "",
      consigneeAddress: sc.buyerAddress || "",
      consigneeContactPerson: sc.buyerContact || "",
      consigneeContactNumber: sc.buyerPhone || "",
      consigneeEmail: sc.buyerEmail || "",
      commodity: sc.commodityDescription || "",
    },
  };
}

// Keys that were auto-filled per doc (to highlight green)
function getAutofilledKeys(sc: any): Partial<Record<Exclude<TabKey, "salesContract">, Set<string>>> {
  const derived = deriveFromSC(sc);
  const result: any = {};
  for (const [docKey, fields] of Object.entries(derived)) {
    result[docKey] = new Set(
      Object.entries(fields as any)
        .filter(([, v]) => !!v)
        .map(([k]) => k)
    );
  }
  return result;
}

const DOC_FORMS: Record<TabKey, React.ComponentType<{ data: any; setData: any; autofilled?: Set<string> }>> = {
  salesContract: SalesContractForm,
  commercialInvoice: CommercialInvoiceForm,
  packingList: PackingListForm,
  declaration: DeclarationForm,
  formE: FormEForm,
  fsi: FSIForm,
};

// ── Empty template factory ─────────────────────────────────────────

const STAMP_SLOTS = ["buyer", "seller", "supplier"];

function emptyTemplate(): Omit<MasterTemplate, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    description: "",
    letterhead: undefined,
    shippingLineLetterhead: undefined,
    stamps: {},
    salesContract: {},
    commercialInvoice: {},
    packingList: {},
    declaration: {},
    formE: {},
    fsi: {},
  };
}

// ── Edit/Create view ───────────────────────────────────────────────

type EditorTab = TabKey | "branding";

function TemplateEditor({ initial, onSave, onCancel }: {
  initial: Partial<MasterTemplate> & { name: string };
  onSave: (t: typeof initial) => void;
  onCancel: () => void;
}) {
  const isNew = !initial.id;
  const [isEditing, setIsEditing] = useState(isNew);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description || "");
  const [letterhead, setLetterhead] = useState<string | undefined>(initial.letterhead);
  const [shippingLineLetterhead, setShippingLineLetterhead] = useState<string | undefined>(initial.shippingLineLetterhead);
  const [stamps, setStamps] = useState<Record<string, string>>(initial.stamps || {});
  const [activeTab, setActiveTab] = useState<EditorTab>("salesContract");
  const [docs, setDocs] = useState({
    salesContract: initial.salesContract || {},
    commercialInvoice: initial.commercialInvoice || {},
    packingList: initial.packingList || {},
    declaration: initial.declaration || {},
    formE: initial.formE || {},
    fsi: initial.fsi || {},
  });

  const setDoc = (key: TabKey) => (fn: (d: any) => any) => {
    setDocs((prev) => ({ ...prev, [key]: fn(prev[key]) }));
  };

  const autoSaveAsset = (patch: { letterhead?: string | undefined; shippingLineLetterhead?: string | undefined; stamps?: Record<string, string> }) => {
    if (!initial.id) return; // only auto-save existing templates
    const cleanStamps: Record<string, string> = {};
    const mergedStamps = { ...stamps, ...(patch.stamps || {}) };
    for (const [k, v] of Object.entries(mergedStamps)) { if (v) cleanStamps[k] = v; }
    onSave({
      ...initial,
      name: name.trim() || initial.name,
      description,
      letterhead: "letterhead" in patch ? patch.letterhead : letterhead,
      shippingLineLetterhead: "shippingLineLetterhead" in patch ? patch.shippingLineLetterhead : shippingLineLetterhead,
      stamps: cleanStamps,
      ...docs,
    });
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Template name is required"); return; }
    const cleanStamps: Record<string, string> = {};
    for (const [k, v] of Object.entries(stamps)) { if (v) cleanStamps[k] = v; }
    onSave({ ...initial, name: name.trim(), description, letterhead, shippingLineLetterhead, stamps: cleanStamps, ...docs });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset fields to original values
    setName(initial.name);
    setDescription(initial.description || "");
    setLetterhead(initial.letterhead);
    setShippingLineLetterhead(initial.shippingLineLetterhead);
    setStamps(initial.stamps || {});
    setDocs({
      salesContract: initial.salesContract || {},
      commercialInvoice: initial.commercialInvoice || {},
      packingList: initial.packingList || {},
      declaration: initial.declaration || {},
      formE: initial.formE || {},
      fsi: initial.fsi || {},
    });
    setIsEditing(false);
  };

  const ALL_EDITOR_TABS: { key: EditorTab; label: string }[] = [
    ...TABS,
    { key: "branding", label: "Assets" },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", border: "1px solid #E5ECE9", borderRadius: "8px", background: "#FFFFFF", cursor: "pointer", color: "#6B7A76" }}>
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#12332B", margin: 0 }}>
          {initial.name || "New Master Template"}
        </h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {isEditing ? (
            <>
              {!isNew && (
                <button onClick={handleCancelEdit} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 500, border: "1px solid #E5ECE9", borderRadius: "8px", background: "#FFFFFF", color: "#6B7A76", cursor: "pointer" }}>
                  Cancel
                </button>
              )}
              <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 500, border: "none", borderRadius: "8px", background: "#237F66", color: "#FFFFFF", cursor: "pointer" }}>
                <Save size={14} /> Save Template
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 500, border: "1px solid #E5ECE9", borderRadius: "8px", background: "#FFFFFF", color: "#12332B", cursor: "pointer" }}>
              <Edit3 size={14} /> Edit Template
            </button>
          )}
        </div>
      </div>

      {/* Name + description */}
      <div style={{ background: "white", borderRadius: "10px", border: "1px solid #E5ECE9", padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {isEditing ? (
            <>
              <FieldInput label="Template Name *" value={name} onChange={setName} placeholder="e.g. ABC Trading — Hamburg Route" />
              <FieldInput label="Description (optional)" value={description} onChange={setDescription} placeholder="Short note about this template" />
            </>
          ) : (
            <>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6B7A76", marginBottom: "6px" }}>Template Name</label>
                <p style={{ margin: 0, fontSize: "14px", color: "#12332B" }}>{name || "—"}</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6B7A76", marginBottom: "6px" }}>Description</label>
                <p style={{ margin: 0, fontSize: "14px", color: "#12332B" }}>{description || "—"}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Doc tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #E5ECE9" }}>
        {ALL_EDITOR_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 16px", fontSize: "13px", fontWeight: 500, border: "none", borderRadius: "8px 8px 0 0",
                background: isActive ? "#237F66" : "transparent",
                color: isActive ? "#FFFFFF" : "#6B7A76",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "branding" ? (
        <>
          <SectionCard title="Supplier Letterhead">
            <LogoUploadSlot value={letterhead} onChange={(v) => { setLetterhead(v); autoSaveAsset({ letterhead: v }); }} />
            <p style={{ fontSize: "12px", color: "#6B7A76", margin: "4px 0 0" }}>
              Displayed at the top of trade documents (Sales Contract, Commercial Invoice, Packing List, etc.).
            </p>
          </SectionCard>
          <SectionCard title="Shipping Line Letterhead">
            <LogoUploadSlot value={shippingLineLetterhead} onChange={(v) => { setShippingLineLetterhead(v); autoSaveAsset({ shippingLineLetterhead: v }); }} />
            <p style={{ fontSize: "12px", color: "#6B7A76", margin: "4px 0 0" }}>
              Displayed at the top of FSI documents.
            </p>
          </SectionCard>
          <SectionCard title="Stamps &amp; Seals">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {STAMP_SLOTS.map((slot) => (
                <PngUploadSlot
                  key={slot}
                  label={slot === "supplier" ? "Supplier / Manager" : slot.charAt(0).toUpperCase() + slot.slice(1)}
                  value={stamps[slot]}
                  onChange={(v) => {
                    const updated = { ...stamps, [slot]: v || "" };
                    setStamps(updated);
                    autoSaveAsset({ stamps: updated });
                  }}
                />
              ))}
            </div>
          </SectionCard>
        </>
      ) : (
        (() => { const DocForm = DOC_FORMS[activeTab as TabKey]; return <DocForm data={docs[activeTab as TabKey]} setData={setDoc(activeTab as TabKey)} readOnly={!isEditing} />; })()
      )}
    </div>
  );
}

// ── List view ──────────────────────────────────────────────────────

export function MasterTemplatesPage() {
  const { templates, save, remove } = useMasterTemplates();
  const [editing, setEditing] = useState<Partial<MasterTemplate> & { name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNew = () => setEditing({ ...emptyTemplate() });
  const handleEdit = (t: MasterTemplate) => setEditing({ ...t });

  const handleDelete = (t: MasterTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    remove(t.id);
    toast.success("Template deleted");
  };

  const handleSave = (data: any) => {
    const now = new Date().toISOString();
    const template: MasterTemplate = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      description: data.description,
      letterhead: data.letterhead,
      shippingLineLetterhead: data.shippingLineLetterhead,
      stamps: data.stamps || {},
      salesContract: data.salesContract || {},
      commercialInvoice: data.commercialInvoice || {},
      packingList: data.packingList || {},
      declaration: data.declaration || {},
      formE: data.formE || {},
      fsi: data.fsi || {},
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    save(template);
    toast.success(data.id ? "Template updated" : "Template created");
    setEditing(template);
  };

  if (editing !== null) {
    return <TemplateEditor initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  const filtered = templates.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ position: "relative", maxWidth: "280px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            style={{
              width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #E5ECE9",
              borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={handleNew}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "8px", background: "#237F66", color: "#FFFFFF", cursor: "pointer" }}
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px" }}>
          <FileText size={36} style={{ color: "#D1D5DB", marginBottom: "12px" }} />
          <p style={{ fontSize: "14px", color: "#6B7A76", margin: 0 }}>
            {templates.length === 0 ? "No templates yet. Create one to get started." : "No templates match your search."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => handleEdit(t)}
              style={{
                display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px",
                border: "1px solid #E5ECE9", borderRadius: "10px", background: "white",
                cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#237F66")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5ECE9")}
            >
              <FileText size={20} style={{ color: "#237F66", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>{t.name}</div>
                <div style={{ fontSize: "12px", color: "#6B7A76", marginTop: "2px", display: "flex", gap: "8px", alignItems: "center" }}>
                  {t.description && <span>{t.description}</span>}
                  <span style={{ color: "#9CA3AF" }}>· Updated {new Date(t.updatedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</span>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(t, e)}
                style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", flexShrink: 0 }}
                title="Delete template"
              >
                <Trash2 size={16} />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
