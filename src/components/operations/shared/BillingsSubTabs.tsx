import { useState, useEffect } from "react";
import { SubTabRow } from "./SubTabRow";
import { BillingsTab } from "./BillingsTab";
import { ViewBillingScreen } from "../../accounting/ViewBillingScreen";
import { CollectionsListTab } from "./CollectionsListTab";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';

interface BillingsSubTabsProps {
  bookingId: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  bookingType: "forwarding" | "brokerage" | "trucking" | "marine-insurance" | "others" | "import" | "export";
  currentUser?: { name: string; email: string; department: string } | null;
}

interface BillingRecord {
  id: string;
  billingNumber: string;
  totalAmount: number;
  status: string;
}

/**
 * BillingsSubTabs - Wraps the Billings tab with nested sub-tabs:
 * - Billing Details: Shows the BillingsTab list. When a billing is selected,
 *   shows the ViewBillingScreen in embedded mode.
 * - Collection Details: Shows CollectionsListTab for the selected billing
 *   (a module list view, not a single collection detail).
 *
 * When no billing is selected, shows the list view and hides the Collections sub-tab.
 */
export function BillingsSubTabs({
  bookingId,
  bookingNumber,
  projectId: bookingProjectId,
  projectNumber,
  bookingType,
  currentUser,
}: BillingsSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"billing-details" | "collections">("billing-details");
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);
  const [selectedBillingNumber, setSelectedBillingNumber] = useState<string>("");
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [collectionsCount, setCollectionsCount] = useState(0);

  // Fetch billings for this booking
  useEffect(() => {
    fetchBillings();
  }, [bookingId]);

  // When a billing is selected, fetch collections count
  useEffect(() => {
    if (selectedBillingId) {
      fetchCollectionsCount(selectedBillingId);
    } else {
      setCollectionsCount(0);
    }
  }, [selectedBillingId]);

  const fetchBillings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billings?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        setBillings(result.data || []);
        // Auto-select first billing if only one exists
        if (result.data?.length === 1) {
          setSelectedBillingId(result.data[0].id);
          setSelectedBillingNumber(result.data[0].billingNumber);
        }
      }
    } catch (error) {
      console.error("Error fetching billings for sub-tabs:", error);
    }
  };

  const fetchCollectionsCount = async (billingId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/collections?billingId=${billingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setCollectionsCount(result.data.length);
      }
    } catch (error) {
      console.error("Error fetching collections count:", error);
    }
  };

  const handleBillingSelected = (billingId: string, billingNumber: string) => {
    setSelectedBillingId(billingId);
    setSelectedBillingNumber(billingNumber);
    setActiveSubTab("billing-details");
  };

  const handleBackToList = () => {
    setSelectedBillingId(null);
    setSelectedBillingNumber("");
    setActiveSubTab("billing-details");
  };

  // Build sub-tabs - only show Collections when a billing is selected
  const subTabs = selectedBillingId
    ? [
        { id: "billing-details", label: "Billing Details" },
        { id: "collections", label: "Collection Details", badge: collectionsCount || undefined },
      ]
    : [{ id: "billing-details", label: "Billing Details" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub-tab row */}
      <SubTabRow
        tabs={subTabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as "billing-details" | "collections")}
      />

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSubTab === "billing-details" && !selectedBillingId && (
          <BillingsTab
            bookingId={bookingId}
            bookingNumber={bookingNumber}
            projectId={bookingProjectId}
            projectNumber={projectNumber}
            bookingType={bookingType}
            currentUser={currentUser}
            onBillingSelect={handleBillingSelected}
          />
        )}

        {activeSubTab === "billing-details" && selectedBillingId && (
          <div style={{ position: "relative" }}>
            {/* Back to list button */}
            {billings.length > 1 && (
              <div style={{ padding: "12px 48px 0" }}>
                <button
                  onClick={handleBackToList}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#0F766E",
                    background: "transparent",
                    border: "1px solid #E5E9F0",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F0FDF9";
                    e.currentTarget.style.borderColor = "#0F766E";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#E5E9F0";
                  }}
                >
                  ← All Billings
                </button>
              </div>
            )}
            <ViewBillingScreen
              billingId={selectedBillingId}
              embedded={true}
            />
          </div>
        )}

        {activeSubTab === "collections" && selectedBillingId && (
          <CollectionsListTab
            billingId={selectedBillingId}
            billingNumber={selectedBillingNumber}
            bookingId={bookingId}
            onUpdate={() => {
              fetchCollectionsCount(selectedBillingId);
              fetchBillings();
            }}
          />
        )}
      </div>
    </div>
  );
}