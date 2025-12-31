import { create } from 'zustand';
import type { WorkItem } from '../types/workItem';

interface TreeState {
  // Data
  items: WorkItem[];
  hierarchicalItems: WorkItem[];

  // UI State
  expandedIds: Set<string>;
  selectedId: string | null;
  focusedId: string | null;
  filteredIds: Set<string> | null; // null = no filter applied

  // Actions
  setItems: (items: WorkItem[], hierarchical: WorkItem[]) => void;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setSelected: (id: string | null) => void;
  setFocused: (id: string | null) => void;
  setFilteredItems: (ids: Set<string> | null) => void;

  // Navigation helpers
  getNextVisibleId: (currentId: string) => string | null;
  getPrevVisibleId: (currentId: string) => string | null;

  // Selection helpers
  getSelectedItem: () => WorkItem | null;
}

// Helper to get all visible item IDs in order
function getVisibleIds(items: WorkItem[], expandedIds: Set<string>): string[] {
  const result: string[] = [];

  function traverse(item: WorkItem) {
    result.push(item.id);
    if (item.children && expandedIds.has(item.id)) {
      item.children.forEach(traverse);
    }
  }

  items.forEach(traverse);
  return result;
}

// Helper to get all item IDs
function getAllIds(items: WorkItem[]): string[] {
  const result: string[] = [];

  function traverse(item: WorkItem) {
    result.push(item.id);
    if (item.children) {
      item.children.forEach(traverse);
    }
  }

  items.forEach(traverse);
  return result;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  items: [],
  hierarchicalItems: [],
  expandedIds: new Set<string>(),
  selectedId: null,
  focusedId: null,
  filteredIds: null,

  setItems: (items, hierarchical) => {
    // Auto-expand epics by default
    const epicIds = hierarchical.map(item => item.id);
    set({
      items,
      hierarchicalItems: hierarchical,
      expandedIds: new Set(epicIds),
    });
  },

  toggleExpand: (id) => {
    set((state) => {
      const newExpanded = new Set(state.expandedIds);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedIds: newExpanded };
    });
  },

  expandAll: () => {
    const { hierarchicalItems } = get();
    const allIds = getAllIds(hierarchicalItems);
    set({ expandedIds: new Set(allIds) });
  },

  collapseAll: () => {
    set({ expandedIds: new Set() });
  },

  setSelected: (id) => {
    set({ selectedId: id, focusedId: id });
  },

  setFocused: (id) => {
    set({ focusedId: id });
  },

  setFilteredItems: (ids) => {
    set({ filteredIds: ids });
  },

  getNextVisibleId: (currentId) => {
    const { hierarchicalItems, expandedIds } = get();
    const visibleIds = getVisibleIds(hierarchicalItems, expandedIds);
    const currentIndex = visibleIds.indexOf(currentId);
    if (currentIndex === -1 || currentIndex === visibleIds.length - 1) {
      return null;
    }
    return visibleIds[currentIndex + 1] ?? null;
  },

  getPrevVisibleId: (currentId) => {
    const { hierarchicalItems, expandedIds } = get();
    const visibleIds = getVisibleIds(hierarchicalItems, expandedIds);
    const currentIndex = visibleIds.indexOf(currentId);
    if (currentIndex <= 0) {
      return null;
    }
    return visibleIds[currentIndex - 1] ?? null;
  },

  getSelectedItem: () => {
    const { items, selectedId } = get();
    if (!selectedId) return null;
    return items.find(item => item.id === selectedId) || null;
  },
}));
