import React, { useState, useEffect } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router";
import { BookingSelector } from "../selectors/BookingSelector";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { formatAmount } from "../../utils/formatAmount";
import { toast } from "sonner@2.0.3";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface LineItem {
  description: string;
  amount: number | string;
  currency?: string;
  category?: string;
  voucherNo?: string; // Added voucherNo to LineItem
}

interface Expense {
  id: string;
  charges: LineItem[];
  amount: number;
  reference_number?: string;
  voucher_number?: string;
}

interface Billing {
  id: string;
  total_amount: number;
  totalAmount?: number;
  grand_total?: number;
  currency: string;
}

interface Container {
    container_number?: string;
    containerNumber?: string;
}

interface BookingDetails {
  id: string;
  bookingId?: string;
  booking_number?: string;
  bookingNumber?: string;
  bookingDate?: string;
  booking_date?: string;
  date?: string;
  createdAt?: string;
  created_at?: string;
  shipper?: string;
  consignee?: string;
  vesselVoyage?: string;
  vessel_voyage?: string;
  volume?: string;
  origin?: string;
  pol?: string;
  destination?: string;
  pod?: string;
  blNumber?: string;
  bl_number?: string;
  containerNumbers?: string[];
  container_numbers?: string[];
  containers?: Container[];
  containerNo?: string;
  container_no?: string;
  releasingDate?: string;
  releasing_date?: string;
  discharged?: string;
  dischargedDate?: string;
  discharged_date?: string;
  eta?: string;
  mode?: string;
}

