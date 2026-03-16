import React from "react";

interface SubTab {
  id: string;
  label: string;
  badge?: number;
}

interface SubTabRowProps {
  tabs: SubTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * SubTabRow - A lightweight second-level tab component.
 * Visually subordinate to StandardTabs: smaller font, lighter styling,
 * #F9FAFB background, teal underline for active tab.
 */
export function SubTabRow({ tabs, activeTab, onTabChange }: SubTabRowProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0",
        borderBottom: "1px solid #E5E7EB",
        background: "#F9FAFB",
        padding: "0 48px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              border: "none",
              borderBottom: isActive
                ? "2px solid #0F766E"
                : "2px solid transparent",
              background: "transparent",
              color: isActive ? "#0F766E" : "#9CA3AF",
              fontWeight: isActive ? 600 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              marginBottom: "-1px",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#0F766E";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#9CA3AF";
              }
            }}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: isActive ? "#0F766E" : "#F3F4F6",
                  color: isActive ? "#FFFFFF" : "#9CA3AF",
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
