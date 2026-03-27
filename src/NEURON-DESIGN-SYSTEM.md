# Neuron OS Design System

## 1. Overview & Core Philosophy

The Neuron OS design system is built for asset-light freight forwarding SMEs in the Philippines. It emphasizes clarity, consistency, and efficiency through a minimalist approach.

- **Stroke-Based Design:** Use clean stroke borders (1px solid) instead of box shadows for a crisp, modern look.
- **Green & White Palette:** Deep green (#12332B) and teal (#0F766E) accents on pure white backgrounds.
- **Consistent Spacing:** Standard page padding of 32px 48px with systematic internal spacing.
- **Module Isolation:** Each work module operates independently with clear boundaries.

## 2. Typography Scale

Font: **Inter** (Google Fonts Variable). Weights loaded: 400, 500, 600, 700.

| Level | Size | Weight | Tracking | Notes |
|-------|------|--------|----------|-------|
| Display Header | 36px | Semibold (600) | -1.5px | Main dashboard titles |
| Page Title | 24px | Semibold (600) | -0.5px | Standard module headers (h1) |
| Section Heading | 16px | Medium (500) | 0 | Card and section titles (h3/h4) |
| Body Main | 14px | Regular (400) | 0 | Primary content and data |
| Body Small | 12px | Regular (400) | 0 | Secondary labels and metadata |
| Micro | 10px | Bold (700) | +0.5px | All-caps for status badges |

## 3. Spacing Rules (4px/8px base grid)

| Token | Value | Usage |
|-------|-------|-------|
| `--ds-space-4xl` | 48px | Layout edge-to-content (horizontal) |
| `--ds-space-3xl` | 32px | Layout edge-to-content (vertical) |
| `--ds-space-2xl` | 24px | Between major cards/sections |
| `--ds-space-lg` | 16px | Within cards/forms |
| `--ds-space-sm` | 8px | Between labels and inputs |
| `--ds-space-xs` | 4px | Inside small components |

## 4. Color System

### Brand Colors
| Name | Variable | Value |
|------|----------|-------|
| Brand Green | `--neuron-brand-green` | #0F766E |
| Deep Green | `--neuron-brand-deep-green` | #12332B |
| Brand Hover | `--neuron-brand-green-600` | #0D6B64 |
| Brand Light | `--neuron-brand-green-100` | #E8F5F3 |

### Ink (Text) Colors
| Name | Variable | Value |
|------|----------|-------|
| Primary Ink | `--neuron-ink-primary` | #0A1D4D |
| Secondary Ink | `--neuron-ink-secondary` | #344054 |
| Muted Ink | `--neuron-ink-muted` | #667085 |

### UI Colors
| Name | Variable | Value |
|------|----------|-------|
| UI Border | `--neuron-ui-border` | #E5E9F0 |
| Background Page | `--neuron-bg-page` | #F8F9FB |
| State Selected | `--neuron-state-selected` | #E8F5F3 |
| State Hover | `--neuron-state-hover` | #F9FAFB |

### Status Colors
| Name | Variable | Value |
|------|----------|-------|
| Success | `--neuron-semantic-success` | #0F766E |
| Error | `--neuron-semantic-danger` | #EF4444 |
| Warning | `--neuron-semantic-warn` | #F59E0B |
| Info | `--neuron-semantic-info` | #3B82F6 |

## 5. Form Elements

### Buttons
| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | #0F766E | white | 1px solid #0F766E |
| Secondary | transparent | #0F766E | 1px solid #0F766E |
| Destructive | #EF4444 | white | none |
| Ghost | transparent | inherit | none (tint on hover) |

- Corner radius: 6px (`--ds-radius-button`)
- Height: 40px (`--ds-button-height`)

### Input Fields
- Default: 1px solid #E5E9F0, white background, 6px radius
- Focus: 1px solid #0F766E
- Labels: top-aligned, 12px Medium weight
- Internal padding: 8px 12px
- Height: 40px (`--ds-input-height`)

## 6. Interactive States

### Tables
- Row hover: subtle background shift to `--neuron-state-hover` (#F9FAFB)
- Bottom borders: 1px solid `--neuron-ui-border`

### Buttons & Dropdowns
- Hover states align with the button's base theme
- Dropdown items: background shifts to `--neuron-state-selected` (#E8F5F3)

## 7. Component Specs

### Cards
- Background: white
- Border: 1px solid `--neuron-ui-border`
- Radius: 12px (`--ds-radius-card`)
- Padding: 20px (`--ds-card-padding`)
- **No box shadows** — stroke-based design only

### Status Badges
- Font: 11px, weight 600
- Radius: 4px (`--ds-radius-badge`)
- Padding: 4px 8px
- Light background with high-contrast text

### Alert Messages
- Full-width banners with light backgrounds
- Left-aligned status icons
- Colors follow the Status Color system

## 8. Implementation

All tokens are defined in `src/styles/globals.css` under two namespaces:
- `--neuron-*` — Core design tokens (brand, ink, UI, semantic)
- `--ds-*` — Design system tokens (typography, spacing, component-specific)

Tailwind CSS v4 theme variables (`--color-*`, `--radius-*`) are mapped from these tokens in the `@theme inline` block.
