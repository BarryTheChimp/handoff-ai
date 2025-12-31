# F20: Sync Feedback & Progress Indicators

> **Priority:** CRITICAL | **Effort:** 2 hours | **Phase:** 1

---

## Overview

**What:** Add visual feedback for all async operations - syncing context sources, uploading files, translating specs.

**Why:** User reported clicking "Sync Now" on context sources with no visual indication anything is happening. This is a fundamental UX failure - users need to know the system is working, especially for operations that take several seconds.

**Success Criteria:**
- All async operations show loading state immediately
- Progress indication for operations > 1 second
- Success/error feedback when complete
- User can cancel long-running operations

---

## User Stories

### Must Have

**US-20.1:** As a user, I want to see a loading indicator when I click "Sync Now" so that I know the system is working.
- **AC:** Click "Sync Now" → Button shows spinner immediately
- **AC:** Sync status text updates: "Syncing..." → "Synced 12 items"
- **AC:** If sync fails, show error message in red

**US-20.2:** As a user, I want to see upload progress when uploading large files so that I know how long to wait.
- **AC:** Upload 10MB file → See progress bar (0% → 100%)
- **AC:** Progress updates at least every second
- **AC:** Can see estimated time remaining

**US-20.3:** As a user, I want to see translation progress so that I know the AI is working.
- **AC:** Click "Translate" → See "Analyzing document..." → "Generating epics..." → "Generating stories..." → "Complete"
- **AC:** Progress indicator shows which phase we're in
- **AC:** If translation fails, show what went wrong

### Should Have

**US-20.4:** As a user, I want to be able to cancel long-running operations so that I'm not stuck waiting.
- **AC:** During upload, see "Cancel" button
- **AC:** Clicking cancel stops the upload
- **AC:** During translation, see "Cancel" button (confirms "Are you sure?")

---

## Functional Requirements

| ID | Requirement | Testable Criteria |
|----|-------------|-------------------|
| FR-20.1 | Sync button shall show spinner during sync | Click sync, verify spinner visible |
| FR-20.2 | Sync shall show item count on completion | Complete sync, verify "Synced X items" shown |
| FR-20.3 | File upload shall show progress percentage | Upload large file, verify progress updates |
| FR-20.4 | Translation shall show phase indicators | Start translation, verify phase text changes |
| FR-20.5 | Failed operations shall show error message | Force failure, verify error visible |
| FR-20.6 | Long operations shall be cancellable | Start operation, click cancel, verify stopped |
| FR-20.7 | All loading states shall be accessible | Loading states announce to screen readers |

---

## Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-20.1 | Loading indicator appearance | < 100ms after action |
| NFR-20.2 | Progress update frequency | At least every 1 second |
| NFR-20.3 | Spinner animation | Smooth 60fps |
| NFR-20.4 | Cancellation response | < 500ms to stop |

---

## Technical Design

### Approach: Zustand Loading State Store

Create a centralized loading state manager that any component can use:

```typescript
// stores/loadingStore.ts
interface LoadingState {
  // Active operations
  operations: Map<string, OperationState>;
  
  // Actions
  startOperation: (id: string, label: string, cancellable?: boolean) => void;
  updateProgress: (id: string, progress: number, phase?: string) => void;
  completeOperation: (id: string, message?: string) => void;
  failOperation: (id: string, error: string) => void;
  cancelOperation: (id: string) => void;
  
  // Queries
  isLoading: (id: string) => boolean;
  getOperation: (id: string) => OperationState | undefined;
}

interface OperationState {
  id: string;
  label: string;
  status: 'loading' | 'success' | 'error' | 'cancelled';
  progress?: number;  // 0-100
  phase?: string;     // Current phase label
  message?: string;   // Success/error message
  cancellable: boolean;
  startedAt: number;
}
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Loading State System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   LoadingStore      │    │   LoadingOverlay    │            │
│  │   (Zustand)         │───▶│   (Global)          │            │
│  │                     │    │                     │            │
│  │   • operations Map  │    │   Shows active ops  │            │
│  │   • startOperation  │    │   with cancel btn   │            │
│  │   • updateProgress  │    │                     │            │
│  └─────────────────────┘    └─────────────────────┘            │
│            │                                                    │
│            │ Hook: useLoading(operationId)                     │
│            ▼                                                    │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   SyncButton        │    │   UploadProgress    │            │
│  │                     │    │                     │            │
│  │   Shows inline      │    │   Shows progress    │            │
│  │   spinner + status  │    │   bar + percentage  │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   TranslateButton   │    │   ProgressBar       │            │
│  │                     │    │   (Atom)            │            │
│  │   Shows phase       │    │                     │            │
│  │   indicator         │    │   Reusable bar      │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Code Implementation

#### frontend/src/stores/loadingStore.ts

```typescript
import { create } from 'zustand';

