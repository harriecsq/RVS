import { useState, useEffect } from "react";
import { SHIPMENT_EVENT_KEYS, SHIPMENT_EVENT_LABELS } from "../../../constants/shipmentEvents";
import type { ShipmentEvent } from "../../../types/operations";
import { DateTimeInput } from "./DateTimeInput";

interface ShipmentMilestonesTabProps {
  shipmentEvents: ShipmentEvent[];
  onSave: (events: ShipmentEvent[]) => Promise<void>;
  disabled?: boolean;
}

export function ShipmentMilestonesTab({
  shipmentEvents,
  onSave,
  disabled = false,
}: ShipmentMilestonesTabProps) {
  const [eventData, setEventData] = useState<
    Record<string, { date: string; time: string; note: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const map: Record<string, { date: string; time: string; note: string }> = {};
    for (const ev of shipmentEvents) {
      const dt = ev.dateTime ? new Date(ev.dateTime) : null;
      map[ev.event] = {
        date: dt ? dt.toISOString().slice(0, 10) : "",
        time: dt ? dt.toISOString().slice(11, 16) : "",
        note: ev.note || "",
      };
    }
    setEventData(map);
  }, [shipmentEvents]);

  const updateField = (
    eventKey: string,
    field: "date" | "time" | "note",
    value: string,
  ) => {
    setEventData((prev) => ({
      ...prev,
      [eventKey]: {
        date: prev[eventKey]?.date || "",
        time: prev[eventKey]?.time || "",
        note: prev[eventKey]?.note || "",
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const events: ShipmentEvent[] = [];
      for (const key of SHIPMENT_EVENT_KEYS) {
        const data = eventData[key];
        if (data?.date) {
          const timePart = data.time || "00:00";
          const dateTime = `${data.date}T${timePart}:00`;
          events.push({ event: key, dateTime, note: data.note || "" });
        }
      }
      await onSave(events);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px 48px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#0A1D4D",
            margin: 0,
          }}
        >
          Shipment Milestones
        </h3>
        {!disabled && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              background: isSaving ? "#9CA3AF" : "#0F766E",
              color: "#FFFFFF",
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr 1fr",
          gap: "12px",
          padding: "8px 0",
          borderBottom: "1px solid #E5E9F0",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.06em" }}>
          Event
        </span>
        <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.06em" }}>
          Date & Time
        </span>
        <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "#667085", letterSpacing: "0.06em" }}>
          Note
        </span>
      </div>

      {SHIPMENT_EVENT_KEYS.map((key) => {
        const data = eventData[key] || { date: "", time: "", note: "" };
        return (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr 1fr",
              gap: "12px",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #F3F4F6",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0A1D4D" }}>
              {SHIPMENT_EVENT_LABELS[key]}
            </span>

            <DateTimeInput
              dateValue={data.date}
              timeValue={data.time}
              onDateChange={(val) => updateField(key, "date", val)}
              onTimeChange={(val) => updateField(key, "time", val)}
              disabled={disabled}
              compact
            />

            <input
              type="text"
              value={data.note}
              onChange={(e) => updateField(key, "note", e.target.value)}
              disabled={disabled}
              placeholder="Add note..."
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                outline: "none",
                color: "#0A1D4D",
                background: disabled ? "#F9FAFB" : "#FFFFFF",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
