import React from "react";

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string; // Badge count or text
  color?: string; // Custom color for this tab (overrides default teal)
}

interface StandardTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange?: (tabId: string) => void;
  onTabChange?: (tabId: string) => void; // Backward compatibility
  style?: React.CSSProperties; // Allow custom styles
  actions?: React.ReactNode; // Right-aligned action slot (Activity, Edit, Actions buttons)
}

/**
 * StandardTabs Component
 * 
 * Underline-style tabs with teal accent.
 * Based on reference design from EXP-89545.
 * 
 * Design specs:
 * - Style: Underline tabs (not boxed)
 * - Active: 2px teal underline, teal text
 * - Inactive: Gray text, no underline
 * - Hover: Teal color
 * - Text: 14px, medium weight
 * - Optional: Badge support for counts
 * - Optional: Custom colors per tab
 */
export function StandardTabs({ tabs, activeTab, onChange, onTabChange, style, actions }: StandardTabsProps) {
  // Support both onChange and onTabChange for backward compatibility
  const handleChange = onChange || onTabChange;
  
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--ds-space-sm)",
        borderBottom: "1px solid var(--ds-border)",
        padding: "0 var(--ds-space-4xl)",
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const tabColor = tab.color || "var(--ds-teal-primary)";

        return (
          <button
            key={tab.id}
            onClick={() => handleChange?.(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--ds-space-sm)",
              padding: "var(--ds-space-md) var(--ds-space-xl)",
              border: "none",
              borderBottom: isActive
                ? `2px solid ${tabColor}`
                : "2px solid transparent",
              background: "transparent",
              color: isActive ? tabColor : "var(--ds-gray-medium)",
              fontWeight: isActive ? "var(--ds-weight-semibold)" : "var(--ds-weight-medium)",
              fontSize: "var(--ds-text-body)",
              cursor: "pointer",
              transition: "all var(--ds-transition-fast)",
              marginBottom: "-1px",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--ds-green-dark)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--ds-gray-medium)";
              }
            }}
          >
            {tab.icon && tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: isActive ? tabColor : `${tabColor}15`,
                  color: isActive ? "#FFFFFF" : tabColor,
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
      {actions && (
        <div style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          padding: "6px 0",
        }}>
          {actions}
        </div>
      )}
    </div>
  );
}