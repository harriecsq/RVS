import { useState, useEffect } from "react";
import { Plus, CreditCard } from "lucide-react";
import type { Expense } from "../../../types/operations";
import { CreateExpensePanel } from "../../accounting/CreateExpensePanel";
import { ExpenseDetailPanel } from "../../accounting/ExpenseDetailPanel";
import { formatAmount } from "../../../utils/formatAmount";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { NeuronStatusPill } from "../../NeuronStatusPill";
import { API_BASE_URL } from '@/utils/api-config';

interface ExpensesTabProps {
  bookingId: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  bookingType: "forwarding" | "brokerage" | "trucking" | "marine-insurance" | "others" | "import" | "export";
  currentUser?: { name: string; email: string; department: string } | null;
  /** When provided, row click selects the expense (for sub-tab embedding) instead of opening the side panel */
  onExpenseSelect?: (expenseId: string, expenseNumber: string) => void;
}

type ExpenseStatus = "Draft" | "Submitted" | "Approved" | "Paid" | "Rejected";

interface AccountingExpense {
  id: string;
  expenseNumber: string;
  category: string;
  vendor?: string;
  clientName?: string;
  bookingNumber?: string;
  projectNumber?: string;
  amount: number;
  pendingAmount?: number;
  expenseDate: string;
  paymentMethod?: string;
  paymentStatus?: string;
  status: ExpenseStatus;
  createdAt: string;
}

export function ExpensesTab({ bookingId, bookingNumber, projectId: bookingProjectId, projectNumber, bookingType, currentUser, onExpenseSelect }: ExpensesTabProps) {
  const [expenses, setExpenses] = useState<AccountingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [expensesSummary, setExpensesSummary] = useState<any>(null);

  useEffect(() => {
    fetchExpenses();
  }, [bookingId]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // Fetch expenses from the main accounting module endpoint
      const response = await fetch(`${API_BASE_URL}/expenses?bookingId=${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const data = result.data || [];
        data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setExpenses(data);
        // Store the summary data from API response
        if (result.summary) {
          setExpensesSummary(result.summary);
        }
      } else {
        console.error('Error fetching expenses:', result.error);
        toast.error('Error loading expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Unable to load expenses');
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpenseCreated = () => {
    setShowCreatePanel(false);
    fetchExpenses();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePanelClose = () => {
    console.log('✖️ Closing expense panel');
    setIsPanelOpen(false);
    setSelectedExpenseId(null);
  };

  const handleExpenseDeleted = () => {
    console.log('🗑️ Expense deleted, refreshing expense list');
    fetchExpenses();
  };

  const handleExpenseUpdated = () => {
    console.log('💾 Expense updated, refreshing expense list');
    fetchExpenses();
  };

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D", marginBottom: "8px" }}>
            Expenses
          </h3>
          <p style={{ fontSize: "14px", color: "#667085", lineHeight: "20px" }}>
            Record and categorize business expenses for this booking
          </p>
        </div>
        <button
          onClick={() => setShowCreatePanel(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            color: "white",
            backgroundColor: "#0F766E",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      {/* {expenses.length > 0 && (
        <div
          style={{
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          <div style={{
            padding: "20px",
            background: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "12px"
          }}>
            <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px" }}>Total Expenses</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#0A1D4D" }}>
              ₱{formatAmount(expensesSummary?.totalExpenses || expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0))}
            </div>
          </div>
          <div style={{
            padding: "20px",
            background: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "12px"
          }}>
            <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px" }}>Vouchers Paid</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#2E7D32" }}>
              ₱{formatAmount(expensesSummary?.totalVouchers || 0)}
            </div>
          </div>
          <div style={{
            padding: "20px",
            background: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "12px"
          }}>
            <div style={{ fontSize: "13px", color: "#EF4444", marginBottom: "8px", fontWeight: 600 }}>Outstanding</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#EF4444" }}>
              ₱{formatAmount(expensesSummary?.expensesOutstanding !== undefined ? expensesSummary.expensesOutstanding : ((expensesSummary?.totalExpenses || expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)) - (expensesSummary?.totalVouchers || 0)))}
            </div>
          </div>
        </div>
      )} */}

      {/* Table */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
          <div style={{ color: "#667085" }}>Loading expenses...</div>
        </div>
      ) : expenses.length === 0 ? (
        <div 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            minHeight: "200px", 
            border: "1px solid #E5E9F0", 
            borderRadius: "12px",
            backgroundColor: "#F9FAFB"
          }}
        >
          <div style={{ fontSize: "14px", color: "#667085", marginBottom: "8px" }}>No expenses yet</div>
          <button
            onClick={() => setShowCreatePanel(true)}
            style={{
              color: "#0F766E",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              textDecoration: "underline"
            }}
          >
            Add your first expense
          </button>
        </div>
      ) : (
        <>
          <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#0A1D4D]/10">
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Expense Details
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Client
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
                {expenses.map((expense, index) => (
                  <tr
                    key={expense.id}
                    className="border-b border-[#0A1D4D]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                    onClick={() => {
                      if (onExpenseSelect) {
                        onExpenseSelect(expense.id, expense.expenseNumber);
                      } else {
                        console.log('📋 Opening expense in side panel:', expense.id);
                        setSelectedExpenseId(expense.id);
                        setIsPanelOpen(true);
                      }
                    }}
                  >
                    <td className="py-4 px-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <CreditCard size={20} color="#0F766E" style={{ flexShrink: 0 }} />
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
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                        {expense.clientName || "—"}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#0A1D4D", fontWeight: 600, textAlign: "left" }}>
                        ₱{formatAmount(expense.amount)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <NeuronStatusPill status={expense.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "13px", color: "#667085" }}>
                        {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Expense Detail Side Panel */}
      <ExpenseDetailPanel
        expenseId={selectedExpenseId}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        onExpenseDeleted={handleExpenseDeleted}
        onExpenseUpdated={handleExpenseUpdated}
      />

      {/* Create Expense Side Panel */}
      <CreateExpensePanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={handleExpenseCreated}
        prefillBookingId={bookingId}
        prefillBookingNumber={bookingNumber}
        prefillProjectNumber={projectNumber}
      />
    </div>
  );
}