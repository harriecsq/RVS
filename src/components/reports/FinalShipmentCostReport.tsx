import { useState, useEffect } from "react";
import { ChevronRight, Download, Filter, ChevronLeft, ChevronRight as ChevronRightIcon, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';
import { MultiSelectPortalDropdown } from '../shared/MultiSelectPortalDropdown';
import { FilterSingleDropdown } from '../shared/FilterSingleDropdown';
import { CompanyClientFilter } from '../shared/CompanyClientFilter';
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
  client: string | null;
  clientCompany: string | null;
  status: string;
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
    client: null,
    clientCompany: null,
    status: "All",
    searchQuery: ""
  });
  const clientsMasterList = useClientsMasterList();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FinalShipmentRow[]>([]);
  
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

        const serviceType = booking.mode || booking.shipmentType || "Import";
        const isImport = serviceType.toLowerCase().includes("import");
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
  const filteredData = data.filter(item => {
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
    if (filters.clientCompany) {
        if (item.clientName !== filters.clientCompany && item.clientName !== filters.client) return false;
        if (filters.client && item.clientName !== filters.client) return false;
    }

    // Status (Payment Status)
    if (filters.status !== "All") {
        const targetStatus = filters.status.toUpperCase(); // "PAID" or "UNPAID"
        if (item.referenceStatus !== targetStatus) return false;
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

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleExport = () => {
    if (!filteredData.length) {
        toast.error("No data to export");
        return;
    }

    const headers = [
        "Shipment No", "Client", "Commodity", "Containers", "No. of Containers",
        "SOA No", "Billing", "Costing", "Profit", "Container Deposit",
        "Bank/Check", "Check Amount", "Deposit Date", "Status"
    ];

    const rows = filteredData.map(row => [
        row.shipmentNo,
        row.clientName,
        row.commodity,
        row.containerNumbers.join(", "),
        row.numberOfContainers.toString(),
        row.soaNumber,
        row.billingAmount.toString(),
        row.costingAmount.toString(),
        row.profit.toString(),
        row.containerDeposit.toString(),
        row.bankDetails,
        row.checkAmount.toString(),
        row.depositDate,
        row.referenceStatus
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FinalShipmentCost_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exporting to Excel...");
  };

  const formatCurrency = (val: number) => 
    `₱${formatAmount(val)}`;

  // Summary Logic
  const totalShipments = filteredData.length;
  const totalBilling = filteredData.reduce((acc, curr) => acc + curr.billingAmount, 0);
  const totalCosting = filteredData.reduce((acc, curr) => acc + curr.costingAmount, 0);
  const totalProfit = filteredData.reduce((acc, curr) => acc + curr.profit, 0);

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
            <div>
              <UnifiedDateRangeFilter
                startDate={filters.dateStart}
                endDate={filters.dateEnd}
                onStartDateChange={(v) => setFilters({...filters, dateStart: v})}
                onEndDateChange={(v) => setFilters({...filters, dateEnd: v})}
                label="Date Range (From - To)"
              />
            </div>

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
                items={[]}
                extraEntries={clientsMasterList}
                getCompany={() => ""}
                getClient={() => ""}
                selectedCompany={filters.clientCompany}
                selectedClient={filters.client}
                onCompanyChange={(v) => setFilters({...filters, clientCompany: v, client: null})}
                onClientChange={(v) => setFilters({...filters, client: v})}
                placeholder="All Clients"
              />
            </div>

            <FilterSingleDropdown
              label="Status"
              value={filters.status}
              options={[
                { value: "All", label: "All Statuses" },
                { value: "Paid", label: "Paid" },
                { value: "Unpaid", label: "Unpaid" },
              ]}
              onChange={(v) => setFilters({...filters, status: v})}
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
                <ChevronRightIcon size={16} style={{ marginLeft: "4px" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}