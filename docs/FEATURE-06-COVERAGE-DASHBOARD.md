# Feature 6: Coverage Dashboard

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 1.5 hours  
**Complexity**: Low

---

## 1. Overview

### What We're Building
A visual dashboard showing which sections of the original spec document generated work items and which sections were missed. Displays a heatmap, coverage percentage, and lists uncovered sections for review.

### Why We're Building It
AI translation may miss sections of the spec, especially:
- Appendices and supplementary sections
- Non-functional requirements (performance, security)
- Edge cases mentioned in footnotes
- Cross-cutting concerns

Product managers need confidence that all requirements are captured before sprint planning. Currently, this requires manual comparison between spec and generated items.

**Reference**: This is a quality gate per Axelrod's testing strategy - verify coverage before proceeding to implementation.

### Success Criteria
1. Visual heatmap shows coverage by section at a glance
2. Uncovered sections listed with links to source
3. Coverage percentage calculated automatically
4. Can drill down from section to related stories
5. Export coverage report as PDF

---

## 2. User Stories

### Must Have (P0)

**US-6.1: View Coverage Heatmap**
> As a PM, I want to see a heatmap of spec coverage, so that I can quickly identify gaps.

*Acceptance Criteria:*
- Heatmap shows spec sections as blocks
- Color intensity indicates story count (0=red, 1-2=yellow, 3+=green)
- Hover shows section title and story count
- Click navigates to section details

**US-6.2: View Coverage Percentage**
> As a PM, I want to see overall coverage percentage, so that I can assess translation completeness.

*Acceptance Criteria:*
- Percentage displayed prominently
- Formula: (sections with 1+ story) / (total sections) × 100
- Updates when stories added/removed
- Breakdown by section level (top-level, subsections)

**US-6.3: List Uncovered Sections**
> As a PM, I want to see which sections have no stories, so that I can decide if coverage is needed.

*Acceptance Criteria:*
- List of sections with 0 stories
- Shows section heading and preview of content
- "Create Story" action for each
- Can mark section as "intentionally uncovered"

**US-6.4: Section-to-Story Mapping**
> As a reviewer, I want to see which stories came from a section, so that I can verify coverage quality.

*Acceptance Criteria:*
- Click section shows linked stories
- Stories show relevance indicator (primary/supporting)
- Can navigate to story editor

### Should Have (P1)

**US-6.5: Export Coverage Report**
> As a PM, I want to export coverage as PDF, so that I can share with stakeholders.

*Acceptance Criteria:*
- "Export PDF" button
- Includes heatmap, percentage, uncovered list
- Suitable for printing

---

## 3. Functional Requirements

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-6.01 | Query spec sections with story counts | Integration test |
| FR-6.02 | Calculate coverage percentage | Unit test |
| FR-6.03 | Return sections grouped by parent | Unit test |
| FR-6.04 | Color mapping: 0=red, 1-2=yellow, 3+=green | Unit test |
| FR-6.05 | List uncovered sections (storyCount = 0) | Integration test |
| FR-6.06 | Section-to-story mapping via WorkItemSource | Integration test |
| FR-6.07 | Mark section as intentionally uncovered | Integration test |
| FR-6.08 | Export as PDF with react-pdf | E2E test |
| FR-6.09 | Cache coverage calculation (invalidate on story change) | Integration test |

---

## 4. Architecture

### Data Source

Coverage uses existing data:
- `SpecSection` - sections from spec document
- `WorkItemSource` - links stories to source sections with `relevance` score
- Aggregate: COUNT(DISTINCT workItemId) GROUP BY sectionId

### Coverage Calculation

```typescript
interface CoverageData {
  totalSections: number;
  coveredSections: number;
  coveragePercent: number;
  sections: SectionCoverage[];
}

interface SectionCoverage {
  id: string;
  sectionRef: string;  // "1.2.3"
  heading: string;
  contentPreview: string;
  storyCount: number;
  stories: { id: string; title: string; relevance: number }[];
  intentionallyUncovered: boolean;
}

function calculateCoverage(specId: string): CoverageData {
  const sections = await prisma.specSection.findMany({
    where: { specId },
    include: {
      workItemSources: {
        include: { workItem: true }
      }
    }
  });
  
  const sectionCoverage = sections.map(s => ({
    id: s.id,
    sectionRef: s.sectionRef,
    heading: s.heading,
    contentPreview: s.content.substring(0, 200),
    storyCount: s.workItemSources.length,
    stories: s.workItemSources.map(ws => ({
      id: ws.workItem.id,
      title: ws.workItem.title,
      relevance: ws.relevance
    })),
    intentionallyUncovered: s.intentionallyUncovered || false
  }));
  
  const covered = sectionCoverage.filter(s => 
    s.storyCount > 0 || s.intentionallyUncovered
  ).length;
  
  return {
    totalSections: sections.length,
    coveredSections: covered,
    coveragePercent: Math.round((covered / sections.length) * 100),
    sections: sectionCoverage
  };
}
```

