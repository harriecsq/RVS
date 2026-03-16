interface NotesSectionProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function NotesSection({
  value,
  onChange,
  disabled = false,
  placeholder = "Add notes...",
}: NotesSectionProps) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
        overflow: "hidden",
        marginTop: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #E5E7EB",
          background: "#F9FAFB",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#12332B",
            margin: 0,
          }}
        >
          Notes
        </h3>
      </div>

      {/* Content */}
      <div style={{ padding: "24px" }}>
        {disabled ? (
          <div
            style={{
              padding: "14px 16px",
              backgroundColor: value ? "#F9FAFB" : "white",
              border: value ? "1px solid #E5E7EB" : "2px dashed #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: value ? "#12332B" : "#9CA3AF",
              minHeight: "120px",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap" as const,
              wordBreak: "break-word" as const,
            }}
          >
            {value || "No notes added."}
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={5}
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: "14px",
              color: "#12332B",
              border: "1.5px solid #E5E7EB",
              borderRadius: "8px",
              outline: "none",
              background: "white",
              resize: "vertical" as const,
              minHeight: "120px",
              lineHeight: "1.6",
              fontFamily: "inherit",
              transition: "border-color 0.15s ease",
              boxSizing: "border-box" as const,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0F766E";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#E5E7EB";
            }}
          />
        )}
      </div>
    </div>
  );
}
