// Business Development Types

export type CustomerStatus = "Active" | "Inactive" | "Prospect" | "Lead" | "Churned";

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
  status?: CustomerStatus;
  notes?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  contacts?: Contact[];
  // BD-specific fields
  owner_id?: string;
  owner_name?: string;
  total_revenue?: number;
  active_projects?: number;
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

export type TaskType = "Follow-up" | "Meeting" | "Call" | "Email" | "Site Visit" | "Proposal" | "Other";
export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Cancelled" | "Overdue";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  customer_id?: string;
  customer_name?: string;
  contact_id?: string;
  contact_name?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  notes?: string;
  tags?: string[];
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  contact_id?: string;
  contact_name?: string;
  user_id?: string;
  user_name?: string;
  date?: string;
  status?: string;
  outcome?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
