# F24: Spec Coverage View (Visual Traceability)

> **Priority:** HIGH | **Effort:** 12 hours | **Phase:** 2

---

## Overview

**What:** A side-by-side view showing the original specification document alongside generated stories, with visual connections showing which sections produced which stories.

**Why:** This is the "wow factor" feature that differentiates Handoff AI. No competitor shows the traceability between source spec and generated output. Users can:
- See exactly where each story came from
- Identify gaps in coverage
- Click to navigate between related items
- Build confidence in the AI translation

**Success Criteria:**
- Side-by-side spec and story panels
- Visual connection lines between sections and stories
- Click section → highlights related stories
- Click story → highlights source section(s)
- Coverage percentage displayed
- Uncovered sections clearly flagged

---

## User Stories

### Must Have

**US-24.1:** As a PM, I want to see my spec document alongside generated stories so that I can verify completeness.
- **AC:** Split view: spec on left, stories on right
- **AC:** Spec renders with section headings visible
- **AC:** Stories grouped by type (epic/feature/story)

**US-24.2:** As a PM, I want to click a spec section and see which stories it generated so that I understand the mapping.
- **AC:** Click section → Related stories highlight
- **AC:** Connection line appears between section and stories
- **AC:** Scroll to stories if not visible

**US-24.3:** As a PM, I want to click a story and see which spec section it came from so that I can trace its origin.
- **AC:** Click story → Source section(s) highlight
- **AC:** Connection line appears
- **AC:** Scroll to section if not visible

**US-24.4:** As a PM, I want to see which spec sections have no stories so that I can address gaps.
- **AC:** Uncovered sections have red/orange indicator
- **AC:** Hover shows "No stories generated for this section"
- **AC:** Click shows option to "Generate stories" for section

### Should Have

**US-24.5:** As a PM, I want to see the overall coverage percentage so that I know how complete the translation is.
- **AC:** Coverage bar at top: "87% covered"
- **AC:** Breakdown by section type

**US-24.6:** As a PM, I want to mark sections as intentionally uncovered so that I don't see false gap warnings.
- **AC:** Right-click section → "Mark as intentionally uncovered"
- **AC:** Section shows different indicator (grey, not red)
- **AC:** Excluded from coverage calculation

---

## Visual Design

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Review                    COVERAGE: 87% ████████▒░              │
├──────────────────────────────────┬──────────────────────────────────────────┤
│                                  │                                          │
│  SPECIFICATION                   │  GENERATED STORIES                       │
│  ──────────────                  │  ────────────────                        │
│                                  │                                          │
│  ┌────────────────────────────┐  │   ┌────────────────────────────────────┐ │
│  │ 1. Overview           [✓]  │──┼──▶│ EPIC: Patient Demographics         │ │
│  │                            │  │   │ ─────────────────────────          │ │
│  │ This specification defines │  │   │ 4 features, 12 stories             │ │
│  │ the requirements for...    │  │   └────────────────────────────────────┘ │
│  └────────────────────────────┘  │                                          │
│                                  │   ┌────────────────────────────────────┐ │
│  ┌────────────────────────────┐  │   │ FEATURE: ADT Processing            │ │
│  │ 2. Message Reception  [✓]  │──┼──▶│ ───────────────────                 │ │
│  │                            │  │   │                                     │ │
│  │ The integration engine     │  │   │  • Story: Implement listener       │ │
│  │ shall receive HL7 ADT...   │  │   │  • Story: Parse message types      │ │
│  └────────────────────────────┘  │   │  • Story: Send acknowledgment      │ │
│                                  │   └────────────────────────────────────┘ │
│  ┌────────────────────────────┐  │                                          │
│  │ 3. Patient Matching   [✓]  │──┼──▶   (multiple stories...)              │
│  └────────────────────────────┘  │                                          │
│                                  │                                          │
│  ┌────────────────────────────┐  │                                          │
│  │ 4. Audit Trail        [!]  │  │   ⚠️ No stories generated               │
│  │                            │  │   [Generate Stories]                    │
│  │ All operations logged...   │  │                                          │
│  └────────────────────────────┘  │                                          │
│                                  │                                          │
└──────────────────────────────────┴──────────────────────────────────────────┘

