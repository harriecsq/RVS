import { useState, useEffect } from "react";
import { Receipt } from "lucide-react";
import { SubTabRow } from "./SubTabRow";
import { ViewBillingScreen } from "../../accounting/ViewBillingScreen";
import { CreateBillingSidePanel } from "../../accounting/CreateBillingSidePanel";
import { CollectionsListTab } from "./CollectionsListTab";
import { AttachmentsTab } from "../../shared/AttachmentsTab";
import { StandardLoadingState } from "../../design-system/StandardLoadingState";
import { StandardEmptyState } from "../../design-system/StandardEmptyState";
import { publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';

interface BillingsSubTabsProps {
  bookingId: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  bookingType: "forwarding" | "brokerage" | "trucking" | "marine-insurance" | "others" | "import" | "export";
  currentUser?: { name: string; email: string; department: string } | null;
  segmentId?: string;
  /** When provided, edit mode is controlled externally (from parent's tab row). */
  externalEdit?: boolean;
  /** Called when edit state changes in the embedded billing screen. */
  onEditStateChange?: (editing: boolean) => void;
  /** Called when a billing record is selected/deselected. Parent uses this to show/hide Edit button. */
  onRecordSelected?: (hasSelection: boolean) => void;
  /** Increment to trigger save from parent. */
  externalSaveCounter?: number;
}

/**
 * BillingsSubTabs — one billing per booking.
 *
 * Resolves the booking's billing on mount and goes straight to ViewBillingScreen.
 * If none exists, shows an empty state with a Create action.
 */
export function BillingsSubTabs({
  bookingId,
  bookingNumber,
  projectId: bookingProjectId,
  projectNumber,
  externalEdit,
  onEditStateChange,
  onRecordSelected,
  externalSaveCounter,
}: BillingsSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"billing-details" | "collections" | "attachments">("billing-details");
  const [billingId, setBillingId] = useState<string | null>(null);
  const [billingNumberResolved, setBillingNumberResolved] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [collectionsCount, setCollectionsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setBillingId(null);
    setBillingNumberResolved("");
    onRecordSelected?.(false);

    fetch(`${API_BASE_URL}/billings?bookingId=${bookingId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((result) => {
        if (cancelled) return;
        const first = result?.success && Array.isArray(result.data) ? result.data[0] : null;
        if (first) {
          setBillingId(first.id);
          setBillingNumberResolved(first.billingNumber || "");
          onRecordSelected?.(true);
        }
      })
      .catch((err) => console.error("Error fetching billing for booking:", err))
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [bookingId]);

  useEffect(() => {
    if (!billingId) { setCollectionsCount(0); return; }
    fetch(`${API_BASE_URL}/collections?billingId=${billingId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((result) => {
        if (result?.success && Array.isArray(result.data)) setCollectionsCount(result.data.length);
      })
      .catch((err) => console.error("Error fetching collections count:", err));
  }, [billingId]);

  const handleBillingCreated = () => {
    setShowCreateModal(false);
    // Re-resolve after creation
    setIsLoading(true);
    fetch(`${API_BASE_URL}/billings?bookingId=${bookingId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((result) => {
        const first = result?.success && Array.isArray(result.data) ? result.data[0] : null;
        if (first) {
          setBillingId(first.id);
          setBillingNumberResolved(first.billingNumber || "");
          onRecordSelected?.(true);
        }
      })
      .catch((err) => console.error("Error refreshing billing after create:", err))
      .finally(() => setIsLoading(false));
  };

  const subTabs = billingId
    ? [
        { id: "billing-details", label: "Billing Details" },
        { id: "collections", label: "Collection Details", badge: collectionsCount || undefined },
        { id: "attachments", label: "Attachments" },
      ]
    : [{ id: "billing-details", label: "Billing Details" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SubTabRow
        tabs={subTabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as "billing-details" | "collections" | "attachments")}
      />

      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSubTab === "billing-details" && (
          isLoading ? (
            <StandardLoadingState message="Loading billing..." />
          ) : billingId ? (
            <div style={{ position: "relative" }}>
              <ViewBillingScreen
                billingId={billingId}
                embedded={true}
                externalEdit={externalEdit}
                onEditStateChange={onEditStateChange}
                externalSaveCounter={externalSaveCounter}
              />
            </div>
          ) : (
            <StandardEmptyState
              icon={<Receipt size={48} />}
              title="No billing yet"
              description="Create a billing for this booking."
              action={{ label: "Add billing", onClick: () => setShowCreateModal(true) }}
            />
          )
        )}

        {activeSubTab === "collections" && billingId && (
          <CollectionsListTab
            billingId={billingId}
            billingNumber={billingNumberResolved}
            bookingId={bookingId}
            onUpdate={() => {
              if (!billingId) return;
              fetch(`${API_BASE_URL}/collections?billingId=${billingId}`, {
                headers: { Authorization: `Bearer ${publicAnonKey}` },
              })
                .then((r) => r.json())
                .then((result) => {
                  if (result?.success && Array.isArray(result.data)) setCollectionsCount(result.data.length);
                })
                .catch(() => {});
            }}
          />
        )}

        {activeSubTab === "attachments" && billingId && (
          <AttachmentsTab entityType="billing" entityId={billingId} />
        )}
      </div>

      {showCreateModal && (
        <CreateBillingSidePanel
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleBillingCreated}
          prefillProjectId={bookingProjectId}
          prefillProjectNumber={projectNumber}
          prefillBookingId={bookingId}
          prefillBookingNumber={bookingNumber}
        />
      )}
    </div>
  );
}