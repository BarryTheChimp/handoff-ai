# F22: Save Confirmation UX (Toast System)

> **Priority:** MEDIUM | **Effort:** 1.5 hours | **Phase:** 1

---

## Overview

**What:** Implement a global toast notification system and auto-save indicators across the app.

**Why:** User feedback: "When editing the brief or glossary, there's no feedback that it saved." This is a fundamental usability issue - users need confirmation that their actions succeeded. This toast system will be used by all subsequent features.

**Success Criteria:**
- Toast notifications appear for save/error/info messages
- Auto-save shows "Saving..." → "Saved 2 seconds ago"
- Toasts stack properly when multiple appear
- Toasts auto-dismiss after appropriate delay

---

## User Stories

### Must Have

**US-22.1:** As a user, I want to see "Saved" confirmation when I edit content so that I know my changes were persisted.
- **AC:** Edit brief text → See "Saved" indicator appear
- **AC:** Indicator shows timestamp ("Saved 2 seconds ago")
- **AC:** If save fails, see error message

**US-22.2:** As a user, I want to see toast notifications for important events so that I'm informed of what's happening.
- **AC:** Upload complete → Toast appears "Spec uploaded successfully"
- **AC:** Error occurs → Toast appears with red styling
- **AC:** Toast auto-dismisses after 5 seconds

**US-22.3:** As a user, I want to be able to dismiss toasts manually so that I can clear them if needed.
- **AC:** Toast has X button to dismiss
- **AC:** Click X → Toast dismisses immediately

### Should Have

**US-22.4:** As a user, I want toasts to stack when multiple appear so that I don't miss any messages.
- **AC:** Multiple toasts stack vertically
- **AC:** Newer toasts appear at top
- **AC:** Each dismisses independently

---

## Technical Design

### Toast Store (Zustand)

```typescript
// frontend/src/stores/toastStore.ts
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = no auto-dismiss
  dismissible?: boolean;
  createdAt: number;
}

interface ToastStore {
  toasts: Toast[];
  
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  
  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const DEFAULT_DURATION = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = toast.duration ?? DEFAULT_DURATION[toast.type];
    
    const newToast: Toast = {
      ...toast,
      id,
      createdAt: Date.now(),
      dismissible: toast.dismissible ?? true,
      duration,
    };
    
    set((state) => ({
      toasts: [newToast, ...state.toasts].slice(0, 5), // Max 5 toasts
    }));
    
    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
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
  
  success: (title, message) => get().addToast({ type: 'success', title, message }),
  error: (title, message) => get().addToast({ type: 'error', title, message }),
  warning: (title, message) => get().addToast({ type: 'warning', title, message }),
  info: (title, message) => get().addToast({ type: 'info', title, message }),
}));

// Hook for easy access
export function useToast() {
  const store = useToastStore();
  return {
    success: store.success,
    error: store.error,
    warning: store.warning,
    info: store.info,
    dismiss: store.removeToast,
    clearAll: store.clearAll,
  };
}
```

### Toast Container Component

```tsx
// frontend/src/components/organisms/ToastContainer.tsx
import { useToastStore } from '../../stores/toastStore';
import { Toast } from '../molecules/Toast';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  
  if (toasts.length === 0) return null;
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
```

### Toast Component

```tsx
// frontend/src/components/molecules/Toast.tsx
import { useEffect, useState } from 'react';

interface ToastProps {
  toast: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    dismissible?: boolean;
  };
  onDismiss: () => void;
}

const ICONS = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES = {
  success: {
    bg: 'bg-toucan-success/10',
    border: 'border-toucan-success/30',
    icon: 'text-toucan-success',
  },
  error: {
    bg: 'bg-toucan-error/10',
    border: 'border-toucan-error/30',
    icon: 'text-toucan-error',
  },
  warning: {
    bg: 'bg-toucan-warning/10',
    border: 'border-toucan-warning/30',
    icon: 'text-toucan-warning',
  },
  info: {
    bg: 'bg-toucan-info/10',
    border: 'border-toucan-info/30',
    icon: 'text-toucan-info',
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const style = STYLES[toast.type];
  
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200); // Wait for exit animation
  };
  
  return (
    <div
      className={`
        ${style.bg} ${style.border}
        border rounded-lg p-4 shadow-lg pointer-events-auto
        transform transition-all duration-200
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${style.icon}`}>
          {ICONS[toast.type]}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-toucan-grey-100">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-sm text-toucan-grey-400 mt-1">
              {toast.message}
            </p>
          )}
        </div>
        
        {/* Dismiss button */}
        {toast.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-toucan-grey-400 hover:text-toucan-grey-200 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

### Auto-Save Status Component

```tsx
// frontend/src/components/molecules/AutoSaveStatus.tsx
import { useEffect, useState } from 'react';
import { Spinner } from '../atoms/Spinner';

interface AutoSaveStatusProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: number;
  error?: string;
}

