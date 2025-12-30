import { X, Link, Unlink, ExternalLink } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import type { DependencyNode, DependencyEdge } from '../../services/api';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface Props {
  node: DependencyNode;
  allNodes: DependencyNode[];
  edges: DependencyEdge[];
  onClose: () => void;
  onAddDependency: () => void;
  onRemoveDependency: (dependsOnId: string) => void;
  onOpenEditor?: () => void;
  isAddingDependency: boolean;
}

export function NodeDetailPanel({
  node,
  allNodes,
  edges,
  onClose,
  onAddDependency,
  onRemoveDependency,
  onOpenEditor,
  isAddingDependency,
}: Props) {
  // Find what this node depends on (blocked by)
  const blockedBy = edges
    .filter(e => e.from === node.id)
    .map(e => allNodes.find(n => n.id === e.to))
    .filter((n): n is DependencyNode => n !== undefined);

  // Find what depends on this node (blocks)
  const blocks = edges
    .filter(e => e.to === node.id)
    .map(e => allNodes.find(n => n.id === e.from))
    .filter((n): n is DependencyNode => n !== undefined);

  const typeColors: Record<string, BadgeVariant> = {
    epic: 'info',
    feature: 'success',
    story: 'warning',
  };

  const statusColors: Record<string, BadgeVariant> = {
    draft: 'default',
    ready_for_review: 'warning',
    approved: 'success',
    exported: 'success',
  };

  return (
    <div className="bg-toucan-dark-lighter border-l border-toucan-dark-border w-80 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-toucan-dark-border">
        <h3 className="text-lg font-medium text-toucan-grey-100 truncate">
          {node.title}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-toucan-dark rounded text-toucan-grey-400 hover:text-toucan-grey-100"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={typeColors[node.type] ?? 'default'}>
            {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
          </Badge>
          {node.sizeEstimate && (
            <Badge variant="default">{node.sizeEstimate}</Badge>
          )}
          <Badge variant={statusColors[node.status] ?? 'default'}>
            {node.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Blocked By (Dependencies) */}
        <div>
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-2 flex items-center gap-2">
            <Link size={14} />
            Blocked By ({blockedBy.length})
          </h4>
          {blockedBy.length === 0 ? (
            <p className="text-sm text-toucan-grey-400">No dependencies</p>
          ) : (
            <ul className="space-y-2">
              {blockedBy.map(dep => (
                <li
                  key={dep.id}
                  className="flex items-center justify-between bg-toucan-dark rounded p-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge
                      variant={typeColors[dep.type] ?? 'default'}
                      size="sm"
                    >
                      {dep.type.charAt(0).toUpperCase()}
                    </Badge>
                    <span className="text-sm text-toucan-grey-100 truncate">
                      {dep.title}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveDependency(dep.id)}
                    className="p-1 hover:bg-toucan-dark-border rounded text-toucan-grey-400 hover:text-toucan-error ml-2"
                    title="Remove dependency"
                  >
                    <Unlink size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Blocks (Dependents) */}
        <div>
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-2 flex items-center gap-2">
            <Link size={14} className="rotate-180" />
            Blocks ({blocks.length})
          </h4>
          {blocks.length === 0 ? (
            <p className="text-sm text-toucan-grey-400">No dependents</p>
          ) : (
            <ul className="space-y-2">
              {blocks.map(dep => (
                <li
                  key={dep.id}
                  className="flex items-center gap-2 bg-toucan-dark rounded p-2"
                >
                  <Badge
                    variant={typeColors[dep.type] ?? 'default'}
                    size="sm"
                  >
                    {dep.type.charAt(0).toUpperCase()}
                  </Badge>
                  <span className="text-sm text-toucan-grey-100 truncate">
                    {dep.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-toucan-dark-border space-y-2">
        <Button
          variant={isAddingDependency ? 'secondary' : 'primary'}
          className="w-full"
          onClick={onAddDependency}
        >
          <Link size={16} className="mr-2" />
          {isAddingDependency ? 'Cancel Adding' : 'Add Dependency'}
        </Button>
        {onOpenEditor && (
          <Button variant="ghost" className="w-full" onClick={onOpenEditor}>
            <ExternalLink size={16} className="mr-2" />
            Open in Editor
          </Button>
        )}
      </div>
    </div>
  );
}
