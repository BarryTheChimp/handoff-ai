import { useState, useEffect } from 'react';
import { Scissors, Lightbulb, Check, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '../atoms/Spinner';
import { Badge, SizeBadge } from '../atoms/Badge';
import { useToastStore } from '../../stores/toastStore';
import type { SizeEstimate } from '../../types/workItem';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface SplitSuggestion {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sizeEstimate: SizeEstimate;
  rationale: string;
}

interface SplitAnalysis {
  originalId: string;
  shouldSplit: boolean;
  reason: string;
  complexity: 'low' | 'medium' | 'high';
  suggestions: SplitSuggestion[];
  splitStrategy: string;
}

interface StorySplitAssistantProps {
  workItemId: string;
  workItemTitle: string;
  currentSize?: SizeEstimate | null;
  onSplitComplete: (newItems: Array<{ id: string; title: string }>) => void;
  onClose: () => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  by_feature: 'Split by Feature',
  by_layer: 'Split by Layer',
  by_workflow: 'Split by Workflow',
  by_data: 'Split by Data Entity',
  by_user: 'Split by User Type',
};

const COMPLEXITY_COLORS: Record<string, string> = {
  low: 'bg-toucan-success/20 text-toucan-success',
  medium: 'bg-toucan-warning/20 text-toucan-warning',
  high: 'bg-toucan-error/20 text-toucan-error',
};

export function StorySplitAssistant({
  workItemId,
  workItemTitle,
  currentSize,
  onSplitComplete,
  onClose,
}: StorySplitAssistantProps) {
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [analysis, setAnalysis] = useState<SplitAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(0);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE}/workitems/${workItemId}/split-analysis`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to analyze story');
        }

        const data = await response.json();
        setAnalysis(data.data);

        // Pre-select all suggestions if split is recommended
        if (data.data.shouldSplit && data.data.suggestions.length > 0) {
          setSelectedSuggestions(new Set(data.data.suggestions.map((_: SplitSuggestion, i: number) => i)));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [workItemId]);

  const handleExecuteSplit = async () => {
    if (!analysis || selectedSuggestions.size === 0) return;

    setExecuting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const suggestions = Array.from(selectedSuggestions).map((i) => analysis.suggestions[i]);

      const response = await fetch(`${API_BASE}/workitems/${workItemId}/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suggestions }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute split');
      }

      const data = await response.json();
      addToast(`Story split into ${data.data.length} new items`, 'success');
      onSplitComplete(data.data);
    } catch (err) {
      addToast('Failed to split story', 'error');
    } finally {
      setExecuting(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-toucan-grey-400">Analyzing story for split opportunities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle size={32} className="mx-auto text-toucan-error mb-4" />
        <p className="text-toucan-error">{error}</p>
        <button onClick={onClose} className="mt-4 text-sm text-toucan-orange hover:underline">
          Close
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-toucan-dark-lighter px-6 py-4 border-b border-toucan-dark-border z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors size={24} className="text-toucan-orange" />
            <div>
              <h2 className="text-lg font-semibold text-toucan-grey-100">Story Split Assistant</h2>
              <p className="text-sm text-toucan-grey-400 truncate max-w-md">{workItemTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentSize && <SizeBadge size={currentSize} badgeSize="md" />}
            <span className={clsx('px-2 py-1 rounded text-xs', COMPLEXITY_COLORS[analysis.complexity])}>
              {analysis.complexity} complexity
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Analysis Summary */}
        <div className={clsx(
          'p-4 rounded-lg border',
          analysis.shouldSplit
            ? 'bg-toucan-warning/10 border-toucan-warning/30'
            : 'bg-toucan-success/10 border-toucan-success/30'
        )}>
          <div className="flex items-start gap-3">
            <Lightbulb size={20} className={analysis.shouldSplit ? 'text-toucan-warning' : 'text-toucan-success'} />
            <div>
              <p className="font-medium text-toucan-grey-100">
                {analysis.shouldSplit ? 'Splitting recommended' : 'No split needed'}
              </p>
              <p className="text-sm text-toucan-grey-300 mt-1">{analysis.reason}</p>
              {analysis.shouldSplit && (
                <Badge variant="default" size="sm" className="mt-2">
                  {STRATEGY_LABELS[analysis.splitStrategy] || analysis.splitStrategy}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {analysis.suggestions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">
              Suggested Split ({analysis.suggestions.length} stories)
            </h3>

            <div className="space-y-3">
              {analysis.suggestions.map((suggestion, index) => {
                const isSelected = selectedSuggestions.has(index);
                const isExpanded = expandedSuggestion === index;

                return (
                  <div
                    key={index}
                    className={clsx(
                      'border rounded-lg transition-all',
                      isSelected
                        ? 'border-toucan-orange bg-toucan-orange/5'
                        : 'border-toucan-dark-border bg-toucan-dark'
                    )}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <button
                        onClick={() => toggleSuggestion(index)}
                        className={clsx(
                          'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-toucan-orange border-toucan-orange'
                            : 'border-toucan-grey-600'
                        )}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </button>

                      <button
                        onClick={() => setExpandedSuggestion(isExpanded ? null : index)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-toucan-grey-500" />
                        ) : (
                          <ChevronRight size={16} className="text-toucan-grey-500" />
                        )}
                        <span className="flex-1 text-sm font-medium text-toucan-grey-100">
                          {suggestion.title}
                        </span>
                        <SizeBadge size={suggestion.sizeEstimate} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-12 pb-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-toucan-grey-500 uppercase mb-1">Description</p>
                          <p className="text-sm text-toucan-grey-300">{suggestion.description}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-toucan-grey-500 uppercase mb-1">
                            Acceptance Criteria
                          </p>
                          <ul className="space-y-1">
                            {suggestion.acceptanceCriteria.map((ac, acIndex) => (
                              <li key={acIndex} className="flex items-start gap-2 text-sm text-toucan-grey-300">
                                <span className="text-toucan-grey-600">•</span>
                                {ac}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2 bg-toucan-dark-lighter rounded text-xs text-toucan-grey-400 italic">
                          {suggestion.rationale}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-toucan-dark-lighter px-6 py-4 border-t border-toucan-dark-border flex items-center justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-toucan-grey-400 hover:text-toucan-grey-200"
        >
          Cancel
        </button>

        {analysis.suggestions.length > 0 && (
          <button
            onClick={handleExecuteSplit}
            disabled={selectedSuggestions.size === 0 || executing}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm',
              selectedSuggestions.size > 0
                ? 'bg-toucan-orange text-white hover:bg-toucan-orange-light'
                : 'bg-toucan-dark-border text-toucan-grey-600 cursor-not-allowed'
            )}
          >
            {executing ? (
              <>
                <Spinner size="sm" />
                Splitting...
              </>
            ) : (
              <>
                <Scissors size={16} />
                Split into {selectedSuggestions.size} stories
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
