import { useState } from "react";
import { ArrowLeft, MoreVertical, Edit3, Package, FileText } from "lucide-react";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { ServiceSpecificationsTab } from "./ServiceSpecificationsTab";
import { PricingBreakdownTab } from "./PricingBreakdownTab";
// import { ActivityTab } from "./ActivityTab";
import { ProjectBillingsTab } from "./ProjectBillingsTab";
import { ProjectExpensesTab } from "./ProjectExpensesTab";
import type { Project } from "../../types/pricing";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { StandardButton } from "../design-system/StandardButton";
import { StandardTabs } from "../design-system/StandardTabs";

type ProjectTab = "overview" | "services" | "pricing" | "billings" | "expenses" | "activity";

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdate: () => void;
  currentUser?: { name: string; email: string; department: string } | null;
}

const STATUS_COLORS: Record<Project["status"], string> = {
  "Active": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "Completed": "bg-blue-50 text-blue-700 border-blue-300",
  "On Hold": "bg-amber-50 text-amber-700 border-amber-300",
  "Cancelled": "bg-red-50 text-red-700 border-red-300",
};

const BOOKING_STATUS_COLORS: Record<NonNullable<Project["booking_status"]>, string> = {
  "No Bookings Yet": "bg-gray-100 text-gray-700 border-gray-300",
  "Partially Booked": "bg-blue-50 text-blue-700 border-blue-300",
  "Fully Booked": "bg-emerald-50 text-emerald-700 border-emerald-300",
};

export function ProjectDetail({ project, onBack, onUpdate, currentUser }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

  const tabs = [
    { id: "overview", label: "Project Overview" },
    { id: "services", label: "Service Specifications" },
    { id: "pricing", label: "Pricing Breakdown" },
    { id: "billings", label: "Billings" },
    { id: "expenses", label: "Expenses" },
    { id: "activity", label: "Activity" }
  ] as const;

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    
    try {
      const response = await fetch(`${API_URL}/projects/${project.id}/generate-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          bookingId: `PROJECT-${project.project_number}`,
          bookingType: "forwarding"
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to generate invoice");
      }

      toast.success(`Invoice ${result.data.billingId} generated successfully!`);
      console.log("Generated invoice:", result.data);
      
      // Could navigate to billing view or show success message
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleEdit = () => {
    console.log("Edit project:", project.project_number);
    alert("Edit functionality coming soon!");
  };

  const handleDuplicate = () => {
    console.log("Duplicating project:", project.project_number);
    alert(`📋 Project ${project.project_number} has been duplicated!`);
    setShowActionsMenu(false);
  };

  const handleArchive = () => {
    console.log("Archiving project:", project.project_number);
    alert(`📦 Project ${project.project_number} has been archived!`);
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete project ${project.project_number}?`)) {
      console.log("Deleting project:", project.project_number);
      alert(`🗑️ Project ${project.project_number} has been deleted!`);
      setShowActionsMenu(false);
      onBack();
    }
  };

  return (
    <div style={{ 
      backgroundColor: "white",
      display: "flex",
      flexDirection: "column",
      height: "100vh"
    }}>
      {/* Header Bar */}
      <div style={{
        padding: "20px 48px",
        borderBottom: "1px solid var(--neuron-ui-border)",
        backgroundColor: "#F8FBFB",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              color: "var(--neuron-ink-secondary)",
              cursor: "pointer",
              fontSize: "13px",
              marginBottom: "12px",
              padding: "0"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--neuron-brand-green)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--neuron-ink-secondary)";
            }}
          >
            <ArrowLeft size={16} />
            Back to Projects
          </button>
          
          <h1 style={{ 
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--neuron-ink-primary)",
            marginBottom: "4px"
          }}>
            {project.quotation_name || project.project_number}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", margin: 0 }}>
            {project.project_number}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Status Pills */}
          <div style={{ display: "flex", gap: "8px", marginRight: "8px" }}>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${STATUS_COLORS[project.status]}`}>
              {project.status}
            </span>
            {project.booking_status && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${BOOKING_STATUS_COLORS[project.booking_status]}`}>
                {project.booking_status}
              </span>
            )}
          </div>

          {/* Generate Invoice Button - Shows if project has pricing */}
          {project.charge_categories && project.charge_categories.length > 0 && (
            <StandardButton
              variant="primary"
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice}
              icon={<FileText size={16} />}
            >
              {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
            </StandardButton>
          )}

          <StandardButton
            variant="outline"
            onClick={handleEdit}
            icon={<Edit3 size={16} />}
          >
            Edit
          </StandardButton>

          {/* Actions Menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                backgroundColor: "white",
                border: "1.5px solid #D1D5DB",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--neuron-brand-green)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#D1D5DB";
              }}
            >
              <MoreVertical size={18} color="var(--neuron-ink-secondary)" />
            </button>

            {showActionsMenu && (
              <>
                <div 
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10
                  }}
                  onClick={() => setShowActionsMenu(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    minWidth: "180px",
                    zIndex: 20,
                    overflow: "hidden"
                  }}
                >
                  <button
                    onClick={handleDuplicate}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Duplicate Project
                  </button>
                  <button
                    onClick={handleArchive}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Archive Project
                  </button>
                  <div style={{ height: "1px", backgroundColor: "#E5E7EB", margin: "4px 0" }} />
                  <button
                    onClick={handleDelete}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      fontSize: "14px",
                      color: "#DC2626",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#FEF2F2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Delete Project
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Create Booking Button */}
          <StandardButton
            variant="primary"
            onClick={() => {
              console.log("Create booking for project:", project.project_number);
              alert("Navigate to Operations to create booking from this project");
            }}
            icon={<Package size={16} />}
          >
            Create Booking
          </StandardButton>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        padding: "0 48px",
        borderBottom: "1px solid #E5E7EB"
      }}>
        <StandardTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as ProjectTab)}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "overview" && (
          <ProjectOverviewTab project={project} onUpdate={onUpdate} />
        )}
        {activeTab === "services" && (
          <ServiceSpecificationsTab project={project} />
        )}
        {activeTab === "pricing" && (
          <PricingBreakdownTab project={project} />
        )}
        {activeTab === "billings" && (
          <ProjectBillingsTab project={project} />
        )}
        {activeTab === "expenses" && (
          <ProjectExpensesTab project={project} />
        )}
        {activeTab === "activity" && (
          <div className="p-8 text-center text-gray-500">Activity module deprecated</div>
          // <ActivityTab project={project} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}