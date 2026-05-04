import { useState, useEffect, useCallback, useRef } from "react";
import type { MasterTemplate } from "../types/master-template";
import { API_BASE_URL } from "../utils/api-config";
import { publicAnonKey } from "../utils/supabase/info";

const HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` };

// Module-level cache so all hook instances share one fetch
let cache: MasterTemplate[] | null = null;
let inflightPromise: Promise<MasterTemplate[]> | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

async function fetchTemplates(): Promise<MasterTemplate[]> {
  if (cache !== null) return cache;
  if (inflightPromise) return inflightPromise;
  inflightPromise = fetch(`${API_BASE_URL}/master-templates`, { headers: HEADERS })
    .then((res) => res.json())
    .then((json) => {
      cache = json.success ? json.data : [];
      inflightPromise = null;
      notify();
      return cache!;
    });
  return inflightPromise;
}

async function persistTemplates(templates: MasterTemplate[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/master-templates`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(templates),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to save templates");
}

export function useMasterTemplates() {
  const [templates, setTemplates] = useState<MasterTemplate[]>(cache ?? []);
  const [isLoading, setIsLoading] = useState(cache === null);
  const templatesRef = useRef<MasterTemplate[]>(cache ?? []);

  useEffect(() => {
    if (cache !== null) {
      setTemplates(cache);
      templatesRef.current = cache;
      setIsLoading(false);
      return;
    }
    const refresh = () => {
      if (cache !== null) {
        setTemplates(cache);
        templatesRef.current = cache;
        setIsLoading(false);
      }
    };
    subscribers.add(refresh);
    fetchTemplates();
    return () => { subscribers.delete(refresh); };
  }, []);

  const save = useCallback(async (template: MasterTemplate): Promise<void> => {
    const existing = templatesRef.current.findIndex((t) => t.id === template.id);
    const next = existing >= 0
      ? templatesRef.current.map((t) => t.id === template.id ? template : t)
      : [...templatesRef.current, template];
    cache = next;
    templatesRef.current = next;
    setTemplates(next);
    notify();
    await persistTemplates(next);
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const next = templatesRef.current.filter((t) => t.id !== id);
    cache = next;
    templatesRef.current = next;
    setTemplates(next);
    notify();
    await persistTemplates(next);
  }, []);

  const getById = useCallback((id: string) => {
    return templatesRef.current.find((t) => t.id === id) ?? null;
  }, []);

  return { templates, isLoading, save, remove, getById };
}
