import { useState, useEffect, useCallback } from "react";
import { publicAnonKey } from "../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import type { DocumentTemplateSummary, TemplateDocType } from "../types/document-templates";

/**
 * Prefetches document templates for a given docType on mount.
 * Returns the template list and a helper to fetch a single template's full fields.
 */
export function useDocTemplates(docType: TemplateDocType, clientId?: string) {
  const [templates, setTemplates] = useState<DocumentTemplateSummary[]>([]);

  useEffect(() => {
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
        }
      })
      .catch(() => {});
  }, [docType, clientId]);

  const fetchTemplateFields = useCallback(async (templateId: string): Promise<Record<string, any> | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/doc-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      return result.success ? result.data?.fields || null : null;
    } catch {
      return null;
    }
  }, []);

  return { templates, fetchTemplateFields };
}
