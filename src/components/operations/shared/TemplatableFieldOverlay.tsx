import { useTemplateSave } from "./TemplateSaveContext";
import { Check, X } from "lucide-react";

interface TemplatableFieldOverlayProps {
  /** The field key that maps to the document data key */
  fieldKey: string;
  children: React.ReactNode;
}

/**
 * Wraps a field display (FieldView) with an interactive overlay
 * when template-save mode is active. Shows green/red border + icon
 * indicating included/excluded. Click to toggle.
 */
export function TemplatableFieldOverlay({ fieldKey, children }: TemplatableFieldOverlayProps) {
  const { active, isFieldSelected, isTemplatable, toggleField } = useTemplateSave();

  // If template-save mode is not active, render children normally
  if (!active) return <>{children}</>;

  const templatable = isTemplatable(fieldKey);

  // If this field is not templatable (booking-specific or empty), show dimmed
  if (!templatable) {
    return (
      <div style={{ position: "relative", opacity: 0.4, pointerEvents: "none" }}>
        {children}
      </div>
    );
  }

  const selected = isFieldSelected(fieldKey);

  return (
    <div
      onClick={() => toggleField(fieldKey)}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: "8px",
        border: `2px solid ${selected ? "#22C55E" : "#EF4444"}`,
        padding: "2px",
        transition: "all 0.15s ease",
        backgroundColor: selected ? "rgba(34, 197, 94, 0.04)" : "rgba(239, 68, 68, 0.04)",
      }}
    >
      {/* Status badge */}
      <div style={{
        position: "absolute",
        top: "-8px",
        right: "-8px",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        backgroundColor: selected ? "#22C55E" : "#EF4444",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}>
        {selected ? (
          <Check size={12} style={{ color: "#FFFFFF" }} />
        ) : (
          <X size={12} style={{ color: "#FFFFFF" }} />
        )}
      </div>

      {/* The actual field content */}
      <div style={{ pointerEvents: "none" }}>
        {children}
      </div>
    </div>
  );
}
