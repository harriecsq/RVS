import { useState } from "react";
import { X, Upload } from "lucide-react";
import type { PaymentMethod } from "../../types/evoucher";
import { StandardInput } from "../design-system/StandardInput";
import { StandardTextarea } from "../design-system/StandardTextarea";
import { StandardSelect } from "../design-system/StandardSelect";
import { StandardDatePicker } from "../design-system/StandardDatePicker";

interface CreateEVoucherModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  budgetRequestData?: {
    id: string;
    number: string;
    amount: number;
    purpose: string;
    customer_id?: string;
    customer_name?: string;
  };
  context?: "bd" | "accounting"; // Context for UI labels
}

export function CreateEVoucherModal({ open, onClose, onSubmit, budgetRequestData, context = "accounting" }: CreateEVoucherModalProps) {
  const [formData, setFormData] = useState({
    amount: budgetRequestData?.amount || 0,
    purpose: budgetRequestData?.purpose || "",
    description: "",
    vendor_name: "",
    vendor_contact: "",
    project_number: "",
    customer_id: budgetRequestData?.customer_id || "",
    customer_name: budgetRequestData?.customer_name || "",
    credit_terms: "",
    due_date: "",
    payment_method: "" as PaymentMethod | "",
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      budget_request_id: budgetRequestData?.id,
      budget_request_number: budgetRequestData?.number,
    });
    // Reset form
    setFormData({
      amount: 0,
      purpose: "",
      description: "",
      vendor_name: "",
      vendor_contact: "",
      project_number: "",
      customer_id: "",
      customer_name: "",
      credit_terms: "",
      due_date: "",
      payment_method: "" as PaymentMethod | "",
    });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid var(--neuron-ui-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#12332B", marginBottom: "4px" }}>
              {context === "bd" ? "New Budget Request" : "Create New E-Voucher"}
            </h2>
            <p style={{ fontSize: "14px", color: "#667085" }}>
              {context === "bd" 
                ? "Fill in the request details for approval and payment"
                : "Fill in the voucher details for approval and payment"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "transparent",
              color: "#667085",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Expense Information Section */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", marginBottom: "16px" }}>
                  Expense Information
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <StandardInput
                    label="Amount (PHP)"
                    type="number"
                    required
                    value={formData.amount.toString()}
                    onChange={(value) => setFormData({ ...formData, amount: parseFloat(value) || 0 })}
                    placeholder="0.00"
                  />

                  <StandardInput
                    label="Purpose"
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(value) => setFormData({ ...formData, purpose: value })}
                    placeholder="Brief description of expense purpose"
                  />

                  <StandardTextarea
                    label="Description"
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Vendor Information Section */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", marginBottom: "16px" }}>
                  Vendor/Payee Information
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <StandardInput
                    label="Vendor/Payee Name"
                    type="text"
                    required
                    value={formData.vendor_name}
                    onChange={(value) => setFormData({ ...formData, vendor_name: value })}
                    placeholder="Enter vendor name"
                  />

                  <StandardInput
                    label="Contact Information"
                    type="text"
                    value={formData.vendor_contact}
                    onChange={(value) => setFormData({ ...formData, vendor_contact: value })}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              {/* Linking & Payment Terms Section */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", marginBottom: "16px" }}>
                  Linking & Payment Terms
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <StandardInput
                    label="Project/Booking Number"
                    type="text"
                    value={formData.project_number}
                    onChange={(value) => setFormData({ ...formData, project_number: value })}
                    placeholder="e.g., BK-2024-1234"
                  />

                  <StandardInput
                    label="Related Customer"
                    type="text"
                    value={formData.customer_name}
                    onChange={(value) => setFormData({ ...formData, customer_name: value })}
                    placeholder="Customer name (if applicable)"
                    disabled={!!budgetRequestData}
                  />

                  {/* Credit Terms & Due Date */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <StandardInput
                      label="Credit Terms"
                      type="text"
                      value={formData.credit_terms}
                      onChange={(value) => setFormData({ ...formData, credit_terms: value })}
                      placeholder="e.g., Net 30"
                    />
                    <StandardDatePicker
                      label="Due Date"
                      value={formData.due_date}
                      onChange={(value) => setFormData({ ...formData, due_date: value })}
                    />
                  </div>

                  <StandardSelect
                    label="Preferred Payment Method"
                    value={formData.payment_method}
                    onChange={(value) => setFormData({ ...formData, payment_method: value as PaymentMethod })}
                    options={[
                      { value: "Cash", label: "Cash" },
                      { value: "Bank Transfer", label: "Bank Transfer" },
                      { value: "Check", label: "Check" },
                      { value: "Credit Card", label: "Credit Card" },
                      { value: "Online Payment", label: "Online Payment" }
                    ]}
                    placeholder="Select payment method"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", marginBottom: "16px" }}>
                  Supporting Documents
                </h3>
                <div
                  style={{
                    border: "2px dashed var(--neuron-ui-border)",
                    borderRadius: "8px",
                    padding: "24px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0F766E";
                    e.currentTarget.style.backgroundColor = "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Upload size={32} style={{ color: "#667085", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: "14px", color: "#374151", fontWeight: 500, marginBottom: "4px" }}>
                    Click to upload or drag and drop
                  </p>
                  <p style={{ fontSize: "12px", color: "#667085" }}>
                    Invoices, receipts, or supporting documents (PDF, PNG, JPG)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: "20px 32px",
              borderTop: "1px solid var(--neuron-ui-border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              backgroundColor: "#FAFAFA",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid var(--neuron-ui-border)",
                backgroundColor: "#FFFFFF",
                color: "#374151",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background-color 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F3F4F6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#0F766E",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background-color 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0D6560";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0F766E";
              }}
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}