import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { UnifiedDateRangeFilter } from "./UnifiedDateRangeFilter";

interface MonthOrRangeDateFilterProps {
  label?: string;
  dateStart: string;
  dateEnd: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onModeChange?: (mode: "month" | "range") => void;
  onMonthChange?: (month: string) => void;
}

const MONTH_ABBRS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parseMonthStr(v: string) {
  const [abbr, yr] = v.split(" ");
  const m = MONTH_ABBRS.indexOf(abbr);
  const y = parseInt(yr, 10);
  return { month: m >= 0 ? m : new Date().getMonth(), year: isNaN(y) ? new Date().getFullYear() : y };
}

function MonthModeInput({
  value,
  onChange,
  onSwitchToCustom,
}: {
  value: string;
  onChange: (v: string) => void;
  onSwitchToCustom: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const { month: selMonth, year: selYear } = parseMonthStr(value);
  const [viewYear, setViewYear] = useState(selYear);

  const displayLabel = value ? `${MONTH_FULL[selMonth]} ${selYear}` : "Select month...";

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapperRef.current?.contains(t) && !popoverRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const updatePos = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const popH = 320;
    const top = window.innerHeight - rect.bottom < popH
      ? rect.top - popH - 6 + window.scrollY
      : rect.bottom + 6 + window.scrollY;
    setPos({ top, left: rect.left + window.scrollX, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", height: "40px",
          padding: "0 36px 0 12px",
          border: open ? "1px solid #0F766E" : "1px solid #E5E9F0",
          borderRadius: "12px",
          fontSize: "14px",
          color: value ? "#0A1D4D" : "#9CA3AF",
          backgroundColor: "#FFFFFF",
          transition: "border-color 0.15s",
          cursor: "pointer",
          display: "flex", alignItems: "center",
          userSelect: "none", position: "relative",
        }}
      >
        <span>{displayLabel}</span>
        <Calendar size={15} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
      </div>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "absolute", top: pos.top, left: pos.left,
            width: Math.max(pos.width, 260) + "px",
            zIndex: 99999, backgroundColor: "#FFFFFF",
            border: "1px solid #E5E9F0", borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "16px", fontFamily: "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <button type="button" onClick={() => setViewYear(y => y - 1)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", color: "#667085", display: "flex", alignItems: "center" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#0A1D4D" }}>{viewYear}</span>
            <button type="button" onClick={() => setViewYear(y => y + 1)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", color: "#667085", display: "flex", alignItems: "center" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "14px" }}>
            {MONTH_ABBRS.map((abbr, idx) => {
              const isSelected = idx === selMonth && viewYear === selYear;
              return (
                <button key={abbr} type="button"
                  onClick={() => { onChange(`${MONTH_ABBRS[idx]} ${viewYear}`); setOpen(false); }}
                  style={{
                    padding: "9px 4px", fontSize: "13px",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? "#FFFFFF" : "#0A1D4D",
                    backgroundColor: isSelected ? "#0F766E" : "transparent",
                    border: `1px solid ${isSelected ? "#0F766E" : "#E5E9F0"}`,
                    borderRadius: "8px", cursor: "pointer",
                    transition: "background-color 0.12s, color 0.12s, border-color 0.12s",
                  }}
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.backgroundColor = "#F0FAF8"; e.currentTarget.style.borderColor = "#0F766E"; } }}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#E5E9F0"; } }}
                >
                  {MONTH_FULL[idx].slice(0, 3)}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid #E5E9F0", paddingTop: "12px", display: "flex", gap: "6px" }}>
            <button type="button"
              style={{ flex: 1, padding: "7px", fontSize: "12px", fontWeight: 600, backgroundColor: "#0F766E", color: "#fff", border: "1px solid #0F766E", borderRadius: "8px", cursor: "default" }}>
              Month
            </button>
            <button type="button"
              onClick={() => { setOpen(false); onSwitchToCustom(); }}
              style={{ flex: 1, padding: "7px", fontSize: "12px", fontWeight: 600, backgroundColor: "transparent", color: "#667085", border: "1px solid #E5E9F0", borderRadius: "8px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#F3F4F6"; e.currentTarget.style.color = "#0A1D4D"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#667085"; }}>
              Custom Range
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function MonthOrRangeDateFilter({
  label,
  dateStart,
  dateEnd,
  onStartDateChange,
  onEndDateChange,
  onModeChange,
  onMonthChange,
}: MonthOrRangeDateFilterProps) {
  const now = new Date();
  const [dateMode, setDateMode] = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState(`${MONTH_ABBRS[now.getMonth()]} ${now.getFullYear()}`);

  const applyMonth = useCallback((monthStr: string) => {
    const [abbr, yearStr] = monthStr.split(" ");
    const m = MONTH_ABBRS.indexOf(abbr);
    const y = parseInt(yearStr, 10);
    if (m < 0 || isNaN(y)) return;
    const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const last = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    onStartDateChange(first);
    onEndDateChange(last);
  }, [onStartDateChange, onEndDateChange]);

  const switchToRange = useCallback(() => {
    setDateMode("range");
    onModeChange?.("range");
    onStartDateChange("");
    onEndDateChange("");
  }, [onStartDateChange, onEndDateChange, onModeChange]);

  const switchToMonth = useCallback(() => {
    setDateMode("month");
    onModeChange?.("month");
    applyMonth(selectedMonth);
  }, [selectedMonth, applyMonth, onModeChange]);

  useEffect(() => { applyMonth(selectedMonth); onMonthChange?.(selectedMonth); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)" }}>
          {label}
        </label>
      )}

      {dateMode === "month" ? (
        <MonthModeInput
          value={selectedMonth}
          onChange={(v) => { setSelectedMonth(v); applyMonth(v); onMonthChange?.(v); }}
          onSwitchToCustom={switchToRange}
        />
      ) : (
        <UnifiedDateRangeFilter
          startDate={dateStart}
          endDate={dateEnd}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onSwitchToMonth={switchToMonth}
        />
      )}
    </div>
  );
}
