import type { ReactNode, CSSProperties } from "react";

/**
 * White rounded card with a header bar. Wraps a group of fields.
 * Optional `action` renders on the right of the header (e.g. an edit button).
 */
export function SectionCard({
  title,
  action,
  children,
  style,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      border: "1px solid #E5E9F0",
      overflow: "hidden",
      marginBottom: "24px",
      ...style,
    }}>
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid #E5E9F0",
        background: "#F9FAFB",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
          {title}
        </h3>
        {action}
      </div>
      <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gap: "20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * A row of fields inside a SectionCard.
 * `columns` is any CSS grid-template-columns value (default two equal columns).
 * Examples: "1fr 1fr", "1fr 2fr", "1fr 1fr 1fr".
 */
export function FieldRow({
  columns = "1fr 1fr",
  gap = "20px",
  children,
  style,
}: {
  columns?: string;
  gap?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: columns, gap, ...style }}>
      {children}
    </div>
  );
}

/**
 * Outer page wrapper that centers detail content at a max width.
 */
export function DetailContainer({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto", ...style }}>
      {children}
    </div>
  );
}
