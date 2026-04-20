import { LayoutGrid, FileText } from "lucide-react";

interface DocumentViewToggleProps {
  value: "form" | "pdf";
  onChange: (value: "form" | "pdf") => void;
}

export function DocumentViewToggle({ value, onChange }: DocumentViewToggleProps) {
  const isPdf = value === "pdf";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 24px",
        borderBottom: "1px solid #E5ECE9",
        background: "#FAFBFC",
      }}
    >
      {/* Segmented slider track */}
      <div
        style={{
          position: "relative",
          display: "inline-flex",
          background: "#E8F2EE",
          borderRadius: "8px",
          padding: "3px",
          gap: "0",
          cursor: "pointer",
        }}
      >
        {/* Sliding pill */}
        <div
          style={{
            position: "absolute",
            top: "3px",
            bottom: "3px",
            left: isPdf ? "50%" : "3px",
            width: "calc(50% - 3px)",
            background: "#0F766E",
            borderRadius: "6px",
            transition: "left 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
          }}
        />

        {/* Form View option */}
        <button
          onClick={() => onChange("form")}
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 16px",
            fontSize: "13px",
            fontWeight: 500,
            color: !isPdf ? "#FFFFFF" : "#237F66",
            background: "transparent",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "color 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            whiteSpace: "nowrap",
            minWidth: "110px",
            justifyContent: "center",
          }}
        >
          <LayoutGrid size={14} style={{ flexShrink: 0 }} />
          Form View
        </button>

        {/* PDF View option */}
        <button
          onClick={() => onChange("pdf")}
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 16px",
            fontSize: "13px",
            fontWeight: 500,
            color: isPdf ? "#FFFFFF" : "#237F66",
            background: "transparent",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "color 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            whiteSpace: "nowrap",
            minWidth: "110px",
            justifyContent: "center",
          }}
        >
          <FileText size={14} style={{ flexShrink: 0 }} />
          PDF View
        </button>
      </div>
    </div>
  );
}
