import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, FolderKanban } from "lucide-react";
import type { Project } from "../../types/pricing";

interface ProjectSelectorProps {
  value: string;
  onChange: (projectId: string, projectNumber: string) => void;
  projects: Project[];
  placeholder?: string;
  disabled?: boolean;
}

export function ProjectSelector({ 
  value, 
  onChange, 
  projects,
  placeholder = "Select project (optional)",
  disabled = false 
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sort projects alphabetically by project_number
  const sortedProjects = [...projects].sort((a, b) => 
    a.project_number.localeCompare(b.project_number)
  );

  // Filter projects based on search query
  const filteredProjects = sortedProjects.filter(project =>
    project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.quotation_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find selected project
  const selectedProject = projects.find(p => p.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (project: Project) => {
    onChange(project.id, project.project_number);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onChange("", "");
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "10px 14px",
          backgroundColor: disabled ? "#F9FAFB" : "white",
          border: "1px solid #E5E7EB",
          borderRadius: "6px",
          fontSize: "14px",
          color: selectedProject ? "var(--neuron-ink-primary)" : "#9CA3AF",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
          transition: "all 0.2s"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <FolderKanban size={16} style={{ flexShrink: 0, color: "#9CA3AF" }} />
          <span style={{ 
            overflow: "hidden", 
            textOverflow: "ellipsis", 
            whiteSpace: "nowrap" 
          }}>
            {selectedProject 
              ? selectedProject.project_number
              : placeholder
            }
          </span>
        </div>
        <ChevronDown 
          size={16} 
          style={{ 
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s"
          }} 
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            maxHeight: "320px",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Search Input */}
          <div style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>
            <div style={{ position: "relative" }}>
              <Search 
                size={16} 
                style={{ 
                  position: "absolute", 
                  left: "12px", 
                  top: "50%", 
                  transform: "translateY(-50%)",
                  color: "#9CA3AF"
                }} 
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                  fontSize: "13px",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Projects List */}
          <div style={{ 
            overflowY: "auto", 
            maxHeight: "240px"
          }}>
            {/* "None" option to clear selection */}
            {selectedProject && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  textAlign: "left",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#9CA3AF",
                  fontStyle: "italic",
                  borderBottom: "1px solid #E5E7EB",
                  transition: "background-color 0.15s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                (None - Clear selection)
              </button>
            )}

            {filteredProjects.length === 0 ? (
              <div style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#9CA3AF",
                fontSize: "13px"
              }}>
                No projects found
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project)}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    textAlign: "left",
                    border: "none",
                    background: value === project.id ? "#F0FDF4" : "transparent",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "var(--neuron-ink-primary)",
                    borderLeft: value === project.id ? "3px solid #0F766E" : "3px solid transparent",
                    transition: "background-color 0.15s"
                  }}
                  onMouseEnter={(e) => {
                    if (value !== project.id) {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== project.id) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {project.project_number}
                  </div>
                  {project.quotation_name && (
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                      {project.quotation_name}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}