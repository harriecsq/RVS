import { useState } from "react";
import { ClientsListWithFilters } from "./ClientsListWithFilters";
import { ClientDetailView } from "./ClientDetailView";
import type { Client } from "../../types/operations";

type SubView = "list" | "detail";

interface ClientsModuleProps {
  onCreateRequest?: (client: Client) => void;
  onViewRequest?: (requestId: string) => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function ClientsModule({ currentUser }: ClientsModuleProps) {
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
      return <ClientDetailView client={selectedClient} onBack={handleBackFromClient} />;
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
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}