import "./print.css";
import { Printer } from "lucide-react";

interface DocumentPreviewShellProps {
  children: React.ReactNode;
  settings: React.ReactNode | null;
}

export function DocumentPreviewShell({ children, settings }: DocumentPreviewShellProps) {
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* A4 canvas area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: "#F0F2F5",
          display: "flex",
          justifyContent: "center",
          padding: "32px 24px",
        }}
      >
        <div
          id="neuron-doc-print"
          style={{
            width: "min(816px, 100%)",
            minHeight: "1056px",
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

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #E5ECE9",
            flexShrink: 0,
            marginTop: "auto",
          }}
        >
          <button
            onClick={() => window.print()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "10px",
              background: "#0F766E",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Printer size={15} />
            Print PDF
          </button>
        </div>
      </div>
    </div>
  );
}