export function InDepthProfitLossReport() {
  const navigate = useNavigate();
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookingDetails = async (bookingId: string) => {
    const endpoints = [
      `${API_URL}/export-bookings/${bookingId}`,
      `${API_URL}/import-bookings/${bookingId}`,
      `${API_URL}/forwarding-bookings/${bookingId}`,
      `${API_URL}/trucking-bookings/${bookingId}`,
      `${API_URL}/brokerage-bookings/${bookingId}`,
      `${API_URL}/marine-insurance-bookings/${bookingId}`,
      `${API_URL}/others-bookings/${bookingId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { "Authorization": `Bearer ${publicAnonKey}` },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            return { ...result.data, id: result.data.id || bookingId };
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint}`, error);
      }
    }
    return null;
  };

  const fetchExpenses = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/expenses?bookingId=${bookingId}`, {
        headers: { "Authorization": `Bearer ${publicAnonKey}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            return result.data.filter((e: any) => 
                (e.bookingIds && e.bookingIds.includes(bookingId)) || 
                (e.linkedBookingIds && e.linkedBookingIds.includes(bookingId)) ||
                e.bookingId === bookingId
            );
        }
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
    return [];
  };

  const fetchBillings = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/billings?bookingId=${bookingId}`, {
        headers: { "Authorization": `Bearer ${publicAnonKey}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
             return result.data.filter((b: any) => 
                (b.bookingIds && b.bookingIds.includes(bookingId)) || 
                b.bookingId === bookingId
            );
        }
      }
    } catch (error) {
      console.error("Error fetching billings:", error);
    }
    return [];
  };

  useEffect(() => {
    if (!selectedBookingId) {
      setBookingDetails(null);
      setExpenses([]);
      setBillings([]);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [booking, expensesData, billingsData] = await Promise.all([
          fetchBookingDetails(selectedBookingId),
          fetchExpenses(selectedBookingId),
          fetchBillings(selectedBookingId)
        ]);

        if (booking) {
            setBookingDetails(booking);
        } else {
            toast.error("Could not find full booking details");
        }
        
        setExpenses(expensesData);
        setBillings(billingsData);
      } catch (error) {
        console.error("Error loading report data:", error);
        toast.error("Failed to load report data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedBookingId]);

  // Calculations
  
  // Helper to filter out Container Deposit from Operational Expenses
  const isOperationalExpense = (charge: LineItem) => {
      const isDepositCategory = charge.category === "Container Deposit";
      const isDepositDescription = charge.description === "Container Deposit";
      return !isDepositCategory && !isDepositDescription;
  };

  const totalExpenses = expenses.reduce((sum, expense) => {
    if (expense.charges && Array.isArray(expense.charges)) {
        return sum + expense.charges.reduce((cSum, charge) => {
            if (isOperationalExpense(charge)) {
                return cSum + (Number(charge.amount) || 0);
            }
            return cSum;
        }, 0);
    }
    // If no charges array, default to including it unless we can determine category
    return sum + (Number(expense.amount) || 0);
  }, 0);

  const totalRevenue = billings.reduce((sum, billing) => {
    return sum + (billing.totalAmount || billing.grand_total || billing.total_amount || 0);
  }, 0);

  const netProfit = totalRevenue - totalExpenses;

  // Prepare grouped expenses for the table
  // 1. Flatten all charges from all expenses
  // 2. Assign voucher number to each charge (prioritize charge.voucherNo, then expense.voucher_number)
  // 3. Group by voucher number
  
  const allCharges = expenses.flatMap(expense => {
      const charges = expense.charges || [];
      return charges.filter(isOperationalExpense).map(charge => ({
          ...charge,
          amount: Number(charge.amount) || 0,
          currency: charge.currency || "PHP",
          // Use charge.voucherNo if available, otherwise fallback to expense.voucher_number, otherwise "—"
          // Note: "—" is used for unlinked items as requested
          finalVoucherNo: charge.voucherNo || expense.voucher_number || expense.reference_number || "—"
      }));
  });

  // Group by finalVoucherNo
  const groupedExpensesMap = new Map<string, typeof allCharges>();
  
  allCharges.forEach(charge => {
      const key = charge.finalVoucherNo;
      if (!groupedExpensesMap.has(key)) {
          groupedExpensesMap.set(key, []);
      }
      groupedExpensesMap.get(key)?.push(charge);
  });

  // Convert map to array and sort
  const groupedExpenses = Array.from(groupedExpensesMap.entries())
      .map(([voucherNo, charges]) => ({
          voucherNo,
          charges
      }))
      .sort((a, b) => {
          // Sort "—" to the bottom, others ascending
          if (a.voucherNo === "—") return 1;
          if (b.voucherNo === "—") return -1;
          return a.voucherNo.localeCompare(b.voucherNo);
      });


  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    } catch {
        return dateStr;
    }
  };

  const isExport = bookingDetails?.mode === "EXPORT" || 
                   bookingDetails?.id?.startsWith("E") || 
                   false; 

  // Mapping Booking Details
  // Date -> booking_date -> date -> createdAt
  const date = formatDate(
      bookingDetails?.date || 
      bookingDetails?.booking_date || 
      bookingDetails?.bookingDate || 
      bookingDetails?.createdAt || 
      bookingDetails?.created_at
  );
  
  const shipmentNo = bookingDetails?.bookingNumber || bookingDetails?.booking_number || bookingDetails?.id || "—";
  
  const shipperConsignee = isExport 
    ? (bookingDetails?.shipper || "—")
    : (bookingDetails?.consignee || "—");
  const shipperConsigneeLabel = isExport ? "Shipper" : "Consignee";
  
  const vesselVoyage = bookingDetails?.vesselVoyage || bookingDetails?.vessel_voyage || "—";
  const volume = bookingDetails?.volume || "—";
  const origin = bookingDetails?.origin || bookingDetails?.pol || "—";
  const destination = bookingDetails?.destination || bookingDetails?.pod || "—";
  const blNumber = bookingDetails?.blNumber || bookingDetails?.bl_number || "—";
  
  // Container No -> Pull from container list
  let containerNos: string[] = [];
  if (bookingDetails?.containers && Array.isArray(bookingDetails.containers)) {
      containerNos = bookingDetails.containers
        .map(c => c.container_number || c.containerNumber)
        .filter((c): c is string => !!c);
  } else if (bookingDetails?.containerNumbers || bookingDetails?.container_numbers) {
      containerNos = bookingDetails?.containerNumbers || bookingDetails?.container_numbers || [];
  } else if (bookingDetails?.containerNo || bookingDetails?.container_no) {
      // Handle comma-separated string
      const raw = bookingDetails.containerNo || bookingDetails.container_no || "";
      containerNos = raw.split(',').map(c => c.trim()).filter(Boolean);
  }
  
  // Releasing Date -> Discharged Date -> Discharged
  const releasingDate = formatDate(
      bookingDetails?.discharged || 
      bookingDetails?.discharged_date || 
      bookingDetails?.dischargedDate || 
      bookingDetails?.releasing_date || 
      bookingDetails?.releasingDate
  );

  const handleExport = () => {
    if (!groupedExpenses.length) {
        toast.error("No data to export");
        return;
    }
    
    // Simple CSV Export
    const headers = ["Voucher No", "Description", "Currency", "Amount"];
    const rows = groupedExpenses.flatMap(group => 
        group.charges.map(charge => [
            group.voucherNo,
            charge.description || "",
            charge.currency || "PHP",
            charge.amount.toString()
        ])
    );
    
    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ProfitLoss_${shipmentNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exporting to Excel...");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", paddingBottom: "48px" }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #E5E7EB",
        padding: "20px 48px",
        maxWidth: "1440px",
        width: "100%",
        margin: "0 auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => navigate("/reports")}
              style={{
                background: "transparent",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#6B7280",
                borderRadius: "6px"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#12332B", marginBottom: "2px" }}>
                In-Depth Profit / Loss Report
              </h1>
              <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>Per-booking profit and loss analysis</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            style={{
              height: "40px",
              padding: "0 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#0F766E",
              backgroundColor: "white",
              border: "1px solid #0F766E",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 48px" }}>
        {/* Booking Selector */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          overflow: "hidden",
          marginBottom: "24px"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: 0 }}>Select Booking</h3>
          </div>
          <div style={{ padding: "24px" }}>
            <BookingSelector
              value={selectedBookingId}
              onSelect={(b) => setSelectedBookingId(b?.id || "")}
            />
          </div>
        </div>

        {selectedBookingId && (
            <>
                {/* Booking Summary Section */}
                <div style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  overflow: "hidden",
                  marginBottom: "24px"
                }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: 0 }}>Booking Summary</h2>
                    </div>
                    <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 48px" }}>
                        {/* Column 1 */}
                        <div>
                            <SummaryField label="Date" value={date} />
                            <SummaryField label="Shipment No" value={shipmentNo} />
                            <SummaryField label={shipperConsigneeLabel} value={shipperConsignee} />
                            <SummaryField label="Vessel/VOY" value={vesselVoyage} />
                            <SummaryField label="Volume" value={volume} />
                        </div>
                        {/* Column 2 */}
                        <div>
                            <SummaryField label="Origin" value={origin} />
                            <SummaryField label="Destination" value={destination} />
                            <SummaryField label="BL Number" value={blNumber} />
                            <div style={{ marginBottom: "16px" }}>
                                <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Container No</span>
                                {containerNos.length > 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        {containerNos.map((c, i) => (
                                            <span key={i} style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>{c}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>—</span>
                                )}
                            </div>
                            <SummaryField label="Releasing Date" value={releasingDate} />
                        </div>
                    </div>
                </div>

                {/* Expenses Section & Financial Summary */}
                <div style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  overflow: "hidden",
                  marginBottom: "24px"
                }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#12332B", margin: 0 }}>Particulars</h2>
                    </div>
                    <div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "white", borderBottom: "1px solid #E5E7EB" }}>
                                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>Particulars</th>
                                    <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedExpenses.length > 0 ? (
                                    groupedExpenses.flatMap((expenseGroup, groupIndex) => {
                                        const groupKey = expenseGroup.voucherNo || groupIndex;
                                        const rows = [];

                                        // Voucher Group Header Row
                                        rows.push(
                                            <tr key={`header-${groupKey}`} style={{ background: "#F9FAFB" }}>
                                                <td colSpan={2} style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 700, color: "#12332B", borderBottom: "1px solid #E5E7EB" }}>
                                                    Voucher: {expenseGroup.voucherNo}
                                                </td>
                                            </tr>
                                        );

                                        // Expense Items Rows
                                        expenseGroup.charges.forEach((item, itemIndex) => {
                                            rows.push(
                                                <tr key={`item-${groupKey}-${itemIndex}`} style={{ borderBottom: "1px solid #F2F4F7" }}>
                                                    <td style={{ padding: "12px 24px", fontSize: "14px", color: "#344054" }}>{item.description || "—"}</td>
                                                    <td style={{ padding: "12px 24px", fontSize: "14px", color: "#344054", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                                        {item.currency} {formatAmount(item.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        });

                                        return rows;
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={2} style={{ padding: "32px 24px", textAlign: "center", color: "#667085", fontStyle: "italic" }}>No operational expenses recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                {/* Total Expenses */}
                                <tr style={{ background: "#F9FAFB", borderTop: "1px solid #E5E7EB" }}>
                                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700, color: "#12332B", textTransform: "uppercase" }}>Total Expenses</td>
                                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700, color: "#DC2626", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        PHP {formatAmount(totalExpenses)}
                                    </td>
                                </tr>
                                {/* Total Revenue */}
                                <tr style={{ background: "#F9FAFB" }}>
                                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700, color: "#12332B", textTransform: "uppercase" }}>Total Revenue</td>
                                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700, color: "#0F766E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        PHP {formatAmount(totalRevenue)}
                                    </td>
                                </tr>
                                {/* Divider */}
                                <tr>
                                    <td colSpan={2} style={{ padding: 0, borderTop: "2px solid #D1D5DB" }}></td>
                                </tr>
                                {/* Net Profit / Loss */}
                                <tr style={{ background: "#F9FAFB" }}>
                                    <td style={{ padding: "24px", fontSize: "20px", fontWeight: 700, color: "#12332B", textTransform: "uppercase" }}>
                                        {netProfit > 0 ? "Net Profit" : netProfit < 0 ? "Net Loss" : "Break Even"}
                                    </td>
                                    <td style={{
                                        padding: "24px",
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        textAlign: "right",
                                        fontVariantNumeric: "tabular-nums",
                                        color: netProfit > 0 ? "#0F766E" : netProfit < 0 ? "#DC2626" : "#667085"
                                    }}>
                                        PHP {formatAmount(Math.abs(netProfit))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ marginBottom: "16px" }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</span>
            <span style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#12332B" }} title={value}>{value}</span>
        </div>
    );
}