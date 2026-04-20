interface TemplateHeaderProps {
  title: string;
  referenceNo: string;
  dateIssued?: string;
  validUntil?: string;
  companyName?: string;
  companyAddress?: string;
  logoUrl?: string;
  stampRight?: string; // base64 PNG for "header-right" stamp position
}

export function TemplateHeader({
  title,
  referenceNo,
  dateIssued,
  validUntil,
  companyName = "Neuron Logistics Inc.",
  companyAddress = "Unit 301, Great Wall Bldg., 136 Yakal St., San Antonio Village, Makati City, Philippines\n+63 2 8888 1234 | inquiries@neuron-os.com",
  logoUrl,
  stampRight,
}: TemplateHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
      {/* Left: Logo + address */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "280px" }}>
        {logoUrl ? (
          <img src={logoUrl} alt={companyName} style={{ height: "36px", objectFit: "contain", alignSelf: "flex-start" }} />
        ) : (
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#0F766E", letterSpacing: "-0.5px" }}>neuron</div>
        )}
        <div style={{ fontSize: "9px", color: "#6B7A76", lineHeight: "1.5", whiteSpace: "pre-line" }}>{companyAddress}</div>
      </div>

      {/* Right: Document type block + stamp */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        {stampRight && (
          <img src={stampRight} alt="Stamp" style={{ height: "64px", objectFit: "contain", opacity: 0.9 }} />
        )}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#12332B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {title}
          </div>
          <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "2px", fontSize: "10px", color: "#6B7A76" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Reference No.</span>
              <span style={{ color: "#12332B", fontWeight: 600 }}>{referenceNo || "—"}</span>
            </div>
            {dateIssued && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Date Issued</span>
                <span style={{ color: "#12332B", fontWeight: 600 }}>{dateIssued}</span>
              </div>
            )}
            {validUntil && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Valid Until</span>
                <span style={{ color: "#12332B", fontWeight: 600 }}>{validUntil}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
