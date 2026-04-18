import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Loader2, FileText, Save, Search } from "lucide-react";
import { Button } from "../../ui/button";
import { toast } from "../../ui/toast-utils";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { CompanyContactSelector } from "../../selectors/CompanyContactSelector";
import { TemplateEditorForm } from "./TemplateEditorForm";
import type { DocumentTemplate, DocumentTemplateSummary, TemplateDocType } from "../../../types/document-templates";
import { DOC_TYPE_LABELS } from "../../../types/document-templates";
import type { Client } from "../../../types/operations";

const ALL_DOC_TYPES: TemplateDocType[] = [
  "salesContract", "commercialInvoice", "packingList",
  "declaration", "formE", "fsi",
];

interface TemplateManagementViewProps {
  onBack: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function TemplateManagementView({ onBack, currentUser }: TemplateManagementViewProps) {
  // List state
  const [templates, setTemplates] = useState<DocumentTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDocType, setFilterDocType] = useState<TemplateDocType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Editor state
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDocType, setNewDocType] = useState<TemplateDocType>("salesContract");
  const [newClientId, setNewClientId] = useState<string | undefined>();
  const [newClientName, setNewClientName] = useState<string | undefined>();
  const [newFields, setNewFields] = useState<Record<string, any>>({});

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDocType !== "all") params.set("docType", filterDocType);
      const res = await fetch(`${API_BASE_URL}/doc-templates?${params}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      setTemplates(result.success ? result.data || [] : []);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterDocType]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleOpenTemplate = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/doc-templates/${id}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success) {
        setEditingTemplate(result.data);
        setIsCreating(false);
      }
    } catch (err) {
      toast.error("Failed to load template");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      await fetch(`${API_BASE_URL}/doc-templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editingTemplate?.id === id) setEditingTemplate(null);
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/doc-templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingTemplate.name,
          fields: editingTemplate.fields,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Template updated");
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setNewName("");
    setNewDocType("salesContract");
    setNewClientId(undefined);
    setNewClientName(undefined);
    setNewFields({});
  };

  const handleSaveNew = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/doc-templates`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: newClientId || null,
          clientName: newClientName || null,
          docType: newDocType,
          name: newName.trim(),
          fields: newFields,
          createdBy: currentUser?.name || "Unknown",
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Template created");
        setIsCreating(false);
        fetchTemplates();
      } else {
        toast.error(result.error || "Failed to create");
      }
    } catch {
      toast.error("Failed to create template");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.clientName || "").toLowerCase().includes(q) ||
        DOC_TYPE_LABELS[t.docType].toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Editing/Creating view ──────────────────────────────────────────
  if (editingTemplate || isCreating) {
    const docType = isCreating ? newDocType : editingTemplate!.docType;
    const fields = isCreating ? newFields : editingTemplate!.fields;
    const name = isCreating ? newName : editingTemplate!.name;

    return (
      <div style={{ padding: "32px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button
            onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
            style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#6B7A76" }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#12332B", margin: 0 }}>
            {isCreating ? "Create Template" : "Edit Template"}
          </h2>
        </div>

        {/* Meta fields */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E9F0", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  if (isCreating) setNewName(e.target.value);
                  else setEditingTemplate((prev) => prev ? { ...prev, name: e.target.value } : prev);
                }}
                placeholder="e.g. Japan - Cacao Beans"
                style={{
                  width: "100%", padding: "10px 14px", border: "1px solid #E5ECE9",
                  borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {isCreating ? (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>Document Type</label>
                <select
                  value={newDocType}
                  onChange={(e) => { setNewDocType(e.target.value as TemplateDocType); setNewFields({}); }}
                  style={{
                    width: "100%", padding: "10px 14px", border: "1px solid #E5ECE9",
                    borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                    background: "white",
                  }}
                >
                  {ALL_DOC_TYPES.map((dt) => (
                    <option key={dt} value={dt}>{DOC_TYPE_LABELS[dt]}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>Document Type</label>
                <div style={{ padding: "10px 14px", fontSize: "14px", color: "#12332B", background: "#F9FAFB", borderRadius: "8px", border: "1px solid #E5ECE9" }}>
                  {DOC_TYPE_LABELS[editingTemplate!.docType]}
                </div>
              </div>
            )}
          </div>

          {/* Client selector (create only) */}
          {isCreating && (
            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>
                Client <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span>
              </label>
              <CompanyContactSelector
                companyId={newClientId}
                onSelect={({ company }) => {
                  setNewClientId(company?.id);
                  setNewClientName(company?.name || company?.company_name);
                }}
                showContact={true}
                showLabels={false}
              />
            </div>
          )}

          {!isCreating && editingTemplate?.clientName && (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#6B7A76" }}>
              Client: <span style={{ fontWeight: 500, color: "#12332B" }}>{editingTemplate.clientName}</span>
            </div>
          )}
        </div>

        {/* Field editor */}
        <TemplateEditorForm
          docType={docType}
          fields={fields}
          onChange={(f) => {
            if (isCreating) setNewFields(f);
            else setEditingTemplate((prev) => prev ? { ...prev, fields: f } : prev);
          }}
        />

        {/* Save / Cancel */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px", paddingBottom: "32px" }}>
          <Button variant="outline" onClick={() => { setEditingTemplate(null); setIsCreating(false); }} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={isCreating ? handleSaveNew : handleSaveEdit} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 size={14} className="animate-spin" style={{ marginRight: "6px" }} /> Saving...</>
            ) : (
              <><Save size={14} style={{ marginRight: "6px" }} /> {isCreating ? "Create Template" : "Save Changes"}</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onBack}
            style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#6B7A76" }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#12332B", margin: 0 }}>Document Templates</h2>
        </div>
        <Button onClick={handleStartCreate}>
          <Plus size={14} style={{ marginRight: "6px" }} /> Create Template
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            style={{
              width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #E5ECE9",
              borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Doc type filter tabs */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <FilterTab label="All" active={filterDocType === "all"} onClick={() => setFilterDocType("all")} />
          {ALL_DOC_TYPES.map((dt) => (
            <FilterTab
              key={dt}
              label={DOC_TYPE_LABELS[dt]}
              active={filterDocType === dt}
              onClick={() => setFilterDocType(dt)}
            />
          ))}
        </div>
      </div>

      {/* Template list */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#9CA3AF" }}>
          <Loader2 size={20} className="animate-spin" style={{ marginRight: "8px" }} /> Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px" }}>
          <FileText size={36} style={{ color: "#D1D5DB", marginBottom: "12px" }} />
          <p style={{ fontSize: "14px", color: "#6B7A76", margin: 0 }}>
            {templates.length === 0 ? "No templates yet. Create one to get started." : "No templates match your filters."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleOpenTemplate(tpl.id)}
              style={{
                display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px",
                border: "1px solid #E5ECE9", borderRadius: "10px", background: "white",
                cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#237F66")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5ECE9")}
            >
              <FileText size={20} style={{ color: "#237F66", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>{tpl.name}</div>
                <div style={{ fontSize: "12px", color: "#6B7A76", marginTop: "2px", display: "flex", gap: "8px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "4px", background: "#E8F2EE",
                    color: "#237F66", fontSize: "11px", fontWeight: 500,
                  }}>
                    {DOC_TYPE_LABELS[tpl.docType]}
                  </span>
                  <span>{tpl.clientName || "Global"}</span>
                  <span>· Updated {new Date(tpl.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(tpl.id, e)}
                style={{ padding: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF" }}
                title="Delete template"
              >
                <Trash2 size={16} />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter tab pill ────────────────────────────────────────────────

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
        border: "1px solid", cursor: "pointer", whiteSpace: "nowrap",
        borderColor: active ? "#237F66" : "#E5ECE9",
        background: active ? "#E8F2EE" : "white",
        color: active ? "#237F66" : "#6B7A76",
      }}
    >
      {label}
    </button>
  );
}