---

## 5. Data Model

### Add to SpecSection

```prisma
model SpecSection {
  // ... existing fields ...
  intentionallyUncovered Boolean @default(false) @map("intentionally_uncovered")
}
```

### Migration

```sql
ALTER TABLE "spec_sections" 
ADD COLUMN "intentionally_uncovered" BOOLEAN NOT NULL DEFAULT FALSE;
```

---

## 6. API Design

### GET /api/specs/:specId/coverage

**Response 200 OK**:
```json
{
  "data": {
    "totalSections": 24,
    "coveredSections": 20,
    "coveragePercent": 83,
    "uncoveredCount": 4,
    "sections": [
      {
        "id": "sec-1",
        "sectionRef": "1.0",
        "heading": "Introduction",
        "contentPreview": "This document describes...",
        "storyCount": 0,
        "stories": [],
        "intentionallyUncovered": true
      },
      {
        "id": "sec-2",
        "sectionRef": "2.1",
        "heading": "User Authentication",
        "contentPreview": "Users must be able to...",
        "storyCount": 3,
        "stories": [
          { "id": "item-1", "title": "User login", "relevance": 0.95 },
          { "id": "item-2", "title": "Password reset", "relevance": 0.85 },
          { "id": "item-3", "title": "Session management", "relevance": 0.70 }
        ],
        "intentionallyUncovered": false
      }
    ]
  }
}
```

### PUT /api/spec-sections/:id/coverage-status

**Request**:
```json
{
  "intentionallyUncovered": true,
  "reason": "Introduction section, no actionable requirements"
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "sec-1",
    "intentionallyUncovered": true
  }
}
```

---

## 7. UI/UX Specification

### Screen: Coverage Dashboard

**Route**: `/specs/:specId/coverage`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Review              Coverage Report     [Export PDF] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Summary ──────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │   83%              20 of 24 sections covered                │ │
│  │   ████████████░░░                                           │ │
│  │                                                             │ │
│  │   ⚠️ 4 sections need review                                 │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Heatmap ──────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  1. Introduction            ░░░░░░  (intentionally skipped) │ │
│  │  2. Requirements                                            │ │
│  │     2.1 Authentication      ████████  3 stories             │ │
│  │     2.2 Authorization       ██████    2 stories             │ │
│  │     2.3 User Management     ████████  4 stories             │ │
│  │  3. Technical Specs                                         │ │
│  │     3.1 API Design          ████████  5 stories             │ │
│  │     3.2 Database            ████      1 story               │ │
│  │     3.3 Performance         ░░░░░░    0 stories ⚠️          │ │
│  │  4. Appendix                ░░░░░░    0 stories ⚠️          │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Uncovered Sections ───────────────────────────────────────┐ │
│  │                                                             │ │
│  │  ⚠️ 3.3 Performance Requirements                           │ │
│  │  "The system must handle 1000 concurrent users..."          │ │
│  │  [Create Story] [Mark as Intentionally Uncovered]           │ │
│  │                                                             │ │
│  │  ⚠️ 4.0 Appendix                                           │ │
│  │  "Glossary of terms and references..."                      │ │
│  │  [Create Story] [Mark as Intentionally Uncovered]           │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component: Section Detail (on click)

```
┌─────────────────────────────────────────────────────────────────┐
│  2.1 Authentication                                      [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Content Preview:                                                │
│  "Users must be able to log in using email and password.         │
│   Support for SSO via SAML 2.0 is required for enterprise..."   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Stories from this section (3):                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ● User login                         95% relevance  [Open]  ││
│  │ ● Password reset                     85% relevance  [Open]  ││
│  │ ● Session management                 70% relevance  [Open]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
CoveragePage (page)
├── PageHeader
│   ├── BackButton
│   ├── Title "Coverage Report"
│   └── ExportPDFButton
├── CoverageSummary (molecule)
│   ├── PercentageDisplay
│   ├── ProgressBar
│   └── WarningBadge (if uncovered)
├── CoverageHeatmap (organism)
│   └── HeatmapRow (molecule) × N
│       ├── SectionRef
│       ├── Heading
│       ├── CoverageBar (color-coded)
│       ├── StoryCount
│       └── WarningIcon (if 0)
├── UncoveredSectionsList (organism)
│   └── UncoveredSectionCard (molecule) × N
│       ├── SectionHeading
│       ├── ContentPreview
│       ├── CreateStoryButton
│       └── MarkIntentionalButton
└── SectionDetailPanel (organism) - on click
    ├── SectionContent
    └── LinkedStoriesList
```

