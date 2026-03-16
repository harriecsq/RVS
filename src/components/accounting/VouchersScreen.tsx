import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus, Search, Receipt, Clock, CheckCircle, XCircle, ChevronDown, X } from "lucide-react";
import { createPortal } from "react-dom";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { CreateVoucherModal } from "./CreateVoucherModal";
import { ViewVoucherScreen } from "./ViewVoucherScreen";
import { formatAmount } from "../../utils/formatAmount";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { CompanyClientFilter } from "../shared/CompanyClientFilter";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

// ---- Filter Dropdown (matches Trucking design) ----
function FilterDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          fontWeight: 400,
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          background: "#FFFFFF",
          color: "#12332B",
          cursor: "pointer",
          whiteSpace: "nowrap" as const,
          boxSizing: "border-box" as const,
        }}
      >
        {selected?.label || placeholder}
        <ChevronDown size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            zIndex: 1000,
            minWidth: "180px",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: "9px 14px",
                fontSize: "13px",
                color: "#12332B",
                cursor: "pointer",
                backgroundColor: value === opt.value ? "#F0FAF8" : "transparent",
                fontWeight: value === opt.value ? 600 : 400,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F7FAF8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = value === opt.value ? "#F0FAF8" : "transparent"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  status: string;
  created_at?: string;
}

