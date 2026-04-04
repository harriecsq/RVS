import { useState, useRef, useEffect } from "react";
import { MoreVertical, Download, FileText, Trash2 } from "lucide-react";

interface ActionsDropdownProps {
  onDownloadPDF?: () => void;
  onDownloadWord?: () => void;
  onDelete: () => void;
  showDownload?: boolean; // Control whether to show download options
  compact?: boolean; // Smaller button for tab row placement
}

export function ActionsDropdown({
  onDownloadPDF,
  onDownloadWord,
  onDelete,
  showDownload = true,
  compact = false
}: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Actions Button */}
      <button
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
          transition: "all 0.15s ease"
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            minWidth: "200px",
            zIndex: 1000,
            padding: "8px 0"
          }}
        >
          {/* Download Section */}
          {showDownload && (
            <>
              {/* Download Label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  color: "#344054",
                  fontWeight: 500
                }}
              >
                <Download size={16} style={{ color: "#6B7280" }} />
                <span>Download</span>
              </div>

              {/* PDF Option - Indented */}
              <button
                onClick={() => {
                  onDownloadPDF?.();
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px 10px 44px", // Extra left padding for indentation
                  background: "transparent",
                  border: "none",
                  fontSize: "14px",
                  color: "#344054",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <FileText size={16} style={{ color: "#EF4444" }} />
                <span>PDF</span>
              </button>

              {/* Word Option - Indented */}
              <button
                onClick={() => {
                  onDownloadWord?.();
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px 10px 44px", // Extra left padding for indentation
                  background: "transparent",
                  border: "none",
                  fontSize: "14px",
                  color: "#344054",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <FileText size={16} style={{ color: "#2563EB" }} />
                <span>Word</span>
              </button>

              {/* Divider */}
              <div
                style={{
                  height: "1px",
                  background: "#E5E9F0",
                  margin: "8px 0"
                }}
              />
            </>
          )}

          {/* Delete Option */}
          <button
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
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
              transition: "background 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FEF2F2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}