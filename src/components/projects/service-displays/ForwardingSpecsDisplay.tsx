// TODO: Implement full forwarding specs display (moved from BD module — original deleted during cleanup)
export function ForwardingSpecsDisplay({ details }: { details?: Record<string, unknown> }) {
  if (!details) return null;
  return (
    <div style={{ fontSize: "13px", color: "var(--neuron-ink-secondary)", padding: "8px 0" }}>
      {Object.entries(details).map(([k, v]) => v != null && (
        <div key={k} style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontWeight: 500, color: "var(--neuron-ink-muted)", minWidth: "140px", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}:</span>
          <span>{String(v)}</span>
        </div>
      ))}
    </div>
  );
}
