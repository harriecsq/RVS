import { ReactNode, CSSProperties } from "react";

interface NeuronCardProps {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
  elevation?: "1" | "2";
  className?: string;
  style?: CSSProperties;
}

export function NeuronCard({ 
  children, 
  padding = "md", 
  elevation = "1",
  className = "",
  style = {}
}: NeuronCardProps) {
  const paddingValues = {
    sm: "12px",
    md: "16px",
    lg: "20px",
  };

  const elevationValues = {
    "1": "0 1px 2px 0 rgba(16, 24, 20, 0.04)",
    "2": "0 2px 8px 0 rgba(16, 24, 20, 0.06)",
  };

  return (
    <div
      className={className}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5ECE9",
        borderRadius: "14px",
        boxShadow: elevationValues[elevation],
        padding: paddingValues[padding],
        ...style,
      }}
    >
      {children}
    </div>
  );
}