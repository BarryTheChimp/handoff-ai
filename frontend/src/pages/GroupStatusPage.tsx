import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Star,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Spinner } from '../components/atoms/Spinner';
import { Modal } from '../components/atoms/Modal';
import { specGroupsApi, type SpecGroupDetails, type SpecConflict, type SpecGroupStatus } from '../services/api';
import { clsx } from 'clsx';

const POLL_INTERVAL = 3000;

const statusConfig: Record<SpecGroupStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'error' | 'success' }> = {
  pending: { label: 'Pending', variant: 'default' },
  analyzing: { label: 'Analyzing...', variant: 'info' },
  conflicts_detected: { label: 'Conflicts Found', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  error: { label: 'Error', variant: 'error' },
};

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-toucan-error', bg: 'bg-toucan-error/20' },
  warning: { icon: AlertCircle, color: 'text-toucan-warning', bg: 'bg-toucan-warning/20' },
  info: { icon: Info, color: 'text-toucan-info', bg: 'bg-toucan-info/20' },
};

function ConflictCard({
  conflict,
  onResolve,
  isExpanded,
  onToggle,
}: {
  conflict: SpecConflict;
  onResolve: (resolution: 'use_spec1' | 'use_spec2' | 'merge' | 'ignore', mergedText?: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [mergeText, setMergeText] = useState(conflict.mergedText || '');
  const [showMergeInput, setShowMergeInput] = useState(false);
  const severity = severityConfig[conflict.severity];
  const SeverityIcon = severity.icon;
  const isResolved = conflict.resolution !== null;

  const handleResolve = (resolution: 'use_spec1' | 'use_spec2' | 'merge' | 'ignore') => {
    if (resolution === 'merge') {
      if (showMergeInput && mergeText.trim()) {
        onResolve('merge', mergeText.trim());
        setShowMergeInput(false);
      } else {
        setShowMergeInput(true);
      }
    } else {
      onResolve(resolution);
    }
  };

  return (
    <div
      data-testid="conflict-card"
      className={clsx(
        'border rounded-lg overflow-hidden transition-colors',
        isResolved
          ? 'border-toucan-success/30 bg-toucan-success/5'
          : 'border-toucan-dark-border bg-toucan-dark-lighter'
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-toucan-dark/30 transition-colors"
      >
        <div className={clsx('p-1.5 rounded', severity.bg)}>
          <SeverityIcon size={16} className={severity.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('text-sm font-medium', severity.color)}>
              {conflict.conflictType.charAt(0).toUpperCase() + conflict.conflictType.slice(1)}
            </span>
            {isResolved && (
              <Badge variant="success" size="sm">
                <Check size={10} className="mr-1" /> Resolved
              </Badge>
            )}
          </div>
          <p className="text-sm text-toucan-grey-200 mt-0.5 line-clamp-2">
            {conflict.description}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown size={20} className="text-toucan-grey-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={20} className="text-toucan-grey-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-toucan-dark-border pt-4">
          {/* Source comparison */}
          <div data-testid="source-panel" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-toucan-dark rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-toucan-grey-400" />
                <span className="text-sm font-medium text-toucan-grey-100">
                  {conflict.spec1.name}
                </span>
              </div>
              <p className="text-xs text-toucan-grey-400 mb-1">{conflict.spec1.section}</p>
              <p className="text-sm text-toucan-grey-200 whitespace-pre-wrap">
                {conflict.spec1.text}
              </p>
            </div>
            <div className="p-3 bg-toucan-dark rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-toucan-grey-400" />
                <span className="text-sm font-medium text-toucan-grey-100">
                  {conflict.spec2.name}
                </span>
              </div>
              <p className="text-xs text-toucan-grey-400 mb-1">{conflict.spec2.section}</p>
              <p className="text-sm text-toucan-grey-200 whitespace-pre-wrap">
                {conflict.spec2.text}
              </p>
            </div>
          </div>

          {/* Merge text input */}
          {showMergeInput && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
                Merged content
              </label>
              <textarea
                value={mergeText}
                onChange={(e) => setMergeText(e.target.value)}
                placeholder="Enter the merged content..."
                className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent min-h-[100px]"
              />
            </div>
          )}

          {/* Resolution buttons */}
          {!isResolved && (
            <div className="flex flex-wrap gap-2">
              <Button
                data-testid="use-doc1-button"
                variant={conflict.resolution === 'use_spec1' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleResolve('use_spec1')}
              >
                Use {conflict.spec1.name}
              </Button>
              <Button
                variant={conflict.resolution === 'use_spec2' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleResolve('use_spec2')}
              >
                Use {conflict.spec2.name}
              </Button>
              <Button
                variant={showMergeInput ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleResolve('merge')}
              >
                {showMergeInput ? 'Confirm Merge' : 'Merge Both'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResolve('ignore')}
              >
                Ignore
              </Button>
            </div>
          )}

          {/* Show current resolution */}
          {isResolved && (
            <div className="text-sm text-toucan-grey-400">
              Resolution: <span className="text-toucan-grey-200 capitalize">{conflict.resolution?.replace('_', ' ')}</span>
              {conflict.mergedText && (
                <div className="mt-2 p-2 bg-toucan-dark rounded text-toucan-grey-200">
                  {conflict.mergedText}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GroupStatusPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<SpecGroupDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;

    try {
      const data = await specGroupsApi.get(groupId);
      setGroup(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  // Initial load
  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  // Poll when analyzing
  useEffect(() => {
    if (group?.status === 'pending' || group?.status === 'analyzing') {
      const interval = setInterval(loadGroup, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [group?.status, loadGroup]);

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'use_spec1' | 'use_spec2' | 'merge' | 'ignore',
    mergedText?: string
  ) => {
    if (!groupId) return;

    setIsResolving(true);
    try {
      const resolutionData: { conflictId: string; resolution: typeof resolution; mergedText?: string } = {
        conflictId,
        resolution,
      };
      if (mergedText !== undefined) {
        resolutionData.mergedText = mergedText;
      }
      await specGroupsApi.resolveConflicts(groupId, [resolutionData]);
      await loadGroup();
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!groupId) return;

    try {
      await specGroupsApi.analyze(groupId);
      await loadGroup();
    } catch (err) {
      console.error('Failed to retry analysis:', err);
    }
  };

  const handleDelete = async () => {
    if (!groupId) return;

    try {
      await specGroupsApi.delete(groupId);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const handleDownloadContext = () => {
    if (!group?.stitchedContext) return;

    const blob = new Blob([group.stitchedContext], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-unified.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-toucan-error" size={48} />
          <p className="text-toucan-grey-100 font-medium mb-2">Failed to load spec group</p>
          <p className="text-toucan-grey-400 text-sm mb-4">{error}</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[group.status];
  const unresolvedConflicts = group.conflicts.filter(c => c.resolution === null);

  return (
    <div className="min-h-screen bg-toucan-dark">
      {/* Header */}
      <header className="border-b border-toucan-dark-border bg-toucan-dark-lighter">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-toucan-grey-400 hover:text-toucan-grey-100 hover:bg-toucan-dark rounded-md transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-toucan-grey-100">{group.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge data-testid="status-badge" variant={status.variant}>
                    {(group.status === 'pending' || group.status === 'analyzing') && (
                      <Spinner size="sm" className="mr-1.5" />
                    )}
                    {status.label}
                  </Badge>
                  <span className="text-xs text-toucan-grey-400">
                    {group.specs.length} documents
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {group.status === 'error' && (
                <Button variant="secondary" size="sm" onClick={handleRetryAnalysis}>
                  <RefreshCw size={14} className="mr-1.5" /> Retry
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} className="mr-1.5" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error message */}
        {group.status === 'error' && group.errorMessage && (
          <div className="mb-6 p-4 bg-toucan-error/20 border border-toucan-error rounded-lg">
            <div className="flex items-center gap-2 text-toucan-error">
              <AlertCircle size={16} />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-toucan-grey-200 mt-1">{group.errorMessage}</p>
          </div>
        )}

        {/* Analyzing state */}
        {(group.status === 'pending' || group.status === 'analyzing') && (
          <div className="text-center py-12">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-toucan-grey-100 font-medium">
              {group.status === 'pending' ? 'Preparing documents...' : 'Analyzing for conflicts...'}
            </p>
            <p className="text-sm text-toucan-grey-400 mt-1">
              This may take up to 60 seconds
            </p>
          </div>
        )}

        {/* Document list */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4">Documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.specs.map(spec => (
              <div
                key={spec.id}
                className={clsx(
                  'p-4 rounded-lg border',
                  spec.isPrimary
                    ? 'border-toucan-orange/30 bg-toucan-orange/5'
                    : 'border-toucan-dark-border bg-toucan-dark-lighter'
                )}
              >
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-toucan-grey-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-toucan-grey-100 truncate">
                        {spec.name}
                      </span>
                      {spec.isPrimary && (
                        <Star size={12} className="text-toucan-orange" fill="currentColor" />
                      )}
                    </div>
                    <p className="text-xs text-toucan-grey-400 mt-0.5">
                      {spec.fileType.toUpperCase()} • {spec.sectionCount} sections
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conflicts section */}
        {group.status === 'conflicts_detected' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-toucan-grey-100">
                Conflicts ({group.conflictSummary.unresolved} remaining)
              </h2>
              <div className="flex items-center gap-4 text-sm">
                {(group.conflictSummary.bySeverity.critical ?? 0) > 0 && (
                  <span className="text-toucan-error">
                    {group.conflictSummary.bySeverity.critical} critical
                  </span>
                )}
                {(group.conflictSummary.bySeverity.warning ?? 0) > 0 && (
                  <span className="text-toucan-warning">
                    {group.conflictSummary.bySeverity.warning} warnings
                  </span>
                )}
                {(group.conflictSummary.bySeverity.info ?? 0) > 0 && (
                  <span className="text-toucan-info">
                    {group.conflictSummary.bySeverity.info} info
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-toucan-grey-400">Resolution progress</span>
                <span className="text-toucan-grey-200">
                  {group.conflictSummary.resolved} / {group.conflictSummary.total}
                </span>
              </div>
              <div className="h-2 bg-toucan-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-toucan-success transition-all duration-300"
                  style={{
                    width: `${(group.conflictSummary.resolved / group.conflictSummary.total) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Conflict list */}
            <div className="space-y-3">
              {/* Unresolved first */}
              {unresolvedConflicts.map(conflict => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={(resolution, mergedText) =>
                    handleResolveConflict(conflict.id, resolution, mergedText)
                  }
                  isExpanded={expandedConflict === conflict.id}
                  onToggle={() =>
                    setExpandedConflict(expandedConflict === conflict.id ? null : conflict.id)
                  }
                />
              ))}
              {/* Resolved ones */}
              {group.conflicts
                .filter(c => c.resolution !== null)
                .map(conflict => (
                  <ConflictCard
                    key={conflict.id}
                    conflict={conflict}
                    onResolve={(resolution, mergedText) =>
                      handleResolveConflict(conflict.id, resolution, mergedText)
                    }
                    isExpanded={expandedConflict === conflict.id}
                    onToggle={() =>
                      setExpandedConflict(expandedConflict === conflict.id ? null : conflict.id)
                    }
                  />
                ))}
            </div>
          </div>
        )}

        {/* Ready state - no conflicts or all resolved */}
        {group.status === 'ready' && (
          <div className="mb-8">
            <div className="p-6 bg-toucan-success/10 border border-toucan-success/30 rounded-lg text-center">
              <Check size={32} className="mx-auto mb-3 text-toucan-success" />
              <p className="text-toucan-grey-100 font-medium mb-1">
                {group.conflictSummary.total === 0
                  ? 'No conflicts detected'
                  : 'All conflicts resolved'}
              </p>
              <p className="text-sm text-toucan-grey-400 mb-4">
                Your unified specification is ready
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="secondary" onClick={() => setShowPreview(true)}>
                  Preview Unified Spec
                </Button>
                <Button variant="primary" onClick={handleDownloadContext}>
                  <Download size={14} className="mr-1.5" /> Download
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resolving overlay */}
        {isResolving && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <Spinner size="lg" />
          </div>
        )}
      </main>

      {/* Preview modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Unified Specification Preview"
        size="lg"
      >
        <div data-testid="stitched-preview" className="prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-toucan-grey-200 bg-toucan-dark p-4 rounded-lg overflow-auto max-h-[60vh]">
            {group.stitchedContext || 'No content available'}
          </pre>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Spec Group"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-toucan-grey-200">
          Are you sure you want to delete "{group.name}"? This will not delete the individual
          spec documents, but will remove the group and all conflict resolutions.
        </p>
      </Modal>
    </div>
  );
}
