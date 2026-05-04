import type { TemplateDocType } from "../types/document-templates";

/**
 * Fields that are always booking-specific and should never be saved in a template.
 * These are excluded by default when saving a template from a filled document,
 * and are always overwritten by booking data when applying a template.
 */
export const BOOKING_SPECIFIC_FIELDS: Record<TemplateDocType, string[]> = {
  salesContract: [
    "refNo", "date",
    "quantity", "unitPrice", "totalAmount",
    "masterTemplateId",
    "createdAt", "updatedAt", "createdBy",
  ],
  commercialInvoice: [
    "invoiceNo", "date",
    "marksAndNos", "description", "totalNetWeight", "unitPrice", "totalInvoiceValue",
    "createdAt", "updatedAt", "createdBy",
  ],
  packingList: [
    "refNo", "date", "vesselVoyage", "shipmentDate", "volume", "containers",
    "createdAt", "updatedAt", "createdBy",
  ],
  declaration: [
    "refNo", "date", "vesselVoyage", "blNumber", "containers",
    "createdAt", "updatedAt", "createdBy",
  ],
  formE: [
    "departureDate", "vessel",
    "invoiceNumber", "invoiceDated", "grossWeight",
    "createdAt", "updatedAt", "createdBy",
  ],
  fsi: [
    "id", "bookingId", "vesselVoyageNo", "containers",
    "bookingNumber", "grossWeight", "measurement",
    "totalNumberOfContainers",
    "createdAt", "updatedAt", "createdBy",
  ],
};

/** Extract only the templatable fields from a document object. */
export function extractTemplatableFields(
  docType: TemplateDocType,
  data: Record<string, any>,
): Record<string, any> {
  const excluded = new Set(BOOKING_SPECIFIC_FIELDS[docType]);
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!excluded.has(key) && value !== "" && value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
}
