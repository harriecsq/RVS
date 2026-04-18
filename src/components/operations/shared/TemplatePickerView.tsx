import { useState, useMemo } from "react";
import { FileText, ArrowLeft, Search } from "lucide-react";
import type { DocumentTemplateSummary, TemplateDocType } from "../../../types/document-templates";
import { DOC_TYPE_LABELS } from "../../../types/document-templates";

interface TemplatePickerViewProps {
  onSelect: (templateId: string | null) => void; // null = start blank
  onCancel: () => void;
  templates: DocumentTemplateSummary[];
  docType: TemplateDocType;
}

export function TemplatePickerView({
  onSelect,
  onCancel,
  templates,
  docType,
}: TemplatePickerViewProps) {
  const [search, setSearch] = useState("");

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q) || (t.clientName || "").toLowerCase().includes(q));
  }, [templates, search]);

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <button
          onClick={onCancel}
          style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#6B7A76" }}
        >
          <ArrowLeft size={18} />
        </button>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#12332B" }}>
          Choose a Template
        </h3>
      </div>
      <p style={{ fontSize: "13px", color: "#6B7A76", margin: "0 0 24px 30px" }}>
        Select a saved template for {DOC_TYPE_LABELS[docType]} or start with a blank document.
      </p>

      {/* Start Blank option — always visible at top */}
      <button
        onClick={() => onSelect(null)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "16px 20px",
          border: "1px dashed #D1D5DB",
          borderRadius: "10px",
          background: "#FAFAFA",
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          marginBottom: "16px",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#237F66"; e.currentTarget.style.background = "#F0FAF7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.background = "#FAFAFA"; }}
      >
        <FileText size={20} style={{ color: "#D1D5DB", flexShrink: 0 }} />
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#6B7A76" }}>
          Start Blank
        </div>
      </button>

      {/* Search */}
      {templates.length > 0 && (
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              fontSize: "13px",
              border: "1px solid #E5ECE9",
              borderRadius: "8px",
              outline: "none",
              color: "#12332B",
              background: "#FFFFFF",
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {templates.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
            No saved templates yet. Start blank or save a template after creating a document.
          </div>
        )}
        {filteredTemplates.length === 0 && templates.length > 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
            No templates match your search.
          </div>
        )}
        {filteredTemplates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "16px 20px",
              border: "1px solid #E5ECE9",
              borderRadius: "10px",
              background: "#FFFFFF",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#237F66"; e.currentTarget.style.background = "#F0FAF7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E5ECE9"; e.currentTarget.style.background = "#FFFFFF"; }}
          >
            <FileText size={20} style={{ color: "#237F66", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                {tpl.name}
              </div>
              <div style={{ fontSize: "12px", color: "#6B7A76", marginTop: "3px" }}>
                {tpl.clientName || "Global template"} · Updated{" "}
                {new Date(tpl.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
