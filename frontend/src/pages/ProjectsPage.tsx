import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { Header } from '../components/organisms/Header';
import { Button } from '../components/atoms/Button';
import { Spinner } from '../components/atoms/Spinner';
import { ProjectCard } from '../components/molecules/ProjectCard';
import { CreateProjectModal } from '../components/molecules/CreateProjectModal';
import { ProjectSettingsModal } from '../components/organisms/ProjectSettingsModal';
import { projectsApi, type Project } from '../services/api';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  function selectProject(projectId: string) {
    localStorage.setItem('selected_project_id', projectId);
    navigate('/');
  }

  function handleProjectCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    selectProject(project.id);
  }

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-toucan-grey-100">Projects</h1>
            <p className="text-toucan-grey-400 mt-1">
              Select a project or create a new one
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreate(true)}
            leftIcon={<Plus size={16} />}
          >
            New Project
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="text-center py-16">
            <p className="text-toucan-error mb-4">{error}</p>
            <Button variant="secondary" onClick={loadProjects}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 mx-auto text-toucan-grey-600 mb-4" />
            <h2 className="text-xl font-semibold text-toucan-grey-100 mb-2">
              No projects yet
            </h2>
            <p className="text-toucan-grey-400 mb-6">
              Create your first project to get started
            </p>
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
              leftIcon={<Plus size={16} />}
            >
              Create Project
            </Button>
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={() => selectProject(project.id)}
                onEdit={() => setEditingProject(project)}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        <CreateProjectModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={handleProjectCreated}
        />

        {/* Edit Modal */}
        {editingProject && (
          <ProjectSettingsModal
            isOpen={!!editingProject}
            onClose={() => setEditingProject(null)}
            project={editingProject}
            onUpdate={(updated) => {
              setProjects((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p))
              );
              setEditingProject(null);
            }}
            onDelete={(deletedId) => {
              setProjects((prev) => prev.filter((p) => p.id !== deletedId));
              setEditingProject(null);
              // Clear selection if the deleted project was selected
              const selectedId = localStorage.getItem('selected_project_id');
              if (selectedId === deletedId) {
                localStorage.removeItem('selected_project_id');
              }
            }}
          />
        )}
      </main>
    </div>
  );
}
