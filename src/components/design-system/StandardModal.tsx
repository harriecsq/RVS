import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
}

/**
 * StandardModal — canonical centered modal overlay.
 *
 * Portals to document.body, closes on Escape (and backdrop click unless disabled).
 * Header/footer are optional; body scrolls within a 90vh cap.
 */
export function StandardModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "560px",
  showClose = true,
  closeOnBackdrop = true,
}: StandardModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasHeader = Boolean(title) || showClose;

  return createPortal(
    <div
      onClick={() => closeOnBackdrop && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 29, 77, 0.15)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          width,
          maxWidth: "97vw",
          maxHeight: "90vh",
          borderRadius: "12px",
          border: "1px solid var(--neuron-ui-border)",
          boxShadow: "0 4px 24px rgba(18, 51, 43, 0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {hasHeader && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              padding: "20px 24px",
              borderBottom: "1px solid var(--neuron-ui-border)",
              flexShrink: 0,
            }}
          >
            <div>
              {title && (
                <div style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D" }}>{title}</div>
              )}
              {subtitle && (
                <div style={{ fontSize: "14px", color: "#667085", marginTop: "4px" }}>{subtitle}</div>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "none",
                  background: "transparent",
                  color: "#667085",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        <div style={{ flex: "1 1 0%", overflowY: "auto", padding: "24px" }}>{children}</div>

        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 24px",
              borderTop: "1px solid var(--neuron-ui-border)",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
