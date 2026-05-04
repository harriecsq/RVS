import { useState, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { PortalDropdown } from "./PortalDropdown";
import type { ComboEntry, ComboKey } from "../../utils/statusTags";
import { formatCombinationLabel } from "../../utils/statusTags";
import { getTagByKey } from "../../utils/statusTags";

interface CombinationTagFilterProps {
  combos: ComboEntry[];
  selectedKeys: ComboKey[];
  onChange: (keys: ComboKey[]) => void;
  placeholder?: string;
}

function MiniTagPill({ tagKey }: { tagKey: string }) {
  const tag = getTagByKey(tagKey);
  const label = tag?.label ?? tagKey;
  const isDanger = tag?.color === "danger";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "1px 7px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.03em",
      whiteSpace: "nowrap",
      backgroundColor: isDanger ? "#FEE2E2" : "#E8F5F3",
      color: isDanger ? "#991B1B" : "#12332B",
      border: isDanger ? "1px solid #FECACA" : "1px solid #C1D9CC",
    }}>
      {label}
    </span>
  );
}

export function CombinationTagFilter({
  combos,
  selectedKeys,
  onChange,
  placeholder = "Filter by tag combination",
}: CombinationTagFilterProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const toggle = (key: ComboKey) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]); // append preserves pick order
    }
  };

  const triggerLabel =
    selectedKeys.length === 0
      ? placeholder
      : selectedKeys.length === 1
      ? (() => {
          const combo = combos.find((c) => c.key === selectedKeys[0]);
          return combo ? formatCombinationLabel(combo.tags) : selectedKeys[0];
        })()
      : `${selectedKeys.length} combinations`;

  const disabled = combos.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ position: "relative" }}>
        <div
          ref={triggerRef}
          onClick={() => { if (!disabled) setOpen(!open); }}
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
            color: selectedKeys.length > 0 ? "#12332B" : "#9CA3AF",
            backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
            gap: "8px",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: "13px" }}>
            {disabled ? "No tag combinations in current view" : triggerLabel}
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

        <PortalDropdown isOpen={open} onClose={() => setOpen(false)} triggerRef={triggerRef} align="left">
          {combos.map((combo, idx) => {
            const selected = selectedKeys.includes(combo.key);
            const isLast = idx === combos.length - 1;
            const isNoTags = combo.key === "(no tags)";
            return (
              <div
                key={combo.key}
                onClick={() => toggle(combo.key)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: selected ? "#E8F2EE" : "transparent",
                  borderBottom: isLast ? "none" : "1px solid #E5E9F0",
                  userSelect: "none",
                  minWidth: "240px",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "#F3F4F6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selected ? "#E8F2EE" : "transparent";
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  border: selected ? "none" : "1.5px solid #D0D5DD",
                  backgroundColor: selected ? "#237F66" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {selected && <Check size={10} style={{ color: "white", strokeWidth: 3 }} />}
                </div>

                {/* Combo pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", flex: 1 }}>
                  {isNoTags ? (
                    <span style={{ fontSize: "13px", color: "#9CA3AF", fontStyle: "italic" }}>(No tags)</span>
                  ) : (
                    combo.tags.map((t) => <MiniTagPill key={t} tagKey={t} />)
                  )}
                </div>

                {/* Count badge */}
                <span style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6B7A76",
                  backgroundColor: "#F3F4F6",
                  borderRadius: "10px",
                  padding: "1px 7px",
                  flexShrink: 0,
                }}>
                  {combo.count}
                </span>
              </div>
            );
          })}
        </PortalDropdown>
      </div>
    </div>
  );
}
