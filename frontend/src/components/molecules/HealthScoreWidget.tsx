import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { healthApi, type HealthResult, type HealthLevel } from '../../services/api';

// =============================================================================
// TYPES
// =============================================================================

interface HealthScoreWidgetProps {
  projectId: string;
  showRecommendations?: boolean;
  compact?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LEVEL_COLORS: Record<HealthLevel, string> = {
  minimal: 'text-red-400',
  basic: 'text-yellow-400',
  good: 'text-green-400',
  excellent: 'text-toucan-orange',
};

const LEVEL_BG_COLORS: Record<HealthLevel, string> = {
  minimal: 'stroke-red-400',
  basic: 'stroke-yellow-400',
  good: 'stroke-green-400',
  excellent: 'stroke-toucan-orange',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function HealthScoreWidget({ projectId, showRecommendations = true, compact = false }: HealthScoreWidgetProps) {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHealth();
  }, [projectId]);

  async function loadHealth() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await healthApi.getHealth(projectId);
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health score');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const data = await healthApi.recalculate(projectId);
      setHealth(data);
    } catch (err) {
      console.error('Failed to recalculate:', err);
    } finally {
      setIsRefreshing(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-toucan-grey-400">
          <div className="animate-spin h-4 w-4 border-2 border-toucan-orange border-t-transparent rounded-full" />
          <span>Loading health score...</span>
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

  if (!health) return null;

  // Compact version
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
        <div className="relative w-10 h-10">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              strokeWidth="4"
              className="stroke-toucan-dark"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              strokeWidth="4"
              strokeDasharray={100.5}
              strokeDashoffset={100.5 * (1 - health.score / 100)}
              className={LEVEL_BG_COLORS[health.level]}
            />
          </svg>
        </div>
        <div>
          <div className={`text-lg font-bold ${LEVEL_COLORS[health.level]}`}>
            {health.score}%
          </div>
          <div className="text-xs text-toucan-grey-400 capitalize">{health.level}</div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-toucan-orange" />
          <h3 className="text-sm font-medium text-toucan-grey-200">Context Health</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1 text-toucan-grey-400 hover:text-toucan-grey-200 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Score Ring */}
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="8"
            className="stroke-toucan-dark"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="8"
            strokeDasharray={251.2}
            strokeDashoffset={251.2 * (1 - health.score / 100)}
            strokeLinecap="round"
            className={LEVEL_BG_COLORS[health.level]}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${LEVEL_COLORS[health.level]}`}>
            {health.score}%
          </span>
          <span className="text-xs text-toucan-grey-400 capitalize">{health.level}</span>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-2 mb-4">
        {health.components.map((comp) => (
          <div key={comp.name} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-toucan-dark rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  comp.score >= 70 ? 'bg-green-500' :
                  comp.score >= 40 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${comp.score}%` }}
              />
            </div>
            <span className="text-xs text-toucan-grey-500 w-24 truncate" title={comp.name}>
              {comp.name}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {showRecommendations && health.recommendations.length > 0 && (
        <div className="border-t border-toucan-dark-border pt-4">
          <p className="text-xs text-toucan-grey-400 mb-2">Next steps:</p>
          <ul className="space-y-1">
            {health.recommendations.slice(0, 2).map((rec, i) => (
              <li key={i} className="text-sm text-toucan-grey-300 flex items-start gap-2">
                <span className="text-toucan-orange mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
          <Link
            to={`/projects/${projectId}/knowledge`}
            className="flex items-center gap-1 text-xs text-toucan-orange hover:underline mt-3"
          >
            <span>Go to Knowledge Base</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// INLINE BADGE VARIANT
// =============================================================================

interface HealthBadgeProps {
  projectId: string;
}

export function HealthBadge({ projectId }: HealthBadgeProps) {
  const [health, setHealth] = useState<HealthResult | null>(null);

  useEffect(() => {
    healthApi.getHealth(projectId)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [projectId]);

  if (!health) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
      health.level === 'excellent' ? 'bg-toucan-orange/20 text-toucan-orange' :
      health.level === 'good' ? 'bg-green-500/20 text-green-400' :
      health.level === 'basic' ? 'bg-yellow-500/20 text-yellow-400' :
      'bg-red-500/20 text-red-400'
    }`}>
      {health.score}%
    </span>
  );
}
