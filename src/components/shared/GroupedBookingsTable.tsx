import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StandardTable, type ColumnDef } from "../design-system";
import type { ComboKey, ComboEntry } from "../../utils/statusTags";
import { getCombinationKey, formatCombinationLabel } from "../../utils/statusTags";
import { getTagByKey } from "../../utils/statusTags";

interface GroupedBookingsTableProps<T extends { shipmentTags?: string[] }> {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (item: T) => string;
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  selectedComboKeys: ComboKey[];
  availableCombos: ComboEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
}

function ComboGroupHeader({ combo, collapsed, onToggle }: {
  combo: ComboEntry;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const isNoTags = combo.key === "(no tags)";
  return (
    <div
      onClick={onToggle}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 16px",
        backgroundColor: "#F0F7F4",
        borderBottom: "1px solid #C8DDD6",
        borderTop: "1px solid #C8DDD6",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {collapsed
        ? <ChevronRight size={14} style={{ color: "#237F66", flexShrink: 0 }} />
        : <ChevronDown size={14} style={{ color: "#237F66", flexShrink: 0 }} />}

      {isNoTags ? (
        <span style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>No Tags</span>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {combo.tags.map((t) => {
            const tag = getTagByKey(t);
            const isDanger = tag?.color === "danger";
            return (
              <span key={t} style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "1px 7px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                backgroundColor: isDanger ? "#FEE2E2" : "#E8F5F3",
                color: isDanger ? "#991B1B" : "#12332B",
                border: isDanger ? "1px solid #FECACA" : "1px solid #C1D9CC",
              }}>
                {tag?.label ?? t}
              </span>
            );
          })}
        </div>
      )}

      <span style={{
        marginLeft: "auto",
        fontSize: "12px",
        fontWeight: 600,
        color: "#6B7A76",
        backgroundColor: "#FFFFFF",
        border: "1px solid #C8DDD6",
        borderRadius: "10px",
        padding: "1px 8px",
        flexShrink: 0,
      }}>
        {combo.count}
      </span>
    </div>
  );
}

export function GroupedBookingsTable<T extends { shipmentTags?: string[] }>({
  data,
  columns,
  rowKey,
  isLoading,
  onRowClick,
  selectedComboKeys,
  availableCombos,
  emptyTitle,
  emptyDescription,
  emptyIcon,
}: GroupedBookingsTableProps<T>) {
  const [collapsed, setCollapsed] = useState<Record<ComboKey, boolean>>({});

  const toggleGroup = (key: ComboKey) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // No combo filter active — plain table
  if (selectedComboKeys.length === 0) {
    return (
      <StandardTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        isLoading={isLoading}
        onRowClick={onRowClick}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyIcon={emptyIcon}
      />
    );
  }

  // Group bookings by combo key, in pick order
  const groups = selectedComboKeys.map((key) => {
    const combo = availableCombos.find((c) => c.key === key);
    const rows = data.filter((item) => getCombinationKey(item.shipmentTags ?? []) === key);
    return { key, combo, rows };
  }).filter((g) => g.rows.length > 0);

  if (groups.length === 0) {
    return (
      <StandardTable
        data={[]}
        columns={columns}
        rowKey={rowKey}
        isLoading={isLoading}
        emptyTitle={emptyTitle ?? "No bookings match your filters"}
        emptyDescription={emptyDescription}
        emptyIcon={emptyIcon}
      />
    );
  }

  return (
    <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      {/* Sticky column headers */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, zIndex: 3 }}>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: "12px 16px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#667085",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.05em",
                  textAlign: (col.align ?? "left") as "left" | "right" | "center",
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
      </table>

      {groups.map(({ key, combo, rows }) => {
        const isCollapsed = !!collapsed[key];
        const displayCombo: ComboEntry = combo ?? {
          key,
          tags: key === "(no tags)" ? [] : key.split("|"),
          count: rows.length,
        };

        return (
          <div key={key}>
            <ComboGroupHeader
              combo={{ ...displayCombo, count: rows.length }}
              collapsed={isCollapsed}
              onToggle={() => toggleGroup(key)}
            />
            {!isCollapsed && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {rows.map((item, rowIdx) => (
                    <tr
                      key={rowKey(item)}
                      onClick={() => onRowClick?.(item)}
                      style={{
                        borderBottom: "1px solid rgba(10,29,77,0.05)",
                        cursor: onRowClick ? "pointer" : undefined,
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (onRowClick) e.currentTarget.style.backgroundColor = "rgba(15,118,110,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            padding: "16px",
                            textAlign: (col.align ?? "left") as "left" | "right" | "center",
                            width: col.width,
                          }}
                        >
                          {col.cell(item, rowIdx)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