Legend:
[✓] = Covered (green)
[!] = Uncovered (orange/red)
[—] = Intentionally skipped (grey)
───▶ = Connection line (appears on hover/click)
```

### Interaction States

**Hover on Section:**
- Section gets subtle highlight
- Stories that trace to this section get matching highlight
- Connection line fades in

**Click on Section:**
- Section selected (stronger highlight)
- Stories scroll into view if needed
- Connection lines stay visible

**Hover on Story:**
- Story gets highlight
- Source section(s) get matching highlight

**Click on Story:**
- Opens story in editor panel (existing Review page behavior)
- Or: Navigate to story in tree view

---

## Technical Design

### Data Model

The existing `WorkItemSource` model already links work items to spec sections:

```prisma
model WorkItemSource {
  workItemId    String
  sectionId     String
  relevanceScore Float
  
  workItem      WorkItem    @relation(fields: [workItemId], references: [id])
  section       SpecSection @relation(fields: [sectionId], references: [id])
  
  @@id([workItemId, sectionId])
}
```

### API Endpoints

#### GET /api/specs/:id/coverage/visual

Returns all data needed for the coverage view:

```typescript
interface CoverageVisualizationResponse {
  spec: {
    id: string;
    name: string;
    extractedText: string;
  };
  sections: Array<{
    id: string;
    sectionRef: string;
    heading: string;
    content: string;
    orderIndex: number;
    coverage: {
      status: 'covered' | 'partial' | 'uncovered' | 'intentional';
      storyCount: number;
      workItemIds: string[];
    };
  }>;
  workItems: Array<{
    id: string;
    type: WorkItemType;
    title: string;
    status: WorkItemStatus;
    parentId: string | null;
    sourceSectionIds: string[];
  }>;
  summary: {
    totalSections: number;
    coveredSections: number;
    partialSections: number;
    uncoveredSections: number;
    intentionallyUncovered: number;
    coveragePercentage: number;
  };
}
```

#### POST /api/specs/:specId/sections/:sectionId/mark-uncovered

Mark a section as intentionally uncovered:

```typescript
// Request
{ intentionallyUncovered: boolean }

// Response
{ data: { success: true } }
```

### Backend Service

```typescript
// backend/src/services/CoverageVisualizationService.ts

export class CoverageVisualizationService {
  
