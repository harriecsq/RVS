import { LogoUploadSlot } from "./LogoUploadSlot";
import { PngUploadSlot } from "./PngUploadSlot";
import type { DocumentSettings } from "../../../types/document-settings";

interface DocumentSettingsPanelProps {
  settings: DocumentSettings;
  onChange: (settings: DocumentSettings) => void;
  stampSlots?: string[];
  showShippingLineLetterhead?: boolean;
  hideSupplierLetterhead?: boolean;
  supplierLetterheadLabel?: string;
}

export function DocumentSettingsPanel({ settings, onChange, stampSlots, showShippingLineLetterhead, hideSupplierLetterhead, supplierLetterheadLabel }: DocumentSettingsPanelProps) {
  const updateStampSlot = (slotKey: string, value: string | undefined) => {
    onChange({ ...settings, stamps: { ...(settings.stamps || {}), [slotKey]: { pngData: value } } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {!hideSupplierLetterhead && (
        <Section label={supplierLetterheadLabel ?? "Supplier Letterhead"}>
          <LogoUploadSlot
            value={settings.logoPng}
            onChange={(v) => onChange({ ...settings, logoPng: v })}
          />
        </Section>
      )}

      {showShippingLineLetterhead && (
        <Section label="Shipping Line Letterhead">
          <LogoUploadSlot
            value={settings.shippingLinePng}
            onChange={(v) => onChange({ ...settings, shippingLinePng: v })}
          />
        </Section>
      )}

      {stampSlots && stampSlots.length > 0 && (
        <Section label="Stamps / Seals">
          {stampSlots.map((slot) => (
            <PngUploadSlot
              key={slot}
              label={slot.charAt(0).toUpperCase() + slot.slice(1)}
              value={settings.stamps?.[slot]?.pngData}
              onChange={(v) => updateStampSlot(slot, v)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "4px" }}>
      <div style={{
        fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.07em", color: "#0F766E",
        padding: "12px 0 8px", borderBottom: "1px solid #E5ECE9", marginBottom: "12px",
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
