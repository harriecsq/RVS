import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Receipt } from "lucide-react";
import { useLocation } from "react-router";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { publicAnonKey } from "../../utils/supabase/info";
import { useCachedFetch, invalidateCache } from "../../hooks/useCachedFetch";
import { formatAmount } from "../../utils/formatAmount";
import { toast } from "sonner@2.0.3";
import { CreateBillingSidePanel } from "./CreateBillingSidePanel";
import { ViewBillingScreen } from "./ViewBillingScreen";
import { StandardButton, StandardSearchInput, StandardEmptyState, SkeletonTable, StandardTable } from "../design-system";
import type { ColumnDef } from "../design-system";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter, clientSelectionMatches, type ClientSelection } from "../shared/CompanyClientFilter";
import { NeuronPageHeader } from "../NeuronPageHeader";
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { useClientsMasterList } from "../../hooks/useClientsMasterList";
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
  const { data: billingsResult, isLoading: isLoadingBillings, refetch: refetchBillings } = useCachedFetch<{ success: boolean; data: any[] }>("/billings");
  const { data: bookingsResult, isLoading: isLoadingBookings } = useCachedFetch<{ success: boolean; data: any[] }>("/bookings");
  const isLoading = isLoadingBillings || isLoadingBookings;
  const billings = useMemo<Billing[]>(() => {
    if (!billingsResult?.success) return [];
    const data = [...(billingsResult.data || [])];
    data.sort((a: any, b: any) => String(b.billingNumber || "").localeCompare(String(a.billingNumber || ""), undefined, { numeric: true }));
    return data;
  }, [billingsResult]);
  const [filteredBillings, setFilteredBillings] = useState<Billing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [portFilter, setPortFilter] = useState<string[]>([]);
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [clientSelections, setClientSelections] = useState<ClientSelection[]>([]);
  const bookingEnrichMapRef = useRef<Map<string, { serviceType: string; port: string }>>(new Map());
  const clientsMasterList = useClientsMasterList();
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { selectedBillingId?: string } | null;
    if (state?.selectedBillingId) {
      setSelectedBillingId(state.selectedBillingId);
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    if (!bookingsResult?.success) return;
    const enrichMap = new Map<string, { serviceType: string; port: string }>();
    (bookingsResult.data || []).forEach((b: any) => {
      const rawType = String(b.booking_type || b.shipmentType || b.mode || "").trim();
      const rawLower = rawType.toLowerCase();
      let serviceType: string;
      if (rawLower.includes("export") || rawLower === "exps") serviceType = "Export";
      else if (rawLower.includes("import") || rawLower === "imps") serviceType = "Import";
      else serviceType = rawType || "Import";
      const isImport = serviceType === "Import";
      const seg0 = b.segments?.[0];
      const port = isImport ? (b.pod || seg0?.pod || "") : (b.origin || seg0?.origin || "");
      const enrich = { serviceType, port };
      if (b.id) enrichMap.set(b.id, enrich);
      if (b.bookingId) enrichMap.set(b.bookingId, enrich);
    });
    bookingEnrichMapRef.current = enrichMap;
  }, [bookingsResult]);

  useEffect(() => {
    filterBillings();
  }, [searchQuery, statusFilter, serviceTypeFilter, portFilter, dateFilterStart, dateFilterEnd, clientSelections, billings]);

  const fetchBillings = () => { invalidateCache("/billings"); refetchBillings(); };

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
    if (statusFilter.length > 0) {
      filtered = filtered.filter((b) => statusFilter.includes(b.status));
    }
    if (serviceTypeFilter !== "all" || portFilter.length > 0) {
      filtered = filtered.filter((b) => {
        const bId = (b as any).bookingId || ((b as any).bookingIds)?.[0];
        const enrich = bId ? bookingEnrichMapRef.current.get(bId) : undefined;
        if (serviceTypeFilter !== "all") {
          if (!enrich?.serviceType.toLowerCase().includes(serviceTypeFilter.toLowerCase())) return false;
        }
        if (portFilter.length > 0) {
          if (!portFilter.some(p => (enrich?.port || "").toLowerCase().includes(p.toLowerCase()))) return false;
        }
        return true;
      });
    }
    if (dateFilterStart || dateFilterEnd) {
      filtered = filtered.filter((b) => {
        const billingISO = new Date(b.created_at).toISOString().split("T")[0];
        if (dateFilterStart && billingISO < dateFilterStart) return false;
        if (dateFilterEnd && billingISO > dateFilterEnd) return false;
        return true;
      });
    }
    if (clientSelections.length > 0) {
      filtered = filtered.filter((b) =>
        clientSelectionMatches(clientSelections, {
          company: b.companyName || b.clientName || "",
          client: b.clientName || "",
        })
      );
    }
    if (statusFilter.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const ai = statusFilter.indexOf(a.status);
        const bi = statusFilter.indexOf(b.status);
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
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
            <MultiSelectPortalDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "Draft", label: "Draft" },
                { value: "For Approval", label: "For Approval" },
                { value: "Approved", label: "Approved" },
                { value: "Completed", label: "Completed" },
                { value: "Partially Collected", label: "Partially Collected" },
                { value: "Cancelled", label: "Cancelled" },
              ]}
              placeholder="All Statuses"
            />
            <FilterSingleDropdown
              value={serviceTypeFilter}
              options={[
                { value: "all", label: "All Types" },
                { value: "Import", label: "Import" },
                { value: "Export", label: "Export" },
              ]}
              onChange={setServiceTypeFilter}
              placeholder="All Types"
            />
            <MultiSelectPortalDropdown
              value={portFilter}
              options={[
                { value: "Manila North", label: "Manila North" },
                { value: "Manila South", label: "Manila South" },
                { value: "CDO", label: "CDO" },
                { value: "Iloilo", label: "Iloilo" },
                { value: "Davao", label: "Davao" },
              ]}
              onChange={setPortFilter}
              placeholder="All Ports"
            />
            <CompanyClientFilter
              extraEntries={clientsMasterList}
              selected={clientSelections}
              onChange={setClientSelections}
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
          emptyTitle={searchQuery || statusFilter.length > 0 ? "No billings found matching your filters" : "No billings yet"}
          emptyDescription={searchQuery || statusFilter.length > 0 ? "Try adjusting your search criteria or filters" : "Create your first billing to get started"}
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