  async getCoverageVisualization(specId: string): Promise<CoverageVisualizationResponse> {
    // Get spec with sections
    const spec = await prisma.spec.findUnique({
      where: { id: specId },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            workItemSources: {
              include: {
                workItem: true
              }
            }
          }
        },
        workItems: {
          include: {
            sources: true
          }
        }
      }
    });
    
    if (!spec) throw new NotFoundError('Spec not found');
    
    // Calculate coverage for each section
    const sectionsWithCoverage = spec.sections.map(section => {
      const linkedWorkItems = section.workItemSources.map(s => s.workItem);
      const storyCount = linkedWorkItems.filter(w => w.type === 'story').length;
      
      let status: 'covered' | 'partial' | 'uncovered' | 'intentional';
      if (section.intentionallyUncovered) {
        status = 'intentional';
      } else if (storyCount === 0) {
        status = 'uncovered';
      } else if (storyCount < this.expectedStoryCount(section)) {
        status = 'partial';
      } else {
        status = 'covered';
      }
      
      return {
        id: section.id,
        sectionRef: section.sectionRef,
        heading: section.heading,
        content: section.content,
        orderIndex: section.orderIndex,
        coverage: {
          status,
          storyCount,
          workItemIds: linkedWorkItems.map(w => w.id),
        }
      };
    });
    
    // Build work item tree with source links
    const workItems = spec.workItems.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      status: item.status,
      parentId: item.parentId,
      sourceSectionIds: item.sources.map(s => s.sectionId),
    }));
    
    // Calculate summary
    const totalSections = sectionsWithCoverage.length;
    const coveredSections = sectionsWithCoverage.filter(s => s.coverage.status === 'covered').length;
    const partialSections = sectionsWithCoverage.filter(s => s.coverage.status === 'partial').length;
    const uncoveredSections = sectionsWithCoverage.filter(s => s.coverage.status === 'uncovered').length;
    const intentionallyUncovered = sectionsWithCoverage.filter(s => s.coverage.status === 'intentional').length;
    
    const countableSections = totalSections - intentionallyUncovered;
    const coveragePercentage = countableSections > 0 
      ? Math.round(((coveredSections + partialSections * 0.5) / countableSections) * 100)
      : 100;
    
    return {
      spec: {
        id: spec.id,
        name: spec.name,
        extractedText: spec.extractedText,
      },
      sections: sectionsWithCoverage,
      workItems,
      summary: {
        totalSections,
        coveredSections,
        partialSections,
        uncoveredSections,
        intentionallyUncovered,
        coveragePercentage,
      }
    };
  }
  
  private expectedStoryCount(section: SpecSection): number {
    // Heuristic: expect roughly 1 story per 200 words of requirements
    const wordCount = section.content.split(/\s+/).length;
    return Math.max(1, Math.floor(wordCount / 200));
  }
  
  async markSectionUncovered(specId: string, sectionId: string, intentional: boolean) {
    await prisma.specSection.update({
      where: { id: sectionId },
      data: { intentionallyUncovered: intentional }
    });
  }
}
```

### Frontend Components

#### CoverageView Page

```tsx
// frontend/src/pages/CoverageViewPage.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageLayout } from '../components/templates/PageLayout';
import { SpecPanel } from '../components/organisms/SpecPanel';
import { StoriesPanel } from '../components/organisms/StoriesPanel';
import { CoverageBar } from '../components/molecules/CoverageBar';
import { ConnectionLines } from '../components/molecules/ConnectionLines';
import { getCoverageVisualization } from '../services/api';

export function CoverageViewPage() {
  const { specId } = useParams<{ specId: string }>();
  const [data, setData] = useState<CoverageVisualizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [hoveredWorkItemId, setHoveredWorkItemId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!specId) return;
    
    setLoading(true);
    getCoverageVisualization(specId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [specId]);
  
  if (loading || !data) {
    return <PageLayout title="Coverage View"><Spinner /></PageLayout>;
  }
  
  // Determine which sections/items should be highlighted
  const highlightedSectionIds = new Set<string>();
  const highlightedWorkItemIds = new Set<string>();
  
  // If a section is selected/hovered, highlight its work items
  const activeSectionId = selectedSectionId || hoveredSectionId;
  if (activeSectionId) {
    highlightedSectionIds.add(activeSectionId);
    const section = data.sections.find(s => s.id === activeSectionId);
    section?.coverage.workItemIds.forEach(id => highlightedWorkItemIds.add(id));
  }
  
  // If a work item is selected/hovered, highlight its source sections
  const activeWorkItemId = selectedWorkItemId || hoveredWorkItemId;
  if (activeWorkItemId) {
    highlightedWorkItemIds.add(activeWorkItemId);
    const item = data.workItems.find(w => w.id === activeWorkItemId);
    item?.sourceSectionIds.forEach(id => highlightedSectionIds.add(id));
  }
  
  return (
    <PageLayout 
      title={`Coverage: ${data.spec.name}`}
      breadcrumbs={[
        { label: 'Specs', href: '/' },
        { label: data.spec.name, href: `/review/${specId}` },
        { label: 'Coverage' }
      ]}
    >
      {/* Coverage summary bar */}
      <CoverageBar summary={data.summary} className="mb-4" />
      
      {/* Split panel view */}
      <div className="flex gap-4 h-[calc(100vh-200px)] relative">
        {/* Left: Spec sections */}
        <SpecPanel
          sections={data.sections}
          highlightedIds={highlightedSectionIds}
          selectedId={selectedSectionId}
          onSectionClick={setSelectedSectionId}
          onSectionHover={setHoveredSectionId}
          className="w-1/2"
        />
        
        {/* Connection lines overlay */}
        <ConnectionLines
          sections={data.sections}
          workItems={data.workItems}
          activeSectionId={activeSectionId}
          activeWorkItemId={activeWorkItemId}
        />
        
        {/* Right: Work items */}
        <StoriesPanel
          workItems={data.workItems}
          highlightedIds={highlightedWorkItemIds}
          selectedId={selectedWorkItemId}
          onItemClick={setSelectedWorkItemId}
          onItemHover={setHoveredWorkItemId}
          className="w-1/2"
        />
      </div>
    </PageLayout>
  );
}
```

#### SpecPanel Component

```tsx
// frontend/src/components/organisms/SpecPanel.tsx
import { useRef, useEffect } from 'react';
import { SectionCard } from '../molecules/SectionCard';

