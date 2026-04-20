import { useState, useEffect, useCallback, useRef } from "react";
import { publicAnonKey } from "../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";

type CacheEntry = { data: any; timestamp: number };
const globalCache: Map<string, CacheEntry> =
  ((window as any).__neuronCache = (window as any).__neuronCache || new Map());
const cache = globalCache;
const inflight = new Map<string, Promise<any>>();

const STALE_MS = 30_000;

export function invalidateCache(path?: string) {
  if (path) {
    cache.delete(path);
  } else {
    cache.clear();
  }
}

async function fetchJSON(path: string): Promise<any> {
  const existing = inflight.get(path);
  if (existing) return existing;

  const promise = fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
  })
    .then((r) => r.json())
    .then((result) => {
      cache.set(path, { data: result, timestamp: Date.now() });
      inflight.delete(path);
      return result;
    })
    .catch((err) => {
      inflight.delete(path);
      throw err;
    });

  inflight.set(path, promise);
  return promise;
}

export function useCachedFetch<T = any>(path: string) {
  const cached = cache.get(path);
  const [data, setData] = useState<T | null>(cached ? cached.data : null);
  const [isLoading, setIsLoading] = useState(!cached);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    try {
      const result = await fetchJSON(path);
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
      }
      return result;
    } catch {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    const entry = cache.get(path);
    const isStale = !entry || Date.now() - entry.timestamp > STALE_MS;
    if (entry) {
      setData(entry.data);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    if (isStale) refetch();
  }, [path, refetch]);

  return { data, isLoading, refetch };
}
