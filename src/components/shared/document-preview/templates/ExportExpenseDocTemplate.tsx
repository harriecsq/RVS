import React from "react";
import { formatAmount } from "../../../../utils/formatAmount";
import type { DocumentSettings } from "../../../../types/document-settings";

interface LineItem {
  category: string;
  description: string;
  amount: number | string;
  unitPrice?: number | string;
  per?: string;
  currency?: string;
  voucherNo?: string;
  linkedVoucherAmount?: number;
  isDomestic?: boolean;
  segContainerCount?: number;
  segmentContainers?: string[];
  segmentLabel?: string;
}

interface ExportExpenseDocTemplateProps {
  data: {
    expenseNumber?: string;
    expenseDate?: string;
    clientShipper?: string;
    vesselVoyage?: string;
    destination?: string;
    commodity?: string;
    blNumber?: string;
    containerNo?: string;
    loadingAddress?: string;
    exchangeRate?: string;
    volume?: string;
    charges?: LineItem[];
    totalAmount?: number;
    billingAmount?: number;
  };
  settings: DocumentSettings;
}

function formatDateLetters(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

// Preserve insertion order of categories exactly as stored on the expense
function groupChargesPreserveOrder(charges: LineItem[]): Array<{ category: string; items: LineItem[] }> {
  const order: string[] = [];
  const map = new Map<string, LineItem[]>();
  charges.forEach((c) => {
    const cat = (c.category || "UNCATEGORIZED").toUpperCase();
    if (!map.has(cat)) {
      order.push(cat);
      map.set(cat, []);
    }
    map.get(cat)!.push(c);
  });
  return order.map((cat) => ({ category: cat, items: map.get(cat)! }));
}

// "3x40'HC" -> { count: 3, type: "40'HC" }; "40'HC" -> { count: 1, type: "40'HC" }
function parseVolume(raw: string | undefined): { count: number; type: string } {
  const v = (raw || "").trim();
  if (!v) return { count: 0, type: "" };
  const m = v.match(/^(\d+)\s*x\s*(.+)$/i);
  if (m) return { count: parseInt(m[1], 10), type: m[2].trim() };
  return { count: 1, type: v };
}

// Column header for the quantity column, e.g. "3X40'HC"
// Container count is derived from the container number list (overrides count in volume)
function volumeHeader(volumeRaw: string | undefined, containerNoRaw: string | undefined): string {
  const { type } = parseVolume(volumeRaw);
  const containerCount = (containerNoRaw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
  if (!type) return "";
  if (containerCount <= 1) return type;
  return `${containerCount}X${type}`;
}

export function ExportExpenseDocTemplate({ data, settings }: ExportExpenseDocTemplateProps) {
  const charges = data.charges || [];
  const allGroups = groupChargesPreserveOrder(charges);
  const isDomesticGroup = (g: { category: string; items: LineItem[] }) =>
    g.items[0]?.isDomestic === true || /^DOMESTIC - /.test(g.category);
  const domesticGroups = allGroups.filter(isDomesticGroup);
  const mainGroups = allGroups.filter((g) => !isDomesticGroup(g));
  const B = "1px solid #000";
  const totalAmount =
    data.totalAmount ?? charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const mainQtyHeader = volumeHeader(data.volume, data.containerNo);

  // Volume header for a domestic group derived from its own segment containers
  const domesticQtyHeader = (items: LineItem[]): string => {
    const first = items[0];
    const count = first?.segContainerCount ?? first?.segmentContainers?.length ?? 1;
    const { type } = parseVolume(data.volume);
    const t = type || "40'HC";
    return `${Math.max(count, 1)}X${t}`;
  };

  const domesticLabel = (group: { category: string; items: LineItem[] }): string => {
    const first = group.items[0];
    const containersLabel =
      first?.segmentContainers?.join(", ") ||
      first?.segmentLabel ||
      group.category.replace(/^DOMESTIC - /i, "");
    return containersLabel ? `DOMESTIC - ${containersLabel.toUpperCase()}` : "DOMESTIC";
  };

  const headerFields: Array<{ en: string; zh: string; value: string }> = [
    { en: "DATE", zh: "日期", value: formatDateLetters(data.expenseDate || "") },
    { en: "REFERENCE NUMBER", zh: "参考编码", value: data.expenseNumber || "" },
    { en: "CLIENT / SHIPPER", zh: "顾客", value: data.clientShipper || "" },
    { en: "VESSEL/VOYAGE", zh: "船", value: data.vesselVoyage || "" },
    { en: "DESTINATION", zh: "目的地", value: data.destination || "" },
    { en: "COMMODITY", zh: "商品", value: data.commodity || "" },
    { en: "BL NUMBER", zh: "提单号/订舱号", value: data.blNumber || "" },
    { en: "CONTAINER NUMBER", zh: "柜号", value: data.containerNo || "" },
    { en: "LOADING ADDRESS", zh: "装柜地址", value: (data.loadingAddress || "").toUpperCase() },
    { en: "EXCHANGE RATE", zh: "兑换率", value: data.exchangeRate || "" },
  ];

  const cellPad = "1px 6px";
  const rowHeight = "auto";

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1.1" }}>
      {/* Bilingual header block */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "11px", lineHeight: "1.1" }}>
        <tbody>
          {headerFields.map((f) => (
            <tr key={f.en}>
              <td style={{ padding: "1px 12px 1px 0", whiteSpace: "nowrap", verticalAlign: "top", width: "40%" }}>
                {f.en}
                <span style={{ fontFamily: "'SimSun', 'Arial', sans-serif" }}>{f.zh}</span>
                :
              </td>
              <td style={{ padding: "1px 0", verticalAlign: "top" }}>{f.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Charges table */}
      {(() => {
        const colHeader = (qtyHeader: string) => (
          <tr>
            {[
              { en: "PARTICULARS", zh: "描述" },
              { en: "UNIT PRICE", zh: "单价" },
              { en: qtyHeader || "QTY", zh: "" },
              { en: "VOUCHER NO", zh: "账本号" },
              { en: "VOUCHER AMOUNT", zh: "账额" },
            ].map((h, i) => (
              <td key={i} style={{
                padding: cellPad, borderBottom: B, borderTop: B, borderRight: i < 4 ? B : "none",
                textAlign: "center", fontWeight: 700, fontSize: "10.5px", verticalAlign: "middle",
                lineHeight: "1.1",
              }}>
                <div style={{ lineHeight: "1.1" }}>{h.en}</div>
                {h.zh && <div style={{ fontFamily: "'SimSun', 'Arial', sans-serif", fontWeight: 400, lineHeight: "1.1" }}>{h.zh}</div>}
              </td>
            ))}
          </tr>
        );

        const renderGroup = (group: { category: string; items: LineItem[] }, labelOverride?: string) => (
          <React.Fragment key={`grp-${group.category}`}>
            <tr>
              <td style={{ padding: cellPad, borderBottom: B, borderRight: B, fontWeight: 700, fontSize: "11px" }}>
                {labelOverride ?? group.category}
              </td>
              <td style={{ padding: cellPad, borderBottom: B, borderRight: B }}>&nbsp;</td>
              <td style={{ padding: cellPad, borderBottom: B, borderRight: B }}>&nbsp;</td>
              <td style={{ padding: cellPad, borderBottom: B, borderRight: B }}>&nbsp;</td>
              <td style={{ padding: cellPad, borderBottom: B }}>&nbsp;</td>
            </tr>
            {group.items.map((item, idx) => {
              const unit = item.unitPrice !== undefined && item.unitPrice !== "" ? item.unitPrice : "";
              const per = item.per || "";
              const unitText = unit !== "" ? (per ? `${unit} PER ${per}` : String(unit)) : "";
              const qtyAmount = Number(item.amount) || 0;
              const voucherAmt = item.voucherNo
                ? (item.linkedVoucherAmount ?? (Number(item.amount) || 0))
                : Number(item.amount) || 0;
              return (
                <tr key={`${group.category}-${idx}`}>
                  <td style={{ padding: cellPad, borderBottom: B, borderRight: B, height: rowHeight }}>
                    {idx + 1}. {item.description}
                  </td>
                  <td style={{ padding: cellPad, borderBottom: B, borderRight: B, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                    {unitText}
                  </td>
                  <td style={{ padding: cellPad, borderBottom: B, borderRight: B, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {qtyAmount ? formatAmount(qtyAmount) : ""}
                  </td>
                  <td style={{ padding: cellPad, borderBottom: B, borderRight: B, textAlign: "center" }}>
                    {item.voucherNo || ""}
                  </td>
                  <td style={{ padding: cellPad, borderBottom: B, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {voucherAmt ? formatAmount(voucherAmt) : ""}
                  </td>
                </tr>
              );
            })}
          </React.Fragment>
        );

        return (
          <table style={{ width: "100%", borderCollapse: "collapse", border: B, tableLayout: "fixed", fontSize: "11px" }}>
            <colgroup>
              <col style={{ width: "38%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <tbody>
              {allGroups.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "20px 8px", textAlign: "center", color: "#9CA3AF" }}>
                    No charges added.
                  </td>
                </tr>
              )}

              {/* Domestic blocks — each with its own column header (own volume) */}
              {domesticGroups.map((group) => (
                <React.Fragment key={`dom-${group.category}`}>
                  {colHeader(domesticQtyHeader(group.items))}
                  {renderGroup(group, domesticLabel(group))}
                </React.Fragment>
              ))}

              {/* Main block — single column header for all non-domestic groups */}
              {mainGroups.length > 0 && (
                <>
                  {colHeader(mainQtyHeader)}
                  {mainGroups.map((group) => renderGroup(group))}
                </>
              )}

              {/* TOTAL row */}
              <tr>
                <td style={{ padding: cellPad, borderRight: B }}>&nbsp;</td>
                <td style={{ padding: cellPad, borderRight: B }}>&nbsp;</td>
                <td style={{ padding: cellPad, borderRight: B }}>&nbsp;</td>
                <td style={{ padding: cellPad, borderRight: B, textAlign: "right", fontWeight: 700 }}>
                  TOTAL
                </td>
                <td style={{ padding: cellPad, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatAmount(totalAmount)}
                </td>
              </tr>
              {/* AMOUNT FOR BILLING row */}
              <tr>
                <td colSpan={4} style={{ padding: cellPad, borderTop: B, borderRight: B, textAlign: "right", fontWeight: 700 }}>
                  AMOUNT FOR BILLING <span style={{ fontFamily: "'SimSun', 'Arial', sans-serif", fontWeight: 400 }}>账单金额</span>
                </td>
                <td style={{ padding: cellPad, borderTop: B, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {data.billingAmount !== undefined && data.billingAmount !== null ? formatAmount(data.billingAmount) : ""}
                </td>
              </tr>
            </tbody>
          </table>
        );
      })()}

      {/* Three signature blocks */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", gap: "16px" }}>
        {["PREPARED BY:", "CHECKED BY:", "APPROVED BY:"].map((label) => (
          <div key={label} style={{ width: "30%" }}>
            <div style={{ fontSize: "11px", marginBottom: "32px" }}>{label}</div>
            <div style={{ borderTop: "1px solid #000", paddingTop: "1px", fontSize: "11px", minHeight: "14px" }}>&nbsp;</div>
          </div>
        ))}
      </div>
    </div>
  );
}