interface OperationState {
  id: string;
  label: string;
  status: 'loading' | 'success' | 'error' | 'cancelled';
  progress?: number;
  phase?: string;
  message?: string;
  cancellable: boolean;
  startedAt: number;
  onCancel?: () => void;
}

interface LoadingStore {
  operations: Record<string, OperationState>;
  
  startOperation: (
    id: string, 
    label: string, 
    options?: { cancellable?: boolean; onCancel?: () => void }
  ) => void;
  
  updateProgress: (id: string, progress: number, phase?: string) => void;
  completeOperation: (id: string, message?: string) => void;
  failOperation: (id: string, error: string) => void;
  cancelOperation: (id: string) => void;
  clearOperation: (id: string) => void;
  
  isLoading: (id: string) => boolean;
  getOperation: (id: string) => OperationState | undefined;
}

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  operations: {},
  
  startOperation: (id, label, options = {}) => {
    set((state) => ({
      operations: {
        ...state.operations,
        [id]: {
          id,
          label,
          status: 'loading',
          cancellable: options.cancellable ?? false,
          onCancel: options.onCancel,
          startedAt: Date.now(),
        },
      },
    }));
  },
  
  updateProgress: (id, progress, phase) => {
    set((state) => {
      const op = state.operations[id];
      if (!op) return state;
      return {
        operations: {
          ...state.operations,
          [id]: { ...op, progress, phase },
        },
      };
    });
  },
  
  completeOperation: (id, message) => {
    set((state) => {
      const op = state.operations[id];
      if (!op) return state;
      return {
        operations: {
          ...state.operations,
          [id]: { ...op, status: 'success', message, progress: 100 },
        },
      };
    });
    
    // Auto-clear after 3 seconds
    setTimeout(() => get().clearOperation(id), 3000);
  },
  
  failOperation: (id, error) => {
    set((state) => {
      const op = state.operations[id];
      if (!op) return state;
      return {
        operations: {
          ...state.operations,
          [id]: { ...op, status: 'error', message: error },
        },
      };
    });
    
    // Auto-clear after 5 seconds
    setTimeout(() => get().clearOperation(id), 5000);
  },
  
  cancelOperation: (id) => {
    const op = get().operations[id];
    if (op?.onCancel) {
      op.onCancel();
    }
    set((state) => ({
      operations: {
        ...state.operations,
        [id]: { ...state.operations[id], status: 'cancelled', message: 'Cancelled' },
      },
    }));
    setTimeout(() => get().clearOperation(id), 2000);
  },
  
  clearOperation: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.operations;
      return { operations: rest };
    });
  },
  
  isLoading: (id) => {
    const op = get().operations[id];
    return op?.status === 'loading';
  },
  
  getOperation: (id) => get().operations[id],
}));

// Convenience hook
export function useLoading(operationId: string) {
  const store = useLoadingStore();
  const operation = store.operations[operationId];
  
  return {
    isLoading: operation?.status === 'loading',
    progress: operation?.progress,
    phase: operation?.phase,
    status: operation?.status,
    message: operation?.message,
    cancellable: operation?.cancellable,
    start: (label: string, options?: { cancellable?: boolean; onCancel?: () => void }) => 
      store.startOperation(operationId, label, options),
    update: (progress: number, phase?: string) => 
      store.updateProgress(operationId, progress, phase),
    complete: (message?: string) => store.completeOperation(operationId, message),
    fail: (error: string) => store.failOperation(operationId, error),
    cancel: () => store.cancelOperation(operationId),
  };
}
```

#### frontend/src/components/atoms/ProgressBar.tsx

```tsx
interface ProgressBarProps {
  progress: number;  // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
  animated?: boolean;
}

