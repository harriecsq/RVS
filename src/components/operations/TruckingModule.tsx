/**
 * TruckingModule — Operations > Trucking list screen.
 * Identical layout pattern to ImportBookings / ExportBookings.
 */
import { useState, useEffect, useRef } from "react";
import { Plus, Search, Truck, ChevronDown, Check } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { CreateTruckingModal } from "./CreateTruckingModal";
import { TruckingRecordDetails } from "./TruckingRecordDetails";
import type { TruckingRecord } from "./CreateTruckingModal";
import {
  ALL_TRUCKING_TAGS,
  TRUCKING_TAG_GROUPS,
  TRUCKING_VENDORS,
  hexToRgba,
} from "../../utils/truckingTags";

import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

// ---- Filter Dropdown ----
function FilterDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          fontWeight: 400,
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          background: "#FFFFFF",
          color: "#12332B",
          cursor: "pointer",
          whiteSpace: "nowrap" as const,
          boxSizing: "border-box" as const,
        }}
      >
        {selected?.label || placeholder}
        <ChevronDown size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            zIndex: 1000,
            minWidth: "180px",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: "9px 14px",
                fontSize: "13px",
                color: "#12332B",
                cursor: "pointer",
                backgroundColor: value === opt.value ? "#F0FAF8" : "transparent",
                fontWeight: value === opt.value ? 600 : 400,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F7FAF8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = value === opt.value ? "#F0FAF8" : "transparent"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Status Tag Filter (multi-select) ----
