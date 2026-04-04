// Operations Module Types

// Client / Contact types (moved from types/bd)
export type ClientStatus = "Active" | "Inactive" | "Prospect" | "Lead" | "Churned";

export type Industry =
  | "Garments"
  | "Automobile"
  | "Energy"
  | "Food & Beverage"
  | "Heavy Equipment"
  | "Construction"
  | "Agricultural"
  | "Pharmaceutical"
  | "IT"
  | "Electronics"
  | "General Merchandise"
  | "Electronics & Technology"
  | "Textile & Apparel"
  | "Mining & Resources"
  | "Retail & Distribution"
  | string;

export interface Contact {
  id: string;
  customer_id?: string;
  client_id?: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  company_name?: string;
  client_name?: string;
  industry?: string;
  credit_terms?: string;
  address?: string;
  registered_address?: string;
  phone?: string;
  email?: string;
  status?: ClientStatus;
  notes?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  contacts?: Contact[];
  owner_id?: string;
  owner_name?: string;
  total_revenue?: number;
  active_projects?: number;
  active_bookings?: number;
}

export type ExecutionStatus =
  | "Draft"
  | "For Approval"
  | "Approved"
  | "In Transit"
  | "Delivered"
  | "Completed"
  | "On Hold"
  | "Cancelled";

export interface TagHistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  action: "tag_added" | "tag_removed";
  tag: string;
  tagLabel: string;
  layer: "shipment" | "operational";
}

export interface ShipmentEvent {
  event: string;
  dateTime: string;
  note: string;
}

export interface BookingNumberEntry {
  id: string;
  bookingNumber: string;
  containerNos: string[];
}

export interface BrokerageBooking {
  id: string;
  bookingId: string;
  bookingNumbers?: BookingNumberEntry[];
  date?: string;
  customerName: string;
  companyName?: string;
  clientId?: string;
  contactId?: string;
  contactPersonName?: string;
  status: ExecutionStatus;
  shipmentTags?: string[];
  tagHistory?: TagHistoryEntry[];
  shipmentEvents?: ShipmentEvent[];

  // Shipment Details
  consignee?: string;
  shipper?: string;
  mblMawb?: string;
  blNumber?: string;
  containerNo?: string;
  commodity?: string;
  volume?: string;
  vesselVoyage?: string;
  origin?: string;
  pod?: string;
  destination?: string;
  shippingLine?: string;

  // Entry Details
  entryType?: string;
  entryNumber?: string;
  mode?: string;

  // Operational Details
  section?: string;
  accountOwner?: string;
  accountHandler?: string;
  projectNumber?: string;
  projectName?: string;
  projectId?: string;
  quotationReferenceNumber?: string;

  // Dates
  eta?: string;
  etd?: string;
  ata?: string;
  atd?: string;
  taggingTime?: string;

  // Cargo Details
  cargoType?: string;
  containerSize?: string;
  containerQty?: number;
  grossWeight?: string;
  dimensions?: string;
  deliveryAddress?: string;

  // Docs Timeline
  docsTimeline?: { step: string; datetime: string | null }[];

  // Approval / Sign-off
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  created_by?: string;
}

export interface TruckingBooking {
  id: string;
  bookingId: string;
  date?: string;
  customerName: string;
  companyName?: string;
  clientId?: string;
  contactId?: string;
  contactPersonName?: string;
  status: ExecutionStatus;

  // Trucking Details
  truckType?: string;
  plateNumber?: string;
  driverName?: string;
  driverContact?: string;
  pullOutLocation?: string;
  deliveryAddress?: string;
  containerNo?: string;
  containerSize?: string;

  // Route
  origin?: string;
  destination?: string;

  // Operational Details
  section?: string;
  accountOwner?: string;
  accountHandler?: string;
  projectNumber?: string;
  projectName?: string;
  projectId?: string;
  quotationReferenceNumber?: string;

  // Dates
  pickupDate?: string;
  deliveryDate?: string;
  eta?: string;
  etd?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  created_by?: string;
}

export interface TruckingLeg {
  id: string;
  bookingId?: string;
  bookingReference?: string;
  legNumber?: number;
  status?: string;
  truckType?: string;
  plateNumber?: string;
  driverName?: string;
  driverContact?: string;
  origin?: string;
  destination?: string;
  pullOutLocation?: string;
  deliveryAddress?: string;
  containerNo?: string;
  containerSize?: string;
  pickupDate?: string;
  deliveryDate?: string;
  eta?: string;
  etd?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Billing {
  id: string;
  billingNumber: string;
  clientId?: string;
  clientName?: string;
  bookingId?: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  voucherId?: string;
  voucherNumber?: string;
  totalAmount: number;
  pendingAmount?: number;
  expenseAmount?: number;
  currency: string;
  status: string;
  billingDate: string;
  dueDate?: string;
  chargeCategories?: BillingChargeCategory[];
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  category?: string;
  vendor?: string;
  vendorId?: string;
  clientId?: string;
  clientName?: string;
  bookingId?: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  amount: number;
  pendingAmount?: number;
  currency?: string;
  status: string;
  expenseDate: string;
  paymentMethod?: string;
  paymentStatus?: string;
  chargeCategories?: ExpenseChargeCategory[];
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Charge category types used for project autofill
export interface BillingChargeCategory {
  categoryName: string;
  lineItems: {
    description: string;
    price: number;
    quantity: number;
    unit?: string;
    amount: number;
    remarks?: string;
  }[];
  subtotal: number;
}

export interface ExpenseChargeCategory {
  categoryName: string;
  lineItems: {
    description: string;
    buyingPrice: number;
    quantity: number;
    unit?: string;
    amount: number;
    vendorId?: string;
    vendorName?: string;
    remarks?: string;
  }[];
  subtotal: number;
}

// ─── Multi-Leg Segment Support ──────────────────────────────────────────────

export interface BookingSegment {
  segmentId: string;
  segmentLabel: string;
  legOrder: number;
  containerNos: string[];
  sealNos?: string[];

  // Route
  origin?: string;
  pod?: string;
  destination?: string;

  // Vessel / VOY
  vesselVoyage?: string;
  shippingLine?: string;
  etd?: string;
  etdTime?: string;
  atd?: string;
  atdTime?: string;
  eta?: string;
  etaTime?: string;
  vesselStatus?: string;
  lctEdArrastre?: string;
  lctEdArrastreTime?: string;
  lctCargo?: string;
  lctCargoTime?: string;

  // BL
  blNumber?: string;
  mblMawb?: string;

  // Domestic Cost
  domesticFreight?: string;
  hustlingStripping?: string;
  forkliftOperator?: string;

  // Customs Processing
  exportDivision?: string;
  lodgmentCdsFee?: string;
  formE?: string;

  // Shipping Line Cost
  oceanFreight?: string;
  sealFee?: string;
  docsFee?: string;
  lssFee?: string;
  storageCost?: string;

  // Port Charges
  arrastre?: string;
  shutOut?: string;

  // Miscellaneous Cost
  royaltyFee?: string;
  lona?: string;
  lalamove?: string;
  bir?: string;
  labor?: string;
  otherCharges?: string;

  createdAt?: string;
  updatedAt?: string;
}
