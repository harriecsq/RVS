import { useState } from "react";
import { Loader2, Save, X, CheckSquare, XSquare } from "lucide-react";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { toast } from "../../ui/toast-utils";
import type { TemplateDocType } from "../../../types/document-templates";
import { DOC_TYPE_LABELS } from "../../../types/document-templates";

interface SaveTemplateSidebarProps {
  docType: TemplateDocType;
  clientId?: string;
  clientName?: string;
  currentUser?: { name: string } | null;
  selectedFields: Set<string>;
  templatableFields: Record<string, any>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveTemplateSidebar({
  docType,
  clientId,
  clientName,
  currentUser,
  selectedFields,
  templatableFields,
  onSelectAll,
  onDeselectAll,
  onClose,
  onSaved,
}: SaveTemplateSidebarProps) {
  const [templateName, setTemplateName] = useState(
    `${clientName || "Global"} - ${DOC_TYPE_LABELS[docType]}`
  );
  const [isSaving, setIsSaving] = useState(false);

  const fieldKeys = Object.keys(templatableFields);
  const allSelected = selectedFields.size === fieldKeys.length && fieldKeys.length > 0;

  const formatLabel = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    setIsSaving(true);
    try {
      const fields: Record<string, any> = {};
      for (const key of selectedFields) {
        if (templatableFields[key] !== undefined) {
          fields[key] = templatableFields[key];
        }
      }

      const res = await fetch(`${API_BASE_URL}/doc-templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: clientId || null,
          clientName: clientName || null,
          docType,
          name: templateName.trim(),
          fields,
          createdBy: currentUser?.name || "Unknown",
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Template saved");
        onSaved?.();
        onClose();
      } else {
        toast.error(result.error || "Failed to save template");
      }
    } catch (err) {
      console.error("Error saving template:", err);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        flex: "0 0 300px",
        borderLeft: "1px solid #E5E9F0",
        overflow: "auto",
        backgroundColor: "#FAFBFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid #E5E9F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E", margin: 0 }}>
          Save as Template
        </h3>
        <button
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", border: "1px solid #E5E9F0",
            borderRadius: "6px", background: "#FFFFFF", cursor: "pointer", color: "#6B7A76",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
        {/* Template name */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>
            Template Name
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Japan - Cacao Beans"
            style={{
              width: "100%", padding: "8px 12px", border: "1px solid #E5ECE9",
              borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Client info */}
        <div style={{ fontSize: "12px", color: "#6B7A76", marginBottom: "20px" }}>
          Client: <span style={{ fontWeight: 500, color: "#12332B" }}>{clientName || "None (Global)"}</span>
        </div>

        {/* Instructions */}
        <div style={{
          padding: "12px",
          backgroundColor: "#E8F2EE",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#12332B",
          lineHeight: "1.5",
        }}>
          Click fields on the document to toggle them. <span style={{ color: "#237F66", fontWeight: 600 }}>Green</span> fields
          are included, <span style={{ color: "#DC2626", fontWeight: 600 }}>red</span> fields are excluded.
        </div>

        {/* Select/Deselect All + field count */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "12px",
        }}>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#6B7A76" }}>
            {selectedFields.size}/{fieldKeys.length} fields
          </span>
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "12px", color: "#237F66", cursor: "pointer",
              border: "none", background: "none", fontWeight: 600, padding: "4px 8px",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#E8F2EE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            {allSelected ? <XSquare size={14} /> : <CheckSquare size={14} />}
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        {/* Field list (read-only summary) */}
        <div style={{
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          {fieldKeys.map((key) => (
            <div
              key={key}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "6px 10px", borderRadius: "6px", fontSize: "12px",
                backgroundColor: selectedFields.has(key) ? "#F0FAF7" : "#FEF2F2",
                border: `1px solid ${selectedFields.has(key) ? "#BBF7D0" : "#FECACA"}`,
                color: selectedFields.has(key) ? "#166534" : "#991B1B",
              }}
            >
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                backgroundColor: selectedFields.has(key) ? "#22C55E" : "#EF4444",
              }} />
              <span style={{ fontWeight: 500 }}>{formatLabel(key)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with Save button */}
      <div style={{
        padding: "16px 20px", borderTop: "1px solid #E5E9F0",
        display: "flex", flexDirection: "column", gap: "8px",
      }}>
        <button
          onClick={handleSave}
          disabled={isSaving || selectedFields.size === 0}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            width: "100%", padding: "10px 16px", fontSize: "13px", fontWeight: 600,
            border: "none", borderRadius: "8px", cursor: selectedFields.size === 0 ? "not-allowed" : "pointer",
            background: selectedFields.size === 0 ? "#D1D5DB" : "#237F66",
            color: "#FFFFFF",
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? (
            <><Loader2 size={14} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={14} /> Save Template ({selectedFields.size})</>
          )}
        </button>
        <button
          onClick={onClose}
          disabled={isSaving}
          style={{
            width: "100%", padding: "8px 16px", fontSize: "13px", fontWeight: 500,
            border: "1px solid #E5ECE9", borderRadius: "8px", cursor: "pointer",
            background: "#FFFFFF", color: "#6B7A76",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
