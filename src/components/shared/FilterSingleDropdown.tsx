import { useState, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { PortalDropdown } from "./PortalDropdown";

interface Option {
  value: string;
  label: string;
}

interface FilterSingleDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  align?: "left" | "right";
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function FilterSingleDropdown({
  value,
  options,
  onChange,
  placeholder = "Select...",
  label,
  align = "left",
  disabled = false,
  style,
}: FilterSingleDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      {label && (
        <label style={{ fontSize: "14px", fontWeight: 500, color: "#344054" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <div
          ref={triggerRef}
          onClick={() => !disabled && setOpen(!open)}
          style={{
            width: "100%",
            height: "40px",
            padding: "0 12px",
            borderRadius: "8px",
            border: "1px solid #E5E9F0",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: disabled ? "not-allowed" : "pointer",
            color: disabled ? "#9CA3AF" : "#12332B",
            backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
            gap: "8px",
            opacity: disabled ? 0.7 : 1,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {selectedLabel}
          </span>
          <ChevronDown
            size={16}
            style={{
              color: "#9CA3AF",
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          />
        </div>

        <PortalDropdown isOpen={open && !disabled} onClose={() => setOpen(false)} triggerRef={triggerRef} align={align}>
          {options.map((opt, idx) => {
            const selected = value === opt.value;
            const isLast = idx === options.length - 1;
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#12332B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: selected ? "#E8F2EE" : "transparent",
                  borderBottom: isLast ? "none" : "1px solid #E5E9F0",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "#F3F4F6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selected ? "#E8F2EE" : "transparent";
                }}
              >
                {opt.label}
                {selected && <Check size={14} style={{ color: "#237F66", flexShrink: 0 }} />}
              </div>
            );
          })}
        </PortalDropdown>
      </div>
    </div>
  );
}
