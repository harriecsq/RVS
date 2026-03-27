import React from "react";
import { X, Plus } from "lucide-react";
import { NEURON_COLORS, NEURON_TYPOGRAPHY, NEURON_SPACING, NEURON_BORDERS } from "../design-system/neuron-design-tokens";

/**
 * Unified Design System for Linked Items Display
 * Creates a cohesive, connected visual system for displaying linked projects, bookings, expenses, etc.
 */

interface LinkedItemCardProps {
  title: string;
  subtitle?: string;
  onRemove?: () => void;
  variant?: "primary" | "secondary";
}

export const LinkedItemCard: React.FC<LinkedItemCardProps> = ({
  title,
  subtitle,
  onRemove,
  variant = "primary"
}) => {
  const isPrimary = variant === "primary";
  
  return (
    <div style={{
      padding: NEURON_SPACING.md,
      backgroundColor: isPrimary ? "#F0FDF4" : "#F8FFFE",
      border: `2px solid ${isPrimary ? NEURON_COLORS.primary.tealGreen : "#A5D6D1"}`,
      borderRadius: NEURON_BORDERS.radius.lg,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      transition: "all 0.2s ease"
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: NEURON_TYPOGRAPHY.fontSize.md,
          fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
          color: NEURON_COLORS.text.primary
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: NEURON_TYPOGRAPHY.fontSize.base,
            color: NEURON_COLORS.text.secondary,
            marginTop: "2px"
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            padding: "6px",
            backgroundColor: "transparent",
            border: "none",
            color: NEURON_COLORS.text.secondary,
            cursor: "pointer",
            borderRadius: NEURON_BORDERS.radius.sm,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            marginLeft: NEURON_SPACING.sm
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = NEURON_COLORS.primary.tealGreen;
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = NEURON_COLORS.text.secondary;
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

interface LinkedItemsPillProps {
  items: Array<{
    id: string;
    label: string;
    sublabel?: string;
  }>;
  onRemove?: (id: string) => void;
}

export const LinkedItemsPills: React.FC<LinkedItemsPillProps> = ({
  items,
  onRemove
}) => {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap" as const,
      gap: NEURON_SPACING.sm,
      padding: NEURON_SPACING.md,
      backgroundColor: "#FAFFFE",
      border: NEURON_BORDERS.style.default,
      borderRadius: NEURON_BORDERS.radius.lg,
      minHeight: "60px"
    }}>
      {items.length === 0 ? (
        <div style={{
          fontSize: NEURON_TYPOGRAPHY.fontSize.base,
          color: NEURON_COLORS.text.secondary,
          fontStyle: "italic",
          width: "100%",
          textAlign: "center" as const,
          padding: NEURON_SPACING.sm
        }}>
          No items linked
        </div>
      ) : (
        items.map(item => (
          <div
            key={item.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: NEURON_SPACING.xs,
              padding: `${NEURON_SPACING.sm} ${NEURON_SPACING.md}`,
              backgroundColor: "#E8F5F4",
              border: `1.5px solid ${NEURON_COLORS.primary.tealGreen}`,
              borderRadius: NEURON_BORDERS.radius.full,
              fontSize: NEURON_TYPOGRAPHY.fontSize.sm,
              fontWeight: NEURON_TYPOGRAPHY.fontWeight.medium,
              color: NEURON_COLORS.text.primary,
              transition: "all 0.2s ease"
            }}
          >
            <div>
              <div>{item.label}</div>
              {item.sublabel && (
                <div style={{
                  fontSize: NEURON_TYPOGRAPHY.fontSize.xs,
                  color: NEURON_COLORS.text.secondary,
                  marginTop: "1px"
                }}>
                  {item.sublabel}
                </div>
              )}
            </div>
            {onRemove && (
              <button
                onClick={() => onRemove(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: NEURON_COLORS.primary.tealGreen,
                  borderRadius: NEURON_BORDERS.radius.full,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = NEURON_COLORS.primary.tealGreen;
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = NEURON_COLORS.primary.tealGreen;
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

interface LinkedItemsSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  onAdd?: () => void;
  addButtonLabel?: string;
  isEditing?: boolean;
}

export const LinkedItemsSection: React.FC<LinkedItemsSectionProps> = ({
  title,
  count,
  children,
  onAdd,
  addButtonLabel = "Add",
  isEditing = false
}) => {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      {/* Section Header */}
      <div style={{ 
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: NEURON_SPACING.sm,
        paddingBottom: NEURON_SPACING.xs,
        borderBottom: `2px solid ${NEURON_COLORS.border.primary}`
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: NEURON_SPACING.sm
        }}>
          <div style={{ 
            fontSize: NEURON_TYPOGRAPHY.fontSize.sm,
            fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
            color: NEURON_COLORS.text.secondary,
            textTransform: "uppercase" as const,
            letterSpacing: "0.5px"
          }}>
            {title}
          </div>
          <div style={{
            padding: "2px 8px",
            backgroundColor: count > 0 ? NEURON_COLORS.primary.tealGreen : NEURON_COLORS.border.tertiary,
            color: "white",
            borderRadius: NEURON_BORDERS.radius.full,
            fontSize: NEURON_TYPOGRAPHY.fontSize.xs,
            fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
            minWidth: "24px",
            textAlign: "center" as const
          }}>
            {count}
          </div>
        </div>
        
        {isEditing && onAdd && (
          <button
            onClick={onAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              fontSize: NEURON_TYPOGRAPHY.fontSize.base,
              fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
              color: NEURON_COLORS.primary.tealGreen,
              backgroundColor: "transparent",
              border: "none",
              borderRadius: NEURON_BORDERS.radius.md,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E8F5F3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Plus size={14} />
            {addButtonLabel}
          </button>
        )}
      </div>
      
      {/* Section Content */}
      <div>
        {children}
      </div>
    </div>
  );
};