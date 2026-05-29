import { ChevronRight } from "lucide-react";
import type { UIActivityEntry } from "../../../utils/activityLog";

// Shared activity-log timeline used by every detail screen. Renders the real
// server-recorded history: which field/item changed, with formatted old→new.
export function ActivityTimeline({ activities }: { activities: UIActivityEntry[] }) {
  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--neuron-brand-green)", marginBottom: "20px" }}>
        Activity Timeline
      </h3>

      {activities.length === 0 ? (
        <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)" }}>No activity yet.</div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "15px", top: 0, bottom: 0, width: "2px", backgroundColor: "#E5E9F0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {activities.map((activity) => (
              <div key={activity.id} style={{ position: "relative", paddingLeft: "40px" }}>
                <div style={{
                  position: "absolute", left: "8px", top: "4px", width: "16px", height: "16px", borderRadius: "50%",
                  backgroundColor: activity.action === "created" ? "#6B7280" : activity.action === "field_updated" ? "#3B82F6" : "#F59E0B",
                  border: "3px solid #FAFBFC",
                }} />

                <div style={{ backgroundColor: "white", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", padding: "12px 16px" }}>
                  <div style={{ fontSize: "12px", color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>
                    {activity.timestamp.toLocaleString()}
                  </div>

                  {activity.action === "field_updated" && (
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--neuron-ink-base)", marginBottom: "4px" }}>
                        {activity.section && (
                          <span style={{ fontWeight: 600, color: "var(--neuron-ink-muted)" }}>{activity.section} · </span>
                        )}
                        <span style={{ fontWeight: 600 }}>{activity.fieldName}</span> changed
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--neuron-ink-secondary)", display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 8px", backgroundColor: "#FEE2E2", borderRadius: "4px", textDecoration: "line-through", color: "#EF4444" }}>
                          {activity.oldValue || "(empty)"}
                        </span>
                        <ChevronRight size={12} />
                        <span style={{ padding: "2px 8px", backgroundColor: "#D1FAE5", borderRadius: "4px", color: "#10B981" }}>
                          {activity.newValue || "(empty)"}
                        </span>
                      </div>
                    </div>
                  )}

                  {activity.action === "created" && (
                    <div style={{ fontSize: "13px", color: "var(--neuron-ink-base)" }}>Record created</div>
                  )}

                  {activity.action === "note_added" && (
                    <div style={{ fontSize: "13px", color: "var(--neuron-ink-base)" }}>{activity.note}</div>
                  )}

                  <div style={{ fontSize: "12px", color: "var(--neuron-ink-muted)", marginTop: "8px" }}>
                    by {activity.user}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
