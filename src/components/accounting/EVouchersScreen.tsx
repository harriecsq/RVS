import { useState, useEffect } from "react";
import { Plus, Search, FileText, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { ViewVoucherScreen } from "./ViewVoucherScreen";
import { CreateVoucherModal } from "./CreateVoucherModal";
import { formatAmount } from "../../utils/formatAmount";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';

interface VouchersScreenProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

type VoucherStatus = "Draft" | "Submitted" | "Under Review" | "Approved" | "Processing" | "Paid" | "Rejected";

interface Voucher {
  id: string;
  voucherNumber: string;
  category: string;
  requestorName: string;
  vendor?: string;
  bookingNumber?: string;
  projectNumber?: string;
  amount: number;
  requestDate: string;
  purpose?: string;
  status: VoucherStatus;
  createdAt: string;
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

export function VouchersScreen({ currentUser }: VouchersScreenProps) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "submitted" | "approved">("all");
  const [timePeriodFilter, setTimePeriodFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [requestorFilter, setRequestorFilter] = useState<string>("all");
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch vouchers from backend
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vouchers`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log("Fetched vouchers:", result.data);
        setVouchers(result.data);
      } else {
        console.log("No vouchers found or error:", result);
        setVouchers([]);
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      setVouchers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVoucher = async (voucherId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete voucher ${voucherId}? This action cannot be undone.`)) {
      return;
    }

    // TODO: Implement delete API call
    fetchVouchers();
  };

  // Get unique values for filters
  const uniqueCategories = Array.from(new Set(vouchers.map(e => e.category).filter(Boolean)));
  const uniqueRequestors = Array.from(new Set(vouchers.map(e => e.requestorName).filter(Boolean)));

  // Filter vouchers by tab first
  const getFilteredByTab = () => {
    let filtered = vouchers;

    if (activeTab === "draft") {
      filtered = vouchers.filter(e => e.status === "Draft");
    } else if (activeTab === "submitted") {
      filtered = vouchers.filter(e => e.status === "Submitted" || e.status === "Under Review");
    } else if (activeTab === "approved") {
      filtered = vouchers.filter(e => e.status === "Approved" || e.status === "Processing");
    }

    return filtered;
  };

  // Apply all filters
  const filteredVouchers = getFilteredByTab().filter(voucher => {
    // Search filter
    const matchesSearch = 
      voucher.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.requestorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voucher.vendor && voucher.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (voucher.bookingNumber && voucher.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (voucher.projectNumber && voucher.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Time period filter
    if (timePeriodFilter !== "all") {
      const voucherDate = new Date(voucher.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - voucherDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (timePeriodFilter === "7days" && daysDiff > 7) return false;
      if (timePeriodFilter === "30days" && daysDiff > 30) return false;
      if (timePeriodFilter === "90days" && daysDiff > 90) return false;
    }

    // Status filter
    const matchesStatus = statusFilter === "all" || voucher.status === statusFilter;
    if (!matchesStatus) return false;

    // Category filter
    if (categoryFilter !== "all" && voucher.category !== categoryFilter) return false;

    // Requestor filter
    if (requestorFilter !== "all" && voucher.requestorName !== requestorFilter) return false;

    return true;
  });

  // Calculate counts for tabs
  const allCount = vouchers.length;
  const draftCount = vouchers.filter(e => e.status === "Draft").length;
  const submittedCount = vouchers.filter(e => e.status === "Submitted" || e.status === "Under Review").length;
  const approvedCount = vouchers.filter(e => e.status === "Approved" || e.status === "Processing").length;

  // Show voucher view screen if a voucher is selected
  if (selectedVoucherId) {
    return (
      <ViewVoucherScreen 
        voucherId={selectedVoucherId} 
        onBack={() => setSelectedVoucherId(null)} 
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
              Manage expense vouchers and reimbursement requests
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
            New Voucher
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
            placeholder="Search by Voucher Number, Category, Requestor, Vendor, Booking, or Project Number..."
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
          <select
            value={timePeriodFilter}
            onChange={(e) => setTimePeriodFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VoucherStatus | "all")}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Processing">Processing</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Requestor Filter */}
          <select
            value={requestorFilter}
            onChange={(e) => setRequestorFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Requestors</option>
            {uniqueRequestors.map(requestor => (
              <option key={requestor} value={requestor}>{requestor}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: "flex", 
          gap: "8px", 
          borderBottom: "1px solid #E5E7EB",
          marginBottom: "24px"
        }}>
          <TabButton
            icon={<FileText size={18} />}
            label="All Vouchers"
            count={allCount}
            isActive={activeTab === "all"}
            color="#0F766E"
            onClick={() => setActiveTab("all")}
          />
          <TabButton
            icon={<FileText size={18} />}
            label="Draft"
            count={draftCount}
            isActive={activeTab === "draft"}
            color="#6B7280"
            onClick={() => setActiveTab("draft")}
          />
          <TabButton
            icon={<Clock size={18} />}
            label="Submitted"
            count={submittedCount}
            isActive={activeTab === "submitted"}
            color="#0F766E"
            onClick={() => setActiveTab("submitted")}
          />
          <TabButton
            icon={<CheckCircle size={18} />}
            label="Approved"
            count={approvedCount}
            isActive={activeTab === "approved"}
            color="#10B981"
            onClick={() => setActiveTab("approved")}
          />
        </div>
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
                    Voucher Number
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Requestor
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Vendor
                  </th>
                  <th className="text-right py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide" style={{ width: "80px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map((voucher) => (
                  <tr
                    key={voucher.id}
                    onClick={() => setSelectedVoucherId(voucher.id)}
                    className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4">
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: 600, 
                        color: "#12332B"
                      }}>
                        {voucher.voucherNumber}
                      </div>
                      <div style={{ fontSize: "13px", color: "#667085" }}>
                        {new Date(voucher.requestDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {voucher.category}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {voucher.requestorName}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#12332B" }}>
                        {voucher.vendor || "—"}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: 600,
                        color: "#12332B" 
                      }}>
                        ₱{formatAmount(voucher.amount)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <NeuronStatusPill status={voucher.status} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={(e) => handleDeleteVoucher(voucher.id, e)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          border: "1px solid #FCA5A5",
                          borderRadius: "6px",
                          background: "transparent",
                          color: "#DC2626",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Voucher Modal */}
      {showCreateModal && (
        <CreateVoucherModal
          onClose={() => setShowCreateModal(false)}
          projectId={projectId}
          publicAnonKey={publicAnonKey}
        />
      )}
    </div>
  );
}