/**
 * DateTimeInput — a combined date + time picker used across the Trucking module.
 * Date: clickable field that opens NeuronDatePicker calendar popup.
 * Time: clickable field that opens NeuronTimePicker scroll popup.
 */
import { NeuronTimePicker } from "./NeuronTimePicker";
import { NeuronDatePicker } from "./NeuronDatePicker";

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

const SHORT_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (y && m && d) {
    const monthIdx = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    return `${SHORT_MONTHS[monthIdx]} ${day}, ${y}`;
  }
  return "";
}

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
  return (
    <div style={{ display: "flex", gap: "12px" }}>
      {/* Date */}
      <div style={{ flex: 1 }}>
        {!compact && <label style={LABEL_STYLE}>{dateLabel}</label>}
        <NeuronDatePicker value={dateValue} onChange={onDateChange} disabled={disabled} placeholder={disabled ? "—" : "Select date"} />
      </div>
      {/* Time */}
      <div style={{ flex: 1 }}>
        {!compact && <label style={LABEL_STYLE}>{timeLabel}</label>}
        <NeuronTimePicker value={timeValue} onChange={onTimeChange} disabled={disabled} placeholder={disabled ? "—" : "HH:MM AM/PM"} />
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
