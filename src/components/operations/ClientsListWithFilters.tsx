import { useState, useEffect, useRef } from "react";
import { Plus, Building2, Users } from "lucide-react";
import type { Client, Industry, ClientStatus } from "../../types/operations";
import { AddClientPanel } from "./AddClientPanel";
import { publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { NeuronStatusPill } from "../NeuronStatusPill";
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

  const permissions = {
    canCreate: true,
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
      header: "Email",
      align: "right",
      cell: (client) => (
        <div style={{ fontSize: "14px", color: "#0A1D4D", textAlign: "right", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginLeft: "auto" }}>
          {(client as any).email || "—"}
        </div>
      ),
    },
    {
      header: "Phone",
      align: "right",
      cell: (client) => (
        <div style={{ fontSize: "14px", color: "#0A1D4D", textAlign: "right" }}>
          {(client as any).phone || "—"}
        </div>
      ),
    },
    {
      header: "Clients",
      align: "right",
      cell: (client) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", fontSize: "14px", color: "#0A1D4D" }}>
          <Users size={14} style={{ color: "#667085", flexShrink: 0 }} />
          <span>{(client as any).contacts?.length || 0}</span>
        </div>
      ),
    },
    {
      header: "Status",
      align: "right",
      cell: (client) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <NeuronStatusPill status={client.status} />
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-auto" style={{ background: "#FFFFFF" }}>
      <NeuronPageHeader
        title="Client Companies"
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
    </div>
  );
}
