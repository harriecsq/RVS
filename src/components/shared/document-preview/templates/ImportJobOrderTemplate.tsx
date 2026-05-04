interface ImportJobOrderTemplateProps {
  data: {
    bookingId?: string;
    voucherNo?: string;
    consignee?: string;
    rcvdBilling?: string;
    shippingLine?: string;
    vesselVoyage?: string;
    blNumber?: string;
    polPod?: string;
    commodity?: string;
    volume?: string;
    containerNo?: string;
    registryNo?: string;
    entryNo?: string;
    eta?: string;
    ata?: string;
    section?: string;
    ot?: string;
    costing?: string;
    dischargedDate?: string;
    stowage?: string;
    storageBegin?: string;
    demurrageBegin?: string;
    arrastre?: string;
    gatepass?: string;
    selectivity?: string;
    finalTaxNavValue?: string;
    ticket?: string;
    trucking?: string;
    truckingRates?: string;
    delivered?: string;
    returned?: string;
    soaNo?: string;
    draftDocs?: string;
    signedDocs?: string;
    final?: string;
    forDebit?: string;
    debited?: string;
    week?: string;
  };
}

function fmtDate(raw?: string): string {
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (isoMatch) {
    const [, y, mo, d, hh, mm] = isoMatch;
    const datePart = `${months[parseInt(mo) - 1]} ${parseInt(d)}, ${y}`;
    if (hh && mm) {
      const h = parseInt(hh);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${datePart} ${String(h12).padStart(2, "0")}:${mm} ${ampm}`;
    }
    return datePart;
  }
  const dt = new Date(raw);
  if (isNaN(dt.getTime())) return raw;
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

export function ImportJobOrderTemplate({ data }: ImportJobOrderTemplateProps) {
  const B = "1px solid #000";

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "170px 1fr 170px 1fr",
    borderBottom: B,
    minHeight: "28px",
  };

  const rowWide: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "170px 1fr",
    borderBottom: B,
    minHeight: "28px",
  };

  const label: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 400,
    letterSpacing: "0.03em",
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
    textTransform: "uppercase",
  };

  const labelRight: React.CSSProperties = {
    ...label,
  };

  const val: React.CSSProperties = {
    fontSize: "12px",
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
    wordBreak: "break-word",
  };

  const valLast: React.CSSProperties = {
    ...val,
  };

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "12px", color: "#000", lineHeight: 1.3, textTransform: "uppercase" }}>

      {/* Title bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "2px", marginBottom: "4px" }}>
        <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "0.06em" }}>
          WEEK: <span style={{ minWidth: "80px", display: "inline-block" }}>{data.week || ""}</span>
        </div>
      </div>

      {/* Form body */}
      <div style={{ border: B }}>

        {/* Row 1: Reference No + Voucher No */}
        <div style={rowStyle}>
          <div style={label}>Reference No.:</div>
          <div style={val}>{data.bookingId || ""}</div>
          <div style={labelRight}>Voucher No.:</div>
          <div style={valLast}>{data.voucherNo || ""}</div>
        </div>

        {/* Row 2: Consignee + RCVD Billing */}
        <div style={rowStyle}>
          <div style={label}>Consignee:</div>
          <div style={val}>{data.consignee || ""}</div>
          <div style={labelRight}>RCVD Billing:</div>
          <div style={valLast}>{fmtDate(data.rcvdBilling)}</div>
        </div>

        {/* Row 3: Shipping Line + RCVD CRO/DO */}
        <div style={rowStyle}>
          <div style={label}>Shipping Line:</div>
          <div style={val}>{data.shippingLine || ""}</div>
          <div style={labelRight}>RCVD CRO/DO:</div>
          <div style={valLast}></div>
        </div>

        {/* Row 4: VSL/VOY — wide */}
        <div style={rowWide}>
          <div style={label}>VSL/VOY:</div>
          <div style={{ ...val, borderRight: "none" }}>{data.vesselVoyage || ""}</div>
        </div>

        {/* Row 5: BL Number — wide */}
        <div style={rowWide}>
          <div style={label}>BL Number:</div>
          <div style={{ ...val, borderRight: "none" }}>{data.blNumber || ""}</div>
        </div>

        {/* Row 6: POL/POD — wide */}
        <div style={rowWide}>
          <div style={label}>POL / POD:</div>
          <div style={{ ...val, borderRight: "none" }}>{data.polPod || ""}</div>
        </div>

        {/* Row 7: Commodity — wide */}
        <div style={rowWide}>
          <div style={label}>Commodity:</div>
          <div style={{ ...val, borderRight: "none" }}>{data.commodity || ""}</div>
        </div>

        {/* Row 8: Volume — wide */}
        <div style={rowWide}>
          <div style={label}>Volume:</div>
          <div style={{ ...val, borderRight: "none" }}>{data.volume || ""}</div>
        </div>

        {/* Row 9: Container No — wide */}
        <div style={rowWide}>
          <div style={label}>Container No.:</div>
          <div style={{ ...val, borderRight: "none" }}>{data.containerNo || ""}</div>
        </div>

        {/* Row 10: Registry No + Entry No */}
        <div style={rowStyle}>
          <div style={label}>Registry No.:</div>
          <div style={val}>{data.registryNo || ""}</div>
          <div style={labelRight}>Entry No.:</div>
          <div style={valLast}>{data.entryNo || ""}</div>
        </div>

        {/* Row 11: ETA + Section */}
        <div style={rowStyle}>
          <div style={label}>ETA:</div>
          <div style={val}>{fmtDate(data.eta)}</div>
          <div style={labelRight}>Section:</div>
          <div style={valLast}>{data.section || ""}</div>
        </div>

        {/* Row 12: ATA + OT */}
        <div style={rowStyle}>
          <div style={label}>ATA:</div>
          <div style={val}>{fmtDate(data.ata)}</div>
          <div style={labelRight}>OT:</div>
          <div style={valLast}>{data.ot || ""}</div>
        </div>

        {/* Row 13: Discharged Date + Costing */}
        <div style={rowStyle}>
          <div style={label}>Discharged Date:</div>
          <div style={val}>{fmtDate(data.dischargedDate)}</div>
          <div style={labelRight}>Costing:</div>
          <div style={valLast}>{data.costing || ""}</div>
        </div>

        {/* Row 14: Storage Begin + Stowage */}
        <div style={rowStyle}>
          <div style={label}>Storage Begin:</div>
          <div style={val}>{fmtDate(data.storageBegin)}</div>
          <div style={labelRight}>Stowage:</div>
          <div style={valLast}>{data.stowage || ""}</div>
        </div>

        {/* Row 15: Demurrage Begin + Arrastre */}
        <div style={rowStyle}>
          <div style={label}>Demurrage Begin:</div>
          <div style={val}>{fmtDate(data.demurrageBegin)}</div>
          <div style={labelRight}>Arrastre:</div>
          <div style={valLast}>{fmtDate(data.arrastre)}</div>
        </div>

        {/* Row 16: Selectivity + Gatepass */}
        <div style={rowStyle}>
          <div style={label}>Selectivity:</div>
          <div style={val}>{data.selectivity || ""}</div>
          <div style={labelRight}>Gatepass:</div>
          <div style={valLast}>{fmtDate(data.gatepass)}</div>
        </div>

        {/* Row 17: Final Tax/Nav Value + Ticket */}
        <div style={rowStyle}>
          <div style={label}>Final Tax / Nav Value:</div>
          <div style={val}>{data.finalTaxNavValue || ""}</div>
          <div style={labelRight}>Ticket:</div>
          <div style={valLast}>{data.ticket || ""}</div>
        </div>

        {/* Rows 18-19: Trucking block */}
        <div style={{ borderBottom: B }}>
          {/* Row 18: Trucking */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", minHeight: "22px", borderBottom: B }}>
            <div style={label}>Trucking:</div>
            <div style={{ ...val, borderRight: "none" }}>{data.trucking || ""}</div>
          </div>

          {/* Row 19: Trucking Rates + Delivered/Returned stacked */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px 1fr", minHeight: "44px" }}>
            <div style={label}>Trucking Rates:</div>
            <div style={val}>{data.truckingRates || ""}</div>
            <div style={{ ...labelRight, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: "4px" }}>
              <div>Delivered:</div>
              <div>Returned:</div>
            </div>
            <div style={{ ...valLast, flexDirection: "column", justifyContent: "center", gap: "4px" }}>
              <div>{fmtDate(data.delivered)}</div>
              <div>{fmtDate(data.returned)}</div>
            </div>
          </div>
        </div>

        {/* Row 20: SOA No — wide */}
        <div style={{ ...rowWide, borderBottom: "none" }}>
          <div style={label}>SOA No.:</div>
          <div style={{ ...val, borderRight: "none" }}>{data.soaNo || ""}</div>
        </div>

      </div>

      {/* Bottom timeline — Draft Docs / Signed Docs / Final / For Debit / Debited */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        marginTop: "0",
      }}>
        {[
          { label: "Draft Docs:", value: fmtDate(data.draftDocs) },
          { label: "Signed Docs:", value: fmtDate(data.signedDocs) },
          { label: "Final:", value: fmtDate(data.final) },
          { label: "For Debit:", value: fmtDate(data.forDebit) },
          { label: "Debited:", value: fmtDate(data.debited) },
        ].map((col, i) => (
          <div key={col.label} style={{
            padding: "4px 6px",
            minHeight: "36px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "10px", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>
              {col.label}
            </div>
            <div style={{ fontSize: "11px" }}>{col.value || ""}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
