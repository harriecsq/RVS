import type { DocumentSettings } from "../../../../types/document-settings";

interface ProcessingFeeDocTemplateProps {
  data: Record<string, any>;
  settings: DocumentSettings;
}

function formatDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function fmtPrice(raw: string | number): string {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  if (isNaN(n)) return String(raw);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function amountInWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function below1000(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below1000(n % 100) : "");
  }

  const rounded = Math.round(amount * 100) / 100;
  const integer = Math.floor(rounded);
  const cents = Math.round((rounded - integer) * 100);
  if (integer === 0 && cents === 0) return "Zero";

  let result = "";
  if (integer >= 1_000_000) result += below1000(Math.floor(integer / 1_000_000)) + " Million ";
  if (integer >= 1_000) result += below1000(Math.floor((integer % 1_000_000) / 1_000)) + " Thousand ";
  result += below1000(integer % 1_000);
  if (cents > 0) result += " and " + below1000(cents) + "/100";
  return result.trim();
}

const B = "1px solid #000";

export function ProcessingFeeDocTemplate({ data, settings }: ProcessingFeeDocTemplateProps) {
  const billingStatementNo = data.billingStatementNo || "";
  const date = formatDate(data.date || "");
  const address = data.address || "";
  const tinNo = data.tinNo || "";
  const vesselVoy = data.vesselVoy || "";
  const loadedAt = data.loadedAt || "";
  const volume = data.volume || "";
  const containerSize = data.containerSize || "";
  const containerNo = data.containerNo || "";
  const commodity = data.commodity || "";
  const blNumber = data.blNumber || "";
  const destination = data.destination || "";
  const priceRaw = data.price || "0";
  const price = parseFloat(String(priceRaw).replace(/,/g, "")) || 0;
  const vat = Math.round(price * 0.12 * 100) / 100;
  const total = price + vat;

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "9px", color: "#000", lineHeight: 1.4 }}>
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>
        {/* ── OUTER BOX ── */}
        <div style={{ border: "2px solid #000" }}>
        {/* ── HEADER: left block (letterhead + address) + billing statement box right ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0px", padding: "8px 8px 0px 8px" }}>
          {/* Left block constrained to 55% to match shipment table width */}
          <div style={{ width: "55%", textAlign: "center" }}>
            {settings.logoPng ? (
              <img src={settings.logoPng} alt="Company Letterhead" style={{ width: "100%", objectFit: "contain", display: "block", marginBottom: "2px" }} />
            ) : (
              <div style={{ border: "1.5px dashed #CBD5E1", borderRadius: "4px", padding: "12px", textAlign: "center", color: "#9CA3AF", fontSize: "8px", marginBottom: "2px" }}>
                Upload letterhead PNG via Document Settings
              </div>
            )}
            {address && (
              <div style={{ fontSize: "7px", color: "#333" }}>{address}</div>
            )}
            {tinNo && (
              <div style={{ fontSize: "7px", color: "#333" }}>{tinNo}</div>
            )}
          </div>

          {/* BILLING STATEMENT box top-right, bordered */}
          <div style={{ border: B, minWidth: "200px", textAlign: "center" }}>
            <div style={{
              padding: "0px", fontWeight: 400, fontSize: "9px",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              BILLING STATEMENT
            </div>
            <div style={{ padding: "2px 0px", fontWeight: 700, fontSize: "8px", minHeight: "14px" }}>
              {billingStatementNo || " "}
            </div>
          </div>
        </div>

        {/* ── SHIPMENT INFO TABLE — explicit cell borders, no outer table border ── */}
        <table style={{
          width: "55%", borderCollapse: "collapse", fontSize: "9px", marginBottom: "1em",
        }}>
          <tbody>
            {/* Row 0: empty left | DATE: | date value */}
            <tr>
              <td style={{ padding: "0px", width: "15%", borderTop: B, borderLeft: B, borderBottom: B, verticalAlign: "middle" }}>&nbsp;</td>
              <td style={{ padding: "0px", width: "40%", borderTop: B, borderRight: B, borderBottom: B, verticalAlign: "middle" }}>&nbsp;</td>
              <td style={{ padding: "0px", fontWeight: 400, width: "15%", borderTop: B, borderBottom: B, verticalAlign: "top" }}>DATE:</td>
              <td style={{ padding: "0px", width: "30%", borderTop: B, borderRight: B, borderBottom: B, verticalAlign: "top", textAlign: "right" }}>
                <div>{date}</div>
                <div>&nbsp;</div>
              </td>
            </tr>
            {/* Row 1: Vessel/Voy No | BL No */}
            <tr>
              <td style={{ padding: "0px", fontWeight: 400, borderLeft: B, borderRight: B, borderBottom: B, verticalAlign: "middle" }}>Vessel/Voy No</td>
              <td style={{ padding: "0px", borderRight: B, borderBottom: B, verticalAlign: "middle" }}>{vesselVoy}</td>
              <td style={{ padding: "0px", fontWeight: 400, borderRight: B, borderBottom: B, verticalAlign: "middle" }}>Bill of Lading No.</td>
              <td style={{ padding: "0px", borderRight: B, borderBottom: B, verticalAlign: "middle" }}>{blNumber}</td>
            </tr>
            {/* Row 2: Loaded at | Destination */}
            <tr>
              <td style={{ padding: "0px", fontWeight: 400, borderLeft: B, borderRight: B, borderBottom: B, verticalAlign: "middle" }}>Loaded at</td>
              <td style={{ padding: "0px", borderRight: B, borderBottom: B, verticalAlign: "middle" }}>{loadedAt}</td>
              <td style={{ padding: "0px", fontWeight: 400, borderRight: B, borderBottom: B, verticalAlign: "middle" }}>Destination</td>
              <td style={{ padding: "0px", borderRight: B, borderBottom: B, verticalAlign: "middle" }}>{destination}</td>
            </tr>
            {/* Row 3: Job Description — bordered only through col 2 */}
            <tr>
              <td style={{ padding: "0px", fontWeight: 400, borderLeft: B, borderRight: B, borderBottom: B, verticalAlign: "middle" }}>Job Description</td>
              <td style={{ padding: "0px", borderRight: B, borderBottom: B, verticalAlign: "middle" }}>
                {[volume && containerSize ? `${volume}x${containerSize}` : volume || containerSize, containerNo].filter(Boolean).join(" ")}
              </td>
              <td colSpan={2}>&nbsp;</td>
            </tr>
            {/* Row 4: Commodity — bordered only through col 2 */}
            <tr>
              <td colSpan={2} style={{ padding: "0px", verticalAlign: "middle", textAlign: "center", borderLeft: B, borderRight: B, borderBottom: B }}>
                {commodity ? commodity.toUpperCase() : ""}
              </td>
              <td colSpan={2}>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* ── PARTICULARS TABLE ── */}
        {(() => {
          const colStyle = (w: string): React.CSSProperties => ({ width: w });
          const TH = (): React.CSSProperties => ({
            padding: "0px", border: B, textAlign: "center", verticalAlign: "middle",
            fontSize: "8px", fontWeight: 700, textTransform: "uppercase",
          });
          const TD = (align: "left" | "center" | "right", extra?: React.CSSProperties): React.CSSProperties => ({
            padding: "0px", textAlign: align, verticalAlign: "middle",
            border: "none",
            ...extra,
          });
          const PAD: React.CSSProperties = {
            height: "0px", verticalAlign: "middle", border: "none",
          };

          return (
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "9px", border: B, marginBottom: "0px" }}>
              <colgroup>
                <col style={colStyle("20%")} />
                <col style={colStyle("10%")} />
                <col style={colStyle("7%")} />
                <col style={colStyle("13%")} />
                <col style={colStyle("6%")} />
                <col style={colStyle("14%")} />
                <col style={colStyle("15%")} />
                <col style={colStyle("15%")} />
              </colgroup>
              <thead>
                <tr>
                  <th style={TH()}>PARTICULARS</th>
                  <th style={TH()}></th>
                  <th style={TH()}></th>
                  <th style={TH()}></th>
                  <th style={TH()}></th>
                  <th style={TH()}>EXCHANGE RATE</th>
                  <th style={TH()}>VAT</th>
                  <th style={TH()}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {/* Empty row before first item */}
                <tr>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={PAD}>&nbsp;</td>
                  ))}
                </tr>
                {/* Data row 1 — price line */}
                <tr>
                  <td style={{ ...TD("left"), verticalAlign: "top" }} rowSpan={2}>a. Processing</td>
                  <td style={{ ...TD("center"), verticalAlign: "top" }} rowSpan={2}>vatable</td>
                  <td style={{ ...TD("center"), verticalAlign: "top" }} rowSpan={2}>PHP</td>
                  <td style={{ ...TD("center"), verticalAlign: "top" }} rowSpan={2}>{fmtPrice(priceRaw)}/BL</td>
                  <td style={{ ...TD("center"), verticalAlign: "top" }} rowSpan={2}>1</td>
                  <td style={{ ...TD("center"), fontVariantNumeric: "tabular-nums" }}>{fmtPrice(priceRaw)}</td>
                  <td style={TD("center")}>&nbsp;</td>
                  <td style={{ ...TD("center"), fontVariantNumeric: "tabular-nums" }}>{fmtPrice(priceRaw)}</td>
                </tr>
                {/* Data row 2 — 12% VAT line */}
                <tr>
                  <td style={{ ...TD("center"), fontSize: "8px" }}>12% VAT</td>
                  <td style={{ ...TD("center"), fontVariantNumeric: "tabular-nums" }}>{fmtPrice(vat)}</td>
                  <td style={TD("center")}>&nbsp;</td>
                </tr>
                {/* Empty padding rows */}
                {Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} style={{ height: "10px" }}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} style={{ ...PAD, height: "10px" }}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* SUB TOTAL row — label under EXCHANGE RATE column */}
                <tr>
                  <td colSpan={5} style={{ padding: "0px", verticalAlign: "middle", lineHeight: 1 }}>&nbsp;</td>
                  <td style={{ padding: "0px", textAlign: "center", fontWeight: 400, verticalAlign: "middle", lineHeight: 1 }}>
                    SUB TOTAL:
                  </td>
                  <td style={{ padding: "0px", verticalAlign: "middle", lineHeight: 1 }}>&nbsp;</td>
                  <td style={{ padding: "0px", textAlign: "center", fontVariantNumeric: "tabular-nums", verticalAlign: "middle", lineHeight: 1 }}>
                    {fmtPrice(priceRaw)}
                  </td>
                </tr>
                {/* VAT row — label under EXCHANGE RATE column */}
                <tr>
                  <td colSpan={5} style={{ padding: "0px", verticalAlign: "middle", lineHeight: 1 }}>&nbsp;</td>
                  <td style={{ padding: "0px", textAlign: "center", fontWeight: 400, verticalAlign: "middle", lineHeight: 1 }}>
                    VAT
                  </td>
                  <td style={{ padding: "0px", verticalAlign: "middle", lineHeight: 1 }}>&nbsp;</td>
                  <td style={{ padding: "0px", textAlign: "center", fontVariantNumeric: "tabular-nums", verticalAlign: "middle", lineHeight: 1 }}>
                    {fmtPrice(vat)}
                  </td>
                </tr>
                {/* TOTAL - PHILIPPINE PESO label row */}
                <tr>
                  <td colSpan={8} style={{ padding: "0px", textAlign: "center", fontWeight: 400, fontSize: "9px", textTransform: "uppercase", verticalAlign: "middle", lineHeight: 1 }}>
                    TOTAL - PHILIPPINE PESO
                  </td>
                </tr>
                {/* Amount in words row */}
                <tr>
                  <td colSpan={8} style={{ padding: "0px", textAlign: "center", fontSize: "8px", verticalAlign: "middle", lineHeight: 1 }}>
                    {amountInWords(total)} Only
                  </td>
                </tr>
                {/* PHP + total amount row */}
                <tr>
                  <td colSpan={6} style={{ padding: "0px" }}>&nbsp;</td>
                  <td style={{ padding: "0px", textAlign: "right", fontWeight: 700, verticalAlign: "middle", lineHeight: 1 }}>
                    PHP
                  </td>
                  <td style={{ padding: "0px", textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums", verticalAlign: "middle", lineHeight: 1 }}>
                    {fmtPrice(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          );
        })()}
        </div>{/* end outer box */}
    </div>
  );
}
