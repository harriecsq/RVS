import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Plus, CheckCircle, Settings, Sparkles } from "lucide-react";
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
import { ProcessingFeeTab } from "./ProcessingFeeTab";
import { HeartOfExportTab } from "./HeartOfExportTab";
import { toast } from "../../ui/toast-utils";
import type { DocumentEditState } from "./SalesContractTab";
import type { MasterTemplate } from "../../../types/master-template";
import { SalesContractDocTemplate } from "../../shared/document-preview/templates/SalesContractDocTemplate";
import { CommercialInvoiceDocTemplate } from "../../shared/document-preview/templates/CommercialInvoiceDocTemplate";
import { PackingListDocTemplate } from "../../shared/document-preview/templates/PackingListDocTemplate";
import { DeclarationDocTemplate } from "../../shared/document-preview/templates/DeclarationDocTemplate";
import { FormEDocTemplate } from "../../shared/document-preview/templates/FormEDocTemplate";
import { FSIDocTemplate } from "../../shared/document-preview/templates/FSIDocTemplate";
import { ProcessingFeeDocTemplate } from "../../shared/document-preview/templates/ProcessingFeeDocTemplate";
import { HeartOfExportDocTemplate } from "../../shared/document-preview/templates/HeartOfExportDocTemplate";
import type { DocumentSettings } from "../../../types/document-settings";
import { useMasterTemplates } from "../../../hooks/useMasterTemplates";

// ── Document type registry ──────────────────────────────────────────

