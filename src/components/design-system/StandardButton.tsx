import React, { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface StandardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * StandardButton — canonical button component for all screens.
 *
 * Design specs:
 * - Primary: #0F766E bg, white text
 * - Secondary: white bg, gray border, dark text
 * - Danger: #EF4444 bg, white text
 * - Height: 40px (md), 32px (sm), 48px (lg)
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
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: StandardButtonProps) {
  const sizeStyles = {
    sm: { height: "32px", padding: "6px 16px", fontSize: "13px" },
    md: { height: "40px", padding: "10px 20px", fontSize: "14px" },
    lg: { height: "48px", padding: "14px 24px", fontSize: "15px" },
  };

  const variantStyles = {
    primary: {
      background: "#0F766E",
      color: "#FFFFFF",
      border: "1px solid #0F766E",
      hoverBackground: "#0D6B64",
      hoverColor: "#FFFFFF",
    },
    secondary: {
      background: "#FFFFFF",
      color: "#0A1D4D",
      border: "1px solid #E5E9F0",
      hoverBackground: "#F9FAFB",
      hoverColor: "#0A1D4D",
    },
    ghost: {
      background: "transparent",
      color: "#0F766E",
      border: "none",
      hoverBackground: "#F9FAFB",
      hoverColor: "#0F766E",
    },
    outline: {
      background: "transparent",
      color: "#0F766E",
      border: "1px solid #0F766E",
      hoverBackground: "#F9FAFB",
      hoverColor: "#0F766E",
    },
    danger: {
      background: "#EF4444",
      color: "#FFFFFF",
      border: "1px solid #EF4444",
      hoverBackground: "#DC2626",
      hoverColor: "#FFFFFF",
    },
  };

  const isDisabled = disabled || loading;
  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  const iconSlot = loading ? (
    <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" />
  ) : icon ?? null;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        height: currentSize.height,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        fontWeight: 600,
        color: currentVariant.color,
        background: currentVariant.background,
        border: currentVariant.border,
        borderRadius: "8px",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.5 : 1,
        transition: "background 0.15s ease, color 0.15s ease",
        width: fullWidth ? "100%" : "auto",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = currentVariant.hoverBackground;
          e.currentTarget.style.color = currentVariant.hoverColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = currentVariant.background;
          e.currentTarget.style.color = currentVariant.color;
        }
      }}
      {...rest}
    >
      {iconSlot && iconPosition === "left" && iconSlot}
      {label || children}
      {iconSlot && iconPosition === "right" && iconSlot}
    </button>
  );
}
