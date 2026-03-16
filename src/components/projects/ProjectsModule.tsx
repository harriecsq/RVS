import { useState, useEffect } from "react";
import { ProjectsList } from "./ProjectsList";
import { ProjectDetail } from "./ProjectDetail";
import type { Project } from "../../types/pricing";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { CreateProjectPanel } from "../operations/CreateProjectPanel";
import { CreateProjectTypeModal } from "./CreateProjectTypeModal";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

export type ProjectsView = "list" | "detail";

interface ProjectsModuleProps {
  currentUser?: { 
    id: string;
    name: string; 
    email: string; 
    department: string;
  } | null;
  onCreateTicket?: (entity: { type: string; id: string; name: string }) => void;
}

export function ProjectsModule({ currentUser, onCreateTicket }: ProjectsModuleProps) {
  const [view, setView] = useState<ProjectsView>("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isProjectTypeModalOpen, setIsProjectTypeModalOpen] = useState(false);
  const [selectedProjectType, setSelectedProjectType] = useState<"Export" | "Import" | null>(null);

  // Fetch projects from backend
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching projects from:', `${API_URL}/projects`);
      
      const response = await fetch(`${API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Projects fetch result:', result);
      
      if (result.success) {
        setProjects(result.data);
        console.log(`Fetched ${result.data.length} projects`);
      } else {
        console.log('[ProjectsModule] Projects fetch returned error:', result.error);
      }
    } catch (error) {
      console.log('[ProjectsModule] Projects fetch failed (server may be unavailable)');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setView("detail");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedProject(null);
  };

  const handleProjectUpdated = async () => {
    // Refresh the project data
    await fetchProjects();
    
    // If we're viewing a specific project, update it with fresh data
    if (selectedProject) {
      try {
        const response = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSelectedProject(result.data);
            console.log('✓ Refreshed selected project with latest data');
          }
        }
      } catch (error) {
        console.error('Error refreshing selected project:', error);
      }
    }
  };

  const handleCreateProject = async (projectData: any) => {
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create project');
      }

      toast.success(`✓ Project created successfully!`);
      await fetchProjects();
      setIsCreatePanelOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete project');
      }

      toast.success(`✓ Project deleted successfully!`);
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };
  
  // ALWAYS show Operations view in the unified Projects module
  // Department restrictions removed since BD has access to Operations anyway
  const department = "Operations";
  
  console.log("ProjectsModule - Unified view always shows Operations tabs (Service Bookings)");

  return (
    <div className="h-full bg-white">
      {view === "list" && (
        <ProjectsList
          projects={projects}
          onSelectProject={handleSelectProject}
          isLoading={isLoading}
          currentUser={currentUser}
          department={department}
          onCreateProject={() => setIsProjectTypeModalOpen(true)}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {view === "detail" && selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onBack={handleBackToList}
          onUpdate={handleProjectUpdated}
          currentUser={currentUser}
          department={department}
          onCreateTicket={onCreateTicket}
        />
      )}

      <CreateProjectPanel
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
        onSave={handleCreateProject}
        movementType={selectedProjectType}
      />

      <CreateProjectTypeModal
        isOpen={isProjectTypeModalOpen}
        onClose={() => setIsProjectTypeModalOpen(false)}
        onCreateProject={() => setIsCreatePanelOpen(true)}
        selectedProjectType={selectedProjectType}
        setSelectedProjectType={setSelectedProjectType}
      />
    </div>
  );
}