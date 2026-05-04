import React, { useState, useEffect, Component, lazy, Suspense, type ReactNode, type ErrorInfo } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_e: Error, info: ErrorInfo) { console.error("App crash:", _e, info); }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", background: "#F8F9FB" }}>
          <div style={{ maxWidth: 480, padding: "40px 48px", background: "#fff", borderRadius: 16, border: "1px solid #E5E9F0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: "#12332B", marginBottom: 8, fontSize: 18 }}>Something went wrong</h2>
            <p style={{ color: "#6B7A76", fontSize: 14, marginBottom: 24 }}>The app encountered an error. Open DevTools (F12) → Console for details.</p>
            <pre style={{ textAlign: "left", background: "#F8F9FB", border: "1px solid #E5E9F0", borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "#12332B", whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 24 }}>{err.message}</pre>
            <button onClick={() => window.location.reload()} style={{ padding: "10px 24px", background: "#237F66", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router";
import { Layout } from "./components/Layout";
import type { Page } from "./components/NeuronSidebar";
import { UserProvider, useUser } from "./hooks/useUser";
import { Toaster, toast } from "sonner@2.0.3";
import logoImage from "figma:asset/28c84ed117b026fbf800de0882eb478561f37f4f.png";

import { projectId, publicAnonKey } from './utils/supabase/info';
import { API_BASE_URL } from '@/utils/api-config';
import { prefetch as prefetchPath } from './hooks/useCachedFetch';

// Lazy-loaded route components — split into separate chunks for faster initial load
const ExecutiveDashboard = lazy(() => import("./components/ExecutiveDashboard").then(m => ({ default: m.ExecutiveDashboard })));
const ClientsModule = lazy(() => import("./components/operations/ClientsModule").then(m => ({ default: m.ClientsModule })));
const VouchersScreen = lazy(() => import("./components/accounting/VouchersScreen").then(m => ({ default: m.VouchersScreen })));
const BillingsScreen = lazy(() => import("./components/accounting/BillingsScreen").then(m => ({ default: m.BillingsScreen })));
const CollectionsScreen = lazy(() => import("./components/accounting/CollectionsScreen").then(m => ({ default: m.CollectionsScreen })));
const ExpensesScreen = lazy(() => import("./components/accounting/ExpensesScreen").then(m => ({ default: m.ExpensesScreen })));
const LogbookScreen = lazy(() => import("./components/accounting/LogbookScreen").then(m => ({ default: m.LogbookScreen })));
const HR = lazy(() => import("./components/HR").then(m => ({ default: m.HR })));
const Reports = lazy(() => import("./components/Reports").then(m => ({ default: m.Reports })));
const ContainerRefundReport = lazy(() => import("./components/reports/ContainerRefundReport").then(m => ({ default: m.ContainerRefundReport })));
const FinalShipmentCostReport = lazy(() => import("./components/reports/FinalShipmentCostReport").then(m => ({ default: m.FinalShipmentCostReport })));
const ExpenseSummaryReport = lazy(() => import("./components/reports/ExpenseSummaryReport").then(m => ({ default: m.ExpenseSummaryReport })));
const InDepthProfitLossReport = lazy(() => import("./components/reports/InDepthProfitLossReport").then(m => ({ default: m.InDepthProfitLossReport })));
const ProfitLossPeriodReport = lazy(() => import("./components/reports/ProfitLossPeriodReport").then(m => ({ default: m.ProfitLossPeriodReport })));
const SOAPaymentMonitoringReport = lazy(() => import("./components/reports/SOAPaymentMonitoringReport").then(m => ({ default: m.SOAPaymentMonitoringReport })));
const ActivityLogPage = lazy(() => import("./components/ActivityLogPage").then(m => ({ default: m.ActivityLogPage })));
const EmployeeProfile = lazy(() => import("./components/EmployeeProfile").then(m => ({ default: m.EmployeeProfile })));
const CreateBooking = lazy(() => import("./components/CreateBooking").then(m => ({ default: m.CreateBooking })));
const BookingFullView = lazy(() => import("./components/operations/BookingFullView").then(m => ({ default: m.BookingFullView })));
const ImportBookings = lazy(() => import("./components/operations/ImportBookings").then(m => ({ default: m.ImportBookings })));
const ExportBookings = lazy(() => import("./components/operations/ExportBookings").then(m => ({ default: m.ExportBookings })));
const TruckingModule = lazy(() => import("./components/operations/TruckingModule").then(m => ({ default: m.TruckingModule })));
const DocumentSettingsPage = lazy(() => import("./components/admin/DocumentSettingsPage").then(m => ({ default: m.DocumentSettingsPage })));

// App entry point
function LoginPage() {
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Default user - always log in as Executive for demo purposes
    // User can change their role in Settings using the account overrider
    const mockUser = {
      id: "user-executive-001",
      email: email || "user@neuron.ph",
      name: "Ana Garcia",
      department: "Executive" as const,
      role: "manager" as const,
      created_at: new Date().toISOString(),
      is_active: true
    };
    
    // Small delay to simulate loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Store user in localStorage AND update state directly (no reload needed)
    localStorage.setItem('neuron_user', JSON.stringify(mockUser));
    setUser(mockUser);
    
    setIsLoading(false);
    toast.success('Welcome to Neuron OS!');
  };

  const isDisabled = !email || !password || isLoading;

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      backgroundColor: "#FFFFFF",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Login Card */}
      <div style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "40px 48px",
        border: "1px solid #E5E9F0",
      }}>
        {/* Logo and Header */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "40px",
        }}>
          <div style={{ width: "180px" }}>
            <img 
              alt="Neuron Logo" 
              style={{ width: "100%", height: "auto", objectFit: "contain" }}
              src={logoImage} 
            />
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Email Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="email" style={{
              display: "block",
              color: "#0A1D4D",
              fontWeight: 500,
              fontSize: "14px",
            }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #E5E9F0",
                backgroundColor: "#F9FAFB",
                color: "#0A1D4D",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label htmlFor="password" style={{
                display: "block",
                color: "#0A1D4D",
                fontWeight: 500,
                fontSize: "14px",
              }}>
                Password
              </label>
              <button 
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "#0F766E",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Forgot?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #E5E9F0",
                backgroundColor: "#F9FAFB",
                color: "#0A1D4D",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
              disabled={isLoading}
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isDisabled}
            style={{
              width: "100%",
              padding: "10px 16px",
              backgroundColor: isDisabled ? "#A0C4BE" : "#0F766E",
              color: "#FFFFFF",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "15px",
              border: "none",
              cursor: isDisabled ? "not-allowed" : "pointer",
              marginTop: "8px",
              transition: "background-color 0.15s ease",
              opacity: isDisabled ? 0.6 : 1,
            }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <p style={{ color: "#667085", fontSize: "13px" }}>
            © 2025 Neuron. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper component to convert route path to Page type for Layout
function RouteWrapper({ children, page }: { children: React.ReactNode; page: string }) {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Map current URL to Page type for Layout's active state
  const getCurrentPage = (): Page => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "dashboard";
    if (path.startsWith("/export/trucking")) return "export-trucking";
    if (path.startsWith("/export")) return "export-bookings";
    if (path.startsWith("/import/trucking")) return "import-trucking";
    if (path.startsWith("/import")) return "import-bookings";
    if (path.startsWith("/clients")) return "clients";
    if (path.startsWith("/reports")) return "reports";
    if (path.startsWith("/accounting/vouchers")) return "acct-vouchers";
    if (path.startsWith("/accounting/billings")) return "acct-billings";
    if (path.startsWith("/accounting/collections")) return "acct-collections";
    if (path.startsWith("/accounting/expenses")) return "acct-expenses";
    if (path.startsWith("/accounting/logbook")) return "acct-logbook";
    if (path.startsWith("/hr")) return "hr";
    if (path.startsWith("/calendar")) return "calendar";
    if (path.startsWith("/activity-log")) return "activity-log";
    if (path.startsWith("/profile")) return "profile";
    if (path.startsWith("/admin")) return "admin";
    return "dashboard";
  };

  // Handler to navigate using router
  const handleNavigate = (page: Page) => {
    const routeMap: Record<Page, string> = {
      "dashboard": "/dashboard",
      "export-bookings": "/export/bookings",
      "export-trucking": "/export/trucking",
      "import-bookings": "/import/bookings",
      "import-trucking": "/import/trucking",
      "clients": "/clients",
      "reports": "/reports",
      "acct-vouchers": "/accounting/vouchers",
      "acct-billings": "/accounting/billings",
      "acct-collections": "/accounting/collections",
      "acct-expenses": "/accounting/expenses",
      "acct-logbook": "/accounting/logbook",
      "hr": "/hr",
      "calendar": "/calendar",
      "activity-log": "/activity-log",
      "profile": "/profile",
      "admin": "/admin",
    };

    navigate(routeMap[page] ?? "/dashboard");
  };

  return (
    <Layout
      currentPage={getCurrentPage()}
      onNavigate={handleNavigate}
      currentUser={user || undefined}
      onLogout={logout}
    >
      {children}
    </Layout>
  );
}

