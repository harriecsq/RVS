import { useMemo, useState } from "react";
import type { TagHistoryEntry } from "../../types/operations";

interface TagHistoryTimelineProps {
  history: TagHistoryEntry[];
  maxEntries?: number;
}

export function TagHistoryTimeline({ history, maxEntries = 50 }: TagHistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () =>
      [...(history || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [history],
  );

  const visible = expanded ? sorted : sorted.slice(0, maxEntries);

  return (
    <div style={{ padding: "24px" }}>
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--neuron-brand-green)",
          marginBottom: "20px",
        }}
      >
        Tag History
      </h3>

      {sorted.length === 0 ? (
        <div style={{ fontSize: "13px", color: "#9CA3AF" }}>No tag history yet.</div>
      ) : (
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "15px",
              top: "0",
              bottom: "0",
              width: "2px",
              backgroundColor: "#E5E9F0",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {visible.map((entry) => {
              const isAdded = entry.action === "tag_added";
              const dotColor = isAdded ? "#10B981" : "#EF4444";
              const layerPalette =
                entry.layer === "shipment"
                  ? { backgroundColor: "#E8F5F3", color: "#12332B", border: "1px solid #C1D9CC" }
                  : { backgroundColor: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" };

              return (
                <div key={entry.id} style={{ position: "relative", paddingLeft: "40px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "4px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: dotColor,
                      border: "3px solid #FAFBFC",
                    }}
                  />
                  <div
                    style={{
                      backgroundColor: "white",
                      border: "1px solid var(--neuron-ui-border)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>

                    <div style={{ fontSize: "13px", color: "var(--neuron-ink-base)", marginBottom: "8px" }}>
                      {isAdded ? "Added " : "Removed "}
                      <span style={{ fontWeight: 600 }}>{entry.tagLabel}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          borderRadius: "999px",
                          padding: "2px 8px",
                          ...layerPalette,
                        }}
                      >
                        {entry.layer === "shipment" ? "Shipment" : "Operational"}
                      </span>
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--neuron-ink-muted)" }}>
                      by {entry.user}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!expanded && sorted.length > maxEntries && (
            <div style={{ marginTop: "16px", paddingLeft: "40px" }}>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                style={{
                  border: "1px solid #D1D5DB",
                  backgroundColor: "white",
                  color: "#374151",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Show more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

