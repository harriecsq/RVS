/**
 * AttachmentsTab — Shared attachments component for detail screens.
 * Provides drag-and-drop file upload, file listing, and delete functionality.
 * Design: teal header with upload button, dashed drop zone, file list with icons.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, FileText, Image, File, Trash2, Download, Paperclip } from "lucide-react";
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

interface AttachmentsTabProps {
  entityType: "export-booking" | "import-booking" | "trucking-record" | "billing" | "collection" | "expense" | "voucher";
  entityId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <Image size={20} style={{ color: "#3B82F6" }} />;
  if (fileType.includes("pdf")) return <FileText size={20} style={{ color: "#EF4444" }} />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText size={20} style={{ color: "#2563EB" }} />;
  if (fileType.includes("sheet") || fileType.includes("excel")) return <FileText size={20} style={{ color: "#16A34A" }} />;
  return <File size={20} style={{ color: "#6B7280" }} />;
}

export function AttachmentsTab({ entityType, entityId }: AttachmentsTabProps) {
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
        // Convert to base64 for KV storage
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
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
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
        // Create a download link from the base64 data
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
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div style={{ padding: "32px 48px" }}>
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #E5E9F0",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E5E9F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Paperclip size={18} style={{ color: "#0F766E" }} />
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#0F766E",
                  margin: 0,
                }}
              >
                Attachments
              </h3>
            </div>
            <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
              {attachments.length === 0
                ? "No files uploaded yet"
                : `${attachments.length} file${attachments.length !== 1 ? "s" : ""} uploaded`}
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#0F766E",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: isUploading ? "not-allowed" : "pointer",
              opacity: isUploading ? 0.6 : 1,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isUploading) e.currentTarget.style.backgroundColor = "#0D6560";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0F766E";
            }}
          >
            <Upload size={16} />
            {isUploading ? "Uploading..." : "Upload Files"}
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

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Divider line */}
          {attachments.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              {/* File List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #E5E9F0",
                      backgroundColor: "#FAFBFC",
                      gap: "12px",
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
                    {/* File Icon */}
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
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

                    {/* File Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#12332B",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {attachment.fileName}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
                        {formatFileSize(attachment.fileSize)} &middot;{" "}
                        {new Date(attachment.uploadedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleDownload(attachment)}
                        title="Download"
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "8px",
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
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(attachment)}
                        title="Delete"
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "8px",
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
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? "#0F766E" : "#E5E9F0"}`,
              borderRadius: "12px",
              padding: "48px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDragOver ? "rgba(15, 118, 110, 0.04)" : "white",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: isDragOver ? "rgba(15, 118, 110, 0.1)" : "#F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                transition: "all 0.2s ease",
              }}
            >
              <Upload size={24} style={{ color: isDragOver ? "#0F766E" : "#9CA3AF" }} />
            </div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: isDragOver ? "#0F766E" : "#12332B",
                margin: "0 0 4px 0",
              }}
            >
              {isDragOver ? "Drop files here" : "Drag and drop files here"}
            </p>
            <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
              or click &lsquo;Upload Files&rsquo; button above
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "32px",
                fontSize: "14px",
                color: "#9CA3AF",
              }}
            >
              Loading attachments...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
