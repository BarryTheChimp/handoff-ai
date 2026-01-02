import { FileText, Layers, Settings, FolderOpen } from 'lucide-react';
import { projectsApi, type Project } from '../../services/api';

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
  onEdit: () => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ProjectCard({ project, onSelect, onEdit }: ProjectCardProps) {
  const timeAgo = formatTimeAgo(project.updatedAt);
  const logoUrl = project.logoUrl ? projectsApi.getLogoUrl(project.id) : null;

  return (
    <div
      onClick={onSelect}
      className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6
                 hover:border-toucan-orange/50 cursor-pointer transition-all
                 hover:shadow-lg hover:shadow-toucan-orange/5 group"
      data-testid="project-card"
    >
      <div className="flex items-start gap-4">
        {/* Project Logo */}
        <div className="flex-shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${project.name} logo`}
              className="w-12 h-12 object-contain rounded-lg bg-toucan-dark border border-toucan-dark-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-toucan-dark border border-toucan-dark-border flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-toucan-grey-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-toucan-grey-100
                           group-hover:text-toucan-orange transition-colors truncate">
              {project.name}
            </h3>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-toucan-grey-500 hover:text-toucan-grey-200
                         rounded-md hover:bg-toucan-dark ml-2 flex-shrink-0"
              aria-label="Project settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          {project.description && (
            <p className="text-sm text-toucan-grey-400 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 text-sm text-toucan-grey-400">
        <span className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          {project.specCount} specs
        </span>
        <span className="flex items-center gap-1">
          <Layers className="w-4 h-4" />
          {project.workItemCount} stories
        </span>
      </div>

      {/* Footer */}
      <div className="text-xs text-toucan-grey-500 mt-4 pt-4 border-t border-toucan-dark-border">
        Updated {timeAgo}
      </div>
    </div>
  );
}
