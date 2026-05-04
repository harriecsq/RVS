import { useState } from "react";
import { X } from "lucide-react";

interface StatusTagPillProps {
  label: string;
  onRemove?: () => void;
  layer?: "shipment" | "operational";
  color?: "danger";
}

export function StatusTagPill({ label, onRemove, layer = "shipment", color }: StatusTagPillProps) {
  const [hovered, setHovered] = useState(false);

  const palette =
    color === "danger"
      ? { backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" }
      : layer === "shipment"
        ? { backgroundColor: "#E8F5F3", color: "#12332B", border: "1px solid #C1D9CC" }
        : { backgroundColor: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" };

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "8px 16px",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: 600,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
        transition: "all 0.12s ease",
        ...palette,
      }}
    >
      {label}
      {onRemove && hovered && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            padding: 0,
            display: "flex",
            alignItems: "center",
            opacity: 0.7,
            marginLeft: "2px",
          }}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

