/**
 * Neuron Design System Tokens
 * 
 * Centralized design tokens for consistent styling across Neuron OS.
 * Based on the "Neuron-style" design system with deep green (#12332B) 
 * and teal green (#0F766E) accents, pure white backgrounds, and stroke borders.
 * 
 * Usage:
 * import { NEURON_COLORS, NEURON_TYPOGRAPHY, NEURON_SPACING } from './neuron-design-tokens';
 */

// ============================================================================
// COLORS
// ============================================================================

export const NEURON_COLORS = {
  // Primary Brand Colors
  primary: {
    deepGreen: '#12332B',      // Main brand color, used for titles and important text
    tealGreen: '#0F766E',      // Accent color, used for interactive elements and highlights
  },

  // Text Colors
  text: {
    primary: '#12332B',        // Main text color (deep green)
    secondary: '#667085',      // Secondary text, labels, captions
    tertiary: '#98A2B3',       // Placeholder text, disabled states
    white: '#FFFFFF',          // White text (on dark backgrounds)
    link: '#0F766E',           // Link color (teal green)
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',        // Pure white, main background
    secondary: '#F9FAFB',      // Light gray, secondary background
    tertiary: '#F3F4F6',       // Slightly darker gray
    success: '#E8F2EE',        // Light green tint
    gradient: 'linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)', // Metadata bar gradient
  },

  // Border Colors
  border: {
    primary: '#E5E9F0',        // Main border color (light gray)
    secondary: '#E5E7EB',      // Alternative border
    tertiary: '#D0D5DD',       // Slightly darker border
    focus: '#0F766E',          // Focus state border (teal green)
    separator: '#0F766E',      // Separator lines (teal green with opacity)
  },

  // Status Colors
  status: {
    draft: '#6B7280',          // Gray
    submitted: '#3B82F6',      // Blue
    approved: '#10B981',       // Green
    paid: '#10B981',           // Green
    completed: '#10B981',      // Green
    cancelled: '#DC2626',      // Red
    pending: '#F59E0B',        // Orange
    error: '#DC2626',          // Red
    warning: '#F59E0B',        // Orange
    info: '#3B82F6',           // Blue
  },

  // Interactive States
  interactive: {
    hover: '#F9FAFB',          // Hover background
    pressed: '#E8F2EE',        // Pressed/active background
    disabled: '#F3F4F6',       // Disabled background
    focusRing: 'rgba(15, 118, 110, 0.1)', // Focus ring
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const NEURON_TYPOGRAPHY = {
  // Font Sizes
  fontSize: {
    xs: '11px',                // Extra small (metadata labels)
    sm: '12px',                // Small
    base: '13px',              // Base (field labels)
    md: '14px',                // Medium (body text, inputs)
    lg: '16px',                // Large (section titles)
    xl: '18px',                // Extra large (tab labels)
    '2xl': '20px',             // 2X large (page titles, amounts)
    '3xl': '24px',             // 3X large (hero text)
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.5px',
    normal: '0',
    wide: '0.5px',
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const NEURON_SPACING = {
  // Standard spacing scale
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '48px',

  // Page Padding (consistent across modules)
  page: {
    horizontal: '48px',
    vertical: '32px',
  },

  // Component Padding
  component: {
    card: '32px',
    section: '24px',
    input: '10px 12px',
    button: '10px 20px',
    badge: '4px 8px',
  },

  // Gaps
  gap: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
  },
} as const;

// ============================================================================
// BORDERS
// ============================================================================

export const NEURON_BORDERS = {
  // Border Widths
  width: {
    thin: '1px',
    medium: '1.5px',
    thick: '2px',
  },

  // Border Radius
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },

  // Border Styles (pre-composed)
  style: {
    default: '1px solid #E5E9F0',
    secondary: '1px solid #E5E7EB',
    tertiary: '1.5px solid #D0D5DD',
    focus: '1px solid #0F766E',
    separator: '1px solid #E5E9F0',
    thick: '1.5px solid #0F766E',
  },
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const NEURON_SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

// ============================================================================
// COMPOSITE STYLES (Pre-composed style objects for common patterns)
// ============================================================================

export const NEURON_STYLES = {
  // Field Labels (used above input fields)
  fieldLabel: {
    fontSize: NEURON_TYPOGRAPHY.fontSize.base,
    color: NEURON_COLORS.text.secondary,
    marginBottom: NEURON_SPACING.sm,
    fontWeight: NEURON_TYPOGRAPHY.fontWeight.medium,
  } as React.CSSProperties,

  // Input Fields (editable)
  input: {
    width: '100%',
    padding: NEURON_SPACING.component.input,
    fontSize: NEURON_TYPOGRAPHY.fontSize.md,
    color: NEURON_COLORS.text.primary,
    background: NEURON_COLORS.background.primary,
    border: NEURON_BORDERS.style.secondary,
    borderRadius: NEURON_BORDERS.radius.lg,
    outline: 'none',
  } as React.CSSProperties,

  // Read-only Fields (non-editable display boxes)
  readOnlyField: {
    padding: '10px 14px',
    fontSize: NEURON_TYPOGRAPHY.fontSize.md,
    color: NEURON_COLORS.text.primary,
    background: NEURON_COLORS.background.secondary,
    border: NEURON_BORDERS.style.default,
    borderRadius: NEURON_BORDERS.radius.md,
    minHeight: '42px',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  // Section Cards (white cards with shadow)
  sectionCard: {
    background: NEURON_COLORS.background.primary,
    borderRadius: NEURON_BORDERS.radius.xl,
    padding: NEURON_SPACING.component.card,
    boxShadow: NEURON_SHADOWS.base,
    marginBottom: NEURON_SPACING['2xl'],
  } as React.CSSProperties,

  // Section Titles (h3 headers in cards)
  sectionTitle: {
    fontSize: NEURON_TYPOGRAPHY.fontSize.lg,
    fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
    color: NEURON_COLORS.primary.tealGreen,
    marginTop: 0,
    marginRight: 0,
    marginBottom: NEURON_SPACING['2xl'],
    marginLeft: 0,
  } as React.CSSProperties,

  // Page Header
  pageHeader: {
    background: NEURON_COLORS.background.primary,
    borderBottom: NEURON_BORDERS.style.default,
    padding: `${NEURON_SPACING.xl} ${NEURON_SPACING.page.horizontal}`,
    flexShrink: 0,
  } as React.CSSProperties,

  // Page Title
  pageTitle: {
    fontSize: NEURON_TYPOGRAPHY.fontSize['2xl'],
    fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
    color: NEURON_COLORS.primary.deepGreen,
    margin: 0,
  } as React.CSSProperties,

  // Metadata Bar (gradient bar below header)
  metadataBar: {
    background: NEURON_COLORS.background.gradient,
    borderBottom: NEURON_BORDERS.style.thick,
    padding: `${NEURON_SPACING.lg} ${NEURON_SPACING.page.horizontal}`,
    display: 'flex',
    alignItems: 'center',
    gap: NEURON_SPACING['3xl'],
    flexShrink: 0,
  } as React.CSSProperties,

  // Metadata Label (small uppercase labels)
  metadataLabel: {
    fontSize: NEURON_TYPOGRAPHY.fontSize.xs,
    fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
    color: NEURON_COLORS.primary.tealGreen,
    textTransform: 'uppercase' as const,
    letterSpacing: NEURON_TYPOGRAPHY.letterSpacing.wide,
    marginBottom: '2px',
  } as React.CSSProperties,

  // Metadata Value (large value text)
  metadataValue: {
    fontSize: NEURON_TYPOGRAPHY.fontSize['2xl'],
    fontWeight: NEURON_TYPOGRAPHY.fontWeight.bold,
    color: NEURON_COLORS.primary.deepGreen,
  } as React.CSSProperties,

  // Metadata Value Small (14px value text)
  metadataValueSmall: {
    fontSize: NEURON_TYPOGRAPHY.fontSize.md,
    fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
    color: NEURON_COLORS.primary.deepGreen,
  } as React.CSSProperties,

  // Separator (vertical line in metadata bar)
  separator: {
    width: '1px',
    height: '40px',
    background: NEURON_COLORS.border.separator,
    opacity: 0.2,
  } as React.CSSProperties,

  // Content Area
  contentArea: {
    background: NEURON_COLORS.background.secondary,
    flex: 1,
    overflow: 'auto' as const,
  } as React.CSSProperties,

  // Content Padding
  contentPadding: {
    padding: `${NEURON_SPACING.page.vertical} ${NEURON_SPACING.page.horizontal}`,
  } as React.CSSProperties,

  // Grid Layout (2 columns)
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: NEURON_SPACING.xl,
    marginBottom: NEURON_SPACING['2xl'],
  } as React.CSSProperties,

  // Back Button
  backButton: {
    background: 'transparent',
    border: 'none',
    padding: NEURON_SPACING.sm,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: NEURON_COLORS.text.secondary,
    borderRadius: NEURON_BORDERS.radius.md,
  } as React.CSSProperties,

  // Activity Button
  activityButton: {
    display: 'flex',
    alignItems: 'center',
    gap: NEURON_SPACING.sm,
    padding: NEURON_SPACING.component.button,
    backgroundColor: NEURON_COLORS.background.primary,
    border: `${NEURON_BORDERS.width.medium} solid ${NEURON_COLORS.border.primary}`,
    borderRadius: NEURON_BORDERS.radius.lg,
    fontSize: NEURON_TYPOGRAPHY.fontSize.md,
    fontWeight: NEURON_TYPOGRAPHY.fontWeight.semibold,
    color: NEURON_COLORS.text.secondary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,

  // Activity Button Active State
  activityButtonActive: {
    backgroundColor: NEURON_COLORS.interactive.pressed,
    border: `${NEURON_BORDERS.width.medium} solid ${NEURON_COLORS.primary.tealGreen}`,
    color: NEURON_COLORS.primary.tealGreen,
  } as React.CSSProperties,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status color based on status string
 */
export function getStatusColor(status: string): string {
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus.includes('draft')) return NEURON_COLORS.status.draft;
  if (normalizedStatus.includes('submit')) return NEURON_COLORS.status.submitted;
  if (normalizedStatus.includes('approve')) return NEURON_COLORS.status.approved;
  if (normalizedStatus.includes('paid') || normalizedStatus.includes('complete')) return NEURON_COLORS.status.paid;
  if (normalizedStatus.includes('cancel')) return NEURON_COLORS.status.cancelled;
  if (normalizedStatus.includes('pending')) return NEURON_COLORS.status.pending;
  if (normalizedStatus.includes('error')) return NEURON_COLORS.status.error;
  if (normalizedStatus.includes('warning')) return NEURON_COLORS.status.warning;
  
  return NEURON_COLORS.text.secondary;
}

/**
 * Merge custom styles with base styles
 */
export function mergeStyles(
  baseStyle: React.CSSProperties,
  customStyle?: React.CSSProperties
): React.CSSProperties {
  if (!customStyle) return baseStyle;
  return { ...baseStyle, ...customStyle };
}

/**
 * Create focus handler for inputs
 */
export function createFocusHandlers() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = NEURON_COLORS.border.focus;
      e.currentTarget.style.outline = `2px solid ${NEURON_COLORS.interactive.focusRing}`;
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = NEURON_COLORS.border.secondary;
      e.currentTarget.style.outline = 'none';
    },
  };
}

/**
 * Create hover handlers for buttons
 */
export function createHoverHandlers(hoverColor: string = NEURON_COLORS.interactive.hover) {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = hoverColor;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = 'transparent';
    },
  };
}