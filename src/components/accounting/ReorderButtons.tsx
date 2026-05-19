import { ChevronUp, ChevronDown } from "lucide-react";

interface ReorderButtonsProps {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  className?: string;
}

const BASE_COLOR = "#9CA3AF";
const HOVER_COLOR = "#0F766E";
const DISABLED_COLOR = "#E5E7EB";

export function ReorderButtons({ index, total, onMove, className = "" }: ReorderButtonsProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const buttonStyle = (disabled: boolean): React.CSSProperties => ({
    background: "transparent",
    border: "none",
    padding: "2px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? DISABLED_COLOR : BASE_COLOR,
    transition: "color 0.15s ease",
  });

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      <button
        type="button"
        onClick={() => !isFirst && onMove(-1)}
        disabled={isFirst}
        title="Move up"
        aria-label="Move row up"
        style={buttonStyle(isFirst)}
        onMouseEnter={(e) => { if (!isFirst) e.currentTarget.style.color = HOVER_COLOR; }}
        onMouseLeave={(e) => { if (!isFirst) e.currentTarget.style.color = BASE_COLOR; }}
      >
        <ChevronUp size={16} />
      </button>
      <button
        type="button"
        onClick={() => !isLast && onMove(1)}
        disabled={isLast}
        title="Move down"
        aria-label="Move row down"
        style={buttonStyle(isLast)}
        onMouseEnter={(e) => { if (!isLast) e.currentTarget.style.color = HOVER_COLOR; }}
        onMouseLeave={(e) => { if (!isLast) e.currentTarget.style.color = BASE_COLOR; }}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
