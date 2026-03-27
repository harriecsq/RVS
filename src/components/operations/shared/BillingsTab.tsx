import { useState, useEffect } from "react";
import { Plus, Eye, Receipt } from "lucide-react";
import type { Billing } from "../../../types/operations";
import { CreateBillingSidePanel } from "../../accounting/CreateBillingSidePanel";
import { BillingDetailPanel } from "../../accounting/BillingDetailPanel";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { NeuronStatusPill } from "../../NeuronStatusPill";
import { StandardLoadingState } from "../../design-system/StandardLoadingState";
import { StandardEmptyState } from "../../design-system/StandardEmptyState";
import { formatAmount } from "../../../utils/formatAmount";
import { API_BASE_URL } from '@/utils/api-config';

interface BillingsTabProps {
  bookingId: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  bookingType: "forwarding" | "brokerage" | "trucking" | "marine-insurance" | "others" | "import" | "export";
  currentUser?: { name: string; email: string; department: string } | null;
  /** When provided, row click selects the billing (for sub-tab embedding) instead of opening the side panel */
  onBillingSelect?: (billingId: string, billingNumber: string) => void;
}

type BillingStatus = "Draft" | "Submitted" | "Approved" | "Paid" | "Cancelled";

interface AccountingBilling {
  id: string;
  billingNumber: string;
  voucherId?: string;
  voucherNumber?: string;
  clientId: string;
  clientName: string;
  bookingId?: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  expenseAmount?: number;
  totalAmount: number;
  pendingAmount?: number;
  currency: string;
  status: BillingStatus;
  billingDate: string;
  created_at: string;
}

export function BillingsTab({ bookingId, bookingNumber, projectId: bookingProjectId, projectNumber, bookingType, currentUser, onBillingSelect }: BillingsTabProps) {
  const [billings, setBillings] = useState<AccountingBilling[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [billingsSummary, setBillingsSummary] = useState<any>(null);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillings();
  }, [bookingId]);

  const fetchBillings = async () => {
    setIsLoading(true);
    try {
      console.log(`🔍 [BillingsTab] Fetching billings for bookingId: ${bookingId}`);
      
      // Fetch billings from the main accounting module endpoint
      const response = await fetch(`${API_BASE_URL}/billings?bookingId=${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`📊 [BillingsTab] API Response:`, result);

      if (result.success) {
        console.log(`✅ [BillingsTab] Received ${result.data?.length || 0} billings`);
        result.data?.forEach((billing: any) => {
          console.log(`  - ${billing.billingNumber}: bookingIds = ${JSON.stringify(billing.bookingIds)}, bookingId = ${billing.bookingId}`);
        });
        
        setBillings(result.data || []);
        // Store the summary data from API response
        if (result.summary) {
          setBillingsSummary(result.summary);
        }
      } else {
        console.error('Error fetching billings:', result.error);
        toast.error('Error loading billings');
      }
    } catch (error) {
      console.error('Error fetching billings:', error);
      toast.error('Unable to load billings');
      setBillings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillingCreated = () => {
    setShowCreateModal(false);
    fetchBillings();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    const safeAmount = amount ?? 0;
    return `${currency} ${formatAmount(safeAmount)}`;
  };

  const totalAmount = billings.reduce((sum, billing) => sum + (billing.totalAmount || 0), 0);
  const paidAmount = billings
    .filter(b => b.status === "Paid")
    .reduce((sum, billing) => sum + (billing.totalAmount || 0), 0);

  return (
    <>
      <div style={{ padding: "32px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D", marginBottom: "8px" }}>
              Billings
            </h3>
            <p style={{ fontSize: "14px", color: "#667085", lineHeight: "20px" }}>
              Manage client billings and invoices for this booking
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: "white",
              backgroundColor: "#0F766E",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <Plus size={18} />
            Add Billing
          </button>
        </div>

        {/* Summary Cards */}
        {/* Removed Summary Cards as per request */}


        {/* Table */}
        {isLoading ? (
          <StandardLoadingState message="Loading billings..." />
        ) : billings.length === 0 ? (
          <StandardEmptyState
            icon={<Receipt size={48} />}
            title="No billings yet"
            description="Billings created for this booking will appear here"
            action={{
              label: "Add your first billing",
              onClick: () => setShowCreateModal(true)
            }}
          />
        ) : (
          <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr key="header-row" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Billing Number
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Client
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "Left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Amount
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Date
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {billings.map((billing, index) => (
                  <tr
                    key={billing.id || index}
                    onClick={() => {
                      if (onBillingSelect) {
                        onBillingSelect(billing.id, billing.billingNumber);
                      } else {
                        setSelectedBillingId(billing.id);
                      }
                    }}
                    className="border-b border-[#0A1D4D]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                  >
                    <td style={{ padding: "16px", fontSize: "14px", fontWeight: 500, color: "#0F766E" }}>
                      {billing.billingNumber}
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#0A1D4D" }}>
                      {billing.clientName}
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "#0A1D4D", textAlign: "left" }}>
                      <div>{formatCurrency(billing.totalAmount, billing.currency)}</div>
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#667085" }}>
                      {formatDate(billing.billingDate)}
                    </td>
                    <td style={{ padding: "16px", textAlign: "left" }}>
                      <NeuronStatusPill status={billing.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Billing Side Panel */}
      {showCreateModal && (
        <>
          {console.log("🔍 BillingsTab passing to CreateBillingSidePanel:", {
            bookingId,
            bookingNumber,
            projectId: bookingProjectId,
            projectNumber
          })}
          <CreateBillingSidePanel
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleBillingCreated}
            prefillProjectId={bookingProjectId}
            prefillProjectNumber={projectNumber}
            prefillBookingId={bookingId}
            prefillBookingNumber={bookingNumber}
          />
        </>
      )}

      {/* Billing Detail Panel */}
      {selectedBillingId && (
        <BillingDetailPanel
          isOpen={!!selectedBillingId}
          onClose={() => setSelectedBillingId(null)}
          billingId={selectedBillingId}
        />
      )}
    </>
  );
}