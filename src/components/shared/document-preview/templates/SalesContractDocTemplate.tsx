import type { DocumentSettings } from "../../../../types/document-settings";

interface SalesContractDocTemplateProps {
  data: Record<string, any>;
  settings: DocumentSettings;
}

function formatNumber(raw: string | number): string {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  if (isNaN(n)) return String(raw);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateLetters(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function SalesContractDocTemplate({ data, settings }: SalesContractDocTemplateProps) {
  const refNo = data.refNo || data.referenceNo || "";
  const date = formatDateLetters(data.date || "");

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1" }}>

      {/* Title */}
      <div style={{ textAlign: "center", fontSize: "18px", fontWeight: 700, textTransform: "uppercase", margin: "18px 0 8px", letterSpacing: "0.08em" }}>
        SALES CONTRACT
      </div>

      {/* Ref No + Date */}
      <div style={{ textAlign: "right", fontSize: "10px", marginBottom: "16px", lineHeight: "1.8" }}>
        <div>NO.: {refNo}</div>
        <div>DATE: {date}</div>
      </div>

      {/* Supplier / Seller block */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "11px" }}>
        <tbody>
          <InfoRow label="SUPPLIER" value={data.supplierName || ""} bold />
          <InfoRow label="ADDRESS" value={data.supplierAddress || ""} bold />
          <InfoRow label="SELLER" value={data.sellerName || ""} bold />
          <InfoRow label="ADDRESS" value={data.sellerAddress || ""} bold />
        </tbody>
      </table>

      <div style={{ height: "8px" }} />

      {/* Buyer block */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
        <tbody>
          <InfoRow label="BUYER" value={data.buyerName || ""} bold />
          <InfoRow label="ADDRESS" value={data.buyerAddress || ""} bold />
          <InfoRow label="CONTACT" value={data.buyerContact || ""} bold />
          <InfoRow label="PHONE" value={data.buyerPhone || ""} bold />
          <InfoRow label="EMAIL" value={data.buyerEmail || ""} bold />
        </tbody>
      </table>

      {/* Goods table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", margin: "16px 0", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={th}>COMMODITY DESCRIPTION</th>
            <th style={th}>QUANTITY</th>
            <th style={th}>UNIT PRICE (CNF)</th>
            <th style={th}>TOTAL AMOUNT (CNF)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...td, textAlign: "center", verticalAlign: "middle" }}>
              {data.marksAndNos && <div style={{ lineHeight: "1.4" }}>{data.marksAndNos} CONTAINER</div>}
              <div style={{ lineHeight: "1.4" }}>{data.commodityDescription || data.commodity || ""}</div>
            </td>
            <td style={{ ...td, textAlign: "center" }}>{data.quantity ? `${formatNumber(data.quantity)} MT` : ""}</td>
            <td style={{ ...td, textAlign: "center" }}>{data.unitPrice ? `USD ${formatNumber(data.unitPrice)}` : ""}</td>
            <td style={{ ...td, textAlign: "center" }}>{data.totalAmount ? `USD ${formatNumber(data.totalAmount)}` : ""}</td>
          </tr>
        </tbody>
      </table>

      {/* Shipping info */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
        <tbody>
          <InfoRow label="PORT OF LOADING" value={data.portOfLoading || ""} />
          <InfoRow label="PORT OF DESTINATION" value={data.portOfDestination || data.portOfDischarge || ""} />
          <InfoRow label="VESSEL/VOY" value={data.vesselVoyage || ""} />
          <InfoRow label="TERMS OF PAYMENT" value={data.termsOfPayment || ""} />
          <InfoRow label="SHIPMENT DATE" value={formatDateLetters(data.shipmentDate || "")} />
        </tbody>
      </table>

      {/* Bank details */}
      <div style={{ fontSize: "11px", lineHeight: "1.4", marginBottom: "24px" }}>
        <div>BANK : {data.bankName || ""}</div>
        <div>SWIFT CODE : {data.swiftCode || ""}</div>
        <div>ACCOUNT No : {data.accountNo || ""}</div>
        <div>ACCOUNT NAME : {data.accountName || ""}</div>
        <div>BANK ADDRESS : {data.bankAddress || ""}</div>
      </div>

      {/* Documents checklist */}
      <div style={{ fontSize: "11px", marginBottom: "32px" }}>
        <div style={{ marginBottom: "4px" }}>DOCUMENT</div>
        <div>A: BILL OF LADING&nbsp;&nbsp;&nbsp;B: CERTIFICATE OF ORIGIN&nbsp;&nbsp;&nbsp;C: INVOICE&nbsp;&nbsp;&nbsp;D: PACKING LIST</div>
      </div>

      {/* Signatures — Buyer / Seller / Supplier */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginTop: "8px" }}>
        {[
          { label: "THE BUYER" },
          { label: "THE SELLER" },
          { label: "THE SUPPLIER" },
        ].map(({ label }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "11px", marginBottom: "8px" }}>{label}</div>
            <div style={{ position: "relative", height: "64px", width: "100%" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderBottom: "1px solid #000" }} />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const w = bold ? 700 : 400;
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap", paddingRight: "12px", padding: "0 12px 0 0", verticalAlign: "top", width: "180px", fontWeight: w, lineHeight: "1.4" }}>
        {label} :
      </td>
      <td style={{ padding: "0", verticalAlign: "top", fontWeight: w, lineHeight: "1.4" }}>{value}</td>
    </tr>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 8px",
  textAlign: "center",
  fontWeight: 400,
  fontSize: "10px",
  textTransform: "uppercase",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  verticalAlign: "top",
  minHeight: "40px",
};
