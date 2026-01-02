import { useState, useEffect } from 'react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Split, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkItem } from '../../types/workItem';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkItem | null;
  onSplit: (itemId: string, splitCount: number, titles: string[]) => Promise<void>;
}

export function SplitModal({ isOpen, onClose, item, onSplit }: SplitModalProps) {
  const [splitCount, setSplitCount] = useState(2);
  const [titles, setTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && item) {
      const defaultTitles = Array.from(
        { length: splitCount },
        (_, i) => `${item.title} - Part ${i + 1}`
      );
      setTitles(defaultTitles);
      setError(null);
    }
  }, [isOpen, item, splitCount]);

  // Update titles when split count changes
  useEffect(() => {
    if (item) {
      const newTitles = Array.from({ length: splitCount }, (_, i) => {
        return titles[i] || `${item.title} - Part ${i + 1}`;
      });
      setTitles(newTitles);
    }
  }, [splitCount]);

  const handleTitleChange = (index: number, value: string) => {
    const newTitles = [...titles];
    newTitles[index] = value;
    setTitles(newTitles);
  };

  const handleGenerateSuggestions = async () => {
    if (!item) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Call AI to generate split suggestions
      const response = await fetch(`${API_BASE}/workitems/suggest-split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          itemId: item.id,
          splitCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      if (data.data?.titles) {
        setTitles(data.data.titles);
      }
    } catch (err) {
      setError('Failed to generate AI suggestions. Using default titles.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSplit = async () => {
    if (!item) return;

    setIsLoading(true);
    setError(null);

    try {
      await onSplit(item.id, splitCount, titles);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split story');
    } finally {
      setIsLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Split Story"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSplit}
            loading={isLoading}
            leftIcon={<Split size={16} />}
          >
            Split into {splitCount} stories
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Original story info */}
        <div className="p-3 bg-toucan-dark rounded-md border border-toucan-dark-border">
          <p className="text-sm text-toucan-grey-400 mb-1">Original Story</p>
          <p className="text-toucan-grey-100 font-medium">{item.title}</p>
        </div>

        {/* Split count selector */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
            Split into how many stories?
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => setSplitCount(count)}
                className={clsx(
                  'w-12 h-12 rounded-md font-bold transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-toucan-orange',
                  splitCount === count
                    ? 'bg-toucan-orange text-white'
                    : 'bg-toucan-dark border border-toucan-dark-border text-toucan-grey-200 hover:border-toucan-grey-600'
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* AI suggestion button */}
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateSuggestions}
            loading={isGenerating}
            leftIcon={<Sparkles size={14} />}
          >
            Generate AI Suggestions
          </Button>
        </div>

        {/* Titles */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-toucan-grey-200">
            New Story Titles
          </label>
          {titles.map((title, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-toucan-dark-border text-xs text-toucan-grey-400">
                {index + 1}
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(index, e.target.value)}
                className="flex-1 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
                placeholder={`Story ${index + 1} title...`}
              />
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-md">
            <p className="text-sm text-toucan-error">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-toucan-info/10 border border-toucan-info/30 rounded-md">
          <p className="text-sm text-toucan-info">
            The original story will be deleted and replaced with the new stories.
            Acceptance criteria will be distributed across the new stories.
          </p>
        </div>
      </div>
    </Modal>
  );
}