interface SpecPanelProps {
  sections: Section[];
  highlightedIds: Set<string>;
  selectedId: string | null;
  onSectionClick: (id: string) => void;
  onSectionHover: (id: string | null) => void;
  className?: string;
}

export function SpecPanel({
  sections,
  highlightedIds,
  selectedId,
  onSectionClick,
  onSectionHover,
  className
}: SpecPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Scroll selected section into view
  useEffect(() => {
    if (selectedId && sectionRefs.current.has(selectedId)) {
      sectionRefs.current.get(selectedId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedId]);
  
  return (
    <div 
      ref={containerRef}
      className={`bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg overflow-y-auto ${className}`}
    >
      <div className="p-4 border-b border-toucan-dark-border sticky top-0 bg-toucan-dark-lighter z-10">
        <h2 className="text-lg font-semibold text-toucan-grey-100">
          Specification
        </h2>
        <p className="text-sm text-toucan-grey-400">
          {sections.length} sections
        </p>
      </div>
      
      <div className="p-4 space-y-4">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(section.id, el);
            }}
            section={section}
            isHighlighted={highlightedIds.has(section.id)}
            isSelected={selectedId === section.id}
            onClick={() => onSectionClick(section.id)}
            onMouseEnter={() => onSectionHover(section.id)}
            onMouseLeave={() => onSectionHover(null)}
          />
        ))}
      </div>
    </div>
  );
}
```

#### SectionCard Component

```tsx
// frontend/src/components/molecules/SectionCard.tsx
import { forwardRef } from 'react';
import { Badge } from '../atoms/Badge';

interface SectionCardProps {
  section: {
    id: string;
    heading: string;
    content: string;
    coverage: {
      status: 'covered' | 'partial' | 'uncovered' | 'intentional';
      storyCount: number;
    };
  };
  isHighlighted: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const STATUS_STYLES = {
  covered: {
    border: 'border-toucan-success/50',
    bg: 'bg-toucan-success/5',
    badge: 'success',
    icon: '✓',
  },
  partial: {
    border: 'border-toucan-warning/50',
    bg: 'bg-toucan-warning/5',
    badge: 'warning',
    icon: '◐',
  },
  uncovered: {
    border: 'border-toucan-error/50',
    bg: 'bg-toucan-error/5',
    badge: 'error',
    icon: '!',
  },
  intentional: {
    border: 'border-toucan-grey-600/50',
    bg: 'bg-toucan-grey-600/5',
    badge: 'default',
    icon: '—',
  },
};

export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ section, isHighlighted, isSelected, onClick, onMouseEnter, onMouseLeave }, ref) => {
    const style = STATUS_STYLES[section.coverage.status];
    
    return (
      <div
        ref={ref}
        data-section-id={section.id}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
          ${style.border} ${style.bg}
          ${isHighlighted ? 'ring-2 ring-toucan-orange ring-offset-2 ring-offset-toucan-dark' : ''}
          ${isSelected ? 'ring-2 ring-toucan-orange' : ''}
          hover:border-toucan-orange/50
        `}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-toucan-grey-100">
            {section.heading}
          </h3>
          <div className="flex items-center gap-2">
            {section.coverage.storyCount > 0 && (
              <span className="text-xs text-toucan-grey-400">
                {section.coverage.storyCount} stories
              </span>
            )}
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              section.coverage.status === 'covered' ? 'bg-toucan-success/20 text-toucan-success' :
              section.coverage.status === 'partial' ? 'bg-toucan-warning/20 text-toucan-warning' :
              section.coverage.status === 'uncovered' ? 'bg-toucan-error/20 text-toucan-error' :
              'bg-toucan-grey-600/20 text-toucan-grey-400'
            }`}>
              {style.icon}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-toucan-grey-400 line-clamp-3">
          {section.content}
        </p>
        
        {section.coverage.status === 'uncovered' && (
          <button className="mt-2 text-xs text-toucan-orange hover:underline">
            Generate stories for this section →
          </button>
        )}
      </div>
    );
  }
);
```

#### ConnectionLines Component

```tsx
// frontend/src/components/molecules/ConnectionLines.tsx
import { useEffect, useState, useRef } from 'react';

