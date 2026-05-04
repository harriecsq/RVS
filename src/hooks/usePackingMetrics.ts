import { useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/api-config";
import { publicAnonKey } from "../utils/supabase/info";

const DEFAULT_METRICS = ["Sacks", "Bags", "Boxes", "Cartons", "Drums", "Pallets"];
const HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` };

async function fetchMetrics(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/packing-list-metrics`, { headers: HEADERS });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : DEFAULT_METRICS;
  } catch {
    return DEFAULT_METRICS;
  }
}

async function persistMetrics(metrics: string[]): Promise<void> {
  await fetch(`${API_BASE_URL}/packing-list-metrics`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(metrics),
  });
}

export function usePackingMetrics() {
  const [options, setOptions] = useState<string[]>(DEFAULT_METRICS);

  useEffect(() => {
    fetchMetrics().then(setOptions);
  }, []);

  const addMetric = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed || options.some((o) => o.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = [...options, trimmed];
    setOptions(updated);
    await persistMetrics(updated);
  };

  return { options, addMetric };
}
