import { X } from "lucide-react";
import { CreateExpenseScreen } from "./CreateExpenseScreen";

interface CreateExpensePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillBookingId?: string;
  prefillBookingNumber?: string;
  prefillProjectNumber?: string;
}

export function CreateExpensePanel({
  isOpen,
  onClose,
  onSuccess,
  prefillBookingId,
  prefillBookingNumber,
  prefillProjectNumber,
}: CreateExpensePanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "95vw",
          maxWidth: "1400px",
          backgroundColor: "#FFFFFF",
          zIndex: 1000,
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.3s ease-out",
          overflow: "hidden",
        }}
      >
        {/* Close Button - Positioned absolutely over content */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "32px",
            right: "48px",
            zIndex: 10,
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            border: "1px solid #E5E9F0",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#667085",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <X size={20} />
        </button>

        {/* Content - CreateExpenseScreen fills the panel */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <CreateExpenseScreen
            onBack={onClose}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
            prefillBookingId={prefillBookingId}
            prefillBookingNumber={prefillBookingNumber}
            hideHeader={false}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}