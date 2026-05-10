import { useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
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
  searchable?: boolean;
  searchPlaceholder?: string;
  preserveCase?: boolean;
}

export function MultiSelectPortalDropdown({
  value,
  options,
  onChange,
  placeholder = "All",
  label,
  align = "left",
  searchable = false,
  searchPlaceholder = "Search...",
  preserveCase = false,
}: MultiSelectPortalDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? value[0]
      : value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search, searchable]);

  const closeDropdown = () => { setOpen(false); setSearch(""); };

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
          onMouseDown={(e) => { e.preventDefault(); open ? closeDropdown() : setOpen(true); }}
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
            textTransform: preserveCase ? "none" : (value.length > 0 ? "uppercase" : "none"),
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

        <PortalDropdown isOpen={open} onClose={closeDropdown} triggerRef={triggerRef} align={align}>
          {searchable && (
            <div
              style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", background: "#FFFFFF", position: "sticky", top: 0, zIndex: 1 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  style={{ width: "100%", padding: "6px 8px 6px 28px", border: "1px solid #E5E9F0", borderRadius: "6px", fontSize: "13px", outline: "none", color: "#0A1D4D", backgroundColor: "#F9FAFB", boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}
          {searchable && filteredOptions.length === 0 && (
            <div style={{ padding: "16px 12px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No results</div>
          )}
          {filteredOptions.map((opt, idx) => {
            const selected = value.includes(opt.value);
            const isLast = idx === filteredOptions.length - 1;
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
                  textTransform: preserveCase ? "none" : "uppercase",
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
