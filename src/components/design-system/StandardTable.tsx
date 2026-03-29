import React from "react";
import { SkeletonTable } from "./StandardSkeleton";
import { StandardEmptyState } from "./StandardEmptyState";

export interface ColumnDef<T> {
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  cell: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableSummary {
  label: string;
  value: React.ReactNode;
}

interface StandardTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (item: T) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  footerSummary?: TableSummary[];
}

export function StandardTable<T>({
  data,
  columns,
  rowKey,
  isLoading = false,
  emptyState,
  emptyTitle = "No data found",
  emptyDescription,
  emptyIcon,
  onRowClick,
  rowClassName,
  footerSummary,
}: StandardTableProps<T>) {
  if (isLoading) {
    return <SkeletonTable rows={6} cols={columns.length} />;
  }

  if (data.length === 0) {
    return (
      <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
        {emptyState ?? (
          <StandardEmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={col.className}
                style={{
                  padding: "12px 16px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: col.align ?? "left",
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr
              key={rowKey(item)}
              onClick={() => onRowClick?.(item)}
              className={rowClassName?.(item)}
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
                    textAlign: col.align ?? "left",
                  }}
                >
                  {col.cell(item, rowIdx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {footerSummary && footerSummary.length > 0 && (
          <tfoot style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #E5E9F0" }}>
            <tr>
              <td colSpan={columns.length} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "32px" }}>
                  {footerSummary.map((summary, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {summary.label}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0A1D4D" }}>
                        {summary.value}
                      </span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
