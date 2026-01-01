import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Clock,
  FileText,
  Layers,
  HelpCircle,
  RefreshCw,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '../atoms/Spinner';
import { Badge } from '../atoms/Badge';
import { ProgressBar } from '../atoms/ProgressBar';

interface SpecMetrics {
  wordCount: number;
  sectionCount: number;
  estimatedStories: number;
  estimatedEpics: number;
  complexityScore: number;
  readabilityScore: number;
}

interface SpecIssue {
  type: 'warning' | 'error' | 'info';
  category: string;
  location?: string;
  message: string;
  suggestion?: string;
}

interface SpecRecommendation {
  priority: 'high' | 'medium' | 'low';
  type: string;
  section?: string;
  message: string;
  impact: string;
}

interface TranslationReadiness {
  score: number;
  status: 'ready' | 'needs_review' | 'not_ready';
  blockers: string[];
  warnings: string[];
}

interface Analysis {
  specId: string;
  analyzedAt: string;
  metrics: SpecMetrics;
  issues: SpecIssue[];
  recommendations: SpecRecommendation[];
  readiness: TranslationReadiness;
  estimatedTranslationTime: string;
  suggestedQuestions: string[];
}

interface PreTranslationAnalysisProps {
  specId: string;
  onProceed: () => void;
  onCancel: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  ready: {
    icon: CheckCircle,
    color: 'text-toucan-success',
    bgColor: 'bg-toucan-success/20',
    label: 'Ready for Translation',
  },
  needs_review: {
    icon: AlertTriangle,
    color: 'text-toucan-warning',
    bgColor: 'bg-toucan-warning/20',
    label: 'Needs Review',
  },
  not_ready: {
    icon: XCircle,
    color: 'text-toucan-error',
    bgColor: 'bg-toucan-error/20',
    label: 'Not Ready',
  },
};

