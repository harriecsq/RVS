import { LayoutGrid, FileText, Printer } from "lucide-react";

/**
 * Self-contained PDF-preview FRONT-END only — the form/PDF toggle + the A4
 * "paper" canvas + an optional settings rail + the print stylesheet.
 *
 * It renders NO document content. Pass your own document JSX as `children`
 * (that's where a template would go). Drop-in, depends only on lucide-react.
 *
 * Usage:
 *   const [view, setView] = useState<"form" | "pdf">("form");
 *   <DocumentViewToggle value={view} onChange={setView} />
 *   {view === "pdf" && (
 *     <DocumentPreviewShell settings={<YourSettingsPanel/>}>
 *       <YourDocumentBody/>          // ← your content; empty is fine
 *     </DocumentPreviewShell>
 *   )}
 */

// ─── Print stylesheet (inlined so nothing external is needed) ─────────────────
// Hides everything except #neuron-doc-print when printing. Mount once.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #neuron-doc-print, #neuron-doc-print * { visibility: visible; }
  #neuron-doc-print {
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100% !important; padding: 0 !important; margin: 0 !important;
    box-shadow: none !important; border-radius: 0 !important; min-height: unset !important;
    background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  #neuron-doc-print, #neuron-doc-print * { color: #000 !important; }
  .no-print { display: none !important; }
  @page { size: A4; margin: 15mm; }
}
`;

// ─── Form / PDF toggle (+ Print button in PDF mode) ──────────────────────────

interface DocumentViewToggleProps {
  value: "form" | "pdf";
  onChange: (value: "form" | "pdf") => void;
}

export function DocumentViewToggle({ value, onChange }: DocumentViewToggleProps) {
  const isPdf = value === "pdf";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderBottom: "1px solid #E5ECE9", background: "#FAFBFC" }}>
      {/* Segmented slider track */}
      <div style={{ position: "relative", display: "inline-flex", background: "#E8F2EE", borderRadius: "8px", padding: "3px", cursor: "pointer" }}>
        {/* Sliding pill */}
        <div style={{ position: "absolute", top: "3px", bottom: "3px", left: isPdf ? "50%" : "3px", width: "calc(50% - 3px)", background: "#0F766E", borderRadius: "6px", transition: "left 0.22s cubic-bezier(0.4, 0, 0.2, 1)", pointerEvents: "none" }} />

        <button
          onClick={() => onChange("form")}
          style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "6px", padding: "5px 16px", fontSize: "13px", fontWeight: 500, color: !isPdf ? "#FFFFFF" : "#237F66", background: "transparent", border: "none", borderRadius: "6px", cursor: "pointer", transition: "color 0.22s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap", minWidth: "110px", justifyContent: "center" }}
        >
          <LayoutGrid size={14} style={{ flexShrink: 0 }} />
          Form View
        </button>

        <button
          onClick={() => onChange("pdf")}
          style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "6px", padding: "5px 16px", fontSize: "13px", fontWeight: 500, color: isPdf ? "#FFFFFF" : "#237F66", background: "transparent", border: "none", borderRadius: "6px", cursor: "pointer", transition: "color 0.22s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap", minWidth: "110px", justifyContent: "center" }}
        >
          <FileText size={14} style={{ flexShrink: 0 }} />
          PDF View
        </button>
      </div>

      {/* Print — only in PDF view */}
      {isPdf && (
        <button
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#0F766E", color: "#FFFFFF", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
        >
          <Printer size={14} />
          Print PDF
        </button>
      )}
    </div>
  );
}

// ─── A4 paper canvas + optional settings rail ────────────────────────────────

interface DocumentPreviewShellProps {
  children: React.ReactNode;
  /** Settings rail content. `undefined` hides the rail; `null` keeps an empty rail. */
  settings?: React.ReactNode | null;
  landscape?: boolean;
}

export function DocumentPreviewShell({ children, settings, landscape }: DocumentPreviewShellProps) {
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Print rules — inlined */}
      <style>{PRINT_CSS}</style>

      {/* A4 canvas area */}
      <div style={{ flex: 1, overflow: "auto", background: "#F0F2F5", display: landscape ? "block" : "flex", justifyContent: landscape ? undefined : "center", padding: "32px 24px" }}>
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
        <div className="no-print" style={{ width: "300px", flexShrink: 0, borderLeft: "1px solid #E5ECE9", background: "#FFFFFF", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {settings !== null && (
            <>
              <div style={{ padding: "16px", borderBottom: "1px solid #E5ECE9", fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6B7A76" }}>
                Document Settings
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>{settings}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
