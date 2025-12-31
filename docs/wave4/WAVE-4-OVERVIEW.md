# Wave 4: Visual Intelligence & Quality Engine

> **The bridge between "working" and "world-class"**

---

## Executive Summary

Wave 4 transforms Handoff AI from a functional translation tool into an intelligent, visual-first platform that provides unprecedented visibility into the spec-to-story pipeline. This wave introduces three major capabilities:

1. **Visual Traceability** - See exactly how specs become stories, what's covered, and what's missing
2. **Quality Intelligence** - Automatic scoring, splitting suggestions, and duplicate detection
3. **Polish & Reliability** - Fix critical bugs, improve UX consistency, add test data

**Total Features:** 13 (F19-F31)  
**Estimated Effort:** 70-80 hours  
**Build Order:** 3 phases over 3-4 overnight sessions

---

## Design Philosophy

This wave is grounded in principles from our reference library:

### From Ousterhout (Philosophy of Software Design)
> "The best modules are those that provide powerful functionality yet have simple interfaces. I use the term *deep* to describe such modules."

**Application:** Each new service (QualityScoreService, DuplicateDetectionService, CoverageVisualizationService) will be deep modules - complex implementations hidden behind simple interfaces. The SpecCoverageView component doesn't need to know how coverage is calculated; it just asks "what's the coverage for this spec?" and gets a clean response.

### From Frost (Atomic Design)
> "Atomic design is not a linear process, but rather a mental model to help us think of our user interfaces as both a cohesive whole and a collection of parts at the same time."

**Application:** New visual components follow atomic hierarchy:
- **Atoms:** CoverageBadge, QualityScorePill, ConnectionLine
- **Molecules:** SpecSectionCard, StoryTraceLink, ScoreBreakdown
- **Organisms:** SpecCoveragePanel, RelationshipGraph, QualityDashboard
- **Templates:** SpecAnalysisLayout, VisualReviewLayout

### From Krug (Don't Make Me Think)
> "A good visual hierarchy saves us work by preprocessing the page for us, organizing and prioritizing its contents in a way that we can grasp almost instantly."

**Application:** The Spec Coverage View uses visual hierarchy ruthlessly:
- Covered sections: solid border, subtle green tint
- Partial coverage: yellow warning indicator
- Uncovered sections: red outline, prominent "Generate Stories" CTA
- Story connections: visible lines with hover highlights

### From Wathan/Schoger (Refactoring UI)
> "Whenever you're relying on spacing to connect a group of elements, always make sure there's more space around the group than there is within it."

**Application:** The side-by-side spec/story view uses deliberate spacing:
- Spec sections have 16px internal padding
- 32px gap between spec panel and story panel  
- Connection lines originate from section edge, terminate at story edge
- Hover states expand the visual connection (subtle background highlight on both sides)

### From Huyen (AI Engineering)
> "RAG is a technique that enhances a model's generation by retrieving the relevant information from external memory sources."

**Application:** The Smart Context Builder (Wave 3) already implements RAG. Wave 4 extends this by:
- Using embeddings for duplicate detection (semantic similarity)
- Leveraging existing ContextChunk model for relationship mapping
- Building on CoverageService for visual coverage calculation

### From Axelrod (Test Automation)
> "For each User Story, the team defines together with the product owner one or few scenarios that will demonstrate its intended use after it will be implemented."

**Application:** Every feature spec includes:
- Acceptance criteria as testable scenarios
- E2E test paths for critical flows
- Unit test targets for service methods

---

## Architecture Overview

### New Services

```
┌─────────────────────────────────────────────────────────────────┐
│                        WAVE 4 SERVICES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  QualityScoreService│    │DuplicateDetectService│           │
│  │  ─────────────────  │    │  ───────────────────  │           │
│  │  • scoreStory()     │    │  • findDuplicates()   │           │
│  │  • scoreINVEST()    │    │  • calculateSimilarity│           │
│  │  • getSuggestions() │    │  • getOverlaps()      │           │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  StorySplitService  │    │  SpecAnalysisService │           │
│  │  ─────────────────  │    │  ──────────────────  │           │
│  │  • analyzeSplits()  │    │  • analyzeComplexity()│           │
│  │  • suggestSplits()  │    │  • detectEntities()   │           │
│  │  • executeSplit()   │    │  • predictCoverage()  │           │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │ TemplateBuilderSvc  │    │  ToastService        │           │
│  │  ─────────────────  │    │  ─────────────────   │           │
│  │  • createTemplate() │    │  • success()         │           │
│  │  • validateTemplate│    │  • error()           │           │
│  │  • applyTemplate() │    │  • loading()         │           │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Extended Existing Services

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTENDED SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CoverageService (existing)                                     │
│  ─────────────────────────                                      │
│  + getCoverageVisualization(specId) → CoverageMap               │
│  + getSectionToStoryLinks(specId) → TraceabilityLink[]          │
│  + getUncoveredSections(specId) → SpecSection[]                 │
│                                                                 │
│  ExtractionService (existing)                                   │
│  ────────────────────────────                                   │
│  + extractFromPDF(buffer) → ExtractedText     [FIX]             │
│  + extractFromDOCX(buffer) → ExtractedText    [FIX]             │
│  + preserveStructure(text) → StructuredText   [NEW]             │
│                                                                 │
│  ContextSourceService (existing)                                │
│  ───────────────────────────────                                │
│  + syncWithProgress(sourceId, onProgress) → void  [NEW]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### New Database Models

```prisma
// Quality scoring
model QualityScore {
  id            String   @id @default(uuid())
  workItemId    String   @unique
  workItem      WorkItem @relation(fields: [workItemId], references: [id])
  
  overallScore  Int      // 0-100
  
  // INVEST breakdown
  independentScore   Int  // 0-20
  negotiableScore    Int  // 0-20  
  valuableScore      Int  // 0-20
  estimableScore     Int  // 0-20
  smallScore         Int  // 0-20
  testableScore      Int  // 0-20
  
  suggestions   Json     // Array of improvement suggestions
  analyzedAt    DateTime @default(now())
}

