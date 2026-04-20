import { TemplateHeader } from "../TemplateHeader";
import { TemplateFooter } from "../TemplateFooter";
import { TemplateSignatures } from "../TemplateSignatures";
import { formatAmount } from "../../../../utils/formatAmount";
import type { DocumentSettings } from "../../../../types/document-settings";

interface BillingParticular {
  particulars: string;
  volumeType: string;
  volumeQty: number;
  unitCost: number;
  amount: number;
}

interface BillingDocTemplateProps {
  data: {
    billingNumber?: string;
    billingDate?: string;
    clientName?: string;
    companyName?: string;
    currency?: string;
    particulars?: BillingParticular[];
    totalAmount?: number;
    vessel?: string;
    blNumber?: string;
    containerNumbers?: string[];
    origin?: string;
    destination?: string;
  };
  settings: DocumentSettings;
}

export function BillingDocTemplate({ data, settings }: BillingDocTemplateProps) {
  const stamp = settings.stamp;
  const stampHeaderRight = stamp?.position === "header-right" ? stamp.pngData : undefined;
  const stampFooterCenter = stamp?.position === "footer-center" ? stamp.pngData : undefined;
  const stampOverSigs = stamp?.position === "over-signatures" ? stamp.pngData : undefined;

  const particulars = data.particulars || [];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#12332B", lineHeight: "1.2" }}>
      <TemplateHeader
        title="Statement of Account"
        referenceNo={data.billingNumber || ""}
        dateIssued={data.billingDate || ""}
        stampRight={stampHeaderRight}
      />

      {/* Prepared for */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7A76", marginBottom: "4px" }}>Prepared for:</div>
        <div style={{ fontWeight: 700, fontSize: "13px" }}>{data.clientName || "—"}</div>
        {data.companyName && data.companyName !== data.clientName && (
          <div style={{ fontSize: "11px", color: "#6B7A76" }}>{data.companyName}</div>
        )}
      </div>

      {/* Shipment details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
        {[
          { label: "Vessel", value: data.vessel },
          { label: "B/L Number", value: data.blNumber },
          { label: "Container(s)", value: data.containerNumbers?.join(", ") },
          { label: "Origin", value: data.origin },
          { label: "Destination", value: data.destination },
        ].filter(f => f.value).map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7A76" }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Particulars table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #12332B" }}>
            {["Description", "Vol Type", "Qty", "Unit Cost", "Amount"].map((h) => (
              <th key={h} style={{ padding: "6px 8px", textAlign: h === "Description" ? "left" : "right", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7A76", fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {particulars.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: "16px 8px", textAlign: "center", color: "#9CA3AF" }}>No charges added.</td>
            </tr>
          ) : (
            particulars.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E5ECE9" }}>
                <td style={{ padding: "7px 8px" }}>{p.particulars}</td>
                <td style={{ padding: "7px 8px", textAlign: "right" }}>{p.volumeType}</td>
                <td style={{ padding: "7px 8px", textAlign: "right" }}>{p.volumeQty}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(p.unitCost)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(p.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #12332B" }}>
            <td colSpan={4} style={{ padding: "8px", fontWeight: 700, fontSize: "12px" }}>TOTAL</td>
            <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>
              {data.currency || "PHP"} {formatAmount(data.totalAmount || 0)}
            </td>
          </tr>
        </tfoot>
      </table>

      <TemplateSignatures settings={settings} stampOverSignatures={stampOverSigs} />
      <TemplateFooter stampCenter={stampFooterCenter} />
    </div>
  );
}
