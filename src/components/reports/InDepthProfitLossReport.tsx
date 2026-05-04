import React, { useState, useEffect } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router";
import { BookingSelector } from "../selectors/BookingSelector";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { formatAmount } from "../../utils/formatAmount";
import { toast } from "sonner@2.0.3";
import { API_BASE_URL } from '@/utils/api-config';

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
  shipperName?: string;
  consignee?: string;
  consigneeName?: string;
  customerName?: string;
  clientName?: string;
  client?: string;
  vesselVoyage?: string;
  vessel_voyage?: string;
  vessel?: string;
  voyage?: string;
  volume?: string;
  commodity?: string;
  origin?: string;
  pol?: string;
  portOfLoading?: string;
  destination?: string;
  pod?: string;
  portOfDischarge?: string;
  blNumber?: string;
  bl_number?: string;
  awbBlNo?: string;
  awb_bl_no?: string;
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
  shipmentType?: string;
  segments?: any[];
}

export function InDepthProfitLossReport() {
  const navigate = useNavigate();
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const collectBookingIdentifiers = (booking: any, fallbackId: string): Set<string> => {
    const ids = new Set<string>();
    if (fallbackId) ids.add(fallbackId);
    if (booking?.id) ids.add(booking.id);
    if (booking?.bookingId) ids.add(booking.bookingId);
    if (booking?.bookingNumber) ids.add(booking.bookingNumber);
    if (booking?.booking_number) ids.add(booking.booking_number);
    if (booking?.tracking_number) ids.add(booking.tracking_number);
    if (booking?.trackingNumber) ids.add(booking.trackingNumber);
    return ids;
  };

  const matchesAnyIdentifier = (record: any, identifiers: Set<string>): boolean => {
    // Single-id fields
    if (record.bookingId && identifiers.has(record.bookingId)) return true;
    if (record.booking_id && identifiers.has(record.booking_id)) return true;
    if (record.bookingNumber && identifiers.has(record.bookingNumber)) return true;
    if (record.booking_number && identifiers.has(record.booking_number)) return true;
    // Array fields
    const arrays = [record.bookingIds, record.linkedBookingIds, record.linked_booking_ids];
    for (const arr of arrays) {
      if (Array.isArray(arr) && arr.some((id: string) => identifiers.has(id))) return true;
    }
    return false;
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
        const headers = { "Authorization": `Bearer ${publicAnonKey}` };
        const [bookingsRes, expensesRes, billingsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/bookings`, { headers }),
          fetch(`${API_BASE_URL}/expenses`, { headers }),
          fetch(`${API_BASE_URL}/billings`, { headers }),
        ]);

        const bookingsJson = bookingsRes.ok ? await bookingsRes.json() : { data: [] };
        const expensesJson = expensesRes.ok ? await expensesRes.json() : { data: [] };
        const billingsJson = billingsRes.ok ? await billingsRes.json() : { data: [] };

        const allBookings = Array.isArray(bookingsJson.data) ? bookingsJson.data : [];
        const allExpenses = Array.isArray(expensesJson.data) ? expensesJson.data : [];
        const allBillings = Array.isArray(billingsJson.data) ? billingsJson.data : [];

        const booking = allBookings.find((b: any) =>
          b.id === selectedBookingId ||
          b.bookingId === selectedBookingId ||
          b.bookingNumber === selectedBookingId ||
          b.booking_number === selectedBookingId ||
          b.tracking_number === selectedBookingId
        ) || null;

        if (!booking) toast.error(`Booking "${selectedBookingId}" not found`);
        setBookingDetails(booking);

        const identifiers = collectBookingIdentifiers(booking, selectedBookingId);
        setExpenses(allExpenses.filter((e: any) => matchesAnyIdentifier(e, identifiers)));
        setBillings(allBillings.filter((b: any) => matchesAnyIdentifier(b, identifiers)));
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

  // Export bookings store most fields inside segments[0] (SEGMENT_FIELDS in ExportBookingDetails);
  // imports keep them at the root. This getter checks both.
  const seg0: any = bookingDetails?.segments?.[0] || {};
  const getField = (...keys: string[]): string => {
    for (const k of keys) {
      const v = (bookingDetails as any)?.[k];
      if (v !== undefined && v !== null && v !== "") return String(v);
    }
    for (const k of keys) {
      const v = seg0?.[k];
      if (v !== undefined && v !== null && v !== "") return String(v);
    }
    return "";
  };

  const modeStr = (bookingDetails?.mode || bookingDetails?.shipmentType || (bookingDetails as any)?.booking_type || "").toLowerCase();
  const isExport = modeStr.includes("export") ||
                   bookingDetails?.bookingId?.toUpperCase().startsWith("E") ||
                   bookingDetails?.id?.toUpperCase().startsWith("E") ||
                   false;

  const date = formatDate(
      getField("date", "booking_date", "bookingDate", "createdAt", "created_at")
  );

  const shipmentNo = bookingDetails?.bookingId || bookingDetails?.bookingNumber || bookingDetails?.booking_number || bookingDetails?.id || "—";

  const shipperConsignee = (isExport
    ? getField("shipper", "shipperName", "customerName", "clientName", "client")
    : getField("consignee", "consigneeName", "customerName", "clientName", "client")
  ) || "—";
  const shipperConsigneeLabel = isExport ? "Shipper" : "Consignee";

  const vesselVoyage = getField("vesselVoyage", "vessel_voyage") ||
    (getField("vessel") && getField("voyage") ? `${getField("vessel")} / ${getField("voyage")}` : getField("vessel")) ||
    "—";
  const origin = getField("origin", "pol", "portOfLoading") || "—";
  const destination = getField("destination", "pod", "portOfDischarge") || "—";
  const blNumber = getField("blNumber", "bl_number") || "—";
  const commodity = getField("commodity") || "—";

  // Container No -> comma-separated string in containerNo (root or segment); fallback to arrays
  let containerNos: string[] = [];
  const rawContainerNo = getField("containerNo", "container_no");
  if (rawContainerNo) {
    containerNos = rawContainerNo.split(',').map(c => c.trim()).filter(Boolean);
  } else if (Array.isArray(seg0?.containerNos) && seg0.containerNos.length) {
    containerNos = seg0.containerNos.filter(Boolean);
  } else if (bookingDetails?.containers && Array.isArray(bookingDetails.containers)) {
    containerNos = bookingDetails.containers
      .map(c => c.container_number || c.containerNumber)
      .filter((c): c is string => !!c);
  } else if (bookingDetails?.containerNumbers || bookingDetails?.container_numbers) {
    containerNos = bookingDetails?.containerNumbers || bookingDetails?.container_numbers || [];
  }

  // Volume — "{count}x{size'type}" (e.g. "2x40'HC"); LCL stays as "LCL"
  const rawVolume = getField("volume").trim();
  let volume = "—";
  if (rawVolume) {
    if (rawVolume.toUpperCase() === "LCL") {
      volume = "LCL";
    } else {
      const count = Math.max(containerNos.length, 1);
      volume = `${count}x${rawVolume}`;
    }
  }

  // Releasing Date — sourced from the linked expenses' releasingDate field
  const releasingDateRaw = expenses
    .map((e: any) => e.releasingDate || e.releasing_date)
    .find((d: any) => !!d);
  const releasingDate = formatDate(releasingDateRaw);

  // SOA / Billing number for the footer line — first billing's number
  const billingSoaNo = (billings as any[])
    .map((b: any) => b.billingNumber || b.soaNumber || b.soa_number || b.billing_number)
    .find((n: any) => !!n) || "—";

  const handlePrintPDF = () => {
    if (!bookingDetails) {
      toast.error("Select a booking first");
      return;
    }

    const fmt = (n: number) =>
      n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const esc = (s: string) =>
      String(s ?? "").toUpperCase().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Build particulars rows with rowspan-merged voucher cells, matching the photo
    const particularRowsHtml = groupedExpenses.length > 0
      ? groupedExpenses.flatMap(group => {
          const rowSpan = group.charges.length || 1;
          return group.charges.map((charge: any, idx: number) => {
            const voucherCell = idx === 0
              ? `<td class="vch" rowspan="${rowSpan}">${esc(group.voucherNo)}</td>`
              : "";
            return `<tr>
              <td class="part">${esc((charge.description || "—").toUpperCase())}</td>
              <td class="amt">${fmt(Number(charge.amount) || 0)}</td>
              ${voucherCell}
            </tr>`;
          }).join("");
        }).join("")
      : `<tr><td class="part" colspan="3" style="text-align:center;font-style:italic;">No operational expenses recorded.</td></tr>`;

    const containerNoStr = containerNos.length > 0 ? containerNos.join(", ") : "—";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Profit / Loss — ${esc(shipmentNo)}</title>
<style>
  @page { size: A4 portrait; margin: 18mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 7.7pt; color: #000; text-transform: uppercase; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  table.meta td { padding: 3px 6px; vertical-align: top; font-size: 7.7pt; }
  table.meta td.lbl { width: 28%; font-weight: normal; text-transform: uppercase; }
  table.meta td.val { width: 72%; }
  table.particulars { width: 100%; border-collapse: collapse; margin-top: 0; }
  table.particulars th, table.particulars td {
    border: 1px solid #000;
    padding: 5px 8px;
    font-size: 7.4pt;
    vertical-align: middle;
    text-align: center;
  }
  table.particulars th {
    font-weight: bold;
    text-transform: uppercase;
  }
  td.part { text-transform: uppercase; }
  td.amt  { font-variant-numeric: tabular-nums; width: 25%; }
  td.vch  { font-weight: normal; width: 28%; }
  tr.total td, tr.soa td, tr.pnl td {
    border: none;
    font-weight: bold;
    text-transform: uppercase;
    padding-top: 6px;
  }
</style>
</head>
<body>
  <table class="meta">
    <tr><td class="lbl">Date</td><td class="val">${esc(date)}</td></tr>
    <tr><td class="lbl">Shipment No:</td><td class="val">${esc(shipmentNo)}</td></tr>
    <tr><td class="lbl">${esc(shipperConsigneeLabel)}</td><td class="val">${esc(shipperConsignee)}</td></tr>
    <tr><td class="lbl">Vessel/Voy:</td><td class="val">${esc(vesselVoyage)}</td></tr>
    <tr><td class="lbl">Volume:</td><td class="val">${esc(volume)}</td></tr>
    <tr><td class="lbl">Origin:</td><td class="val">${esc(origin)}</td></tr>
    <tr><td class="lbl">Destination:</td><td class="val">${esc(destination)}</td></tr>
    <tr><td class="lbl">Commodity:</td><td class="val">${esc(commodity)}</td></tr>
    <tr><td class="lbl">BL Number:</td><td class="val">${esc(blNumber)}</td></tr>
    <tr><td class="lbl">Container No:</td><td class="val">${esc(containerNoStr)}</td></tr>
    <tr><td class="lbl">Releasing Date:</td><td class="val">${esc(releasingDate)}</td></tr>
  </table>

  <table class="particulars">
    <thead>
      <tr>
        <th>Particulars</th>
        <th>Amount</th>
        <th>Voucher Number</th>
      </tr>
    </thead>
    <tbody>
      ${particularRowsHtml}
      <tr class="total">
        <td class="part">Total</td>
        <td class="amt">${fmt(totalExpenses)}</td>
        <td></td>
      </tr>
      <tr class="soa">
        <td class="part">Billing/SOA ${esc(String(billingSoaNo))}</td>
        <td class="amt">${fmt(totalRevenue)}</td>
        <td></td>
      </tr>
      <tr class="pnl">
        <td class="part">${netProfit >= 0 ? "Profit" : "Loss"}</td>
        <td class="amt">${fmt(Math.abs(netProfit))}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      toast.error("Popup blocked. Please allow popups for this site.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", paddingBottom: "48px" }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #E5E9F0",
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
              <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#0A1D4D", marginBottom: "2px" }}>
                In-Depth Profit / Loss Report
              </h1>
              <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>Per-booking profit and loss analysis</p>
            </div>
          </div>
          <button
            onClick={handlePrintPDF}
            style={{
              height: "40px",
              padding: "0 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: "white",
              backgroundColor: "var(--neuron-brand-green)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Printer size={16} />
            Print PDF
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 48px" }}>
        {/* Booking Selector */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #E5E9F0",
          overflow: "hidden",
          marginBottom: "24px"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>Select Booking</h3>
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
                  border: "1px solid #E5E9F0",
                  overflow: "hidden",
                  marginBottom: "24px"
                }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>Booking Summary</h2>
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
                                <span style={{ fontSize: "14px", fontWeight: 500, color: "#0A1D4D" }}>
                                    {containerNos.length > 0 ? containerNos.join(", ") : "—"}
                                </span>
                            </div>
                            <SummaryField label="Releasing Date" value={releasingDate} />
                        </div>
                    </div>
                </div>

                {/* Expenses Section & Financial Summary */}
                <div style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #E5E9F0",
                  overflow: "hidden",
                  marginBottom: "24px"
                }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E9F0", background: "#F9FAFB" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>Particulars</h2>
                    </div>
                    <div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "white", borderBottom: "1px solid #E5E9F0" }}>
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
                                                <td colSpan={2} style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 700, color: "#0A1D4D", borderBottom: "1px solid #E5E9F0" }}>
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
                                <tr style={{ background: "#F9FAFB", borderTop: "1px solid #E5E9F0" }}>
                                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700, color: "#0A1D4D", textTransform: "uppercase" }}>Total Expenses</td>
                                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700, color: "#EF4444", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        PHP {formatAmount(totalExpenses)}
                                    </td>
                                </tr>
                                {/* Total Revenue */}
                                <tr style={{ background: "#F9FAFB" }}>
                                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700, color: "#0A1D4D", textTransform: "uppercase" }}>Total Revenue</td>
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
                                    <td style={{ padding: "24px", fontSize: "20px", fontWeight: 700, color: "#0A1D4D", textTransform: "uppercase" }}>
                                        {netProfit > 0 ? "Net Profit" : netProfit < 0 ? "Net Loss" : "Break Even"}
                                    </td>
                                    <td style={{
                                        padding: "24px",
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        textAlign: "right",
                                        fontVariantNumeric: "tabular-nums",
                                        color: netProfit > 0 ? "#0F766E" : netProfit < 0 ? "#EF4444" : "#667085"
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
            <span style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#0A1D4D" }} title={value}>{value}</span>
        </div>
    );
}