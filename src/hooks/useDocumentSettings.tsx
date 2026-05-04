import { useState, useEffect, useCallback } from "react";
import { DEFAULT_DOCUMENT_SETTINGS } from "../types/document-settings";
import type { DocumentSettings } from "../types/document-settings";
import { API_BASE_URL } from "../utils/api-config";
import { publicAnonKey } from "../utils/supabase/info";

const HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` };

export function useDocumentSettings() {
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_DOCUMENT_SETTINGS);

  useEffect(() => {
    fetch(`${API_BASE_URL}/document-settings`, { headers: HEADERS })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings({ ...DEFAULT_DOCUMENT_SETTINGS, ...json.data });
        }
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<DocumentSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      fetch(`${API_BASE_URL}/document-settings`, {
        method: "PUT",
        headers: HEADERS,
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
