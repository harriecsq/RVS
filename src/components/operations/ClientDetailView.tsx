import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Pencil, User, Mail, Phone, X, Plus, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { StandardTabs } from "../design-system/StandardTabs";
import { StandardInput } from "../design-system/StandardInput";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { StandardButton } from "../design-system/StandardButton";
import { StandardEmptyState } from "../design-system/StandardEmptyState";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { PanelBackdrop } from "../shared/PanelBackdrop";
import { toast } from "../ui/toast-utils";
import { publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import type { Client, Contact } from "../../types/operations";

interface ClientDetailViewProps {
  client: Client;
  onBack: () => void;
}

type DetailTab = "clients" | "attachments";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClientDetailView({ client, onBack }: ClientDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("clients");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(client.contacts || []);
  const [notes, setNotes] = useState(client.notes || "");
  const [showAddClientPanel, setShowAddClientPanel] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Editable company fields
  const [editData, setEditData] = useState({
    name: client.name || client.company_name || "",
    address: client.address || client.registered_address || "",
    phone: client.phone || "",
    email: client.email || "",
    status: (client.status as string) || "Active",
  });

  // Live display data (updates after save)
  const [displayData, setDisplayData] = useState({ ...editData });

  // Fetch full client data with contacts
  const fetchClientData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${client.id}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data;
        setContacts(data.contacts || []);
        setNotes(data.notes || "");
        const updated = {
          name: data.name || data.company_name || "",
          address: data.address || data.registered_address || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "Active",
        };
        setDisplayData(updated);
        setEditData(updated);
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
    }
  }, [client.id]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const handleSaveCompany = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          name: editData.name,
          address: editData.address,
          phone: editData.phone,
          email: editData.email,
          status: editData.status,
          notes,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setDisplayData({ ...editData });
        setIsEditing(false);
        toast.success("Company updated successfully");
      } else {
        toast.error("Failed to update company");
      }
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Failed to update company");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({ ...displayData });
    setIsEditing(false);
  };

  const handleSaveNotes = async () => {
    try {
      await fetch(`${API_BASE_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ notes }),
      });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const companyName = displayData.name;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF" }}>
      {/* Back link */}
      <div style={{ padding: "16px 32px 0" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
            color: "#0F766E",
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Back to Customers
        </button>
      </div>

      {/* Two-panel layout */}
      <div style={{ flex: 1, display: "flex", gap: "32px", padding: "24px 32px", overflow: "hidden" }}>
        {/* Left Panel — Company Profile */}
        <div
          style={{
            width: "560px",
            flexShrink: 0,
            background: "#FFFFFF",
            border: "1px solid #E5E9F0",
            borderRadius: "12px",
            padding: "32px 28px",
            overflowY: "auto",
            alignSelf: "flex-start",
          }}
        >
          {/* Avatar + Name + Status */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                background: "#0F766E",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(companyName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "#0A1D4D",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {companyName}
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: "#667085",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}
                    title="Edit company details"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              <div style={{ marginTop: "6px" }}>
                <NeuronStatusPill status={displayData.status} size="sm" />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderBottom: "1px solid #E5E9F0", margin: "20px 0" }} />

          {/* Info Fields */}
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <StandardInput
                label="Company Name"
                value={editData.name}
                onChange={(v) => setEditData((p) => ({ ...p, name: v }))}
                required
              />
              <StandardInput
                label="Address"
                value={editData.address}
                onChange={(v) => setEditData((p) => ({ ...p, address: v }))}
                required
              />
              <StandardInput
                label="Phone"
                value={editData.phone}
                onChange={(v) => setEditData((p) => ({ ...p, phone: v }))}
                type="tel"
              />
              <StandardInput
                label="Email"
                value={editData.email}
                onChange={(v) => setEditData((p) => ({ ...p, email: v }))}
                type="email"
              />
              <FilterSingleDropdown
                label="Status"
                value={editData.status}
                onChange={(v) => setEditData((p) => ({ ...p, status: v }))}
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#D0D5DD"; }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <StandardButton variant="secondary" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </StandardButton>
                <StandardButton variant="primary" size="sm" onClick={handleSaveCompany} loading={isSaving}>
                  Save
                </StandardButton>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <InfoField label="ADDRESS" value={displayData.address} />
              <InfoField label="PHONE" value={displayData.phone} />
              <InfoField label="EMAIL" value={displayData.email} />
              <InfoField label="STATUS" value={displayData.status} />
              <InfoField label="CREATED" value={formatDate(client.created_at)} />
              <InfoField label="NOTES" value={notes} />
            </div>
          )}
        </div>

        {/* Right Panel — Tabs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          <StandardTabs
            tabs={[
              { id: "clients", label: "Clients", badge: contacts.length || undefined },
              { id: "attachments", label: "Attachments" },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as DetailTab)}
            style={{ padding: 0 }}
          />

          <div style={{ flex: 1, overflowY: "auto", marginTop: "24px" }}>
            {activeTab === "clients" && (
              <ClientsTab
                contacts={contacts}
                companyId={client.id}
                onRefresh={fetchClientData}
                showAddPanel={showAddClientPanel}
                setShowAddPanel={setShowAddClientPanel}
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
              />
            )}

            {activeTab === "attachments" && (
              <AttachmentsTab entityType="client" entityId={client.id} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Info Field (read-only) ── */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#667085",
          textTransform: "uppercase" as const,
          letterSpacing: "0.5px",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "14px", color: "#0A1D4D", fontWeight: 400 }}>
        {value || "—"}
      </div>
    </div>
  );
}

/* ── Clients Tab ── */
function ClientsTab({
  contacts,
  companyId,
  onRefresh,
  showAddPanel,
  setShowAddPanel,
  selectedContact,
  setSelectedContact,
}: {
  contacts: Contact[];
  companyId: string;
  onRefresh: () => void;
  showAddPanel: boolean;
  setShowAddPanel: (v: boolean) => void;
  selectedContact: Contact | null;
  setSelectedContact: (c: Contact | null) => void;
}) {
  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>Client List</h3>
        <StandardButton variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => setShowAddPanel(true)}>
          Add Client
        </StandardButton>
      </div>

      {/* Client cards */}
      {contacts.length === 0 ? (
        <StandardEmptyState
          icon={<User size={32} />}
          title="No clients yet"
          description="Add the first client associated with this company."
          action={{ label: "Add Client", onClick: () => setShowAddPanel(true) }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E9F0",
                borderRadius: "10px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#0F766E";
                e.currentTarget.style.backgroundColor = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E9F0";
                e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "33px",
                  height: "33px",
                  borderRadius: "50%",
                  border: "1px solid #E5E9F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: "#F9FAFB",
                }}
              >
                <User size={16} style={{ color: "#667085" }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                  {contact.name}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                  {contact.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#667085" }}>
                      <Mail size={11} style={{ color: "#667085", flexShrink: 0 }} />
                      {contact.email}
                    </div>
                  )}
                  {contact.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#667085" }}>
                      <Phone size={11} style={{ color: "#667085", flexShrink: 0 }} />
                      {contact.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div style={{ flexShrink: 0 }}>
                <NeuronStatusPill status={contact.status || "Active"} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Side Panel */}
      {showAddPanel && (
        <ClientSidePanel
          mode="add"
          companyId={companyId}
          onClose={() => setShowAddPanel(false)}
          onSaved={onRefresh}
        />
      )}

      {/* View/Edit Client Side Panel */}
      {selectedContact && (
        <ClientSidePanel
          mode="view"
          companyId={companyId}
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onSaved={() => {
            setSelectedContact(null);
            onRefresh();
          }}
          onDeleted={() => {
            setSelectedContact(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

/* ── Client Side Panel (Add / View+Edit) ── */
function ClientSidePanel({
  mode,
  companyId,
  contact,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "add" | "view";
  companyId: string;
  contact?: Contact;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [isEditMode, setIsEditMode] = useState(mode === "add");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: contact?.name || "",
    title: contact?.title || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    notes: contact?.notes || "",
    status: contact?.status || "Active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (mode === "add") {
        const response = await fetch(`${API_BASE_URL}/contacts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            ...form,
            customer_id: companyId,
            id: `contact-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        const result = await response.json();
        if (result.success) {
          toast.success("Client added");
          onSaved();
        } else {
          toast.error("Failed to add client");
        }
      } else if (contact) {
        const response = await fetch(`${API_BASE_URL}/contacts/${contact.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            ...form,
            updated_at: new Date().toISOString(),
          }),
        });
        const result = await response.json();
        if (result.success) {
          toast.success("Client updated");
          onSaved();
        } else {
          toast.error("Failed to update client");
        }
      }
    } catch {
      toast.error(mode === "add" ? "Failed to add client" : "Failed to update client");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    try {
      const response = await fetch(`${API_BASE_URL}/contacts/${contact.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Client removed");
        onDeleted?.();
      } else {
        toast.error("Failed to remove client");
      }
    } catch {
      toast.error("Failed to remove client");
    }
  };

  return (
    <>
      <PanelBackdrop onClick={onClose} />
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100%",
          width: "520px",
          backgroundColor: "#FFFFFF",
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.08)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #E5E9F0",
          animation: "slide-in 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px",
            borderBottom: "1px solid #E5E9F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              color: "#0A1D4D",
              borderRadius: "6px",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          {mode === "add" && (
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D", margin: 0, flex: 1, marginLeft: "12px" }}>
              Add New Client
            </h2>
          )}
          {mode === "view" && !isEditMode && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
              <StandardButton variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setIsEditMode(true)}>
                Edit
              </StandardButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid #E5E9F0",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#667085",
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    style={{ color: "#EF4444", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Trash2 size={14} />
                    Delete Client
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {isEditMode ? (
            <form onSubmit={handleSubmit} id="client-side-panel-form">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <StandardInput
                  label="Name"
                  value={form.name}
                  onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                  placeholder="e.g. John Doe"
                  required
                />
                <StandardInput
                  label="Job Title"
                  value={form.title}
                  onChange={(v) => setForm((p) => ({ ...p, title: v }))}
                  placeholder="e.g. Logistics Manager"
                />
                <StandardInput
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                  type="email"
                  placeholder="john@example.com"
                />
                <StandardInput
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                  type="tel"
                  placeholder="+63 9..."
                />
                <FilterSingleDropdown
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm((p) => ({ ...p, status: v }))}
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
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Add notes about this client..."
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
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#D0D5DD"; }}
                  />
                </div>
              </div>
            </form>
          ) : (
            /* Read-only view */
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Avatar + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    border: "1px solid #E5E9F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#F9FAFB",
                    flexShrink: 0,
                  }}
                >
                  <User size={24} style={{ color: "#667085" }} />
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D" }}>{contact?.name}</div>
                  {contact?.title && (
                    <div style={{ fontSize: "14px", color: "#667085", marginTop: "2px" }}>{contact.title}</div>
                  )}
                </div>
              </div>

              <div style={{ borderBottom: "1px solid #E5E9F0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <InfoField label="EMAIL" value={contact?.email || ""} />
                <InfoField label="PHONE" value={contact?.phone || ""} />
                {contact?.created_at && <InfoField label="ADDED" value={formatDate(contact.created_at)} />}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                    STATUS
                  </div>
                  <NeuronStatusPill status={contact?.status || "Active"} size="sm" />
                </div>
                <InfoField label="NOTES" value={contact?.notes || ""} />
              </div>

              <div style={{ borderBottom: "1px solid #E5E9F0" }} />

              <AttachmentsTab entityType="contact" entityId={contact?.id || ""} compact />
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditMode && (
          <div
            style={{
              padding: "16px 28px",
              borderTop: "1px solid #E5E9F0",
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            <StandardButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (mode === "view") {
                  setForm({
                    name: contact?.name || "",
                    title: contact?.title || "",
                    email: contact?.email || "",
                    phone: contact?.phone || "",
                    notes: contact?.notes || "",
                    status: contact?.status || "Active",
                  });
                  setIsEditMode(false);
                } else {
                  onClose();
                }
              }}
            >
              Cancel
            </StandardButton>
            <StandardButton type="submit" form="client-side-panel-form" variant="primary" size="sm" loading={isSaving}>
              {mode === "add" ? "Add Client" : "Save Changes"}
            </StandardButton>
          </div>
        )}
      </div>
    </>
  );
}
