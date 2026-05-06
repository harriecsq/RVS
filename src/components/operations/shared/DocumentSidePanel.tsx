import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Clock, Edit3, Save } from "lucide-react";
import { StandardButton } from "../../design-system/StandardButton";
import { ActionsDropdown } from "../../shared/ActionsDropdown";
import { toast } from "../../ui/toast-utils";
import { DocumentViewToggle } from "../../shared/document-preview/DocumentViewToggle";
import { DocumentPreviewShell } from "../../shared/document-preview/DocumentPreviewShell";
import { DocumentSettingsPanel } from "../../shared/document-preview/DocumentSettingsPanel";
import type { DocumentSettings } from "../../../types/document-settings";
import type { DocumentEditState } from "./SalesContractTab";
import type { DocPngSettings } from "../../../types/export-documents";

interface DocumentSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  documentExists?: boolean;
  editState?: DocumentEditState | null;
  onDelete?: () => void;
  renderPdfPreview?: (settings: DocumentSettings) => React.ReactNode;
  stampSlots?: string[];
  overrideSettings?: Partial<DocumentSettings>;
  showShippingLineLetterhead?: boolean;
  hideSupplierLetterhead?: boolean;
  supplierLetterheadLabel?: string;
  useGalleryLetterhead?: boolean;
  landscape?: boolean;
  showPreviewRail?: boolean;
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
  showShippingLineLetterhead,
  hideSupplierLetterhead,
  supplierLetterheadLabel,
  useGalleryLetterhead,
  landscape,
  showPreviewRail = true,
}: DocumentSidePanelProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [view, setView] = useState<"form" | "pdf">("form");

  // Settings come solely from the active doc tab's editState — that field carries
  // the saved doc.settings (view mode) or the in-flight editData.settings (edit mode).
  // Per-doc semantics: nothing leaks across documents. Master template PNGs are seeded
  // into editData.settings at Create time by each tab, so no override fallback is needed.
  const tabSettings: DocPngSettings | undefined = editState?.settings;
  const effectiveSettings: DocumentSettings = useMemo(() => ({
    signatories: {},
    display: { showBankDetails: true, showTerms: true, showFooter: true },
    ...(overrideSettings || {}),
    logoPng: tabSettings?.logoPng ?? overrideSettings?.logoPng,
    shippingLinePng: tabSettings?.shippingLinePng ?? overrideSettings?.shippingLinePng,
    stamps: {
      ...(overrideSettings?.stamps || {}),
      ...(tabSettings?.stamps || {}),
    },
  } as DocumentSettings), [overrideSettings, tabSettings?.logoPng, tabSettings?.shippingLinePng, tabSettings?.stamps]);

  // Settings panel writes route to the active tab's editData via editState.
  // Available only while the tab is in edit/create mode; otherwise no-op.
  const handleSettingsChange = useCallback((patch: Partial<DocumentSettings>) => {
    if (!editState?.handleSettingsChange) return;
    const docPngPatch: Partial<DocPngSettings> = {};
    if ("logoPng" in patch) docPngPatch.logoPng = patch.logoPng;
    if ("shippingLinePng" in patch) docPngPatch.shippingLinePng = patch.shippingLinePng;
    if (patch.stamps) {
      docPngPatch.stamps = Object.fromEntries(
        Object.entries(patch.stamps).map(([k, v]) => [k, { pngData: v?.pngData }])
      );
    }
    editState.handleSettingsChange(docPngPatch);
  }, [editState]);

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
  const showSettingsPanel =
    showPreviewRail &&
    (
      !hideSupplierLetterhead ||
      !!showShippingLineLetterhead ||
      !!stampSlots?.length
    );

  return (
    <>
      {/* Lightweight backdrop — no backdrop-filter blur, which is GPU-expensive
          when the side panel re-paints, scrolls, or animates. */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          backgroundColor: "rgba(10, 29, 77, 0.25)",
        }}
      />
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
          willChange: "transform",
          transform: "translateZ(0)",
          contain: "layout paint",
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
              onDownloadPDF={() => window.print()}
              onDownloadWord={() => toast.success("Word download starting...")}
              onDelete={() => onDelete?.()}
              compact
            />
          </div>
        </div>

        {/* View toggle — shown only if PDF preview is available */}
        {renderPdfPreview && (
          <DocumentViewToggle value={view} onChange={setView} />
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {renderPdfPreview && isPdfView && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <DocumentPreviewShell
                landscape={landscape}
                settings={showSettingsPanel ? (
                  <DocumentSettingsPanel
                    settings={effectiveSettings}
                    onChange={handleSettingsChange}
                    stampSlots={stampSlots}
                    showShippingLineLetterhead={showShippingLineLetterhead}
                    hideSupplierLetterhead={hideSupplierLetterhead}
                    supplierLetterheadLabel={supplierLetterheadLabel}
                    useGalleryLetterhead={useGalleryLetterhead}
                    readOnly={!isEditing}
                  />
                ) : undefined}
              >
                {renderPdfPreview(effectiveSettings)}
              </DocumentPreviewShell>
            </div>
          )}

          <div style={{ flex: 1, overflow: "auto", display: isPdfView ? "none" : "flex", contain: "layout paint" }}>
            <div
              style={{
                flex: showTimeline ? "0 0 calc(100% - 300px)" : "1",
                overflow: "auto",
                transition: "flex 0.3s ease",
                contain: "layout paint",
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
