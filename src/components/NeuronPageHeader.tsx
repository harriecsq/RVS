import { ReactNode } from "react";

interface NeuronPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  padding?: string;
  borderBottom?: boolean;
}

export function NeuronPageHeader({
  title,
  subtitle,
  action,
  padding = "32px 48px 24px 48px",
  borderBottom = false,
}: NeuronPageHeaderProps) {
  return (
    <div
      className="flex items-start justify-between"
      style={{
        padding,
        borderBottom: borderBottom ? "1px solid var(--neuron-ui-border)" : undefined,
        background: "#FFFFFF",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 600,
            color: "#0A1D4D",
            lineHeight: "40px",
            marginBottom: "4px",
            letterSpacing: "-1.2px",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: "14px",
              color: "#667085",
              lineHeight: "20px",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
