import { X, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";

interface CreateProjectTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: () => void;
  selectedProjectType: "Export" | "Import" | null;
  setSelectedProjectType: (type: "Export" | "Import" | null) => void;
}

export function CreateProjectTypeModal({ 
  isOpen, 
  onClose, 
  onCreateProject,
  selectedProjectType,
  setSelectedProjectType
}: CreateProjectTypeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "500px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#12332B",
                marginBottom: "4px",
              }}
            >
              Create New Project
            </h2>
            <p style={{ fontSize: "14px", color: "#667085" }}>
              Select the project type to get started
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={20} color="#6B7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            {/* Export Option */}
            <button
              onClick={() => {
                setSelectedProjectType("Export");
              }}
              style={{
                padding: "32px 24px",
                border: selectedProjectType === "Export" ? "2px solid #0F766E" : "2px solid #E5E7EB",
                borderRadius: "12px",
                backgroundColor: selectedProjectType === "Export" ? "#F0FDFA" : "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
              onMouseEnter={(e) => {
                if (selectedProjectType !== "Export") {
                  e.currentTarget.style.borderColor = "#0F766E";
                  e.currentTarget.style.backgroundColor = "#F0FDFA";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedProjectType !== "Export") {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.backgroundColor = "#FFFFFF";
                }
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#0F766E15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowUpFromLine size={32} color="#0F766E" strokeWidth={2} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#12332B",
                    marginBottom: "4px",
                  }}
                >
                  Export
                </div>
                <div style={{ fontSize: "13px", color: "#667085", lineHeight: "1.5" }}>
                  Create an export project
                </div>
              </div>
            </button>

            {/* Import Option */}
            <button
              onClick={() => {
                setSelectedProjectType("Import");
              }}
              style={{
                padding: "32px 24px",
                border: selectedProjectType === "Import" ? "2px solid #F59E0B" : "2px solid #E5E7EB",
                borderRadius: "12px",
                backgroundColor: selectedProjectType === "Import" ? "#FFFBEB" : "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
              onMouseEnter={(e) => {
                if (selectedProjectType !== "Import") {
                  e.currentTarget.style.borderColor = "#F59E0B";
                  e.currentTarget.style.backgroundColor = "#FFFBEB";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedProjectType !== "Import") {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.backgroundColor = "#FFFFFF";
                }
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#F59E0B15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowDownToLine size={32} color="#F59E0B" strokeWidth={2} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#12332B",
                    marginBottom: "4px",
                  }}
                >
                  Import
                </div>
                <div style={{ fontSize: "13px", color: "#667085", lineHeight: "1.5" }}>
                  Create an import project
                </div>
              </div>
            </button>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => {
              if (selectedProjectType) {
                onCreateProject();
                onClose();
              }
            }}
            disabled={!selectedProjectType}
            style={{
              width: "100%",
              padding: "12px 20px",
              backgroundColor: selectedProjectType ? "#0F766E" : "#E5E7EB",
              border: "none",
              borderRadius: "8px",
              color: selectedProjectType ? "#FFFFFF" : "#9CA3AF",
              fontSize: "14px",
              fontWeight: 600,
              cursor: selectedProjectType ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (selectedProjectType) {
                e.currentTarget.style.backgroundColor = "#0D6860";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedProjectType) {
                e.currentTarget.style.backgroundColor = "#0F766E";
              }
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}