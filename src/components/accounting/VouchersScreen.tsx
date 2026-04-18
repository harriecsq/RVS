import { useState, useRef, useMemo } from "react";
import { Plus, Receipt, Search, ChevronDown, X } from "lucide-react";
import { PortalDropdown } from "../shared/PortalDropdown";
import { publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { CreateVoucherModal } from "./CreateVoucherModal";
import { ViewVoucherScreen } from "./ViewVoucherScreen";
import { formatAmount } from "../../utils/formatAmount";
import { NeuronStatusPill } from "../NeuronStatusPill";
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

interface Voucher {
  id: string;
  voucherNumber: string;
  expenseId: string;
  expenseNumber?: string;
  lineItemIds?: string[];
  amount: number;
  currency: string;
  payee?: string;
  category?: string;
  shipper?: string;
  consignee?: string;
  vesselVoy?: string;
  volume?: string;
  destination?: string;
  blNumber?: string;
  voucherDate: string;
  postingDate?: string;
  status: string;
  created_at?: string;
}

// ---- Payee Filter Dropdown (searchable combobox with portal — unique behavior, kept local) ----
function PayeeFilterDropdown({
  value,
  payees,
  onChange,
  placeholder = "All Payees",
}: {
  value: string;
  payees: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filteredPayees = useMemo(() => {
    if (!search.trim()) return payees;
    const term = search.toLowerCase();
    return payees.filter((p) => p.toLowerCase().includes(term));
  }, [payees, search]);

  const select = (v: string) => { onChange(v); setIsOpen(false); setSearch(""); };
  const hasSelection = value !== "all";

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "10px 12px",
          border: "1px solid #E5E9F0", borderRadius: "8px", fontSize: "14px",
          color: hasSelection ? "#0A1D4D" : "#667085", backgroundColor: "#FFFFFF",
          cursor: "pointer", outline: "none", width: "100%", textAlign: "left",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          minHeight: "40px", height: "40px",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hasSelection ? value : placeholder}
        </span>
        {hasSelection ? (
          <X size={14} style={{ flexShrink: 0, color: "#667085" }} onClick={(e) => { e.stopPropagation(); select("all"); }} />
        ) : (
          <ChevronDown size={14} style={{ flexShrink: 0, color: "#9CA3AF" }} />
        )}
      </button>

      <PortalDropdown isOpen={isOpen} onClose={() => { setIsOpen(false); setSearch(""); }} triggerRef={triggerRef} minWidth="280px" align="left">
        <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
            <input
              type="text" placeholder="Search..." value={search}
              onChange={(e) => setSearch(e.target.value)} autoFocus
              style={{ width: "100%", padding: "6px 8px 6px 28px", border: "1px solid #E5E9F0", borderRadius: "6px", fontSize: "13px", outline: "none", color: "#0A1D4D", backgroundColor: "#F9FAFB" }}
            />
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: "4px 0" }}>
          <button
            onClick={() => select("all")}
            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", border: "none", background: !hasSelection ? "rgba(0,102,68,0.06)" : "transparent", cursor: "pointer", fontSize: "13px", fontWeight: !hasSelection ? 600 : 400, color: "#0A1D4D", textAlign: "left" }}
            onMouseEnter={(e) => { if (hasSelection) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = !hasSelection ? "rgba(0,102,68,0.06)" : "transparent"; }}
          >
            {placeholder}
          </button>
          {filteredPayees.length === 0 && (
            <div style={{ padding: "16px 12px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No payees found</div>
          )}
          {filteredPayees.map((payee) => {
            const isSelected = value === payee;
            return (
              <button key={payee} onClick={() => select(payee)}
                style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", border: "none", background: isSelected ? "rgba(0,102,68,0.06)" : "transparent", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? 600 : 400, color: "#0A1D4D", textAlign: "left", overflow: "hidden" }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSelected ? "rgba(0,102,68,0.06)" : "transparent"; }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{payee}</span>
              </button>
            );
          })}
        </div>
      </PortalDropdown>
    </>
  );
}

