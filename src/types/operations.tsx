// Operations Module Types

export type ExecutionStatus =
  | "Draft"
  | "For Approval"
  | "Approved"
  | "In Transit"
  | "Delivered"
  | "Completed"
  | "On Hold"
  | "Cancelled";

export interface ForwardingBooking {
  id: string;
  bookingId: string;
  date?: string;
  customerName: string;
  companyName?: string;
  clientId?: string;
  contactId?: string;
  contactPersonName?: string;
  status: ExecutionStatus;

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
  shippingLine?: string;

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

  // Cargo Details
  cargoType?: string;
  containerSize?: string;
  containerQty?: number;
  grossWeight?: string;
  dimensions?: string;
  mode?: string;
  incoterms?: string;
  deliveryAddress?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  created_by?: string;
}

export interface BrokerageBooking {
  id: string;
  bookingId: string;
  date?: string;
  customerName: string;
  companyName?: string;
  clientId?: string;
  contactId?: string;
  contactPersonName?: string;
  status: ExecutionStatus;

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

export interface OthersBooking {
  id: string;
  bookingId: string;
  date?: string;
  customerName: string;
  companyName?: string;
  clientId?: string;
  contactId?: string;
  contactPersonName?: string;
  status: ExecutionStatus;

  // Service Details
  serviceDescription?: string;
  serviceType?: string;

  // Operational Details
  section?: string;
  accountOwner?: string;
  accountHandler?: string;
  projectNumber?: string;
  projectName?: string;
  projectId?: string;
  quotationReferenceNumber?: string;

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
