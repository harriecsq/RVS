import type { DocumentSettings } from "../../../../types/document-settings";

interface FormEDocTemplateProps {
  data: Record<string, any>;
  settings: DocumentSettings;
}

function fmt(raw: string | number): string {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  if (isNaN(n)) return String(raw);
  return n.toLocaleString("en-US");
}

function formatDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

export function FormEDocTemplate({ data, settings }: FormEDocTemplateProps) {

  const exporterName = data.exporterName || "";
  const exporterAddress = data.exporterAddress || "";
  const exporterContactNumber = data.exporterContactNumber || "";
  const exporterEmail = data.exporterEmail || "";
  const consigneeName = data.consigneeName || "";
  const consigneeAddress = data.consigneeAddress || "";
  const consigneeContactNumber = data.consigneeContactNumber || "";
  const consigneeContactEmail = data.consigneeContactEmail || "";
  const consigneeContactPerson = data.consigneeContactPerson || "";
  const meansOfTransport = data.meansOfTransport || "";
  const departureDate = formatDate(data.departureDate || "");
  const vessel = data.vessel || "";
  const portOfDischarge = data.portOfDischarge || "";
  const itemNumber = data.itemNumber || "";
  const marksAndNumbers = data.marksAndNumbers || "";
  const packagesVolume = data.packagesVolume || "";
  const packagesAmount = data.packagesAmount || "";
  const packagesAmountMetric = data.packagesAmountMetric || "";
  const packagesCommodity = data.packagesCommodity || "";
  const packagesNetWeight = data.packagesNetWeight || "";
  const packagesHsCode = data.packagesHsCode || "";
  const packagesNotifyParty = data.packagesNotifyParty || "";
  const packagesNotifyAddress = data.packagesNotifyAddress || "";
  const packagesDescription = [
    packagesVolume ? `${packagesVolume} CONTAINER` : "",
    "SAID TO CONTAIN:",
    "",
    [[packagesAmount ? fmt(packagesAmount) : "", packagesAmountMetric.toUpperCase()].filter(Boolean).join(" "), packagesCommodity].filter(Boolean).join(" OF "),
    "",
    packagesNetWeight ? `NET WEIGHT: ${packagesNetWeight} KGS` : "",
    "",
    packagesHsCode ? `HS CODE: ${packagesHsCode}` : "",
    "",
    packagesNotifyParty ? `NOTIFY PARTY: ${packagesNotifyParty}` : "",
    packagesNotifyAddress ? `ADDRESS: ${packagesNotifyAddress}` : "",
  ].join("\n");
  const originCriteria = data.originCriteria || "";
  const grossWeight = data.grossWeight ? `${fmt(data.grossWeight)} KGS` : "";
  const invoiceNumber = data.invoiceNumber || "";
  const invoiceDated = formatDate(data.invoiceDated || "");
  const exporterCountry = (data.exporterCountry || "").toUpperCase();
  const importingCountry = (data.importingCountry || "").toUpperCase();
  const signatoryPlace = data.signatoryPlace || "";
  const signatoryDate = formatDate(data.signatoryDate || "");
  const authorizedSignatory = data.authorizedSignatory || "";
  const placeDate = [signatoryPlace, signatoryDate].filter(Boolean).join(" / ");
  const signatoryLine = [placeDate, authorizedSignatory].filter(Boolean).join(" ");

  const exporterBlock = [exporterName, exporterAddress && `ADD: ${exporterAddress}`, exporterContactNumber && `CONTACT NUMBER: ${exporterContactNumber}`, exporterEmail && `EMAIL: ${exporterEmail}`].filter(Boolean).join("\n");
  const consigneeBlock = [consigneeName, consigneeAddress && `ADD: ${consigneeAddress}`, consigneeContactNumber && `CONTACT NUMBER: ${consigneeContactNumber}`, consigneeContactEmail && `EMAIL: ${consigneeContactEmail}`, consigneeContactPerson && `CONTACT PERSON: ${consigneeContactPerson}`].filter(Boolean).join("\n");
  const invoiceRef = [invoiceNumber && `INVOICE NO. ${invoiceNumber}`, invoiceDated && `DATED: ${invoiceDated}`].filter(Boolean).join("\n");

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "9px", color: "#000", lineHeight: "1" }}>

      {/* Main bordered table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginTop: "4px", fontSize: "9px" }}>
        <tbody>
          {/* Row 1: Exporter | Title block (rowSpan 1) */}
          <tr>
            <td style={{ ...tdLeft, width: "55%", verticalAlign: "top" }}>
              <div style={cellLabel}>1. Products consigned from (Exporter's business name, address, country)</div>
              <div style={{ whiteSpace: "pre-line", fontWeight: 600, lineHeight: "1", display: "block" }}>{exporterBlock}</div>
            </td>
            <td style={{ ...tdRight, verticalAlign: "top" }} rowSpan={2}>
              <div style={{ textAlign: "center", padding: "4px 4px" }}>
                <div style={{ fontSize: "10px" }}>ASEAN-CHINA FREE TRADE AREA</div>
                <div style={{ fontSize: "10px" }}>PREFERENTIAL TARIFF</div>
                <div style={{ fontSize: "10px" }}>CERTIFICATE OF ORIGIN</div>
                <div style={{ fontSize: "8px" }}>(Combined Declaration and Certificate)</div>
                <div style={{ fontSize: "12px", margin: "4px 0" }}>FORM E</div>
                <div style={{ fontSize: "8px" }}>Issued in</div>
                <div style={{ borderBottom: "1px dotted #000", margin: "2px 16px 2px", paddingBottom: "2px", fontWeight: 700, fontSize: "8px" }}>{exporterCountry}</div>
                <div style={{ fontSize: "8px" }}>(Country)</div>
                <div style={{ fontSize: "8px", marginTop: "2px" }}>See Overleaf Notes</div>
              </div>
            </td>
          </tr>

          {/* Row 2: Consignee | (right cell covered by rowSpan above) */}
          <tr>
            <td style={{ ...tdLeft, verticalAlign: "top" }}>
              <div style={cellLabel}>2. Products consigned to (Consignee's name, address, country)</div>
              <div style={{ whiteSpace: "pre-line", fontWeight: 600, lineHeight: "1", display: "block" }}>{consigneeBlock}</div>
            </td>
          </tr>

          {/* Row 3: Transport | Official use box */}
          <tr>
            <td style={{ ...tdLeft, verticalAlign: "top" }}>
              <div style={cellLabel}>3. Means of transport and route (as far as known)</div>
              <div style={{ marginLeft: "8px" }}>
                <div style={{ fontWeight: 600 }}>{meansOfTransport}</div>
                <div style={{ marginTop: "18px" }}>
                  <div style={cellLabel}>Departure date</div>
                  <div style={{ fontWeight: 600 }}>{departureDate}</div>
                </div>
                <div style={{ marginTop: "18px" }}>
                  <div style={cellLabel}>Vessel's name/Aircraft etc.</div>
                  <div style={{ fontWeight: 600 }}>{vessel}</div>
                </div>
                <div style={{ marginTop: "18px" }}>
                  <div style={cellLabel}>Port of Discharge</div>
                  <div style={{ fontWeight: 600 }}>{portOfDischarge}</div>
                </div>
              </div>
            </td>
            <td style={{ ...tdRight, verticalAlign: "top" }}>
              <div style={cellLabel}>4. For Official Use</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", margin: "4px 4px" }}>
                <div style={{ width: "12px", height: "12px", border: "1px solid #000", flexShrink: 0, marginTop: "1px" }} />
                <div>Preferential Treatment Given</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", margin: "4px 4px" }}>
                <div style={{ width: "12px", height: "12px", border: "1px solid #000", flexShrink: 0, marginTop: "1px" }} />
                <div>Preferential Treatment Not Given (Please state reason/s)</div>
              </div>
              <div style={{ borderTop: "1px dotted #000", margin: "6px 4px 4px", paddingTop: "4px", fontSize: "8px" }}>
                Signature of Authorised Signatory of the Importing Party
              </div>
            </td>
          </tr>

          {/* Row 4: Goods table header */}
          <tr>
            <td colSpan={2} style={{ border: "1px solid #000", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: "6%" }}>5. Item Number</th>
                    <th style={{ ...th, width: "12%" }}>6. Marks and numbers on packages</th>
                    <th style={{ ...th, width: "34%" }}>7. Number and type of packages, description of products (including quantity where appropriate and HS number in six digit code)</th>
                    <th style={{ ...th, width: "10%" }}>8. Origin criteria (see Overleaf Notes)</th>
                    <th style={{ ...th, width: "22%" }}>9. Gross weight or net weight or other quantity, and value (FOB) only when RVC criterion is applied</th>
                    <th style={{ ...th, width: "16%" }}>10. Number, date of Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...td, textAlign: "center", verticalAlign: "top", paddingTop: "4px" }}>{itemNumber}</td>
                    <td style={{ ...td, textAlign: "center", verticalAlign: "top", paddingTop: "4px" }}>{marksAndNumbers}</td>
                    <td style={{ ...td, verticalAlign: "top", paddingTop: "4px", whiteSpace: "pre-line", lineHeight: "1.2" }}>{packagesDescription}</td>
                    <td style={{ ...td, textAlign: "center", verticalAlign: "top", paddingTop: "4px" }}>{originCriteria ? `"${originCriteria}"` : ""}</td>
                    <td style={{ ...td, verticalAlign: "top", paddingTop: "4px", textAlign: "center" }}>
                      {grossWeight && <div style={{ fontWeight: 600, lineHeight: "1.2" }}>GROSS WEIGHT<br />{grossWeight}</div>}
                    </td>
                    <td style={{ ...td, verticalAlign: "top", paddingTop: "4px", whiteSpace: "pre-line", textAlign: "center" }}>{invoiceRef}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Row 5: Declaration | Certification */}
          <tr>
            <td style={{ ...tdLeft, verticalAlign: "top" }}>
              <div style={cellLabel}>11. Declaration by the exporter</div>
              <div style={{ fontSize: "8px" }}>
                The undersigned hereby declares that the above details and statement are correct; that all the products were produced in
              </div>
              <div style={{ textAlign: "center", marginTop: "6px", borderBottom: "1px dotted #000", paddingBottom: "2px", marginLeft: "24px", marginRight: "24px" }}>
                <span style={{ fontWeight: 700 }}>{exporterCountry}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: "8px" }}>(Country)</div>
              <div style={{ fontSize: "8px", lineHeight: "1.2", marginTop: "6px" }}>
                and that they comply with the origin requirements specified in the Rules of Origin for the ACFTA for the products exported to
              </div>
              <div style={{ textAlign: "center", marginTop: "6px", borderBottom: "1px dotted #000", paddingBottom: "2px", marginLeft: "24px", marginRight: "24px" }}>
                <span style={{ fontWeight: 700 }}>{importingCountry}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: "8px" }}>(Importing Country)</div>
              {signatoryLine && (
                <div style={{ textAlign: "center", fontSize: "8px", marginTop: "10px", fontWeight: 700 }}>{signatoryLine}</div>
              )}
              <div style={{ position: "relative", marginTop: signatoryLine ? "2px" : "10px", borderBottom: "1px dotted #000" }}>
              </div>
              <div style={{ textAlign: "center", fontSize: "8px", marginTop: "2px" }}>
                Place and date, signature of authorised signatory
              </div>
            </td>
            <td style={{ ...tdRight, verticalAlign: "top" }} rowSpan={2}>
              <div style={cellLabel}>12. Certification</div>
              <div style={{ fontSize: "8px" }}>
                It is hereby certified, on the basis of control carried out that the declaration by the exporter is correct.
              </div>
              <div style={{ position: "relative", marginTop: "20px", borderBottom: "1px dotted #000" }}>
              </div>
              <div style={{ fontSize: "8px", marginTop: "2px" }}>
                Place and date, signature and stamp of certifying authority
              </div>
            </td>
          </tr>

          {/* Row 6: Box 13 — left cell only, right covered by rowSpan */}
          <tr>
            <td style={{ ...tdLeft, padding: "4px 6px" }}>
              <div style={cellLabel}>13.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginTop: "3px", fontSize: "8px" }}>
                <div style={{ display: "flex", gap: "6px" }}><span style={checkbox} /> Issued Retroactively</div>
                <div style={{ display: "flex", gap: "6px" }}><span style={checkbox} /> Exhibition</div>
                <div style={{ display: "flex", gap: "6px" }}><span style={checkbox} /> Movement Certificate</div>
                <div style={{ display: "flex", gap: "6px" }}><span style={checkbox} /> Third Party Invoicing</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const tdLeft: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
};

const tdRight: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  width: "45%",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 3px",
  textAlign: "center",
  fontWeight: 400,
  background: "#fff",
  verticalAlign: "top",
  lineHeight: "1.2",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 3px",
  verticalAlign: "middle",
  minHeight: "40px",
  fontWeight: 700,
};

const cellLabel: React.CSSProperties = {
  fontSize: "9px",
  color: "#333",
};

const checkbox: React.CSSProperties = {
  display: "inline-block",
  width: "10px",
  height: "10px",
  border: "1px solid #000",
  flexShrink: 0,
};
