import { useState, useEffect } from "react";
import { DollarSign, Calendar, Package, ExternalLink, TrendingDown, Plus } from "lucide-react";
import type { Project } from "../../types/pricing";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { ExpenseDetailPanel } from "../accounting/ExpenseDetailPanel";
import { CreateExpensePanel } from "../accounting/CreateExpensePanel";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface Expense {
  id?: string;
  expenseId?: string;
  expenseNumber?: string;
  bookingId?: string;
  booking_id?: string;
  bookingIds?: string[];
  projectId?: string;
  project_id?: string;
  expense_type?: string;
  category?: string;
  amount: number;
  pendingAmount?: number;
  currency?: string;
  status: string;
  description?: string;
  date?: string;
  expense_date?: string;
  expenseDate?: string;
  createdAt?: string;
  created_at?: string;
  vendor_name?: string;
  vendor?: string;
  documentTemplate?: string;
}

interface ProjectExpensesTabProps {
  project: Project;
}

export function ProjectExpensesTab({ project }: ProjectExpensesTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [project.id]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/projects/${project.id}/expenses`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setExpenses(result.data);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "paid":
        return { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" };
      case "pending":
        return { bg: "#FFF3E0", text: "#E65100", border: "#FFB74D" };
      case "rejected":
        return { bg: "#FFEBEE", text: "#C62828", border: "#EF5350" };
      case "draft":
        return { bg: "#F5F5F5", text: "#616161", border: "#BDBDBD" };
      default:
        return { bg: "#E3F2FD", text: "#1565C0", border: "#64B5F6" };
    }
  };

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleExpenseClick = (expense: Expense) => {
    // Open expense in side panel instead of navigating
    const expenseIdToOpen = expense.expenseId || expense.id;
    console.log('📋 Opening expense in side panel:', expenseIdToOpen);
    setSelectedExpenseId(expenseIdToOpen);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    console.log('✖️ Closing expense panel');
    setIsPanelOpen(false);
    setSelectedExpenseId(null);
  };

  const handleExpenseDeleted = () => {
    console.log('🗑️ Expense deleted, refreshing expense list');
    fetchExpenses(); // Refresh the list
  };

  const handleExpenseUpdated = () => {
    console.log('💾 Expense updated, refreshing expense list');
    fetchExpenses(); // Refresh the list
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const approvedAmount = expenses
    .filter((e) => e.status?.toLowerCase() === "approved" || e.status?.toLowerCase() === "paid")
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const pendingAmount = expenses
    .filter((e) => e.status?.toLowerCase() === "pending")
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      {/* Main Content Area */}
      <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#FFEBEE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingDown size={20} style={{ color: "#C62828" }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", marginBottom: "4px" }}>
                  Total Expenses
                </div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--neuron-ink-primary)" }}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#E8F5E9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DollarSign size={20} style={{ color: "#2E7D32" }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", marginBottom: "4px" }}>
                  Approved
                </div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "#2E7D32" }}>
                  {formatCurrency(approvedAmount)}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#FFF3E0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DollarSign size={20} style={{ color: "#E65100" }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", marginBottom: "4px" }}>
                  Pending
                </div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "#E65100" }}>
                  {formatCurrency(pendingAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid var(--neuron-ui-border)",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--neuron-brand-green)",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <TrendingDown size={18} />
              Project Expenses
            </h2>
            <p style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", margin: 0 }}>
              All expenses related to bookings in this project
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

        {/* Expenses List */}
        {isLoading ? (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--neuron-ink-muted)", fontSize: "14px" }}>Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <TrendingDown size={48} style={{ color: "#E5E9F0", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", marginBottom: "8px" }}>
              No Expenses Yet
            </h3>
            <p style={{ fontSize: "14px", color: "var(--neuron-ink-muted)" }}>
              Expenses will appear here once created for bookings in this project
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {expenses.map((expense) => {
              const statusColors = getStatusColor(expense.paymentStatus || expense.status || "Unpaid");
              const expenseId = expense.expenseId || expense.id || "";
              const expenseNumber = expense.expenseNumber || expense.expenseId || expense.id || "";
              const bookingId = expense.bookingId || expense.booking_id || "";
              const expenseDate =
                expense.expenseDate || expense.date || expense.expense_date || expense.createdAt || expense.created_at;

              return (
                <div
                  key={expense.id || expense.expenseId}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid var(--neuron-ui-border)",
                    borderRadius: "8px",
                    padding: "20px 24px",
                    cursor: "pointer",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onClick={() => handleExpenseClick(expense)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0F766E";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 118, 110, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#FFEBEE",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <TrendingDown size={16} style={{ color: "#C62828" }} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "15px", fontWeight: 600, color: "#12332B" }}>
                              {expenseNumber}
                            </span>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 500,
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                border: `1px solid ${statusColors.border}`,
                              }}
                            >
                              {expense.status}
                            </span>
                          </div>
                          {expense.category && (
                            <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", marginTop: "2px" }}>
                              {expense.category}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "24px", paddingLeft: "44px", fontSize: "13px" }}>
                        {expenseDate && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={14} style={{ color: "var(--neuron-ink-muted)" }} />
                            <span style={{ color: "var(--neuron-ink-secondary)" }}>{formatDate(expenseDate)}</span>
                          </div>
                        )}
                        {expense.bookingIds && expense.bookingIds.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Package size={14} style={{ color: "var(--neuron-ink-muted)" }} />
                            <span style={{ color: "var(--neuron-ink-secondary)" }}>
                              {expense.bookingIds.length} booking{expense.bookingIds.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                      <div style={{ fontSize: "18px", fontWeight: 600, color: "#C62828" }}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </div>
                      {expense.pendingAmount !== undefined && expense.pendingAmount > 0 ? (
                        <div style={{ fontSize: "12px", color: "#DC2626", fontWeight: 500 }}>
                          Pending: {formatCurrency(expense.pendingAmount, expense.currency)}
                        </div>
                      ) : expense.pendingAmount === 0 ? (
                        <div style={{ fontSize: "12px", color: "#2E7D32", fontWeight: 500 }}>
                          Fully Paid
                        </div>
                      ) : null}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#0F766E" }}>
                        <span style={{ fontSize: "12px", fontWeight: 500 }}>View Details</span>
                        <ExternalLink size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
        onSuccess={fetchExpenses}
        prefillProjectNumber={project.project_number}
      />
    </div>
  );
}