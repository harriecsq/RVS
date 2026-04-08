import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus } from "lucide-react";
import {
  TAG_GROUPS,
  getOperationalTags,
  getShipmentTags,
  getTagByKey,
  type BookingType,
} from "../../utils/statusTags";
import { StatusTagPill } from "./StatusTagPill";

interface StatusTagBarProps {
  bookingType: BookingType;
  shipmentTags: string[];
  operationalTags: string[];
  onShipmentTagsChange: (tags: string[]) => void;
  onOperationalTagsChange: (tags: string[]) => void;
  shipmentTagsReadOnly?: boolean;
  disabled?: boolean;
}

export function StatusTagBar({
  bookingType,
  shipmentTags,
  operationalTags,
  onShipmentTagsChange,
  onOperationalTagsChange,
  shipmentTagsReadOnly = false,
  disabled = false,
}: StatusTagBarProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  const availableShipmentTags = useMemo(() => getShipmentTags(bookingType), [bookingType]);
  const availableOperationalTags = useMemo(
    () => getOperationalTags(bookingType),
    [bookingType],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredShipmentTags = useMemo(
    () =>
      availableShipmentTags.filter(
        (tag) => !normalizedSearch || tag.label.toLowerCase().includes(normalizedSearch),
      ),
    [availableShipmentTags, normalizedSearch],
  );
  const filteredOperationalTags = useMemo(
    () =>
      availableOperationalTags.filter(
        (tag) => !normalizedSearch || tag.label.toLowerCase().includes(normalizedSearch),
      ),
    [availableOperationalTags, normalizedSearch],
  );

  const pills = useMemo(() => {
    const shipment = shipmentTags.map((key) => {
      const tag = getTagByKey(key);
      return {
        key,
        label: tag?.label || key,
        group: tag?.group || "operations",
        layer: "shipment" as const,
      };
    });
    const operational = operationalTags.map((key) => {
      const tag = getTagByKey(key);
      return {
        key,
        label: tag?.label || key,
        group: tag?.group || "operations",
        layer: "operational" as const,
      };
    });
    const groupOrder = new Map(TAG_GROUPS.map((g, index) => [g.id, index]));
    return [...shipment, ...operational].sort(
      (a, b) => (groupOrder.get(a.group as any) ?? 99) - (groupOrder.get(b.group as any) ?? 99),
    );
  }, [operationalTags, shipmentTags]);

  const toggleShipment = useCallback(
    (key: string) => {
      if (shipmentTagsReadOnly || disabled) return;
      onShipmentTagsChange(
        shipmentTags.includes(key)
          ? shipmentTags.filter((value) => value !== key)
          : [...shipmentTags, key],
      );
    },
    [disabled, onShipmentTagsChange, shipmentTags, shipmentTagsReadOnly],
  );

  const toggleOperational = useCallback(
    (key: string) => {
      if (disabled) return;
      onOperationalTagsChange(
        operationalTags.includes(key)
          ? operationalTags.filter((value) => value !== key)
          : [...operationalTags, key],
      );
    },
    [disabled, onOperationalTagsChange, operationalTags],
  );

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownMaxHeight = 360;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 6;
    const spaceAbove = rect.top - 6;

    // If not enough space below, flip above the trigger
    const top =
      spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow
        ? rect.top - Math.min(dropdownMaxHeight, spaceAbove) - 6
        : rect.bottom + 6;

    const width = Math.max(rect.width, 340);
    const viewportWidth = window.innerWidth;
    // Clamp left so dropdown doesn't overflow the right edge
    const left = Math.min(rect.left, viewportWidth - width - 12);

    setPos({
      top,
      left: Math.max(12, left),
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const handler = () => reposition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (
        triggerRef.current?.contains(event.target as Node) ||
        dropdownRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasShipmentSection = filteredShipmentTags.length > 0;
  const hasOperationalSection = filteredOperationalTags.length > 0;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        {pills.length === 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "#E8F5F3",
              color: "#12332B",
              border: "1px solid #C1D9CC",
              letterSpacing: "0.03em",
            }}
          >
            —
          </span>
        )}

        {pills.map((pill) => (
          <StatusTagPill
            key={`${pill.layer}:${pill.key}`}
            label={pill.label}
            layer={pill.layer}
            onRemove={
              pill.layer === "shipment"
                ? shipmentTagsReadOnly || disabled
                  ? undefined
                  : () => toggleShipment(pill.key)
                : disabled
                  ? undefined
                  : () => toggleOperational(pill.key)
            }
          />
        ))}

        {!disabled && (hasShipmentSection || hasOperationalSection) && (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (open) {
                setOpen(false);
                setSearch("");
              } else {
                setOpen(true);
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "8px 16px",
              borderRadius: "10px",
              border: "1px dashed #C1D9CC",
              background: "rgba(255,255,255,0.7)",
              color: "#0F766E",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={12} />
            Add
          </button>
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: Math.min(360, window.innerHeight - 20),
              background: "white",
              borderRadius: "8px",
              border: "1px solid #E5E9F0",
              boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
              zIndex: 99999,
              overflowY: "auto",
            }}
          >
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5E9F0" }}>
              <input
                autoFocus
                type="text"
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #E5E9F0",
                  fontSize: "14px",
                  color: "#0A1D4D",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {hasShipmentSection && (
              <>
                <SectionHeader
                  title="Shipment Status"
                  subtitle="Synced with linked booking/trucking"
                />
                {TAG_GROUPS.map((group) => {
                  const tags = filteredShipmentTags.filter((tag) => tag.group === group.id);
                  if (!tags.length) return null;
                  return (
                    <GroupedItems
                      key={`shipment-${group.id}`}
                      title={group.label}
                      tags={tags.map((tag) => ({
                        key: tag.key,
                        label: tag.label,
                        active: shipmentTags.includes(tag.key),
                        disabled: shipmentTagsReadOnly,
                        onClick: () => toggleShipment(tag.key),
                      }))}
                    />
                  );
                })}
              </>
            )}

            {hasShipmentSection && hasOperationalSection && (
              <div style={{ borderTop: "1px solid #E5E9F0", margin: "4px 0" }} />
            )}

            {hasOperationalSection && (
              <>
                <SectionHeader title="Operational" subtitle="Local to this record" />
                {TAG_GROUPS.map((group) => {
                  const tags = filteredOperationalTags.filter((tag) => tag.group === group.id);
                  if (!tags.length) return null;
                  return (
                    <GroupedItems
                      key={`operational-${group.id}`}
                      title={group.label}
                      tags={tags.map((tag) => ({
                        key: tag.key,
                        label: tag.label,
                        active: operationalTags.includes(tag.key),
                        disabled: false,
                        onClick: () => toggleOperational(tag.key),
                      }))}
                    />
                  );
                })}
              </>
            )}

            {!hasShipmentSection && !hasOperationalSection && (
              <div style={{ padding: "12px 16px", fontSize: "13px", color: "#9CA3AF" }}>
                No matching tags
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #F3F4F6" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          color: "#6B7280",
          letterSpacing: "0.07em",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{subtitle}</div>
    </div>
  );
}

function GroupedItems({
  title,
  tags,
}: {
  title: string;
  tags: Array<{
    key: string;
    label: string;
    active: boolean;
    disabled: boolean;
    onClick: () => void;
  }>;
}) {
  return (
    <div>
      <div
        style={{
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          color: "#9CA3AF",
          letterSpacing: "0.07em",
        }}
      >
        {title}
      </div>
      {tags.map((tag) => (
        <div
          key={tag.key}
          onClick={(event) => {
            event.stopPropagation();
            if (tag.disabled) return;
            tag.onClick();
          }}
          style={{
            padding: "8px 16px",
            cursor: tag.disabled ? "not-allowed" : "pointer",
            fontSize: "14px",
            color: tag.disabled ? "#9CA3AF" : "#0A1D4D",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: tag.active ? "#F0FAF8" : "transparent",
            opacity: tag.disabled ? 0.6 : 1,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              flexShrink: 0,
              border: `1.5px solid ${tag.active ? "#0F766E" : "#D1D5DB"}`,
              backgroundColor: tag.active ? "#0F766E" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {tag.active && <Check size={10} color="white" />}
          </div>
          {tag.label}
        </div>
      ))}
    </div>
  );
}

