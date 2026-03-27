import { useState, useEffect } from "react";
import { Download, Filter, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';

// --- Interfaces ---

interface Booking {
  id: string;
  bookingId?: string;
  booking_id?: string;
  bookingNumber?: string;
  booking_number?: string;
  bookingDate?: string;
  booking_date?: string;
  created_at?: string;
  clientName?: string;
  customerName?: string;
  customer_name?: string;
  mode?: string; // SEA, AIR
  shipmentType?: string; // IMPS, EXPS
  shipment_type?: string;
  branch?: string; // If available directly
  origin?: string;
  destination?: string;
  port?: string;
  status?: string;
}

interface Billing {
  id: string;
  bookingId?: string;
  booking_id?: string;
  bookingIds?: string[];
  booking_ids?: string[];
  totalAmount?: number;
  total_amount?: number;
  soaNumber?: string;
  soa_number?: string;
  billingNumber?: string;
  billing_number?: string;
  billingDate?: string;
  billing_date?: string;
  soaDate?: string;
  soa_date?: string;
  created_at?: string;
}

interface Expense {
  id: string;
  bookingId?: string;
  booking_id?: string;
  bookingIds?: string[];
  booking_ids?: string[];
  linkedBookingIds?: string[];
  linked_booking_ids?: string[];
  charges: { category: string; description: string; amount: number }[];
  amount?: number;
  category?: string;
  expenseDate?: string;
  expense_date?: string;
  date?: string;
  created_at?: string;
}

interface Voucher {
  id: string;
  voucherDate: string;
  category: string; // e.g., "Transportation", "Salary"
  amount: number;
  payee?: string;
  status?: string;
}

interface FilterState {
  dateStart: string;
  dateEnd: string;
}

// --- Helper Components ---

function TableRow({ label, amount, isTotal = false }: { label: string; amount: number; isTotal?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderTop: isTotal ? "2px solid #E5E9F0" : "none",
      marginTop: isTotal ? "4px" : "0",
      fontWeight: isTotal ? 700 : 400,
      color: isTotal ? "#0A1D4D" : "#4B5563"
    }}>
      <div>{label}</div>
      <div style={{ textAlign: "right" }}>
        {amount < 0 ? "-" : ""}₱{formatAmount(Math.abs(amount))}
      </div>
    </div>
  );
}