interface ConnectionLinesProps {
  sections: Section[];
  workItems: WorkItem[];
  activeSectionId: string | null;
  activeWorkItemId: string | null;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sectionId: string;
  workItemId: string;
}

export function ConnectionLines({
  sections,
  workItems,
  activeSectionId,
  activeWorkItemId
}: ConnectionLinesProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!activeSectionId && !activeWorkItemId) {
      setLines([]);
      return;
    }
    
    // Calculate line positions
    const newLines: Line[] = [];
    
    if (activeSectionId) {
      const section = sections.find(s => s.id === activeSectionId);
      if (section) {
        const sectionEl = document.querySelector(`[data-section-id="${activeSectionId}"]`);
        
        section.coverage.workItemIds.forEach(workItemId => {
          const workItemEl = document.querySelector(`[data-workitem-id="${workItemId}"]`);
          
          if (sectionEl && workItemEl) {
            const sectionRect = sectionEl.getBoundingClientRect();
            const workItemRect = workItemEl.getBoundingClientRect();
            const containerRect = containerRef.current?.getBoundingClientRect();
            
            if (containerRect) {
              newLines.push({
                x1: sectionRect.right - containerRect.left,
                y1: sectionRect.top + sectionRect.height / 2 - containerRect.top,
                x2: workItemRect.left - containerRect.left,
                y2: workItemRect.top + workItemRect.height / 2 - containerRect.top,
                sectionId: activeSectionId,
                workItemId,
              });
            }
          }
        });
      }
    }
    
    if (activeWorkItemId) {
      const workItem = workItems.find(w => w.id === activeWorkItemId);
      if (workItem) {
        const workItemEl = document.querySelector(`[data-workitem-id="${activeWorkItemId}"]`);
        
        workItem.sourceSectionIds.forEach(sectionId => {
          const sectionEl = document.querySelector(`[data-section-id="${sectionId}"]`);
          
          if (sectionEl && workItemEl) {
            const sectionRect = sectionEl.getBoundingClientRect();
            const workItemRect = workItemEl.getBoundingClientRect();
            const containerRect = containerRef.current?.getBoundingClientRect();
            
            if (containerRect) {
              newLines.push({
                x1: sectionRect.right - containerRect.left,
                y1: sectionRect.top + sectionRect.height / 2 - containerRect.top,
                x2: workItemRect.left - containerRect.left,
                y2: workItemRect.top + workItemRect.height / 2 - containerRect.top,
                sectionId,
                workItemId: activeWorkItemId,
              });
            }
          }
        });
      }
    }
    
    setLines(newLines);
  }, [activeSectionId, activeWorkItemId, sections, workItems]);
  
  if (lines.length === 0) return null;
  
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20"
    >
      <svg className="w-full h-full">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        
        {lines.map((line, i) => (
          <g key={i}>
            {/* Bezier curve for smooth connection */}
            <path
              d={`M ${line.x1} ${line.y1} C ${line.x1 + 50} ${line.y1}, ${line.x2 - 50} ${line.y2}, ${line.x2} ${line.y2}`}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-dash"
            />
            
            {/* Start dot */}
            <circle
              cx={line.x1}
              cy={line.y1}
              r="4"
              fill="#FF6B35"
            />
            
            {/* End arrow */}
            <circle
              cx={line.x2}
              cy={line.y2}
              r="4"
              fill="#FF6B35"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
```

#### CoverageBar Component

```tsx
// frontend/src/components/molecules/CoverageBar.tsx
interface CoverageBarProps {
  summary: {
    totalSections: number;
    coveredSections: number;
    partialSections: number;
    uncoveredSections: number;
    intentionallyUncovered: number;
    coveragePercentage: number;
  };
  className?: string;
}

export function CoverageBar({ summary, className }: CoverageBarProps) {
  return (
    <div className={`bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-toucan-grey-100">
            Coverage
          </h2>
          <span className={`text-2xl font-bold ${
            summary.coveragePercentage >= 80 ? 'text-toucan-success' :
            summary.coveragePercentage >= 50 ? 'text-toucan-warning' :
            'text-toucan-error'
          }`}>
            {summary.coveragePercentage}%
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-toucan-success" />
            <span className="text-toucan-grey-400">{summary.coveredSections} covered</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-toucan-warning" />
            <span className="text-toucan-grey-400">{summary.partialSections} partial</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-toucan-error" />
            <span className="text-toucan-grey-400">{summary.uncoveredSections} uncovered</span>
          </span>
          {summary.intentionallyUncovered > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-toucan-grey-600" />
              <span className="text-toucan-grey-400">{summary.intentionallyUncovered} skipped</span>
            </span>
          )}
        </div>
      </div>
      
      {/* Stacked progress bar */}
      <div className="h-3 bg-toucan-dark rounded-full overflow-hidden flex">
        <div 
          className="bg-toucan-success transition-all"
          style={{ width: `${(summary.coveredSections / summary.totalSections) * 100}%` }}
        />
        <div 
          className="bg-toucan-warning transition-all"
          style={{ width: `${(summary.partialSections / summary.totalSections) * 100}%` }}
        />
        <div 
          className="bg-toucan-error transition-all"
          style={{ width: `${(summary.uncoveredSections / summary.totalSections) * 100}%` }}
        />
        <div 
          className="bg-toucan-grey-600 transition-all"
          style={{ width: `${(summary.intentionallyUncovered / summary.totalSections) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

---

## Database Changes

Add `intentionallyUncovered` to SpecSection:

```prisma
model SpecSection {
  // ... existing fields
  intentionallyUncovered Boolean @default(false)
}
```

Migration:
```sql
ALTER TABLE "SpecSection" ADD COLUMN "intentionallyUncovered" BOOLEAN DEFAULT false;
```

---

## Route Changes

```tsx
// Add to App.tsx routes
<Route path="/coverage/:specId" element={<CoverageViewPage />} />
```

Add navigation from Review page:
```tsx
// In ReviewPage or SpecCard
<Link to={`/coverage/${specId}`}>
  View Coverage
</Link>
```

---

## Testing Checklist

### Unit Tests

- [ ] `CoverageVisualizationService.getCoverageVisualization` returns correct structure
- [ ] Coverage percentage calculation handles edge cases
- [ ] Section status determination is correct
- [ ] `markSectionUncovered` updates database

### Integration Tests

- [ ] API returns coverage data with sections and work items
- [ ] Work item source links are included
- [ ] Intentionally uncovered sections excluded from percentage

### E2E Tests

- [ ] Navigate to coverage view from review page
- [ ] Click section → stories highlight
- [ ] Click story → sections highlight
- [ ] Mark section as intentionally uncovered → updates display
- [ ] Connection lines render correctly

### Visual Tests

- [ ] Coverage bar renders with correct colors
- [ ] Section cards show correct status indicators
- [ ] Connection lines animate smoothly
- [ ] Responsive layout works on smaller screens

---

## Performance Considerations

- Virtual scrolling if > 50 sections
- Debounce hover events (50ms)
- Cache coverage calculation
- Lazy load connection line calculations

---

## Rollback Plan

If coverage view causes issues:
1. Remove route from App.tsx
2. Remove "View Coverage" links
3. Keep backend service (used for other features)

---

*F24 Specification v1.0*
