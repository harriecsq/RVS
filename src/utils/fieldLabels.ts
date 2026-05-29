// Human-readable labels + value formatting for activity-log field diffs.
// Diff keys are the camelCase keys stored in each entity's `data` jsonb (plus a
// few scalar columns). Curated entries give a label/section/type; anything not
// listed falls back to a de-camelCased label so every field stays readable.

export type FieldType = "currency" | "date" | "datetime" | "company" | "tags" | "text";

interface FieldMeta {
  label: string;
  section?: string;
  type?: FieldType;
}

export const FIELD_LABELS: Record<string, FieldMeta> = {
  // --- Booking: shipment details ---
  date: { label: "Date", section: "Shipment Details", type: "date" },
  shipper: { label: "Shipper", section: "Shipment Details", type: "company" },
  consignee: { label: "Consignee", section: "Shipment Details", type: "company" },
  containerNo: { label: "Container No.", section: "Shipment Details" },
  sealNo: { label: "Seal No.", section: "Shipment Details" },
  volume: { label: "Volume", section: "Shipment Details" },
  commodity: { label: "Commodity", section: "Shipment Details" },
  blNumber: { label: "BL Number", section: "Shipment Details" },
  shippingLine: { label: "Shipping Line", section: "Shipment Details" },
  shippingLineStatus: { label: "Shipping Line Status", section: "Shipment Details" },
  origin: { label: "POL (Port of Loading)", section: "Shipment Details" },
  pod: { label: "POD (Port of Destination)", section: "Shipment Details" },
  destination: { label: "Destination", section: "Shipment Details" },
  incoterm: { label: "Incoterm", section: "Shipment Details" },
  mode: { label: "Mode", section: "Shipment Details" },
  clientName: { label: "Client", section: "Shipment Details" },
  status: { label: "Status", section: "Shipment Details" },
  carrier: { label: "Carrier", section: "Shipment Details" },
  shipmentTags: { label: "Shipment Tags", section: "Shipment Details", type: "tags" },

  // --- Booking: vessel/voyage ---
  vesselVoyage: { label: "Vessel/VOY", section: "Vessel/VOY Details" },
  vesselStatus: { label: "Vessel Status", section: "Vessel/VOY Details" },
  etd: { label: "ETD", section: "Vessel/VOY Details", type: "datetime" },
  atd: { label: "ATD", section: "Vessel/VOY Details", type: "datetime" },
  eta: { label: "ETA", section: "Vessel/VOY Details", type: "datetime" },
  ata: { label: "ATA", section: "Vessel/VOY Details", type: "datetime" },
  lctEdArrastre: { label: "LCT ED/Arrastre", section: "Vessel/VOY Details", type: "datetime" },
  lctCargo: { label: "LCT Cargo", section: "Vessel/VOY Details", type: "datetime" },

  // --- Booking: trucking ---
  loadingAddress: { label: "Loading Address", section: "Trucking" },
  loadingSchedule: { label: "Loading Schedule", section: "Trucking", type: "date" },

  // --- Booking: costs ---
  domesticFreight: { label: "Domestic Freight", section: "Domestic Cost", type: "currency" },
  hustlingStripping: { label: "Hustling/Stripping", section: "Domestic Cost", type: "currency" },
  forkliftOperator: { label: "Forklift Operator", section: "Domestic Cost", type: "currency" },
  oceanFreight: { label: "Ocean Freight", section: "Shipping Line Cost", type: "currency" },
  sealFee: { label: "Seal Fee", section: "Shipping Line Cost", type: "currency" },
  docsFee: { label: "Docs Fee", section: "Shipping Line Cost", type: "currency" },
  lssFee: { label: "LSS Fee", section: "Shipping Line Cost", type: "currency" },
  storageCost: { label: "Storage Cost", section: "Shipping Line Cost", type: "currency" },
  arrastre: { label: "Arrastre", section: "Port Charges Cost", type: "currency" },
  shutOut: { label: "Shut Out", section: "Port Charges Cost", type: "currency" },
  royaltyFee: { label: "Royalty Fee", section: "Miscellaneous Cost", type: "currency" },
  lona: { label: "LONA", section: "Miscellaneous Cost", type: "currency" },
  lalamove: { label: "Lalamove", section: "Miscellaneous Cost", type: "currency" },
  bir: { label: "BIR", section: "Miscellaneous Cost", type: "currency" },
  labor: { label: "Labor", section: "Miscellaneous Cost", type: "currency" },
  otherCharges: { label: "Other Charges", section: "Miscellaneous Cost", type: "currency" },

  // --- Booking: operational ---
  section: { label: "Section", section: "Operational Details" },
  selectivity: { label: "Selectivity", section: "Operational Details" },
  discharged: { label: "Discharged", section: "Operational Details", type: "datetime" },
  storageBegins: { label: "Storage Begins", section: "Operational Details", type: "datetime" },
  demBegins: { label: "DEM Begins", section: "Operational Details", type: "datetime" },
  ot: { label: "OT", section: "Operational Details" },
  gatepass: { label: "Gatepass", section: "Operational Details", type: "datetime" },

  // --- Accounting (billings / expenses / vouchers / collections) ---
  description: { label: "Description" },
  amount: { label: "Amount", type: "currency" },
  rate: { label: "Rate", type: "currency" },
  quantity: { label: "Quantity" },
  currency: { label: "Currency" },
  total: { label: "Total", type: "currency" },
  vatAmount: { label: "VAT", type: "currency" },
  exchangeRate: { label: "Exchange Rate" },
  payee: { label: "Payee" },
  particular: { label: "Particular" },
  paymentMethod: { label: "Payment Method" },
  referenceNo: { label: "Reference No." },
  invoiceDate: { label: "Invoice Date", type: "date" },
  dueDate: { label: "Due Date", type: "date" },
  billingDate: { label: "Billing Date", type: "date" },
  voucherDate: { label: "Voucher Date", type: "date" },
  paymentDate: { label: "Payment Date", type: "date" },
  collectionDate: { label: "Collection Date", type: "date" },

  // --- Client ---
  name: { label: "Name" },
  companyName: { label: "Company Name" },
  email: { label: "Email" },
  phone: { label: "Phone" },
  address: { label: "Address" },
  industry: { label: "Industry" },
  tin: { label: "TIN" },
  contactPerson: { label: "Contact Person" },
};

