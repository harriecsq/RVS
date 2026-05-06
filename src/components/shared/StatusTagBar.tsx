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
import { NeuronDatePicker } from "../operations/shared/NeuronDatePicker";

interface ShipmentTagsChangeOpts {
  /** ISO timestamp; only meaningful when `delivered` is in the new tags. Pass null to clear. */
  deliveredAt?: string | null;
}

interface StatusTagBarProps {
  bookingType: BookingType;
  shipmentTags: string[];
  operationalTags: string[];
  onShipmentTagsChange: (tags: string[], opts?: ShipmentTagsChangeOpts) => void;
  onOperationalTagsChange: (tags: string[]) => void;
  shipmentTagsReadOnly?: boolean;
  disabled?: boolean;
  /** ISO timestamp of the captured delivery date (when the `delivered` tag is on). */
  deliveredAt?: string | null;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return toDateInputValue(null);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateInputToIso(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString();
}

function formatDeliveredDateShort(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function StatusTagBar({
  bookingType,
  shipmentTags,
  operationalTags,
  onShipmentTagsChange,
  onOperationalTagsChange,
  shipmentTagsReadOnly = false,
  disabled = false,
  deliveredAt = null,
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

  const [deliveryDialog, setDeliveryDialog] = useState<{
    mode: "add" | "edit";
    dateValue: string;
  } | null>(null);

  // Optimistic override so the inline date appears the instant the user confirms,
  // before the server roundtrip syncs the parent's `deliveredAt` prop.
  const [optimisticDeliveredAt, setOptimisticDeliveredAt] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setOptimisticDeliveredAt(undefined);
  }, [deliveredAt]);
  const effectiveDeliveredAt = optimisticDeliveredAt !== undefined ? optimisticDeliveredAt : deliveredAt;

  const openDeliveryDialog = useCallback(
    (mode: "add" | "edit") => {
      setDeliveryDialog({
        mode,
        dateValue: toDateInputValue(mode === "edit" ? effectiveDeliveredAt : null),
      });
    },
    [effectiveDeliveredAt],
  );

  const closeDeliveryDialog = useCallback(() => setDeliveryDialog(null), []);

  const confirmDeliveryDialog = useCallback(() => {
    setDeliveryDialog((prev) => {
      if (!prev || !/^\d{4}-\d{2}-\d{2}$/.test(prev.dateValue)) return prev;
      const iso = dateInputToIso(prev.dateValue);
      setOptimisticDeliveredAt(iso);
      if (prev.mode === "add") {
        const next = shipmentTags.includes("delivered")
          ? shipmentTags
          : [...shipmentTags, "delivered"];
        onShipmentTagsChange(next, { deliveredAt: iso });
      } else {
        onShipmentTagsChange(shipmentTags, { deliveredAt: iso });
      }
      return null;
    });
  }, [onShipmentTagsChange, shipmentTags]);

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
        color: tag?.color,
      };
    });
    const operational = operationalTags.map((key) => {
      const tag = getTagByKey(key);
      return {
        key,
        label: tag?.label || key,
        group: tag?.group || "operations",
        layer: "operational" as const,
        color: tag?.color,
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
      if (key === "delivered") {
        const isAdding = !shipmentTags.includes("delivered");
        if (isAdding) {
          openDeliveryDialog("add");
          return;
        }
        onShipmentTagsChange(
          shipmentTags.filter((value) => value !== "delivered"),
          { deliveredAt: null },
        );
        return;
      }
      onShipmentTagsChange(
        shipmentTags.includes(key)
          ? shipmentTags.filter((value) => value !== key)
          : [...shipmentTags, key],
      );
    },
    [disabled, onShipmentTagsChange, openDeliveryDialog, shipmentTags, shipmentTagsReadOnly],
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

        {pills.map((pill) => {
          const isDeliveredShipment = pill.layer === "shipment" && pill.key === "delivered";
          const deliveredSuffix = isDeliveredShipment ? formatDeliveredDateShort(effectiveDeliveredAt) : undefined;
          const canEditDelivered = isDeliveredShipment && !shipmentTagsReadOnly && !disabled;
          return (
            <StatusTagPill
              key={`${pill.layer}:${pill.key}`}
              label={pill.label}
              layer={pill.layer}
              color={pill.color}
              suffix={deliveredSuffix}
              onClick={canEditDelivered ? () => openDeliveryDialog("edit") : undefined}
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
          );
        })}

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
                        color: tag.color,
                        onClick: () => {
                          if (tag.key === "delivered" && !shipmentTags.includes("delivered")) {
                            setOpen(false);
                            setSearch("");
                          }
                          toggleShipment(tag.key);
                        },
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

      {deliveryDialog &&
        createPortal(
          <DeliveryDateModal
            mode={deliveryDialog.mode}
            value={deliveryDialog.dateValue}
            onChange={(v) =>
              setDeliveryDialog((prev) => (prev ? { ...prev, dateValue: v } : prev))
            }
            onCancel={closeDeliveryDialog}
            onConfirm={confirmDeliveryDialog}
          />,
          document.body,
        )}
    </>
  );
}

interface DeliveryDateModalProps {
  mode: "add" | "edit";
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeliveryDateModal({
  mode,
  value,
  onChange,
  onCancel,
  onConfirm,
}: DeliveryDateModalProps) {
  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key === "Enter" && isValid) onConfirm();
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [onCancel, onConfirm, isValid]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "add" ? "Mark as delivered" : "Edit delivery date"}
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(10, 29, 77, 0.32)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          background: "#FFFFFF",
          border: "1px solid #E5E9F0",
          borderRadius: 12,
          boxShadow: "0 20px 48px rgba(10,29,77,0.24)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 4px" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0A1D4D", marginBottom: 4 }}>
            {mode === "add" ? "Mark as Delivered" : "Edit Delivery Date"}
          </div>
          <div style={{ fontSize: 13, color: "#667085" }}>
            {mode === "add"
              ? "When was this shipment actually delivered? You can backdate if it was delivered earlier."
              : "Update the recorded delivery date for this shipment."}
          </div>
        </div>

        <div style={{ padding: "16px 24px 8px" }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "#344054",
              marginBottom: 6,
            }}
          >
            Actual delivery date <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <NeuronDatePicker value={value} onChange={onChange} />
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E5E9F0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #E5E9F0",
              background: "#FFFFFF",
              color: "#344054",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isValid}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${isValid ? "#0F766E" : "#D1D5DB"}`,
              background: isValid ? "#0F766E" : "#E5E7EB",
              color: isValid ? "#FFFFFF" : "#9CA3AF",
              fontSize: 14,
              fontWeight: 600,
              cursor: isValid ? "pointer" : "not-allowed",
            }}
          >
            {mode === "add" ? "Confirm" : "Save"}
          </button>
        </div>
      </div>
    </div>
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
    color?: "danger";
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
      {tags.map((tag) => {
        const isDanger = tag.color === "danger";
        const activeColor = isDanger ? "#DC2626" : "#0F766E";
        const activeBg = isDanger ? "#FEF2F2" : "#F0FAF8";
        return (
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
              backgroundColor: tag.active ? activeBg : "transparent",
              opacity: tag.disabled ? 0.6 : 1,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                flexShrink: 0,
                border: `1.5px solid ${tag.active ? activeColor : "#D1D5DB"}`,
                backgroundColor: tag.active ? activeColor : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {tag.active && <Check size={10} color="white" />}
            </div>
            {tag.label}
          </div>
        );
      })}
    </div>
  );
}

