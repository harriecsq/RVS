import type { DocumentSettings } from "../../../types/document-settings";

interface TemplateSignaturesProps {
  settings: DocumentSettings;
  stampOverSignatures?: string; // base64 PNG if stamp.position === "over-signatures"
}

export function TemplateSignatures({ settings, stampOverSignatures }: TemplateSignaturesProps) {
  const slots = [
    { key: "preparedBy" as const, label: "Prepared by:" },
    { key: "approvedBy" as const, label: "Approved by:" },
    { key: "conforme" as const, label: "Conforme:" },
  ];

  return (
    <div style={{ position: "relative", marginTop: "40px" }}>
      {stampOverSignatures && (
        <img
          src={stampOverSignatures}
          alt="Stamp"
          style={{
            position: "absolute",
            right: "0",
            top: "-20px",
            height: "80px",
            objectFit: "contain",
            opacity: 0.85,
            zIndex: 1,
          }}
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
        {slots.map(({ key, label }) => {
          const slot = settings.signatories[key];
          return (
            <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ fontSize: "9px", color: "#6B7A76", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                {label}
              </div>
              {slot?.signaturePng ? (
                <img
                  src={slot.signaturePng}
                  alt={slot.name}
                  style={{ height: "40px", maxWidth: "160px", objectFit: "contain", marginBottom: "4px" }}
                />
              ) : (
                <div style={{ height: "40px", borderBottom: "1px solid #CBD5E1", width: "160px", marginBottom: "4px" }} />
              )}
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#12332B" }}>{slot?.name || "—"}</div>
              <div style={{ fontSize: "10px", color: "#6B7A76" }}>{slot?.title || ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
