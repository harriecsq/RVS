import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { useDropdownPosition } from "../../hooks/useDropdownPortal";
import { PortalDropdown } from "./PortalDropdown";
import { POD_OPTIONS } from "../../utils/truckingTags";

const CUSTOM_POD_KEY = "neuron_custom_pod_options";

function loadCustomPodOptions(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_POD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveCustomPodOption(option: string) {
  const existing = loadCustomPodOptions();
  if (existing.some((o) => o.toLowerCase() === option.toLowerCase())) return;
  try {
    localStorage.setItem(CUSTOM_POD_KEY, JSON.stringify([...existing, option]));
  } catch {
    /* ignore quota errors */
  }
}

export function getAllPodOptions(): string[] {
  const custom = loadCustomPodOptions();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...POD_OPTIONS, ...custom]) {
    const key = v.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

interface PodDropdownProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PodDropdown({ value, onChange, placeholder = "Select POD", disabled = false }: PodDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<string[]>(() => getAllPodOptions());
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setOptions(getAllPodOptions());
  }, [open]);

  const trimmed = search.trim();
  const filtered = trimmed
    ? options.filter((o) => o.toLowerCase().includes(trimmed.toLowerCase()))
    : options;

  const canAdd =
    trimmed.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  const handleAdd = () => {
    if (!canAdd) return;
    const newOption = trimmed.toUpperCase();
    saveCustomPodOption(newOption);
    setOptions(getAllPodOptions());
    onChange(newOption);
    setSearch("");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!disabled) setOpen(!open); } }}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          color: value ? "#111827" : "#9CA3AF",
          fontWeight: value ? 500 : 400,
          backgroundColor: disabled ? "#F9FAFB" : "white",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          outline: "none",
          minHeight: "42px",
          boxSizing: "border-box",
        }}
      >
        {value || placeholder}
        <ChevronDown
          size={16}
          color="#667085"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </div>

      <PortalDropdown
        isOpen={open}
        onClose={() => { setOpen(false); setSearch(""); }}
        triggerRef={triggerRef}
        align="left"
      >
        <div
          style={{
            padding: "8px",
            borderBottom: "1px solid #E5E9F0",
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 1,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              color="#9CA3AF"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canAdd) { e.preventDefault(); handleAdd(); }
              }}
              placeholder="Search or add POD..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "8px 12px 8px 30px",
                fontSize: "13px",
                border: "1px solid #E5E9F0",
                borderRadius: "6px",
                outline: "none",
                color: "#111827",
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
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: value === option ? "#F0FDF4" : "transparent",
              borderBottom: index < filtered.length - 1 || canAdd ? "1px solid #E5E9F0" : "none",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { if (value !== option) e.currentTarget.style.background = "#F9FAFB"; }}
            onMouseLeave={(e) => { if (value !== option) e.currentTarget.style.background = "transparent"; }}
          >
            {option}
          </div>
        ))}

        {canAdd && (
          <div
            onClick={handleAdd}
            style={{
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              color: "#0F766E",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F0FDF4"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Plus size={14} />
            Add "{trimmed.toUpperCase()}"
          </div>
        )}

        {filtered.length === 0 && !canAdd && (
          <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>
            No results found
          </div>
        )}
      </PortalDropdown>
    </div>
  );
}
