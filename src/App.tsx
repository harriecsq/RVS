import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router";
import { Layout } from "./components/Layout";
import type { Page } from "./components/NeuronSidebar";
import { UserProvider, useUser } from "./hooks/useUser";
import { Toaster, toast } from "sonner@2.0.3";
import logoImage from "figma:asset/28c84ed117b026fbf800de0882eb478561f37f4f.png";

// Direct imports — static import graph ensures Tailwind v4 scans all component files
import { ExecutiveDashboard } from "./components/ExecutiveDashboard";
import { ClientsModule } from "./components/operations/ClientsModule";
import { VouchersScreen } from "./components/accounting/VouchersScreen";
import { BillingsScreen } from "./components/accounting/BillingsScreen";
import { CollectionsScreen } from "./components/accounting/CollectionsScreen";
import { ExpensesScreen } from "./components/accounting/ExpensesScreen";
import { HR } from "./components/HR";
import { ProjectsModule } from "./components/projects/ProjectsModule";
import { ProjectsList } from "./components/operations/ProjectsList";
import { Reports } from "./components/Reports";
import { ContainerRefundReport } from "./components/reports/ContainerRefundReport";
import { FinalShipmentCostReport } from "./components/reports/FinalShipmentCostReport";
import { ExpenseSummaryReport } from "./components/reports/ExpenseSummaryReport";
import { InDepthProfitLossReport } from "./components/reports/InDepthProfitLossReport";
import { ProfitLossPeriodReport } from "./components/reports/ProfitLossPeriodReport";
import { VatReturnsReport } from "./components/reports/VatReturnsReport";
import { ActivityLogPage } from "./components/ActivityLogPage";
import { EmployeeProfile } from "./components/EmployeeProfile";
import { CreateBooking } from "./components/CreateBooking";
import { BookingFullView } from "./components/operations/BookingFullView";
import { ImportBookings } from "./components/operations/ImportBookings";
import { OthersBookings } from "./components/operations/OthersBookings";
import { projectId, publicAnonKey } from './utils/supabase/info';
import { API_BASE_URL } from '@/utils/api-config';
import { ExportBookings } from "./components/operations/ExportBookings";
import { Bookings } from "./components/Bookings";
import { TruckingModule } from "./components/operations/TruckingModule";

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
        border: "1px solid #E5E7EB",
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
              color: "#12332B",
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
                border: "1px solid #E5E7EB",
                backgroundColor: "#F9FAFB",
                color: "#12332B",
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
                color: "#12332B",
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
                border: "1px solid #E5E7EB",
                backgroundColor: "#F9FAFB",
                color: "#12332B",
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
    if (path.startsWith("/operations/requests")) return "ops-requests";
    if (path.startsWith("/operations/clients")) return "ops-clients";
    if (path.startsWith("/operations/projects")) return "ops-projects";
    if (path.startsWith("/operations/export")) return "ops-export";
    if (path.startsWith("/operations/import")) return "ops-import";
    if (path.startsWith("/operations/trucking")) return "ops-trucking";
    if (path.startsWith("/operations/forwarding")) return "ops-forwarding";
    if (path.startsWith("/operations/brokerage")) return "ops-brokerage";
    if (path.startsWith("/operations/others")) return "ops-others";
    if (path.startsWith("/operations")) return "operations";
    if (path.startsWith("/reports")) return "reports";
    if (path.startsWith("/projects")) return "projects";
    if (path.startsWith("/accounting/vouchers")) return "acct-vouchers";
    if (path.startsWith("/accounting/billings")) return "acct-billings";
    if (path.startsWith("/accounting/collections")) return "acct-collections";
    if (path.startsWith("/accounting/expenses")) return "acct-expenses";
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
      "projects": "/projects",
      "operations": "/operations",
      "reports": "/reports",
      "ops-requests": "/operations/requests",
      "ops-clients": "/operations/clients",
      "ops-projects": "/operations/projects",
      "ops-export": "/operations/export",
      "ops-import": "/operations/import",
      "ops-trucking": "/operations/trucking",
      "ops-forwarding": "/operations/forwarding",
      "ops-brokerage": "/operations/brokerage",
      "ops-others": "/operations/others",
      "acct-vouchers": "/accounting/vouchers",
      "acct-billings": "/accounting/billings",
      "acct-collections": "/accounting/collections",
      "acct-expenses": "/accounting/expenses",
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

function VatReturnsReportPage() {
  return (
    <RouteWrapper page="reports">
      <VatReturnsReport />
    </RouteWrapper>
  );
}

// Unified Projects Page (Bridge Module for BD and Operations)
function ProjectsPage() {
  const { user } = useUser();
  
  return (
    <RouteWrapper page="projects">
      <ProjectsModule 
        currentUser={user || undefined}
      />
    </RouteWrapper>
  );
}

