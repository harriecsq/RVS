import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { StandardInput } from "../design-system/StandardInput";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { StandardButton } from "../design-system/StandardButton";
import { PanelBackdrop } from "../shared/PanelBackdrop";

type ClientStatus = "Active" | "Inactive";

interface AddClientPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: any) => void;
}

export function AddClientPanel({ isOpen, onClose, onSave }: AddClientPanelProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    status: "Active" as ClientStatus,
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { company_name, ...rest } = formData;
    onSave({
      ...rest,
      name: company_name,
      id: `client-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    handleClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    onClose();
    setFormData({
      company_name: "",
      address: "",
      phone: "",
      email: "",
      status: "Active",
      notes: "",
    });
  };

  if (!isOpen) return null;

  const isFormValid =
    formData.company_name.trim() !== "" && formData.address.trim() !== "";

  return (
    <>
      <PanelBackdrop onClick={handleClose} />

      <div
        className="fixed right-0 top-0 h-full w-[680px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in"
        style={{ borderLeft: "1px solid var(--neuron-ui-border)" }}
      >
        {/* Header */}
        <div
          className="px-10 py-8 border-b"
          style={{ borderColor: "var(--neuron-ui-border)", backgroundColor: "#FFFFFF" }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#0F766E]/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#0A1D4D]" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-[#0A1D4D] mb-1">Add New Client</h2>
              <p className="text-sm text-[#667085]">
                Create a new client company record for operations management
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form onSubmit={handleSubmit} id="add-client-form">
            <div className="mb-8">
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#0A1D4D",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "16px",
                }}
              >
                Company Information
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <StandardInput
                  label="Company Name"
                  value={formData.company_name}
                  onChange={(v) => handleChange("company_name", v)}
                  placeholder="Acme Corporation Philippines"
                  required
                />
                <StandardInput
                  label="Address"
                  value={formData.address}
                  onChange={(v) => handleChange("address", v)}
                  placeholder="123 Makati Ave, Makati City, Metro Manila, Philippines"
                  required
                />
                <StandardInput
                  label="Phone"
                  value={formData.phone}
                  onChange={(v) => handleChange("phone", v)}
                  placeholder="+63 912 345 6789"
                  type="tel"
                />
                <StandardInput
                  label="Email"
                  value={formData.email}
                  onChange={(v) => handleChange("email", v)}
                  placeholder="info@acmecorp.com"
                  type="email"
                />
                <FilterSingleDropdown
                  label="Status"
                  value={formData.status}
                  onChange={(v) => handleChange("status", v)}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                />
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "#344054", marginBottom: "6px", display: "block" }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Add notes about this company..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D0D5DD",
                      borderRadius: "8px",
                      fontSize: "14px",
                      color: "#0A1D4D",
                      resize: "vertical",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box" as const,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#D0D5DD"; }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div
          className="px-12 py-6 border-t flex items-center justify-end gap-3"
          style={{ borderColor: "var(--neuron-ui-border)", backgroundColor: "#FFFFFF" }}
        >
          <StandardButton type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </StandardButton>
          <StandardButton
            type="submit"
            form="add-client-form"
            variant="primary"
            disabled={!isFormValid}
          >
            Create Client
          </StandardButton>
        </div>
      </div>
    </>
  );
}
