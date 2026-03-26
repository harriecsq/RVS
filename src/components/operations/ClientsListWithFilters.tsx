import { useState, useEffect, useRef } from "react";
import { Search, Plus, Building2, Users as UsersIcon, TrendingUp, Briefcase, Target, ArrowUp, ArrowDown, MoreHorizontal, X } from "lucide-react";
import type { Client, Industry, ClientStatus } from "../../types/operations";
import { AddClientPanel } from "./AddClientPanel";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { Mail, Phone } from "lucide-react";
import { API_BASE_URL } from '@/utils/api-config';

interface ClientsListWithFiltersProps {
  onViewClient: (client: Client) => void;
}

export function ClientsListWithFilters({ onViewClient }: ClientsListWithFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "All">("All");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Operations has full permissions for Clients module
  const permissions = {
    canCreate: true,
    canEdit: true,
    showKPIs: false,
    showOwnerFilter: true,
  };

  // Fetch users from backend (Operations users)
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users?department=Operations`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
        console.log('[ClientsListWithFilters] Fetched users:', result.data.length);
      } else {
        console.log('[ClientsListWithFilters] Failed to fetch users - server returned error');
        setUsers([]);
      }
    } catch (error) {
      console.log('[ClientsListWithFilters] Backend not available for users fetch');
      setUsers([]);
    }
  };

  // Fetch clients from backend
  const fetchClients = async (retryCount = 0) => {
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (statusFilter && statusFilter !== "All") {
        params.append("status", statusFilter);
      }
      params.append("role", "Operations");
      
      const url = `${API_BASE_URL}/clients?${params.toString()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setClients(result.data);
      } else {
        setClients([]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[ClientsListWithFilters] Request timed out');
      } else {
        console.error('[ClientsListWithFilters] Error fetching clients:', error);
      }
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  // Debounced search and filter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle delete client
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    
    try {
      console.log('[ClientsListWithFilters] Deleting client:', clientToDelete.id, clientToDelete.name);
      
      // Try backend first
      try {
        const response = await fetch(`${API_BASE_URL}/clients/${clientToDelete.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        });

        const result = await response.json();
        console.log('[ClientsListWithFilters] Delete response:', result);
        
        if (result.success) {
          toast.success(`Client "${clientToDelete.name || clientToDelete.company_name}" deleted successfully`);
          await fetchClients();
          setShowDeleteModal(false);
          setClientToDelete(null);
          return;
        } else {
          console.error('[ClientsListWithFilters] Server error:', result.error);
          throw new Error(result.error);
        }
      } catch (fetchError: any) {
        // If backend is not available, use localStorage
        if (fetchError.message === 'Failed to fetch' || fetchError.message.includes('fetch')) {
          console.warn('[ClientsListWithFilters] Backend not available, deleting from localStorage');
          
          // Load existing clients from localStorage
          const localClients = localStorage.getItem('neuron_clients');
          let clientsList: Client[] = [];
          if (localClients) {
            try {
              clientsList = JSON.parse(localClients);
            } catch (e) {
              console.error('Error parsing localStorage clients:', e);
              clientsList = [];
            }
          }
          
          // Remove the client
          clientsList = clientsList.filter(c => c.id !== clientToDelete.id);
          
          // Save back to localStorage
          localStorage.setItem('neuron_clients', JSON.stringify(clientsList));
          
          console.log('[ClientsListWithFilters] ✅ Client deleted from localStorage');
          toast.success(`Client "${clientToDelete.name || clientToDelete.company_name}" deleted successfully (offline mode)`);
          
          // Update the UI
          setClients(clientsList);
          setShowDeleteModal(false);
          setClientToDelete(null);
          return;
        }
        
        // Re-throw other errors
        throw fetchError;
      }
    } catch (error: any) {
      console.error("[ClientsListWithFilters] Error deleting client:", error);
      toast.error(`Failed to delete client: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle save client
  const handleSaveClient = async (clientData: any) => {
    try {
      console.log('[ClientsListWithFilters] Creating client with data:', clientData);
      
      const { contacts, ...clientPayload } = clientData;
      
      // Try backend first
      try {
        const response = await fetch(`${API_BASE_URL}/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(clientPayload),
        });

        console.log('[ClientsListWithFilters] Response status:', response.status);
        
        const result = await response.json();
        console.log('[ClientsListWithFilters] Response result:', result);
        
        if (result.success) {
          const newClientId = result.data.id;
          
          // Create contacts if any
          if (contacts && contacts.length > 0) {
            console.log(`[ClientsListWithFilters] Creating ${contacts.length} contacts for client ${newClientId}`);
            
            for (const contact of contacts) {
               // Split name into first and last name for backend compatibility
               const nameParts = contact.name.trim().split(' ');
               const first_name = nameParts[0];
               const last_name = nameParts.slice(1).join(' ');

               await fetch(`${API_BASE_URL}/contacts`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({
                  ...contact,
                  first_name,
                  last_name,
                  client_id: newClientId,
                  customer_id: newClientId, // Backward compatibility
                }),
              });
            }
          }

          toast.success(`Client "${clientData.name}" created successfully`);
          await fetchClients();
          setIsAddClientOpen(false);
          return;
        } else {
          console.error('[ClientsListWithFilters] Server error:', result.error);
          throw new Error(result.error);
        }
      } catch (fetchError: any) {
        // If backend is not available, use localStorage
        if (fetchError.message === 'Failed to fetch' || fetchError.message.includes('fetch')) {
          console.warn('[ClientsListWithFilters] Backend not available, saving to localStorage');
          
          // Create client with proper structure
          const newClient: Client = {
            ...clientData as Client,
            id: clientData.id || `client-${Date.now()}`,
            created_at: clientData.created_at || new Date().toISOString(),
            updated_at: clientData.updated_at || new Date().toISOString(),
          };
          
          // Load existing clients from localStorage
          const localClients = localStorage.getItem('neuron_clients');
          let clients: Client[] = [];
          if (localClients) {
            try {
              clients = JSON.parse(localClients);
            } catch (e) {
              console.error('Error parsing localStorage clients:', e);
              clients = [];
            }
          }
          
          // Add new client
          clients.push(newClient);
          
          // Save back to localStorage
          localStorage.setItem('neuron_clients', JSON.stringify(clients));
          
          console.log('[ClientsListWithFilters] ✅ Client saved to localStorage');
          toast.success(`Client "${clientData.name}" created successfully (offline mode)`);
          
          // Update the UI
          setClients(clients);
          setIsAddClientOpen(false);
          return;
        }
        
        // Re-throw other errors
        throw fetchError;
      }
    } catch (error: any) {
      console.error("[ClientsListWithFilters] Error creating client:", error);
      toast.error(`Failed to create client: ${error.message}`);
      throw error;
    }
  };

  // Get contact count for each client
  const getContactCount = (clientId: string, clientName: string): number => {
    // TODO: Implement contact counting when contacts are loaded
    return 0;
  };

  // Filter clients - backend handles search and status filtering
  const filteredClients = [...clients].sort((a, b) => {
    // Sort alphabetically by company name or name
    const nameA = (a.company_name || a.name || '').toLowerCase();
    const nameB = (b.company_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const getOwnerName = (ownerId: string) => {
    const owner = users.find(u => u.id === ownerId);
    return owner?.name || "—";
  };

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case "Active": return "#0F766E";
      case "Inactive": return "#6B7A76";
      default: return "#6B7A76";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric'
    });
  };

  // Generate company logo (initials from company name)
  const getCompanyInitials = (companyName: string) => {
    if (!companyName) return '??';
    const words = companyName.split(' ');
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  };

  const getCompanyLogoColor = (companyName: string) => {
    if (!companyName) return '#0F766E';
    const colors = [
      '#0F766E', '#2B8A6E', '#237F66', '#1E6D59',
      '#C88A2B', '#6B7A76', '#C94F3D'
    ];
    const index = companyName.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Calculate KPIs
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === "Active").length;
  const prospectClients = clients.filter(c => c.status === "Prospect").length;
  
  const newClientsAdded = clients.filter(client => {
    const createdDate = new Date(client.created_at);
    return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
  }).length;
  const newClientsQuota = 10;
  const newClientsProgress = (newClientsAdded / newClientsQuota) * 100;
  const newClientsTrend = 20;
  
  const prospectsConverted = 4;
  const prospectsQuota = 8;
  const prospectsProgress = (prospectsConverted / prospectsQuota) * 100;
  const prospectsTrend = 12;
  
  const activeClientsCount = activeClients;
  const activeClientsQuota = 50;
  const activeClientsProgress = (activeClientsCount / activeClientsQuota) * 100;
  const activeClientsTrend = 8;
  
  const totalRevenue = 2450000;
  const revenueQuota = 3000000;
  const revenueProgress = (totalRevenue / revenueQuota) * 100;
  const revenueTrend = -5;
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "#0F766E";
    if (progress >= 60) return "#C88A2B";
    return "#C94F3D";
  };
  
  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return "#E8F5F3";
    if (progress >= 60) return "#FEF3E7";
    return "#FFE5E5";
  };

  const formatCurrency = (amount: number) => {
    return `₱${(amount / 1000000).toFixed(2)}M`;
  };

  return (
    <div 
      className="h-full overflow-auto"
      style={{
        background: "#FFFFFF",
      }}
    >
      <div style={{ padding: "32px 48px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: 600, color: "#12332B", marginBottom: "4px", letterSpacing: "-1.2px" }}>
              Clients
            </h1>
            <p style={{ fontSize: "14px", color: "#667085" }}>
              Manage client companies and business relationships
            </p>
          </div>
          {permissions.canCreate && (
            <button
              style={{
                height: "48px",
                padding: "0 24px",
                borderRadius: "16px",
                background: "#0F766E",
                border: "none",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0D6560";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0F766E";
              }}
              onClick={() => setIsAddClientOpen(true)}
            >
              <Plus size={20} />
              Add Client
            </button>
          )}
        </div>

        {/* KPI Section */}
        {permissions.showKPIs && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* New Clients Added */}
            <div 
              className="p-5 rounded-xl" 
              style={{ 
                border: "1.5px solid var(--neuron-ui-border)",
                backgroundColor: "#FFFFFF" 
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <Building2 size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {newClientsTrend > 0 ? (
                    <ArrowUp size={14} style={{ color: "#0F766E" }} />
                  ) : (
                    <ArrowDown size={14} style={{ color: "#C94F3D" }} />
                  )}
                  <span className="text-xs" style={{ color: newClientsTrend > 0 ? "#0F766E" : "#C94F3D" }}>
                    {Math.abs(newClientsTrend)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>New Clients Added</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{newClientsAdded}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {newClientsQuota}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(newClientsProgress) }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(newClientsProgress, 100)}%`,
                      backgroundColor: getProgressColor(newClientsProgress)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Prospects Converted */}
            <div 
              className="p-5 rounded-xl" 
              style={{ 
                border: "1.5px solid var(--neuron-ui-border)",
                backgroundColor: "#FFFFFF" 
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <Target size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {prospectsTrend > 0 ? (
                    <ArrowUp size={14} style={{ color: "#0F766E" }} />
                  ) : (
                    <ArrowDown size={14} style={{ color: "#C94F3D" }} />
                  )}
                  <span className="text-xs" style={{ color: prospectsTrend > 0 ? "#0F766E" : "#C94F3D" }}>
                    {Math.abs(prospectsTrend)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>Prospects Converted</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{prospectsConverted}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {prospectsQuota}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(prospectsProgress) }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(prospectsProgress, 100)}%`,
                      backgroundColor: getProgressColor(prospectsProgress)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Active Clients */}
            <div 
              className="p-5 rounded-xl" 
              style={{ 
                border: "1.5px solid var(--neuron-ui-border)",
                backgroundColor: "#FFFFFF" 
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <Briefcase size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {activeClientsTrend > 0 ? (
                    <ArrowUp size={14} style={{ color: "#0F766E" }} />
                  ) : (
                    <ArrowDown size={14} style={{ color: "#C94F3D" }} />
                  )}
                  <span className="text-xs" style={{ color: activeClientsTrend > 0 ? "#0F766E" : "#C94F3D" }}>
                    {Math.abs(activeClientsTrend)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>Active Clients</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{activeClientsCount}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {activeClientsQuota}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(activeClientsProgress) }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(activeClientsProgress, 100)}%`,
                      backgroundColor: getProgressColor(activeClientsProgress)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div 
              className="p-5 rounded-xl" 
              style={{ 
                border: "1.5px solid var(--neuron-ui-border)",
                backgroundColor: "#FFFFFF" 
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <TrendingUp size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {revenueTrend > 0 ? (
                    <ArrowUp size={14} style={{ color: "#0F766E" }} />
                  ) : (
                    <ArrowDown size={14} style={{ color: "#C94F3D" }} />
                  )}
                  <span className="text-xs" style={{ color: revenueTrend > 0 ? "#0F766E" : "#C94F3D" }}>
                    {Math.abs(revenueTrend)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>Total Revenue (MTD)</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{formatCurrency(totalRevenue)}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {formatCurrency(revenueQuota)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(revenueProgress) }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(revenueProgress, 100)}%`,
                      backgroundColor: getProgressColor(revenueProgress)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

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
            placeholder="Search by company name, address, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Building2 className="w-12 h-12 mb-3" style={{ color: "#9CA3AF" }} />
            <div style={{ fontSize: "14px", color: "#667085" }}>Loading clients...</div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Building2 className="w-12 h-12 mb-3" style={{ color: "#9CA3AF" }} />
            <div style={{ fontSize: "16px", fontWeight: 500, color: "#12332B", marginBottom: "8px" }}>No clients found</div>
            <div style={{ fontSize: "13px", color: "#667085" }}>Try adjusting your search query</div>
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
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide" style={{ width: "48px" }}></th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Company
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Address
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Contact Info
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide" style={{ width: "48px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const logoColor = getCompanyLogoColor(client.name || client.company_name || '');
                  const address = client.address || client.registered_address || "—";

                  return (
                    <tr
                      key={client.id}
                      className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                      onClick={() => onViewClient(client)}
                    >
                      {/* Company Logo */}
                      <td className="py-4 px-4">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold"
                          style={{ 
                            backgroundColor: `${logoColor}15`,
                            color: logoColor,
                            flexShrink: 0,
                          }}
                        >
                          {getCompanyInitials(client.name || client.company_name || '')}
                        </div>
                      </td>

                      {/* Company Name */}
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                          {client.name || client.company_name}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "14px", color: "#12332B", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={address}>
                          {address}
                        </div>
                      </td>

                      {/* Contact Info - Phone + Email stacked */}
                      <td className="py-4 px-4">
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#12332B" }}>
                            <Mail size={14} style={{ color: "#667085", flexShrink: 0 }} />
                            <span style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {(client as any).email || "—"}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#12332B" }}>
                            <Phone size={14} style={{ color: "#667085", flexShrink: 0 }} />
                            <span>{(client as any).phone || "—"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <NeuronStatusPill status={client.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="relative flex justify-end" ref={dropdownRef}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === client.id ? null : client.id);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{ color: "#667085" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F9FAFB";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Client Panel */}
      <AddClientPanel
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSave={handleSaveClient}
      />

      {/* Delete Client Modal */}
      {showDeleteModal && clientToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
          onClick={() => {
            console.log('[ClientsListWithFilters] Modal backdrop clicked - closing modal');
            setShowDeleteModal(false);
            setClientToDelete(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              width: "400px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#12332B",
                marginBottom: "16px"
              }}
            >
              Delete Client
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#667085",
                marginBottom: "24px"
              }}
            >
              Are you sure you want to delete the client "{clientToDelete?.name || clientToDelete?.company_name}"?
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px"
              }}
            >
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setClientToDelete(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  background: "transparent",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  color: "#667085",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('[ClientsListWithFilters] Delete button in modal clicked');
                  handleDeleteClient();
                }}
                disabled={isDeleting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  background: isDeleting ? "#F87171" : "#EF4444",
                  border: "none",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}