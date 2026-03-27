import { ReactNode, CSSProperties } from "react";

interface NeuronCardProps {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
  className?: string;
  style?: CSSProperties;
}

export function NeuronCard({
  children,
  padding = "md",
  className = "",
  style = {}
}: NeuronCardProps) {
  const paddingValues = {
    sm: "12px",
    md: "16px",
    lg: "20px",
  };

  return (
    <div
      className={className}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E9F0",
        borderRadius: "12px",
        padding: paddingValues[padding],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
