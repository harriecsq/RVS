import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Plus, Trash2, User, Mail, Phone, X } from "lucide-react";
import { StandardSelect } from "../design-system/StandardSelect";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';
import { PanelBackdrop } from "../shared/PanelBackdrop";

type ClientStatus = "Prospect" | "Active" | "Inactive";

interface AddClientPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: any) => void;
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

interface LocalContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
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

  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    notes: ""
  });

  const [users, setUsers] = useState<BackendUser[]>([]);

  // Fetch users when panel opens (Operations users)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          cache: 'no-store',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Filter only Operations users
            const opsUsers = result.data.filter((u: BackendUser) => u.department === "Operations");
            setUsers(opsUsers);
          }
        }
      } catch (error) {
        setUsers([]);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Map company_name to 'name' field for backend compatibility
    const { company_name, ...rest } = formData;
    
    // Pass everything to parent, including contacts
    onSave({
      ...rest,
      name: company_name, // Backend expects 'name' field
      contacts: contacts,
      id: `client-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    handleClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      company_name: "",
      address: "",
      phone: "",
      email: "",
      status: "Active",
      notes: "",
    });
    setContacts([]);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    const contact: LocalContact = {
      ...newContact,
      id: `temp-${Date.now()}`
    };
    setContacts([...contacts, contact]);
    setNewContact({ name: "", title: "", email: "", phone: "", notes: "" });
    setShowAddContactModal(false);
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  if (!isOpen) return null;

  const isFormValid = 
    formData.company_name.trim() !== "" &&
    formData.address.trim() !== "";

  return (
    <>
      {/* Backdrop */}
      <PanelBackdrop onClick={handleClose} />

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
              <ArrowLeft className="w-5 h-5 text-[#0A1D4D]" />
            </button>
            
            {/* Title Block */}
            <div>
              <h2 className="text-2xl font-semibold text-[#0A1D4D] mb-1">
                Add New Client
              </h2>
              <p className="text-sm text-[#667085]">
                Create a new client company record for operations management
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form onSubmit={handleSubmit} id="add-client-form">
            {/* Company Information Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={16} style={{ color: "#0F766E" }} />
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Company Information
                </h3>
              </div>

              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label
                    htmlFor="company_name"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#0A1D4D" }}
                  >
                    Company Name <span style={{ color: "#EF4444" }}>*</span>
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

                {/* Address */}
                <div>
                  <label
                    htmlFor="address"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#0A1D4D" }}
                  >
                    Address <span style={{ color: "#EF4444" }}>*</span>
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
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#0A1D4D" }}
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
                    style={{ fontSize: "13px", fontWeight: 500, color: "#0A1D4D" }}
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

                {/* Status */}
                <div>
                  <label
                    htmlFor="status"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#0A1D4D" }}
                  >
                    Status
                  </label>
                  <StandardSelect
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
                    style={{ fontSize: "13px", fontWeight: 500, color: "#0A1D4D" }}
                  >
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Additional information about the client..."
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

            {/* Contacts Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User size={16} style={{ color: "#0F766E" }} />
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Contacts
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
                  style={{
                    backgroundColor: "#E8F5F3",
                    color: "#0F766E",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  <Plus size={14} />
                  Add Contact
                </button>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg" style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E9F0" }}>
                  <p className="text-sm" style={{ color: "#667085" }}>No contacts added yet.</p>
                  <button 
                    type="button"
                    onClick={() => setShowAddContactModal(true)}
                    className="mt-2 text-sm font-medium hover:underline"
                    style={{ color: "#0F766E", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Add the first contact
                  </button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--neuron-ui-border)" }}>
                  {/* Table Header */}
                  <div 
                    className="grid grid-cols-[1.5fr_1fr_1.5fr_auto] gap-3 px-4 py-2 border-b text-xs font-semibold uppercase tracking-wider"
                    style={{ 
                      backgroundColor: "#F9FAFB",
                      borderColor: "var(--neuron-ui-border)",
                      color: "#667085"
                    }}
                  >
                    <div>Name</div>
                    <div>Title</div>
                    <div>Contact Info</div>
                    <div className="w-8"></div>
                  </div>

                  {/* Table Body */}
                  <div className="bg-white">
                    {contacts.map(contact => (
                      <div 
                        key={contact.id}
                        className="grid grid-cols-[1.5fr_1fr_1.5fr_auto] gap-3 px-4 py-3 border-b last:border-0 items-center hover:bg-gray-50 transition-colors group"
                        style={{ borderColor: "var(--neuron-ui-border)" }}
                      >
                        {/* Name */}
                        <div className="font-medium text-sm truncate" style={{ color: "#0A1D4D" }}>
                          {contact.name}
                        </div>

                        {/* Title */}
                        <div className="text-sm truncate" style={{ color: "#667085" }}>
                          {contact.title || '—'}
                        </div>

                        {/* Contact Info */}
                        <div className="flex flex-col gap-1 min-w-0">
                          {contact.email && (
                            <div className="flex items-center gap-1.5 text-xs truncate" style={{ color: "#667085" }}>
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 text-xs truncate" style={{ color: "#667085" }}>
                              <Phone size={12} className="shrink-0" />
                              <span className="truncate">{contact.phone}</span>
                            </div>
                          )}
                          {!contact.email && !contact.phone && <span className="text-xs text-gray-400">—</span>}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end w-8">
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all hover:bg-red-50"
                            style={{ color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}
                            title="Delete contact"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            form="add-client-form"
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
            Create Client
          </button>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
          onClick={() => setShowAddContactModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "480px",
              width: "90%",
              border: "1px solid #E5E9F0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D" }}>Add New Contact</h3>
              <button 
                onClick={() => setShowAddContactModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#667085" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddContact}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#0A1D4D" }}>
                    Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={e => setNewContact({...newContact, name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E9F0" }}
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#0A1D4D" }}>
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={newContact.title}
                    onChange={e => setNewContact({...newContact, title: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E9F0" }}
                    placeholder="e.g. Logistics Manager"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#0A1D4D" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={e => setNewContact({...newContact, email: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: "#E5E9F0" }}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#0A1D4D" }}>
                      Phone
                    </label>
                    <input
                      type="text"
                      value={newContact.phone}
                      onChange={e => setNewContact({...newContact, phone: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: "#E5E9F0" }}
                      placeholder="+63 9..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#0A1D4D" }}>
                    Notes
                  </label>
                  <textarea
                    value={newContact.notes}
                    onChange={e => setNewContact({...newContact, notes: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E9F0" }}
                    rows={3}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ 
                    backgroundColor: "white", 
                    borderColor: "#D1D5DB", 
                    color: "#344054" 
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: "#0F766E", 
                    color: "white",
                    border: "none"
                  }}
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}