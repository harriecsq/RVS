import { useCallback, useRef } from "react";
import { CreateCollectionScreen } from "./CreateCollectionScreen";

interface CreateCollectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedBillingId?: string;
}

export function CreateCollectionPanel({
  isOpen,
  onClose,
  onSuccess,
  preSelectedBillingId,
}: CreateCollectionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Safe backdrop click — only close if the click target is the backdrop itself
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the actual target is the backdrop div (not a portaled element on top)
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — uses onMouseDown on currentTarget only to avoid portal conflicts */}
      <div
        className="fixed inset-0 bg-black/40 z-[999]"
        onMouseDown={handleBackdropMouseDown}
      />

      {/* Slide-out Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-[95vw] max-w-[800px] bg-white shadow-2xl z-[1000] flex flex-col"
        style={{ animation: "slideInRight 0.3s ease-out" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <CreateCollectionScreen
          onBack={onClose}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
          preSelectedBillingId={preSelectedBillingId}
        />
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
