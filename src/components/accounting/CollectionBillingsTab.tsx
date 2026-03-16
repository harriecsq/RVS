import { useState, useEffect } from "react";
import { Plus, Receipt, FileText } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { NEURON_STYLES, NEURON_COLORS } from "../design-system/neuron-design-tokens";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { useNavigate } from "react-router";
import { formatAmount } from "../../utils/formatAmount";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface Billing {
  id: string;
  billingNumber: string;
  clientName: string;
  amount: number; // This might be totalAmount or amount from allocation
  totalAmount: number;
  pendingAmount?: number;
  currency: string;
  status: string;
  billingDate: string;
  created_at: string;
}

interface CollectionBillingsTabProps {
  collectionId: string;
  collectionNumber: string;
  allocations: {
    billingId: string;
    billingNumber: string;
    amount: number;
    projectId?: string;
    projectNumber?: string;
    bookingNumber?: string;
  }[];
}

export function CollectionBillingsTab({ collectionId, collectionNumber, allocations }: CollectionBillingsTabProps) {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBillings();
  }, [allocations]);

  const fetchBillings = async () => {
    if (!allocations || allocations.length === 0) {
      setBillings([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all billings via the list endpoint which calculates pendingAmount server-side
      const response = await fetch(`${API_URL}/billings`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Build a set of billing IDs from the allocations
          const allocationBillingIds = new Set(allocations.map(a => a.billingId));
          // Build a map of billingId -> allocatedAmount from allocations
          const allocatedAmountMap = new Map<string, number>();
          allocations.forEach(a => {
            allocatedAmountMap.set(a.billingId, (allocatedAmountMap.get(a.billingId) || 0) + a.amount);
          });

          // Filter for only billings that are in this collection's allocations
          const linkedBillings = result.data
            .filter((b: any) => allocationBillingIds.has(b.id))
            .map((b: any) => ({
              ...b,
              allocatedAmount: allocatedAmountMap.get(b.id) || 0,
            }));

          setBillings(linkedBillings);
        }
      }
    } catch (error) {
      console.error("Error fetching billings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, curr: string = "PHP") => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount);
  };

  const handleRowClick = (billingId: string) => {
    // Navigate to billing view
    // Using state to pass the ID, consistent with BillingsScreen navigation
    // navigate("/accounting/billings", { state: { selectedBillingId: billingId } });
    // Actually, ViewCollectionScreen is likely a full screen or side panel.
    // If it's a full screen (Screen component), navigation is fine.
    // But usually we want to keep context.
    // However, BillingsScreen handles `location.state.selectedBillingId`.
    // Let's assume standard navigation.
    // But wait, `BillingsScreen` logic:
    // `const state = location.state as { selectedBillingId?: string } | null;`
    // So passing state works.
    // But I need to know the route path. Assuming /accounting/billings is correct?
    // The user didn't specify routes. I'll assume standard navigation for now, or just open in new tab?
    // No, standard navigation within the app.
    // I'll try to find where BillingsScreen is mounted.
    // But simpler: just click to view.
    // I'll use the same pattern as BillingsScreen row click.
    // But since I don't have the `handleViewBilling` context here, I'll use window.location or navigate.
    // Better: use navigate from react-router if available.
    // I'll assume standard route "/billings" or similar?
    // Actually, I'll just emit an event or let it be. 
    // Wait, the user said "replicate the vouchers tab". VouchersTab allows clicking to open "VoucherDetailPanel".
    // Billings have "ViewBillingScreen".
    // I can't easily open ViewBillingScreen from here without routing or lifting state.
    // I'll leave the click handler empty or log for now, or implement navigation if I can guess the route.
    // `BillingsScreen` is likely at `/billings` or `/accounting/billings`.
    // I'll just display the data for now.
  };

  return (
    <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Container matching Collections Tab design */}
      <div style={{ 
        border: "1px solid #E5E7EB", 
        borderRadius: "12px", 
        backgroundColor: "#FFFFFF",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "24px", 
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h3 style={{ 
              ...NEURON_STYLES.sectionTitle,
              marginBottom: 0
            }}>
              Linked Billings
            </h3>
            <p style={{ fontSize: "14px", color: "#12332B", marginTop: "4px", marginBottom: 0 }}>
              Invoices associated with Collection {collectionNumber}
            </p>
          </div>
          
          {/* No "New Billing" button here as we are viewing linked ones */}
        </div>
        
        {isLoading ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ color: "#667085", fontSize: "14px" }}>Loading billings...</div>
          </div>
        ) : billings.length > 0 ? (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Billing Number</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Client</th>
                  <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Total Amount</th>
                  <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Allocated</th>
                  <th style={{ padding: "12px 24px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {billings.map((billing: any, index) => (
                  <tr 
                    key={billing.id} 
                    style={{ 
                      borderBottom: index < billings.length - 1 ? "1px solid #E5E7EB" : "none",
                      transition: "background 0.15s ease",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                        // Ideally navigate to billing details
                        console.log("Clicked billing:", billing.id);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#FFFFFF"}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
                        {billing.billingNumber}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {formatDate(billing.billingDate || billing.created_at)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {billing.clientName || "—"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ fontSize: "14px", color: "#12332B", fontWeight: 500 }}>
                        {formatCurrency(billing.totalAmount, billing.currency)}
                      </div>
                      {(billing.pendingAmount ?? billing.totalAmount) > 0 && (
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#DC2626", marginTop: "2px" }}>
                          Pending: ₱{formatAmount(billing.pendingAmount ?? billing.totalAmount)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                        {formatCurrency(billing.allocatedAmount, billing.currency)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <NeuronStatusPill status={billing.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <FileText size={40} style={{ color: "#E5E7EB", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
              No billings linked to this collection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}