export function ProgressBar({ 
  progress, 
  size = 'md', 
  showLabel = false,
  color = 'primary',
  animated = true
}: ProgressBarProps) {
  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const colors = {
    primary: 'bg-toucan-orange',
    success: 'bg-toucan-success',
    warning: 'bg-toucan-warning',
    error: 'bg-toucan-error',
  };
  
  return (
    <div className="w-full">
      <div className={`w-full bg-toucan-dark-border rounded-full ${heights[size]} overflow-hidden`}>
        <div 
          className={`${heights[size]} ${colors[color]} rounded-full transition-all duration-300 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-toucan-grey-400 mt-1 text-right">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}
```

#### frontend/src/components/molecules/SyncButton.tsx

```tsx
import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { useLoading } from '../../stores/loadingStore';
import { syncContextSource } from '../../services/api';

interface SyncButtonProps {
  sourceId: string;
  projectId: string;
  onSyncComplete?: (itemCount: number) => void;
}

export function SyncButton({ sourceId, projectId, onSyncComplete }: SyncButtonProps) {
  const operationId = `sync-${sourceId}`;
  const { isLoading, status, message, start, complete, fail } = useLoading(operationId);
  
  const handleSync = async () => {
    start('Syncing...');
    
    try {
      const result = await syncContextSource(projectId, sourceId);
      complete(`Synced ${result.itemCount} items`);
      onSyncComplete?.(result.itemCount);
    } catch (err: any) {
      fail(err.message || 'Sync failed');
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleSync}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Syncing...
          </>
        ) : (
          'Sync Now'
        )}
      </Button>
      
      {status === 'success' && message && (
        <span className="text-sm text-toucan-success">{message}</span>
      )}
      
      {status === 'error' && message && (
        <span className="text-sm text-toucan-error">{message}</span>
      )}
    </div>
  );
}
```

#### frontend/src/components/molecules/TranslateProgress.tsx

```tsx
import { useEffect } from 'react';
import { ProgressBar } from '../atoms/ProgressBar';
import { Button } from '../atoms/Button';
import { useLoading } from '../../stores/loadingStore';

interface TranslateProgressProps {
  specId: string;
  isTranslating: boolean;
  onCancel?: () => void;
}

const PHASES = [
  { key: 'analyzing', label: 'Analyzing document...', progress: 10 },
  { key: 'epics', label: 'Generating epics...', progress: 30 },
  { key: 'features', label: 'Generating features...', progress: 50 },
  { key: 'stories', label: 'Generating stories...', progress: 70 },
  { key: 'enhancing', label: 'Enhancing with context...', progress: 90 },
  { key: 'complete', label: 'Complete!', progress: 100 },
];

export function TranslateProgress({ specId, isTranslating, onCancel }: TranslateProgressProps) {
  const operationId = `translate-${specId}`;
  const { phase, progress, status, message, cancel } = useLoading(operationId);
  
  if (!isTranslating && status !== 'loading') {
    return null;
  }
  
  const currentPhase = PHASES.find(p => p.key === phase) || PHASES[0];
  
  return (
    <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-toucan-grey-100">
          {currentPhase.label}
        </span>
        {onCancel && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (confirm('Cancel translation? Progress will be lost.')) {
                cancel();
                onCancel();
              }
            }}
          >
            Cancel
          </Button>
        )}
      </div>
      
      <ProgressBar 
        progress={progress ?? currentPhase.progress} 
        size="md"
        animated={status === 'loading'}
      />
      
      {status === 'error' && message && (
        <p className="text-sm text-toucan-error mt-2">{message}</p>
      )}
    </div>
  );
}
```

#### frontend/src/components/molecules/UploadProgress.tsx

```tsx
import { ProgressBar } from '../atoms/ProgressBar';
import { Button } from '../atoms/Button';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  onCancel?: () => void;
}

export function UploadProgress({ fileName, progress, onCancel }: UploadProgressProps) {
  const isComplete = progress >= 100;
  
  return (
    <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-toucan-grey-100 truncate">
            {fileName}
          </span>
        </div>
        {!isComplete && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      
      <ProgressBar 
        progress={progress} 
        size="sm" 
        showLabel 
        color={isComplete ? 'success' : 'primary'}
        animated={!isComplete}
      />
    </div>
  );
}
```

### Backend Changes for Sync Progress

The backend should support Server-Sent Events (SSE) for real-time progress updates during sync:

#### backend/src/routes/context-sources.ts

```typescript
// POST /api/projects/:projectId/context-sources/:sourceId/sync
// Returns SSE stream for progress updates
fastify.post('/:projectId/context-sources/:sourceId/sync', async (request, reply) => {
  const { projectId, sourceId } = request.params as { projectId: string; sourceId: string };
  
  // Set up SSE
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  const sendProgress = (progress: number, message: string) => {
    reply.raw.write(`data: ${JSON.stringify({ progress, message })}\n\n`);
  };
  
  try {
    const source = await prisma.contextSource.findUnique({ 
      where: { id: sourceId } 
    });
    
    if (!source) {
      sendProgress(0, 'Source not found');
      reply.raw.end();
      return;
    }
    
    sendProgress(10, 'Connecting to source...');
    
    // Perform sync based on source type
    const items = await contextSourceService.syncSource(source, (progress, msg) => {
      sendProgress(progress, msg);
    });
    
    // Update last sync time
    await prisma.contextSource.update({
      where: { id: sourceId },
      data: { 
        lastSyncAt: new Date(),
        itemCount: items.length,
        lastError: null
      }
    });
    
    sendProgress(100, `Synced ${items.length} items`);
    reply.raw.write(`data: ${JSON.stringify({ complete: true, itemCount: items.length })}\n\n`);
    
  } catch (err: any) {
    sendProgress(0, `Error: ${err.message}`);
    
    await prisma.contextSource.update({
      where: { id: sourceId },
      data: { lastError: err.message }
    });
  }
  
  reply.raw.end();
});
```

#### frontend/src/services/api.ts (Sync with SSE)

```typescript
export async function syncContextSource(
  projectId: string, 
  sourceId: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{ itemCount: number }> {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(
      `/api/projects/${projectId}/context-sources/${sourceId}/sync`
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.complete) {
        eventSource.close();
        resolve({ itemCount: data.itemCount });
        return;
      }
      
      if (data.progress !== undefined) {
        onProgress?.(data.progress, data.message);
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      reject(new Error('Sync connection lost'));
    };
  });
}
```

---

## Database Changes

None required - uses existing models.

---

## Testing Checklist

### Unit Tests

- [ ] `useLoadingStore.startOperation` - Creates operation entry
- [ ] `useLoadingStore.updateProgress` - Updates progress value
- [ ] `useLoadingStore.completeOperation` - Sets success status, auto-clears
- [ ] `useLoadingStore.failOperation` - Sets error status with message
- [ ] `useLoadingStore.cancelOperation` - Calls onCancel callback
- [ ] `ProgressBar` - Renders correct width percentage
- [ ] `ProgressBar` - Handles edge cases (0%, 100%, > 100%)

### Integration Tests

- [ ] SyncButton shows spinner during sync
- [ ] SyncButton shows success message on complete
- [ ] SyncButton shows error message on failure
- [ ] Upload progress updates as file uploads
- [ ] Translation progress shows phase changes

### E2E Tests

- [ ] Click Sync Now → See spinner → See "Synced X items"
- [ ] Upload large file → See progress bar fill → See complete
- [ ] Start translation → See phases progress → See complete

### Accessibility Tests

- [ ] Progress bars have proper ARIA attributes
- [ ] Loading states announced to screen readers
- [ ] Cancel buttons keyboard accessible

---

## Rollback Plan

If loading state causes issues:
1. Remove SSE sync endpoint, use simple POST
2. Revert to basic spinner without progress
3. Keep toast system (F22) for feedback

---

## Dependencies

- No new dependencies
- Uses existing Zustand

---

*F20 Specification v1.0*