function ReportsPage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="reports">
      <Reports />
    </RouteWrapper>
  );
}

function ContainerRefundReportPage() {
  return (
    <RouteWrapper page="reports">
      <ContainerRefundReport />
    </RouteWrapper>
  );
}

function FinalShipmentCostReportPage() {
  return (
    <RouteWrapper page="reports">
      <FinalShipmentCostReport />
    </RouteWrapper>
  );
}

function ExpenseSummaryReportPage() {
  return (
    <RouteWrapper page="reports">
      <ExpenseSummaryReport />
    </RouteWrapper>
  );
}

function InDepthProfitLossReportPage() {
  return (
    <RouteWrapper page="reports">
      <InDepthProfitLossReport />
    </RouteWrapper>
  );
}

function ProfitLossPeriodReportPage() {
  return (
    <RouteWrapper page="reports">
      <ProfitLossPeriodReport />
    </RouteWrapper>
  );
}


function SOAPaymentMonitoringReportPage() {
  return (
    <RouteWrapper page="reports">
      <SOAPaymentMonitoringReport />
    </RouteWrapper>
  );
}

// Export Routes
function ExportBookingsPage() {
  return (
    <RouteWrapper page="export-bookings">
      <ExportBookings />
    </RouteWrapper>
  );
}

function ExportTruckingPage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="export-trucking">
      <TruckingModule currentUser={user} bookingType="export" />
    </RouteWrapper>
  );
}

