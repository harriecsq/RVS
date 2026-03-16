import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  Percent,
  Calendar,
  AlertCircle,
  Clock,
  Target,
  BarChart3,
  Wallet,
  CreditCard,
  Receipt,
  Truck,
  FileCheck,
  AlertTriangle
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart
} from "recharts";
import { NeuronCard } from "./NeuronCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState, useMemo, memo, useRef, useEffect } from "react";

interface ExecutiveDashboardProps {
  currentUser?: { name: string; email: string } | null;
}

interface HeroMetricProps {
  label: string;
  value: string;
  subtext?: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  icon: any;
  alert?: boolean;
}

// Color constants — used in inline styles throughout
const C = {
  ink: '#12332B',
  muted: '#6B7A76',
  teal: '#0F766E',
  red: '#C94F3D',
  redLight: '#EF4444',
  green: '#237F66',
  tealLight: '#14B8A6',
  orange: '#F97316',
  orangeDark: '#D97706',
  border: '#E5E9F0',
  bg: '#F9FAFB',
  pillGreen: '#E8F2EE',
  pillYellow: '#FEF3C7',
  alertBg: '#FEF2F2',
  alertBorder: '#FEE2E2',
  warningBg: '#FEF3C7',
} as const;

// Hero Metric Card Component - Memoized for performance
const HeroMetric = memo(({ 
  label, 
  value, 
  subtext, 
  trend, 
  trendValue, 
  icon: Icon,
  alert
}: HeroMetricProps) => {
  const isPositive = trend === "up";
  const isNeutral = trend === "neutral";
  
  return (
    <NeuronCard padding="lg" elevation="1" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background gradient accent */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '128px',
          height: '128px',
          opacity: 0.05,
          background: `radial-gradient(circle, ${alert ? C.red : C.green} 0%, transparent 70%)`
        }}
      />
      
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: C.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
          <Icon size={20} style={{ color: alert ? C.red : C.muted }} />
        </div>
        
        <div style={{ fontSize: '32px', fontWeight: 600, color: C.ink, lineHeight: 1, marginBottom: '8px', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {!isNeutral && (isPositive ? (
              <TrendingUp size={14} style={{ color: C.teal }} />
            ) : (
              <TrendingDown size={14} style={{ color: C.red }} />
            ))}
            <span style={{ fontSize: '13px', fontWeight: 500, color: isNeutral ? C.muted : isPositive ? C.teal : C.red }}>
              {trendValue}
            </span>
          </div>
          
          {subtext && (
            <>
              <span style={{ color: '#E5ECE9' }}>·</span>
              <span style={{ fontSize: '11px', color: C.muted }}>
                {subtext}
              </span>
            </>
          )}
        </div>
      </div>
    </NeuronCard>
  );
});

HeroMetric.displayName = 'HeroMetric';

