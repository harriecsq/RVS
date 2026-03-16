/**
 * LinkedItemsSelector - Clean, minimal design for displaying and managing linked items
 * 
 * Used for: Projects, Bookings, Expenses, or any entity linking
 * Design: Simple gray headers, light gray cards, no fancy borders or shadows
 * 
 * Example usage:
 * <LinkedItemsSelector
 *   title="Linked Bookings"
 *   actionLabel="Add Booking"
 *   isEditing={isEditing}
 *   onAction={() => setShowDropdown(true)}
 * >
 *   <SimpleCard title="BKG-001" subtitle="Acme Corp" onRemove={...} />
 *   <SimpleCard title="BKG-002" subtitle="Tech Inc" onRemove={...} />
 * </LinkedItemsSelector>
 */

import React, { ReactNode } from "react";
import { X } from "lucide-react";

interface LinkedItemsSelectorProps {
  title: string;
  actionLabel?: string;
  isEditing?: boolean;
  onAction?: () => void;
  children: ReactNode;
}

/**
 * Section wrapper with simple header and action button
 */
export function LinkedItemsSelector({
  title,
  actionLabel,
  isEditing,
  onAction,
  children
}: LinkedItemsSelectorProps) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      {/* Simple header */}
      <div style={{
        fontSize: "13px",
        fontWeight: 500,
        color: "#667085",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {title}
        {isEditing && actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#0F766E",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {children}
    </div>
  );
}

interface SimpleCardProps {
  title: string;
  subtitle?: string;
  onRemove?: () => void;
  isEditing?: boolean;
}

/**
 * Simple card for displaying linked items
 * - Light gray background (#F9FAFB)
 * - Subtle border (#E5E7EB)
 * - Title in dark text, subtitle in gray
 * - Optional remove button (X) in edit mode
 */
export function SimpleCard({ 
  title, 
  subtitle, 
  onRemove,
  isEditing 
}: SimpleCardProps) {
  return (
    <div style={{
      padding: "14px 16px",
      backgroundColor: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: "8px",
      position: "relative"
    }}>
      <div style={{
        fontSize: "14px",
        fontWeight: 600,
        color: "#111827",
        marginBottom: subtitle ? "4px" : "0"
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{
          fontSize: "13px",
          color: "#6B7280"
        }}>
          {subtitle}
        </div>
      )}
      {isEditing && onRemove && (
        <button
          onClick={onRemove}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            padding: "4px",
            backgroundColor: "transparent",
            border: "none",
            color: "#9CA3AF",
            cursor: "pointer",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#F3F4F6";
            e.currentTarget.style.color = "#EF4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#9CA3AF";
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

interface SimpleCardsContainerProps {
  children: ReactNode;
  emptyMessage?: string;
  showEmpty?: boolean;
}

/**
 * Container for SimpleCard items with consistent gap and empty state
 */
export function SimpleCardsContainer({ 
  children, 
  emptyMessage = "No items linked",
  showEmpty = false 
}: SimpleCardsContainerProps) {
  if (showEmpty) {
    return (
      <div style={{
        padding: "32px",
        backgroundColor: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#6B7280",
        fontStyle: "italic",
        textAlign: "center" as const
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: "12px" 
    }}>
      {children}
    </div>
  );
}
