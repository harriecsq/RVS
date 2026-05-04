import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronRight, ChevronLeft, Filter, Search, ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { MonthOrRangeDateFilter } from "../shared/MonthOrRangeDateFilter";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';
import { MultiSelectPortalDropdown } from '../shared/MultiSelectPortalDropdown';
import { FilterSingleDropdown } from '../shared/FilterSingleDropdown';
import { CompanyClientFilter, clientSelectionMatches, type ClientSelection } from '../shared/CompanyClientFilter';
import { useClientsMasterList } from '../../hooks/useClientsMasterList';

// --- Data Interfaces ---

interface Booking {
  id: string;
  bookingId?: string;
  bookingNumber?: string;
  bookingDate: string;
  customerName?: string; // Client
  clientName?: string;
  client?: string;
  shipper?: string;
  commodity?: string;
  containerNo?: string; // Often comma separated
  containerNumbers?: string[];
  containers?: any[]; // Or array of objects
  status?: string;
  mode?: string; // Import/Export
  shipmentType?: string;
  notes?: string;
}

interface Billing {
  id: string;
  bookingId?: string;
  bookingIds?: string[];
  soaNumber?: string;
  billingNumber?: string;
  totalAmount: number;
  invoiceIds?: string[]; // To link to collections
}

interface ExpenseLineItem {
  category: string; // "Container Deposit" check
  description: string;
  amount: number;
}

interface Expense {
  id: string;
  bookingId?: string;
  bookingIds?: string[];
  linkedBookingIds?: string[];
  charges: ExpenseLineItem[];
  amount?: number;
  category?: string;
}

interface Collection {
  id: string;
  invoiceIds?: string[]; // Linked to Billing IDs
  billingId?: string;
  allocations?: { billingId: string }[];
  paymentMethod: string;
  checkNo?: string;
  checkNumber?: string;
  bankName?: string;
  amount: number;
  collectionDate: string;
  status?: string;
}

interface FinalShipmentRow {
  id: string;
  shipmentNo: string;
  clientName: string;
  commodity: string;
  containerNumbers: string[];
  numberOfContainers: number;
  soaNumber: string;
  billingAmount: number;
  costingAmount: number; // Excluding deposit
  profit: number;
  containerDeposit: number;
  bankDetails: string; // Bank Name / Check #
  checkAmount: number;
  depositDate: string;
  referenceStatus: "PAID" | "UNPAID";
  date: string; // For filtering
  serviceType: string; // For filtering
  port: string; // For filtering
  rawDepositDates: string[]; // ISO strings for filtering
  remarks: string;
}

// --- Types ---

interface FilterState {
  dateStart: string;
  dateEnd: string;
  serviceType: string;
  port: string[];
  clientSelections: ClientSelection[];
  status: string[];
  searchQuery: string;
}

// --- Components ---

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

function StatusPill({ status }: { status: "PAID" | "UNPAID" }) {
  const bg = status === "PAID" ? "#DEF7EC" : "#FDE8E8";
  const color = status === "PAID" ? "#03543F" : "#9B1C1C";
  
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "9999px",
      fontSize: "11px",
      fontWeight: 600,
      backgroundColor: bg,
      color: color,
      whiteSpace: "nowrap"
    }}>
      {status}
    </span>
  );
}

