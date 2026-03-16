import { X } from "lucide-react";
import { CreateExpenseScreen } from "./CreateExpenseScreen";

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectNumber?: string;
  bookingNumber?: string;
}

export function CreateExpenseModal({
  isOpen,
  onClose,
  projectId,
  projectNumber,
  bookingNumber,
}: CreateExpenseModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(18, 51, 43, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "1200px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #E5E9F0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #E5E9F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#12332B", marginBottom: "4px" }}>
              Create Expense
            </h2>
            <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
              Record a new expense and link it to a project booking
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              color: "#667085",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F9FAFB";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Expense Screen Content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <CreateExpenseScreen
            onBack={onClose}
            onSuccess={onClose}
            prefillProjectNumber={projectNumber}
            prefillBookingNumber={bookingNumber}
            hideHeader={true}
          />
        </div>
      </div>
    </div>
  );
}