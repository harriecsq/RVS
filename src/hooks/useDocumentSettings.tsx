import { useState, useCallback } from "react";
import { DEFAULT_DOCUMENT_SETTINGS } from "../types/document-settings";
import type { DocumentSettings } from "../types/document-settings";

const STORAGE_KEY = "neuron:documentSettings";

function loadSettings(): DocumentSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_DOCUMENT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_DOCUMENT_SETTINGS;
}

export function useDocumentSettings() {
  const [settings, setSettings] = useState<DocumentSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<DocumentSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
