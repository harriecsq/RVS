import type { Project } from "../../types/pricing";

interface ProjectOverviewTabProps {
  project: Project;
  onUpdate?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancelEdit?: () => void;
}

// TODO: Implement full project overview tab (moved from BD module — original file was deleted during cleanup)
export function ProjectOverviewTab({ project, isEditing, onSave, onCancelEdit }: ProjectOverviewTabProps) {
  const field = (label: string, value?: string | number) =>
    value != null ? (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: "14px", color: "var(--neuron-ink-primary)" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {field("Project Number", project.project_number)}
        {field("Status", project.status)}
        {field("Booking Status", project.booking_status)}
        {field("Client", project.client_name || project.customer_name)}
        {field("Company", project.company_name)}
        {field("Movement", project.movement)}
        {field("Currency", project.currency)}
        {field("Commodity", project.commodity)}
        {field("Cargo Type", project.cargo_type)}
        {field("Origin (POL/AOL)", project.pol_aol)}
        {field("Destination (POD/AOD)", project.pod_aod)}
        {field("Services", project.services?.join(", "))}
      </div>

      {isEditing && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onSave}
            style={{ padding: "8px 16px", background: "var(--neuron-brand-green)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            style={{ padding: "8px 16px", background: "transparent", color: "var(--neuron-ink-secondary)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
