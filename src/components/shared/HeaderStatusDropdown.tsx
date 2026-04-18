import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { useDropdownPosition } from "../../hooks/useDropdownPortal";

interface HeaderStatusDropdownProps {
  currentStatus: string;
  /** Override the label shown on the button (e.g. "In Transit - Drop 1 of 3") */
  displayLabel?: string;
  statusOptions: readonly string[] | string[];
  statusColorMap: Record<string, string>;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

export function HeaderStatusDropdown({
  currentStatus,
  displayLabel,
  statusOptions,
  statusColorMap,
  onStatusChange,
  disabled,
}: HeaderStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownPos = useDropdownPosition(triggerRef, open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const statusColor = statusColorMap[currentStatus] || "#6B7280";

  if (disabled) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 16px",
          border: `1.5px solid ${open ? "#0F766E" : "#E5E9F0"}`,
          borderRadius: "8px",
          background: open ? "#F9FAFB" : "white",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          color: statusColor,
          whiteSpace: "nowrap",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#D1D5DB";
            e.currentTarget.style.background = "#F9FAFB";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#E5E9F0";
            e.currentTarget.style.background = "white";
          }
        }}
      >
        {displayLabel || currentStatus}
        <ChevronDown
          size={14}
          style={{
            color: "#6B7A76",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      {open && createPortal(
        <div
          style={{
            position: "fixed",
            top: dropdownPos.top,
            bottom: dropdownPos.bottom,
            left: dropdownPos.left + dropdownPos.width - 200,
            background: "white",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
            zIndex: 9999,
            minWidth: "200px",
            maxHeight: dropdownPos.maxHeight,
            overflow: "hidden",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {statusOptions.map((status) => {
            const isSelected = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => {
                  onStatusChange(status);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  background: isSelected ? "#F0FDF4" : "transparent",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: isSelected ? 600 : 500,
                  color: statusColorMap[status] || "#6B7280",
                  textAlign: "left",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{status}</span>
                {isSelected && <Check size={14} style={{ color: "#10B981", flexShrink: 0, marginLeft: "12px" }} />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
