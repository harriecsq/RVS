import { useState, useMemo, ReactNode, CSSProperties } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  History,
  X,
  Check,
  Clock,
  Search,
  User as UserIcon,
} from "lucide-react";

// ============================================================================
// Standalone Logbook — DESIGN ONLY.
// No backend, auth, or router. All Neuron / design-system components inlined.
// Deps: react + lucide-react. Drop in anywhere and render <LogbookScreen />.
// Swap MOCK_MONTHS for real data when wiring a backend.
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type LogbookStatus = "yellow" | "green"; // yellow = Done Payment, green = Delivered

interface LogbookEntry {
  bookingRowId: string;
  bookingId: string;
  logbookNumber: number;
  client: string;
  shippingLine: string;
  vesselVoyage: string;
  blNumber: string;
  containerNumber: string;
  donePaymentAt: string;
  deliveredAt?: string | null;
  status: LogbookStatus;
  movedIn?: boolean;
}

interface LogbookMonthData {
  bookings: LogbookEntry[];
  counts: { green: number; yellow: number };
  movement: { thisMonth: number; movedIn: number; movedOut: number; total: number };
}

interface AdjustmentEntry {
  id: string;
  bookingId: string;
  fromMonth: string;
  fromNumber: number;
  toMonth: string;
  toNumber: number;
  userName: string;
  timestamp: string;
}

// ----------------------------------------------------------------------------
// Mock data — replace with real fetch later
// ----------------------------------------------------------------------------

const SAMPLE_BOOKINGS: LogbookEntry[] = [
  {
    bookingRowId: "1", bookingId: "IMP-2026-001", logbookNumber: 1,
    client: "Pacific Trading Corp", shippingLine: "Maersk",
    vesselVoyage: "MV Pacific Star / 024W", blNumber: "MAEU240135678",
    containerNumber: "MSKU1234567, MSKU7654321",
    donePaymentAt: "2026-06-02T08:00:00Z", deliveredAt: "2026-06-05T08:00:00Z",
    status: "green",
  },
  {
    bookingRowId: "2", bookingId: "EXP-2026-014", logbookNumber: 2,
    client: "Northstar Electronics", shippingLine: "COSCO",
    vesselVoyage: "MV Ocean Pride / 117E", blNumber: "COSU8891234",
    containerNumber: "CCLU9988776",
    donePaymentAt: "2026-06-04T08:00:00Z", deliveredAt: null,
    status: "yellow",
  },
  {
    bookingRowId: "3", bookingId: "IMP-2026-008", logbookNumber: 3,
    client: "Greenfield Logistics", shippingLine: "Evergreen",
    vesselVoyage: "MV Ever Given / 003W", blNumber: "EGLV556677889",
    containerNumber: "EGHU1122334",
    donePaymentAt: "2026-05-28T08:00:00Z", deliveredAt: null,
    status: "yellow", movedIn: true,
  },
  {
    bookingRowId: "4", bookingId: "IMP-2026-011", logbookNumber: 4,
    client: "Sunrise Foods Inc", shippingLine: "Hapag-Lloyd",
    vesselVoyage: "MV Hamburg / 058W", blNumber: "HLCU AB1234567",
    containerNumber: "HLXU4455667, HLXU7788990, HLXU1212121",
    donePaymentAt: "2026-06-07T08:00:00Z", deliveredAt: "2026-06-09T08:00:00Z",
    status: "green",
  },
];

const MOCK_MONTHS: Record<string, LogbookMonthData> = {
  "2026-06": {
    bookings: SAMPLE_BOOKINGS,
    counts: { green: 2, yellow: 2 },
    movement: { thisMonth: 3, movedIn: 1, movedOut: 0, total: 4 },
  },
};

const MOCK_HISTORY: AdjustmentEntry[] = [
  {
    id: "a1", bookingId: "IMP-2026-008",
    fromMonth: "2026-05", fromNumber: 12,
    toMonth: "2026-06", toNumber: 3,
    userName: "Maria Santos", timestamp: "2026-06-06T03:24:00Z",
  },
];

const EMPTY_MONTH_DATA: LogbookMonthData = {
  bookings: [],
  counts: { green: 0, yellow: 0 },
  movement: { thisMonth: 0, movedIn: 0, movedOut: 0, total: 0 },
};

