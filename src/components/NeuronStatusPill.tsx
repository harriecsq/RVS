import { ReactNode } from "react";

type StatusVariant = "success" | "warning" | "danger" | "neutral" | "info" | "orange";

interface NeuronStatusPillProps {
  children?: ReactNode;
  /** Auto-maps to a variant and renders as text. */
  status?: string;
  /** Force a variant. */
  variant?: StatusVariant;
  /** Explicit text color override. Background is derived as a tint of this color. */
  color?: string;
  /** Map a status string to an explicit color (used by detail-screen dropdowns). */
  colorMap?: Record<string, string>;
  size?: "sm" | "md";
}

// Single source of truth — matches the colors used in the detail-screen
// HeaderStatusDropdown components (EXPENSE_STATUS_COLORS, BILLING_STATUS_COLORS, etc.)
const VARIANT_COLOR: Record<StatusVariant, string> = {
  success: "#10B981", // Paid / Collected / Completed / Delivered
  warning: "#F59E0B", // For Approval / Pending / In Transit
  danger: "#EF4444",  // Cancelled / Rejected / Inactive
  neutral: "#6B7280", // Draft
  info: "#3B82F6",    // Approved / Informational
  orange: "#F97316",  // Partially Paid / Partially Collected
};

const SIZE_STYLES = {
  sm: { height: "24px", padding: "0 8px", fontSize: "12px", lineHeight: "16px" },
  md: { height: "32px", padding: "0 12px", fontSize: "14px", lineHeight: "20px" },
} as const;

function getVariantFromStatus(statusStr: string): StatusVariant {
  const s = statusStr.toLowerCase();

  if (
    s === "completed" || s === "delivered" || s === "collected" ||
    s === "paid" || s === "active" ||
    s === "fully collected" || s === "fully paid" ||
    s.includes("accepted")
  ) return "success";

  if (s === "approved") return "info";

  if (s === "partially collected" || s === "partially paid") return "orange";

  if (
    s === "for approval" || s === "in transit" ||
    s === "on hold" || s.includes("pending") ||
    s === "sent to client" || s === "needs revision"
  ) return "warning";

  if (s === "cancelled" || s.includes("rejected") || s.includes("disapproved") || s === "inactive") return "danger";

  if (s === "draft") return "neutral";

  if (s === "converted to project" || s === "handed over" || s.includes("priced")) return "info";

  return "neutral";
}

function tint(color: string): string {
  // 12% color over white — soft tinted background that pairs with the text color.
  return `color-mix(in srgb, ${color} 12%, white)`;
}

export function NeuronStatusPill({
  children,
  status,
  variant,
  color,
  colorMap,
  size = "md",
}: NeuronStatusPillProps) {
  const resolvedColor =
    color ||
    (status && colorMap?.[status]) ||
    VARIANT_COLOR[variant ?? (status ? getVariantFromStatus(status) : "neutral")];

  const displayText = status || children;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--neuron-radius-l)",
        fontWeight: 500,
        whiteSpace: "nowrap",
        ...SIZE_STYLES[size],
        background: tint(resolvedColor),
        color: resolvedColor,
      }}
    >
      {displayText}
    </div>
  );
}
