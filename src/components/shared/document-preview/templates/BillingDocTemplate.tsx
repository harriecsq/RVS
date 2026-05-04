import { formatAmount } from "../../../../utils/formatAmount";
import type { DocumentSettings } from "../../../../types/document-settings";

interface BillingParticular {
  particulars: string;
  volumeType: string;
  volumeQty: number;
  unitCost: number;
  total?: number;
  exchangeRate?: number | null;
  applyExchangeRate?: boolean;
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
    volume?: string;
    commodity?: string;
    exchangeRate?: string;
    preparedBy?: string;
    checkedBy?: string;
    approvedBy?: string;
  };
  settings: DocumentSettings;
}

function formatDateLetters(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function stripApostrophes(value: string): string {
  return value.replace(/['\u2018\u2019\u02BC]/g, "");
}

export function BillingDocTemplate({ data, settings }: BillingDocTemplateProps) {
  const particulars = data.particulars || [];
  const containerStr = data.containerNumbers?.filter(Boolean).join(", ") || "";
  const containerCount = data.containerNumbers?.filter(Boolean).length || 1;
  const volumeDisplay = data.volume ? `${containerCount}x${data.volume}` : containerStr || "";

  const destinationDisplay = (() => {
    const d = (data.destination || "").trim().toLowerCase();
    if (d === "manila north") return "Manila North Harbour";
    if (d === "manila south") return "Manila South Harbour";
    return data.destination || "";
  })();

  const shipmentFields = [
    { label: "VESSEL/VOY", value: data.vessel || "" },
    { label: "BL NUMBER", value: data.blNumber || "" },
    { label: "CONTAINER NUMBER", value: containerStr },
    { label: "DESTINATION", value: destinationDisplay },
    { label: "VOLUME", value: volumeDisplay },
    { label: "COMMODITY", value: data.commodity || "" },
    { label: "EXCHANGE RATE", value: data.exchangeRate || "" },
  ];

  const currency = data.currency || "PHP";
  const EMPTY_ROWS = 6;
  const paddingRows = Math.max(0, EMPTY_ROWS - particulars.length);

  const B = "1px solid #000";

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1", textTransform: "uppercase" }}>

      {/* Letterhead */}
      {settings.logoPng ? (
        <div style={{ marginBottom: "16px" }}>
          <img src={settings.logoPng} alt="Company Letterhead" style={{ width: "100%", objectFit: "contain", display: "block" }} />
        </div>
      ) : (
        <div style={{
          border: "1.5px dashed #CBD5E1", borderRadius: "4px", padding: "20px 16px",
          textAlign: "center", color: "#9CA3AF", fontSize: "11px", marginBottom: "16px",
        }}>
          Company letterhead PNG — upload via Document Settings
        </div>
      )}

      {/* Title */}
      <div style={{ textAlign: "center", fontSize: "16px", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px", letterSpacing: "0.04em" }}>
        STATEMENT OF ACCOUNT
      </div>
      {data.billingNumber && (
        <div style={{ textAlign: "center", fontSize: "11px", marginBottom: "16px", color: "#444" }}>
          {data.billingNumber}
        </div>
      )}

      {/* Date */}
      <div style={{ marginBottom: "8px", lineHeight: "1.4", textTransform: "none" }}>{formatDateLetters(data.billingDate || "")}</div>

      {/* Client */}
      <div style={{ marginBottom: "8px", lineHeight: "1.4" }}>
        <div>{data.clientName || ""}</div>
        {data.companyName && data.companyName !== data.clientName && (
          <div>{data.companyName}</div>
        )}
      </div>

      {/* Shipment fields — all 7 always shown, empty value renders blank */}
      <table style={{ width: "60%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "11px" }}>
        <tbody>
          {shipmentFields.map(({ label, value }) => (
            <tr key={label}>
              <td style={{ padding: "0 12px 0 0", verticalAlign: "top", whiteSpace: "nowrap", lineHeight: "1.4" }}>{label}:</td>
              <td style={{ padding: "0", verticalAlign: "top", lineHeight: "1.4" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Particulars table */}
      {(() => {
        const rawVol = data.volume || "";
        const volSuffix = rawVol.replace(/[A-Za-z]+$/, "");

        // th: full border on all sides (borderCollapse merges adjacent borders)
        const th = (): React.CSSProperties => ({
          padding: "10px 12px",
          textAlign: "center",
          fontSize: "10px",
          fontWeight: 700,
          lineHeight: 1.4,
          border: B,
        });

        // tbody td: left+right borders for column lines; NO top/bottom (no row lines)
        // First tbody row gets borderTop to close the header gap,
        // last padding row gets borderBottom to close before tfoot.
        // Instead: we rely on the table's outer border for top/bottom frame,
        // and give every td border on all sides but override top/bottom to "none".
        const td = (align: "left" | "center" | "right", extra?: React.CSSProperties): React.CSSProperties => ({
          padding: "14px 12px",
          textAlign: align,
          verticalAlign: "top",
          borderLeft: B,
          borderRight: B,
          borderTop: "none",
          borderBottom: "none",
          ...extra,
        });

        const padTd: React.CSSProperties = {
          height: "40px",
          borderLeft: B,
          borderRight: B,
          borderTop: "none",
          borderBottom: "none",
        };

        return (
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "11px", border: B, marginBottom: "24px" }}>
            <colgroup>
              <col style={{ width: "23%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "19%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th()}>PARTICULARS</th>
                <th style={th()}>VOLUME</th>
                <th style={th()}>UNIT COST</th>
                <th style={th()}>TOTAL</th>
                <th style={th()}>EXCHANGE RATE</th>
                <th style={th()}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {particulars.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "20px 8px", textAlign: "center", color: "#9CA3AF" }}>
                    No charges added.
                  </td>
                </tr>
              ) : (
                particulars.map((p, i) => {
                  const rowTotal = p.total ?? p.volumeQty * p.unitCost;
                  const isExRate = p.applyExchangeRate ?? (!!p.exchangeRate && p.exchangeRate > 0);
                  const exRateVal = isExRate ? (p.exchangeRate ?? data.exchangeRate ?? "") : "";
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <tr key={i}>
                      <td style={td("left")}>{letter}. {stripApostrophes(p.particulars || "")}</td>
                      <td style={td("center")}>{p.volumeQty}{volSuffix ? `x${stripApostrophes(volSuffix)}` : ""}</td>
                      <td style={td("right", { fontVariantNumeric: "tabular-nums" })}>
                        {currency} {formatAmount(p.unitCost)}{volSuffix ? `/${stripApostrophes(volSuffix)}` : ""}
                      </td>
                      <td style={td("right", { fontVariantNumeric: "tabular-nums" })}>
                        {currency} {formatAmount(rowTotal)}
                      </td>
                      <td style={td("center")}>{exRateVal ? stripApostrophes(String(exRateVal)) : ""}</td>
                      <td style={td("right", { fontVariantNumeric: "tabular-nums" })}>
                        {currency} {formatAmount(p.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
              {Array.from({ length: paddingRows }).map((_, i) => (
                <tr key={`pad-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={padTd}>&nbsp;</td>
                  ))}
                </tr>
              ))}
              {/* TOTAL row — rendered as regular tbody row, only vertical lines visible */}
              <tr>
                <td style={td("left")}>&nbsp;</td>
                <td style={td("center")}>&nbsp;</td>
                <td style={td("right")}>&nbsp;</td>
                <td style={td("right")}>&nbsp;</td>
                <td style={td("center", { fontWeight: 700, fontSize: "12px" })}>TOTAL</td>
                <td style={td("right", { fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: "12px" })}>
                  {currency} {formatAmount(data.totalAmount || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        );
      })()}

      {/* Bottom signatures — Prepared By and Approved By only */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
        <div style={{ width: "40%" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "32px" }}>PREPARED BY:</div>
          <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: "11px" }}>
            {data.preparedBy || ""}
          </div>
        </div>
        <div style={{ width: "40%" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "32px" }}>APPROVED BY:</div>
          <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: "11px" }}>
            {data.approvedBy || ""}
          </div>
        </div>
      </div>

    </div>
  );
}