export function PreTranslationAnalysis({
  specId,
  onProceed,
  onCancel,
  className,
}: PreTranslationAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState(false);
  const [expandedRecs, setExpandedRecs] = useState(false);

  const fetchAnalysis = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const url = refresh
        ? `/api/specs/${specId}/analysis/refresh`
        : `/api/specs/${specId}/analysis`;
      const method = refresh ? 'POST' : 'GET';

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to analyze spec');

      const data = await response.json();
      setAnalysis(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [specId]);

  if (loading) {
    return (
      <div className={clsx('p-8 text-center', className)}>
        <Spinner size="lg" />
        <p className="mt-4 text-toucan-grey-400">Analyzing specification...</p>
        <p className="text-sm text-toucan-grey-500 mt-1">
          This may take a moment for large documents
        </p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className={clsx('p-8 text-center', className)}>
        <XCircle size={40} className="mx-auto text-toucan-error mb-4" />
        <p className="text-toucan-error mb-4">{error || 'Analysis failed'}</p>
        <button
          onClick={() => fetchAnalysis()}
          className="text-sm text-toucan-orange hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[analysis.readiness.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className={clsx('max-h-[80vh] overflow-y-auto', className)}>
      {/* Header */}
      <div className="sticky top-0 bg-toucan-dark-lighter px-6 py-4 border-b border-toucan-dark-border z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-toucan-grey-100">Pre-Translation Analysis</h2>
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={refreshing}
            className="p-2 text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark rounded-md"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Readiness Status */}
        <div className={clsx('p-4 rounded-lg', statusConfig.bgColor)}>
          <div className="flex items-center gap-3">
            <StatusIcon size={24} className={statusConfig.color} />
            <div className="flex-1">
              <p className={clsx('font-medium', statusConfig.color)}>{statusConfig.label}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1">
                  <ProgressBar
                    progress={analysis.readiness.score}
                    size="md"
                    variant={
                      analysis.readiness.status === 'ready'
                        ? 'success'
                        : analysis.readiness.status === 'needs_review'
                        ? 'warning'
                        : 'error'
                    }
                  />
                </div>
                <span className="text-sm font-medium text-toucan-grey-200">
                  {analysis.readiness.score}%
                </span>
              </div>
            </div>
          </div>

          {/* Blockers */}
          {analysis.readiness.blockers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-toucan-error/30">
              <p className="text-sm font-medium text-toucan-error mb-2">Blockers:</p>
              <ul className="space-y-1">
                {analysis.readiness.blockers.map((blocker, i) => (
                  <li key={i} className="text-sm text-toucan-grey-300 flex items-start gap-2">
                    <XCircle size={14} className="text-toucan-error mt-0.5 flex-shrink-0" />
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-toucan-dark p-4 rounded-lg">
            <div className="flex items-center gap-2 text-toucan-grey-400 mb-2">
              <FileText size={16} />
              <span className="text-xs uppercase">Content</span>
            </div>
            <p className="text-2xl font-bold text-toucan-grey-100">
              {analysis.metrics.wordCount.toLocaleString()}
            </p>
            <p className="text-xs text-toucan-grey-500">words</p>
          </div>

          <div className="bg-toucan-dark p-4 rounded-lg">
            <div className="flex items-center gap-2 text-toucan-grey-400 mb-2">
              <Layers size={16} />
              <span className="text-xs uppercase">Estimated Output</span>
            </div>
            <p className="text-2xl font-bold text-toucan-grey-100">
              ~{analysis.metrics.estimatedStories}
            </p>
            <p className="text-xs text-toucan-grey-500">stories</p>
          </div>

          <div className="bg-toucan-dark p-4 rounded-lg">
            <div className="flex items-center gap-2 text-toucan-grey-400 mb-2">
              <Clock size={16} />
              <span className="text-xs uppercase">Est. Time</span>
            </div>
            <p className="text-2xl font-bold text-toucan-grey-100">
              {analysis.estimatedTranslationTime.split(' ')[0]}
            </p>
            <p className="text-xs text-toucan-grey-500">
              {analysis.estimatedTranslationTime.split(' ').slice(1).join(' ')}
            </p>
          </div>
        </div>

        {/* Complexity & Readability */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-toucan-dark p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-toucan-grey-400">Complexity</span>
              <span className="text-sm font-medium text-toucan-grey-200">
                {analysis.metrics.complexityScore}/10
              </span>
            </div>
            <ProgressBar
              progress={analysis.metrics.complexityScore * 10}
              size="sm"
              variant={
                analysis.metrics.complexityScore <= 4
                  ? 'success'
                  : analysis.metrics.complexityScore <= 7
                  ? 'warning'
                  : 'error'
              }
            />
          </div>

          <div className="bg-toucan-dark p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-toucan-grey-400">Readability</span>
              <span className="text-sm font-medium text-toucan-grey-200">
                {analysis.metrics.readabilityScore}/10
              </span>
            </div>
            <ProgressBar
              progress={analysis.metrics.readabilityScore * 10}
              size="sm"
              variant={
                analysis.metrics.readabilityScore >= 7
                  ? 'success'
                  : analysis.metrics.readabilityScore >= 5
                  ? 'warning'
                  : 'error'
              }
            />
          </div>
        </div>

        {/* Issues */}
        {analysis.issues.length > 0 && (
          <div className="border border-toucan-dark-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedIssues(!expandedIssues)}
              className="w-full flex items-center justify-between p-4 bg-toucan-dark/50 hover:bg-toucan-dark"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-toucan-warning" />
                <span className="font-medium text-toucan-grey-100">
                  Issues Found ({analysis.issues.length})
                </span>
              </div>
              <ChevronRight
                size={16}
                className={clsx(
                  'text-toucan-grey-500 transition-transform',
                  expandedIssues && 'rotate-90'
                )}
              />
            </button>

            {expandedIssues && (
              <div className="divide-y divide-toucan-dark-border">
                {analysis.issues.map((issue, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      {issue.type === 'error' ? (
                        <XCircle size={16} className="text-toucan-error mt-0.5" />
                      ) : issue.type === 'warning' ? (
                        <AlertTriangle size={16} className="text-toucan-warning mt-0.5" />
                      ) : (
                        <Lightbulb size={16} className="text-toucan-info mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-toucan-grey-100">{issue.message}</p>
                        {issue.location && (
                          <p className="text-xs text-toucan-grey-500 mt-1">
                            Location: {issue.location}
                          </p>
                        )}
                        {issue.suggestion && (
                          <p className="text-xs text-toucan-grey-400 mt-1 italic">
                            Suggestion: {issue.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="border border-toucan-dark-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedRecs(!expandedRecs)}
              className="w-full flex items-center justify-between p-4 bg-toucan-dark/50 hover:bg-toucan-dark"
            >
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-toucan-orange" />
                <span className="font-medium text-toucan-grey-100">
                  Recommendations ({analysis.recommendations.length})
                </span>
              </div>
              <ChevronRight
                size={16}
                className={clsx(
                  'text-toucan-grey-500 transition-transform',
                  expandedRecs && 'rotate-90'
                )}
              />
            </button>

            {expandedRecs && (
              <div className="divide-y divide-toucan-dark-border">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <Badge
                        variant={
                          rec.priority === 'high'
                            ? 'error'
                            : rec.priority === 'medium'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {rec.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm text-toucan-grey-100">{rec.message}</p>
                        <p className="text-xs text-toucan-grey-400 mt-1">{rec.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggested Questions */}
        {analysis.suggestedQuestions.length > 0 && (
          <div className="bg-toucan-dark p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle size={16} className="text-toucan-info" />
              <span className="text-sm font-medium text-toucan-grey-200">
                Consider clarifying:
              </span>
            </div>
            <ul className="space-y-2">
              {analysis.suggestedQuestions.map((q, i) => (
                <li key={i} className="text-sm text-toucan-grey-300 flex items-start gap-2">
                  <span className="text-toucan-grey-600">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-toucan-dark-lighter px-6 py-4 border-t border-toucan-dark-border flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-toucan-grey-400 hover:text-toucan-grey-200"
        >
          Cancel
        </button>

        <button
          onClick={onProceed}
          disabled={analysis.readiness.status === 'not_ready'}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm',
            analysis.readiness.status === 'not_ready'
              ? 'bg-toucan-dark-border text-toucan-grey-600 cursor-not-allowed'
              : 'bg-toucan-orange text-white hover:bg-toucan-orange-light'
          )}
        >
          {analysis.readiness.status === 'not_ready' ? (
            'Fix Blockers First'
          ) : (
            <>
              Proceed to Translation
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
