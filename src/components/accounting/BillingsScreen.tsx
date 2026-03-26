import { useState, useEffect } from "react";
import { Plus, Search, Filter, Download, Eye, Receipt } from "lucide-react";
import { useLocation } from "react-router";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { formatAmount } from "../../utils/formatAmount";
import { toast } from "sonner@2.0.3";
import { CreateBillingSidePanel } from "./CreateBillingSidePanel";
import { ViewBillingScreen } from "./ViewBillingScreen";
import { StandardButton } from "../design-system/StandardButton";
import { StandardSearchInput } from "../design-system/StandardSearchInput";
import { StandardFilterDropdown } from "../design-system/StandardFilterDropdown";
import { StandardLoadingState } from "../design-system/StandardLoadingState";
import { StandardEmptyState } from "../design-system/StandardEmptyState";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";
import { API_BASE_URL } from '@/utils/api-config';

type BillingStatus = "Draft" | "Submitted" | "Approved" | "Paid" | "Completed" | "Cancelled";

interface Billing {
  id: string;
  billingNumber: string;
  voucherId: string;
  voucherNumber: string;
  clientId: string;
  clientName: string;
  companyName?: string;
  bookingId?: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  expenseAmount: number;
  totalAmount: number;
  pendingAmount?: number;
  currency: string;
  status: BillingStatus;
  billingDate: string;
  created_at: string;
}

