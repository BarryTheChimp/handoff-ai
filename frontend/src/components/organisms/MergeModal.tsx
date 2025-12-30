import { useState, useEffect } from 'react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Merge, Sparkles } from 'lucide-react';
import { SizeBadge } from '../atoms/Badge';
import type { WorkItem } from '../../types/workItem';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorkItem[];
  onMerge: (itemIds: string[], mergedTitle: string, mergedDescription: string) => Promise<void>;
}

export function MergeModal({ isOpen, onClose, items, onMerge }: MergeModalProps) {
  const [mergedTitle, setMergedTitle] = useState('');
  const [mergedDescription, setMergedDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    const firstItem = items[0];
    if (isOpen && firstItem) {
      // Default to first item's title
      setMergedTitle(firstItem.title);
      // Combine descriptions
      const combinedDesc = items
        .map((item) => item.description || '')
        .filter(Boolean)
        .join('\n\n---\n\n');
      setMergedDescription(combinedDesc);
      setError(null);
    }
  }, [isOpen, items]);

  const handleGenerateSuggestions = async () => {
    if (items.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Call AI to generate merge suggestion
      const response = await fetch('/api/workitems/suggest-merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          itemIds: items.map((item) => item.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      if (data.data) {
        if (data.data.title) setMergedTitle(data.data.title);
        if (data.data.description) setMergedDescription(data.data.description);
      }
    } catch (err) {
      setError('Failed to generate AI suggestions. Edit manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMerge = async () => {
    if (items.length < 2) return;

    setIsLoading(true);
    setError(null);

    try {
      await onMerge(
        items.map((item) => item.id),
        mergedTitle,
        mergedDescription
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge stories');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length < 2) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge Stories"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleMerge}
            loading={isLoading}
            leftIcon={<Merge size={16} />}
          >
            Merge {items.length} stories
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Selected stories */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
            Stories to merge ({items.length} selected)
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 bg-toucan-dark rounded-md border border-toucan-dark-border"
              >
                <span className="flex-1 text-sm text-toucan-grey-200 truncate">
                  {item.title}
                </span>
                {item.sizeEstimate && <SizeBadge size={item.sizeEstimate} />}
              </div>
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

        {/* Merged title */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
            Merged Story Title
          </label>
          <input
            type="text"
            value={mergedTitle}
            onChange={(e) => setMergedTitle(e.target.value)}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
            placeholder="Enter merged story title..."
          />
        </div>

        {/* Merged description */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
            Merged Description
          </label>
          <textarea
            value={mergedDescription}
            onChange={(e) => setMergedDescription(e.target.value)}
            rows={6}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange resize-y"
            placeholder="Enter merged description..."
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-md">
            <p className="text-sm text-toucan-error">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-toucan-warning/10 border border-toucan-warning/30 rounded-md">
          <p className="text-sm text-toucan-warning">
            The selected stories will be deleted and replaced with a single merged story.
            All acceptance criteria and source references will be combined.
          </p>
        </div>
      </div>
    </Modal>
  );
}
