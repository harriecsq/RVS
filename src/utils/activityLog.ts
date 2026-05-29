import { API_BASE_URL } from "./api-config";
import { publicAnonKey } from "./supabase/info";
import { labelFor, sectionFor, formatFieldValue } from "./fieldLabels";

// Shape the detail-screen ActivityTimeline expects.
export interface UIActivityEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: "field_updated" | "created" | "note_added";
  fieldName?: string;
  section?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

// Matches ITEM_SEP in the server middleware — splits a line-item/segment
// context label from the field key, e.g. `MANILAdomesticFreight`.
const ITEM_SEP = "";

const parseJSON = (v: string | null): Record<string, unknown> | null => {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
};

// Flattens server activity_log rows into per-field timeline entries.
export function mapActivityRows(rows: any[]): UIActivityEntry[] {
  const out: UIActivityEntry[] = [];
  for (const r of rows) {
    const ts = new Date(r.timestamp);
    const user = r.user_name || "Unknown";
    if (r.action_type === "updated") {
      const oldV = parseJSON(r.old_value) ?? {};
      const newV = parseJSON(r.new_value) ?? {};
      const fields = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
      if (fields.size === 0) {
        out.push({ id: r.id, timestamp: ts, user, action: "note_added", note: "Updated" });
      } else {
        for (const f of fields) {
          const sepIdx = f.indexOf(ITEM_SEP);
          const context = sepIdx >= 0 ? f.slice(0, sepIdx) : undefined;
          const fieldKey = sepIdx >= 0 ? f.slice(sepIdx + 1) : f;
          out.push({
            id: `${r.id}:${f}`, timestamp: ts, user, action: "field_updated",
            fieldName: labelFor(fieldKey),
            section: context ?? sectionFor(fieldKey),
            oldValue: formatFieldValue(fieldKey, oldV[f]),
            newValue: formatFieldValue(fieldKey, newV[f]),
          });
        }
      }
    } else if (r.action_type === "created") {
      out.push({ id: r.id, timestamp: ts, user, action: "created" });
    } else if (r.action_type === "deleted") {
      out.push({ id: r.id, timestamp: ts, user, action: "note_added", note: "Deleted" });
    }
  }
  return out;
}

// Fetches the activity history for a single entity, mapped for the timeline.
export async function fetchEntityActivity(entityType: string, entityId: string): Promise<UIActivityEntry[]> {
  if (!entityId) return [];
  const params = new URLSearchParams({ entity_type: entityType, entity_id: entityId, limit: "100" });
  try {
    const res = await fetch(`${API_BASE_URL}/activity-log?${params}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    const json = await res.json();
    if (!json?.success) return [];
    return mapActivityRows(json.data ?? []);
  } catch {
    return [];
  }
}

// Pulls every id-like string off a record (id, *Id, *Number) so a multi-id
// activity query matches whichever form the server stored as entity_id.
export function collectEntityIds(rec: any): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(rec ?? {})) {
    if (typeof v === "string" && v && (k === "id" || /Id$/.test(k) || /[Nn]umber$/.test(k))) out.push(v);
  }
  return out;
}

// Aggregates activity across many entities of one type (e.g. all trucking
// records linked to a booking). Used by list tabs.
export async function fetchActivityForIds(entityType: string, ids: string[]): Promise<UIActivityEntry[]> {
  const clean = Array.from(new Set(ids.filter(Boolean).map(String)));
  if (clean.length === 0) return [];
  const params = new URLSearchParams({ entity_type: entityType, limit: "200" });
  for (const id of clean) params.append("entity_ids", id);
  try {
    const res = await fetch(`${API_BASE_URL}/activity-log?${params}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    const json = await res.json();
    if (!json?.success) return [];
    return mapActivityRows(json.data ?? []);
  } catch {
    return [];
  }
}
