import { create } from 'zustand';

interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  undoToken: string | null;
  undoExpiresAt: Date | null;

  // Actions
  toggleItem: (id: string) => void;
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setUndoToken: (token: string, expiresAt: Date) => void;
  clearUndoToken: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set<string>(),
  lastSelectedId: null,
  undoToken: null,
  undoExpiresAt: null,

  toggleItem: (id: string) => {
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return {
        selectedIds: newSet,
        lastSelectedId: id,
      };
    });
  },

  selectRange: (fromId: string, toId: string, allIds: string[]) => {
    const fromIndex = allIds.indexOf(fromId);
    const toIndex = allIds.indexOf(toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    const rangeIds = allIds.slice(start, end + 1);

    set((state) => {
      const newSet = new Set(state.selectedIds);
      rangeIds.forEach((id) => newSet.add(id));
      return {
        selectedIds: newSet,
        lastSelectedId: toId,
      };
    });
  },

  selectAll: (ids: string[]) => {
    set({
      selectedIds: new Set(ids),
      lastSelectedId: ids[ids.length - 1] || null,
    });
  },

  clearSelection: () => {
    set({
      selectedIds: new Set<string>(),
      lastSelectedId: null,
    });
  },

  setUndoToken: (token: string, expiresAt: Date) => {
    set({
      undoToken: token,
      undoExpiresAt: expiresAt,
    });
  },

  clearUndoToken: () => {
    set({
      undoToken: null,
      undoExpiresAt: null,
    });
  },

  isSelected: (id: string) => {
    return get().selectedIds.has(id);
  },
}));