export function ExecutiveDashboard({ currentUser }: ExecutiveDashboardProps) {
  const [timeframe, setTimeframe] = useState("month");

  // ⚡ PERFORMANCE: Memoize all chart data to prevent recreation on every render
  const cashFlowData = useMemo(() => [
    { month: "Jun", receivables: 485000, payables: 362000, netPosition: 123000 },
    { month: "Jul", receivables: 512000, payables: 389000, netPosition: 123000 },
    { month: "Aug", receivables: 548000, payables: 401000, netPosition: 147000 },
    { month: "Sep", receivables: 592000, payables: 438000, netPosition: 154000 },
    { month: "Oct", receivables: 634000, payables: 467000, netPosition: 167000 },
    { month: "Nov", receivables: 678000, payables: 495000, netPosition: 183000 }
  ], []);

  const marginByServiceData = useMemo(() => [
    { service: "Ocean FCL", revenue: 285000, cost: 218000, margin: 23.5 },
    { service: "Ocean LCL", revenue: 142000, cost: 115000, margin: 19.0 },
    { service: "Air Freight", revenue: 189000, cost: 156000, margin: 17.5 },
    { service: "Domestic", revenue: 62000, cost: 51000, margin: 17.7 }
  ], []);

  const paymentBehaviorData = useMemo(() => [
    { name: "0-30 Days", value: 45, amount: "₱305K" },
    { name: "31-60 Days", value: 32, amount: "₱217K" },
    { name: "61-90 Days", value: 15, amount: "₱102K" },
    { name: "90+ Days", value: 8, amount: "₱54K" }
  ], []);

  const bookingTrendsData = useMemo(() => [
    { week: "W40", bookings: 42, onTime: 39, revenue: 125000 },
    { week: "W41", bookings: 48, onTime: 45, revenue: 138000 },
    { week: "W42", bookings: 51, onTime: 48, revenue: 147000 },
    { week: "W43", bookings: 45, onTime: 43, revenue: 132000 },
    { week: "W44", bookings: 53, onTime: 51, revenue: 156000 }
  ], []);

  const COLORS = useMemo(() => ({
    green: '#0F766E',
    teal: '#14B8A6',
    orange: '#F97316',
    red: '#EF4444',
    gray: '#9CA3AF'
  }), []);

  const topClientsByProfit = useMemo(() => [
    { client: "Acme Trading Corp", revenue: "₱124,500", margin: "24.2%", bookings: 28, paymentDays: 32, status: "Excellent" },
    { client: "Global Imports Ltd", revenue: "₱98,200", margin: "22.1%", bookings: 21, paymentDays: 28, status: "Excellent" },
    { client: "Metro Retail Group", revenue: "₱156,800", margin: "18.5%", bookings: 34, paymentDays: 45, status: "Good" },
    { client: "Pacific Distribution Co", revenue: "₱87,400", margin: "26.8%", bookings: 15, paymentDays: 21, status: "Excellent" },
    { client: "Sterling Supply Chain", revenue: "₱73,900", margin: "21.3%", bookings: 18, paymentDays: 38, status: "Good" }
  ], []);

  const topSubcontractors = useMemo(() => [
    { name: "Pacific Express Logistics", bookings: 47, onTimeRate: "96.2%", avgCost: "₱4,850", rating: "Excellent" },
    { name: "Golden Bridge Transport", bookings: 38, onTimeRate: "94.7%", avgCost: "₱4,620", rating: "Excellent" },
    { name: "Metro Freight Services", bookings: 42, onTimeRate: "91.3%", avgCost: "₱5,120", rating: "Good" },
    { name: "Asia Cargo Solutions", bookings: 29, onTimeRate: "89.6%", avgCost: "₱4,980", rating: "Good" }
  ], []);

  const barColors = ['#0F766E', '#14B8A6', '#F97316', '#EF4444'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ flex: '1 1 0%', overflowY: 'auto' }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "32px 48px" }}>
          
          {/* Page Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 600, color: C.ink, marginBottom: '4px', letterSpacing: '-1.2px' }}>
                Executive Dashboard
              </h1>
              <p style={{ fontSize: '14px', color: C.muted }}>
                Cash flow, margins, and coordination performance for asset-light forwarding
              </p>
            </div>
            
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger 
                className="w-[180px]"
                style={{ 
                  background: '#FFFFFF', 
                  border: '1px solid #E5ECE9', 
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#12332B',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  width: '180px',
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Critical Alerts Banner */}
          <div style={{ marginBottom: '24px', padding: '16px', background: C.alertBg, border: `1px solid ${C.alertBorder}`, borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle size={20} style={{ color: C.redLight, marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: C.ink, marginBottom: '4px' }}>
                Cash Flow Alert
              </div>
              <div style={{ fontSize: '13px', color: C.muted }}>
                3 clients with invoices overdue 60+ days totaling <span style={{ fontWeight: 600, color: C.ink }}>₱54,200</span>. 
                Review payment terms in Client Intelligence section.
              </div>
            </div>
          </div>

          {/* Hero Metrics - Cash Flow Focus */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <HeroMetric label="Outstanding Receivables" value="₱678K" trend="up" trendValue="+6.8% MoM" subtext="₱183K net position" icon={Wallet} />
            <HeroMetric label="Avg Gross Margin" value="21.4%" trend="up" trendValue="+1.2% vs Q3" subtext="Target: 22%" icon={Percent} />
            <HeroMetric label="Active Shipments" value="127" trend="neutral" trendValue="53 bookings/week" subtext="Nov avg" icon={Package} />
            <HeroMetric label="Avg Payment Days" value="35.2" trend="down" trendValue="+2.8 days" subtext="Target: 30 days" icon={Clock} alert={true} />
          </div>

          {/* Cash Flow Management */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <NeuronCard padding="lg" style={{ contain: 'layout style paint', willChange: 'contents' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.ink, marginBottom: '4px' }}>
                    Cash Flow Position
                  </h3>
                  <p style={{ fontSize: '13px', color: C.muted }}>
                    Receivables vs payables - your working capital health
                  </p>
                </div>
              </div>
              
              <div style={{ width: '100%', height: '350px', minHeight: '350px', contain: 'strict' }}>
                <ResponsiveContainer width="100%" height={350} debounce={300}>
                  <ComposedChart data={cashFlowData}>
                    <XAxis key="xaxis" dataKey="month" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} />
                    <YAxis key="yaxis" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} tickFormatter={(value) => `₱${value / 1000}K`} />
                    <Tooltip 
                      key="tooltip"
                      contentStyle={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                      formatter={(value: any) => `₱${(value / 1000).toFixed(0)}K`}
                    />
                    <Legend key="legend" wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                    <Bar key="bar-receivables" dataKey="receivables" fill={C.teal} name="Receivables" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar key="bar-payables" dataKey="payables" fill="#9CA3AF" name="Payables" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Line key="line-netPosition" type="monotone" dataKey="netPosition" stroke={C.tealLight} strokeWidth={3} name="Net Position" dot={{ fill: C.tealLight, r: 4 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </NeuronCard>

            <NeuronCard padding="lg">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.ink, marginBottom: '4px' }}>
                  Payment Aging
                </h3>
                <p style={{ fontSize: '13px', color: C.muted }}>
                  Client receivables breakdown
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {paymentBehaviorData.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: C.ink }}>{item.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: C.teal }}>{item.amount}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: C.border, borderRadius: '9999px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          borderRadius: '9999px',
                          width: `${item.value}%`,
                          backgroundColor: barColors[idx],
                          transition: 'all 0.3s'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>{item.value}% of total</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: C.muted }}>Total Outstanding</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: C.ink }}>₱678,000</span>
                </div>
              </div>
            </NeuronCard>
          </div>

          {/* Margin Analysis & Booking Trends */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <NeuronCard padding="lg">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.ink, marginBottom: '4px' }}>
                  Margin by Service Type
                </h3>
                <p style={{ fontSize: '13px', color: C.muted }}>
                  Where you make the most profit
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {marginByServiceData.map((item, idx) => (
                  <div key={idx} style={{ padding: '16px', background: C.bg, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: C.ink }}>{item.service}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: C.teal }}>{item.margin}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: C.muted }}>
                      <span>Revenue: ₱{(item.revenue / 1000).toFixed(0)}K</span>
                      <span>·</span>
                      <span>Cost: ₱{(item.cost / 1000).toFixed(0)}K</span>
                      <span>·</span>
                      <span style={{ fontWeight: 500, color: C.ink }}>
                        Profit: ₱{((item.revenue - item.cost) / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </NeuronCard>

            <NeuronCard padding="lg" style={{ contain: 'layout style paint', willChange: 'contents' }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.ink, marginBottom: '4px' }}>
                  Booking Volume & On-Time Rate
                </h3>
                <p style={{ fontSize: '13px', color: C.muted }}>
                  Weekly coordination performance
                </p>
              </div>
              
              <div style={{ width: '100%', height: '300px', minHeight: '300px', contain: 'strict' }}>
                <ResponsiveContainer width="100%" height={300} debounce={300}>
                  <BarChart data={bookingTrendsData}>
                    <XAxis key="xaxis" dataKey="week" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} />
                    <YAxis key="yaxis" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} />
                    <Tooltip 
                      key="tooltip"
                      contentStyle={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                    />
                    <Legend key="legend" iconType="circle" />
                    <Bar key="bar-bookings" dataKey="bookings" fill="#9CA3AF" name="Total Bookings" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar key="bar-onTime" dataKey="onTime" fill={C.teal} name="On-Time Deliveries" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </NeuronCard>
          </div>

          {/* Client Intelligence - Profitability Focus */}
          <div style={{ marginBottom: '32px' }}>
            <NeuronCard padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.ink, marginBottom: '4px' }}>
                    Top Clients by Profitability
                  </h3>
                  <p style={{ fontSize: '13px', color: C.muted }}>
                    Not just revenue — who actually makes you money
                  </p>
                </div>
                <button style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, color: C.teal, background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  View All Clients
                </button>
              </div>

              <div style={{ overflow: 'hidden', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue (MTD)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Margin</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bookings</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Payment Days</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClientsByProfit.map((client, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < topClientsByProfit.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: C.pillGreen, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={14} style={{ color: C.teal }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: C.ink }}>{client.client}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: C.ink }}>{client.revenue}</td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '9999px', background: C.pillGreen, fontSize: '12px', fontWeight: 600, color: C.teal }}>
                            {client.margin}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: C.muted }}>{client.bookings}</td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: client.paymentDays <= 30 ? C.teal : client.paymentDays <= 45 ? C.orange : C.redLight }}>
                            {client.paymentDays} days
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ 
                            display: 'inline-flex', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500,
                            background: client.status === 'Excellent' ? C.pillGreen : C.pillYellow,
                            color: client.status === 'Excellent' ? C.teal : C.orangeDark
                          }}>
                            {client.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NeuronCard>
          </div>

          {/* Subcontractor Performance */}
          <div style={{ marginBottom: '32px' }}>
            <NeuronCard padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.ink, marginBottom: '4px' }}>
                    Reliable Subcontractors
                  </h3>
                  <p style={{ fontSize: '13px', color: C.muted }}>
                    Your coordination network performance
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {topSubcontractors.map((sub, idx) => (
                  <div 
                    key={idx}
                    style={{ padding: '16px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: C.pillGreen, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Truck size={18} style={{ color: C.teal }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: C.ink, marginBottom: '2px' }}>{sub.name}</div>
                          <div style={{ fontSize: '11px', color: C.muted }}>{sub.bookings} bookings this month</div>
                        </div>
                      </div>
                      <span style={{ 
                        display: 'inline-flex', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                        background: sub.rating === 'Excellent' ? C.pillGreen : C.pillYellow,
                        color: sub.rating === 'Excellent' ? C.teal : C.orangeDark
                      }}>
                        {sub.rating}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>On-Time Rate</div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: C.teal }}>{sub.onTimeRate}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>Avg Cost</div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: C.ink }}>{sub.avgCost}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </NeuronCard>
          </div>

          {/* Key Risk Indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <NeuronCard padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: C.alertBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={18} style={{ color: C.redLight }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: C.muted }}>Overdue Payments</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: C.ink }}>₱54,200</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: C.muted }}>
                3 clients with 60+ day overdue invoices
              </div>
            </NeuronCard>

            <NeuronCard padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: C.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} style={{ color: C.orange }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: C.muted }}>Delayed Shipments</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: C.ink }}>6 Active</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: C.muted }}>
                2 critical delays requiring intervention
              </div>
            </NeuronCard>

            <NeuronCard padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: C.pillGreen, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={18} style={{ color: C.teal }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: C.muted }}>Doc Compliance</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: C.ink }}>94.3%</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: C.muted }}>
                4 shipments pending customs docs
              </div>
            </NeuronCard>
          </div>

        </div>
      </div>
    </div>
  );
}