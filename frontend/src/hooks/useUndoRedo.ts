import { useEffect, useCallback } from 'react';
import { useHistoryStore } from '../stores/historyStore';
import { workItemsApi } from '../services/api';
import type { WorkItem } from '../types/workItem';

interface UseUndoRedoOptions {
  // Callback when work items need to be refreshed after undo/redo
  onRefresh?: () => void;
  // Callback when an item is restored
  onItemRestored?: (item: WorkItem) => void;
  // Enable keyboard shortcuts
  enableKeyboardShortcuts?: boolean;
}

interface UseUndoRedoReturn {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  isUndoing: boolean;
  isRedoing: boolean;
  recordChange: (
    actionType: 'update' | 'move' | 'split' | 'merge' | 'create' | 'delete',
    workItemId: string,
    description: string,
    previousState: Partial<WorkItem> | null,
    newState: Partial<WorkItem> | null
  ) => void;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}): UseUndoRedoReturn {
  const {
    onRefresh,
    onItemRestored,
    enableKeyboardShortcuts = true,
  } = options;

  const {
    undo: undoAction,
    redo: redoAction,
    canUndo,
    canRedo,
    getLastActionDescription,
    getNextRedoDescription,
    isUndoing,
    isRedoing,
    setUndoing,
    setRedoing,
    recordChange,
  } = useHistoryStore();

  const undo = useCallback(async () => {
    if (!canUndo() || isUndoing) return;

    setUndoing(true);

    try {
      const entry = undoAction();
      if (!entry) {
        setUndoing(false);
        return;
      }

      // For update actions, call the API to undo
      if (entry.actionType === 'update' && entry.previousState) {
        try {
          const restored = await workItemsApi.update(entry.workItemId, entry.previousState);
          onItemRestored?.(restored);
        } catch (error) {
          console.error('Failed to undo via API:', error);
          // Still refresh to get latest state
        }
      }

      // For move actions, restore the previous parent
      if (entry.actionType === 'move' && entry.previousState?.parentId !== undefined) {
        try {
          await workItemsApi.move(
            entry.workItemId,
            entry.previousState.parentId as string | null,
            entry.previousState.orderIndex as number ?? 0
          );
        } catch (error) {
          console.error('Failed to undo move:', error);
        }
      }

      // Refresh to get latest state
      onRefresh?.();
    } finally {
      setUndoing(false);
    }
  }, [canUndo, isUndoing, undoAction, setUndoing, onRefresh, onItemRestored]);

  const redo = useCallback(async () => {
    if (!canRedo() || isRedoing) return;

    setRedoing(true);

    try {
      const entry = redoAction();
      if (!entry) {
        setRedoing(false);
        return;
      }

      // For update actions, reapply the new state
      if (entry.actionType === 'update' && entry.newState) {
        try {
          const restored = await workItemsApi.update(entry.workItemId, entry.newState);
          onItemRestored?.(restored);
        } catch (error) {
          console.error('Failed to redo via API:', error);
        }
      }

      // For move actions, reapply the new parent
      if (entry.actionType === 'move' && entry.newState?.parentId !== undefined) {
        try {
          await workItemsApi.move(
            entry.workItemId,
            entry.newState.parentId as string | null,
            entry.newState.orderIndex as number ?? 0
          );
        } catch (error) {
          console.error('Failed to redo move:', error);
        }
      }

      // Refresh to get latest state
      onRefresh?.();
    } finally {
      setRedoing(false);
    }
  }, [canRedo, isRedoing, redoAction, setRedoing, onRefresh, onItemRestored]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      // Undo: Ctrl/Cmd + Z
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        void redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, undo, redo]);

  return {
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    undoDescription: getLastActionDescription(),
    redoDescription: getNextRedoDescription(),
    isUndoing,
    isRedoing,
    recordChange,
  };
}
