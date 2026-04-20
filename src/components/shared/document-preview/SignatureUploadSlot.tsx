import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { resizeImageToBase64 } from "../../../utils/imageResize";
import type { SignatorySlot } from "../../../types/document-settings";

interface SignatureUploadSlotProps {
  label: string;
  value: SignatorySlot;
  onChange: (value: SignatorySlot) => void;
}

export function SignatureUploadSlot({ label, value, onChange }: SignatureUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await resizeImageToBase64(file, 400);
    onChange({ ...value, signaturePng: dataUrl });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "#6B7A76", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
        {label}
      </div>

      {/* Name + title inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
        <input
          type="text"
          placeholder="Full Name"
          value={value.name || ""}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Title / Position"
          value={value.title || ""}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          style={inputStyle}
        />
      </div>

      {/* Signature PNG zone */}
      {value.signaturePng ? (
        <div style={{ position: "relative", border: "1px solid #E5ECE9", borderRadius: "6px", overflow: "hidden", background: "#F9FAFB" }}>
          <img
            src={value.signaturePng}
            alt="Signature"
            style={{ display: "block", maxWidth: "100%", maxHeight: "64px", margin: "8px auto", objectFit: "contain" }}
          />
          <button
            onClick={() => onChange({ ...value, signaturePng: undefined })}
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
            padding: "12px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
            background: "#FAFBFC",
          }}
        >
          <Upload size={16} color="#9CA3AF" />
          <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Upload signature PNG</span>
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  fontSize: "12px",
  border: "1px solid #E5ECE9",
  borderRadius: "6px",
  outline: "none",
  color: "#12332B",
  background: "#FFFFFF",
  boxSizing: "border-box",
};
