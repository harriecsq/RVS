import type { DocumentSettings } from "../../../../types/document-settings";

function fmt(raw: string | number): string {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  if (isNaN(n)) return String(raw);
  return n.toLocaleString("en-US");
}

interface FSIDocTemplateProps {
  data: Record<string, any>;
  settings: DocumentSettings;
}

const HDR: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "10px",
  display: "block",
  marginBottom: "2px",
};

const C: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 7px",
  verticalAlign: "top",
  fontSize: "11px",
};

/*
  Outer table has 4 columns:
    A: ~22%  (VESSEL/VOY, PORT OF DISCHARGE, container left)
    B: ~22%  (PORT OF LOADING, PLACE OF DELIVERY)
    C: ~56%  (FREIGHT TERM, LSS) — this is where the right panel also lives

  Rows 1–3:  SHIPPER (colSpan A+B = 44%) | right info panel (col C = 56%)
  Rows 4–5:  CONSIGNEE / NOTIFY PARTY (colSpan A+B, left side only) | empty right (col C, no border)
  Row  6:    PRE-CARRIAGE (col A) | PLACE OF RECEIPT (col B+C, full right)
  Row  7:    VESSEL/VOY (col A) | PORT OF LOADING (col B) | FREIGHT TERM (col C, full right)
  Row  8:    PORT OF DISCHARGE (col A) | PLACE OF DELIVERY (col B) | LSS (col C, full right)
  Rows 9–11: full width (colSpan 3), container inner tables
*/