// ----------------------------------------------------------------------------
// Constants / Formatters
// ----------------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthYear(month: string): string {
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
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ============================================================================
// Inlined design-system primitives
// ============================================================================

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "32px 48px 24px 48px", background: "#FFFFFF",
      }}
    >
      <div>
        <h1 style={{ fontSize: "32px", fontWeight: 600, color: "#0A1D4D", lineHeight: "40px", marginBottom: "4px", letterSpacing: "-1.2px" }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: "14px", color: "#667085", lineHeight: "20px" }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary";
function Button({
  children, variant = "primary", icon, disabled, onClick,
}: {
  children: ReactNode; variant?: ButtonVariant; icon?: ReactNode;
  disabled?: boolean; onClick?: () => void;
}) {
  const styles = {
    primary: { background: "#0F766E", color: "#FFFFFF", border: "1px solid #0F766E", hover: "#0D6B64" },
    secondary: { background: "#FFFFFF", color: "#0A1D4D", border: "1px solid #E5E9F0", hover: "#F9FAFB" },
  }[variant];
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        height: "40px", padding: "10px 20px", fontSize: "14px", fontWeight: 600,
        color: styles.color, background: styles.background, border: styles.border,
        borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "background 0.15s ease", whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = styles.hover; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = styles.background; }}
    >
      {icon}
      {children}
    </button>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: "relative" }}>
      <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#667085", pointerEvents: "none" }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", height: "40px", padding: "10px 12px 10px 40px",
          border: "1px solid #E5E9F0", borderRadius: "8px", fontSize: "14px",
          outline: "none", color: "#0A1D4D", backgroundColor: "#FFFFFF", transition: "border-color 0.15s ease",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
      />
    </div>
  );
}

function StatusPill({ variant, children }: { variant: "success" | "warning"; children: ReactNode }) {
  const color = variant === "success" ? "#10B981" : "#F59E0B";
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        height: "32px", padding: "0 12px", fontSize: "14px", lineHeight: "20px",
        borderRadius: "999px", fontWeight: 500, whiteSpace: "nowrap",
        background: `color-mix(in srgb, ${color} 12%, white)`, color,
      }}
    >
      {children}
    </div>
  );
}

interface ColumnDef<T> {
  header: string;
  width?: string;
  cell: (item: T) => ReactNode;
}

