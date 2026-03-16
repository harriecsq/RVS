import { X, Building2, User, Plus, Trash2, Mail, Phone, Pencil, MoreHorizontal } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Customer, Contact } from "../../types/bd";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { CustomSelect } from "./CustomSelect";
import { ActionsDropdown } from "../shared/ActionsDropdown";
import { StandardButton } from "../design-system";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
}

export function CustomerDetail({ customer, onBack }: CustomerDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [openContactMenu, setOpenContactMenu] = useState<string | null>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const [editedContact, setEditedContact] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    notes: ""
  });
  
  // Form state
  const [editedCustomer, setEditedCustomer] = useState({
    company_name: customer.name || customer.company_name || "",
    client_name: (customer as any).client_name || "",
    industry: customer.industry || "",
    credit_terms: (customer as any).credit_terms || "Net 30",
    address: (customer as any).address || customer.registered_address || "",
    phone: (customer as any).phone || "",
    email: (customer as any).email || "",
    status: customer.status || "Active",
    notes: customer.notes || "",
  });

  // Contact form state
  const [newContact, setNewContact] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    notes: ""
  });

  // Fetch users and contacts when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          cache: 'no-store',
        });
        const result = await response.json();
        // Users fetched logic if needed
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
    fetchContacts();
  }, [customer.id]);

  const fetchContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const response = await fetch(`${API_URL}/contacts?client_id=${customer.id}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        setContacts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name) {
      toast.error("Name is required");
      return;
    }

    setIsCreatingContact(true);
    try {
      // Split name into first and last name for backend compatibility
      const nameParts = newContact.name.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ');

      const response = await fetch(`${API_URL}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          ...newContact,
          first_name,
          last_name,
          customer_id: customer.id,
          client_id: customer.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Contact added successfully");
        setShowAddContactModal(false);
        setNewContact({ name: "", title: "", email: "", phone: "", notes: "" });
        fetchContacts();
      } else {
        toast.error(result.error || "Failed to add contact");
      }
    } catch (error) {
      console.error("Error creating contact:", error);
      toast.error("Failed to add contact");
    } finally {
      setIsCreatingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Are you sure you want to delete ${contactName}?`)) return;

    try {
      const response = await fetch(`${API_URL}/contacts/${contactId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Contact deleted");
        setContacts(contacts.filter(c => c.id !== contactId));
      } else {
        toast.error(result.error || "Failed to delete contact");
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setEditedContact({
      name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || "Unnamed Contact",
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      notes: contact.notes || ''
    });
    setShowEditContactModal(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedContact.name) {
      toast.error("Name is required");
      return;
    }

    setIsSavingContact(true);
    try {
      // Split name into first and last name for backend compatibility
      const nameParts = editedContact.name.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ');

      const response = await fetch(`${API_URL}/contacts/${editingContact?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          ...editedContact,
          first_name,
          last_name,
          customer_id: customer.id,
          client_id: customer.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Contact updated successfully");
        setShowEditContactModal(false);
        setEditingContact(null);
        setEditedContact({ name: "", title: "", email: "", phone: "", notes: "" });
        fetchContacts();
      } else {
        toast.error(result.error || "Failed to update contact");
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setEditedCustomer(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (!editedCustomer.company_name) {
        toast.error('Company Name is required');
        return;
      }

      console.log('[CustomerDetail] Updating client:', editedCustomer);
      
      const response = await fetch(`${API_URL}/clients/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(editedCustomer)
      });

      const result = await response.json();
      console.log('[CustomerDetail] Update response:', result);

      if (result.success) {
        toast.success('Client updated successfully');
        setIsEditing(false);
        // Update the parent component by going back
        setTimeout(() => {
          onBack();
        }, 500);
      } else {
        toast.error(`Failed to update client: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[CustomerDetail] Error updating client:', error);
      toast.error(`Failed to update client: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setEditedCustomer({
      company_name: customer.name || customer.company_name || "",
      client_name: (customer as any).client_name || "",
      industry: customer.industry || "",
      credit_terms: (customer as any).credit_terms || "Net 30",
      address: (customer as any).address || customer.registered_address || "",
      phone: (customer as any).phone || "",
      email: (customer as any).email || "",
      status: customer.status || "Active",
      notes: customer.notes || "",
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      console.log('[CustomerDetail] Deleting client:', customer.id);
      
      const response = await fetch(`${API_URL}/clients/${customer.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const result = await response.json();
      console.log('[CustomerDetail] Delete response:', result);

      if (result.success) {
        toast.success('Client deleted successfully');
        // Update the parent component by going back
        setTimeout(() => {
          onBack();
        }, 500);
      } else {
        toast.error(`Failed to delete client: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[CustomerDetail] Error deleting client:', error);
      toast.error(`Failed to delete client: ${error.message}`);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black z-40"
        onClick={onBack}
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
          className="px-12 py-8 border-b"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#E8F2EE" }}
              >
                <Building2 size={20} style={{ color: "#0F766E" }} />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#12332B" }}>
                Client Details
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    height: "40px",
                    background: "#0F766E",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#0D6560";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#0F766E";
                  }}
                >
                  <Pencil size={16} />
                  Edit
                </button>
              )}
              <ActionsDropdown
                showDownload={false}
                onDelete={() => setShowDeleteConfirm(true)}
              />
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  color: "var(--neuron-ink-muted)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <p style={{ fontSize: "14px", color: "#667085" }}>
            View and manage client company information
          </p>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form>
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
                    value={editedCustomer.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    placeholder="Acme Corporation Philippines"
                    disabled={!isEditing}
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: isEditing ? "#FFFFFF" : "#F9FAFB",
                      color: "var(--neuron-ink-primary)",
                      cursor: isEditing ? "text" : "not-allowed"
                    }}
                    required
                  />
                </div>

                {/* Address */}
                <div>
                  <label
                    htmlFor="address"
                    className="block mb-1.5"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}
                  >
                    Address <span style={{ color: "#C94F3D" }}>*</span>
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={editedCustomer.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="123 Makati Ave, Makati City, Metro Manila, Philippines"
                    disabled={!isEditing}
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: isEditing ? "#FFFFFF" : "#F9FAFB",
                      color: "var(--neuron-ink-primary)",
                      cursor: isEditing ? "text" : "not-allowed"
                    }}
                    required
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
                    value={editedCustomer.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+63 912 345 6789"
                    disabled={!isEditing}
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: isEditing ? "#FFFFFF" : "#F9FAFB",
                      color: "var(--neuron-ink-primary)",
                      cursor: isEditing ? "text" : "not-allowed"
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
                    value={editedCustomer.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="info@acmecorp.com"
                    disabled={!isEditing}
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px]"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: isEditing ? "#FFFFFF" : "#F9FAFB",
                      color: "var(--neuron-ink-primary)",
                      cursor: isEditing ? "text" : "not-allowed"
                    }}
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
                    value={editedCustomer.status}
                    onChange={(value) => handleChange("status", value)}
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" }
                    ]}
                    disabled={!isEditing}
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
                    value={editedCustomer.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Additional information about the client..."
                    rows={3}
                    disabled={!isEditing}
                    className="w-full px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-[13px] resize-none"
                    style={{
                      border: "1px solid var(--neuron-ui-border)",
                      backgroundColor: isEditing ? "#FFFFFF" : "#F9FAFB",
                      color: "var(--neuron-ink-primary)",
                      cursor: isEditing ? "text" : "not-allowed"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Contacts Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#12332B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
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

              {isLoadingContacts ? (
                <div className="text-center py-4 text-sm" style={{ color: "#667085" }}>Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg" style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}>
                  <p className="text-sm" style={{ color: "#667085" }}>No contacts found.</p>
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
                    <div className="w-16"></div>
                  </div>

                  {/* Table Body */}
                  <div className="bg-white">
                    {contacts.map(contact => {
                      const displayName = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || "Unnamed Contact";
                      return (
                        <div 
                          key={contact.id}
                          className="grid grid-cols-[1.5fr_1fr_1.5fr_auto] gap-3 px-4 py-3 border-b last:border-0 items-center hover:bg-gray-50 transition-colors group"
                          style={{ borderColor: "var(--neuron-ui-border)" }}
                        >
                          {/* Name */}
                          <div className="font-medium text-sm truncate" style={{ color: "#12332B" }}>
                            {displayName}
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

                          {/* Actions - Three dots dropdown */}
                          <div style={{ position: "relative", display: "flex", justifyContent: "flex-end", width: "32px" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenContactMenu(openContactMenu === contact.id ? null : contact.id);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "6px",
                                color: "#667085",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#F3F4F6";
                                e.currentTarget.style.color = "#12332B";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.color = "#667085";
                              }}
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {openContactMenu === contact.id && (
                              <div
                                ref={contactMenuRef}
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  right: 0,
                                  marginTop: "4px",
                                  backgroundColor: "#FFFFFF",
                                  border: "1.5px solid #E5E7EB",
                                  borderRadius: "8px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                  zIndex: 20,
                                  minWidth: "140px",
                                  overflow: "hidden",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenContactMenu(null);
                                    handleEditContact(contact);
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    width: "100%",
                                    padding: "8px 12px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#12332B",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "background 0.1s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }}
                                >
                                  <Pencil size={14} style={{ color: "#0F766E" }} />
                                  Edit Contact
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenContactMenu(null);
                                    handleDeleteContact(contact.id, displayName);
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    width: "100%",
                                    padding: "8px 12px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#EF4444",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "background 0.1s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#FEF2F2";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }}
                                >
                                  <Trash2 size={14} />
                                  Delete Contact
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer Actions - Only shown in edit mode */}
        {isEditing && (
          <div
            className="px-12 py-6 border-t flex items-center justify-end gap-3"
            style={{
              borderColor: "var(--neuron-ui-border)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
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
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: "#0F766E",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0D6560";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0F766E";
              }}
            >
              Save Changes
            </button>
          </div>
        )}
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
              border: "1px solid #E5E7EB",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#12332B" }}>Add New Contact</h3>
              <button 
                onClick={() => setShowAddContactModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#667085" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateContact}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                    Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={newContact.title}
                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                    placeholder="e.g. Logistics Manager"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: "#E5E7EB" }}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                      Phone
                    </label>
                    <input
                      type="text"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: "#E5E7EB" }}
                      placeholder="+63 9..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                    Notes
                  </label>
                  <textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                    rows={3}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <StandardButton
                  variant="outline"
                  onClick={() => setShowAddContactModal(false)}
                  type="button"
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  type="submit"
                  disabled={isCreatingContact}
                >
                  {isCreatingContact ? "Adding..." : "Add Contact"}
                </StandardButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditContactModal && (
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
          onClick={() => setShowEditContactModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "480px",
              width: "90%",
              border: "1px solid #E5E7EB",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#12332B" }}>Edit Contact</h3>
              <button 
                onClick={() => setShowEditContactModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#667085" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveContact}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                    Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editedContact.name}
                    onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={editedContact.title}
                    onChange={(e) => setEditedContact({ ...editedContact, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                    placeholder="e.g. Logistics Manager"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={editedContact.email}
                      onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: "#E5E7EB" }}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                      Phone
                    </label>
                    <input
                      type="text"
                      value={editedContact.phone}
                      onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: "#E5E7EB" }}
                      placeholder="+63 9..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#12332B" }}>
                    Notes
                  </label>
                  <textarea
                    value={editedContact.notes}
                    onChange={(e) => setEditedContact({ ...editedContact, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                    rows={3}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <StandardButton
                  variant="outline"
                  onClick={() => setShowEditContactModal(false)}
                  type="button"
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  type="submit"
                  disabled={isSavingContact}
                >
                  {isSavingContact ? "Saving..." : "Save Contact"}
                </StandardButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "480px",
              width: "90%",
              border: "1px solid #E5E7EB",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#12332B",
              marginBottom: "12px",
            }}>
              Delete Client
            </h3>
            <p style={{
              fontSize: "14px",
              color: "#667085",
              marginBottom: "24px",
              lineHeight: "1.5",
            }}>
              Are you sure you want to delete {editedCustomer.company_name}? This action cannot be undone.
            </p>
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}>
              <StandardButton
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </StandardButton>
              <StandardButton
                variant="danger"
                onClick={handleDelete}
              >
                Delete Client
              </StandardButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}