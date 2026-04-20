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
  const stamps = settings.stamps || {};
  const exporterStamp = stamps["exporter"]?.pngData;
  const companyStamp = stamps["company"]?.pngData;

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
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: "10px", color: "#000", lineHeight: "1.2" }}>

      {/* Main bordered table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginTop: "8px", fontSize: "10px" }}>
        <tbody>
          {/* Row 1: Exporter | Title block (rowSpan 1) */}
          <tr>
            <td style={{ ...tdLeft, width: "55%", verticalAlign: "top" }}>
              <div style={cellLabel}>1. Products consigned from (Exporter's business name, address, country)</div>
              <div style={{ whiteSpace: "pre-line", marginTop: "4px", fontWeight: 600 }}>{exporterBlock}</div>
            </td>
            <td style={{ ...tdRight, verticalAlign: "top" }} rowSpan={2}>
              <div style={{ textAlign: "center", padding: "8px 4px" }}>
                <div style={{ fontSize: "11px" }}>ASEAN-CHINA FREE TRADE AREA</div>
                <div style={{ fontSize: "11px" }}>PREFERENTIAL TARIFF</div>
                <div style={{ fontSize: "11px" }}>CERTIFICATE OF ORIGIN</div>
                <div style={{ fontSize: "9px" }}>(Combined Declaration and Certificate)</div>
                <div style={{ fontSize: "13px", margin: "6px 0" }}>FORM E</div>
                <div style={{ fontSize: "9px" }}>Issued in</div>
                <div style={{ borderBottom: "1px dotted #000", margin: "4px 16px 2px", paddingBottom: "2px", fontWeight: 700, fontSize: "9px" }}>{exporterCountry}</div>
                <div style={{ fontSize: "9px" }}>(Country)</div>
                <div style={{ fontSize: "9px", marginTop: "4px" }}>See Overleaf Notes</div>
              </div>
            </td>
          </tr>

          {/* Row 2: Consignee | (right cell covered by rowSpan above) */}
          <tr>
            <td style={{ ...tdLeft, verticalAlign: "top" }}>
              <div style={cellLabel}>2. Products consigned to (Consignee's name, address, country)</div>
              <div style={{ whiteSpace: "pre-line", marginTop: "4px", fontWeight: 600 }}>{consigneeBlock}</div>
            </td>
          </tr>

          {/* Row 3: Transport | Official use box */}
          <tr>
            <td style={{ ...tdLeft, verticalAlign: "top" }}>
              <div style={cellLabel}>3. Means of transport and route (as far as known)</div>
              <div style={{ fontWeight: 600, marginTop: "4px", marginLeft: "12px" }}>{meansOfTransport}</div>
              <div style={{ marginTop: "6px", marginLeft: "12px" }}>
                <div style={cellLabel}>Departure date</div>
                <div style={{ fontWeight: 600, marginTop: "2px" }}>{departureDate}</div>
              </div>
              <div style={{ marginTop: "8px", marginLeft: "12px" }}>
                <div style={cellLabel}>Vessel's name/Aircraft etc.</div>
                <div style={{ fontWeight: 600, marginTop: "2px" }}>{vessel}</div>
              </div>
              <div style={{ marginTop: "8px", marginLeft: "12px" }}>
                <div style={cellLabel}>Port of Discharge</div>
                <div style={{ fontWeight: 600, marginTop: "2px" }}>{portOfDischarge}</div>
              </div>
            </td>
            <td style={{ ...tdRight, verticalAlign: "top" }}>
              <div style={cellLabel}>4. For Official Use</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", margin: "8px 4px" }}>
                <div style={{ width: "14px", height: "14px", border: "1px solid #000", flexShrink: 0, marginTop: "1px" }} />
                <div>Preferential Treatment Given</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", margin: "8px 4px" }}>
                <div style={{ width: "14px", height: "14px", border: "1px solid #000", flexShrink: 0, marginTop: "1px" }} />
                <div>Preferential Treatment Not Given (Please state reason/s)</div>
              </div>
              <div style={{ borderTop: "1px dotted #000", margin: "12px 4px 4px", paddingTop: "4px", fontSize: "9px" }}>
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
                    <td style={{ ...td, textAlign: "center", verticalAlign: "top", paddingTop: "10px" }}>{itemNumber}</td>
                    <td style={{ ...td, textAlign: "center", verticalAlign: "top", paddingTop: "10px" }}>{marksAndNumbers}</td>
                    <td style={{ ...td, verticalAlign: "top", paddingTop: "10px", whiteSpace: "pre-line", lineHeight: "1.2" }}>{packagesDescription}</td>
                    <td style={{ ...td, textAlign: "center", verticalAlign: "top", paddingTop: "10px" }}>{originCriteria ? `"${originCriteria}"` : ""}</td>
                    <td style={{ ...td, verticalAlign: "top", paddingTop: "10px", textAlign: "center" }}>
                      {grossWeight && <div style={{ fontWeight: 600, lineHeight: "1.2" }}>GROSS WEIGHT<br />{grossWeight}</div>}
                    </td>
                    <td style={{ ...td, verticalAlign: "top", paddingTop: "10px", whiteSpace: "pre-line", textAlign: "center" }}>{invoiceRef}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Row 5: Declaration | Certification */}
          <tr>
            <td style={{ ...tdLeft, verticalAlign: "top" }}>
              <div style={cellLabel}>11. Declaration by the exporter</div>
              <div style={{ marginTop: "8px", fontSize: "9px", lineHeight: "1.2" }}>
                The undersigned hereby declares that the above details and statement are correct; that all the products were produced in
              </div>
              <div style={{ textAlign: "center", marginTop: "12px", borderBottom: "1px dotted #000", paddingBottom: "2px", marginLeft: "24px", marginRight: "24px" }}>
                <span style={{ fontWeight: 700 }}>{exporterCountry}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: "9px" }}>(Country)</div>
              <div style={{ fontSize: "9px", lineHeight: "1.2", marginTop: "12px" }}>
                and that they comply with the origin requirements specified in the Rules of Origin for the ACFTA for the products exported to
              </div>
              <div style={{ textAlign: "center", marginTop: "12px", borderBottom: "1px dotted #000", paddingBottom: "2px", marginLeft: "24px", marginRight: "24px" }}>
                <span style={{ fontWeight: 700 }}>{importingCountry}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: "9px" }}>(Importing Country)</div>
              {signatoryLine && (
                <div style={{ textAlign: "center", fontSize: "9px", marginTop: "24px", fontWeight: 700 }}>{signatoryLine}</div>
              )}
              <div style={{ marginTop: signatoryLine ? "2px" : "24px", borderBottom: "1px dotted #000" }} />
              <div style={{ textAlign: "center", fontSize: "9px", marginTop: "2px" }}>
                Place and date, signature of authorised signatory
              </div>
              {exporterStamp && (
                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  <img src={exporterStamp} alt="Exporter stamp" style={{ height: "60px", objectFit: "contain" }} />
                </div>
              )}
            </td>
            <td style={{ ...tdRight, verticalAlign: "top" }} rowSpan={2}>
              <div style={cellLabel}>12. Certification</div>
              <div style={{ fontSize: "9px", lineHeight: "1.2", marginTop: "8px" }}>
                It is hereby certified, on the basis of control carried out that the declaration by the exporter is correct.
              </div>
              <div style={{ marginTop: "48px", borderBottom: "1px dotted #000" }} />
              <div style={{ fontSize: "9px", marginTop: "2px" }}>
                Place and date, signature and stamp of certifying authority
              </div>
              {companyStamp && (
                <div style={{ marginTop: "8px" }}>
                  <img src={companyStamp} alt="Company stamp" style={{ height: "60px", objectFit: "contain" }} />
                </div>
              )}
            </td>
          </tr>

          {/* Row 6: Box 13 — left cell only, right covered by rowSpan */}
          <tr>
            <td style={{ ...tdLeft, padding: "6px 8px" }}>
              <div style={cellLabel}>13.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginTop: "4px", fontSize: "9px" }}>
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
  padding: "6px 8px",
};

const tdRight: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 8px",
  width: "45%",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 4px",
  textAlign: "center",
  fontWeight: 400,
  background: "#fff",
  verticalAlign: "top",
  lineHeight: "1.3",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 4px",
  verticalAlign: "middle",
  minHeight: "60px",
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