function Table<T>({
  data, columns, rowKey, onRowClick, emptyTitle, emptyDescription, emptyIcon,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
}) {
  const shell: CSSProperties = { border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#FFFFFF" };

  if (data.length === 0) {
    return (
      <div style={shell}>
        <div style={{ padding: "64px 24px", textAlign: "center", color: "#667085" }}>
          {emptyIcon && <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px", color: "#C4CBD5" }}>{emptyIcon}</div>}
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D" }}>{emptyTitle}</div>
          {emptyDescription && <div style={{ fontSize: "13px", marginTop: "4px" }}>{emptyDescription}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={rowKey(item)}
              onClick={() => onRowClick?.(item)}
              style={{ borderBottom: "1px solid rgba(10,29,77,0.05)", cursor: onRowClick ? "pointer" : undefined, transition: "background-color 0.15s ease" }}
              onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.backgroundColor = "rgba(15,118,110,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} style={{ padding: "16px", textAlign: "left" }}>{col.cell(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export function LogbookScreen() {
  const [month, setMonth] = useState<string>("2026-06");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const monthData = MOCK_MONTHS[month] ?? EMPTY_MONTH_DATA;
  const history = MOCK_HISTORY.filter((h) => h.fromMonth === month || h.toMonth === month);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = !term
      ? monthData.bookings
      : monthData.bookings.filter(
          (b) =>
            b.bookingId.toLowerCase().includes(term) ||
            b.client.toLowerCase().includes(term) ||
            (b.vesselVoyage || "").toLowerCase().includes(term) ||
            (b.blNumber || "").toLowerCase().includes(term) ||
            (b.containerNumber || "").toLowerCase().includes(term),
        );
    return [...base].sort((a, b) => (a.logbookNumber || 0) - (b.logbookNumber || 0));
  }, [monthData.bookings, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitAdjust = () => { setIsAdjustMode(false); setSelectedIds(new Set()); };

  const columns: ColumnDef<LogbookEntry>[] = [
    ...(isAdjustMode
      ? [{
          header: "", width: "44px",
          cell: (entry: LogbookEntry) => (
            <Checkbox checked={selectedIds.has(entry.bookingRowId)} onChange={() => toggleSelect(entry.bookingRowId)} />
          ),
        } as ColumnDef<LogbookEntry>]
      : []),
    {
      header: "Logbook #", width: "112px",
      cell: (e) => (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", fontVariantNumeric: "tabular-nums" }}>#{e.logbookNumber}</div>
      ),
    },
    {
      header: "Booking ID",
      cell: (e) => (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0A1D4D", fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: "8px" }}>
          {e.bookingId}
          {e.movedIn && (
            <span title="Moved into this month via adjustment" style={{ fontSize: "11px", fontWeight: 600, color: "#667085", background: "#F3F5F8", border: "1px solid #E5E9F0", borderRadius: "4px", padding: "2px 6px", letterSpacing: "0.02em" }}>
              MOVED IN
            </span>
          )}
        </div>
      ),
    },
    { header: "Consignee/Shipper", cell: (e) => <div style={{ fontSize: "14px", color: "#0A1D4D" }}>{e.client}</div> },
    { header: "Vessel/Voyage", cell: (e) => <div style={{ fontSize: "14px", color: "#344054" }}>{e.vesselVoyage || "—"}</div> },
    {
      header: "BL Number",
      cell: (e) => <div style={{ fontSize: "14px", color: "#344054", fontVariantNumeric: "tabular-nums" }}>{e.blNumber || "—"}</div>,
    },
    {
      header: "Container Number",
      cell: (e) => {
        const list = (e.containerNumber || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (list.length === 0) return <div style={{ fontSize: "14px", color: "#344054" }}>—</div>;
        return (
          <div style={{ fontSize: "14px", color: "#344054", fontVariantNumeric: "tabular-nums", display: "flex", flexDirection: "column", gap: "2px" }}>
            {list.map((c, i) => <div key={i}>{c}</div>)}
          </div>
        );
      },
    },
    {
      header: "Done Payment",
      cell: (e) => <div style={{ fontSize: "13px", color: "#344054", fontVariantNumeric: "tabular-nums" }}>{new Date(e.donePaymentAt).toLocaleDateString()}</div>,
    },
    {
      header: "Delivered",
      cell: (e) =>
        e.deliveredAt
          ? <div style={{ fontSize: "13px", color: "#344054", fontVariantNumeric: "tabular-nums" }}>{new Date(e.deliveredAt).toLocaleDateString()}</div>
          : <span style={{ fontSize: "13px", color: "#9CA3AF" }}>—</span>,
    },
    {
      header: "Status", width: "160px",
      cell: (e) => (
        <StatusPill variant={e.status === "green" ? "success" : "warning"}>
          {e.status === "green" ? "Delivered" : "Done Payment"}
        </StatusPill>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <PageHeader
        title="Logbook"
        subtitle="Monthly shipment sequence — tracks shipping-line accomplishment per month"
        action={
          <div style={{ display: "flex", gap: "12px" }}>
            <Button variant="secondary" icon={<History className="w-4 h-4" />} onClick={() => setIsHistoryOpen(true)}>
              Adjustment History
            </Button>
            {isAdjustMode ? (
              <>
                <Button variant="secondary" onClick={exitAdjust}>Cancel</Button>
                <Button variant="primary" icon={<ArrowRightLeft className="w-4 h-4" />} disabled={selectedIds.size === 0} onClick={() => setIsAdjustModalOpen(true)}>
                  Move {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </Button>
              </>
            ) : (
              <Button variant="primary" icon={<ArrowRightLeft className="w-4 h-4" />} onClick={() => setIsAdjustMode(true)}>
                Adjustment
              </Button>
            )}
          </div>
        }
      />

      <div style={{ padding: "0 48px 24px 48px" }}>
        <MonthStrip
          month={month}
          onPrev={() => setMonth(shiftMonth(month, -1))}
          onNext={() => setMonth(shiftMonth(month, +1))}
          onToday={() => setMonth(currentMonthKey())}
          data={monthData}
        />
        <div style={{ marginTop: "24px", marginBottom: "20px" }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Booking ID, Consignee/Shipper, Vessel/Voyage, BL #, or Container #..."
          />
        </div>
      </div>

      <div style={{ padding: "0 48px 48px 48px" }}>
        <Table
          data={filteredBookings}
          columns={columns}
          rowKey={(b) => b.bookingRowId}
          onRowClick={(entry) => { if (isAdjustMode) toggleSelect(entry.bookingRowId); }}
          emptyTitle={searchTerm ? "No bookings match your search" : `No logbook entries for ${formatMonthYear(month)}`}
          emptyDescription={searchTerm ? undefined : "Bookings enter this month's logbook when their Shipping Line Status is set to Done Payment"}
          emptyIcon={<BookOpen size={24} />}
        />
      </div>

      <AdjustmentModal
        isOpen={isAdjustModalOpen}
        selectedCount={selectedIds.size}
        currentMonth={month}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={() => { setIsAdjustModalOpen(false); exitAdjust(); }}
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
// Month Strip
// ============================================================================

function MonthStrip({
  month, onPrev, onNext, onToday, data,
}: {
  month: string; onPrev: () => void; onNext: () => void; onToday: () => void; data: LogbookMonthData;
}) {
  const { counts, movement } = data;
  const isCurrent = month === currentMonthKey();

  return (
    <div style={{ display: "flex", alignItems: "stretch", border: "1px solid #E5E9F0", borderRadius: "12px", background: "#FFFFFF", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: "12px", borderRight: "1px solid #E5E9F0", minWidth: "280px" }}>
        <IconButton ariaLabel="Previous month" onClick={onPrev}><ChevronLeft size={16} /></IconButton>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", letterSpacing: "-0.2px" }}>{formatMonthYear(month)}</div>
          {!isCurrent && (
            <button onClick={onToday} style={{ fontSize: "11px", color: "#0F766E", background: "none", border: "none", cursor: "pointer", padding: "2px 0 0 0", fontWeight: 500 }}>
              Jump to current
            </button>
          )}
        </div>
        <IconButton ariaLabel="Next month" onClick={onNext}><ChevronRight size={16} /></IconButton>
      </div>

      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", gap: "24px", borderRight: "1px solid #E5E9F0", flex: 1 }}>
        <StatusCountBlock color="green" label="Delivered" count={counts.green} />
        <div style={{ width: "1px", height: "32px", background: "#EEF1F5" }} />
        <StatusCountBlock color="yellow" label="Awaiting Delivery" count={counts.yellow} />
      </div>

      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Month Total</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "22px", fontWeight: 600, color: "#0A1D4D", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>{movement.total}</span>
            <MovementMath base={movement.thisMonth} movedIn={movement.movedIn} movedOut={movement.movedOut} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCountBlock({ color, label, count }: { color: "yellow" | "green"; label: string; count: number }) {
  const dotColor = color === "green" ? "#0F766E" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span aria-hidden style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "18px", fontWeight: 600, color: "#0A1D4D", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{count}</div>
      </div>
    </div>
  );
}

function MovementMath({ base, movedIn, movedOut }: { base: number; movedIn: number; movedOut: number }) {
  if (movedIn === 0 && movedOut === 0) {
    return <span style={{ fontSize: "12px", color: "#667085" }}>({base} this month)</span>;
  }
  return (
    <span style={{ fontSize: "12px", color: "#667085", fontVariantNumeric: "tabular-nums" }}>
      ({base} this month
      {movedIn > 0 && <> <span style={{ color: "#0F766E", fontWeight: 500 }}>+{movedIn} moved in</span></>}
      {movedOut > 0 && <> <span style={{ color: "#B54708", fontWeight: 500 }}>−{movedOut} moved out</span></>}
      )
    </span>
  );
}

function IconButton({ ariaLabel, onClick, children }: { ariaLabel: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #E5E9F0", background: "#FFFFFF", color: "#344054", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s ease, color 0.15s ease", flexShrink: 0 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.color = "#0F766E"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = "#344054"; }}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Checkbox
// ============================================================================

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{ width: "18px", height: "18px", borderRadius: "4px", border: checked ? "1px solid #0F766E" : "1px solid #D0D5DD", background: checked ? "#0F766E" : "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, transition: "background 0.15s ease, border-color 0.15s ease" }}
    >
      {checked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
    </button>
  );
}

// ============================================================================
// Adjustment Modal
// ============================================================================

function AdjustmentModal({
  isOpen, selectedCount, currentMonth, onClose, onConfirm,
}: {
  isOpen: boolean; selectedCount: number; currentMonth: string;
  onClose: () => void; onConfirm: (targetMonth: string) => void;
}) {
  const [targetYear, setTargetYear] = useState<number>(() => parseInt(currentMonth.split("-")[0], 10));
  const [targetMonthIdx, setTargetMonthIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const targetMonthKey = targetMonthIdx !== null ? `${targetYear}-${String(targetMonthIdx + 1).padStart(2, "0")}` : null;
  const isSameAsCurrent = targetMonthKey === currentMonth;
  const canConfirm = targetMonthKey !== null && !isSameAsCurrent;

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10, 29, 77, 0.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 100%)", background: "#FFFFFF", border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>Move Bookings</div>
            <div style={{ fontSize: "13px", color: "#667085" }}>{selectedCount} {selectedCount === 1 ? "booking" : "bookings"} selected — pick a destination month</div>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "#667085" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <IconButton ariaLabel="Previous year" onClick={() => setTargetYear((y) => y - 1)}><ChevronLeft size={16} /></IconButton>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", fontVariantNumeric: "tabular-nums" }}>{targetYear}</div>
            <IconButton ariaLabel="Next year" onClick={() => setTargetYear((y) => y + 1)}><ChevronRight size={16} /></IconButton>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
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
                    padding: "10px 8px", borderRadius: "8px",
                    border: isSelected ? "1px solid #0F766E" : "1px solid #E5E9F0",
                    background: isSelected ? "rgba(15,118,110,0.08)" : "#FFFFFF",
                    fontSize: "13px", fontWeight: isSelected ? 600 : 500,
                    color: isCurrent ? "#9CA3AF" : isSelected ? "#0F766E" : "#0A1D4D",
                    cursor: isCurrent ? "not-allowed" : "pointer",
                    transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!isCurrent && !isSelected) e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { if (!isCurrent && !isSelected) e.currentTarget.style.background = "#FFFFFF"; }}
                >
                  {name.slice(0, 3)}
                  {isCurrent && <div style={{ fontSize: "10px", fontWeight: 500, marginTop: "2px" }}>current</div>}
                </button>
              );
            })}
          </div>

          {targetMonthKey && (
            <div style={{ marginTop: "20px", padding: "12px 14px", borderRadius: "8px", background: "#F9FAFB", border: "1px solid #E5E9F0", fontSize: "13px", color: "#344054", lineHeight: 1.5 }}>
              {selectedCount} {selectedCount === 1 ? "booking" : "bookings"} will be appended to the tail of{" "}
              <span style={{ fontWeight: 600, color: "#0A1D4D" }}>{formatMonthYear(targetMonthKey)}</span>. The source month will renumber to close the gap.
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #E5E9F0", display: "flex", justifyContent: "flex-end", gap: "12px", background: "#FFFFFF" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canConfirm} onClick={() => { if (targetMonthKey) onConfirm(targetMonthKey); }}>Confirm Move</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// History Panel
// ============================================================================

function HistoryPanel({
  isOpen, month, entries, onClose,
}: {
  isOpen: boolean; month: string; entries: AdjustmentEntry[]; onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10, 29, 77, 0.32)", display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 100%)", height: "100%", background: "#FFFFFF", borderLeft: "1px solid #E5E9F0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>Adjustment History</div>
            <div style={{ fontSize: "13px", color: "#667085" }}>Movements involving {formatMonthYear(month)}</div>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "#667085" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {entries.length === 0 ? (
            <div style={{ padding: "48px 16px", textAlign: "center", color: "#667085" }}>
              <History size={28} style={{ color: "#C4CBD5", marginBottom: "12px" }} />
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>No adjustments yet</div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>Movements in or out of this month will appear here.</div>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {entries.map((entry) => <HistoryEntryCard key={entry.id} entry={entry} viewedMonth={month} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryEntryCard({ entry, viewedMonth }: { entry: AdjustmentEntry; viewedMonth: string }) {
  const movedOut = entry.fromMonth === viewedMonth;
  const directionLabel = movedOut ? "Moved out" : "Moved in";
  const directionColor = movedOut ? "#B54708" : "#0F766E";
  const directionBg = movedOut ? "#FFF4E6" : "#E8F5F3";

  return (
    <li style={{ border: "1px solid #E5E9F0", borderRadius: "10px", padding: "14px 16px", background: "#FFFFFF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, background: directionBg, color: directionColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {directionLabel}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0A1D4D", fontVariantNumeric: "tabular-nums" }}>{entry.bookingId}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#344054", marginBottom: "10px", fontVariantNumeric: "tabular-nums" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>From</div>
          {formatMonthShort(entry.fromMonth)} · #{entry.fromNumber}
        </div>
        <ChevronRight size={14} style={{ color: "#9CA3AF" }} />
        <div>
          <div style={{ fontSize: "11px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>To</div>
          {formatMonthShort(entry.toMonth)} · #{entry.toNumber}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "#667085", paddingTop: "10px", borderTop: "1px solid #EEF1F5" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><UserIcon size={12} />{entry.userName}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={12} />{formatTimestamp(entry.timestamp)}</span>
      </div>
    </li>
  );
}
