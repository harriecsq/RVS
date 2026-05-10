import { useEffect } from "react";
import { NeuronDatePicker } from "../operations/shared/NeuronDatePicker";

interface StatusDateDialogProps {
  title: string;
  description: string;
  label: string;
  confirmLabel?: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function StatusDateDialog({
  title,
  description,
  label,
  confirmLabel = "Confirm",
  value,
  onChange,
  onCancel,
  onConfirm,
}: StatusDateDialogProps) {
  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key === "Enter" && isValid) onConfirm();
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [onCancel, onConfirm, isValid]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(10, 29, 77, 0.32)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          background: "#FFFFFF",
          border: "1px solid #E5E9F0",
          borderRadius: 12,
          boxShadow: "0 20px 48px rgba(10,29,77,0.24)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 4px" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0A1D4D", marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: "#667085" }}>{description}</div>
        </div>

        <div style={{ padding: "16px 24px 8px" }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "#344054",
              marginBottom: 6,
            }}
          >
            {label} <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <NeuronDatePicker value={value} onChange={onChange} />
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E5E9F0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #E5E9F0",
              background: "#FFFFFF",
              color: "#344054",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isValid}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${isValid ? "#0F766E" : "#D1D5DB"}`,
              background: isValid ? "#0F766E" : "#E5E7EB",
              color: isValid ? "#FFFFFF" : "#9CA3AF",
              fontSize: 14,
              fontWeight: 600,
              cursor: isValid ? "pointer" : "not-allowed",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return toDateInputValue(null);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateInputToIso(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString();
}
