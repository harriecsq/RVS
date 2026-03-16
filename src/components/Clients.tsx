import { useState } from "react";
import {
  Plus,
  Search,
  Building2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { toast } from "./ui/toast-utils";

interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  defaultOrigin: string;
  defaultDestination: string;
  services: Array<"Import" | "Export" | "Domestic">;
  notes: string;
  activeBookings: number;
  totalRevenue: number;
  paymentTerms: string;
}

interface ClientsProps {
  onViewClient?: (clientData: Client) => void;
  onCreateBooking?: (clientId: string) => void;
}

export function Clients({ onViewClient, onCreateBooking }: ClientsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for Add Client modal
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    defaultOrigin: "",
    defaultDestination: "",
    services: [] as Array<"Import" | "Export" | "Domestic">,
    notes: "",
  });

  // Mock clients data
  const mockClients: Client[] = [
    {
      id: "1",
      name: "Acme Trading Corp",
      contactPerson: "Maria Santos",
      phone: "+63 917 123 4567",
      email: "maria.santos@acmetrading.com",
      address: "Quezon Avenue, Quezon City",
      defaultOrigin: "Manila",
      defaultDestination: "Singapore",
      services: ["Import"],
      notes: "Preferred for Ocean LCL shipments",
      activeBookings: 3,
      totalRevenue: 125000,
      paymentTerms: "Net 30",
    },
    {
      id: "2",
      name: "Global Imports Ltd",
      contactPerson: "John Reyes",
      phone: "+63 918 234 5678",
      email: "john.reyes@globalimports.com",
      address: "Quezon Avenue, Quezon City",
      defaultOrigin: "Manila",
      defaultDestination: "Hong Kong",
      services: ["Import", "Export"],
      notes: "Large volume client",
      activeBookings: 5,
      totalRevenue: 185000,
      paymentTerms: "Net 15",
    },
    {
      id: "3",
      name: "Metro Retail Group",
      contactPerson: "Ana Cruz",
      phone: "+63 919 345 6789",
      email: "ana.cruz@metroretail.com",
      address: "Ortigas Center, Pasig City",
      defaultOrigin: "Quezon City",
      defaultDestination: "Bangkok",
      services: ["Export", "Domestic"],
      notes: "Requires temperature-controlled containers",
      activeBookings: 2,
      totalRevenue: 95000,
      paymentTerms: "Net 30",
    },
    {
      id: "4",
      name: "Pacific Distribution Co",
      contactPerson: "Carlos Mendoza",
      phone: "+63 920 456 7890",
      email: "carlos.mendoza@pacificdist.com",
      address: "Makati CBD, Makati City",
      defaultOrigin: "Cebu",
      defaultDestination: "Tokyo",
      services: ["Import"],
      notes: "Time-sensitive deliveries",
      activeBookings: 4,
      totalRevenue: 156000,
      paymentTerms: "Net 30",
    },
    {
      id: "5",
      name: "Sterling Supply Chain",
      contactPerson: "Sarah Lim",
      phone: "+63 921 567 8901",
      email: "sarah.lim@sterlingsupply.com",
      address: "BGC, Taguig City",
      defaultOrigin: "Manila",
      defaultDestination: "Seoul",
      services: ["Import", "Export", "Domestic"],
      notes: "Prefers air freight for urgent shipments",
      activeBookings: 6,
      totalRevenue: 220000,
      paymentTerms: "Net 15",
    },
  ];

  const [clients, setClients] = useState<Client[]>(mockClients);

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getClientInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleAddClient = () => {
    if (!formData.name || !formData.contactPerson || !formData.phone || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newClient: Client = {
      id: `${clients.length + 1}`,
      name: formData.name,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      defaultOrigin: formData.defaultOrigin,
      defaultDestination: formData.defaultDestination,
      services: formData.services,
      notes: formData.notes,
      activeBookings: 0,
      totalRevenue: 0,
      paymentTerms: "Net 30",
    };

    setClients([...clients, newClient]);
    setShowAddModal(false);
    toast.success("Client added successfully");

    // Reset form
    setFormData({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      defaultOrigin: "",
      defaultDestination: "",
      services: [],
      notes: "",
    });
  };

  const toggleServiceSelection = (service: "Import" | "Export" | "Domestic") => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  // Calculate stats
  const totalClients = clients.length;
  const totalActiveBookings = clients.reduce((sum, c) => sum + c.activeBookings, 0);
  const totalRevenue = clients.reduce((sum, c) => sum + c.totalRevenue, 0);

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
        {/* Header */}
        <div style={{ padding: "32px 48px 24px 48px" }}>
          <div style={{
            display: "flex",
            alignItems: "start",
            justifyContent: "space-between",
            marginBottom: "24px"
          }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: 600, color: "#12332B", marginBottom: "4px", letterSpacing: "-1.2px" }}>
                Clients
              </h1>
              <p style={{ fontSize: "14px", color: "#667085" }}>
                Manage client profiles, bookings, and operational workflows
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                borderRadius: "8px",
                background: "#0F766E",
                color: "white",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Client
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#667085",
              }}
            />
            <input
              type="text"
              placeholder="Search by client name, contact person, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 40px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                color: "#12332B",
                backgroundColor: "#FFFFFF",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: "0 48px 48px 48px" }}>
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  background: "#F9FAFB",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <Building2 size={40} style={{ color: "#9CA3AF" }} />
              </div>
              <div style={{ fontSize: "16px", fontWeight: 500, color: "#12332B", marginBottom: "8px" }}>
                {searchTerm ? "No clients match your search" : "No clients yet"}
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-[#0F766E] hover:underline"
              >
                Add your first client
              </button>
            </div>
          ) : (
            <div style={{
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#FFFFFF"
            }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#12332B]/10">
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Client Name
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Contact Person
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                      Active Bookings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                      onClick={() => {
                        if (onViewClient) {
                          onViewClient(client);
                        }
                      }}
                    >
                      {/* Client Name with Icon */}
                      <td className="py-4 px-4">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "#0F766E",
                              color: "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {getClientInitials(client.name)}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                            {client.name}
                          </div>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "14px", color: "#12332B" }}>
                          {client.contactPerson}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "13px", color: "#667085" }}>
                          {client.phone}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "13px", color: "#667085", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {client.email}
                        </div>
                      </td>

                      {/* Active Bookings */}
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
                          {client.activeBookings}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Fill in the client information below
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "16px", paddingBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Client Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter client name"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Contact Person *</label>
                <input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Enter contact person"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Phone *</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+63 XXX XXX XXXX"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@company.com"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Address</label>
                <input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Default Origin</label>
                <input
                  value={formData.defaultOrigin}
                  onChange={(e) => setFormData({ ...formData, defaultOrigin: e.target.value })}
                  placeholder="e.g., Manila"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Default Destination</label>
                <input
                  value={formData.defaultDestination}
                  onChange={(e) => setFormData({ ...formData, defaultDestination: e.target.value })}
                  placeholder="e.g., Cebu"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Preferred Services</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["Import", "Export", "Domestic"] as const).map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleServiceSelection(service)}
                      style={{
                        height: "36px",
                        padding: "0 16px",
                        borderRadius: "8px",
                        border: "1px solid #E5E9F0",
                        background: formData.services.includes(service) ? "#0F766E" : "#FFFFFF",
                        color: formData.services.includes(service) ? "#FFFFFF" : "#12332B",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 200ms ease",
                      }}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the client"
                  rows={3}
                  style={{
                    padding: "12px",
                    fontSize: "14px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    outline: "none",
                    color: "#12332B",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                height: "40px",
                padding: "0 16px",
                borderRadius: "8px",
                border: "1px solid #E5E9F0",
                background: "#FFFFFF",
                color: "#12332B",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddClient}
              style={{
                height: "40px",
                padding: "0 16px",
                borderRadius: "8px",
                border: "none",
                background: "#0F766E",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Add Client
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}