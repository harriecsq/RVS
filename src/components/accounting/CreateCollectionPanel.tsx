import { useRef } from "react";
import { CreateCollectionScreen } from "./CreateCollectionScreen";
import { PanelBackdrop } from "../shared/PanelBackdrop";

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

  if (!isOpen) return null;

  return (
    <>
      <PanelBackdrop onClick={onClose} />

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
