import type { ReactNode } from "react";
import { DocumentPreviewShell } from "./DocumentPreviewShell";
import { VoucherDocTemplate } from "./templates/VoucherDocTemplate";
import { BillingDocTemplate } from "./templates/BillingDocTemplate";
import type { DocumentSettings } from "../../../types/document-settings";

/**
 * Two PDF-view variations: Voucher and Billing.
 *
 * Each wraps DocumentPreviewShell + its doc template + the entity→template
 * data mapping, lifted out of ViewVoucherScreen / ViewBillingScreen so the
 * print preview can be reused. `shipment` is the resolved booking-detail
 * snapshot (see BookingDetailsCard's resolver).
 *
 * Render only when the entity exists and the screen is in "pdf" view mode.
 */

interface Shipment {
  blNumber?: string;
  vesselVoy?: string;       // voucher naming
  vessel?: string;          // billing naming
  containers?: string[];
  origin?: string;
  destination?: string;
  volume?: string;
  commodity?: string;
  consignee?: string;
  shipper?: string;
  clientName?: string;
  companyName?: string;
}

// ─── Variation 1: Voucher ────────────────────────────────────────────────────

interface VoucherPdfViewProps {
  voucher: any;
  shipment: Shipment;
  /** Particulars + distribution line-item arrays. */
  lineItems: any[];
  distribution: any[];
  settings: DocumentSettings;
}

export function VoucherPdfView({ voucher, shipment, lineItems, distribution, settings }: VoucherPdfViewProps) {
  return (
    <DocumentPreviewShell>
      <VoucherDocTemplate
        data={{
          voucherNumber: voucher.voucherNumber,
          voucherDate: voucher.voucherDate,
          payee: voucher.payee,
          currency: voucher.currency,
          blNumber: shipment.blNumber,
          vesselVoy: shipment.vesselVoy,
          containerNumbers: shipment.containers,
          origin: shipment.origin,
          destination: shipment.destination,
          volume: shipment.volume,
          commodity: shipment.commodity,
          consignee: shipment.consignee,
          bank: voucher.bank,
          checkNo: voucher.referenceNumber || voucher.checkNo,
          paymentMethod: voucher.paymentMethod,
          referenceNumber: voucher.referenceNumber || voucher.checkNo,
          lineItems,
          distribution,
          totalAmount: voucher.amount,
          preparedBy: voucher.preparedBy,
          certifiedBy: voucher.checkedBy,
          approvedBy: voucher.approvedBy,
        }}
        settings={settings}
      />
    </DocumentPreviewShell>
  );
}

// ─── Variation 2: Billing ────────────────────────────────────────────────────

interface BillingPdfViewProps {
  billing: any;
  shipment: Shipment;
  isExport: boolean;
  isImport: boolean;
  settings: DocumentSettings;
  /** Optional letterhead settings panel rendered in the shell's settings slot. */
  settingsPanel?: ReactNode;
}

export function BillingPdfView({ billing, shipment, isExport, isImport, settings, settingsPanel }: BillingPdfViewProps) {
  return (
    <DocumentPreviewShell settings={settingsPanel}>
      <BillingDocTemplate
        data={{
          billingNumber: billing.billingNumber,
          billingDate: billing.billingDate,
          clientName: shipment.clientName || billing.clientName,
          companyName: shipment.companyName || billing.companyName,
          shipper: shipment.shipper,
          consignee: shipment.consignee,
          shipmentType: isExport ? "export" : isImport ? "import" : "",
          currency: billing.currency,
          particulars: billing.particulars,
          totalAmount: billing.totalAmount,
          vessel: shipment.vessel,
          blNumber: shipment.blNumber,
          containerNumbers: shipment.containers,
          origin: shipment.origin,
          destination: shipment.destination,
          volume: shipment.volume,
          commodity: shipment.commodity,
          exchangeRate: billing.exchangeRate,
          preparedBy: billing.preparedBy,
          checkedBy: billing.checkedBy,
          approvedBy: billing.approvedBy,
        }}
        settings={settings}
      />
    </DocumentPreviewShell>
  );
}
