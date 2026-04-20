import { useState, useCallback } from "react";
import type { MasterTemplate } from "../types/master-template";

const STORAGE_KEY = "neuron:masterTemplates";

function loadTemplates(): MasterTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persist(templates: MasterTemplate[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); } catch {}
}

export function useMasterTemplates() {
  const [templates, setTemplates] = useState<MasterTemplate[]>(loadTemplates);

  const save = useCallback((template: MasterTemplate) => {
    setTemplates((prev) => {
      const existing = prev.findIndex((t) => t.id === template.id);
      const next = existing >= 0
        ? prev.map((t) => t.id === template.id ? template : t)
        : [...prev, template];
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const getById = useCallback((id: string) => {
    return loadTemplates().find((t) => t.id === id) ?? null;
  }, []);

  return { templates, save, remove, getById };
}
