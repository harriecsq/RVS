/**
 * DateTimeInput — a combined date + time picker used across the Trucking module.
 * Date: text field with MM/DD/YYYY masking (same as DateInput).
 * Time: native <input type="time"> styled to match the Neuron design system.
 */
import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { NeuronTimePicker } from "./NeuronTimePicker";

interface DateTimeInputProps {
  dateValue: string;   // YYYY-MM-DD
  timeValue: string;   // HH:mm (24-hour)
  onDateChange: (val: string) => void; // YYYY-MM-DD
  onTimeChange: (val: string) => void; // HH:mm
  disabled?: boolean;
  dateLabel?: string;
  timeLabel?: string;
  compact?: boolean; // side-by-side without extra label row
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (y && m && d) return `${m}/${d}/${y}`;
  return "";
}

function parseDisplayToISO(display: string): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const mNum = parseInt(mm, 10);
  const dNum = parseInt(dd, 10);
  const yNum = parseInt(yyyy, 10);
  if (mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31 || yNum < 1900 || yNum > 2100) return null;
  return `${yyyy}-${mm}-${dd}`;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #E5E9F0",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#0A1D4D",
  backgroundColor: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#667085",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: "6px",
};

export function DateTimeInput({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  disabled,
  dateLabel = "Date",
  timeLabel = "Time",
  compact,
}: DateTimeInputProps) {
  const [displayDate, setDisplayDate] = useState(formatDateDisplay(dateValue));

  useEffect(() => {
    const formatted = formatDateDisplay(dateValue);
    if (formatted !== displayDate) setDisplayDate(formatted);
  }, [dateValue]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (!raw) {
      setDisplayDate("");
      onDateChange("");
      return;
    }
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += "/" + digits.slice(2, 4);
    if (digits.length > 4) formatted += "/" + digits.slice(4, 8);
    setDisplayDate(formatted);
    const iso = parseDisplayToISO(formatted);
    if (iso) onDateChange(iso);
    else if (!digits) onDateChange("");
  };

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      {/* Date */}
      <div style={{ flex: 1 }}>
        {!compact && <label style={LABEL_STYLE}>{dateLabel}</label>}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={displayDate}
            onChange={handleDateChange}
            placeholder="MM/DD/YYYY"
            disabled={disabled}
            style={{ ...INPUT_STYLE, paddingRight: "36px" }}
            maxLength={10}
          />
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
      </div>
      {/* Time */}
      <div style={{ flex: 1 }}>
        {!compact && <label style={LABEL_STYLE}>{timeLabel}</label>}
        <NeuronTimePicker value={timeValue} onChange={onTimeChange} disabled={disabled} />
      </div>
    </div>
  );
}

/** Formats YYYY-MM-DD + HH:mm into "MM/DD/YYYY HH:MM AM/PM" */
export function formatDateTime(date: string, time: string): string {
  const datePart = formatDateDisplay(date);
  if (!datePart) return "—";
  if (!time) return datePart;
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return datePart;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${datePart} ${h12}:${mStr.padStart(2, "0")} ${ampm}`;
}
