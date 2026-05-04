/**
 * UnifiedDateRangeFilter
 *
 * A shared date-range filter with two MM/DD/YYYY inputs, each with a
 * right-side calendar icon that opens a portalled popup calendar with
 * month/year dropdowns, day grid, and Clear & Today footer.
 *
 * Merges the Reports two-input structure with NeuronDatePicker calendar UX.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Public interface ─────────────────────────────────────────────────────────

interface UnifiedDateRangeFilterProps {
  startDate: string;                    // ISO "YYYY-MM-DD" or ""
  endDate: string;                      // ISO "YYYY-MM-DD" or ""
  onStartDateChange: (iso: string) => void;
  onEndDateChange: (iso: string) => void;
  label?: string;                       // optional label above the pair
  compact?: boolean;                    // true = shorter height for list filter bars
  startPlaceholder?: string;
  endPlaceholder?: string;
  onSwitchToMonth?: () => void;         // when set, popover shows Month/Custom Range toggle instead of Today
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function parseISOToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${m}/${d}/${y}`;
  return "";
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

interface CalendarDay {
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
}

function buildCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const grid: CalendarDay[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    grid.push({ day: d, month: pm, year: py, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, month, year, isCurrentMonth: true });
  }
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    grid.push({ day: d, month: nm, year: ny, isCurrentMonth: false });
  }
  return grid;
}

function yearRange(): number[] {
  const now = new Date().getFullYear();
  const arr: number[] = [];
  for (let y = now - 10; y <= now + 10; y++) arr.push(y);
  return arr;
}

// ─── InlineDropdown (month/year selector inside popup) ────────────────────────

function InlineDropdown({
  value, options, onChange, width,
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
          display: "flex", alignItems: "center", gap: "4px", cursor: "pointer",
          fontSize: "14px", fontWeight: 600, color: "#0A1D4D",
          padding: "4px 8px", borderRadius: "6px",
          backgroundColor: open ? "#F0FAF8" : "transparent", userSelect: "none",
        }}
      >
        <span>{options.find(o => o.value === value)?.label || value}</span>
        <ChevronDown size={14} style={{ color: "#667085" }} />
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: "4px",
          backgroundColor: "#FFFFFF", border: "1px solid #E5E9F0", borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)", zIndex: 10000,
          maxHeight: "200px", overflowY: "auto", minWidth: "120px",
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: "6px 12px", fontSize: "13px", color: "#0A1D4D", cursor: "pointer",
                backgroundColor: value === opt.value ? "#F0FAF8" : "transparent",
              }}
              onMouseEnter={e => { if (value !== opt.value) (e.currentTarget).style.backgroundColor = "#F8F9FB"; }}
              onMouseLeave={e => { (e.currentTarget).style.backgroundColor = value === opt.value ? "#F0FAF8" : "transparent"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SingleDateInput ──────────────────────────────────────────────────────────

export function SingleDateInput({
  value, onChange, placeholder, compact, onSwitchToMonth,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder: string;
  compact?: boolean;
  onSwitchToMonth?: () => void;
}) {
  const [display, setDisplay] = useState(parseISOToDisplay(value));
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  const initialMonth = value ? parseInt(value.split("-")[1], 10) - 1 : today.getMonth();
  const initialYear = value ? parseInt(value.split("-")[0], 10) : today.getFullYear();
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [viewYear, setViewYear] = useState(initialYear);

  // Sync display from parent
  useEffect(() => {
    const formatted = parseISOToDisplay(value);
    if (formatted !== display) setDisplay(formatted);
  }, [value]);

  // Sync calendar view when value changes
  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) { setViewYear(y); setViewMonth(m - 1); }
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapperRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
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

  const handleDayClick = (cell: CalendarDay) => {
    const iso = toISO(cell.year, cell.month, cell.day);
    onChange(iso);
    setOpen(false);
  };

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
  const yearOptions = yearRange().map(y => ({ label: String(y), value: String(y) }));

  const updatePopoverPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const calendarHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < calendarHeight
        ? rect.top - calendarHeight - 6 + window.scrollY
        : rect.bottom + 6 + window.scrollY;
      setPopoverPos({ top, left: rect.left + window.scrollX });
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

  const inputHeight = compact ? "38px" : "40px";

  return (
    <div ref={wrapperRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <div
        ref={inputRef}
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          width: "100%",
          height: inputHeight,
          padding: "0 36px 0 12px",
          border: open ? "1px solid #0F766E" : "1px solid #E5E9F0",
          borderRadius: "12px",
          fontSize: "14px",
          color: display ? "#0A1D4D" : "#9CA3AF",
          backgroundColor: "#FFFFFF",
          transition: "border-color 0.15s",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <span>{display || placeholder}</span>
        <Calendar
          size={15}
          style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            color: "#9CA3AF", pointerEvents: "none",
          }}
        />
      </div>

      {/* Calendar popup — portalled to body */}
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "absolute", top: popoverPos.top, left: popoverPos.left, zIndex: 99999,
            width: "308px", backgroundColor: "#FFFFFF", border: "1px solid #E5E9F0",
            borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "16px", fontFamily: "inherit",
          }}
        >
          {/* Header: Nav arrows + Month/Year dropdowns */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button
              type="button" onClick={goToPrevMonth}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "4px",
                borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085",
              }}
              onMouseEnter={e => { (e.currentTarget).style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={e => { (e.currentTarget).style.backgroundColor = "transparent"; }}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <InlineDropdown value={String(viewMonth)} options={monthOptions} onChange={v => setViewMonth(parseInt(v, 10))} />
              <InlineDropdown value={String(viewYear)} options={yearOptions} onChange={v => setViewYear(parseInt(v, 10))} width="80px" />
            </div>
            <button
              type="button" onClick={goToNextMonth}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "4px",
                borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085",
              }}
              onMouseEnter={e => { (e.currentTarget).style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={e => { (e.currentTarget).style.backgroundColor = "transparent"; }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "4px" }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", padding: "4px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {grid.map((cell, idx) => {
              const cellISO = toISO(cell.year, cell.month, cell.day);
              const isSelected = value === cellISO;
              const isToday = cellISO === todayISO;
              const isOtherMonth = !cell.isCurrentMonth;
              return (
                <button
                  key={idx} type="button" onClick={() => handleDayClick(cell)}
                  style={{
                    width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: isSelected || isToday ? 600 : 400,
                    color: isSelected ? "#FFFFFF" : isOtherMonth ? "#D1D5DB" : "#0A1D4D",
                    backgroundColor: isSelected ? "#0F766E" : "transparent",
                    border: isToday && !isSelected ? "2px solid #0F766E" : "2px solid transparent",
                    borderRadius: "8px", cursor: "pointer", margin: "auto", transition: "background-color 0.15s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget).style.backgroundColor = "#F0FAF8"; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget).style.backgroundColor = "transparent"; }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer: Clear + (Today | Month/Custom Range toggle) */}
          {onSwitchToMonth ? (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #E5E9F0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => { onChange(""); setDisplay(""); setOpen(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "#667085", padding: "4px 0" }}
                  onMouseEnter={e => { (e.currentTarget).style.color = "#EF4444"; }}
                  onMouseLeave={e => { (e.currentTarget).style.color = "#667085"; }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => { onChange(todayISO); setOpen(false); }}
                  style={{
                    backgroundColor: "#0F766E", color: "#FFFFFF", border: "none", cursor: "pointer",
                    fontSize: "13px", fontWeight: 600, padding: "6px 16px", borderRadius: "8px",
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.backgroundColor = "#0D655E"; }}
                  onMouseLeave={e => { (e.currentTarget).style.backgroundColor = "#0F766E"; }}
                >
                  Today
                </button>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button type="button"
                  onClick={() => { setOpen(false); onSwitchToMonth(); }}
                  style={{ flex: 1, padding: "7px", fontSize: "12px", fontWeight: 600, backgroundColor: "transparent", color: "#667085", border: "1px solid #E5E9F0", borderRadius: "8px", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#F3F4F6"; e.currentTarget.style.color = "#0A1D4D"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#667085"; }}>
                  Month
                </button>
                <button type="button"
                  style={{ flex: 1, padding: "7px", fontSize: "12px", fontWeight: 600, backgroundColor: "#0F766E", color: "#fff", border: "1px solid #0F766E", borderRadius: "8px", cursor: "default" }}>
                  Custom Range
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #E5E9F0" }}>
              <button
                type="button"
                onClick={() => { onChange(""); setDisplay(""); setOpen(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "#667085", padding: "4px 0" }}
                onMouseEnter={e => { (e.currentTarget).style.color = "#EF4444"; }}
                onMouseLeave={e => { (e.currentTarget).style.color = "#667085"; }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => { onChange(todayISO); setOpen(false); }}
                style={{
                  backgroundColor: "#0F766E", color: "#FFFFFF", border: "none", cursor: "pointer",
                  fontSize: "13px", fontWeight: 600, padding: "6px 16px", borderRadius: "8px",
                }}
                onMouseEnter={e => { (e.currentTarget).style.backgroundColor = "#0D655E"; }}
                onMouseLeave={e => { (e.currentTarget).style.backgroundColor = "#0F766E"; }}
              >
                Today
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function UnifiedDateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
  compact = false,
  startPlaceholder = "From",
  endPlaceholder = "To",
  onSwitchToMonth,
}: UnifiedDateRangeFilterProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: label ? "6px" : "0px" }}>
      {label && (
        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#667085", marginBottom: "2px" }}>
          {label}
        </label>
      )}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <SingleDateInput
          value={startDate}
          onChange={onStartDateChange}
          placeholder={startPlaceholder}
          compact={compact}
          onSwitchToMonth={onSwitchToMonth}
        />
        <span style={{ color: "#9CA3AF", fontSize: "13px", flexShrink: 0 }}>—</span>
        <SingleDateInput
          value={endDate}
          onChange={onEndDateChange}
          placeholder={endPlaceholder}
          compact={compact}
          onSwitchToMonth={onSwitchToMonth}
        />
      </div>
    </div>
  );
}