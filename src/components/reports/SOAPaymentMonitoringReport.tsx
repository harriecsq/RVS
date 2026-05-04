import { useState, useEffect } from "react";
import { Filter, ChevronLeft, ChevronRight, Search, ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { publicAnonKey } from "../../utils/supabase/info";
import { MonthOrRangeDateFilter } from "../shared/MonthOrRangeDateFilter";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';
import { MultiSelectPortalDropdown } from '../shared/MultiSelectPortalDropdown';
import { FilterSingleDropdown } from '../shared/FilterSingleDropdown';
import { CompanyClientFilter, clientSelectionMatches, type ClientSelection } from '../shared/CompanyClientFilter';
import { useClientsMasterList } from '../../hooks/useClientsMasterList';
import { StandardInput } from '../design-system/StandardInput';

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
  destination?: string;
  segments?: { origin?: string; pod?: string; destination?: string }[];
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
  port: string[];
  clientSelections: ClientSelection[];
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

const PORT_OPTIONS = [
  { value: "Manila North", label: "Manila North" },
  { value: "Manila South", label: "Manila South" },
  { value: "CDO", label: "CDO" },
  { value: "Iloilo", label: "Iloilo" },
  { value: "Davao", label: "Davao" },
];

const SERVICE_TYPE_OPTIONS = [
  { value: "All", label: "All Types" },
  { value: "Import", label: "Import" },
  { value: "Export", label: "Export" },
];

export function SOAPaymentMonitoringReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    dateStart: "",
    dateEnd: "",
    serviceType: "All",
    port: [],
    clientSelections: [],
    searchQuery: ""
  });
  const clientsMasterList = useClientsMasterList();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<SOAPaymentRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateMode, setDateMode] = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState("");
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

        const rawType = String(booking?.booking_type || booking?.shipmentType || booking?.mode || "").trim();
        const rawLower = rawType.toLowerCase();
        let serviceType: string;
        if (rawLower.includes("export") || rawLower === "exps") serviceType = "Export";
        else if (rawLower.includes("import") || rawLower === "imps") serviceType = "Import";
        else serviceType = rawType || "Import";
        const isImport = serviceType === "Import";
        const seg0 = booking?.segments?.[0];
        const port = isImport
          ? (booking?.pod || booking?.destination || seg0?.pod || (seg0 as any)?.destination || "—")
          : (booking?.origin || booking?.pod || booking?.destination || seg0?.origin || seg0?.pod || "—");

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

    if (filters.port.length > 0) {
      if (!filters.port.some(p => item.port.toLowerCase().includes(p.toLowerCase()))) return false;
    }

    if (filters.clientSelections.length > 0) {
      if (!clientSelectionMatches(filters.clientSelections, { client: item.clientName })) return false;
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

  const handlePrintPDF = () => {
    if (!filteredData.length) {
      toast.error("No data to print");
      return;
    }

    const esc = (s: any) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const fmt = (n: number) =>
      n === 0 ? "—" : n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDates = (s: string) => {
      if (!s || s === "—") return s;
      const matches = [...s.matchAll(/([A-Z][a-z]{2})\s+(\d{1,2}),\s*\d{4}/g)];
      if (!matches.length) return s;
      return matches.map(m => `${m[2].padStart(2, "0")}-${m[1]}`).join(" / ");
    };
    const slashJoin = (s: string) => (!s || s === "—" ? s : s.split(/,\s*/).join(" / "));

    // --- Period text ---
    const MONTH_ABBRS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const MONTHS_FULL = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
    const periodText = (() => {
      if (dateMode === "month") {
        if (!selectedMonth) return "ALL TIME";
        const [abbr, yearStr] = selectedMonth.split(" ");
        const idx = MONTH_ABBRS.indexOf(abbr);
        const year = parseInt(yearStr, 10);
        if (idx < 0 || isNaN(year)) return "ALL TIME";
        return `${MONTHS_FULL[idx]} ${year}`;
      }
      const s = filters.dateStart;
      const e = filters.dateEnd;
      if (!s && !e) return "ALL TIME";
      const re = /^(\d{4})-(\d{2})-(\d{2})$/;
      const ms = s ? re.exec(s) : null;
      const me = e ? re.exec(e) : null;
      if (ms && me) {
        const fmt = (m: RegExpExecArray) =>
          `${MONTHS_FULL[+m[2] - 1]} ${String(+m[3]).padStart(2, "0")}, ${+m[1]}`;
        return `${fmt(ms)} - ${fmt(me)}`;
      }
      return "ALL TIME";
    })();

    // --- Subtitle text (SERVICE PORT - CLIENT) ---
    const portShortMap: Record<string, string> = {
      "Manila North": "NORTH",
      "Manila South": "SOUTH",
      "CDO": "CDO",
      "Iloilo": "ILOILO",
      "Davao": "DAVAO",
    };
    const servicePart =
      filters.serviceType && filters.serviceType !== "All" ? filters.serviceType.toUpperCase() : "";
    const portPart =
      !filters.port || filters.port.length === 0 || filters.port.length === PORT_OPTIONS.length
        ? ""
        : filters.port.map(p => portShortMap[p] || p.toUpperCase()).join(" & ");
    const clientPart = filters.clientSelections.length === 1
      ? String(filters.clientSelections[0].client || filters.clientSelections[0].company).toUpperCase()
      : filters.clientSelections.length > 1
      ? `${filters.clientSelections.length} CLIENTS`
      : "";
    const leftPart = [servicePart, portPart].filter(Boolean).join(" ");
    const subtitleText =
      leftPart && clientPart ? `${leftPart} - ${clientPart}` : leftPart || clientPart || "";

    const soaTotal = filteredData.reduce((s, r) => s + (Number(r.soaAmount) || 0), 0);
    const checkTotal = filteredData.reduce((s, r) => s + (Number(r.checkAmount) || 0), 0);
    const totalsRowHtml = `
      <tr class="totals">
        <td></td><td></td><td></td><td></td><td></td>
        <td class="amt">${fmt(soaTotal)}</td>
        <td></td>
        <td class="amt">${fmt(checkTotal)}</td>
        <td></td>
      </tr>`;

    const rowsHtml = filteredData.map((row, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(row.clientName)}</td>
        <td>${esc(row.commodity)}</td>
        <td>${esc(row.containerNumbers.join(" / "))}</td>
        <td>${esc(row.soaNumber)}</td>
        <td class="amt">${fmt(row.soaAmount)}</td>
        <td>${esc(slashJoin(row.nameCheck))}</td>
        <td class="amt">${fmt(row.checkAmount)}</td>
        <td>${esc(fmtDates(row.dateOfPayment))}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>SOA Payment Monitoring</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 6.3pt; color: #000; }
  h1 { font-size: 9.1pt; text-transform: uppercase; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 7.5pt; text-transform: uppercase; text-align: center; margin-bottom: 12px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; word-break: break-word; font-weight: bold; }
  th { background: #f0f0f0; text-transform: uppercase; font-size: 6pt; }
  td.amt { font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.num { font-weight: normal; }
  tr.totals td { border: none; }
</style></head><body>
  <h1>SOA Payment Monitoring (${esc(periodText)})</h1>
  ${subtitleText ? `<h2>${esc(subtitleText)}</h2>` : ""}
  <table>
    <colgroup>
      <col style="width:29px" />
      <col style="width:171px" />
      <col />
      <col style="width:90px" />
      <col style="width:78px" />
      <col style="width:107px" />
      <col style="width:140px" />
      <col style="width:107px" />
      <col style="width:91px" />
    </colgroup>
    <thead><tr>
      <th>No.</th><th>Client</th><th>Commodity</th><th>Container No.</th>
      <th>SOA No.</th><th>SOA Amount</th><th>Name/Check</th><th>Check Amount</th><th>Date of Payment</th>
    </tr></thead>
    <tbody>${rowsHtml}${totalsRowHtml}</tbody>
  </table>
  <script>window.onload = () => { window.print(); };<\/script>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
    else toast.error("Popup blocked. Please allow popups for this site.");
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
            onClick={handlePrintPDF}
            style={{
              height: "40px",
              padding: "0 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: "white",
              backgroundColor: "var(--neuron-brand-green)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Printer size={16} />
            Print PDF
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
              <MonthOrRangeDateFilter
                label="SOA Date Range"
                dateStart={filters.dateStart}
                dateEnd={filters.dateEnd}
                onStartDateChange={(v) => setFilters((prev) => ({ ...prev, dateStart: v }))}
                onEndDateChange={(v) => setFilters((prev) => ({ ...prev, dateEnd: v }))}
                onModeChange={(m) => setDateMode(m)}
                onMonthChange={(m) => setSelectedMonth(m)}
              />
            </div>

            {/* Service Type */}
            <FilterSingleDropdown
              label="Service Type"
              value={filters.serviceType}
              options={SERVICE_TYPE_OPTIONS}
              onChange={(value) => setFilters({ ...filters, serviceType: value, port: [] })}
            />

            {/* Port */}
            <MultiSelectPortalDropdown
              label="Port"
              value={filters.port}
              options={PORT_OPTIONS}
              onChange={(selected) => setFilters({ ...filters, port: selected })}
              placeholder="All Ports"
            />

            {/* Client */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500, color: "#344054" }}>Client</label>
              <CompanyClientFilter
                extraEntries={clientsMasterList}
                selected={filters.clientSelections}
                onChange={(v) => setFilters((prev) => ({ ...prev, clientSelections: v }))}
                placeholder="All Clients"
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
