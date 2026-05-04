import type { DocumentSettings } from "../../../../types/document-settings";

interface HeartOfExportDocTemplateProps {
  data: Record<string, any>;
  settings: DocumentSettings;
}

function formatDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

function fmtAmount(raw: string | number): string {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  if (isNaN(n) || n === 0) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const B = "1px solid #000";

const EXPENSE_ROWS = [
  { key: "expShippingLine", label: "SHIPPING LINE" },
  { key: "expTrucking", label: "TRUCKING" },
  { key: "expPettyCash", label: "PETTY CASH" },
  { key: "expCommission", label: "COMMISSION" },
  { key: "expOthers", label: "OTHERS" },
  { key: "expSOA", label: "SOA" },
  { key: "expProfitSharing", label: "PROFIT SHARING" },
];

const ROW: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "40% 60%",
  borderBottom: B,
};

const LABEL: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: "11px",
  borderRight: B,
  background: "#fff",
};

const VALUE: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: "11px",
  textAlign: "center",
};

export function HeartOfExportDocTemplate({ data, settings }: HeartOfExportDocTemplateProps) {
  const bookingRef = data.bookingRef || "";
  const date = formatDate(data.date || "");
  const blNumber = data.blNumber || "";
  const client = data.client || "";
  const shipper = data.shipper || "";
  const consignee = data.consignee || "";
  const commodity = data.commodity || "";
  const volume = data.volume || "";
  const shippingLine = data.shippingLine || "";
  const vesselVoy = data.vesselVoy || "";
  const destination = data.destination || "";
  const trucker = data.trucker || "";
  const loadingAddress = data.loadingAddress || "";
  const loadingSchedule = data.loadingSchedule || "";
  const referenceNo = data.referenceNo || "";
  const containerNumber = data.containerNumber || "";

  return (
    <div
      style={{
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: "12px",
        color: "#000",
        lineHeight: 1.3,
        padding: "32px 40px",
        background: "#fff",
        boxSizing: "border-box",
        textTransform: "uppercase",
      }}
    >
      {/* ── HEADER BOX ── */}
      <div style={{ border: B, fontSize: "11px", marginBottom: 0 }}>
        {/* Row 1: Booking Ref right-aligned, no visible divider */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "5px 8px 0 8px" }}>
          <div>BOOKING REF: {bookingRef}</div>
        </div>
        {/* Row 2: Date (left) + BL # (right) */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px 0 8px" }}>
          <div>DATE日期: <span style={{ textDecoration: "underline" }}>{date}</span></div>
          <div>BL # {blNumber}</div>
        </div>
      </div>

      {/* ── MAIN INFO TABLE ── */}
      <div style={{ border: B, borderTop: "none", marginBottom: "14px" }}>
        {[
          { label: "CLIENT NAME 客户名称:", value: client },
          { label: "SHIPPER 发货人:", value: shipper },
          { label: "CONSIGNEE 收货人:", value: consignee },
          { label: "COMMODITY 商品:", value: commodity },
          { label: "VOLUME 箱数:", value: volume },
          { label: "SHIPPING LINE / VESSEL/VOY 船号:", value: `${shippingLine}${shippingLine && vesselVoy ? "\n" : ""}${vesselVoy}` },
          { label: "DESTINATION 目的点:", value: destination },
          { label: "TRUCKER 卡车:", value: trucker },
          { label: "LOADING ADDRESS 装柜地点:", value: loadingAddress },
          { label: "LOADING SCHEDULE 装载日期:", value: loadingSchedule },
        ].map(({ label, value }, i) => (
          <div key={i} style={{ ...ROW, borderBottom: i < 9 ? B : "none" }}>
            <div style={LABEL}>{label}</div>
            <div style={{ ...VALUE, whiteSpace: "pre-line" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── SIGNATURE BLOCK ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ borderBottom: B, marginBottom: "4px", height: "36px" }} />
          <div style={{ fontSize: "11px" }}>CHECKED BY:</div>
        </div>
        <div style={{ width: "32px" }} />
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ borderBottom: B, marginBottom: "4px", height: "36px" }} />
          <div style={{ fontSize: "11px" }}>APPROVED BY:</div>
        </div>
      </div>

      {/* ── REFERENCE + CONTAINER ── */}
      <div style={{ fontSize: "11px", marginBottom: 0 }}>
        <div>REFERENCE #: {referenceNo}</div>
        <div>CONTAINER NUMBER: {containerNumber}</div>
      </div>

      {/* ── EXPENSE PARTICULARS TABLE ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: B }}>
        <thead>
          <tr>
            <th style={{ border: B, padding: "6px 8px", textAlign: "center", fontWeight: 700, width: "40%" }}>PARTICULARS</th>
            <th style={{ border: B, padding: "6px 8px", textAlign: "center", fontWeight: 700, width: "35%" }}>REFERENCE NUMBER</th>
            <th style={{ border: B, padding: "6px 8px", textAlign: "center", fontWeight: 700, width: "25%" }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {EXPENSE_ROWS.map(({ key, label }) => {
            const row = data[key] || { referenceNo: "", amount: "" };
            return (
              <tr key={key}>
                <td style={{ border: B, padding: "5px 8px", textAlign: "center" }}>{label}</td>
                <td style={{ border: B, padding: "5px 8px", textAlign: "center" }}>{row.referenceNo || ""}</td>
                <td style={{ border: B, padding: "5px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtAmount(row.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
