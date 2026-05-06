import { useState } from "react";
import { LogoUploadSlot } from "./LogoUploadSlot";
import { PngUploadSlot } from "./PngUploadSlot";
import {
  LetterheadGalleryPicker,
  setLastUsedLetterheadId,
  type SavedLetterhead,
} from "./LetterheadGalleryPicker";
import type { DocumentSettings } from "../../../types/document-settings";

interface DocumentSettingsPanelProps {
  settings: DocumentSettings;
  onChange: (patch: Partial<DocumentSettings>) => void;
  stampSlots?: string[];
  showShippingLineLetterhead?: boolean;
  hideSupplierLetterhead?: boolean;
  supplierLetterheadLabel?: string;
  useGalleryLetterhead?: boolean;
  readOnly?: boolean;
}

export function DocumentSettingsPanel({ settings, onChange, stampSlots, showShippingLineLetterhead, hideSupplierLetterhead, supplierLetterheadLabel, useGalleryLetterhead, readOnly = false }: DocumentSettingsPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const updateStampSlot = (slotKey: string, value: string | undefined) => {
    onChange({ stamps: { [slotKey]: { pngData: value } } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {!hideSupplierLetterhead && (
        <Section label={supplierLetterheadLabel ?? "Supplier Letterhead"}>
          {useGalleryLetterhead ? (
            <GalleryLetterheadSlot
              value={settings.logoPng}
              onOpenPicker={() => setPickerOpen(true)}
              onClear={() => onChange({ logoPng: undefined })}
              readOnly={readOnly}
            />
          ) : (
            <LogoUploadSlot
              value={settings.logoPng}
              onChange={(v) => onChange({ logoPng: v })}
              readOnly={readOnly}
            />
          )}
        </Section>
      )}

      {useGalleryLetterhead && (
        <LetterheadGalleryPicker
          open={pickerOpen}
          selectedDataUrl={settings.logoPng}
          onClose={() => setPickerOpen(false)}
          onSelect={(lh: SavedLetterhead) => {
            onChange({ logoPng: lh.dataUrl });
            setLastUsedLetterheadId(lh.id);
            setPickerOpen(false);
          }}
        />
      )}

      {showShippingLineLetterhead && (
        <Section label="Shipping Line Letterhead">
          <LogoUploadSlot
            value={settings.shippingLinePng}
            onChange={(v) => onChange({ shippingLinePng: v })}
            readOnly={readOnly}
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
              readOnly={readOnly}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function GalleryLetterheadSlot({ value, onOpenPicker, onClear, readOnly }: {
  value?: string;
  onOpenPicker: () => void;
  onClear: () => void;
  readOnly?: boolean;
}) {
  if (value) {
    return (
      <div style={{ marginBottom: "16px", border: "1px solid #E5ECE9", borderRadius: "6px", overflow: "hidden", background: "#F9FAFB" }}>
        <img
          src={value}
          alt="Letterhead"
          style={{ display: "block", maxWidth: "100%", maxHeight: "80px", margin: "8px auto", objectFit: "contain" }}
        />
        {!readOnly && (
          <div style={{ display: "flex", borderTop: "1px solid #E5ECE9" }}>
            <button
              onClick={onOpenPicker}
              style={{ flex: 1, background: "transparent", border: "none", padding: "8px", fontSize: "11px", fontWeight: 500, color: "#0F766E", cursor: "pointer" }}
            >
              Change
            </button>
            <div style={{ width: "1px", background: "#E5ECE9" }} />
            <button
              onClick={onClear}
              style={{ flex: 1, background: "transparent", border: "none", padding: "8px", fontSize: "11px", fontWeight: 500, color: "#DC2626", cursor: "pointer" }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      onClick={onOpenPicker}
      disabled={readOnly}
      style={{
        width: "100%", border: "1.5px dashed #CBD5E1", borderRadius: "6px",
        padding: "16px 8px", background: "#FAFBFC",
        cursor: readOnly ? "default" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
        marginBottom: "16px", opacity: readOnly ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: "11px", color: "#0F766E", fontWeight: 600 }}>
        {readOnly ? "No letterhead" : "Choose letterhead"}
      </span>
      <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
        {readOnly ? "" : "Browse saved or upload new"}
      </span>
    </button>
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
