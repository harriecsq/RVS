// server-v2 — SQL-backed Hono server for the new relational schema.
// Deployed to the new project (mwfekmiyuiknmahflvom) as function name `server-v2`.
// Built domain-by-domain. Currently implements: foundations only
// (users, clients, contacts, activity-log, next-ref, app_settings singletons).
// Booking/accounting routes return 501.
//
// At cutover, frontend changes:
//   - src/utils/supabase/info.tsx           → new projectId + anonKey
//   - src/utils/api-config.ts               → API_BASE_URL path /server-v2 instead of /make-server-ce0d67b8

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ============================================================================
// supabase client
// ============================================================================
let _db: ReturnType<typeof createClient> | null = null;
const db = () => {
  if (!_db) {
    _db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _db;
};

const ok = (data: unknown, extra: Record<string, unknown> = {}) => ({ success: true, data, ...extra });
const fail = (message: string, code = 400) => ({ success: false, error: message, _code: code });

// Defensive UUID coercion: the frontend sometimes sends "", "Unknown", or other
// non-UUID strings into UUID fields. Postgres rejects these; we coerce to null.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: unknown): string | null =>
  typeof v === "string" && UUID_RE.test(v) ? v : null;

// Resolve an /:id route param to the actual UUID by checking either the
// surrogate `id` column or the public ref-number column. Lets the frontend
// pass either form transparently.
async function resolveRowId(table: string, refColumn: string, idOrRef: string): Promise<string | null> {
  if (UUID_RE.test(idOrRef)) return idOrRef;
  const { data } = await db().from(table).select("id").eq(refColumn, idOrRef).maybeSingle();
  return (data as any)?.id ?? null;
}

const route = new Hono().basePath("/server-v2");

// ============================================================================
// activity-log middleware — auto-records every successful write (POST/PUT/
// DELETE). User identity comes from X-User-* headers stamped by the frontend
// fetch interceptor (the server is otherwise stateless / blind to the caller).
// Best-effort: logging failures never break the underlying request.
// ============================================================================
const ACTION_BY_METHOD: Record<string, string> = {
  POST: "created",
  PUT: "updated",
  PATCH: "updated",
  DELETE: "deleted",
};

// Top-level resources whose path segment maps cleanly to one DB table with an
// `id` PK. Only these get before/after field diffs; everything else (nested
// sub-resources, singleton settings) is logged action-only.
const PATH_TO_TABLE: Record<string, string> = {
  clients: "clients",
  contacts: "contacts",
  expenses: "expenses",
  vouchers: "vouchers",
  billings: "billings",
  collections: "collections",
  payees: "payees",
  "trucking-bookings": "trucking_bookings",
  "trucking-legs": "trucking_legs",
  "trucking-records": "trucking_records",
  "export-bookings": "bookings",
  "import-bookings": "bookings",
};

// Path :id refers to this column when snapshotting the row. Defaults to "id";
// bookings are addressed by their human reference (booking_number).
const LOOKUP_COLUMN: Record<string, string> = {
  "export-bookings": "booking_number",
  "import-bookings": "booking_number",
};

const SKIP_DIFF_KEYS = new Set(["created_at", "updated_at"]);
const MAX_VALUE_LEN = 2000;

const truncJSON = (obj: unknown): string | null => {
  if (obj == null) return null;
  const s = JSON.stringify(obj);
  if (!s || s === "{}") return null;
  return s.length > MAX_VALUE_LEN ? s.slice(0, MAX_VALUE_LEN) + "…(truncated)" : s;
};

const diffRows = (oldRow: any, newRow: any) => {
  const oldOut: Record<string, unknown> = {};
  const newOut: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(oldRow ?? {}), ...Object.keys(newRow ?? {})]);
  for (const k of keys) {
    if (SKIP_DIFF_KEYS.has(k)) continue;
    const a = oldRow?.[k];
    const b = newRow?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      oldOut[k] = a ?? null;
      newOut[k] = b ?? null;
    }
  }
  return { oldOut, newOut };
};

// Separator between an item/segment context label and the field key in a
// flattened diff key, e.g. `MANILA<US>domesticFreight`. ASCII Unit Separator —
// never appears in field keys or human labels, so the frontend can split safely.
const ITEM_SEP = "";

// Columns never worth surfacing as a changed "field".
const FLATTEN_SKIP = new Set(["id", "created_at", "updated_at", "data", "position", "leg_order"]);

// Flatten one DB row into { ...scalar columns, ...data } so jsonb passthrough
// fields diff individually instead of as one opaque `data` blob.
const flattenRow = (row: any): Record<string, unknown> => {
  if (!row) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (FLATTEN_SKIP.has(k)) continue;
    out[k] = v;
  }
  Object.assign(out, (row.data && typeof row.data === "object") ? row.data : {});
  return out;
};

// Parent table → line-item child table, its FK column, and the fields to try
// for a human item label. Lets edits to line items show up as per-item diffs.
const CHILD_SPEC: Record<string, { table: string; fk: string; labelKeys: string[]; word: string }> = {
  bookings:  { table: "booking_segments",   fk: "booking_id",  labelKeys: ["province", "origin", "destination"], word: "Leg" },
  billings:  { table: "billing_particulars", fk: "billing_id",  labelKeys: ["description", "particular", "name"], word: "Item" },
  expenses:  { table: "expense_particulars", fk: "expense_id",  labelKeys: ["description", "particular", "name"], word: "Item" },
  vouchers:  { table: "voucher_line_items",  fk: "voucher_id",  labelKeys: ["description", "particular", "name"], word: "Item" },
};

const itemLabel = (row: any, keys: string[], word: string, index: number): string => {
  for (const k of keys) {
    const v = row?.[k] ?? row?.data?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return `${word} ${index + 1}`;
};

// Build a flat field map for an entity: its own fields plus every line-item
// child's fields, child keys prefixed with the item label + ITEM_SEP.
async function snapshotEntity(table: string, lookupCol: string, idValue: string): Promise<{ flat: Record<string, unknown>; row: any }> {
  const { data: row } = await db().from(table).select("*").eq(lookupCol, idValue).maybeSingle();
  if (!row) return { flat: {}, row: null };
  const flat = flattenRow(row);
  const child = CHILD_SPEC[table];
  if (child) {
    const { data: kids } = await db()
      .from(child.table).select("*").eq(child.fk, (row as any).id)
      .order("created_at", { ascending: true });
    const seen: Record<string, number> = {};
    (kids ?? []).forEach((k: any, i: number) => {
      let label = itemLabel(k, child.labelKeys, child.word, i);
      if (seen[label] != null) label = `${label} #${seen[label] + 1}`;
      seen[label] = (seen[label] ?? 0) + 1;
      const kf = flattenRow(k);
      for (const [fk, fv] of Object.entries(kf)) {
        if (fk === child.fk) continue;
        flat[`${label}${ITEM_SEP}${fk}`] = fv;
      }
    });
  }
  return { flat, row };
}

route.use("*", async (c, next) => {
  const action = ACTION_BY_METHOD[c.req.method];

  // path segments after the /server-v2 base
  const segments = new URL(c.req.url).pathname.split("/").filter(Boolean);
  const baseIdx = segments.indexOf("server-v2");
  const rest = baseIdx >= 0 ? segments.slice(baseIdx + 1) : segments;
  const entityType = rest[0];
  let pathId = rest[1] ?? null;
  if (pathId) { try { pathId = decodeURIComponent(pathId); } catch { /* keep raw */ } }

  // A clean top-level CRUD route (/:resource or /:resource/:id) on a mapped table.
  const table = entityType ? PATH_TO_TABLE[entityType] : undefined;
  const lookupCol = entityType ? (LOOKUP_COLUMN[entityType] ?? "id") : "id";
  const diffable = !!action && !!table && rest.length <= 2;

  // Snapshot the "before" state (own fields + line items) for edits/deletes;
  // it changes/disappears after next() runs.
  let oldSnap: { flat: Record<string, unknown>; row: any } = { flat: {}, row: null };
  if (diffable && pathId && c.req.method !== "POST") {
    try { oldSnap = await snapshotEntity(table!, lookupCol, pathId); } catch { /* best-effort */ }
  }

  await next();

  if (!action) return;
  if (c.res.status >= 300) return;
  if (!entityType || entityType === "auth" || entityType === "activity-log") return;

  const decode = (v: string | undefined) => {
    if (!v) return null;
    try { return decodeURIComponent(v); } catch { return v; }
  };

  // Response body (used for create, and to recover the id/name).
  let resBody: any = null;
  try {
    const body = await c.res.clone().json();
    resBody = body?.data ?? body;
  } catch { /* non-JSON response */ }

  const oldRow = oldSnap.row;
  const entityId = pathId ?? (resBody?.id ? String(resBody.id) : "unknown");
  const entityName =
    resBody?.name ?? resBody?.company_name ?? resBody?.booking_number ??
    oldRow?.name ?? oldRow?.company_name ?? oldRow?.booking_number ?? oldRow?.client_name ?? null;

  let oldValue: string | null = null;
  let newValue: string | null = null;
  if (action === "updated") {
    // Deep per-field diff (own fields + line items). Skip logging no-op saves
    // and non-diffable sub-route updates that produce nothing to show.
    if (!diffable) return;
    let newSnap: { flat: Record<string, unknown>; row: any } = { flat: {}, row: null };
    try { newSnap = await snapshotEntity(table!, lookupCol, pathId!); } catch { /* best-effort */ }
    const { oldOut, newOut } = diffRows(oldSnap.flat, newSnap.flat);
    oldValue = truncJSON(oldOut);
    newValue = truncJSON(newOut);
    if (!oldValue && !newValue) return;
  }

  try {
    await db().from("activity_log").insert({
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      action_type: action,
      user_id: asUuid(c.req.header("X-User-Id") ?? null),
      user_name: decode(c.req.header("X-User-Name")),
      user_department: decode(c.req.header("X-User-Department")),
      old_value: oldValue,
      new_value: newValue,
    });
  } catch (_) {
    // best-effort logging — never surface to the caller
  }
});

// ============================================================================
// /health
// ============================================================================
route.get("/health", (c) => c.json({ status: "ok" }));

// ============================================================================
// /users  (read-only for now; writes added when admin UI is rebuilt)
// ============================================================================
route.get("/users", async (c) => {
  const department = c.req.query("department");
  const role = c.req.query("role");
  let q = db().from("users").select("*").eq("is_active", true).order("name", { ascending: true });
  if (department) q = q.eq("department", department);
  if (role) q = q.eq("role", role);
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json(ok(data ?? []));
});

// ============================================================================
// /auth/login  (beta: email-only, no password — column dropped in 0005)
// ============================================================================
route.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return c.json(fail("Invalid email or password", 401), 401);
  const { data, error } = await db()
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return c.json(fail(error.message, 500), 500);
  if (!data) return c.json(fail("Invalid email or password", 401), 401);
  return c.json(ok(data));
});

