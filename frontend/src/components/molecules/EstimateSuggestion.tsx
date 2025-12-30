import { Lightbulb, Check, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import type { SizeEstimate, Confidence, EstimationFactors } from '../../services/api';

interface Props {
  suggestedSize: SizeEstimate;
  confidence: Confidence;
  rationale: string;
  factors: EstimationFactors;
  onAccept: () => void;
  onDismiss: () => void;
}

const confidenceColors: Record<Confidence, 'success' | 'warning' | 'error'> = {
  high: 'success',
  medium: 'warning',
  low: 'error',
};

export function EstimateSuggestion({
  suggestedSize,
  confidence,
  rationale,
  factors,
  onAccept,
  onDismiss,
}: Props) {
  return (
    <div className="bg-toucan-dark border border-toucan-dark-border rounded-lg p-4 mt-3">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={18} className="text-toucan-warning" />
        <span className="text-sm font-medium text-toucan-grey-100">AI Suggestion</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl font-bold text-toucan-orange">{suggestedSize}</span>
        <Badge variant={confidenceColors[confidence]} size="sm">
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
        </Badge>
      </div>

      <p className="text-sm text-toucan-grey-200 mb-3">{rationale}</p>

      <div className="flex flex-wrap gap-2 mb-4 text-xs text-toucan-grey-400">
        <span>{factors.acCount} AC</span>
        <span className="text-toucan-dark-border">|</span>
        <span>{factors.dependencies} deps</span>
        <span className="text-toucan-dark-border">|</span>
        <span>{factors.unknowns} unknowns</span>
        {factors.complexitySignals.length > 0 && (
          <>
            <span className="text-toucan-dark-border">|</span>
            <span>{factors.complexitySignals.join(', ')}</span>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onAccept}>
          <Check size={14} className="mr-1" />
          Accept {suggestedSize}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X size={14} className="mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
