import { useState, useRef } from "react";
import { MoreVertical, Download, FileText, Trash2 } from "lucide-react";
import { PortalDropdown } from "./PortalDropdown";

interface ActionsDropdownProps {
  onDownloadPDF?: () => void;
  onDownloadWord?: () => void;
  onDelete: () => void;
  showDownload?: boolean;
  compact?: boolean;
}

export function ActionsDropdown({
  onDownloadPDF,
  onDownloadWord,
  onDelete,
  showDownload = true,
  compact = false,
}: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? "6px" : "8px",
          padding: compact ? "6px 16px" : "10px 20px",
          height: compact ? "32px" : "40px",
          background: "white",
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          fontSize: compact ? "13px" : "14px",
          fontWeight: 600,
          color: "#0A1D4D",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F9FAFB";
          e.currentTarget.style.borderColor = "#D1D5DB";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.borderColor = "#E5E9F0";
        }}
      >
        <MoreVertical size={16} />
        Actions
      </button>

      <PortalDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        minWidth="200px"
        align="right"
      >
        <div style={{ padding: "8px 0" }}>
          {showDownload && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  color: "#344054",
                  fontWeight: 500,
                }}
              >
                <Download size={16} style={{ color: "#6B7280" }} />
                <span>Download</span>
              </div>

              <button
                onClick={() => { onDownloadPDF?.(); setIsOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px 10px 44px",
                  background: "transparent",
                  border: "none",
                  fontSize: "14px",
                  color: "#344054",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <FileText size={16} style={{ color: "#EF4444" }} />
                <span>PDF</span>
              </button>

              <button
                onClick={() => { onDownloadWord?.(); setIsOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px 10px 44px",
                  background: "transparent",
                  border: "none",
                  fontSize: "14px",
                  color: "#344054",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <FileText size={16} style={{ color: "#2563EB" }} />
                <span>Word</span>
              </button>

              <div style={{ height: "1px", background: "#E5E9F0", margin: "8px 0" }} />
            </>
          )}

          <button
            onClick={() => { onDelete(); setIsOpen(false); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              fontSize: "14px",
              color: "#EF4444",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </PortalDropdown>
    </div>
  );
}
