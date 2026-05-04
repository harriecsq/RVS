import { useState, useEffect } from "react";
import { CreditCard } from "lucide-react";
import { SubTabRow } from "./SubTabRow";
import { ViewExpenseScreen } from "../../accounting/ViewExpenseScreen";
import { CreateExpensePanel } from "../../accounting/CreateExpensePanel";
import { BookingVouchersTab } from "./BookingVouchersTab";
import { StandardLoadingState } from "../../design-system/StandardLoadingState";
import { StandardEmptyState } from "../../design-system/StandardEmptyState";
import { publicAnonKey } from "../../../utils/supabase/info";
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

/**
 * ExpensesSubTabs — one expense per booking.
 *
 * Resolves the booking's expense on mount and goes straight to ViewExpenseScreen.
 * If none exists, shows an empty state with a Create action.
 */
export function ExpensesSubTabs({
  bookingId,
  bookingNumber,
  projectId: bookingProjectId,
  projectNumber,
  externalEdit,
  onEditStateChange,
  onRecordSelected,
  externalSaveCounter,
}: ExpensesSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"expense-details" | "vouchers">("expense-details");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [vouchersCount, setVouchersCount] = useState(0);

  const resolveExpense = () => {
    setIsLoading(true);
    return fetch(`${API_BASE_URL}/expenses?bookingId=${bookingId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((result) => {
        const first = result?.success && Array.isArray(result.data) ? result.data[0] : null;
        if (first) {
          setSelectedExpenseId(first.id);
          onRecordSelected?.(true);
        } else {
          setSelectedExpenseId(null);
          onRecordSelected?.(false);
        }
      })
      .catch((err) => console.error("Error fetching expense for booking:", err))
      .finally(() => setIsLoading(false));
  };

  const fetchVouchersCount = () => {
    fetch(`${API_BASE_URL}/bookings/${bookingId}/vouchers`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((result) => {
        if (result?.success && Array.isArray(result.data)) setVouchersCount(result.data.length);
      })
      .catch((err) => console.error("Error fetching vouchers count:", err));
  };

  useEffect(() => {
    let cancelled = false;
    setSelectedExpenseId(null);
    onRecordSelected?.(false);
    Promise.all([
      fetch(`${API_BASE_URL}/expenses?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).then((r) => r.json()).then((result) => {
        if (cancelled) return;
        const first = result?.success && Array.isArray(result.data) ? result.data[0] : null;
        if (first) {
          setSelectedExpenseId(first.id);
          onRecordSelected?.(true);
        }
      }).catch((err) => console.error("Error fetching expense for booking:", err)),
      fetch(`${API_BASE_URL}/bookings/${bookingId}/vouchers`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).then((r) => r.json()).then((result) => {
        if (cancelled) return;
        if (result?.success && Array.isArray(result.data)) setVouchersCount(result.data.length);
      }).catch((err) => console.error("Error fetching vouchers count:", err)),
    ]).finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [bookingId]);

  const handleExpenseCreated = () => {
    setShowCreatePanel(false);
    resolveExpense();
    fetchVouchersCount();
  };

  const subTabs = [
    { id: "expense-details", label: "Expense Details" },
    { id: "vouchers", label: "Vouchers", badge: vouchersCount || undefined },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SubTabRow
        tabs={subTabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as "expense-details" | "vouchers")}
      />

      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSubTab === "expense-details" && (
          isLoading ? (
            <StandardLoadingState message="Loading expense..." />
          ) : selectedExpenseId ? (
            <div style={{ position: "relative" }}>
              <ViewExpenseScreen
                expenseId={selectedExpenseId}
                embedded={true}
                externalEdit={externalEdit}
                onEditStateChange={onEditStateChange}
                externalSaveCounter={externalSaveCounter}
              />
            </div>
          ) : (
            <StandardEmptyState
              icon={<CreditCard size={48} />}
              title="No expense yet"
              description="Create an expense for this booking."
              action={{ label: "Add expense", onClick: () => setShowCreatePanel(true) }}
            />
          )
        )}

        {activeSubTab === "vouchers" && (
          <BookingVouchersTab
            bookingId={bookingId}
            bookingNumber={bookingNumber}
            onUpdate={() => {
              fetchVouchersCount();
              resolveExpense();
            }}
          />
        )}
      </div>

      {showCreatePanel && (
        <CreateExpensePanel
          isOpen={showCreatePanel}
          onClose={() => setShowCreatePanel(false)}
          onSuccess={handleExpenseCreated}
          prefillBookingId={bookingId}
          prefillBookingNumber={bookingNumber}
          prefillProjectNumber={projectNumber}
        />
      )}
    </div>
  );
}
