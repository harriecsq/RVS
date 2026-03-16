import { useState } from "react";
import { ArrowLeft, Edit3, Clock, Trash2 } from "lucide-react";
import { ProjectOverviewTab } from "../bd/ProjectOverviewTab";
import { ProjectTruckingTab } from "./ProjectTruckingTab";
import { ProjectBillingsTab } from "./ProjectBillingsTab";
import { ProjectExpensesTab } from "./ProjectExpensesTab";
import type { Project } from "../../types/pricing";
import { StatusEditDropdown } from "../shared/StatusEditDropdown";
import { StandardTabs } from "../design-system/StandardTabs";
import { StandardButton } from "../design-system/StandardButton";
import { toast } from "../ui/toast-utils";
import { ActionsDropdown } from "../shared/ActionsDropdown";

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdate: () => void;
  currentUser?: { 
    id: string;
    name: string; 
    email: string; 
    department: string;
  } | null;
  department: "BD" | "Operations";
  onCreateTicket?: (entity: { type: string; id: string; name: string }) => void;
}

export function ProjectDetail({ 
  project, 
  onBack, 
  onUpdate,
  currentUser,
  department,
  onCreateTicket
}: ProjectDetailProps) {
  // Projects module now has separate tabs for Bookings, Billings, and Expenses
  // This allows many-to-many relationships (one billing/expense can cover multiple bookings)
  const allTabs = [
    { id: "overview", label: "Projects Overview" },
    { id: "bookings", label: "Bookings" },
    { id: "trucking", label: "Trucking" },
    { id: "billings", label: "Billings" },
    { id: "expenses", label: "Expenses" }
  ] as const;
  
  type Tab = typeof allTabs[number]["id"];

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showTimeline, setShowTimeline] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  console.log("ProjectDetail - Showing all tabs:", allTabs);

  const handleUpdateProject = async (projectData: any) => {
    try {
      const { projectId, publicAnonKey } = await import("../../utils/supabase/info");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8/projects/${projectData.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(projectData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update project:", errorText);
        throw new Error("Failed to update project");
      }

      console.log("Project updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { projectId, publicAnonKey } = await import("../../utils/supabase/info");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8/projects/${project.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update status:", errorText);
        throw new Error("Failed to update status");
      }

      console.log("Project status updated successfully");
      onUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  };

  const handleDeleteProject = async () => {
    try {
      const { projectId, publicAnonKey } = await import("../../utils/supabase/info");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8/projects/${project.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to delete project");
        setShowDeleteConfirm(false);
        return;
      }

      toast.success("Project deleted successfully");
      console.log("Project deleted successfully");
      setShowDeleteConfirm(false);
      onUpdate(); // Refresh the list
      onBack(); // Go back to list view
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("An error occurred while deleting the project");
      setShowDeleteConfirm(false);
    }
  };

  const PROJECT_STATUSES = [
    "Draft",
    "In Progress",
    "Completed",
    "Cancelled"
  ];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#F9FAFB"
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "1px solid var(--neuron-ui-border)",
        padding: "20px 48px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={onBack}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F3F4F6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ArrowLeft size={20} />
            </button>
            
            <div>
              <h1 style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--neuron-ink-primary)",
                marginBottom: "0"
              }}>
                {project.quotation_name || project.project_number}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Activity Timeline Button */}
            <StandardButton
              variant={showTimeline ? "secondary" : "outline"}
              onClick={() => setShowTimeline(!showTimeline)}
              icon={<Clock size={16} />}
            >
              Activity
            </StandardButton>

            {/* Edit Project Button - Only show on Overview tab when not editing */}
            {activeTab === "overview" && !isEditing && (
              <StandardButton
                variant="outline"
                onClick={() => setIsEditing(true)}
                icon={<Edit3 size={16} />}
              >
                Edit Project
              </StandardButton>
            )}

            {/* Show Cancel button when editing on Overview tab */}
            {activeTab === "overview" && isEditing && (
              <StandardButton
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </StandardButton>
            )}

            {/* Actions Dropdown */}
            <ActionsDropdown
              onDownloadPDF={() => {
                toast.success("PDF download starting...");
                // TODO: Implement PDF generation
              }}
              onDownloadWord={() => {
                toast.success("Word download starting...");
                // TODO: Implement Word generation
              }}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </div>
        </div>

        {/* Tabs */}
        <StandardTabs
          tabs={allTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            // Exit edit mode when switching tabs
            if (isEditing) {
              setIsEditing(false);
            }
            setActiveTab(tabId as Tab);
          }}
        />
      </div>

      {/* Metadata/Summary Bar */}
      <div style={{
        background: (() => {
          switch (project.status) {
            case "Draft": return "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)";
            case "In Progress": return "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)";
            case "Pending Handover": return "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)";
            case "Handed Over": return "linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)";
            case "Completed": return "linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)";
            case "Cancelled": return "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)";
            default: return "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)";
          }
        })(),
        borderBottom: "1.5px solid #0F766E",
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        gap: "32px",
        flexShrink: 0
      }}>
        {/* Status Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Status
          </div>
          
          <div
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            onBlur={() => setTimeout(() => setShowStatusDropdown(false), 200)}
            tabIndex={0}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: project.status === "Draft" ? "#6B7280" :
                     project.status === "In Progress" ? "#F59E0B" :
                     project.status === "Pending Handover" ? "#F59E0B" :
                     project.status === "Handed Over" ? "#6366F1" :
                     project.status === "Completed" ? "#10B981" :
                     project.status === "Cancelled" ? "#EF4444" : "#667085",
              cursor: "pointer",
              padding: "4px 24px 4px 8px",
              borderRadius: "6px",
              border: "1.5px solid transparent",
              position: "relative",
              transition: "all 0.2s ease",
              background: showStatusDropdown ? "#FFFFFF" : "transparent"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FFFFFF";
              e.currentTarget.style.borderColor = "#0F766E";
            }}
            onMouseLeave={(e) => {
              if (!showStatusDropdown) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {project.status}
            
            <div style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: `translateY(-50%) ${showStatusDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
              transition: "transform 0.2s ease",
              pointerEvents: "none",
              color: "#0F766E"
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {showStatusDropdown && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              background: "white",
              border: "1.5px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 50,
              minWidth: "160px",
              overflow: "hidden"
            }}>
              {PROJECT_STATUSES.map((status, index) => (
                <div
                  key={status}
                  onClick={() => {
                    handleStatusChange(status);
                    setShowStatusDropdown(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    color: status === "Draft" ? "#6B7280" :
                           status === "In Progress" ? "#F59E0B" :
                           status === "Pending Handover" ? "#F59E0B" :
                           status === "Handed Over" ? "#6366F1" :
                           status === "Completed" ? "#10B981" :
                           status === "Cancelled" ? "#EF4444" : "#667085",
                    background: status === project.status ? "#F0FDF4" : "transparent",
                    borderBottom: index < PROJECT_STATUSES.length - 1 ? "1px solid #E5E7EB" : "none",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (status !== project.status) {
                      e.currentTarget.style.background = "#F9FAFB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status !== project.status) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {status}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Shipment Ready Date */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Project Date
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
            {formatDate(project.shipment_ready_date)}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Created Date */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Created
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#12332B" }}>
            {formatDate(project.created_at)}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "overview" && (
          <ProjectOverviewTab 
            project={project}
            onUpdate={onUpdate}
            isEditing={isEditing}
            onSave={handleUpdateProject}
            onCancelEdit={() => setIsEditing(false)}
          />
        )}
        
        {activeTab === "trucking" && (
          <ProjectTruckingTab project={project} />
        )}
        

        
        {activeTab === "billings" && (
          <ProjectBillingsTab 
            project={project}
            currentUser={currentUser}
            onUpdate={onUpdate}
          />
        )}
        
        {activeTab === "expenses" && (
          <ProjectExpensesTab 
            project={project}
            currentUser={currentUser}
            onUpdate={onUpdate}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(18, 51, 43, 0.15)",
              backdropFilter: "blur(2px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}
          >
            {/* Modal */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "white",
                width: "480px",
                padding: "32px",
                borderRadius: "12px",
                border: "1px solid var(--neuron-ui-border)",
                boxShadow: "0 4px 24px rgba(18, 51, 43, 0.12)"
              }}
            >
              <h2 style={{ 
                fontSize: "20px", 
                fontWeight: 600, 
                color: "#12332B",
                marginBottom: "12px" 
              }}>
                Delete Project?
              </h2>
              <p style={{ 
                fontSize: "14px", 
                color: "#667085", 
                marginBottom: "24px",
                lineHeight: "1.5"
              }}>
                Are you sure you want to delete <strong>{project.quotation_name || project.project_number}</strong>? This action cannot be undone.
                {project.linkedBookings && project.linkedBookings.length > 0 && (
                  <span style={{ display: "block", marginTop: "12px", color: "#DC2626" }}>
                    Note: This project has {project.linkedBookings.length} linked booking(s). You must delete all bookings first.
                  </span>
                )}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <StandardButton
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="danger"
                  onClick={handleDeleteProject}
                  icon={<Trash2 size={16} />}
                >
                  Delete Project
                </StandardButton>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}