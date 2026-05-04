import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { publicAnonKey } from "../../utils/supabase/info";
import { MonthOrRangeDateFilter } from "../shared/MonthOrRangeDateFilter";
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

// --- Screen table component ---

function ExpenseCategoryTable({ title, data, showParticularsColumn, totalAmount }: ExpenseCategoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [data.length]);

  return (
    <div style={{ backgroundColor: "white", border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>{title}</h3>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F766E", fontFeatureSettings: "'tnum' on, 'lnum' on" }}>
          PHP {formatAmount(totalAmount)}
        </div>
      </div>
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
                <td colSpan={showParticularsColumn ? 4 : 3} style={{ padding: "32px", textAlign: "center", color: "#667085", fontSize: "13px" }}>No records found</td>
              </tr>
            ) : (
              currentData.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #F2F4F7" }}>
                  <td style={{ padding: "12px 24px", fontSize: "13px", color: "#344054" }}>
                    {new Date(row.date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                  </td>
                  <td style={{ padding: "12px 24px", fontSize: "13px", color: "#344054", fontWeight: 500 }}>{row.expenseNumber}</td>
                  {showParticularsColumn && (
                    <td style={{ padding: "12px 24px", fontSize: "13px", color: "#344054" }}>{row.particulars || row.description || "—"}</td>
                  )}
                  <td style={{ padding: "12px 24px", textAlign: "right", fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formatAmount(row.amount)}</td>
                </tr>
              ))
            )}
            <tr style={{ backgroundColor: "#F9FAFB", borderTop: "2px solid #E5E9F0" }}>
              <td style={{ padding: "12px 24px", fontSize: "13px", fontWeight: 600, color: "#0A1D4D" }}>SUBTOTAL</td>
              <td colSpan={showParticularsColumn ? 2 : 1}></td>
              <td style={{ padding: "12px 24px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "#0F766E" }}>{formatAmount(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderTop: "1px solid var(--neuron-ui-border)" }}>
          <div style={{ fontSize: "12px", color: "#667085" }}>Page {currentPage} of {totalPages}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ display: "flex", alignItems: "center", padding: "6px 10px", fontSize: "12px", color: currentPage === 1 ? "#98A2B3" : "#344054", backgroundColor: "white", border: "1px solid #D0D5DD", borderRadius: "6px", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>
              <ChevronLeft size={14} style={{ marginRight: "4px" }} />Previous
            </button>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ display: "flex", alignItems: "center", padding: "6px 10px", fontSize: "12px", color: currentPage === totalPages ? "#98A2B3" : "#344054", backgroundColor: "white", border: "1px solid #D0D5DD", borderRadius: "6px", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>
              Next<ChevronRight size={14} style={{ marginLeft: "4px" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export function ExpenseSummaryReport() {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [dateMode, setDateMode] = useState<"month" | "range">("month");
  const now = new Date();
  const MONTH_ABBRS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const [selectedMonth, setSelectedMonth] = useState(`${MONTH_ABBRS[now.getMonth()]} ${now.getFullYear()}`);
  const [isLoading, setIsLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);

  const [categorizedData, setCategorizedData] = useState<{
    annual: Expense[];
    expenses: Expense[];
    transportation: Expense[];
    salary: Expense[];
    benefits: Expense[];
    utilities: Expense[];
  }>({ annual: [], expenses: [], transportation: [], salary: [], benefits: [], utilities: [] });

  const totals = {
    annual:         categorizedData.annual.reduce((s, i) => s + i.amount, 0),
    expenses:       categorizedData.expenses.reduce((s, i) => s + i.amount, 0),
    transportation: categorizedData.transportation.reduce((s, i) => s + i.amount, 0),
    salary:         categorizedData.salary.reduce((s, i) => s + i.amount, 0),
    benefits:       categorizedData.benefits.reduce((s, i) => s + i.amount, 0),
    utilities:      categorizedData.utilities.reduce((s, i) => s + i.amount, 0),
  };
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const processData = (data: any[]) => {
    const annual: Expense[] = [], expenses: Expense[] = [], transportation: Expense[] = [],
          salary: Expense[] = [], benefits: Expense[] = [], utilities: Expense[] = [];

    data.forEach(item => {
      const dateStr = item.postingDate || item.voucherDate;
      let itemDate = "";
      try {
        if (!dateStr) throw new Error("No date");
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) throw new Error("Invalid date");
        itemDate = d.toISOString().split("T")[0];
      } catch { return; }

      if (dateStart && itemDate < dateStart) return;
      if (dateEnd && itemDate > dateEnd) return;

      const expense: Expense = {
        id: item.id,
        expenseNumber: item.voucherNumber || item.expenseNumber || item.referenceNumber || "—",
        date: dateStr,
        category: item.category || "Uncategorized",
        amount: Number(item.amount) || 0,
        particulars: item.payee || item.particulars || (item.lineItems?.length > 0 ? item.lineItems[0].description : "") || "",
        description: item.description,
      };

      const cat = (item.category || "").trim().toLowerCase();
      if (cat === "annual expenses") annual.push(expense);
      else if (cat === "expenses") expenses.push(expense);
      else if (cat === "transportation") transportation.push(expense);
      else if (cat === "salary") salary.push(expense);
      else if (cat === "benefits") benefits.push(expense);
      else if (cat === "utilities") utilities.push(expense);
    });

    setCategorizedData({ annual, expenses, transportation, salary, benefits, utilities });
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vouchers`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setRawData(result.data);
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

  useEffect(() => { fetchExpenses(); }, []);
  useEffect(() => { if (rawData.length > 0) processData(rawData); }, [dateStart, dateEnd]);

  const handlePrintPDF = () => {
    const fmt = (n: number) =>
      n === 0 ? "—" : n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fmtDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${String(d.getDate()).padStart(2,"0")}-${months[d.getMonth()]}-${d.getFullYear().toString().slice(-2)}`;
      } catch { return dateStr; }
    };

    const periodLabel = (() => {
      if (dateMode === "month") {
        const [abbr, yr] = selectedMonth.split(" ");
        const m = MONTH_ABBRS.indexOf(abbr);
        return m >= 0 ? `${MONTH_FULL[m].toUpperCase()} ${yr}` : selectedMonth.toUpperCase();
      }
      const fmtLong = (iso: string) =>
        new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
      if (dateStart && dateEnd) return `${fmtLong(dateStart)} - ${fmtLong(dateEnd)}`;
      if (dateStart) return `FROM ${fmtLong(dateStart)}`;
      if (dateEnd)   return `UP TO ${fmtLong(dateEnd)}`;
      return "ALL DATES";
    })();

    // Build interleaved rows for the 5 side-by-side category columns
    const cats = [
      categorizedData.transportation,
      categorizedData.expenses,
      categorizedData.salary,
      categorizedData.benefits,
      categorizedData.utilities,
    ];
    const catTotals = [totals.transportation, totals.expenses, totals.salary, totals.benefits, totals.utilities];
    const maxRows = Math.max(...cats.map(c => c.length), 1);

    const bodyRows = Array.from({ length: maxRows }, (_, i) => {
      const cells = cats.map(cat => {
        const row = cat[i];
        if (!row) return `<td></td><td></td><td></td>`;
        return `<td>${fmtDate(row.date)}</td><td>${row.expenseNumber}</td><td>${fmt(row.amount)}</td>`;
      });
      return `<tr>${cells.join("")}</tr>`;
    }).join("");

    const totalRow = catTotals.map(t =>
      `<td colspan="2"></td><td>${fmt(t)}</td>`
    ).join("");

    const annualRows = categorizedData.annual.map(r =>
      `<tr><td>${fmtDate(r.date)}</td><td>${r.expenseNumber}</td><td>${fmt(r.amount)}</td><td>${r.particulars || r.description || ""}</td></tr>`
    ).join("") || `<tr><td colspan="4">—</td></tr>`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Expense Summary Report</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 5.3pt; color: #000; text-transform: uppercase; }
  .period { font-size: 5.6pt; font-weight: bold; margin-bottom: 6px; letter-spacing: 0.5px; }
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
    font-variant-numeric: tabular-nums;
  }
  tr:nth-child(even) td { background: #f7f7f7; }
  .total-row td { background: #e8e8e8 !important; font-weight: bold; border-color: transparent; }
  .section-gap { height: 10px; }
  /* Equal fifths for the 5-category grid (3 sub-cols each = 15 cols) */
  .cat-date  { width: 5.5%; }
  .cat-ref   { width: 8%; }
  .cat-amt   { width: 6.5%; }
  /* Annual table col widths */
  .ann-date { width: 12%; }
  .ann-ref  { width: 14%; }
  .ann-amt  { width: 14%; }
</style>
</head>
<body>
<div class="period">PERIOD: ${periodLabel}</div>
<table>
  <colgroup>
    <col class="cat-date"/><col class="cat-ref"/><col class="cat-amt"/>
    <col class="cat-date"/><col class="cat-ref"/><col class="cat-amt"/>
    <col class="cat-date"/><col class="cat-ref"/><col class="cat-amt"/>
    <col class="cat-date"/><col class="cat-ref"/><col class="cat-amt"/>
    <col class="cat-date"/><col class="cat-ref"/><col class="cat-amt"/>
  </colgroup>
  <thead>
    <tr>
      <th colspan="3">TRANSPORTATION</th>
      <th colspan="3">EXPENSES</th>
      <th colspan="3">SALARY</th>
      <th colspan="3">BENEFITS</th>
      <th colspan="3">UTILITIES</th>
    </tr>
    <tr>
      <th>DATE</th><th>REFERENCE #</th><th>AMOUNT</th>
      <th>DATE</th><th>REFERENCE #</th><th>AMOUNT</th>
      <th>DATE</th><th>REFERENCE #</th><th>AMOUNT</th>
      <th>DATE</th><th>REFERENCE #</th><th>AMOUNT</th>
      <th>DATE</th><th>REFERENCE #</th><th>AMOUNT</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
  <tfoot>
    <tr class="total-row">${totalRow}</tr>
  </tfoot>
</table>

<div class="section-gap"></div>

<table>
  <colgroup>
    <col class="ann-date"/><col class="ann-ref"/><col class="ann-amt"/><col/>
  </colgroup>
  <thead>
    <tr><th colspan="4">EXPENSES (ANNUAL)</th></tr>
    <tr>
      <th>DATE</th><th>REFERENCE #</th><th>AMOUNT</th><th>PARTICULARS</th>
    </tr>
  </thead>
  <tbody>${annualRows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="2"></td>
      <td>${fmt(totals.annual)}</td>
      <td></td>
    </tr>
  </tfoot>
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

  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ padding: "20px 48px", borderBottom: "1px solid #E5E9F0", background: "white", maxWidth: "1440px", width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={() => navigate("/reports")} style={{ background: "transparent", border: "none", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#6B7280", borderRadius: "6px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>Expense Summary Report</h1>
              <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>Consolidated view of expense vouchers by category</p>
            </div>
          </div>
          <button onClick={handlePrintPDF} style={{ height: "40px", padding: "0 20px", fontSize: "14px", fontWeight: 600, color: "white", backgroundColor: "var(--neuron-brand-green)", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <Printer size={16} />
            Print PDF
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: "16px" }}>
          <div style={{ width: "400px" }}>
            <MonthOrRangeDateFilter label="Date Range" dateStart={dateStart} dateEnd={dateEnd} onStartDateChange={setDateStart} onEndDateChange={setDateEnd} onModeChange={setDateMode} onMonthChange={setSelectedMonth} />
          </div>
        </div>
      </div>

      {/* Screen content */}
      <div style={{ padding: "32px 48px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ backgroundColor: "white", border: "1px solid #E5E9F0", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0" }}>Consolidated Expense Total</h2>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#0F766E", lineHeight: 1, letterSpacing: "-0.5px", fontFeatureSettings: "'tnum' on, 'lnum' on" }}>
            PHP {formatAmount(grandTotal)}
          </div>
        </div>
        <ExpenseCategoryTable title="ANNUAL EXPENSES" data={categorizedData.annual} showParticularsColumn={true} totalAmount={totals.annual} />
        <ExpenseCategoryTable title="EXPENSES" data={categorizedData.expenses} showParticularsColumn={false} totalAmount={totals.expenses} />
        <ExpenseCategoryTable title="TRANSPORTATION" data={categorizedData.transportation} showParticularsColumn={false} totalAmount={totals.transportation} />
        <ExpenseCategoryTable title="SALARY" data={categorizedData.salary} showParticularsColumn={false} totalAmount={totals.salary} />
        <ExpenseCategoryTable title="BENEFITS" data={categorizedData.benefits} showParticularsColumn={false} totalAmount={totals.benefits} />
        <ExpenseCategoryTable title="UTILITIES" data={categorizedData.utilities} showParticularsColumn={false} totalAmount={totals.utilities} />
      </div>
    </div>
  );
}