// ============================================================================
// /clients
// ============================================================================
route.get("/clients", async (c) => {
  const search = c.req.query("search");
  const industry = c.req.query("industry");
  const status = c.req.query("status");
  let q = db().from("clients").select("*").order("created_at", { ascending: false });
  if (industry) q = q.eq("industry", industry);
  if (status) q = q.eq("status", status);
  if (search) {
    const s = `%${search}%`;
    q = q.or(`name.ilike.${s},company_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json(ok(data ?? []));
});

route.get("/clients/:id", async (c) => {
  const id = c.req.param("id");
  const { data: client, error } = await db().from("clients").select("*").eq("id", id).maybeSingle();
  if (error) return c.json(fail(error.message, 500), 500);
  if (!client) return c.json(fail("Client not found", 404), 404);
  const { data: contacts } = await db()
    .from("contacts")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  // quotations: BD-scope, out of scope for the rebuild — always empty for now.
  return c.json(ok({ ...client, contacts: contacts ?? [], quotations: [] }));
});

route.post("/clients", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const payload = {
    name: body.name,
    company_name: body.company_name ?? body.name,
    client_name: body.client_name ?? null,
    industry: body.industry ?? null,
    status: body.status ?? "Prospect",
    registered_address: body.registered_address ?? null,
    address: body.address ?? null,
    lead_source: body.lead_source ?? null,
    credit_terms: body.credit_terms ?? "Net 30",
    phone: body.phone ?? null,
    email: body.email ?? null,
    notes: body.notes ?? null,
    owner_id: asUuid(body.owner_id),
    created_by: asUuid(body.created_by),
  };
  const { data, error } = await db().from("clients").insert(payload).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(data));
});

route.put("/clients/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  // strip immutable fields if frontend echoes them back
  delete body.id;
  delete body.created_at;
  // coerce UUID-typed fields so invalid strings don't break the update
  if ("owner_id" in body)   body.owner_id   = asUuid(body.owner_id);
  if ("created_by" in body) body.created_by = asUuid(body.created_by);
  const { data, error } = await db().from("clients").update(body).eq("id", id).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  if (!data) return c.json(fail("Client not found", 404), 404);
  return c.json(ok(data));
});

route.delete("/clients/:id", async (c) => {
  const id = c.req.param("id");
  const { error } = await db().from("clients").delete().eq("id", id);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true, message: "Client deleted successfully" });
});

// ============================================================================
// /contacts
// ============================================================================
route.get("/contacts", async (c) => {
  const customerId = c.req.query("customer_id");
  let q = db().from("contacts").select("*, clients:client_id(company_name, name)").order("created_at", { ascending: false });
  if (customerId) q = q.eq("client_id", customerId);
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  const enriched = (data ?? []).map((row: any) => ({
    ...row,
    customer_id: row.client_id,                                  // legacy field name kept for frontend
    company: row.company ?? row.clients?.company_name ?? row.clients?.name ?? null,
    clients: undefined,
  }));
  return c.json(ok(enriched));
});

route.get("/contacts/:id", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await db()
    .from("contacts")
    .select("*, clients:client_id(company_name, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) return c.json(fail(error.message, 500), 500);
  if (!data) return c.json(fail("Contact not found", 404), 404);
  const row = data as any;
  return c.json(ok({
    ...row,
    customer_id: row.client_id,
    company: row.company ?? row.clients?.company_name ?? row.clients?.name ?? null,
    clients: undefined,
  }));
});

route.post("/contacts", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const payload = {
    client_id: asUuid(body.customer_id ?? body.client_id),
    name: body.name ?? "",
    title: body.title ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    lifecycle_stage: body.lifecycle_stage ?? "Lead",
    lead_status: body.lead_status ?? "New",
    status: body.status ?? "Lead",
    notes: body.notes ?? null,
    created_by: asUuid(body.created_by),
    last_activity: new Date().toISOString(),
  };
  const { data, error } = await db().from("contacts").insert(payload).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  const row = data as any;
  return c.json(ok({ ...row, customer_id: row.client_id }));
});

route.put("/contacts/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  delete body.id;
  delete body.created_at;
  delete body.updated_at;
  if (body.customer_id !== undefined) {
    body.client_id = asUuid(body.customer_id);
    delete body.customer_id;
  } else if ("client_id" in body) {
    body.client_id = asUuid(body.client_id);
  }
  if ("created_by" in body) body.created_by = asUuid(body.created_by);
  delete body.clients;
  delete body.company_name;
  const { data, error } = await db().from("contacts").update(body).eq("id", id).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  if (!data) return c.json(fail("Contact not found", 404), 404);
  const row = data as any;
  return c.json(ok({ ...row, customer_id: row.client_id }));
});

route.delete("/contacts/:id", async (c) => {
  const id = c.req.param("id");
  const { error } = await db().from("contacts").delete().eq("id", id);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true, message: "Contact deleted successfully" });
});

// ============================================================================
// /activity-log
// ============================================================================
route.get("/activity-log", async (c) => {
  // RBAC disabled for beta — every account can read the full activity log.
  const entityType = c.req.query("entity_type");
  const entityId = c.req.query("entity_id");
  // Multi-id aggregation (list tabs): repeated ?entity_ids= or a single CSV.
  const entityIds = (c.req.queries("entity_ids") ?? [])
    .flatMap((p) => p.split(",")).map((s) => s.trim()).filter(Boolean);
  const actionType = c.req.query("action_type");
  const userId = c.req.query("user_id");
  const dateFrom = c.req.query("date_from");
  const dateTo = c.req.query("date_to");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 500);
  const offset = Number(c.req.query("offset") ?? 0);

  let q = db().from("activity_log").select("*", { count: "exact" }).order("timestamp", { ascending: false });
  if (entityType) q = q.eq("entity_type", entityType);
  if (entityIds.length) q = q.in("entity_id", entityIds);
  else if (entityId) q = q.eq("entity_id", entityId);
  if (actionType) q = q.eq("action_type", actionType);
  if (userId) q = q.eq("user_id", userId);
  if (dateFrom) q = q.gte("timestamp", dateFrom);
  if (dateTo) {
    // end-of-day inclusive
    const eod = new Date(dateTo);
    eod.setUTCHours(23, 59, 59, 999);
    q = q.lte("timestamp", eod.toISOString());
  }
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json({ success: true, data: data ?? [], total: count ?? 0, limit, offset });
});

// ============================================================================
// /next-ref/:type
//   Peek at the next sequential number for a given counter scope.
//   Does NOT increment — the actual create endpoints (added per domain) will.
// ============================================================================
async function peekCounter(scope: string, year: number): Promise<number> {
  const { data } = await db()
    .from("id_counters")
    .select("value")
    .eq("scope", scope)
    .eq("year", year)
    .maybeSingle();
  return ((data?.value as number) ?? 0) + 1;
}

route.get("/next-ref/:type", async (c) => {
  const type = c.req.param("type");
  const companyCode = c.req.query("companyCode") ?? "RVS";
  const voucherType = c.req.query("voucherType") ?? "CV";
  const year = Number(c.req.query("year") ?? new Date().getFullYear());
  if (type === "voucher") {
    const nextNumber = await nextVoucherSeq(companyCode, voucherType, year);
    return c.json({ success: true, nextNumber });
  }
  // Billing and collection peek from the actual table so deletes don't leave the counter stale.
  if (type === "billing") {
    const { data: rows } = await db()
      .from("billings").select("billing_number")
      .eq("billing_company_code", companyCode).eq("billing_year", year);
    let max = 0;
    for (const r of (rows ?? []) as any[]) {
      const n = parseInt(((r.billing_number as string) || "").split("-").pop() ?? "0", 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return c.json({ success: true, nextNumber: max + 1 });
  }
  if (type === "collection") {
    const { data: rows } = await db()
      .from("collections").select("collection_number")
      .ilike("collection_number", `COL ${year}-%`);
    let max = 0;
    for (const r of (rows ?? []) as any[]) {
      const n = parseInt(((r.collection_number as string) || "").split("-").pop() ?? "0", 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return c.json({ success: true, nextNumber: max + 1 });
  }

  let scope: string;
  const counterYear = year;
  const movement = (c.req.query("movement") ?? "").toLowerCase();
  switch (type) {
    case "import":          scope = "booking:Import"; break;
    case "export":          scope = "booking:Export"; break;
    case "trucking":
      if (movement !== "import" && movement !== "export")
        return c.json(fail("movement query param must be 'import' or 'export' for trucking", 400), 400);
      scope = movement === "import" ? "trucking:Import" : "trucking:Export";
      break;
    case "export-document": scope = `export-document:${companyCode}`; break;
    default:
      return c.json(fail(`Unknown ref type: ${type}`, 400), 400);
  }
  const nextNumber = await peekCounter(scope, counterYear);
  return c.json({ success: true, nextNumber });
});

// ============================================================================
// app_settings singletons
// ============================================================================
function settingHandlers(key: string, defaultValue: unknown) {
  return {
    async get(c: any) {
      const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
      return c.json(ok(data?.value ?? defaultValue));
    },
    async put(c: any) {
      const value = await c.req.json().catch(() => null);
      const { error } = await db()
        .from("app_settings")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) return c.json(fail(error.message, 400), 400);
      return c.json({ success: true });
    },
  };
}

const masterTemplates    = settingHandlers("master_templates", []);
const documentSettings   = settingHandlers("document_settings", {});
const customPodOptions   = settingHandlers("custom_pod_options", []);
const customShippingLineOptions = settingHandlers("custom_shipping_line_options", []);
const packingListMetrics = settingHandlers("packing_list_metrics", {});

route.get("/master-templates", masterTemplates.get);
route.put("/master-templates", masterTemplates.put);
route.get("/document-settings", documentSettings.get);
route.put("/document-settings", documentSettings.put);
route.get("/custom-pod-options", customPodOptions.get);
route.put("/custom-pod-options", customPodOptions.put);
route.get("/custom-shipping-line-options", customShippingLineOptions.get);
route.put("/custom-shipping-line-options", customShippingLineOptions.put);
route.get("/packing-list-metrics", packingListMetrics.get);
route.put("/packing-list-metrics", packingListMetrics.put);

// ============================================================================
// bookings (import + export, unified table)
// ============================================================================
type Movement = "IMPORT" | "EXPORT";

const bookingNumberPrefix = (m: Movement) => (m === "IMPORT" ? "IMP" : "EXP");

// DB row → API shape (camelCase, with children denormalized + data spread)
function bookingRowToApi(row: any, kids: {
  tags?: string[];
  history?: any[];
  events?: any[];
  segments?: any[];
  documents?: Record<string, any>;
  logbookNumber?: number | null;
}) {
  const passthrough = row.data ?? {};
  const base = {
    ...passthrough,                                 // passthrough fields first; known columns overwrite
    id: row.booking_number,                         // public id matches ref number (e.g. "EXP 2026-1")
    uuid: row.id,                                   // internal UUID kept around if anything needs it
    bookingId: row.booking_number,
    movement: row.movement,
    clientId: row.client_id,
    clientName: row.client_name,
    status: row.status,
    origin: row.origin,
    destination: row.destination,
    commodity: row.commodity,
    incoterm: row.incoterm,
    mode: row.mode,
    carrier: row.carrier,
    etd: row.etd,
    eta: row.eta,
    ata: row.ata,
    hasTrucking: row.has_trucking,
    trucking_status: row.trucking_status,           // kept snake — frontend reads this
    linkedBookingId: row.linked_booking_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shipmentTags: kids.tags ?? [],
    tagHistory: kids.history ?? [],
    shipmentEvents: kids.events ?? [],
    logbookNumber: kids.logbookNumber ?? null,
  };
  if (row.movement === "EXPORT") {
    return { ...base, segments: kids.segments ?? [], exportDocuments: kids.documents ?? {} };
  }
  return base;
}

// Known top-level keys the bookings table maps directly. Everything else
// (shipper, consignee, BL number, costs, contact metadata, etc.) lands in `data`.
const BOOKING_KNOWN_KEYS = new Set([
  "id","bookingId","booking_number","movement","clientId","client_id","clientName","client_name",
  "status","origin","destination","commodity","incoterm","mode","carrier",
  "etd","eta","ata","hasTrucking","has_trucking","truckingStatus","trucking_status",
  "linkedBookingId","linked_booking_id","createdBy","created_by",
  "createdAt","created_at","updatedAt","updated_at",
  "segments","exportDocuments","shipmentTags","tagHistory","shipmentEvents","logbookNumber",
]);

// API body → DB row (snake_case). Only writes fields actually present in body.
// For create, pass `defaults: true` so movement + status get sensible defaults.
function bookingApiToRow(body: any, movement: Movement, defaults = false) {
  const row: any = {};
  const set = (apiCamel: string, apiSnake: string, dbKey: string, transform: (v: any) => any = (v) => v) => {
    if (body[apiCamel] !== undefined) row[dbKey] = transform(body[apiCamel]);
    else if (body[apiSnake] !== undefined) row[dbKey] = transform(body[apiSnake]);
  };
  set("clientId",        "client_id",         "client_id",         asUuid);
  set("clientName",      "client_name",       "client_name");
  // Friendly fallback — frontend uses customerName / companyName interchangeably with clientName
  if (row.client_name === undefined) {
    if (body.customerName) row.client_name = body.customerName;
    else if (body.companyName) row.client_name = body.companyName;
  }
  set("status",          "status",            "status");
  set("origin",          "origin",            "origin");
  set("destination",     "destination",       "destination");
  set("commodity",       "commodity",         "commodity");
  set("incoterm",        "incoterm",          "incoterm");
  set("mode",            "mode",              "mode");
  set("carrier",         "carrier",           "carrier");
  set("etd",             "etd",               "etd",               (v) => v || null);
  set("eta",             "eta",               "eta",               (v) => v || null);
  set("ata",             "ata",               "ata",               (v) => v || null);
  set("hasTrucking",     "has_trucking",      "has_trucking");
  set("truckingStatus",  "trucking_status",   "trucking_status");
  set("linkedBookingId", "linked_booking_id", "linked_booking_id", asUuid);
  set("createdBy",       "created_by",        "created_by",        asUuid);

  // Capture everything else as JSONB passthrough.
  const data: any = {};
  for (const [k, v] of Object.entries(body)) {
    if (!BOOKING_KNOWN_KEYS.has(k)) data[k] = v;
  }
  if (Object.keys(data).length) row.data = data;

  if (defaults) {
    row.movement = movement;
    if (row.status === undefined) row.status = "Draft";
    if (row.has_trucking === undefined) row.has_trucking = false;
  }
  return row;
}

// Convert a segment from the frontend's payload to a booking_segments row.
// `body` may include arbitrary segment-level fields (vesselVoyage, blNumber,
// containerNos, costs, etc.) — all land in `data`.
function segmentBodyToRow(body: any, bookingId: string, legOrder: number) {
  const known = new Set([
    "id","segmentId","bookingId","booking_id","legOrder","leg_order",
    "origin","destination","volume","mode","carrier","etd","eta",
    "createdAt","updatedAt","created_at","updated_at",
  ]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) {
    if (!known.has(k)) data[k] = v;
  }
  return {
    booking_id: bookingId,
    leg_order: legOrder,
    origin: body.origin ?? null,
    destination: body.destination ?? body.pod ?? null,
    volume: body.volume ?? null,
    mode: body.mode ?? null,
    carrier: body.carrier ?? body.shippingLine ?? null,
    etd: body.etd || null,
    eta: body.eta || null,
    data: Object.keys(data).length ? data : null,
  };
}

function segmentRowToApi(row: any) {
  return {
    segmentId: row.id,
    legOrder: row.leg_order,
    origin: row.origin,
    destination: row.destination,
    volume: row.volume,
    mode: row.mode,
    carrier: row.carrier,
    etd: row.etd,
    eta: row.eta,
    ...(row.data ?? {}),                            // catch-all fields (containerNos, vesselVoyage, costs, etc.)
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function segmentApiToRow(body: any, bookingId: string, legOrder?: number) {
  const knownKeys = new Set([
    "id","segmentId","bookingId","booking_id","legOrder","leg_order",
    "origin","destination","volume","mode","carrier","etd","eta",
    "createdAt","updatedAt","created_at","updated_at",
  ]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) {
    if (!knownKeys.has(k)) data[k] = v;
  }
  return {
    booking_id: bookingId,
    leg_order: legOrder ?? body.legOrder ?? body.leg_order ?? 1,
    origin: body.origin ?? null,
    destination: body.destination ?? null,
    volume: body.volume ?? null,
    mode: body.mode ?? null,
    carrier: body.carrier ?? null,
    etd: body.etd || null,
    eta: body.eta || null,
    data: Object.keys(data).length ? data : null,
  };
}

function docTypeToCamel(slug: string): string {
  return slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function docRowToApi(row: any) {
  return {
    docType: docTypeToCamel(row.doc_type),
    refNo: row.ref_no,
    status: row.status,
    fileUrl: row.file_url,
    ...(row.data ?? {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchBookingChildren(bookingId: string) {
  const d = db();
  const [tagsRes, historyRes, eventsRes, segmentsRes, documentsRes] = await Promise.all([
    d.from("booking_shipment_tags").select("tag").eq("booking_id", bookingId),
    d.from("booking_tag_history").select("*").eq("booking_id", bookingId).order("timestamp", { ascending: false }),
    d.from("booking_shipment_events").select("*").eq("booking_id", bookingId).order("event_date", { ascending: false }),
    d.from("booking_segments").select("*").eq("booking_id", bookingId).order("leg_order", { ascending: true }),
    d.from("booking_documents").select("*").eq("booking_id", bookingId),
  ]);
  const documents: Record<string, any> = {};
  for (const row of documentsRes.data ?? []) documents[docTypeToCamel((row as any).doc_type)] = docRowToApi(row);
  return {
    tags: (tagsRes.data ?? []).map((r: any) => r.tag),
    history: historyRes.data ?? [],
    events: (eventsRes.data ?? []).map((r: any) => r.data ?? r),
    segments: (segmentsRes.data ?? []).map(segmentRowToApi),
    documents,
  };
}

async function loadBookingApi(id: string) {
  const { data: row, error } = await db().from("bookings").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const kids = await fetchBookingChildren(id);
  return bookingRowToApi(row, kids);
}

async function nextBookingNumber(movement: Movement): Promise<string> {
  const year = new Date().getFullYear();
  const { data, error } = await db().rpc("next_counter", {
    p_scope: `booking:${movement === "IMPORT" ? "Import" : "Export"}`,
    p_year: year,
  });
  if (error) throw new Error(error.message);
  return `${bookingNumberPrefix(movement)} ${year}-${data}`;
}

// ----- LIST -----
// Slim mode skips the 4 child fan-out queries (tags/history/segments/docs).
// Use it for selectors and any list view that only needs id/number/client/status/etc.
async function listBookings(opts: {
  movement?: Movement | null;
  slim?: boolean;
  limit?: number;
  offset?: number;
  excludeLinked?: "billing" | "expense" | null;
} = {}): Promise<{ rows: any[]; total: number }> {
  const movement = opts.movement ?? null;
  const slim = !!opts.slim;
  const limit = opts.limit;
  const offset = opts.offset ?? 0;
  const excludeLinked = opts.excludeLinked ?? null;

  // Resolve the "already linked" booking-id set if requested. One small query
  // beats the previous client-side approach of fetching every billing/expense.
  let excludedSet: Set<string> | null = null;
  if (excludeLinked) {
    const linkedQuery = excludeLinked === "billing"
      ? db().from("billing_bookings").select("booking_id")
      : db().from("expenses").select("booking_id");
    const { data: linked } = await linkedQuery;
    excludedSet = new Set(((linked ?? []) as any[]).map((r) => r.booking_id).filter(Boolean));
  }

  let q = db()
    .from("bookings")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (movement) q = q.eq("movement", movement);
  // PostgREST .not("id", "in", "(...)") works for modest exclusion lists. For
  // very large sets we fall back to JS-side filtering after the fetch.
  const canPushdownExclude = excludedSet && excludedSet.size > 0 && excludedSet.size <= 100;
  if (canPushdownExclude) {
    q = q.not("id", "in", `(${Array.from(excludedSet!).join(",")})`);
  }
  // Pagination only pushes down when we are not JS-filtering after the fact.
  const pushdownPaging = limit !== undefined && (!excludedSet || canPushdownExclude);
  if (pushdownPaging) q = q.range(offset, offset + (limit as number) - 1);

  const { data: rawRows, error, count } = await q;
  if (error) throw new Error(error.message);
  let rows = (rawRows ?? []) as any[];
  if (excludedSet && !canPushdownExclude) {
    rows = rows.filter((r) => !excludedSet!.has(r.id));
    if (limit !== undefined) rows = rows.slice(offset, offset + limit);
  }
  const total = count ?? rows.length;
  if (!rows.length) return { rows: [], total };

  if (slim) {
    return { rows: rows.map((r: any) => bookingRowToApi(r, {})), total };
  }

  const ids = rows.map((r: any) => r.id);
  const d = db();
  const hasExport = !movement || rows.some((r: any) => r.movement === "EXPORT");
  const [tagsRes, historyRes, segmentsRes, docsRes, logbookRes] = await Promise.all([
    d.from("booking_shipment_tags").select("booking_id, tag").in("booking_id", ids),
    d.from("booking_tag_history").select("*").in("booking_id", ids).order("timestamp", { ascending: false }),
    hasExport
      ? d.from("booking_segments").select("*").in("booking_id", ids).order("leg_order", { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    hasExport
      ? d.from("booking_documents").select("*").in("booking_id", ids)
      : Promise.resolve({ data: [] as any[] }),
    d.from("logbook_entries").select("booking_id, logbook_number").in("booking_id", ids),
  ]);

  const tagsByBooking: Record<string, string[]> = {};
  for (const t of (tagsRes.data ?? []) as any[]) (tagsByBooking[t.booking_id] ??= []).push(t.tag);

  const historyByBooking: Record<string, any[]> = {};
  for (const h of (historyRes.data ?? []) as any[]) (historyByBooking[h.booking_id] ??= []).push(h);

  const segmentsByBooking: Record<string, any[]> = {};
  for (const s of (segmentsRes.data ?? []) as any[]) (segmentsByBooking[s.booking_id] ??= []).push(segmentRowToApi(s));

  const docsByBooking: Record<string, Record<string, any>> = {};
  for (const d_ of (docsRes.data ?? []) as any[]) {
    (docsByBooking[d_.booking_id] ??= {})[docTypeToCamel(d_.doc_type)] = docRowToApi(d_);
  }

  const logbookByBooking: Record<string, number> = {};
  for (const e of (logbookRes.data ?? []) as any[]) logbookByBooking[e.booking_id] = e.logbook_number;

  return {
    rows: rows.map((r: any) => bookingRowToApi(r, {
      tags:        tagsByBooking[r.id] ?? [],
      history:     historyByBooking[r.id] ?? [],
      segments:    segmentsByBooking[r.id] ?? [],
      documents:   docsByBooking[r.id]   ?? {},
      logbookNumber: logbookByBooking[r.id] ?? null,
    })),
    total,
  };
}

async function listBookingsByMovement(movement: Movement) {
  const { rows } = await listBookings({ movement });
  return rows;
}

function registerBookingCrud(prefix: "import-bookings" | "export-bookings", movement: Movement) {
  route.get(`/${prefix}`, async (c) => {
    try {
      return c.json(ok(await listBookingsByMovement(movement)));
    } catch (e: any) {
      return c.json(fail(e.message, 500), 500);
    }
  });

  route.get(`/${prefix}/:id`, async (c) => {
    try {
      const uuid = await resolveRowId("bookings", "booking_number", c.req.param("id"));
      if (!uuid) return c.json(fail("Booking not found", 404), 404);
      const booking = await loadBookingApi(uuid);
      if (!booking) return c.json(fail("Booking not found", 404), 404);
      if (booking.movement !== movement) return c.json(fail("Wrong booking movement for this route", 400), 400);
      return c.json(ok(booking));
    } catch (e: any) {
      return c.json(fail(e.message, 500), 500);
    }
  });

  route.post(`/${prefix}`, async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const row = bookingApiToRow(body, movement, true);
      row.booking_number = body.bookingId ?? body.booking_number ?? await nextBookingNumber(movement);
      if (!row.client_id) {
        // Look up by name as a fallback so the frontend doesn't have to know UUIDs
        const clientName = body.clientName ?? body.customerName ?? body.companyName;
        if (clientName) {
          const { data: c } = await db()
            .from("clients").select("id, name, company_name")
            .or(`name.ilike.${clientName},company_name.ilike.${clientName}`)
            .limit(1).maybeSingle();
          if (c) row.client_id = (c as any).id;
        }
      }
      if (!row.client_id) return c.json(fail("clientId is required (could not resolve from name either)", 400), 400);
      const { data: inserted, error } = await db().from("bookings").insert(row).select().single();
      if (error) return c.json(fail(error.message, 400), 400);
      const bookingId = (inserted as any).id;

      // Persist any segments the frontend sent.
      if (Array.isArray(body.segments) && body.segments.length) {
        const segmentRows = body.segments.map((s: any, i: number) =>
          segmentBodyToRow(s, bookingId, s.legOrder ?? s.leg_order ?? i + 1));
        const { error: se } = await db().from("booking_segments").insert(segmentRows);
        if (se) console.error("Failed inserting segments:", se.message);
      }

      const booking = await loadBookingApi(bookingId);
      return c.json(ok(booking));
    } catch (e: any) {
      return c.json(fail(e.message, 500), 500);
    }
  });

  route.put(`/${prefix}/:id`, async (c) => {
    try {
      const uuid = await resolveRowId("bookings", "booking_number", c.req.param("id"));
      if (!uuid) return c.json(fail("Booking not found", 404), 404);
      const body = await c.req.json().catch(() => ({}));
      const update = bookingApiToRow(body, movement, false);
      if (body.bookingId) update.booking_number = body.bookingId;
      // Only short-circuit when there are no booking-level updates AND no segments to reconcile.
      // Otherwise a segment-only edit (e.g. deleting a Province leg) would silently no-op.
      if (Object.keys(update).length === 0 && !Array.isArray(body.segments)) {
        const booking = await loadBookingApi(uuid);
        return c.json(ok(booking));
      }
      // Merge JSONB passthrough with existing row.data so a partial edit
      // doesn't wipe fields the form didn't re-send (e.g. shipmentType, shipper, costs).
      if (update.data !== undefined) {
        const { data: existing } = await db().from("bookings").select("data").eq("id", uuid).maybeSingle();
        update.data = { ...((existing as any)?.data ?? {}), ...update.data };
      }
      if (Object.keys(update).length) {
        const { error } = await db().from("bookings").update(update).eq("id", uuid);
        if (error) return c.json(fail(error.message, 400), 400);
      }

      // Persist segments if provided. Match by segmentId (= row id) so we can
      // update existing rows rather than wipe + reinsert (which would break FKs).
      if (Array.isArray(body.segments)) {
        const { data: existingSegs } = await db()
          .from("booking_segments").select("id").eq("booking_id", uuid);
        const existingIds = new Set(((existingSegs ?? []) as any[]).map((r) => r.id));
        const incomingIds = new Set<string>();
        for (let i = 0; i < body.segments.length; i++) {
          const s = body.segments[i];
          const segRow = segmentApiToRow(s, uuid, s.legOrder ?? s.leg_order ?? i + 1);
          // Merge JSONB so partial edits don't drop untouched segment fields.
          if (s.segmentId && existingIds.has(s.segmentId)) {
            const { data: existingSeg } = await db()
              .from("booking_segments").select("data").eq("id", s.segmentId).maybeSingle();
            segRow.data = { ...((existingSeg as any)?.data ?? {}), ...(segRow.data ?? {}) };
            incomingIds.add(s.segmentId);
            const { error: ue } = await db().from("booking_segments").update(segRow).eq("id", s.segmentId);
            if (ue) console.error("segment update failed:", ue.message);
          } else {
            const { data: ins, error: ie } = await db().from("booking_segments").insert(segRow).select("id").single();
            if (ie) console.error("segment insert failed:", ie.message);
            else if (ins) incomingIds.add((ins as any).id);
          }
        }
        // Delete segments the client removed.
        for (const id of existingIds) {
          if (!incomingIds.has(id)) {
            await db().from("booking_segments").delete().eq("id", id);
          }
        }
      }

      // Some flows (e.g. Export "Shipped Out") send shipmentTags directly via
      // the main PUT instead of the /shipment-tags sub-endpoint. Persist them
      // so the tag table + tag history stay consistent.
      if (Array.isArray(body.shipmentTags)) {
        const newTags: string[] = body.shipmentTags;
        const { data: existingTagRows } = await db()
          .from("booking_shipment_tags").select("tag").eq("booking_id", uuid);
        const oldTags = ((existingTagRows ?? []) as any[]).map((r) => r.tag);
        await db().from("booking_shipment_tags").delete().eq("booking_id", uuid);
        if (newTags.length) {
          await db().from("booking_shipment_tags").insert(
            newTags.map((tag) => ({ booking_id: uuid, tag })),
          );
        }
        await db().from("booking_tag_history").insert({
          booking_id: uuid,
          old_tags: oldTags,
          new_tags: newTags,
          change_type: "replace",
          user_name: body.user ?? "system",
        });
      }

      await syncLogbookForBooking(uuid);
      return c.json(ok(await loadBookingApi(uuid)));
    } catch (e: any) {
      return c.json(fail(e.message, 500), 500);
    }
  });

  route.delete(`/${prefix}/:id`, async (c) => {
    const uuid = await resolveRowId("bookings", "booking_number", c.req.param("id"));
    if (!uuid) return c.json({ success: true });                         // idempotent
    const { error } = await db().from("bookings").delete().eq("id", uuid);
    if (error) return c.json(fail(error.message, 400), 400);
    return c.json({ success: true });
  });

  // ----- shipment tags -----
  route.put(`/${prefix}/:id/shipment-tags`, async (c) => {
    const uuid = await resolveRowId("bookings", "booking_number", c.req.param("id"));
    if (!uuid) return c.json(fail("Booking not found", 404), 404);
    const body = await c.req.json().catch(() => ({}));
    const newTags: string[] = Array.isArray(body.shipmentTags) ? body.shipmentTags : [];
    const user: string = body.user ?? "system";

    const { data: existing } = await db()
      .from("booking_shipment_tags").select("tag").eq("booking_id", uuid);
    const oldTags = ((existing ?? []) as any[]).map((r) => r.tag);

    await db().from("booking_shipment_tags").delete().eq("booking_id", uuid);
    if (newTags.length) {
      await db().from("booking_shipment_tags").insert(
        newTags.map((tag) => ({ booking_id: uuid, tag })),
      );
    }
    await db().from("booking_tag_history").insert({
      booking_id: uuid,
      old_tags: oldTags,
      new_tags: newTags,
      change_type: "replace",
      user_name: user,
    });

    // Persist deliveredAt to bookings.data so the logbook sync can read it.
    // Body sends explicit null to clear, a string ISO to set; undefined leaves alone.
    if ("deliveredAt" in body) {
      const { data: row } = await db().from("bookings").select("data").eq("id", uuid).maybeSingle();
      const data = { ...((row as any)?.data ?? {}), deliveredAt: body.deliveredAt };
      await db().from("bookings").update({ data }).eq("id", uuid);
    } else if (newTags.includes("delivered") && !oldTags.includes("delivered")) {
      // Tag flipped on without explicit date — stamp now.
      const { data: row } = await db().from("bookings").select("data").eq("id", uuid).maybeSingle();
      const data = { ...((row as any)?.data ?? {}), deliveredAt: new Date().toISOString() };
      await db().from("bookings").update({ data }).eq("id", uuid);
    }

    await syncLogbookForBooking(uuid);
    return c.json(ok(await loadBookingApi(uuid)));
  });
}

registerBookingCrud("import-bookings", "IMPORT");
registerBookingCrud("export-bookings", "EXPORT");

// ----- export segments -----
route.post("/export-bookings/:id/segments", async (c) => {
  const bookingId = await resolveRowId("bookings", "booking_number", c.req.param("id"));
  if (!bookingId) return c.json(fail("Booking not found", 404), 404);
  const body = await c.req.json().catch(() => ({}));
  const { data: existing } = await db()
    .from("booking_segments").select("leg_order").eq("booking_id", bookingId)
    .order("leg_order", { ascending: false }).limit(1);
  const nextOrder = (((existing ?? [])[0] as any)?.leg_order ?? 0) + 1;
  const row = segmentApiToRow(body, bookingId, nextOrder);
  const { data, error } = await db().from("booking_segments").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(segmentRowToApi(data)));
});

route.put("/export-bookings/:id/segments/:segmentId", async (c) => {
  const bookingId = await resolveRowId("bookings", "booking_number", c.req.param("id"));
  if (!bookingId) return c.json(fail("Booking not found", 404), 404);
  const segmentId = c.req.param("segmentId");
  const body = await c.req.json().catch(() => ({}));
  const row = segmentApiToRow(body, bookingId, body.legOrder ?? body.leg_order);
  delete (row as any).booking_id;                   // immutable
  const { data, error } = await db()
    .from("booking_segments").update(row).eq("id", segmentId).eq("booking_id", bookingId)
    .select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(segmentRowToApi(data)));
});

route.delete("/export-bookings/:id/segments/:segmentId", async (c) => {
  const bookingId = await resolveRowId("bookings", "booking_number", c.req.param("id"));
  if (!bookingId) return c.json(fail("Booking not found", 404), 404);
  const segmentId = c.req.param("segmentId");
  const { count } = await db()
    .from("booking_segments").select("*", { count: "exact", head: true }).eq("booking_id", bookingId);
  if ((count ?? 0) <= 1) return c.json(fail("Cannot delete the last segment", 400), 400);
  const { error } = await db()
    .from("booking_segments").delete().eq("id", segmentId).eq("booking_id", bookingId);
  if (error) return c.json(fail(error.message, 400), 400);
  // re-number remaining segments so legOrder stays contiguous
  const { data: rest } = await db()
    .from("booking_segments").select("id").eq("booking_id", bookingId)
    .order("leg_order", { ascending: true });
  let order = 1;
  for (const s of (rest ?? []) as any[]) {
    await db().from("booking_segments").update({ leg_order: order++ }).eq("id", s.id);
  }
  return c.json({ success: true });
});

// ----- export documents -----
route.get("/export-bookings/:id/documents", async (c) => {
  const bookingId = await resolveRowId("bookings", "booking_number", c.req.param("id"));
  if (!bookingId) return c.json(ok({}));
  const { data } = await db()
    .from("booking_documents").select("*").eq("booking_id", bookingId);
  const out: Record<string, any> = {};
  for (const row of (data ?? []) as any[]) out[docTypeToCamel(row.doc_type)] = docRowToApi(row);
  return c.json(ok(out));
});

route.put("/export-bookings/:id/documents/:docType", async (c) => {
  const bookingId = await resolveRowId("bookings", "booking_number", c.req.param("id"));
  if (!bookingId) return c.json(fail("Booking not found", 404), 404);
  const docType = docTypeToCamel(c.req.param("docType"));
  const body = await c.req.json().catch(() => ({}));
  const knownKeys = new Set(["docType","doc_type","bookingId","booking_id","refNo","ref_no","status","fileUrl","file_url","createdAt","updatedAt","created_at","updated_at"]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) if (!knownKeys.has(k)) data[k] = v;
  const row = {
    booking_id: bookingId,
    doc_type: docType,
    ref_no: body.refNo ?? body.ref_no ?? null,
    status: body.status ?? null,
    file_url: body.fileUrl ?? body.file_url ?? null,
    data: Object.keys(data).length ? data : null,
  };
  const { data: upserted, error } = await db()
    .from("booking_documents").upsert(row, { onConflict: "booking_id,doc_type" }).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(docRowToApi(upserted)));
});

route.delete("/export-bookings/:id/documents/:docType", async (c) => {
  const bookingId = await resolveRowId("bookings", "booking_number", c.req.param("id"));
  if (!bookingId) return c.json({ success: true });
  const { error } = await db()
    .from("booking_documents").delete()
    .eq("booking_id", bookingId).eq("doc_type", docTypeToCamel(c.req.param("docType")));
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ----- unified /bookings (read-only listing across movements) -----
// Query params:
//   movement=IMPORT|EXPORT   restrict to one movement (single SQL query instead of merging two)
//   slim=1                   omit tags/history/segments/documents — use for selectors and list views
//   limit, offset            pagination
//   excludeLinked=billing|expense  hide bookings already linked to a billing/expense
route.get("/bookings", async (c) => {
  try {
    const movementParam = (c.req.query("movement") ?? "").toUpperCase();
    const movement: Movement | null =
      movementParam === "IMPORT" || movementParam === "EXPORT" ? (movementParam as Movement) : null;
    const slim = c.req.query("slim") === "1" || c.req.query("slim") === "true";
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;
    const excludeLinkedRaw = c.req.query("excludeLinked");
    const excludeLinked: "billing" | "expense" | null =
      excludeLinkedRaw === "billing" || excludeLinkedRaw === "expense" ? excludeLinkedRaw : null;

    const idsParam = c.req.query("ids");
    if (idsParam) {
      const rawIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const uuids = await resolveBookingIdsToUuids(rawIds);
      if (!uuids.length) return c.json({ success: true, data: [], pagination: { total: 0, offset: 0, limit: 0, hasMore: false } });
      const { data, error } = await db().from("bookings").select("*").in("id", uuids);
      if (error) return c.json(fail(error.message, 500), 500);
      const bookingRows = (data ?? []) as any[];
      const rowsOut = slim
        ? bookingRows.map((r) => bookingRowToApi(r, {}))
        : await Promise.all(bookingRows.map(async (r) => bookingRowToApi(r, await fetchBookingChildren(r.id))));
      return c.json({
        success: true,
        data: rowsOut,
        pagination: { total: rowsOut.length, offset: 0, limit: rowsOut.length, hasMore: false },
      });
    }

    const { rows, total } = await listBookings({ movement, slim, limit, offset, excludeLinked });
    return c.json({
      success: true,
      data: rows,
      pagination: {
        total,
        offset,
        limit: limit ?? rows.length,
        hasMore: limit !== undefined && offset + rows.length < total,
      },
    });
  } catch (e: any) {
    return c.json(fail(e.message, 500), 500);
  }
});

// Returns the set of booking UUIDs already linked to a billing or expense.
// Used by selectors to grey-out "already taken" bookings without having to
// fetch every billing/expense + their child rows.
route.get("/bookings/linked-ids", async (c) => {
  const type = c.req.query("type");
  if (type !== "billing" && type !== "expense") {
    return c.json(fail("type must be 'billing' or 'expense'", 400), 400);
  }
  const query = type === "billing"
    ? db().from("billing_bookings").select("booking_id")
    : db().from("expenses").select("booking_id");
  const { data, error } = await query;
  if (error) return c.json(fail(error.message, 500), 500);
  const ids = Array.from(new Set(((data ?? []) as any[]).map((r) => r.booking_id).filter(Boolean)));
  return c.json(ok(ids));
});

route.get("/bookings/:id", async (c) => {
  try {
    const uuid = await resolveRowId("bookings", "booking_number", c.req.param("id"));
    if (!uuid) return c.json(fail("Booking not found", 404), 404);
    return c.json(ok(await loadBookingApi(uuid)));
  } catch (e: any) {
    return c.json(fail(e.message, 500), 500);
  }
});

route.get("/bookings/:bookingId/vouchers", async (c) => {
  const param = c.req.param("bookingId");
  const bookingUuid = (await resolveRowId("bookings", "booking_number", param)) ?? param;
  const { data, error } = await db()
    .from("vouchers").select("*").eq("booking_id", bookingUuid)
    .order("voucher_date", { ascending: false });
  if (error) return c.json(fail(error.message, 500), 500);
  const rows = (data ?? []) as any[];
  if (!rows.length) return c.json(ok([]));
  const ids = rows.map((r) => r.id);
  const { data: items } = await db()
    .from("voucher_line_items").select("*").in("voucher_id", ids).order("position", { ascending: true });
  const byVoucher: Record<string, any[]> = {};
  for (const li of (items ?? []) as any[]) (byVoucher[li.voucher_id] ??= []).push(li);
  return c.json(ok(rows.map((r) => voucherRowToApi(r, byVoucher[r.id] ?? []))));
});

route.all("/bookings/*", (c) =>
  c.json(fail("Use /import-bookings or /export-bookings for create/update/delete", 405), 405));

// ============================================================================
// trucking bookings  (standalone TRK-YYYY-NNN jobs)
// ============================================================================
function truckingBookingRowToApi(row: any) {
  return {
    ...(row.data ?? {}),
    id: row.booking_number,
    uuid: row.id,
    bookingId: row.booking_number,
    clientId: row.client_id,
    clientName: row.client_name,
    status: row.status,
    origin: row.origin,
    destination: row.destination,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function truckingBookingApiToRow(body: any) {
  const known = new Set([
    "id","bookingId","booking_number","clientId","client_id","clientName","client_name",
    "status","origin","destination","createdBy","created_by",
    "createdAt","created_at","updatedAt","updated_at",
  ]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) if (!known.has(k)) data[k] = v;
  const row: any = {};
  if (body.clientId !== undefined || body.client_id !== undefined)
    row.client_id = asUuid(body.clientId ?? body.client_id);
  if (body.clientName !== undefined || body.client_name !== undefined)
    row.client_name = body.clientName ?? body.client_name;
  if (body.status !== undefined)      row.status = body.status;
  if (body.origin !== undefined)      row.origin = body.origin;
  if (body.destination !== undefined) row.destination = body.destination;
  if (body.createdBy !== undefined || body.created_by !== undefined)
    row.created_by = asUuid(body.createdBy ?? body.created_by);
  if (Object.keys(data).length) row.data = data;
  return row;
}

route.get("/trucking-bookings", async (c) => {
  const { data, error } = await db()
    .from("trucking_bookings").select("*").order("created_at", { ascending: false });
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json(ok((data ?? []).map(truckingBookingRowToApi)));
});

route.get("/trucking-bookings/:id", async (c) => {
  const uuid = await resolveRowId("trucking_bookings", "booking_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Booking not found", 404), 404);
  const { data, error } = await db()
    .from("trucking_bookings").select("*").eq("id", uuid).maybeSingle();
  if (error) return c.json(fail(error.message, 500), 500);
  if (!data) return c.json(fail("Booking not found", 404), 404);
  return c.json(ok(truckingBookingRowToApi(data)));
});

route.post("/trucking-bookings", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const year = new Date().getFullYear();
  const { data: counter, error: ce } = await db().rpc("next_counter", {
    p_scope: "trucking_booking", p_year: year,
  });
  if (ce) return c.json(fail(ce.message, 500), 500);
  const row: any = truckingBookingApiToRow(body);
  row.status = row.status ?? "Draft";
  row.booking_number = body.bookingId ?? `TRK-${year}-${String(counter).padStart(3, "0")}`;
  const { data, error } = await db().from("trucking_bookings").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(truckingBookingRowToApi(data)));
});

route.put("/trucking-bookings/:id", async (c) => {
  const uuid = await resolveRowId("trucking_bookings", "booking_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Booking not found", 404), 404);
  const body = await c.req.json().catch(() => ({}));
  const row = truckingBookingApiToRow(body);
  if (Object.keys(row).length === 0) {
    const { data } = await db().from("trucking_bookings").select("*").eq("id", uuid).maybeSingle();
    return c.json(ok(truckingBookingRowToApi(data)));
  }
  const { data, error } = await db().from("trucking_bookings").update(row).eq("id", uuid).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(truckingBookingRowToApi(data)));
});

route.delete("/trucking-bookings/:id", async (c) => {
  const uuid = await resolveRowId("trucking_bookings", "booking_number", c.req.param("id"));
  if (!uuid) return c.json({ success: true });
  const { error } = await db().from("trucking_bookings").delete().eq("id", uuid);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ============================================================================
// trucking legs  (TLEG-YYYY-NNN; legs attached to a parent booking)
// ============================================================================
function truckingLegRowToApi(row: any) {
  return {
    ...(row.data ?? {}),
    id: row.leg_number,
    uuid: row.id,
    truckingLegId: row.leg_number,
    parentBookingId: row.parent_booking_id,
    parentBookingType: row.parent_booking_type,
    legOrder: row.leg_order,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function legParentTypeApiToDb(t: string): "IMPORT" | "EXPORT" | "TRUCKING" | null {
  if (!t) return null;
  const u = String(t).toUpperCase();
  if (u === "IMPORT" || u === "EXPORT" || u === "TRUCKING") return u;
  return null;
}

route.get("/trucking-legs", async (c) => {
  const bookingId = c.req.query("bookingId");
  const bookingType = c.req.query("bookingType");
  if (!bookingId || !bookingType) {
    return c.json(fail("bookingId and bookingType are required", 400), 400);
  }
  const parentType = legParentTypeApiToDb(bookingType);
  if (!parentType) return c.json(fail("Unsupported bookingType", 400), 400);
  const { data, error } = await db()
    .from("trucking_legs").select("*")
    .eq("parent_booking_id", bookingId).eq("parent_booking_type", parentType)
    .order("created_at", { ascending: false });
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json(ok((data ?? []).map(truckingLegRowToApi)));
});

route.get("/trucking-legs/:id", async (c) => {
  const uuid = await resolveRowId("trucking_legs", "leg_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Trucking leg not found", 404), 404);
  const { data, error } = await db()
    .from("trucking_legs").select("*").eq("id", uuid).maybeSingle();
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json(ok(truckingLegRowToApi(data)));
});

route.post("/trucking-legs", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parentType = legParentTypeApiToDb(body.parentBookingType ?? body.parent_booking_type);
  if (!parentType) return c.json(fail("parentBookingType must be IMPORT, EXPORT, or TRUCKING", 400), 400);
  const parentId = asUuid(body.parentBookingId ?? body.parent_booking_id);
  if (!parentId) return c.json(fail("parentBookingId must be a valid UUID", 400), 400);
  const year = new Date().getFullYear();
  const { data: counter, error: ce } = await db().rpc("next_counter", {
    p_scope: "trucking_leg", p_year: year,
  });
  if (ce) return c.json(fail(ce.message, 500), 500);

  const known = new Set([
    "id","truckingLegId","leg_number","parentBookingId","parent_booking_id","parentBookingType","parent_booking_type",
    "legOrder","leg_order","origin","destination","status","createdBy","created_by",
    "createdAt","created_at","updatedAt","updated_at",
  ]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) if (!known.has(k)) data[k] = v;

  const row = {
    leg_number: `TLEG-${year}-${String(counter).padStart(3, "0")}`,
    parent_booking_id: parentId,
    parent_booking_type: parentType,
    leg_order: body.legOrder ?? body.leg_order ?? null,
    origin: body.origin ?? null,
    destination: body.destination ?? null,
    status: body.status ?? null,
    created_by: asUuid(body.createdBy ?? body.created_by),
    data: Object.keys(data).length ? data : null,
  };
  const { data: inserted, error } = await db().from("trucking_legs").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(truckingLegRowToApi(inserted)));
});

route.put("/trucking-legs/:id", async (c) => {
  const uuid = await resolveRowId("trucking_legs", "leg_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Trucking leg not found", 404), 404);
  const body = await c.req.json().catch(() => ({}));
  const known = new Set([
    "id","truckingLegId","leg_number","parentBookingId","parent_booking_id","parentBookingType","parent_booking_type",
    "legOrder","leg_order","origin","destination","status","createdBy","created_by",
    "createdAt","created_at","updatedAt","updated_at",
  ]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) if (!known.has(k)) data[k] = v;
  const update: any = {};
  if (body.legOrder !== undefined || body.leg_order !== undefined) update.leg_order = body.legOrder ?? body.leg_order;
  if (body.origin !== undefined)      update.origin = body.origin;
  if (body.destination !== undefined) update.destination = body.destination;
  if (body.status !== undefined)      update.status = body.status;
  if (Object.keys(data).length) update.data = data;
  // parent_* immutable
  const { data: updated, error } = await db()
    .from("trucking_legs").update(update).eq("id", uuid).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok(truckingLegRowToApi(updated)));
});

route.delete("/trucking-legs/:id", async (c) => {
  const uuid = await resolveRowId("trucking_legs", "leg_number", c.req.param("id"));
  if (!uuid) return c.json({ success: true });
  const { error } = await db().from("trucking_legs").delete().eq("id", uuid);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ============================================================================
// trucking records  (TRK YYYY-NNN operational records linked to a booking)
// ============================================================================
function truckingRecordRowToApi(
  row: any,
  linked?: { tags: string[]; history: any[] },
  bookingMovement?: string | null,
  bookingRefNumber?: string | null,
) {
  // Derive linkedBookingType from movement when available so the import/export
  // filter on the list view is authoritative regardless of what the client sent.
  const derivedType =
    bookingMovement === "EXPORT" ? "Export"
    : bookingMovement === "IMPORT" ? "Import"
    : undefined;
  return {
    ...(row.data ?? {}),
    id: row.record_number,
    uuid: row.id,
    truckingRefNo: row.record_number,
    linkedBookingId: bookingRefNumber ?? row.linked_booking_id,    // public ref preferred
    linkedBookingUuid: row.linked_booking_id,
    linkedSegmentId: row.linked_segment_id,
    containerNo: row.container_no,
    containers: row.containers ?? [],
    remarks: row.remarks ?? [],
    ...(derivedType ? { linkedBookingType: derivedType } : {}),
    linkedBookingShipmentTags: linked?.tags,
    linkedBookingTagHistory: linked?.history,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function truckingRecordApiToRow(body: any) {
  // Identity / column-mapped fields are excluded from `data`. linkedBookingType
  // is intentionally NOT in this set — it has no column, so we let it fall
  // through into the `data` JSONB so the list view can filter by it.
  const known = new Set([
    "id","truckingRefNo","record_number","linkedBookingId","linked_booking_id",
    "linkedSegmentId","linked_segment_id","containerNo","container_no",
    "containers","remarks","linkedBookingShipmentTags","linkedBookingTagHistory",
    "createdBy","created_by","createdAt","created_at","updatedAt","updated_at",
  ]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) if (!known.has(k)) data[k] = v;
  const row: any = {};
  if (body.linkedBookingId !== undefined || body.linked_booking_id !== undefined) {
    const raw = body.linkedBookingId ?? body.linked_booking_id;
    row.linked_booking_id = raw ? await resolveRowId("bookings", "booking_number", String(raw)) : null;
  }
  if (body.linkedSegmentId !== undefined || body.linked_segment_id !== undefined)
    row.linked_segment_id = asUuid(body.linkedSegmentId ?? body.linked_segment_id);
  if (body.containerNo !== undefined || body.container_no !== undefined)
    row.container_no = body.containerNo ?? body.container_no;
  if (body.containers !== undefined) row.containers = body.containers;
  if (body.remarks !== undefined)    row.remarks = body.remarks;
  if (body.createdBy !== undefined || body.created_by !== undefined)
    row.created_by = asUuid(body.createdBy ?? body.created_by);
  if (Object.keys(data).length) row.data = data;
  return row;
}

async function fetchBookingMeta(bookingId: string | null | undefined) {
  if (!bookingId) return undefined;
  const { data } = await db()
    .from("bookings").select("movement, booking_number").eq("id", bookingId).maybeSingle();
  return (data as any) ?? undefined;
}

async function fetchLinkedBookingState(linkedBookingId: string | null | undefined) {
  if (!linkedBookingId) return undefined;
  const d = db();
  const [tagsRes, historyRes] = await Promise.all([
    d.from("booking_shipment_tags").select("tag").eq("booking_id", linkedBookingId),
    d.from("booking_tag_history").select("*").eq("booking_id", linkedBookingId).order("timestamp", { ascending: false }),
  ]);
  return {
    tags: ((tagsRes.data ?? []) as any[]).map((r) => r.tag),
    history: historyRes.data ?? [],
  };
}

route.post("/trucking-records", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const year = new Date().getFullYear();
  // Always derive prefix from linked booking movement. Format: TRK IMP|EXP YYYY-N.
  // Client-supplied truckingRefNo is honored only for its numeric suffix.
  const linkedRaw = body.linkedBookingId ?? body.linked_booking_id;
  if (!linkedRaw) return c.json(fail("Trucking record requires a linked booking", 400), 400);
  const linkedUuid = await resolveRowId("bookings", "booking_number", String(linkedRaw));
  const meta = await fetchBookingMeta(linkedUuid);
  const movement = meta?.movement;
  if (movement !== "IMPORT" && movement !== "EXPORT")
    return c.json(fail("Linked booking has no import/export movement", 400), 400);
  const scope = movement === "IMPORT" ? "trucking:Import" : "trucking:Export";
  const label = movement === "IMPORT" ? "IMP" : "EXP";

  let recordNumber: string;
  const supplied = typeof body.truckingRefNo === "string" ? body.truckingRefNo.trim() : "";
  const suppliedNumMatch = supplied.match(/(\d+)\s*$/);
  if (suppliedNumMatch) {
    recordNumber = `TRK ${label} ${year}-${suppliedNumMatch[1]}`;
  } else {
    const { data: counter, error: ce } = await db().rpc("next_counter", {
      p_scope: scope, p_year: year,
    });
    if (ce) return c.json(fail(ce.message, 500), 500);
    recordNumber = `TRK ${label} ${year}-${counter}`;
  }
  // uniqueness check
  const { data: dup } = await db()
    .from("trucking_records").select("id").eq("record_number", recordNumber).maybeSingle();
  if (dup) return c.json(fail(`Reference number ${recordNumber} is already in use by another active record.`, 409), 409);

  const row = await truckingRecordApiToRow(body);
  row.record_number = recordNumber;
  const { data: inserted, error } = await db().from("trucking_records").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  // Keep id_counters in sync with the actual record number — the supplied-ref
  // branch above skips next_counter, so peekCounter would otherwise drift.
  const issuedNum = parseInt(recordNumber.replace(/^.*-/, ""), 10);
  if (Number.isFinite(issuedNum)) {
    const { error: ae } = await db().rpc("advance_counter", { p_scope: scope, p_year: year, p_to_value: issuedNum });
    if (ae) console.warn(`advance_counter(${scope}, ${year}, ${issuedNum}) failed:`, ae.message);
  }
  const insertedMeta = await fetchBookingMeta((inserted as any).linked_booking_id);
  return c.json(ok(truckingRecordRowToApi(inserted, undefined, insertedMeta?.movement, insertedMeta?.booking_number)));
});

route.get("/trucking-records", async (c) => {
  const linkedBookingIdParam = c.req.query("linkedBookingId");
  const segmentId = c.req.query("segmentId");
  let linkedBookingUuid: string | null = null;
  if (linkedBookingIdParam) {
    linkedBookingUuid = await resolveRowId("bookings", "booking_number", linkedBookingIdParam);
    if (!linkedBookingUuid) return c.json(ok([]));
  }
  let q = db().from("trucking_records").select("*").order("updated_at", { ascending: false });
  if (linkedBookingUuid) q = q.eq("linked_booking_id", linkedBookingUuid);
  if (segmentId)         q = q.eq("linked_segment_id", segmentId);
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  const rows = (data ?? []) as any[];

  // Resolve linked-booking movement + ref-number for every distinct booking so
  // the list can be filtered by import/export and shows public refs (not UUIDs).
  const bookingIds = Array.from(new Set(rows.map((r) => r.linked_booking_id).filter(Boolean)));
  const bookingMeta = new Map<string, { movement: string; booking_number: string }>();
  if (bookingIds.length) {
    const { data: bookings } = await db()
      .from("bookings").select("id, movement, booking_number").in("id", bookingIds);
    ((bookings ?? []) as any[]).forEach((b) => bookingMeta.set(b.id, { movement: b.movement, booking_number: b.booking_number }));
  }

  // when filtered by linkedBookingId, enrich with linked tags/history
  const linked = linkedBookingUuid && rows.length ? await fetchLinkedBookingState(linkedBookingUuid) : undefined;
  return c.json(ok(rows.map((r) => {
    const meta = r.linked_booking_id ? bookingMeta.get(r.linked_booking_id) : undefined;
    return truckingRecordRowToApi(r, linked, meta?.movement, meta?.booking_number);
  })));
});

route.get("/trucking-records/:id", async (c) => {
  const uuid = await resolveRowId("trucking_records", "record_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Not found", 404), 404);
  const { data, error } = await db()
    .from("trucking_records").select("*").eq("id", uuid).maybeSingle();
  if (error) return c.json(fail(error.message, 500), 500);
  const linked = await fetchLinkedBookingState((data as any).linked_booking_id);
  const meta = await fetchBookingMeta((data as any).linked_booking_id);
  return c.json(ok(truckingRecordRowToApi(data, linked, meta?.movement, meta?.booking_number)));
});

route.put("/trucking-records/:id", async (c) => {
  const uuid = await resolveRowId("trucking_records", "record_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Not found", 404), 404);
  const updates = await c.req.json().catch(() => ({}));
  if (updates.truckingRefNo) {
    // Normalize to TRK IMP|EXP YYYY-N using linked booking movement (existing or in-update).
    const { data: cur } = await db()
      .from("trucking_records").select("linked_booking_id").eq("id", uuid).maybeSingle();
    let linkedUuid: string | null = (cur as any)?.linked_booking_id ?? null;
    const linkedRaw = updates.linkedBookingId ?? updates.linked_booking_id;
    if (linkedRaw) linkedUuid = await resolveRowId("bookings", "booking_number", String(linkedRaw));
    const meta = await fetchBookingMeta(linkedUuid);
    const movement = meta?.movement;
    if (movement !== "IMPORT" && movement !== "EXPORT")
      return c.json(fail("Linked booking has no import/export movement", 400), 400);
    const label = movement === "IMPORT" ? "IMP" : "EXP";
    const year = new Date().getFullYear();
    const m = String(updates.truckingRefNo).match(/(\d{4})\s*-\s*(\d+)/);
    const yr = m ? m[1] : String(year);
    const numMatch = String(updates.truckingRefNo).match(/(\d+)\s*$/);
    if (!numMatch) return c.json(fail("Invalid trucking ref number", 400), 400);
    updates.truckingRefNo = `TRK ${label} ${yr}-${numMatch[1]}`;
    const { data: dup } = await db()
      .from("trucking_records").select("id")
      .eq("record_number", updates.truckingRefNo).neq("id", uuid).maybeSingle();
    if (dup) return c.json(fail(`Reference number ${updates.truckingRefNo} is already in use by another active record.`, 409), 409);
  }
  const row = await truckingRecordApiToRow(updates);
  if (updates.truckingRefNo) row.record_number = updates.truckingRefNo;
  const { data, error } = await db()
    .from("trucking_records").update(row).eq("id", uuid).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  const meta = await fetchBookingMeta((data as any).linked_booking_id);
  return c.json(ok(truckingRecordRowToApi(data, undefined, meta?.movement, meta?.booking_number)));
});

route.put("/trucking-records/:id/update-booking-tags", async (c) => {
  const uuid = await resolveRowId("trucking_records", "record_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Trucking record not found", 404), 404);
  const body = await c.req.json().catch(() => ({}));
  const newTags: string[] = Array.from(new Set(Array.isArray(body.shipmentTags) ? body.shipmentTags : []));
  const user = String(body.user || "Unknown");

  const { data: record } = await db()
    .from("trucking_records").select("linked_booking_id").eq("id", uuid).maybeSingle();
  if (!record) return c.json(fail("Trucking record not found", 404), 404);
  const linkedId = (record as any).linked_booking_id;
  if (!linkedId) return c.json(fail("No linked booking", 400), 400);

  const { data: existing } = await db()
    .from("booking_shipment_tags").select("tag").eq("booking_id", linkedId);
  const oldTags = ((existing ?? []) as any[]).map((r) => r.tag);

  await db().from("booking_shipment_tags").delete().eq("booking_id", linkedId);
  if (newTags.length) {
    await db().from("booking_shipment_tags").insert(
      newTags.map((tag) => ({ booking_id: linkedId, tag })),
    );
  }
  await db().from("booking_tag_history").insert({
    booking_id: linkedId, old_tags: oldTags, new_tags: newTags,
    change_type: "replace", user_name: user,
  });
  const { data: history } = await db()
    .from("booking_tag_history").select("*").eq("booking_id", linkedId)
    .order("timestamp", { ascending: false });

  if (newTags.includes("delivered") && !oldTags.includes("delivered")) {
    const { data: row } = await db().from("bookings").select("data").eq("id", linkedId).maybeSingle();
    const data = { ...((row as any)?.data ?? {}), deliveredAt: new Date().toISOString() };
    await db().from("bookings").update({ data }).eq("id", linkedId);
  }
  await syncLogbookForBooking(linkedId);

  return c.json({ success: true, data: { shipmentTags: newTags, tagHistory: history ?? [] } });
});

async function replaceBookingShipmentEvents(bookingUuid: string, events: any[]) {
  await db().from("booking_shipment_events").delete().eq("booking_id", bookingUuid);
  if (events.length) {
    await db().from("booking_shipment_events").insert(events.map((e: any) => ({
      booking_id: bookingUuid,
      event_type: e.eventType ?? e.event_type ?? "event",
      event_date: e.eventDate ?? e.event_date ?? new Date().toISOString(),
      description: e.description ?? null,
      data: e,
    })));
  }
}

for (const prefix of ["import-bookings", "export-bookings"] as const) {
  route.put(`/${prefix}/:id/shipment-events`, async (c) => {
    const uuid = await resolveRowId("bookings", "booking_number", c.req.param("id"));
    if (!uuid) return c.json(fail("Booking not found", 404), 404);
    const body = await c.req.json().catch(() => ({}));
    const events = Array.isArray(body.shipmentEvents) ? body.shipmentEvents : [];
    await replaceBookingShipmentEvents(uuid, events);
    const booking = await loadBookingApi(uuid);
    return c.json(ok(booking));
  });
}

route.put("/trucking-records/:id/update-booking-events", async (c) => {
  const uuid = await resolveRowId("trucking_records", "record_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Trucking record not found", 404), 404);
  const body = await c.req.json().catch(() => ({}));
  const events = Array.isArray(body.shipmentEvents) ? body.shipmentEvents : [];

  const { data: record } = await db()
    .from("trucking_records").select("linked_booking_id").eq("id", uuid).maybeSingle();
  if (!record) return c.json(fail("Trucking record not found", 404), 404);
  const linkedId = (record as any).linked_booking_id;
  if (!linkedId) return c.json(fail("No linked booking", 400), 400);

  // replace event set wholesale (matches old "shipmentEvents = body.shipmentEvents" semantics)
  await db().from("booking_shipment_events").delete().eq("booking_id", linkedId);
  if (events.length) {
    await db().from("booking_shipment_events").insert(events.map((e: any) => ({
      booking_id: linkedId,
      event_type: e.eventType ?? e.event_type ?? "event",
      event_date: e.eventDate ?? e.event_date ?? new Date().toISOString(),
      description: e.description ?? null,
      data: e,
    })));
  }
  const booking = await loadBookingApi(linkedId);
  return c.json(ok(booking));
});

route.delete("/trucking-records/:id", async (c) => {
  const uuid = await resolveRowId("trucking_records", "record_number", c.req.param("id"));
  if (!uuid) return c.json({ success: true });
  const { error } = await db().from("trucking_records").delete().eq("id", uuid);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ============================================================================
// attachments  (file_data is a data: URL the browser produces via readAsDataURL)
// Download route must register before the parameterized list route or Hono
// matches "/attachments/download/:id" against "/attachments/:entityType/:entityId".
// ============================================================================
route.get("/attachments/download/:attachmentId", async (c) => {
  const { data, error } = await db()
    .from("attachments").select("file_data").eq("id", c.req.param("attachmentId")).maybeSingle();
  if (error) return c.json(fail(error.message, 500), 500);
  if (!data || !(data as any).file_data) return c.json(fail("File not found", 404), 404);
  return c.json(ok((data as any).file_data));
});

route.get("/attachments/:entityType/:entityId", async (c) => {
  const { data, error } = await db()
    .from("attachments")
    .select("id, file_name, file_size, file_type, uploaded_at")
    .eq("entity_type", c.req.param("entityType"))
    .eq("entity_id", c.req.param("entityId"))
    .order("uploaded_at", { ascending: false });
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json(ok((data ?? []).map((r: any) => ({
    id: r.id,
    fileName: r.file_name,
    fileSize: r.file_size,
    fileType: r.file_type,
    uploadedAt: r.uploaded_at,
  }))));
});

route.post("/attachments/:entityType/:entityId", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.fileName) return c.json(fail("fileName is required", 400), 400);
  const { data, error } = await db().from("attachments").insert({
    entity_type: c.req.param("entityType"),
    entity_id:   c.req.param("entityId"),
    file_name:   body.fileName,
    file_size:   body.fileSize ?? 0,
    file_type:   body.fileType ?? "application/octet-stream",
    file_data:   body.fileData ?? null,
  }).select("id, file_name, file_size, file_type, uploaded_at").single();
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json(ok({
    id: (data as any).id,
    fileName: (data as any).file_name,
    fileSize: (data as any).file_size,
    fileType: (data as any).file_type,
    uploadedAt: (data as any).uploaded_at,
  }));
});

route.delete("/attachments/:entityType/:entityId/:attachmentId", async (c) => {
  const { error } = await db().from("attachments").delete().eq("id", c.req.param("attachmentId"));
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ============================================================================
// form_e_documents + fsi_documents  (one per booking; treated as upsert)
// ============================================================================
function formDocRowToApi(row: any) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    refNo: row.ref_no,
    status: row.status,
    ...(row.data ?? {}),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formDocApiToRow(body: any, bookingId: string) {
  const known = new Set([
    "id","bookingId","booking_id","refNo","ref_no","status",
    "createdBy","created_by","createdAt","created_at","updatedAt","updated_at",
  ]);
  const data: any = {};
  for (const [k, v] of Object.entries(body)) if (!known.has(k)) data[k] = v;
  return {
    booking_id: bookingId,
    ref_no: body.refNo ?? body.ref_no ?? null,
    status: body.status ?? null,
    data: Object.keys(data).length ? data : {},
    created_by: asUuid(body.createdBy ?? body.created_by),
  };
}

function registerFormDocRoutes(prefix: "form-e" | "fsi", table: "form_e_documents" | "fsi_documents") {
  route.get(`/${prefix}`, async (c) => {
    const bookingId = c.req.query("bookingId");
    if (!bookingId) return c.json(fail("bookingId parameter required", 400), 400);
    const { data, error } = await db().from(table).select("*").eq("booking_id", bookingId).maybeSingle();
    if (error) return c.json(fail(error.message, 500), 500);
    return c.json(ok(data ? formDocRowToApi(data) : null));
  });

  route.post(`/${prefix}`, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const bookingId = asUuid(body.bookingId ?? body.booking_id);
    if (!bookingId) return c.json(fail("bookingId must be a valid UUID", 400), 400);
    const row = formDocApiToRow(body, bookingId);
    const { data, error } = await db()
      .from(table).upsert(row, { onConflict: "booking_id" }).select().single();
    if (error) return c.json(fail(error.message, 400), 400);
    return c.json(ok(formDocRowToApi(data)));
  });

  route.put(`/${prefix}/:id`, async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const { data: existing } = await db().from(table).select("*").eq("id", id).maybeSingle();
    if (!existing) return c.json(fail("Not found", 404), 404);
    const knownKeys = new Set([
      "id","bookingId","booking_id","refNo","ref_no","status",
      "createdBy","created_by","createdAt","created_at","updatedAt","updated_at",
    ]);
    const incoming: any = {};
    for (const [k, v] of Object.entries(body)) if (!knownKeys.has(k)) incoming[k] = v;
    const mergedData = { ...((existing as any).data ?? {}), ...incoming };
    const update: any = { data: mergedData };
    if (body.refNo !== undefined || body.ref_no !== undefined) update.ref_no = body.refNo ?? body.ref_no;
    if (body.status !== undefined) update.status = body.status;
    const { data, error } = await db().from(table).update(update).eq("id", id).select().single();
    if (error) return c.json(fail(error.message, 400), 400);
    return c.json(ok(formDocRowToApi(data)));
  });

  route.delete(`/${prefix}/:id`, async (c) => {
    const { error } = await db().from(table).delete().eq("id", c.req.param("id"));
    if (error) return c.json(fail(error.message, 400), 400);
    return c.json({ success: true });
  });
}

registerFormDocRoutes("form-e", "form_e_documents");
registerFormDocRoutes("fsi",    "fsi_documents");

// ============================================================================
// accounting helpers
// ============================================================================
const EPS = 0.01;

// ---------- expenses ----------
const EXPENSE_KNOWN_COLS = new Set([
  "id","bookingId","booking_id","segmentId","segment_id","amount","currency","status","notes",
  "charges","created_by","createdBy","created_at","createdAt","updated_at","updatedAt",
  "uuid",
]);

function expenseRowToApi(row: any, particulars: any[]) {
  return {
    ...(row.data ?? {}),
    id: row.id,
    bookingId: row.booking_id,
    segmentId: row.segment_id,
    amount: Number(row.amount ?? 0),
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    charges: particulars.map((p) => ({
      id: p.id,
      description: p.description,
      amount: Number(p.amount ?? 0),
      currency: p.currency,
      ...(p.data ?? {}),
    })),
    created_by: row.created_by,
    createdBy: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadExpenseApi(id: string) {
  const { data: row, error } = await db().from("expenses").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const { data: parts } = await db()
    .from("expense_particulars").select("*").eq("expense_id", id)
    .order("position", { ascending: true });
  return expenseRowToApi(row, parts ?? []);
}

route.post("/expenses", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const bookingIdInput = body.bookingId ?? body.booking_id;
  const row: any = {
    booking_id: bookingIdInput
      ? (asUuid(bookingIdInput) ?? await resolveRowId("bookings", "booking_number", String(bookingIdInput)))
      : null,
    segment_id: asUuid(body.segmentId ?? body.segment_id),
    amount: body.amount ?? 0,
    currency: body.currency ?? "PHP",
    status: body.status ?? "Draft",
    notes: body.notes ?? null,
    created_by: asUuid(body.created_by ?? body.createdBy),
  };
  const extras: any = {};
  for (const [k, v] of Object.entries(body)) if (!EXPENSE_KNOWN_COLS.has(k)) extras[k] = v;
  if (Object.keys(extras).length) row.data = extras;
  const { data: inserted, error } = await db().from("expenses").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  const expenseId = (inserted as any).id;
  const charges: any[] = Array.isArray(body.charges) ? body.charges : [];
  if (charges.length) {
    const partRows = charges.map((ch, i) => {
      const known = new Set(["id","description","amount","currency"]);
      const extra: any = {};
      for (const [k, v] of Object.entries(ch)) if (!known.has(k)) extra[k] = v;
      return {
        expense_id: expenseId,
        description: ch.description ?? "",
        amount: ch.amount ?? 0,
        currency: ch.currency ?? row.currency,
        data: Object.keys(extra).length ? extra : null,
        position: i + 1,
      };
    });
    const { error: pe } = await db().from("expense_particulars").insert(partRows);
    if (pe) return c.json(fail(pe.message, 400), 400);
  }
  return c.json(ok(await loadExpenseApi(expenseId)));
});

route.get("/expenses", async (c) => {
  const status = c.req.query("status");
  const bookingId = c.req.query("bookingId") ?? c.req.query("booking_id");
  const segmentId = c.req.query("segmentId");
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
  const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;
  let q = db().from("expenses").select("*").order("updated_at", { ascending: false });
  if (status) q = q.eq("status", status);
  if (bookingId) {
    const bookingUuid = UUID_RE.test(bookingId)
      ? bookingId
      : await resolveRowId("bookings", "booking_number", bookingId);
    if (!bookingUuid) return c.json(ok([]));
    q = q.eq("booking_id", bookingUuid);
  }
  if (segmentId) q = q.eq("segment_id", segmentId);
  if (limit !== undefined) q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  const rows = (data ?? []) as any[];
  if (!rows.length) return c.json(ok([]));
  const ids = rows.map((r) => r.id);
  const { data: parts } = await db()
    .from("expense_particulars").select("*").in("expense_id", ids)
    .order("position", { ascending: true });
  const partsByExpense: Record<string, any[]> = {};
  for (const p of (parts ?? []) as any[]) (partsByExpense[p.expense_id] ??= []).push(p);
  return c.json(ok(rows.map((r) => expenseRowToApi(r, partsByExpense[r.id] ?? []))));
});

route.get("/expenses/:id", async (c) => {
  const expense = await loadExpenseApi(c.req.param("id"));
  if (!expense) return c.json(fail("Expense not found", 404), 404);
  return c.json(ok(expense));
});

route.patch("/expenses/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const update: any = {};
  if (body.bookingId !== undefined || body.booking_id !== undefined) {
    const input = body.bookingId ?? body.booking_id;
    update.booking_id = input
      ? (asUuid(input) ?? await resolveRowId("bookings", "booking_number", String(input)))
      : null;
  }
  if (body.segmentId !== undefined || body.segment_id !== undefined) update.segment_id = asUuid(body.segmentId ?? body.segment_id);
  if (body.amount !== undefined)   update.amount = body.amount;
  if (body.currency !== undefined) update.currency = body.currency;
  if (body.status !== undefined)   update.status = body.status;
  if (body.notes !== undefined)    update.notes = body.notes;
  const extras: any = {};
  for (const [k, v] of Object.entries(body)) if (!EXPENSE_KNOWN_COLS.has(k)) extras[k] = v;
  if (Object.keys(extras).length) {
    const { data: existing } = await db().from("expenses").select("data").eq("id", id).maybeSingle();
    update.data = { ...((existing as any)?.data ?? {}), ...extras };
  }
  if (Object.keys(update).length) {
    const { error } = await db().from("expenses").update(update).eq("id", id);
    if (error) return c.json(fail(error.message, 400), 400);
  }
  if (Array.isArray(body.charges)) {
    await db().from("expense_particulars").delete().eq("expense_id", id);
    if (body.charges.length) {
      const partRows = body.charges.map((ch: any, i: number) => {
        const known = new Set(["id","description","amount","currency"]);
        const extra: any = {};
        for (const [k, v] of Object.entries(ch)) if (!known.has(k)) extra[k] = v;
        return {
          expense_id: id,
          description: ch.description ?? "",
          amount: ch.amount ?? 0,
          currency: ch.currency ?? "PHP",
          data: Object.keys(extra).length ? extra : null,
          position: i + 1,
        };
      });
      await db().from("expense_particulars").insert(partRows);
    }
  }
  const expense = await loadExpenseApi(id);
  if (!expense) return c.json(fail("Expense not found", 404), 404);
  return c.json(ok(expense));
});

route.delete("/expenses/:id", async (c) => {
  const { error } = await db().from("expenses").delete().eq("id", c.req.param("id"));
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ---------- vouchers ----------
const VOUCHER_KNOWN_COLS = new Set([
  "id","uuid","voucherNumber","voucher_number","voucherType","voucher_type","voucherYear","voucher_year",
  "companyCode","company_code","payee","category","bank","checkNo","check_no","referenceNumber",
  "paymentMethod","payment_method","voucherDate","voucher_date","postingDate","posting_date",
  "notes","deliveryAddress","delivery_address","loadingAddress","loading_address",
  "amount","currency","status","bookingId","booking_id","expenseId","expense_id",
  "lineItems","created_by","createdBy","created_at","createdAt","updated_at","updatedAt",
]);

function voucherRowToApi(row: any, lineItems: any[]) {
  return {
    ...(row.data ?? {}),
    id: row.voucher_number,
    uuid: row.id,
    voucherNumber: row.voucher_number,
    voucherType: row.voucher_type,
    voucherYear: row.voucher_year,
    companyCode: row.company_code,
    payee: row.payee,
    category: row.category,
    bank: row.bank,
    checkNo: row.check_no,
    referenceNumber: row.check_no,
    paymentMethod: row.payment_method,
    voucherDate: row.voucher_date,
    postingDate: row.posting_date,
    notes: row.notes,
    deliveryAddress: row.delivery_address,
    loadingAddress: row.loading_address,
    amount: Number(row.amount ?? 0),
    currency: row.currency,
    status: row.status,
    bookingId: row.booking_id,
    expenseId: row.expense_id,
    lineItems: lineItems.map((li) => ({
      id: li.id,
      expenseParticularId: li.expense_particular_id,
      description: li.description,
      amount: Number(li.amount ?? 0),
      currency: li.currency,
      ...(li.data ?? {}),
    })),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadVoucherApi(id: string) {
  const { data: row } = await db().from("vouchers").select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const { data: items } = await db()
    .from("voucher_line_items").select("*").eq("voucher_id", id)
    .order("position", { ascending: true });
  return voucherRowToApi(row, items ?? []);
}

async function nextVoucherSeq(companyCode: string, voucherType: string, year: number): Promise<number> {
  const { data } = await db()
    .from("vouchers")
    .select("voucher_number")
    .eq("company_code", companyCode)
    .eq("voucher_type", voucherType)
    .eq("voucher_year", year);
  let max = 0;
  for (const row of (data ?? []) as any[]) {
    const m = String(row.voucher_number ?? "").match(/-(\d+)\s*$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

async function nextVoucherNumber(companyCode: string, voucherType: string, year: number) {
  const seq = await nextVoucherSeq(companyCode, voucherType, year);
  return `${companyCode} ${voucherType} ${year}-${seq}`;
}

route.get("/vouchers", async (c) => {
  const status = c.req.query("status");
  const bookingId = c.req.query("bookingId");
  let q = db().from("vouchers").select("*").order("voucher_date", { ascending: false });
  if (status)    q = q.eq("status", status);
  if (bookingId) q = q.eq("booking_id", bookingId);
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  const rows = (data ?? []) as any[];
  if (!rows.length) return c.json(ok([]));
  const ids = rows.map((r) => r.id);
  const { data: items } = await db()
    .from("voucher_line_items").select("*").in("voucher_id", ids)
    .order("position", { ascending: true });
  const byVoucher: Record<string, any[]> = {};
  for (const li of (items ?? []) as any[]) (byVoucher[li.voucher_id] ??= []).push(li);
  return c.json(ok(rows.map((r) => voucherRowToApi(r, byVoucher[r.id] ?? []))));
});

route.get("/vouchers/:voucherId", async (c) => {
  const uuid = await resolveRowId("vouchers", "voucher_number", c.req.param("voucherId"));
  if (!uuid) return c.json(fail("Voucher not found", 404), 404);
  const voucher = await loadVoucherApi(uuid);
  if (!voucher) return c.json(fail("Voucher not found", 404), 404);
  return c.json(ok(voucher));
});

route.post("/vouchers", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const companyCode = body.companyCode ?? "RVS";
  const voucherType = body.voucherType ?? "CV";
  const voucherYear = body.voucherYear ?? new Date().getFullYear();
  const voucherNumber = body.voucherNumber ?? await nextVoucherNumber(companyCode, voucherType, voucherYear);

  const { data: dup } = await db()
    .from("vouchers").select("id").eq("voucher_number", voucherNumber).maybeSingle();
  if (dup) return c.json(fail(`Reference number ${voucherNumber} is already in use by another active record.`, 409), 409);

  const bookingIdInput = body.bookingId ?? body.booking_id;
  const row: any = {
    voucher_number: voucherNumber,
    voucher_type: voucherType,
    voucher_year: voucherYear,
    company_code: companyCode,
    payee: body.payee ?? "",
    category: body.category ?? null,
    bank: body.bank ?? null,
    check_no: body.referenceNumber ?? body.checkNo ?? body.check_no ?? null,
    payment_method: body.paymentMethod ?? null,
    voucher_date: body.voucherDate ?? new Date().toISOString(),
    posting_date: body.postingDate ?? null,
    notes: body.notes ?? null,
    delivery_address: body.deliveryAddress ?? null,
    loading_address: body.loadingAddress ?? null,
    amount: body.amount ?? 0,
    currency: body.currency ?? "PHP",
    status: body.status ?? "Draft",
    booking_id: bookingIdInput ? await resolveRowId("bookings", "booking_number", String(bookingIdInput)) : null,
    expense_id: asUuid(body.expenseId ?? body.expense_id),
    created_by: asUuid(body.created_by ?? body.createdBy),
  };
  const vExtras: any = {};
  for (const [k, v] of Object.entries(body)) if (!VOUCHER_KNOWN_COLS.has(k)) vExtras[k] = v;
  if (Object.keys(vExtras).length) row.data = vExtras;
  const { data: inserted, error } = await db().from("vouchers").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  const vid = (inserted as any).id;
  const lineItems: any[] = Array.isArray(body.lineItems) ? body.lineItems : [];
  if (lineItems.length) {
    const itemRows = lineItems.map((li: any, i: number) => {
      const known = new Set(["id","description","amount","currency","expenseParticularId","expense_particular_id"]);
      const extra: any = {};
      for (const [k, v] of Object.entries(li)) if (!known.has(k)) extra[k] = v;
      return {
        voucher_id: vid,
        expense_particular_id: li.expenseParticularId ?? li.expense_particular_id ?? null,
        description: li.description ?? "",
        amount: li.amount ?? 0,
        currency: li.currency ?? row.currency,
        data: Object.keys(extra).length ? extra : null,
        position: i + 1,
      };
    });
    await db().from("voucher_line_items").insert(itemRows);
  }
  return c.json(ok(await loadVoucherApi(vid)));
});

route.patch("/vouchers/:id", async (c) => {
  const id = await resolveRowId("vouchers", "voucher_number", c.req.param("id"));
  if (!id) return c.json(fail("Voucher not found", 404), 404);
  const body = await c.req.json().catch(() => ({}));
  const update: any = {};
  if (body.payee !== undefined)        update.payee = body.payee;
  if (body.category !== undefined)     update.category = body.category;
  if (body.bank !== undefined)         update.bank = body.bank;
  if (body.checkNo !== undefined)      update.check_no = body.checkNo;
  if (body.referenceNumber !== undefined) update.check_no = body.referenceNumber;
  if (body.paymentMethod !== undefined) update.payment_method = body.paymentMethod;
  if (body.voucherDate !== undefined)  update.voucher_date = body.voucherDate;
  if (body.postingDate !== undefined)  update.posting_date = body.postingDate || null;
  if (body.notes !== undefined)        update.notes = body.notes;
  if (body.deliveryAddress !== undefined) update.delivery_address = body.deliveryAddress;
  if (body.loadingAddress !== undefined)  update.loading_address = body.loadingAddress;
  if (body.amount !== undefined)       update.amount = body.amount;
  if (body.currency !== undefined)     update.currency = body.currency;
  if (body.status !== undefined)       update.status = body.status;
  if (body.bookingId !== undefined)    update.booking_id = body.bookingId
    ? await resolveRowId("bookings", "booking_number", String(body.bookingId))
    : null;
  if (body.expenseId !== undefined)    update.expense_id = asUuid(body.expenseId);
  if (body.voucherNumber !== undefined) update.voucher_number = body.voucherNumber;
  const vExtras: any = {};
  for (const [k, v] of Object.entries(body)) if (!VOUCHER_KNOWN_COLS.has(k)) vExtras[k] = v;
  if (Object.keys(vExtras).length) {
    const { data: existing } = await db().from("vouchers").select("data").eq("id", id).maybeSingle();
    update.data = { ...((existing as any)?.data ?? {}), ...vExtras };
  }
  if (Object.keys(update).length) {
    const { error } = await db().from("vouchers").update(update).eq("id", id);
    if (error) return c.json(fail(error.message, 400), 400);
  }
  if (Array.isArray(body.lineItems)) {
    // Preserve line item identity: update rows whose id matches an existing UUID,
    // insert new rows without an id, and delete only the rows omitted from the payload.
    // Stable UUIDs keep downstream `sourceVoucherLineItemId` references in expenses intact.
    const { data: existingRows } = await db()
      .from("voucher_line_items").select("id").eq("voucher_id", id);
    const existingIds = new Set(((existingRows ?? []) as any[]).map((r) => r.id));
    const known = new Set(["id","description","amount","currency","expenseParticularId","expense_particular_id"]);
    const incomingIds = new Set<string>();
    for (let i = 0; i < body.lineItems.length; i++) {
      const li: any = body.lineItems[i];
      const extra: any = {};
      for (const [k, v] of Object.entries(li)) if (!known.has(k)) extra[k] = v;
      const liId: string | undefined =
        typeof li.id === "string" && UUID_RE.test(li.id) && existingIds.has(li.id) ? li.id : undefined;
      const rowData = {
        expense_particular_id: li.expenseParticularId ?? li.expense_particular_id ?? null,
        description: li.description ?? "",
        amount: li.amount ?? 0,
        currency: li.currency ?? "PHP",
        data: Object.keys(extra).length ? extra : null,
        position: i + 1,
      };
      if (liId) {
        incomingIds.add(liId);
        await db().from("voucher_line_items").update(rowData).eq("id", liId);
      } else {
        const { data: ins } = await db()
          .from("voucher_line_items").insert({ voucher_id: id, ...rowData }).select("id").single();
        if (ins) incomingIds.add((ins as any).id);
      }
    }
    const toDelete = [...existingIds].filter((eid) => !incomingIds.has(eid));
    if (toDelete.length) {
      await db().from("voucher_line_items").delete().in("id", toDelete);
    }
  }
  const voucher = await loadVoucherApi(id);
  if (!voucher) return c.json(fail("Voucher not found", 404), 404);
  return c.json(ok(voucher));
});

route.delete("/vouchers/:id", async (c) => {
  const id = await resolveRowId("vouchers", "voucher_number", c.req.param("id"));
  if (!id) return c.json({ success: true });
  const { error } = await db().from("vouchers").delete().eq("id", id);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

route.get("/expenses/:expenseId/vouchers", async (c) => {
  const expenseId = c.req.param("expenseId");
  const { data, error } = await db()
    .from("vouchers").select("*").eq("expense_id", expenseId)
    .order("voucher_date", { ascending: false });
  if (error) return c.json(fail(error.message, 500), 500);
  const rows = (data ?? []) as any[];
  if (!rows.length) return c.json(ok([]));
  const ids = rows.map((r) => r.id);
  const { data: items } = await db()
    .from("voucher_line_items").select("*").in("voucher_id", ids).order("position", { ascending: true });
  const byVoucher: Record<string, any[]> = {};
  for (const li of (items ?? []) as any[]) (byVoucher[li.voucher_id] ??= []).push(li);
  return c.json(ok(rows.map((r) => voucherRowToApi(r, byVoucher[r.id] ?? []))));
});

// ---------- billings ----------
function billingRowToApi(row: any, particulars: any[], bookingIds: string[], expenseIds: string[], balance?: { collected: number; outstanding: number }) {
  const sh = row.shipment ?? {};
  return {
    id: row.billing_number,
    uuid: row.id,
    billingNumber: row.billing_number,
    billingCompanyCode: row.billing_company_code,
    billingYear: row.billing_year,
    clientId: row.client_id,
    clientName: row.client_name,
    companyName: row.company_name,
    voucherId: row.voucher_id,
    expenseAmount: Number(row.expense_amount ?? 0),
    totalExpenses: Number(row.total_expenses ?? 0),
    margin: Number(row.margin ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    currency: row.currency,
    exchangeRate: row.exchange_rate ? Number(row.exchange_rate) : undefined,
    status: row.status,
    billingDate: row.billing_date,
    particulars: particulars.map((p) => ({
      id: p.id,
      description: p.description,
      quantity: Number(p.quantity ?? 0),
      rate: Number(p.rate ?? 0),
      amount: Number(p.amount ?? 0),
      currency: p.currency,
      ...(p.data ?? {}),
    })),
    bookingIds,
    expenseIds,
    collected: balance?.collected ?? 0,
    balance: balance?.outstanding ?? Number(row.total_amount ?? 0),
    ...sh,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadBillingApi(id: string) {
  const { data: row } = await db().from("billings").select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const [{ data: parts }, { data: bks }, { data: exs }, { data: bal }] = await Promise.all([
    db().from("billing_particulars").select("*").eq("billing_id", id).order("position", { ascending: true }),
    db().from("billing_bookings").select("booking_id").eq("billing_id", id),
    db().from("billing_expenses").select("expense_id").eq("billing_id", id),
    db().from("v_billing_balances").select("*").eq("billing_id", id).maybeSingle(),
  ]);
  return billingRowToApi(
    row, parts ?? [],
    ((bks ?? []) as any[]).map((r) => r.booking_id),
    ((exs ?? []) as any[]).map((r) => r.expense_id),
    bal ? { collected: Number((bal as any).collected ?? 0), outstanding: Number((bal as any).outstanding_balance ?? 0) } : undefined,
  );
}

async function resolveBookingIdsToUuids(ids: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const raw of ids) {
    if (!raw) continue;
    if (UUID_RE.test(raw)) { out.push(raw); continue; }
    const uuid = await resolveRowId("bookings", "booking_number", raw);
    if (uuid) out.push(uuid);
  }
  return out;
}

function billingShipmentFromBody(body: any) {
  const keys = ["vessel","blNumber","containerNumbers","destination","origin","shipper","consignee","volume","commodity","contractNumber"];
  const ship: any = {};
  for (const k of keys) if (body[k] !== undefined) ship[k] = body[k];
  return Object.keys(ship).length ? ship : null;
}

async function nextBillingNumber(companyCode: string, year: number) {
  const { data, error } = await db().rpc("next_counter", {
    p_scope: `billing:${companyCode}`, p_year: year,
  });
  if (error) throw new Error(error.message);
  return `${companyCode} ${year}-${data}`;
}

route.get("/billings", async (c) => {
  const status = c.req.query("status");
  const clientId = c.req.query("clientId") ?? c.req.query("client_id");
  const bookingId = c.req.query("bookingId") ?? c.req.query("booking_id");

  // bookingId filter pre-resolves the relevant billing ids via the junction
  // table so we don't have to fetch every billing + child row just to filter
  // client-side (the previous reports/detail flow). Accept either a UUID or
  // a public booking_number.
  let billingIdFilter: string[] | null = null;
  if (bookingId) {
    const bookingUuid = UUID_RE.test(bookingId)
      ? bookingId
      : await resolveRowId("bookings", "booking_number", bookingId);
    if (!bookingUuid) return c.json(ok([]));
    const { data: junc, error: je } = await db()
      .from("billing_bookings").select("billing_id").eq("booking_id", bookingUuid);
    if (je) return c.json(fail(je.message, 500), 500);
    billingIdFilter = Array.from(new Set(((junc ?? []) as any[]).map((r) => r.billing_id).filter(Boolean)));
    if (billingIdFilter.length === 0) return c.json(ok([]));
  }

  let q = db().from("billings").select("*").order("billing_date", { ascending: false });
  if (status)            q = q.eq("status", status);
  if (clientId)          q = q.eq("client_id", clientId);
  if (billingIdFilter)   q = q.in("id", billingIdFilter);
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  const rows = (data ?? []) as any[];
  if (!rows.length) return c.json(ok([]));
  const ids = rows.map((r) => r.id);

  const [{ data: parts }, { data: bks }, { data: exs }, { data: balances }] = await Promise.all([
    db().from("billing_particulars").select("*").in("billing_id", ids).order("position", { ascending: true }),
    db().from("billing_bookings").select("billing_id, booking_id").in("billing_id", ids),
    db().from("billing_expenses").select("billing_id, expense_id").in("billing_id", ids),
    db().from("v_billing_balances").select("*").in("billing_id", ids),
  ]);
  const partsBy: Record<string, any[]> = {};
  for (const p of (parts ?? []) as any[]) (partsBy[p.billing_id] ??= []).push(p);
  const bksBy: Record<string, string[]> = {};
  for (const b of (bks ?? []) as any[]) (bksBy[b.billing_id] ??= []).push(b.booking_id);
  const exsBy: Record<string, string[]> = {};
  for (const e of (exs ?? []) as any[]) (exsBy[e.billing_id] ??= []).push(e.expense_id);
  const balBy: Record<string, any> = {};
  for (const b of (balances ?? []) as any[]) balBy[b.billing_id] = b;

  return c.json(ok(rows.map((r) => billingRowToApi(
    r, partsBy[r.id] ?? [], bksBy[r.id] ?? [], exsBy[r.id] ?? [],
    balBy[r.id] ? { collected: Number(balBy[r.id].collected ?? 0), outstanding: Number(balBy[r.id].outstanding_balance ?? 0) } : undefined,
  ))));
});

route.get("/billings/:id", async (c) => {
  const uuid = await resolveRowId("billings", "billing_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Billing not found", 404), 404);
  const billing = await loadBillingApi(uuid);
  if (!billing) return c.json(fail("Billing not found", 404), 404);
  return c.json(ok(billing));
});

route.post("/billings", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const companyCode = body.billingCompanyCode ?? "RVS";
  const year = body.billingYear ?? new Date().getFullYear();
  const billingNumber = body.billingNumber ?? await nextBillingNumber(companyCode, year);

  const { data: dup } = await db()
    .from("billings").select("id").eq("billing_number", billingNumber).maybeSingle();
  if (dup) return c.json(fail(`Reference number ${billingNumber} is already in use by another active record.`, 409), 409);
  const clientId = asUuid(body.clientId);
  if (!clientId) return c.json(fail("clientId is required (must be a valid UUID)", 400), 400);

  const row: any = {
    billing_number: billingNumber,
    billing_company_code: companyCode,
    billing_year: year,
    client_id: clientId,
    client_name: body.clientName ?? "",
    company_name: body.companyName ?? null,
    voucher_id: asUuid(body.voucherId),
    expense_amount: body.expenseAmount ?? 0,
    total_expenses: body.totalExpenses ?? 0,
    margin: body.margin ?? 0,
    total_amount: body.totalAmount ?? 0,
    currency: body.currency ?? "PHP",
    exchange_rate: body.exchangeRate ?? null,
    status: body.status ?? "Draft",
    billing_date: body.billingDate ?? new Date().toISOString(),
    shipment: billingShipmentFromBody(body),
    created_by: asUuid(body.created_by ?? body.createdBy),
  };

  const { data: inserted, error } = await db().from("billings").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  const bid = (inserted as any).id;

  const particulars: any[] = Array.isArray(body.particulars) ? body.particulars : [];
  if (particulars.length) {
    const partRows = particulars.map((p: any, i: number) => {
      const known = new Set(["id","description","quantity","rate","amount","currency"]);
      const extra: any = {};
      for (const [k, v] of Object.entries(p)) if (!known.has(k)) extra[k] = v;
      return {
        billing_id: bid,
        description: p.description ?? "",
        quantity: p.quantity ?? 1,
        rate: p.rate ?? 0,
        amount: p.amount ?? 0,
        currency: p.currency ?? row.currency,
        data: Object.keys(extra).length ? extra : null,
        position: i + 1,
      };
    });
    await db().from("billing_particulars").insert(partRows);
  }
  if (Array.isArray(body.bookingIds) && body.bookingIds.length) {
    const resolved = await resolveBookingIdsToUuids(body.bookingIds);
    if (resolved.length) {
      const { error: jErr } = await db().from("billing_bookings").insert(resolved.map((b) => ({ billing_id: bid, booking_id: b })));
      if (jErr) return c.json(fail(`Failed to link bookings: ${jErr.message}`, 400), 400);
    }
  }
  if (Array.isArray(body.expenseIds) && body.expenseIds.length) {
    const { error: eErr } = await db().from("billing_expenses").insert(body.expenseIds.map((e: string) => ({ billing_id: bid, expense_id: e })));
    if (eErr) return c.json(fail(`Failed to link expenses: ${eErr.message}`, 400), 400);
  }
  return c.json(ok(await loadBillingApi(bid)));
});

async function patchBilling(id: string, body: any) {
  const update: any = {};
  if (body.billingNumber !== undefined) update.billing_number = body.billingNumber;
  if (body.clientId !== undefined)      update.client_id = asUuid(body.clientId);
  if (body.clientName !== undefined)    update.client_name = body.clientName;
  if (body.companyName !== undefined)   update.company_name = body.companyName;
  if (body.voucherId !== undefined)     update.voucher_id = asUuid(body.voucherId);
  if (body.expenseAmount !== undefined) update.expense_amount = body.expenseAmount;
  if (body.totalExpenses !== undefined) update.total_expenses = body.totalExpenses;
  if (body.margin !== undefined)        update.margin = body.margin;
  if (body.totalAmount !== undefined)   update.total_amount = body.totalAmount;
  if (body.currency !== undefined)      update.currency = body.currency;
  if (body.exchangeRate !== undefined)  update.exchange_rate = body.exchangeRate;
  if (body.status !== undefined)        update.status = body.status;
  if (body.billingDate !== undefined)   update.billing_date = body.billingDate;
  const ship = billingShipmentFromBody(body);
  if (ship) update.shipment = ship;
  if (Object.keys(update).length) {
    const { error } = await db().from("billings").update(update).eq("id", id);
    if (error) throw new Error(error.message);
  }
  if (Array.isArray(body.particulars)) {
    await db().from("billing_particulars").delete().eq("billing_id", id);
    if (body.particulars.length) {
      const partRows = body.particulars.map((p: any, i: number) => {
        const known = new Set(["id","description","quantity","rate","amount","currency"]);
        const extra: any = {};
        for (const [k, v] of Object.entries(p)) if (!known.has(k)) extra[k] = v;
        return {
          billing_id: id,
          description: p.description ?? "",
          quantity: p.quantity ?? 1,
          rate: p.rate ?? 0,
          amount: p.amount ?? 0,
          currency: p.currency ?? "PHP",
          data: Object.keys(extra).length ? extra : null,
          position: i + 1,
        };
      });
      await db().from("billing_particulars").insert(partRows);
    }
  }
  if (Array.isArray(body.bookingIds)) {
    await db().from("billing_bookings").delete().eq("billing_id", id);
    if (body.bookingIds.length) {
      const resolved = await resolveBookingIdsToUuids(body.bookingIds);
      if (resolved.length) {
        const { error: jErr } = await db().from("billing_bookings").insert(resolved.map((b) => ({ billing_id: id, booking_id: b })));
        if (jErr) throw new Error(`Failed to link bookings: ${jErr.message}`);
      }
    }
  }
  if (Array.isArray(body.expenseIds)) {
    await db().from("billing_expenses").delete().eq("billing_id", id);
    if (body.expenseIds.length) {
      await db().from("billing_expenses").insert(body.expenseIds.map((e: string) => ({ billing_id: id, expense_id: e })));
    }
  }
}

route.patch("/billings/:id", async (c) => {
  try {
    const uuid = await resolveRowId("billings", "billing_number", c.req.param("id"));
    if (!uuid) return c.json(fail("Billing not found", 404), 404);
    await patchBilling(uuid, await c.req.json().catch(() => ({})));
    return c.json(ok(await loadBillingApi(uuid)));
  } catch (e: any) { return c.json(fail(e.message, 400), 400); }
});

route.put("/billings/:id", async (c) => {
  try {
    const uuid = await resolveRowId("billings", "billing_number", c.req.param("id"));
    if (!uuid) return c.json(fail("Billing not found", 404), 404);
    await patchBilling(uuid, await c.req.json().catch(() => ({})));
    return c.json(ok(await loadBillingApi(uuid)));
  } catch (e: any) { return c.json(fail(e.message, 400), 400); }
});

route.delete("/billings/:id", async (c) => {
  const uuid = await resolveRowId("billings", "billing_number", c.req.param("id"));
  if (!uuid) return c.json({ success: true });
  await db().from("collection_allocations").delete().eq("billing_id", uuid);
  await db().from("billing_particulars").delete().eq("billing_id", uuid);
  await db().from("billing_bookings").delete().eq("billing_id", uuid);
  await db().from("billing_expenses").delete().eq("billing_id", uuid);
  const { error } = await db().from("billings").delete().eq("id", uuid);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ---------- collections ----------
const COLLECTION_KNOWN_COLS = new Set([
  "id","uuid","collectionNumber","collection_number","clientId","client_id","clientName","client_name",
  "amount","currency","status","collectionDate","collection_date",
  "paymentMethod","payment_method","referenceNumber","reference_number",
  "bankName","bank_name","checkNumber","check_number","notes",
  "billingId","billingNumber","allocations",
  "created_by","createdBy","created_at","createdAt","updated_at","updatedAt",
]);

function collectionRowToApi(row: any, allocations: any[], billingNumbersById: Record<string, string>) {
  const primary = allocations[0];
  return {
    ...(row.data ?? {}),
    id: row.collection_number,
    uuid: row.id,
    collectionNumber: row.collection_number,
    clientId: row.client_id,
    clientName: row.client_name,
    amount: Number(row.amount ?? 0),
    currency: row.currency,
    status: row.status,
    collectionDate: row.collection_date,
    paymentMethod: row.payment_method,
    referenceNumber: row.reference_number,
    bankName: row.bank_name,
    checkNumber: row.check_number,
    notes: row.notes,
    billingId: primary?.billing_id ?? null,
    billingNumber: primary ? billingNumbersById[primary.billing_id] : null,
    allocations: allocations.map((a) => ({
      billingId: a.billing_id,
      billingNumber: billingNumbersById[a.billing_id],
      amount: Number(a.amount ?? 0),
    })),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function fetchBillingNumbers(billingIds: string[]) {
  if (!billingIds.length) return {};
  const { data } = await db().from("billings").select("id, billing_number").in("id", billingIds);
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as any[]) out[r.id] = r.billing_number;
  return out;
}

async function loadCollectionApi(id: string) {
  const { data: row } = await db().from("collections").select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const { data: allocs } = await db().from("collection_allocations").select("*").eq("collection_id", id);
  const nums = await fetchBillingNumbers(((allocs ?? []) as any[]).map((a) => a.billing_id));
  return collectionRowToApi(row, allocs ?? [], nums);
}

async function nextCollectionNumber(year: number) {
  const { data, error } = await db().rpc("next_counter", { p_scope: "collection", p_year: year });
  if (error) throw new Error(error.message);
  return `COL ${year}-${data}`;
}

route.get("/collections", async (c) => {
  const billingIdParam = c.req.query("billingId");
  const bookingIdParam = c.req.query("bookingId");
  let collectionIds: string[] | undefined;
  if (billingIdParam) {
    let billingUuid = billingIdParam;
    if (!UUID_RE.test(billingIdParam)) {
      const resolved = await resolveRowId("billings", "billing_number", billingIdParam);
      if (!resolved) return c.json(ok([]));
      billingUuid = resolved;
    }
    const { data: allocs } = await db()
      .from("collection_allocations").select("collection_id").eq("billing_id", billingUuid);
    collectionIds = Array.from(new Set(((allocs ?? []) as any[]).map((a) => a.collection_id)));
    if (collectionIds.length === 0) return c.json(ok([]));
  }
  if (bookingIdParam) {
    let bookingUuid = bookingIdParam;
    if (!UUID_RE.test(bookingIdParam)) {
      const resolved = await resolveRowId("bookings", "booking_number", bookingIdParam);
      if (!resolved) return c.json(ok([]));
      bookingUuid = resolved;
    }
    const { data: links } = await db()
      .from("billing_bookings").select("billing_id").eq("booking_id", bookingUuid);
    const matchedBillingIds = Array.from(new Set(((links ?? []) as any[]).map((r) => r.billing_id)));
    if (matchedBillingIds.length === 0) return c.json(ok([]));
    const { data: allocs } = await db()
      .from("collection_allocations").select("collection_id").in("billing_id", matchedBillingIds);
    const fromBooking = Array.from(new Set(((allocs ?? []) as any[]).map((a) => a.collection_id)));
    if (fromBooking.length === 0) return c.json(ok([]));
    collectionIds = collectionIds ? collectionIds.filter((id) => fromBooking.includes(id)) : fromBooking;
    if (collectionIds.length === 0) return c.json(ok([]));
  }
  let q = db().from("collections").select("*").order("created_at", { ascending: false });
  if (collectionIds) q = q.in("id", collectionIds);
  const { data, error } = await q;
  if (error) return c.json(fail(error.message, 500), 500);
  const rows = (data ?? []) as any[];
  if (!rows.length) return c.json(ok([]));
  const ids = rows.map((r) => r.id);
  const { data: allocs } = await db().from("collection_allocations").select("*").in("collection_id", ids);
  const byColl: Record<string, any[]> = {};
  for (const a of (allocs ?? []) as any[]) (byColl[a.collection_id] ??= []).push(a);
  const allBillingIds = Array.from(new Set(((allocs ?? []) as any[]).map((a) => a.billing_id)));
  const nums = await fetchBillingNumbers(allBillingIds);
  return c.json(ok(rows.map((r) => collectionRowToApi(r, byColl[r.id] ?? [], nums))));
});

route.get("/collections/:id", async (c) => {
  const uuid = await resolveRowId("collections", "collection_number", c.req.param("id"));
  if (!uuid) return c.json(fail("Collection not found", 404), 404);
  const collection = await loadCollectionApi(uuid);
  if (!collection) return c.json(fail("Collection not found", 404), 404);
  return c.json(ok(collection));
});

route.post("/collections", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  let allocations: { billingId: string; amount: number }[] = Array.isArray(body.allocations) ? body.allocations : [];
  if (!allocations.length && body.billingId) allocations = [{ billingId: body.billingId, amount: body.amount }];
  if (!allocations.length) return c.json(fail("At least one billing must be selected", 400), 400);
  if (!body.amount || body.amount <= 0) return c.json(fail("Valid total amount is required", 400), 400);

  const allocSum = allocations.reduce((s, a) => s + Number(a.amount ?? 0), 0);
  if (Math.abs(allocSum - Number(body.amount)) > EPS) {
    return c.json(fail("Sum of allocations does not match total amount", 400), 400);
  }

  // Allocations may arrive with billingId as either UUID or public billing_number
  // (the /billings list exposes billing_number as `id`). Resolve to UUIDs first.
  for (const a of allocations) {
    const raw = String(a.billingId ?? "");
    if (!raw) return c.json(fail("Allocation missing billingId", 400), 400);
    if (UUID_RE.test(raw)) continue;
    const uuid = await resolveRowId("billings", "billing_number", raw);
    if (!uuid) return c.json(fail(`Billing ${raw} not found`, 404), 404);
    a.billingId = uuid;
  }
  const billingIds = allocations.map((a) => a.billingId);
  const { data: billings } = await db()
    .from("billings").select("id, billing_number, client_id, client_name, total_amount").in("id", billingIds);
  const billingsById: Record<string, any> = {};
  for (const b of (billings ?? []) as any[]) billingsById[b.id] = b;
  for (const id of billingIds) {
    if (!billingsById[id]) return c.json(fail(`Billing ${id} not found`, 404), 404);
  }
  // outstanding balance check
  const { data: balances } = await db().from("v_billing_balances").select("*").in("billing_id", billingIds);
  const balanceById: Record<string, number> = {};
  for (const b of (balances ?? []) as any[]) balanceById[b.billing_id] = Number(b.outstanding_balance ?? 0);
  for (const a of allocations) {
    if (Number(a.amount) > (balanceById[a.billingId] ?? 0) + EPS) {
      return c.json(fail(`Amount for billing ${billingsById[a.billingId].billing_number} exceeds outstanding balance`, 400), 400);
    }
  }

  const primary = billingsById[allocations[0].billingId];
  const year = new Date().getFullYear();
  const collectionNumber = body.collectionNumber ?? await nextCollectionNumber(year);
  const { data: dup } = await db().from("collections").select("id").eq("collection_number", collectionNumber).maybeSingle();
  if (dup) return c.json(fail(`Reference number ${collectionNumber} is already in use by another active record.`, 409), 409);

  const row: any = {
    collection_number: collectionNumber,
    client_id: asUuid(body.clientId) ?? primary.client_id,
    client_name: body.clientName ?? primary.client_name,
    amount: body.amount,
    currency: body.currency ?? "PHP",
    status: body.status ?? "Collected",
    collection_date: body.collectionDate ?? new Date().toISOString(),
    payment_method: body.paymentMethod ?? null,
    reference_number: body.referenceNumber ?? null,
    bank_name: body.bankName ?? null,
    check_number: body.checkNumber ?? null,
    notes: body.notes ?? null,
    created_by: body.created_by ?? body.createdBy ?? null,
  };
  const cExtras: any = {};
  for (const [k, v] of Object.entries(body)) if (!COLLECTION_KNOWN_COLS.has(k)) cExtras[k] = v;
  if (Object.keys(cExtras).length) row.data = cExtras;
  const { data: inserted, error } = await db().from("collections").insert(row).select().single();
  if (error) return c.json(fail(error.message, 400), 400);
  const cid = (inserted as any).id;

  await db().from("collection_allocations").insert(
    allocations.map((a) => ({
      collection_id: cid,
      billing_id: a.billingId,
      amount: a.amount,
      currency: row.currency,
    })),
  );

  // update billing statuses based on new outstanding balances
  const { data: newBalances } = await db().from("v_billing_balances").select("*").in("billing_id", billingIds);
  for (const b of (newBalances ?? []) as any[]) {
    const status = Number(b.outstanding_balance) <= EPS ? "Completed" : "Partially Collected";
    await db().from("billings").update({ status }).eq("id", b.billing_id);
  }

  return c.json(ok(await loadCollectionApi(cid)));
});

route.patch("/collections/:id", async (c) => {
  const id = await resolveRowId("collections", "collection_number", c.req.param("id"));
  if (!id) return c.json(fail("Collection not found", 404), 404);
  const body = await c.req.json().catch(() => ({}));
  const update: any = {};
  if (body.collectionNumber !== undefined) update.collection_number = body.collectionNumber;
  if (body.clientId !== undefined)         update.client_id = asUuid(body.clientId);
  if (body.clientName !== undefined)       update.client_name = body.clientName;
  if (body.amount !== undefined)           update.amount = body.amount;
  if (body.currency !== undefined)         update.currency = body.currency;
  if (body.status !== undefined)           update.status = body.status;
  if (body.collectionDate !== undefined)   update.collection_date = body.collectionDate;
  if (body.paymentMethod !== undefined)    update.payment_method = body.paymentMethod;
  if (body.referenceNumber !== undefined)  update.reference_number = body.referenceNumber;
  if (body.bankName !== undefined)         update.bank_name = body.bankName;
  if (body.checkNumber !== undefined)      update.check_number = body.checkNumber;
  if (body.notes !== undefined)            update.notes = body.notes;
  const cExtras: any = {};
  for (const [k, v] of Object.entries(body)) if (!COLLECTION_KNOWN_COLS.has(k)) cExtras[k] = v;
  if (Object.keys(cExtras).length) {
    const { data: existing } = await db().from("collections").select("data").eq("id", id).maybeSingle();
    update.data = { ...((existing as any)?.data ?? {}), ...cExtras };
  }
  if (Object.keys(update).length) {
    const { error } = await db().from("collections").update(update).eq("id", id);
    if (error) return c.json(fail(error.message, 400), 400);
  }
  const collection = await loadCollectionApi(id);
  if (!collection) return c.json(fail("Collection not found", 404), 404);
  return c.json(ok(collection));
});

route.delete("/collections/:id", async (c) => {
  const uuid = await resolveRowId("collections", "collection_number", c.req.param("id"));
  if (!uuid) return c.json({ success: true });
  // capture affected billings before deleting allocations
  const { data: allocs } = await db().from("collection_allocations").select("billing_id").eq("collection_id", uuid);
  await db().from("collection_allocations").delete().eq("collection_id", uuid);
  const { error } = await db().from("collections").delete().eq("id", uuid);
  if (error) return c.json(fail(error.message, 400), 400);
  const billingIds = Array.from(new Set(((allocs ?? []) as any[]).map((a) => a.billing_id)));
  if (billingIds.length) {
    const { data: balances } = await db().from("v_billing_balances").select("*").in("billing_id", billingIds);
    for (const b of (balances ?? []) as any[]) {
      const outstanding = Number(b.outstanding_balance ?? 0);
      let status: string;
      if (outstanding <= EPS) status = "Completed";
      else if (Number(b.collected ?? 0) > 0) status = "Partially Collected";
      else status = "Approved";
      await db().from("billings").update({ status }).eq("id", b.billing_id);
    }
  }
  return c.json({ success: true });
});

// ============================================================================
// /payees
// ============================================================================
route.get("/payees", async (c) => {
  const { data, error } = await db().from("payees").select("*").order("name", { ascending: true });
  if (error) return c.json(fail(error.message, 500), 500);
  return c.json(ok(data ?? []));
});

route.post("/payees", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return c.json(fail("Payee name is required", 400), 400);
  const payload: any = {
    name,
    type: body.type ?? "",
    status: body.status ?? "Active",
  };
  const { data, error } = await db().from("payees").insert(payload).select().single();
  if (error) {
    if ((error as any).code === "23505") return c.json(fail("Payee already exists", 409), 409);
    return c.json(fail(error.message, 400), 400);
  }
  return c.json(ok(data));
});

route.delete("/payees/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.json({ success: true });
  const { error } = await db().from("payees").delete().eq("id", id);
  if (error) return c.json(fail(error.message, 400), 400);
  return c.json({ success: true });
});

// ============================================================================
// /logbook  — monthly shipment sequence
// ============================================================================
function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Pick shipping line / vessel / BL / container from booking row + first segment.
function logbookFieldsFromBooking(row: any, firstSegment: any): {
  shippingLine: string;
  vesselVoyage: string;
  blNumber: string;
  containerNumber: string;
} {
  const data = row.data ?? {};
  const sd = firstSegment?.data ?? {};
  const toStr = (v: unknown): string => {
    if (v == null) return "";
    if (Array.isArray(v)) return v.filter(Boolean).join(", ");
    return String(v);
  };
  return {
    shippingLine: toStr(row.carrier ?? data.shippingLine ?? firstSegment?.carrier),
    vesselVoyage: toStr(data.vesselVoyage ?? sd.vesselVoyage),
    blNumber: toStr(data.blNumber ?? data.bl_number ?? sd.blNumber),
    containerNumber: toStr(
      data.containerNumber ?? data.containerNos ?? sd.containerNumber ?? sd.containerNos,
    ),
  };
}

async function fetchFirstSegment(bookingId: string): Promise<any | null> {
  const { data } = await db()
    .from("booking_segments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("leg_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// Numbering is year-scoped: the sequence runs across all months of a year and
// resets on January 1. The screen still displays month-by-month, so a January
// view may show #1..#N while February continues from #N+1.
function yearOf(month: string): string {
  return month.slice(0, 4);
}

async function nextLogbookNumber(month: string): Promise<number> {
  const { data } = await db()
    .from("logbook_entries")
    .select("logbook_number")
    .like("logbook_month", `${yearOf(month)}-%`)
    .order("logbook_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as any)?.logbook_number ?? 0) + 1;
}

// Renumber the source year to close any gaps (numbers > removed number shift down).
async function compactYear(year: string, removedNumber: number): Promise<void> {
  const { data } = await db()
    .from("logbook_entries")
    .select("booking_id, logbook_number")
    .like("logbook_month", `${year}-%`)
    .gt("logbook_number", removedNumber)
    .order("logbook_number", { ascending: true });
  for (const row of (data ?? []) as any[]) {
    await db()
      .from("logbook_entries")
      .update({ logbook_number: row.logbook_number - 1 })
      .eq("booking_id", row.booking_id);
  }
}

// Reconcile a booking's logbook entry against its current shippingLineStatus +
// shipment tags. Called after any booking update or tag change.
async function syncLogbookForBooking(bookingId: string): Promise<void> {
  const { data: row } = await db().from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!row) return;
  const data = (row as any).data ?? {};
  const movement: string = (row as any).movement;
  const donePaymentAt: string | undefined = data.donePaymentAt;
  const deliveredAt: string | null | undefined = data.deliveredAt;

  // Import: shippingLineStatus on booking.data.
  // Export: shippingLineStatus lives on segment.data — any segment marked
  // "Done Payment" qualifies the booking for the logbook.
  let shippingLineStatus: string | undefined = data.shippingLineStatus;
  if (movement === "EXPORT") {
    const { data: segs } = await db()
      .from("booking_segments")
      .select("data")
      .eq("booking_id", bookingId);
    const segStatuses = ((segs ?? []) as any[])
      .map((s) => s.data?.shippingLineStatus)
      .filter(Boolean);
    if (segStatuses.includes("Done Payment")) shippingLineStatus = "Done Payment";
    else if (segStatuses.length && !shippingLineStatus) shippingLineStatus = segStatuses[0];
  }

  const { data: tagRows } = await db()
    .from("booking_shipment_tags")
    .select("tag")
    .eq("booking_id", bookingId);
  const tags: string[] = ((tagRows ?? []) as any[]).map((r) => r.tag);
  const isDelivered = tags.includes("delivered");

  const { data: existing } = await db()
    .from("logbook_entries")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  // No entry should exist if status isn't Done Payment or date missing.
  if (shippingLineStatus !== "Done Payment" || !donePaymentAt) {
    if (existing) {
      await db().from("logbook_entries").delete().eq("booking_id", bookingId);
      await compactYear(yearOf((existing as any).logbook_month), (existing as any).logbook_number);
    }
    return;
  }

  const targetMonth = monthKey(donePaymentAt);
  const status: "yellow" | "green" = isDelivered ? "green" : "yellow";
  const deliveredIso = isDelivered ? (deliveredAt ?? new Date().toISOString()) : null;

  if (!existing) {
    const number = await nextLogbookNumber(targetMonth);
    await db().from("logbook_entries").insert({
      booking_id: bookingId,
      logbook_month: targetMonth,
      logbook_number: number,
      original_month: targetMonth,
      status,
      done_payment_at: donePaymentAt,
      delivered_at: deliveredIso,
    });
  } else {
    // Don't relocate an existing entry across months on plain edits — only the
    // explicit /logbook/adjust route moves entries. Backdated donePayment edits
    // update the timestamp but keep the original sequence intact.
    await db()
      .from("logbook_entries")
      .update({
        status,
        done_payment_at: donePaymentAt,
        delivered_at: deliveredIso,
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);
  }
}

route.get("/logbook/:month", async (c) => {
  const month = c.req.param("month"); // YYYY-MM
  try {
    const { data: entries, error } = await db()
      .from("logbook_entries")
      .select("*")
      .eq("logbook_month", month)
      .order("logbook_number", { ascending: true });
    if (error) return c.json(fail(error.message, 500), 500);

    const ids = ((entries ?? []) as any[]).map((e) => e.booking_id);
    let bookingsById: Record<string, any> = {};
    let segmentsByBooking: Record<string, any> = {};
    if (ids.length) {
      const { data: brows } = await db().from("bookings").select("*").in("id", ids);
      for (const r of (brows ?? []) as any[]) bookingsById[r.id] = r;
      const { data: srows } = await db()
        .from("booking_segments")
        .select("*")
        .in("booking_id", ids)
        .order("leg_order", { ascending: true });
      for (const s of (srows ?? []) as any[]) {
        if (!segmentsByBooking[s.booking_id]) segmentsByBooking[s.booking_id] = s;
      }
    }

    const bookings = ((entries ?? []) as any[]).map((e) => {
      const b = bookingsById[e.booking_id] ?? {};
      const seg = segmentsByBooking[e.booking_id] ?? null;
      const fields = logbookFieldsFromBooking(b, seg);
      return {
        bookingRowId: e.booking_id,
        bookingId: b.booking_number ?? "",
        logbookNumber: e.logbook_number,
        client: b.client_name ?? "",
        shippingLine: fields.shippingLine,
        vesselVoyage: fields.vesselVoyage,
        blNumber: fields.blNumber,
        containerNumber: fields.containerNumber,
        donePaymentAt: e.done_payment_at,
        deliveredAt: e.delivered_at,
        status: e.status,
        movedIn: e.original_month !== e.logbook_month,
      };
    });

    let green = 0, yellow = 0, movedIn = 0;
    for (const e of (entries ?? []) as any[]) {
      if (e.status === "green") green++; else yellow++;
      if (e.original_month !== e.logbook_month) movedIn++;
    }
    const thisMonth = (entries ?? []).length - movedIn;

    // movedOut = entries originally landed here but currently sit elsewhere.
    const { count: movedOutCount } = await db()
      .from("logbook_entries")
      .select("booking_id", { count: "exact", head: true })
      .eq("original_month", month)
      .neq("logbook_month", month);
    const movedOut = movedOutCount ?? 0;

    return c.json(ok({
      bookings,
      counts: { green, yellow },
      movement: { thisMonth, movedIn, movedOut, total: thisMonth + movedIn },
    }));
  } catch (e: any) {
    return c.json(fail(e.message, 500), 500);
  }
});

route.get("/logbook/history/:month", async (c) => {
  const month = c.req.param("month");
  const { data, error } = await db()
    .from("logbook_adjustments")
    .select("*, bookings:booking_id (booking_number)")
    .or(`from_month.eq.${month},to_month.eq.${month}`)
    .order("created_at", { ascending: false });
  if (error) return c.json(fail(error.message, 500), 500);
  const entries = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    bookingId: r.bookings?.booking_number ?? "",
    fromMonth: r.from_month,
    fromNumber: r.from_number,
    toMonth: r.to_month,
    toNumber: r.to_number,
    userName: r.user_name,
    timestamp: r.created_at,
  }));
  return c.json(ok(entries));
});

route.post("/logbook/adjust", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const bookingIds: string[] = Array.isArray(body.bookingIds) ? body.bookingIds : [];
    const targetMonth: string = body.targetMonth;
    const userName: string = body.userName ?? "Unknown";
    if (!bookingIds.length || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      return c.json(fail("bookingIds and targetMonth (YYYY-MM) are required", 400), 400);
    }

    for (const bookingId of bookingIds) {
      const { data: entry } = await db()
        .from("logbook_entries")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (!entry) continue;
      const fromMonth = (entry as any).logbook_month;
      const fromNumber = (entry as any).logbook_number;
      if (fromMonth === targetMonth) continue;

      // Stash to a sentinel month first so the source-year gap-compaction
      // doesn't collide with the row we're about to move.
      await db()
        .from("logbook_entries")
        .update({ logbook_month: "__moving__", logbook_number: -fromNumber })
        .eq("booking_id", bookingId);
      await compactYear(yearOf(fromMonth), fromNumber);
      // Compute target number AFTER the compact so within-year moves don't
      // leave a gap (year-wide sequence stays dense).
      const toNumber = await nextLogbookNumber(targetMonth);
      await db()
        .from("logbook_entries")
        .update({
          logbook_month: targetMonth,
          logbook_number: toNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("booking_id", bookingId);

      await db().from("logbook_adjustments").insert({
        booking_id: bookingId,
        from_month: fromMonth,
        from_number: fromNumber,
        to_month: targetMonth,
        to_number: toNumber,
        user_name: userName,
      });
    }

    return c.json({ success: true });
  } catch (e: any) {
    return c.json(fail(e.message, 500), 500);
  }
});

app.route("/", route);

Deno.serve(app.fetch);
