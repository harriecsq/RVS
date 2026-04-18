import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Plus, CheckCircle, Settings } from "lucide-react";
import { TemplateManagementView } from "./TemplateManagementView";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import { DocumentSidePanel } from "./DocumentSidePanel";
import { SalesContractTab } from "./SalesContractTab";
import { CommercialInvoiceTab } from "./CommercialInvoiceTab";
import { PackingListTab } from "./PackingListTab";
import { DeclarationTab } from "./DeclarationTab";
import { FormETab } from "./FormETab";
import { FSITab } from "./FSITab";
import { toast } from "../../ui/toast-utils";
import type { DocumentEditState } from "./SalesContractTab";

// ── Document type registry ──────────────────────────────────────────

const DOCUMENT_TYPES = [
  { key: "salesContract", label: "Sales Contract", component: SalesContractTab, apiSlug: "sales-contract" },
  { key: "commercialInvoice", label: "Commercial Invoice", component: CommercialInvoiceTab, apiSlug: "commercial-invoice" },
  { key: "packingList", label: "Packing List", component: PackingListTab, apiSlug: "packing-list" },
  { key: "declaration", label: "Declaration", component: DeclarationTab, apiSlug: "declaration" },
  { key: "formE", label: "Form E", component: FormETab, apiSlug: "form-e" },
  { key: "fsi", label: "FSI", component: FSITab, apiSlug: "fsi" },
] as const;

type DocKey = (typeof DOCUMENT_TYPES)[number]["key"];

// ── Props ───────────────────────────────────────────────────────────

interface DocumentsSubTabProps {
  bookingId: string;
  booking?: any;
  currentUser?: { name: string; email: string; department: string } | null;
  onDocumentUpdated?: () => void;
}

// ── Component ───────────────────────────────────────────────────────

export function DocumentsSubTab({ bookingId, booking, currentUser, onDocumentUpdated }: DocumentsSubTabProps) {
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [docStatus, setDocStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activePanelKey, setActivePanelKey] = useState<DocKey | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [editState, setEditState] = useState<DocumentEditState | null>(null);
  const editStateRef = useRef<DocumentEditState | null>(null);
  const [fsiId, setFsiId] = useState<string | null>(null);

  const handleEditStateChange = useCallback((state: DocumentEditState) => {
    editStateRef.current = state;
    setEditState(state);
  }, []);

  const fetchDocumentStatus = useCallback(async () => {
    try {
      const id = encodeURIComponent(bookingId);
      const [docsRes, fsiRes] = await Promise.all([
        fetch(`${API_BASE_URL}/export-bookings/${id}/documents`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`${API_BASE_URL}/fsi?${new URLSearchParams({ bookingId })}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
      ]);

      const docsResult = await docsRes.json();
      const fsiResult = await fsiRes.json();
      const data = docsResult.success ? docsResult.data || {} : {};

      const hasFsi = !!(fsiResult.success && fsiResult.data);
      setDocStatus({
        salesContract: !!data.salesContract,
        commercialInvoice: !!data.commercialInvoice,
        packingList: !!data.packingList,
        declaration: !!data.declaration,
        formE: !!data.formE,
        fsi: hasFsi,
      });
      setFsiId(hasFsi ? fsiResult.data.id : null);
    } catch (err) {
      console.error("Error fetching document status:", err);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { fetchDocumentStatus(); }, [fetchDocumentStatus]);

  // Reset edit state when panel closes
  useEffect(() => {
    if (!activePanelKey) {
      setEditState(null);
      editStateRef.current = null;
    }
  }, [activePanelKey]);

  const handleDocumentUpdated = () => {
    fetchDocumentStatus();
    onDocumentUpdated?.();
  };

  const handleDelete = useCallback(async () => {
    if (!activePanelKey) return;
    const doc = DOCUMENT_TYPES.find((d) => d.key === activePanelKey);
    if (!doc) return;
    if (!confirm(`Delete this ${doc.label}? This cannot be undone.`)) return;

    try {
      let res: Response;
      if (activePanelKey === "fsi") {
        if (!fsiId) { toast.error("FSI record not found"); return; }
        res = await fetch(`${API_BASE_URL}/fsi/${fsiId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
      } else {
        const id = encodeURIComponent(bookingId);
        res = await fetch(`${API_BASE_URL}/export-bookings/${id}/documents/${doc.apiSlug}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
      }

      const result = await res.json();
      if (result.success) {
        toast.success(`${doc.label} deleted`);
        setActivePanelKey(null);
        fetchDocumentStatus();
        onDocumentUpdated?.();
      } else {
        toast.error(result.error || "Failed to delete");
      }
    } catch (err) {
      console.error(`Error deleting ${doc.label}:`, err);
      toast.error(`Failed to delete ${doc.label}`);
    }
  }, [activePanelKey, bookingId, fsiId]);

  const activeDoc = DOCUMENT_TYPES.find((d) => d.key === activePanelKey);

  // Build panel title with ref number
  const panelTitle = activeDoc
    ? editState?.refNo
      ? `${activeDoc.label} — ${editState.refNo}`
      : activeDoc.label
    : "";

  // Show template management view
  if (showTemplateManager) {
    return <TemplateManagementView onBack={() => setShowTemplateManager(false)} currentUser={currentUser} />;
  }

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Manage Templates button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button
          onClick={() => setShowTemplateManager(true)}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
            fontSize: "13px", fontWeight: 500, border: "1px solid #E5ECE9", borderRadius: "8px",
            background: "#FFFFFF", color: "#237F66", cursor: "pointer",
          }}
        >
          <Settings size={14} /> Manage Templates
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "280px", color: "#9CA3AF", fontSize: "14px" }}>
          Loading documents...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {DOCUMENT_TYPES.map((doc) => {
            const exists = docStatus[doc.key];
            const isHovered = hoveredKey === doc.key;
            return (
              <button
                key={doc.key}
                onClick={() => setActivePanelKey(doc.key)}
                onMouseEnter={() => setHoveredKey(doc.key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  minHeight: "160px",
                  padding: "24px",
                  border: `1px solid ${isHovered ? "#237F66" : "#E5E9F0"}`,
                  borderRadius: "10px",
                  background: exists ? "#F0FAF7" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "center",
                }}
              >
                <FileText size={32} style={{ color: exists ? "#237F66" : "#D1D5DB" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                  {doc.label}
                </span>
                {exists ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#237F66", fontWeight: 500 }}>
                    <CheckCircle size={14} /> Created
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#6B7A76", fontWeight: 500 }}>
                    <Plus size={14} /> Create
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Side panel for the active document */}
      {activeDoc && (
        <DocumentSidePanel
          isOpen={!!activePanelKey}
          onClose={() => setActivePanelKey(null)}
          title={panelTitle}
          documentExists={activePanelKey ? docStatus[activePanelKey] : false}
          editState={editState}
          onDelete={handleDelete}
        >
          <activeDoc.component
            bookingId={bookingId}
            booking={booking}
            currentUser={currentUser}
            onDocumentUpdated={handleDocumentUpdated}
            onEditStateChange={handleEditStateChange}
          />
        </DocumentSidePanel>
      )}
    </div>
  );
}
