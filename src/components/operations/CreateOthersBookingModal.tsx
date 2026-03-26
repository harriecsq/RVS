import { useState } from "react";
import { X } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import type { Client, Contact } from "../../types/operations";
import { API_BASE_URL } from '@/utils/api-config';

interface CreateOthersBookingModalProps { onClose: () => void; onSuccess: () => void; }

export function CreateOthersBookingModal({ onClose, onSuccess }: CreateOthersBookingModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Single client selection state
  const [selectedCompany, setSelectedCompany] = useState<Client | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [formData, setFormData] = useState({
    customerName: "", accountOwner: "", accountHandler: "", service: "", quotationReferenceNumber: "", status: "Draft", serviceDescription: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/others-bookings`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` }, body: JSON.stringify({
          ...formData,
          customerName: selectedContact ? selectedContact.name : (selectedCompany ? (selectedCompany.name || selectedCompany.company_name) : formData.customerName),
          companyName: selectedCompany ? (selectedCompany.name || selectedCompany.company_name) : formData.customerName,
          contactPersonName: selectedContact?.name || "",
          client_id: selectedCompany?.id,
          contact_id: selectedContact?.id
        }),
      });
      if (!response.ok) throw new Error("Failed to create others booking");
      const result = await response.json();
      if (result.success) onSuccess(); else { console.error("Error creating others booking:", result.error); alert("Failed to create booking: " + result.error); }
    } catch (error) { console.error("Error creating others booking:", error); alert("Failed to create booking. Please try again."); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }} onClick={onClose}>
      <div style={{ backgroundColor: "var(--neuron-bg-elevated)", borderRadius: "12px", width: "100%", maxWidth: "700px", maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid var(--neuron-ui-border)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px", borderBottom: "1px solid var(--neuron-ui-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--neuron-ink-primary)", margin: 0 }}>Create Others Booking</h2>
          <button onClick={onClose} style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--neuron-ink-muted)", borderRadius: "6px" }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <div style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--neuron-ink-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>General Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <CompanyContactSelector
                    companyId={selectedCompany?.id}
                    contactId={selectedContact?.id}
                    onSelect={({ company, contact }) => {
                      setSelectedCompany(company);
                      setSelectedContact(contact);
                      const cName = company ? (company.name || company.company_name || "") : "";
                      const resolvedName = contact ? contact.name : cName;
                      setFormData(prev => ({ 
                        ...prev, 
                        customerName: resolvedName
                      }));
                    }}
                  />
                </div>
                <div><label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-secondary)", marginBottom: "6px" }}>Account Owner</label><input type="text" name="accountOwner" value={formData.accountOwner} onChange={handleChange} style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }} /></div>
                <div><label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-secondary)", marginBottom: "6px" }}>Account Handler</label><input type="text" name="accountHandler" value={formData.accountHandler} onChange={handleChange} style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }} /></div>
                <div><label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-secondary)", marginBottom: "6px" }}>Service/s</label><input type="text" name="service" value={formData.service} onChange={handleChange} style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }} /></div>
                <div><label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-secondary)", marginBottom: "6px" }}>Quotation Reference Number</label><input type="text" name="quotationReferenceNumber" value={formData.quotationReferenceNumber} onChange={handleChange} placeholder="Link to Pricing module" style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }} /></div>
                <div><label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-secondary)", marginBottom: "6px" }}>Status</label><select name="status" value={formData.status} onChange={handleChange} style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }}>{["Draft", "For Approval", "Approved", "In Transit", "Delivered", "Completed", "On Hold", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--neuron-ink-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Service/s Information</h3>
              <div><label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--neuron-ink-secondary)", marginBottom: "6px" }}>Service/s Description</label><textarea name="serviceDescription" value={formData.serviceDescription} onChange={handleChange} rows={4} placeholder="Describe the miscellaneous service being provided..." style={{ width: "100%", padding: "12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", resize: "vertical", fontFamily: "inherit" }} /></div>
            </div>
          </div>

          <div style={{ padding: "24px", borderTop: "1px solid var(--neuron-ui-border)", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: "var(--neuron-ink-secondary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: "white", backgroundColor: loading ? "#94A3B8" : "var(--neuron-brand-green)", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer" }}>{loading ? "Creating..." : "Create Booking"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}