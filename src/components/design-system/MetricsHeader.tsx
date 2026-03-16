import React from "react";
import { ChevronDown } from "lucide-react";

interface Metric {
  label: string;
  value: string | number;
  showDropdown?: boolean;
  onClick?: () => void;
}

interface MetricsHeaderProps {
  metrics: Metric[];
}

/**
 * MetricsHeader Component
 * 
 * Displays 3-4 key metrics in a mint-colored header bar.
 * Based on reference design from EXP-89545.
 * 
 * Design specs:
 * - Background: #E5F4F2 (mint)
 * - Layout: Equal width columns
 * - Label: 11px, uppercase, gray
 * - Value: 24px, bold, dark
 */
export function MetricsHeader({ metrics }: MetricsHeaderProps) {
  return (
    <div
      style={{
        background: "var(--ds-mint-header)",
        padding: "var(--ds-space-2xl) var(--ds-space-4xl)",
        display: "grid",
        gridTemplateColumns: `repeat(${metrics.length}, 1fr)`,
        gap: "var(--ds-space-2xl)",
        borderBottom: "1px solid var(--ds-border)",
      }}
    >
      {metrics.map((metric, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--ds-space-sm)",
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: "11px",
              fontWeight: "var(--ds-weight-medium)",
              color: "var(--ds-gray-medium)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {metric.label}
          </div>

          {/* Value */}
          <div
            onClick={metric.onClick}
            style={{
              fontSize: "var(--ds-text-large-amount)",
              fontWeight: "var(--ds-weight-bold)",
              color: "var(--ds-green-dark)",
              display: "flex",
              alignItems: "center",
              gap: "var(--ds-space-sm)",
              cursor: metric.showDropdown ? "pointer" : "default",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {metric.value}
            {metric.showDropdown && (
              <ChevronDown
                size={16}
                style={{
                  color: "var(--ds-gray-medium)",
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
