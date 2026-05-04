import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  History,
  X,
  Check,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { NeuronPageHeader } from "../NeuronPageHeader";
import {
  StandardButton,
  StandardSearchInput,
  StandardTable,
} from "../design-system";
import type { ColumnDef } from "../design-system";
import { API_BASE_URL } from "@/utils/api-config";
import { publicAnonKey } from "../../utils/supabase/info";
import { useUser } from "../../hooks/useUser";

// ============================================================================
// Types
// ============================================================================

type LogbookStatus = "yellow" | "green"; // yellow = Done Payment, green = Delivered

interface LogbookEntry {
  bookingRowId: string;
  bookingId: string; // IMP-YYYY-NNN / EXP-YYYY-NNN
  logbookNumber: number;
  client: string;
  shippingLine: string;
  donePaymentAt: string; // ISO
  deliveredAt?: string | null; // ISO, when status went green
  status: LogbookStatus;
  movedIn?: boolean; // true if this booking was moved INTO current month via adjustment
}

interface LogbookMonthData {
  bookings: LogbookEntry[];
  counts: { green: number; yellow: number };
  movement: {
    thisMonth: number; // originally landed in this month
    movedIn: number; // moved in via adjustment
    movedOut: number; // moved out via adjustment
    total: number; // thisMonth + movedIn − movedOut
  };
}

interface AdjustmentEntry {
  id: string;
  bookingId: string;
  fromMonth: string; // "YYYY-MM"
  fromNumber: number;
  toMonth: string; // "YYYY-MM"
  toNumber: number;
  userName: string;
  timestamp: string; // ISO
}

