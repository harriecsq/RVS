import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import type { Client, Contact } from "../../types/operations";
import { API_BASE_URL } from '@/utils/api-config';

// Hardcoded color constants — avoids CSS variable resolution issues
const S = {
  ink: '#12332B',
  inkSecondary: '#2E5147',
  muted: '#6B7A76',
  teal: '#0F766E',
  green: '#237F66',
  border: '#E5ECE9',
  bgPage: '#F7FAF8',
  bgElevated: '#FFFFFF',
  bgSurface: '#F9FAFB',
  red: '#EF4444',
} as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "40px",
  padding: "0 12px",
  fontSize: "14px",
  color: S.ink,
  caretColor: S.ink,
  backgroundColor: S.bgPage,
  border: `1px solid ${S.border}`,
  borderRadius: "8px",
  outline: "none",
  cursor: "text",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: S.inkSecondary,
  marginBottom: "6px",
};

interface CreateBrokerageBookingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBrokerageBookingModal({ onClose, onSuccess }: CreateBrokerageBookingModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Single client selection state
  const [selectedCompany, setSelectedCompany] = useState<Client | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Container Numbers State
  const [containerList, setContainerList] = useState<string[]>([""]);

  const [formData, setFormData] = useState({
    // General Information
    customerName: "", accountOwner: "", accountHandler: "", service: "", incoterms: "", mode: "", cargoType: "", cargoNature: "", quotationReferenceNumber: "", status: "Draft",
    // Shipment Information
    consignee: "", shipper: "", mblMawb: "", hblHawb: "", registryNumber: "", carrier: "", aolPol: "", aodPod: "", forwarder: "", commodityDescription: "", grossWeight: "", dimensions: "", taggingTime: "", etd: "", etb: "", eta: "",
    // FCL Fields
    containerDeposit: "No", detDem: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContainerChange = (index: number, value: string) => {
    const newList = [...containerList];
    newList[index] = value;
    setContainerList(newList);
  };

  const addContainerRow = () => {
    setContainerList([...containerList, ""]);
  };

  const removeContainerRow = (index: number) => {
    if (containerList.length > 1) {
      const newList = containerList.filter((_, i) => i !== index);
      setContainerList(newList);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validContainers = containerList.filter(c => c.trim() !== "");
      const containerNumbersStr = validContainers.join(", ");

      const response = await fetch(`${API_BASE_URL}/import-bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          ...formData,
          containerNumbers: containerNumbersStr,
          customerName: selectedContact ? selectedContact.name : (selectedCompany ? (selectedCompany.name || selectedCompany.company_name) : formData.customerName),
          companyName: selectedCompany ? (selectedCompany.name || selectedCompany.company_name) : formData.customerName,
          contactPersonName: selectedContact?.name || "",
          client_id: selectedCompany?.id,
          contact_id: selectedContact?.id
        }),
      });
      if (!response.ok) throw new Error("Failed to create import booking");
      const result = await response.json();
      if (result.success) onSuccess();
      else { console.error("Error creating import booking:", result.error); alert("Failed to create booking: " + result.error); }
    } catch (error) {
      console.error("Error creating import booking:", error);
      alert("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }} onClick={onClose}>
      <div style={{ backgroundColor: S.bgElevated, borderRadius: "12px", width: "100%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${S.border}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: S.ink, margin: 0 }}>Create Import Booking</h2>
          <button onClick={onClose} style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: S.muted, borderRadius: "6px" }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {/* General Information */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: S.ink, marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>General Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <CompanyContactSelector
                    companyId={selectedCompany?.id}
                    contactId={selectedContact?.id}
                    onSelect={({ company, contact }) => {
                      setSelectedCompany(company);
                      setSelectedContact(contact);
                      const cName = company ? (company.name || company.company_name || "") : "";
                      // customerName = contact name if selected, else company name
                      const resolvedName = contact ? contact.name : cName;
                      setFormData(prev => ({ 
                        ...prev, 
                        customerName: resolvedName
                      }));
                    }}
                  />
                </div>
                <div><label style={labelStyle}>Account Owner</label><input type="text" name="accountOwner" value={formData.accountOwner} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Account Handler</label><input type="text" name="accountHandler" value={formData.accountHandler} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Service/s</label><input type="text" name="service" value={formData.service} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Incoterms</label><input type="text" name="incoterms" value={formData.incoterms} onChange={handleChange} placeholder="e.g. CIF, FOB, EXW" style={inputStyle} /></div>
                <div><label style={labelStyle}>Mode</label><input type="text" name="mode" value={formData.mode} onChange={handleChange} placeholder="Sea, Air" style={inputStyle} /></div>
                <div><label style={labelStyle}>Cargo Type</label><input type="text" name="cargoType" value={formData.cargoType} onChange={handleChange} placeholder="FCL, LCL, Bulk" style={inputStyle} /></div>
                <div><label style={labelStyle}>Cargo Nature</label><input type="text" name="cargoNature" value={formData.cargoNature} onChange={handleChange} placeholder="General, Hazardous, Perishable" style={inputStyle} /></div>
                <div><label style={labelStyle}>Quotation Reference Number</label><input type="text" name="quotationReferenceNumber" value={formData.quotationReferenceNumber} onChange={handleChange} placeholder="Link to Pricing module" style={inputStyle} /></div>
                <div><label style={labelStyle}>Status</label><select name="status" value={formData.status} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>{["Draft", "For Approval", "Approved", "In Transit", "Delivered", "Completed", "On Hold", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
            </div>

            {/* Shipment Information */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: S.ink, marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Shipment Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div><label style={labelStyle}>Consignee</label><input type="text" name="consignee" value={formData.consignee} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Shipper</label><input type="text" name="shipper" value={formData.shipper} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>MBL/MAWB</label><input type="text" name="mblMawb" value={formData.mblMawb} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>HBL/HAWB (If any)</label><input type="text" name="hblHawb" value={formData.hblHawb} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Registry Number</label><input type="text" name="registryNumber" value={formData.registryNumber} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Carrier</label><input type="text" name="carrier" value={formData.carrier} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>AOL/POL</label><input type="text" name="aolPol" value={formData.aolPol} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>AOD/POD</label><input type="text" name="aodPod" value={formData.aodPod} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Forwarder (If any)</label><input type="text" name="forwarder" value={formData.forwarder} onChange={handleChange} style={inputStyle} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Commodity Description</label><textarea name="commodityDescription" value={formData.commodityDescription} onChange={handleChange} rows={2} style={{ ...inputStyle, height: "auto", padding: "12px", resize: "vertical", fontFamily: "inherit" }} /></div>
                <div><label style={labelStyle}>Gross Weight</label><input type="text" name="grossWeight" value={formData.grossWeight} onChange={handleChange} placeholder="e.g. 1000 kg" style={inputStyle} /></div>
                <div><label style={labelStyle}>Dimensions</label><input type="text" name="dimensions" value={formData.dimensions} onChange={handleChange} placeholder="L x W x H" style={inputStyle} /></div>
                <div><label style={labelStyle}>Tagging Time</label><input type="datetime-local" name="taggingTime" value={formData.taggingTime} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>ETD</label><input type="date" name="etd" value={formData.etd} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>ETB</label><input type="date" name="etb" value={formData.etb} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>ETA</label><input type="date" name="eta" value={formData.eta} onChange={handleChange} style={inputStyle} /></div>
              </div>
            </div>

            {/* FCL Information */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: S.ink, marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>FCL Information (Optional)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>
                    Container Number/s
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {containerList.map((container, index) => (
                      <div key={index} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="text"
                          value={container}
                          onChange={(e) => handleContainerChange(index, e.target.value)}
                          placeholder={`Container #${index + 1}`}
                          style={{ ...inputStyle, flex: 1, width: "auto" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeContainerRow(index)}
                          style={{
                            width: "40px",
                            height: "40px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px solid ${S.border}`,
                            borderRadius: "8px",
                            backgroundColor: S.bgPage,
                            color: S.red,
                            cursor: "pointer"
                          }}
                          disabled={containerList.length === 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addContainerRow}
                      style={{
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        border: `1px dashed ${S.border}`,
                        borderRadius: "8px",
                        backgroundColor: S.bgSurface,
                        color: S.teal,
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        width: "100%"
                      }}
                    >
                      <Plus size={16} /> Add Container
                    </button>
                  </div>
                </div>
                <div><label style={labelStyle}>Container Deposit</label><select name="containerDeposit" value={formData.containerDeposit} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}><option value="No">No</option><option value="Yes">Yes</option></select></div>
                <div><label style={labelStyle}>Det/Dem</label><input type="text" name="detDem" value={formData.detDem} onChange={handleChange} style={inputStyle} /></div>
              </div>
            </div>
          </div>

          <div style={{ padding: "24px", borderTop: `1px solid ${S.border}`, display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: S.inkSecondary, backgroundColor: S.bgPage, border: `1px solid ${S.border}`, borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: "white", backgroundColor: loading ? "#94A3B8" : S.green, border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer" }}>{loading ? "Creating..." : "Create Booking"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
