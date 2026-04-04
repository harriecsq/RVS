import { useState, useEffect } from "react";
import { SubTabRow } from "./SubTabRow";
import { ExpensesTab } from "./ExpensesTab";
import { ViewExpenseScreen } from "../../accounting/ViewExpenseScreen";
import { BookingVouchersTab } from "./BookingVouchersTab";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';

interface ExpensesSubTabsProps {
  bookingId: string;
  bookingNumber?: string;
  projectId?: string;
  projectNumber?: string;
  bookingType: "forwarding" | "brokerage" | "trucking" | "marine-insurance" | "others" | "import" | "export";
  currentUser?: { name: string; email: string; department: string } | null;
  segmentId?: string;
  externalEdit?: boolean;
  onEditStateChange?: (editing: boolean) => void;
  onRecordSelected?: (hasSelection: boolean) => void;
  externalSaveCounter?: number;
}

interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  amount: number;
  status: string;
}

/**
 * ExpensesSubTabs - Wraps the Expenses tab with nested sub-tabs:
 * - Expense Details: Shows the ExpensesTab list. When an expense is selected,
 *   shows the ViewExpenseScreen in embedded mode.
 * - Vouchers: Shows ALL vouchers linked to this booking (via BookingVouchersTab).
 *   Always visible regardless of whether an expense is selected.
 */
export function ExpensesSubTabs({
  bookingId,
  bookingNumber,
  projectId: bookingProjectId,
  projectNumber,
  bookingType,
  currentUser,
  externalEdit,
  onEditStateChange,
  onRecordSelected,
  externalSaveCounter,
}: ExpensesSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"expense-details" | "vouchers">("expense-details");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedExpenseNumber, setSelectedExpenseNumber] = useState<string>("");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [vouchersCount, setVouchersCount] = useState(0);

  // Fetch expenses and vouchers count in parallel
  useEffect(() => {
    Promise.all([fetchExpenses(), fetchVouchersCount()]);
  }, [bookingId]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        setExpenses(result.data || []);
        // Auto-select first expense if only one exists
        if (result.data?.length === 1) {
          setSelectedExpenseId(result.data[0].id);
          setSelectedExpenseNumber(result.data[0].expenseNumber);
          onRecordSelected?.(true);
        }
      }
    } catch (error) {
      console.error("Error fetching expenses for sub-tabs:", error);
    }
  };

  const fetchVouchersCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/vouchers`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setVouchersCount(result.data.length);
      }
    } catch (error) {
      console.error("Error fetching vouchers count:", error);
    }
  };

  const handleExpenseSelected = (expenseId: string, expenseNumber: string) => {
    setSelectedExpenseId(expenseId);
    setSelectedExpenseNumber(expenseNumber);
    setActiveSubTab("expense-details");
    onRecordSelected?.(true);
  };

  const handleBackToList = () => {
    setSelectedExpenseId(null);
    setSelectedExpenseNumber("");
    setActiveSubTab("expense-details");
    onRecordSelected?.(false);
  };

  // Build sub-tabs - Vouchers is always visible (shows all booking vouchers)
  const subTabs = [
    { id: "expense-details", label: "Expense Details" },
    { id: "vouchers", label: "Vouchers", badge: vouchersCount || undefined },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub-tab row */}
      <SubTabRow
        tabs={subTabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as "expense-details" | "vouchers")}
      />

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSubTab === "expense-details" && !selectedExpenseId && (
          <ExpensesTab
            bookingId={bookingId}
            bookingNumber={bookingNumber}
            projectId={bookingProjectId}
            projectNumber={projectNumber}
            bookingType={bookingType}
            currentUser={currentUser}
            onExpenseSelect={handleExpenseSelected}
          />
        )}

        {activeSubTab === "expense-details" && selectedExpenseId && (
          <div style={{ position: "relative" }}>
            {/* Back to list button */}
            {expenses.length > 1 && (
              <div style={{ padding: "12px 48px 0" }}>
                <button
                  onClick={handleBackToList}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#0F766E",
                    background: "transparent",
                    border: "1px solid #E5E9F0",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F0FDF9";
                    e.currentTarget.style.borderColor = "#0F766E";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#E5E9F0";
                  }}
                >
                  &larr; All Expenses
                </button>
              </div>
            )}
            <ViewExpenseScreen
              expenseId={selectedExpenseId}
              embedded={true}
              externalEdit={externalEdit}
              onEditStateChange={onEditStateChange}
              externalSaveCounter={externalSaveCounter}
            />
          </div>
        )}

        {activeSubTab === "vouchers" && (
          <BookingVouchersTab
            bookingId={bookingId}
            bookingNumber={bookingNumber}
            onUpdate={() => {
              fetchVouchersCount();
              fetchExpenses();
            }}
          />
        )}
      </div>
    </div>
  );
}
