import { useState, useEffect } from "react";
import { Download, Filter } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import * as XLSX from "xlsx";
import { toast } from "sonner@2.0.3";
import { formatAmount } from "../../utils/formatAmount";
import { API_BASE_URL } from '@/utils/api-config';

interface ReportFilters {
  startDate: string;
  endDate: string;
  serviceType: string;
  status: string;
  customer: string;
}

interface ReportRow {
  no: number;
  shipmentNumber: string;
  clientName: string;
  commodity: string;
  containerNumber: string;
  numberOfContainer: string; // or number
  soaNumber: string;
  billing: number;
  costing: number;
  profit: number;
  containerDeposit: number;
  bankNameCheckNumber: string;
  checkAmount: number;
  depositDate: string;
  remarks: string;
  serviceType: string; // Added for filtering
  status: string; // Added for filtering
  createdAt: string; // Added for filtering
}

interface ReportSummary {
  totalBookings: number;
  byStatus: Record<string, number>;
  byService: Record<string, number>;
}

export function GeneralAnalyticsReport() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    serviceType: "All",
    status: "All",
    customer: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [filteredData, setFilteredData] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({ totalBookings: 0, byStatus: {}, byService: {} });

  // Date input states for text editing
  const [startDateInput, setStartDateInput] = useState(() => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  });
  
  const [endDateInput, setEndDateInput] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  });

  const serviceTypes = ["All", "Export", "Import"];
  const statusOptions = ["All", "Draft", "For Approval", "Approved", "In Transit", "Delivered", "Completed", "On Hold", "Cancelled"];

  const handleDateChange = (value: string, setter: (value: string) => void) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, "");
    
    // Limit to 8 digits (MMDDYYYY)
    const truncated = numbers.slice(0, 8);
    
    let formatted = truncated;
    if (truncated.length > 2) {
      formatted = `${truncated.slice(0, 2)}/${truncated.slice(2)}`;
    }
    if (truncated.length > 4) {
      formatted = `${truncated.slice(0, 2)}/${truncated.slice(2, 4)}/${truncated.slice(4)}`;
    }
    
    setter(formatted);
  };

  const handleDateBlur = (value: string, field: 'startDate' | 'endDate') => {
    const parts = value.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000) {
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setFilters(prev => ({ ...prev, [field]: isoDate }));
        
        // Re-format display to ensure consistency
        const formatted = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
        if (field === 'startDate') setStartDateInput(formatted);
        else setEndDateInput(formatted);
      } else {
        toast.error("Please enter a valid date (MM/DD/YYYY)");
      }
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all necessary data in parallel
      const [bookingsRes, billingsRes, expensesRes, collectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings?includeAll=true`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
        fetch(`${API_BASE_URL}/billings`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
        fetch(`${API_BASE_URL}/expenses`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
        fetch(`${API_BASE_URL}/collections`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      ]);

      const bookingsResult = await bookingsRes.json();
      const billingsResult = await billingsRes.json();
      const expensesResult = await expensesRes.json();
      const collectionsResult = await collectionsRes.json();

      if (!bookingsResult.success) throw new Error("Failed to count bookings");

      const bookings = bookingsResult.data || [];
      const billings = billingsResult.data || [];
      const expenses = expensesResult.data || [];
      const collections = collectionsResult.data || [];

      // 2. Process and join data
      const processedRows: ReportRow[] = bookings.map((booking: any, index: number) => {
        const bookingId = booking.id || booking.bookingId;
        
        // Find linked Billings
        const linkedBillings = billings.filter((b: any) => 
          b.bookingId === bookingId || 
          (b.bookingIds && b.bookingIds.includes(bookingId))
        );

        // Find linked Expenses
        const linkedExpenses = expenses.filter((e: any) => 
          e.bookingIds && e.bookingIds.includes(bookingId)
        );

        // Find linked Collections
        const linkedBillingIds = linkedBillings.map((b: any) => b.id);
        const linkedCollections = collections.filter((c: any) => 
          linkedBillingIds.includes(c.billingId) || 
          linkedBillings.some((b: any) => b.billingNumber === c.billingNumber)
        );

        // Calculate Totals
        const totalBilling = linkedBillings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
        const totalCosting = linkedExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        const profit = totalBilling - totalCosting;

        // Container Info
        let containerList: string[] = [];
        const containerSet = new Set<string>();

        // 1. Check linked expenses first (Priority)
        linkedExpenses.forEach((expense: any) => {
            const possibleExpenseContainers = [
                expense.containerNumbers,
                expense.container_numbers,
                expense.containerNo,
                expense.container_no,
                expense.containers
            ];

            for (const item of possibleExpenseContainers) {
                if (!item) continue;
                
                if (Array.isArray(item)) {
                    item.forEach((i: any) => {
                        if (typeof i === 'string' && i.trim()) {
                            containerSet.add(i.trim());
                        } else if (typeof i === 'object' && i !== null) {
                             const val = i.containerNumber || i.container_number || i.number || i.id;
                             if (val) containerSet.add(val);
                        }
                    });
                } else if (typeof item === 'string' && item.trim().length > 0) {
                    item.split(',').forEach((s: string) => {
                        const trimmed = s.trim();
                        if (trimmed) containerSet.add(trimmed);
                    });
                }
            }
        });

        // 2. If no containers found in expenses, fallback to booking data
        if (containerSet.size === 0) {
            // Try all possible fields in order of likelihood on the booking
            const possibleContainers = [
              booking.containerNumbers,
              booking.container_numbers,
              booking.containerNo,
              booking.container_no,
              booking.containers,
              booking.container
            ];

            for (const item of possibleContainers) {
               if (!item) continue;
               
               if (Array.isArray(item)) {
                   // Handle array of strings or objects
                   const extracted = item.map((i: any) => {
                       if (typeof i === 'string') return i;
                       if (typeof i === 'object' && i !== null) {
                           return i.containerNumber || i.container_number || i.number || i.id || "";
                       }
                       return "";
                   }).filter((s: string) => s && s.trim().length > 0);
                   
                   if (extracted.length > 0) {
                       extracted.forEach((c: string) => containerSet.add(c));
                       break; // Found valid data, stop searching
                   }
               } else if (typeof item === 'string' && item.trim().length > 0) {
                   // Handle comma-separated string
                   const extracted = item.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                   if (extracted.length > 0) {
                       extracted.forEach((c: string) => containerSet.add(c));
                       break; // Found valid data, stop searching
                   }
               }
            }
        }

        containerList = Array.from(containerSet);
        const containerString = containerList.join(", ");
        const containerCount = containerList.length;

        // SOA Number
        const soaNumbers = linkedBillings.map((b: any) => b.billingNumber).join(", ");

        // Collection Info
        const bankNames = [...new Set(linkedCollections.map((c: any) => c.bankName).filter(Boolean))].join(", ");
        const checkNumbers = [...new Set(linkedCollections.map((c: any) => c.checkNumber).filter(Boolean))].join(", ");
        const bankAndCheck = [bankNames, checkNumbers].filter(Boolean).join(" / ");
        const totalCheckAmount = linkedCollections.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        const depositDates = [...new Set(linkedCollections.map((c: any) => c.collectionDate).filter(Boolean))].map(d => new Date(d as string).toLocaleDateString()).join(", ");

        // Remarks
        const remarks = booking.notes || linkedBillings.map((b: any) => b.notes).filter(Boolean).join("; ") || "";

        // Container Deposit
        const containerDeposit = linkedExpenses
            .filter((e: any) => e.category === "Container Deposit")
            .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
            
        // Determine service type from booking data if not explicit
        let serviceType = booking.serviceType || "Forwarding"; 
        
        // Refine service type based on booking number convention if possible
        if (booking.bookingNumber) {
             if (booking.bookingNumber.includes("IMP")) serviceType = "Import";
             else if (booking.bookingNumber.includes("EXP")) serviceType = "Export";
             // Keep other types as is if not matching IMP/EXP
        }

        return {
          no: index + 1,
          shipmentNumber: booking.bookingNumber || booking.booking_number || booking.bookingId || booking.id || "—",
          clientName: booking.clientName || booking.client_name || booking.customerName || "—",
          commodity: booking.commodity || booking.commodityDescription || "—",
          containerNumber: containerString || "—",
          numberOfContainer: containerCount.toString(),
          soaNumber: soaNumbers || "—",
          billing: totalBilling,
          costing: totalCosting,
          profit: profit,
          containerDeposit: containerDeposit,
          bankNameCheckNumber: bankAndCheck || "—",
          checkAmount: totalCheckAmount,
          depositDate: depositDates || "—",
          remarks: remarks,
          serviceType: serviceType,
          status: booking.status || "Draft",
          createdAt: booking.created_at || new Date().toISOString()
        };
      });

      setReportData(processedRows);
      
      // Apply filters immediately
      applyFilters(processedRows, filters);

    } catch (error) {
      console.error("Error fetching report data:", error);
      // Don't toast error on initial load as it might be noisy if just starting up
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = (data: ReportRow[], currentFilters: ReportFilters) => {
    let filtered = data.filter(row => {
        const createdDate = new Date(row.createdAt);
        const matchesDate = createdDate >= new Date(currentFilters.startDate) && createdDate <= new Date(currentFilters.endDate);
        const matchesService = currentFilters.serviceType === "All" || row.serviceType === currentFilters.serviceType;
        const matchesStatus = currentFilters.status === "All" || row.status === currentFilters.status;
        const matchesCustomer = !currentFilters.customer || row.clientName.toLowerCase().includes(currentFilters.customer.toLowerCase());
        
        return matchesDate && matchesService && matchesStatus && matchesCustomer;
    });
    
    // Re-index the No. column after filtering
    filtered = filtered.map((row, index) => ({
        ...row,
        no: index + 1
    }));
    
    setFilteredData(filtered);
    
    // Calculate summary
    const byStatus: Record<string, number> = {};
    const byService: Record<string, number> = {};
      
    filtered.forEach(b => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      byService[b.serviceType] = (byService[b.serviceType] || 0) + 1;
    });

    setSummary({ totalBookings: filtered.length, byStatus, byService });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleFilter = () => {
    // Parse current inputs to ensure we capture the latest values even if blur hasn't propagated
    // This fixes the race condition where clicking "Apply" immediately after typing uses old state
    const parseDate = (input: string, current: string) => {
      const parts = input.split('/');
      if (parts.length === 3) {
           const month = parseInt(parts[0]);
           const day = parseInt(parts[1]);
           const year = parseInt(parts[2]);
           // Basic validation
           if (!isNaN(month) && !isNaN(day) && !isNaN(year) && 
               month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000) {
               return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
           }
      }
      return current;
    };

    const effectiveFilters = {
        ...filters,
        startDate: parseDate(startDateInput, filters.startDate),
        endDate: parseDate(endDateInput, filters.endDate)
    };
    
    // Update state to match what we are using
    setFilters(effectiveFilters);

    applyFilters(reportData, effectiveFilters);
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map(row => ({
      "NO.": row.no,
      "SHIPMENT NUMBER": row.shipmentNumber,
      "CLIENT NAME": row.clientName,
      "COMMODITY": row.commodity,
      "CONTAINER NUMBER": row.containerNumber,
      "NUMBER OF CONTAINER": row.numberOfContainer,
      "SOA NUMBER": row.soaNumber,
      "BILLING": row.billing,
      "COSTING": row.costing,
      "PROFIT": row.profit,
      "CONTAINER DEPOSIT": row.containerDeposit,
      "BANK NAME/CHECK NUMBER": row.bankNameCheckNumber,
      "CHECK AMOUNT": row.checkAmount,
      "DEPOSIT DATE": row.depositDate,
      "REMARKS": row.remarks
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operations Report");
    XLSX.writeFile(wb, `Operations_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Report exported successfully");
  };
  
  const formatCurrency = (amount: number) => {
    return `₱${formatAmount(amount)}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{ padding: "32px 48px 24px 48px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ 
            fontSize: "32px", 
            fontWeight: 600, 
            color: "#0A1D4D", 
            marginBottom: "4px",
            letterSpacing: "-1.2px"
          }}>
            Reports
          </h1>
          <p style={{ 
            fontSize: "14px", 
            color: "#667085"
          }}>
            Generate reports and analytics across all operational services
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 48px 48px 48px" }}>
        {/* Filters */}
        <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Filter size={20} style={{ color: "var(--neuron-brand-green)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--neuron-ink-primary)", margin: 0 }}>Filters</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Start Date</label>
              <input 
                type="text" 
                placeholder="MM/DD/YYYY"
                maxLength={10}
                value={startDateInput} 
                onChange={(e) => handleDateChange(e.target.value, setStartDateInput)} 
                onBlur={(e) => handleDateBlur(e.target.value, 'startDate')}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }} 
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>End Date</label>
              <input 
                type="text" 
                placeholder="MM/DD/YYYY"
                maxLength={10}
                value={endDateInput} 
                onChange={(e) => handleDateChange(e.target.value, setEndDateInput)} 
                onBlur={(e) => handleDateBlur(e.target.value, 'endDate')}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }} 
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Service Type</label>
              <select value={filters.serviceType} onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })} style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", cursor: "pointer" }}>
                {serviceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", cursor: "pointer" }}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <input type="text" placeholder="Filter by customer name..." value={filters.customer} onChange={(e) => setFilters({ ...filters, customer: e.target.value })} style={{ flex: 1, height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }} />
            <button onClick={handleFilter} style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: "white", backgroundColor: "var(--neuron-brand-green)", border: "none", borderRadius: "8px", cursor: "pointer" }}>Apply Filters</button>
            <button onClick={handleExportExcel} disabled={filteredData.length === 0} style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: "var(--neuron-brand-green)", backgroundColor: "var(--neuron-state-selected)", border: "1px solid var(--neuron-brand-green)", borderRadius: "8px", cursor: filteredData.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <Download size={16} />Export Excel
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--neuron-ink-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Bookings</div>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--neuron-brand-green)" }}>{summary.totalBookings}</div>
          </div>
          <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--neuron-ink-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>By Status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {Object.entries(summary.byStatus).map(([status, count]) => (
                <div key={status} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--neuron-ink-secondary)" }}>
                  <span>{status}</span>
                  <span style={{ fontWeight: 600, color: "var(--neuron-ink-primary)" }}>{count}</span>
                </div>
              ))}
              {Object.keys(summary.byStatus).length === 0 && <span style={{fontSize: "14px", color: "#9CA3AF"}}>No data</span>}
            </div>
          </div>
          <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--neuron-ink-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>By Service</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {Object.entries(summary.byService).map(([service, count]) => (
                <div key={service} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--neuron-ink-secondary)" }}>
                  <span>{service}</span>
                  <span style={{ fontWeight: 600, color: "var(--neuron-ink-primary)" }}>{count}</span>
                </div>
              ))}
              {Object.keys(summary.byService).length === 0 && <span style={{fontSize: "14px", color: "#9CA3AF"}}>No data</span>}
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--neuron-ui-border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--neuron-ink-primary)", margin: 0 }}>Bookings Report</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "2000px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--neuron-bg-page)" }}>
                  {[
                    "NO.", "SHIPMENT NUMBER", "CLIENT NAME", "COMMODITY", "CONTAINER NUMBER",
                    "NUMBER OF CONTAINER", "SOA NUMBER", "BILLING", "COSTING", "PROFIT",
                    "CONTAINER DEPOSIT", "BANK NAME/CHECK NUMBER", "CHECK AMOUNT", "DEPOSIT DATE", "REMARKS"
                  ].map((header) => (
                    <th key={header} style={{ padding: "16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--neuron-ink-muted)", borderBottom: "1px solid var(--neuron-ui-border)", whiteSpace: "nowrap" }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>Loading report data...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={15} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>No bookings match your filters</td></tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.no} style={{ transition: "background-color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.no}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--neuron-brand-green)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.shipmentNumber}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.clientName}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.commodity}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.containerNumber}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", textAlign: "center", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.numberOfContainer}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.soaNumber}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, textAlign: "right", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.billing)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, textAlign: "right", color: "#EF4444", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.costing)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 700, textAlign: "right", color: row.profit >= 0 ? "var(--neuron-brand-green)" : "#EF4444", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.profit)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", textAlign: "right", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.containerDeposit)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.bankNameCheckNumber}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", textAlign: "right", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{formatCurrency(row.checkAmount)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.depositDate}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-muted)", borderBottom: "1px solid var(--neuron-ui-border)", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={row.remarks}>{row.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}