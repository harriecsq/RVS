import { NeuronSidebar } from "./NeuronSidebar";

type Page = "dashboard" | "bd-contacts" | "bd-customers" | "bd-tasks" | "bd-activities" | "bd-budget-requests" | "bd-reports" | "pricing" | "operations" | "acct-vouchers" | "acct-billings" | "acct-collections" | "acct-expenses" | "acct-inquiries" | "acct-projects" | "acct-ledger" | "acct-reports" | "hr" | "calendar" | "profile" | "admin";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  currentUser?: { name: string; email: string; department: string };
  onLogout?: () => void;
}

export function Layout({ children, currentPage, onNavigate, currentUser }: LayoutProps) {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      overflow: "hidden",
      background: "var(--neuron-bg-page, #F7FAF8)",
    }}>
      {/* Left Sidebar - Fixed width 272px */}
      <NeuronSidebar 
        currentPage={currentPage as any}
        onNavigate={onNavigate as any}
        currentUser={currentUser}
      />

      {/* Main Content Area - Fills remaining space */}
      <main style={{
        flex: "1 1 0%",
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
      }}>
        {children}
      </main>
    </div>
  );
}