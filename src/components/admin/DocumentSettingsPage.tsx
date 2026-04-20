import { useDocumentSettings } from "../../hooks/useDocumentSettings";
import { LogoUploadSlot } from "../shared/document-preview/LogoUploadSlot";
import { PngUploadSlot } from "../shared/document-preview/PngUploadSlot";
import { toast } from "../ui/toast-utils";

const ALL_STAMP_SLOTS = ["buyer", "seller", "supplier"];

export function DocumentSettingsPage() {
  const { settings, updateSettings } = useDocumentSettings();

  const updateStamp = (slot: string, value: string | undefined) => {
    updateSettings({ stamps: { ...(settings.stamps || {}), [slot]: { pngData: value } } });
    toast.success("Settings saved");
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 32px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#12332B", margin: "0 0 8px" }}>
        Document Settings
      </h1>
      <p style={{ fontSize: "14px", color: "#6B7A76", margin: "0 0 32px" }}>
        Upload your letterhead and stamps once — they'll appear across all documents and bookings.
      </p>

      <SectionCard title="Company Letterhead">
        <LogoUploadSlot
          value={settings.logoPng}
          onChange={(v) => { updateSettings({ logoPng: v }); toast.success("Settings saved"); }}
        />
        <p style={{ fontSize: "12px", color: "#6B7A76", margin: "8px 0 0" }}>
          PNG or JPG. Displayed at the top of every document.
        </p>
      </SectionCard>

      <SectionCard title="Stamps &amp; Seals">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {ALL_STAMP_SLOTS.map((slot) => (
            <PngUploadSlot
              key={slot}
              label={slot === "supplier" ? "Supplier / Manager" : slot.charAt(0).toUpperCase() + slot.slice(1)}
              value={settings.stamps?.[slot]?.pngData}
              onChange={(v) => updateStamp(slot, v)}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Display Defaults">
        {(["showBankDetails", "showTerms", "showFooter"] as const).map((key) => {
          const labels: Record<string, string> = {
            showBankDetails: "Show bank details",
            showTerms: "Show terms",
            showFooter: "Show footer",
          };
          return (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.display[key]}
                onChange={(e) => {
                  updateSettings({ display: { ...settings.display, [key]: e.target.checked } });
                  toast.success("Settings saved");
                }}
                style={{ width: "16px", height: "16px", accentColor: "#237F66" }}
              />
              <span style={{ fontSize: "14px", color: "#12332B" }}>{labels[key]}</span>
            </label>
          );
        })}
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: "10px", border: "1px solid #E5ECE9", marginBottom: "20px" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5ECE9" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#237F66", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}
