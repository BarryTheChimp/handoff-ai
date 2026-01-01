import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toastOrTitle: Omit<Toast, 'id'> | string, type?: ToastType) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toastOrTitle, type) => {
    const id = `toast-${++toastId}`;

    // Support both calling conventions:
    // addToast({ title: 'msg', type: 'error' }) or addToast('msg', 'error')
    const toast: Omit<Toast, 'id'> =
      typeof toastOrTitle === 'string'
        ? { title: toastOrTitle, type: type || 'info' }
        : toastOrTitle;

    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
    };

    set((state) => ({
      toasts: [...state.toasts, newToast].slice(-5), // Max 5 toasts
    }));

    // Auto-remove after duration (unless duration is 0)
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Convenience functions for common toast types
export const toast = {
  success: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'success',
      title,
      ...(message !== undefined && { message }),
      ...options,
    });
  },
  error: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'error',
      title,
      ...(message !== undefined && { message }),
      duration: 0, // Errors persist by default
      ...options,
    });
  },
  warning: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'warning',
      title,
      ...(message !== undefined && { message }),
      ...options,
    });
  },
  info: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'info',
      title,
      ...(message !== undefined && { message }),
      ...options,
    });
  },
};

// Hook for easy access within React components
export function useToast() {
  const store = useToastStore();
  return {
    success: (title: string, message?: string) =>
      store.addToast({ type: 'success', title, ...(message !== undefined && { message }) }),
    error: (title: string, message?: string) =>
      store.addToast({ type: 'error', title, ...(message !== undefined && { message }), duration: 0 }),
    warning: (title: string, message?: string) =>
      store.addToast({ type: 'warning', title, ...(message !== undefined && { message }) }),
    info: (title: string, message?: string) =>
      store.addToast({ type: 'info', title, ...(message !== undefined && { message }) }),
    dismiss: store.removeToast,
    clearAll: store.clearAll,
  };
}