export function VouchersScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [payeeFilter, setPayeeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vouchers`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        const data = result.data || [];
        data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setVouchers(data);
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      toast.error("Failed to load vouchers");
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedVoucherId) {
    return (
      <ViewVoucherScreen
        voucherId={selectedVoucherId}
        onBack={() => { setSelectedVoucherId(null); fetchVouchers(); }}
      />
    );
  }

  const filteredVouchers = vouchers.filter(voucher => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      voucher.voucherNumber.toLowerCase().includes(searchLower) ||
      (voucher.payee && voucher.payee.toLowerCase().includes(searchLower)) ||
      (voucher.shipper && voucher.shipper.toLowerCase().includes(searchLower));
    if (!matchesSearch) return false;

    if (dateFilterStart || dateFilterEnd) {
      // Filter by posting date (accounting month basis); fall back to voucherDate/created_at for legacy records
      const voucherISO = new Date(voucher.postingDate || voucher.voucherDate || voucher.created_at || "").toISOString().split("T")[0];
      if (dateFilterStart && voucherISO < dateFilterStart) return false;
      if (dateFilterEnd && voucherISO > dateFilterEnd) return false;
    }

    if (statusFilter !== "all" && voucher.status !== statusFilter) return false;
    if (payeeFilter !== "all" && (voucher.payee || "") !== payeeFilter) return false;
    if (categoryFilter !== "all" && (voucher.category || "") !== categoryFilter) return false;

    if (companyFilter) {
      if ((voucher.consignee || "") !== companyFilter) return false;
      if (clientFilter && (voucher.shipper || "") !== clientFilter) return false;
    }

    return true;
  });

  const uniqueCategories = Array.from(new Set(vouchers.map(v => v.category).filter(Boolean))).sort() as string[];

  const columns: ColumnDef<Voucher>[] = [
    {
      header: "Voucher Details",
      cell: (voucher) => (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
          {voucher.voucherNumber}
        </div>
      ),
    },
    {
      header: "Amount",
      cell: (voucher) => (
        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
          {voucher.currency} {formatAmount(voucher.amount)}
        </div>
      ),
    },
    {
      header: "Payee",
      cell: (voucher) => (
        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>{voucher.payee || "—"}</div>
      ),
    },
    {
      header: "Category",
      cell: (voucher) => (
        <div style={{ fontSize: "14px", color: "#0A1D4D" }}>{voucher.category || "—"}</div>
      ),
    },
    {
      header: "Linked Expense",
      cell: (voucher) =>
        voucher.expenseNumber ? (
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F766E" }}>
            {voucher.expenseNumber}
          </span>
        ) : (
          <span style={{ fontSize: "14px", color: "#9CA3AF" }}>—</span>
        ),
    },
    {
      header: "Status",
      cell: (voucher) => <NeuronStatusPill status={voucher.status} />,
    },
    {
      header: "Creation Date",
      cell: (voucher) => (
        <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
          {new Date(voucher.voucherDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      header: "Posting Date",
      cell: (voucher) => (
        <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
          {voucher.postingDate ? new Date(voucher.postingDate).toLocaleDateString() : "—"}
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <NeuronPageHeader
        title="Vouchers"
        subtitle="Manage expense vouchers and payments"
        action={
          <StandardButton
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            iconPosition="left"
            onClick={() => setShowCreateModal(true)}
          >
            Create Voucher
          </StandardButton>
        }
      />

      <div style={{ padding: "0 48px 24px 48px" }}>
        <div style={{ marginBottom: "24px" }}>
          <StandardSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Voucher Number, Payee, or Shipper..."
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
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Draft", label: "Draft" },
              { value: "For Approval", label: "For Approval" },
              { value: "Approved", label: "Approved" },
              { value: "Paid", label: "Paid" },
              { value: "Cancelled", label: "Cancelled" },
            ]}
          />

          <PayeeFilterDropdown
            value={payeeFilter}
            onChange={setPayeeFilter}
            payees={Array.from(new Set(vouchers.map(v => v.payee).filter(Boolean))).sort() as string[]}
            placeholder="All Payees"
          />

          <StandardFilterDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: "All Categories" },
              ...uniqueCategories.map(cat => ({ value: cat, label: cat })),
            ]}
          />

          <CompanyClientFilter
            items={vouchers}
            getCompany={(v) => v.consignee || ""}
            getClient={(v) => v.shipper || ""}
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
          data={filteredVouchers}
          columns={columns}
          rowKey={(v) => v.id}
          isLoading={isLoading}
          onRowClick={(v) => setSelectedVoucherId(v.id)}
          emptyTitle={searchTerm || statusFilter !== "all" ? "No vouchers match your filters" : "No vouchers yet"}
          emptyDescription={searchTerm || statusFilter !== "all" ? undefined : "Create your first voucher to get started"}
          emptyIcon={<Receipt size={24} />}
        />
      </div>

      <CreateVoucherModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onVoucherCreated={fetchVouchers}
      />
    </div>
  );
}
