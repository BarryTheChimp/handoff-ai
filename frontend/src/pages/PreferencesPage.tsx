import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Lightbulb,
  Plus,
  Wand2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Header } from '../components/organisms/Header';
import { Navigation } from '../components/organisms/Navigation';
import { TeachHandoffModal } from '../components/organisms/TeachHandoffModal';
import { preferencesApi, type TeamPreference, type ExtractedPreference } from '../services/api';

const CATEGORY_LABELS: Record<string, string> = {
  ac_format: 'Acceptance Criteria',
  detail_level: 'Detail Level',
  sections: 'Sections',
  terminology: 'Terminology',
  style: 'Writing Style',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-toucan-success',
  medium: 'text-toucan-warning',
  low: 'text-toucan-grey-400',
};

export function PreferencesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [preferences, setPreferences] = useState<TeamPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractedPreference[] | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId) {
      loadPreferences();
    }
  }, [projectId]);

  async function loadPreferences() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await preferencesApi.list(projectId!);
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleActive(pref: TeamPreference) {
    setUpdatingIds(prev => new Set(prev).add(pref.id));
    try {
      const updated = await preferencesApi.update(projectId!, pref.id, !pref.active);
      setPreferences(prev =>
        prev.map(p => (p.id === pref.id ? updated : p))
      );
    } catch (err) {
      console.error('Failed to toggle preference:', err);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(pref.id);
        return next;
      });
    }
  }

  async function handleDelete(prefId: string) {
    if (!confirm('Are you sure you want to delete this preference?')) return;

    setUpdatingIds(prev => new Set(prev).add(prefId));
    try {
      await preferencesApi.delete(projectId!, prefId);
      setPreferences(prev => prev.filter(p => p.id !== prefId));
    } catch (err) {
      console.error('Failed to delete preference:', err);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(prefId);
        return next;
      });
    }
  }

  async function handleExtract() {
    setIsExtracting(true);
    setExtractionResult(null);
    try {
      const result = await preferencesApi.extractFromFeedback(projectId!);
      setExtractionResult(result.preferences);
      if (result.extracted > 0) {
        // Reload preferences to show new ones
        await loadPreferences();
      }
    } catch (err) {
      console.error('Failed to extract preferences:', err);
    } finally {
      setIsExtracting(false);
    }
  }

  const activePreferences = preferences.filter(p => p.active);
  const inactivePreferences = preferences.filter(p => !p.active);

  // Group preferences by category
  const groupByCategory = (prefs: TeamPreference[]) => {
    const grouped: Record<string, TeamPreference[]> = {};
    for (const pref of prefs) {
      const cat = pref.category || 'uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(pref);
    }
    return grouped;
  };

  const activeGrouped = groupByCategory(activePreferences);
  const inactiveGrouped = groupByCategory(inactivePreferences);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen bg-toucan-dark">
        <p className="text-toucan-grey-400">No project selected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      <Navigation />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-toucan-grey-100">Team Preferences</h1>
            <p className="text-sm text-toucan-grey-400 mt-1">
              Teach Handoff how your team likes stories written
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExtract}
              disabled={isExtracting}
              leftIcon={isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            >
              {isExtracting ? 'Extracting...' : 'Extract from Feedback'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              leftIcon={<Plus size={16} />}
            >
              Add Preference
            </Button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-toucan-orange" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={48} className="text-toucan-error mb-4" />
            <p className="text-toucan-grey-200 mb-4">{error}</p>
            <Button variant="secondary" onClick={loadPreferences}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Extraction result */}
            {extractionResult && (
              <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={20} className="text-toucan-orange" />
                  <h2 className="text-lg font-semibold text-toucan-grey-100">
                    Extraction Results
                  </h2>
                </div>
                {extractionResult.length === 0 ? (
                  <p className="text-toucan-grey-400">
                    No new preferences could be extracted. Try collecting more feedback first.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-toucan-grey-300">
                      Found {extractionResult.length} potential preference(s) from your team's feedback.
                      They've been added as inactive - review and enable the ones you want to use.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {extractionResult.map((pref, i) => (
                        <div
                          key={i}
                          className="bg-toucan-dark border border-toucan-dark-border rounded-lg px-3 py-2"
                        >
                          <span className="text-sm text-toucan-grey-200">{pref.preference}</span>
                          <span className={clsx('text-xs ml-2', CONFIDENCE_COLORS[pref.confidence])}>
                            ({pref.confidence} confidence)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setExtractionResult(null)}
                  className="mt-4 text-sm text-toucan-grey-400 hover:text-toucan-grey-200"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Active preferences */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="success">Active</Badge>
                <h2 className="text-lg font-semibold text-toucan-grey-100">
                  Active Preferences ({activePreferences.length})
                </h2>
              </div>

              {activePreferences.length === 0 ? (
                <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-8 text-center">
                  <Lightbulb size={48} className="text-toucan-grey-600 mx-auto mb-4" />
                  <p className="text-toucan-grey-400 mb-4">
                    No active preferences yet. Add preferences to customize how Handoff generates stories.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAddModal(true)}
                    leftIcon={<Plus size={16} />}
                  >
                    Add Your First Preference
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(activeGrouped).map(([category, prefs]) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-toucan-grey-400 mb-3 uppercase tracking-wider">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <div className="space-y-2">
                        {prefs.map(pref => (
                          <PreferenceCard
                            key={pref.id}
                            preference={pref}
                            isUpdating={updatingIds.has(pref.id)}
                            onToggle={() => handleToggleActive(pref)}
                            onDelete={() => handleDelete(pref.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Inactive preferences */}
            {inactivePreferences.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="default">Inactive</Badge>
                  <h2 className="text-lg font-semibold text-toucan-grey-100">
                    Suggested Preferences ({inactivePreferences.length})
                  </h2>
                </div>
                <p className="text-sm text-toucan-grey-400 mb-4">
                  These preferences were extracted from feedback but need your approval to be used.
                </p>

                <div className="space-y-6">
                  {Object.entries(inactiveGrouped).map(([category, prefs]) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-toucan-grey-400 mb-3 uppercase tracking-wider">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <div className="space-y-2">
                        {prefs.map(pref => (
                          <PreferenceCard
                            key={pref.id}
                            preference={pref}
                            isUpdating={updatingIds.has(pref.id)}
                            onToggle={() => handleToggleActive(pref)}
                            onDelete={() => handleDelete(pref.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Add Preference Modal */}
      <TeachHandoffModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        projectId={projectId}
        onPreferenceAdded={loadPreferences}
      />
    </div>
  );
}

// Preference Card Component
interface PreferenceCardProps {
  preference: TeamPreference;
  isUpdating: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function PreferenceCard({ preference, isUpdating, onToggle, onDelete }: PreferenceCardProps) {
  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors',
        preference.active
          ? 'bg-toucan-dark-lighter border-toucan-dark-border'
          : 'bg-toucan-dark border-toucan-dark-border opacity-70'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-toucan-grey-100 font-medium">{preference.preference}</p>
        {preference.description && (
          <p className="text-sm text-toucan-grey-400 mt-1">{preference.description}</p>
        )}
        {preference.learnedFrom.length > 0 && (
          <p className="text-xs text-toucan-grey-600 mt-2">
            Learned from {preference.learnedFrom.length} feedback entries
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onToggle}
          disabled={isUpdating}
          className={clsx(
            'p-2 rounded-md transition-colors',
            preference.active
              ? 'text-toucan-success hover:bg-toucan-success/10'
              : 'text-toucan-grey-400 hover:bg-toucan-dark-lighter'
          )}
          title={preference.active ? 'Disable preference' : 'Enable preference'}
        >
          {isUpdating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : preference.active ? (
            <ToggleRight size={20} />
          ) : (
            <ToggleLeft size={20} />
          )}
        </button>
        <button
          onClick={onDelete}
          disabled={isUpdating}
          className="p-2 rounded-md text-toucan-grey-400 hover:text-toucan-error hover:bg-toucan-error/10 transition-colors"
          title="Delete preference"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
