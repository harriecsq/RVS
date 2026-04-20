import { useState, useEffect } from "react";
import { ChevronRight, Download, Filter, ChevronLeft, ChevronRight as ChevronRightIcon, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";

// --- Data Interfaces ---

interface ExpenseLineItem {
  category: string;
  description: string;
  amount: number;
  voucherNo?: string;
}

interface Expense {
  id: string;
  expenseNumber: string;
  charges?: ExpenseLineItem[];
  status: string;
}

interface Voucher {
  id: string;
  voucherNumber: string;
  payee?: string; // Often used for Shipping Line
  shippingLine?: string; // explicit field if available
  vesselVoy?: string;
  blNumber?: string;
  containerNumbers?: string[];
  checkNo?: string;
  voucherDate: string;
  status: string;
}

interface ContainerRefundRow {
  id: string;
  voucherNo: string;
  shippingLine: string;
  vesselVoy: string;
  blNo: string;
  containerNos: string[];
  depositAmount: number;
  checkNoIssued: string;
  dateIssued: string;
  refundStatus: string;
  refundCheckNo: string;
  refundAmount: number;
  refundDate: string;
  deduction: number | null;
}

// --- Types ---

interface FilterState {
  dateIssuedStart: string;
  dateIssuedEnd: string;
  refundDateStart: string;
  refundDateEnd: string;
  shippingLine: string;
  refundStatus: string;
  searchQuery: string;
}

// --- Components ---

function KPICard({ label, value }: { label: string; value: string }) {
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
        color: "var(--neuron-brand-green)"
      }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = "#F3F4F6";
  let color = "#344054";

  if (status.startsWith("REFUNDED")) {
    bg = "#DEF7EC";
    color = "#03543F";
  } else if (status === "Waiting for Approval of CONDEP Refund") {
    bg = "#FFF8F1";
    color = "#92400E";
  } else if (status === "Not Refunded") {
    bg = "#F3F4F6";
    color = "#344054";
  }

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

export function ContainerRefundReport() {
  // State
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    dateIssuedStart: "",
    dateIssuedEnd: "",
    refundDateStart: "",
    refundDateEnd: "",
    shippingLine: "All",
    refundStatus: "All",
    searchQuery: ""
  });

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ContainerRefundRow[]>([]);
  
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
      // Fetch Expenses (Anchor) and Vouchers (Lookup) in parallel
      const [expensesRes, vouchersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/expenses`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
        fetch(`${API_BASE_URL}/vouchers`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      ]);

      const expensesResult = await expensesRes.json();
      const vouchersResult = await vouchersRes.json();

      const expenses: Expense[] = expensesResult.success ? expensesResult.data : [];
      const vouchers: Voucher[] = vouchersResult.success ? vouchersResult.data : [];

      // Create lookup map for vouchers by voucherNumber for O(1) access
      const voucherMap = new Map<string, Voucher>();
      vouchers.forEach(v => {
        if (v.voucherNumber) voucherMap.set(v.voucherNumber, v);
      });

      const processedRows: ContainerRefundRow[] = [];

      // Track voucher numbers already processed via expenses to avoid duplicates
      const processedVoucherNos = new Set<string>();

      // Iterate Expenses (Anchor Source)
      expenses.forEach(expense => {
        // Only look for "Refundable Deposits" line items
        if (expense.charges && Array.isArray(expense.charges)) {
          expense.charges.forEach((charge: any, index) => {
             // Check if category is Refundable Deposits
             if (charge.category === "Refundable Deposits" || charge.category === "Container Deposit") {
                
                const voucherNo = charge.voucherNo || "";
                let linkedVoucher: Voucher | undefined;

                if (voucherNo) {
                    linkedVoucher = voucherMap.get(voucherNo);
                    processedVoucherNos.add(voucherNo);
                }

                // Calculate Status
                const refundDateSubmitted = charge.refundDateSubmitted;
                const refundDateRefunded = charge.refundDateRefunded;
                const refundAmount = charge.refundAmount;
                const refundCheckNo = charge.refundCheckNo || "";

                let status = "Not Refunded";
                let formattedRefundDate = "";

                if (refundDateRefunded) {
                     const dateObj = new Date(refundDateRefunded);
                     if (!isNaN(dateObj.getTime())) {
                         const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                         const day = String(dateObj.getDate()).padStart(2, '0');
                         const year = dateObj.getFullYear();
                         formattedRefundDate = `${month}/${day}/${year}`;
                         status = `REFUNDED (${formattedRefundDate})`;
                     } else {
                         status = "REFUNDED";
                     }
                } else if (refundDateSubmitted) {
                    status = "Waiting for Approval of CONDEP Refund";
                }

                // Calculate deposit — try expense charge amount first, then fall back to voucher's Container Deposit line item
                let depositVal = typeof charge.amount === 'number' ? charge.amount : (parseFloat(charge.amount || 0) || 0);
                
                // If expense charge has 0 amount but voucher has a Container Deposit line item with an amount, use that
                if (depositVal <= 0 && linkedVoucher && (linkedVoucher as any).lineItems) {
                    const voucherDepositLine = ((linkedVoucher as any).lineItems as any[]).find(
                        (li: any) => li.description === "Container Deposit" && li.type === "particulars"
                    );
                    if (voucherDepositLine) {
                        depositVal = typeof voucherDepositLine.amount === 'number' 
                            ? voucherDepositLine.amount 
                            : (parseFloat(voucherDepositLine.amount || 0) || 0);
                    }
                }

                const refundVal = typeof refundAmount === 'number' ? refundAmount : (parseFloat(refundAmount || 0) || 0);
                
                // Skip entries with no deposit amount — this report is only for containers with actual deposits
                if (depositVal <= 0) return;

                // Only calculate deduction if refund has been processed (Date Refunded has value)
                const deduction = refundDateRefunded ? Math.max(0, depositVal - refundVal) : null;

                processedRows.push({
                    id: `${expense.id}-${index}`,
                    voucherNo: voucherNo || "—",
                    depositAmount: depositVal,
                    
                    // Lookup fields from Voucher
                    shippingLine: linkedVoucher?.payee || linkedVoucher?.shippingLine || "—",
                    vesselVoy: linkedVoucher?.vesselVoy || "—",
                    blNo: linkedVoucher?.blNumber || "—",
                    containerNos: linkedVoucher?.containerNumbers || [],
                    checkNoIssued: linkedVoucher?.checkNo || "—",
                    dateIssued: linkedVoucher?.voucherDate ? new Date(linkedVoucher.voucherDate).toLocaleDateString('en-US') : "—",
                    
                    refundStatus: status, 
                    refundCheckNo: refundCheckNo,
                    refundAmount: refundVal,
                    refundDate: formattedRefundDate,
                    deduction: deduction
                });
             }
          });
        }
      });

      // Second pass: scan vouchers directly for Container Deposit line items not already covered by expenses
      vouchers.forEach(voucher => {
        if (processedVoucherNos.has(voucher.voucherNumber)) return; // Already handled via expense

        const lineItems = (voucher as any).lineItems as any[] | undefined;
        if (!lineItems || !Array.isArray(lineItems)) return;

        lineItems.forEach((li: any, liIndex: number) => {
          if (li.description === "Container Deposit" && li.type === "particulars") {
            const depositVal = typeof li.amount === 'number' ? li.amount : (parseFloat(li.amount || 0) || 0);
            if (depositVal <= 0) return;

            processedRows.push({
              id: `voucher-${voucher.id}-${liIndex}`,
              voucherNo: voucher.voucherNumber,
              depositAmount: depositVal,
              shippingLine: voucher.payee || voucher.shippingLine || "—",
              vesselVoy: voucher.vesselVoy || "—",
              blNo: voucher.blNumber || "—",
              containerNos: voucher.containerNumbers || [],
              checkNoIssued: voucher.checkNo || "—",
              dateIssued: voucher.voucherDate ? new Date(voucher.voucherDate).toLocaleDateString('en-US') : "—",
              refundStatus: "Not Refunded",
              refundCheckNo: "",
              refundAmount: 0,
              refundDate: "",
              deduction: null
            });
          }
        });
      });

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
    // Search Query Logic
    if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matches = 
            item.voucherNo.toLowerCase().includes(q) ||
            item.blNo.toLowerCase().includes(q) ||
            item.containerNos.some(c => c.toLowerCase().includes(q)) ||
            item.shippingLine.toLowerCase().includes(q) ||
            item.checkNoIssued.toLowerCase().includes(q) ||
            item.refundCheckNo.toLowerCase().includes(q) ||
            item.vesselVoy.toLowerCase().includes(q);
        
        if (!matches) return false;
    }

    if (filters.shippingLine !== "All" && item.shippingLine !== filters.shippingLine) return false;
    if (filters.refundStatus !== "All") {
        if (filters.refundStatus === "Refunded") {
             if (!item.refundStatus.startsWith("REFUNDED")) return false;
        } else if (filters.refundStatus === "Waiting") {
             if (item.refundStatus !== "Waiting for Approval of CONDEP Refund") return false;
        } else {
             if (item.refundStatus !== filters.refundStatus) return false;
        }
    }
    
    // Date Logic
    // Convert item date (MM/DD/YYYY) to ISO (YYYY-MM-DD) for comparison
    const itemDateIssuedParts = item.dateIssued.split('/');
    let itemDateIssuedISO = "";
    if (itemDateIssuedParts.length === 3) {
         // Assuming output of toLocaleDateString('en-US') is MM/DD/YYYY
         itemDateIssuedISO = `${itemDateIssuedParts[2]}-${itemDateIssuedParts[0].padStart(2, '0')}-${itemDateIssuedParts[1].padStart(2, '0')}`;
    }

    if (filters.dateIssuedStart && itemDateIssuedISO < filters.dateIssuedStart) return false;
    if (filters.dateIssuedEnd && itemDateIssuedISO > filters.dateIssuedEnd) return false;
    
    // Refund date comparison would go here (similar logic)
    if (filters.refundDateStart) {
        if (!item.refundDate) return false; 
        // Convert refund date if needed
    }

    return true;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleExport = () => {
    toast.success("Exporting to Excel...");
  };

  const formatCurrency = (val: number) => 
    `₱${formatAmount(val)}`;

  // Summary Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const totalDeposits = filteredData.reduce((acc, curr) => acc + curr.depositAmount, 0);
  
  const totalRefunded = filteredData
    .filter(i => i.refundDate !== "") // Only rows where refundDate exists (meaning refundDateRefunded was present)
    .reduce((acc, curr) => acc + curr.refundAmount, 0);

  const totalPending = filteredData.filter(i => i.refundStatus === "Waiting for Approval of CONDEP Refund").length;
  
  const totalDeductions = filteredData
    .filter(i => i.refundDate !== "") // Only rows where refundDate exists
    .reduce((acc, curr) => acc + (curr.deduction ?? 0), 0);

  // Get unique shipping lines for filter dropdown
  const uniqueShippingLines = Array.from(new Set(data.map(i => i.shippingLine).filter(s => s !== "—")));

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
                Container Refund Monitoring
              </h1>
              <p style={{ 
                fontSize: "14px", 
                color: "#667085"
              }}>
                Audit container deposits, refunds, and return statuses
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
                placeholder="Search voucher, BL, container, check number..."
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
             {/* Row 1 */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Date Issued (From - To)</label>
              <UnifiedDateRangeFilter
                startDate={filters.dateIssuedStart}
                endDate={filters.dateIssuedEnd}
                onStartDateChange={(v) => setFilters({...filters, dateIssuedStart: v})}
                onEndDateChange={(v) => setFilters({...filters, dateIssuedEnd: v})}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Refund Date (From - To)</label>
              <UnifiedDateRangeFilter
                startDate={filters.refundDateStart}
                endDate={filters.refundDateEnd}
                onStartDateChange={(v) => setFilters({...filters, refundDateStart: v})}
                onEndDateChange={(v) => setFilters({...filters, refundDateEnd: v})}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Shipping Line</label>
              <FilterSingleDropdown
                value={filters.shippingLine}
                onChange={(v) => setFilters({...filters, shippingLine: v})}
                options={[
                  { value: "All", label: "All Shipping Lines" },
                  ...uniqueShippingLines.map(sl => ({ value: sl, label: sl })),
                ]}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>Refund Status</label>
              <FilterSingleDropdown
                value={filters.refundStatus}
                onChange={(v) => setFilters({...filters, refundStatus: v})}
                options={[
                  { value: "All", label: "All Statuses" },
                  { value: "Waiting", label: "Waiting for Approval" },
                  { value: "Refunded", label: "Refunded" },
                  { value: "Not Refunded", label: "Not Refunded" },
                ]}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* --- KPI Section --- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <KPICard label="Total Deposits Issued" value={formatCurrency(totalDeposits)} />
          <KPICard label="Total Refunded" value={formatCurrency(totalRefunded)} />
          <KPICard label="Pending Refunds" value={totalPending.toString()} />
          <KPICard label="Total Deductions" value={formatCurrency(totalDeductions)} />
        </div>

        {/* --- Data Table --- */}
        <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1400px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--neuron-bg-page)" }}>
                  {[
                    "Voucher No", "Shipping Line", "Vessel/VOY", "BL No", "Container Nos",
                    "Deposit Amount", "Check No (Issued)", "Date Issued", "Refund Status",
                    "Refund Check No", "Refund Date", "Deduction"
                  ].map((header) => (
                    <th key={header} style={{ 
                      padding: "16px", 
                      textAlign: "left", 
                      fontSize: "11px", 
                      fontWeight: 600, 
                      color: "var(--neuron-ink-muted)", 
                      borderBottom: "1px solid var(--neuron-ui-border)", 
                      whiteSpace: "nowrap",
                      textTransform: "uppercase"
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                    <tr>
                      <td colSpan={12} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                        Loading data...
                      </td>
                    </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  currentData.map((row) => (
                    <tr 
                      key={row.id} 
                      style={{ transition: "background-color 0.15s" }} 
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)"; }} 
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)", fontWeight: 500 }}>{row.voucherNo}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.shippingLine}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.vesselVoy}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.blNo}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {row.containerNos.length > 0 ? row.containerNos.map((cn, i) => <span key={i}>{cn}</span>) : "—"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)", fontFamily: "monospace" }}>{formatCurrency(row.depositAmount)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.checkNoIssued}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.dateIssued}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                        <StatusBadge status={row.refundStatus} />
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.refundCheckNo || "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{row.refundDate || "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: (row.deduction ?? 0) > 0 ? "#EF4444" : "var(--neuron-ink-muted)", borderBottom: "1px solid var(--neuron-ui-border)", fontWeight: (row.deduction ?? 0) > 0 ? 600 : 400 }}>
                        {row.deduction !== null ? formatCurrency(row.deduction) : "—"}
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