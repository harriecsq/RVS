import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { SHIPMENT_EVENT_KEYS, SHIPMENT_EVENT_LABELS } from "../../../constants/shipmentEvents";
import type { ShipmentEvent } from "../../../types/operations";
import { DateTimeInput } from "./DateTimeInput";

export interface ShipmentMilestonesTabHandle {
  save: () => Promise<void>;
  cancel: () => void;
}

interface ShipmentMilestonesTabProps {
  shipmentEvents: ShipmentEvent[];
  onSave: (events: ShipmentEvent[]) => Promise<void>;
  isEditing?: boolean;
}

export const ShipmentMilestonesTab = forwardRef<
  ShipmentMilestonesTabHandle,
  ShipmentMilestonesTabProps
>(function ShipmentMilestonesTab(
  { shipmentEvents, onSave, isEditing = false },
  ref,
) {
  const [eventData, setEventData] = useState<
    Record<string, { date: string; time: string; note: string }>
  >({});

  const buildMap = (events: ShipmentEvent[]) => {
    const map: Record<string, { date: string; time: string; note: string }> = {};
    if (!Array.isArray(events)) return map;
    for (const ev of events) {
      if (!ev?.event) continue;
      let date = "";
      let time = "";
      const raw = typeof ev.dateTime === "string" ? ev.dateTime : "";
      const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
      if (match) {
        date = match[1];
        time = match[2] || "";
      } else if (raw) {
        const dt = new Date(raw);
        if (!isNaN(dt.getTime())) {
          const pad = (n: number) => String(n).padStart(2, "0");
          date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
          time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        }
      }
      map[ev.event] = { date, time, note: ev.note || "" };
    }
    return map;
  };

  useEffect(() => {
    setEventData(buildMap(shipmentEvents));
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

  useImperativeHandle(ref, () => ({
    save: async () => {
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
    },
    cancel: () => {
      setEventData(buildMap(shipmentEvents));
    },
  }), [eventData, onSave, shipmentEvents]);

  const HEADER_STYLE: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#667085",
    letterSpacing: "0.06em",
  };

  return (
    <div style={{ padding: "24px 48px" }}>
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "#0A1D4D",
          margin: 0,
          marginBottom: "20px",
        }}
      >
        Shipment Milestones
      </h3>

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
        <span style={HEADER_STYLE}>Event</span>
        <span style={HEADER_STYLE}>Date & Time</span>
        <span style={HEADER_STYLE}>Note</span>
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
              disabled={!isEditing}
              compact
            />

            <input
              type="text"
              value={data.note}
              onChange={(e) => updateField(key, "note", e.target.value)}
              disabled={!isEditing}
              placeholder="Add note..."
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                outline: "none",
                color: "#0A1D4D",
                background: !isEditing ? "#F9FAFB" : "#FFFFFF",
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
