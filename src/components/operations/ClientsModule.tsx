import { useState } from "react";
import { ClientsListWithFilters } from "./ClientsListWithFilters";
import type { Client } from "../../types/operations";

type SubView = "list" | "detail";

interface ClientsModuleProps {
  onCreateRequest?: (client: Client) => void;
  onViewRequest?: (requestId: string) => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function ClientsModule({ onCreateRequest, currentUser }: ClientsModuleProps) {
  const [subView, setSubView] = useState<SubView>("list");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setSubView("detail");
  };

  const handleBackFromClient = () => {
    setSelectedClient(null);
    setSubView("list");
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    if (subView === "detail" && selectedClient) {
      // TODO: Replace with an operations-owned ClientDetailView component
      return (
        <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <button onClick={handleBackFromClient} style={{ alignSelf: "flex-start", fontSize: "14px", color: "var(--neuron-brand-green)" }}>
            ← Back to Clients
          </button>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--neuron-ink-primary)" }}>{selectedClient.name}</div>
            {selectedClient.company_name && (
              <div style={{ fontSize: "14px", color: "var(--neuron-ink-muted)" }}>{selectedClient.company_name}</div>
            )}
          </div>
          <div style={{ fontSize: "13px", color: "var(--neuron-ink-secondary)" }}>
            Client detail view — to be implemented as an operations-owned component.
          </div>
          {onCreateRequest && (
            <button
              onClick={() => onCreateRequest(selectedClient)}
              style={{ alignSelf: "flex-start", padding: "8px 16px", fontSize: "13px", background: "var(--neuron-brand-green)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
            >
              Create Booking for this Client
            </button>
          )}
        </div>
      );
    }

    return (
      <ClientsListWithFilters
        key={refreshTrigger}
        onViewClient={handleViewClient}
      />
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "#FFFFFF" }}>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}