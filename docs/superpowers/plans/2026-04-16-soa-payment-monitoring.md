# SOA Payment Monitoring Report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "SOA Payment Monitoring" report to the Report Library that shows billing payment status with linked collection details.

**Architecture:** Single standalone component (`SOAPaymentMonitoringReport.tsx`) fetching `/billings`, `/collections`, `/bookings` in parallel, joining client-side, rendering a filtered/paginated table with KPI summary cards. Follows the exact pattern established by `FinalShipmentCostReport.tsx`.

**Tech Stack:** React 18, TypeScript, inline styles (NEURON design tokens), Vite, existing shared components (`UnifiedDateRangeFilter`, `formatAmount`)

**Spec:** `docs/superpowers/specs/2026-04-16-soa-payment-monitoring-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/reports/SOAPaymentMonitoringReport.tsx` | Create | Entire report: data fetching, join logic, filters, KPIs, table, pagination, CSV export |
| `src/components/Reports.tsx` | Modify | Add entry to `accountingReports` array |
| `src/App.tsx` | Modify | Add import, wrapper function, route |

---

### Task 1: Create the SOA Payment Monitoring Report Component

**Files:**
- Create: `src/components/reports/SOAPaymentMonitoringReport.tsx`

This is the main component. It follows the exact structure of `FinalShipmentCostReport.tsx`.

- [ ] **Step 1: Create the file with interfaces, types, and helper components**

```tsx
import { useState, useEffect } from "react";
import { Download, Filter, ChevronLeft, ChevronRight, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';

// --- Data Interfaces ---

interface Booking {
  id: string;
  bookingId?: string;
  bookingNumber?: string;
  customerName?: string;
  clientName?: string;
  client?: string;
  shipper?: string;
  commodity?: string;
  containerNo?: string;
  containerNumbers?: string[];
  containers?: any[];
  mode?: string;
  shipmentType?: string;
  origin?: string; // POL for export
  pod?: string;    // POD for import
}

interface Billing {
  id: string;
  bookingId?: string;
  bookingIds?: string[];
  bookingNumber?: string;
  billingNumber?: string;
  soaNumber?: string;
  clientName?: string;
  totalAmount: number;
  billingDate: string;
  currency?: string;
  status?: string;
}

interface CollectionAllocation {
  billingId: string;
  billingNumber?: string;
  amount: number;
}

interface Collection {
  id: string;
  collectionNumber?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  checkNumber?: string;
  checkNo?: string;
  bankName?: string;
  amount: number;
  collectionDate: string;
  status?: string;
  allocations?: CollectionAllocation[];
  billingId?: string;
  invoiceIds?: string[];
}

// --- Row type for the report table ---

interface SOAPaymentRow {
  id: string;
  clientName: string;
  commodity: string;
  containerNumbers: string[];
  soaNumber: string;
  soaAmount: number;
  nameCheck: string;        // "CASH" or referenceNumber(s), comma-separated
  checkAmount: number;      // Sum of allocations for this billing
  dateOfPayment: string;    // Collection date(s), comma-separated
  billingDate: string;      // For filtering (SOA date)
  serviceType: string;      // Import/Export from linked booking
  port: string;             // POD (import) or origin/POL (export) from linked booking
}

// --- Filter state ---

interface FilterState {
  dateStart: string;
  dateEnd: string;
  serviceType: string;
  port: string;
  client: string;
  searchQuery: string;
}

// --- Helper Components ---

function KPICard({ label, value, color = "var(--neuron-brand-green)" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      backgroundColor: "white",
      border: "1px solid var(--neuron-ui-border)",
      borderRadius: "12px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }}>
      <div style={{
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--neuron-ink-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "28px",
        fontWeight: 700,
        color: color
      }}>
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the main component with state, data fetching, and join logic**

Append to the same file after the helper components:

```tsx
const PORT_OPTIONS = ["All", "Manila North", "Manila South", "CDO", "Iloilo", "Davao"];

export function SOAPaymentMonitoringReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    dateStart: "",
    dateEnd: "",
    serviceType: "All",
    port: "All",
    client: "",
    searchQuery: ""
  });

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<SOAPaymentRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${publicAnonKey}` };

      const [bookingsRes, billingsRes, collectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings`, { headers }),
        fetch(`${API_BASE_URL}/billings`, { headers }),
        fetch(`${API_BASE_URL}/collections`, { headers })
      ]);

      const bookingsData = await bookingsRes.json();
      const billingsData = await billingsRes.json();
      const collectionsData = await collectionsRes.json();

      const bookings: Booking[] = bookingsData.success ? bookingsData.data : [];
      const billings: Billing[] = billingsData.success ? billingsData.data : [];
      const collections: Collection[] = collectionsData.success ? collectionsData.data : [];

      // --- Build booking lookup map (by id and bookingId) ---
      const bookingMap = new Map<string, Booking>();
      bookings.forEach(b => {
        if (b.id) bookingMap.set(b.id, b);
        if (b.bookingId) bookingMap.set(b.bookingId, b);
        if (b.bookingNumber) bookingMap.set(b.bookingNumber, b);
      });

      // --- Build collection-to-billing lookup ---
      // Maps billingId -> array of { collection, allocationAmount }
      const collectionsByBillingId = new Map<string, { collection: Collection; allocationAmount: number }[]>();

      collections.forEach(c => {
        // Handle allocations (primary format)
        if (c.allocations && Array.isArray(c.allocations)) {
          c.allocations.forEach(alloc => {
            if (alloc.billingId) {
              if (!collectionsByBillingId.has(alloc.billingId)) collectionsByBillingId.set(alloc.billingId, []);
              collectionsByBillingId.get(alloc.billingId)!.push({
                collection: c,
                allocationAmount: Number(alloc.amount) || 0
              });
            }
          });
        }

        // Handle legacy billingId
        if (c.billingId) {
          if (!collectionsByBillingId.has(c.billingId)) collectionsByBillingId.set(c.billingId, []);
          const list = collectionsByBillingId.get(c.billingId)!;
          if (!list.some(entry => entry.collection.id === c.id)) {
            list.push({ collection: c, allocationAmount: Number(c.amount) || 0 });
          }
        }

        // Handle legacy invoiceIds
        if (c.invoiceIds && Array.isArray(c.invoiceIds)) {
          c.invoiceIds.forEach(invId => {
            if (!collectionsByBillingId.has(invId)) collectionsByBillingId.set(invId, []);
            const list = collectionsByBillingId.get(invId)!;
            if (!list.some(entry => entry.collection.id === c.id)) {
              list.push({ collection: c, allocationAmount: Number(c.amount) || 0 });
            }
          });
        }
      });

      // --- Assemble rows: one per billing ---
      const rows: SOAPaymentRow[] = billings.map(billing => {
        // Resolve linked booking
        const booking = bookingMap.get(billing.bookingId || "") ||
                        bookingMap.get(billing.bookingNumber || "");

        // Client name: prefer billing's clientName, fallback to booking
        const clientName = billing.clientName ||
          (booking ? (booking.customerName || booking.clientName || booking.client || booking.shipper) : null) ||
          "—";

        // Commodity & containers from booking
        const commodity = booking?.commodity || "—";
        let containerNumbers: string[] = [];
        if (booking) {
          if (booking.containerNumbers && Array.isArray(booking.containerNumbers)) {
            containerNumbers = booking.containerNumbers;
          } else if (booking.containers && Array.isArray(booking.containers)) {
            containerNumbers = booking.containers.map((c: any) => c.containerNumber || c.container_number).filter(Boolean);
          } else if (booking.containerNo) {
            containerNumbers = booking.containerNo.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        // Service type and port from booking
        const serviceType = booking?.mode || booking?.shipmentType || "Import";
        const isImport = serviceType.toLowerCase().includes("import");
        const port = isImport ? (booking?.pod || "—") : (booking?.origin || "—");

        // SOA details
        const soaNumber = billing.billingNumber || billing.soaNumber || "—";
        const soaAmount = Number(billing.totalAmount) || 0;

        // Collection details for this billing
        const linkedCollections = collectionsByBillingId.get(billing.id) || [];

        let nameCheckParts: string[] = [];
        let checkAmountTotal = 0;
        let paymentDates: string[] = [];

        linkedCollections.forEach(({ collection, allocationAmount }) => {
          // Name/Check: referenceNumber or "CASH"
          const isCash = collection.paymentMethod?.toLowerCase() === "cash";
          const refNum = collection.referenceNumber || collection.checkNumber || collection.checkNo;
          const nameCheck = isCash ? "CASH" : (refNum || "—");
          if (!nameCheckParts.includes(nameCheck)) nameCheckParts.push(nameCheck);

          // Check amount: allocation amount for this specific billing
          checkAmountTotal += allocationAmount;

          // Payment date
          if (collection.collectionDate) {
            const formatted = new Date(collection.collectionDate).toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            if (!paymentDates.includes(formatted)) paymentDates.push(formatted);
          }
        });

        return {
          id: billing.id,
          clientName,
          commodity,
          containerNumbers,
          soaNumber,
          soaAmount,
          nameCheck: nameCheckParts.join(", ") || "—",
          checkAmount: checkAmountTotal,
          dateOfPayment: paymentDates.join(", ") || "—",
          billingDate: billing.billingDate || "",
          serviceType,
          port
        };
      });

      // Sort by billing date descending
      rows.sort((a, b) => new Date(b.billingDate).getTime() - new Date(a.billingDate).getTime());

      setData(rows);
    } catch (error) {
      console.error("Error fetching SOA Payment Monitoring data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };
```

- [ ] **Step 3: Add filter logic, KPI computation, pagination, and CSV export**

Continue in the same component function, after `fetchData`:

```tsx
  // --- Filter Logic ---
  const filteredData = data.filter(item => {
    // Search query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matches =
        item.soaNumber.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.commodity.toLowerCase().includes(q) ||
        item.containerNumbers.some(c => c.toLowerCase().includes(q));
      if (!matches) return false;
    }

    // Service type
    if (filters.serviceType !== "All") {
      if (!item.serviceType.toLowerCase().includes(filters.serviceType.toLowerCase())) return false;
    }

    // Port (only active when service type is selected)
    if (filters.serviceType !== "All" && filters.port !== "All") {
      if (!item.port.toLowerCase().includes(filters.port.toLowerCase())) return false;
    }

    // Client
    if (filters.client) {
      if (!item.clientName.toLowerCase().includes(filters.client.toLowerCase())) return false;
    }

    // Date range (based on billing date / SOA date)
    if (filters.dateStart && item.billingDate < filters.dateStart) return false;
    if (filters.dateEnd && item.billingDate > filters.dateEnd) return false;

    return true;
  });

  // --- KPIs ---
  const totalSOAs = filteredData.length;
  const totalSOAAmount = filteredData.reduce((sum, row) => sum + row.soaAmount, 0);
  const totalCollected = filteredData.reduce((sum, row) => sum + row.checkAmount, 0);
  const outstandingBalance = totalSOAAmount - totalCollected;

  // --- Pagination ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const formatCurrency = (val: number) => `₱${formatAmount(val)}`;

  // --- CSV Export ---
  const handleExport = () => {
    if (!filteredData.length) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "No.", "Client Name", "Commodity", "Container Number",
      "SOA No.", "SOA Amount", "Name/Check", "Check Amount", "Date of Payment"
    ];

    const rows = filteredData.map((row, index) => [
      (index + 1).toString(),
      row.clientName,
      row.commodity,
      row.containerNumbers.join(", "),
      row.soaNumber,
      row.soaAmount.toString(),
      row.nameCheck,
      row.checkAmount.toString(),
      row.dateOfPayment
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SOAPaymentMonitoring_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exporting to Excel...");
  };
```

- [ ] **Step 4: Add the JSX return — header, filters, KPIs, table, pagination**

Continue in the same component, the `return` statement:

```tsx
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", paddingBottom: "48px" }}>
      <div style={{ padding: "32px 48px 24px 48px", maxWidth: "1440px", width: "100%", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => navigate("/reports")}
              style={{
                background: "transparent",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#6B7280",
                borderRadius: "6px"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{
                fontSize: "32px",
                fontWeight: 600,
                color: "#0A1D4D",
                marginBottom: "4px",
                letterSpacing: "-1.2px"
              }}>
                SOA Payment Monitoring
              </h1>
              <p style={{ fontSize: "14px", color: "#667085" }}>
                Track billing payments, check details, and collection status
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            style={{
              height: "40px",
              padding: "0 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--neuron-brand-green)",
              backgroundColor: "var(--neuron-state-selected)",
              border: "1px solid var(--neuron-brand-green)",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: "var(--neuron-bg-elevated)",
          border: "1px solid var(--neuron-ui-border)",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Filter size={20} style={{ color: "var(--neuron-brand-green)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--neuron-ink-primary)", margin: 0 }}>Filters</h3>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--neuron-ink-muted)"
              }}
            />
            <input
              type="text"
              placeholder="Search SOA number, client, commodity, container..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              style={{
                width: "100%",
                height: "40px",
                paddingLeft: "38px",
                paddingRight: "12px",
                fontSize: "14px",
                color: "var(--neuron-ink-primary)",
                backgroundColor: "var(--neuron-bg-page)",
                border: "1px solid var(--neuron-ui-border)",
                borderRadius: "8px",
                outline: "none"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
            {/* Date Range */}
            <div>
              <UnifiedDateRangeFilter
                startDate={filters.dateStart}
                endDate={filters.dateEnd}
                onStartDateChange={(v) => setFilters({ ...filters, dateStart: v })}
                onEndDateChange={(v) => setFilters({ ...filters, dateEnd: v })}
                label="SOA Date Range (From - To)"
              />
            </div>

            {/* Service Type */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Service Type</label>
              <select
                value={filters.serviceType}
                onChange={(e) => setFilters({ ...filters, serviceType: e.target.value, port: "All" })}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", cursor: "pointer" }}
              >
                <option value="All">All Types</option>
                <option value="Import">Import</option>
                <option value="Export">Export</option>
              </select>
            </div>

            {/* Port */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Port</label>
              <select
                value={filters.port}
                onChange={(e) => setFilters({ ...filters, port: e.target.value })}
                disabled={filters.serviceType === "All"}
                style={{
                  width: "100%", height: "40px", padding: "0 12px", fontSize: "14px",
                  color: filters.serviceType === "All" ? "var(--neuron-ink-muted)" : "var(--neuron-ink-primary)",
                  backgroundColor: "var(--neuron-bg-page)",
                  border: "1px solid var(--neuron-ui-border)",
                  borderRadius: "8px", outline: "none",
                  cursor: filters.serviceType === "All" ? "not-allowed" : "pointer",
                  opacity: filters.serviceType === "All" ? 0.6 : 1
                }}
              >
                {PORT_OPTIONS.map(p => (
                  <option key={p} value={p}>{p === "All" ? "All Ports" : p}</option>
                ))}
              </select>
            </div>

            {/* Client */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Client</label>
              <input
                type="text"
                placeholder="Filter by client..."
                value={filters.client}
                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }}
              />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <KPICard label="Number of SOAs" value={totalSOAs.toString()} />
          <KPICard label="Total SOA Amount" value={formatCurrency(totalSOAAmount)} />
          <KPICard label="Total Collected" value={formatCurrency(totalCollected)} />
          <KPICard label="Outstanding Balance" value={formatCurrency(outstandingBalance)} color={outstandingBalance > 0 ? "#EF4444" : "var(--neuron-brand-green)"} />
        </div>

        {/* Data Table */}
        <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--neuron-bg-page)" }}>
                  {[
                    "No.", "Client Name", "Commodity", "Container Number",
                    "SOA No.", "SOA Amount", "Name/Check", "Check Amount", "Date of Payment"
                  ].map((header) => (
                    <th key={header} style={{
                      padding: "16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--neuron-ink-muted)",
                      borderBottom: "1px solid var(--neuron-ui-border)",
                      whiteSpace: "nowrap",
                      textTransform: "uppercase",
                      position: "sticky",
                      top: 0,
                      backgroundColor: "var(--neuron-bg-page)",
                      zIndex: 10
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                      Loading data...
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{ transition: "background-color 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        {startIndex + index + 1}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        {row.clientName}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        {row.commodity}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        {row.containerNumbers.length > 0 ? row.containerNumbers.join(", ") : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        {row.soaNumber}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)", fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(row.soaAmount)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        {row.nameCheck}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)", fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(row.checkAmount)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        {row.dateOfPayment}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderTop: "1px solid var(--neuron-ui-border)"
          }}>
            <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)" }}>
              Showing {filteredData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} entries
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: currentPage === 1 ? "var(--neuron-ink-muted)" : "var(--neuron-ink-primary)",
                  backgroundColor: "white",
                  border: "1px solid var(--neuron-ui-border)",
                  borderRadius: "6px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.6 : 1
                }}
              >
                <ChevronLeft size={16} style={{ marginRight: "4px" }} />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: (currentPage === totalPages || totalPages === 0) ? "var(--neuron-ink-muted)" : "var(--neuron-ink-primary)",
                  backgroundColor: "white",
                  border: "1px solid var(--neuron-ui-border)",
                  borderRadius: "6px",
                  cursor: (currentPage === totalPages || totalPages === 0) ? "not-allowed" : "pointer",
                  opacity: (currentPage === totalPages || totalPages === 0) ? 0.6 : 1
                }}
              >
                Next
                <ChevronRight size={16} style={{ marginLeft: "4px" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify the file compiles**

Run: `npx tsc --noEmit src/components/reports/SOAPaymentMonitoringReport.tsx 2>&1 || echo "Check for errors"`

If there are import issues, fix them. The dev server (`npm run dev`) should also show no errors for this file.

- [ ] **Step 6: Commit**

```bash
git add src/components/reports/SOAPaymentMonitoringReport.tsx
git commit -m "feat(reports): add SOA Payment Monitoring report component"
```

---

### Task 2: Register the Report in the Report Library and Router

**Files:**
- Modify: `src/components/Reports.tsx:14-51` (add to `accountingReports` array)
- Modify: `src/App.tsx:1-25` (add import), `src/App.tsx:283-340` (add wrapper function), `src/App.tsx:656-662` (add route)

- [ ] **Step 1: Add the report entry to Reports.tsx**

In `src/components/Reports.tsx`, add this entry to the `accountingReports` array (after the last existing entry, before the closing `]`):

```tsx
  {
    id: "soa-payment-monitoring",
    name: "SOA Payment Monitoring",
    description: "Track billing payments, check details, and collection status.",
    path: "/reports/soa-payment-monitoring"
  }
```

- [ ] **Step 2: Add import to App.tsx**

In `src/App.tsx`, add this import after line 23 (the VatReturnsReport import):

```tsx
import { SOAPaymentMonitoringReport } from "./components/reports/SOAPaymentMonitoringReport";
```

- [ ] **Step 3: Add wrapper function to App.tsx**

In `src/App.tsx`, add this function after the `VatReturnsReportPage` wrapper function (around line 338):

```tsx
function SOAPaymentMonitoringReportPage() {
  return (
    <RouteWrapper page="reports">
      <SOAPaymentMonitoringReport />
    </RouteWrapper>
  );
}
```

- [ ] **Step 4: Add route to App.tsx**

In `src/App.tsx`, add this route after the vat-returns route (after line 662):

```tsx
        <Route path="/reports/soa-payment-monitoring" element={<SOAPaymentMonitoringReportPage />} />
```

- [ ] **Step 5: Verify the app compiles and the report is accessible**

Run: `npm run dev`

1. Navigate to `/reports` — verify "SOA Payment Monitoring" appears in the list
2. Click it — verify the report page loads at `/reports/soa-payment-monitoring`
3. Verify back arrow navigates to `/reports`

- [ ] **Step 6: Commit**

```bash
git add src/components/Reports.tsx src/App.tsx
git commit -m "feat(reports): register SOA Payment Monitoring in report library and router"
```

---

### Task 3: Manual Verification

- [ ] **Step 1: Test data loading**

Open the report at `/reports/soa-payment-monitoring`. Verify:
- Data loads from the API (billings appear as rows)
- Client name, commodity, and container numbers are populated from linked bookings
- SOA Number and SOA Amount columns display billing data correctly

- [ ] **Step 2: Test collection linkage**

Find a billing that has a linked collection. Verify:
- Name/Check shows the collection's reference number (or "CASH" for cash payments)
- Check Amount shows the allocation amount for that specific billing
- Date of Payment shows the collection date
- For billings with no collection: columns show "—" and 0

- [ ] **Step 3: Test filters**

- Set a date range for a specific month → only SOAs with `billingDate` in that range appear
- Select Service Type "Import" → only import-linked SOAs show. Port dropdown becomes enabled.
- Select a port → further filters by POD
- Switch to "Export" → port now filters by origin/POL
- Type a client name → filters correctly
- Use the search bar → matches across SOA No, client, commodity, container

- [ ] **Step 4: Test KPIs**

Verify the 4 KPI cards update based on filtered data:
- Number of SOAs = count of visible rows
- Total SOA Amount = sum of SOA Amount column
- Total Collected = sum of Check Amount column
- Outstanding Balance = Total SOA Amount − Total Collected (red when positive)

- [ ] **Step 5: Test CSV export**

Click "Export Excel" → CSV downloads with correct headers and filtered data.

- [ ] **Step 6: Test pagination**

If more than 10 rows, verify pagination controls work correctly.
