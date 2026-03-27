// Pricing / Projects / Quotations Types

export type BookingStatus = "No Bookings Yet" | "Partially Booked" | "Fully Booked";

export interface QuotationChargeCategory {
  category_name?: string;
  name?: string;
  line_items: QuotationLineItem[];
  subtotal: number;
}

export interface QuotationLineItem {
  description: string;
  price: number;
  buying_price?: number;
  buying_amount?: number;
  quantity: number;
  unit?: string;
  amount: number;
  forex_rate?: number;
  vendor_id?: string;
  vendor_name?: string;
  remarks?: string;
}

export interface InquiryService {
  service_type: string;
  service_details?: ForwardingDetails | BrokerageDetails | TruckingDetails | OthersDetails | Record<string, any>;
}

export interface ForwardingDetails {
  mode?: string;
  incoterms?: string;
  cargo_type?: string;
  commodity?: string;
  pol?: string;
  pod?: string;
  carrier_airline?: string;
  carrierAirline?: string;
  delivery_address?: string;
  stackable?: string;
  stackability?: string;

  // FCL
  fcl_20ft?: number;
  fcl20ft?: number;
  fcl_40ft?: number;
  fcl40ft?: number;
  fcl_45ft?: number;
  fcl45ft?: number;

  // LCL
  lcl_gross_weight?: string;
  lclGwt?: string;
  lcl_dimensions?: string;
  lclDims?: string;

  // Air
  air_gross_weight?: string;
  airGwt?: string;
  air_chargeable_weight?: string;
  airCwt?: string;

  // Entry info
  type_of_entry?: string;
  typeOfEntry?: string;
  country_of_origin?: string;
  countryOfOrigin?: string;
  preferential_treatment?: string;
  preferentialTreatment?: string;

  [key: string]: any;
}

export interface BrokerageDetails {
  subtype?: string;
  shipment_type?: string;
  type_of_entry?: string;
  pod?: string;
  mode?: string;
  cargo_type?: string;
  commodity?: string;
  delivery_address?: string;
  preferential_treatment?: string;
  country_of_origin?: string;

  // Customs specific
  customs_value?: number;
  dutiable_value?: number;
  duties_and_taxes?: number;
  vat?: number;

  [key: string]: any;
}

export interface TruckingDetails {
  truck_type?: string;
  pull_out?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  container_size?: string;
  route?: string;
  
  [key: string]: any;
}

export interface OthersDetails {
  service_description?: string;
  serviceDescription?: string;
  service_type?: string;
  serviceType?: string;
  delivery_address?: string;
  deliveryAddress?: string;
  special_instructions?: string;
  specialInstructions?: string;
  contact_person?: string;
  contactPerson?: string;
  contact_number?: string;
  contactNumber?: string;

  [key: string]: any;
}

export interface QuotationNew {
  id: string;
  quotation_number: string;
  customer_id?: string;
  customer_name?: string;
  client_id?: string;
  client_name?: string;
  company_name?: string;

  // Quotation info
  status?: string;
  movement?: string;
  currency?: string;
  total?: number;
  validity_date?: string;

  // Service info
  services?: string[];
  services_metadata?: InquiryService[];
  commodity?: string;

  // Routing
  pol_aol?: string;
  pod_aod?: string;

  // Pricing
  charge_categories?: QuotationChargeCategory[];

  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  owner_id?: string;
  owner_name?: string;
  remarks?: string;

  [key: string]: any;
}

// Re-export Customer from pricing context (some components import Customer from types/pricing)
export interface Customer {
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
  status?: string;
  notes?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  contacts?: {
    id: string;
    name: string;
    title?: string;
    email?: string;
    phone?: string;
  }[];
  owner_id?: string;
  owner_name?: string;
  total_revenue?: number;
  active_projects?: number;
  active_bookings?: number;
}
