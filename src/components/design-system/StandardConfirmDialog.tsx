import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { StandardButton } from "./StandardButton";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";

interface StandardConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  confirmIcon?: React.ReactNode;
  loading?: boolean;
}

/**
 * StandardConfirmDialog — canonical "are you sure?" confirmation overlay.
 *
 * Portals to document.body, closes on Escape or backdrop click.
 * Replaces the hand-rolled delete-confirmation overlays scattered across screens.
 */
export function StandardConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  confirmIcon,
  loading = false,
}: StandardConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 29, 77, 0.15)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          width: "480px",
          maxWidth: "90vw",
          padding: "32px",
          borderRadius: "12px",
          border: "1px solid var(--neuron-ui-border)",
          boxShadow: "0 4px 24px rgba(18, 51, 43, 0.12)",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#0A1D4D", marginBottom: "12px" }}>
          {title}
        </h2>
        <div style={{ fontSize: "14px", color: "#667085", lineHeight: "1.5", marginBottom: "24px" }}>
          {message}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <StandardButton variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </StandardButton>
          <StandardButton
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
            icon={confirmIcon}
          >
            {confirmLabel}
          </StandardButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
