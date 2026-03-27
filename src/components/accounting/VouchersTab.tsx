import { useState, useEffect } from "react";
import { Plus, Receipt, DollarSign } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { CreateVoucherModal } from "./CreateVoucherModal";
import { VoucherDetailPanel } from "./VoucherDetailPanel";
import { formatAmount } from "../../utils/formatAmount";
import { NEURON_STYLES, NEURON_COLORS } from "../design-system/neuron-design-tokens";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { API_BASE_URL } from '@/utils/api-config';

interface Voucher {
  id: string;
  voucherNumber: string;
  amount: number;
  currency: string;
  lineItemIds?: string[];
  payee?: string;
  shipper?: string;
  vesselVoy?: string;
  volume?: string;
  destination?: string;
  blNumber?: string;
  voucherDate: string;
  status: string;
  created_at?: string;
}

interface VouchersTabProps {
  expenseId: string;
  expenseNumber: string;
  totalAmount: number;
  currency: string;
  vouchers?: Voucher[]; // Added prop
  onUpdate?: () => void;
}

export function VouchersTab({ expenseId, expenseNumber, totalAmount, currency, vouchers: providedVouchers, onUpdate }: VouchersTabProps) {
  const [localVouchers, setLocalVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  
  // Use provided vouchers if available, otherwise use local state
  const vouchers = providedVouchers || localVouchers;

  useEffect(() => {
    if (!providedVouchers) {
      fetchVouchers();
    }
  }, [expenseId, providedVouchers]);

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}/vouchers`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setLocalVouchers(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoucherCreated = () => {
    fetchVouchers();
    if (onUpdate) onUpdate();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, curr: string) => {
    const symbol = currency === "PHP" ? "₱" : currency === "USD" ? "$" : currency;
    return `${symbol}${formatAmount(amount || 0)}`;
  };

  return (
    <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Summary Cards */}
      {(() => {
        const voucherTotal = vouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
        const paidAmount = vouchers
          .filter((v) => v.status === "Paid")
          .reduce((sum, v) => sum + (v.amount || 0), 0);
        const pendingAmount = voucherTotal - paidAmount;
        const fmtCard = (amount: number) => {
          const symbol = currency === "PHP" ? "₱" : currency === "USD" ? "$" : currency;
          return `${symbol}${formatAmount(amount || 0)}`;
        };
        const cards = [
          { label: "Total Voucher Amount", value: fmtCard(voucherTotal) },
          { label: "Paid", value: fmtCard(paidAmount) },
          { label: "Pending", value: fmtCard(pendingAmount) },
        ];
        return (
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            {cards.map((card) => (
              <div
                key={card.label}
                style={{
                  flex: 1,
                  border: "1px solid #E5E9F0",
                  borderRadius: "8px",
                  padding: "20px 24px",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#667085",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.5px",
                }}>{card.label}</div>
                <div style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#0A1D4D",
                  marginTop: "8px",
                }}>{card.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Container matching Collections Tab design */}
      <div style={{ 
        border: "1px solid #E5E9F0", 
        borderRadius: "12px", 
        backgroundColor: "#FFFFFF",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "24px", 
          borderBottom: "1px solid #E5E9F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h3 style={{ 
              ...NEURON_STYLES.sectionTitle,
              marginBottom: 0
            }}>
              Linked Vouchers
            </h3>
            <p style={{ fontSize: "14px", color: "#667085", marginTop: "4px", marginBottom: 0 }}>
              Payments made against {expenseNumber}
            </p>
          </div>
          
          {/* New Voucher Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
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
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#0D6660"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#0F766E"}
          >
            <Plus size={16} />
            New Voucher
          </button>
        </div>
        
        {isLoading ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ color: "#667085", fontSize: "14px" }}>Loading vouchers...</div>
          </div>
        ) : vouchers.length > 0 ? (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E9F0" }}>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Voucher Number</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Payee</th>
                  <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Amount</th>
                  <th style={{ padding: "12px 24px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher, index) => (
                  <tr 
                    key={voucher.id} 
                    style={{ 
                      borderBottom: index < vouchers.length - 1 ? "1px solid #E5E9F0" : "none",
                      transition: "background 0.15s ease",
                      cursor: "pointer"
                    }}
                    onClick={() => setSelectedVoucherId(voucher.id)}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#FFFFFF"}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                        {voucher.voucherNumber}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                        {formatDate(voucher.voucherDate)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                        {voucher.payee || "—"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                        {formatCurrency(voucher.amount, voucher.currency)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <NeuronStatusPill status={voucher.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <Receipt size={40} style={{ color: "#E5E9F0", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
              No vouchers recorded for this expense yet
            </p>
          </div>
        )}
      </div>

      {/* Create Voucher Modal */}
      <CreateVoucherModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        expenseId={expenseId}
        expenseNumber={expenseNumber}
        onVoucherCreated={handleVoucherCreated}
      />

      {/* Voucher Detail Panel */}
      <VoucherDetailPanel
        voucherId={selectedVoucherId}
        isOpen={selectedVoucherId !== null}
        onClose={() => setSelectedVoucherId(null)}
        onVoucherDeleted={() => {
          setSelectedVoucherId(null);
          handleVoucherCreated(); // Refresh list and parent
        }}
        onVoucherUpdated={() => {
          handleVoucherCreated(); // Refresh list and parent
        }}
      />
    </div>
  );
}