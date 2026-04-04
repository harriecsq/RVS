import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface HeaderStatusDropdownProps {
  currentStatus: string;
  statusOptions: readonly string[] | string[];
  statusColorMap: Record<string, string>;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

export function HeaderStatusDropdown({
  currentStatus,
  statusOptions,
  statusColorMap,
  onStatusChange,
  disabled,
}: HeaderStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        {currentStatus}
        <ChevronDown
          size={14}
          style={{
            color: "#6B7A76",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "white",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
            zIndex: 1000,
            minWidth: "200px",
            overflow: "hidden",
          }}
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
        </div>
      )}
    </div>
  );
}
