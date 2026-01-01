import { useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useLoadingStore } from '../../stores/loadingStore';

interface SyncButtonProps {
  onSync: () => Promise<void>;
  label?: string;
  operationId?: string;
  className?: string;
}

export function SyncButton({
  onSync,
  label = 'Sync',
  operationId = 'sync',
  className,
}: SyncButtonProps) {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const { startOperation, completeOperation, failOperation } = useLoadingStore();

  const handleSync = async () => {
    if (status === 'syncing') return;

    setStatus('syncing');
    startOperation(operationId, 'sync', label);

    try {
      await onSync();
      setStatus('success');
      completeOperation(operationId);

      // Reset to idle after showing success
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      failOperation(operationId, error instanceof Error ? error.message : 'Sync failed');

      // Reset to idle after showing error
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'syncing':
        return <RefreshCw size={16} className="animate-spin" />;
      case 'success':
        return <Check size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      default:
        return <RefreshCw size={16} />;
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'syncing':
        return 'bg-toucan-dark-lighter text-toucan-grey-400 cursor-wait';
      case 'success':
        return 'bg-toucan-success/20 text-toucan-success';
      case 'error':
        return 'bg-toucan-error/20 text-toucan-error';
      default:
        return 'bg-toucan-dark-lighter text-toucan-grey-200 hover:bg-toucan-dark-border';
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={status === 'syncing'}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all',
        'border border-toucan-dark-border',
        getStatusStyles(),
        className
      )}
    >
      {getIcon()}
      <span>{status === 'syncing' ? 'Syncing...' : label}</span>
    </button>
  );
}