// Duplicate detection
model DuplicateMatch {
  id              String   @id @default(uuid())
  sourceWorkItemId String
  targetWorkItemId String?  // null if external (Jira)
  targetJiraKey    String?  // populated if external
  
  similarityScore Float    // 0.0 - 1.0
  matchType       String   // 'exact' | 'semantic' | 'partial'
  overlappingText String?  // The text that overlaps
  
  status          String   @default("pending") // pending | ignored | merged
  detectedAt      DateTime @default(now())
}

// Pre-translation analysis
model SpecAnalysis {
  id              String   @id @default(uuid())
  specId          String   @unique
  spec            Spec     @relation(fields: [specId], references: [id])
  
  estimatedStories    Int
  complexityScore     Int      // 1-10
  complexityReason    String
  
  detectedEntities    Json     // {name, type, count}[]
  detectedSystems     Json     // {name, mentions}[]
  suggestedGlossary   Json     // {term, context}[]
  
  coverageWarnings    Json     // {section, issue}[]
  confidenceScore     Int      // 0-100
  
  analyzedAt          DateTime @default(now())
}

// Flexible templates
model TicketTemplate {
  id              String   @id @default(uuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  
  name            String
  ticketType      String   // 'story' | 'task' | 'bug' | 'spike' | 'epic'
  isDefault       Boolean  @default(false)
  
  // Structure
  descriptionFormat  String  // 'user_story' | 'imperative' | 'outcome' | 'custom'
  descriptionTemplate String? // Custom template if format is 'custom'
  
  bodySections    Json     // [{name, required, placeholder}]
  acFormat        ACFormat
  
  requiredFields  Json     // [{field, required}]
  customFields    Json     // [{name, type, options}]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### New API Endpoints

```
# Quality Scoring
GET    /api/workitems/:id/quality          → QualityScore
POST   /api/workitems/:id/quality/refresh  → QualityScore
GET    /api/specs/:id/quality/summary      → {average, distribution, flagged[]}

# Story Splitting  
POST   /api/workitems/:id/split/analyze    → SplitSuggestion[]
POST   /api/workitems/:id/split/execute    → WorkItem[]

# Duplicate Detection
POST   /api/specs/:id/duplicates/scan      → DuplicateMatch[]
GET    /api/workitems/:id/duplicates       → DuplicateMatch[]
POST   /api/duplicates/:id/ignore          → void
POST   /api/duplicates/:id/merge           → WorkItem

# Spec Analysis (Pre-translation)
POST   /api/specs/:id/analyze              → SpecAnalysis
GET    /api/specs/:id/analysis             → SpecAnalysis

# Coverage Visualization
GET    /api/specs/:id/coverage/visual      → CoverageVisualization
GET    /api/specs/:id/traceability         → TraceabilityLink[]

# Flexible Templates
GET    /api/projects/:id/ticket-templates  → TicketTemplate[]
POST   /api/projects/:id/ticket-templates  → TicketTemplate
PATCH  /api/ticket-templates/:id           → TicketTemplate
DELETE /api/ticket-templates/:id           → void
POST   /api/ticket-templates/:id/preview   → {rendered: string}

# Relationship Map
GET    /api/projects/:id/relationships     → RelationshipGraph

# Toast/Notifications (frontend only, no API)
```

---

## Feature Summary

### Phase 1: Critical Fixes (10 hours)

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| F19 | PDF/DOCX Upload Fix | Fix extraction failures, add file preview | 3h |
| F20 | Sync Feedback | Progress indicators, loading states | 2h |
| F21 | Branding & Settings | Logo, settings in user menu | 1.5h |
| F22 | Save Confirmation | Toast system, auto-save indicators | 1.5h |
| F23 | Seed Data | Moorfields test project with realistic data | 2h |

### Phase 2: Visual Intelligence (28 hours)

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| F24 | Spec Coverage View | Side-by-side spec ↔ story traceability | 12h |
| F25 | Project Relationship Map | Multi-spec dependency visualization | 10h |
| F26 | Work Breakdown Treemap | Visual hierarchy of all work | 6h |

### Phase 3: Quality Engine (24 hours)

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| F27 | INVEST Quality Scoring | Auto-score stories against INVEST | 6h |
| F28 | Story Splitting Assistant | AI-powered split suggestions | 8h |
| F29 | Duplicate Detection | Find overlaps before Jira export | 6h |
| F30 | Flexible Ticket Templates | Full ticket structure control | 4h |

### Phase 4: Analysis (8 hours)

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| F31 | Pre-Translation Analysis | Complexity estimate, entity detection | 8h |

---

## Build Order & Dependencies

```
Phase 1: Fixes (Can run in parallel)
├── F19: PDF/DOCX Upload Fix
├── F20: Sync Feedback  
├── F21: Branding & Settings
├── F22: Save Confirmation (Toast System) ← Used by all subsequent features
└── F23: Seed Data

Phase 2: Visual Intelligence (Sequential with dependencies)
├── F24: Spec Coverage View
│   └── Depends on: F19 (needs working file extraction)
├── F25: Project Relationship Map
│   └── Depends on: F24 (reuses traceability data)
└── F26: Work Breakdown Treemap
    └── Depends on: F24 (uses coverage data)

Phase 3: Quality Engine (Can run in parallel after Phase 1)
├── F27: INVEST Quality Scoring
├── F28: Story Splitting Assistant
│   └── Depends on: F27 (uses quality scores to identify candidates)
├── F29: Duplicate Detection
└── F30: Flexible Ticket Templates

Phase 4: Analysis
└── F31: Pre-Translation Analysis
    └── Depends on: F27, F29 (integrates quality + duplicate insights)
```

---

## Overnight Build Strategy

### Session 1 (Fixes + Foundation)
- F19, F20, F21, F22, F23
- **Time:** ~10 hours
- **Result:** Stable foundation, working uploads, toast system

### Session 2 (Visual Intelligence)
- F24, F25, F26
- **Time:** ~28 hours
- **Result:** Spec Coverage View, Relationship Map, Treemap

### Session 3 (Quality Engine)
- F27, F28, F29, F30
- **Time:** ~24 hours
- **Result:** INVEST scoring, splitting, duplicate detection, templates

### Session 4 (Analysis + Polish)
- F31
- Integration testing across all features
- **Time:** ~8 hours
- **Result:** Complete Wave 4

---

## Success Criteria

### Functional
- [ ] PDF/DOCX files upload and extract correctly
- [ ] Context source sync shows progress visually
- [ ] Toast notifications appear for all save operations
- [ ] Seed data creates a complete Moorfields test project
- [ ] Spec Coverage View shows section-to-story traceability
- [ ] Clicking a story highlights its source sections
- [ ] Clicking a section shows all stories that cover it
- [ ] Project Relationship Map displays multi-spec dependencies
- [ ] Work items display INVEST quality scores
- [ ] Story splitting suggestions appear for large stories
- [ ] Duplicate detection runs before Jira export
- [ ] Ticket templates allow full structure customization
- [ ] Pre-translation analysis shows complexity estimate

### Non-Functional
- [ ] All new pages load in < 2 seconds
- [ ] Quality scoring completes in < 500ms per story
- [ ] Duplicate scan completes in < 3 seconds for 100 stories
- [ ] Coverage visualization renders smoothly with 50+ sections
- [ ] All new components follow Toucan design system
- [ ] No TypeScript `any` types in new code
- [ ] Unit test coverage > 80% for new services

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| PDF extraction remains flaky | Include fallback: upload plain text manually |
| Duplicate detection false positives | Require 0.8+ similarity threshold, always allow "ignore" |
| Quality scoring too opinionated | Make thresholds configurable per project |
| Visual components performance | Virtual scrolling for large spec lists |
| Relationship graph too complex | Limit to 20 nodes visible, allow expand/collapse |

---

## Files in This Package

```
handoff-wave4/
├── WAVE-4-OVERVIEW.md          ← You are here
├── WAVE-4-BUILD.md             ← Overnight build instructions
├── features/
│   ├── F19-PDF-DOCX-UPLOAD.md
│   ├── F20-SYNC-FEEDBACK.md
│   ├── F21-BRANDING-SETTINGS.md
│   ├── F22-SAVE-CONFIRMATION.md
│   ├── F23-SEED-DATA.md
│   ├── F24-SPEC-COVERAGE-VIEW.md
│   ├── F25-RELATIONSHIP-MAP.md
│   ├── F26-WORK-TREEMAP.md
│   ├── F27-INVEST-SCORING.md
│   ├── F28-STORY-SPLITTING.md
│   ├── F29-DUPLICATE-DETECTION.md
│   ├── F30-TICKET-TEMPLATES.md
│   └── F31-PRE-TRANSLATION-ANALYSIS.md
└── README.md                   ← Quick start guide
```

---

*Wave 4 Specification v1.0 - December 2024*
