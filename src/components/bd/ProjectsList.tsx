import { useState } from "react";
import { Project } from "../../types/pricing";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { Search, Briefcase, CheckCircle, Package } from "lucide-react";
import { StandardSearchInput } from "../design-system/StandardSearchInput";
import { StandardFilterDropdown } from "../design-system/StandardFilterDropdown";
import { StandardButton } from "../design-system/StandardButton";
import { StandardTabs } from "../design-system/StandardTabs";
import { StandardBadge } from "../design-system/StandardBadge";
import { StandardEmptyState } from "../design-system/StandardEmptyState";
import { StandardLoadingState } from "../design-system/StandardLoadingState";

interface ProjectsListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject?: () => void;
  isLoading?: boolean;
}

export function ProjectsList({ projects, onSelectProject, onCreateProject, isLoading }: ProjectsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("all");
  const [timePeriodFilter, setTimePeriodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  // Grid template constant for alignment
  const GRID_COLS = "200px 180px 140px 120px 120px 120px";

  // Get unique values for filters
  const uniqueServices = Array.from(new Set(projects.flatMap(p => p.services || [])));

  // Filter projects based on active tab
  const getFilteredByTab = () => {
    if (activeTab === "active") {
      return projects.filter(p => p.status === "Active");
    }
    if (activeTab === "completed") {
      return projects.filter(p => p.status === "Completed");
    }
    return projects;
  };

  // Apply all filters
  const filteredProjects = getFilteredByTab().filter((project) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        project.project_number.toLowerCase().includes(query) ||
        project.customer_name.toLowerCase().includes(query) ||
        ((project as any).company_name && (project as any).company_name.toLowerCase().includes(query)) ||
        project.quotation_number?.toLowerCase().includes(query) ||
        project.quotation_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Time period filter
    if (timePeriodFilter !== "all") {
      const projectDate = new Date(project.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (timePeriodFilter === "7days" && daysDiff > 7) return false;
      if (timePeriodFilter === "30days" && daysDiff > 30) return false;
      if (timePeriodFilter === "90days" && daysDiff > 90) return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && project.status !== statusFilter) return false;
    
    // Booking status filter
    if (bookingStatusFilter !== "all") {
      const projectBookingStatus = project.booking_status || "No Bookings Yet";
      if (projectBookingStatus !== bookingStatusFilter) return false;
    }
    
    // Service filter
    if (serviceFilter !== "all") {
      if (!project.services?.includes(serviceFilter)) return false;
    }
    
    return true;
  });

  // Calculate counts
  const allCount = projects.length;
  const activeCount = projects.filter(p => p.status === "Active").length;
  const completedCount = projects.filter(p => p.status === "Completed").length;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "white" }}>
      <div style={{ padding: "32px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <h1 style={{ 
              fontSize: "32px", 
              fontWeight: 600, 
              color: "#12332B", 
              marginBottom: "4px",
              letterSpacing: "-1.2px"
            }}>
              Projects
            </h1>
            <p style={{ 
              fontSize: "14px", 
              color: "#667085"
            }}>
              Manage approved quotations ready for handover to Operations
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            {onCreateProject && (
              <StandardButton
                onClick={onCreateProject}
                label="+ New Project"
                color="primary"
                size="medium"
              />
            )}
          </div>
        </div>

        {/* Search Bar */}
        <StandardSearchInput
          placeholder="Search projects by number, customer, company, or quotation..."
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
        />

        {/* Filter Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          {/* Time Period Filter */}
          <StandardFilterDropdown
            value={timePeriodFilter}
            onChange={(value) => setTimePeriodFilter(value)}
            options={[
              { value: "all", label: "All Time" },
              { value: "7days", label: "Last 7 days" },
              { value: "30days", label: "Last 30 days" },
              { value: "90days", label: "Last 90 days" }
            ]}
          />

          {/* Status Filter */}
          <StandardFilterDropdown
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Active", label: "Active" },
              { value: "Completed", label: "Completed" },
              { value: "On Hold", label: "On Hold" },
              { value: "Cancelled", label: "Cancelled" }
            ]}
          />

          {/* Booking Status Filter */}
          <StandardFilterDropdown
            value={bookingStatusFilter}
            onChange={(value) => setBookingStatusFilter(value)}
            options={[
              { value: "all", label: "All Booking Statuses" },
              { value: "No Bookings Yet", label: "No Bookings Yet" },
              { value: "Partially Booked", label: "Partially Booked" },
              { value: "Fully Booked", label: "Fully Booked" }
            ]}
          />

          {/* Service Filter */}
          <StandardFilterDropdown
            value={serviceFilter}
            onChange={(value) => setServiceFilter(value)}
            options={[
              { value: "all", label: "All Services" },
              ...uniqueServices.map(service => ({ value: service, label: service }))
            ]}
          />
        </div>

        {/* Tabs */}
        <StandardTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: "all", label: "All Projects", count: allCount, color: "primary" },
            { value: "active", label: "Active Projects", count: activeCount, color: "warning" },
            { value: "completed", label: "Completed Projects", count: completedCount, color: "success" }
          ]}
        />

        {/* Table */}
        {isLoading ? (
          <StandardLoadingState message="Loading projects..." />
        ) : filteredProjects.length === 0 ? (
          <StandardEmptyState
            title={searchQuery || timePeriodFilter !== "all" || statusFilter !== "all" || bookingStatusFilter !== "all" || serviceFilter !== "all" ? "No projects match your filters" : projects.length === 0 ? "No Projects Yet" : `No ${activeTab === "active" ? "active" : "completed"} projects`}
            description={searchQuery || timePeriodFilter !== "all" || statusFilter !== "all" || bookingStatusFilter !== "all" || serviceFilter !== "all" ? "Try adjusting your search criteria or filters" : projects.length === 0 ? "Add a new project to get started" : "Try viewing a different tab"}
            icon={projects.length === 0 ? <Package size={48} /> : undefined}
          />
        ) : (
          <div style={{ 
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            overflow: "hidden"
          }}>
            {/* Table Header */}
            <div 
              className="grid gap-4 px-6 py-4"
              style={{ 
                gridTemplateColumns: GRID_COLS,
                borderBottom: "1px solid #E5E7EB",
                background: "#F9FAFB"
              }}
            >
              <div style={{ 
                fontSize: "11px",
                fontWeight: 600,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Project Name
              </div>
              <div style={{ 
                fontSize: "11px",
                fontWeight: 600,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Customer
              </div>
              <div style={{ 
                fontSize: "11px",
                fontWeight: 600,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Route
              </div>
              <div style={{ 
                fontSize: "11px",
                fontWeight: 600,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Status
              </div>
              <div style={{ 
                fontSize: "11px",
                fontWeight: 600,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Booking Status
              </div>
              <div style={{ 
                fontSize: "11px",
                fontWeight: 600,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Ops Assigned
              </div>
            </div>

            {/* Table Body */}
            {filteredProjects.map((project, index) => {
              return (
                <div
                  key={project.id}
                  className="grid gap-4 px-6 py-4 transition-colors cursor-pointer"
                  style={{ 
                    gridTemplateColumns: GRID_COLS,
                    borderBottom: index < filteredProjects.length - 1 ? "1px solid #E5E7EB" : "none",
                  }}
                  onClick={() => onSelectProject(project)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                    {/* Project Icon */}
                    <Package 
                      size={20} 
                      color="#0F766E" 
                      strokeWidth={2}
                      style={{ flexShrink: 0 }}
                    />
                    
                    <div style={{ overflow: "hidden", width: "100%" }}>
                      <div style={{ 
                        fontSize: "13px", 
                        fontWeight: 600, 
                        color: "#12332B",
                        marginBottom: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {project.quotation_name || project.project_number}
                      </div>
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#6B7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {project.project_number}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#12332B",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%"
                    }}>
                      {project.customer_name}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6B7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%"
                    }}>
                      {project.pol_aol || "—"} → {project.pod_aod || "—"}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <NeuronStatusPill status={project.status} size="sm" />
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6B7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%"
                    }}>
                      {project.booking_status || "No Bookings Yet"}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6B7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%"
                    }}>
                      {project.ops_assigned_user_name || "Unassigned"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}