import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Plus, EyeOff, X } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { Spinner } from '../components/atoms/Spinner';
import { Badge } from '../components/atoms/Badge';
import { coverageApi, specsApi, type CoverageData, type SectionCoverage } from '../services/api';
import type { Spec } from '../types/workItem';

export function CoveragePage() {
  const { specId } = useParams<{ specId: string }>();
  const navigate = useNavigate();

  const [spec, setSpec] = useState<Spec | null>(null);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionCoverage | null>(null);

  const loadData = useCallback(async () => {
    if (!specId) return;

    setLoading(true);
    setError(null);

    try {
      const [specData, coverageData] = await Promise.all([
        specsApi.get(specId),
        coverageApi.getCoverage(specId),
      ]);
      setSpec(specData);
      setCoverage(coverageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [specId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkIntentional = async (sectionId: string) => {
    try {
      await coverageApi.updateSectionStatus(sectionId, true);
      // Refresh coverage data
      if (specId) {
        const coverageData = await coverageApi.getCoverage(specId);
        setCoverage(coverageData);
      }
      setSelectedSection(null);
    } catch (err) {
      // Handle error silently or show toast
    }
  };

  const handleUnmarkIntentional = async (sectionId: string) => {
    try {
      await coverageApi.updateSectionStatus(sectionId, false);
      // Refresh coverage data
      if (specId) {
        const coverageData = await coverageApi.getCoverage(specId);
        setCoverage(coverageData);
      }
      setSelectedSection(null);
    } catch (err) {
      // Handle error silently
    }
  };

  const getCoverageColor = (section: SectionCoverage): string => {
    if (section.intentionallyUncovered) return 'bg-toucan-grey-600';
    if (section.storyCount === 0) return 'bg-toucan-error';
    if (section.storyCount <= 2) return 'bg-toucan-warning';
    return 'bg-toucan-success';
  };

  const getCoverageBarWidth = (section: SectionCoverage): string => {
    if (section.intentionallyUncovered) return 'w-1/4';
    if (section.storyCount === 0) return 'w-0';
    if (section.storyCount === 1) return 'w-1/4';
    if (section.storyCount === 2) return 'w-1/2';
    if (section.storyCount === 3) return 'w-3/4';
    return 'w-full';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-toucan-error mb-4">{error}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const uncoveredSections = coverage?.sections.filter(
    (s) => s.storyCount === 0 && !s.intentionallyUncovered
  ) || [];

  return (
    <div className="min-h-screen bg-toucan-dark">
      {/* Header */}
      <header className="bg-toucan-dark-lighter border-b border-toucan-dark-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/review/${specId}`}
              className="text-toucan-grey-400 hover:text-toucan-grey-100"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-toucan-grey-100">
                Coverage Report
              </h1>
              {spec && (
                <p className="text-sm text-toucan-grey-400">{spec.name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Summary */}
        {coverage && (
          <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6">
            <div className="flex items-center gap-8">
              {/* Percentage */}
              <div className="text-center">
                <div className="text-5xl font-bold text-toucan-orange">
                  {coverage.coveragePercent}%
                </div>
                <div className="text-sm text-toucan-grey-400 mt-1">
                  Coverage
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex-1">
                <div className="h-4 bg-toucan-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-toucan-orange transition-all duration-300"
                    style={{ width: `${coverage.coveragePercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-toucan-grey-400 mt-2">
                  <span>{coverage.coveredSections} of {coverage.totalSections} sections covered</span>
                  {coverage.uncoveredCount > 0 && (
                    <span className="flex items-center gap-1 text-toucan-warning">
                      <AlertTriangle size={14} />
                      {coverage.uncoveredCount} sections need review
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content with optional side panel */}
        <div className="flex gap-6">
          {/* Heatmap */}
          <div className="flex-1 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6">
            <h2 className="text-lg font-medium text-toucan-grey-100 mb-4">
              Section Heatmap
            </h2>

            <div className="space-y-2">
              {coverage?.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-toucan-dark ${
                    selectedSection?.id === section.id ? 'bg-toucan-dark ring-1 ring-toucan-orange' : ''
                  }`}
                >
                  {/* Section ref */}
                  <span className="text-sm text-toucan-grey-400 w-16 text-left font-mono">
                    {section.sectionRef}
                  </span>

                  {/* Heading */}
                  <span className="text-sm text-toucan-grey-100 flex-1 text-left truncate">
                    {section.heading}
                  </span>

                  {/* Coverage bar */}
                  <div className="w-32 h-2 bg-toucan-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getCoverageColor(section)} ${getCoverageBarWidth(section)} transition-all`}
                    />
                  </div>

                  {/* Story count / status */}
                  <div className="w-24 text-right">
                    {section.intentionallyUncovered ? (
                      <Badge variant="default" size="sm">
                        <EyeOff size={12} className="mr-1" />
                        Skipped
                      </Badge>
                    ) : section.storyCount === 0 ? (
                      <Badge variant="error" size="sm">
                        <AlertTriangle size={12} className="mr-1" />
                        0 stories
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        <CheckCircle size={12} className="mr-1" />
                        {section.storyCount} {section.storyCount === 1 ? 'story' : 'stories'}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Side panel - Section details */}
          {selectedSection && (
            <div className="w-96 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-toucan-dark-border">
                <h3 className="font-medium text-toucan-grey-100">
                  {selectedSection.sectionRef} {selectedSection.heading}
                </h3>
                <button
                  onClick={() => setSelectedSection(null)}
                  className="p-1 hover:bg-toucan-dark rounded text-toucan-grey-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Content preview */}
                <div>
                  <h4 className="text-sm font-medium text-toucan-grey-200 mb-2">
                    Content Preview
                  </h4>
                  <p className="text-sm text-toucan-grey-400 bg-toucan-dark rounded p-3">
                    {selectedSection.contentPreview}
                  </p>
                </div>

                {/* Linked stories */}
                {selectedSection.stories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-toucan-grey-200 mb-2">
                      Stories from this section ({selectedSection.stories.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedSection.stories.map((story) => (
                        <Link
                          key={story.id}
                          to={`/review/${specId}?item=${story.id}`}
                          className="flex items-center justify-between p-2 bg-toucan-dark rounded hover:bg-toucan-dark-border"
                        >
                          <span className="text-sm text-toucan-grey-100 truncate">
                            {story.title}
                          </span>
                          <Badge variant="default" size="sm">
                            {Math.round(story.relevance * 100)}%
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-toucan-dark-border">
                  {selectedSection.storyCount === 0 && !selectedSection.intentionallyUncovered && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/review/${specId}`)}
                      >
                        <Plus size={14} className="mr-1" />
                        Create Story
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkIntentional(selectedSection.id)}
                      >
                        <EyeOff size={14} className="mr-1" />
                        Skip
                      </Button>
                    </>
                  )}
                  {selectedSection.intentionallyUncovered && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleUnmarkIntentional(selectedSection.id)}
                    >
                      Mark as Needed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Uncovered sections list */}
        {uncoveredSections.length > 0 && (
          <div className="bg-toucan-warning/10 border border-toucan-warning/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-toucan-warning" />
              <h2 className="text-lg font-medium text-toucan-warning">
                Uncovered Sections ({uncoveredSections.length})
              </h2>
            </div>

            <div className="space-y-3">
              {uncoveredSections.map((section) => (
                <div
                  key={section.id}
                  className="bg-toucan-dark rounded-lg p-4 flex items-start justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-toucan-grey-100">
                      {section.sectionRef} {section.heading}
                    </h3>
                    <p className="text-sm text-toucan-grey-400 mt-1 truncate">
                      {section.contentPreview}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/review/${specId}`)}
                    >
                      <Plus size={14} className="mr-1" />
                      Create
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkIntentional(section.id)}
                    >
                      <EyeOff size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm text-toucan-grey-400">
          <span>Legend:</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-toucan-error" />
            <span>No coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-toucan-warning" />
            <span>1-2 stories</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-toucan-success" />
            <span>3+ stories</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-toucan-grey-600" />
            <span>Intentionally skipped</span>
          </div>
        </div>
      </div>
    </div>
  );
}
