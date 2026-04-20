import type { DocumentSettings } from "../../../../types/document-settings";

interface CommercialInvoiceDocTemplateProps {
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

export function CommercialInvoiceDocTemplate({ data, settings }: CommercialInvoiceDocTemplateProps) {
  const stamps = settings.stamps || {};
  const managerStamp = stamps["manager"]?.pngData;
  const sellerStamp = stamps["seller"]?.pngData;

  // Field mappings — must match CommercialInvoice type keys from export-documents.ts
  const invoiceNo = data.invoiceNo || "";
  const date = formatDateLetters(data.date || "");
  const portOfLoading = data.portOfLoading || "";
  const portOfDischarge = data.portOfDischarge || "";
  const consigneeName = data.consigneeName || "";
  const consigneeAddress = data.consigneeAddress || "";
  const consigneeContact = data.consigneeContact || "";
  const consigneePhone = data.consigneePhone || "";
  const consigneeEmail = data.consigneeEmail || "";
  const marksAndNos = data.marksAndNos ? `${data.marksAndNos} CONTAINER` : "";
  const description = data.description || "";
  const totalNetWeight = data.totalNetWeight ? `${formatNumber(data.totalNetWeight)} MT` : "";
  const unitPrice = data.unitPrice ? `USD ${formatNumber(data.unitPrice)}` : "";
  const totalInvoiceValue = data.totalInvoiceValue ? `USD ${formatNumber(data.totalInvoiceValue)}` : "";
  const bankName = data.bankName || "";
  const swiftCode = data.swiftCode || "";
  const accountNo = data.accountNo || "";
  const accountName = data.accountName || "";
  const bankAddress = data.bankAddress || "";

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1.2" }}>

      {/* Letterhead */}
      {settings.logoPng ? (
        <div style={{ marginBottom: "12px" }}>
          <img src={settings.logoPng} alt="Company Letterhead" style={{ width: "100%", objectFit: "contain", display: "block" }} />
        </div>
      ) : (
        <div style={{
          border: "1.5px dashed #CBD5E1", borderRadius: "4px", padding: "16px",
          textAlign: "center", color: "#9CA3AF", fontSize: "11px", marginBottom: "12px",
        }}>
          Company letterhead PNG — upload via Document Settings
        </div>
      )}

      {/* Title */}
      <div style={{ textAlign: "center", fontSize: "15px", fontWeight: 700, textTransform: "uppercase", margin: "14px 0 10px", letterSpacing: "0.05em" }}>
        COMMERCIAL INVOICE
      </div>

      {/* Port of Loading / Port of Discharge — left-aligned, no border */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "11px" }}>
        <tbody>
          <InfoRow label="PORT OF LOADING" value={portOfLoading} />
          <InfoRow label="PORT OF DISCHARGE" value={portOfDischarge} />
        </tbody>
      </table>

      {/* Invoice No left, Date right — same line */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "10px" }}>
        <div>INVOICE NO.: {invoiceNo}</div>
        <div>DATE: {date}</div>
      </div>

      {/* Consignee block — fully bordered table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginBottom: "14px", fontSize: "11px" }}>
        <tbody>
          <BorderedRow label="CONSIGNEE" value={consigneeName} />
          <BorderedRow label="ADDRESS" value={consigneeAddress} />
          <BorderedRow label="CONTACT" value={consigneeContact} />
          <BorderedRow label="PHONE" value={consigneePhone} />
          <BorderedRow label="EMAIL" value={consigneeEmail} />
        </tbody>
      </table>

      {/* Goods table — 5 columns matching image exactly */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginBottom: "18px", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "16%" }}>MARKS &amp; NOS</th>
            <th style={{ ...th, width: "28%" }}>DESCRIPTION</th>
            <th style={{ ...th, width: "18%" }}>TOTAL NET WEIGHT</th>
            <th style={{ ...th, width: "18%" }}>UNIT PRICE</th>
            <th style={{ ...th, width: "20%" }}>TOTAL INVOICE VALUE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...td, textAlign: "center" }}>{marksAndNos}</td>
            <td style={{ ...td, textAlign: "center" }}>{description}</td>
            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{totalNetWeight}</td>
            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{unitPrice}</td>
            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{totalInvoiceValue}</td>
          </tr>
        </tbody>
      </table>

      {/* Bank details — plain lines, no border */}
      <div style={{ fontSize: "11px", lineHeight: "2", marginBottom: "36px" }}>
        <div>BANK : {bankName}</div>
        <div>SWIFT CODE : {swiftCode}</div>
        <div>ACCOUNT NO : {accountNo}</div>
        <div>ACCOUNT NAME : {accountName}</div>
        <div>BANK ADDRESS : {bankAddress}</div>
      </div>

      {/* Signatures — Manager left, Seller right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px" }}>
        {([
          { label: "MANAGER", stamp: managerStamp },
          { label: "SELLER", stamp: sellerStamp },
        ] as { label: string; stamp: string | undefined }[]).map(({ label, stamp }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {stamp ? (
              <img src={stamp} alt={label} style={{ height: "64px", objectFit: "contain", marginBottom: "4px" }} />
            ) : (
              <div style={{ height: "64px", width: "80%", borderBottom: "1px solid #000" }} />
            )}
            <div style={{ fontSize: "11px", marginTop: "6px" }}>{label}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap", paddingRight: "12px", paddingBottom: "2px", verticalAlign: "top", width: "160px" }}>
        {label} :
      </td>
      <td style={{ paddingBottom: "2px", verticalAlign: "top" }}>{value}</td>
    </tr>
  );
}

function BorderedRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ border: "1px solid #000", padding: "4px 8px", whiteSpace: "nowrap", width: "130px", verticalAlign: "top" }}>
        {label} :
      </td>
      <td style={{ border: "1px solid #000", padding: "4px 8px", verticalAlign: "top" }}>{value}</td>
    </tr>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 8px",
  textAlign: "center",
  fontWeight: 700,
  fontSize: "10px",
  textTransform: "uppercase",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "10px 8px",
  verticalAlign: "middle",
  minHeight: "48px",
};