### Color Mapping

```typescript
function getCoverageColor(storyCount: number, intentionallyUncovered: boolean): string {
  if (intentionallyUncovered) return 'bg-gray-300';  // Neutral gray
  if (storyCount === 0) return 'bg-red-500';          // Uncovered
  if (storyCount <= 2) return 'bg-yellow-400';        // Partial
  return 'bg-green-500';                              // Good coverage
}
```

---

## 8. Testing Strategy

### Unit Tests

```typescript
describe('CoverageService', () => {
  describe('calculateCoverage', () => {
    it('calculates percentage correctly', async () => {
      // 3 sections, 2 with stories
      const spec = await createSpecWithSections([
        { heading: 'A', storyCount: 2 },
        { heading: 'B', storyCount: 1 },
        { heading: 'C', storyCount: 0 }
      ]);
      
      const result = await service.calculateCoverage(spec.id);
      
      expect(result.coveragePercent).toBe(67); // 2/3
    });

    it('includes intentionally uncovered in coverage', async () => {
      const spec = await createSpecWithSections([
        { heading: 'A', storyCount: 1 },
        { heading: 'B', storyCount: 0, intentionallyUncovered: true }
      ]);
      
      const result = await service.calculateCoverage(spec.id);
      
      expect(result.coveragePercent).toBe(100); // Both covered
    });

    it('returns sections sorted by sectionRef', async () => {
      const spec = await createSpecWithSections([
        { sectionRef: '2.1', heading: 'B' },
        { sectionRef: '1.0', heading: 'A' },
        { sectionRef: '1.1', heading: 'A1' }
      ]);
      
      const result = await service.calculateCoverage(spec.id);
      
      expect(result.sections[0].sectionRef).toBe('1.0');
      expect(result.sections[1].sectionRef).toBe('1.1');
      expect(result.sections[2].sectionRef).toBe('2.1');
    });
  });
});
```

### Integration Tests

```typescript
describe('GET /api/specs/:specId/coverage', () => {
  it('returns coverage data', async () => {
    const spec = await createSpecWithLinkedStories();
    
    const response = await app.inject({
      method: 'GET',
      url: `/api/specs/${spec.id}/coverage`,
      headers: { authorization: `Bearer ${token}` }
    });
    
    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.totalSections).toBeGreaterThan(0);
    expect(data.coveragePercent).toBeDefined();
    expect(data.sections).toBeInstanceOf(Array);
  });
});

describe('PUT /api/spec-sections/:id/coverage-status', () => {
  it('marks section as intentionally uncovered', async () => {
    const section = await createSpecSection();
    
    const response = await app.inject({
      method: 'PUT',
      url: `/api/spec-sections/${section.id}/coverage-status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { intentionallyUncovered: true }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().data.intentionallyUncovered).toBe(true);
  });
});
```

---

## 9. Implementation Plan

### Build Order

```
Phase 1: Backend (40 min)
├── Migration (add intentionallyUncovered)
├── CoverageService
│   └── calculateCoverage()
├── Routes
│   ├── GET /specs/:specId/coverage
│   └── PUT /spec-sections/:id/coverage-status
└── Tests

Phase 2: Frontend (45 min)
├── CoverageSummary component
├── CoverageHeatmap component
├── UncoveredSectionsList component
├── SectionDetailPanel component
└── CoveragePage integration

Phase 3: PDF Export (15 min)
├── Install react-pdf
├── CoveragePDFDocument component
└── Export button handler
```

### Files to Create

**Backend:**
- `backend/src/services/CoverageService.ts`
- `backend/src/routes/coverage.ts`

**Frontend:**
- `frontend/src/pages/CoveragePage.tsx`
- `frontend/src/components/organisms/CoverageHeatmap.tsx`
- `frontend/src/components/molecules/CoverageSummary.tsx`
- `frontend/src/components/molecules/UncoveredSectionCard.tsx`
- `frontend/src/components/organisms/SectionDetailPanel.tsx`

### Dependencies

```bash
npm install @react-pdf/renderer
```

---

## 10. Open Questions

1. **What constitutes "coverage"?**
   - Current: Any story linked = covered
   - Alternative: Require primary relevance > 0.8
   - **Recommendation**: Keep simple (any link) for v1

2. **Should coverage affect translation status?**
   - Could block export until 100% coverage
   - **Recommendation**: Warning only, don't block

---

*End of Feature 6 Specification*
