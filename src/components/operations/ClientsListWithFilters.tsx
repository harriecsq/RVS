import { useState, useEffect, useRef } from "react";
import { Plus, Building2, TrendingUp, Briefcase, Target, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
import type { Client, Industry, ClientStatus } from "../../types/operations";
import { AddClientPanel } from "./AddClientPanel";
import { publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { Mail, Phone } from "lucide-react";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
  StandardTable,
} from "../design-system";
import type { ColumnDef } from "../design-system";

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

  const permissions = {
    canCreate: true,
    canEdit: true,
    showKPIs: false,
    showOwnerFilter: true,
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users?department=Operations`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setUsers([]);
    }
  };

  const fetchClients = async (retryCount = 0) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);
      params.append("role", "Operations");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE_URL}/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setClients(result.success ? result.data : []);
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

  const isInitialMount = useRef(true);
  useEffect(() => {
    Promise.all([fetchClients(), fetchUsers()]);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      try {
        const response = await fetch(`${API_BASE_URL}/clients/${clientToDelete.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const result = await response.json();
        if (result.success) {
          toast.success(`Client "${clientToDelete.name || clientToDelete.company_name}" deleted successfully`);
          await fetchClients();
          setShowDeleteModal(false);
          setClientToDelete(null);
          return;
        } else {
          throw new Error(result.error);
        }
      } catch (fetchError: any) {
        if (fetchError.message === 'Failed to fetch' || fetchError.message.includes('fetch')) {
          const localClients = localStorage.getItem('neuron_clients');
          let clientsList: Client[] = [];
          if (localClients) {
            try { clientsList = JSON.parse(localClients); } catch (e) { clientsList = []; }
          }
          clientsList = clientsList.filter(c => c.id !== clientToDelete.id);
          localStorage.setItem('neuron_clients', JSON.stringify(clientsList));
          toast.success(`Client "${clientToDelete.name || clientToDelete.company_name}" deleted successfully (offline mode)`);
          setClients(clientsList);
          setShowDeleteModal(false);
          setClientToDelete(null);
          return;
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("[ClientsListWithFilters] Error deleting client:", error);
      toast.error(`Failed to delete client: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveClient = async (clientData: any) => {
    try {
      const { contacts, ...clientPayload } = clientData;
      try {
        const response = await fetch(`${API_BASE_URL}/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify(clientPayload),
        });
        const result = await response.json();
        if (result.success) {
          const newClientId = result.data.id;
          if (contacts && contacts.length > 0) {
            for (const contact of contacts) {
              const nameParts = contact.name.trim().split(' ');
              const first_name = nameParts[0];
              const last_name = nameParts.slice(1).join(' ');
              await fetch(`${API_BASE_URL}/contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
                body: JSON.stringify({ ...contact, first_name, last_name, client_id: newClientId, customer_id: newClientId }),
              });
            }
          }
          toast.success(`Client "${clientData.name}" created successfully`);
          await fetchClients();
          setIsAddClientOpen(false);
          return;
        } else {
          throw new Error(result.error);
        }
      } catch (fetchError: any) {
        if (fetchError.message === 'Failed to fetch' || fetchError.message.includes('fetch')) {
          const newClient: Client = {
            ...clientData as Client,
            id: clientData.id || `client-${Date.now()}`,
            created_at: clientData.created_at || new Date().toISOString(),
            updated_at: clientData.updated_at || new Date().toISOString(),
          };
          const localClients = localStorage.getItem('neuron_clients');
          let clientsList: Client[] = [];
          if (localClients) {
            try { clientsList = JSON.parse(localClients); } catch (e) { clientsList = []; }
          }
          clientsList.push(newClient);
          localStorage.setItem('neuron_clients', JSON.stringify(clientsList));
          toast.success(`Client "${clientData.name}" created successfully (offline mode)`);
          setClients(clientsList);
          setIsAddClientOpen(false);
          return;
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("[ClientsListWithFilters] Error creating client:", error);
      toast.error(`Failed to create client: ${error.message}`);
      throw error;
    }
  };

  const filteredClients = [...clients].sort((a, b) => {
    const nameA = (a.company_name || a.name || '').toLowerCase();
    const nameB = (b.company_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const getCompanyInitials = (companyName: string) => {
    if (!companyName) return '??';
    const words = companyName.split(' ');
    if (words.length >= 2) return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    return companyName.substring(0, 2).toUpperCase();
  };

  const getCompanyLogoColor = (companyName: string) => {
    if (!companyName) return '#0F766E';
    const colors = ['#0F766E', '#0F766E', '#0F766E', '#0D6B64', '#F59E0B', '#667085', '#EF4444'];
    return colors[companyName.charCodeAt(0) % colors.length];
  };

  // KPI calculations (dead code — showKPIs is always false)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === "Active").length;
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
  const activeClientsQuota = 50;
  const activeClientsProgress = (activeClients / activeClientsQuota) * 100;
  const activeClientsTrend = 8;
  const totalRevenue = 2450000;
  const revenueQuota = 3000000;
  const revenueProgress = (totalRevenue / revenueQuota) * 100;
  const revenueTrend = -5;
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "#0F766E";
    if (progress >= 60) return "#F59E0B";
    return "#EF4444";
  };
  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return "#E8F5F3";
    if (progress >= 60) return "#FEF3E7";
    return "#FFE5E5";
  };
  const formatCurrency = (amount: number) => `₱${(amount / 1000000).toFixed(2)}M`;

  const columns: ColumnDef<Client>[] = [
    {
      header: "",
      width: "48px",
      cell: (client) => {
        const logoColor = getCompanyLogoColor(client.name || client.company_name || '');
        return (
          <div
            style={{
              width: "40px", height: "40px", borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 600,
              backgroundColor: `${logoColor}15`, color: logoColor, flexShrink: 0,
            }}
          >
            {getCompanyInitials(client.name || client.company_name || '')}
          </div>
        );
      },
    },
    {
      header: "Company",
      cell: (client) => (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
          {client.name || client.company_name}
        </div>
      ),
    },
    {
      header: "Address",
      cell: (client) => {
        const address = client.address || (client as any).registered_address || "—";
        return (
          <div title={address} style={{ fontSize: "14px", color: "#0A1D4D", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {address}
          </div>
        );
      },
    },
    {
      header: "Contact Info",
      cell: (client) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#0A1D4D" }}>
            <Mail size={14} style={{ color: "#667085", flexShrink: 0 }} />
            <span style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(client as any).email || "—"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#0A1D4D" }}>
            <Phone size={14} style={{ color: "#667085", flexShrink: 0 }} />
            <span>{(client as any).phone || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (client) => <NeuronStatusPill status={client.status} />,
    },
    {
      header: "",
      width: "48px",
      cell: (client) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }} ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdownId(openDropdownId === client.id ? null : client.id);
            }}
            style={{
              width: "32px", height: "32px", borderRadius: "8px", border: "none",
              background: "transparent", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: "#667085",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-auto" style={{ background: "#FFFFFF" }}>
      <NeuronPageHeader
        title="Clients"
        subtitle="Manage client companies and business relationships"
        action={
          permissions.canCreate ? (
            <StandardButton
              variant="primary"
              icon={<Plus size={20} />}
              iconPosition="left"
              onClick={() => setIsAddClientOpen(true)}
            >
              Add Client
            </StandardButton>
          ) : undefined
        }
      />

      <div style={{ padding: "0 48px" }}>
        {/* KPI Section (dead code — showKPIs is always false) */}
        {permissions.showKPIs && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-5 rounded-xl" style={{ border: "1.5px solid var(--neuron-ui-border)", backgroundColor: "#FFFFFF" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <Building2 size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {newClientsTrend > 0 ? <ArrowUp size={14} style={{ color: "#0F766E" }} /> : <ArrowDown size={14} style={{ color: "#EF4444" }} />}
                  <span className="text-xs" style={{ color: newClientsTrend > 0 ? "#0F766E" : "#EF4444" }}>{Math.abs(newClientsTrend)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>New Clients Added</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{newClientsAdded}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {newClientsQuota}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(newClientsProgress) }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(newClientsProgress, 100)}%`, backgroundColor: getProgressColor(newClientsProgress) }} />
                </div>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ border: "1.5px solid var(--neuron-ui-border)", backgroundColor: "#FFFFFF" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <Target size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {prospectsTrend > 0 ? <ArrowUp size={14} style={{ color: "#0F766E" }} /> : <ArrowDown size={14} style={{ color: "#EF4444" }} />}
                  <span className="text-xs" style={{ color: prospectsTrend > 0 ? "#0F766E" : "#EF4444" }}>{Math.abs(prospectsTrend)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>Prospects Converted</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{prospectsConverted}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {prospectsQuota}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(prospectsProgress) }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(prospectsProgress, 100)}%`, backgroundColor: getProgressColor(prospectsProgress) }} />
                </div>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ border: "1.5px solid var(--neuron-ui-border)", backgroundColor: "#FFFFFF" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <Briefcase size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {activeClientsTrend > 0 ? <ArrowUp size={14} style={{ color: "#0F766E" }} /> : <ArrowDown size={14} style={{ color: "#EF4444" }} />}
                  <span className="text-xs" style={{ color: activeClientsTrend > 0 ? "#0F766E" : "#EF4444" }}>{Math.abs(activeClientsTrend)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>Active Clients</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{activeClients}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {activeClientsQuota}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(activeClientsProgress) }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(activeClientsProgress, 100)}%`, backgroundColor: getProgressColor(activeClientsProgress) }} />
                </div>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ border: "1.5px solid var(--neuron-ui-border)", backgroundColor: "#FFFFFF" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "#E8F5F3" }}>
                  <TrendingUp size={18} style={{ color: "#0F766E" }} />
                </div>
                <div className="flex items-center gap-1">
                  {revenueTrend > 0 ? <ArrowUp size={14} style={{ color: "#0F766E" }} /> : <ArrowDown size={14} style={{ color: "#EF4444" }} />}
                  <span className="text-xs" style={{ color: revenueTrend > 0 ? "#0F766E" : "#EF4444" }}>{Math.abs(revenueTrend)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neuron-ink-muted)" }}>Total Revenue (MTD)</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl" style={{ color: "var(--neuron-ink-primary)" }}>{formatCurrency(totalRevenue)}</span>
                  <span className="text-xs mb-1" style={{ color: "var(--neuron-ink-muted)" }}>/ {formatCurrency(revenueQuota)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getProgressBgColor(revenueProgress) }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(revenueProgress, 100)}%`, backgroundColor: getProgressColor(revenueProgress) }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <StandardSearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name, address, phone, or email..."
          />
        </div>
      </div>

      <div style={{ padding: "0 48px 48px 48px" }}>
        <StandardTable
          data={filteredClients}
          columns={columns}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          onRowClick={(c) => onViewClient(c)}
          emptyTitle={searchQuery ? "No clients found" : "No clients yet"}
          emptyDescription={searchQuery ? "Try adjusting your search query" : "Add your first client to get started"}
          emptyIcon={<Building2 size={24} />}
        />
      </div>

      <AddClientPanel
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSave={handleSaveClient}
      />

      {showDeleteModal && clientToDelete && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0, 0, 0, 0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 1000,
          }}
          onClick={() => { setShowDeleteModal(false); setClientToDelete(null); }}
        >
          <div
            style={{ background: "white", borderRadius: "12px", padding: "32px", width: "400px", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#0A1D4D", marginBottom: "16px" }}>
              Delete Client
            </h2>
            <p style={{ fontSize: "14px", color: "#667085", marginBottom: "24px" }}>
              Are you sure you want to delete the client "{clientToDelete?.name || clientToDelete?.company_name}"?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => { setShowDeleteModal(false); setClientToDelete(null); }}
                style={{
                  padding: "12px 20px", background: "transparent", border: "1px solid #E5E9F0",
                  borderRadius: "8px", color: "#667085", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={isDeleting}
                style={{
                  padding: "12px 20px", border: "none", borderRadius: "8px",
                  background: isDeleting ? "#F87171" : "#EF4444", color: "#FFFFFF",
                  fontSize: "14px", fontWeight: 600,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
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
