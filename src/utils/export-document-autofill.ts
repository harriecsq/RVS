import type { SalesContract, CommercialInvoice, PackingList, PackingListContainer, Declaration, DeclarationContainer } from "../types/export-documents";

// Minimal booking shape needed for auto-fill (avoids circular import of ExportBooking)
interface BookingForAutoFill {
  origin?: string;
  pod?: string;
  destination?: string;
  vesselVoyage?: string;
  commodity?: string;
  volume?: string;
  consignee?: string;
  shipper?: string;
  etd?: string;
  blNumber?: string;
  containerNo?: string;   // comma-separated container numbers from Booking Information
  sealNo?: string;        // comma-separated seal numbers from Booking Information
  segments?: {
    containerNos: string[];
    sealNos?: string[];
    vesselVoyage?: string;
    blNumber?: string;
  }[];
}

/** Build default Sales Contract fields from the export booking. */
export function buildSalesContractDefaults(booking: BookingForAutoFill): Partial<SalesContract> {
  return {
    portOfLoading: booking.origin || "",
    portOfDestination: booking.pod || booking.destination || "",
    vesselVoyage: booking.vesselVoyage || booking.segments?.[0]?.vesselVoyage || "",
    marksAndNos: booking.volume || "",
    commodityDescription: booking.commodity || "",
    buyerName: booking.consignee || "",
    sellerName: booking.shipper || "",
    shipmentDate: booking.etd || "",
  };
}

/** Build default Commercial Invoice fields from Sales Contract + booking. */
export function buildCommercialInvoiceDefaults(
  booking: BookingForAutoFill,
  sc: Partial<SalesContract> | undefined,
): Partial<CommercialInvoice> {
  return {
    invoiceNo: sc?.refNo || "",
    date: sc?.date || "",
    portOfLoading: sc?.portOfLoading || booking.origin || "",
    portOfDischarge: sc?.portOfDestination || booking.pod || "",
    consigneeName: sc?.buyerName || booking.consignee || "",
    consigneeAddress: sc?.buyerAddress || "",
    consigneeContact: sc?.buyerContact || "",
    consigneePhone: sc?.buyerPhone || "",
    consigneeEmail: sc?.buyerEmail || "",
    marksAndNos: sc?.marksAndNos || booking.volume || "",
    description: sc?.commodityDescription || booking.commodity || "",
    totalNetWeight: sc?.quantity || "",
    unitPrice: sc?.unitPrice || "",
    totalInvoiceValue: sc?.totalAmount || "",
    bankName: sc?.bankName || "",
    swiftCode: sc?.swiftCode || "",
    accountNo: sc?.accountNo || "",
    accountName: sc?.accountName || "",
    bankAddress: sc?.bankAddress || "",
  };
}

/** Build default Packing List fields from Sales Contract + booking. */
export function buildPackingListDefaults(
  booking: BookingForAutoFill,
  sc: Partial<SalesContract> | undefined,
): Partial<PackingList> {
  // Build container rows from booking-level containerNo/sealNo (comma-separated), fallback to segments
  const containers: PackingListContainer[] = [];
  const containerNos = booking.containerNo
    ? booking.containerNo.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];
  const sealNos = booking.sealNo
    ? booking.sealNo.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  if (containerNos.length || sealNos.length) {
    const maxLen = Math.max(containerNos.length, sealNos.length);
    for (let i = 0; i < maxLen; i++) {
      containers.push({
        containerNo: containerNos[i] || "",
        sealNumber: sealNos[i] || "",
        amount: "",
        amountMetric: "Sacks",
        netWeight: "",
        grossWeight: "",
      });
    }
  } else if (booking.segments?.length) {
    for (const seg of booking.segments) {
      const maxLen = Math.max(seg.containerNos?.length || 0, seg.sealNos?.length || 0);
      for (let i = 0; i < maxLen; i++) {
        containers.push({
          containerNo: seg.containerNos?.[i] || "",
          sealNumber: seg.sealNos?.[i] || "",
          amount: "",
          amountMetric: "Sacks",
          netWeight: "",
          grossWeight: "",
        });
      }
    }
  }

  return {
    refNo: sc?.refNo || "",
    date: sc?.date || "",
    shippedToName: sc?.buyerName || booking.consignee || "",
    shippedToAddress: sc?.buyerAddress || "",
    shippedToContact: sc?.buyerContact || "",
    shippedToPhone: sc?.buyerPhone || "",
    shippedToEmail: sc?.buyerEmail || "",
    vesselVoyage: booking.vesselVoyage || booking.segments?.[0]?.vesselVoyage || "",
    placeOfOrigin: booking.origin || "",
    portOfDischarge: booking.pod || "",
    shipmentDate: sc?.shipmentDate || booking.etd || "",
    descriptionOfGoods: sc?.commodityDescription || booking.commodity || "",
    volume: booking.volume || "",
    commodity: booking.commodity || "",
    containers,
  };
}

/** Build default Declaration fields from Sales Contract + booking. */
export function buildDeclarationDefaults(
  booking: BookingForAutoFill,
  sc: Partial<SalesContract> | undefined,
): Partial<Declaration> {
  // Build container/seal pairs from booking-level fields, fallback to segments
  const containers: DeclarationContainer[] = [];
  const cNos = booking.containerNo
    ? booking.containerNo.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];
  const sNos = booking.sealNo
    ? booking.sealNo.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  if (cNos.length || sNos.length) {
    const maxLen = Math.max(cNos.length, sNos.length);
    for (let i = 0; i < maxLen; i++) {
      containers.push({ containerNo: cNos[i] || "", sealNo: sNos[i] || "" });
    }
  } else if (booking.segments?.length) {
    for (const seg of booking.segments) {
      const maxLen = Math.max(seg.containerNos?.length || 0, seg.sealNos?.length || 0);
      for (let i = 0; i < maxLen; i++) {
        containers.push({
          containerNo: seg.containerNos?.[i] || "",
          sealNo: seg.sealNos?.[i] || "",
        });
      }
    }
  }

  return {
    refNo: sc?.refNo || "",
    date: sc?.date || "",
    vesselVoyage: booking.vesselVoyage || booking.segments?.[0]?.vesselVoyage || "",
    blNumber: booking.blNumber || booking.segments?.[0]?.blNumber || "",
    containers,
    description: booking.commodity || "",
  };
}
