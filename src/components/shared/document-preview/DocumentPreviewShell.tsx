import "./print.css";

interface DocumentPreviewShellProps {
  children: React.ReactNode;
  settings?: React.ReactNode | null;
  landscape?: boolean;
}

export function DocumentPreviewShell({ children, settings, landscape }: DocumentPreviewShellProps) {
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* A4 canvas area */}
      <div
        style={{
          flex: 1,
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

      {/* Settings rail */}
      {settings !== undefined && (
        <div
          className="no-print"
          style={{
            width: "300px",
            flexShrink: 0,
            borderLeft: "1px solid #E5ECE9",
            background: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {settings !== null && (
            <>
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #E5ECE9",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "#6B7A76",
                }}
              >
                Document Settings
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
                {settings}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
