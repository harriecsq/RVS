import { ArrowLeft } from "lucide-react";
import { MasterTemplatesPage } from "../../admin/MasterTemplatesPage";

interface TemplateManagementViewProps {
  onBack: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function TemplateManagementView({ onBack }: TemplateManagementViewProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 48px", borderBottom: "1px solid #E5ECE9", background: "#FFFFFF" }}>
        <button
          onClick={onBack}
          style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#6B7A76" }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#12332B", margin: 0 }}>Master Templates</h2>
      </div>
      <MasterTemplatesPage />
    </div>
  );
}
