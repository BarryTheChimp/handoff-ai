import { useEffect, useState } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { AutoSaveStatus as Status } from '../../hooks/useAutoSave';

interface AutoSaveStatusProps {
  status: Status;
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
    <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
      {status === 'saving' && (
        <>
          <Loader2 className="w-4 h-4 text-toucan-grey-400 animate-spin" />
          <span className="text-toucan-grey-400">Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <Check className="w-4 h-4 text-toucan-success" />
          <span className="text-toucan-grey-400">Saved {timeAgo}</span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="w-4 h-4 text-toucan-error" />
          <span className="text-toucan-error">{error || 'Failed to save'}</span>
        </>
      )}
    </div>
  );
}
