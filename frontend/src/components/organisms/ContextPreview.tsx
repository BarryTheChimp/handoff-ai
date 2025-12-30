import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, AlertCircle } from 'lucide-react';
import type { ContextBuildResult, ContextSourceUsed } from '../../services/api';

// =============================================================================
// TYPES
// =============================================================================

interface ContextPreviewProps {
  result: ContextBuildResult | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SOURCE_COLORS: Record<ContextSourceUsed['type'], string> = {
  brief: 'bg-blue-500',
  preferences: 'bg-green-500',
  glossary: 'bg-purple-500',
  spec: 'bg-orange-500',
  jira: 'bg-cyan-500',
  document: 'bg-pink-500',
};

const SOURCE_LABELS: Record<ContextSourceUsed['type'], string> = {
  brief: 'Project Brief',
  preferences: 'Preferences',
  glossary: 'Glossary',
  spec: 'Specs',
  jira: 'Jira',
  document: 'Documents',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ContextPreview({ result, isLoading, error, onRefresh }: ContextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-toucan-grey-400">
          <div className="animate-spin h-4 w-4 border-2 border-toucan-orange border-t-transparent rounded-full" />
          <span>Building context preview...</span>
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
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-toucan-orange hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // No result yet
  if (!result) {
    return (
      <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
        <div className="text-center text-toucan-grey-400 py-4">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Enter spec content to preview context</p>
        </div>
      </div>
    );
  }

  const usagePercent = Math.min((result.tokensUsed / result.tokenBudget) * 100, 100);

  return (
    <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-toucan-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-toucan-orange" />
          <span className="font-medium text-toucan-grey-100">Context Preview</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-toucan-grey-400">
            {result.tokensUsed.toLocaleString()} / {result.tokenBudget.toLocaleString()} tokens
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-toucan-orange hover:underline"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Token Distribution Bar */}
      <div className="px-4 py-3 border-b border-toucan-dark-border">
        <div className="h-4 bg-toucan-dark rounded-full overflow-hidden flex">
          {result.sourcesUsed.map((source, index) => {
            const width = (source.tokensUsed / result.tokenBudget) * 100;
            return (
              <div
                key={`${source.type}-${index}`}
                className={`${SOURCE_COLORS[source.type]} transition-all`}
                style={{ width: `${width}%` }}
                title={`${SOURCE_LABELS[source.type]}: ${source.tokensUsed} tokens`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-toucan-grey-400">
          <span>{usagePercent.toFixed(0)}% used</span>
          <span>{result.tokenBudget - result.tokensUsed} tokens remaining</span>
        </div>
      </div>

      {/* Sources Legend */}
      <div className="px-4 py-3 border-b border-toucan-dark-border">
        <div className="flex flex-wrap gap-3">
          {result.sourcesUsed.map((source, index) => (
            <div key={`${source.type}-${index}`} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${SOURCE_COLORS[source.type]}`} />
              <span className="text-sm text-toucan-grey-200">
                {SOURCE_LABELS[source.type]}
              </span>
              <span className="text-xs text-toucan-grey-400">
                ({source.tokensUsed})
              </span>
            </div>
          ))}
          {result.sourcesUsed.length === 0 && (
            <span className="text-sm text-toucan-grey-400 italic">
              No context sources matched
            </span>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      <div className="px-4 py-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-toucan-grey-400 hover:text-toucan-grey-100 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span>Hide full context</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Show full context</span>
            </>
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 bg-toucan-dark rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-toucan-grey-200 whitespace-pre-wrap font-mono">
              {result.contextString || 'No context generated'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT FOR INLINE USE
// =============================================================================

interface CompactContextPreviewProps {
  result: ContextBuildResult | null;
  isLoading?: boolean;
}

export function CompactContextPreview({ result, isLoading }: CompactContextPreviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-toucan-grey-400 text-sm">
        <div className="animate-spin h-3 w-3 border-2 border-toucan-orange border-t-transparent rounded-full" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const usagePercent = Math.min((result.tokensUsed / result.tokenBudget) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      {/* Mini bar */}
      <div className="w-24 h-2 bg-toucan-dark rounded-full overflow-hidden flex">
        {result.sourcesUsed.map((source, index) => {
          const width = (source.tokensUsed / result.tokenBudget) * 100;
          return (
            <div
              key={`${source.type}-${index}`}
              className={`${SOURCE_COLORS[source.type]}`}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>
      <span className="text-xs text-toucan-grey-400">
        {result.tokensUsed}/{result.tokenBudget} tokens ({usagePercent.toFixed(0)}%)
      </span>
    </div>
  );
}
