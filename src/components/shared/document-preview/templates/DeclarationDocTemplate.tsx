import type { DocumentSettings } from "../../../../types/document-settings";

interface DeclarationDocTemplateProps {
  data: Record<string, any>;
  settings: DocumentSettings;
}

function formatDateLetters(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

export function DeclarationDocTemplate({ data, settings }: DeclarationDocTemplateProps) {
  const supplierStamp = settings.stamps?.["supplier"]?.pngData;

  const containers: { containerNo: string; sealNo: string }[] = data.containers || [];
  const containerNos = containers.map((c) => [c.containerNo, c.sealNo].filter(Boolean).join("/")).filter(Boolean).join("\n");

  const weight = data.totalNetWeight ? `${data.totalNetWeight} MT` : "";
  const commodity = data.description || "";
  const shipmentText = [weight, commodity].filter(Boolean).join(" ");

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1.2" }}>

      {/* Company letterhead */}
      {settings.logoPng ? (
        <div style={{ marginBottom: "20px" }}>
          <img src={settings.logoPng} alt="Company Letterhead" style={{ width: "100%", objectFit: "contain", display: "block" }} />
        </div>
      ) : (
        <div style={{
          border: "1.5px dashed #CBD5E1", borderRadius: "4px", padding: "16px",
          textAlign: "center", color: "#9CA3AF", fontSize: "11px", marginBottom: "20px",
        }}>
          Company letterhead PNG — upload via Document Settings
        </div>
      )}

      {/* Title block */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>
          Declaration of no-wood packing material
        </div>
        <div style={{ fontSize: "11px", fontWeight: 700 }}>
          To the Service of China Entry &amp; Exit Inspection and Quarantine
        </div>
      </div>

      {/* Body paragraph */}
      <div style={{ textAlign: "center", margin: "0 0 28px", fontSize: "12px", lineHeight: "1.8" }}>
        It is declared that this shipment of{" "}
        {shipmentText || "_______________"}
        <br />
        does not contain wood packing materials.
      </div>

      {/* Info rows */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "11px" }}>
        <tbody>
          <InfoRow label="VESSEL/VOYAGE" value={data.vesselVoyage || ""} />
          <InfoRow label="B/L NUMBER" value={data.blNumber || ""} />
          <InfoRow label="CONTAINER NOS" value={containerNos} multiline />
        </tbody>
      </table>

      {/* Description */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "48px", fontSize: "11px" }}>
        <tbody>
          <InfoRow label="DESCRIPTION" value={commodity} />
        </tbody>
      </table>

      {/* Signature block */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td style={{ whiteSpace: "nowrap", paddingRight: "16px", paddingBottom: "4px", verticalAlign: "bottom", width: "160px" }}>
              <div>SIGNED BY:</div>
              <div style={{ marginTop: "4px" }}>DATE:</div>
            </td>
            <td style={{ paddingBottom: "4px", verticalAlign: "top" }}>
              {supplierStamp ? (
                <img src={supplierStamp} alt="Supplier Stamp" style={{ height: "80px", objectFit: "contain", display: "block" }} />
              ) : (
                <div style={{ height: "80px" }} />
              )}
              <div>{formatDateLetters(data.date || "")}</div>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap", paddingRight: "16px", paddingBottom: "6px", verticalAlign: "top", width: "160px" }}>
        {label} :
      </td>
      <td style={{ paddingBottom: "6px", verticalAlign: "top", whiteSpace: multiline ? "pre-line" : "normal" }}>
        {value}
      </td>
    </tr>
  );
}
