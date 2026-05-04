import { formatAmount } from "../../../../utils/formatAmount";
import type { DocumentSettings } from "../../../../types/document-settings";

interface LineItem {
  category: string;
  description: string;
  amount: number | string;
  currency?: string;
  voucherNo?: string;
}

interface ExpenseDocTemplateProps {
  data: {
    expenseNumber?: string;
    expenseDate?: string;
    documentTemplate?: "IMPORT" | "EXPORT" | "";
    vendor?: string;
    clientName?: string;
    blNumber?: string;
    containerNo?: string;
    vesselVoyage?: string;
    origin?: string;
    destination?: string;
    pod?: string;
    weight?: string;
    releasingDate?: string;
    commodity?: string;
    exchangeRate?: string;
    charges?: LineItem[];
    totalAmount?: number;
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
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

function Signatures({ preparedBy, checkedBy, approvedBy }: { preparedBy?: string; checkedBy?: string; approvedBy?: string }) {
  const block = (label: string, name?: string) => (
    <div style={{ width: "30%" }}>
      <div style={{ fontSize: "11px", marginBottom: "32px" }}>{label}</div>
      <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: "11px", minHeight: "14px" }}>
        {name || ""}
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
      {block("PREPARED BY:", preparedBy)}
      {block("CHECKED BY:", checkedBy)}
      {block("APPROVED BY:", approvedBy)}
    </div>
  );
}