const ACRONYMS = new Set(["id", "tin", "vat", "bir", "ot", "pod", "pol", "lcl", "fcl", "bl", "lss", "eta", "etd", "atd", "ata", "cds"]);

// Turn an un-curated camelCase / snake_case key into a readable label.
function humanize(key: string): string {
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return spaced
    .split(" ")
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function labelFor(key: string): string {
  return FIELD_LABELS[key]?.label ?? humanize(key);
}

export function sectionFor(key: string): string | undefined {
  return FIELD_LABELS[key]?.section;
}

const isoDate = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/;

function formatNumberLike(v: unknown): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Polished display for a single old/new value.
export function formatFieldValue(key: string, value: unknown): string {
  if (value == null || value === "") return "(empty)";
  const type = FIELD_LABELS[key]?.type;

  if (type === "currency") return formatNumberLike(value);

  if (type === "tags" || Array.isArray(value)) {
    const arr = Array.isArray(value) ? value : [value];
    return arr.length ? arr.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ") : "(empty)";
  }

  if (type === "company" || (typeof value === "object" && value !== null)) {
    const o = value as Record<string, unknown>;
    const name = o.name ?? o.companyName ?? o.company_name ?? o.label;
    if (name) return String(name);
    if (typeof value !== "object") return String(value);
    return JSON.stringify(value);
  }

  if ((type === "date" || type === "datetime" || isoDate.test(String(value)))) {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) {
      const hasTime = /\d{2}:\d{2}/.test(String(value)) && type !== "date";
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        + (hasTime ? ` ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : "");
    }
  }

  return String(value);
}
