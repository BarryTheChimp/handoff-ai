import { useState } from 'react';
import { X, Wand2, AlertTriangle, Undo2 } from 'lucide-react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { Badge } from '../atoms/Badge';
import { estimationApi, type BatchEstimateResult, type Confidence, type SizeEstimate } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  specId: string;
  existingEstimatesCount: number;
  totalStoriesCount: number;
  onComplete: () => void;
}

type Phase = 'config' | 'processing' | 'results';

export function BatchEstimateModal({
  isOpen,
  onClose,
  specId,
  existingEstimatesCount,
  totalStoriesCount,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('config');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [minConfidence, setMinConfidence] = useState<Confidence>('low');
  const [result, setResult] = useState<BatchEstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);

  const handleStart = async () => {
    setPhase('processing');
    setError(null);

    try {
      const res = await estimationApi.estimateBatch(specId, {
        overwriteExisting,
        minConfidence,
      });
      setResult(res);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Estimation failed');
      setPhase('config');
    }
  };

  const handleUndo = async () => {
    if (!result?.undoToken) return;

    setUndoing(true);
    try {
      await estimationApi.undoBatch(specId, result.undoToken);
      setResult(null);
      setPhase('config');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Undo failed');
    } finally {
      setUndoing(false);
    }
  };

  const handleDone = () => {
    setResult(null);
    setPhase('config');
    onClose();
    onComplete();
  };

  const handleClose = () => {
    if (phase !== 'processing') {
      setResult(null);
      setPhase('config');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" title="Estimate All Stories">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wand2 size={20} className="text-toucan-orange" />
            <h2 className="text-lg font-semibold text-toucan-grey-100">
              Estimate All Stories
            </h2>
          </div>
          {phase !== 'processing' && (
            <button
              onClick={handleClose}
              className="p-1 hover:bg-toucan-dark rounded text-toucan-grey-400"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-toucan-error/20 border border-toucan-error text-toucan-error px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Config Phase */}
        {phase === 'config' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="overwrite"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
              />
              <label htmlFor="overwrite" className="text-sm text-toucan-grey-100">
                Overwrite existing estimates ({existingEstimatesCount} stories have sizes)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
                Minimum confidence
              </label>
              <select
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value as Confidence)}
                className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              >
                <option value="low">Low (estimate all)</option>
                <option value="medium">Medium (skip low confidence)</option>
                <option value="high">High (only confident estimates)</option>
              </select>
            </div>

            <p className="text-sm text-toucan-grey-400">
              {overwriteExisting ? totalStoriesCount : totalStoriesCount - existingEstimatesCount} stories will be estimated
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleStart}>
                <Wand2 size={16} className="mr-2" />
                Start Estimation
              </Button>
            </div>
          </div>
        )}

        {/* Processing Phase */}
        {phase === 'processing' && (
          <div className="py-8 text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-toucan-grey-200">Estimating stories...</p>
            <p className="text-sm text-toucan-grey-400 mt-2">
              This may take a minute for large specs
            </p>
          </div>
        )}

        {/* Results Phase */}
        {phase === 'results' && result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3">
              {(['S', 'M', 'L', 'XL'] as SizeEstimate[]).map((size) => (
                <div
                  key={size}
                  className="bg-toucan-dark rounded-lg p-3 text-center"
                >
                  <div className="text-2xl font-bold text-toucan-orange">
                    {result.summary[size]}
                  </div>
                  <div className="text-xs text-toucan-grey-400">{size}</div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-toucan-grey-400">
                Estimated: <span className="text-toucan-grey-100">{result.estimated}</span>
              </span>
              <span className="text-toucan-grey-400">
                Skipped: <span className="text-toucan-grey-100">{result.skipped}</span>
              </span>
            </div>

            {/* Confidence breakdown */}
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="success">{result.byConfidence.high} high</Badge>
              <Badge variant="warning">{result.byConfidence.medium} medium</Badge>
              <Badge variant="error">{result.byConfidence.low} low</Badge>
            </div>

            {/* Low confidence items */}
            {result.lowConfidenceItems.length > 0 && (
              <div className="bg-toucan-warning/10 border border-toucan-warning/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-toucan-warning" />
                  <span className="text-sm font-medium text-toucan-warning">
                    {result.lowConfidenceItems.length} stories need review
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-toucan-grey-300 max-h-32 overflow-y-auto">
                  {result.lowConfidenceItems.slice(0, 5).map((item) => (
                    <li key={item.id} className="truncate">
                      <span className="text-toucan-grey-100">{item.title}</span>
                      <span className="text-toucan-grey-400"> - {item.reason}</span>
                    </li>
                  ))}
                  {result.lowConfidenceItems.length > 5 && (
                    <li className="text-toucan-grey-400">
                      +{result.lowConfidenceItems.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={handleUndo}
                disabled={undoing}
              >
                {undoing ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <Undo2 size={16} className="mr-2" />
                )}
                Undo
              </Button>
              <Button variant="primary" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
