import { useState, useEffect } from "react";
import { FileText, DollarSign, Receipt } from "lucide-react";
import { useNavigate } from "react-router";
import type { Project } from "../../types/pricing";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { StandardSearchInput } from "../design-system/StandardSearchInput";
import { StandardFilterDropdown } from "../design-system/StandardFilterDropdown";
import { StandardLoadingState } from "../design-system/StandardLoadingState";
import { StandardEmptyState } from "../design-system/StandardEmptyState";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface Billing {
  id?: string;
  billingId?: string;
  bookingId: string;
  billingNumber?: string;
  amount: number;
  currency?: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
  created_at?: string;
  billing_type?: string;
  particulars?: string | any[];
  totalAmount?: number;
  pendingAmount?: number;
  clientName?: string;
  billingDate?: string;
  voucherNumber?: string;
}

interface ProjectBillingsTabProps {
  project: Project;
}

export function ProjectBillingsTab({ project }: ProjectBillingsTabProps) {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [filteredBillings, setFilteredBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchBillings();
  }, [project.id]);

  useEffect(() => {
    filterBillings();
  }, [searchQuery, statusFilter, billings]);

  const fetchBillings = async () => {
    setIsLoading(true);
    try {
      // Fetch billings directly by projectId
      const response = await fetch(`${API_URL}/billings?projectId=${project.id}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setBillings(result.data);
      }
    } catch (error) {
      console.error("Error fetching billings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBillings = () => {
    let filtered = billings;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (b) =>
          (b.billingNumber || b.billingId || b.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.bookingId || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    setFilteredBillings(filtered);
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
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleBillingClick = (billing: Billing) => {
    // Navigate to accounting billings page
    navigate("/accounting/billings", {
      state: {
        openBillingId: billing.billingId || billing.id,
      },
    });
  };

  const totalAmount = billings.reduce((sum, billing) => sum + (billing.amount || billing.totalAmount || 0), 0);
  const paidAmount = billings
    .filter((b) => b.status?.toLowerCase() === "paid")
    .reduce((sum, billing) => sum + (billing.amount || billing.totalAmount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      {/* Main Content Area */}
      <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
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
                  backgroundColor: "#E3F2FD",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DollarSign size={20} style={{ color: "#1565C0" }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", marginBottom: "4px" }}>
                  Total Billed
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
                  Paid
                </div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "#2E7D32" }}>
                  {formatCurrency(paidAmount)}
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

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "24px" }}>
          {/* Search */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <StandardSearchInput
              placeholder="Search by billing number or booking..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
          </div>

          {/* Status Filter */}
          <StandardFilterDropdown
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Draft", label: "Draft" },
              { value: "For Approval", label: "For Approval" },
              { value: "Approved", label: "Approved" },
              { value: "Completed", label: "Completed" },
              { value: "Partially Collected", label: "Partially Collected" },
              { value: "Cancelled", label: "Cancelled" },
            ]}
          />
        </div>

        {/* Billings Table */}
        {isLoading ? (
          <StandardLoadingState message="Loading billings..." />
        ) : filteredBillings.length === 0 ? (
          <StandardEmptyState
            icon={<Receipt size={48} />}
            title={searchQuery || statusFilter !== "all" ? "No billings found matching your filters" : "No billings yet"}
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your search criteria or filters" : "Billings will appear here once generated for bookings in this project"}
          />
        ) : (
          <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr key="header-row" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Billing Number
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Voucher
                  </th>
                  <th className="text-right py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-center py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBillings.map((billing) => {
                  const billingId = billing.id || billing.billingId;
                  const billingNumber = billing.billingNumber || billingId || "";
                  
                  return (
                    <tr
                      key={billingId || Math.random()}
                      className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                      onClick={() => handleBillingClick(billing)}
                    >
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
                          {billingNumber}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "14px", color: "#12332B" }}>
                          {billing.clientName || "—"}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "14px", color: "#667085" }}>
                          {billing.voucherNumber || "—"}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div style={{ fontSize: "14px", color: "#12332B", fontWeight: 600 }}>
                          {formatCurrency(billing.totalAmount || billing.amount, billing.currency)}
                        </div>
                        {billing.pendingAmount !== undefined && billing.pendingAmount > 0 ? (
                          <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "2px", fontWeight: 500 }}>
                            Pending: {formatCurrency(billing.pendingAmount, billing.currency)}
                          </div>
                        ) : billing.pendingAmount === 0 ? (
                          <div style={{ fontSize: "12px", color: "#2E7D32", marginTop: "2px", fontWeight: 500 }}>
                            Fully Collected
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 px-4">
                        <div style={{ fontSize: "13px", color: "#667085" }}>
                          {formatDate(billing.billingDate || billing.createdAt || billing.created_at)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <NeuronStatusPill status={billing.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}