/**
 * BookingAttachmentsTab — Grouped attachments view for Import/Export booking detail screens.
 * Groups:
 *   1. Import/Export Documents (booking-level)
 *   2. Trucking
 *   3. Billings (Billing Documents + Collections sub-sections)
 *   4. Expenses (Expenses Documents + Vouchers sub-sections)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, FileText, Image, File, Trash2, Download, Paperclip, Ship, Truck, Receipt, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

interface BookingAttachmentsTabProps {
  bookingType: "import" | "export";
  bookingId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <Image size={18} style={{ color: "#3B82F6" }} />;
  if (fileType.includes("pdf")) return <FileText size={18} style={{ color: "#EF4444" }} />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText size={18} style={{ color: "#2563EB" }} />;
  if (fileType.includes("sheet") || fileType.includes("excel")) return <FileText size={18} style={{ color: "#16A34A" }} />;
  return <File size={18} style={{ color: "#6B7280" }} />;
}

/* ───────── Internal: single attachment section ───────── */

interface AttachmentSectionProps {
  entityType: string;
  entityId: string;
  label: string;
  isSubSection?: boolean;
}

function AttachmentSection({ entityType, entityId, label, isSubSection }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/attachments/${entityType}/${entityId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        setAttachments(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const uploadFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const response = await fetch(`${API_URL}/attachments/${entityType}/${entityId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: base64,
          }),
        });
        const result = await response.json();
        if (result.success) {
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setIsUploading(false);
    fetchAttachments();
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      const response = await fetch(
        `${API_URL}/attachments/${entityType}/${entityId}/${attachment.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const result = await response.json();
      if (result.success) {
        toast.success(`Deleted ${attachment.fileName}`);
        fetchAttachments();
      } else {
        toast.error(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Failed to delete attachment");
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(`${API_URL}/attachments/download/${attachment.id}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = result.data;
        link.download = attachment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("File not available for download");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ marginTop: isSubSection ? "0" : undefined }}>
      {/* Sub-section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: isSubSection ? "12px" : "13px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: isSubSection ? "#667085" : "#0F766E",
            }}
          >
            {label}
          </span>
          {attachments.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "10px",
                backgroundColor: isSubSection ? "#F3F4F6" : "rgba(15, 118, 110, 0.08)",
                color: isSubSection ? "#667085" : "#0F766E",
              }}
            >
              {attachments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "8px",
            border: "1px solid #E5E9F0",
            backgroundColor: "#FFFFFF",
            color: "#0F766E",
            fontSize: "13px",
            fontWeight: 600,
            cursor: isUploading ? "not-allowed" : "pointer",
            opacity: isUploading ? 0.6 : 1,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!isUploading) {
              e.currentTarget.style.backgroundColor = "rgba(15, 118, 110, 0.04)";
              e.currentTarget.style.borderColor = "#0F766E";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#FFFFFF";
            e.currentTarget.style.borderColor = "#E5E9F0";
          }}
        >
          <Upload size={14} />
          {isUploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* File list */}
      {isLoading ? (
        <div style={{ padding: "16px 0", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>
          Loading...
        </div>
      ) : attachments.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #E5E9F0",
                backgroundColor: "#FAFBFC",
                gap: "10px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F3F4F6";
                e.currentTarget.style.borderColor = "#D1D5DB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FAFBFC";
                e.currentTarget.style.borderColor = "#E5E9F0";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "#F3F4F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {getFileIcon(attachment.fileType)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#12332B",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.fileName}
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>
                  {formatFileSize(attachment.fileSize)} &middot;{" "}
                  {new Date(attachment.uploadedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                <button
                  onClick={() => handleDownload(attachment)}
                  title="Download"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "6px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    color: "#6B7280",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E5E9F0";
                    e.currentTarget.style.color = "#0F766E";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#6B7280";
                  }}
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => handleDelete(attachment)}
                  title="Delete"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "6px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    color: "#6B7280",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#FEE2E2";
                    e.currentTarget.style.color = "#EF4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#6B7280";
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Drop zone when empty */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? "#0F766E" : "#E5E9F0"}`,
            borderRadius: "10px",
            padding: "28px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDragOver ? "rgba(15, 118, 110, 0.04)" : "white",
            cursor: "pointer",
            transition: "all 0.2s ease",
            marginBottom: "12px",
          }}
        >
          <Upload size={20} style={{ color: isDragOver ? "#0F766E" : "#D1D5DB", marginBottom: "8px" }} />
          <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
            {isDragOver ? "Drop files here" : "No attachments yet. Drag & drop or click Upload."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────── Section Card wrapper ───────── */

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SectionCard({ icon, title, children, defaultOpen = true }: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E9F0",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "16px 24px",
          borderBottom: isOpen ? "1px solid #E5E9F0" : "none",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {isOpen ? (
          <ChevronDown size={16} style={{ color: "#667085", flexShrink: 0 }} />
        ) : (
          <ChevronRight size={16} style={{ color: "#667085", flexShrink: 0 }} />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {icon}
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#12332B" }}>
            {title}
          </span>
        </div>
      </div>

      {/* Card body */}
      {isOpen && <div style={{ padding: "20px 24px" }}>{children}</div>}
    </div>
  );
}

/* ───────── Main Component ───────── */

export function BookingAttachmentsTab({ bookingType, bookingId }: BookingAttachmentsTabProps) {
  const bookingEntityType = bookingType === "import" ? "import-booking" : "export-booking";
  const bookingLabel = bookingType === "import" ? "Import Documents" : "Export Documents";

  return (
    <div style={{ padding: "32px 48px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Import/Export Documents */}
      <SectionCard
        icon={<Ship size={18} style={{ color: "#0F766E" }} />}
        title={bookingLabel}
      >
        <AttachmentSection
          entityType={bookingEntityType}
          entityId={bookingId}
          label={bookingLabel}
        />
      </SectionCard>

      {/* 2. Trucking */}
      <SectionCard
        icon={<Truck size={18} style={{ color: "#0F766E" }} />}
        title="Trucking"
      >
        <AttachmentSection
          entityType="trucking-record"
          entityId={bookingId}
          label="Trucking Documents"
        />
      </SectionCard>

      {/* 3. Billings */}
      <SectionCard
        icon={<Receipt size={18} style={{ color: "#0F766E" }} />}
        title="Billings"
      >
        <AttachmentSection
          entityType="billing"
          entityId={bookingId}
          label="Billing Documents"
          isSubSection
        />
        <div style={{ borderTop: "1px solid #E5E9F0", margin: "16px 0" }} />
        <AttachmentSection
          entityType="collection"
          entityId={bookingId}
          label="Collections"
          isSubSection
        />
      </SectionCard>

      {/* 4. Expenses */}
      <SectionCard
        icon={<CreditCard size={18} style={{ color: "#0F766E" }} />}
        title="Expenses"
      >
        <AttachmentSection
          entityType="expense"
          entityId={bookingId}
          label="Expenses Documents"
          isSubSection
        />
        <div style={{ borderTop: "1px solid #E5E9F0", margin: "16px 0" }} />
        <AttachmentSection
          entityType="voucher"
          entityId={bookingId}
          label="Vouchers"
          isSubSection
        />
      </SectionCard>
    </div>
  );
}
