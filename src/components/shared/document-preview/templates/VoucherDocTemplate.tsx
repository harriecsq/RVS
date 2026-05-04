import { formatAmount } from "../../../../utils/formatAmount";
import type { DocumentSettings } from "../../../../types/document-settings";

interface LineItem {
  id: string;
  description: string;
  amount: number;
  currency?: string;
  category?: string;
}

interface DistributionItem {
  id: string;
  description: string;
  amount: number;
}

interface VoucherDocTemplateProps {
  data: {
    voucherNumber?: string;
    voucherDate?: string;
    payee?: string;
    currency?: string;
    blNumber?: string;
    vesselVoy?: string;
    containerNumbers?: string[];
    origin?: string;
    destination?: string;
    volume?: string;
    commodity?: string;
    consignee?: string;
    bank?: string;
    checkNo?: string;
    distributionAccount?: string;
    lineItems?: LineItem[];
    distribution?: DistributionItem[];
    totalAmount?: number;
    preparedBy?: string;
    certifiedBy?: string;
    approvedBy?: string;
    receivedBy?: string;
  };
  settings: DocumentSettings;
}

function formatDateShort(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Convert number to English words (pesos + cents). */
function numberToWords(n: number): string {
  if (!isFinite(n)) return "";
  const below20 = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const toWords = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return below20[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + below20[num % 10] : "");
    if (num < 1000) return below20[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + toWords(num % 100) : "");
    if (num < 1_000_000) return toWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + toWords(num % 1000) : "");
    if (num < 1_000_000_000) return toWords(Math.floor(num / 1_000_000)) + " Million" + (num % 1_000_000 ? " " + toWords(num % 1_000_000) : "");
    return String(num);
  };
  const whole = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - whole) * 100);
  const wholeWords = whole === 0 ? "Zero" : toWords(whole);
  const centsStr = String(cents).padStart(2, "0");
  return `${wholeWords} Pesos & ${centsStr}/100`;
}

