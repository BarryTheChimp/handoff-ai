import { useState, useEffect } from 'react';
import { Copy, GitMerge, Eye, AlertTriangle, Check, X, ChevronRight, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '../atoms/Spinner';
import { Badge } from '../atoms/Badge';
import { useToastStore } from '../../stores/toastStore';

interface DuplicatePair {
  item1Id: string;
  item1Title: string;
  item2Id: string;
  item2Title: string;
  similarity: number;
  duplicateType: 'exact' | 'near' | 'overlapping' | 'related';
  sharedConcepts: string[];
  recommendation: 'merge' | 'keep_both' | 'review';
  explanation: string;
}

interface DuplicateReport {
  specId: string;
  analyzedCount: number;
  duplicatesFound: number;
  pairs: DuplicatePair[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface DuplicateDetectorProps {
  specId: string;
  onItemClick: (itemId: string) => void;
  onMergeComplete: () => void;
  className?: string;
}

const DUPLICATE_TYPE_COLORS: Record<string, string> = {
  exact: 'bg-toucan-error/20 text-toucan-error border-toucan-error/30',
  near: 'bg-toucan-warning/20 text-toucan-warning border-toucan-warning/30',
  overlapping: 'bg-toucan-info/20 text-toucan-info border-toucan-info/30',
  related: 'bg-toucan-grey-600/20 text-toucan-grey-400 border-toucan-grey-600/30',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-toucan-success text-white',
  medium: 'bg-toucan-warning text-toucan-dark',
  high: 'bg-toucan-error text-white',
};

export function DuplicateDetector({
  specId,
  onItemClick,
  onMergeComplete,
  className,
}: DuplicateDetectorProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DuplicateReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [merging, setMerging] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const addToast = useToastStore((state) => state.addToast);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/specs/${specId}/duplicates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to detect duplicates');
      }

      const data = await response.json();
      setReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [specId]);

  const handleMerge = async (pair: DuplicatePair) => {
    setMerging(true);

    try {
      const token = localStorage.getItem('auth_token');

      // First, get AI analysis for merged content
      const analyzeResponse = await fetch(`/api/specs/${specId}/duplicates/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pair }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze pair');
      }

      const analysis = await analyzeResponse.json();

      if (!analysis.data.isTrueDuplicate) {
        addToast('AI determined these are not true duplicates', 'info');
        setSelectedPair(null);
        return;
      }

      // Execute merge
      const mergeResponse = await fetch('/api/workitems/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          item1Id: pair.item1Id,
          item2Id: pair.item2Id,
          mergedData: {
            title: analysis.data.mergedTitle || pair.item1Title,
            description: analysis.data.mergedDescription || '',
            acceptanceCriteria: analysis.data.mergedAC || [],
          },
        }),
      });

      if (!mergeResponse.ok) {
        throw new Error('Failed to merge items');
      }

      addToast('Items merged successfully', 'success');
      setSelectedPair(null);
      fetchReport(); // Refresh
      onMergeComplete();
    } catch (err) {
      addToast('Failed to merge items', 'error');
    } finally {
      setMerging(false);
    }
  };

  const handleDismiss = (pair: DuplicatePair) => {
    const key = `${pair.item1Id}-${pair.item2Id}`;
    setDismissed((prev) => new Set([...prev, key]));
  };

  const filteredPairs = report?.pairs.filter((pair) => {
    const key = `${pair.item1Id}-${pair.item2Id}`;
    return !dismissed.has(key);
  }) || [];

  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center py-12', className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <AlertTriangle size={32} className="mx-auto text-toucan-error mb-4" />
        <p className="text-toucan-error">{error}</p>
        <button onClick={fetchReport} className="mt-4 text-sm text-toucan-orange hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className={className}>
      {/* Summary Header */}
      <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Copy size={24} className="text-toucan-orange" />
            <div>
              <h2 className="text-lg font-medium text-toucan-grey-100">Duplicate Detection</h2>
              <p className="text-sm text-toucan-grey-400">
                Analyzed {report.analyzedCount} items, found {filteredPairs.length} potential duplicates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', RISK_COLORS[report.riskLevel])}>
              {report.riskLevel.toUpperCase()} RISK
            </span>
            <button
              onClick={fetchReport}
              className="p-2 text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark rounded-md"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Pairs List */}
      {filteredPairs.length === 0 ? (
        <div className="text-center py-8 text-toucan-grey-500">
          <Check size={32} className="mx-auto text-toucan-success mb-2" />
          No duplicates detected
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPairs.map((pair) => (
            <div
              key={`${pair.item1Id}-${pair.item2Id}`}
              className={clsx(
                'border rounded-lg overflow-hidden',
                DUPLICATE_TYPE_COLORS[pair.duplicateType]
              )}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" size="sm" className="capitalize">
                        {pair.duplicateType}
                      </Badge>
                      <span className="text-sm text-toucan-grey-400">
                        {Math.round(pair.similarity * 100)}% similar
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => onItemClick(pair.item1Id)}
                        className="text-toucan-grey-100 hover:text-toucan-orange truncate max-w-[200px]"
                      >
                        {pair.item1Title}
                      </button>
                      <ChevronRight size={14} className="text-toucan-grey-600 flex-shrink-0" />
                      <button
                        onClick={() => onItemClick(pair.item2Id)}
                        className="text-toucan-grey-100 hover:text-toucan-orange truncate max-w-[200px]"
                      >
                        {pair.item2Title}
                      </button>
                    </div>

                    {pair.sharedConcepts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pair.sharedConcepts.map((concept, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-toucan-dark rounded text-xs text-toucan-grey-400"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pair.recommendation === 'merge' && (
                      <button
                        onClick={() => setSelectedPair(pair)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-toucan-orange text-white rounded-md text-sm hover:bg-toucan-orange-light"
                      >
                        <GitMerge size={14} />
                        Merge
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPair(pair)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-toucan-dark text-toucan-grey-200 rounded-md text-sm hover:bg-toucan-dark-border"
                    >
                      <Eye size={14} />
                      Review
                    </button>
                    <button
                      onClick={() => handleDismiss(pair)}
                      className="p-1.5 text-toucan-grey-500 hover:text-toucan-grey-300"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-xs text-toucan-grey-400">{pair.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Pair Detail Modal */}
      {selectedPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-2xl bg-toucan-dark-lighter border border-toucan-dark-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-toucan-dark-border">
              <h3 className="font-medium text-toucan-grey-100">Review Duplicate</h3>
              <button
                onClick={() => setSelectedPair(null)}
                className="p-1 text-toucan-grey-400 hover:text-toucan-grey-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-toucan-dark rounded-lg">
                  <h4 className="text-sm font-medium text-toucan-grey-200 mb-2">Item 1</h4>
                  <p className="text-sm text-toucan-grey-100">{selectedPair.item1Title}</p>
                </div>
                <div className="p-3 bg-toucan-dark rounded-lg">
                  <h4 className="text-sm font-medium text-toucan-grey-200 mb-2">Item 2</h4>
                  <p className="text-sm text-toucan-grey-100">{selectedPair.item2Title}</p>
                </div>
              </div>

              <div className="p-3 bg-toucan-dark rounded-lg">
                <h4 className="text-sm font-medium text-toucan-grey-200 mb-2">Analysis</h4>
                <p className="text-sm text-toucan-grey-300">{selectedPair.explanation}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-toucan-dark-border">
              <button
                onClick={() => {
                  handleDismiss(selectedPair);
                  setSelectedPair(null);
                }}
                className="px-4 py-2 text-sm text-toucan-grey-400 hover:text-toucan-grey-200"
              >
                Keep Both
              </button>
              <button
                onClick={() => handleMerge(selectedPair)}
                disabled={merging}
                className="flex items-center gap-2 px-4 py-2 bg-toucan-orange text-white rounded-md text-sm hover:bg-toucan-orange-light disabled:opacity-50"
              >
                {merging ? (
                  <>
                    <Spinner size="sm" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge size={14} />
                    Merge Items
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
