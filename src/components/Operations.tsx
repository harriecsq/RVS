import { useState, useEffect } from "react";
import { ForwardingBookings } from "./operations/forwarding/ForwardingBookings";
import { ForwardingBookingDetails } from "./operations/forwarding/ForwardingBookingDetails";
import { BrokerageBookings } from "./operations/BrokerageBookings";
import { BrokerageBookingDetails } from "./operations/BrokerageBookingDetails";
import { ClientsModule } from "./operations/ClientsModule";
import type { ForwardingBooking, BrokerageBooking } from "../types/operations";
import type { Customer } from "../types/pricing";

export type OperationsView = "export" | "import" | "trucking" | "marine-insurance" | "others" | "reporting" | "inquiries" | "clients";
type SubView = "list" | "detail" | "builder";

interface OperationsProps {
  view?: OperationsView;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function Operations({ view = "export", currentUser }: OperationsProps) {
  const [subView, setSubView] = useState<SubView>("list");
  const [selectedForwardingBooking, setSelectedForwardingBooking] = useState<ForwardingBooking | null>(null);
  const [selectedBrokerageBooking, setSelectedBrokerageBooking] = useState<BrokerageBooking | null>(null);

  // Reset to list view when switching between main views
  useEffect(() => {
    setSubView("list");
    setSelectedForwardingBooking(null);
    setSelectedBrokerageBooking(null);
  }, [view]);

  const handleSelectForwardingBooking = (booking: ForwardingBooking) => {
    setSelectedForwardingBooking(booking);
    setSubView("detail");
  };

  const handleSelectBrokerageBooking = (booking: BrokerageBooking) => {
    setSelectedBrokerageBooking(booking);
    setSubView("detail");
  };

  const handleBackToList = () => {
    setSubView("list");
    setSelectedForwardingBooking(null);
    setSelectedBrokerageBooking(null);
  };

  const handleBookingUpdated = () => {
    // Just trigger a refresh, don't navigate away
    // The detail view should stay open for inline editing
    console.log("Booking updated - changes saved");
  };

  const handleCreateRequestFromCustomer = (customer: Customer) => {
    // Navigate to requests view and open builder
    // This would need to be handled by parent component routing
    console.log("Create request for customer:", customer);
  };

  // Render the appropriate service workstation
  const renderContent = () => {
    if (view === "export" || view === "forwarding") {
      if (subView === "detail" && selectedForwardingBooking) {
        return (
          <ForwardingBookingDetails
            booking={selectedForwardingBooking}
            onBack={handleBackToList}
            onBookingUpdated={handleBookingUpdated}
            currentUser={currentUser}
          />
        );
      }
      return (
        <ForwardingBookings
          onSelectBooking={handleSelectForwardingBooking}
          currentUser={currentUser}
        />
      );
    }

    if (view === "import" || view === "brokerage") {
      if (subView === "detail" && selectedBrokerageBooking) {
        return (
          <BrokerageBookingDetails
            booking={selectedBrokerageBooking}
            onBack={handleBackToList}
            onBookingUpdated={handleBookingUpdated}
            currentUser={currentUser}
          />
        );
      }
      return (
        <BrokerageBookings
          onSelectBooking={handleSelectBrokerageBooking}
          currentUser={currentUser}
        />
      );
    }

    if (view === "clients") {
      return (
        <ClientsModule
          onCreateRequest={handleCreateRequestFromCustomer}
          onViewRequest={(requestId) => console.log("View request:", requestId)}
          currentUser={currentUser}
        />
      );
    }

    // Placeholder for other services
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-[#12332B] mb-2">Coming Soon</h2>
          <p className="text-[#12332B]/60">
            {view.charAt(0).toUpperCase() + view.slice(1)} module is under development
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white">
      {renderContent()}
    </div>
  );
}