import { create } from 'zustand';
import type { WorkItem } from '../types/workItem';
import { useHistoryStore } from './historyStore';

// Fields that can be edited
type EditableField = 'title' | 'description' | 'acceptanceCriteria' | 'technicalNotes' | 'status' | 'sizeEstimate';

interface EditorState {
  // Current item being edited
  currentItem: WorkItem | null;
  originalItem: WorkItem | null;

  // Edit state
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;

  // Pending changes (not yet saved)
  pendingChanges: Partial<WorkItem>;

  // Actions
  setCurrentItem: (item: WorkItem | null) => void;
  setField: <K extends EditableField>(field: K, value: WorkItem[K]) => void;
  save: () => Promise<void>;
  discardChanges: () => void;
  clearError: () => void;
}

// Debounce timer
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 2000;

// API client for saving (will be implemented in services)
async function saveWorkItem(id: string, changes: Partial<WorkItem>): Promise<WorkItem> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/workitems/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(changes),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to save');
  }

  const data = await response.json();
  return data.data;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentItem: null,
  originalItem: null,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  saveError: null,
  pendingChanges: {},

  setCurrentItem: (item) => {
    // Cancel pending save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }

    // Save current changes before switching
    const { isDirty, save } = get();
    if (isDirty) {
      save();
    }

    set({
      currentItem: item,
      originalItem: item,
      isDirty: false,
      pendingChanges: {},
      saveError: null,
    });
  },

  setField: (field, value) => {
    const { currentItem, pendingChanges } = get();
    if (!currentItem) return;

    // Update current item and pending changes
    const updatedItem = { ...currentItem, [field]: value };
    const updatedChanges = { ...pendingChanges, [field]: value };

    set({
      currentItem: updatedItem,
      pendingChanges: updatedChanges,
      isDirty: true,
      saveError: null,
    });

    // Debounced auto-save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      get().save();
    }, SAVE_DEBOUNCE_MS);
  },

  save: async () => {
    const { currentItem, originalItem, pendingChanges, isDirty } = get();
    if (!currentItem || !isDirty || Object.keys(pendingChanges).length === 0) {
      return;
    }

    // Cancel debounce timer
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }

    set({ isSaving: true, saveError: null });

    try {
      // Record change in history before saving
      const changedFields = Object.keys(pendingChanges).join(', ');
      const description = `Updated ${changedFields} on "${currentItem.title}"`;

      // Create snapshots for undo/redo using original item
      let previousState: Partial<WorkItem> | null = null;
      if (originalItem) {
        previousState = {};
        const prevStateRec = previousState as unknown as Record<string, unknown>;
        const origItemRec = originalItem as unknown as Record<string, unknown>;
        for (const key of Object.keys(pendingChanges)) {
          prevStateRec[key] = origItemRec[key];
        }
      }

      // Record in history store
      useHistoryStore.getState().recordChange(
        'update',
        currentItem.id,
        description,
        previousState,
        { ...pendingChanges }
      );

      const savedItem = await saveWorkItem(currentItem.id, pendingChanges);
      set({
        currentItem: savedItem,
        originalItem: savedItem,
        pendingChanges: {},
        isDirty: false,
        isSaving: false,
        lastSaved: new Date(),
      });
    } catch (error) {
      set({
        isSaving: false,
        saveError: error instanceof Error ? error.message : 'Failed to save',
      });
    }
  },

  discardChanges: () => {
    const { originalItem } = get();
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    set({
      currentItem: originalItem,
      pendingChanges: {},
      isDirty: false,
      saveError: null,
    });
  },

  clearError: () => {
    set({ saveError: null });
  },
}));
