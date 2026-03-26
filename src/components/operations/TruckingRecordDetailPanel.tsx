import { useEffect } from "react";
import { TruckingRecordDetails } from "./TruckingRecordDetails";
import type { TruckingRecord } from "./CreateTruckingModal";
import { PanelBackdrop } from "../shared/PanelBackdrop";

interface TruckingRecordDetailPanelProps {
  record: TruckingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function TruckingRecordDetailPanel({ 
  record,
  isOpen, 
  onClose, 
  onUpdate,
  currentUser
}: TruckingRecordDetailPanelProps) {
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

  if (!isOpen || !record) return null;

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
        <div style={{ 
          height: "100%", 
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          <TruckingRecordDetails 
            record={record}
            onBack={onClose}
            onUpdate={onUpdate || (() => {})}
            currentUser={currentUser}
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
