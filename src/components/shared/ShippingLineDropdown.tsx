import { useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { PortalDropdown } from "./PortalDropdown";
import { SHIPPING_LINE_OPTIONS } from "../../utils/truckingTags";

interface ShippingLineDropdownProps {
  value: string;
  onChange: (v: string) => void;
}

export function ShippingLineDropdown({ value, onChange }: ShippingLineDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? SHIPPING_LINE_OPTIONS.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : SHIPPING_LINE_OPTIONS;

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          border: "1px solid #E5E9F0",
          borderRadius: "6px",
          color: value ? "#0A1D4D" : "#9CA3AF",
          fontWeight: value ? 500 : 400,
          backgroundColor: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          outline: "none",
          minHeight: "40px",
          boxSizing: "border-box",
        }}
      >
        {value || "Select shipping line"}
        <ChevronDown size={16} color="#667085" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </div>

      <PortalDropdown isOpen={open} onClose={() => { setOpen(false); setSearch(""); }} triggerRef={triggerRef} align="left">
        <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} color="#9CA3AF" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shipping line..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "8px 12px 8px 30px",
                fontSize: "13px",
                border: "1px solid #E5E9F0",
                borderRadius: "6px",
                outline: "none",
                color: "#0A1D4D",
                backgroundColor: "#F9FAFB",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
            />
          </div>
        </div>

        {filtered.map((option, index) => (
          <div
            key={option}
            onClick={() => { onChange(option); setOpen(false); setSearch(""); }}
            style={{
              padding: "10px 14px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              color: "#0A1D4D",
              background: value === option ? "#E8F2EE" : "transparent",
              borderBottom: index < filtered.length - 1 ? "1px solid #E5E9F0" : "none",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { if (value !== option) e.currentTarget.style.background = "#F9FAFB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = value === option ? "#E8F2EE" : "transparent"; }}
          >
            {option}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>
            No results found
          </div>
        )}
      </PortalDropdown>
    </div>
  );
}
