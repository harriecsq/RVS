import { useEffect, useRef, useState } from "react";
import { Upload, X, Pencil, Trash2, Check } from "lucide-react";
import { resizeImageToBase64 } from "../../../utils/imageResize";

export interface SavedLetterhead {
  id: string;
  name: string;
  dataUrl: string;
}

const STORAGE_KEY = "neuron:letterheads";
const LAST_USED_KEY = "neuron:letterheads:lastUsed";

export function loadLetterheads(): SavedLetterhead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLetterheads(items: SavedLetterhead[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage may be full from large base64 images — fail silently
  }
}

export function getLastUsedLetterheadId(): string | null {
  try {
    return localStorage.getItem(LAST_USED_KEY);
  } catch {
    return null;
  }
}

export function setLastUsedLetterheadId(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_USED_KEY, id);
    else localStorage.removeItem(LAST_USED_KEY);
  } catch {
    // ignore
  }
}

interface LetterheadGalleryPickerProps {
  open: boolean;
  selectedDataUrl?: string;
  onClose: () => void;
  onSelect: (letterhead: SavedLetterhead) => void;
}

export function LetterheadGalleryPicker({ open, selectedDataUrl, onClose, onSelect }: LetterheadGalleryPickerProps) {
  const [items, setItems] = useState<SavedLetterhead[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingFile, setPendingFile] = useState<{ dataUrl: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setItems(loadLetterheads());
      setEditingId(null);
      setPendingFile(null);
    }
  }, [open]);

  if (!open) return null;

  const persist = (next: SavedLetterhead[]) => {
    setItems(next);
    saveLetterheads(next);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await resizeImageToBase64(file, 800);
    const defaultName = file.name.replace(/\.[^.]+$/, "") || "Letterhead";
    setPendingFile({ dataUrl, name: defaultName });
  };

  const confirmAdd = () => {
    if (!pendingFile) return;
    const trimmed = pendingFile.name.trim() || "Letterhead";
    const newItem: SavedLetterhead = {
      id: `lh-${Date.now()}`,
      name: trimmed,
      dataUrl: pendingFile.dataUrl,
    };
    const next = [...items, newItem];
    persist(next);
    setPendingFile(null);
    onSelect(newItem);
  };

  const handleRename = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    persist(items.map((it) => (it.id === id ? { ...it, name: trimmed } : it)));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    persist(items.filter((it) => it.id !== id));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 100%)",
          height: "min(85vh, 800px)",
          background: "#FFFFFF",
          borderRadius: "10px",
          border: "1px solid #E5ECE9",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #E5ECE9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>Select Letterhead</div>
            <div style={{ fontSize: "11px", color: "#6B7A76", marginTop: "2px" }}>
              Pick a saved letterhead or upload a new one.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
            }}
          >
            <X size={16} color="#6B7A76" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {pendingFile ? (
            <NamePromptCard
              dataUrl={pendingFile.dataUrl}
              name={pendingFile.name}
              onNameChange={(v) => setPendingFile({ ...pendingFile, name: v })}
              onCancel={() => setPendingFile(null)}
              onConfirm={confirmAdd}
            />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "14px",
            }}>
              {items.map((item) => {
                const isSelected = selectedDataUrl === item.dataUrl;
                const isEditing = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      border: isSelected ? "2px solid #237F66" : "1px solid #E5ECE9",
                      borderRadius: "8px",
                      overflow: "hidden",
                      background: "#FFFFFF",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      onClick={() => !isEditing && onSelect(item)}
                      style={{
                        height: "100px",
                        background: "#F9FAFB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isEditing ? "default" : "pointer",
                        padding: "8px",
                      }}
                    >
                      <img
                        src={item.dataUrl}
                        alt={item.name}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                      {isSelected && (
                        <div style={{
                          position: "absolute",
                          top: "6px",
                          left: "6px",
                          background: "#237F66",
                          borderRadius: "999px",
                          width: "18px",
                          height: "18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #E5ECE9",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleRename(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(item.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          style={{
                            flex: 1,
                            fontSize: "12px",
                            padding: "2px 6px",
                            border: "1px solid #237F66",
                            borderRadius: "4px",
                            outline: "none",
                            color: "#12332B",
                            minWidth: 0,
                          }}
                        />
                      ) : (
                        <span style={{
                          flex: 1,
                          fontSize: "12px",
                          color: "#12332B",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {item.name}
                        </span>
                      )}
                      {!isEditing && (
                        <>
                          <IconBtn
                            title="Rename"
                            onClick={() => { setEditingId(item.id); setEditingName(item.name); }}
                          >
                            <Pencil size={11} color="#6B7A76" />
                          </IconBtn>
                          <IconBtn
                            title="Delete"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={11} color="#DC2626" />
                          </IconBtn>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Upload tile */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "1.5px dashed #CBD5E1",
                  borderRadius: "8px",
                  minHeight: "144px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  background: "#FAFBFC",
                }}
              >
                <Upload size={18} color="#9CA3AF" />
                <span style={{ fontSize: "12px", color: "#6B7A76", fontWeight: 500 }}>Upload new</span>
                <span style={{ fontSize: "10px", color: "#9CA3AF" }}>PNG / JPG</span>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "#F3F4F6",
        border: "none",
        borderRadius: "4px",
        padding: "4px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}

function NamePromptCard({
  dataUrl, name, onNameChange, onCancel, onConfirm,
}: {
  dataUrl: string;
  name: string;
  onNameChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div style={{
      border: "1px solid #E5ECE9",
      borderRadius: "8px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      background: "#F9FAFB",
    }}>
      <div style={{
        height: "140px",
        background: "#FFFFFF",
        border: "1px solid #E5ECE9",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      }}>
        <img src={dataUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>
      <div>
        <label style={{ fontSize: "11px", color: "#6B7A76", fontWeight: 500, display: "block", marginBottom: "4px" }}>
          Letterhead name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
          style={{
            width: "100%",
            fontSize: "13px",
            padding: "8px 10px",
            border: "1px solid #E5ECE9",
            borderRadius: "6px",
            outline: "none",
            color: "#12332B",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 500,
            background: "#FFFFFF",
            border: "1px solid #E5ECE9",
            borderRadius: "6px",
            color: "#12332B",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 600,
            background: "#237F66",
            border: "none",
            borderRadius: "6px",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          Save & Use
        </button>
      </div>
    </div>
  );
}
