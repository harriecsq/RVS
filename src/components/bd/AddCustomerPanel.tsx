import { ArrowLeft, Building2, MapPin, Target, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import type { CustomerStatus } from "../../types/bd";
import { CustomSelect } from "./CustomSelect";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface AddCustomerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: any) => void;
}

interface BackendUser {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

const INDUSTRIES = [
  "Garments",
  "Automobile",
  "Energy",
  "Food & Beverage",
  "Heavy Equipment",
  "Construction",
  "Agricultural",
  "Pharmaceutical",
  "IT",
  "Electronics",
  "General Merchandise"
];

export function AddCustomerPanel({ isOpen, onClose, onSave }: AddCustomerPanelProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    client_name: "",
    industry: "",
    credit_terms: "Net 30",
    address: "",
    phone: "",
    email: "",
    registered_address: "",
    status: "Active" as CustomerStatus,
    notes: "",
  });

  const [users, setUsers] = useState<BackendUser[]>([]);

  // Fetch users when panel opens
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          cache: 'no-store',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Filter only Business Development users
            const bdUsers = result.data.filter((u: BackendUser) => u.department === "Business Development");
            setUsers(bdUsers);
            console.log('[AddCustomerPanel] Fetched BD users:', bdUsers.length);
          }
        }
      } catch (error) {
        console.error('Error fetching users for AddCustomerPanel:', error);
        setUsers([]);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ Map company_name to 'name' field for backend compatibility
    const { company_name, ...rest } = formData;
    onSave({
      ...rest,
      name: company_name, // Backend expects 'name' field
      id: `customer-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    onClose();
    // Reset form
    setFormData({
      company_name: "",
      client_name: "",
      industry: "",
      credit_terms: "Net 30",
      address: "",
      phone: "",
      email: "",
      registered_address: "",
      status: "Active",
      notes: "",
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    onClose();
    // Reset form on close
    setFormData({
      company_name: "",
      client_name: "",
      industry: "",
      credit_terms: "Net 30",
      address: "",
      phone: "",
      email: "",
      registered_address: "",
      status: "Active",
      notes: "",
    });
  };

  if (!isOpen) return null;

  const isFormValid = 
    formData.company_name.trim() !== "" &&
    formData.industry !== "" &&
    formData.registered_address.trim() !== "";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black z-40"
        onClick={handleClose}
        style={{ 
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(18, 51, 43, 0.15)"
        }}
      />

      {/* Slide-out Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[680px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in"
        style={{
          borderLeft: "1px solid var(--neuron-ui-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-10 py-8 border-b"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="flex items-center gap-4">
            {/* Arrow Button - ONLY close mechanism */}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#0F766E]/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#12332B]" />
            </button>
            
            {/* Title Block */}
            <div>
              <h2 className="text-2xl font-semibold text-[#12332B] mb-1">
                Add New Customer
              </h2>
              <p className="text-sm text-[#667085]">
                Create a new customer company record for your business development pipeline
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form onSubmit={handleSubmit} id="add-customer-form">
            {/* Company Information Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={16} style={{ color: "#0F766E" }} />
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#12332B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Company Information
                </h3>
              </div>

              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label
                    htmlFor="company_name"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Company Name <span style={{ color: "#C94F3D" }}>*</span>
                  </label>
                  <input
                    id="company_name"
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    placeholder="Acme Corporation Philippines"
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                    required
                  />
                </div>

                {/* Client Name */}
                <div>
                  <label
                    htmlFor="client_name"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Client Name
                  </label>
                  <input
                    id="client_name"
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => handleChange("client_name", e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                  />
                </div>

                {/* Industry */}
                <div>
                  <label
                    htmlFor="industry"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Industry <span style={{ color: "#C94F3D" }}>*</span>
                  </label>
                  <CustomSelect
                    id="industry"
                    value={formData.industry}
                    onChange={(value) => handleChange("industry", value)}
                    options={[
                      { value: "", label: "Select an industry..." },
                      ...INDUSTRIES.map(industry => ({ value: industry, label: industry }))
                    ]}
                    placeholder="Select an industry..."
                    required
                  />
                </div>

                {/* Credit Terms */}
                <div>
                  <label
                    htmlFor="credit_terms"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Credit Terms
                  </label>
                  <input
                    id="credit_terms"
                    type="text"
                    value={formData.credit_terms}
                    onChange={(e) => handleChange("credit_terms", e.target.value)}
                    placeholder="Net 30"
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                  />
                </div>

                {/* Address */}
                <div>
                  <label
                    htmlFor="address"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="123 Makati Ave, Makati City, Metro Manila, Philippines"
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+63 912 345 6789"
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="info@acmecorp.com"
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                  />
                </div>

                {/* Registered Address */}
                <div>
                  <label
                    htmlFor="registered_address"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Registered Address <span style={{ color: "#C94F3D" }}>*</span>
                  </label>
                  <textarea
                    id="registered_address"
                    value={formData.registered_address}
                    onChange={(e) => handleChange("registered_address", e.target.value)}
                    placeholder="123 Makati Ave, Makati City, Metro Manila, Philippines"
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px] resize-none"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="status"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Status
                  </label>
                  <CustomSelect
                    id="status"
                    value={formData.status}
                    onChange={(value) => handleChange("status", value)}
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" }
                    ]}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Additional information about the customer..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px] resize-none"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: "#FFFFFF",
                      color: "var(--neuron-ink-primary)",
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div
          className="px-12 py-6 border-t flex items-center justify-end gap-3"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg transition-colors"
            style={{
              border: "1px solid var(--neuron-ui-border)",
              backgroundColor: "#FFFFFF",
              color: "var(--neuron-ink-secondary)",
              fontSize: "14px",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF";
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-customer-form"
            disabled={!isFormValid}
            className="px-6 py-2.5 rounded-lg transition-all flex items-center gap-2"
            style={{
              backgroundColor: isFormValid ? "#0F766E" : "#D1D5DB",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              cursor: isFormValid ? "pointer" : "not-allowed",
              opacity: isFormValid ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (isFormValid) {
                e.currentTarget.style.backgroundColor = "#0D6560";
              }
            }}
            onMouseLeave={(e) => {
              if (isFormValid) {
                e.currentTarget.style.backgroundColor = "#0F766E";
              }
            }}
          >
            <Building2 size={16} />
            Create Customer
          </button>
        </div>
      </div>
    </>
  );
}