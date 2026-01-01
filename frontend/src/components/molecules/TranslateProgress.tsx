import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useLoadingStore } from '../../stores/loadingStore';
import { ProgressBar } from '../atoms/ProgressBar';

interface TranslateProgressProps {
  specId: string;
  onCancel?: () => void;
  className?: string;
}

// Translation phases with progress percentages
const PHASES = [
  { key: 'analyzing', label: 'Analyzing document...', progress: 10 },
  { key: 'epics', label: 'Generating epics...', progress: 30 },
  { key: 'features', label: 'Generating features...', progress: 50 },
  { key: 'stories', label: 'Generating stories...', progress: 70 },
  { key: 'enhancing', label: 'Enhancing with context...', progress: 85 },
  { key: 'validating', label: 'Validating output...', progress: 95 },
  { key: 'complete', label: 'Translation complete!', progress: 100 },
] as const;

export function TranslateProgress({ specId, onCancel, className }: TranslateProgressProps) {
  const operationId = `translate-${specId}`;
  const operation = useLoadingStore((state) => state.operations.get(operationId));
  const cancelOperation = useLoadingStore((state) => state.cancelOperation);

  if (!operation) return null;

  const currentPhase = PHASES.find((p) => p.key === operation.phase) || PHASES[0];
  const isComplete = operation.status === 'completed';
  const isError = operation.status === 'error';
  const isActive = operation.status === 'in_progress';

  const handleCancel = () => {
    if (confirm('Cancel translation? Progress will be lost.')) {
      cancelOperation(operationId);
      onCancel?.();
    }
  };

  const getStatusIcon = () => {
    if (isComplete) {
      return <Check size={18} className="text-toucan-success" />;
    }
    if (isError) {
      return <AlertCircle size={18} className="text-toucan-error" />;
    }
    return <Loader2 size={18} className="text-toucan-orange animate-spin" />;
  };

  const getVariant = () => {
    if (isComplete) return 'success';
    if (isError) return 'error';
    return 'default';
  };

  return (
    <div
      className={clsx(
        'bg-toucan-dark-lighter border rounded-lg p-4',
        isError ? 'border-toucan-error/30' : 'border-toucan-dark-border',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Translation progress"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-toucan-grey-100">
            {isError ? 'Translation failed' : isComplete ? 'Complete!' : currentPhase.label}
          </span>
        </div>

        {isActive && onCancel && (
          <button
            onClick={handleCancel}
            className="p-1.5 text-toucan-grey-500 hover:text-toucan-grey-300 hover:bg-toucan-dark rounded transition-colors"
            aria-label="Cancel translation"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar
        progress={operation.progress ?? currentPhase.progress}
        variant={getVariant()}
        size="md"
        animated={isActive}
        showLabel
      />

      {/* Phase steps */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {PHASES.slice(0, -1).map((phase, index) => {
          const phaseIndex = PHASES.findIndex((p) => p.key === operation.phase);
          const isCurrentPhase = phase.key === operation.phase;
          const isPastPhase = phaseIndex > index;

          return (
            <div
              key={phase.key}
              className={clsx(
                'h-1 rounded-full transition-all',
                isCurrentPhase && 'bg-toucan-orange animate-pulse',
                isPastPhase && 'bg-toucan-success',
                !isCurrentPhase && !isPastPhase && 'bg-toucan-dark-border'
              )}
              title={phase.label}
            />
          );
        })}
      </div>

      {/* Error message */}
      {isError && operation.message && (
        <p className="mt-3 text-sm text-toucan-error">{operation.message}</p>
      )}

      {/* Success message */}
      {isComplete && operation.message && (
        <p className="mt-3 text-sm text-toucan-success">{operation.message}</p>
      )}
    </div>
  );
}

// Hook to manage translation progress
export function useTranslateProgress(specId: string) {
  const operationId = `translate-${specId}`;
  const store = useLoadingStore();

  return {
    start: (label?: string) => {
      store.startOperation(operationId, 'translate', label || 'Translating specification...');
    },
    updatePhase: (phase: string, progress?: number) => {
      const phaseInfo = PHASES.find((p) => p.key === phase);
      store.updateProgress(
        operationId,
        progress ?? phaseInfo?.progress ?? 0,
        phaseInfo?.label,
        phase
      );
    },
    complete: (message?: string) => {
      store.updateProgress(operationId, 100, message, 'complete');
      store.completeOperation(operationId);
    },
    fail: (error: string) => {
      store.failOperation(operationId, error);
    },
    isActive: () => {
      const op = store.getOperation(operationId);
      return op?.status === 'in_progress';
    },
  };
}