export function BillingsScreen() {
  const location = useLocation();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [filteredBillings, setFilteredBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillings();
    
    // Check if we have a billing ID from navigation state (only used when coming from main accounting navigation)
    const state = location.state as { selectedBillingId?: string } | null;
    if (state?.selectedBillingId) {
      setSelectedBillingId(state.selectedBillingId);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    filterBillings();
  }, [searchQuery, statusFilter, dateFilterStart, dateFilterEnd, categoryFilter, paymentMethodFilter, companyFilter, clientFilter, billings]);

  const fetchBillings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/billings`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        setBillings(result.data || []);
      } else {
        toast.error("Failed to load billings");
      }
    } catch (error) {
      console.error("Error fetching billings:", error);
      toast.error("Failed to load billings");
    } finally {
      setIsLoading(false);
    }
  };

  const filterBillings = () => {
    let filtered = billings;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (b) =>
          b.billingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Filter by time period
    if (dateFilterStart || dateFilterEnd) {
      filtered = filtered.filter((b) => {
        const billingDate = new Date(b.created_at);
        const billingISO = billingDate.toISOString().split("T")[0];
        if (dateFilterStart && billingISO < dateFilterStart) return false;
        if (dateFilterEnd && billingISO > dateFilterEnd) return false;
        return true;
      });
    }

    // Filter by category
    if (categoryFilter !== "all") {
      // Add category filtering logic here
    }

    // Filter by payment method
    if (paymentMethodFilter !== "all") {
      // Add payment method filtering logic here
    }

    // Company / Client filter
    if (companyFilter) {
      filtered = filtered.filter((b) => {
        const billingCompany = b.companyName || b.clientName || "";
        if (billingCompany !== companyFilter) return false;
        if (clientFilter) {
          const billingClient = b.clientName || "";
          if (billingClient !== clientFilter) return false;
        }
        return true;
      });
    }

    setFilteredBillings(filtered);
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

  const handleViewBilling = (billingId: string) => {
    setSelectedBillingId(billingId);
  };

  const handleBackToList = () => {
    setSelectedBillingId(null);
    fetchBillings();
  };

  const handleBillingCreated = () => {
    fetchBillings();
  };

  // If viewing a specific billing, show the view screen
  if (selectedBillingId) {
    return <ViewBillingScreen billingId={selectedBillingId} onBack={handleBackToList} />;
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF" }}>
      {/* Page Header */}
      <div style={{ padding: "32px 48px", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 600,
                color: "#12332B",
                letterSpacing: "-1.2px",
                margin: 0,
                marginBottom: "8px",
              }}
            >
              Billings
            </h1>
            <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
              Manage client billings and invoices
            </p>
          </div>
          <StandardButton
            onClick={() => setShowCreateScreen(true)}
            label="Create Billing"
            icon={<Plus size={18} />}
          />
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#667085",
            }}
          />
          <input
            type="text"
            placeholder="Search by billing number, voucher, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
            }}
          />
        </div>

        {/* Filter Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          {/* Time Period Filter */}
          <div style={{ gridColumn: "span 2" }}>
            <UnifiedDateRangeFilter
              startDate={dateFilterStart}
              endDate={dateFilterEnd}
              onStartDateChange={setDateFilterStart}
              onEndDateChange={setDateFilterEnd}
              compact
            />
          </div>

          {/* Status Filter */}
          <StandardFilterDropdown
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Draft", label: "Draft" },
              { value: "For Approval", label: "For Approval" },
              { value: "Approved", label: "Approved" },
              { value: "Completed", label: "Completed" },
              { value: "Partially Collected", label: "Partially Collected" },
              { value: "Cancelled", label: "Cancelled" },
            ]}
          />

          {/* Company / Client Filter */}
          <CompanyClientFilter
            items={billings}
            getCompany={(b) => b.companyName || b.clientName || ""}
            getClient={(b) => b.clientName || ""}
            selectedCompany={companyFilter}
            selectedClient={clientFilter}
            onCompanyChange={setCompanyFilter}
            onClientChange={setClientFilter}
            placeholder="All Companies"
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 48px", flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <StandardLoadingState message="Loading billings..." />
        ) : filteredBillings.length === 0 ? (
          <StandardEmptyState
            icon={<Receipt size={48} />}
            title={searchQuery || statusFilter !== "all" ? "No billings found matching your filters" : "No billings yet"}
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your search criteria or filters" : "Create your first billing to get started"}
            action={
              !searchQuery && statusFilter === "all" ? {
                label: "Create Billing",
                onClick: () => setShowCreateScreen(true)
              } : undefined
            }
          />
        ) : (
          <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr key="header-row" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                  <th
                    className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide"
                  >
                    Billing Number
                  </th>
                  <th
                    className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide"
                  >
                    Company / Client
                  </th>

                  <th
                    className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide"
                  >
                    Amount
                  </th>
                  <th
                    className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide"
                  >
                    Created
                  </th>
                  <th
                    className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBillings.map((billing) => {
                  // Normalize billing ID and number to handle different field names
                  const billingId = billing.id || (billing as any).billingId || (billing as any).billing_id;
                  const billingNumber = billing.billingNumber || (billing as any).billing_number || billingId;
                  
                  return (
                  <tr
                    key={billingId || Math.random()}
                    className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                    onClick={() => handleViewBilling(billingId)}
                  >
                    <td className="py-4 px-4">
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: 600, 
                        color: "#12332B"
                      }}>
                        {billing.billingNumber}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {billing.companyName || billing.clientName || "—"}
                      </div>
                      {billing.companyName && billing.clientName && billing.companyName !== billing.clientName && (
                        <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                          {billing.clientName}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B"}}>
                        {formatCurrency(billing.totalAmount, billing.currency)}
                      </div>
                      {(billing.pendingAmount ?? billing.totalAmount) > 0 && (
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#DC2626", marginTop: "2px" }}>
                          Pending: ₱{formatAmount(billing.pendingAmount ?? billing.totalAmount)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "13px", color: "#12332B" }}>
                        {formatDate(billing.billingDate || billing.created_at)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <NeuronStatusPill status={billing.status} />
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Billing Side Panel */}
      <CreateBillingSidePanel
        isOpen={showCreateScreen}
        onClose={() => setShowCreateScreen(false)}
        onSuccess={() => {
          setShowCreateScreen(false);
          handleBillingCreated();
        }}
      />
    </div>
  );
}