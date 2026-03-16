import { useEffect } from "react";
import { ViewCollectionScreen } from "./ViewCollectionScreen";

interface CollectionDetailPanelProps {
  collection: any | null;
  isOpen: boolean;
  onClose: () => void;
  onCollectionDeleted?: () => void;
  onCollectionUpdated?: () => void;
}

export function CollectionDetailPanel({ 
  collection, 
  isOpen, 
  onClose, 
  onCollectionDeleted,
  onCollectionUpdated 
}: CollectionDetailPanelProps) {
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

  if (!isOpen || !collection) return null;

  const handleBack = () => {
    onClose();
  };

  const handleDeleted = () => {
    console.log("💥 Collection deleted, closing panel and refreshing parent");
    onClose();
    if (onCollectionDeleted) {
      onCollectionDeleted();
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
        {/* ViewCollectionScreen fills the entire panel */}
        <div style={{ 
          height: "100%", 
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          <ViewCollectionScreen 
            collection={collection}
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
