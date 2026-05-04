/**
 * NeuronTimePicker — Reusable time input with scrollable hour/minute/AM-PM popup.
 *
 * Design:
 *  - Text input displays time as "HH:MM AM/PM" (12-hour), supports manual typing
 *  - Clock icon on the right toggles a time picker popup
 *  - Popup: three scrollable columns (Hour 1–12, Minute 00–55, AM/PM)
 *  - Selected values: teal (#0F766E) filled bg with white text
 *  - Footer: "Clear" link (left), "Now" button (right, teal solid)
 *  - Neuron design system: #0A1D4D text, #0F766E accent, stroke borders
 *
 * Value format: "HH:mm" 24-hour string (e.g. "14:30"), same as <input type="time">.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NeuronTimePickerProps {
  value: string;               // "HH:mm" 24-hour or ""
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0,1,2,...,59

/** Convert 24h "HH:mm" → { hour12, minute, period } */
function parse24(val: string): { hour12: number; minute: number; period: "AM" | "PM" } | null {
  if (!val) return null;
  const [hStr, mStr] = val.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, period };
}

/** Convert { hour12, minute, period } → "HH:mm" 24-hour */
function to24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h24 = hour12 % 12;
  if (period === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Format "HH:mm" 24h → "h:mm AM/PM" display string */
function formatDisplay(val: string): string {
  const parsed = parse24(val);
  if (!parsed) return "";
  return `${parsed.hour12}:${String(parsed.minute).padStart(2, "0")} ${parsed.period}`;
}

// ─── Scroll-into-view helper ─────────────────────────────────────────────────

function useScrollToSelected(
  containerRef: React.RefObject<HTMLDivElement | null>,
  selectedValue: number | string,
  isOpen: boolean,
) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-value="${selectedValue}"]`) as HTMLDivElement | null;
    if (el) {
      // Use requestAnimationFrame to ensure layout is ready
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "center", behavior: "auto" });
      });
    }
  }, [isOpen, selectedValue]);
}

// ─── Column component ────────────────────────────────────────────────────────

function PickerColumn({
  items,
  selected,
  onSelect,
  isOpen,
  formatItem,
}: {
  items: (number | string)[];
  selected: number | string;
  onSelect: (val: number | string) => void;
  isOpen: boolean;
  formatItem?: (val: number | string) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollToSelected(ref, selected, isOpen);

  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        overflowY: "auto",
        maxHeight: "200px",
        scrollbarWidth: "thin",
      }}
    >
      {items.map((item) => {
        const isActive = item === selected;
        const label = formatItem ? formatItem(item) : String(item);
        return (
          <div
            key={item}
            data-value={item}
            onClick={() => onSelect(item)}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#FFFFFF" : "#0A1D4D",
              backgroundColor: isActive ? "#0F766E" : "transparent",
              borderRadius: "6px",
              cursor: "pointer",
              textAlign: "center",
              margin: "2px 4px",
              transition: "background-color 0.15s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F0FAF8";
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NeuronTimePicker({
  value,
  onChange,
  placeholder = "HH:MM AM/PM",
  style: extraStyle,
  disabled,
}: NeuronTimePickerProps) {
  const [display, setDisplay] = useState(formatDisplay(value));
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Parse current value for column selections
  const parsed = parse24(value);
  const [selHour, setSelHour] = useState<number>(parsed?.hour12 ?? 12);
  const [selMinute, setSelMinute] = useState<number>(parsed?.minute ?? 0);
  const [selPeriod, setSelPeriod] = useState<"AM" | "PM">(parsed?.period ?? "AM");

  // Sync display from parent value
  useEffect(() => {
    const formatted = formatDisplay(value);
    if (formatted !== display) setDisplay(formatted);
    const p = parse24(value);
    if (p) {
      setSelHour(p.hour12);
      setSelMinute(p.minute);
      setSelPeriod(p.period);
    }
  }, [value]);

  // Close on click outside — check both wrapper and portal popover
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inWrapper && !inPopover) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Column selection handlers — immediately commit
  const handleHourSelect = (h: number | string) => {
    const hour = typeof h === "number" ? h : parseInt(h as string, 10);
    setSelHour(hour);
    onChange(to24(hour, selMinute, selPeriod));
  };

  const handleMinuteSelect = (m: number | string) => {
    const minute = typeof m === "number" ? m : parseInt(m as string, 10);
    setSelMinute(minute);
    onChange(to24(selHour, minute, selPeriod));
  };

  const handlePeriodSelect = (p: number | string) => {
    const period = p as "AM" | "PM";
    setSelPeriod(period);
    onChange(to24(selHour, selMinute, period));
  };

  const handleNow = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setDisplay("");
    setOpen(false);
  };

  // Compute popover position anchored to input, updating on scroll/resize
  // Flips upward if insufficient space below
  const updatePopoverPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const popoverH = 320; // approximate height: header + 200px columns + footer
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < popoverH && rect.top > spaceBelow;
      setPopoverPos({
        top: openUp
          ? rect.top + window.scrollY - popoverH - 6
          : rect.bottom + 6 + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePopoverPosition();
      window.addEventListener("scroll", updatePopoverPosition, true);
      window.addEventListener("resize", updatePopoverPosition);
      return () => {
        window.removeEventListener("scroll", updatePopoverPosition, true);
        window.removeEventListener("resize", updatePopoverPosition);
      };
    }
  }, [open, updatePopoverPosition]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {/* Clickable field — opens time picker on click anywhere */}
      <div
        ref={inputRef}
        onClick={() => { if (!disabled) setOpen(!open); }}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "9px 40px 9px 16px",
          borderRadius: "8px",
          border: "1px solid #E5E9F0",
          fontSize: "14px",
          color: display ? "#0A1D4D" : "#9CA3AF",
          backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
          cursor: disabled ? "default" : "pointer",
          userSelect: "none",
          transition: "border-color 0.15s",
          ...extraStyle,
        }}
        onMouseEnter={(e) => { if (!disabled && !open) e.currentTarget.style.borderColor = "#D1D5DB"; }}
        onMouseLeave={(e) => { if (!disabled && !open) e.currentTarget.style.borderColor = "#E5E9F0"; }}
      >
        <span>{display || placeholder}</span>
        <Clock
          size={16}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9CA3AF",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Time picker popup — portal to body to escape overflow:hidden containers */}
      {open && (
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "absolute",
              top: popoverPos.top,
              left: popoverPos.left,
              zIndex: 99999,
              width: "260px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E9F0",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: "12px",
              fontFamily: "inherit",
            }}
          >
            {/* Column headers */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                marginBottom: "8px",
                paddingBottom: "8px",
                borderBottom: "1px solid #E5E9F0",
              }}
            >
              {["Hour", "Min", ""].map((label, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Three columns */}
            <div style={{ display: "flex", gap: "4px" }}>
              <PickerColumn
                items={HOURS_12}
                selected={selHour}
                onSelect={handleHourSelect}
                isOpen={open}
              />

              <div style={{ width: "1px", backgroundColor: "#F3F4F6", flexShrink: 0 }} />

              <PickerColumn
                items={MINUTES}
                selected={selMinute}
                onSelect={handleMinuteSelect}
                isOpen={open}
                formatItem={(v) => String(v).padStart(2, "0")}
              />

              <div style={{ width: "1px", backgroundColor: "#F3F4F6", flexShrink: 0 }} />

              <PickerColumn
                items={["AM", "PM"]}
                selected={selPeriod}
                onSelect={handlePeriodSelect}
                isOpen={open}
              />
            </div>

            {/* Footer: Clear + Now */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #E5E9F0",
              }}
            >
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#667085",
                  padding: "4px 0",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#667085"; }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleNow}
                style={{
                  backgroundColor: "#0F766E",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "6px 16px",
                  borderRadius: "8px",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0D655E"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0F766E"; }}
              >
                Now
              </button>
            </div>
          </div>,
          document.body,
        )
      )}
    </div>
  );
}