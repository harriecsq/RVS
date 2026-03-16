import { useEffect } from "react";
import { ForwardingBookingDetails } from "./forwarding/ForwardingBookingDetails";
import { BrokerageBookingDetails } from "./BrokerageBookingDetails";
import { TruckingBookingDetails } from "./TruckingBookingDetails";
import { OthersBookingDetails } from "./OthersBookingDetails";

interface BookingDetailPanelProps {
  booking: any;
  bookingType: "forwarding" | "brokerage" | "trucking" | "others";
  isOpen: boolean;
  onClose: () => void;
  onBookingUpdated?: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function BookingDetailPanel({ 
  booking,
  bookingType,
  isOpen, 
  onClose, 
  onBookingUpdated,
  currentUser
}: BookingDetailPanelProps) {
  // Handle ESC key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const handleBack = () => {
    onClose();
  };

  const handleUpdated = () => {
    console.log("✅ Booking updated, refreshing parent");
    if (onBookingUpdated) {
      onBookingUpdated();
    }
  };

  // Render the appropriate booking detail component based on type
  const renderBookingDetails = () => {
    const sharedProps = {
      booking,
      onBack: handleBack,
      onBookingUpdated: handleUpdated,
      currentUser
    };

    switch (bookingType) {
      case "forwarding":
        return <ForwardingBookingDetails {...sharedProps} />;
      case "brokerage":
        return <BrokerageBookingDetails {...sharedProps} />;
      case "trucking":
        return <TruckingBookingDetails {...sharedProps} />;
      case "others":
        return <OthersBookingDetails {...sharedProps} />;
      default:
        return <ForwardingBookingDetails {...sharedProps} />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black z-40 transition-opacity duration-200"
        onClick={onClose}
        style={{ 
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(18, 51, 43, 0.15)"
        }}
      />

      {/* Slide-out Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[920px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in"
        style={{
          borderLeft: "1px solid #E5E9F0",
        }}
      >
        {/* Booking detail screen fills the entire panel */}
        <div style={{ 
          height: "100%", 
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          {renderBookingDetails()}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}