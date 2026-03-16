import React from "react";

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  noPadding?: boolean;
}

/**
 * SectionCard Component
 * 
 * White card wrapper with consistent styling.
 * Based on reference design from EXP-89545.
 * 
 * Design specs:
 * - Background: White
 * - Border: 1px solid #E5E7EB
 * - Radius: 12px
 * - Padding: 24px
 * - Section header: 16px, semibold, teal
 */
export function SectionCard({
  title,
  children,
  headerRight,
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      style={{
        background: "var(--ds-white)",
        border: "1px solid var(--ds-border)",
        borderRadius: "var(--ds-radius-card)",
        overflow: "hidden",
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--ds-card-padding)",
            borderBottom: "1px solid var(--ds-border)",
          }}
        >
          <h3
            style={{
              fontSize: "var(--ds-text-section-header)",
              fontWeight: "var(--ds-weight-semibold)",
              color: "var(--ds-teal-primary)",
              margin: 0,
            }}
          >
            {title}
          </h3>
          {headerRight && headerRight}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : "var(--ds-card-padding)" }}>
        {children}
      </div>
    </div>
  );
}
