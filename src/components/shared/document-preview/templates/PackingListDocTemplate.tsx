import type { DocumentSettings } from "../../../../types/document-settings";

interface PackingListDocTemplateProps {
  data: Record<string, any>;
  settings: DocumentSettings;
}

function formatDateLetters(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatNumber(raw: string | number): string {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  if (isNaN(n)) return String(raw);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PackingListDocTemplate({ data, settings }: PackingListDocTemplateProps) {

  const refNo = data.refNo || "";
  const date = formatDateLetters(data.date || "");
  const shippedToName = data.shippedToName || "";
  const shippedToAddress = data.shippedToAddress || "";
  const shippedToContact = data.shippedToContact || "";
  const shippedToPhone = data.shippedToPhone || "";
  const shippedToEmail = data.shippedToEmail || "";
  const vesselVoyage = data.vesselVoyage || "";
  const placeOfOrigin = data.placeOfOrigin || "";
  const portOfDischarge = data.portOfDischarge || "";
  const shipmentDate = formatDateLetters(data.shipmentDate || "");
  const volume = data.volume || "";
  const commodity = data.commodity || "";
  const containers: any[] = Array.isArray(data.containers) ? data.containers : [];

  const totalAmount = containers.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const totalNet = containers.reduce((s, c) => s + (parseFloat(c.netWeight) || 0), 0);
  const totalGross = containers.reduce((s, c) => s + (parseFloat(c.grossWeight) || 0), 0);

  const metricLabel = (containers.find((c) => c.amountMetric)?.amountMetric || "").toUpperCase() || "QTY";

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1" }}>

      {/* Title */}
      <div style={{ textAlign: "center", fontSize: "15px", fontWeight: 700, textTransform: "uppercase", margin: "14px 0 16px", letterSpacing: "0.05em" }}>
        PACKING LIST
      </div>

      {/* NO. and DATE — right aligned */}
      <div style={{ textAlign: "right", fontSize: "11px", marginBottom: "6px" }}>
        <div>NO.: {refNo}</div>
        <div>DATE: {date}</div>
      </div>

      {/* All info rows in one table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "11px" }}>
        <tbody>
          <InfoRow label="SHIPPED TO" value={shippedToName} />
          <InfoRow label="ADDRESS" value={shippedToAddress} />
          <InfoRow label="CONTACT" value={shippedToContact} />
          <InfoRow label="PHONE" value={shippedToPhone} />
          <InfoRow label="EMAIL" value={shippedToEmail} />
          <tr><td colSpan={2} style={{ height: "28px", padding: 0 }} /></tr>
          <InfoRow label="VESSEL/VOY" value={vesselVoyage} />
          <InfoRow label="PLACE OF ORIGIN" value={placeOfOrigin} />
          <InfoRow label="PORT OF DISCHARGE" value={portOfDischarge} />
          <InfoRow label="SHIPMENT DATE" value={shipmentDate} />
          <tr><td colSpan={2} style={{ height: "14px", padding: 0 }} /></tr>
        </tbody>
      </table>

      {/* Description of goods */}
      {(volume || commodity) && (
        <div style={{ fontSize: "11px", marginBottom: "6px" }}>
          <div>DESCRIPTION OF GOODS</div>
          {volume && <div>{volume}</div>}
          {commodity && <div>{commodity}</div>}
        </div>
      )}

      {/* Container table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginBottom: "36px", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={th}>CONTAINER NO.</th>
            <th style={th}>SEAL NUMBER</th>
            <th style={th}>{metricLabel}</th>
            <th style={th}>NET WEIGHT</th>
            <th style={th}>GROSS WEIGHT</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c, i) => (
            <tr key={i}>
              <td style={td}>{c.containerNo || "—"}</td>
              <td style={td}>{c.sealNumber || "—"}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>
                {c.amount ? `${formatNumber(c.amount)} ${c.amountMetric?.toUpperCase() || "SACKS"}` : "—"}
              </td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>
                {c.netWeight ? `${formatNumber(c.netWeight)} KGS` : "—"}
              </td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>
                {c.grossWeight ? `${formatNumber(c.grossWeight)} KGS` : "—"}
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr>
            <td style={{ ...td, borderTop: "1px solid #000" }} colSpan={2}>TOTAL</td>
            <td style={{ ...td, borderTop: "1px solid #000", fontVariantNumeric: "tabular-nums" }}>
              {totalAmount > 0 ? `${formatNumber(totalAmount)} ${metricLabel}` : "—"}
            </td>
            <td style={{ ...td, borderTop: "1px solid #000", fontVariantNumeric: "tabular-nums" }}>
              {totalNet > 0 ? `${formatNumber(totalNet)} KGS` : "—"}
            </td>
            <td style={{ ...td, borderTop: "1px solid #000", fontVariantNumeric: "tabular-nums" }}>
              {totalGross > 0 ? `${formatNumber(totalGross)} KGS` : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature — manager with stamp */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "200px" }}>
        <div style={{ position: "relative", height: "80px", width: "160px" }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderBottom: "1px solid #000" }} />
        </div>
        <div style={{ fontSize: "11px", marginTop: "6px" }}>MANAGER</div>
      </div>

    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap", paddingRight: "12px", padding: "0 12px 0 0", verticalAlign: "top", width: "160px", lineHeight: "1.4" }}>
        {label}{label ? ":" : ""}
      </td>
      <td style={{ padding: "0", verticalAlign: "top", lineHeight: "1.4" }}>{value}</td>
    </tr>
  );
}

function BorderedRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ border: "1px solid #000", padding: "4px 8px", whiteSpace: "nowrap", width: "130px", verticalAlign: "top" }}>
        {label}:
      </td>
      <td style={{ border: "1px solid #000", padding: "4px 8px", verticalAlign: "top" }}>{value}</td>
    </tr>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 6px",
  textAlign: "center",
  fontWeight: 400,
  fontSize: "10px",
  textTransform: "uppercase",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 6px",
  textAlign: "center",
  verticalAlign: "middle",
};