function StatusTagFilter({
  selectedTags,
  onChange,
  matchMode,
  onMatchModeChange,
}: {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  matchMode: "any" | "all";
  onMatchModeChange: (m: "any" | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (key: string) => {
    onChange(
      selectedTags.includes(key)
        ? selectedTags.filter((k) => k !== key)
        : [...selectedTags, key],
    );
  };

  const filtered = ALL_TRUCKING_TAGS.filter(
    (t) => !search || t.label.toLowerCase().includes(search.toLowerCase()),
  );

  const hasSelection = selectedTags.length > 0;
  const label = hasSelection
    ? `Status: ${selectedTags.length} selected`
    : "All Statuses";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(!open); if (!open) setSearch(""); }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          fontWeight: 400,
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          background: "#FFFFFF",
          color: hasSelection ? "#0F766E" : "#12332B",
          cursor: "pointer",
          whiteSpace: "nowrap" as const,
          boxSizing: "border-box" as const,
        }}
      >
        {label}
        <ChevronDown size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            zIndex: 1000,
            minWidth: "320px",
            maxHeight: "380px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Match mode toggle */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#667085", fontWeight: 500, marginRight: "4px" }}>Match:</span>
            {(["all", "any"] as const).map((mode) => (
              <button
                key={mode}
                onClick={(e) => { e.stopPropagation(); onMatchModeChange(mode); }}
                style={{
                  padding: "3px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  backgroundColor: matchMode === mode ? "#0F766E" : "#F3F4F6",
                  color: matchMode === mode ? "#FFFFFF" : "#667085",
                  transition: "all 0.15s ease",
                }}
              >
                {mode === "any" ? "ANY" : "ALL"}
              </button>
            ))}
            {hasSelection && (
              <button
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                style={{
                  marginLeft: "auto",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  color: "#DC2626",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5E7EB" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #E5E7EB",
                fontSize: "14px",
                color: "#12332B",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Grouped tag list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {TRUCKING_TAG_GROUPS.map((group) => {
              const groupTags = filtered.filter((t) => t.group === group.id);
              if (!groupTags.length) return null;
              return (
                <div key={group.id}>
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#9CA3AF",
                      letterSpacing: "0.07em",
                    }}
                  >
                    {group.label}
                  </div>
                  {groupTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.key);
                    return (
                      <div
                        key={tag.key}
                        onClick={(e) => { e.stopPropagation(); toggle(tag.key); }}
                        style={{
                          padding: "8px 16px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#12332B",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          backgroundColor: isSelected ? "#F0FAF8" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F7FAF8";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? "#F0FAF8" : "transparent";
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            flexShrink: 0,
                            border: `1.5px solid ${isSelected ? "#0F766E" : "#D1D5DB"}`,
                            backgroundColor: isSelected ? "#0F766E" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isSelected && <Check size={10} color="white" />}
                        </div>
                        {tag.label}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Vendor Pill ----
function VendorPill({ vendor }: { vendor: string }) {
  const v = TRUCKING_VENDORS.find((vv) => vv.name === vendor);
  if (!v) return <span style={{ fontSize: "13px", color: "#667085" }}>—</span>;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "5px",
      fontSize: "11px",
      fontWeight: 700,
      backgroundColor: hexToRgba(v.hex, 0.14),
      color: v.hex,
      border: `1px solid ${hexToRgba(v.hex, 0.36)}`,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap" as const,
    }}>
      {v.name}
    </span>
  );
}

// ---- Status Pill ----
function StatusPill({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) {
    return <span style={{ fontSize: "13px", color: "#667085" }}>—</span>;
  }

  // Sort by group order (operations → documentation → financial → client)
  const groupOrder: Record<string, number> = {
    operations: 0,
    documentation: 1,
    financial: 2,
    client: 3,
  };

  const resolved = tags
    .map((key) => {
      const tag = ALL_TRUCKING_TAGS.find((t) => t.key === key);
      return {
        key,
        label: tag ? tag.label : key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        group: tag ? groupOrder[tag.group] ?? 99 : 99,
      };
    })
    .sort((a, b) => a.group - b.group);

  return (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
      {resolved.map((t) => (
        <span
          key={t.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: 700,
            backgroundColor: "#E4EFEA",
            color: "#12332B",
            border: "1px solid #C1D9CC",
            whiteSpace: "nowrap" as const,
          }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

// ---- Date formatting ----
function fmtDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${m}/${d}/${y}`;
}

function fmtUpdated(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = d.getFullYear();
    return `${mm}/${dd}/${yy}`;
  } catch { return "—"; }
}

// ---- Main component ----
interface TruckingModuleProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

export function TruckingModule({ currentUser }: TruckingModuleProps) {
  const [records, setRecords] = useState<TruckingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TruckingRecord | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [statusTags, setStatusTags] = useState<string[]>([]);
  const [statusMatchMode, setStatusMatchMode] = useState<"any" | "all">("all");
  const [vendorFilter, setVendorFilter] = useState("all");

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/trucking-records`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success) setRecords(result.data || []);
      else setRecords([]);
    } catch (err) {
      console.error("Error fetching trucking records:", err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreated = (record: TruckingRecord) => {
    setShowCreate(false);
    fetchRecords();
    toast.success("Trucking record created");
  };

  // ---- Filtering ----
  const filtered = records.filter((r) => {
    const s = search.toLowerCase();
    if (s) {
      const matchesSearch =
        r.truckingRefNo?.toLowerCase().includes(s) ||
        r.linkedBookingId?.toLowerCase().includes(s) ||
        (r.blNumber || r.blNumber)?.toLowerCase().includes(s) ||
        r.containers?.some((c) => c.containerNo.toLowerCase().includes(s)) ||
        r.deliveryAddresses?.some((a) => a.address.toLowerCase().includes(s));
      if (!matchesSearch) return false;
    }

    if (vendorFilter !== "all" && r.truckingVendor !== vendorFilter) return false;

    if (dateFilterStart || dateFilterEnd) {
      const updated = new Date(r.updatedAt);
      const updatedISO = updated.toISOString().split("T")[0];
      if (dateFilterStart && updatedISO < dateFilterStart) return false;
      if (dateFilterEnd && updatedISO > dateFilterEnd) return false;
    }

    if (statusTags.length > 0) {
      const tags = r.remarks || [];
      if (statusMatchMode === "any") {
        if (!tags.some((t) => statusTags.includes(t))) return false;
      } else if (statusMatchMode === "all") {
        if (!statusTags.every((t) => tags.includes(t))) return false;
      }
    }

    return true;
  });

  // Filter options
  const vendorOptions = [
    { label: "All Vendors", value: "all" },
    ...TRUCKING_VENDORS.map((v) => ({ label: v.name, value: v.name })),
  ];

  if (selectedRecord) {
    return (
      <TruckingRecordDetails
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
        onUpdate={fetchRecords}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#FFFFFF" }}>
      {/* ── Header ── */}
      <div style={{
        padding: "32px 48px 20px",
        borderBottom: "1px solid #E5E7EB",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#12332B", margin: 0 }}>Trucking</h1>
            <p style={{ fontSize: "14px", color: "#667085", margin: "4px 0 0" }}>
              Manage trucking assignments and delivery coordination
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              background: "#0F766E",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> New Trucking
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <Search size={16} style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9CA3AF",
            pointerEvents: "none",
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Booking ID, BL Number, Container #, Consignee, or Destination..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 42px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              outline: "none",
              boxSizing: "border-box",
              backgroundColor: "#FFFFFF",
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          <div style={{ gridColumn: "span 2" }}>
            <UnifiedDateRangeFilter
              startDate={dateFilterStart}
              endDate={dateFilterEnd}
              onStartDateChange={setDateFilterStart}
              onEndDateChange={setDateFilterEnd}
              compact
            />
          </div>
          <StatusTagFilter
            selectedTags={statusTags}
            onChange={setStatusTags}
            matchMode={statusMatchMode}
            onMatchModeChange={setStatusMatchMode}
          />
          <FilterDropdown value={vendorFilter} options={vendorOptions} onChange={setVendorFilter} placeholder="All Vendors" />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 48px 48px 48px" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
            <p style={{ color: "#667085", fontSize: "14px" }}>Loading trucking records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px" }}>
            <Truck size={48} style={{ color: "#D1D5DB", marginBottom: "16px" }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: "0 0 6px" }}>
              {records.length === 0 ? "No trucking records yet" : "No results found"}
            </p>
            <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
              {records.length === 0 ? "Click \"+ New Trucking\" to get started." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "38%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#F9FAFB" }}>
                {[
                  "Trucking Ref #",
                  "BL Number",
                  "Container #",
                  "Trucking Vendor",
                  "Created",
                  "Status",
                ].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#667085",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const containers = r.containers || [];
                const containerDisplay = containers.length === 0 ? "—"
                  : containers.length === 1 ? (containers[0].containerNo || "—")
                  : `${containers[0].containerNo || "—"} +${containers.length - 1}`;

                const createdDate = r.createdAt ? fmtUpdated(r.createdAt) : "—";

                const truncCell: React.CSSProperties = {
                  padding: "16px 16px",
                  verticalAlign: "middle",
                  fontSize: "13px",
                  color: "#12332B",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                };

                const refDisplay = r.truckingRefNo || r.id?.slice(0, 12) || "—";
                const blDisplay = r.blNumber || "—";

                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    style={{
                      borderBottom: "1px solid #E5E7EB",
                      cursor: "pointer",
                      transition: "background-color 120ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F7FAF8"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}
                  >
                    <td style={{ ...truncCell, fontWeight: 600 }} title={refDisplay !== "—" ? refDisplay : undefined}>
                      {refDisplay}
                    </td>
                    <td style={truncCell} title={blDisplay !== "—" ? blDisplay : undefined}>
                      {blDisplay}
                    </td>
                    <td style={truncCell} title={containerDisplay !== "—" ? containerDisplay : undefined}>
                      {containerDisplay}
                    </td>
                    <td style={{ ...truncCell, overflow: "visible" }}>
                      <VendorPill vendor={r.truckingVendor} />
                    </td>
                    <td style={truncCell}>{createdDate}</td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <StatusPill tags={r.remarks || []} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <CreateTruckingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={handleCreated}
      />
    </div>
  );
}