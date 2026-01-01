import { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { FileText, CheckCircle, AlertTriangle, EyeOff, Link2 } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import type { SectionCoverage } from '../../services/api';

interface StoryLink {
  id: string;
  title: string;
  relevance: number;
}

interface SectionWithRefs extends SectionCoverage {
  stories: StoryLink[];
}

interface InteractiveCoverageViewProps {
  sections: SectionWithRefs[];
  onSectionClick: (section: SectionWithRefs) => void;
  onStoryClick: (storyId: string) => void;
  selectedSectionId?: string | null;
}

export function InteractiveCoverageView({
  sections,
  onSectionClick,
  onStoryClick,
  selectedSectionId,
}: InteractiveCoverageViewProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [hoveredStory, setHoveredStory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const storyRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get all unique stories across sections
  const allStories = sections.reduce<StoryLink[]>((acc, section) => {
    section.stories.forEach((story) => {
      if (!acc.find((s) => s.id === story.id)) {
        acc.push(story);
      }
    });
    return acc;
  }, []);

  // Find connections for highlights
  const getHighlightedStories = useCallback(() => {
    if (!hoveredSection) return new Set<string>();
    const section = sections.find((s) => s.id === hoveredSection);
    return new Set(section?.stories.map((s) => s.id) || []);
  }, [hoveredSection, sections]);

  const getHighlightedSections = useCallback(() => {
    if (!hoveredStory) return new Set<string>();
    return new Set(
      sections.filter((s) => s.stories.some((st) => st.id === hoveredStory)).map((s) => s.id)
    );
  }, [hoveredStory, sections]);

  const highlightedStories = getHighlightedStories();
  const highlightedSections = getHighlightedSections();

  const getCoverageStatus = (section: SectionWithRefs) => {
    if (section.intentionallyUncovered) return 'skipped';
    if (section.storyCount === 0) return 'uncovered';
    if (section.storyCount <= 2) return 'partial';
    return 'covered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'covered':
        return 'border-toucan-success bg-toucan-success/10';
      case 'partial':
        return 'border-toucan-warning bg-toucan-warning/10';
      case 'uncovered':
        return 'border-toucan-error bg-toucan-error/10';
      case 'skipped':
        return 'border-toucan-grey-600 bg-toucan-grey-600/10';
      default:
        return 'border-toucan-dark-border';
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-2 gap-8">
        {/* Sections Column */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-toucan-grey-400 uppercase tracking-wide mb-4">
            Document Sections
          </h3>

          {sections.map((section) => {
            const status = getCoverageStatus(section);
            const isHighlighted = highlightedSections.has(section.id);
            const isSelected = selectedSectionId === section.id;
            const isHovered = hoveredSection === section.id;

            return (
              <div
                key={section.id}
                ref={(el) => {
                  if (el) sectionRefs.current.set(section.id, el);
                }}
                data-connection-id={`section-${section.id}`}
                onClick={() => onSectionClick(section)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                className={clsx(
                  'relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                  getStatusColor(status),
                  (isHighlighted || isHovered || isSelected) && 'ring-2 ring-toucan-orange ring-offset-2 ring-offset-toucan-dark',
                  !isHighlighted && !isHovered && !isSelected && 'hover:border-toucan-grey-500'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-toucan-grey-500">
                        {section.sectionRef}
                      </span>
                      {section.stories.length > 0 && (
                        <div className="flex items-center gap-1 text-toucan-grey-500">
                          <Link2 size={12} />
                          <span className="text-xs">{section.stories.length}</span>
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-toucan-grey-100 truncate">
                      {section.heading}
                    </h4>
                  </div>

                  <div className="flex-shrink-0">
                    {status === 'covered' && (
                      <CheckCircle size={18} className="text-toucan-success" />
                    )}
                    {status === 'partial' && (
                      <AlertTriangle size={18} className="text-toucan-warning" />
                    )}
                    {status === 'uncovered' && (
                      <AlertTriangle size={18} className="text-toucan-error" />
                    )}
                    {status === 'skipped' && (
                      <EyeOff size={18} className="text-toucan-grey-500" />
                    )}
                  </div>
                </div>

                {/* Connection dots */}
                {section.stories.length > 0 && (isHovered || isSelected) && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                    <div className="w-3 h-3 rounded-full bg-toucan-orange animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stories Column */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-toucan-grey-400 uppercase tracking-wide mb-4">
            Work Items
          </h3>

          {allStories.length === 0 ? (
            <div className="text-center py-8 text-toucan-grey-500">
              No work items linked to sections yet
            </div>
          ) : (
            allStories.map((story) => {
              const isHighlighted = highlightedStories.has(story.id);
              const isHovered = hoveredStory === story.id;

              // Find which sections this story is linked to
              const linkedSections = sections.filter((s) =>
                s.stories.some((st) => st.id === story.id)
              );

              return (
                <div
                  key={story.id}
                  ref={(el) => {
                    if (el) storyRefs.current.set(story.id, el);
                  }}
                  data-connection-id={`story-${story.id}`}
                  onClick={() => onStoryClick(story.id)}
                  onMouseEnter={() => setHoveredStory(story.id)}
                  onMouseLeave={() => setHoveredStory(null)}
                  className={clsx(
                    'relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                    'border-toucan-dark-border bg-toucan-dark-lighter',
                    (isHighlighted || isHovered) && 'ring-2 ring-toucan-orange ring-offset-2 ring-offset-toucan-dark',
                    !isHighlighted && !isHovered && 'hover:border-toucan-grey-500'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-toucan-orange mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-toucan-grey-100 truncate">
                        {story.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" size="sm">
                          {Math.round(story.relevance * 100)}% match
                        </Badge>
                        <span className="text-xs text-toucan-grey-500">
                          {linkedSections.length} section{linkedSections.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connection dot */}
                  {(isHighlighted || isHovered) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                      <div className="w-3 h-3 rounded-full bg-toucan-orange animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SVG Connection Lines */}
      <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
        <defs>
          <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="connection-gradient-active" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="1" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Draw connection lines when hovering */}
        {sections.flatMap((section) =>
          section.stories.map((story) => {
            const sectionEl = sectionRefs.current.get(section.id);
            const storyEl = storyRefs.current.get(story.id);

            if (!sectionEl || !storyEl || !containerRef.current) return null;

            const containerRect = containerRef.current.getBoundingClientRect();
            const sectionRect = sectionEl.getBoundingClientRect();
            const storyRect = storyEl.getBoundingClientRect();

            const startX = sectionRect.right - containerRect.left;
            const startY = sectionRect.top + sectionRect.height / 2 - containerRect.top;
            const endX = storyRect.left - containerRect.left;
            const endY = storyRect.top + storyRect.height / 2 - containerRect.top;

            const midX = (startX + endX) / 2;

            const isActive =
              hoveredSection === section.id ||
              hoveredStory === story.id ||
              selectedSectionId === section.id;

            return (
              <path
                key={`${section.id}-${story.id}`}
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke={isActive ? 'url(#connection-gradient-active)' : 'url(#connection-gradient)'}
                strokeWidth={isActive ? 2.5 : 1}
                className={clsx(
                  'transition-all duration-300',
                  !isActive && 'opacity-20'
                )}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
