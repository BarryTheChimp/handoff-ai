import { create } from 'zustand';

export interface LoadingOperation {
  id: string;
  type: 'upload' | 'translate' | 'export' | 'sync' | 'analyze' | 'save';
  label: string;
  progress: number; // 0-100
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message?: string;
  phase?: string; // Current phase for multi-step operations
  cancellable?: boolean;
  onCancel?: () => void;
  startedAt: number;
  completedAt?: number;
}

interface LoadingState {
  operations: Map<string, LoadingOperation>;

  // Actions
  startOperation: (id: string, type: LoadingOperation['type'], label: string) => void;
  updateProgress: (id: string, progress: number, message?: string, phase?: string) => void;
  cancelOperation: (id: string) => void;
  completeOperation: (id: string) => void;
  failOperation: (id: string, error: string) => void;
  clearOperation: (id: string) => void;
  clearCompleted: () => void;

  // Selectors
  getActiveOperations: () => LoadingOperation[];
  getOperation: (id: string) => LoadingOperation | undefined;
  isLoading: (type?: LoadingOperation['type']) => boolean;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  operations: new Map(),

  startOperation: (id, type, label) => {
    set((state) => {
      const newOps = new Map(state.operations);
      newOps.set(id, {
        id,
        type,
        label,
        progress: 0,
        status: 'in_progress',
        startedAt: Date.now(),
      });
      return { operations: newOps };
    });
  },

  updateProgress: (id, progress, message, phase) => {
    set((state) => {
      const newOps = new Map(state.operations);
      const op = newOps.get(id);
      if (op) {
        const updated = { ...op, progress };
        if (message !== undefined) {
          updated.message = message;
        }
        if (phase !== undefined) {
          updated.phase = phase;
        }
        newOps.set(id, updated);
      }
      return { operations: newOps };
    });
  },

  cancelOperation: (id) => {
    const op = get().operations.get(id);
    if (op?.onCancel) {
      op.onCancel();
    }
    set((state) => {
      const newOps = new Map(state.operations);
      const existing = newOps.get(id);
      if (existing) {
        newOps.set(id, {
          ...existing,
          status: 'error',
          message: 'Cancelled',
          completedAt: Date.now(),
        });
      }
      return { operations: newOps };
    });
  },

  completeOperation: (id) => {
    set((state) => {
      const newOps = new Map(state.operations);
      const op = newOps.get(id);
      if (op) {
        newOps.set(id, {
          ...op,
          progress: 100,
          status: 'completed',
          completedAt: Date.now()
        });
      }
      return { operations: newOps };
    });
  },

  failOperation: (id, error) => {
    set((state) => {
      const newOps = new Map(state.operations);
      const op = newOps.get(id);
      if (op) {
        newOps.set(id, {
          ...op,
          status: 'error',
          message: error,
          completedAt: Date.now()
        });
      }
      return { operations: newOps };
    });
  },

  clearOperation: (id) => {
    set((state) => {
      const newOps = new Map(state.operations);
      newOps.delete(id);
      return { operations: newOps };
    });
  },

  clearCompleted: () => {
    set((state) => {
      const newOps = new Map(state.operations);
      for (const [id, op] of newOps) {
        if (op.status === 'completed' || op.status === 'error') {
          newOps.delete(id);
        }
      }
      return { operations: newOps };
    });
  },

  getActiveOperations: () => {
    const { operations } = get();
    return Array.from(operations.values())
      .filter(op => op.status === 'in_progress' || op.status === 'pending')
      .sort((a, b) => b.startedAt - a.startedAt);
  },

  getOperation: (id) => {
    return get().operations.get(id);
  },

  isLoading: (type) => {
    const { operations } = get();
    for (const op of operations.values()) {
      if (op.status === 'in_progress' || op.status === 'pending') {
        if (!type || op.type === type) {
          return true;
        }
      }
    }
    return false;
  },
}));
