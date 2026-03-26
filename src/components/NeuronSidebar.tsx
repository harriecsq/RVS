import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Building2,
  FileText,
  Package,
  UserCircle,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Receipt,
  CreditCard,
  Coins,
  FileSpreadsheet,
  Briefcase,
  Globe,
  BarChart,
  Mail,
  ListTodo,
  Truck,
  Ship,
  Users,
  HelpCircle,
  Banknote,
  BookOpen,
  ArrowUpFromLine,
  ArrowDownToLine
} from "lucide-react";
import logoImage from "figma:asset/28c84ed117b026fbf800de0882eb478561f37f4f.png";
import { useUser } from "../hooks/useUser";

export type Page = "dashboard" | "projects" | "ops-forwarding" | "ops-brokerage" | "ops-export" | "ops-import" | "ops-trucking" | "ops-projects" | "ops-requests" | "ops-clients" | "operations" | "acct-vouchers" | "acct-billings" | "acct-collections" | "acct-expenses" | "reports" | "hr" | "calendar" | "profile" | "admin" | "activity-log";

// SVG for Philippine Peso icon
const Vector = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.83333 16.6667V3.33333M5.83333 10H11.6667C12.5507 10 13.3986 9.64881 14.0237 9.02369C14.6488 8.39857 15 7.55072 15 6.66667C15 5.78261 14.6488 4.93477 14.0237 4.30964C13.3986 3.68452 12.5507 3.33333 11.6667 3.33333H5.83333M3.33333 13.3333H8.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Wrapper component for the Philippine Peso icon
const PesoIcon = ({ size = 20, style }: { size?: number; style?: React.CSSProperties }) => (
  <div 
    style={{ 
      width: size, 
      height: size, 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '--stroke-0': style?.color || 'currentColor' 
    } as React.CSSProperties}
  >
    <Vector />
  </div>
);

interface NeuronSidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  currentUser?: { name: string; email: string; department: string; role?: string };
}

