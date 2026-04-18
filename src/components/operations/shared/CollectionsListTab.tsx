import { useState, useEffect } from "react";
import { Plus, DollarSign } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { NeuronStatusPill } from "../../NeuronStatusPill";
import { CreateCollectionPanel } from "../../accounting/CreateCollectionPanel";
import { CollectionDetailPanel } from "../../accounting/CollectionDetailPanel";
import { formatAmount } from "../../../utils/formatAmount";
import { API_BASE_URL } from '@/utils/api-config';

interface Collection {
  id: string;
  collectionNumber: string;
  customerName: string;
  billingNumber?: string;
  projectNumber?: string;
  amount: number;
  collectionDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  bankName?: string;
  checkNumber?: string;
  status: string;
  createdAt: string;
  allocations?: any[];
}

interface CollectionsListTabProps {
  billingId: string;
  billingNumber?: string;
  bookingId?: string;
  onUpdate?: () => void;
}

/**
 * CollectionsListTab - A list view of collections filtered by billingId.
 * Follows the VouchersTab pattern: table list with drill-in to detail panel.
 */
export function CollectionsListTab({ billingId, billingNumber, bookingId, onUpdate }: CollectionsListTabProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [totalBillingsAmount, setTotalBillingsAmount] = useState(0);

  // Fetch collections and billing summary in parallel
  useEffect(() => {
    const fetches: Promise<void>[] = [fetchCollections()];
    if (bookingId) {
      fetches.push(fetchBillingsForBooking());
    }
    Promise.all(fetches);
  }, [billingId, bookingId]);

  const fetchBillingsForBooking = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billings?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const total = result.data.reduce((sum: number, b: any) => sum + (b.totalAmount || b.amount || 0), 0);
        setTotalBillingsAmount(total);
      }
    } catch (error) {
      console.error("Error fetching billings for summary cards:", error);
    }
  };

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/collections?billingId=${billingId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const data = result.data;
        data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setCollections(data);
      } else {
        setCollections([]);
      }
    } catch (error) {
      console.error("Error fetching collections for billing:", error);
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCollectionCreated = () => {
    setShowCreatePanel(false);
    fetchCollections();
    if (onUpdate) onUpdate();
  };

  const formatCurrency = (amount: number) => {
    return `\u20B1${formatAmount(amount || 0)}`;
  };

  // Summary card computations
  const collectedAmount = collections
    .filter((c) => c.status === "Collected")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingAmount = totalBillingsAmount - collectedAmount;

  const summaryCards = [
    { label: "Total Billing Amount", value: formatCurrency(totalBillingsAmount) },
    { label: "Collected", value: formatCurrency(collectedAmount) },
    { label: "Pending", value: formatCurrency(pendingAmount) },
  ];

  return (
    <>
      <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Summary Cards */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
          {summaryCards.map((card) => (
            <div
              key={card.label}
              style={{
                flex: 1,
                border: "1px solid #E5E9F0",
                borderRadius: "8px",
                padding: "20px 24px",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#0A1D4D",
                  marginTop: "8px",
                }}
              >
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          border: "1px solid #E5E9F0",
          borderRadius: "12px",
          backgroundColor: "#FFFFFF",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{
            padding: "24px",
            borderBottom: "1px solid #E5E9F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                Linked Collections
              </h3>
              <p style={{ fontSize: "14px", color: "#667085", marginTop: "4px", marginBottom: 0 }}>
                Payments collected against {billingNumber || "this billing"}
              </p>
            </div>

            <button
              onClick={() => setShowCreatePanel(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                borderRadius: "8px",
                background: "#0F766E",
                color: "white",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#0D6660"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#0F766E"}
            >
              <Plus size={16} />
              New Collection
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ color: "#667085", fontSize: "14px" }}>Loading collections...</div>
            </div>
          ) : collections.length > 0 ? (
            <div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E9F0" }}>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Collection Number</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Payment Method</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Linked Billing</th>
                    <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Amount</th>
                    <th style={{ padding: "12px 24px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((collection, index) => {
                    // Build linked billing IDs from allocations or legacy single billing
                    const linkedBillingNumbers: string[] = [];
                    if (collection.allocations && collection.allocations.length > 0) {
                      collection.allocations.forEach((a: any) => {
                        if (a.billingNumber) linkedBillingNumbers.push(a.billingNumber);
                      });
                    } else if (collection.billingNumber) {
                      linkedBillingNumbers.push(collection.billingNumber);
                    }

                    return (
                    <tr
                      key={collection.id || index}
                      style={{
                        borderBottom: index < collections.length - 1 ? "1px solid #E5E9F0" : "none",
                        transition: "background 0.15s ease",
                        cursor: "pointer"
                      }}
                      onClick={() => setSelectedCollection(collection)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#FFFFFF"}
                    >
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                          {collection.collectionNumber}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                          {formatDate(collection.collectionDate || collection.createdAt)}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                          {collection.paymentMethod || "\u2014"}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        {linkedBillingNumbers.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {linkedBillingNumbers.map((bn, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "#0F766E",
                                  display: "inline-block",
                                  width: "fit-content",
                                }}
                              >
                                {bn}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: "14px", color: "#9CA3AF" }}>{"\u2014"}</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                          {formatCurrency(collection.amount)}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "center" }}>
                        <NeuronStatusPill status={collection.status} />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <DollarSign size={40} style={{ color: "#E5E9F0", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
                No collections recorded yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Panel */}
      <CreateCollectionPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={handleCollectionCreated}
        preSelectedBillingId={billingId}
      />

      {/* Collection Detail Panel */}
      <CollectionDetailPanel
        collection={selectedCollection}
        isOpen={selectedCollection !== null}
        onClose={() => {
          setSelectedCollection(null);
          fetchCollections();
        }}
        onCollectionDeleted={() => {
          setSelectedCollection(null);
          fetchCollections();
          if (onUpdate) onUpdate();
        }}
        onCollectionUpdated={() => {
          fetchCollections();
          if (onUpdate) onUpdate();
        }}
      />
    </>
  );
}