// ── Document Template Types ────────────────────────────────────────────

export type TemplateDocType =
  | "salesContract"
  | "commercialInvoice"
  | "packingList"
  | "declaration"
  | "formE"
  | "fsi";

export interface DocumentTemplate {
  id: string;
  clientId?: string;
  clientName?: string;
  docType: TemplateDocType;
  name: string;
  fields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface DocumentTemplateSummary {
  id: string;
  clientId?: string;
  clientName?: string;
  docType: TemplateDocType;
  name: string;
  updatedAt: string;
}

export const DOC_TYPE_LABELS: Record<TemplateDocType, string> = {
  salesContract: "Sales Contract",
  commercialInvoice: "Commercial Invoice",
  packingList: "Packing List",
  declaration: "Declaration",
  formE: "Form E",
  fsi: "FSI",
};