const DOCUMENT_TYPES = [
  { key: "salesContract", label: "Sales Contract", component: SalesContractTab, apiSlug: "sales-contract" },
  { key: "commercialInvoice", label: "Commercial Invoice", component: CommercialInvoiceTab, apiSlug: "commercial-invoice" },
  { key: "packingList", label: "Packing List", component: PackingListTab, apiSlug: "packing-list" },
  { key: "declaration", label: "Declaration", component: DeclarationTab, apiSlug: "declaration" },
  { key: "formE", label: "Form E", component: FormETab, apiSlug: "form-e", noDraft: true },
  { key: "fsi", label: "FSI", component: FSITab, apiSlug: "fsi", noDraft: true },
  { key: "processingFee", label: "Processing Fee", component: ProcessingFeeTab, apiSlug: "processing-fee", noDraft: true },
  { key: "heartOfExport", label: "Heart of Export", component: HeartOfExportTab, apiSlug: "heart-of-export", noDraft: true },
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
  // In-memory draft pre-fill from a master template (never persisted)
  const [draftDocs, setDraftDocs] = useState<Partial<Record<DocKey, any>>>({});
  // Persists the applied master so PNG overrides work across all doc tabs
  const [appliedMaster, setAppliedMaster] = useState<MasterTemplate | null>(null);

  // Warm the master-templates cache as soon as the Documents tab opens, so doc tabs
  // (Sales Contract, Form E, FSI) don't have to wait when the user clicks Create.
  useMasterTemplates();

  const handleEditStateChange = useCallback((state: DocumentEditState) => {
    editStateRef.current = state;
    setEditState(state);
    // When a master template is applied, store it and populate in-memory drafts for all docs
    if (state.appliedMaster) {
      const m: MasterTemplate = state.appliedMaster;
      setAppliedMaster(m);
      setDraftDocs({
        commercialInvoice: m.commercialInvoice,
        packingList: m.packingList,
        declaration: m.declaration,
        formE: m.formE,
        fsi: m.fsi,
      });
    }
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
        processingFee: !!data.processingFee,
        heartOfExport: !!data.heartOfExport,
      });
      setFsiId(hasFsi ? fsiResult.data.id : null);
    } catch (err) {
      console.error("Error fetching document status:", err);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { fetchDocumentStatus(); }, [fetchDocumentStatus]);

  // Reset edit state when panel closes; if the doc wasn't saved, discard its draft so
  // closing without saving doesn't re-pre-fill the form on next open.
  const prevPanelKeyRef = useRef<DocKey | null>(null);
  useEffect(() => {
    const prev = prevPanelKeyRef.current;
    prevPanelKeyRef.current = activePanelKey;
    if (!activePanelKey && prev) {
      setEditState(null);
      editStateRef.current = null;
      if (!docStatus[prev]) {
        setDraftDocs((d) => { const next = { ...d }; delete next[prev]; return next; });
      }
    }
  }, [activePanelKey, docStatus]);

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

  // Build PDF preview renderer for the active document type
  const buildPdfPreview = (docKey: DocKey) => (settings: DocumentSettings) => {
    const bookingData = {
      referenceNo: booking?.referenceNo || booking?.bookingNumber || bookingId,
      date: booking?.bookingDate || "",
      shipper: booking?.shipper || "",
      consignee: booking?.consignee || "",
      portOfLoading: booking?.portOfLoading || booking?.pol || "",
      portOfDischarge: booking?.portOfDischarge || booking?.pod || "",
      incoterm: booking?.incoterm || "",
      commodity: booking?.commodity || "",
    };
    // Merge: booking fields < draft (master pre-fill) < editState (active form edits)
    // Use ref so the preview always reflects the latest typed values without stale closure
    const draft = !docStatus[docKey] ? (draftDocs[docKey] || {}) : {};
    const merged = { ...bookingData, ...draft, ...(editStateRef.current?.docData || {}) };

    if (docKey === "salesContract") return <SalesContractDocTemplate data={merged} settings={settings} />;
    if (docKey === "commercialInvoice") return <CommercialInvoiceDocTemplate data={merged} settings={settings} />;
    if (docKey === "packingList") return <PackingListDocTemplate data={merged} settings={settings} />;
    if (docKey === "declaration") return <DeclarationDocTemplate data={merged} settings={settings} />;
    if (docKey === "formE") return <FormEDocTemplate data={merged} settings={settings} />;
    if (docKey === "fsi") return <FSIDocTemplate data={merged} settings={settings} />;
    if (docKey === "processingFee") return <ProcessingFeeDocTemplate data={merged} settings={settings} />;
    if (docKey === "heartOfExport") return <HeartOfExportDocTemplate data={merged} settings={settings} />;
    return null;
  };

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
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {[
            { label: "Shipping Documents", docs: DOCUMENT_TYPES.slice(0, 6) },
            { label: "Other Documents", docs: DOCUMENT_TYPES.slice(6) },
          ].map((group) => (
            <div key={group.label}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7A76", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  {group.label}
                </span>
                <div style={{ flex: 1, height: "1px", background: "#E5ECE9" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                {group.docs.map((doc) => {
                  const exists = docStatus[doc.key];
                  const hasDraft = !exists && !("noDraft" in doc && doc.noDraft) && !!draftDocs[doc.key] && Object.keys(draftDocs[doc.key] || {}).length > 0;
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
                      ) : hasDraft ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#0369A1", fontWeight: 500 }}>
                          <Sparkles size={14} /> Draft Ready
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
            </div>
          ))}
        </div>
      )}

      {/* Side panel for the active document */}
      {activeDoc && activePanelKey && (
        <DocumentSidePanel
          isOpen={!!activePanelKey}
          onClose={() => setActivePanelKey(null)}
          title={panelTitle}
          documentExists={activePanelKey ? docStatus[activePanelKey] : false}
          editState={editState}
          onDelete={handleDelete}
          renderPdfPreview={docStatus[activePanelKey] || editState?.isEditing ? buildPdfPreview(activePanelKey) : undefined}
          overrideSettings={appliedMaster ? (() => {
            const baseStamps = appliedMaster.stamps && Object.keys(appliedMaster.stamps).length > 0
              ? Object.fromEntries(Object.entries(appliedMaster.stamps).map(([k, v]) => [k, { pngData: v }]))
              : {} as Record<string, { pngData: string }>;
            // CI and PL use "manager" stamp slot — map from master's "supplier"
            const stamps = (activePanelKey === "commercialInvoice" || activePanelKey === "packingList")
              ? { ...baseStamps, ...(appliedMaster.stamps?.supplier ? { manager: { pngData: appliedMaster.stamps.supplier } } : {}) }
              : baseStamps;
            return {
              logoPng: appliedMaster.letterhead,
              shippingLinePng: appliedMaster.shippingLineLetterhead,
              stamps: Object.keys(stamps).length > 0 ? stamps : undefined,
            };
          })() : undefined}
          stampSlots={
            activePanelKey === "salesContract" ? ["buyer", "seller", "supplier"] :
            activePanelKey === "commercialInvoice" ? ["manager", "seller"] :
            activePanelKey === "packingList" ? ["manager"] :
            activePanelKey === "declaration" ? ["supplier"] :
            activePanelKey === "formE" ? [] :
            undefined
          }
          showShippingLineLetterhead={activePanelKey === "fsi"}
          hideSupplierLetterhead={activePanelKey === "fsi" || activePanelKey === "formE" || activePanelKey === "processingFee" || activePanelKey === "heartOfExport"}
          landscape={activePanelKey === "processingFee"}
        >
          {(() => {
            const DocComponent = activeDoc.component as React.ComponentType<any>;
            return (
              <DocComponent
                bookingId={bookingId}
                booking={booking}
                currentUser={currentUser}
                onDocumentUpdated={handleDocumentUpdated}
                onEditStateChange={handleEditStateChange}
                initialDraftData={activePanelKey !== "salesContract" ? draftDocs[activePanelKey] : undefined}
              />
            );
          })()}
        </DocumentSidePanel>
      )}
    </div>
  );
}
