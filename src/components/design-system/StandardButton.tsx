import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface StandardButtonProps {
  children?: React.ReactNode;
  label?: string; // Support label prop as alternative to children
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  color?: "primary" | "secondary"; // Support color prop for backwards compatibility
}

/**
 * StandardButton Component
 * 
 * Consistent button styling across the application.
 * Based on reference design from EXP-89545.
 * 
 * Design specs:
 * - Primary: Teal bg (#0F766E), white text
 * - Secondary: White bg, gray border, dark text
 * - Danger: Red bg (#DC2626), white text
 * - Height: 40px
 * - Padding: 10px 20px
 * - Radius: 8px
 * - Font: 14px, semibold
 */
export function StandardButton({
  children,
  label,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  onClick,
  disabled = false,
  fullWidth = false,
  type = "button",
  color,
}: StandardButtonProps) {
  const sizeStyles = {
    sm: {
      height: "32px",
      padding: "6px 16px",
      fontSize: "13px",
    },
    md: {
      height: "var(--ds-button-height)",
      padding: "10px 20px",
      fontSize: "var(--ds-text-body)",
    },
    lg: {
      height: "48px",
      padding: "14px 24px",
      fontSize: "15px",
    },
  };

  const variantStyles = {
    primary: {
      background: "var(--ds-teal-primary)",
      color: "var(--ds-white)",
      border: "1px solid var(--ds-teal-primary)",
      hoverBackground: "#0D6962",
      hoverColor: "var(--ds-white)",
    },
    secondary: {
      background: "var(--ds-white)",
      color: "var(--ds-green-dark)",
      border: "1px solid var(--ds-border)",
      hoverBackground: "var(--ds-gray-light)",
      hoverColor: "var(--ds-green-dark)",
    },
    ghost: {
      background: "transparent",
      color: "var(--ds-teal-primary)",
      border: "none",
      hoverBackground: "var(--ds-gray-light)",
      hoverColor: "var(--ds-teal-primary)",
    },
    outline: {
      background: "transparent",
      color: "var(--ds-teal-primary)",
      border: "1px solid var(--ds-teal-primary)",
      hoverBackground: "var(--ds-gray-light)",
      hoverColor: "var(--ds-teal-primary)",
    },
    danger: {
      background: "#DC2626",
      color: "var(--ds-white)",
      border: "1px solid #DC2626",
      hoverBackground: "#B91C1C",
      hoverColor: "var(--ds-white)",
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--ds-space-sm)",
        height: currentSize.height,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        fontWeight: "var(--ds-weight-semibold)",
        color: currentVariant.color,
        background: currentVariant.background,
        border: currentVariant.border,
        borderRadius: "var(--ds-radius-input)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all var(--ds-transition-normal)",
        width: fullWidth ? "100%" : "auto",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = currentVariant.hoverBackground;
          e.currentTarget.style.color = currentVariant.hoverColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = currentVariant.background;
          e.currentTarget.style.color = currentVariant.color;
        }
      }}
    >
      {icon && iconPosition === "left" && icon}
      {label || children}
      {icon && iconPosition === "right" && icon}
    </button>
  );
}