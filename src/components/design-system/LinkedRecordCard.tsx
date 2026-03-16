import React from "react";

interface LinkedRecord {
  id: string;
  number: string;
  metadata?: string;
  onClick?: () => void;
}

interface LinkedRecordCardProps {
  title: string;
  records: LinkedRecord[];
  emptyMessage?: string;
}

/**
 * LinkedRecordCard Component
 * 
 * Displays linked records (bookings, projects, etc.) in a card format.
 * Based on reference design from EXP-89545.
 * 
 * Design specs:
 * - Card style with border
 * - ID/number: 14px, semibold, teal (clickable)
 * - Metadata below: 13px, gray
 * - Multiple records stack vertically
 * - 12px gap between records
 */
export function LinkedRecordCard({
  title,
  records,
  emptyMessage = "No linked records",
}: LinkedRecordCardProps) {
  return (
    <div
      style={{
        background: "var(--ds-white)",
        border: "1px solid var(--ds-border)",
        borderRadius: "var(--ds-radius-card)",
        padding: "var(--ds-card-padding)",
      }}
    >
      <h4
        style={{
          fontSize: "var(--ds-text-subsection)",
          fontWeight: "var(--ds-weight-semibold)",
          color: "var(--ds-green-dark)",
          margin: 0,
          marginBottom: "var(--ds-space-lg)",
        }}
      >
        {title}
      </h4>

      {records.length === 0 ? (
        <div
          style={{
            fontSize: "var(--ds-text-body)",
            color: "var(--ds-gray-medium)",
            fontStyle: "italic",
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-md)" }}>
          {records.map((record) => (
            <div
              key={record.id}
              style={{
                padding: "var(--ds-space-md)",
                border: "1px solid var(--ds-border)",
                borderRadius: "var(--ds-radius-input)",
                transition: "all var(--ds-transition-fast)",
                cursor: record.onClick ? "pointer" : "default",
              }}
              onClick={record.onClick}
              onMouseEnter={(e) => {
                if (record.onClick) {
                  e.currentTarget.style.borderColor = "var(--ds-teal-primary)";
                  e.currentTarget.style.background = "var(--ds-gray-light)";
                }
              }}
              onMouseLeave={(e) => {
                if (record.onClick) {
                  e.currentTarget.style.borderColor = "var(--ds-border)";
                  e.currentTarget.style.background = "var(--ds-white)";
                }
              }}
            >
              {/* Record Number */}
              <div
                style={{
                  fontSize: "var(--ds-text-body)",
                  fontWeight: "var(--ds-weight-semibold)",
                  color: "var(--ds-teal-primary)",
                  marginBottom: "var(--ds-space-xs)",
                }}
              >
                {record.number}
              </div>

              {/* Metadata */}
              {record.metadata && (
                <div
                  style={{
                    fontSize: "var(--ds-text-label)",
                    color: "var(--ds-gray-medium)",
                  }}
                >
                  {record.metadata}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
