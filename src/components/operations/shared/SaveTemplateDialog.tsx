import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Loader2, Save } from "lucide-react";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { toast } from "../../ui/toast-utils";
import type { TemplateDocType } from "../../../types/document-templates";
import { DOC_TYPE_LABELS } from "../../../types/document-templates";
import { BOOKING_SPECIFIC_FIELDS, extractTemplatableFields } from "../../../constants/template-excluded-fields";

interface SaveTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  docType: TemplateDocType;
  docData: Record<string, any>;
  clientId?: string;
  clientName?: string;
  currentUser?: { name: string } | null;
}

export function SaveTemplateDialog({
  open,
  onClose,
  onSaved,
  docType,
  docData,
  clientId,
  clientName,
  currentUser,
}: SaveTemplateDialogProps) {
  const [templateName, setTemplateName] = useState(
    `${clientName || "Global"} - ${DOC_TYPE_LABELS[docType]}`
  );
  const [isSaving, setIsSaving] = useState(false);

  // Compute templatable fields from the document data
  const templatableFields = extractTemplatableFields(docType, docData);
  const fieldKeys = Object.keys(templatableFields);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(fieldKeys));

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  // Format field key for display (camelCase -> "Camel Case")
  const formatLabel = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: "520px" }}>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save reusable fields from this {DOC_TYPE_LABELS[docType]} as a template.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
          {/* Template name */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#12332B", marginBottom: "6px" }}>
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Japan - Cacao Beans"
              style={{
                width: "100%", padding: "10px 14px", border: "1px solid #E5ECE9",
                borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Client info */}
          <div style={{ fontSize: "13px", color: "#6B7A76" }}>
            Client: <span style={{ fontWeight: 500, color: "#12332B" }}>{clientName || "None (Global template)"}</span>
          </div>

          {/* Field checklist */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}>
                Fields to include ({selectedFields.size}/{fieldKeys.length})
              </label>
              <button
                onClick={() => {
                  if (selectedFields.size === fieldKeys.length) setSelectedFields(new Set());
                  else setSelectedFields(new Set(fieldKeys));
                }}
                style={{ fontSize: "12px", color: "#237F66", cursor: "pointer", border: "none", background: "none", fontWeight: 500 }}
              >
                {selectedFields.size === fieldKeys.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div style={{
              maxHeight: "240px", overflowY: "auto", border: "1px solid #E5ECE9",
              borderRadius: "8px", padding: "4px",
            }}>
              {fieldKeys.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
                  No templatable fields with values found.
                </div>
              ) : (
                fieldKeys.map((key) => (
                  <label
                    key={key}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
                      backgroundColor: selectedFields.has(key) ? "#F0FAF7" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.has(key)}
                      onChange={() => toggleField(key)}
                      style={{ accentColor: "#237F66" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#12332B" }}>
                        {formatLabel(key)}
                      </div>
                      <div style={{
                        fontSize: "12px", color: "#6B7A76", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {String(templatableFields[key])}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedFields.size === 0}>
            {isSaving ? (
              <><Loader2 size={14} className="animate-spin" style={{ marginRight: "6px" }} /> Saving...</>
            ) : (
              <><Save size={14} style={{ marginRight: "6px" }} /> Save Template</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
