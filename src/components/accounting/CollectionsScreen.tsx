import { useState, useEffect, useMemo } from "react";
import { Plus, DollarSign } from "lucide-react";
import { formatAmount } from "../../utils/formatAmount";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { CreateCollectionPanel } from "./CreateCollectionPanel";
import { ViewCollectionScreen } from "./ViewCollectionScreen";
import { publicAnonKey } from "../../utils/supabase/info";
import { useCachedFetch, invalidateCache } from "../../hooks/useCachedFetch";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter, clientSelectionMatches, type ClientSelection } from "../shared/CompanyClientFilter";
import { useClientsMasterList } from "../../hooks/useClientsMasterList";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
  StandardTable,
} from "../design-system";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import type { ColumnDef } from "../design-system";

interface CollectionsScreenProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

type CollectionStatus = "Draft" | "For Approval" | "Approved" | "Collected" | "Cancelled";

interface Collection {
  id: string;
  collectionNumber: string;
  customerName: string;
  billingNumber?: string;
  projectNumber?: string;
  amount: number;
  collectionDate: string;
  paymentMethod?: string;
  referenceNumber?: string;  // Payment Details
  notes?: string;            // Payment Details
  bankName?: string;         // Payment Details (Bank Transfer)
  checkNumber?: string;      // Payment Details (Check)
  status: CollectionStatus;
  createdAt: string;
  allocations?: any[];       // New field
}

