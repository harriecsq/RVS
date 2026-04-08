/**
 * NeuronDatePicker — Reusable date input with MM/DD/YYYY masking + calendar popup.
 *
 * Design:
 *  - Text input still supports manual typing with auto-slash masking
 *  - Calendar icon on the right toggles a calendar popup
 *  - Popup: Month & Year dropdowns, 7-column day grid, Clear & Today footer
 *  - Today's date: teal border ring; selected date: filled teal bg
 *  - Neuron design system: #0A1D4D text, #0F766E accent, stroke borders, no shadows
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NeuronDatePickerProps {
  value: string;               // ISO date "YYYY-MM-DD" or ""
  onChange: (iso: string) => void;
  placeholder?: string;
  style?: React.CSSProperties; // pass-through (e.g. auto-fill bg)
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const SHORT_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function parseISOToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (y && m && d) {
    const monthIdx = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    return `${SHORT_MONTHS[monthIdx]} ${day}, ${y}`;
  }
  return "";
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSameDay(iso: string, year: number, month: number, day: number): boolean {
  return iso === toISO(year, month, day);
}

// ─── Calendar grid builder ───────────────────────────────────────────────────

interface CalendarDay {
  day: number;
  month: number;   // 0-based
  year: number;
  isCurrentMonth: boolean;
}

function buildCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const grid: CalendarDay[] = [];

  // Previous month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    grid.push({ day: d, month: pm, year: py, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, month, year, isCurrentMonth: true });
  }

  // Next month fill (complete to 42 cells = 6 rows)
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    grid.push({ day: d, month: nm, year: ny, isCurrentMonth: false });
  }

  return grid;
}

// ─── Year range ───────────────────────────────────────────────────────────────
function yearRange(): number[] {
  const now = new Date().getFullYear();
  const arr: number[] = [];
  for (let y = now - 10; y <= now + 10; y++) arr.push(y);
  return arr;
}

// ─── Inline dropdown (month / year selector) ─────────────────────────────────

function InlineDropdown({
  value,
  options,
  onChange,
  width,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width: width || "auto" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          color: "#0A1D4D",
          padding: "4px 8px",
          borderRadius: "6px",
          backgroundColor: open ? "#F0FAF8" : "transparent",
          userSelect: "none",
        }}
      >
        <span>{options.find((o) => o.value === value)?.label || value}</span>
        <ChevronDown size={14} style={{ color: "#667085" }} />
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E9F0",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            zIndex: 10000,
            maxHeight: "200px",
            overflowY: "auto",
            minWidth: "120px",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                color: "#0A1D4D",
                cursor: "pointer",
                backgroundColor: value === opt.value ? "#F0FAF8" : "transparent",
              }}
              onMouseEnter={(e) => { if (value !== opt.value) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F8F9FB"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = value === opt.value ? "#F0FAF8" : "transparent"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NeuronDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  style: extraStyle,
  disabled,
}: NeuronDatePickerProps) {
  const [display, setDisplay] = useState(parseISOToDisplay(value));
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Calendar view state
  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  const initialMonth = value
    ? parseInt(value.split("-")[1], 10) - 1
    : today.getMonth();
  const initialYear = value
    ? parseInt(value.split("-")[0], 10)
    : today.getFullYear();

  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [viewYear, setViewYear] = useState(initialYear);

  // Sync display from parent
  useEffect(() => {
    const formatted = parseISOToDisplay(value);
    if (formatted !== display) setDisplay(formatted);
  }, [value]);

  // Sync calendar view when value changes externally
  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
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

  // Handle day click
  const handleDayClick = (cell: CalendarDay) => {
    const iso = toISO(cell.year, cell.month, cell.day);
    onChange(iso);
    setOpen(false);
  };

  // Navigation
  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const grid = buildCalendarGrid(viewYear, viewMonth);

  const monthOptions = MONTH_NAMES.map((m, i) => ({ label: m, value: String(i) }));
  const yearOptions = yearRange().map((y) => ({ label: String(y), value: String(y) }));

  // Compute popover position anchored to input, updating on scroll/resize
  const updatePopoverPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + 6 + window.scrollY,
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
      {/* Clickable field — opens calendar on click anywhere */}
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
        <Calendar
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

      {/* Calendar popup — portal to body to escape overflow:hidden containers */}
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: popoverPos.top,
            left: popoverPos.left,
            zIndex: 99999,
            width: "308px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E9F0",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "16px",
            fontFamily: "inherit",
          }}
        >
          {/* ── Header: Nav arrows + Month/Year dropdowns ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={goToPrevMonth}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "4px", borderRadius: "6px", display: "flex",
                alignItems: "center", justifyContent: "center", color: "#667085",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <InlineDropdown
                value={String(viewMonth)}
                options={monthOptions}
                onChange={(v) => setViewMonth(parseInt(v, 10))}
              />
              <InlineDropdown
                value={String(viewYear)}
                options={yearOptions}
                onChange={(v) => setViewYear(parseInt(v, 10))}
                width="80px"
              />
            </div>

            <button
              type="button"
              onClick={goToNextMonth}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "4px", borderRadius: "6px", display: "flex",
                alignItems: "center", justifyContent: "center", color: "#667085",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ── Day-of-week headers ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              marginBottom: "4px",
            }}
          >
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* ── Day grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
            }}
          >
            {grid.map((cell, idx) => {
              const cellISO = toISO(cell.year, cell.month, cell.day);
              const isSelected = value === cellISO;
              const isToday = cellISO === todayISO;
              const isOtherMonth = !cell.isCurrentMonth;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(cell)}
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: isSelected || isToday ? 600 : 400,
                    color: isSelected
                      ? "#FFFFFF"
                      : isOtherMonth
                      ? "#D1D5DB"
                      : "#0A1D4D",
                    backgroundColor: isSelected ? "#0F766E" : "transparent",
                    border: isToday && !isSelected ? "2px solid #0F766E" : "2px solid transparent",
                    borderRadius: "8px",
                    cursor: "pointer",
                    margin: "auto",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F0FAF8";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* ── Footer: Clear + Today ── */}
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
              onClick={() => { onChange(""); setDisplay(""); setOpen(false); }}
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
              onClick={() => {
                onChange(todayISO);
                setOpen(false);
              }}
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
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}