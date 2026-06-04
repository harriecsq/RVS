import React from "react";
import { ArrowLeft, X } from "lucide-react";
import { PanelBackdrop } from "../shared/PanelBackdrop";

type PanelWidth = "sm" | "md" | "lg" | "full";

interface StandardSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: PanelWidth;
  closeIcon?: "arrow" | "x";
  showHeader?: boolean;
}

const WIDTHS: Record<PanelWidth, React.CSSProperties> = {
  sm: { width: "680px" },
  md: { width: "800px" },
  lg: { width: "920px" },
  full: { width: "95vw", maxWidth: "1400px" },
};

/**
 * StandardSidePanel — canonical right slide-in panel shell.
 *
 * Serves both shapes:
 *  - Form panels: showHeader (title + close) + scrollable body + optional sticky footer.
 *  - Detail panels: showHeader={false} renders bare children (child screen fills the panel).
 *
 * Backdrop via shared PanelBackdrop; slide-in via the global .animate-slide-in class.
 */
export function StandardSidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md",
  closeIcon = "arrow",
  showHeader = true,
}: StandardSidePanelProps) {
  if (!isOpen) return null;

  const CloseIcon = closeIcon === "arrow" ? ArrowLeft : X;

  return (
    <>
      <PanelBackdrop onClick={onClose} />
      <div
        className="animate-slide-in"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          ...WIDTHS[width],
          maxWidth: WIDTHS[width].maxWidth ?? "95vw",
          background: "#FFFFFF",
          borderLeft: "1px solid var(--neuron-ui-border)",
          boxShadow: "-4px 0 24px rgba(18, 51, 43, 0.12)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {showHeader && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "32px 40px",
              borderBottom: "1px solid var(--neuron-ui-border)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={onClose}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#0A1D4D",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <CloseIcon size={20} />
            </button>
            <div style={{ minWidth: 0 }}>
              {title && (
                <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>
                  {title}
                </h2>
              )}
              {subtitle && <p style={{ fontSize: "14px", color: "#667085" }}>{subtitle}</p>}
            </div>
          </div>
        )}

        <div style={{ flex: "1 1 0%", overflow: "auto" }}>{children}</div>

        {footer && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 40px",
              borderTop: "1px solid var(--neuron-ui-border)",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
