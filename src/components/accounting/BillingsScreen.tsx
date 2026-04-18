import { useState, useEffect } from "react";
import { Plus, Receipt } from "lucide-react";
import { useLocation } from "react-router";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { publicAnonKey } from "../../utils/supabase/info";
import { formatAmount } from "../../utils/formatAmount";
import { toast } from "sonner@2.0.3";
import { CreateBillingSidePanel } from "./CreateBillingSidePanel";
import { ViewBillingScreen } from "./ViewBillingScreen";
import { StandardButton, StandardSearchInput, StandardFilterDropdown, StandardEmptyState, SkeletonTable, StandardTable } from "../design-system";
import type { ColumnDef } from "../design-system";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";
import { NeuronPageHeader } from "../NeuronPageHeader";
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
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillings();
    const state = location.state as { selectedBillingId?: string } | null;
    if (state?.selectedBillingId) {
      setSelectedBillingId(state.selectedBillingId);
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    filterBillings();
  }, [searchQuery, statusFilter, dateFilterStart, dateFilterEnd, companyFilter, clientFilter, billings]);

  const fetchBillings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/billings`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        const data = result.data || [];
        data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setBillings(data);
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
    if (searchQuery) {
      filtered = filtered.filter(
        (b) =>
          b.billingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }
    if (dateFilterStart || dateFilterEnd) {
      filtered = filtered.filter((b) => {
        const billingISO = new Date(b.created_at).toISOString().split("T")[0];
        if (dateFilterStart && billingISO < dateFilterStart) return false;
        if (dateFilterEnd && billingISO > dateFilterEnd) return false;
        return true;
      });
    }
    if (companyFilter) {
      filtered = filtered.filter((b) => {
        const billingCompany = b.companyName || b.clientName || "";
        if (billingCompany !== companyFilter) return false;
        if (clientFilter && (b.clientName || "") !== clientFilter) return false;
        return true;
      });
    }
    setFilteredBillings(filtered);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const formatCurrency = (amount: number, currency: string = "PHP") =>
    `${currency} ${formatAmount(amount ?? 0)}`;

  if (selectedBillingId) {
    return <ViewBillingScreen billingId={selectedBillingId} onBack={() => { setSelectedBillingId(null); fetchBillings(); }} />;
  }

  const columns: ColumnDef<Billing>[] = [
    {
      header: "Billing Number",
      cell: (b) => (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>{b.billingNumber}</div>
      ),
    },
    {
      header: "Company / Client",
      cell: (b) => (
        <>
          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>{b.companyName || b.clientName || "—"}</div>
          {b.companyName && b.clientName && b.companyName !== b.clientName && (
            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>{b.clientName}</div>
          )}
        </>
      ),
    },
    {
      header: "Amount",
      cell: (b) => (
        <>
          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>{formatCurrency(b.totalAmount, b.currency)}</div>
          {(b.pendingAmount ?? b.totalAmount) > 0 && (
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#EF4444", marginTop: "2px" }}>
              Pending: ₱{formatAmount(b.pendingAmount ?? b.totalAmount)}
            </div>
          )}
        </>
      ),
    },
    {
      header: "Created",
      cell: (b) => <div style={{ fontSize: "13px", color: "#0A1D4D" }}>{formatDate(b.billingDate || b.created_at)}</div>,
    },
    {
      header: "Status",
      cell: (b) => <NeuronStatusPill status={b.status} />,
    },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF" }}>
      {/* Page Header */}
      <div style={{ borderBottom: "1px solid #E5E9F0", flexShrink: 0 }}>
        <NeuronPageHeader
          title="Billings"
          subtitle="Manage client billings and invoices"
          action={
            <StandardButton icon={<Plus size={18} />} onClick={() => setShowCreateScreen(true)}>
              Create Billing
            </StandardButton>
          }
        />

        {/* Search Bar */}
        <div style={{ padding: "0 48px 16px 48px" }}>
          <StandardSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by billing number, voucher, or client..."
            style={{ marginBottom: "16px" }}
          />

          {/* Filter Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div style={{ gridColumn: "span 2" }}>
              <UnifiedDateRangeFilter
                startDate={dateFilterStart}
                endDate={dateFilterEnd}
                onStartDateChange={setDateFilterStart}
                onEndDateChange={setDateFilterEnd}
                compact
              />
            </div>
            <StandardFilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
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
      </div>

      {/* Content */}
      <div style={{ padding: "32px 48px", flex: 1, overflow: "auto" }}>
        <StandardTable
          data={filteredBillings}
          columns={columns}
          rowKey={(b) => b.id}
          isLoading={isLoading}
          emptyIcon={<Receipt size={48} />}
          emptyTitle={searchQuery || statusFilter !== "all" ? "No billings found matching your filters" : "No billings yet"}
          emptyDescription={searchQuery || statusFilter !== "all" ? "Try adjusting your search criteria or filters" : "Create your first billing to get started"}
          onRowClick={(b) => setSelectedBillingId(b.id)}
        />
      </div>

      <CreateBillingSidePanel
        isOpen={showCreateScreen}
        onClose={() => setShowCreateScreen(false)}
        onSuccess={() => { setShowCreateScreen(false); fetchBillings(); }}
      />
    </div>
  );
}
