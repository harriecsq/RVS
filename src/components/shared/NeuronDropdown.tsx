import { useState, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { PortalDropdown } from "./PortalDropdown";

interface NeuronDropdownProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}

export function NeuronDropdown({ value, options, onChange, placeholder = "Select..." }: NeuronDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px",
          border: "1px solid #E5E9F0", fontSize: "14px", display: "flex",
          alignItems: "center", justifyContent: "space-between", cursor: "pointer",
          color: value ? "#12332B" : "#9CA3AF", backgroundColor: "#FFFFFF",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder}</span>
        <ChevronDown size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </div>

      <PortalDropdown isOpen={open} onClose={() => setOpen(false)} triggerRef={triggerRef} align="left">
        {options.map((opt) => (
          <div
            key={opt}
            onClick={() => { onChange(opt); setOpen(false); }}
            style={{
              padding: "10px 12px", cursor: "pointer", fontSize: "14px", color: "#12332B",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              backgroundColor: value === opt ? "#E8F2EE" : "transparent",
            }}
            onMouseEnter={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = value === opt ? "#E8F2EE" : "transparent"; }}
          >
            {opt}
            {value === opt && <Check size={14} style={{ color: "#237F66" }} />}
          </div>
        ))}
      </PortalDropdown>
    </div>
  );
}
