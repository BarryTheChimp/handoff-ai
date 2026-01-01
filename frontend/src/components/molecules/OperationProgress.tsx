import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useLoadingStore, LoadingOperation } from '../../stores/loadingStore';
import { ProgressBar } from '../atoms/ProgressBar';

interface OperationProgressProps {
  className?: string;
}

export function OperationProgress({ className }: OperationProgressProps) {
  const operations = useLoadingStore((state) => Array.from(state.operations.values()));
  const clearOperation = useLoadingStore((state) => state.clearOperation);
  const [visible, setVisible] = useState(false);

  const activeOps = operations.filter(op =>
    op.status === 'in_progress' ||
    op.status === 'pending' ||
    (op.completedAt !== undefined && Date.now() - op.completedAt < 3000)
  );

  useEffect(() => {
    if (activeOps.length > 0) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeOps.length]);

  if (!visible || activeOps.length === 0) return null;

  const getStatusIcon = (op: LoadingOperation) => {
    switch (op.status) {
      case 'completed':
        return <CheckCircle size={16} className="text-toucan-success" />;
      case 'error':
        return <AlertCircle size={16} className="text-toucan-error" />;
      default:
        return <Loader2 size={16} className="text-toucan-orange animate-spin" />;
    }
  };

  const getProgressVariant = (op: LoadingOperation) => {
    switch (op.status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className={clsx(
      'fixed bottom-4 right-4 z-40 w-80',
      'bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-xl',
      'animate-in slide-in-from-right-5 fade-in duration-300',
      className
    )}>
      <div className="p-3 border-b border-toucan-dark-border">
        <h3 className="text-sm font-medium text-toucan-grey-100">
          Active Operations ({activeOps.filter(op => op.status === 'in_progress').length})
        </h3>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {activeOps.map((op) => (
          <div
            key={op.id}
            className={clsx(
              'p-3 border-b border-toucan-dark-border last:border-b-0',
              'transition-opacity',
              op.status === 'completed' && 'opacity-60'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(op)}
                <span className="text-sm text-toucan-grey-200">{op.label}</span>
              </div>
              {(op.status === 'completed' || op.status === 'error') && (
                <button
                  onClick={() => clearOperation(op.id)}
                  className="p-1 text-toucan-grey-500 hover:text-toucan-grey-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <ProgressBar
              progress={op.progress}
              size="sm"
              variant={getProgressVariant(op)}
              animated={op.status === 'in_progress'}
            />

            {op.message && (
              <p className={clsx(
                'mt-1 text-xs truncate',
                op.status === 'error' ? 'text-toucan-error' : 'text-toucan-grey-500'
              )}>
                {op.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
