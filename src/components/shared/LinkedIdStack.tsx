import { useState, useRef, useEffect } from "react";

interface LinkedIdStackProps {
  /** Array of IDs/numbers to display */
  ids: string[];
  /** Optional label prefix shown in the tooltip/expanded view */
  label?: string;
  /** Color for the pill badges */
  accentColor?: string;
}

/**
 * LinkedIdStack - Displays one or more linked IDs in a compact stacked format.
 * - Single ID: Shows it inline
 * - Multiple IDs: Shows the first + a "+N" badge that expands on hover to show all
 * - No IDs: Shows an em dash
 */
export function LinkedIdStack({ ids, label, accentColor = "#0F766E" }: LinkedIdStackProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  if (!ids || ids.length === 0) {
    return (
      <span style={{ fontSize: "14px", color: "#9CA3AF" }}>{"\u2014"}</span>
    );
  }

  if (ids.length === 1) {
    return (
      <span
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: accentColor,
          backgroundColor: `${accentColor}10`,
          padding: "3px 10px",
          borderRadius: "6px",
          display: "inline-block",
        }}
      >
        {ids[0]}
      </span>
    );
  }

  // Multiple IDs - show first + stack badge
  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: accentColor,
          backgroundColor: `${accentColor}10`,
          padding: "3px 10px",
          borderRadius: "6px",
          display: "inline-block",
        }}
      >
        {ids[0]}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#FFFFFF",
          backgroundColor: accentColor,
          border: "none",
          borderRadius: "10px",
          padding: "2px 7px",
          cursor: "pointer",
          lineHeight: "16px",
          minWidth: "24px",
          textAlign: "center",
          transition: "transform 0.15s ease",
          transform: expanded ? "scale(1.1)" : "scale(1)",
        }}
        title={`${ids.length} linked ${label || "items"}`}
      >
        +{ids.length - 1}
      </button>

      {/* Expanded popover */}
      {expanded && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "10px 12px",
            zIndex: 50,
            minWidth: "180px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#667085",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "2px",
            }}
          >
            Linked {label || "Items"} ({ids.length})
          </div>
          {ids.map((id, i) => (
            <span
              key={`${id}-${i}`}
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: accentColor,
                backgroundColor: `${accentColor}10`,
                padding: "4px 10px",
                borderRadius: "6px",
                display: "inline-block",
              }}
            >
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
