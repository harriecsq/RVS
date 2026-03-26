import { useEffect } from "react";
import { ViewExpenseScreen } from "./ViewExpenseScreen";
import { PanelBackdrop } from "../shared/PanelBackdrop";

interface ExpenseDetailPanelProps {
  expenseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onExpenseDeleted?: () => void;
  onExpenseUpdated?: () => void;
}

export function ExpenseDetailPanel({ 
  expenseId, 
  isOpen, 
  onClose, 
  onExpenseDeleted,
  onExpenseUpdated 
}: ExpenseDetailPanelProps) {
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

  if (!isOpen || !expenseId) return null;

  const handleBack = () => {
    onClose();
  };

  const handleDeleted = () => {
    console.log("💥 Expense deleted, closing panel and refreshing parent");
    onClose();
    if (onExpenseDeleted) {
      onExpenseDeleted();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <PanelBackdrop onClick={onClose} />

      {/* Slide-out Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[920px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in"
        style={{
          borderLeft: "1px solid #E5E9F0",
        }}
      >
        {/* ViewExpenseScreen fills the entire panel */}
        <div style={{ 
          height: "100%", 
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          <ViewExpenseScreen 
            expenseId={expenseId}
            onBack={handleBack}
            onDeleted={handleDeleted}
          />
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