// Operations Routes
function OperationsPage() {
  const { user } = useUser();
  
  return (
    <RouteWrapper page="operations">
      <Bookings />
    </RouteWrapper>
  );
}

function OperationsClientsPage() {
  const { user } = useUser();
  
  return (
    <RouteWrapper page="ops-clients">
      <ClientsModule 
        currentUser={user || undefined}
      />
    </RouteWrapper>
  );
}

function OperationsProjectsPage() {
  const { user } = useUser();
  
  return (
    <RouteWrapper page="ops-projects">
      <ProjectsList 
        currentUser={user || undefined}
      />
    </RouteWrapper>
  );
}

function ForwardingBookingsPage() {
  return (
    <RouteWrapper page="ops-forwarding">
      <Bookings />
    </RouteWrapper>
  );
}

function ExportBookingsPage() {
  return (
    <RouteWrapper page="ops-export">
      <ExportBookings />
    </RouteWrapper>
  );
}

function ImportBookingsPage() {
  return (
    <RouteWrapper page="ops-import">
      <BrokerageBookings />
    </RouteWrapper>
  );
}

function CreateBookingPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleBookingBack = () => {
    navigate('/operations');
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
        navigate('/operations');
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
    <RouteWrapper page="operations">
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
      <RouteWrapper page="operations">
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAF8' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#12332B', marginBottom: '8px' }}>Booking Not Found</h2>
            <p style={{ color: '#6B7A76' }}>Booking ID: {bookingId}</p>
            <button 
              onClick={() => navigate('/operations')}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                background: '#237F66',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Back to Operations
            </button>
          </div>
        </div>
      </RouteWrapper>
    );
  }
  
  return (
    <RouteWrapper page="operations">
      <BookingFullView booking={booking} onBack={() => navigate('/operations')} />
    </RouteWrapper>
  );
}

function TruckingModulePage() {
  const { user } = useUser();
  return (
    <RouteWrapper page="ops-trucking">
      <TruckingModule currentUser={user} />
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
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAF8' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#12332B', marginBottom: '8px' }}>My Calendar</h2>
          <p style={{ color: '#6B7A76' }}>Coming soon...</p>
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
      <div style={{ padding: '32px', textAlign: 'center', color: '#6B7A76' }}>Admin module unavailable</div>
    </RouteWrapper>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useUser();

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
          <p style={{ color: "#6B7A76", fontSize: "15px", fontFamily: "'Inter', sans-serif" }}>Loading...</p>
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
        <Route path="/reports/vat-returns" element={<VatReturnsReportPage />} />

        {/* Unified Projects Page */}
        <Route path="/projects" element={<ProjectsPage />} />
        
        {/* Operations */}
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/operations/create" element={<CreateBookingPage />} />
        <Route path="/operations/:bookingId" element={<BookingDetailPage />} />
        <Route path="/operations/clients" element={<OperationsClientsPage />} />
        <Route path="/operations/projects" element={<OperationsProjectsPage />} />
        <Route path="/operations/forwarding" element={<ForwardingBookingsPage />} />
        <Route path="/operations/export" element={<ExportBookingsPage />} />
        <Route path="/operations/import" element={<ImportBookingsPage />} />
        <Route path="/operations/trucking" element={<TruckingModulePage />} />
        <Route path="/operations/brokerage" element={<RouteWrapper page="ops-brokerage"><BrokerageBookings /></RouteWrapper>} />
        <Route path="/operations/others" element={<RouteWrapper page="ops-others"><OthersBookings /></RouteWrapper>} />
        {/* <Route path="/operations/reports" element={<RouteWrapper page="ops-reports"><OperationsReports /></RouteWrapper>} /> */}
        
        {/* Accounting */}
        <Route path="/accounting/vouchers" element={<AccountingVouchersPage />} />
        <Route path="/accounting/billings" element={<AccountingBillingsPage />} />
        <Route path="/accounting/collections" element={<AccountingCollectionsPage />} />
        <Route path="/accounting/expenses" element={<AccountingExpensesPage />} />
        
        {/* Other */}
        <Route path="/hr" element={<HRPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/activity-log" element={<ActivityLogPageWrapper />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
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

  // Load Google Fonts via <link> tag — avoids the @import-not-at-top CSS error
  useEffect(() => {
    const fontId = 'neuron-google-fonts';
    if (!document.getElementById(fontId)) {
      const preconnect1 = document.createElement('link');
      preconnect1.rel = 'preconnect';
      preconnect1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement('link');
      preconnect2.rel = 'preconnect';
      preconnect2.href = 'https://fonts.gstatic.com';
      preconnect2.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect2);

      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
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
              backgroundColor: "#E5ECE9",
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
                backgroundColor: "#237F66",
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

      <UserProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </UserProvider>
    </>
  );
}