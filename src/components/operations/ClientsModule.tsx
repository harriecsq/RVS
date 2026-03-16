import { useState } from "react";
import { ClientsListWithFilters } from "./ClientsListWithFilters";
import { CustomerDetail } from "../bd/CustomerDetail";
import type { Customer } from "../../types/bd";

type SubView = "list" | "detail";

interface ClientsModuleProps {
  onCreateRequest?: (customer: Customer) => void;
  onViewRequest?: (requestId: string) => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function ClientsModule({ onCreateRequest, onViewRequest, currentUser }: ClientsModuleProps) {
  const [subView, setSubView] = useState<SubView>("list");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSubView("detail");
  };

  const handleBackFromCustomer = () => {
    setSelectedCustomer(null);
    setSubView("list");
    // Trigger refresh of the list
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    if (subView === "detail" && selectedCustomer) {
      return (
        <CustomerDetail 
          customer={selectedCustomer} 
          onBack={handleBackFromCustomer}
          onCreateRequest={() => {
            if (onCreateRequest) {
              onCreateRequest(selectedCustomer);
            }
          }}
          onViewRequest={onViewRequest}
        />
      );
    }
    
    return (
      <ClientsListWithFilters 
        key={refreshTrigger}
        onViewClient={handleViewCustomer} 
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