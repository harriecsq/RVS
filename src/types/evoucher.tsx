// E-Voucher Types

export type EVoucherStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Disapproved"
  | "Processing"
  | "Disbursed"
  | "Recorded"
  | "Audited"
  | "Cancelled";

export type EVoucherCategory =
  | "Brokerage"
  | "Forwarding"
  | "Trucking"
  | "Marine Insurance"
  | "Miscellaneous"
  | "Client Entertainment"
  | "Office Supplies"
  | "Travel"
  | "Others"
  | string;

export type PaymentMethod =
  | "Cash"
  | "Check"
  | "Bank Transfer"
  | "Online Payment"
  | "Credit Card"
  | "Petty Cash"
  | string;

export interface EVoucherApprover {
  id: string;
  name: string;
  role?: string;
  approved_at?: string;
  rejected_at?: string;
  remarks?: string;
}

export interface EVoucherWorkflowEntry {
  id: string;
  timestamp: string;
  status: string;
  user_name: string;
  user_role?: string;
  action: string;
  remarks?: string;
}

export interface EVoucher {
  id: string;
  voucher_number: string;
  requestor_id?: string;
  requestor_name: string;
  request_date: string;
  expense_category: EVoucherCategory;
  sub_category?: string;
  amount: number;
  currency?: string;
  purpose: string;
  description?: string;
  vendor_name?: string;
  vendor_contact?: string;
  project_number?: string;
  customer_id?: string;
  customer_name?: string;
  budget_request_id?: string;
  budget_request_number?: string;
  status: EVoucherStatus;
  payment_method?: PaymentMethod;
  credit_terms?: string;
  due_date?: string;

  // Approval & workflow
  approvers?: EVoucherApprover[];
  disbursement_officer_name?: string;
  workflow_history?: EVoucherWorkflowEntry[];

  // Metadata
  created_at?: string;
  updated_at?: string;
}
