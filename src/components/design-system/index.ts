/**
 * Design System Components
 * 
 * Standardized reusable components based on EXP-89545 reference design.
 * All components use CSS variables from /styles/globals.css
 * 
 * Usage:
 * import { MetricsHeader, StandardTabs, SectionCard } from './components/design-system';
 */

export { MetricsHeader } from "./MetricsHeader";
export { StandardTabs } from "./StandardTabs";
export type { Tab } from "./StandardTabs";
export { SectionCard } from "./SectionCard";
export { CollapsibleCategory } from "./CollapsibleCategory";
export { LinkedRecordCard } from "./LinkedRecordCard";
export { StandardButton } from "./StandardButton";

// Form Components
export { StandardInput } from "./StandardInput";
export { StandardTextarea } from "./StandardTextarea";
export { StandardSelect } from "./StandardSelect";
export { StandardDatePicker } from "./StandardDatePicker";

// Search & Filter Components
export { StandardSearchInput } from "./StandardSearchInput";
export { StandardFilterDropdown } from "./StandardFilterDropdown";

// Feedback Components
export { StandardBadge } from "./StandardBadge";
export { StandardEmptyState } from "./StandardEmptyState";
export { StandardLoadingState } from "./StandardLoadingState";

// Design Tokens
export * from "./neuron-design-tokens";
