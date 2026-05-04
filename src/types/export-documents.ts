// ── Export Document Types ──────────────────────────────────────────────
// Four document generators nested inside an ExportBooking record.
// Ref number (CODE YEAR-N, e.g. RVS 2026-1) is shared across all 4 documents per booking.

export interface SalesContract {
  refNo: string;
  date: string;

  // Supplier
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;

  // Seller
  sellerName: string;
  sellerAddress: string;

  // Buyer
  buyerName: string;
  buyerAddress: string;
  buyerContact: string;
  buyerPhone: string;
  buyerEmail: string;

  // Goods
  marksAndNos: string;
  commodityDescription: string;
  quantity: string;       // KGS
  unitPrice: string;      // USD
  totalAmount: string;    // USD

  // Shipping
  portOfLoading: string;
  portOfDestination: string;
  vesselVoyage: string;
  termsOfPayment: string;
  shipmentDate: string;

  // Bank
  bankName: string;
  swiftCode: string;
  accountNo: string;
  accountName: string;
  bankAddress: string;

  masterTemplateId?: string;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CommercialInvoice {
  invoiceNo: string;      // shared ref, editable, synced across docs
  date: string;

  // Shipping
  portOfLoading: string;
  portOfDischarge: string;

  // Consignee (auto-filled from SC buyer)
  consigneeName: string;
  consigneeAddress: string;
  consigneeContact: string;
  consigneePhone: string;
  consigneeEmail: string;

  // Goods
  marksAndNos: string;
  description: string;
  totalNetWeight: string;       // KGS
  unitPrice: string;            // USD
  totalInvoiceValue: string;    // USD

  // Bank
  bankName: string;
  swiftCode: string;
  accountNo: string;
  accountName: string;
  bankAddress: string;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PackingListContainer {
  containerNo: string;
  sealNumber: string;
  amount: string;         // quantity number
  amountMetric: string;   // e.g. "Sacks", "Bags"
  netWeight: string;      // KGS
  grossWeight: string;    // KGS
}

export interface PackingList {
  refNo: string;            // shared ref, linked to other docs
  date: string;

  // Shipped To (auto-filled from SC buyer)
  shippedToName: string;
  shippedToAddress: string;
  shippedToContact: string;
  shippedToPhone: string;
  shippedToEmail: string;

  // Shipping
  vesselVoyage: string;
  placeOfOrigin: string;
  portOfDischarge: string;
  shipmentDate: string;

  // Goods
  descriptionOfGoods: string;
  volume: string;
  commodity: string;

  // Container table
  containers: PackingListContainer[];

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface DeclarationContainer {
  containerNo: string;
  sealNo: string;
}

export interface Declaration {
  refNo: string;          // shared ref, editable, synced across docs
  date: string;
  vesselVoyage: string;
  blNumber: string;
  containers: DeclarationContainer[];
  totalNetWeight: string;
  description: string;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ── FSI (Final Shipping Instructions) ─────────────────────────────────

export interface FSIContainer {
  containerNo: string;
  sealNo: string;
  volumeType: string;
}

export interface FSI {
  id?: string;
  bookingId: string;

  // Shipper
  shipperName: string;
  shipperAddress: string;
  shipperContactNumber: string;
  shipperEmail: string;

  // Consignee
  consigneeName: string;
  consigneeAddress: string;
  consigneeContactPerson: string;
  consigneeContactNumber: string;
  consigneeEmail: string;

  // Notify Party
  notifyParty: string;

  // Shipping Details
  preCarriageBy: string;
  placeOfReceipt: string;
  vesselVoyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfDelivery: string;
  freightTerm: string;
  lss: string;

  // Booking Reference
  to: string;
  attn: string;
  from: string;
  bookingNumber: string;
  billedTo: string;

  // Container Details (multi-row)
  containers: FSIContainer[];

  // Cargo Details
  volume: string;
  amount: string;
  amountMetric: string;
  commodity: string;
  grossWeight: string;
  netWeight: string;
  measurement: string;
  totalNumberOfContainers: string;

  // Customs Codes
  hsCode: string;
  usciCode: string;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface FormE {
  // Exporter
  exporterName: string;
  exporterAddress: string;
  exporterContactNumber: string;
  exporterEmail: string;

  // Consignee
  consigneeName: string;
  consigneeAddress: string;
  consigneeContactNumber: string;
  consigneeContactEmail: string;
  consigneeContactPerson: string;

  // Shipping
  meansOfTransport: string;
  departureDate: string;
  vessel: string;
  portOfDischarge: string;

  // Goods
  itemNumber: string;
  marksAndNumbers: string;
  packagesVolume: string;
  packagesAmount: string;
  packagesAmountMetric: string;
  packagesCommodity: string;
  packagesNetWeight: string;
  packagesHsCode: string;
  packagesNotifyParty: string;
  packagesNotifyAddress: string;
  originCriteria: string;
  grossWeight: string;

  // Invoice
  invoiceNumber: string;
  invoiceDated: string;

  // Countries
  exporterCountry: string;
  importingCountry: string;

  // Signatory
  signatoryPlace: string;
  signatoryDate: string;
  authorizedSignatory: string;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ProcessingFee {
  billingStatementNo: string;
  date: string;
  address: string;
  tinNo: string;
  vesselVoy: string;
  loadedAt: string;
  volume: string;
  containerSize: string;
  containerNo: string;
  commodity: string;
  blNumber: string;
  destination: string;
  price: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface HeartOfExportExpenseRow {
  referenceNo: string;
  amount: string;
}

export interface HeartOfExport {
  bookingRef: string;
  date: string;
  blNumber: string;
  client: string;
  shipper: string;
  consignee: string;
  commodity: string;
  volume: string;
  shippingLine: string;
  vesselVoy: string;
  destination: string;
  trucker: string;
  loadingAddress: string;
  loadingSchedule: string;
  referenceNo: string;
  containerNumber: string;
  expShippingLine: HeartOfExportExpenseRow;
  expTrucking: HeartOfExportExpenseRow;
  expPettyCash: HeartOfExportExpenseRow;
  expCommission: HeartOfExportExpenseRow;
  expOthers: HeartOfExportExpenseRow;
  expSOA: HeartOfExportExpenseRow;
  expProfitSharing: HeartOfExportExpenseRow;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ExportDocuments {
  salesContract?: SalesContract;
  commercialInvoice?: CommercialInvoice;
  packingList?: PackingList;
  declaration?: Declaration;
  formE?: FormE;
  processingFee?: ProcessingFee;
  heartOfExport?: HeartOfExport;
}
