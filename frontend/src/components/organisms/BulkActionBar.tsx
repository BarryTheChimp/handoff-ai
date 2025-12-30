import { useState } from 'react';
import { Ruler, ClipboardCheck, Sparkles, X, Undo2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Modal } from '../atoms/Modal';
import { Spinner } from '../atoms/Spinner';
import { useSelectionStore } from '../../stores/selectionStore';
import { bulkApi, type SizeEstimate, type WorkItemStatusType } from '../../services/api';
import { clsx } from 'clsx';

interface BulkActionBarProps {
  onOperationComplete: () => void;
}

const SIZES: SizeEstimate[] = ['S', 'M', 'L', 'XL'];
const STATUSES: { value: WorkItemStatusType; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready_for_review', label: 'Ready for Review' },
  { value: 'approved', label: 'Approved' },
];

export function BulkActionBar({ onOperationComplete }: BulkActionBarProps) {
  const {
    selectedIds,
    undoToken,
    clearSelection,
    setUndoToken,
    clearUndoToken,
  } = useSelectionStore();

  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Enhance state
  const [enhancement, setEnhancement] = useState('');
  const [context, setContext] = useState('');
  const [enhanceProgress, setEnhanceProgress] = useState<{ current: number; total: number } | null>(null);

  const selectedCount = selectedIds.size;
  const selectedArray = Array.from(selectedIds);

  if (selectedCount === 0 && !undoToken) {
    return null;
  }

  const handleSetSize = async (size: SizeEstimate) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await bulkApi.updateFields(selectedArray, { sizeEstimate: size });
      setUndoToken(result.undoToken, new Date(result.undoExpiresAt));
      clearSelection();
      setShowSizeModal(false);
      onOperationComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStatus = async (status: WorkItemStatusType) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await bulkApi.updateFields(selectedArray, { status });
      setUndoToken(result.undoToken, new Date(result.undoExpiresAt));
      clearSelection();
      setShowStatusModal(false);
      onOperationComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!enhancement || enhancement.length < 10) {
      setError('Enhancement must be at least 10 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEnhanceProgress({ current: 0, total: selectedArray.length });

    try {
      const result = await bulkApi.aiEnhance(selectedArray, enhancement, context);
      setUndoToken(result.undoToken, new Date(result.undoExpiresAt));
      clearSelection();
      setShowEnhanceModal(false);
      setEnhancement('');
      setContext('');
      setEnhanceProgress(null);
      onOperationComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setIsLoading(false);
      setEnhanceProgress(null);
    }
  };

  const handleUndo = async () => {
    if (!undoToken) return;

    setIsLoading(true);
    setError(null);

    try {
      await bulkApi.undo(undoToken);
      clearUndoToken();
      onOperationComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Undo failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating action bar */}
      <div
        data-testid="bulk-action-bar"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-xl px-4 py-3 flex items-center gap-4 z-50"
      >
        {selectedCount > 0 && (
          <>
            <span
              data-testid="selection-count"
              className="text-sm font-medium text-toucan-grey-100 px-2 py-1 bg-toucan-orange/20 rounded"
            >
              {selectedCount} selected
            </span>

            <div className="h-6 w-px bg-toucan-dark-border" />

            <Button
              data-testid="set-size-button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSizeModal(true)}
              disabled={isLoading}
            >
              <Ruler size={14} className="mr-1.5" />
              Set Size
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStatusModal(true)}
              disabled={isLoading}
            >
              <ClipboardCheck size={14} className="mr-1.5" />
              Set Status
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEnhanceModal(true)}
              disabled={isLoading}
            >
              <Sparkles size={14} className="mr-1.5" />
              AI Enhance
            </Button>

            <div className="h-6 w-px bg-toucan-dark-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={isLoading}
            >
              <X size={14} className="mr-1.5" />
              Clear
            </Button>
          </>
        )}

        {undoToken && (
          <Button
            data-testid="undo-button"
            variant="secondary"
            size="sm"
            onClick={handleUndo}
            disabled={isLoading}
          >
            <Undo2 size={14} className="mr-1.5" />
            Undo
          </Button>
        )}

        {isLoading && <Spinner size="sm" />}
      </div>

      {/* Set Size Modal */}
      <Modal
        isOpen={showSizeModal}
        onClose={() => !isLoading && setShowSizeModal(false)}
        title={`Set Size for ${selectedCount} Items`}
        size="sm"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-2 bg-toucan-error/20 text-toucan-error text-sm rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {SIZES.map((size) => (
              <button
                key={size}
                data-testid={`size-option-${size}`}
                onClick={() => handleSetSize(size)}
                disabled={isLoading}
                className={clsx(
                  'py-3 text-lg font-medium rounded-md transition-colors',
                  'bg-toucan-dark border border-toucan-dark-border',
                  'hover:bg-toucan-orange hover:border-toucan-orange hover:text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Set Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => !isLoading && setShowStatusModal(false)}
        title={`Set Status for ${selectedCount} Items`}
        size="sm"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-2 bg-toucan-error/20 text-toucan-error text-sm rounded">
              {error}
            </div>
          )}
          <div className="space-y-2">
            {STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => handleSetStatus(status.value)}
                disabled={isLoading}
                className={clsx(
                  'w-full py-3 px-4 text-left rounded-md transition-colors',
                  'bg-toucan-dark border border-toucan-dark-border',
                  'hover:bg-toucan-orange hover:border-toucan-orange hover:text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* AI Enhance Modal */}
      <Modal
        isOpen={showEnhanceModal}
        onClose={() => !isLoading && setShowEnhanceModal(false)}
        title={`AI Enhance ${selectedCount} Items`}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowEnhanceModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEnhance}
              disabled={isLoading || enhancement.length < 10}
              loading={isLoading}
            >
              Enhance
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="p-2 bg-toucan-error/20 text-toucan-error text-sm rounded">
              {error}
            </div>
          )}

          {enhanceProgress && (
            <div className="p-3 bg-toucan-dark rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Spinner size="sm" />
                <span className="text-sm text-toucan-grey-200">
                  Enhancing {enhanceProgress.current} of {enhanceProgress.total}...
                </span>
              </div>
              <div className="h-2 bg-toucan-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-toucan-orange transition-all"
                  style={{
                    width: `${(enhanceProgress.current / enhanceProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              What should be added? *
            </label>
            <textarea
              value={enhancement}
              onChange={(e) => setEnhancement(e.target.value)}
              placeholder="e.g., Add security considerations for handling user data"
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent min-h-[100px]"
              disabled={isLoading}
            />
            <p className="text-xs text-toucan-grey-400 mt-1">
              Minimum 10 characters. Each item will receive unique, tailored content.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Project Context (optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Healthcare SaaS application with PHI data"
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
              disabled={isLoading}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
