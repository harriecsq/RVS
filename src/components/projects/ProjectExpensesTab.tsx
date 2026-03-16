import { useState, useEffect } from "react";
import { Plus, Receipt, DollarSign, Calendar, Package, Trash2 } from "lucide-react";
import type { Project } from "../../types/pricing";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { CreateExpensePanel } from "../accounting/CreateExpensePanel";
import { ExpenseDetailPanel } from "../accounting/ExpenseDetailPanel";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface Expense {
  id?: string;
  expenseId?: string;
  expenseNumber?: string;
  amount: number;
  category?: string;
  vendor?: string;
  status?: string;
  expenseDate?: string;
  createdAt?: string;
  created_at?: string;
  documentTemplate?: string;
  currency?: string;
  linkedBookingIds?: string[];
  linkedBookingNumbers?: string[];
  pendingAmount?: number;
}

interface ProjectExpensesTabProps {
  project: Project;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    department: string;
  } | null;
  onUpdate: () => void;
}

export function ProjectExpensesTab({ project, currentUser, onUpdate }: ProjectExpensesTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expensesSummary, setExpensesSummary] = useState<any>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [project.id]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/expenses?projectId=${project.id}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setExpenses(result.data || []);
        // Store the summary data from API response
        if (result.summary) {
          setExpensesSummary(result.summary);
        }
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "approved":
        return { bg: "#E8F5E9", text: "#2E7D32" };
      case "pending":
      case "submitted":
        return { bg: "#FFF3E0", text: "#E65100" };
      case "rejected":
      case "cancelled":
        return { bg: "#FFEBEE", text: "#C62828" };
      case "draft":
        return { bg: "#F5F5F5", text: "#616161" };
      default:
        return { bg: "#E3F2FD", text: "#1565C0" };
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

  const handleNavigateToExpense = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setIsDetailPanelOpen(true);
  };

  const handleDeleteExpense = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation(); // Prevent row click
    
    if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        // Refresh expenses list
        await fetchExpenses();
        onUpdate();
      } else {
        alert("Failed to delete expense. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("An error occurred while deleting the expense.");
    }
  };

  const categories = ["all", ...Array.from(new Set(expenses.map(e => e.category).filter(Boolean)))];
  
  const filteredExpenses = categoryFilter === "all" 
    ? expenses 
    : expenses.filter(e => e.category === categoryFilter);

  // Use API summary data for calculations (fallback to project data if not available)
  const totalExpenses = expensesSummary?.totalExpenses ?? (project.totalExpenses || filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0));
  const totalVouchers = expensesSummary?.totalVouchers ?? (project.totalVouchers || 0);

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-start",
        marginBottom: "32px",
        paddingBottom: "24px",
        borderBottom: "1px solid #E5E9F0"
      }}>
        <div>
          <h2 style={{ 
            fontSize: "20px", 
            fontWeight: 600, 
            color: "#12332B", 
            margin: "0 0 8px 0",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <Receipt size={20} />
            Project Expenses
          </h2>
          <p style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", margin: 0 }}>
            All expenses for {project.project_name} • {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsCreatePanelOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: "#0F766E",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
          Create Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(2, 1fr)", 
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{
          padding: "20px",
          background: "white",
          border: "1px solid #E5E9F0",
          borderRadius: "12px"
        }}>
          <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px" }}>Total Expenses</div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: "#12332B" }}>
            {formatCurrency(totalExpenses)}
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
            {formatCurrency(totalVouchers)}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", color: "#667085", marginRight: "8px" }}>Filter by Category:</span>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            style={{
              padding: "6px 12px",
              background: categoryFilter === category ? "#0F766E" : "white",
              color: categoryFilter === category ? "white" : "#667085",
              border: "1px solid #E5E9F0",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div style={{ 
        background: "white",
        border: "1px solid #E5E9F0",
        borderRadius: "12px",
        overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#667085" }}>
            Loading expenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <Receipt size={48} color="#E5E9F0" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#667085", margin: 0 }}>
              {categoryFilter === "all" ? "No expenses yet" : `No ${categoryFilter} expenses`}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFB", borderBottom: "1px solid #E5E9F0" }}>
                <th style={{ 
                  padding: "12px 20px", 
                  textAlign: "left", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Expense #
                </th>
                <th style={{ 
                  padding: "12px 20px", 
                  textAlign: "left", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Category
                </th>
                <th style={{ 
                  padding: "12px 20px", 
                  textAlign: "left", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Linked Bookings
                </th>
                <th style={{ 
                  padding: "12px 20px", 
                  textAlign: "left", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Amount
                </th>
                <th style={{ 
                  padding: "12px 20px", 
                  textAlign: "left", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Status
                </th>
                <th style={{ 
                  padding: "12px 20px", 
                  textAlign: "left", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Date
                </th>
                <th style={{ 
                  padding: "12px 20px", 
                  textAlign: "left", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, index) => {
                const statusColors = getStatusColor(expense.paymentStatus || expense.status || "Unpaid");
                const expenseNumber = expense.expenseNumber || expense.expenseId || expense.id || "—";
                const linkedBookings = expense.linkedBookingNumbers || [];
                
                return (
                  <tr 
                    key={expense.id || index}
                    onClick={() => handleNavigateToExpense(expense.id || expense.expenseId || "")}
                    style={{ 
                      borderBottom: "1px solid #E5E9F0",
                      cursor: "pointer",
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F8FAFB";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white";
                    }}
                  >
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: 500, 
                        color: "#12332B",
                        fontFamily: "monospace"
                      }}>
                        {expenseNumber}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{
                        padding: "4px 10px",
                        background: "#F0F9FF",
                        color: "#0369A1",
                        fontSize: "12px",
                        fontWeight: 500,
                        borderRadius: "6px",
                        textTransform: "capitalize"
                      }}>
                        {expense.category || "Uncategorized"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {linkedBookings.length > 0 ? (
                          linkedBookings.map((bookingNum, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                background: "#F0F9FF",
                                color: "#0369A1",
                                fontSize: "12px",
                                fontWeight: 500,
                                borderRadius: "4px",
                                fontFamily: "monospace"
                              }}
                            >
                              <Package size={12} />
                              {bookingNum}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "13px", color: "#667085" }}>No bookings linked</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{
                        padding: "4px 12px",
                        background: statusColors.bg,
                        color: statusColors.text,
                        fontSize: "12px",
                        fontWeight: 500,
                        borderRadius: "12px",
                        textTransform: "capitalize"
                      }}>
                        {expense.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ 
                        fontSize: "13px", 
                        color: "#667085",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <Calendar size={14} />
                        {formatDate(expense.expenseDate)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <button
                        onClick={(e) => handleDeleteExpense(e, expense.id || expense.expenseId || "")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          background: "white",
                          color: "#C62828",
                          border: "1px solid #FFCDD2",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#FFEBEE";
                          e.currentTarget.style.borderColor = "#C62828";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#FFCDD2";
                        }}
                        title="Delete expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Expense Panel */}
      <CreateExpensePanel
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
        onSuccess={() => {
          fetchExpenses();
          onUpdate();
        }}
        prefillProjectNumber={project.project_number}
      />

      {/* Expense Detail Panel */}
      <ExpenseDetailPanel
        expenseId={selectedExpenseId}
        isOpen={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        onExpenseDeleted={() => {
          fetchExpenses();
          onUpdate();
        }}
        onExpenseUpdated={() => {
          fetchExpenses();
          onUpdate();
        }}
      />
    </div>
  );
}