import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, ChevronDown, Check, Settings } from 'lucide-react';
import { projectsApi, type Project } from '../../services/api';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectSelector({ selectedProjectId, onSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find((p) => p.id === selectedProjectId);
      setSelectedProject(project || null);
    }
  }, [selectedProjectId, projects]);

  async function loadProjects() {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  function handleSelect(project: Project) {
    setSelectedProject(project);
    onSelect(project.id);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md
                   bg-toucan-dark border border-toucan-dark-border
                   hover:border-toucan-grey-600 transition-colors text-sm"
        disabled={isLoading}
        data-testid="project-selector"
      >
        <FolderOpen className="w-4 h-4 text-toucan-grey-400" />
        <span className="text-toucan-grey-200 max-w-[150px] truncate">
          {isLoading ? 'Loading...' : (selectedProject ? selectedProject.name : 'Select Project')}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-toucan-grey-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-xl z-50">
          {/* Project List */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-toucan-grey-400">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                    project.id === selectedProjectId
                      ? 'bg-toucan-orange/10 text-toucan-orange'
                      : 'text-toucan-grey-200 hover:bg-toucan-dark'
                  }`}
                >
                  {project.id === selectedProjectId ? (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className="truncate flex-1">{project.name}</span>
                  <span className="text-xs text-toucan-grey-500">
                    {project.specCount} specs
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-toucan-dark-border py-1">
            <Link
              to="/projects"
              className="flex items-center gap-2 px-4 py-2 text-sm text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Manage Projects
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
