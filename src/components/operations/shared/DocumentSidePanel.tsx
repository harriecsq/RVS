import { useState, useEffect } from "react";
import { X, Clock, Edit3, Save } from "lucide-react";
import { PanelBackdrop } from "../../shared/PanelBackdrop";
import { StandardButton } from "../../design-system/StandardButton";
import { ActionsDropdown } from "../../shared/ActionsDropdown";
import { toast } from "../../ui/toast-utils";
import type { DocumentEditState } from "./SalesContractTab";

interface DocumentSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Whether the document has been created (controls Edit button visibility) */
  documentExists?: boolean;
  /** Edit state reported by the active document tab */
  editState?: DocumentEditState | null;
  /** Called when user deletes via Actions dropdown */
  onDelete?: () => void;
}

export function DocumentSidePanel({
  isOpen,
  onClose,
  title,
  children,
  documentExists,
  editState,
  onDelete,
}: DocumentSidePanelProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const isEditing = editState?.isEditing ?? false;
  const isSaving = editState?.isSaving ?? false;

  return (
    <>
      <PanelBackdrop onClick={onClose} zIndex={40} />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "95vw",
          maxWidth: "1200px",
          backgroundColor: "#FFFFFF",
          zIndex: 50,
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #E5E9F0",
          animation: "docPanelSlideIn 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 32px",
            borderBottom: "1px solid #E5E9F0",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                background: "#FFFFFF",
                cursor: "pointer",
                color: "#6B7A76",
              }}
            >
              <X size={16} />
            </button>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#12332B" }}>
              {title}
            </h2>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <StandardButton
              variant={showTimeline ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
              icon={<Clock size={14} />}
            >
              Activity
            </StandardButton>

            {isEditing ? (
              <>
                <StandardButton
                  variant="secondary"
                  size="sm"
                  icon={<X size={14} />}
                  onClick={() => editState?.handleCancel()}
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  size="sm"
                  icon={<Save size={14} />}
                  onClick={() => editState?.handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </StandardButton>
              </>
            ) : (
              <>
                {documentExists && (
                  <StandardButton
                    variant="secondary"
                    size="sm"
                    icon={<Edit3 size={14} />}
                    onClick={() => editState?.handleEdit()}
                  >
                    Edit
                  </StandardButton>
                )}
              </>
            )}

            <ActionsDropdown
              onDownloadPDF={() => toast.success("PDF download starting...")}
              onDownloadWord={() => toast.success("Word download starting...")}
              onDelete={() => onDelete?.()}
              compact
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", display: "flex" }}>
          <div style={{
            flex: showTimeline ? "0 0 calc(100% - 300px)" : "1",
            overflow: "auto",
            transition: "flex 0.3s ease",
          }}>
            {children}
          </div>

          {/* Activity Timeline sidebar */}
          {showTimeline && (
            <div
              style={{
                flex: "0 0 300px",
                borderLeft: "1px solid #E5E9F0",
                overflow: "auto",
                backgroundColor: "#FAFBFC",
                padding: "24px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E", marginBottom: "16px", margin: "0 0 16px" }}>
                Activity Timeline
              </h3>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", color: "#9CA3AF", fontSize: "13px" }}>
                No activity recorded yet
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes docPanelSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
