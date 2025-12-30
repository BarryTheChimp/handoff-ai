import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../atoms/Button';
import { feedbackApi, type FeedbackData } from '../../services/api';

interface FeedbackSectionProps {
  workItemId: string;
  onTeachClick?: () => void;
  className?: string;
}

const FEEDBACK_CATEGORIES = [
  { id: 'too_vague', label: 'Too vague' },
  { id: 'too_detailed', label: 'Too detailed' },
  { id: 'wrong_format', label: 'Wrong format' },
  { id: 'missing_ac', label: 'Missing AC' },
  { id: 'unclear_scope', label: 'Unclear scope' },
  { id: 'technical_issues', label: 'Technical issues' },
];

export function FeedbackSection({ workItemId, onTeachClick, className }: FeedbackSectionProps) {
  const [myFeedback, setMyFeedback] = useState<FeedbackData | null>(null);
  const [allFeedback, setAllFeedback] = useState<FeedbackData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    loadFeedback();
  }, [workItemId]);

  async function loadFeedback() {
    setIsLoading(true);
    try {
      const data = await feedbackApi.getFeedback(workItemId);
      setMyFeedback(data.myFeedback);
      setAllFeedback(data.allFeedback);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVote(rating: 1 | 5) {
    // If clicking the same vote, show the form for details
    if (myFeedback?.rating === rating) {
      setShowFeedbackForm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await feedbackApi.submitFeedback(workItemId, rating);
      setMyFeedback(result);

      // If thumbs down, show form for details
      if (rating === 1) {
        setShowFeedbackForm(true);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitDetails() {
    if (!myFeedback) return;

    setIsSubmitting(true);
    try {
      const result = await feedbackApi.submitFeedback(
        workItemId,
        myFeedback.rating as 1 | 5,
        feedbackText || undefined,
        selectedCategories.length > 0 ? selectedCategories : undefined
      );
      setMyFeedback(result);
      setShowFeedbackForm(false);
      setFeedbackText('');
      setSelectedCategories([]);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  }

  const thumbsUpCount = allFeedback.filter(f => f.rating === 5).length;
  const thumbsDownCount = allFeedback.filter(f => f.rating === 1).length;

  if (isLoading) {
    return (
      <div className={clsx('flex items-center gap-2 text-toucan-grey-400', className)}>
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm">Loading feedback...</span>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Voting buttons */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-toucan-grey-400">Rate this story:</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote(5)}
            disabled={isSubmitting}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              myFeedback?.rating === 5
                ? 'bg-toucan-success/20 text-toucan-success border border-toucan-success/30'
                : 'bg-toucan-dark border border-toucan-dark-border text-toucan-grey-200 hover:border-toucan-success/50'
            )}
          >
            <ThumbsUp size={14} />
            <span>{thumbsUpCount || ''}</span>
          </button>

          <button
            onClick={() => handleVote(1)}
            disabled={isSubmitting}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              myFeedback?.rating === 1
                ? 'bg-toucan-error/20 text-toucan-error border border-toucan-error/30'
                : 'bg-toucan-dark border border-toucan-dark-border text-toucan-grey-200 hover:border-toucan-error/50'
            )}
          >
            <ThumbsDown size={14} />
            <span>{thumbsDownCount || ''}</span>
          </button>
        </div>

        {onTeachClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTeachClick}
            leftIcon={<MessageSquare size={14} />}
          >
            Teach Handoff
          </Button>
        )}
      </div>

      {/* Feedback details form */}
      {showFeedbackForm && myFeedback?.rating === 1 && (
        <div className="bg-toucan-dark border border-toucan-dark-border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
              What was wrong? (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs transition-colors',
                    selectedCategories.includes(cat.id)
                      ? 'bg-toucan-orange text-white'
                      : 'bg-toucan-dark-lighter border border-toucan-dark-border text-toucan-grey-300 hover:border-toucan-orange'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
              Additional details (optional)
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us how we can improve..."
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowFeedbackForm(false);
                setFeedbackText('');
                setSelectedCategories([]);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitDetails}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Feedback'}
            </Button>
          </div>
        </div>
      )}

      {/* Success message for thumbs up */}
      {showFeedbackForm && myFeedback?.rating === 5 && (
        <div className="bg-toucan-success/10 border border-toucan-success/30 rounded-lg p-3 text-sm text-toucan-success">
          Thanks for your feedback! We'll use this to improve future stories.
          <button
            onClick={() => setShowFeedbackForm(false)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
