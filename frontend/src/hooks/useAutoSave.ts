import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../stores/toastStore';

interface UseAutoSaveOptions<T> {
  onSave: (value: T) => Promise<void>;
  debounceMs?: number;
  showToastOnError?: boolean;
}

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveResult<T> {
  save: (value: T) => void;
  status: AutoSaveStatus;
  lastSavedAt: number | undefined;
  error: string | undefined;
  reset: () => void;
}

export function useAutoSave<T>({
  onSave,
  debounceMs = 1000,
  showToastOnError = true,
}: UseAutoSaveOptions<T>): UseAutoSaveResult<T> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const toast = useToast();

  const save = useCallback(
    (value: T) => {
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
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to save';
          setStatus('error');
          setError(errorMessage);
          if (showToastOnError) {
            toast.error('Save failed', errorMessage);
          }
        }
      }, debounceMs);
    },
    [onSave, debounceMs, showToastOnError, toast]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(undefined);
    setLastSavedAt(undefined);
  }, []);

  return {
    save,
    status,
    lastSavedAt,
    error,
    reset,
  };
}
