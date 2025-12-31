import { useCallback, useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import { DraggableTreeNode } from '../molecules/DraggableTreeNode';
import { useTreeStore } from '../../stores/treeStore';
import { useHistoryStore } from '../../stores/historyStore';
import { workItemsApi } from '../../services/api';
import type { WorkItem, WorkItemType } from '../../types/workItem';

interface DraggableWorkBreakdownTreeProps {
  className?: string;
  onMoveItem?: (itemId: string, newParentId: string | null, newIndex: number) => Promise<void>;
}

// Hierarchy validation rules
function canDropOn(dragType: WorkItemType, targetType: WorkItemType | null): boolean {
  if (dragType === 'epic') {
    // Epics can only be reordered at root level (no parent)
    return targetType === null;
  }
  if (dragType === 'feature') {
    // Features can only be under epics
    return targetType === 'epic';
  }
  if (dragType === 'story') {
    // Stories can only be under features
    return targetType === 'feature';
  }
  return false;
}

export function DraggableWorkBreakdownTree({
  className,
  onMoveItem,
}: DraggableWorkBreakdownTreeProps) {
  const {
    hierarchicalItems,
    items,
    expandedIds,
    selectedId,
    filteredIds,
    toggleExpand,
    setSelected,
    setItems,
  } = useTreeStore();

  const { recordChange } = useHistoryStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isValidDrop, setIsValidDrop] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get flat list of visible items for sortable context (respecting filters)
  const visibleItems = useMemo(() => {
    const result: WorkItem[] = [];

    function traverse(item: WorkItem) {
      // Skip if filtered out
      if (filteredIds && !filteredIds.has(item.id)) {
        return;
      }
      result.push(item);
      if (item.children && expandedIds.has(item.id)) {
        item.children.forEach(traverse);
      }
    }

    hierarchicalItems.forEach(traverse);
    return result;
  }, [hierarchicalItems, expandedIds, filteredIds]);

  const visibleIds = useMemo(() => visibleItems.map(item => item.id), [visibleItems]);

  // Get the active item being dragged
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return items.find(item => item.id === activeId) || null;
  }, [activeId, items]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag over to validate drop target
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;

    if (!over) {
      setOverId(null);
      setIsValidDrop(false);
      return;
    }

    setOverId(over.id as string);

    // Get the dragged item type
    const draggedItem = items.find(item => item.id === active.id);
    if (!draggedItem) {
      setIsValidDrop(false);
      return;
    }

    // Get the target item (what we're hovering over)
    const targetItem = items.find(item => item.id === over.id);

    // Validate the drop based on hierarchy rules
    if (targetItem) {
      // If dropping on same type, we're reordering within same parent
      if (draggedItem.type === targetItem.type) {
        setIsValidDrop(true);
      } else {
        // Dropping on different type - check if valid parent
        setIsValidDrop(canDropOn(draggedItem.type, targetItem.type));
      }
    } else {
      // Dropping at root level
      setIsValidDrop(canDropOn(draggedItem.type, null));
    }
  }, [items]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);
    setIsValidDrop(false);

    if (!over || active.id === over.id) return;

    const draggedItem = items.find(item => item.id === active.id);
    const targetItem = items.find(item => item.id === over.id);

    if (!draggedItem) return;

    // Determine new parent and order
    let newParentId: string | null = null;
    let newOrderIndex = 0;

    if (targetItem) {
      if (draggedItem.type === targetItem.type) {
        // Reordering within same parent
        newParentId = targetItem.parentId;
        newOrderIndex = targetItem.orderIndex;
      } else if (canDropOn(draggedItem.type, targetItem.type)) {
        // Moving to new parent
        newParentId = targetItem.id;
        newOrderIndex = 0; // First child
      } else {
        // Invalid drop
        return;
      }
    } else {
      // Moving to root (only valid for epics)
      if (draggedItem.type !== 'epic') return;
      newParentId = null;
      newOrderIndex = 0;
    }

    // Record move in history for undo/redo
    const previousState = {
      parentId: draggedItem.parentId,
      orderIndex: draggedItem.orderIndex,
    };
    const newState = {
      parentId: newParentId,
      orderIndex: newOrderIndex,
    };

    const targetName = targetItem?.title || 'root';
    const description = `Moved "${draggedItem.title}" to ${targetName}`;

    recordChange('move', draggedItem.id, description, previousState, newState);

    // Optimistic update
    const updatedItems = items.map(item => {
      if (item.id === draggedItem.id) {
        return { ...item, parentId: newParentId, orderIndex: newOrderIndex };
      }
      return item;
    });

    // Rebuild hierarchy
    const newHierarchy = buildHierarchy(updatedItems);
    setItems(updatedItems, newHierarchy);

    // Call API
    try {
      if (onMoveItem) {
        await onMoveItem(draggedItem.id, newParentId, newOrderIndex);
      } else {
        await workItemsApi.move(draggedItem.id, newParentId, newOrderIndex);
      }
    } catch (error) {
      // Revert on error
      console.error('Failed to move item:', error);
      setItems(items, hierarchicalItems);
    }
  }, [items, hierarchicalItems, setItems, onMoveItem, recordChange]);

  // Render tree nodes recursively
  const renderNode = useCallback(
    (item: WorkItem, depth: number) => {
      const isExpanded = expandedIds.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <div key={item.id} data-id={item.id}>
          <DraggableTreeNode
            item={item}
            depth={depth}
            isExpanded={isExpanded}
            isSelected={selectedId === item.id}
            hasChildren={hasChildren || false}
            isOver={overId === item.id}
            isOverValid={overId === item.id && isValidDrop}
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
    [expandedIds, selectedId, overId, isValidDrop, toggleExpand, setSelected]
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <div
          role="tree"
          className={clsx('outline-none overflow-y-auto', className)}
        >
          {hierarchicalItems.map((item) => renderNode(item, 0))}
        </div>
      </SortableContext>

      {/* Drag overlay - shows the item being dragged */}
      <DragOverlay>
        {activeItem ? (
          <div className="bg-toucan-dark-lighter border border-toucan-orange rounded-md shadow-lg px-3 py-2">
            <span className="text-sm text-toucan-grey-100">{activeItem.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Helper to rebuild hierarchy from flat items
function buildHierarchy(items: WorkItem[]): WorkItem[] {
  const itemMap = new Map<string, WorkItem>();
  const roots: WorkItem[] = [];

  // First pass: create copies with empty children arrays
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build hierarchy
  items.forEach(item => {
    const current = itemMap.get(item.id)!;
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(current);
      }
    } else {
      roots.push(current);
    }
  });

  // Sort children by orderIndex
  function sortChildren(item: WorkItem) {
    if (item.children) {
      item.children.sort((a, b) => a.orderIndex - b.orderIndex);
      item.children.forEach(sortChildren);
    }
  }

  roots.sort((a, b) => a.orderIndex - b.orderIndex);
  roots.forEach(sortChildren);

  return roots;
}
