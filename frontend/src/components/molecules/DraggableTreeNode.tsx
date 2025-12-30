import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  GripVertical,
  Check,
} from 'lucide-react';
import { StatusBadge, SizeBadge } from '../atoms/Badge';
import { useSelectionStore } from '../../stores/selectionStore';
import type { WorkItem, WorkItemType } from '../../types/workItem';

interface DraggableTreeNodeProps {
  item: WorkItem;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  isOver?: boolean;
  isOverValid?: boolean;
  allItemIds?: string[];
  onToggleExpand: () => void;
  onSelect: () => void;
}

const typeIcons: Record<WorkItemType, { closed: typeof Folder; open: typeof FolderOpen }> = {
  epic: { closed: Folder, open: FolderOpen },
  feature: { closed: Folder, open: FolderOpen },
  story: { closed: FileText, open: FileText },
};

export function DraggableTreeNode({
  item,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  isOver,
  isOverValid,
  allItemIds = [],
  onToggleExpand,
  onSelect,
}: DraggableTreeNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: item.type,
      parentId: item.parentId,
      item,
    },
  });

  const {
    selectedIds,
    lastSelectedId,
    toggleItem,
    selectRange,
    isSelected: isMultiSelected,
  } = useSelectionStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = isExpanded
    ? typeIcons[item.type].open
    : typeIcons[item.type].closed;

  const isItemMultiSelected = isMultiSelected(item.id);

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && lastSelectedId && allItemIds.length > 0) {
      selectRange(lastSelectedId, item.id, allItemIds);
    } else {
      toggleItem(item.id);
    }
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    if (e.shiftKey && selectedIds.size > 0 && allItemIds.length > 0) {
      // Shift-click for range selection
      if (lastSelectedId) {
        selectRange(lastSelectedId, item.id, allItemIds);
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd-click for multi-select
      toggleItem(item.id);
    } else {
      onSelect();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.shiftKey && selectedIds.size > 0) {
        toggleItem(item.id);
      } else {
        onSelect();
      }
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
      ref={setNodeRef}
      data-testid="tree-node"
      style={{ ...style, paddingLeft: `${depth * 20 + 8}px` }}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected || isItemMultiSelected}
      tabIndex={0}
      onClick={handleNodeClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'group flex items-center gap-1 py-1.5 px-2 cursor-pointer rounded-sm',
        'transition-colors duration-100',
        'focus:outline-none focus:ring-1 focus:ring-toucan-orange focus:ring-inset',
        // Drag states
        isDragging && 'opacity-50 bg-toucan-dark-lighter',
        // Drop target states
        isOver && isOverValid && 'ring-2 ring-toucan-success bg-toucan-success/10',
        isOver && !isOverValid && 'ring-2 ring-toucan-error bg-toucan-error/10',
        // Multi-selection state
        !isDragging && !isOver && isItemMultiSelected
          ? 'bg-toucan-orange/20 border-l-2 border-toucan-orange'
          : // Single selection state
            !isDragging && !isOver && isSelected
            ? 'bg-toucan-orange/10 border-l-2 border-toucan-orange/50'
            : !isDragging && !isOver && 'hover:bg-toucan-dark-lighter border-l-2 border-transparent'
      )}
    >
      {/* Selection checkbox */}
      <button
        data-testid="selection-checkbox"
        onClick={handleCheckboxClick}
        className={clsx(
          'w-4 h-4 rounded border flex items-center justify-center transition-all',
          'opacity-0 group-hover:opacity-100',
          isItemMultiSelected && 'opacity-100',
          isItemMultiSelected
            ? 'bg-toucan-orange border-toucan-orange'
            : 'border-toucan-dark-border hover:border-toucan-grey-400'
        )}
        tabIndex={-1}
        aria-label={isItemMultiSelected ? 'Deselect' : 'Select'}
      >
        {isItemMultiSelected && <Check size={12} className="text-white" />}
      </button>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={clsx(
          'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
          'text-toucan-grey-600 hover:text-toucan-grey-400',
          isDragging && 'opacity-100'
        )}
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

// Drop indicator line between items
interface DropIndicatorProps {
  depth: number;
}

export function DropIndicator({ depth }: DropIndicatorProps) {
  return (
    <div
      className="h-0.5 bg-toucan-orange rounded-full mx-2 my-0.5"
      style={{ marginLeft: `${depth * 20 + 28}px` }}
    />
  );
}
