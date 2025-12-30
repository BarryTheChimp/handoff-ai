import { clsx } from 'clsx';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  GripVertical,
} from 'lucide-react';
import { StatusBadge, SizeBadge } from '../atoms/Badge';
import type { WorkItem, WorkItemType } from '../../types/workItem';

interface TreeNodeProps {
  item: WorkItem;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  dragHandleProps?: Record<string, unknown>;
}

const typeIcons: Record<WorkItemType, { closed: typeof Folder; open: typeof FolderOpen }> = {
  epic: { closed: Folder, open: FolderOpen },
  feature: { closed: Folder, open: FolderOpen },
  story: { closed: FileText, open: FileText },
};

export function TreeNode({
  item,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  onToggleExpand,
  onSelect,
  dragHandleProps,
}: TreeNodeProps) {
  const IconComponent = isExpanded
    ? typeIcons[item.type].open
    : typeIcons[item.type].closed;

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand();
    }
  };

  const handleNodeClick = () => {
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
    if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggleExpand();
    }
    if (e.key === 'ArrowLeft' && isExpanded) {
      e.preventDefault();
      onToggleExpand();
    }
  };

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={0}
      onClick={handleNodeClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'group flex items-center gap-1 py-1.5 px-2 cursor-pointer rounded-sm',
        'transition-colors duration-100',
        'focus:outline-none focus:ring-1 focus:ring-toucan-orange focus:ring-inset',
        isSelected
          ? 'bg-toucan-orange/20 border-l-2 border-toucan-orange'
          : 'hover:bg-toucan-dark-lighter border-l-2 border-transparent'
      )}
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
    >
      {/* Drag handle */}
      <div
        className={clsx(
          'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab',
          'text-toucan-grey-600 hover:text-toucan-grey-400'
        )}
        {...dragHandleProps}
      >
        <GripVertical size={14} />
      </div>

      {/* Expand/Collapse chevron */}
      <button
        onClick={handleChevronClick}
        className={clsx(
          'p-0.5 rounded transition-colors',
          hasChildren
            ? 'text-toucan-grey-400 hover:text-toucan-grey-100 hover:bg-toucan-dark-border'
            : 'text-transparent pointer-events-none'
        )}
        tabIndex={-1}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Type icon */}
      <IconComponent
        size={16}
        className={clsx(
          'flex-shrink-0',
          item.type === 'epic'
            ? 'text-toucan-info'
            : item.type === 'feature'
            ? 'text-toucan-warning'
            : 'text-toucan-grey-400'
        )}
      />

      {/* Title */}
      <span
        className={clsx(
          'flex-1 truncate text-sm',
          isSelected ? 'text-toucan-grey-100 font-medium' : 'text-toucan-grey-200'
        )}
      >
        {item.title}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.sizeEstimate && item.type === 'story' && (
          <SizeBadge size={item.sizeEstimate} />
        )}
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
}
