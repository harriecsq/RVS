import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { resizeImageToBase64 } from "../../../utils/imageResize";

interface PngUploadSlotProps {
  label: string;
  value?: string; // base64 data URL
  onChange: (value: string | undefined) => void;
}

export function PngUploadSlot({ label, value, onChange }: PngUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await resizeImageToBase64(file, 300);
    onChange(dataUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "#6B7A76", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
        {label}
      </div>
      {value ? (
        <div style={{ position: "relative", border: "1px solid #E5ECE9", borderRadius: "6px", overflow: "hidden", background: "#F9FAFB" }}>
          <img
            src={value}
            alt={label}
            style={{ display: "block", maxWidth: "100%", maxHeight: "64px", margin: "8px auto", objectFit: "contain" }}
          />
          <button
            onClick={() => onChange(undefined)}
            style={{
              position: "absolute", top: "4px", right: "4px",
              background: "#FEE2E2", border: "none", borderRadius: "4px",
              padding: "2px", cursor: "pointer", display: "flex", alignItems: "center",
            }}
          >
            <X size={12} color="#DC2626" />
          </button>
          <div
            onClick={() => inputRef.current?.click()}
            style={{ textAlign: "center", fontSize: "11px", color: "#0F766E", cursor: "pointer", padding: "4px 0 8px", fontWeight: 500 }}
          >
            Replace
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{
            border: "1.5px dashed #CBD5E1",
            borderRadius: "6px",
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
            background: "#FAFBFC",
          }}
        >
          <Upload size={14} color="#9CA3AF" />
          <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Upload PNG</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