function ImportSOATemplate({ data, settings: _settings }: ExpenseDocTemplateProps) {
  const charges = data.charges || [];
  const mainItems = charges.filter(c => (c.category || "").toUpperCase() === "PARTICULARS");
  const additionalItems = charges.filter(c => (c.category || "").toUpperCase() === "ADDITIONAL CHARGES");
  const depositItems = charges.filter(c => (c.category || "").toUpperCase() === "REFUNDABLE DEPOSITS");

  const sumAmount = (items: LineItem[]) => items.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const mainTotal = sumAmount(mainItems);
  const additionalTotal = sumAmount(additionalItems);
  const grandTotal = data.totalAmount ?? (mainTotal + additionalTotal);

  const B = "1px solid #000";

  const headerRows: Array<[string, string, string]> = [
    ["DATE", "日期", formatDateLetters(data.expenseDate || "")],
    ["POD", "起运港", data.pod || ""],
    ["COMMODITY", "商品", data.commodity || ""],
    ["BL NUMBER", "提单号", data.blNumber || ""],
    ["CONTAINER NO", "集装箱号", data.containerNo || ""],
    ["WEIGHT", "称重", data.weight || ""],
    ["VESSEL/VOYAGE", "船舶/航次", data.vesselVoyage || ""],
    ["ORIGIN", "发货地", data.origin || ""],
    ["RELEASING DATE", "放行日期", formatDateLetters(data.releasingDate || "")],
  ];

  const renderRow = (item: LineItem, i: number) => (
    <tr key={i}>
      <td style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", verticalAlign: "middle", borderRight: B }}>{(item.description || "").toUpperCase()}</td>
      <td style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", verticalAlign: "middle", fontVariantNumeric: "tabular-nums", borderTop: B, borderRight: B }}>
        {formatAmount(Number(item.amount) || 0)}
      </td>
      <td style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", verticalAlign: "middle", borderTop: B }}>{(item.voucherNo || "").toUpperCase()}</td>
    </tr>
  );

  const emptyRow = (key: string) => (
    <tr key={key}>
      <td style={{ padding: "0", height: "28px", borderRight: B }}>&nbsp;</td>
      <td style={{ padding: "0", borderTop: B, borderRight: B }}>&nbsp;</td>
      <td style={{ padding: "0", borderTop: B }}>&nbsp;</td>
    </tr>
  );

  const colWidths = [58, 22, 20];

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1" }}>
      {/* Bilingual header block */}
      <table style={{ marginBottom: "0", borderCollapse: "collapse", fontSize: "11px" }}>
        <tbody>
          {headerRows.map(([en, cn, value]) => (
            <tr key={en}>
              <td style={{ padding: "0 12px 0 0", lineHeight: "1", verticalAlign: "top", whiteSpace: "nowrap", fontWeight: 600 }}>
                {en}<span style={{ fontWeight: 400 }}>{cn}</span>:
              </td>
              <td style={{ padding: "0", lineHeight: "1", verticalAlign: "top" }}>{value.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Main filing expenses table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B, tableLayout: "fixed", fontSize: "11px", marginBottom: "12px" }}>
        <colgroup>
          {colWidths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", fontWeight: 700, fontSize: "11px", borderBottom: B, borderRight: B }}>
              PARTICULARS <span style={{ fontWeight: 400 }}>描述</span>
            </th>
            <th style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", fontWeight: 700, fontSize: "11px", borderBottom: B, borderRight: B }}>
              AMOUNT <span style={{ fontWeight: 400 }}>金额</span>
            </th>
            <th style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", fontWeight: 700, fontSize: "11px", borderBottom: B }}>
              VOUCHER NUMBER
            </th>
          </tr>
        </thead>
        <tbody>
          {mainItems.length === 0
            ? Array.from({ length: 4 }).map((_, i) => emptyRow(`m-pad-${i}`))
            : mainItems.map(renderRow)}
          <tr>
            <td style={{ padding: "6px 8px 0", lineHeight: "1", textAlign: "center", fontWeight: 700, borderRight: B }}>
              TOTAL FILING EXPENSES <span style={{ fontWeight: 400 }}>总申请费用</span>
            </td>
            <td style={{ padding: "6px 8px 0", lineHeight: "1", textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums", borderTop: B, borderRight: B }}>
              {formatAmount(mainTotal)}
            </td>
            <td style={{ padding: "6px 8px 0", lineHeight: "1", borderTop: B }}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* Additional charges / miscellaneous */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "none", borderLeft: B, borderRight: B, borderBottom: B, tableLayout: "fixed", fontSize: "11px", marginBottom: "12px" }}>
        <colgroup>
          {colWidths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", fontWeight: 700, fontSize: "11px", borderBottom: B, borderRight: "none", borderTop: "none", borderLeft: "1px solid transparent" }}>
              ADDITIONAL CHARGES/MISCELLANEOUS <span style={{ fontWeight: 400 }}>额外</span>
            </th>
            <th style={{ borderBottom: B, borderTop: "none", borderRight: "none" }} />
            <th style={{ borderBottom: B, borderTop: "none", borderRight: "none" }} />
          </tr>
        </thead>
        <tbody>
          {additionalItems.length === 0
            ? Array.from({ length: 3 }).map((_, i) => emptyRow(`a-pad-${i}`))
            : additionalItems.map(renderRow)}
          <tr>
            <td style={{ padding: "6px 8px 0", lineHeight: "1", textAlign: "center", fontWeight: 700, borderRight: B }}>
              TOTAL <span style={{ fontWeight: 400 }}>总金额</span>
            </td>
            <td style={{ padding: "6px 8px 0", lineHeight: "1", textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums", borderTop: B, borderRight: B }}>
              {formatAmount(additionalTotal)}
            </td>
            <td style={{ padding: "6px 8px 0", lineHeight: "1", borderTop: B }}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* Grand total */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B, tableLayout: "fixed", fontSize: "11px", marginBottom: "24px" }}>
        <colgroup>
          {colWidths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
        </colgroup>
        <tbody>
          <tr>
            <td style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", fontWeight: 700, fontSize: "12px", borderRight: B }}>
              GRAND TOTAL <span style={{ fontWeight: 400 }}>累计总金额</span>
            </td>
            <td style={{ padding: "0 8px", lineHeight: "1", textAlign: "center", fontWeight: 700, fontSize: "12px", fontVariantNumeric: "tabular-nums", borderRight: B }}>
              {formatAmount(grandTotal)}
            </td>
            <td style={{ padding: "0 8px", lineHeight: "1" }}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <Signatures preparedBy={data.preparedBy} checkedBy={data.checkedBy} approvedBy={data.approvedBy} />

      {depositItems.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", border: B, tableLayout: "fixed", fontSize: "11px", marginTop: "24px" }}>
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
          </colgroup>
          <tbody>
            {depositItems.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: "6px 8px", lineHeight: "1", textAlign: "center", verticalAlign: "middle", borderRight: B }}>{(item.description || "").toUpperCase()}</td>
                <td style={{ padding: "6px 8px", lineHeight: "1", textAlign: "center", verticalAlign: "middle", fontVariantNumeric: "tabular-nums", borderTop: B, borderRight: B }}>
                  {formatAmount(Number(item.amount) || 0)}
                </td>
                <td style={{ padding: "6px 8px", lineHeight: "1", textAlign: "center", verticalAlign: "middle", borderTop: B }}>{(item.voucherNo || "").toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ExportExpenseTemplate({ data, settings: _settings }: ExpenseDocTemplateProps) {
  const charges = data.charges || [];
  const B = "1px solid #000";
  const EMPTY_ROWS = 5;
  const paddingRows = Math.max(0, EMPTY_ROWS - charges.length);

  const shipmentFields = [
    { label: "VESSEL/VOY", value: data.vesselVoyage || "" },
    { label: "BL NUMBER", value: data.blNumber || "" },
    { label: "CONTAINER NUMBER", value: data.containerNo || "" },
    { label: "ORIGIN", value: data.origin || "" },
    { label: "DESTINATION", value: data.destination || "" },
    { label: "COMMODITY", value: data.commodity || "" },
    ...(data.exchangeRate ? [{ label: "EXCHANGE RATE", value: data.exchangeRate }] : []),
  ];

  const totalAmount = data.totalAmount ?? charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1" }}>
      <div style={{ textAlign: "center", fontSize: "16px", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px", letterSpacing: "0.04em" }}>
        EXPORT EXPENSE REPORT
      </div>
      {data.expenseNumber && (
        <div style={{ textAlign: "center", fontSize: "11px", marginBottom: "16px", color: "#444" }}>
          {data.expenseNumber}
        </div>
      )}

      <div style={{ marginBottom: "8px", lineHeight: "1.4" }}>{formatDateLetters(data.expenseDate || "")}</div>

      {data.vendor && (
        <div style={{ marginBottom: "8px", lineHeight: "1.4" }}>
          <div>{data.vendor}</div>
          {data.clientName && data.clientName !== data.vendor && <div>{data.clientName}</div>}
        </div>
      )}

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

      {(() => {
        const cols = [50, 30, 20];
        const headers = ["PARTICULARS", "CATEGORY", "AMOUNT"];
        const aligns = ["left", "left", "right"];
        const dividers = cols.slice(0, -1).reduce<number[]>((acc, w) => {
          acc.push((acc.length === 0 ? 0 : acc[acc.length - 1]) + w);
          return acc;
        }, []);

        return (
          <div style={{ position: "relative", border: B, marginBottom: "24px", fontSize: "11px" }}>
            {dividers.map((left) => (
              <div key={left} style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${left}%`, width: "1px", background: "#000", pointerEvents: "none",
              }} />
            ))}
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "11px" }}>
              <colgroup>
                {cols.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
              </colgroup>
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th key={h} style={{
                      padding: "6px 8px", textAlign: aligns[hi] as any,
                      fontSize: "10px", fontWeight: 400, borderBottom: B,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "20px 8px", textAlign: "center", color: "#9CA3AF" }}>
                      No charges added.
                    </td>
                  </tr>
                ) : (
                  charges.map((c, i) => (
                    <tr key={i}>
                      <td style={{ padding: "6px 8px", verticalAlign: "top" }}>{c.description}</td>
                      <td style={{ padding: "6px 8px", verticalAlign: "top" }}>{c.category}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", verticalAlign: "top", fontVariantNumeric: "tabular-nums" }}>
                        {c.currency || "PHP"} {formatAmount(Number(c.amount) || 0)}
                      </td>
                    </tr>
                  ))
                )}
                {Array.from({ length: paddingRows }).map((_, i) => (
                  <tr key={`pad-${i}`}>
                    {Array.from({ length: 3 }).map((__, j) => (
                      <td key={j} style={{ padding: "0", height: "32px" }}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: "12px", borderTop: B }}>
                    TOTAL
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: "12px", fontVariantNumeric: "tabular-nums", borderTop: B }}>
                    PHP {formatAmount(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })()}

      <Signatures preparedBy={data.preparedBy} checkedBy={data.checkedBy} approvedBy={data.approvedBy} />
    </div>
  );
}

export function ExpenseDocTemplate(props: ExpenseDocTemplateProps) {
  if (props.data.documentTemplate === "IMPORT") {
    return <ImportSOATemplate {...props} />;
  }
  return <ExportExpenseTemplate {...props} />;
}