export function NeuronSidebar({ currentPage, onNavigate, currentUser }: NeuronSidebarProps) {
  // Initialize collapsed state from localStorage, default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neuron_sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });
  
  // Initialize dropdown states from localStorage
  const [isOperationsExpanded, setIsOperationsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neuron_operations_expanded');
      return saved === 'true';
    }
    return false;
  });
  
  const [isAcctExpanded, setIsAcctExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neuron_acct_expanded');
      return saved === 'true';
    }
    return false;
  });
  
  // Persist collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('neuron_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);
  
  // Persist dropdown states to localStorage
  useEffect(() => {
    localStorage.setItem('neuron_operations_expanded', String(isOperationsExpanded));
  }, [isOperationsExpanded]);
  
  useEffect(() => {
    localStorage.setItem('neuron_acct_expanded', String(isAcctExpanded));
  }, [isAcctExpanded]);
  
  // Use effectiveDepartment from context for dev role override support
  const { effectiveDepartment, effectiveRole } = useUser();
  
  // Determine what modules to show based on effective department
  const userDepartment = effectiveDepartment || currentUser?.department || "Operations";
  const isExecutive = userDepartment === "Executive";
  const isManager = effectiveRole === 'manager' || effectiveRole === 'director';
  const showOperations = isExecutive || userDepartment === "Operations";
  const showAccounting = isExecutive || userDepartment === "Accounting";
  const showHR = isExecutive || userDepartment === "HR";
  
  // Dashboard - standalone
  const dashboardItem = { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard };
  
  // Operations sub-items
  const operationsSubItems = [
    // Projects removed - migrated to Bookings
    { id: "ops-export" as Page, label: "Export", icon: ArrowUpFromLine },
    { id: "ops-import" as Page, label: "Import", icon: ArrowDownToLine },
    { id: "ops-trucking" as Page, label: "Trucking", icon: Truck },
    { id: "ops-clients" as Page, label: "Clients", icon: UsersIcon },
  ];

  // Accounting sub-items
  const acctSubItems = [
    { id: "acct-billings" as Page, label: "Billings", icon: Receipt },
    { id: "acct-collections" as Page, label: "Collections", icon: Coins },
    { id: "acct-expenses" as Page, label: "Expenses", icon: CreditCard },
    { id: "acct-vouchers" as Page, label: "Vouchers", icon: FileText },
  ];
  
  // Check if any Operations page is active
  const isOpsActive = currentPage.startsWith("ops-");
  
  // Check if any Accounting page is active
  const isAcctActive = currentPage.startsWith("acct-");
  
  // Work section (without BD and Accounting, we'll render them separately)
  const workItems = [
    { id: "operations" as Page, label: "Operations", icon: Package },
    { id: "hr" as Page, label: "HR", icon: UserCircle },
  ];
  
  // Personal section
  const personalItems = [];
  
  // Add Activity Log for Managers and Directors only
  if (isManager || currentUser?.role === "director") {
    personalItems.push({ id: "activity-log" as Page, label: "Activity Log", icon: Activity });
  }

  const otherItems = [
    { id: "admin" as Page, label: "Settings", icon: Settings },
  ];

  const renderNavButton = (item: { id: Page; label: string; icon: any }, isSubItem = false) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingTop: "8px",
          paddingBottom: "8px",
          borderRadius: "8px",
          transition: "all 0.15s",
          height: isSubItem ? "36px" : "40px",
          backgroundColor: isActive ? "var(--neuron-state-selected, #E4EFEA)" : "transparent",
          border: isActive ? "1.5px solid #5FC4A1" : "1.5px solid transparent",
          color: isActive ? "#237F66" : "#2E5147",
          fontWeight: isActive ? 600 : 400,
          justifyContent: isCollapsed ? "center" : "flex-start",
          paddingLeft: isCollapsed ? "0" : isSubItem ? "28px" : "12px",
          paddingRight: isCollapsed ? "0" : "12px",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "var(--neuron-state-hover, #F1F6F4)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon 
          size={isSubItem ? 18 : 20} 
          style={{ 
            color: isActive ? "#237F66" : "#6B7A76",
            flexShrink: 0
          }} 
        />
        {!isCollapsed && (
          <span style={{ fontSize: "14px", lineHeight: "20px" }}>
            {item.label}
          </span>
        )}
      </button>
    );
  };

  const renderSectionHeader = (label: string) => (
    <div 
      style={{ 
        paddingLeft: "12px",
        paddingRight: "12px",
        paddingTop: "24px",
        paddingBottom: "8px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#6B7A76",
        letterSpacing: "0.5px",
      }}
    >
      {isCollapsed ? (
        <div 
          style={{ 
            width: "20px",
            height: "2px",
            backgroundColor: "var(--neuron-ink-muted)",
            margin: "0 auto",
            opacity: 0.3
          }}
        />
      ) : (
        label
      )}
    </div>
  );

  return (
    <div 
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: isCollapsed ? "72px" : "272px",
        backgroundColor: "var(--neuron-bg-elevated, #FFFFFF)",
        borderRight: "1px solid var(--neuron-ui-border, #E5ECE9)",
        transition: "width 0.3s",
        willChange: "width",
        transform: "translateZ(0)",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          paddingLeft: "16px",
          paddingRight: "16px",
          justifyContent: "space-between",
          height: "56px",
        }}
      >
        {/* Logo - Only show when expanded */}
        {!isCollapsed && (
          <img
            src={logoImage}
            alt="Neuron"
            style={{
              height: "24px",
              width: "auto",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("dashboard")}
          />
        )}
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            transition: "all 0.15s",
            width: "32px",
            height: "32px",
            color: "var(--neuron-ink-muted)",
            flexShrink: 0,
            marginLeft: isCollapsed ? "auto" : "0",
            marginRight: isCollapsed ? "auto" : "0",
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: "1 1 0%",
        paddingLeft: "16px",
        paddingRight: "16px",
        paddingTop: "24px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}>
        {/* Dashboard */}
        {renderNavButton(dashboardItem)}
        
        {/* Work Section */}
        {renderSectionHeader("WORK")}
        
        {/* Operations with sub-items */}
        {showOperations && (
          <div style={{ marginBottom: isOperationsExpanded ? "8px" : "0px" }}>
            <button
              onClick={() => {
                if (isCollapsed) {
                  // If collapsed, navigate to first Operations item
                  onNavigate("projects");
                } else {
                  // If expanded, toggle the dropdown
                  setIsOperationsExpanded(!isOperationsExpanded);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150"
              style={{
                height: "40px",
                backgroundColor: "transparent",
                border: "1.5px solid transparent",
                color: "var(--neuron-ink-secondary)",
                fontWeight: 400,
                justifyContent: "space-between",
                paddingLeft: isCollapsed ? "0" : "12px",
                paddingRight: isCollapsed ? "0" : "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title={isCollapsed ? "Operations" : undefined}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0" style={{ justifyContent: isCollapsed ? "center" : "flex-start" }}>
                <Package 
                  size={20} 
                  style={{ 
                    color: "var(--neuron-ink-muted)",
                    flexShrink: 0
                  }} 
                />
                {!isCollapsed && (
                  <span style={{ fontSize: "14px", lineHeight: "20px", whiteSpace: "nowrap" }}>
                    Operations
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown 
                  size={16} 
                  style={{ 
                    color: "var(--neuron-ink-muted)",
                    transform: isOperationsExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0
                  }} 
                />
              )}
            </button>
            
            {/* Operations Sub-items */}
            <div 
              style={{
                maxHeight: isOperationsExpanded ? "280px" : "0px",
                opacity: isOperationsExpanded ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 0.3s ease-in-out, opacity 0.25s ease-in-out",
              }}
            >
              <div className="space-y-1 mt-1">
                {operationsSubItems.map(item => renderNavButton(item, true))}
              </div>
            </div>
          </div>
        )}
        
        {/* Accounting with sub-items */}
        {showAccounting && (
          <div style={{ marginBottom: isAcctExpanded ? "8px" : "0px" }}>
            <button
              onClick={() => {
                if (isCollapsed) {
                  // If collapsed, navigate to first Accounting item
                  onNavigate("acct-vouchers");
                } else {
                  // If expanded, toggle the dropdown
                  setIsAcctExpanded(!isAcctExpanded);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150"
              style={{
                height: "40px",
                backgroundColor: "transparent",
                border: "1.5px solid transparent",
                color: "var(--neuron-ink-secondary)",
                fontWeight: 400,
                justifyContent: "space-between",
                paddingLeft: isCollapsed ? "0" : "12px",
                paddingRight: isCollapsed ? "0" : "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title={isCollapsed ? "Accounting" : undefined}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0" style={{ justifyContent: isCollapsed ? "center" : "flex-start" }}>
                <PesoIcon 
                  size={20} 
                  style={{ 
                    color: "var(--neuron-ink-muted)",
                    flexShrink: 0
                  }} 
                />
                {!isCollapsed && (
                  <span style={{ fontSize: "14px", lineHeight: "20px", whiteSpace: "nowrap" }}>
                    Accounting
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown 
                  size={16} 
                  style={{ 
                    color: "var(--neuron-ink-muted)",
                    transform: isAcctExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0
                  }} 
                />
              )}
            </button>
            
            {/* Accounting Sub-items */}
            <div 
              style={{
                maxHeight: isAcctExpanded ? "320px" : "0px",
                opacity: isAcctExpanded ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 0.3s ease-in-out, opacity 0.25s ease-in-out",
              }}
            >
              <div className="space-y-1 mt-1">
                {acctSubItems.map(item => renderNavButton(item, true))}
              </div>
            </div>
          </div>
        )}

        {/* Reports - Standalone Top Level Module */}
        <div>
          {renderNavButton({ id: "reports" as Page, label: "Reports", icon: BarChart })}
        </div>
        
        {/* HR */}
        <div>
          {showHR && renderNavButton({ id: "hr" as Page, label: "HR", icon: UserCircle })}
        </div>
        
        {/* Personal Section */}
        {renderSectionHeader("PERSONAL")}
        {personalItems.map(item => renderNavButton(item))}

        {/* Other Section */}
        {renderSectionHeader("OTHER")}
        
        <button
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            paddingTop: "8px",
            paddingBottom: "8px",
            borderRadius: "8px",
            transition: "all 0.15s",
            height: "40px",
            color: "var(--neuron-ink-secondary)",
            justifyContent: isCollapsed ? "center" : "flex-start",
            paddingLeft: isCollapsed ? "0" : "12px",
            paddingRight: isCollapsed ? "0" : "12px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title={isCollapsed ? "Help" : undefined}
        >
          <HelpCircle size={20} style={{ color: "var(--neuron-ink-muted)", flexShrink: 0 }} />
          {!isCollapsed && <span style={{ fontSize: "14px" }}>Help</span>}
        </button>

        {otherItems.map(item => renderNavButton(item))}
      </nav>

      {/* Footer */}
      <div style={{ 
        paddingLeft: "16px", 
        paddingRight: "16px", 
        paddingTop: "16px", 
        paddingBottom: "16px", 
        borderTop: "1px solid var(--neuron-ui-border, #E5ECE9)" 
      }}>
        {/* User Profile */}
        {currentUser && currentUser.name && (
          <button
            onClick={() => onNavigate("profile")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              paddingTop: "8px",
              paddingBottom: "8px",
              borderRadius: "8px",
              transition: "all 0.15s",
              backgroundColor: currentPage === "profile" ? "var(--neuron-state-selected)" : "var(--neuron-bg-page, #F7FAF8)",
              border: currentPage === "profile" ? "1.5px solid #5FC4A1" : "1.5px solid transparent",
              minHeight: "48px",
              justifyContent: isCollapsed ? "center" : "flex-start",
              paddingLeft: isCollapsed ? "0" : "12px",
              paddingRight: isCollapsed ? "0" : "12px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== "profile") {
                e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== "profile") {
                e.currentTarget.style.backgroundColor = "var(--neuron-bg-page, #F7FAF8)";
              }
            }}
          >
            <div 
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9999px",
                width: "32px",
                height: "32px",
                backgroundColor: "var(--neuron-brand-green-100, #E8F2EE)",
                color: "var(--neuron-brand-green, #237F66)",
                fontSize: "14px",
                fontWeight: 600,
                flexShrink: 0,
              }}
              title={isCollapsed ? currentUser.name : undefined}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div style={{ flex: "1 1 0%", minWidth: 0 }}>
                <div 
                  style={{ 
                    fontSize: "13px", 
                    fontWeight: 600, 
                    color: "var(--neuron-ink-primary, #12332B)",
                    lineHeight: "18px",
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser.name}
                </div>
                <div 
                  style={{ 
                    fontSize: "11px", 
                    color: "var(--neuron-ink-muted, #6B7A76)",
                    lineHeight: "14px",
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser.email}
                </div>
                <div 
                  style={{ 
                    fontSize: "11px", 
                    color: "var(--neuron-ink-muted, #6B7A76)",
                    lineHeight: "14px",
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser.department}
                </div>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
}