export function VoucherDocTemplate({ data }: VoucherDocTemplateProps) {
  const B = "1px solid #000";
  const particulars = (data.lineItems || []).filter(i => i.description || i.amount);
  const distribution = (data.distribution || []).filter(i => i.description || i.amount);
  const containerStr = data.containerNumbers?.filter(Boolean).join(", ") || "";
  const currency = data.currency || "";

  const totalAmount = data.totalAmount ?? particulars.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // 10 rows standardized (including title/header row) → 9 data rows
  const STANDARD_ROWS = 9;
  const particularsPadding = Math.max(0, STANDARD_ROWS - particulars.length);
  const distributionPadding = Math.max(0, STANDARD_ROWS - distribution.length);

  const leftFields = [
    { label: "CONSIGNEE", value: data.consignee || "" },
    { label: "VESSEL/VOY", value: data.vesselVoy || "" },
    { label: "ORIGIN", value: data.origin || "" },
    { label: "BL NUMBER", value: data.blNumber || "" },
    { label: "VOLUME", value: containerStr ? `${containerStr} / ${data.volume || ""}` : (data.volume || "") },
    { label: "COMMODITY", value: data.commodity || "" },
  ];

  const formatAmt = (amt: number | undefined) =>
    amt && amt !== 0 ? formatAmount(Number(amt)) : "";

  return (
    <div style={{
      fontFamily: "'Arial', 'Helvetica', sans-serif",
      fontSize: "11px",
      color: "#000",
      lineHeight: "1",
      padding: "8px",
    }}>

      {/* Header row: PAYEE (left) + CHECK VOUCHER title + No. + Date (right) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "24px" }}>
        <div style={{ flex: "1 1 55%" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, paddingTop: "12px" }}>PAYEE</div>
            <div style={{
              position: "relative",
              flex: 1,
              minHeight: "54px",
              padding: "14px 16px 10px",
            }}>
              {/* bracket corners */}
              <span style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: B, borderLeft: B }} />
              <span style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: B, borderRight: B }} />
              <span style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: B, borderLeft: B }} />
              <span style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: B, borderRight: B }} />
              <div style={{ fontSize: "12px", fontWeight: 500 }}>{data.payee || ""}</div>
            </div>
          </div>
        </div>
        <div style={{ flex: "0 0 35%", textAlign: "left" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.02em", textAlign: "right" }}>
            CHECK VOUCHER
          </div>
          <div style={{ marginTop: "10px", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "12px" }}>No.</span>
            <span style={{ flex: 1, borderBottom: B, paddingBottom: "1px", fontSize: "12px" }}>{data.voucherNumber || ""}</span>
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "12px" }}>Date</span>
            <span style={{ flex: 1, borderBottom: B, paddingBottom: "1px", fontSize: "12px" }}>{formatDateShort(data.voucherDate || "")}</span>
          </div>
        </div>
      </div>

      {/* Particulars table — PARTICULARS (booking fields + right-aligned line item labels) | AMOUNT */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B, marginBottom: "12px", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "82%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ borderBottom: B, borderRight: B, padding: "4px 8px", textAlign: "center", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", lineHeight: "1.2" }}>
              PARTICULARS
            </th>
            <th style={{ borderBottom: B, padding: "4px 8px", textAlign: "center", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", lineHeight: "1.2" }}>
              AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ borderRight: B, padding: "22px 12px 6px", verticalAlign: "top" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                {/* Booking fields (left side of PARTICULARS column) */}
                <table style={{ borderCollapse: "collapse", fontSize: "11px", flex: "0 0 auto" }}>
                  <tbody>
                    {leftFields.map(({ label, value }) => (
                      <tr key={label}>
                        <td style={{ padding: "0 12px 0 0", verticalAlign: "top", whiteSpace: "nowrap", fontWeight: 600, lineHeight: "1.6" }}>
                          {label}:
                        </td>
                        <td style={{ padding: "0", verticalAlign: "top", lineHeight: "1.6", whiteSpace: "nowrap" }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Line item labels (left-aligned in their own column zone) */}
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", paddingRight: "24px", fontSize: "11px" }}>
                  <div style={{ textAlign: "left" }}>
                    {particulars.map((item, i) => (
                      <div key={item.id || i} style={{ fontWeight: 600, textTransform: "uppercase", lineHeight: "1.6", whiteSpace: "nowrap" }}>
                        {item.description}
                      </div>
                    ))}
                    {Array.from({ length: particularsPadding }).map((_, i) => (
                      <div key={`pp-${i}`} style={{ lineHeight: "1.6" }}>&nbsp;</div>
                    ))}
                  </div>
                </div>
              </div>
            </td>
            <td style={{ padding: "22px 10px 6px", verticalAlign: "top", textAlign: "right", fontSize: "11px" }}>
              {particulars.map((item, i) => (
                <div key={item.id || i} style={{ fontVariantNumeric: "tabular-nums", lineHeight: "1.6" }}>
                  {formatAmt(item.amount)}
                </div>
              ))}
              {Array.from({ length: particularsPadding }).map((_, i) => (
                <div key={`ap-${i}`} style={{ lineHeight: "1.6" }}>&nbsp;</div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Distribution of Account label */}
      <div style={{ marginBottom: "4px", fontSize: "11px", fontWeight: 600, lineHeight: "1.4" }}>
        Distribution of Account:{data.distributionAccount ? ` ${data.distributionAccount}` : ""}
      </div>

      {/* Two-column row: Account Title/Debit/Credit + PESOS/Bank/Signatures */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        {/* Left: Account Title / Debit / Credit table — 10 rows total (title + 9 data) */}
        <div style={{ flex: "1 1 55%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: B, fontSize: "11px", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "64%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ border: B, padding: "2px 8px", textAlign: "center", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", lineHeight: "1.3" }}>
                  ACCOUNT TITLE
                </th>
                <th style={{ border: B, padding: "2px 8px", textAlign: "center", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", lineHeight: "1.3" }}>
                  DEBIT
                </th>
                <th style={{ border: B, padding: "2px 8px", textAlign: "center", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", lineHeight: "1.3" }}>
                  CREDIT
                </th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((d, i) => (
                <tr key={d.id || i}>
                  <td style={{ border: B, padding: "1px 8px", height: "16px", textTransform: "uppercase", lineHeight: "1.3" }}>
                    {d.description}
                  </td>
                  <td style={{ border: B, padding: "1px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums", lineHeight: "1.3" }}>
                    {formatAmt(d.amount)}
                  </td>
                  <td style={{ border: B, padding: "1px 8px", lineHeight: "1.3" }}>&nbsp;</td>
                </tr>
              ))}
              {Array.from({ length: distributionPadding }).map((_, i) => (
                <tr key={`dp-${i}`}>
                  <td style={{ border: B, padding: "1px 8px", height: "16px", lineHeight: "1.3" }}>&nbsp;</td>
                  <td style={{ border: B, padding: "1px 8px", lineHeight: "1.3" }}>&nbsp;</td>
                  <td style={{ border: B, padding: "1px 8px", lineHeight: "1.3" }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: PESOS + Bank/Check No + Received Payment By */}
        <div style={{ flex: "1 1 45%", fontSize: "11px", lineHeight: "1.3" }}>
          {/* PESOS amount-in-words lines (kept blank) */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
            <span style={{ fontWeight: 700 }}>PESOS</span>
            <span style={{ flex: 1, borderBottom: B, paddingBottom: "2px" }}>&nbsp;</span>
          </div>
          <div style={{ borderBottom: B, height: "18px", marginBottom: "10px" }}>&nbsp;</div>
          <div style={{ borderBottom: B, height: "18px", marginBottom: "10px" }}>&nbsp;</div>
          <div style={{ borderBottom: B, height: "18px", marginBottom: "12px" }}>&nbsp;</div>

          {/* Bank + Check No */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
            <div style={{ flex: "1 1 50%", display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontWeight: 600 }}>Bank</span>
              <span style={{ flex: 1, borderBottom: B, paddingBottom: "1px" }}>{data.bank || ""}</span>
            </div>
            <div style={{ flex: "1 1 50%", display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontWeight: 600 }}>Check No.</span>
              <span style={{ flex: 1, borderBottom: B, paddingBottom: "1px" }}>{data.checkNo || ""}</span>
            </div>
          </div>

          {/* Received Payment By */}
          <div>
            <div style={{ marginBottom: "16px", fontWeight: 600, lineHeight: "1.3" }}>Received Payment By:</div>
            <div style={{ borderBottom: B, marginBottom: "2px" }}>&nbsp;</div>
            <div style={{ fontSize: "10px", color: "#000", lineHeight: "1.3" }}>{data.receivedBy || ""}</div>
          </div>
        </div>
      </div>

      {/* Bottom signature row: Prepared By / Certified Correct By / Approved By */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", marginTop: "20px", fontSize: "11px" }}>
        <div style={{ width: "32%" }}>
          <div style={{ fontWeight: 600, lineHeight: "1.3" }}>Prepared By:</div>
          <div style={{ height: "18px" }}>&nbsp;</div>
          <div style={{ fontSize: "10px", lineHeight: "1.3", textAlign: "center" }}>{data.preparedBy || ""}</div>
          <div style={{ borderBottom: B, marginTop: "2px" }}>&nbsp;</div>
        </div>
        <div style={{ width: "32%" }}>
          <div style={{ fontWeight: 600, lineHeight: "1.3" }}>Certified Correct By:</div>
          <div style={{ height: "18px" }}>&nbsp;</div>
          <div style={{ fontSize: "10px", lineHeight: "1.3", textAlign: "center" }}>{data.certifiedBy || ""}</div>
          <div style={{ borderBottom: B, marginTop: "2px" }}>&nbsp;</div>
        </div>
        <div style={{ width: "32%" }}>
          <div style={{ fontWeight: 600, lineHeight: "1.3" }}>Approved By:</div>
          <div style={{ height: "18px" }}>&nbsp;</div>
          <div style={{ fontSize: "10px", lineHeight: "1.3", textAlign: "center" }}>{data.approvedBy || ""}</div>
          <div style={{ borderBottom: B, marginTop: "2px" }}>&nbsp;</div>
        </div>
      </div>

    </div>
  );
}
