import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  MessageSquare,
  Heart,
  Calculator,
  Minimize2,
  ClipboardCheck
} from 'lucide-react';
import { Spinner } from '../atoms/Spinner';
import { investApi, InvestScore, CriterionScore } from '../../services/api';

interface InvestScoreCardProps {
  workItemId: string;
  workItemType: string;
  compact?: boolean;
}

const criteriaConfig = {
  independent: { label: 'Independent', icon: Target, description: 'Can be developed separately' },
  negotiable: { label: 'Negotiable', icon: MessageSquare, description: 'Details can be discussed' },
  valuable: { label: 'Valuable', icon: Heart, description: 'Delivers value to stakeholders' },
  estimable: { label: 'Estimable', icon: Calculator, description: 'Can be sized/estimated' },
  small: { label: 'Small', icon: Minimize2, description: 'Fits in a sprint' },
  testable: { label: 'Testable', icon: ClipboardCheck, description: 'Has clear acceptance criteria' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-toucan-success';
  if (score >= 60) return 'text-toucan-warning';
  return 'text-toucan-error';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-toucan-success/20';
  if (score >= 60) return 'bg-toucan-warning/20';
  return 'bg-toucan-error/20';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-toucan-success';
  if (score >= 60) return 'bg-toucan-warning';
  return 'bg-toucan-error';
}

function CriterionRow({
  name,
  criterion,
  expanded
}: {
  name: keyof typeof criteriaConfig;
  criterion: CriterionScore;
  expanded: boolean;
}) {
  const config = criteriaConfig[name];
  const Icon = config.icon;

  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-toucan-grey-400 flex-shrink-0" />
        <span className="text-sm text-toucan-grey-200 flex-1">{config.label}</span>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-toucan-dark-border rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all', getScoreBarColor(criterion.score))}
              style={{ width: `${criterion.score}%` }}
            />
          </div>
          <span className={clsx('text-xs font-medium w-8 text-right', getScoreColor(criterion.score))}>
            {criterion.score}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="mt-1 ml-6 text-xs text-toucan-grey-400">
          <p>{criterion.reason}</p>
          {criterion.tips && criterion.tips.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {criterion.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-1">
                  <Lightbulb size={10} className="text-toucan-warning mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function InvestScoreCard({ workItemId, workItemType, compact = false }: InvestScoreCardProps) {
  const [score, setScore] = useState<InvestScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Only show for stories
  if (workItemType !== 'story') {
    return null;
  }

  useEffect(() => {
    async function loadScore() {
      try {
        setLoading(true);
        setError(null);
        const data = await investApi.getScore(workItemId);
        setScore(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      } finally {
        setLoading(false);
      }
    }
    loadScore();
  }, [workItemId]);

  if (loading) {
    return (
      <div className="p-3 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-sm text-toucan-grey-400">Calculating quality score...</span>
        </div>
      </div>
    );
  }

  if (error || !score) {
    return null; // Silently fail - don't block the UI
  }

  if (compact) {
    return (
      <div
        className={clsx(
          'flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer',
          getScoreBgColor(score.overall)
        )}
        onClick={() => setExpanded(!expanded)}
        title={`INVEST Score: ${score.overall}/100`}
      >
        {score.overall >= 70 ? (
          <CheckCircle size={14} className={getScoreColor(score.overall)} />
        ) : (
          <AlertCircle size={14} className={getScoreColor(score.overall)} />
        )}
        <span className={clsx('text-xs font-medium', getScoreColor(score.overall))}>
          {score.overall}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-toucan-dark/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            getScoreBgColor(score.overall)
          )}>
            <span className={clsx('text-lg font-bold', getScoreColor(score.overall))}>
              {score.overall}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-toucan-grey-100">INVEST Score</p>
            <p className="text-xs text-toucan-grey-400">
              {score.overall >= 80 ? 'Excellent' : score.overall >= 60 ? 'Good' : 'Needs improvement'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-toucan-grey-400" />
        ) : (
          <ChevronDown size={18} className="text-toucan-grey-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-toucan-dark-border">
          {/* Criteria breakdown */}
          <div className="mt-3 divide-y divide-toucan-dark-border">
            <CriterionRow name="independent" criterion={score.independent} expanded={expanded} />
            <CriterionRow name="negotiable" criterion={score.negotiable} expanded={expanded} />
            <CriterionRow name="valuable" criterion={score.valuable} expanded={expanded} />
            <CriterionRow name="estimable" criterion={score.estimable} expanded={expanded} />
            <CriterionRow name="small" criterion={score.small} expanded={expanded} />
            <CriterionRow name="testable" criterion={score.testable} expanded={expanded} />
          </div>

          {/* Top suggestions */}
          {score.suggestions.length > 0 && (
            <div className="mt-4 p-3 bg-toucan-dark rounded-lg">
              <p className="text-xs font-medium text-toucan-grey-200 mb-2 flex items-center gap-1">
                <Lightbulb size={12} className="text-toucan-warning" />
                Suggestions to improve
              </p>
              <ul className="space-y-1">
                {score.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-xs text-toucan-grey-400 flex items-start gap-2">
                    <span className="text-toucan-grey-600">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