// ============================================================================
// Constants / Formatters
// ============================================================================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthYear(month: string): string {
  // month format: YYYY-MM
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function formatMonthShort(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1].slice(0, 3)} ${y}`;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ============================================================================
// Main Screen
// ============================================================================

const EMPTY_MONTH_DATA: LogbookMonthData = {
  bookings: [],
  counts: { green: 0, yellow: 0 },
  movement: { thisMonth: 0, movedIn: 0, movedOut: 0, total: 0 },
};

export function LogbookScreen() {
  const { user } = useUser();
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [monthData, setMonthData] = useState<LogbookMonthData>(EMPTY_MONTH_DATA);
  const [history, setHistory] = useState<AdjustmentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refetchKey, setRefetchKey] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/logbook/${month}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/logbook/history/${month}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).then((r) => r.json()),
    ])
      .then(([monthRes, historyRes]: [any, any]) => {
        if (cancelled) return;
        setMonthData(monthRes?.success ? (monthRes.data as LogbookMonthData) : EMPTY_MONTH_DATA);
        setHistory(historyRes?.success ? (historyRes.data as AdjustmentEntry[]) : []);
      })
      .catch((e) => {
        if (!cancelled) toast.error(`Failed to load logbook: ${(e as Error).message}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [month, refetchKey]);

  // Reset selection when leaving adjust mode or switching months
  useEffect(() => {
    if (!isAdjustMode) setSelectedIds(new Set());
  }, [isAdjustMode]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [month]);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = !term
      ? monthData.bookings
      : monthData.bookings.filter(
          (b) =>
            b.bookingId.toLowerCase().includes(term) ||
            b.client.toLowerCase().includes(term) ||
            b.shippingLine.toLowerCase().includes(term),
        );
    return [...base].sort((a, b) => (a.logbookNumber || 0) - (b.logbookNumber || 0));
  }, [monthData.bookings, searchTerm]);

  const toggleSelect = (bookingRowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingRowId)) next.delete(bookingRowId);
      else next.add(bookingRowId);
      return next;
    });
  };

  const handleAdjustmentConfirm = async (targetMonth: string) => {
    const count = selectedIds.size;
    try {
      const res = await fetch(`${API_BASE_URL}/logbook/adjust`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingIds: Array.from(selectedIds),
          targetMonth,
          userName: user?.name || "Unknown",
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Adjustment failed");
      toast.success(`Moved ${count} booking${count === 1 ? "" : "s"} to ${formatMonthYear(targetMonth)}`);
      setIsAdjustModalOpen(false);
      setIsAdjustMode(false);
      setRefetchKey((k) => k + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ----------------------------------------------------------------------
  // Table columns
  // ----------------------------------------------------------------------

  const columns: ColumnDef<LogbookEntry>[] = [
    ...(isAdjustMode
      ? [
          {
            header: "",
            width: "44px",
            cell: (entry: LogbookEntry) => (
              <Checkbox
                checked={selectedIds.has(entry.bookingRowId)}
                onChange={() => toggleSelect(entry.bookingRowId)}
              />
            ),
          } as ColumnDef<LogbookEntry>,
        ]
      : []),
    {
      header: "Logbook #",
      width: "112px",
      cell: (entry) => (
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#0A1D4D",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          #{entry.logbookNumber}
        </div>
      ),
    },
    {
      header: "Booking ID",
      cell: (entry) => (
        <div
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#0A1D4D",
            fontVariantNumeric: "tabular-nums",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {entry.bookingId}
          {entry.movedIn && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#667085",
                background: "#F3F5F8",
                border: "1px solid #E5E9F0",
                borderRadius: "4px",
                padding: "2px 6px",
                letterSpacing: "0.02em",
              }}
              title="Moved into this month via adjustment"
            >
              MOVED IN
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Client",
      cell: (entry) => (
        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>{entry.client}</div>
      ),
    },
    {
      header: "Shipping Line",
      cell: (entry) => (
        <div style={{ fontSize: "14px", color: "#344054" }}>{entry.shippingLine}</div>
      ),
    },
    {
      header: "Done Payment",
      cell: (entry) => (
        <div
          style={{
            fontSize: "13px",
            color: "#344054",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {new Date(entry.donePaymentAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      header: "Delivered",
      cell: (entry) =>
        entry.deliveredAt ? (
          <div
            style={{
              fontSize: "13px",
              color: "#344054",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {new Date(entry.deliveredAt).toLocaleDateString()}
          </div>
        ) : (
          <span style={{ fontSize: "13px", color: "#9CA3AF" }}>—</span>
        ),
    },
    {
      header: "Status",
      width: "160px",
      cell: (entry) => <LogbookStatusPill status={entry.status} />,
    },
  ];

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <NeuronPageHeader
        title="Logbook"
        subtitle="Monthly shipment sequence — tracks shipping-line accomplishment per month"
        action={
          <div style={{ display: "flex", gap: "12px" }}>
            <StandardButton
              variant="secondary"
              icon={<History className="w-4 h-4" />}
              iconPosition="left"
              onClick={() => setIsHistoryOpen(true)}
            >
              Adjustment History
            </StandardButton>
            {isAdjustMode ? (
              <>
                <StandardButton
                  variant="secondary"
                  onClick={() => setIsAdjustMode(false)}
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  icon={<ArrowRightLeft className="w-4 h-4" />}
                  iconPosition="left"
                  disabled={selectedIds.size === 0}
                  onClick={() => setIsAdjustModalOpen(true)}
                >
                  Move {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </StandardButton>
              </>
            ) : (
              <StandardButton
                variant="primary"
                icon={<ArrowRightLeft className="w-4 h-4" />}
                iconPosition="left"
                onClick={() => setIsAdjustMode(true)}
              >
                Adjustment
              </StandardButton>
            )}
          </div>
        }
      />

      <div style={{ padding: "0 48px 24px 48px" }}>
        {/* Month navigator + stats strip */}
        <MonthStrip
          month={month}
          onPrev={() => setMonth(shiftMonth(month, -1))}
          onNext={() => setMonth(shiftMonth(month, +1))}
          onToday={() => setMonth(currentMonthKey())}
          data={monthData}
        />

        <div style={{ marginTop: "24px", marginBottom: "20px" }}>
          <StandardSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Booking ID, Client, or Shipping Line..."
          />
        </div>
      </div>

      <div style={{ padding: "0 48px 48px 48px" }}>
        <StandardTable
          data={filteredBookings}
          columns={columns}
          rowKey={(b) => b.bookingRowId}
          isLoading={isLoading}
          emptyTitle={
            searchTerm
              ? "No bookings match your search"
              : `No logbook entries for ${formatMonthYear(month)}`
          }
          emptyDescription={
            searchTerm
              ? undefined
              : "Bookings enter this month's logbook when their Shipping Line Status is set to Done Payment"
          }
          emptyIcon={<BookOpen size={24} />}
        />
      </div>

      <AdjustmentModal
        isOpen={isAdjustModalOpen}
        selectedCount={selectedIds.size}
        currentMonth={month}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={handleAdjustmentConfirm}
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        month={month}
        entries={history}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// Month Strip — month nav + counts + movement math
// ============================================================================

interface MonthStripProps {
  month: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  data: LogbookMonthData;
}

function MonthStrip({ month, onPrev, onNext, onToday, data }: MonthStripProps) {
  const { counts, movement } = data;
  const isCurrent = month === currentMonthKey();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: "0",
        border: "1px solid #E5E9F0",
        borderRadius: "12px",
        background: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Month nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
          gap: "12px",
          borderRight: "1px solid #E5E9F0",
          minWidth: "280px",
        }}
      >
        <IconButton ariaLabel="Previous month" onClick={onPrev}>
          <ChevronLeft size={16} />
        </IconButton>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#0A1D4D",
              letterSpacing: "-0.2px",
            }}
          >
            {formatMonthYear(month)}
          </div>
          {!isCurrent && (
            <button
              onClick={onToday}
              style={{
                fontSize: "11px",
                color: "#0F766E",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 0 0 0",
                fontWeight: 500,
              }}
            >
              Jump to current
            </button>
          )}
        </div>
        <IconButton ariaLabel="Next month" onClick={onNext}>
          <ChevronRight size={16} />
        </IconButton>
      </div>

      {/* Status counts */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 24px",
          gap: "24px",
          borderRight: "1px solid #E5E9F0",
          flex: 1,
        }}
      >
        <StatusCountBlock color="green" label="Delivered" count={counts.green} />
        <div style={{ width: "1px", height: "32px", background: "#EEF1F5" }} />
        <StatusCountBlock color="yellow" label="Awaiting Delivery" count={counts.yellow} />
      </div>

      {/* Movement math */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 24px",
          gap: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#667085",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
            }}
          >
            Month Total
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: "#0A1D4D",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.5px",
              }}
            >
              {movement.total}
            </span>
            <MovementMath
              base={movement.thisMonth}
              movedIn={movement.movedIn}
              movedOut={movement.movedOut}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCountBlock({
  color,
  label,
  count,
}: {
  color: "yellow" | "green";
  label: string;
  count: number;
}) {
  const dotColor = color === "green" ? "#0F766E" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span
        aria-hidden
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#667085",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "2px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#0A1D4D",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

function MovementMath({
  base,
  movedIn,
  movedOut,
}: {
  base: number;
  movedIn: number;
  movedOut: number;
}) {
  if (movedIn === 0 && movedOut === 0) {
    return (
      <span style={{ fontSize: "12px", color: "#667085" }}>
        ({base} this month)
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: "12px",
        color: "#667085",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      ({base} this month
      {movedIn > 0 && (
        <>
          {" "}
          <span style={{ color: "#0F766E", fontWeight: 500 }}>+{movedIn} moved in</span>
        </>
      )}
      {movedOut > 0 && (
        <>
          {" "}
          <span style={{ color: "#B54708", fontWeight: 500 }}>−{movedOut} moved out</span>
        </>
      )}
      )
    </span>
  );
}

function IconButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        border: "1px solid #E5E9F0",
        background: "#FFFFFF",
        color: "#344054",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "background 0.15s ease, color 0.15s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
        (e.currentTarget as HTMLElement).style.color = "#0F766E";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
        (e.currentTarget as HTMLElement).style.color = "#344054";
      }}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Status Pill
// ============================================================================

function LogbookStatusPill({ status }: { status: LogbookStatus }) {
  const isGreen = status === "green";
  const bg = isGreen ? "#E8F5F3" : "#FFF4E6";
  const fg = isGreen ? "#0F766E" : "#B54708";
  const label = isGreen ? "Delivered" : "Done Payment";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: fg,
        }}
      />
      {label}
    </span>
  );
}

// ============================================================================
// Checkbox (used in adjust mode)
// ============================================================================

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{
        width: "18px",
        height: "18px",
        borderRadius: "4px",
        border: checked ? "1px solid #0F766E" : "1px solid #D0D5DD",
        background: checked ? "#0F766E" : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      {checked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
    </button>
  );
}

// ============================================================================
// Adjustment Modal — pick target month
// ============================================================================

interface AdjustmentModalProps {
  isOpen: boolean;
  selectedCount: number;
  currentMonth: string;
  onClose: () => void;
  onConfirm: (targetMonth: string) => void;
}

function AdjustmentModal({
  isOpen,
  selectedCount,
  currentMonth,
  onClose,
  onConfirm,
}: AdjustmentModalProps) {
  const [targetYear, setTargetYear] = useState<number>(() =>
    parseInt(currentMonth.split("-")[0], 10),
  );
  const [targetMonthIdx, setTargetMonthIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetYear(parseInt(currentMonth.split("-")[0], 10));
      setTargetMonthIdx(null);
    }
  }, [isOpen, currentMonth]);

  if (!isOpen) return null;

  const targetMonthKey =
    targetMonthIdx !== null
      ? `${targetYear}-${String(targetMonthIdx + 1).padStart(2, "0")}`
      : null;
  const isSameAsCurrent = targetMonthKey === currentMonth;
  const canConfirm = targetMonthKey !== null && !isSameAsCurrent;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(10, 29, 77, 0.32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          background: "#FFFFFF",
          border: "1px solid #E5E9F0",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E5E9F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#0A1D4D",
                marginBottom: "2px",
              }}
            >
              Move Bookings
            </div>
            <div style={{ fontSize: "13px", color: "#667085" }}>
              {selectedCount} {selectedCount === 1 ? "booking" : "bookings"} selected — pick a destination month
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#667085",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Year nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <IconButton
              ariaLabel="Previous year"
              onClick={() => setTargetYear((y) => y - 1)}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#0A1D4D",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {targetYear}
            </div>
            <IconButton
              ariaLabel="Next year"
              onClick={() => setTargetYear((y) => y + 1)}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>

          {/* Month grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {MONTH_NAMES.map((name, idx) => {
              const key = `${targetYear}-${String(idx + 1).padStart(2, "0")}`;
              const isSelected = targetMonthIdx === idx;
              const isCurrent = key === currentMonth;
              return (
                <button
                  key={name}
                  onClick={() => setTargetMonthIdx(idx)}
                  disabled={isCurrent}
                  style={{
                    padding: "10px 8px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "1px solid #0F766E"
                      : "1px solid #E5E9F0",
                    background: isSelected
                      ? "rgba(15,118,110,0.08)"
                      : "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: isSelected ? 600 : 500,
                    color: isCurrent
                      ? "#9CA3AF"
                      : isSelected
                      ? "#0F766E"
                      : "#0A1D4D",
                    cursor: isCurrent ? "not-allowed" : "pointer",
                    transition:
                      "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent && !isSelected) {
                      (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent && !isSelected) {
                      (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                    }
                  }}
                >
                  {name.slice(0, 3)}
                  {isCurrent && (
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        marginTop: "2px",
                      }}
                    >
                      current
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {targetMonthKey && (
            <div
              style={{
                marginTop: "20px",
                padding: "12px 14px",
                borderRadius: "8px",
                background: "#F9FAFB",
                border: "1px solid #E5E9F0",
                fontSize: "13px",
                color: "#344054",
                lineHeight: 1.5,
              }}
            >
              {selectedCount} {selectedCount === 1 ? "booking" : "bookings"} will be appended to the tail of{" "}
              <span style={{ fontWeight: 600, color: "#0A1D4D" }}>
                {formatMonthYear(targetMonthKey)}
              </span>
              . The source month will renumber to close the gap.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E5E9F0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            background: "#FFFFFF",
          }}
        >
          <StandardButton variant="secondary" onClick={onClose}>
            Cancel
          </StandardButton>
          <StandardButton
            variant="primary"
            disabled={!canConfirm}
            onClick={() => {
              if (targetMonthKey) onConfirm(targetMonthKey);
            }}
          >
            Confirm Move
          </StandardButton>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// History Panel — slide-over with adjustment log for current month
// ============================================================================

interface HistoryPanelProps {
  isOpen: boolean;
  month: string;
  entries: AdjustmentEntry[];
  onClose: () => void;
}

function HistoryPanel({ isOpen, month, entries, onClose }: HistoryPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(10, 29, 77, 0.32)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          height: "100%",
          background: "#FFFFFF",
          borderLeft: "1px solid #E5E9F0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E5E9F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#0A1D4D",
                marginBottom: "2px",
              }}
            >
              Adjustment History
            </div>
            <div style={{ fontSize: "13px", color: "#667085" }}>
              Movements involving {formatMonthYear(month)}
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#667085",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Entries */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {entries.length === 0 ? (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                color: "#667085",
              }}
            >
              <History
                size={28}
                style={{ color: "#C4CBD5", marginBottom: "12px" }}
              />
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                No adjustments yet
              </div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>
                Movements in or out of this month will appear here.
              </div>
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {entries.map((entry) => (
                <HistoryEntryCard key={entry.id} entry={entry} viewedMonth={month} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryEntryCard({
  entry,
  viewedMonth,
}: {
  entry: AdjustmentEntry;
  viewedMonth: string;
}) {
  const movedOut = entry.fromMonth === viewedMonth;
  const directionLabel = movedOut ? "Moved out" : "Moved in";
  const directionColor = movedOut ? "#B54708" : "#0F766E";
  const directionBg = movedOut ? "#FFF4E6" : "#E8F5F3";

  return (
    <li
      style={{
        border: "1px solid #E5E9F0",
        borderRadius: "10px",
        padding: "14px 16px",
        background: "#FFFFFF",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 8px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 600,
            background: directionBg,
            color: directionColor,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {directionLabel}
        </span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#0A1D4D",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {entry.bookingId}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "13px",
          color: "#344054",
          marginBottom: "10px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#667085",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "2px",
            }}
          >
            From
          </div>
          {formatMonthShort(entry.fromMonth)} · #{entry.fromNumber}
        </div>
        <ChevronRight size={14} style={{ color: "#9CA3AF" }} />
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#667085",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "2px",
            }}
          >
            To
          </div>
          {formatMonthShort(entry.toMonth)} · #{entry.toNumber}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "12px",
          color: "#667085",
          paddingTop: "10px",
          borderTop: "1px solid #EEF1F5",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <UserIcon size={12} />
          {entry.userName}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <Clock size={12} />
          {formatTimestamp(entry.timestamp)}
        </span>
      </div>
    </li>
  );
}
