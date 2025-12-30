import { useState } from 'react';
import { X, Lightbulb, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../atoms/Button';
import { preferencesApi } from '../../services/api';

interface TeachHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialPreference?: string;
  onPreferenceAdded?: () => void;
}

const PREFERENCE_CATEGORIES = [
  { id: 'ac_format', label: 'Acceptance Criteria', description: 'How AC should be structured' },
  { id: 'detail_level', label: 'Detail Level', description: 'How detailed or concise stories should be' },
  { id: 'sections', label: 'Sections', description: 'What sections to include or exclude' },
  { id: 'terminology', label: 'Terminology', description: 'Specific terms or language to use' },
  { id: 'style', label: 'Writing Style', description: 'General writing style preferences' },
];

const EXAMPLE_PREFERENCES = [
  { category: 'ac_format', preference: 'Keep acceptance criteria to 3-5 items maximum' },
  { category: 'ac_format', preference: 'Use Given/When/Then format for acceptance criteria' },
  { category: 'detail_level', preference: 'Include specific API endpoint paths in technical notes' },
  { category: 'sections', preference: 'Always include a "Dependencies" section' },
  { category: 'terminology', preference: 'Use "user" instead of "customer" throughout' },
  { category: 'style', preference: 'Keep story descriptions under 100 words' },
];

export function TeachHandoffModal({
  isOpen,
  onClose,
  projectId,
  initialPreference = '',
  onPreferenceAdded,
}: TeachHandoffModalProps) {
  const [preference, setPreference] = useState(initialPreference);
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('style');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!preference.trim()) {
      setError('Please enter a preference');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await preferencesApi.create(
        projectId,
        preference.trim(),
        description.trim() || undefined,
        selectedCategory
      );
      setSuccess(true);
      onPreferenceAdded?.();

      // Reset form after short delay
      setTimeout(() => {
        setPreference('');
        setDescription('');
        setSelectedCategory('style');
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add preference');
    } finally {
      setIsSubmitting(false);
    }
  }

  function useExample(example: { category: string; preference: string }) {
    setPreference(example.preference);
    setSelectedCategory(example.category);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-toucan-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-toucan-orange/20 rounded-lg flex items-center justify-center">
              <Lightbulb size={20} className="text-toucan-orange" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-toucan-grey-100">Teach Handoff</h2>
              <p className="text-sm text-toucan-grey-400">Add a preference to improve future stories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-toucan-grey-400 hover:text-toucan-grey-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-toucan-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={32} className="text-toucan-success" />
              </div>
              <h3 className="text-lg font-medium text-toucan-grey-100 mb-2">
                Preference Added!
              </h3>
              <p className="text-sm text-toucan-grey-400">
                This preference will be applied to future story generation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category selection */}
              <div>
                <label className="block text-sm font-medium text-toucan-grey-200 mb-3">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PREFERENCE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={clsx(
                        'px-4 py-3 rounded-lg text-left transition-colors',
                        selectedCategory === cat.id
                          ? 'bg-toucan-orange/20 border-2 border-toucan-orange'
                          : 'bg-toucan-dark border border-toucan-dark-border hover:border-toucan-grey-400'
                      )}
                    >
                      <span className="block text-sm font-medium text-toucan-grey-100">
                        {cat.label}
                      </span>
                      <span className="block text-xs text-toucan-grey-400 mt-0.5">
                        {cat.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preference input */}
              <div>
                <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
                  Preference
                </label>
                <input
                  type="text"
                  value={preference}
                  onChange={(e) => setPreference(e.target.value)}
                  placeholder="e.g., Keep acceptance criteria to 3-5 items"
                  className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-3 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
                />
                <p className="text-xs text-toucan-grey-400 mt-2">
                  Write as an instruction for how stories should be written
                </p>
              </div>

              {/* Description (optional) */}
              <div>
                <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
                  Why this matters (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this preference is important for your team..."
                  className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-3 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent resize-none"
                  rows={2}
                />
              </div>

              {/* Example preferences */}
              <div>
                <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
                  Example preferences
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PREFERENCES.filter(ex => ex.category === selectedCategory).map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => useExample(ex)}
                      className="px-3 py-1.5 bg-toucan-dark border border-toucan-dark-border rounded-full text-xs text-toucan-grey-300 hover:border-toucan-orange hover:text-toucan-orange transition-colors"
                    >
                      {ex.preference}
                    </button>
                  ))}
                  {EXAMPLE_PREFERENCES.filter(ex => ex.category === selectedCategory).length === 0 && (
                    <span className="text-xs text-toucan-grey-400 italic">
                      No examples for this category
                    </span>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm text-toucan-error bg-toucan-error/10 border border-toucan-error/30 rounded-md px-4 py-2">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !preference.trim()}
                  leftIcon={<Plus size={16} />}
                >
                  {isSubmitting ? 'Adding...' : 'Add Preference'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
