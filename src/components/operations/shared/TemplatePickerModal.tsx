import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { FileText, Loader2, Trash2, Search } from "lucide-react";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import type { DocumentTemplateSummary, TemplateDocType } from "../../../types/document-templates";
import { DOC_TYPE_LABELS } from "../../../types/document-templates";

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string | null) => void; // null = start blank
  clientId?: string;
  docType: TemplateDocType;
}

export function TemplatePickerModal({
  open,
  onClose,
  onSelect,
  clientId,
  docType,
}: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<DocumentTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Reset search when modal opens
  useEffect(() => {
    if (open) { setSearch(""); }
  }, [open]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q) || (t.clientName || "").toLowerCase().includes(q));
  }, [templates, search]);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);

    // Fetch ALL templates for this docType (show client-matching ones first, then others)
    const params = new URLSearchParams({ docType });
    fetch(`${API_BASE_URL}/doc-templates?${params}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const all: DocumentTemplateSummary[] = res.data || [];
          // Sort: matching client first, then global, then others
          all.sort((a, b) => {
            const aMatch = a.clientId === clientId ? 0 : !a.clientId ? 1 : 2;
            const bMatch = b.clientId === clientId ? 0 : !b.clientId ? 1 : 2;
            return aMatch - bMatch;
          });
          setTemplates(all);
        } else {
          setTemplates([]);
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setIsLoading(false));
  }, [open, clientId, docType]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    try {
      await fetch(`${API_BASE_URL}/doc-templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Error deleting template:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: "600px", width: "100%" }}>
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Select a saved template for {DOC_TYPE_LABELS[docType]} or start blank.
          </DialogDescription>
        </DialogHeader>

        {/* Start Blank option — always visible at top */}
        {!isLoading && (
          <button
            onClick={() => onSelect(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              border: "1px dashed #D1D5DB",
              borderRadius: "8px",
              background: "#FAFAFA",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              marginTop: "8px",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#237F66")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
          >
            <FileText size={18} style={{ color: "#D1D5DB", flexShrink: 0 }} />
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#6B7A76" }}>
              Start Blank
            </div>
          </button>
        )}

        {/* Search */}
        {!isLoading && templates.length > 0 && (
          <div style={{ position: "relative", marginTop: "8px" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px", maxHeight: "360px", overflowY: "auto" }}>
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px", color: "#9CA3AF" }}>
              <Loader2 size={20} className="animate-spin" style={{ marginRight: "8px" }} />
              Loading templates...
            </div>
          ) : (
            <>
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
                    gap: "12px",
                    padding: "12px 16px",
                    border: "1px solid #E5ECE9",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#237F66")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5ECE9")}
                >
                  <FileText size={18} style={{ color: "#237F66", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                      {tpl.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6B7A76", marginTop: "2px" }}>
                      {tpl.clientName || "Global template"} · Updated{" "}
                      {new Date(tpl.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(tpl.id, e)}
                    disabled={deletingId === tpl.id}
                    style={{
                      padding: "4px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#9CA3AF",
                      flexShrink: 0,
                    }}
                    title="Delete template"
                  >
                    {deletingId === tpl.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </button>
              ))}
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
