import { useState, useEffect } from "react";
import { Download, Filter, ChevronLeft, ChevronRight, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';
import { StandardSelect, StandardInput } from '../design-system';

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
  booking_type?: string; // Server always injects "Import" or "Export"
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
  nameCheck: string;
  checkAmount: number;
  dateOfPayment: string;
  billingDate: string;
  serviceType: string;
  port: string;
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
      const collectionsByBillingId = new Map<string, { collection: Collection; allocationAmount: number }[]>();

      collections.forEach(c => {
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

        if (c.billingId) {
          if (!collectionsByBillingId.has(c.billingId)) collectionsByBillingId.set(c.billingId, []);
          const list = collectionsByBillingId.get(c.billingId)!;
          if (!list.some(entry => entry.collection.id === c.id)) {
            list.push({ collection: c, allocationAmount: Number(c.amount) || 0 });
          }
        }

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
        let booking = bookingMap.get(billing.bookingId || "") ||
                      bookingMap.get(billing.bookingNumber || "");
        // Also check bookingIds array
        if (!booking && billing.bookingIds && Array.isArray(billing.bookingIds)) {
          for (const bid of billing.bookingIds) {
            booking = bookingMap.get(bid);
            if (booking) break;
          }
        }

        const clientName = billing.clientName ||
          (booking ? (booking.customerName || booking.clientName || booking.client || booking.shipper) : null) ||
          "—";

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

        const serviceType = booking?.shipmentType || booking?.booking_type || booking?.mode || "Import";
        const isImport = serviceType.toLowerCase().includes("import");
        const port = isImport ? (booking?.pod || "—") : (booking?.origin || "—");

        // DEBUG: temporary logging to diagnose port filter
        if (booking) {
          console.log(`[SOA] billing=${billing.billingNumber} type=${serviceType} pod=${booking.pod} origin=${booking.origin} => port=${port}`);
        }

        const soaNumber = billing.billingNumber || billing.soaNumber || "—";
        const soaAmount = Number(billing.totalAmount) || 0;

        const linkedCollections = collectionsByBillingId.get(billing.id) || [];

        let nameCheckParts: string[] = [];
        let checkAmountTotal = 0;
        let paymentDates: string[] = [];

        linkedCollections.forEach(({ collection, allocationAmount }) => {
          const isCash = collection.paymentMethod?.toLowerCase() === "cash";
          const refNum = collection.referenceNumber || collection.checkNumber || collection.checkNo;
          const nameCheck = isCash ? "CASH" : (refNum || "—");
          if (!nameCheckParts.includes(nameCheck)) nameCheckParts.push(nameCheck);

          checkAmountTotal += allocationAmount;

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

      rows.sort((a, b) => new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime());

      setData(rows);
    } catch (error) {
      console.error("Error fetching SOA Payment Monitoring data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Filter Logic ---
  const filteredData = data.filter(item => {
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matches =
        item.soaNumber.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.commodity.toLowerCase().includes(q) ||
        item.containerNumbers.some(c => c.toLowerCase().includes(q));
      if (!matches) return false;
    }

    if (filters.serviceType !== "All") {
      if (!item.serviceType.toLowerCase().includes(filters.serviceType.toLowerCase())) return false;
    }

    if (filters.port !== "All") {
      if (!item.port.toLowerCase().includes(filters.port.toLowerCase())) return false;
    }

    if (filters.client) {
      if (!item.clientName.toLowerCase().includes(filters.client.toLowerCase())) return false;
    }

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
          <div style={{ marginBottom: "16px" }}>
            <StandardInput
              value={filters.searchQuery}
              onChange={(value) => setFilters({ ...filters, searchQuery: value })}
              placeholder="Search SOA number, client, commodity, container..."
              icon={<Search size={18} />}
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
            <StandardSelect
              label="Service Type"
              value={filters.serviceType}
              onChange={(value) => setFilters({ ...filters, serviceType: value, port: "All" })}
              options={[
                { value: "All", label: "All Types" },
                { value: "Import", label: "Import" },
                { value: "Export", label: "Export" }
              ]}
            />

            {/* Port */}
            <StandardSelect
              label="Port"
              value={filters.port}
              onChange={(value) => setFilters({ ...filters, port: value })}
              options={PORT_OPTIONS.map(p => ({ value: p, label: p === "All" ? "All Ports" : p }))}
            />

            {/* Client */}
            <StandardInput
              label="Client"
              value={filters.client}
              onChange={(value) => setFilters({ ...filters, client: value })}
              placeholder="Filter by client..."
            />
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
