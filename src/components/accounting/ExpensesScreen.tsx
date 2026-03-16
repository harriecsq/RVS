import { useState, useEffect } from "react";
import { Plus, Search, CreditCard, Clock, CheckCircle, XCircle } from "lucide-react";
import { useLocation } from "react-router";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { CreateExpensePanel } from "./CreateExpensePanel";
import { ViewExpenseScreen } from "./ViewExpenseScreen";
import { formatAmount } from "../../utils/formatAmount";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface ExpensesScreenProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

type ExpenseStatus = "Draft" | "For Approval" | "Approved" | "Paid" | "Partially Paid" | "Rejected";

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  vendor?: string;
  bookingNumber?: string;
  projectNumber?: string;
  amount: number;
  pendingAmount?: number;
  expenseDate: string;
  paymentMethod?: string;
  status: ExpenseStatus;
  createdAt: string;
  clientName?: string;
  companyName?: string;
}

function TabButton({ 
  icon, 
  label, 
  count, 
  isActive, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  count: number; 
  isActive: boolean; 
  color: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        border: "none",
        borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
        background: "transparent",
        color: isActive ? color : "#667085",
        fontWeight: isActive ? 600 : 500,
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {icon}
      <span>{label}</span>
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
          backgroundColor: isActive ? `${color}15` : "#F3F4F6",
          color: isActive ? color : "#667085",
        }}
      >
        {count}
      </span>
    </button>
  );
}

