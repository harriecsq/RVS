import "./print.css";

interface DocumentPreviewShellProps {
  children: React.ReactNode;
  settings?: React.ReactNode | null;
  landscape?: boolean;
}

export function DocumentPreviewShell({ children, landscape }: DocumentPreviewShellProps) {
  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        background: "#F0F2F5",
        display: landscape ? "block" : "flex",
        justifyContent: landscape ? undefined : "center",
        padding: "32px 24px",
      }}
    >
      <div
        id="neuron-doc-print"
        style={{
          width: landscape ? "1122px" : "min(816px, 100%)",
          minHeight: landscape ? "794px" : "1056px",
          background: "#FFFFFF",
          padding: "48px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
          borderRadius: "4px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}
