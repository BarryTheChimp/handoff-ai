import { create } from 'zustand';
import type { WorkItem } from '../types/workItem';

type HistoryActionType = 'update' | 'move' | 'split' | 'merge' | 'create' | 'delete';

interface HistoryEntry {
  id: string;
  timestamp: number;
  actionType: HistoryActionType;
  workItemId: string;
  description: string;
  // Snapshot for undo
  previousState: Partial<WorkItem> | null;
  // Snapshot for redo
  newState: Partial<WorkItem> | null;
  // For split/merge operations that affect multiple items
  relatedItemIds?: string[] | undefined;
}

interface HistoryState {
  // Undo stack (past actions)
  undoStack: HistoryEntry[];
  // Redo stack (future actions after undo)
  redoStack: HistoryEntry[];
  // Maximum history size
  maxHistorySize: number;
  // Whether we're currently in an undo/redo operation
  isUndoing: boolean;
  isRedoing: boolean;
}

interface HistoryActions {
  // Record a new change
  recordChange: (
    actionType: HistoryActionType,
    workItemId: string,
    description: string,
    previousState: Partial<WorkItem> | null,
    newState: Partial<WorkItem> | null,
    relatedItemIds?: string[]
  ) => void;

  // Undo/Redo operations
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;

  // State checks
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Get the last action description
  getLastActionDescription: () => string | null;
  getNextRedoDescription: () => string | null;

  // Clear history
  clearHistory: () => void;

  // Set undo/redo in progress
  setUndoing: (value: boolean) => void;
  setRedoing: (value: boolean) => void;
}

function generateId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
  isUndoing: false,
  isRedoing: false,

  recordChange: (actionType, workItemId, description, previousState, newState, relatedItemIds) => {
    const state = get();

    // Don't record if we're in the middle of an undo/redo
    if (state.isUndoing || state.isRedoing) {
      return;
    }

    const entry: HistoryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      actionType,
      workItemId,
      description,
      previousState,
      newState,
      relatedItemIds,
    };

    set((state) => {
      // Add to undo stack, clear redo stack (new action invalidates redo history)
      const newUndoStack = [...state.undoStack, entry];

      // Trim if over max size
      if (newUndoStack.length > state.maxHistorySize) {
        newUndoStack.shift();
      }

      return {
        undoStack: newUndoStack,
        redoStack: [], // Clear redo stack on new action
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) {
      return null;
    }

    const entry = state.undoStack[state.undoStack.length - 1];
    if (!entry) return null;

    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, entry],
    }));

    return entry;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) {
      return null;
    }

    const entry = state.redoStack[state.redoStack.length - 1];
    if (!entry) return null;

    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, entry],
    }));

    return entry;
  },

  canUndo: () => {
    return get().undoStack.length > 0;
  },

  canRedo: () => {
    return get().redoStack.length > 0;
  },

  getLastActionDescription: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    const entry = state.undoStack[state.undoStack.length - 1];
    return entry?.description ?? null;
  },

  getNextRedoDescription: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;
    const entry = state.redoStack[state.redoStack.length - 1];
    return entry?.description ?? null;
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
    });
  },

  setUndoing: (value) => {
    set({ isUndoing: value });
  },

  setRedoing: (value) => {
    set({ isRedoing: value });
  },
}));
