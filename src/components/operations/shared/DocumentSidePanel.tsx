import { useState, useEffect } from "react";
import { X, Clock, Edit3, Save } from "lucide-react";
import { PanelBackdrop } from "../../shared/PanelBackdrop";
import { StandardButton } from "../../design-system/StandardButton";
import { ActionsDropdown } from "../../shared/ActionsDropdown";
import { toast } from "../../ui/toast-utils";
import { DocumentViewToggle } from "../../shared/document-preview/DocumentViewToggle";
import { DocumentPreviewShell } from "../../shared/document-preview/DocumentPreviewShell";
import { DocumentSettingsPanel } from "../../shared/document-preview/DocumentSettingsPanel";
import type { DocumentSettings } from "../../../types/document-settings";
import { useDocumentSettings } from "../../../hooks/useDocumentSettings";
import type { DocumentEditState } from "./SalesContractTab";

interface DocumentSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  documentExists?: boolean;
  editState?: DocumentEditState | null;
  onDelete?: () => void;
  /** Render the PDF preview canvas. Receives current settings. */
  renderPdfPreview?: (settings: DocumentSettings) => React.ReactNode;
  /** Keys for per-document stamp/seal PNG upload slots shown in settings panel */
  stampSlots?: string[];
  /** Master template asset overrides — merged on top of global settings */
  overrideSettings?: Partial<DocumentSettings>;
}

export function DocumentSidePanel({
  isOpen,
  onClose,
  title,
  children,
  documentExists,
  editState,
  onDelete,
  renderPdfPreview,
  stampSlots,
  overrideSettings,
}: DocumentSidePanelProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [view, setView] = useState<"form" | "pdf">("form");
  const { settings: docSettings, updateSettings: setDocSettings } = useDocumentSettings();
  const effectiveSettings: DocumentSettings = overrideSettings
    ? { ...docSettings, ...overrideSettings }
    : docSettings;

  // Reset view to form when panel closes or switches doc
  useEffect(() => {
    if (!isOpen) setView("form");
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
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
  const isPdfView = view === "pdf";

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
          className="no-print"
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

          {/* Action buttons — hidden in PDF view */}
          {!isPdfView && (
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
                documentExists && (
                  <StandardButton
                    variant="secondary"
                    size="sm"
                    icon={<Edit3 size={14} />}
                    onClick={() => editState?.handleEdit()}
                  >
                    Edit
                  </StandardButton>
                )
              )}

              <ActionsDropdown
                onDownloadPDF={() => toast.success("PDF download starting...")}
                onDownloadWord={() => toast.success("Word download starting...")}
                onDelete={() => onDelete?.()}
                compact
              />
            </div>
          )}
        </div>

        {/* View toggle — shown only if PDF preview is available */}
        {renderPdfPreview && (
          <DocumentViewToggle value={view} onChange={setView} />
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* PDF view — only mounted when renderPdfPreview is available */}
          {renderPdfPreview && (
            <div style={{ flex: 1, overflow: "hidden", display: isPdfView ? "flex" : "none", flexDirection: "column" }}>
              <DocumentPreviewShell
                settings={stampSlots?.length === 0 ? null :
                  <DocumentSettingsPanel
                    settings={effectiveSettings}
                    onChange={setDocSettings}
                    stampSlots={stampSlots}
                  />
                }
              >
                {renderPdfPreview(effectiveSettings)}
              </DocumentPreviewShell>
            </div>
          )}

          {/* Form view — always mounted to preserve state */}
          <div style={{ flex: 1, overflow: "auto", display: isPdfView ? "none" : "flex" }}>
            <div
              style={{
                flex: showTimeline ? "0 0 calc(100% - 300px)" : "1",
                overflow: "auto",
                transition: "flex 0.3s ease",
              }}
            >
              {children}
            </div>

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