export function AutoSaveStatus({ status, lastSavedAt, error }: AutoSaveStatusProps) {
  const [timeAgo, setTimeAgo] = useState('');
  
  useEffect(() => {
    if (!lastSavedAt || status !== 'saved') return;
    
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSavedAt) / 1000);
      
      if (seconds < 5) {
        setTimeAgo('just now');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds} seconds ago`);
      } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        setTimeAgo(`${mins} minute${mins > 1 ? 's' : ''} ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      }
    };
    
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000); // Update every 10s
    
    return () => clearInterval(interval);
  }, [lastSavedAt, status]);
  
  if (status === 'idle') return null;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <Spinner size="sm" />
          <span className="text-toucan-grey-400">Saving...</span>
        </>
      )}
      
      {status === 'saved' && (
        <>
          <svg className="w-4 h-4 text-toucan-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-toucan-grey-400">Saved {timeAgo}</span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <svg className="w-4 h-4 text-toucan-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-toucan-error">{error || 'Failed to save'}</span>
        </>
      )}
    </div>
  );
}
```

### useAutoSave Hook

```typescript
// frontend/src/hooks/useAutoSave.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../stores/toastStore';

interface UseAutoSaveOptions {
  onSave: (value: any) => Promise<void>;
  debounceMs?: number;
  showToastOnError?: boolean;
}

export function useAutoSave<T>({ 
  onSave, 
  debounceMs = 1000,
  showToastOnError = true 
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const toast = useToast();
  
  const save = useCallback(async (value: T) => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Debounce
    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');
      setError(undefined);
      
      try {
        await onSave(value);
        setStatus('saved');
        setLastSavedAt(Date.now());
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to save');
        if (showToastOnError) {
          toast.error('Save failed', err.message);
        }
      }
    }, debounceMs);
  }, [onSave, debounceMs, showToastOnError, toast]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    save,
    status,
    lastSavedAt,
    error,
    reset: () => setStatus('idle'),
  };
}
```

### Integration: Add ToastContainer to App

```tsx
// frontend/src/App.tsx
import { ToastContainer } from './components/organisms/ToastContainer';

function App() {
  return (
    <Router>
      {/* ... existing routes ... */}
      
      {/* Toast container - renders at bottom-right */}
      <ToastContainer />
    </Router>
  );
}
```

### Integration: Update Brief Editor

```tsx
// In KnowledgeBase/BriefEditor.tsx
import { useAutoSave } from '../../hooks/useAutoSave';
import { AutoSaveStatus } from '../molecules/AutoSaveStatus';
import { updateBrief } from '../../services/api';

export function BriefEditor({ projectId, initialBrief }: Props) {
  const [brief, setBrief] = useState(initialBrief);
  
  const { save, status, lastSavedAt, error } = useAutoSave({
    onSave: async (value) => {
      await updateBrief(projectId, value);
    },
    debounceMs: 1500,
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBrief(value);
    save(value);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-toucan-grey-200">
          Project Brief
        </label>
        <AutoSaveStatus status={status} lastSavedAt={lastSavedAt} error={error} />
      </div>
      
      <textarea
        value={brief}
        onChange={handleChange}
        className="w-full h-64 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
        placeholder="Describe this project..."
      />
    </div>
  );
}
```

---

## Usage Examples

### Show a success toast

```typescript
const toast = useToast();
toast.success('Spec uploaded', 'Your specification is ready for translation');
```

### Show an error toast

```typescript
const toast = useToast();
toast.error('Upload failed', 'The file could not be processed');
```

### Auto-save with status indicator

```tsx
const { save, status, lastSavedAt } = useAutoSave({
  onSave: async (value) => {
    await api.updateGlossary(projectId, value);
  }
});

// In JSX
<AutoSaveStatus status={status} lastSavedAt={lastSavedAt} />
```

---

## Testing Checklist

### Unit Tests

- [ ] `useToastStore.addToast` - Creates toast with correct properties
- [ ] `useToastStore.addToast` - Auto-dismisses after duration
- [ ] `useToastStore.removeToast` - Removes correct toast
- [ ] `useToastStore` - Limits to max 5 toasts
- [ ] `useAutoSave` - Debounces save calls
- [ ] `useAutoSave` - Updates status correctly through lifecycle
- [ ] `AutoSaveStatus` - Shows correct message for each status
- [ ] `AutoSaveStatus` - Updates time ago correctly

### Integration Tests

- [ ] Toast appears when triggered
- [ ] Toast dismisses on X click
- [ ] Toast auto-dismisses after timeout
- [ ] Multiple toasts stack correctly
- [ ] Brief editor shows auto-save status
- [ ] Glossary editor shows auto-save status

### E2E Tests

- [ ] Edit brief → See "Saving..." → See "Saved just now"
- [ ] Upload spec → See success toast
- [ ] Force error → See error toast with red styling

### Accessibility Tests

- [ ] Toast container has aria-live="polite"
- [ ] Toast has role="alert"
- [ ] Dismiss button has aria-label

---

## Rollback Plan

If toasts cause issues:
1. Remove ToastContainer from App.tsx
2. Revert to console.log for debugging
3. Keep AutoSaveStatus (it's independent)

---

*F22 Specification v1.0*