export function FSIDocTemplate({ data, settings }: FSIDocTemplateProps) {
  const d = (k: string): string => (data[k] as string) || "";

  const containers: Array<{ containerNo: string; sealNo: string; volumeType: string }> =
    Array.isArray(data.containers) ? data.containers : [];

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "11px", color: "#000", lineHeight: "1.2" }}>

      {/* Letterhead row — logo left (60%) + FSI title right (40%) */}
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "10px" }}>
        {settings.logoPng ? (
          <div style={{ width: "60%", flexShrink: 0 }}>
            <img src={settings.logoPng} alt="Company Letterhead" style={{ width: "100%", objectFit: "contain", display: "block" }} />
          </div>
        ) : (
          <div style={{ border: "1.5px dashed #CBD5E1", borderRadius: "4px", padding: "14px", textAlign: "center", color: "#9CA3AF", fontSize: "11px", width: "60%", flexShrink: 0, boxSizing: "border-box" }}>
            Company letterhead PNG — upload via Document Settings
          </div>
        )}
        <div style={{ flex: 1, textAlign: "center", paddingLeft: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#000" }}>FINAL SHIPPING INSTRUCTION</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "35%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "40%" }} />
        </colgroup>
        <tbody>

          {/* ── Rows 1–2: SHIPPER (A+B) | right panel (C) ── */}
          <tr>
            <td rowSpan={2} colSpan={2} style={{ ...C }}>
              <span style={HDR}>SHIPPER (includes contact number &amp; email address)</span>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {[
                  d("shipperName"),
                  d("shipperAddress"),
                  d("shipperContactNumber") ? `CONTACT: ${d("shipperContactNumber")}` : "",
                  d("shipperEmail") ? `EMAIL: ${d("shipperEmail")}` : "",
                ].filter(Boolean).join("\n")}
              </div>
            </td>
            {/* Right panel — spans rows 1–2, TO/ATTN + FROM/BOOKING NO only */}
            <td rowSpan={2} style={{ border: "none", padding: "5px 7px", verticalAlign: "top", fontSize: "11px", lineHeight: "1.2" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "10px", whiteSpace: "nowrap" }}>TO :</span>
                <span style={{ fontWeight: 700 }}>{d("to")}</span>
              </div>
              <div style={{ display: "flex", gap: "4px", marginBottom: "13px" }}>
                <span style={{ fontWeight: 700, fontSize: "10px", whiteSpace: "nowrap" }}>ATTN :</span>
                <span style={{ fontWeight: 700 }}>{d("attn")}</span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "10px", whiteSpace: "nowrap" }}>FROM :</span>
                <span style={{ fontWeight: 700 }}>{d("from")}</span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "10px", whiteSpace: "nowrap" }}>BOOKING NO. :</span>
                <span style={{ fontWeight: 700 }}>{d("bookingNumber")}</span>
              </div>
            </td>
          </tr>
          <tr />

          {/* ── Row 3: CONSIGNEE (A+B) | BILLED TO (C) ── */}
          <tr>
            <td colSpan={2} style={{ ...C, borderRight: "1px solid #000" }}>
              <span style={HDR}>CONSIGNEE: (Includes contact number &amp; email address)</span>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {[
                  d("consigneeName"),
                  d("consigneeAddress"),
                  d("consigneeContactPerson") && d("consigneeContactNumber")
                    ? `CONTACT: ${d("consigneeContactPerson")} NO.: ${d("consigneeContactNumber")}`
                    : d("consigneeContactPerson") || (d("consigneeContactNumber") ? `CONTACT: ${d("consigneeContactNumber")}` : ""),
                  d("consigneeEmail") ? `EMAIL: ${d("consigneeEmail")}` : "",
                ].filter(Boolean).join("\n")}
              </div>
            </td>
            <td style={{ border: "none", padding: "5px 7px", verticalAlign: "top", fontSize: "11px" }}>
              <span style={{ fontWeight: 700, fontSize: "10px" }}>BILLED TO: </span>
              <span style={{ fontWeight: 700 }}>{d("billedTo")}</span>
            </td>
          </tr>

          {/* ── Row 5: NOTIFY PARTY — cols A+B only ── */}
          <tr>
            <td colSpan={2} style={{ ...C, borderRight: "1px solid #000" }}>
              <span style={HDR}>NOTIFY PARTY: (includes contact number &amp; email address)</span>
              <div style={{ minHeight: "34px", whiteSpace: "pre-wrap" }}>
                {d("notifyParty") || "SAME AS CONSIGNEE"}
              </div>
            </td>
            <td style={{ border: "none" }} />
          </tr>

          {/* ── Row 6: PRE-CARRIAGE BY (col A) | PLACE OF RECEIPT (cols B+C, full right) ── */}
          <tr>
            <td style={{ ...C }}>
              <span style={HDR}>PRE-CARRIAGE BY:</span>
              <div>{d("preCarriageBy")}</div>
            </td>
            <td style={{ ...C }}>
              <span style={HDR}>PLACE OF RECEIPT</span>
              <div>{d("placeOfReceipt")}</div>
            </td>
            <td style={{ border: "none" }} />
          </tr>

          {/* ── Row 7: VESSEL/VOY (A) | PORT OF LOADING (B) | FREIGHT TERM (C, full right) ── */}
          <tr>
            <td style={{ ...C }}>
              <span style={HDR}>VESSEL/VOY. NO.</span>
              <div>{d("vesselVoyageNo")}</div>
            </td>
            <td style={{ ...C }}>
              <span style={HDR}>PORT OF LOADING</span>
              <div>{d("portOfLoading")}</div>
            </td>
            <td style={{ ...C }}>
              <span style={HDR}>FREIGHT TERM (PREPAID OR COLLECT):</span>
              <div>{d("freightTerm")}</div>
            </td>
          </tr>

          {/* ── Row 8: PORT OF DISCHARGE (A) | PLACE OF DELIVERY (B) | LSS (C, full right) ── */}
          <tr>
            <td style={{ ...C }}>
              <span style={HDR}>PORT OF DISCHARGE</span>
              <div>{d("portOfDischarge")}</div>
            </td>
            <td style={{ ...C }}>
              <span style={HDR}>PLACE OF DELIVERY</span>
              <div>{d("placeOfDelivery")}</div>
            </td>
            <td style={{ ...C }}>
              <span style={HDR}>LSS (PREPAID OR COLLECT):</span>
              <div>{d("lss")}</div>
            </td>
          </tr>

          {/* ── Row 9: Container header — full width (colSpan 3) ── */}
          <tr>
            <td colSpan={3} style={{ padding: 0, border: "1px solid #000" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "22%" }} />
                  <col /> {/* description takes remaining */}
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "17%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={{ border: "none", borderRight: "1px solid #000", padding: "3px 5px", fontWeight: 700, fontSize: "10px", textAlign: "center", verticalAlign: "middle", lineHeight: "1.2" }}>
                      CONTAINER NO./SEAL No.<br />Marks and Numbers
                    </td>
                    <td style={{ border: "none", borderRight: "1px solid #000", padding: "3px 5px", fontWeight: 700, fontSize: "10px", textAlign: "center", verticalAlign: "middle", lineHeight: "1.2" }}>
                      NUMBER AND KINDS OF PACKAGES: DESCRIPTION OF GOODS
                    </td>
                    <td style={{ border: "none", borderRight: "1px solid #000", padding: "3px 5px", fontWeight: 700, fontSize: "10px", textAlign: "center", verticalAlign: "middle", lineHeight: "1.2" }}>
                      GROSS WEIGHT (KGS)
                    </td>
                    <td style={{ border: "none", padding: "3px 5px", fontWeight: 700, fontSize: "10px", textAlign: "center", verticalAlign: "middle", lineHeight: "1.2" }}>
                      MEASUREMENT (CBM)
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* ── Row 10: Container data ── */}
          <tr>
            <td colSpan={3} style={{ padding: 0, border: "1px solid #000" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "22%" }} />
                  <col />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "17%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={{ border: "none", borderRight: "1px solid #000", padding: "6px 8px", verticalAlign: "top" }}>
                      {containers.length > 0 ? containers.map((c, i) => (
                        <div key={i} style={{ fontSize: "11px", marginBottom: "2px" }}>
                          {[c.containerNo, c.sealNo, c.volumeType].filter(Boolean).join("/")}
                        </div>
                      )) : <span style={{ color: "#9CA3AF" }}>&mdash;</span>}
                    </td>
                    <td style={{ border: "none", borderRight: "1px solid #000", padding: "6px 8px", verticalAlign: "top" }}>
                      <div style={{ fontSize: "11px", whiteSpace: "pre-wrap" }}>
                        {[
                          d("volume") ? `${d("volume")} CONTAINER SAID TO CONTAIN:` : "",
                          d("amount") && d("commodity") ? `${[fmt(d("amount")), d("amountMetric").toUpperCase()].filter(Boolean).join(" ")} OF ${d("commodity")}` : (d("amount") ? fmt(d("amount")) : d("commodity")),
                          d("netWeight") ? `NET WEIGHT: ${fmt(d("netWeight"))} KGS` : "",
                        ].filter(Boolean).join("\n")}
                      </div>
                    </td>
                    <td style={{ border: "none", borderRight: "1px solid #000", padding: "6px 8px", textAlign: "center", verticalAlign: "top", fontVariantNumeric: "tabular-nums", fontSize: "11px" }}>
                      {d("grossWeight") ? `${fmt(d("grossWeight"))} KGS` : ""}
                    </td>
                    <td style={{ border: "none", padding: "6px 8px", textAlign: "center", verticalAlign: "top", fontVariantNumeric: "tabular-nums", fontSize: "11px" }}>
                      {d("measurement") ? `${fmt(d("measurement"))} CBM` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* ── Row 11: Total containers spans col1+col2 | HS CODE / USCI CODE stacked in col3+col4 ── */}
          <tr>
            <td colSpan={3} style={{ padding: 0, border: "1px solid #000" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "22%" }} />
                  <col /> {/* description width */}
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "17%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    {/* Total containers label — col1 only */}
                    <td rowSpan={2} style={{ border: "none", borderRight: "1px solid #000", padding: "5px 8px", verticalAlign: "top" }}>
                      <span style={{ fontWeight: 700, fontSize: "9px", display: "block", lineHeight: "1.3" }}>
                        Total number of Containers<br />or other Packages or Units<br />(in words)
                      </span>
                    </td>
                    {/* Volume value — col2, rowSpan 2 to fill both HS/USCI rows */}
                    <td rowSpan={2} style={{ border: "none", borderRight: "1px solid #000", padding: "5px 8px", verticalAlign: "top", fontSize: "11px", fontWeight: 700 }}>
                      {d("volume") ? `${d("volume")} CONTAINER` : ""}
                    </td>
                    {/* HS CODE label box */}
                    <td style={{ border: "none", borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "5px 8px", verticalAlign: "middle", fontWeight: 700, fontSize: "10px" }}>
                      HS CODE:
                    </td>
                    {/* HS CODE value box */}
                    <td style={{ border: "none", borderBottom: "1px solid #000", padding: "5px 8px", verticalAlign: "middle", fontSize: "11px", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                      {d("hsCode")}
                    </td>
                  </tr>
                  <tr>
                    {/* USCI CODE label box */}
                    <td style={{ border: "none", borderRight: "1px solid #000", padding: "5px 8px", verticalAlign: "middle", fontWeight: 700, fontSize: "10px" }}>
                      USCI CODE:
                    </td>
                    {/* USCI CODE value box */}
                    <td style={{ border: "none", padding: "5px 8px", verticalAlign: "middle", fontSize: "11px", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                      {d("usciCode")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

        </tbody>
      </table>

    </div>
  );
}
