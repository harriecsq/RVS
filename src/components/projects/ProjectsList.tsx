import { useState } from "react";
import { Project } from "../../types/pricing";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { Search, Briefcase, ArrowUpFromLine, ArrowDownToLine, Plus, Package } from "lucide-react";
import { StandardTabs } from "../design-system/StandardTabs";
import { StandardButton } from "../design-system/StandardButton";

interface ProjectsListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  isLoading?: boolean;
  currentUser?: { 
    id: string;
    name: string; 
    email: string; 
    department: string;
  } | null;
  department: "BD" | "Operations";
  onCreateProject?: () => void;
}

export function ProjectsList({ 
  projects, 
  onSelectProject, 
  isLoading,
  currentUser,
  department,
  onCreateProject
}: ProjectsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "export" | "import">("all");
  const [timePeriodFilter, setTimePeriodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  // Grid template constant for alignment - removed Actions column
  const GRID_COLS = "200px 140px 180px 140px 120px 120px 120px";

  // Get unique values for filters
  const uniqueServices = Array.from(new Set(projects.flatMap(p => p.services || [])));

  // Filter projects by movement (Export/Import tabs)
  const getFilteredByTab = () => {
    if (activeTab === "export") {
      return projects.filter(p => p.movement === "Export");
    }
    if (activeTab === "import") {
      return projects.filter(p => p.movement === "Import");
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
  const exportCount = projects.filter(p => p.movement === "Export").length;
  const importCount = projects.filter(p => p.movement === "Import").length;

  // Department-specific subtitle
  const subtitle = department === "Operations"
    ? "Service bookings and execution for approved quotations"
    : "Manage approved quotations ready for handover to Operations";

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
              {subtitle}
            </p>
          </div>
          {onCreateProject && (
            <StandardButton
              onClick={onCreateProject}
              icon={<Plus size={18} />}
              label="New Project"
              color="primary"
            />
          )}
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#667085",
            }}
          />
          <input
            type="text"
            placeholder="Search projects by number, customer, company, or quotation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
            }}
          />
        </div>

        {/* Filter Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          {/* Time Period Filter */}
          <select
            value={timePeriodFilter}
            onChange={(e) => setTimePeriodFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Booking Status Filter - more relevant for Operations */}
          {department === "Operations" && (
            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              style={{
                padding: "10px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#12332B",
                backgroundColor: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Booking Statuses</option>
              <option value="No Bookings Yet">No Bookings Yet</option>
              <option value="Partially Booked">Partially Booked</option>
              <option value="Fully Booked">Fully Booked</option>
            </select>
          )}

          {/* Service Filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#12332B",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Services</option>
            {uniqueServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <StandardTabs
          tabs={[
            {
              id: "all",
              label: "All Projects",
              icon: <Briefcase size={18} />,
              badge: allCount,
              color: "#0F766E"
            },
            {
              id: "export",
              label: "Export",
              icon: <ArrowUpFromLine size={18} />,
              badge: exportCount,
              color: "#0F766E"
            },
            {
              id: "import",
              label: "Import",
              icon: <ArrowDownToLine size={18} />,
              badge: importCount,
              color: "#F59E0B"
            }
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as "all" | "export" | "import")}
          style={{ padding: 0, marginBottom: "24px" }}
        />

        {/* Table */}
        {isLoading ? (
          <div style={{ 
            padding: "64px", 
            textAlign: "center", 
            color: "#667085",
            fontSize: "14px" 
          }}>
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ 
            padding: "64px", 
            textAlign: "center", 
            maxWidth: "600px",
            margin: "0 auto"
          }}>
            <div style={{ 
              fontSize: "48px",
              marginBottom: "16px" 
            }}>
              📦
            </div>
            <div style={{ 
              fontSize: "18px", 
              fontWeight: 600,
              color: "#12332B",
              marginBottom: "12px" 
            }}>
              No Projects Found
            </div>
            <div style={{ 
              fontSize: "14px",
              color: "#667085",
              marginBottom: "24px",
              lineHeight: "1.6"
            }}>
              {activeTab === "my" 
                ? (department === "Operations" 
                  ? "No projects have been assigned to you yet."
                  : "You haven't created any projects yet.")
                : "Try adjusting your search criteria or filters"}
            </div>
          </div>
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
                Project Ref #
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
                Country
              </div>
              <div style={{ 
                fontSize: "11px",
                fontWeight: 600,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Project Date
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
                Created
              </div>
            </div>

            {/* Table Body */}
            {filteredProjects.map((project, index) => {
              // Format date
              const formatDate = (dateString: string) => {
                if (!dateString) return "—";
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              };

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
                      {project.booking_reference || "—"}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
                    <div style={{ overflow: "hidden", width: "100%" }}>
                      <div style={{ 
                        fontSize: "13px", 
                        color: "#12332B",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {project.customer_name}
                      </div>
                      {(project as any).company_name && project.customer_name !== (project as any).company_name && (
                        <div style={{ 
                          fontSize: "11px", 
                          color: "#667085",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: "1px"
                        }}>
                          {(project as any).company_name}
                        </div>
                      )}
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
                      {(project as any).destination || "—"}
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
                      {formatDate(project.shipment_ready_date || "")}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <NeuronStatusPill status={project.status} size="sm" />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#667085",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%"
                    }}>
                      {formatDate(project.created_at)}
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