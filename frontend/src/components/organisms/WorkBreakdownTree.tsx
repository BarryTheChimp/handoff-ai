import { useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { TreeNode } from '../molecules/TreeNode';
import { useTreeStore } from '../../stores/treeStore';
import type { WorkItem } from '../../types/workItem';

interface WorkBreakdownTreeProps {
  className?: string;
}

export function WorkBreakdownTree({ className }: WorkBreakdownTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    hierarchicalItems,
    expandedIds,
    selectedId,
    focusedId,
    toggleExpand,
    setSelected,
    setFocused,
    getNextVisibleId,
    getPrevVisibleId,
  } = useTreeStore();

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentId = focusedId || selectedId;
      if (!currentId) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextId = getNextVisibleId(currentId);
          if (nextId) {
            setSelected(nextId);
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevId = getPrevVisibleId(currentId);
          if (prevId) {
            setSelected(prevId);
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (!expandedIds.has(currentId)) {
            toggleExpand(currentId);
          } else {
            // Move to first child
            const nextId = getNextVisibleId(currentId);
            if (nextId) {
              setSelected(nextId);
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (expandedIds.has(currentId)) {
            toggleExpand(currentId);
          }
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          setSelected(currentId);
          break;
        }
      }
    },
    [focusedId, selectedId, expandedIds, getNextVisibleId, getPrevVisibleId, toggleExpand, setSelected]
  );

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedId && containerRef.current) {
      const selectedElement = containerRef.current.querySelector(`[data-id="${selectedId}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedId]);

  // Render tree recursively
  const renderNode = useCallback(
    (item: WorkItem, depth: number) => {
      const isExpanded = expandedIds.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <div key={item.id} data-id={item.id}>
          <TreeNode
            item={item}
            depth={depth}
            isExpanded={isExpanded}
            isSelected={selectedId === item.id}
            hasChildren={hasChildren || false}
            onToggleExpand={() => toggleExpand(item.id)}
            onSelect={() => setSelected(item.id)}
          />
          {hasChildren && isExpanded && (
            <div className="animate-fade-in">
              {item.children!.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    },
    [expandedIds, selectedId, toggleExpand, setSelected]
  );

  if (hierarchicalItems.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center p-8 text-center', className)}>
        <p className="text-toucan-grey-400 mb-2">No work items yet</p>
        <p className="text-sm text-toucan-grey-600">
          Translate a spec to generate epics, features, and stories
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="tree"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => {
        const firstItem = hierarchicalItems[0];
        if (!focusedId && firstItem) {
          setFocused(firstItem.id);
        }
      }}
      className={clsx(
        'outline-none overflow-y-auto',
        'focus:ring-1 focus:ring-toucan-orange focus:ring-inset',
        className
      )}
    >
      {hierarchicalItems.map((item) => renderNode(item, 0))}
    </div>
  );
}