export function CollectionsScreen({ currentUser }: CollectionsScreenProps) {
  const { data: collectionsResult, isLoading, refetch } = useCachedFetch<{ success: boolean; data: any[] }>("/collections");
  const collections = useMemo<Collection[]>(() => {
    if (!collectionsResult?.success || !Array.isArray(collectionsResult.data)) return [];
    const data = [...collectionsResult.data];
    data.sort((a: any, b: any) => String(b.collectionNumber || "").localeCompare(String(a.collectionNumber || ""), undefined, { numeric: true }));
    return data;
  }, [collectionsResult]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "collected" | "partial">("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [clientSelections, setClientSelections] = useState<ClientSelection[]>([]);
  const clientsMasterList = useClientsMasterList();

  const fetchCollections = () => { invalidateCache("/collections"); refetch(); };

  const handleViewCollection = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
  };

  const handleBackToList = () => {
    setSelectedCollectionId(null);
    fetchCollections();
  };

  // Get unique payment methods
  const uniquePaymentMethods = Array.from(new Set(collections.map(c => c.paymentMethod).filter(Boolean)));

  // Filter collections by tab first
  const getFilteredByTab = () => {
    let filtered = collections;

    if (activeTab === "pending") {
      filtered = collections.filter(c => c.status === "Pending");
    } else if (activeTab === "collected") {
      filtered = collections.filter(c => c.status === "Collected");
    } else if (activeTab === "partial") {
      filtered = collections.filter(c => c.status === "Partial");
    }

    return filtered;
  };

  // Apply all filters
  const filteredCollectionsRaw = getFilteredByTab().filter(collection => {
    // Search filter
    const matchesSearch =
      (collection.collectionNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.billingNumber && collection.billingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (collection.projectNumber && collection.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Time period filter
    if (dateFilterStart || dateFilterEnd) {
      const collectionDate = new Date(collection.collectionDate || collection.createdAt);
      const collectionISO = collectionDate.toISOString().split("T")[0];
      if (dateFilterStart && collectionISO < dateFilterStart) return false;
      if (dateFilterEnd && collectionISO > dateFilterEnd) return false;
    }

    // Status filter
    if (statusFilter.length > 0 && !statusFilter.includes(collection.status)) return false;

    // Payment method filter
    if (paymentMethodFilter !== "all" && collection.paymentMethod !== paymentMethodFilter) return false;

    // Company / client filter
    if (clientSelections.length > 0) {
      const collCompany = (collection as any).companyName || collection.customerName || "";
      if (!clientSelectionMatches(clientSelections, { company: collCompany, client: collection.customerName || "" })) return false;
    }

    return true;
  });

  const filteredCollections = statusFilter.length > 0
    ? [...filteredCollectionsRaw].sort((a, b) => {
        const ai = statusFilter.indexOf(a.status);
        const bi = statusFilter.indexOf(b.status);
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
      })
    : filteredCollectionsRaw;

  // Calculate counts for tabs
  const allCount = collections.length;
  const pendingCount = collections.filter(c => c.status === "Pending").length;
  const collectedCount = collections.filter(c => c.status === "Collected").length;
  const partialCount = collections.filter(c => c.status === "Partial").length;

  // Show view screen if a collection is selected
  if (selectedCollectionId) {
    const selectedCollection = collections.find(c => c.id === selectedCollectionId);
    if (selectedCollection) {
      return (
        <ViewCollectionScreen
          collection={selectedCollection}
          onBack={handleBackToList}
        />
      );
    }
  }

  const statusOptions = [
    { value: "Draft", label: "Draft" },
    { value: "For Approval", label: "For Approval" },
    { value: "Approved", label: "Approved" },
    { value: "Collected", label: "Collected" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  const paymentMethodOptions = [
    { value: "all", label: "All Payment Methods" },
    ...uniquePaymentMethods.map(method => ({ value: method as string, label: method as string })),
  ];

  const columns: ColumnDef<Collection>[] = [
    {
      header: "Collection Details",
      cell: (collection) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>
              {collection.collectionNumber}
            </div>
            {collection.customerName && (
              <div style={{ fontSize: "13px", color: "#667085" }}>
                {collection.customerName}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Amount",
      cell: (collection) => {
        const computedAmount = collection.allocations && collection.allocations.length > 0
          ? collection.allocations.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
          : collection.amount;
        return (
          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
            {"\u20B1"}{formatAmount(computedAmount)}
          </div>
        );
      },
    },
    {
      header: "Payment Method",
      cell: (collection) => (
        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
          {collection.paymentMethod || "\u2014"}
        </div>
      ),
    },
    {
      header: "Linked Billing",
      cell: (collection) => {
        const linkedBillingNumbers: string[] = [];
        if (collection.allocations && collection.allocations.length > 0) {
          collection.allocations.forEach((a: any) => {
            if (a.billingNumber) linkedBillingNumbers.push(a.billingNumber);
          });
        } else if (collection.billingNumber) {
          linkedBillingNumbers.push(collection.billingNumber);
        }

        return linkedBillingNumbers.length > 0 ? (
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
        );
      },
    },
    {
      header: "Status",
      cell: (collection) => <NeuronStatusPill status={collection.status} />,
    },
    {
      header: "Created",
      cell: (collection) => (
        <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
          {collection.collectionDate
            ? new Date(collection.collectionDate).toLocaleDateString()
            : new Date(collection.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <NeuronPageHeader
        title="Collections"
        subtitle="Track customer payments and receipts"
        action={
          <StandardButton
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            iconPosition="left"
            onClick={() => setShowCreateModal(true)}
          >
            New Collection
          </StandardButton>
        }
      />

      <div style={{ padding: "0 48px 24px 48px" }}>
        {/* Search Bar */}
        <div style={{ marginBottom: "24px" }}>
          <StandardSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Collection Number, Customer, Billing, or Project Number..."
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
          <MultiSelectPortalDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="All Statuses"
          />

          {/* Payment Method Filter */}
          <FilterSingleDropdown
            value={paymentMethodFilter}
            onChange={setPaymentMethodFilter}
            options={paymentMethodOptions}
          />

          {/* Company / Client Filter */}
          <CompanyClientFilter
            extraEntries={clientsMasterList}
            selected={clientSelections}
            onChange={setClientSelections}
            placeholder="All Companies"
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "0 48px 48px 48px" }}>
        <StandardTable
          data={filteredCollections}
          columns={columns}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          onRowClick={(c) => handleViewCollection(c.id)}
          emptyTitle={searchTerm || statusFilter.length > 0 ? "No collections match your filters" : "No collections yet"}
          emptyDescription={searchTerm || statusFilter.length > 0 ? undefined : "Record your first collection to get started"}
          emptyIcon={<DollarSign size={24} />}
        />
      </div>

      {/* Create Collection Side Panel */}
      <CreateCollectionPanel
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchCollections();
        }}
      />
    </div>
  );
}