// ---- Payee Filter Dropdown (with search bar matching CompanyClientFilter design) ----
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const filteredPayees = useMemo(() => {
    if (!search.trim()) return payees;
    const term = search.toLowerCase();
    return payees.filter((p) => p.toLowerCase().includes(term));
  }, [payees, search]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const select = (v: string) => {
    onChange(v);
    setIsOpen(false);
    setSearch("");
  };

  const hasSelection = value !== "all";
  const displayLabel = hasSelection ? value : placeholder;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 12px",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          fontSize: "14px",
          color: hasSelection ? "#12332B" : "#667085",
          backgroundColor: "#FFFFFF",
          cursor: "pointer",
          outline: "none",
          width: "100%",
          textAlign: "left",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minHeight: "42px",
          position: "relative",
        }}
      >
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
        </span>
        {hasSelection ? (
          <X
            size={14}
            style={{ flexShrink: 0, color: "#667085", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              select("all");
            }}
          />
        ) : (
          <ChevronDown size={14} style={{ flexShrink: 0, color: "#9CA3AF" }} />
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: 360,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Search */}
            <div
              style={{
                padding: "8px",
                borderBottom: "1px solid #E5E7EB",
                flexShrink: 0,
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "6px 8px 6px 28px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none",
                    color: "#12332B",
                    backgroundColor: "#F9FAFB",
                  }}
                />
              </div>
            </div>

            {/* Options list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 0",
              }}
            >
              {/* All Payees option */}
              <button
                onClick={() => select("all")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background:
                    !hasSelection ? "rgba(0, 102, 68, 0.06)" : "transparent",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: !hasSelection ? 600 : 400,
                  color: "#12332B",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (hasSelection)
                    (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    !hasSelection ? "rgba(0, 102, 68, 0.06)" : "transparent";
                }}
              >
                {placeholder}
              </button>

              {filteredPayees.length === 0 && (
                <div
                  style={{
                    padding: "16px 12px",
                    textAlign: "center",
                    color: "#9CA3AF",
                    fontSize: "13px",
                  }}
                >
                  No payees found
                </div>
              )}

              {filteredPayees.map((payee) => {
                const isSelected = value === payee;
                return (
                  <button
                    key={payee}
                    onClick={() => select(payee)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      background: isSelected
                        ? "rgba(0, 102, 68, 0.06)"
                        : "transparent",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: isSelected ? 600 : 400,
                      color: "#12332B",
                      textAlign: "left",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background =
                          "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        isSelected
                          ? "rgba(0, 102, 68, 0.06)"
                          : "transparent";
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {payee}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function TabButton({ 
  icon, 
  label, 
  count, 
  isActive, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  count: number; 
  isActive: boolean; 
  color: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        border: "none",
        borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
        background: "transparent",
        color: isActive ? color : "#667085",
        fontWeight: isActive ? 600 : 500,
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {icon}
      <span>{label}</span>
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
          backgroundColor: isActive ? `${color}15` : "#F3F4F6",
          color: isActive ? color : "#667085",
        }}
      >
        {count}
      </span>
    </button>
  );
}

export function VouchersScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "paid" | "cancelled">("all");
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
      const response = await fetch(`${API_URL}/vouchers`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setVouchers(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      toast.error("Failed to load vouchers");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter vouchers by tab first
  const getFilteredByTab = () => {
    let filtered = vouchers;

    if (activeTab === "pending") {
      filtered = vouchers.filter(v => ["Draft", "For Approval", "Approved"].includes(v.status));
    } else if (activeTab === "paid") {
      filtered = vouchers.filter(v => v.status === "Paid");
    } else if (activeTab === "cancelled") {
      filtered = vouchers.filter(v => v.status === "Cancelled");
    }

    return filtered;
  };

  // Apply all filters
  const filteredVouchers = getFilteredByTab().filter(voucher => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      voucher.voucherNumber.toLowerCase().includes(searchLower) ||
      (voucher.payee && voucher.payee.toLowerCase().includes(searchLower)) ||
      (voucher.shipper && voucher.shipper.toLowerCase().includes(searchLower));
    
    if (!matchesSearch) return false;

    // Time period filter
    if (dateFilterStart || dateFilterEnd) {
      const voucherDate = new Date(voucher.created_at || voucher.voucherDate);
      const voucherISO = voucherDate.toISOString().split("T")[0];
      if (dateFilterStart && voucherISO < dateFilterStart) return false;
      if (dateFilterEnd && voucherISO > dateFilterEnd) return false;
    }

    // Status filter
    const matchesStatus = statusFilter === "all" || voucher.status === statusFilter;
    if (!matchesStatus) return false;

    // Payee filter
    if (payeeFilter !== "all") {
      const voucherPayee = voucher.payee || "";
      if (voucherPayee !== payeeFilter) return false;
    }

    // Category filter
    if (categoryFilter !== "all") {
      const voucherCategory = voucher.category || "";
      if (voucherCategory !== categoryFilter) return false;
    }

    // Company / Client filter (consignee = company, shipper = client)
    if (companyFilter) {
      const voucherCompany = voucher.consignee || "";
      if (voucherCompany !== companyFilter) return false;
      if (clientFilter) {
        const voucherClient = voucher.shipper || "";
        if (voucherClient !== clientFilter) return false;
      }
    }

    return true;
  });

  // Calculate counts for tabs
  const allCount = vouchers.length;
  const pendingCount = vouchers.filter(v => ["Draft", "For Approval", "Approved"].includes(v.status)).length;
  const paidCount = vouchers.filter(v => v.status === "Paid").length;
  const cancelledCount = vouchers.filter(v => v.status === "Cancelled").length;

  // Show voucher view screen if a voucher is selected
  if (selectedVoucherId) {
    return (
      <ViewVoucherScreen 
        voucherId={selectedVoucherId} 
        onBack={() => {
          setSelectedVoucherId(null);
          fetchVouchers(); // Refresh the list when coming back
        }} 
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{ padding: "32px 48px 24px 48px" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "start", 
          justifyContent: "space-between", 
          marginBottom: "24px" 
        }}>
          <div>
            <h1 style={{ 
              fontSize: "32px", 
              fontWeight: 600, 
              color: "#12332B", 
              marginBottom: "4px",
              letterSpacing: "-1.2px"
            }}>
              Vouchers
            </h1>
            <p style={{ 
              fontSize: "14px", 
              color: "#667085"
            }}>
              Manage expense vouchers and payments
            </p>
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              background: "#0F766E",
              color: "white",
              cursor: "pointer",
            }}
          >
            <Plus className="w-4 h-4" />
            Create Voucher
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#667085",
            }}
          />
          <input
            type="text"
            placeholder="Search by Voucher Number, Payee, or Shipper..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
            }}
          />
        </div>

        {/* Filter Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          {/* Time Period Filter */}
          <div style={{ gridColumn: "span 2" }}>
            <UnifiedDateRangeFilter
              startDate={dateFilterStart}
              endDate={dateFilterEnd}
              onStartDateChange={setDateFilterStart}
              onEndDateChange={setDateFilterEnd}
              compact
            />
          </div>

          {/* Status Filter */}
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            options={[
              { label: "All Statuses", value: "all" },
              { label: "Draft", value: "Draft" },
              { label: "For Approval", value: "For Approval" },
              { label: "Approved", value: "Approved" },
              { label: "Paid", value: "Paid" },
              { label: "Cancelled", value: "Cancelled" },
            ]}
          />

          {/* Payee Filter */}
          <PayeeFilterDropdown
            value={payeeFilter}
            onChange={setPayeeFilter}
            payees={Array.from(new Set(vouchers.map(v => v.payee).filter(Boolean))).sort()}
            placeholder="All Payees"
          />

          {/* Category Filter */}
          <FilterDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
            options={[
              { label: "All Categories", value: "all" },
              ...Array.from(new Set(vouchers.map(v => v.category).filter(Boolean))).sort().map(cat => ({
                label: cat as string,
                value: cat as string,
              })),
            ]}
          />

          {/* Company / Client Filter */}
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

        {/* Tabs */}
        
      </div>

      {/* Table */}
      <div style={{ padding: "0 48px 48px 48px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[#12332B]/60">Loading vouchers...</div>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-[#12332B]/60 mb-2">
              {searchTerm || statusFilter !== "all" 
                ? "No vouchers match your filters" 
                : "No vouchers yet"}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[#0F766E] hover:underline"
            >
              Create your first voucher
            </button>
          </div>
        ) : (
          <div style={{
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "#FFFFFF"
          }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#12332B]/10">
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Voucher Details
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Payee
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Linked Expense
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
                {filteredVouchers.map((voucher) => (
                  <tr
                    key={voucher.id}
                    className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedVoucherId(voucher.id)}
                  >
                    <td className="py-4 px-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        
                        <div>
                          <div style={{ 
                            fontSize: "14px", 
                            fontWeight: 600, 
                            color: "#12332B", 
                            marginBottom: "2px" 
                          }}>
                            {voucher.voucherNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {voucher.currency} {formatAmount(voucher.amount)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {voucher.payee || "\u2014"}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {voucher.category || "\u2014"}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {voucher.expenseNumber ? (
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#0F766E",
                            display: "inline-block",
                          }}
                        >
                          {voucher.expenseNumber}
                        </span>
                      ) : (
                        <span style={{ fontSize: "14px", color: "#9CA3AF" }}>{"\u2014"}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <NeuronStatusPill status={voucher.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "13px", color: "#12332B" }}>
                        {new Date(voucher.voucherDate).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Voucher Modal */}
      <CreateVoucherModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onVoucherCreated={fetchVouchers}
      />
    </div>
  );
}