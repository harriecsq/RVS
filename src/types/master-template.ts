import type {
  SalesContract,
  CommercialInvoice,
  PackingList,
  Declaration,
  FormE,
  FSI,
} from "./export-documents";

export interface MasterTemplate {
  id: string;
  name: string;
  description?: string;
  letterhead?: string; // base64 PNG — supplier letterhead
  shippingLineLetterhead?: string; // base64 PNG — shipping line letterhead (used in FSI)
  stamps?: Record<string, string>; // slot -> base64 PNG
  salesContract: Partial<SalesContract>;
  commercialInvoice: Partial<CommercialInvoice>;
  packingList: Partial<PackingList>;
  declaration: Partial<Declaration>;
  formE: Partial<FormE>;
  fsi: Partial<FSI>;
  createdAt: string;
  updatedAt: string;
}
