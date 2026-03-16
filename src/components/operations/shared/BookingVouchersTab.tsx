import { useState, useEffect } from "react";
import { Plus, Receipt } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { NeuronStatusPill } from "../../NeuronStatusPill";
import { VoucherDetailPanel } from "../../accounting/VoucherDetailPanel";
import { CreateVoucherModal } from "../../accounting/CreateVoucherModal";
import { formatAmount } from "../../../utils/formatAmount";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface Voucher {
  id: string;
  voucherNumber: string;
  amount: number;
  currency: string;
  expenseId?: string;
  expenseNumber?: string;
  payee?: string;
  voucherDate: string;
  status: string;
  created_at?: string;
}

interface BookingVouchersTabProps {
  bookingId: string;
  bookingNumber?: string;
  onUpdate?: () => void;
}

/**
 * BookingVouchersTab - Shows ALL vouchers linked to a booking,
 * both direct (standalone) and indirect (via expenses).
 * Follows the module list screen pattern (like CollectionsListTab).
 */
export function BookingVouchersTab({ bookingId, bookingNumber, onUpdate }: BookingVouchersTabProps) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchVouchers();
  }, [bookingId]);

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/vouchers`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setVouchers(result.data);
      } else {
        setVouchers([]);
      }
    } catch (error) {
      console.error("Error fetching booking vouchers:", error);
      setVouchers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    const symbol = currency === "PHP" ? "\u20B1" : currency === "USD" ? "$" : currency;
    return `${symbol}${formatAmount(amount || 0)}`;
  };

  const handleVoucherCreated = () => {
    setShowCreateModal(false);
    fetchVouchers();
    if (onUpdate) onUpdate();
  };

  // Summary card computations
  const totalAmount = vouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
  const paidAmount = vouchers
    .filter((v) => v.status === "Paid")
    .reduce((sum, v) => sum + (v.amount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  const summaryCards = [
    { label: "Total Voucher Amount", value: formatCurrency(totalAmount) },
    { label: "Paid", value: formatCurrency(paidAmount) },
    { label: "Pending", value: formatCurrency(pendingAmount) },
  ];

  return (
    <>
      <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Summary Cards */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
          {summaryCards.map((card) => (
            <div
              key={card.label}
              style={{
                flex: 1,
                border: "1px solid #E5E7EB",
                borderRadius: "10px",
                padding: "20px 24px",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#667085",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#12332B",
                  marginTop: "8px",
                }}
              >
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          backgroundColor: "#FFFFFF",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{
            padding: "24px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: 0 }}>
                Linked Vouchers
              </h3>
              <p style={{ fontSize: "14px", color: "#667085", marginTop: "4px", marginBottom: 0 }}>
                All vouchers linked to {bookingNumber || "this booking"}
              </p>
            </div>

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
                  <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E7EB" }}>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Voucher Number</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Payee</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Linked Expense</th>
                    <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Amount</th>
                    <th style={{ padding: "12px 24px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher, index) => (
                    <tr
                      key={voucher.id}
                      style={{
                        borderBottom: index < vouchers.length - 1 ? "1px solid #E5E7EB" : "none",
                        transition: "background 0.15s ease",
                        cursor: "pointer"
                      }}
                      onClick={() => setSelectedVoucherId(voucher.id)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#FFFFFF"}
                    >
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
                          {voucher.voucherNumber}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: "#12332B" }}>
                          {formatDate(voucher.voucherDate || voucher.created_at || "")}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: "#12332B" }}>
                          {voucher.payee || "\u2014"}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
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
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", color: "#12332B" }}>
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
              <Receipt size={40} style={{ color: "#E5E7EB", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "14px", color: "#667085", margin: 0 }}>
                No vouchers linked to this booking yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Voucher Modal - pass bookingId so it's linked */}
      <CreateVoucherModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        bookingId={bookingId}
        onVoucherCreated={handleVoucherCreated}
      />

      {/* Voucher Detail Panel */}
      <VoucherDetailPanel
        voucherId={selectedVoucherId}
        isOpen={selectedVoucherId !== null}
        onClose={() => setSelectedVoucherId(null)}
        onVoucherDeleted={() => {
          setSelectedVoucherId(null);
          fetchVouchers();
          if (onUpdate) onUpdate();
        }}
        onVoucherUpdated={() => {
          fetchVouchers();
          if (onUpdate) onUpdate();
        }}
      />
    </>
  );
}