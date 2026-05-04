import { useState, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { PortalDropdown } from "./PortalDropdown";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectPortalDropdownProps {
  value: string[];
  options: Option[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  align?: "left" | "right";
}

export function MultiSelectPortalDropdown({
  value,
  options,
  onChange,
  placeholder = "All",
  label,
  align = "left",
}: MultiSelectPortalDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? value[0]
      : value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label style={{ fontSize: "14px", fontWeight: 500, color: "#344054" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <div
          ref={triggerRef}
          onMouseDown={(e) => { e.preventDefault(); setOpen(!open); }}
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
            cursor: "pointer",
            color: value.length > 0 ? "#12332B" : "#9CA3AF",
            backgroundColor: "#FFFFFF",
            gap: "8px",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {triggerLabel}
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

        <PortalDropdown isOpen={open} onClose={() => setOpen(false)} triggerRef={triggerRef} align={align}>
          {options.map((opt, idx) => {
            const selected = value.includes(opt.value);
            const isLast = idx === options.length - 1;
            return (
              <div
                key={opt.value}
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); toggle(opt.value); }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#12332B",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
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
                {/* Checkbox */}
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    border: selected ? "none" : "1.5px solid #D0D5DD",
                    backgroundColor: selected ? "#237F66" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {selected && <Check size={10} style={{ color: "white", strokeWidth: 3 }} />}
                </div>
                {opt.label}
              </div>
            );
          })}
        </PortalDropdown>
      </div>
    </div>
  );
}
