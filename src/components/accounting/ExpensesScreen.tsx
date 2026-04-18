import { useState, useEffect } from "react";
import { Plus, CreditCard } from "lucide-react";
import { useLocation } from "react-router";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { CreateExpensePanel } from "./CreateExpensePanel";
import { ViewExpenseScreen } from "./ViewExpenseScreen";
import { formatAmount } from "../../utils/formatAmount";
import { publicAnonKey } from "../../utils/supabase/info";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
  StandardFilterDropdown,
  StandardTable,
} from "../design-system";
import type { ColumnDef } from "../design-system";

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

export function ExpensesScreen({ currentUser }: ExpensesScreenProps) {
  const location = useLocation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [showViewScreen, setShowViewScreen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
    const state = location.state as { selectedExpenseId?: string } | null;
    if (state?.selectedExpenseId) {
      fetchAndSelectExpense(state.selectedExpenseId);
      window.history.replaceState({}, document.title);
    }
  }, []);

  const fetchAndSelectExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
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
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const result = await response.json();
      const data = result.success && result.data ? result.data : [];
      data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean)));
  const uniquePaymentMethods = Array.from(new Set(expenses.map(e => e.paymentMethod).filter(Boolean)));

  const filteredExpenses = expenses.filter(expense => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (expense.expenseNumber || "").toLowerCase().includes(term) ||
      (expense.category || "").toLowerCase().includes(term) ||
      (expense.clientName || "").toLowerCase().includes(term) ||
      (expense.vendor || "").toLowerCase().includes(term) ||
      (expense.bookingNumber || "").toLowerCase().includes(term) ||
      (expense.projectNumber || "").toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (dateFilterStart || dateFilterEnd) {
      const expenseISO = new Date(expense.createdAt).toISOString().split("T")[0];
      if (dateFilterStart && expenseISO < dateFilterStart) return false;
      if (dateFilterEnd && expenseISO > dateFilterEnd) return false;
    }

    if (statusFilter !== "all" && expense.status !== statusFilter) return false;
    if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
    if (paymentMethodFilter !== "all" && expense.paymentMethod !== paymentMethodFilter) return false;

    if (companyFilter) {
      const expenseCompany = expense.companyName || expense.clientName || "";
      if (expenseCompany !== companyFilter) return false;
      if (clientFilter && (expense.clientName || "") !== clientFilter) return false;
    }

    return true;
  });

  const columns: ColumnDef<Expense>[] = [
    {
      header: "Expense Details",
      cell: (expense) => (
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>
            {expense.expenseNumber}
          </div>
          {(expense.bookingNumber || expense.projectNumber) && (
            <div style={{ fontSize: "13px", color: "#667085" }}>
              {expense.bookingNumber && `Booking: ${expense.bookingNumber}`}
              {expense.projectNumber && `Project: ${expense.projectNumber}`}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Company / Client",
      cell: (expense) => (
        <>
          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
            {expense.companyName || expense.clientName || "—"}
          </div>
          {expense.companyName && expense.clientName && expense.companyName !== expense.clientName && (
            <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>{expense.clientName}</div>
          )}
        </>
      ),
    },
    {
      header: "Amount",
      cell: (expense) => (
        <>
          <div style={{ fontSize: "14px", color: "#0A1D4D" }}>₱{formatAmount(expense.amount)}</div>
          {expense.pendingAmount === 0 && (
            <div style={{ fontSize: "12px", color: "#2E7D32", fontWeight: 500, marginTop: "2px" }}>
              Fully Paid
            </div>
          )}
        </>
      ),
    },
    {
      header: "Status",
      cell: (expense) => <NeuronStatusPill status={expense.status} />,
    },
    {
      header: "Created",
      cell: (expense) => (
        <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
          {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <NeuronPageHeader
        title="Expenses"
        subtitle="Record and categorize business expenses"
        action={
          <StandardButton
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            iconPosition="left"
            onClick={() => setShowCreateScreen(true)}
          >
            New Expense
          </StandardButton>
        }
      />

      <div style={{ padding: "0 48px 24px 48px" }}>
        <div style={{ marginBottom: "24px" }}>
          <StandardSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Expense Number, Client, Vendor, Booking, or Project Number..."
          />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}>
          <div style={{ gridColumn: "span 2" }}>
            <UnifiedDateRangeFilter
              startDate={dateFilterStart}
              endDate={dateFilterEnd}
              onStartDateChange={setDateFilterStart}
              onEndDateChange={setDateFilterEnd}
              compact
            />
          </div>

          <StandardFilterDropdown
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as ExpenseStatus | "all")}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Draft", label: "Draft" },
              { value: "For Approval", label: "For Approval" },
              { value: "Approved", label: "Approved" },
              { value: "Paid", label: "Paid" },
              { value: "Partially Paid", label: "Partially Paid" },
              { value: "Rejected", label: "Rejected" },
            ]}
          />

          <StandardFilterDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: "All Categories" },
              ...uniqueCategories.map(c => ({ value: c, label: c })),
            ]}
          />

          <StandardFilterDropdown
            value={paymentMethodFilter}
            onChange={setPaymentMethodFilter}
            options={[
              { value: "all", label: "All Payment Methods" },
              ...uniquePaymentMethods.map(m => ({ value: m, label: m })),
            ]}
          />

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
      </div>

      <div style={{ padding: "0 48px 48px 48px" }}>
        <StandardTable
          data={filteredExpenses}
          columns={columns}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          onRowClick={(e) => { setSelectedExpense(e); setShowViewScreen(true); }}
          emptyTitle={searchTerm || statusFilter !== "all" ? "No expenses match your filters" : "No expenses yet"}
          emptyDescription={searchTerm || statusFilter !== "all" ? undefined : "Record your first expense to get started"}
          emptyIcon={<CreditCard size={24} />}
        />
      </div>

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
