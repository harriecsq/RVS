import { Plus, X, ChevronLeft } from "lucide-react";
import type { BookingSegment } from "../../../types/operations";

interface SegmentSelectorProps {
  segments: BookingSegment[];
  activeSegmentId: string;
  onSegmentChange: (segmentId: string) => void;
  onAddSegment: () => void;
  onDeleteSegment?: (segmentId: string) => void;
  isEditing?: boolean;
}

export function SegmentSelector({
  segments,
  activeSegmentId,
  onSegmentChange,
  onAddSegment,
  onDeleteSegment,
  isEditing,
}: SegmentSelectorProps) {
  const sorted = [...segments].sort((a, b) => (a.legOrder || 0) - (b.legOrder || 0));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 48px",
        background: "#F4F7F6",
        borderBottom: "1px solid #E5ECE9",
        flexWrap: "wrap",
      }}
    >
      {sorted.map((seg, idx) => {
        const isActive = seg.segmentId === activeSegmentId;
        const route = [seg.origin, seg.destination].filter(Boolean).join(" → ");
        return (
          <div key={seg.segmentId} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {idx > 0 && (
              <ChevronLeft size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
            )}
            <button
              onClick={() => onSegmentChange(seg.segmentId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                border: isActive ? "1.5px solid #0F766E" : "1px solid #D1D5DB",
                background: isActive ? "#E8F2EE" : "#FFFFFF",
                color: isActive ? "#0F766E" : "#374151",
                fontWeight: isActive ? 600 : 500,
                fontSize: "12.5px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <span>{seg.segmentLabel}</span>
              {route && (
                <span style={{ fontSize: "11px", color: isActive ? "#0F766E" : "#9CA3AF", fontWeight: 400 }}>
                  ({route})
                </span>
              )}
              {isEditing && segments.length > 1 && onDeleteSegment && (
                <X
                  size={13}
                  style={{ color: "#9CA3AF", cursor: "pointer", marginLeft: "2px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSegment(seg.segmentId);
                  }}
                />
              )}
            </button>
          </div>
        );
      })}

      <button
        onClick={onAddSegment}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px dashed #9CA3AF",
          background: "transparent",
          color: "#6B7280",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#0F766E";
          e.currentTarget.style.color = "#0F766E";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#9CA3AF";
          e.currentTarget.style.color = "#6B7280";
        }}
      >
        <Plus size={13} />
        Add Province
      </button>
    </div>
  );
}
