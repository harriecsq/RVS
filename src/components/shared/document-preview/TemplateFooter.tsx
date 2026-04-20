interface TemplateFooterProps {
  call?: string;
  message?: string;
  officeAddress?: string;
  stampCenter?: string; // base64 PNG for "footer-center" stamp position
}

export function TemplateFooter({
  call = "+63 (2) 5310 4083\n+63 (2) 7004 7583\n+63 935 981 6652",
  message,
  officeAddress = "Unit 301, Great Wall Bldg., 136 Yakal St., Makati City, Philippines",
  stampCenter,
}: TemplateFooterProps) {
  return (
    <div>
      {stampCenter && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <img src={stampCenter} alt="Stamp" style={{ height: "72px", objectFit: "contain", opacity: 0.9 }} />
        </div>
      )}
      <div
        style={{
          borderTop: "1px solid #E5ECE9",
          marginTop: "32px",
          paddingTop: "12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          fontSize: "9px",
          color: "#6B7A76",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Call</div>
          <div style={{ whiteSpace: "pre-line" }}>{call}</div>
        </div>
        {message && (
          <div>
            <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Message</div>
            <div>{message}</div>
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Office Address</div>
          <div>{officeAddress}</div>
        </div>
      </div>
    </div>
  );
}
