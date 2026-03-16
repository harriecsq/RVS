import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatAmount } from "../../utils/formatAmount";

interface LineItem {
  id: string;
  description: string;
  amount: number;
  currency?: string;
  [key: string]: any; // Allow additional properties
}

interface CollapsibleCategoryProps {
  category: string;
  items: LineItem[];
  isExpanded?: boolean;
  onToggle?: () => void;
  formatCurrency?: (amount: number, currency?: string) => string;
}

/**
 * CollapsibleCategory Component
 * 
 * Collapsible category section for line items.
 * Based on reference design from EXP-89545.
 * 
 * Design specs:
 * - Category header: 15px, semibold, dark, with count
 * - Chevron icon to expand/collapse
 * - Category total on the right
 * - Nested table below when expanded
 */
export function CollapsibleCategory({
  category,
  items,
  isExpanded: controlledExpanded,
  onToggle,
  formatCurrency = (amount, currency = "PHP") =>
    `${currency} ${formatAmount(amount)}`,
}: CollapsibleCategoryProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  
  // Use controlled or internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const handleToggle = onToggle || (() => setInternalExpanded(!internalExpanded));

  const categoryTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const currency = items[0]?.currency || "PHP";

  return (
    <div
      style={{
        marginBottom: "var(--ds-space-lg)",
        border: "1px solid var(--ds-border)",
        borderRadius: "var(--ds-radius-input)",
        overflow: "hidden",
      }}
    >
      {/* Category Header */}
      <div
        onClick={handleToggle}
        style={{
          padding: "var(--ds-space-lg)",
          background: "var(--ds-gray-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: isExpanded ? "1px solid var(--ds-border)" : "none",
          cursor: "pointer",
          transition: "background var(--ds-transition-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F3F4F6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--ds-gray-light)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-md)", flex: 1 }}>
          {isExpanded ? (
            <ChevronDown size={16} style={{ color: "var(--ds-gray-medium)" }} />
          ) : (
            <ChevronRight size={16} style={{ color: "var(--ds-gray-medium)" }} />
          )}
          <span
            style={{
              fontSize: "15px",
              fontWeight: "var(--ds-weight-semibold)",
              color: "var(--ds-green-dark)",
              textTransform: "uppercase",
            }}
          >
            {category}
          </span>
          <span style={{ fontSize: "var(--ds-text-body)", color: "var(--ds-gray-medium)" }}>
            ({items.length} item{items.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: "var(--ds-weight-semibold)",
            color: "var(--ds-teal-primary)",
            minWidth: "100px",
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatCurrency(categoryTotal, currency)}
        </div>
      </div>

      {/* Category Items */}
      {isExpanded && (
        <div style={{ background: "var(--ds-white)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "#FAFAFA",
                  borderBottom: "1px solid var(--ds-border)",
                }}
              >
                <th
                  style={{
                    padding: "var(--ds-space-md) var(--ds-space-lg)",
                    textAlign: "left",
                    fontSize: "var(--ds-text-metadata)",
                    color: "var(--ds-gray-medium)",
                    fontWeight: "var(--ds-weight-semibold)",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: "var(--ds-space-md) var(--ds-space-lg)",
                    textAlign: "right",
                    fontSize: "var(--ds-text-metadata)",
                    color: "var(--ds-gray-medium)",
                    fontWeight: "var(--ds-weight-semibold)",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom:
                      index < items.length - 1 ? "1px solid var(--ds-border)" : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "var(--ds-space-md) var(--ds-space-lg)",
                      fontSize: "var(--ds-text-body)",
                      color: "var(--ds-green-dark)",
                    }}
                  >
                    {item.description}
                  </td>
                  <td
                    style={{
                      padding: "var(--ds-space-md) var(--ds-space-lg)",
                      fontSize: "var(--ds-text-body)",
                      color: "var(--ds-green-dark)",
                      textAlign: "right",
                      fontWeight: "var(--ds-weight-semibold)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(item.amount, item.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}