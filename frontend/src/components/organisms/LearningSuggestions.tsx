import { useState, useEffect } from 'react';
import { Lightbulb, Check, X, TrendingUp, AlertCircle } from 'lucide-react';
import { learningApi, type LearnedPattern, type LearningStats } from '../../services/api';

// =============================================================================
// TYPES
// =============================================================================

interface LearningSuggestionsProps {
  projectId: string;
  showStats?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LearningSuggestions({ projectId, showStats = false }: LearningSuggestionsProps) {
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [patternsData, statsData] = await Promise.all([
        learningApi.getPendingPatterns(projectId),
        showStats ? learningApi.getStats(projectId) : Promise.resolve(null),
      ]);
      setPatterns(patternsData);
      if (statsData) setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAccept(patternId: string) {
    setActionInProgress(patternId);
    try {
      await learningApi.acceptPattern(projectId, patternId);
      setPatterns(patterns.filter(p => p.id !== patternId));
    } catch (err) {
      console.error('Failed to accept pattern:', err);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleDismiss(patternId: string) {
    setActionInProgress(patternId);
    try {
      await learningApi.dismissPattern(projectId, patternId);
      setDismissed(new Set([...dismissed, patternId]));
    } catch (err) {
      console.error('Failed to dismiss pattern:', err);
    } finally {
      setActionInProgress(null);
    }
  }

  // Filter out dismissed patterns
  const visiblePatterns = patterns.filter(p => !dismissed.has(p.id));

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-toucan-grey-400">
          <div className="animate-spin h-4 w-4 border-2 border-toucan-orange border-t-transparent rounded-full" />
          <span>Loading learning insights...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-toucan-dark-lighter border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No suggestions
  if (visiblePatterns.length === 0 && !showStats) {
    return null; // Don't show anything if no suggestions
  }

  return (
    <div className="space-y-4">
      {/* Stats Panel */}
      {showStats && stats && (
        <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-toucan-orange" />
            <span className="font-medium text-toucan-grey-100">Learning Stats</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-toucan-grey-100">{stats.totalEdits}</div>
              <div className="text-xs text-toucan-grey-400">Total Edits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-toucan-grey-100">{stats.editsThisWeek}</div>
              <div className="text-xs text-toucan-grey-400">This Week</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-toucan-grey-100">{stats.patternsDetected}</div>
              <div className="text-xs text-toucan-grey-400">Patterns Found</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.patternsApplied}</div>
              <div className="text-xs text-toucan-grey-400">Applied</div>
            </div>
          </div>
          {stats.topEditedFields.length > 0 && (
            <div className="mt-4 pt-4 border-t border-toucan-dark-border">
              <div className="text-xs text-toucan-grey-400 mb-2">Top Edited Fields</div>
              <div className="flex flex-wrap gap-2">
                {stats.topEditedFields.map(field => (
                  <span
                    key={field.field}
                    className="px-2 py-1 bg-toucan-dark rounded text-xs text-toucan-grey-200"
                  >
                    {field.field}: {field.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestions Panel */}
      {visiblePatterns.length > 0 && (
        <div className="bg-gradient-to-r from-toucan-orange/10 to-transparent border border-toucan-orange/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-toucan-orange" />
            <span className="text-sm font-medium text-toucan-grey-200">
              Learning Suggestions
            </span>
            <span className="text-xs text-toucan-grey-400">
              ({visiblePatterns.length} available)
            </span>
          </div>

          <div className="space-y-3">
            {visiblePatterns.slice(0, 3).map((pattern) => (
              <div key={pattern.id} className="bg-toucan-dark rounded-lg p-3">
                <p className="text-sm text-toucan-grey-200">{pattern.description}</p>
                <p className="text-xs text-toucan-grey-400 mt-1">
                  <span className="font-medium">Suggestion:</span> {pattern.suggestion}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleAccept(pattern.id)}
                    disabled={actionInProgress === pattern.id}
                    className="flex items-center gap-1 text-xs px-3 py-1 bg-toucan-orange/20 text-toucan-orange rounded hover:bg-toucan-orange/30 disabled:opacity-50"
                  >
                    {actionInProgress === pattern.id ? (
                      <div className="animate-spin h-3 w-3 border-2 border-toucan-orange border-t-transparent rounded-full" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    <span>Apply</span>
                  </button>
                  <button
                    onClick={() => handleDismiss(pattern.id)}
                    disabled={actionInProgress === pattern.id}
                    className="flex items-center gap-1 text-xs px-3 py-1 text-toucan-grey-500 hover:text-toucan-grey-300 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                    <span>Dismiss</span>
                  </button>
                  <span className="text-xs text-toucan-grey-600 ml-auto flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      pattern.confidence >= 0.7 ? 'bg-green-500' :
                      pattern.confidence >= 0.5 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    }`} />
                    {Math.round(pattern.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>

          {visiblePatterns.length > 3 && (
            <p className="text-xs text-toucan-grey-500 mt-3 text-center">
              +{visiblePatterns.length - 3} more suggestions
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT FOR SIDEBAR
// =============================================================================

interface CompactLearningSuggestionsProps {
  projectId: string;
  onHasSuggestions?: (count: number) => void;
}

export function CompactLearningSuggestions({ projectId, onHasSuggestions }: CompactLearningSuggestionsProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    learningApi.getPendingPatterns(projectId)
      .then(patterns => {
        setCount(patterns.length);
        onHasSuggestions?.(patterns.length);
      })
      .catch(() => setCount(0));
  }, [projectId, onHasSuggestions]);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-toucan-orange/10 border border-toucan-orange/20 rounded-lg">
      <Lightbulb className="h-4 w-4 text-toucan-orange" />
      <span className="text-sm text-toucan-grey-200">
        {count} learning suggestion{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
