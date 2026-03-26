import { NeuronSidebar, type Page } from "./NeuronSidebar";

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
        currentPage={currentPage}
        onNavigate={onNavigate}
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