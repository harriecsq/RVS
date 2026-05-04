import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, CreditCard } from "lucide-react";
import { useLocation } from "react-router";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { CreateExpensePanel } from "./CreateExpensePanel";
import { ViewExpenseScreen } from "./ViewExpenseScreen";
import { formatAmount } from "../../utils/formatAmount";
import { publicAnonKey } from "../../utils/supabase/info";
import { useCachedFetch, invalidateCache } from "../../hooks/useCachedFetch";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter, clientSelectionMatches, type ClientSelection } from "../shared/CompanyClientFilter";
import { MultiSelectPortalDropdown } from "../shared/MultiSelectPortalDropdown";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";
import { useClientsMasterList } from "../../hooks/useClientsMasterList";
import { API_BASE_URL } from '@/utils/api-config';
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
  StandardTable,
} from "../design-system";
import type { ColumnDef } from "../design-system";

interface ExpensesScreenProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

type ExpenseStatus = "Draft" | "For Approval" | "Approved" | "Paid" | "Partially Paid" | "Cancelled";

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
  const { data: expensesResult, isLoading: isLoadingExpenses, refetch: refetchExpenses } = useCachedFetch<{ success: boolean; data: any[] }>("/expenses");
  const { data: bookingsResult, isLoading: isLoadingBookings } = useCachedFetch<{ success: boolean; data: any[] }>("/bookings");
  const isLoading = isLoadingExpenses || isLoadingBookings;
  const expenses = useMemo<Expense[]>(() => {
    if (!expensesResult?.success) return [];
    const data = [...(expensesResult.data || [])];
    data.sort((a: any, b: any) => String(b.expenseNumber || "").localeCompare(String(a.expenseNumber || ""), undefined, { numeric: true }));
    return data;
  }, [expensesResult]);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [showViewScreen, setShowViewScreen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [portFilter, setPortFilter] = useState<string[]>([]);
  const [clientSelections, setClientSelections] = useState<ClientSelection[]>([]);
  const bookingEnrichMapRef = useRef<Map<string, { serviceType: string; port: string }>>(new Map());
  const clientsMasterList = useClientsMasterList();

  useEffect(() => {
    const state = location.state as { selectedExpenseId?: string } | null;
    if (state?.selectedExpenseId) {
      fetchAndSelectExpense(state.selectedExpenseId);
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    if (!bookingsResult?.success) return;
    const enrichMap = new Map<string, { serviceType: string; port: string }>();
    (bookingsResult.data || []).forEach((b: any) => {
      const serviceType = b.shipmentType || b.booking_type || b.mode || "Import";
      const isImport = serviceType.toLowerCase().includes("import");
      const seg0 = b.segments?.[0];
      const port = isImport ? (b.pod || seg0?.pod || "") : (b.origin || seg0?.origin || "");
      const enrich = { serviceType, port };
      if (b.id) enrichMap.set(b.id, enrich);
      if (b.bookingId) enrichMap.set(b.bookingId, enrich);
    });
    bookingEnrichMapRef.current = enrichMap;
  }, [bookingsResult]);

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

  const fetchExpenses = () => { invalidateCache("/expenses"); refetchExpenses(); };

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

  const filteredExpensesRaw = expenses.filter(expense => {
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

    if (statusFilter.length > 0 && !statusFilter.includes(expense.status)) return false;
    if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
    if (paymentMethodFilter !== "all" && expense.paymentMethod !== paymentMethodFilter) return false;

    if (serviceTypeFilter !== "all" || portFilter.length > 0) {
      const bId = (expense as any).bookingId || ((expense as any).bookingIds)?.[0];
      const enrich = bId ? bookingEnrichMapRef.current.get(bId) : undefined;
      if (serviceTypeFilter !== "all") {
        if (!enrich?.serviceType.toLowerCase().includes(serviceTypeFilter.toLowerCase())) return false;
      }
      if (portFilter.length > 0) {
        if (!portFilter.some(p => (enrich?.port || "").toLowerCase().includes(p.toLowerCase()))) return false;
      }
    }

    if (clientSelections.length > 0) {
      const expenseCompany = expense.companyName || expense.clientName || "";
      if (!clientSelectionMatches(clientSelections, { company: expenseCompany, client: expense.clientName || "" })) return false;
    }

    return true;
  });

  const filteredExpenses = statusFilter.length > 0
    ? [...filteredExpensesRaw].sort((a, b) => {
        const ai = statusFilter.indexOf(a.status);
        const bi = statusFilter.indexOf(b.status);
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
      })
    : filteredExpensesRaw;

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

          <MultiSelectPortalDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "Draft", label: "Draft" },
              { value: "For Approval", label: "For Approval" },
              { value: "Approved", label: "Approved" },
              { value: "Paid", label: "Paid" },
              { value: "Partially Paid", label: "Partially Paid" },
              { value: "Cancelled", label: "Cancelled" },
            ]}
            placeholder="All Statuses"
          />

          <FilterSingleDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: "All Categories" },
              ...uniqueCategories.map(c => ({ value: c, label: c })),
            ]}
          />

          <FilterSingleDropdown
            value={paymentMethodFilter}
            onChange={setPaymentMethodFilter}
            options={[
              { value: "all", label: "All Payment Methods" },
              ...uniquePaymentMethods.map(m => ({ value: m, label: m })),
            ]}
          />

          <FilterSingleDropdown
            value={serviceTypeFilter}
            options={[
              { value: "all", label: "All Types" },
              { value: "Import", label: "Import" },
              { value: "Export", label: "Export" },
            ]}
            onChange={setServiceTypeFilter}
            placeholder="All Types"
          />
          <MultiSelectPortalDropdown
            value={portFilter}
            options={[
              { value: "Manila North", label: "Manila North" },
              { value: "Manila South", label: "Manila South" },
              { value: "CDO", label: "CDO" },
              { value: "Iloilo", label: "Iloilo" },
              { value: "Davao", label: "Davao" },
            ]}
            onChange={setPortFilter}
            placeholder="All Ports"
          />
          <CompanyClientFilter
            extraEntries={clientsMasterList}
            selected={clientSelections}
            onChange={setClientSelections}
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
          emptyTitle={searchTerm || statusFilter.length > 0 ? "No expenses match your filters" : "No expenses yet"}
          emptyDescription={searchTerm || statusFilter.length > 0 ? undefined : "Record your first expense to get started"}
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
