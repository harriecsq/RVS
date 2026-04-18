import { useState, useEffect } from "react";
import { Download, ChevronLeft, ChevronRight, Calendar, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import * as XLSX from "xlsx";
import { formatAmount } from "../../utils/formatAmount";
import { useNavigate } from "react-router";
import { API_BASE_URL } from '@/utils/api-config';

// --- Data Interfaces ---

interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  voucherDate?: string;
  postingDate?: string;
  created_at?: string;
  category: string;
  amount: number;
  particulars?: string;
  description?: string;
}

interface ExpenseCategoryTableProps {
  title: string;
  data: Expense[];
  showParticularsColumn: boolean;
  totalAmount: number;
}

// --- Components ---

function ExpenseCategoryTable({ title, data, showParticularsColumn, totalAmount }: ExpenseCategoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return (
    <div style={{
      backgroundColor: "white",
      border: "1px solid #E5E9F0",
      borderRadius: "12px",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid #E5E9F0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F9FAFB"
      }}>
        <h3 style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#0A1D4D",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          margin: 0
        }}>
          {title}
        </h3>
        <div style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "#0F766E",
          fontFeatureSettings: "'tnum' on, 'lnum' on"
        }}>
          PHP {formatAmount(totalAmount)}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "white", borderBottom: "1px solid var(--neuron-ui-border)" }}>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Date</th>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Reference #</th>
              {showParticularsColumn && (
                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Particulars</th>
              )}
              <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={showParticularsColumn ? 4 : 3} style={{ padding: "32px", textAlign: "center", color: "#667085", fontSize: "13px" }}>
                  No records found
                </td>
              </tr>
            ) : (
              currentData.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #F2F4F7" }}>
                  <td style={{ padding: "12px 24px", fontSize: "13px", color: "#344054" }}>
                    {new Date(row.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </td>
                  <td style={{ padding: "12px 24px", fontSize: "13px", color: "#344054", fontWeight: 500 }}>
                    {row.expenseNumber}
                  </td>
                  {showParticularsColumn && (
                    <td style={{ padding: "12px 24px", fontSize: "13px", color: "#344054" }}>
                      {row.particulars || row.description || "—"}
                    </td>
                  )}
                  <td style={{ padding: "12px 24px", textAlign: "right", fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                    {formatAmount(row.amount)}
                  </td>
                </tr>
              ))
            )}
            
            {/* Subtotal Row */}
            <tr style={{ backgroundColor: "#F9FAFB", borderTop: "2px solid #E5E9F0" }}>
              <td style={{ padding: "12px 24px", fontSize: "13px", fontWeight: 600, color: "#0A1D4D" }}>
                SUBTOTAL
              </td>
              <td colSpan={showParticularsColumn ? 2 : 1}></td>
              <td style={{ padding: "12px 24px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "#0F766E" }}>
                {formatAmount(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          borderTop: "1px solid var(--neuron-ui-border)"
        }}>
          <div style={{ fontSize: "12px", color: "#667085" }}>
            Page {currentPage} of {totalPages}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 10px",
                fontSize: "12px",
                color: currentPage === 1 ? "#98A2B3" : "#344054",
                backgroundColor: "white",
                border: "1px solid #D0D5DD",
                borderRadius: "6px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={14} style={{ marginRight: "4px" }} />
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 10px",
                fontSize: "12px",
                color: currentPage === totalPages ? "#98A2B3" : "#344054",
                backgroundColor: "white",
                border: "1px solid #D0D5DD",
                borderRadius: "6px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
              <ChevronRight size={14} style={{ marginLeft: "4px" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExpenseSummaryReport() {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Categorized Data State
  const [categorizedData, setCategorizedData] = useState<{
    annual: Expense[],
    expenses: Expense[],
    transportation: Expense[],
    salary: Expense[],
    benefits: Expense[],
    utilities: Expense[]
  }>({
    annual: [],
    expenses: [],
    transportation: [],
    salary: [],
    benefits: [],
    utilities: []
  });

  // Calculate totals
  const totals = {
    annual: categorizedData.annual.reduce((sum, item) => sum + item.amount, 0),
    expenses: categorizedData.expenses.reduce((sum, item) => sum + item.amount, 0),
    transportation: categorizedData.transportation.reduce((sum, item) => sum + item.amount, 0),
    salary: categorizedData.salary.reduce((sum, item) => sum + item.amount, 0),
    benefits: categorizedData.benefits.reduce((sum, item) => sum + item.amount, 0),
    utilities: categorizedData.utilities.reduce((sum, item) => sum + item.amount, 0),
  };
  
  const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // Fetch VOUCHERS instead of expenses, as the system now uses the Voucher module
      const response = await fetch(`${API_BASE_URL}/vouchers`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setRawData(result.data); // Store raw data for local filtering
        processData(result.data);
      } else {
        toast.error("Failed to fetch vouchers");
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      toast.error("Error loading data");
    } finally {
      setIsLoading(false);
    }
  };

  const processData = (data: any[]) => {
    // Categories containers
    const annual: Expense[] = [];
    const expenses: Expense[] = [];
    const transportation: Expense[] = [];
    const salary: Expense[] = [];
    const benefits: Expense[] = [];
    const utilities: Expense[] = [];

    data.forEach(item => {
      // Safety check for date
      // Prefer postingDate (accounting month basis); fall back to voucherDate/created_at for legacy data
      const dateStr = item.postingDate || item.voucherDate || item.date || item.created_at;
      let itemDate = "";
      
      try {
        if (!dateStr) throw new Error("No date");
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) throw new Error("Invalid date");
        itemDate = d.toISOString().split('T')[0];
      } catch (e) {
        console.warn("Skipping item with invalid date:", item);
        return; // Skip this item
      }

      // 1. Filter by Date Range if set
      if (dateStart && itemDate < dateStart) return;
      if (dateEnd && itemDate > dateEnd) return;

      // Map Voucher fields to Expense interface
      const expense: Expense = {
        id: item.id,
        expenseNumber: item.voucherNumber || item.expenseNumber || item.referenceNumber || "—",
        date: dateStr, // Keep original string for display if needed, or standardized
        category: item.category || "Uncategorized",
        amount: Number(item.amount) || 0,
        // Map Payee + Description to Particulars
        particulars: item.payee || item.particulars || (item.lineItems && item.lineItems.length > 0 ? item.lineItems[0].description : "") || "",
        description: item.description
      };

      // 2. Strict Categorization (Exclude Shipping Line & Trucking)
      const cat = (item.category || "").trim().toLowerCase();
      
      // Strict matching based on exact string values (case-insensitive for robustness)
      if (cat === "annual expenses") {
        annual.push(expense);
      } else if (cat === "expenses") {
        expenses.push(expense);
      } else if (cat === "transportation") {
        transportation.push(expense);
      } else if (cat === "salary") {
        salary.push(expense);
      } else if (cat === "benefits") {
        benefits.push(expense);
      } else if (cat === "utilities") {
        utilities.push(expense);
      } 
      // Note: "Shipping Line", "Trucking", "Uncategorized" and legacy categories are intentionally IGNORED.
    });

    setCategorizedData({
      annual,
      expenses,
      transportation,
      salary,
      benefits,
      utilities
    });
  };

  // Initial load
  useEffect(() => {
    fetchExpenses();
  }, []);

  // Removed redundant second useEffect and rawData state duplication
  const [rawData, setRawData] = useState<any[]>([]);

  // Auto-apply filters when dates change
  useEffect(() => {
    if (rawData.length > 0) {
      processData(rawData);
    }
  }, [dateStart, dateEnd]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Helper to format data for Excel
    const formatForExcel = (data: Expense[], includeParticulars: boolean) => {
      return data.map(item => {
        const row: any = {
          "Date": new Date(item.date).toLocaleDateString(),
          "Reference #": item.expenseNumber,
        };
        if (includeParticulars) {
          row["Particulars"] = item.particulars || "—";
        }
        row["Amount"] = item.amount;
        return row;
      });
    };

    // 1. Summary Sheet
    const summaryData = [
      { Category: "Annual Expenses", Amount: totals.annual },
      { Category: "Expenses", Amount: totals.expenses },
      { Category: "Transportation", Amount: totals.transportation },
      { Category: "Salary", Amount: totals.salary },
      { Category: "Benefits", Amount: totals.benefits },
      { Category: "Utilities", Amount: totals.utilities },
      { Category: "TOTAL", Amount: grandTotal },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // 2. Annual Expenses
    const wsAnnual = XLSX.utils.json_to_sheet(formatForExcel(categorizedData.annual, true));
    XLSX.utils.book_append_sheet(wb, wsAnnual, "Annual Expenses");

    // 3. Expenses
    const wsExpenses = XLSX.utils.json_to_sheet(formatForExcel(categorizedData.expenses, false));
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses");

    // 4. Transportation
    const wsTransport = XLSX.utils.json_to_sheet(formatForExcel(categorizedData.transportation, false));
    XLSX.utils.book_append_sheet(wb, wsTransport, "Transportation");

    // 5. Salary
    const wsSalary = XLSX.utils.json_to_sheet(formatForExcel(categorizedData.salary, false));
    XLSX.utils.book_append_sheet(wb, wsSalary, "Salary");

    // 6. Benefits
    const wsBenefits = XLSX.utils.json_to_sheet(formatForExcel(categorizedData.benefits, false));
    XLSX.utils.book_append_sheet(wb, wsBenefits, "Benefits");

    // 7. Utilities
    const wsUtilities = XLSX.utils.json_to_sheet(formatForExcel(categorizedData.utilities, false));
    XLSX.utils.book_append_sheet(wb, wsUtilities, "Utilities");

    XLSX.writeFile(wb, `ExpenseSummaryReport_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Report exported successfully");
  };

  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{
        padding: "20px 48px",
        borderBottom: "1px solid #E5E9F0",
        background: "white",
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
              <h1 style={{ 
                fontSize: "20px", 
                fontWeight: 600, 
                color: "#0A1D4D", 
                marginBottom: "2px"
              }}>
                Expense Summary Report
              </h1>
              <p style={{ 
                fontSize: "13px", 
                color: "#667085",
                margin: 0
              }}>
                Consolidated view of expense vouchers by category
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
              backgroundColor: "white", 
              border: "1px solid var(--neuron-brand-green)", 
              borderRadius: "8px", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              transition: "background-color 0.15s"
            }}
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>

        {/* Date Filter */}
        <div style={{ display: "flex", alignItems: "end", gap: "16px" }}>
          <div style={{ width: "400px" }}>
            <UnifiedDateRangeFilter
              startDate={dateStart}
              endDate={dateEnd}
              onStartDateChange={setDateStart}
              onEndDateChange={setDateEnd}
              label="Date Range"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 48px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Consolidated Total Card */}
        <div style={{
          backgroundColor: "white",
          border: "1px solid #E5E9F0",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center"
        }}>
          <h2 style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#667085",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            margin: "0 0 8px 0"
          }}>
            Consolidated Expense Total
          </h2>
          <div style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#0F766E",
            lineHeight: 1,
            letterSpacing: "-0.5px",
            fontFeatureSettings: "'tnum' on, 'lnum' on"
          }}>
            PHP {formatAmount(grandTotal)}
          </div>
        </div>

        <ExpenseCategoryTable 
          title="ANNUAL EXPENSES" 
          data={categorizedData.annual} 
          showParticularsColumn={true} 
          totalAmount={totals.annual}
        />

        <ExpenseCategoryTable 
          title="EXPENSES" 
          data={categorizedData.expenses} 
          showParticularsColumn={false} 
          totalAmount={totals.expenses}
        />

        <ExpenseCategoryTable 
          title="TRANSPORTATION" 
          data={categorizedData.transportation} 
          showParticularsColumn={false} 
          totalAmount={totals.transportation}
        />

        <ExpenseCategoryTable 
          title="SALARY" 
          data={categorizedData.salary} 
          showParticularsColumn={false} 
          totalAmount={totals.salary}
        />

        <ExpenseCategoryTable 
          title="BENEFITS" 
          data={categorizedData.benefits} 
          showParticularsColumn={false} 
          totalAmount={totals.benefits}
        />

        <ExpenseCategoryTable 
          title="UTILITIES" 
          data={categorizedData.utilities} 
          showParticularsColumn={false} 
          totalAmount={totals.utilities}
        />

      </div>
    </div>
  );
}