export function ProfitLossPeriodReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    dateStart: "",
    dateEnd: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    revenue: {
      luzonImport: number;
      luzonExport: number;
      cdoImport: number;
      cdoExport: number;
    };
    expenses: {
      annual: number;
      expenses: number;
      salary: number;
      benefits: number;
      transportation: number;
      utilities: number;
    };
  } | null>(null);

  // --- Helpers ---

  const toISODate = (dateStr: string | undefined): string => {
    if (!dateStr) return "";
    // If YYYY-MM-DD (ISO start)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split('T')[0];
    // If MM/DD/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
    }
    return "";
  };

  const normalizeId = (id: any): string => {
    if (!id) return "";
    return String(id).trim().toLowerCase();
  };

  const parseAmount = (amount: any): number => {
    if (amount === undefined || amount === null) return 0;
    if (typeof amount === 'number') return amount;
    const str = String(amount).replace(/[^0-9.-]/g, ''); // Keep only numbers, dot, and minus
    return parseFloat(str) || 0;
  };

  // --- Data Fetching ---

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${publicAnonKey}` };

      // Parallel fetch: Bookings/Billings/Expenses (for Revenue) AND Vouchers (for Expenses)
      const [bookingsRes, billingsRes, expensesRes, vouchersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings`, { headers }),
        fetch(`${API_BASE_URL}/billings`, { headers }),
        fetch(`${API_BASE_URL}/expenses`, { headers }),
        fetch(`${API_BASE_URL}/vouchers`, { headers })
      ]);

      const bookingsData = await bookingsRes.json();
      const billingsData = await billingsRes.json();
      const expensesData = await expensesRes.json();
      const vouchersData = await vouchersRes.json();

      const bookings: Booking[] = bookingsData.success ? bookingsData.data : [];
      const billings: Billing[] = billingsData.success ? billingsData.data : [];
      const shipmentExpenses: Expense[] = expensesData.success ? expensesData.data : [];
      const vouchers: Voucher[] = vouchersData.success ? vouchersData.data : [];

      // --- Process Revenue (Profit per Booking) ---

      // 1. Create a Booking Lookup Map (ID/Number -> Booking)
      // This allows looking up booking details (Date, Type) from any identifier
      const bookingLookup = new Map<string, Booking>();
      bookings.forEach(b => {
          if (b.id) bookingLookup.set(normalizeId(b.id), b);
          if (b.bookingId) bookingLookup.set(normalizeId(b.bookingId), b);
          if (b.booking_id) bookingLookup.set(normalizeId(b.booking_id), b);
          if (b.bookingNumber) bookingLookup.set(normalizeId(b.bookingNumber), b);
          if (b.booking_number) bookingLookup.set(normalizeId(b.booking_number), b);
      });

      let luzonImport = 0;
      let luzonExport = 0;
      let cdoImport = 0;
      let cdoExport = 0;

      // 2. Iterate Billings (Revenue)
      billings.forEach(b => {
         // Determine Billing Date
         const rawDate = b.billingDate || b.billing_date || b.soaDate || b.soa_date || b.created_at || "";
         const isoDate = toISODate(rawDate);
         
         if (!filters.dateStart || isoDate >= filters.dateStart) {
             if (!filters.dateEnd || isoDate <= filters.dateEnd) {
                 // Billing is in period. Now find Booking to classify it.
                 let linkedBooking: Booking | undefined;
                 
                 const possibleIds: string[] = [];
                 
                 const bIds = b.bookingIds || b.booking_ids;
                 if (bIds && Array.isArray(bIds)) bIds.forEach(id => possibleIds.push(normalizeId(id)));
                 else if (typeof bIds === 'string') possibleIds.push(normalizeId(bIds));
                 
                 const singleId = b.bookingId || b.booking_id;
                 if (singleId) possibleIds.push(normalizeId(singleId));
                 
                 const bRef = (b as any).bookingNumber || (b as any).booking_number;
                 if (bRef) possibleIds.push(normalizeId(bRef));

                 // Find first valid match
                 for (const id of possibleIds) {
                     if (bookingLookup.has(id)) {
                         linkedBooking = bookingLookup.get(id);
                         break;
                     }
                 }

                 if (linkedBooking) {
                     // Add to Revenue based on Booking Type/Region
                     const amount = parseAmount(b.totalAmount || b.total_amount);
                     
                     const sType = linkedBooking.shipmentType || linkedBooking.shipment_type;
                     const type = (sType === "EXPS" || linkedBooking.mode === "Export") ? "Export" : "Import";
                     const region = "Luzon"; // Hardcoded for now

                     if (region === "Luzon") {
                         if (type === "Import") luzonImport += amount;
                         else luzonExport += amount;
                     } else {
                         if (type === "Import") cdoImport += amount;
                         else cdoExport += amount;
                     }
                 }
             }
         }
      });

      // 3. Iterate Expenses (Cost)
      shipmentExpenses.forEach(e => {
         // Determine Expense Date
         const rawDate = e.expenseDate || e.expense_date || e.date || e.created_at || "";
         const isoDate = toISODate(rawDate);
         
         if (!filters.dateStart || isoDate >= filters.dateStart) {
             if (!filters.dateEnd || isoDate <= filters.dateEnd) {
                 // Expense is in period. Now find Booking to classify it.
                 let linkedBooking: Booking | undefined;
                 
                 const possibleIds: string[] = [];
                 
                 const bIds = e.bookingIds || e.booking_ids;
                 if (bIds && Array.isArray(bIds)) bIds.forEach(id => possibleIds.push(normalizeId(id)));
                 
                 const linkedIds = e.linkedBookingIds || e.linked_booking_ids;
                 if (linkedIds && Array.isArray(linkedIds)) linkedIds.forEach(id => possibleIds.push(normalizeId(id)));
                 
                 const singleId = e.bookingId || e.booking_id;
                 if (singleId) possibleIds.push(normalizeId(singleId));
                 
                 const eRef = (e as any).bookingNumber || (e as any).booking_number;
                 if (eRef) possibleIds.push(normalizeId(eRef));

                 // Find first valid match
                 for (const id of possibleIds) {
                     if (bookingLookup.has(id)) {
                         linkedBooking = bookingLookup.get(id);
                         break;
                     }
                 }

                 if (linkedBooking) {
                     // Calculate Amount (excluding deposits)
                     let validAmount = 0;
                     if (e.charges && e.charges.length > 0) {
                         e.charges.forEach(charge => {
                           const isDeposit = (charge.category && charge.category.toLowerCase().includes("deposit")) || 
                                             (charge.description && charge.description.toLowerCase().includes("container deposit"));
                           if (!isDeposit) validAmount += parseAmount(charge.amount);
                         });
                     } else {
                         const isDeposit = (e.category && e.category.toLowerCase().includes("deposit"));
                         if (!isDeposit) validAmount += parseAmount(e.amount);
                     }

                     // Subtract from Revenue (or rather, sum as Cost)
                     const sType = linkedBooking.shipmentType || linkedBooking.shipment_type;
                     const type = (sType === "EXPS" || linkedBooking.mode === "Export") ? "Export" : "Import";
                     const region = "Luzon"; 

                     if (region === "Luzon") {
                         if (type === "Import") luzonImport -= validAmount;
                         else luzonExport -= validAmount;
                     } else {
                         if (type === "Import") cdoImport -= validAmount;
                         else cdoExport -= validAmount;
                     }
                 }
             }
         }
      });

      // --- Process Expenses (Vouchers) ---
      
      const expenseTotals = {
        annual: 0,
        expenses: 0,
        salary: 0,
        benefits: 0,
        transportation: 0,
        utilities: 0
      };

      vouchers.forEach(v => {
        // Date Filter
        const rawDate = v.voucherDate || (v as any).voucher_date || (v as any).created_at || "";
        const vDate = toISODate(rawDate);
        
        if (filters.dateStart && vDate < filters.dateStart) return;
        if (filters.dateEnd && vDate > filters.dateEnd) return;

        const cat = (v.category || "").toLowerCase();
        const amt = parseAmount(v.amount);

        // Explicitly exclude Costing categories
        if (cat.includes("shipping line") || cat.includes("trucking")) return;

        // Map categories
        if (cat.includes("annual")) expenseTotals.annual += amt;
        else if (cat === "expenses" || cat.includes("general expense")) expenseTotals.expenses += amt; // Catch-all "Expenses"
        else if (cat.includes("salary")) expenseTotals.salary += amt;
        else if (cat.includes("benefit")) expenseTotals.benefits += amt;
        else if (cat.includes("transport")) expenseTotals.transportation += amt;
        else if (cat.includes("utilit")) expenseTotals.utilities += amt;
        else {
            // If category matches none explicitly but is not excluded, where does it go?
            // "Expenses" bucket is safest for unmapped.
            if (cat === "expenses") expenseTotals.expenses += amt;
            // If it's something else completely unknown, maybe ignore or put in Expenses?
            // Current strict instruction: "Rows in this exact order: Annual, Expenses, Salary, Benefits, Transportation, Utilities".
            // So if it's "Office Supplies", maybe put in Expenses.
            // I'll check exact string match first, then includes.
            // The prompt says: "Pull from vouchers based on category (already defined in voucher dropdown)."
            // Assuming the dropdown matches these names.
        }
      });

      setReportData({
        revenue: { luzonImport, luzonExport, cdoImport, cdoExport },
        expenses: expenseTotals
      });
      
      toast.success("Data loaded successfully");

    } catch (err) {
      console.error(err);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData) return;
    
    const revTotal = reportData.revenue.luzonImport + reportData.revenue.luzonExport + reportData.revenue.cdoImport + reportData.revenue.cdoExport;
    const expTotal = Object.values(reportData.expenses).reduce((a, b) => a + b, 0);
    const netProfit = revTotal - expTotal;

    const csvContent = [
      ["PROFIT/LOSS PER PERIOD REPORT"],
      [`Date Range: ${filters.dateStart || "Start"} to ${filters.dateEnd || "End"}`],
      [],
      ["REVENUE (Shipment Profit)"],
      ["Category", "Amount"],
      ["Luzon Import", reportData.revenue.luzonImport],
      ["Luzon Export", reportData.revenue.luzonExport],
      ["CDO Import", reportData.revenue.cdoImport],
      ["CDO Export", reportData.revenue.cdoExport],
      ["TOTAL REVENUE", revTotal],
      [],
      ["OPERATING EXPENSES"],
      ["Category", "Amount"],
      ["Annual Expenses", reportData.expenses.annual],
      ["Expenses", reportData.expenses.expenses],
      ["Salary", reportData.expenses.salary],
      ["Benefits", reportData.expenses.benefits],
      ["Transportation", reportData.expenses.transportation],
      ["Utilities", reportData.expenses.utilities],
      ["TOTAL EXPENSES", expTotal],
      [],
      ["NET PROFIT FOR PERIOD", netProfit]
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ProfitLoss_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-fetch when dates change
  useEffect(() => {
    // Only fetch if at least one date is set (avoid empty initial fetch)
    if (filters.dateStart || filters.dateEnd) {
      fetchData();
    }
  }, [filters.dateStart, filters.dateEnd]);

  // --- Render Helpers ---
  
  const revenueTotal = reportData ? (
    reportData.revenue.luzonImport + 
    reportData.revenue.luzonExport + 
    reportData.revenue.cdoImport + 
    reportData.revenue.cdoExport
  ) : 0;

  const expensesTotal = reportData ? (
    reportData.expenses.annual +
    reportData.expenses.expenses +
    reportData.expenses.salary +
    reportData.expenses.benefits +
    reportData.expenses.transportation +
    reportData.expenses.utilities
  ) : 0;

  const netProfit = revenueTotal - expensesTotal;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", paddingBottom: "48px" }}>
      {/* Header */}
      <div style={{
        padding: "20px 48px",
        background: "white",
        borderBottom: "1px solid #E5E9F0",
        maxWidth: "1440px",
        width: "100%",
        margin: "0 auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
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
              <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>
                Profit/Loss per Period
              </h1>
              <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
                Analyze profit performance across a selected date range.
              </p>
            </div>
          </div>
          <button 
            onClick={handleExport}
            disabled={!reportData}
            style={{ 
              height: "40px", 
              padding: "0 20px", 
              fontSize: "14px", 
              fontWeight: 600, 
              color: "#0F766E", 
              backgroundColor: "white", 
              border: "1px solid #0F766E", 
              borderRadius: "8px", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              opacity: !reportData ? 0.5 : 1
            }}
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
          <div style={{ width: "400px" }}>
            <UnifiedDateRangeFilter
              startDate={filters.dateStart}
              endDate={filters.dateEnd}
              onStartDateChange={(v) => setFilters(prev => ({ ...prev, dateStart: v }))}
              onEndDateChange={(v) => setFilters(prev => ({ ...prev, dateEnd: v }))}
              label="Date Range"
            />
          </div>
          {isLoading && (
            <div style={{ fontSize: "13px", color: "#667085", marginBottom: "4px" }}>Loading...</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "32px 48px", maxWidth: "1000px", margin: "0 auto" }}>
        {reportData && (
          <>
            {/* Card Container */}
            <div style={{ 
              backgroundColor: "white", 
              border: "1px solid #E5E9F0", 
              borderRadius: "12px", 
              overflow: "hidden",
              marginBottom: "32px"
            }}>
              
              {/* Revenue Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB" }}>
                <h3 style={{ 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  color: "#0A1D4D", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.5px",
                  margin: 0
                }}>
                  REVENUE (Shipment Profit)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <div style={{ paddingLeft: "8px", paddingRight: "8px" }}>
                    <TableRow label="Luzon Import" amount={reportData.revenue.luzonImport} />
                    <TableRow label="Luzon Export" amount={reportData.revenue.luzonExport} />
                    <TableRow label="CDO Import" amount={reportData.revenue.cdoImport} />
                    <TableRow label="CDO Export" amount={reportData.revenue.cdoExport} />
                    <TableRow label="TOTAL" amount={revenueTotal} isTotal />
                </div>
              </div>

              {/* Expenses Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", borderTop: "1px solid #E5E9F0", background: "#F9FAFB" }}>
                <h3 style={{ 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  color: "#0A1D4D", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.5px",
                  margin: 0
                }}>
                  OPERATING EXPENSES
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <div style={{ paddingLeft: "8px", paddingRight: "8px" }}>
                    <TableRow label="Annual Expenses" amount={reportData.expenses.annual} />
                    <TableRow label="Expenses" amount={reportData.expenses.expenses} />
                    <TableRow label="Salary" amount={reportData.expenses.salary} />
                    <TableRow label="Benefits" amount={reportData.expenses.benefits} />
                    <TableRow label="Transportation" amount={reportData.expenses.transportation} />
                    <TableRow label="Utilities" amount={reportData.expenses.utilities} />
                    <TableRow label="TOTAL" amount={expensesTotal} isTotal />
                </div>
              </div>

            </div>

            {/* Net Profit Summary */}
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", // Right aligned as requested (Center or Right)
              alignItems: "center",
              gap: "24px",
              paddingTop: "8px"
            }}>
              <div style={{ 
                fontSize: "16px", 
                fontWeight: 600, 
                color: "#667085", 
                textTransform: "uppercase", 
                letterSpacing: "1px" 
              }}>
                NET PROFIT FOR PERIOD
              </div>
              <div style={{ 
                fontSize: "32px", 
                fontWeight: 700, 
                color: netProfit >= 0 ? "#15803D" : "#EF4444", // Green if pos, Red if neg
                lineHeight: "1"
              }}>
                {netProfit < 0 ? "-" : ""}₱{formatAmount(Math.abs(netProfit))}
              </div>
            </div>
          </>
        )}

        {!reportData && !isLoading && (
            <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center", 
                height: "300px", 
                color: "#9CA3AF",
                border: "1px dashed #E5E9F0",
                borderRadius: "12px"
            }}>
                <Filter size={48} style={{ marginBottom: "16px", opacity: 0.2 }} />
                <p>Select a date range to generate report.</p>
            </div>
        )}
      </div>
    </div>
  );
}