// Import Routes
function ImportBookingsPage() {
  return (
    <RouteWrapper page="import-bookings">
      <ImportBookings />
    </RouteWrapper>
  );
}

function ImportTruckingPage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="import-trucking">
      <TruckingModule currentUser={user} bookingType="import" />
    </RouteWrapper>
  );
}

// Clients Route
function ClientsPage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="clients">
      <ClientsModule currentUser={user || undefined} />
    </RouteWrapper>
  );
}

function CreateBookingPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBookingBack = () => {
    navigate('/import/bookings');
  };
  
  const handleBookingSubmit = async (bookingData: any) => {
    try {
      setIsSubmitting(true);
      
      // Ensure we have a valid booking ID
      if (!bookingData.id) {
        bookingData.id = `BKG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Post to the unified booking endpoint
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(bookingData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create booking: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Booking created successfully!", {
          description: `Booking Ref: ${result.data.id}`
        });
        navigate('/import/bookings');
      } else {
        throw new Error(result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking", {
        description: String(error)
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <RouteWrapper page="import-bookings">
      <CreateBooking onBack={handleBookingBack} onSubmit={handleBookingSubmit} />
    </RouteWrapper>
  );
}

function BookingDetailPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  // TODO: Fetch booking data based on bookingId
  const booking = null;
  
  if (!booking) {
    return (
      <RouteWrapper page="import-bookings">
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FB' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#0A1D4D', marginBottom: '8px' }}>Booking Not Found</h2>
            <p style={{ color: '#667085' }}>Booking ID: {bookingId}</p>
            <button
              onClick={() => navigate('/import/bookings')}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                background: '#0F766E',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Back to Bookings
            </button>
          </div>
        </div>
      </RouteWrapper>
    );
  }

  return (
    <RouteWrapper page="import-bookings">
      <BookingFullView booking={booking} onBack={() => navigate('/import/bookings')} />
    </RouteWrapper>
  );
}

// Accounting Routes
function AccountingVouchersPage() {
  return (
    <RouteWrapper page="acct-vouchers">
      <VouchersScreen />
    </RouteWrapper>
  );
}

function AccountingBillingsPage() {
  return (
    <RouteWrapper page="acct-billings">
      <BillingsScreen />
    </RouteWrapper>
  );
}

function AccountingCollectionsPage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="acct-collections">
      <CollectionsScreen currentUser={user} />
    </RouteWrapper>
  );
}

function AccountingExpensesPage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="acct-expenses">
      <ExpensesScreen currentUser={user} />
    </RouteWrapper>
  );
}

function AccountingLogbookPage() {
  return (
    <RouteWrapper page="acct-logbook">
      <LogbookScreen />
    </RouteWrapper>
  );
}

/*
function AccountingProjectsPage() {
  return (
    <RouteWrapper page="acct-projects">
      <Accounting view="projects" />
    </RouteWrapper>
  );
}

function AccountingLedgerPage() {
  return (
    <RouteWrapper page="acct-ledger">
      <Accounting view="ledger" />
    </RouteWrapper>
  );
}

function AccountingReportsPage() {
  return (
    <RouteWrapper page="acct-reports">
      <Accounting view="reports" />
    </RouteWrapper>
  );
}
*/

// Other Routes
function DashboardPage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="dashboard">
      <ExecutiveDashboard currentUser={user} />
    </RouteWrapper>
  );
}

function HRPage() {
  return (
    <RouteWrapper page="hr">
      <HR />
    </RouteWrapper>
  );
}

function CalendarPage() {
  return (
    <RouteWrapper page="calendar">
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FB' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#0A1D4D', marginBottom: '8px' }}>My Calendar</h2>
          <p style={{ color: '#667085' }}>Coming soon...</p>
        </div>
      </div>
    </RouteWrapper>
  );
}

function ActivityLogPageWrapper() {
  return (
    <RouteWrapper page="activity-log">
      <ActivityLogPage />
    </RouteWrapper>
  );
}

function ProfilePage() {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const handleDepartmentChange = (dept: string) => {
    if (user) {
      user.department = dept;
      navigate('/dashboard');
    }
  };
  
  return (
    <RouteWrapper page="profile">
      <EmployeeProfile 
        currentUser={user || undefined} 
        onDepartmentChange={handleDepartmentChange} 
      />
    </RouteWrapper>
  );
}

function AdminPage() {
  return (
    <RouteWrapper page="admin">
      <div style={{ overflow: "auto", height: "calc(100vh - 56px)" }}>
        <DocumentSettingsPage />
      </div>
    </RouteWrapper>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useUser();

  useEffect(() => {
    if (!isAuthenticated) return;
    ["/bookings", "/clients", "/contacts", "/vouchers", "/billings", "/collections", "/expenses", "/trucking-records"].forEach(prefetchPath);
  }, [isAuthenticated]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#667085", fontSize: "15px", fontFamily: "'Inter', sans-serif" }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="bottom-right" richColors />
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <Suspense fallback={null}>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Unified Reports */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/container-refund" element={<ContainerRefundReportPage />} />
        <Route path="/reports/final-shipment-cost" element={<FinalShipmentCostReportPage />} />
        <Route path="/reports/expenses-summary" element={<ExpenseSummaryReportPage />} />
        <Route path="/reports/profit-loss" element={<InDepthProfitLossReportPage />} />
        <Route path="/reports/profit-loss-period" element={<ProfitLossPeriodReportPage />} />
        <Route path="/reports/soa-payment-monitoring" element={<SOAPaymentMonitoringReportPage />} />


        {/* Export */}
        <Route path="/export/bookings" element={<ExportBookingsPage />} />
        <Route path="/export/trucking" element={<ExportTruckingPage />} />

        {/* Import */}
        <Route path="/import/bookings" element={<ImportBookingsPage />} />
        <Route path="/import/trucking" element={<ImportTruckingPage />} />
        <Route path="/import/create" element={<CreateBookingPage />} />
        <Route path="/import/:bookingId" element={<BookingDetailPage />} />

        {/* Clients */}
        <Route path="/clients" element={<ClientsPage />} />
        
        {/* Accounting */}
        <Route path="/accounting/vouchers" element={<AccountingVouchersPage />} />
        <Route path="/accounting/billings" element={<AccountingBillingsPage />} />
        <Route path="/accounting/collections" element={<AccountingCollectionsPage />} />
        <Route path="/accounting/expenses" element={<AccountingExpensesPage />} />
        <Route path="/accounting/logbook" element={<AccountingLogbookPage />} />
        
        {/* Other */}
        <Route path="/hr" element={<HRPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/activity-log" element={<ActivityLogPageWrapper />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  // --- Branded loading overlay ---
  // Prevents FOUC by covering the app until CSS + fonts are fully loaded.
  // Uses ONLY inline styles so it renders correctly from the very first frame.
  const [cssReady, setCssReady] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    // Wait for both fonts AND a minimum CSS-settle time
    Promise.all([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 200)),
    ]).then(() => {
      setCssReady(true);
      // Remove overlay from DOM after fade-out animation completes
      setTimeout(() => setShowOverlay(false), 400);
    });
  }, []);

  return (
    <>
      {/* Branded loading overlay — inline styles only, no Tailwind dependency */}
      {showOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "20px",
            opacity: cssReady ? 0 : 1,
            transition: "opacity 0.35s ease-out",
            pointerEvents: cssReady ? "none" : "all",
          }}
        >
          <img
            src={logoImage}
            alt="Neuron"
            style={{ height: "32px", width: "auto" }}
          />
          {/* Subtle animated loading bar */}
          <div
            style={{
              width: "120px",
              height: "3px",
              backgroundColor: "#E5E9F0",
              borderRadius: "2px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "40%",
                backgroundColor: "#0F766E",
                borderRadius: "2px",
                animation: "neuronLoadSlide 1.2s ease-in-out infinite",
              }}
            />
          </div>
          {/* Inject keyframe animation — safe because it's a <style> element, not Tailwind */}
          <style>{`
            @keyframes neuronLoadSlide {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(200%); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>
      )}

      <ErrorBoundary>
        <UserProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </UserProvider>
      </ErrorBoundary>
    </>
  );
}