export function FinalShipmentCostReport() {
  // State
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    dateStart: "",
    dateEnd: "",
    serviceType: "All",
    port: [],
    clientSelections: [],
    status: [],
    searchQuery: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FinalShipmentRow[]>([]);
  const [dateMode, setDateMode] = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState("");

  const clientsMasterList = useClientsMasterList();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Data Fetching & Processing ---

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${publicAnonKey}` };
      
      // Fetch all required data in parallel
      const [bookingsRes, billingsRes, expensesRes, collectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings`, { headers }),
        fetch(`${API_BASE_URL}/billings`, { headers }),
        fetch(`${API_BASE_URL}/expenses`, { headers }),
        fetch(`${API_BASE_URL}/collections`, { headers })
      ]);

      const bookingsData = await bookingsRes.json();
      const billingsData = await billingsRes.json();
      const expensesData = await expensesRes.json();
      const collectionsData = await collectionsRes.json();

      const bookings: Booking[] = bookingsData.success ? bookingsData.data : [];
      const billings: Billing[] = billingsData.success ? billingsData.data : [];
      const expenses: Expense[] = expensesData.success ? expensesData.data : [];
      const collections: Collection[] = collectionsData.success ? collectionsData.data : [];

      // Create Lookup Maps
      
      // Map Billing by Booking ID (using set for O(1) lookup of booking IDs)
      const billingMap = new Map<string, Billing[]>();
      
      billings.forEach(b => {
         const linkedBookingIds = new Set<string>();
         
         // Collect all possible booking references from the billing
         if (b.bookingIds && Array.isArray(b.bookingIds)) {
             b.bookingIds.forEach(id => linkedBookingIds.add(id));
         }
         if (b.bookingId) linkedBookingIds.add(b.bookingId);
         if (b.bookingNumber) linkedBookingIds.add(b.bookingNumber);
         
         // Map the billing to EACH booking ID it references
         linkedBookingIds.forEach(bookingId => {
             if (!billingMap.has(bookingId)) billingMap.set(bookingId, []);
             // Avoid duplicates if a billing references the same booking multiple times (e.g. via ID and Number)
             const list = billingMap.get(bookingId);
             if (list && !list.some(existing => existing.id === b.id)) {
                 list.push(b);
             }
         });
      });

      // Map Expense by Booking ID
      const expenseMap = new Map<string, Expense[]>();
      expenses.forEach(e => {
         const linkedBookingIds = new Set<string>();
         
         // Collect all possible booking references from the expense
         const ids = e.bookingIds || e.linkedBookingIds;
         if (ids && Array.isArray(ids)) {
             ids.forEach(id => linkedBookingIds.add(id));
         }
         if (e.bookingId) linkedBookingIds.add(e.bookingId);
         
         // Map the expense to EACH booking ID it references
         linkedBookingIds.forEach(bookingId => {
             if (!expenseMap.has(bookingId)) expenseMap.set(bookingId, []);
             const list = expenseMap.get(bookingId);
             if (list && !list.some(existing => existing.id === e.id)) {
                 list.push(e);
             }
         });
      });

      // Map Collection by Invoice ID (Billing ID)
      // A billing (invoice) might be paid by multiple collections (partial payment), or one collection pays multiple invoices
      const collectionMap = new Map<string, Collection[]>();
      collections.forEach(c => {
        // Handle allocations (new format)
        if (c.allocations && Array.isArray(c.allocations)) {
            c.allocations.forEach(alloc => {
                if (alloc.billingId) {
                    if (!collectionMap.has(alloc.billingId)) collectionMap.set(alloc.billingId, []);
                    collectionMap.get(alloc.billingId)?.push(c);
                }
            });
        }
        
        // Handle legacy billingId
        if (c.billingId) {
             if (!collectionMap.has(c.billingId)) collectionMap.set(c.billingId, []);
             // Avoid duplicates if already added via allocations
             const list = collectionMap.get(c.billingId);
             if (list && !list.includes(c)) {
                 list.push(c);
             }
        }
        
        // Fallback: Check invoiceIds (if it exists in some legacy data, though not seen in code)
        if (c.invoiceIds && Array.isArray(c.invoiceIds)) {
            c.invoiceIds.forEach(invId => {
                if (!collectionMap.has(invId)) collectionMap.set(invId, []);
                const list = collectionMap.get(invId);
                if (list && !list.includes(c)) {
                    list.push(c);
                }
            });
        }
      });

      // Process Rows
      const processedRows: FinalShipmentRow[] = bookings.map(booking => {
        // Collect all possible identifiers for this booking
        const identifiers = new Set<string>();
        if (booking.id) identifiers.add(booking.id);
        if (booking.bookingId) identifiers.add(booking.bookingId);
        if (booking.bookingNumber) identifiers.add(booking.bookingNumber);

        // 1. Get Billings (Deduplicated)
        const linkedBillingsMap = new Map<string, Billing>();
        identifiers.forEach(id => {
            const list = billingMap.get(id);
            if (list) list.forEach(b => linkedBillingsMap.set(b.id, b));
        });
        const linkedBillings = Array.from(linkedBillingsMap.values());
        
        const billingAmount = linkedBillings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
        const soaNumber = linkedBillings.map(b => b.billingNumber || b.soaNumber).filter(Boolean).join(", ") || "—";

        // 2. Get Costing & Deposit (Deduplicated)
        const linkedExpensesMap = new Map<string, Expense>();
        identifiers.forEach(id => {
            const list = expenseMap.get(id);
            if (list) list.forEach(e => linkedExpensesMap.set(e.id, e));
        });
        const linkedExpenses = Array.from(linkedExpensesMap.values());
        
        let costingAmount = 0;
        let containerDeposit = 0;

        linkedExpenses.forEach(exp => {
            if (exp.charges && Array.isArray(exp.charges) && exp.charges.length > 0) {
                exp.charges.forEach(charge => {
                    const amount = Number(charge.amount) || 0;
                    const isDeposit = 
                        (charge.category && charge.category.toLowerCase().includes("deposit")) || 
                        (charge.description && charge.description.toLowerCase().includes("container deposit"));
                    
                    if (isDeposit) {
                        containerDeposit += amount;
                    } else {
                        costingAmount += amount;
                    }
                });
            } else {
                // Fallback for expenses without charges (legacy)
                const amount = Number(exp.amount) || 0;
                const isDeposit = (exp.category && exp.category.toLowerCase().includes("deposit"));
                if (isDeposit) {
                    containerDeposit += amount;
                } else {
                    costingAmount += amount;
                }
            }
        });

        // 3. Get Collections & Payment Status
        let referenceStatus: "PAID" | "UNPAID" = "UNPAID";
        let bankDetailsParts: string[] = [];
        let checkAmountTotal = 0;
        let depositDates: string[] = [];
        let rawDepositDates: string[] = [];

        // Check if ANY of the linked billings have a collection
        const hasCollection = linkedBillings.some(b => {
             const linkedCollections = collectionMap.get(b.id);
             if (linkedCollections && linkedCollections.length > 0) {
                 // Aggregate details
                 linkedCollections.forEach(c => {
                     const checkNum = c.checkNumber || c.checkNo;
                     const detail = checkNum ? `${c.bankName || 'Bank'} / ${checkNum}` : (c.paymentMethod || "Cash");
                     if (!bankDetailsParts.includes(detail)) bankDetailsParts.push(detail);
                 });
                 return true;
             }
             return false;
        });
        
        // Deduplicate collections for details
        const uniqueCollections = new Set<string>();
        const collectionsForBooking: Collection[] = [];
        linkedBillings.forEach(b => {
            const cols = collectionMap.get(b.id);
            cols?.forEach(c => {
                if (!uniqueCollections.has(c.id)) {
                    uniqueCollections.add(c.id);
                    collectionsForBooking.push(c);
                }
            });
        });

        if (collectionsForBooking.length > 0) {
            referenceStatus = "PAID";
            collectionsForBooking.forEach(c => {
                checkAmountTotal += Number(c.amount) || 0;
                if (c.collectionDate) {
                    depositDates.push(new Date(c.collectionDate).toLocaleDateString('en-US'));
                    rawDepositDates.push(new Date(c.collectionDate).toISOString().split('T')[0]);
                }
            });
        }

        const bankDetails = bankDetailsParts.join(", ") || "—";
        const depositDate = depositDates.join(", ") || "—";

        // 4. Profit
        const profit = billingAmount - costingAmount;

        // 5. Containers
        let containerNumbers: string[] = [];
        if (booking.containerNumbers && Array.isArray(booking.containerNumbers)) {
            containerNumbers = booking.containerNumbers;
        } else if (booking.containers && Array.isArray(booking.containers)) {
            containerNumbers = booking.containers.map(c => c.containerNumber || c.container_number).filter(Boolean);
        } else if (booking.containerNo) {
            containerNumbers = booking.containerNo.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Remarks logic
        const remarks = booking.notes || ""; 

        const rawType = String((booking as any).booking_type || booking.shipmentType || booking.mode || "").trim();
        const rawLower = rawType.toLowerCase();
        let serviceType: string;
        if (rawLower.includes("export") || rawLower === "exps") serviceType = "Export";
        else if (rawLower.includes("import") || rawLower === "imps") serviceType = "Import";
        else serviceType = rawType || "Import";
        const isImport = serviceType === "Import";
        const seg0 = (booking as any).segments?.[0];
        const port = isImport
          ? ((booking as any).pod || seg0?.pod || "")
          : ((booking as any).origin || seg0?.origin || "");

        return {
            id: booking.id,
            shipmentNo: booking.bookingId || booking.id || "—",
            clientName: booking.customerName || booking.clientName || booking.client || booking.shipper || "—",
            commodity: booking.commodity || "—",
            containerNumbers: containerNumbers,
            numberOfContainers: containerNumbers.length,
            soaNumber,
            billingAmount,
            costingAmount,
            profit,
            containerDeposit,
            bankDetails,
            checkAmount: checkAmountTotal,
            depositDate,
            rawDepositDates,
            referenceStatus,
            date: booking.bookingDate || "",
            serviceType,
            port,
            status: booking.status || "Ongoing",
            remarks
        };
      });

      // Sort by date desc
      processedRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setData(processedRows);

    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Logic
  const filteredDataRaw = data.filter(item => {
    // Search Query
    if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matches = 
            item.shipmentNo.toLowerCase().includes(q) ||
            item.clientName.toLowerCase().includes(q) ||
            item.soaNumber.toLowerCase().includes(q) ||
            item.containerNumbers.some(c => c.toLowerCase().includes(q)) ||
            item.commodity.toLowerCase().includes(q) ||
            item.bankDetails.toLowerCase().includes(q) ||
            item.referenceStatus.toLowerCase().includes(q) ||
            item.remarks.toLowerCase().includes(q);
        
        if (!matches) return false;
    }

    // Service Type
    if (filters.serviceType !== "All") {
        if (!item.serviceType.toLowerCase().includes(filters.serviceType.toLowerCase())) return false;
    }

    // Port (multi-select)
    if (filters.port.length > 0) {
        if (!filters.port.some(p => item.port.toLowerCase().includes(p.toLowerCase()))) return false;
    }

    // Client
    if (filters.clientSelections.length > 0) {
        if (!clientSelectionMatches(filters.clientSelections, { client: item.clientName })) return false;
    }

    // Status (Payment Status)
    if (filters.status.length > 0) {
        const targets = filters.status.map(s => s.toUpperCase());
        if (!targets.includes(item.referenceStatus)) return false;
    }
    
    // Date Range (Deposit Date)
    if (filters.dateStart || filters.dateEnd) {
        // If no deposit dates, it doesn't match a date range filter
        if (!item.rawDepositDates || item.rawDepositDates.length === 0) return false;
        
        // Check if ANY deposit date falls within the range
        const hasMatchingDate = item.rawDepositDates.some(d => {
            if (filters.dateStart && d < filters.dateStart) return false;
            if (filters.dateEnd && d > filters.dateEnd) return false;
            return true;
        });
        
        if (!hasMatchingDate) return false;
    }

    return true;
  });

  const filteredData = filters.status.length > 0
    ? [...filteredDataRaw].sort((a, b) => {
        const targets = filters.status.map(s => s.toUpperCase());
        const ai = targets.indexOf(a.referenceStatus);
        const bi = targets.indexOf(b.referenceStatus);
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
      })
    : filteredDataRaw;

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const formatCurrency = (val: number) =>
    `₱${formatAmount(val)}`;

  // Summary Logic
  const totalShipments = filteredData.length;
  const totalBilling = filteredData.reduce((acc, curr) => acc + curr.billingAmount, 0);
  const totalCosting = filteredData.reduce((acc, curr) => acc + curr.costingAmount, 0);
  const totalProfit = filteredData.reduce((acc, curr) => acc + curr.profit, 0);
  const totalContainers = filteredData.reduce((acc, curr) => acc + curr.numberOfContainers, 0);
  const totalDeposit = filteredData.reduce((acc, curr) => acc + curr.containerDeposit, 0);
  const totalCheckAmount = filteredData.reduce((acc, curr) => acc + curr.checkAmount, 0);

  const handlePrintPDF = () => {
    if (!filteredData.length) {
      toast.error("No data to export");
      return;
    }

    const fmt = (val: number) =>
      val === 0 ? "—" : val.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const esc = (s: any) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
        const fmtDate = (m: RegExpExecArray) =>
          `${MONTHS_FULL[+m[2] - 1]} ${String(+m[3]).padStart(2, "0")}, ${+m[1]}`;
        return `${fmtDate(ms)} - ${fmtDate(me)}`;
      }
      return "ALL TIME";
    })();

    // --- Subtitle text (SERVICE PORT - CLIENT) ---
    const PORT_OPTIONS = [
      { value: "Manila North", label: "Manila North" },
      { value: "Manila South", label: "Manila South" },
      { value: "CDO", label: "CDO" },
      { value: "Iloilo", label: "Iloilo" },
      { value: "Davao", label: "Davao" },
    ];
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

    const rowsHtml = filteredData.map((row, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${row.shipmentNo}</td>
        <td>${row.clientName}</td>
        <td>${row.commodity}</td>
        <td>${row.containerNumbers.join("<br>") || "—"}</td>
        <td class="c">${row.numberOfContainers}</td>
        <td>${row.soaNumber}</td>
        <td class="r">${fmt(row.billingAmount)}</td>
        <td class="r">${fmt(row.costingAmount)}</td>
        <td class="r">${fmt(row.profit)}</td>
        <td class="r">${row.containerDeposit > 0 ? fmt(row.containerDeposit) : "—"}</td>
        <td>${row.bankDetails === "—" ? "" : row.bankDetails}</td>
        <td class="r">${row.checkAmount > 0 ? fmt(row.checkAmount) : "—"}</td>
        <td class="c">${row.depositDate === "—" ? "" : row.depositDate}</td>
        <td class="c status-${row.referenceStatus.toLowerCase()}">${row.referenceStatus}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Final Shipment Cost Report</title>
<style>
  @page { size: A3 landscape; margin: 10mm 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 5.3pt; color: #000; }
  .month { font-size: 5.6pt; font-weight: bold; margin-bottom: 4px; letter-spacing: 0.5px; text-align: center; }
  .subtitle { font-size: 5.6pt; font-weight: bold; margin-bottom: 6px; letter-spacing: 0.5px; text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #d9d9d9;
    border: 0.5px solid #555;
    padding: 3px 4px;
    font-size: 4.9pt;
    font-weight: bold;
    text-align: center;
    vertical-align: middle;
    line-height: 1.2;
    text-transform: uppercase;
  }
  td {
    border: 0.5px solid #888;
    padding: 2.5px 4px;
    vertical-align: middle;
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
    text-transform: uppercase;
  }
  tr:nth-child(even) td { background: #f7f7f7; }
  .c { text-align: center; }
  .r { text-align: center; font-variant-numeric: tabular-nums; }
  .status-paid { color: #03543f; font-weight: bold; }
  .status-unpaid { color: #9b1c1c; font-weight: bold; }
  .totals-row td {
    background: #e8e8e8 !important;
    font-weight: bold;
    border: none !important;
  }
  /* Column widths */
  .col-no    { width: 2.5%; }
  .col-ship  { width: 5%; }
  .col-cli   { width: 8%; }
  .col-com   { width: 13%; }
  .col-cont  { width: 8%; }
  .col-num   { width: 4%; }
  .col-soa   { width: 5%; }
  .col-bill  { width: 7%; }
  .col-cost  { width: 7%; }
  .col-prof  { width: 6%; }
  .col-dep   { width: 6%; }
  .col-bank  { width: 10%; }
  .col-chk   { width: 7%; }
  .col-date  { width: 5%; }
  .col-rem   { width: 5%; }
</style>
</head>
<body>
<div class="month">${esc(periodText)}</div>
${subtitleText ? `<div class="subtitle">${esc(subtitleText)}</div>` : ""}
<table>
  <colgroup>
    <col class="col-no"/><col class="col-ship"/><col class="col-cli"/>
    <col class="col-com"/><col class="col-cont"/><col class="col-num"/>
    <col class="col-soa"/><col class="col-bill"/><col class="col-cost"/>
    <col class="col-prof"/><col class="col-dep"/><col class="col-bank"/>
    <col class="col-chk"/><col class="col-date"/><col class="col-rem"/>
  </colgroup>
  <thead>
    <tr>
      <th>NO.</th>
      <th>SHIPMENT NUMBER</th>
      <th>CLIENT NAME</th>
      <th>COMMODITY</th>
      <th>CONTAINER NUMBER</th>
      <th>NUMBER OF CONTAIN</th>
      <th>SOA NUMBER</th>
      <th>BILLING</th>
      <th>COSTING</th>
      <th>PROFIT</th>
      <th>CONTAINER DEPOSIT</th>
      <th>BANK NAME / CHECK NUMBER</th>
      <th>CHECK AMOUNT</th>
      <th>DEPOSIT DATE</th>
      <th>REMARKS</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
    <tr class="totals-row">
      <td colspan="5" class="c">TOTALS</td>
      <td class="c">${totalContainers}</td>
      <td></td>
      <td class="r">${fmt(totalBilling)}</td>
      <td class="r">${fmt(totalCosting)}</td>
      <td class="r">${fmt(totalProfit)}</td>
      <td class="r">${totalDeposit > 0 ? fmt(totalDeposit) : "—"}</td>
      <td></td>
      <td class="r">${fmt(totalCheckAmount)}</td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>
<script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      toast.error("Popup blocked. Please allow popups for this site.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", paddingBottom: "48px" }}>
      {/* --- Header Section --- */}
      <div style={{ padding: "32px 48px 24px 48px", maxWidth: "1440px", width: "100%", margin: "0 auto" }}>
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
                Final Shipment Cost
              </h1>
              <p style={{ 
                fontSize: "14px", 
                color: "#667085"
              }}>
                Analyze shipment-level revenue, costs, and profit
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

        {/* --- Filters Section --- */}
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
          
          {/* Universal Search Bar */}
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
                placeholder="Search shipment no, client, commodity, container..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <MonthOrRangeDateFilter
              label="Date Range"
              dateStart={filters.dateStart}
              dateEnd={filters.dateEnd}
              onStartDateChange={(v) => setFilters(f => ({ ...f, dateStart: v }))}
              onEndDateChange={(v) => setFilters(f => ({ ...f, dateEnd: v }))}
              onModeChange={(m) => setDateMode(m)}
              onMonthChange={(m) => setSelectedMonth(m)}
            />

            <FilterSingleDropdown
              label="Service Type"
              value={filters.serviceType}
              options={[
                { value: "All", label: "All Types" },
                { value: "Import", label: "Import" },
                { value: "Export", label: "Export" },
              ]}
              onChange={(v) => setFilters({...filters, serviceType: v, port: []})}
            />

            <MultiSelectPortalDropdown
              label="Port"
              value={filters.port}
              options={[
                { value: "Manila North", label: "Manila North" },
                { value: "Manila South", label: "Manila South" },
                { value: "CDO", label: "CDO" },
                { value: "Iloilo", label: "Iloilo" },
                { value: "Davao", label: "Davao" },
              ]}
              onChange={(selected) => setFilters({...filters, port: selected})}
              placeholder="All Ports"
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)" }}>Client</label>
              <CompanyClientFilter
                extraEntries={clientsMasterList}
                selected={filters.clientSelections}
                onChange={(v) => setFilters((prev) => ({...prev, clientSelections: v}))}
                placeholder="All Clients"
              />
            </div>

            <MultiSelectPortalDropdown
              label="Status"
              value={filters.status}
              options={[
                { value: "Paid", label: "Paid" },
                { value: "Unpaid", label: "Unpaid" },
              ]}
              onChange={(selected) => setFilters({...filters, status: selected})}
              placeholder="All Statuses"
            />
          </div>
        </div>

        {/* --- KPI Section --- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <KPICard label="Total Shipments" value={totalShipments.toString()} />
          <KPICard label="Total Billing" value={formatCurrency(totalBilling)} />
          <KPICard label="Total Costing" value={formatCurrency(totalCosting)} />
          <KPICard label="Total Profit" value={formatCurrency(totalProfit)} color={totalProfit >= 0 ? "var(--neuron-brand-green)" : "#EF4444"} />
        </div>

        {/* --- Data Table --- */}
        <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1800px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--neuron-bg-page)" }}>
                  {[
                    "No.", "Shipment Number", "Client Name", "Commodity", "Container Number(s)",
                    "Number of Container(s)", "SOA Number", "Billing", "Costing", "Profit",
                    "Container Deposit", "Bank Name / Check #", "Check Amount", "Deposit Date", "Status"
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
                      <td colSpan={15} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                        Loading data...
                      </td>
                    </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, index) => (
                    <tr 
                      key={`${row.id}-${index}`} 
                      style={{ transition: "background-color 0.15s" }} 
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)"; }} 
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{startIndex + index + 1}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.shipmentNo}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.clientName}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.commodity}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {row.containerNumbers.length > 0 ? row.containerNumbers.map((cn, i) => <span key={i}>{cn}</span>) : "—"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.numberOfContainers}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.soaNumber}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.billingAmount)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.costingAmount)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: row.profit >= 0 ? "#03543F" : "#EF4444", fontWeight: 600, borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.profit)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.containerDeposit)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.bankDetails}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.checkAmount)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.depositDate}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        <StatusPill status={row.referenceStatus} />
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
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} entries
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
                disabled={currentPage === totalPages}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  padding: "8px 12px", 
                  fontSize: "13px", 
                  color: currentPage === totalPages ? "var(--neuron-ink-muted)" : "var(--neuron-ink-primary)", 
                  backgroundColor: "white", 
                  border: "1px solid var(--neuron-ui-border)", 
                  borderRadius: "6px", 
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.6 : 1
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