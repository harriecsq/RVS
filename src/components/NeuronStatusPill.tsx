import { ReactNode } from "react";

type StatusVariant = "success" | "warning" | "danger" | "neutral" | "info" | "orange";

interface NeuronStatusPillProps {
  children?: ReactNode;
  status?: string; // For auto-mapping from status strings
  variant?: StatusVariant;
  size?: "sm" | "md";
}

export function NeuronStatusPill({ children, status, variant, size = "md" }: NeuronStatusPillProps) {
  // Auto-map status strings to variants
  const getVariantFromStatus = (statusStr: string): StatusVariant => {
    const statusLower = statusStr.toLowerCase();
    
    // SUCCESS (Green) - Completed/Final positive states
    if (statusLower === "completed" || statusLower === "delivered" || 
        statusLower === "collected" || 
        statusLower === "paid" || statusLower === "active" ||
        statusLower === "fully collected" || statusLower === "fully paid" ||
        statusLower.includes("accepted")) {
      return "success";
    }
    
    // INFO (Blue) - Approved states (for vouchers, expenses, billings)
    if (statusLower === "approved") {
      return "info";
    }

    // ORANGE (Orange) - Partially collected/paid
    if (statusLower === "partially collected" || statusLower === "partially paid") {
      return "orange";
    }
    
    // WARNING (Orange/Amber) - In-progress or needs attention
    if (statusLower === "for approval" || statusLower === "in transit" ||
        statusLower === "on hold" || statusLower.includes("pending") ||
        statusLower === "sent to client" || statusLower === "needs revision") {
      return "warning";
    }
    
    // DANGER (Red) - Rejected/Cancelled states
    if (statusLower === "cancelled" || statusLower.includes("rejected") || 
        statusLower.includes("disapproved")) {
      return "danger";
    }
    
    // DANGER (Red) - Inactive status
    if (statusLower === "inactive") {
      return "danger";
    }

    // NEUTRAL (Gray) - Draft/Initial states
    if (statusLower === "draft") {
      return "neutral";
    }
    
    // INFO (Teal/Blue) - Other informational states
    if (statusLower === "converted to project" || statusLower === "handed over" ||
        statusLower.includes("priced")) {
      return "info";
    }
    
    return "neutral";
  };
  
  const effectiveVariant = status ? getVariantFromStatus(status) : (variant || "neutral");
  const displayText = status || children;

  const variantStyles = {
    success: {
      background: "var(--neuron-brand-green-100)",
      color: "var(--neuron-semantic-success)",
    },
    warning: {
      background: "#FFF4E6",
      color: "var(--neuron-semantic-warn)",
    },
    danger: {
      background: "#FFEBE9",
      color: "var(--neuron-semantic-danger)",
    },
    neutral: {
      background: "var(--neuron-state-selected)",
      color: "var(--neuron-ink-secondary)",
    },
    info: {
      background: "#DBEAFE",
      color: "#3B82F6",
    },
    orange: {
      background: "#FFEDD5", // Orange 100
      color: "#EA580C", // Orange 600
    },
  };

  const sizeStyles = {
    sm: {
      height: "24px",
      padding: "0 8px",
      fontSize: "12px",
      lineHeight: "16px",
    },
    md: {
      height: "32px",
      padding: "0 12px",
      fontSize: "14px",
      lineHeight: "20px",
    },
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--neuron-radius-l)",
        fontWeight: 500,
        whiteSpace: "nowrap",
        ...sizeStyles[size],
        ...variantStyles[effectiveVariant],
      }}
    >
      {displayText}
    </div>
  );
}