export function ExpensesScreen({ currentUser }: ExpensesScreenProps) {
  const location = useLocation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [showViewScreen, setShowViewScreen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "submitted" | "approved">("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);

  useEffect(() => {
    // Fetch expenses from backend
    fetchExpenses();
    
    // Check if we have an expense ID from navigation state
    const state = location.state as { selectedExpenseId?: string } | null;
    if (state?.selectedExpenseId) {
      // Find the expense by ID after expenses are loaded
      fetchAndSelectExpense(state.selectedExpenseId);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, []);

  const fetchAndSelectExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSelectedExpense(result.data);
          setShowViewScreen(true);
        }
      }
    } catch (error) {
      console.error("Error fetching specific expense:", error);
    }
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch expenses");
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setExpenses(result.data);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateScreen(false);
    fetchExpenses();
  };

  // Show view screen if active
  if (showViewScreen && selectedExpense) {
    return (
      <ViewExpenseScreen
        expenseId={selectedExpense.id}
        onBack={() => {
          setShowViewScreen(false);
          setSelectedExpense(null);
        }}
        onDeleted={() => {
          setShowViewScreen(false);
          setSelectedExpense(null);
          fetchExpenses();
        }}
      />
    );
  }

  // Get unique values for filters
  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean)));
  const uniquePaymentMethods = Array.from(new Set(expenses.map(e => e.paymentMethod).filter(Boolean)));

  // Filter expenses by tab first
  const getFilteredByTab = () => {
    let filtered = expenses;

    if (activeTab === "draft") {
      filtered = expenses.filter(e => e.status === "Draft");
    } else if (activeTab === "submitted") {
      filtered = expenses.filter(e => e.status === "Submitted");
    } else if (activeTab === "approved") {
      filtered = expenses.filter(e => e.status === "Approved");
    }

    return filtered;
  };

  // Apply all filters
  const filteredExpenses = getFilteredByTab().filter(expense => {
    // Search filter
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (expense.expenseNumber || "").toLowerCase().includes(term) ||
      (expense.category || "").toLowerCase().includes(term) ||
      (expense.clientName || "").toLowerCase().includes(term) ||
      (expense.vendor || "").toLowerCase().includes(term) ||
      (expense.bookingNumber || "").toLowerCase().includes(term) ||
      (expense.projectNumber || "").toLowerCase().includes(term);
    
    if (!matchesSearch) return false;

    // Time period filter
    if (dateFilterStart || dateFilterEnd) {
      const expenseDate = new Date(expense.createdAt);
      const expenseISO = expenseDate.toISOString().split("T")[0];
      if (dateFilterStart && expenseISO < dateFilterStart) return false;
      if (dateFilterEnd && expenseISO > dateFilterEnd) return false;
    }

    // Status filter
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    if (!matchesStatus) return false;

    // Category filter
    if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;

    // Payment method filter
    if (paymentMethodFilter !== "all" && expense.paymentMethod !== paymentMethodFilter) return false;

    // Company / Client filter
    if (companyFilter) {
      const expenseCompany = expense.companyName || expense.clientName || "";
      if (expenseCompany !== companyFilter) return false;
      if (clientFilter) {
        const expenseClient = expense.clientName || "";
        if (expenseClient !== clientFilter) return false;
      }
    }

    return true;
  });

  // Calculate counts for tabs
  const allCount = expenses.length;
  const draftCount = expenses.filter(e => e.status === "Draft").length;
  const submittedCount = expenses.filter(e => e.status === "Submitted").length;
  const approvedCount = expenses.filter(e => e.status === "Approved").length;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{ padding: "32px 48px 24px 48px" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "start", 
          justifyContent: "space-between", 
          marginBottom: "24px" 
        }}>
          <div>
            <h1 style={{ 
              fontSize: "32px", 
              fontWeight: 600, 
              color: "#12332B", 
              marginBottom: "4px",
              letterSpacing: "-1.2px"
            }}>
              Expenses
            </h1>
            <p style={{ 
              fontSize: "14px", 
              color: "#667085"
            }}>
              Record and categorize business expenses
            </p>
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => setShowCreateScreen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              background: "#0F766E",
              color: "white",
              cursor: "pointer",
            }}
          >
            <Plus className="w-4 h-4" />
            New Expense
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#667085",
            }}
          />
          <input
            type="text"
            placeholder="Search by Expense Number, Client, Vendor, Booking, or Project Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
            }}
          />
        </div>

        {/* Filter Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          {/* Time Period Filter */}
          <div style={{ gridColumn: "span 2" }}>
            <UnifiedDateRangeFilter
              startDate={dateFilterStart}
              endDate={dateFilterEnd}
              onStartDateChange={setDateFilterStart}
              onEndDateChange={setDateFilterEnd}
              compact
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | "all")}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="For Approval">For Approval</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Payment Methods</option>
            {uniquePaymentMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>

          {/* Company / Client Filter */}
          <CompanyClientFilter
            items={expenses}
            getCompany={(e) => e.companyName || e.clientName || ""}
            getClient={(e) => e.clientName || ""}
            selectedCompany={companyFilter}
            selectedClient={clientFilter}
            onCompanyChange={setCompanyFilter}
            onClientChange={setClientFilter}
            placeholder="All Companies"
          />
        </div>

        {/* Tabs */}
        
      </div>

      {/* Table */}
      <div style={{ padding: "0 48px 48px 48px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[#12332B]/60">Loading expenses...</div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-[#12332B]/60 mb-2">
              {searchTerm || statusFilter !== "all" 
                ? "No expenses match your filters" 
                : "No expenses yet"}
            </div>
            <button
              onClick={() => setShowCreateScreen(true)}
              className="text-[#0F766E] hover:underline"
            >
              Record your first expense
            </button>
          </div>
        ) : (
          <div style={{
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "#FFFFFF"
          }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#12332B]/10">
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Expense Details
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Company / Client
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedExpense(expense);
                      setShowViewScreen(true);
                    }}
                  >
                    <td className="py-4 px-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        
                        <div>
                          <div style={{ 
                            fontSize: "14px", 
                            fontWeight: 600, 
                            color: "#12332B",
                            marginBottom: "2px"
                          }}>
                            {expense.expenseNumber}
                          </div>
                          {(expense.bookingNumber || expense.projectNumber) && (
                            <div style={{ 
                              fontSize: "13px", 
                              color: "#667085"
                            }}>
                              {expense.bookingNumber && `Booking: ${expense.bookingNumber}`}
                              {expense.projectNumber && `Project: ${expense.projectNumber}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {expense.companyName || expense.clientName || "—"}
                      </div>
                      {expense.companyName && expense.clientName && expense.companyName !== expense.clientName && (
                        <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                          {expense.clientName}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B", textAlign: "left" }}>
                        ₱{formatAmount(expense.amount)}
                      </div>
                      {expense.pendingAmount !== undefined && expense.pendingAmount > 0 ? (
                        null
                      ) : expense.pendingAmount === 0 ? (
                        <div style={{ fontSize: "12px", color: "#2E7D32", fontWeight: 500, marginTop: "2px", textAlign: "right" }}>
                          Fully Paid
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4 px-4">
                      <NeuronStatusPill status={expense.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "13px", color: "#12332B" }}>
                        {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Expense Side Panel */}
      <CreateExpensePanel
        isOpen={showCreateScreen}
        onClose={() => setShowCreateScreen(false)}
        onSuccess={() => {
          setShowCreateScreen(false);
          fetchExpenses();
        }}
      />
    </div>
  );
}