import React, { useState, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { PortalDropdown } from "./PortalDropdown";

interface HeaderStatusDropdownProps {
  currentStatus: string;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const statusColor = statusColorMap[currentStatus] || "#6B7280";

  if (disabled) return null;

  return (
    <div style={{ position: "relative" }}>
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

      <PortalDropdown
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        minWidth="200px"
        align="right"
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
      </PortalDropdown>
    </div>
  );
}
